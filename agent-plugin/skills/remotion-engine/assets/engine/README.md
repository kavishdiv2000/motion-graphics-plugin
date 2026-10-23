# motion-studio

Deterministic motion-graphics engine. Three markdown files in, a QA'd MP4 out.

```bash
npm install
npm run build  -- jobs/demo          # validate + spec + audio
npm run stills -- jobs/demo          # jobs/demo/contact-vertical.png (look at it)
npm run render -- jobs/demo          # jobs/demo/out/demo-vertical.mp4
npm run qa     -- jobs/demo          # technical checks + contact sheet
npm run make   -- jobs/demo --formats vertical,square   # all of the above, several formats
npm run new    -- my-next-video      # scaffold jobs/my-next-video/
npm run studio                       # scrub the last build in Remotion Studio
```

| Path | What |
|---|---|
| `brand/DESIGN.md` | the static brand motion system (example: Signal Ops) |
| `jobs/<id>/CHOREOGRAPHY.md`, `CONTENT.md` | per-video inputs |
| `templates/` | blank CHOREOGRAPHY / CONTENT / DESIGN templates |
| `public/brand/` | logo files · `public/audio/` licensed beds · `public/sfx/custom/` custom sounds |
| `src/lib/` | pure, shared logic: templates, timeline, layout, prng, font metrics |
| `src/` | Remotion composition (Video → Scene → Reveals/Texture), ContactSheet |
| `scripts/` | build, render, stills, qa, make, sfx library, font metrics |

Set `REMOTION_BROWSER_EXECUTABLE` to an installed Chrome/Chromium to skip Remotion's browser download.
Remotion licence: free for individuals and companies of up to 3 people; larger companies need a company licence (remotion.pro).
Full docs: the `remotion-engine` skill and `docs/` in the plugin repository.
