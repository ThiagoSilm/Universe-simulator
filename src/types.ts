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
  // Quantum state
  waveRadius: number;        // uncertainty radius — shrinks on interaction, grows in isolation
  // Electromagnetic charge: -1 | 0 | +1
  charge: number;
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
  maxCurvature: number;
  avgTemperature: number;
  // legacy fields kept for compatibility
  viewportX: number;
  viewportY: number;
  zoom: number;
}
