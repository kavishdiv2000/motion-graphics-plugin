# Extracting a DESIGN.md from a reference

Work from evidence, not vibes. Each extracted value gets a comment saying where it came from.

## From a reference video (MP4/MOV)

1. **Probe**: `ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,duration,sample_rate -of compact ref.mp4`
   → canvas size, fps and length. (No system ffmpeg? Inside `.motion-graphics/.engine`: `npx remotion ffprobe …`.)
2. **Contact sheets**: one frame per second, tiled:
   `ffmpeg -i ref.mp4 -vf "fps=1,scale=360:-1,tile=6x3" sheet_%02d.png`, then look at every sheet.
   Note: the scene count and scene length (where the copy changes), how text enters (word by word, scramble, type,
   fade), which word gets colour, the layout anchor and how the transitions work.
3. **Crops at full resolution** of a hero frame and a label: `ffmpeg -ss 10 -i ref.mp4 -frames:v 1 -vf "crop=1080:300:0:800" crop.png`
   → texture (grid cell size, scanlines), glow, chromatic aberration, font classification.
4. **Colours**: sample the median background and the saturated pixels:
   ```python
   from PIL import Image; import numpy as np, collections
   a=np.array(Image.open('frame.png').convert('RGB')).astype(int); L=a.max(2)
   print('bg', np.median(a.reshape(-1,3),0))
   sat=a[(L>150)&((a.max(2)-a.min(2))>80)]
   print(collections.Counter(tuple((p//8)*8) for p in sat).most_common(6))
   ```
5. **Layout**: rows/columns with bright pixels → left margin, block position, hero width as % of canvas.
   If every display line has the **same width**, the style is fill-to-column: set `fit: fill` and `text_max_width`.
6. **Type sizes**: hero cap height or width ÷ glyph count → size. Calibrate against our font metrics with
   `node -e` + `src/lib/font-metrics.json` (see the motion-graphics demo: HOURS. ≈ 915 px → cap 170 px).
7. **Timing**: step through around a reveal (`fps=10` contact sheet over 2 s) → stagger, decode length, hold, exit.
8. **Audio**:
   - Tempo: an autocorrelation of the onset envelope (`python3`) or count the hits over 10 s.
   - Spectrum: `ffmpeg -i ref.mp4 -lavfi showspectrumpic=s=1600x500:scale=log:fscale=log spec.png` → drone or sub,
     mid sequence (pluck/arp), high transients (ticks/glitches).
   - Map every audible hit to a picture event (tag in, word, decode, land, cut) → `audio.sfx.map`.
9. **Fonts**: classify (wide/extended geometric, condensed, grotesk, mono, serif). Name the likely face if it's known,
   then pick the closest OFL face on Fontsource and add `substitute_for:`.

### Worked example: demo-1.mp4 → Signal Ops
| Observation | Token |
|---|---|
| 1080×1920, 30 fps, 35.2 s, 7 scenes of ~4.4–6 s | `canvas`, `motion.scene.default_duration_s: 4.4` |
| Olive-black bg (11,12,4), 38 px grid with 4 px dark lines, 3 px scanlines, heavy vignette | `colors.background #0B0B07`, `texture.grid/scanlines/vignette` |
| `[ 03 // OBSERVATION ]` red mono tag with RGB split | `roles.label`, `chromatic_aberration.label_px` |
| Grey sans setup line revealed word-by-word with pending grey | `roles.setup`, `word_in.pending_color` |
| Wide extended hero decoded from random glyphs (`LE\O[`, `JUDGMEN-#`) | `roles.headline` fit fill, reveal decode |
| All display lines the same width (~920 px) | `fit: fill`, `text_max_width: 0.86` |
| Red = the turn (LEVERAGE., JUDGMENT.), orange = the payoff (MINUTES., OWN THE VISION.) | `accent_red`, `accent_orange`, rotation |
| Onsets every 0.6 s → 100 BPM; sub drone, plucked mid arp, high glitch ticks | `audio.music` signal_drone 100 BPM; sfx map |
| End card logo (a third party's mark) | **not copied** — logo slot + wordmark fallback |

## From a website
1. Open it in a browser tool and run in the console:
   ```js
   const f=new Map(),c=new Map();document.querySelectorAll('body *').forEach(e=>{const s=getComputedStyle(e);if(e.innerText?.trim()){f.set(s.fontFamily+'|'+s.fontWeight,(f.get(s.fontFamily+'|'+s.fontWeight)||0)+1);c.set(s.color,(c.get(s.color)||0)+1)}});
   ({fonts:[...f].sort((a,b)=>b[1]-a[1]).slice(0,8),colors:[...c].sort((a,b)=>b[1]-a[1]).slice(0,8),bg:getComputedStyle(document.body).backgroundColor,loaded:[...document.fonts].map(x=>x.family+' '+x.weight)})
   ```
2. Screenshot the hero section. Note the grid/texture motifs, the label style, the CTA style and the voice (copy samples).
3. Example, brasshands.com: body bg #242424, steel #ADB3B7, orange #FF6200/#FF7235, fonts Construct Mono, Artific Bold,
   Inter 600; diagonal-hatched panels, orange dashed CTA frames, field-ops copy ("Status: Deployed in sector",
   "ENGAGE DESIGN OPS"). → Signal Ops took the orange family, steel and the mono/extended pairing from here.
