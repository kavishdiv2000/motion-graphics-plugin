#!/usr/bin/env python3
"""Build the engine's SFX pack from earshot (https://github.com/Leonxlnx/earshot, MIT).

Development tool: run it when updating the pack, then commit the result. Users never need Python or earshot: the
engine reads the WAVs + pack.json this writes (pure Node).

    python -m venv .venv && .venv/bin/pip install numpy scipy soundfile soxr
    git clone https://github.com/Leonxlnx/earshot /tmp/earshot
    .venv/bin/python -I scripts/build-sfx-pack.py --earshot /tmp/earshot

What it does
  1. renders earshot's four kit presets (calm, crisp, minimal, launch) with earshot's own kit renderer: every take is
     audited by earshot (clicks, cut tails, clipping, ring, rising glides) and re-rolled when it fails;
  2. curates: at most 3 takes per role (6 for keys, 2 for long hits / risers / swells); pitched roles (bell, text)
     keep ONE take (the middle note): the engine pitch-shifts it into the music's key; identical takes are shared
     across kits;
  3. trims each take 120 ms after its measured end (50 dB down) with a 10 ms fade, stores mono when L == R, 16-bit;
  4. writes engine/sfx-pack/: pack.json (sounds -> takes with earshot's measured onset / peak / end / peak dBFS /
     loudest-50 ms LUFS), kits/<name>.json (roles), LICENSE-earshot.txt and CREDITS.md (the CC0 recordings behind
     the fitted sounds).
"""
import argparse, hashlib, json, os, shutil, sys, tempfile

import numpy as np
import soundfile as sf

ENGINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'agent-plugin', 'skills', 'remotion-engine',
                      'assets', 'engine')
KITS = ('calm', 'crisp', 'minimal', 'launch')
# Our own kit definitions (earshot kit format). A file here REPLACES earshot's preset of the same name; new names add kits.
CUSTOM = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx-kits')
LONG = {'hit', 'drop', 'riser', 'swell', 'whoosh.long', 'click.confirm', 'suck'}
CAP = {'key': 6}
TAIL_S, FADE_S = 0.12, 0.010
ROLE_KEYS = ('sound', 'align', 'level_db', 'bed_db', 'offset_ms', 'min_gap_ms', 'pitches', 'width', 'note')


def safe(sound_id):
    return sound_id.replace('/', '__').replace('.', '-')


