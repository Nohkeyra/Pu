import { CalloutSpec, GhostAction } from './types';

export interface ActionOptions {
  delay?: number;
  speed?: number;
  glowDuration?: number;
  persistGlow?: boolean;
  demoUpdate?: Record<string, any>;
}

export const ghost = {
  tap: (selector: string, callout?: CalloutSpec, opts?: ActionOptions): GhostAction => ({
    type: 'tap',
    selector,
    callout,
    delay: opts?.delay ?? 500,
    demoUpdate: opts?.demoUpdate,
  }),

  type: (selector: string, text: string, callout?: CalloutSpec, opts?: ActionOptions): GhostAction => ({
    type: 'type',
    selector,
    text,
    callout,
    speed: opts?.speed ?? 80,
    delay: opts?.delay ?? 500,
    demoUpdate: opts?.demoUpdate,
  }),

  scroll: (selector: string, callout?: CalloutSpec, opts?: ActionOptions): GhostAction => ({
    type: 'scroll',
    selector,
    callout,
    delay: opts?.delay ?? 500,
    demoUpdate: opts?.demoUpdate,
  }),

  select: (selector: string, optionText: string, callout?: CalloutSpec, opts?: ActionOptions): GhostAction => ({
    type: 'select',
    selector,
    text: optionText,
    callout,
    delay: opts?.delay ?? 500,
    demoUpdate: opts?.demoUpdate,
  }),

  swipe: (selector: string, callout?: CalloutSpec, opts?: ActionOptions): GhostAction => ({
    type: 'swipe',
    selector,
    callout,
    delay: opts?.delay ?? 500,
    demoUpdate: opts?.demoUpdate,
  }),

  wait: (ms: number): GhostAction => ({
    type: 'wait',
    delay: ms,
  }),

  glow: (selector: string, callout?: CalloutSpec, opts?: ActionOptions): GhostAction => ({
    type: 'glow',
    selector,
    callout,
    delay: opts?.delay ?? 500,
    glowDuration: opts?.glowDuration ?? 3000,
    persistGlow: opts?.persistGlow,
    demoUpdate: opts?.demoUpdate,
  }),
};
