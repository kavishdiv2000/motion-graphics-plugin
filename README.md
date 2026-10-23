# Motion Graphics Plugins

Two plugins with **one job**: generate professional, brand-consistent motion-graphics videos for social media
from three markdown files. The pipeline is deterministic and carries its own QA. Audio is synthesised and
locked to the beat.

```
DESIGN.md (static brand system) ─┐
CHOREOGRAPHY.md (scene flow)      ├─► compile + validate ─► spec.json ─► Remotion render ─► QA ─► MP4 (+ post copy)
CONTENT.md (the words)           ─┘                     └─► synthesised SFX + music bed, mastered to −14 LUFS
```

| Folder | What | For |
|---|---|---|
| [`agent-plugin/`](agent-plugin) | Cross-platform **Agent Plugins 1.0** package (`plugin.json` + `skills/`) | Codex / ChatGPT, Cursor, GitHub Copilot, VS Code, Kiro, any Agent-Skills client |
| [`claude-plugin/`](claude-plugin) | **Claude Code plugin** (`.claude-plugin/plugin.json`, skills, subagents) incl. a scheduled batch skill | Claude Code, scheduled tasks, `claude -p` / CI |
| [`docs/`](docs) | Architecture, decisions, guides, samples | humans |
| [`scripts/`](scripts) | `sync-plugins.mjs` (keeps both plugins identical), `validate-plugins.mjs` | development |

## Why this exists
Frontier models such as Claude Opus 5.5 can design good motion graphics from a blank page. Most other models
(Sonnet-class, GPT-class and smaller ones) can't do it reliably, because the skill isn't "writing React". It's
a chain of judgements: what the hero word is, when it lands, how long it holds, which word earns the accent,
and what sound punctuates it. These plugins move that judgement out of the model and into:

1. **Skills**: explicit, step-by-step procedures and craft rules (timing in frames, easing, hierarchy, retention,
   copy limits, a critique rubric). This is the knowledge, written down.
2. **A deterministic engine**: a tested Remotion project that the model drives by writing markdown, not animation
   code. Text fitting, timing, SFX sync and loudness are computed, not guessed.
3. **Gates**: a validator that rejects bad inputs with exact fixes, and a contact sheet the model must *look at*
   before it renders.

The result: a mid-tier model following the skills produces the same quality as a top model, because the hard parts are
in the system rather than in the model.

---

## Quick start (any machine with Node ≥ 18.18; Node 20+ recommended)

```bash
# 1. get the engine out of either plugin
cp -r agent-plugin/skills/remotion-engine/assets/engine ./motion-studio      # PowerShell: Copy-Item -Recurse agent-plugin\skills\remotion-engine\assets\engine .\motion-studio
cd motion-studio && npm install

# 2. render the demo (recreates the reference reel's style and copy)
npm run build  -- jobs/demo      # validate + spec + audio
npm run stills -- jobs/demo      # jobs/demo/contact-vertical.png  ← look at this
npm run render -- jobs/demo      # jobs/demo/out/demo-vertical.mp4 (first run downloads a headless Chrome)
npm run qa     -- jobs/demo      # codec / fps / loudness checks
```
Windows + OneDrive: keep `motion-studio/` **outside** OneDrive (or exclude `node_modules`), because syncing about 300 MB of
node_modules makes installs crawl.

Samples of the output are in [`docs/samples/`](docs/samples): the demo video in two aspect ratios, contact sheets and the SFX reel.

---

## Install

### Claude Code
```bash
# try it for one session
claude --plugin-dir ./claude-plugin

# or install through this repo's marketplace (local path or GitHub owner/repo)
/plugin marketplace add ./                      # or: /plugin marketplace add <github-user>/motion-graphics-plugin
/plugin install motion-graphics@motion-graphics-plugins
```
Check it: `claude plugin validate ./claude-plugin --strict`. In a session, `/plugin` lists the skills and agents.

| Command | Does |
|---|---|
| `/motion-graphics:make-video [job-id] [CONTENT.md] [CHOREOGRAPHY.md]` | the whole pipeline, interactive |
| `/motion-graphics:setup-design [url / video / DESIGN.md]` | create the brand's static DESIGN.md |
| `/motion-graphics:batch-videos [--limit N] [--formats …]` | unattended queue processing for schedules |
| agents `motion-graphics:choreographer`, `motion-graphics:motion-qa-critic` | story/pacing specialist; independent reviewer |
| skills `motion-graphics:*` (motion-graphics, design-md, choreography-md, content-md, motion-craft, remotion-engine, sound-design, motion-qa, social-distribution) | load automatically when relevant |

