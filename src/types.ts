export type ParticleType = "matter" | "energy" | "singularity" | "life";
export type ParticleRole = "leader" | "coupler" | "none";

export interface Particle {
  id: string;
  type: ParticleType;
  role: ParticleRole;
  charge: number; 
  x: number;
  y: number;
  vx: number;
  vy: number;
  
  // Resonance Properties
  frequency: number;      // The "signature" of the particle
  phase: number;          // Current state in its cycle
  
  // Lazy Universe Properties
  persistence: number;
  information: number;
  entropy: number;
  
  // Quantum/Emergent Properties
  entangledId?: string;
  composition: Record<string, number>;
  
  // State
  isLatent: boolean;
  isCollapsed: boolean;
}

export interface SimulationState {
  particles: Particle[];
  tick: number;
  bounds: { width: number; height: number };
  metrics: {
    activeParticles: number;
    totalInformation: number;
    emergentComplexity: number;
  };
}

export interface WorkerMessage {
  type: "TICK" | "INIT" | "STIMULUS";
  payload?: any;
}

export interface WorkerResponse {
  type: "STATE_UPDATE";
  payload: SimulationState;
}
