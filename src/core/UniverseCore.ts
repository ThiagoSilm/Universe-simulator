export interface ParticleTrace {
  targetId: string;
  affinity: number;
  tick: number;
}

export interface ParticleCore {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weight: number;
  charge: number;
  isLatent: boolean;
  lastActiveTick: number;
  age: number;
  energy: number;
  phase: number;
  amplitude: number;
  level: number;
  element: 'H' | 'C' | 'O' | 'N';
  generation: number;
  traces: ParticleTrace[];
  isBlackHole: boolean;
  isBound: boolean;
  potentialHistories: { x: number; y: number; vx: number; vy: number }[];
  positionHistory: { x: number; y: number; tick: number }[];
  ax: number;
  ay: number;
}

class Quadtree {
  private particles: ParticleCore[] = [];
  private children: Quadtree[] = [];
  private centerX: number;
  private centerY: number;
  private size: number;
  private capacity: number = 4;
  private depth: number;
  private maxDepth: number = 12;

  constructor(x: number, y: number, size: number, depth: number = 0) {
    this.centerX = x;
    this.centerY = y;
    this.size = size;
    this.depth = depth;
  }

  public insert(p: ParticleCore): boolean {
    if (!this.contains(p.x, p.y)) return false;

    if (this.particles.length < this.capacity || this.depth >= this.maxDepth) {
      this.particles.push(p);
      return true;
    }

    if (this.children.length === 0) {
      this.subdivide();
    }

    for (const child of this.children) {
      if (child.insert(p)) return true;
    }

    return false;
  }

  private contains(x: number, y: number): boolean {
    return x >= this.centerX - this.size &&
           x <= this.centerX + this.size &&
           y >= this.centerY - this.size &&
           y <= this.centerY + this.size;
  }

  private subdivide() {
    const s = this.size / 2;
    const d = this.depth + 1;
    this.children = [
      new Quadtree(this.centerX - s, this.centerY - s, s, d),
      new Quadtree(this.centerX + s, this.centerY - s, s, d),
      new Quadtree(this.centerX - s, this.centerY + s, s, d),
      new Quadtree(this.centerX + s, this.centerY + s, s, d)
    ];

    for (const p of this.particles) {
      for (const child of this.children) {
        if (child.insert(p)) break;
      }
    }
    this.particles = [];
  }

  public query(x: number, y: number, radius: number, found: ParticleCore[] = []) {
    if (!this.intersects(x, y, radius)) return found;

    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        found.push(p);
      }
    }

    for (const child of this.children) {
      child.query(x, y, radius, found);
    }

    return found;
  }

  private intersects(x: number, y: number, r: number): boolean {
    const dx = Math.abs(x - this.centerX);
    const dy = Math.abs(y - this.centerY);

    if (dx > this.size + r) return false;
    if (dy > this.size + r) return false;

    if (dx <= this.size) return true;
    if (dy <= this.size) return true;

    const cornerDistanceSq = (dx - this.size) ** 2 + (dy - this.size) ** 2;
    return cornerDistanceSq <= r ** 2;
  }
}

export class UniverseCore {
  public particles: ParticleCore[] = [];
  public tickCount: number = 0;
  private expansionStarted: boolean = false;
  private currentHorizon: number = 50;
  private activeParticles: Set<ParticleCore> = new Set();
  private cosmicMemory: Map<string, ParticleTrace[]> = new Map();
  private seed: number;

  // Fundamental Constants
  private readonly C = 50; 
  private readonly H = 0.05; 
  private readonly G = 0.02; 
  private readonly LAMBDA = 0.0005; 
  private readonly PLANCK_LENGTH = 5; 
  private readonly EPS = 0.05; 
  private readonly PLANCK_TEMP = 1000; 
  private readonly BEKENSTEIN_LIMIT = 20; 
  
  // Influence Factors
  private G_influence = 1.0;
  private LAMBDA_influence = 1.0;
  private ENTROPY_influence = 1.0;

  private get effectiveG() { return Math.max(0.001, Math.min(0.1, this.G * this.G_influence)); }
  private get effectiveLAMBDA() { return Math.max(0.0001, Math.min(0.01, this.LAMBDA * this.LAMBDA_influence)); }
  private get effectiveENTROPY_DENSITY_FACTOR() { return Math.max(0.0001, Math.min(0.01, this.ENTROPY_DENSITY_FACTOR * this.ENTROPY_influence)); }