**Claude app (claude.ai / desktop):** the same `claude-plugin/` folder installs as a plugin wherever your plan or
organisation allows custom plugins (zip the folder, or publish the repo as a marketplace). Rendering needs an
environment with Node, npm network access and a shell, which in practice means Claude Code or a linked computer.

**Scheduled runs:** see [docs/scheduling.md](docs/scheduling.md). In short, put job folders in `motion-studio/queue/` and
schedule `/motion-graphics:batch-videos --limit 3` as a Claude scheduled task, or run
`claude -p "/motion-graphics:batch-videos --limit 3"` from cron or CI.

### Codex / ChatGPT
OpenAI clients accept the portable Agent Plugins layout (root `plugin.json`). This repo includes a repo marketplace at
`.agents/plugins/marketplace.json`:
```bash
codex plugin marketplace add ./          # or: codex plugin marketplace add <github-user>/motion-graphics-plugin
# then install "motion-graphics" from the plugin list in Codex / the ChatGPT desktop app, and restart it
```
On Codex CLI builds with direct installs: `codex plugins install ./agent-plugin`.
Personal catalogue alternative: add the same entry to `~/.agents/plugins/marketplace.json` with an absolute path.

### Cursor
```bash
# macOS / Linux
mkdir -p ~/.cursor/plugins/local && cp -r agent-plugin ~/.cursor/plugins/local/motion-graphics
# Windows (PowerShell)
Copy-Item -Recurse agent-plugin "$env:USERPROFILE\.cursor\plugins\local\motion-graphics"
```
Then **Developer: Reload Window**. Enterprise teams: an admin must enable *Allow Local Plugin Imports*. Copy the folder
rather than symlinking it (symlinks that point outside `local/` aren't picked up).

### GitHub Copilot · VS Code · Kiro · other Agent Plugins clients
These clients load the Agent Plugins 1.0 format from a directory. Point the client's "install from folder / local
plugin" option at `agent-plugin/`. If a client supports **Agent Skills** but not plugins, copy `agent-plugin/skills/*`
into its skills directory (for example a project `.agents/skills/` or the path its docs give).

### Any other model (no plugin system)
Give the model, as context: `agent-plugin/skills/motion-graphics/SKILL.md` first, then the skills it names as it reaches
each step (design-md, content-md, choreography-md, motion-craft, motion-qa). Run the `npm run …` commands it asks for and
paste back the output, and paste the contact-sheet image when it asks to look. See [docs/testing-with-other-models.md](docs/testing-with-other-models.md).

---

## How to use it

### Interactive (most common)
> "Make a 30-second reel from this LinkedIn post: …"

The agent then: sets up `motion-studio/` → checks `brand/DESIGN.md` (and interviews you if it's missing) → turns your text into
CONTENT.md beats and shows them → derives CHOREOGRAPHY.md and shows the scene table → validates → renders a contact sheet
and critiques it → renders → runs QA → hands you the MP4, the contact sheet and the caption/first comment/hashtags.

### With your own files
Upload or point to `CONTENT.md` (+ optional `CHOREOGRAPHY.md`). Missing choreography is derived. Missing content is asked
for, with an example. DESIGN.md is set **once per brand**: the agent reuses it for every video.

### Several aspect ratios
`npm run make -- jobs/<id> --formats vertical,square,horizontal`. The same markdown produces all of them; per-format layout
lives in `DESIGN.md → layout.per_format`.

### Variants
Ask for "three hook variants" or "a 15 s cut". The choreographer creates one job per variant, and only the hook or the
structure changes.

---

## The three inputs: full reference
> This section is self-contained. Paste it into any model as the contract for the files it must write.
> Copy-ready templates: `agent-plugin/skills/{design-md,choreography-md,content-md}/references/*.template.md`.
> Complete examples (the reference reel): `…/references/*.example.md`.

All three are markdown with **YAML front matter**. CHOREOGRAPHY and CONTENT also contain fenced ```` ```yaml ```` blocks with an
`id:`. Those are the scenes and beats. Prose outside the YAML is for humans and models: the compiler ignores it.

### 1. DESIGN.md (static: once per brand; `motion-studio/brand/DESIGN.md`)
Everything about the *look and sound*, nothing about a particular video. Units: px at a 1080 px reference (auto-scaled),
timings in frames at `canvas.fps`, colours as `#RRGGBB`.

| Section | Parameters | What they control |
|---|---|---|
| identity | `schema: motion-design/1.0`, `id`, `name`, `version`, `updated`, `description` | versioning of the brand system |
| `brand` | `name`, `tagline`, `voice[]`, `handle`, `url`, `logo{primary, mono, wordmark_fallback, min_height_px, clearspace_ratio}`, `legal{disclaimer, trademark_notes}` | end card, CTA, copy tone, legal lines |
| `canvas` | `default_format` (vertical / portrait / square / horizontal), `fps`, `formats.<f>{width,height,aspect,platforms}`, `safe_area.<f>{top,bottom,left,right}` | output sizes; keeping copy clear of platform UI |
| `layout` | `anchor` (left / center), `vertical_align`, `text_max_width`, `block_offset_y`, `stack_gap_em`, `type_scale`, `per_format.<f>{…}` | the text column and its placement per format |
| `colors` | `background`, `background_alt`, `grid_line`, `text_primary/secondary/muted`, any `accent_*`, `steel`, `label`, `glow`, `rules{accent_budget_per_scene, accent_rotation[], min_contrast_ratio}` | palette, accent logic, contrast checks |
| `typography.families` | `display / body / mono`: `{family, package, weights[], substitute_for}` | the 3 typefaces (bundled via @fontsource) |
| `typography.roles` | `label, setup, headline, tail, line, item, stat, cta`: `{family, size_px, weight, tracking_em, case, color, fit (fill / shrink / wrap), min_px / min_scale / max_lines, line_height, max_chars, glow, format, marker}` | every text role's size, fitting and limits; `fill` = the line spans the column exactly |
| `texture` | `grid{cell_px,line_px,color,opacity}`, `scanlines{spacing_px,thickness_px,opacity}`, `vignette{strength,roundness}`, `grain{amount,fps}`, `flicker{amplitude}`, `glow{headline_blur_px,…}`, `chromatic_aberration{label_px,glitch_px}`, `noise_seed` | surface feel (each layer can be switched on or off) |
| `motion` | `personality`, `easing{enter,exit,standard}` (cubic-bezier), `timing{scene_lead_in, label_in, label_overlap, gap, headline_gap, word_stagger, word_in, decode_char_stagger, decode_scramble, decode_jitter, decode_glyph_hold, type_char, count, fade, strike, exit, min_hold _frames; reading_wpm}`, `reveal_defaults{slot: reveal}`, `scramble_charset`, `word_in{blur_px,rise_px,pending_color}`, `scene{default/min/max_duration_s, transition, transition_frames}`, `camera{drift_scale, shake_on_land_px}`, `rhythm{snap_scene_to_beat, land_on_beat}`, `forbidden[]` | how everything moves, and what is never allowed |
| `audio` | `sample_rate`; `music{source (synth/file/none), file, preset (signal_drone/pulse_minimal/warm_keys/dark_tension), bpm, key, scale, gain_db, fade_in_s, fade_out_s, duck_db}`; `sfx{gain_db, min_spacing_frames{}, map{event: sfx_id}, gains{event: dB}}`; `master{lufs_target, true_peak_db}`; `voiceover{enabled, provider}` | music bed, event→sound map, loudness |
| `endcard` | `show_logo`, `cta_default`, `hold_s` | the close |
| `export` | `container, video_codec, crf, pixel_format, audio_codec, audio_bitrate, thumbnail_frame, max_duration_s{platform: s}` | encoding, platform length limits |
| `accessibility` | `min_text_px`, `max_flashes_per_second`, `captions` | legibility and photosensitivity |

SFX events for `audio.sfx.map`: `scene_in, label_in, word_in, decode_start, decode_land, decode_land_minor, type_char,
type_done, count_tick, count_land, strike, logo_in, exit, transition`. Field-by-field ranges and guidance:
[`design-md/references/parameters.md`](agent-plugin/skills/design-md/references/parameters.md).

<details><summary>Minimal DESIGN.md front matter (abridged example)</summary>

```yaml
schema: motion-design/1.0
id: signal-ops
name: Signal Ops
brand: { name: Damn Fine Agents, url: damnfineagents.com, logo: { primary: brand/logo.svg, wordmark_fallback: DFA } }
canvas: { default_format: vertical, fps: 30, formats: { vertical: { width: 1080, height: 1920 } }, safe_area: { vertical: { top: 0.12, bottom: 0.22, left: 0.074, right: 0.07 } } }
colors: { background: "#0B0B07", text_primary: "#E8E8E4", text_secondary: "#B4B4AE", text_muted: "#6E6E68", accent_red: "#F82820", accent_orange: "#FF6A1A", label: "#F82820" }
typography:
  families: { display: { family: Michroma }, body: { family: Inter }, mono: { family: JetBrains Mono } }
  roles:
    headline: { family: display, size_px: 170, case: upper, color: text_primary, fit: fill, min_px: 84, max_chars: 14, glow: true }
    # label, setup, tail, line, item, stat, cta …
motion: { easing: { enter: [0.16, 1, 0.3, 1] }, scene: { default_duration_s: 4.4, transition: glitch_cut } }
audio: { music: { preset: signal_drone, bpm: 100 }, sfx: { map: { decode_land: impact_sub, word_in: key_soft } }, master: { lufs_target: -14 } }
```
</details>

### 2. CHOREOGRAPHY.md (dynamic: one per video; `jobs/<id>/CHOREOGRAPHY.md`)
How the story flows. No copy, no colours.

Front matter: `schema: motion-choreography/1.0`, `id`, `title`, `content` (file), `format`, `target_duration_s`,
`objective` (awareness / engagement / lead_gen / conversion / retention), `narrative_arc`, `pacing` (urgent / steady / contemplative),
`label_numbering`, `emphasis_default` (auto / none), `music{preset, bpm, energy_curve[one 0–1 value per scene]}`, `loop_friendly`.

One ```` ```yaml ```` block per scene, in order:

| Field | Values | Meaning |
|---|---|---|
| `id` | s01… | unique scene id |
| `beat` | b01… | which CONTENT.md beat supplies the words |
| `template` | `statement` · `title` · `sequence` · `stack` · `stat` · `list` · `compare` · `endcard` | the layout and reveal grammar |
| `duration_s` / `beats` | seconds or musical beats | snapped to the BPM; bounded by DESIGN `min/max_duration_s` |
| `emphasis` | `none` · `auto` · `<colour token>` | the single accent of the scene (the turn or the payoff) |
| `transition_out` | `glitch_cut` · `hard_cut` · `dim_cut` · `flash_cut` | the cut into the next scene |
| `reveal` | `{slot: glitch/words/decode/type/count/fade/strike}` | override how a slot enters |
| `timing` | `{slot: {delay_frames: n}}` | hold back a slot (drama, beat alignment) |
| `sfx` | `[{id, at_s, gain_db}]` | extra one-off sounds (e.g. a riser) |
| `notes` | text | direction for humans / QA |

Templates and their slots: **statement** label·setup·headline·tail · **title** label·headline·tail · **sequence**
label·parts[{role: setup/line/headline/tail, text, accent}] · **stack** label·lines[2–4] · **stat** label·setup·value·tail ·
**list** label·setup·items[2–5] · **compare** label·before·after·tail · **endcard** logo·label·setup·headline·tail·cta.

### 3. CONTENT.md (dynamic: one per video; `jobs/<id>/CONTENT.md`)
What the video says. Front matter: `schema: motion-content/1.0`, `id`, `campaign`, `audience`, `pain`, `promise`, `objective`,
`platforms[]`, `language`, `tone`, `cta{text, url, type}`, `claims[{text, type: rhetorical/statistic/testimonial/guarantee, source}]`
(a `statistic` without a `source` fails the build).
Body: `## Core message` (1–3 sentences) · `## Beats` (one ```` ```yaml ```` block per idea) · `## Post copy` (caption, first comment, hashtags).
Optional `## Raw content`, where you paste free text and the agent turns it into beats.

```yaml
id: b02
label: CORRECTION        # ≤ 24 chars, rendered as [ 02 // CORRECTION ]
setup: You need          # ≤ 44 chars, sentence case, may wrap to 2 lines
headline: LEVERAGE.      # ≤ 14 chars, the hero; one line, sized to fill the column
tail: null               # ≤ 44 chars, optional afterthought
```
Other slots: `lines` (stack, ≤ 26 each) · `items` (list, ≤ 32) · `value` (stat, ≤ 7: "8", "3.5X", "$40K") · `before`/`after` (compare) ·
`parts` (sequence) · `logo: true` and `cta` (endcard, ≤ 34: "VERB // destination"). Use only characters the brand fonts contain:
the build warns on others (→ “ ” emoji).

---

## Technology decisions (summary)
- **Renderer: Remotion 4** (pinned 4.0.531). Frame-pure React gives deterministic output; it's the animation code models
  write best; Chromium typography; one composition renders every aspect ratio; and a Node API supports the cheap "stills
  before render" loop. **Licence:** free for individuals and companies of up to 3 people, otherwise a paid company licence.
  The compiler, timeline, audio and validator are renderer-agnostic, and an MIT-only fallback (HTML + Playwright + FFmpeg)
  is documented. Alternatives compared (Motion Canvas, Revideo, Manim, After Effects/nexrender, Lottie, FFmpeg drawtext, AI video):
  [docs/decisions/renderer.md](docs/decisions/renderer.md).
- **Audio: procedural synthesis in Node.** 50 SFX + 4 music-bed presets generated from code: deterministic, royalty-free,
  beat-locked to the same timeline as the picture, and mastered to −14 LUFS / −1 dBTP. Licensed or AI-made sounds plug in as WAVs
  (generated once, never at render time). [docs/decisions/audio.md](docs/decisions/audio.md).
- **Text fitting: exact glyph metrics** extracted from the bundled fonts, so validation and rendering agree to the pixel.
- **QA: a contact sheet rendered from the composition** (all scenes, mid and landed) that the agent must look at, plus probe and
  loudness checks after the render, plus an independent critic agent.

### SFX library (50, all synthesised; audition: `npm run sfx` → `public/sfx/_reel.wav`)
| Family | Sounds |
|---|---|
| UI / clicks (12) | click_soft · click_hard · key_soft · key_click · tick_hi · tick_lo · double_tick · toggle_on · toggle_off · relay_click · mouse_click · tap_wood |
| Data / digital (10) | blip_up · blip_down · confirm_blip · error_buzz · data_chirp · scramble_chatter · counter_tick · modem_burst · sonar_ping · telemetry_pings |
| Glitch / signal (8) | glitch_tick · glitch_stutter · static_burst · rgb_tear · crt_on · crt_off · signal_drop · digital_zap |
| Transitions (7) | whoosh_short · whoosh_long · swipe_air · reverse_swell · riser_noise · riser_tonal · downlifter |
| Impacts (6) | impact_sub · impact_punch · boom_cinematic · thud_soft · hit_metallic · slam_gate |
| Musical / brand (4) | chime_confirm · pluck_accent · bell_soft · stinger_logo |
| Beds / texture (3) | room_tone · tape_hiss · crt_hum |
Music presets: `signal_drone` (the reference reel: sub drone + saw pad + Karplus-Strong arp at 100 BPM), `pulse_minimal`,
`warm_keys`, `dark_tension`. Recipes for every sound: [sound-design/references/sfx-catalogue.md](agent-plugin/skills/sound-design/references/sfx-catalogue.md).

---

## Development
```bash
node scripts/sync-plugins.mjs           # agent-plugin/skills is canonical → mirrors into claude-plugin, refreshes engine templates
node scripts/sync-plugins.mjs --check   # CI: fail if the plugins drift
node scripts/validate-plugins.mjs       # Agent Plugins + Agent Skills rules, Claude manifest/agents
claude plugin validate ./claude-plugin --strict
```
Edit shared skills **only** in `agent-plugin/`, then sync. Claude-only files (`make-video`, `setup-design`, `batch-videos`,
`agents/`) live only in `claude-plugin/`. Full guide: [docs/development.md](docs/development.md).

## Licences and caveats
- Plugins: MIT. Remotion: [Remotion licence](https://www.remotion.dev/license) (company licence needed above 3 people).
  Fonts bundled via @fontsource: OFL.
- The example design takes its *style* from the reference reel and brasshands.com. Their commercial fonts (Artific, Construct Mono)
  are replaced with free look-alikes (Michroma, JetBrains Mono). The striped tri-circle mark at the end of the reference reel
  is a third-party (MTS) logo and is **not** included; the end card uses your logo file or a wordmark.
- Videos make claims on your brand's behalf. The pipeline never auto-publishes.
