import { createContext } from 'react';
import type { MotionValue } from 'motion/react';

export interface BatikRawMotion {
  rawX: MotionValue<number>;
  rawY: MotionValue<number>;
}

export const BatikMotionContext = createContext<BatikRawMotion | null>(null);