  public applyPhysicsInfluence(gFactor: number, lambdaFactor: number, entropyFactor: number) {
    this.G_influence = gFactor;
    this.LAMBDA_influence = lambdaFactor;
    this.ENTROPY_influence = entropyFactor;
  }

  private getKineticEnergy(p: ParticleCore): number {
    return 0.5 * p.weight * (p.vx * p.vx + p.vy * p.vy);
  }
  
  // Metrics for ObserverLayer
  public decisionsPerTick: number = 0;
  public avgCandidates: number = 0;
  public totalSelfEnergy: number = 0;
  public activeTracesCount: number = 0;
  public recentEvents: string[] = [];

  // Mitosis Constants
  private readonly MITOSIS_THRESHOLD = 50.0;
  private readonly MUTATION_RATE_PHYSICAL = 0.05;
  private readonly MUTATION_RATE_MEMORY = 0.3;

  // Entropy Constants
  private readonly ENTROPY_COST_BASE = 0.001;
  private readonly ENTROPY_DENSITY_FACTOR = 0.0005;
  private readonly TRACE_DECAY_RATE = 0.05;

  // Resource Budgets (Anti-Avalanche)
  private readonly OBSERVATION_BUDGET = 100; // Max wake-ups per tick
  private readonly RESOLUTION_BUDGET = 3000;  // Max neighbor checks per tick
  private currentObservationCount = 0;
  private observerPos: { x: number; y: number; radius: number } | null = null;

  constructor(seed: number = Math.random(), initialParticles: number = 5000) {
    this.seed = seed;
    this.initialize(initialParticles);
  }

  private initialize(count: number) {
    let r = this.seed;
    const nextR = () => {
      r = (r * 16807) % 2147483647;
      return r / 2147483647;
    };

    for (let i = 0; i < count; i++) {
      let isMassless = nextR() < 0.1; // 10% chance to be a photon
      let charge = isMassless ? 0 : (nextR() < 0.5 ? 1 : -1);
      let weight = isMassless ? 0.0005 : nextR() * 0.05 + 0.001;
      let vx = isMassless ? (nextR() - 0.5) * this.C : 0;
      let vy = isMassless ? (nextR() - 0.5) * this.C : 0;
      let isLatent = true;
      let x = i === 0 ? -1 : 1;

      if (count === 2) {
        // Minimum Big Bang: One positive, one negative
        isMassless = false;
        charge = i === 0 ? 1 : -1;
        weight = 0.05;
        x = i === 0 ? -20 : 20; // Start slightly apart
        vx = 0;
        vy = i === 0 ? 1.5 : -1.5; // Tangential velocity for orbit
        isLatent = false; // Start active to trigger the cascade
      }
      
      let element: 'H' | 'C' | 'O' | 'N' = 'H';
      if (charge > 0) element = 'C';
      else if (charge < 0) element = 'O';
      
      const p: ParticleCore = {
        id: `p-${i}`,
        x,
        y: 0,
        vx,
        vy,
        weight,
        charge,
        isLatent,
        lastActiveTick: 0,
        age: 0,
        energy: 1.0,
        phase: Math.floor((nextR() * Math.PI * 2) / this.H) * this.H,
        amplitude: nextR(),
        level: 1,
        element,
        generation: 0,
        traces: [],
        isBlackHole: false,
        isBound: false,
        potentialHistories: [],
        positionHistory: [],
        ax: 0,
        ay: 0,
      };
      // Initialize potential histories
      for (let j = 0; j < 3; j++) {
        p.potentialHistories.push({
          x: p.x + (nextR() - 0.5) * 100,
          y: p.y + (nextR() - 0.5) * 100,
          vx: p.vx + (nextR() - 0.5) * 2,
          vy: p.vy + (nextR() - 0.5) * 2
        });
      }
      this.particles.push(p);
      if (!isLatent) {
        this.activeParticles.add(p);
      }
    }
  }

