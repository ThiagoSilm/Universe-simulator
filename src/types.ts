export interface MemoryRecord {
  id: string;
  description: string;
  weight: number;
  tick: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number; // Internal vector x
  vy: number; // Internal vector y
  pt: number; // P(t) Potential total
  charge: number;
  phase: number;
  isUser?: boolean;
  memory: MemoryRecord[];
  
  // UI/Visualization specific
  contextualWeight?: number;
  isLeader?: boolean;
  isInCluster?: boolean;
  clusterId?: string;
  frequency?: number;
  isResonant?: boolean;
  isAligned?: boolean;
}

export interface Stimulus {
  id: string;
  x: number;
  y: number;
  scaleRelevance: number;
  frequency: number;
  vector: { x: number; y: number };
}

export interface Cluster {
  id: string;
  particleIds: string[];
  stimulusId?: string;
  dominantFrequency?: number;
  averageVector?: { x: number; y: number };
}

export interface SimulationState {
  particles: Particle[];
  stimuli: Stimulus[];
  clusters: Cluster[];
  tick: number;
  
  // Constants/Parameters
  lambda: number; // Expansion
  c: number;      // Max frequency
  h: number;      // Min memory weight
  resonanceThreshold: number;
  alignmentThreshold: number;
  dissipationRate: number;
  influenceRadius: number;
}

export type UniverseState = SimulationState;
