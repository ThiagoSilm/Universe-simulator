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
  isBlackHole?: boolean;     // collapsed state
  latentTraces?: LatentTrace[];
  potentialHistories?: { x: number; y: number; vx: number; vy: number }[];
  entangledId?: string | null; // Quantum entanglement partner ID
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
  knowledge: number;
  tools: number;
  age: number;
  
  // Quantum Refinement
  amplitude: number;
  phase: number;
  lastInteractionType?: 'interference' | 'entanglement' | 'collision';
  contextualBias: number;
  lastObservedTick: number;

  // Relativity & Photons
  isPhoton?: boolean;
  properTime?: number;

  // Cosmic Memory Traces
  traces?: { targetId: string; affinity: number; tick: number }[];
}

export interface Molecule {
  id: string;
  particleIds: string[];
  protons: number;
  neutrons: number;
  electrons: number;
  symbol: string;
  name: string;
  energy: number;
  isOrganic: boolean;
  isReplicating: boolean;
  generation: number;
  isStable: boolean;
}

export interface LatentTrace {
  weight: number;
  level: number;
  color: string;
  persistence: number;
}

export interface LatentInformation {
  x: number;
  y: number;
  data: any;
  intensity: number;
}

export interface HabitabilityCell {
  x: number;
  y: number;
  potential: number;
  coherence: number;
  density: number;
  activity: number;
}

export interface UniverseState {
  particles: Particle[];
  entropy: number;
  coherence: number;
  consciousnessCount: number;
  totalInformation: number;
  tick: number;
  maxCurvature: number;
  particleCount: number;
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
  technology: number;
  metaConsciousness: boolean;
  extinctionCycles: number;
  
  // Efficiency metrics
  eagerCost: number;
  lazyCost: number;
  efficiency: number;
  maxLevel: number;
  dormantCount: number;
  chargedCount: number;
  boundCount: number;
  
  // Relativity & Photons
  photonCount: number;
  avgTimeDilation: number;
  darkEnergy: number;
  
  // Discovery & History
  discoveryLog: { tick: number, event: string, category: 'quantum' | 'life' | 'civ' | 'cosmic' }[];
  
  campoLatente: LatentInformation[];
  events: string[];

  // legacy
  viewportX: number;
  viewportY: number;
  zoom: number;

  // Documentary Mode
  currentCycle: number;
  history: CycleHistory[];
  isSpectatorMode: boolean;
  lastNodes: number;
  lastRelations: number;
  significantEvents: { x: number, y: number, type: string, tick: number }[];

  // New Quantum Metrics
  avgPhase: number;
  interferenceCount: number;
  contextualityRate: number;
  entangledPairsCount: number;

  // Visualization / Debug
  activeGridKeys: string[];

  // Core Simulation Metrics
  decisionsPerTick: number;
  avgCandidates: number;
  totalSelfEnergy: number;
  activeTracesCount: number;
  blackHoleCount: number;
  horizonSize: number;
  systemTemperature: number;
  thermalGradient: number;
  persistenceScale: number;
  genesisActivity: number;
  explorationSuccessRate: number;
  nonLocalEfficiency: number;
  memoryUsage: number;
  habitabilityMap?: HabitabilityCell[];
}

export interface CycleHistory {
  cycleId: number;
  totalTicks: number;
  maxCulture: number;
  maxNodes: number;
  maxRelations: number;
  milestones: { tick: number; event: string }[];
}
