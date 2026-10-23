import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import { ContactSheet, sheetSize } from './ContactSheet';
import studioSpec from './studio-spec.json';

// One composition renders ANY spec: size, fps and length come from the spec passed with --props.
// `studio-spec.json` is rewritten by `npm run build` so `npm run studio` previews the last built job.
const calculateMetadata = ({ props }: { props: any }) => ({
  durationInFrames: props.meta.durationInFrames,
  fps: props.meta.fps,
  width: props.meta.width,
  height: props.meta.height,
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Video as any}
      defaultProps={studioSpec as any}
      calculateMetadata={calculateMetadata as any}
      durationInFrames={(studioSpec as any).meta.durationInFrames}
      fps={(studioSpec as any).meta.fps}
      width={(studioSpec as any).meta.width}
      height={(studioSpec as any).meta.height}
    />
    {/* QA contact sheet: props = { spec, shots: [{frame, label}], cols } — rendered by scripts/stills.mjs */}
    <Composition
      id="ContactSheet"
      component={ContactSheet as any}
      defaultProps={{ spec: studioSpec, shots: [{ frame: 40, label: 'preview' }], cols: 1 } as any}
      calculateMetadata={(({ props }: any) => ({ ...sheetSize(props), durationInFrames: 1, fps: 30 })) as any}
      durationInFrames={1}
      fps={30}
      width={300}
      height={560}
    />
  </>
);
