# Recreating a reference video's audio

## Method
1. **Extract**: `ffmpeg -i ref.mp4 -ac 1 -ar 22050 ref.wav`
2. **Tempo**: autocorrelate the onset envelope:
   ```python
   import wave, numpy as np
   w=wave.open('ref.wav'); sr=w.getframerate(); d=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)
   win=512; env=np.array([np.abs(d[i:i+win]).sum() for i in range(0,len(d)-win,win)])
   o=np.maximum(np.diff(env),0); o-=o.mean(); ac=np.correlate(o,o,'full')[len(o)-1:]
   fps=sr/win; lags=np.arange(int(fps*.3),int(fps*1.5)); b=lags[ac[lags].argmax()]; print('BPM', 60*fps/b)
   ```
3. **Spectrogram**: `ffmpeg -i ref.mp4 -lavfi showspectrumpic=s=1600x500:legend=1:scale=log:fscale=log spec.png`, then look at it:
   - continuous bright band < 150 Hz → drone/sub bed
   - repeating short horizontal dashes at 300–1500 Hz → arp/pluck sequence (count them per beat → 8ths or 16ths)
   - full-height vertical lines → transients (clicks/glitches); bright at the bottom too → impacts
4. **Align hits to picture**: list onsets (`diff(dB) > 6`), then match each to a contact-sheet event (tag in, word,
   decode, land, cut). That gives `audio.sfx.map`.
5. **Level**: `ffmpeg -i ref.mp4 -af ebur128 -f null -` → integrated LUFS (ours: −14).

## Worked example: demo-1.mp4
| Measurement | Value | → Our setting |
|---|---|---|
| Tempo | onsets every 0.60 s → **100 BPM** (autocorrelation 99.4) | `music.bpm: 100` |
| Low band | continuous sub/drone, energy steps up at 4.6 s and 8.8 s | `signal_drone`, energy curve rising |
| Mid band | dense dashed sequence 500–1200 Hz | Karplus-Strong arp, 8ths, minor chord tones |
| Highs | sharp full-band transients at every tag and reveal; denser clusters during decodes | `glitch_tick` (label), `scramble_chatter` (decode), `key_soft` (words) |
| Impacts | low hits on hero lands (4.6, 8.8, 13.x …) | `impact_sub` + ducking |
| Overall level | ≈ −14 LUFS | `master.lufs_target: -14` |
| End | the bed decays over the last ~3 s | `fade_out_s: 2.5`, `stinger_logo` on the endcard |

Result: `jobs/demo` reproduces the structure and feel (tempo, layering, event sync) with royalty-free procedural sound.
For a closer timbral match, replace the bed with a licensed track (`music.source: file`) and keep the SFX map.
