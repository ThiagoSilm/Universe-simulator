export type ParticleType = "matter" | "energy" | "singularity" | "life";

export interface Particle {
  id: string;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  
  // Lazy Universe Properties
  persistence: number;    // 0 to 1: How "real" the particle is. < 0.1 = Latent.
  information: number;    // Accumulated "bits" of interaction.
  entropy: number;        // Decay rate of information/persistence.
  
  // Quantum/Emergent Properties
  entangledId?: string;   // ER=EPR bridge
  composition: Record<string, number>; // C, H, O, N, etc.
  
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
