# motion-graphics engine (source)

This folder is the **engine source** shipped inside the plugin. It is not run from here. The plugin's
`motion-graphics/scripts/init-workspace.mjs` copies it into a user workspace as `.motion-graphics/.engine/`,
runs `npm ci`, and creates the folder system. After that, everything goes through:

```bash
node .motion-graphics/mg.mjs help
node .motion-graphics/mg.mjs demo && node .motion-graphics/mg.mjs stills demo
node .motion-graphics/mg.mjs session new "My video"
node .motion-graphics/mg.mjs make <session-id> --formats vertical,square
```

| Path | What |
|---|---|
| `scripts/mg.mjs` | CLI + folder management |
| `scripts/lib/workspace.mjs` | `.motion-graphics/` layout, sessions, render stage |
| `scripts/lib/pipeline.mjs` | build · stills · render · qa · thumbnail · POST.md |
| `scripts/lib/{md,compile,mix,music,sfx,dsp}.mjs` | parser, compiler/validator, audio |
| `src/` | Remotion composition (Video → Scene → Reveals/Texture), ContactSheet |
| `src/lib/` | pure shared logic: templates, timeline, layout, prng, font metrics |
| `templates/` | blank DESIGN / CHOREOGRAPHY / CONTENT templates + `examples/` (Signal Ops + reference reel) |

Developing the engine itself: run `npm install` here, then point a scratch workspace at it with
`node ../../motion-graphics/scripts/init-workspace.mjs <scratch-dir> --force-engine` after each change.
Set `REMOTION_BROWSER_EXECUTABLE` to an installed Chrome/Chromium to skip Remotion's browser download.
Remotion licence: free for individuals and companies of up to 3 people; larger companies need a company licence.
