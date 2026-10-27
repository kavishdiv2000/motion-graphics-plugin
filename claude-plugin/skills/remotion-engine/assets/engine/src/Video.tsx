import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, delayRender, continueRender } from 'remotion';
import { FrameOverride } from './lib/frame';
import './fonts';
import { Background, Overlays } from './components/Texture';
import { Scene } from './scenes/Scene';

/** Wait until every font used by the design is actually loaded before the first frame renders. */
function useFontsReady(spec: any) {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const loads: Promise<unknown>[] = [];
    // custom brand fonts from .motion-graphics/assets/fonts (staged next to the bundle)
    for (const f of spec.design.fontFaces || []) {
      const face = new FontFace(f.family, `url(${staticFile(f.src)})`, { weight: String(f.weight) });
      document.fonts.add(face);
      loads.push(face.load());
    }
    for (const r of Object.values<any>(spec.design.roles)) {
      const fam = String(r.fontFamily).split(',')[0];
      loads.push(document.fonts.load(`${r.weight || 400} 64px ${fam}`));
    }
    Promise.all(loads)
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle, spec]);
}

export const Video: React.FC<any> = (spec) => {
  useFontsReady(spec);
  const { design } = spec;
  // Contact-sheet mode: render one frozen frame without Sequences (used by ContactSheet.tsx).
  if (spec.frozenAt !== undefined) {
    const f = spec.frozenAt;
    const sc = spec.scenes.find((s: any) => f >= s.from && f < s.from + s.durationInFrames) || spec.scenes[spec.scenes.length - 1];
    return (
      <AbsoluteFill style={{ backgroundColor: design.colors.background, overflow: 'hidden' }}>
        <Background design={design} />
        <FrameOverride.Provider value={f - sc.from}>
          <Scene scene={sc} spec={spec} />
        </FrameOverride.Provider>
        <FrameOverride.Provider value={f}>
          <Overlays design={design} />
        </FrameOverride.Provider>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: design.colors.background, overflow: 'hidden' }}>
      <Background design={design} />
      {spec.scenes.map((scene: any) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames} name={`${scene.number} ${scene.template} · ${scene.id}`}>
          <Scene scene={scene} spec={spec} />
        </Sequence>
      ))}
      <Overlays design={design} />
      {spec.audio?.src && !spec.muted ? <Audio src={staticFile(spec.audio.src)} /> : null}
    </AbsoluteFill>
  );
};
