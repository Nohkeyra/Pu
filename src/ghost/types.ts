export interface CalloutSpec {
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  duration: number;
}

export interface GhostAction {
  type: 'tap' | 'type' | 'scroll' | 'select' | 'swipe' | 'wait' | 'glow';
  selector?: string;
  text?: string;
  speed?: number;
  delay: number;
  glowDuration?: number;
  persistGlow?: boolean;
  callout?: CalloutSpec;
  demoUpdate?: Record<string, any>;
}

export type DemoUpdater = (key: string, value: any) => void;
