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
  waveRadius: number;        // de Broglie uncertainty — ħ/p; shrinks when fast/heavy
  spin: number;              // intrinsic angular momentum: +0.5 or -0.5
  charge: number;            // electromagnetic charge: -1 | 0 | +1
  // State flags
  isBound: boolean;          // in a nuclear bound state (atom analogue)
  latentTraces?: LatentTrace[];
  entangledWith?: string | null; // Quantum entanglement partner ID
  isDarkMatter?: boolean;    // Interacts only gravitationally
  
  // New properties for chemistry/biology
  moleculeId?: string | null;
  element?: 'C' | 'H' | 'O' | 'N' | null;
  energy: number;
  isMetabolizing: boolean;
  isReplicating: boolean;
  generation: number;

  // New properties for collective consciousness
  mentalModels: Record<string, { state: any, lastObserved: number }>;
  isCollectiveConscious: boolean;
}

export interface Molecule {
  id: string;
  particleIds: string[];
  elementComposition: { C: number, H: number, O: number, N: number };
  energy: number;
  isOrganic: boolean;
  isReplicating: boolean;
  generation: number;
}

export interface LatentTrace {
  weight: number;
  level: number;
  color: string;
  persistence: number;
}

export interface LatentInformation {
  posicao: { x: number, y: number };
  genoma: string; // or whatever type genoma is
  experiencias: any; // or whatever type memoria is
  timestamp: number;
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
  pairProductionCount: number;   // cumulative pair-production events
  annihilationCount: number;     // cumulative annihilation events
  fissionCount: number;          // cumulative fission events
  
  // New metrics
  moleculeCount: number;
  organicCount: number;
  replicantCount: number;
  maxGeneration: number;
  lifeCount: number;
  
  // Transformation metrics
  recycledMatterCount: number;
  latentTraceCount: number;
  fertility: number;
  
  // New metrics for collective consciousness
  relationsCount: number;
  collectiveConsciousnessNodes: number;
  culture: number;
  
  campoLatente: LatentInformation[];
  events: string[];

  // legacy
  viewportX: number;
  viewportY: number;
  zoom: number;
}