  private performMitosis(p: ParticleCore) {
    // 1. Dissolve parent
    this.particles = this.particles.filter(part => part.id !== p.id);
    this.activeParticles.delete(p);
    
    // 2. Create two children
    for (let i = 0; i < 2; i++) {
      const child: ParticleCore = {
        ...p,
        id: `p-${this.tickCount}-${i}`, // Unique ID
        weight: p.weight / 2,
        energy: p.energy / 2,
        generation: p.generation + 1,
        // Mutation
        charge: p.charge + (Math.random() < this.MUTATION_RATE_PHYSICAL ? (Math.random() > 0.5 ? 1 : -1) : 0),
        phase: p.phase + (Math.random() - 0.5) * this.MUTATION_RATE_PHYSICAL,
        // Lazy Copy of Traces
        traces: p.traces.filter(() => Math.random() > this.MUTATION_RATE_MEMORY)
      };
      this.particles.push(child);
      this.activeParticles.add(child);
    }
  }

  public tick() {
    this.tickCount++;
    this.decisionsPerTick = 0;
    this.totalSelfEnergy = 0;
    this.activeTracesCount = 0;
    this.currentObservationCount = 0; // Reset budget
    let totalCandidatesFound = 0;

    const toSleep: ParticleCore[] = [];
    const toWake: ParticleCore[] = [];

    // 0. Lazy Path Integral for Latent Particles
    // Latent particles evolve their potential histories without collapsing
    for (const p of this.particles) {
      if (p.isLatent && !p.isBound) {
        for (const history of p.potentialHistories) {
          history.x += history.vx;
          history.y += history.vy;
          // Subtle drift in potential velocities
          history.vx += (Math.random() - 0.5) * 0.1;
          history.vy += (Math.random() - 0.5) * 0.1;
        }
      }
    }

    // Rebuild Quadtree for active particles
    const qt = new Quadtree(0, 0, 100000); // Expanded for cosmological growth
    for (const p of this.activeParticles) {
      qt.insert(p);
    }

    for (const p of this.activeParticles) {
      // 1. Cosmological Expansion (Λ)
      // Space expands, pushing particles away from center
      if (!p.isBlackHole) {
        p.x *= (1 + this.effectiveLAMBDA);
        p.y *= (1 + this.effectiveLAMBDA);
      }

      // 2. Tempo Próprio & Relatividade (c)
      // Massless particles (photons) do not experience time
      if (p.weight > 0.001) {
        p.age++;
      }
      
      // Store position history
      p.positionHistory.push({ x: p.x, y: p.y, tick: this.tickCount });
      if (p.positionHistory.length > 100) p.positionHistory.shift(); // Keep last 100 ticks

      if (!p.isBlackHole) {
        // Cap velocity at c
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        if (speedSq > this.C * this.C) {
          const speed = Math.sqrt(speedSq);
          p.vx = (p.vx / speed) * this.C;
          p.vy = (p.vy / speed) * this.C;
        } else if (p.weight <= 0.001 && speedSq < this.C * this.C * 0.99) {
          // Massless particles always travel at c
          const speed = Math.sqrt(speedSq) || 1;
          p.vx = (p.vx / speed) * this.C;
          p.vy = (p.vy / speed) * this.C;
        }

        p.x += p.vx;
        p.y += p.vy;
        
        // Velocity Drag (Energy Dissipation)
        p.vx *= 0.99;
        p.vy *= 0.99;
        
        // Boundary check (Universe Horizon)
        const horizon = this.expansionStarted ? (100 + this.decisionsPerTick * 0.1) : 50;
        if (Math.abs(p.x) > horizon) { p.vx *= -1; p.x = Math.sign(p.x) * horizon; }
        if (Math.abs(p.y) > horizon) { p.vy *= -1; p.y = Math.sign(p.y) * horizon; }
      }

      // 3. Auto-observação (h)
      // Singularities are points of silence, they don't self-observe
      if (!p.isBlackHole) {
        this.maintainCoherence(p);
      }

      // 4. Busca Local Ativa (G & Planck Length)
      // Singularities don't search, they only attract
      if (!p.isBlackHole) {
        // Resolution Budget: Stop resolving physics if we exceed the budget
        if (this.decisionsPerTick > this.RESOLUTION_BUDGET) {
          // Protected Lazy: Only resolve critical entities if we are over budget
          const isCritical = p.weight > 1.0 || p.energy > 50 || 
            (this.observerPos && Math.pow(p.x - this.observerPos.x, 2) + Math.pow(p.y - this.observerPos.y, 2) < Math.pow(this.observerPos.radius, 2));
          
          if (!isCritical) {
            p.x += p.vx;
            p.y += p.vy;
            continue;
          }
        }

        const neighbors = qt.query(p.x, p.y, 500); // Reduced range
        totalCandidatesFound += neighbors.length;
        
        // --- Entropy Law: Cost of Information Maintenance ---
        const density = neighbors.length;
        
        // Lazy Persistence Principle: Coupling redistributes and reduces effective dissipation
        const connectivity = p.traces.length;
        const couplingFactor = 1 + (connectivity * 0.2); 
        
        const entropyCost = (this.ENTROPY_COST_BASE + (density * this.effectiveENTROPY_DENSITY_FACTOR)) / couplingFactor;
        p.energy -= entropyCost;
        
        // Trace Decay: Information fades faster in dense environments, but coupling protects it
        if (density > 5 && p.traces.length > 0) {
          p.traces = p.traces.filter(() => Math.random() > (this.TRACE_DECAY_RATE / couplingFactor));
        }
        // ----------------------------------------------------

        if (neighbors.length > 1) {
          const { fx, fy } = this.calculateForce(p, neighbors);
          p.vx += fx / p.weight;
          p.vy += fy / p.weight;
          this.decisionsPerTick++;
          
          // Collision handling: Momentum & Information Exchange
          let fused = false;
          for (const n of neighbors) {
            if (n.id === p.id || p.id > n.id) continue;
            const dx = n.x - p.x;
            const dy = n.y - p.y;
            const distSq = dx * dx + dy * dy;
            // Reduce collision threshold to allow tight orbits without actual collision
            const collisionThreshold = (p.weight + n.weight) * 50;
            
            if (distSq < collisionThreshold) {
              if (p.charge * n.charge < 0) {
                this.expansionStarted = true;
              }
              // 1. Momentum Exchange (Elastic Collision)
              const m1 = p.weight;
              const m2 = n.weight;
              const v1x = p.vx;
              const v1y = p.vy;
              const v2x = n.vx;
              const v2y = n.vy;

              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const v1n = v1x * nx + v1y * ny;
              const v2n = v2x * nx + v2y * ny;

              if (v1n - v2n > 0) { // Moving towards each other
                const J = (2 * (v1n - v2n)) / (m1 + m2);
                p.vx -= J * m2 * nx;
                p.vy -= J * m2 * ny;
                n.vx += J * m1 * nx;
                n.vy += J * m1 * ny;
              }

              // 2. Heat Generation (Inelastic part) & 10% TLTE Rule
              const keP = this.getKineticEnergy(p);
              const keN = this.getKineticEnergy(n);
              
              // 10% of kinetic energy is lost in the collision
              const lostKeP = keP * 0.1;
              const lostKeN = keN * 0.1;
              
              // Reduce velocity to reflect lost kinetic energy (sqrt(0.9) ≈ 0.948)
              p.vx *= 0.948;
              p.vy *= 0.948;
              n.vx *= 0.948;
              n.vy *= 0.948;
              
              // TLTE Rule: Only 10% of the lost energy is transferred as useful internal heat
              // The other 90% is dissipated as entropy (lost to the environment)
              const totalLostKe = lostKeP + lostKeN;
              const usefulHeat = totalLostKe * 0.1; 
              
              p.energy += usefulHeat / 2;
              n.energy += usefulHeat / 2;

              // 3. Trace Exchange (Information Conservation)
              if (n.traces.length > 0) {
                const sharedTraces = n.traces.slice(0, 2);
                p.traces.push(...sharedTraces);
                if (p.traces.length > this.BEKENSTEIN_LIMIT) p.traces.splice(0, sharedTraces.length);
              }

              // 4. Fusion Check (Extreme conditions)
              const pressure = neighbors.length;
              const temperature = p.energy + n.energy;
              if (pressure > 20 && temperature > this.PLANCK_TEMP * 0.7) {
                this.performFusion(p, n);
                fused = true;
                break; 
              }
            }
          }
          if (fused) continue;
        } else {
          // Solitary trajectories dissipate faster (Lazy Persistence)
          p.energy -= 0.005 / couplingFactor;
        }
        
        // Natural cooling (reduced by coupling)
        p.energy -= 0.001 / couplingFactor;
      }

      // 5. Planck Temperature Check
      if (p.energy > this.PLANCK_TEMP) {
        p.energy = this.PLANCK_TEMP;
        if (!p.isBlackHole) {
          p.vx *= 1.2;
          p.vy *= 1.2;
        }
      }

      // 6. Mitosis Check
      if (!p.isBlackHole && p.weight > 0.001 && p.energy > this.MITOSIS_THRESHOLD) {
        this.performMitosis(p);
      }

      // 7. Singularity / Schwarzschild Collapse
      const rs = (2 * this.effectiveG * p.weight) / (this.C * this.C);
      if (!p.isBlackHole && (p.traces.length >= this.BEKENSTEIN_LIMIT || rs > this.PLANCK_LENGTH)) {
        p.isBlackHole = true; 
        p.energy = 0;
        p.vx = 0;
        p.vy = 0;
        p.traces = []; // Information is collapsed
      }

      this.activeTracesCount += p.traces.length;

      // Energy death or inactivity
      // Absorbed particles (isBound) or exhausted particles go to sleep
      if (p.isBound || (p.energy + this.getKineticEnergy(p)) <= 0) {
        if (!p.isBlackHole) toSleep.push(p);
      } else if (this.tickCount - p.lastActiveTick > 1000 && !p.isBlackHole) {
        toSleep.push(p);
      }
    }

    // 7. On-demand Generation beyond the horizon
    if (this.activeParticles.size < 500 && this.particles.length < 10000) {
      this.generateBeyondHorizon(10);
    }

    this.avgCandidates = this.decisionsPerTick > 0 ? totalCandidatesFound / this.decisionsPerTick : 0;

    // Background noise wake-up
    if (this.tickCount % 50 === 0 && this.activeParticles.size < 300) {
      const randomParticle = this.particles[Math.floor(Math.random() * this.particles.length)];
      if (randomParticle.isLatent) {
        toWake.push(randomParticle);
      }
    }

    for (const p of toWake) this.wakeUp(p);
    for (const p of toSleep) this.sleep(p);
  }