def write_take(src, dst, end_s):
    y, sr = sf.read(src, always_2d=True)
    assert sr == 48000, (src, sr)
    n = min(len(y), int(round((end_s + TAIL_S) * sr)))
    if n < len(y):
        f = int(FADE_S * sr)
        y = y[:n].copy()
        y[-f:] *= np.cos(np.linspace(0, np.pi / 2, f))[:, None] ** 2
    mono = y.shape[1] == 1 or np.allclose(y[:, 0], y[:, 1], atol=1e-4)
    out = y[:, :1] if mono else y[:, :2]
    sf.write(dst, out, sr, subtype='PCM_16')
    return 1 if mono else 2, round(n / sr, 4)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--earshot', required=True, help='path to an earshot checkout')
    ap.add_argument('--out', default=os.path.join(ENGINE, 'sfx-pack'))
    a = ap.parse_args()
    sys.path.insert(0, os.path.abspath(a.earshot))
    from earshot.forge import kit, bank  # noqa: E402

    work = tempfile.mkdtemp(prefix='mg-sfx-pack-')
    out = os.path.abspath(a.out)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, 'takes'))
    os.makedirs(os.path.join(out, 'kits'))

    sounds, seen, fits = {}, {}, {}
    bank_version = None
    custom = sorted(f[:-5] for f in os.listdir(CUSTOM) if f.endswith('.json')) if os.path.isdir(CUSTOM) else []
    for name in list(KITS) + [c for c in custom if c not in KITS]:
        kj = os.path.join(work, f'{name}.json')
        if name in custom:
            shutil.copy(os.path.join(CUSTOM, f'{name}.json'), kj)
            probs = kit.problems(json.load(open(kj, encoding='utf-8')))
            if probs:
                sys.exit(f'{name}: ' + '; '.join(map(str, probs)))
        else:
            kit.init(name, out=kj, force=True)
        lock = kit.render(kj, os.path.join(work, name))
        bank_version = lock.get('bank')
        src_kit = json.load(open(kj, encoding='utf-8'))
        roles = {}
        for role, r in lock['roles'].items():
            if not r:
                roles[role] = None
                continue
            spec = src_kit['roles'].get(role) or {}
            sid = r['sound']
            takes = r['takes']
            pitched = bool(spec.get('pitches'))
            if pitched:
                takes = [takes[len(takes) // 2]]
            else:
                takes = takes[:CAP.get(role, 2 if role in LONG else 3)]
            entry = sounds.setdefault(sid, {'category': bank.get(sid).get('category'), 'takes': []})
            files = []
            for t in takes:
                if t['sha1'] not in seen:
                    fn = f"{safe(sid)}_{sum(1 for v in seen.values() if v['sound'] == sid) + 1}.wav"
                    ch, dur = write_take(os.path.join(work, name, t['file']), os.path.join(out, 'takes', fn), t['end_s'])
                    rec = {'sound': sid, 'ch': ch, 'dur_s': dur, 'onset_s': t['onset_s'], 'peak_s': t['peak_s'],
                           'end_s': t['end_s'], 'peak_db': t['peak_db'], 'l50_lufs': t.get('l50_lufs'),
                           'pitch': t.get('pitch')}
                    if rec['l50_lufs'] is None:
                        y, _ = sf.read(os.path.join(work, name, t['file']))
                        rec['l50_lufs'] = kit.loud_lufs(y)
                    seen[t['sha1']] = dict(rec, file=f'takes/{fn}')
                    entry['takes'].append(f'takes/{fn}')
                files.append(seen[t['sha1']]['file'])
            e = bank.get(sid)
            if e.get('type') == 'fit' and e.get('source'):
                fits[sid] = e['source']
            roles[role] = {k: spec[k] for k in ROLE_KEYS if k in spec and spec[k] is not None}
            roles[role]['sound'] = sid
            roles[role]['takes'] = files
            roles[role]['align'] = r.get('align') or spec.get('align') or 'onset'
        mix = src_kit.get('mix') or {}
        json.dump({'schema': 'motion-graphics-kit/1', 'name': name, 'note': src_kit.get('note', ''),
                   'source': f'earshot kit preset "{name}" (earshot {lock.get("earshot")}, bank {bank_version})',
                   'mix': {'level': 'bed' if mix.get('level') == 'bed' else 'auto',
                           **({'stop_down': mix['stop_down']} if mix.get('stop_down') else {}),
                           **({'density_per_10s': mix['density_per_10s']} if mix.get('density_per_10s') else {})},
                   'roles': roles}, open(os.path.join(out, 'kits', f'{name}.json'), 'w', encoding='utf-8'), indent=1)

    for sid, e in sounds.items():
        e['license'] = f"CC0 1.0 recording fitted as code by earshot: {fits[sid].get('url')}" if sid in fits \
            else 'MIT (earshot: designed in code)'
    pack = {'schema': 'motion-graphics-sfx-pack/1', 'sr': 48000,
            'source': {'project': 'earshot', 'url': 'https://github.com/Leonxlnx/earshot', 'bank': bank_version,
                       'license': 'MIT (see LICENSE-earshot.txt); fitted sounds derive from CC0 recordings (CREDITS.md)'},
            'measures': 'onset = first point of the 1 ms envelope within 30 dB of its max; peak = loudest 5 ms; end = last '
                        '5 ms within 50 dB of the loudest; peak_db = sample peak dBFS; l50_lufs = loudest 50 ms, '
                        'K-weighted (earshot bank / kit definitions)',
            'sounds': dict(sorted(sounds.items())),
            'takes': {v['file']: {k: x for k, x in v.items() if k not in ('file', 'sound')} for v in seen.values()}}
    json.dump(pack, open(os.path.join(out, 'pack.json'), 'w', encoding='utf-8'), indent=1)
    shutil.copy(os.path.join(a.earshot, 'LICENSE'), os.path.join(out, 'LICENSE-earshot.txt'))
    with open(os.path.join(out, 'CREDITS.md'), 'w', encoding='utf-8') as fh:
        fh.write('# SFX pack credits\n\nAll sounds come from [earshot](https://github.com/Leonxlnx/earshot) (MIT, '
                 'Copyright (c) 2026 Leon Lin), rendered from its sound bank by `scripts/build-sfx-pack.py`. Most are '
                 'designed in code. The fitted sounds below are code models of CC0 1.0 (public domain) recordings on '
                 'Freesound; no attribution is required, the recordists are credited with thanks.\n\n'
                 '| sound | recording | recordist | source | licence |\n|---|---|---|---|---|\n')
        for sid, s in sorted(fits.items()):
            fh.write(f"| `{sid}` | {s.get('title')} | {s.get('author')} | {s.get('url')} | {s.get('license')} |\n")
    total = sum(os.path.getsize(os.path.join(out, 'takes', f)) for f in os.listdir(os.path.join(out, 'takes')))
    digest = hashlib.sha1(open(os.path.join(out, 'pack.json'), 'rb').read()).hexdigest()[:12]
    print(f'✔ {len(sounds)} sounds, {len(seen)} takes, {total / 1e6:.1f} MB → {out}  (pack.json {digest})')
    shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
