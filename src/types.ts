export interface Particle {
  id: string;
  isCollapsed: boolean;
  isLatent: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weight: number;
  level: number;
  lastInteractionTick: number;
  lastActiveTick: number;
  persistence: number;
  isConscious: boolean;
  color: string;
  latentTraces?: LatentTrace[];
}

export interface LatentTrace {
  weight: number;
  level: number;
  color: string;
  persistence: number;
}

export interface UniverseState {
  particles: Particle[];
  entropy: number;
  coherence: number;
  consciousnessCount: number;
  totalInformation: number;
  tick: number;
  viewportX: number;
  viewportY: number;
  zoom: number;
  maxCurvature: number;
}
