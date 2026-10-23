import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Video } from './Video';

// A grid of frozen frames of the real composition, rendered as ONE still.
// This is the agent's "eyes": `npm run stills -- jobs/<id>` renders it and the agent views the PNG.
export const TILE_W = 300;

export const sheetSize = (props: any) => {
  const cols = props.cols || 5;
  const tileH = Math.round((TILE_W * props.spec.meta.height) / props.spec.meta.width);
  const rows = Math.ceil(props.shots.length / cols);
  return { width: cols * TILE_W, height: rows * (tileH + 28), tileH, cols };
};

export const ContactSheet: React.FC<any> = (props) => {
  const { spec, shots } = props;
  const { tileH, cols } = sheetSize(props);
  const k = TILE_W / spec.meta.width;
  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {shots.map((s: any, i: number) => (
        <div key={i} style={{ position: 'absolute', left: (i % cols) * TILE_W, top: Math.floor(i / cols) * (tileH + 28), width: TILE_W, height: tileH + 28, overflow: 'hidden' }}>
          <div style={{ width: spec.meta.width, height: spec.meta.height, transform: `scale(${k})`, transformOrigin: '0 0', position: 'relative', overflow: 'hidden' }}>
            <Video {...spec} muted frozenAt={s.frame} />
          </div>
          <div style={{ position: 'absolute', left: 6, top: tileH + 4, font: '600 15px monospace', color: '#ddd' }}>
            {s.label} · f{s.frame} · {(s.frame / spec.meta.fps).toFixed(2)}s
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
