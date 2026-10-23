import { createContext, useContext } from 'react';
import { useCurrentFrame } from 'remotion';

// Components read the frame through useFrame() instead of useCurrentFrame() so that the contact
// sheet (and any future "freeze" use) can pin a subtree to an explicit frame number.
export const FrameOverride = createContext<number | null>(null);

export function useFrame(): number {
  const override = useContext(FrameOverride);
  const frame = useCurrentFrame();
  return override ?? frame;
}