  private generateBeyondHorizon(count: number) {
    const horizon = 50000 + this.tickCount * this.effectiveLAMBDA * 100;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = horizon + Math.random() * 5000;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      
      const isMassless = Math.random() < 0.1; // 10% chance to be a photon
      const weight = isMassless ? 0.0005 : Math.random() * 0.05 + 0.001;
      
      const p: ParticleCore = {
        id: `p-gen-${this.tickCount}-${i}`,
        x, y,
        vx: -Math.cos(angle) * (isMassless ? this.C : 2), // Photons move at C
        vy: -Math.sin(angle) * (isMassless ? this.C : 2),
        weight,
        charge: isMassless ? 0 : (Math.random() < 0.5 ? 1 : -1), // Photons have no charge
        isLatent: true,
        lastActiveTick: this.tickCount,
        age: 0,
        energy: 1.0,
        phase: Math.random() * Math.PI * 2,
        amplitude: Math.random(),
        level: 1,
        element: 'H',
        generation: 0,
        traces: [],
        isBlackHole: false,
        isBound: false,
        potentialHistories: [],
        positionHistory: [],
        ax: 0,
        ay: 0
      };
      for (let j = 0; j < 3; j++) {
        p.potentialHistories.push({
          x: p.x + (Math.random() - 0.5) * 100,
          y: p.y + (Math.random() - 0.5) * 100,
          vx: p.vx + (Math.random() - 0.5) * 2,
          vy: p.vy + (Math.random() - 0.5) * 2
        });
      }
      this.particles.push(p);
    }
  }

  private maintainCoherence(p: ParticleCore) {
    // Quantized energy consumption (h)
    const cost = this.H * (1 + Math.sin(p.phase));
    p.energy -= cost;
    this.totalSelfEnergy += cost;
    
    // Quantized phase evolution (h)
    p.phase = (p.phase + this.H) % (Math.PI * 2);
    p.amplitude = 0.5 + 0.5 * Math.cos(p.phase);
  }

  private calculateForce(p: ParticleCore, neighbors: ParticleCore[]): { fx: number; fy: number } {
    const candidates = neighbors.filter(n => n.id !== p.id).slice(0, 10);
    if (candidates.length === 0) return { fx: 0, fy: 0 };

    let totalFx = 0;
    let totalFy = 0;

    for (const n of candidates) {
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      
      // Relational Space: Distance is effectively reduced if particles share traces (entanglement)
      const sharedTraces = p.traces.filter(t => t.targetId === n.id).length;
      const relationalFactor = 1 + (sharedTraces * 0.5);
      
      const distSq = (dx * dx + dy * dy) / relationalFactor + this.EPS;
      const dist = Math.sqrt(distSq);
      
      // Gravity (G) - always attractive
      const gravity = (this.effectiveG * p.weight * n.weight) / distSq;
      
      // Electrostatic (Coulomb-like)
      // Same charge repels, opposite attracts. Neutrals (charge 0) don't feel this.
      const electrostatic = -(p.charge * n.charge * 0.5) / distSq;
      
      // Quantum Repulsion (Pauli Exclusion / Strong Nuclear)
      // Prevents collapse, creates stable orbits. Very short range (1/r^4).
      // It pushes away, so it's a negative force contribution.
      const quantumRepulsion = - (0.5) / (distSq * distSq);
      
      const netForce = gravity + electrostatic + quantumRepulsion;
      
      totalFx += (dx / dist) * netForce;
      totalFy += (dy / dist) * netForce;

      // Virtual Photon Emission (Information exchange via field)
      // If there's a strong EM interaction, emit a virtual photon
      if (p.charge !== 0 && n.charge !== 0 && Math.random() < Math.abs(electrostatic) * 0.05) {
        this.emitVirtualPhoton(p, n);
      }

      // Information exchange (probabilistic)
      if (Math.random() < 0.1) {
        p.traces.push({ 
          targetId: n.id,
          affinity: Math.abs(netForce),
          tick: this.tickCount
        });
        if (p.traces.length > this.BEKENSTEIN_LIMIT) p.traces.shift();
      }
    }

    // Energy exchange (Quanta)
    p.energy = Math.min(this.PLANCK_TEMP, p.energy + this.H);
    p.lastActiveTick = this.tickCount;

    return { fx: totalFx, fy: totalFy };
  }

  private emitVirtualPhoton(source: ParticleCore, target: ParticleCore) {
    // A virtual photon is a massless, chargeless particle that carries information
    // It travels at C towards the target (or away, depending on interaction)
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + this.EPS;
    
    const photon: ParticleCore = {
      id: `ph-${this.tickCount}-${source.id}`,
      x: source.x,
      y: source.y,
      vx: (dx / dist) * this.C, // Travels at C towards target
      vy: (dy / dist) * this.C,
      weight: 0.0001, // Extremely light, almost massless
      charge: 0, // Photons have no charge
      isLatent: false, // Active immediately
      lastActiveTick: this.tickCount,
      age: 0,
      energy: this.H * 2, // Carries a quantum of energy
      phase: source.phase, // Carries phase information
      amplitude: source.amplitude,
      level: 0, // Base level
      element: 'H', // Doesn't matter for photons
      generation: source.generation,
      traces: [{ targetId: target.id, affinity: 1, tick: this.tickCount }], // Knows where it's going
      isBlackHole: false,
      isBound: false,
      potentialHistories: [],
      positionHistory: [],
      ax: 0,
      ay: 0
    };

    this.particles.push(photon);
    this.activeParticles.add(photon);
    
    // Slight recoil on source (conservation of momentum)
    source.vx -= photon.vx * 0.001;
    source.vy -= photon.vy * 0.001;
  }

  private wakeUp(p: ParticleCore) {
    if (p.isLatent) {
      p.isLatent = false;
      p.lastActiveTick = this.tickCount;
      p.energy = 1.0;
      
      // Lazy Path Integral Collapse: Choose one potential history
      if (p.potentialHistories.length > 0) {
        const chosen = p.potentialHistories[Math.floor(Math.random() * p.potentialHistories.length)];
        p.x = chosen.x;
        p.y = chosen.y;
        p.vx = chosen.vx;
        p.vy = chosen.vy;
      }

      // Recuperar traços da Memória Cósmica
      const savedTraces = this.cosmicMemory.get(p.id);
      if (savedTraces) {
        p.traces = [...savedTraces];
      }
      
      this.activeParticles.add(p);
    }
  }

  private sleep(p: ParticleCore) {
    if (!p.isLatent) {
      p.isLatent = true;
      
      // Absolute Conservation: Transform into latent traces
      // Instead of deleting, we ensure the particle remains in the system
      // but in a lower energy state, contributing to the "background"
      p.energy = 0.01; 
      
      // Compactar e salvar traços na Memória Cósmica
      if (p.traces.length > 0) {
        this.cosmicMemory.set(p.id, [...p.traces]);
      }
      
      this.activeParticles.delete(p);
    }
  }

  public observe(x: number, y: number, radius: number = 1000): number {
    this.observerPos = { x, y, radius }; // Store observer position for criticality checks
    const r2 = radius * radius;
    let observedCount = 0;
    
    for (let i = 0; i < this.particles.length; i++) {
      // Observation Budget: Stop waking up if we exceed the budget
      if (this.currentObservationCount >= this.OBSERVATION_BUDGET) break;

      const p = this.particles[i];
      
      // Absorbed particles cannot be observed
      if (p.isBound) continue;

      if (p.isLatent) {
        // Quantum Observation: Check potential histories
        const inRange = p.potentialHistories.some(h => {
          const dx = h.x - x;
          const dy = h.y - y;
          return dx * dx + dy * dy <= r2;
        });

        if (inRange) {
          this.wakeUp(p);
          observedCount++;
          this.currentObservationCount++;
        }
      } else {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= r2) {
          p.lastActiveTick = this.tickCount;
          observedCount++;
        }
      }
    }
    return observedCount;
  }

  public teleport(x: number, y: number) {
    this.recentEvents.push(`Salto Quântico: Setor (${Math.round(x)}, ${Math.round(y)})`);
    if (this.recentEvents.length > 10) this.recentEvents.shift();
    this.observe(x, y, 5000);
  }

  public getSystemTemperature(): number {
    if (this.activeParticles.size === 0) return 0;
    let totalKE = 0;
    for (const p of this.activeParticles) {
      totalKE += this.getKineticEnergy(p);
    }
    return totalKE / this.activeParticles.size;
  }

  public getThermalGradient(): number {
    if (this.activeParticles.size < 2) return 0;
    const avgTemp = this.getSystemTemperature();
    let varianceSum = 0;
    for (const p of this.activeParticles) {
      const ke = this.getKineticEnergy(p);
      varianceSum += (ke - avgTemp) * (ke - avgTemp);
    }
    return Math.sqrt(varianceSum / this.activeParticles.size);
  }

  public getSnapshot(viewport?: { x: number, y: number, width: number, height: number, scale: number }) {
    // Lazy Snapshot: Only send active particles and a stable subset of latent ones
    // This significantly reduces worker postMessage overhead and main thread rendering load.
    let active = Array.from(this.activeParticles);
    
    // Viewport Filtering: If viewport is provided, prioritize particles inside it
    if (viewport) {
      const margin = 500 / viewport.scale; // Extra margin for smooth entry
      const left = viewport.x - viewport.width / (2 * viewport.scale) - margin;
      const right = viewport.x + viewport.width / (2 * viewport.scale) + margin;
      const top = viewport.y - viewport.height / (2 * viewport.scale) - margin;
      const bottom = viewport.y + viewport.height / (2 * viewport.scale) + margin;

      active = active.filter(p => p.x > left && p.x < right && p.y > top && p.y < bottom);
    }
    
    // We send a 10% sample of latent particles to maintain the "quantum background" visual
    // without the cost of 5000 objects.
    const sampledLatent = this.particles.filter((p, i) => p.isLatent && i % 10 === 0);
    
    const photonCount = this.particles.filter(p => p.weight <= 0.001).length;

    return {
      tick: this.tickCount,
      particles: [...active, ...sampledLatent].map(p => {
        const { potentialHistories, ...rest } = p;
        return { ...rest };
      }),
      activeCount: this.activeParticles.size,
      totalCount: this.particles.length,
      metrics: {
        decisionsPerTick: this.decisionsPerTick,
        avgCandidates: this.avgCandidates,
        totalSelfEnergy: this.totalSelfEnergy,
        activeTracesCount: this.activeTracesCount,
        systemTemperature: this.getSystemTemperature(),
        thermalGradient: this.getThermalGradient(),
        photonCount,
        events: this.recentEvents,
        universeHorizon: 50000 + this.tickCount * this.effectiveLAMBDA * 100
      }
    };
  }

  public getPersistentState() {
    return {
      seed: this.seed,
      tickCount: this.tickCount,
      cosmicMemory: Array.from(this.cosmicMemory.entries()),
      latentTraces: this.particles.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        isLatent: p.isLatent,
        lastActiveTick: p.lastActiveTick,
        energy: p.energy,
        age: p.age,
        phase: p.phase,
        amplitude: p.amplitude,
        level: p.level,
        weight: p.weight,
        isBlackHole: p.isBlackHole,
        isBound: p.isBound,
        potentialHistories: p.potentialHistories
      }))
    };
  }

  public loadPersistentState(state: any) {
    this.seed = state.seed;
    this.tickCount = state.tickCount;
    this.activeParticles.clear();
    
    if (state.cosmicMemory) {
      this.cosmicMemory = new Map(state.cosmicMemory);
    }
    
    state.latentTraces.forEach((trace: any) => {
      const p = this.particles.find(part => part.id === trace.id);
      if (p) {
        p.x = trace.x;
        p.y = trace.y;
        p.vx = trace.vx;
        p.vy = trace.vy;
        p.isLatent = trace.isLatent;
        p.lastActiveTick = trace.lastActiveTick;
        p.energy = trace.energy ?? 1.0;
        p.age = trace.age ?? 0;
        p.phase = trace.phase ?? 0;
        p.amplitude = trace.amplitude ?? 1.0;
        p.level = trace.level ?? 1;
        p.weight = trace.weight ?? 1.0;
        p.isBlackHole = trace.isBlackHole ?? false;
        p.isBound = trace.isBound ?? false;
        p.potentialHistories = trace.potentialHistories ?? [];
        if (!p.isLatent) {
          this.activeParticles.add(p);
        }
      }
    });
  }

  private performFusion(p1: ParticleCore, p2: ParticleCore) {
    // 1. Remove parents
    this.particles = this.particles.filter(p => p.id !== p1.id && p.id !== p2.id);
    this.activeParticles.delete(p1);
    this.activeParticles.delete(p2);

    // 2. Create new particle
    const totalWeight = p1.weight + p2.weight;
    let newElement: 'H' | 'C' | 'O' | 'N' = 'H';
    if (totalWeight > 0.1) newElement = 'C';
    if (totalWeight > 0.2) newElement = 'O';
    if (totalWeight > 0.3) newElement = 'N';

    const fused: ParticleCore = {
      id: `f-${this.tickCount}-${p1.id}-${p2.id}`,
      x: (p1.x * p1.weight + p2.x * p2.weight) / totalWeight,
      y: (p1.y * p1.weight + p2.y * p2.weight) / totalWeight,
      vx: (p1.vx * p1.weight + p2.vx * p2.weight) / totalWeight,
      vy: (p1.vy * p1.weight + p2.vy * p2.weight) / totalWeight,
      weight: totalWeight,
      charge: p1.charge + p2.charge,
      isLatent: false,
      lastActiveTick: this.tickCount,
      age: 0,
      // 10% TLTE Rule: Only 10% of the combined energy is retained as useful internal energy.
      // 90% is dissipated as entropy (heat lost to the universe) during the violent fusion process.
      energy: (p1.energy + p2.energy) * 0.1, 
      phase: (p1.phase + p2.phase) / 2,
      amplitude: (p1.amplitude + p2.amplitude) / 2,
      level: Math.max(p1.level, p2.level) + 1,
      element: newElement,
      generation: Math.max(p1.generation, p2.generation) + 1,
      traces: [...p1.traces, ...p2.traces].slice(0, this.BEKENSTEIN_LIMIT),
      isBlackHole: false,
      isBound: false,
      potentialHistories: [],
      positionHistory: [],
      ax: 0, ay: 0
    };

    this.particles.push(fused);
    this.activeParticles.add(fused);
    this.recentEvents.push(`Fusão Estelar: ${p1.element}+${p2.element} -> ${newElement}`);
    if (this.recentEvents.length > 10) this.recentEvents.shift();
  }
}
