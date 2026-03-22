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
  isCollapsed: boolean;
  waveRadius: number;
  spin: number;
  color: string;
  isDarkMatter: boolean;
  isPhoton: boolean;
  isConscious: boolean;
  moleculeId?: string | null;
  potentialHistories: { x: number; y: number; vx: number; vy: number }[];
  positionHistory: { x: number; y: number; tick: number }[];
  ax: number;
  ay: number;
  persistence: number;
  lastReward?: number;
  lastMutation?: { type: 'phase' | 'direction' | 'energy'; value: number };
  entangledId?: string;
  lastObservedTick: number;
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
  private particleMap: Map<string, ParticleCore> = new Map();
  private cosmicMemory: Map<string, ParticleTrace[]> = new Map();
  private vacuumMemory: { phase: number; traces: ParticleTrace[]; energy: number }[] = [];
  private readonly MAX_VACUUM_MEMORY = 1000;
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
  private readonly MEMORY_THRESHOLD = 2000; // Ticks a particle stays active after being observed
  private currentGenesisRate = 0.008;
  private habitabilityMap: Map<string, { potential: number, coherence: number, density: number, activity: number }> = new Map();
  private readonly HABITABILITY_GRID_SIZE = 800;
  private successfulExplorations = 0;
  private totalExplorations = 0;
  private nonLocalInteractions = 0;
  
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
  private readonly BASE_OBSERVATION_BUDGET = 100;
  private readonly BASE_RESOLUTION_BUDGET = 3000;
  private readonly DT = 0.1; // Integration time step
  private readonly MAX_FORCE = 5.0; // Force saturation limit
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
        lastObservedTick: 0,
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
        isCollapsed: !isLatent,
        waveRadius: isMassless ? 0 : 20,
        spin: nextR() < 0.5 ? 1 : -1,
        color: isMassless ? 'rgba(255,255,255,0.8)' : (charge > 0 ? 'rgba(255,120,60,0.2)' : 'rgba(60,120,255,0.2)'),
        isDarkMatter: nextR() < 0.2, // 20% dark matter
        isPhoton: isMassless,
        isConscious: false,
        moleculeId: null,
        potentialHistories: [],
        positionHistory: [],
        ax: 0,
        ay: 0,
        persistence: 1.0,
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

    // Emergent Genesis Calculation: G = f(Chaos, Void)
    // This makes the "Vacuum Instability" a consequence of the system's state.
    const activeCount = this.activeParticles.size;
    const totalCount = this.particles.length || 1;
    const activityLevel = activeCount / totalCount;
    
    let sumCos = 0;
    let sumSin = 0;
    for (const p of this.activeParticles) {
      sumCos += Math.cos(p.phase);
      sumSin += Math.sin(p.phase);
    }
    const coherence = activeCount > 0 ? Math.sqrt(sumCos * sumCos + sumSin * sumSin) / activeCount : 0;

    // Parameters for the Genesis Function
    const alpha = 0.006; // Chaos sensitivity (low coherence -> high genesis)
    const beta = 0.014;  // Void sensitivity (low activity -> high genesis)
    const baseInstability = 0.001; // Minimum quantum jitter
    
    this.currentGenesisRate = baseInstability + (alpha * (1 - coherence)) + (beta * (1 - activityLevel));
    
    // Continuous Genesis (Gênese Contínua)
    // This represents the spontaneous emergence of new information/potential.
    // It prevents the system from staying in an absorbing state (thermal death).
    if (Math.random() < this.currentGenesisRate && this.particles.length > 0) {
      const randomIdx = Math.floor(Math.random() * this.particles.length);
      const p = this.particles[randomIdx];
      
      // Inject Energy & Information
      p.energy += 0.8;
      p.vx += (Math.random() - 0.5) * 2.0;
      p.vy += (Math.random() - 0.5) * 2.0;
      
      // Spontaneous Information Seed: Create a random trace to trigger potential interactions
      if (!p.traces) p.traces = [];
      const targetIdx = Math.floor(Math.random() * this.particles.length);
      p.traces.push({
        targetId: this.particles[targetIdx].id,
        affinity: 0.1,
        tick: this.tickCount
      });

      // Lazy RAG: Query vacuum memory for initial state
      if (this.vacuumMemory.length > 0 && Math.random() < 0.3) { // 30% chance to inherit culture
        const culture = this.vacuumMemory[Math.floor(Math.random() * this.vacuumMemory.length)];
        p.phase = culture.phase;
        p.energy = Math.max(1.0, culture.energy * 0.5); // Inherit some energy
        p.traces.push(...culture.traces.slice(0, 2)); // Inherit up to 2 traces
      }

      this.wakeUp(p);
      this.recentEvents.push("Gênese Contínua: Instabilidade do vácuo detectada");
    }

    this.updateHabitabilityMap();

    // Reset exploration counters periodically to maintain a "recent" success rate
    if (this.tickCount % 1000 === 0) {
      this.successfulExplorations = 0;
      this.totalExplorations = 0;
      this.nonLocalInteractions = 0;
    }

    // Adaptive Budgets: Scale based on system efficiency and entropy
    // If efficiency is high, we can afford more resolution.
    // If entropy is high, we need more resolution to maintain coherence.
    const efficiencyFactor = 1.0 + (this.activeParticles.size / (this.particles.length || 1));
    const entropyFactor = 1.0 + (this.getThermalGradient() * 0.1);
    const adaptiveResolutionBudget = this.BASE_RESOLUTION_BUDGET * efficiencyFactor * entropyFactor;
    const adaptiveObservationBudget = this.BASE_OBSERVATION_BUDGET * efficiencyFactor;

    let totalCandidatesFound = 0;

    const toSleep: ParticleCore[] = [];
    const toWake: ParticleCore[] = [];
    const toDissolve: ParticleCore[] = [];

    // 0. Lazy Path Integral for Latent Particles (O(1) True Lazy Evaluation)
    // The loop was removed. Latent particles now only calculate their accumulated
    // drift mathematically when they are awakened (in wakeUp).

    // Rebuild Quadtree for active particles
    const qt = new Quadtree(0, 0, 100000); // Expanded for cosmological growth
    this.particleMap.clear();
    for (const p of this.particles) {
      this.particleMap.set(p.id, p);
      if (this.activeParticles.has(p)) {
        qt.insert(p);
      }
    }

    const currentActivityLevel = this.activeParticles.size / (this.particles.length || 1);
    const expansionRate = this.effectiveLAMBDA * (currentActivityLevel > 0.001 ? 1.0 : 0.05);

    const COLLAPSE_THRESHOLD = 100;

    for (const p of this.activeParticles) {
      // Update waveRadius based on momentum (de Broglie wavelength)
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 0.001;
      const momentum = p.weight * speed;
      p.waveRadius = momentum > 0 ? (20 / (1 + momentum * 10)) : 50;

      // Decoherence: Particles collapse when observed, and slowly return to wave state
      // Observability is a function of persistence. Low persistence = loss of definition.
      if (p.persistence < 0.5 || (this.tickCount - p.lastObservedTick > COLLAPSE_THRESHOLD)) {
        p.isCollapsed = false;
      }

      // 1. Cosmological Expansion (Λ)
      // Space expands, pushing particles away from center
      if (!p.isBlackHole) {
        p.x *= (1 + expansionRate);
        p.y *= (1 + expansionRate);
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
        const currentSpeedSq = p.vx * p.vx + p.vy * p.vy;
        if (currentSpeedSq > this.C * this.C) {
          const speed = Math.sqrt(currentSpeedSq);
          p.vx = (p.vx / speed) * this.C;
          p.vy = (p.vy / speed) * this.C;
        } else if (p.weight <= 0.001 && currentSpeedSq < this.C * this.C * 0.99) {
          // Massless particles always travel at c
          const speed = Math.sqrt(currentSpeedSq) || 1;
          p.vx = (p.vx / speed) * this.C;
          p.vy = (p.vy / speed) * this.C;
        }

        p.x += p.vx * this.DT;
        p.y += p.vy * this.DT;
        
        // ── Exploratory Dynamics: State Space Search ──────────────────
        // Particles explore local configurations to maximize persistence.
        // This is "learning without consciousness" via local feedback.
        if (this.tickCount % 5 === 0) {
          const currentReward = p.persistence + (p.isBound ? 2.0 : 0);
          this.totalExplorations++;

          if (p.lastReward !== undefined && currentReward < p.lastReward) {
            // Revert last mutation if it was detrimental
            if (p.lastMutation) {
              if (p.lastMutation.type === 'phase') p.phase -= p.lastMutation.value;
              if (p.lastMutation.type === 'direction') {
                const invAngle = -p.lastMutation.value;
                const cos = Math.cos(invAngle);
                const sin = Math.sin(invAngle);
                const rx = p.vx * cos - p.vy * sin;
                const ry = p.vx * sin + p.vy * cos;
                p.vx = rx;
                p.vy = ry;
              }
              if (p.lastMutation.type === 'energy') p.energy -= p.lastMutation.value;
            }
          } else if (p.lastReward !== undefined && currentReward > p.lastReward) {
            this.successfulExplorations++;
          }

          // Test a new variation
          p.lastReward = currentReward;
          const mutationType = Math.random();
          if (mutationType < 0.33) {
            const dPhase = (Math.random() - 0.5) * 0.15;
            p.phase += dPhase;
            p.lastMutation = { type: 'phase', value: dPhase };
          } else if (mutationType < 0.66) {
            const dAngle = (Math.random() - 0.5) * 0.08;
            const cos = Math.cos(dAngle);
            const sin = Math.sin(dAngle);
            const rx = p.vx * cos - p.vy * sin;
            const ry = p.vx * sin + p.vy * cos;
            p.vx = rx;
            p.vy = ry;
            p.lastMutation = { type: 'direction', value: dAngle };
          } else {
            const dEnergy = (Math.random() - 0.5) * 0.05;
            p.energy += dEnergy;
            p.lastMutation = { type: 'energy', value: dEnergy };
          }
        }

        // Velocity Drag (Energy Dissipation)
        p.vx *= 0.98; // Slightly increased drag for stability
        p.vy *= 0.98;

        // Stochastic Noise (Simulated Annealing)
        // Prevents getting stuck in local minima, allows discovery of new states
        const noiseScale = Math.min(0.05, 0.01 * (1.0 + this.getThermalGradient() * 0.1));
        const nx = (Math.random() - 0.5) * noiseScale;
        const ny = (Math.random() - 0.5) * noiseScale;
        p.vx += nx;
        p.vy += ny;

        // Movement Cost (Search Penalty)
        // Changing state/position costs persistence
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        const movementCost = speedSq * 0.05; // Increased cost to compete with gains
        p.persistence -= movementCost;
        
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
        if (this.decisionsPerTick > adaptiveResolutionBudget) {
          // Protected Lazy: Only resolve critical entities if we are over budget
          const criticality = this.calculateCriticality(p);
          
          if (criticality < 0.5) {
            // Stochastic Drift: Simulate unresolved quantum interactions
            // Instead of pure linear motion, we add a "path integral noise"
            const noise = (Math.random() - 0.5) * 0.05;
            p.x += p.vx + noise;
            p.y += p.vy + noise;
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

        // Persistence Update (Dynamic Stability)
        // Persistence grows in stable environments (coupling) and decays in high-entropy ones.
        const couplingBonus = p.traces.length * 0.001;
        const entropyPenalty = density * 0.0001;
        // Strict Sustainability: No artificial minimum. If it drops <= 0, it dissolves.
        p.persistence = Math.min(2.0, p.persistence + couplingBonus - entropyPenalty);
        
        // Observer Effect: Conscious particles stabilize their neighborhood
        if (p.isConscious) {
          for (const n of neighbors) {
            if (n.id !== p.id) {
              n.persistence += 0.001; // Persistence boost
              n.energy += 0.0005; // Entropy reduction (energy preservation)
            }
          }
        }
        
        // Trace Decay: Information fades faster in dense environments, but coupling protects it
        if (density > 5 && p.traces.length > 0) {
          p.traces = p.traces.filter(() => Math.random() > (this.TRACE_DECAY_RATE / couplingFactor));
        }
        
        // Strict Bekenstein Limit: If spatial density exceeds substrate capacity, force dissipation
        if (density > 30) {
           p.persistence -= 0.2; // Massive penalty for exceeding information density limit
        }
        // ----------------------------------------------------

        if (neighbors.length > 1) {
          const { fx, fy } = this.calculateForce(p, neighbors);
          p.vx += (fx / p.weight) * this.DT;
          p.vy += (fy / p.weight) * this.DT;
          this.decisionsPerTick++;
          
          // ── ER=EPR: Non-local Bridge ───────────────────────────────
          // If entangled, interact directly regardless of distance.
          if (p.entangledId) {
            const entangledPartner = this.particles.find(part => part.id === p.entangledId);
            if (entangledPartner && entangledPartner.isLatent === false) {
              const { fx: efx, fy: efy } = this.calculateNonLocalForce(p, entangledPartner);
              p.vx += (efx / p.weight) * this.DT;
              p.vy += (efy / p.weight) * this.DT;
              this.nonLocalInteractions++;
              
              // Entanglement counts as observation for both
              p.lastObservedTick = this.tickCount;
              entangledPartner.lastObservedTick = this.tickCount;
            } else if (!entangledPartner) {
              p.entangledId = undefined; // Partner lost
            }
          }
          
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
        this.recentEvents.push("Singularidade: Colapso de informação detectado");
      }

      // 8. Emergent Observer Nodes (Consequence of High Persistence/Efficiency)
      // If a particle has high persistence, high traces (info), and low entropy,
      // it becomes a conscious observer node.
      if (!p.isConscious && !p.isLatent && p.persistence > 1.5 && p.traces.length > 5) {
        p.isConscious = true;
        this.recentEvents.push("Consciência Emergente: Observador detectado em cluster de alta eficiência");
      }

      this.activeTracesCount += p.traces.length;

      // Energy death or inactivity
      // Absorbed particles (isBound) or exhausted particles go to sleep
      // Memory Check: If recently observed, it stays active
      const isRemembered = (this.tickCount - p.lastObservedTick) < this.MEMORY_THRESHOLD;
      
      if (p.persistence <= 0) {
        // ER=EPR Survival Mechanism (Quantum Insurance)
        // If entangled, try to drain persistence from partner to survive
        let savedByEntanglement = false;
        if (p.entangledId) {
          const partner = this.particleMap.get(p.entangledId);
          if (partner && !partner.isLatent && partner.persistence > 0.5) {
            partner.persistence -= 0.3; // Cost of saving the partner
            p.persistence += 0.3; // Drained through the wormhole
            savedByEntanglement = true;
            this.recentEvents.push("ER=EPR: Partícula salva por entrelaçamento não-local");
          }
        }
        
        if (!savedByEntanglement) {
          // Strict Sustainability: Dissolve completely
          toDissolve.push(p);
        }
      } else if (p.isBound || (p.energy + this.getKineticEnergy(p)) <= 0) {
        if (!p.isBlackHole && !isRemembered) toSleep.push(p);
      } else if (this.tickCount - p.lastActiveTick > 1000 && !p.isBlackHole && !isRemembered) {
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
    
    if (toDissolve.length > 0) {
      const dissolveSet = new Set(toDissolve.map(p => p.id));
      this.particles = this.particles.filter(p => !dissolveSet.has(p.id));
      for (const p of toDissolve) {
        this.activeParticles.delete(p);
        this.particleMap.delete(p.id);
        this.cosmicMemory.delete(p.id);
        
        // Lazy RAG: Save culture to vacuum memory
        if (p.traces.length > 0 || p.energy > 1.5) {
          this.vacuumMemory.push({ phase: p.phase, traces: [...p.traces], energy: p.energy });
          if (this.vacuumMemory.length > this.MAX_VACUUM_MEMORY) {
            this.vacuumMemory.shift(); // Keep only recent/most relevant culture
          }
        }
      }
      this.recentEvents.push(`Sustentabilidade: ${toDissolve.length} partículas dissipadas (P(t) <= 0)`);
    }
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
        lastObservedTick: this.tickCount,
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
        isCollapsed: false,
        waveRadius: isMassless ? 0 : 20,
        spin: Math.random() < 0.5 ? 1 : -1,
        color: isMassless ? 'rgba(255,255,255,0.8)' : (Math.random() < 0.5 ? 'rgba(255,120,60,0.2)' : 'rgba(60,120,255,0.2)'),
        isDarkMatter: Math.random() < 0.2,
        isPhoton: isMassless,
        isConscious: false,
        moleculeId: null,
        potentialHistories: [],
        positionHistory: [],
        ax: 0,
        ay: 0,
        persistence: 1.0
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
    // Edge of Chaos: Add small stochastic noise to phase to prevent perfect crystallization
    const phaseNoise = (Math.random() - 0.5) * 0.01;
    p.phase = (p.phase + this.H + phaseNoise) % (Math.PI * 2);
    p.amplitude = 0.5 + 0.5 * Math.cos(p.phase);
  }

  private calculateForce(p: ParticleCore, neighbors: ParticleCore[]): { fx: number; fy: number } {
    // ── ER=EPR Non-Local Bridge ──────────────────────────────────
    // We add entangled partners (from traces) that might be outside the standard query radius.
    // This allows long-range interactions without intermediate space computation.
    const nonLocalPartners: ParticleCore[] = [];
    for (const trace of p.traces) {
      if (trace.affinity > 0.5) { // Only strong entanglements form bridges
        const partner = this.particleMap.get(trace.targetId);
        if (partner && !neighbors.some(n => n.id === partner.id)) {
          nonLocalPartners.push(partner);
          this.nonLocalInteractions++;
        }
      }
    }

    const candidates = [...neighbors.filter(n => n.id !== p.id), ...nonLocalPartners].slice(0, 12);
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
      
      // Stability Gradient (P-Field) with Logistic Saturation
      // Particles are pushed towards regions of higher stability (persistence)
      // This is not "seeking", but responding to a local gradient.
      const rawStabilityGradient = (n.persistence * 0.05) / distSq;
      const stabilityGradient = rawStabilityGradient / (1 + Math.abs(rawStabilityGradient));
      
      const netForce = gravity + electrostatic + quantumRepulsion + stabilityGradient;
      const clampedForce = Math.max(-this.MAX_FORCE, Math.min(this.MAX_FORCE, netForce));
      
      totalFx += (dx / dist) * clampedForce;
      totalFy += (dy / dist) * clampedForce;

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

        // EPR Entanglement Creation
        // If interaction is strong and they aren't entangled, they might entangle.
        if (!p.entangledId && !n.entangledId && Math.abs(netForce) > 0.5 && Math.random() < 0.05) {
          p.entangledId = n.id;
          n.entangledId = p.id;
        }
      }
    }

    // Energy exchange (Quanta)
    p.energy = Math.min(this.PLANCK_TEMP, p.energy + this.H);
    p.lastActiveTick = this.tickCount;

    return { fx: totalFx, fy: totalFy };
  }

  private calculateNonLocalForce(p: ParticleCore, n: ParticleCore): { fx: number; fy: number } {
    // ER=EPR Bridge: Interaction without intermediate space.
    // We simulate a "virtual distance" that is very small.
    const dx = n.x - p.x;
    const dy = n.y - p.y;
    const realDistSq = dx * dx + dy * dy;
    
    // The "wormhole" distance is fixed and small, regardless of real distance.
    const wormholeDistSq = 10.0 + this.EPS; 
    const dist = Math.sqrt(wormholeDistSq);
    
    // Gravity (G) - always attractive
    const gravity = (this.effectiveG * p.weight * n.weight) / wormholeDistSq;
    
    // Electrostatic (Coulomb-like)
    const electrostatic = -(p.charge * n.charge * 0.5) / wormholeDistSq;
    
    // Quantum Repulsion (Pauli Exclusion) - weaker in wormhole to allow coupling
    const quantumRepulsion = - (0.1) / (wormholeDistSq * wormholeDistSq);
    
    const netForce = gravity + electrostatic + quantumRepulsion;
    const clampedForce = Math.max(-this.MAX_FORCE, Math.min(this.MAX_FORCE, netForce));
    
    // Direction is still based on real space to maintain causal orientation, 
    // but magnitude is non-local.
    const realDist = Math.sqrt(realDistSq) || 1;
    return { 
      fx: (dx / realDist) * clampedForce, 
      fy: (dy / realDist) * clampedForce 
    };
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
      lastObservedTick: this.tickCount,
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
      isCollapsed: true,
      waveRadius: 0,
      spin: 1,
      color: 'rgba(255,255,255,0.8)',
      isDarkMatter: false,
      isPhoton: true,
      isConscious: false,
      moleculeId: null,
      potentialHistories: [],
      positionHistory: [],
      ax: 0,
      ay: 0,
      persistence: 1.0
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
      
      // True Lazy Evaluation: Calculate elapsed time and apply drift in O(1)
      const deltaTicks = this.tickCount - p.lastActiveTick;
      if (deltaTicks > 0) {
        for (const history of p.potentialHistories) {
          // Apply accumulated drift mathematically
          history.x += history.vx * deltaTicks;
          history.y += history.vy * deltaTicks;
          // Add accumulated noise (random walk variance scales with sqrt(time))
          const noiseScale = 0.1 * Math.sqrt(deltaTicks);
          history.vx += (Math.random() - 0.5) * noiseScale;
          history.vy += (Math.random() - 0.5) * noiseScale;
        }
      }

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
    
    // Adaptive Observation Budget
    const efficiencyFactor = 1.0 + (this.activeParticles.size / (this.particles.length || 1));
    const adaptiveObservationBudget = this.BASE_OBSERVATION_BUDGET * efficiencyFactor;

    for (let i = 0; i < this.particles.length; i++) {
      // Observation Budget: Stop waking up if we exceed the budget
      if (this.currentObservationCount >= adaptiveObservationBudget) break;

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
          p.isCollapsed = true; // Collapse on observation
          p.lastObservedTick = this.tickCount;
          this.wakeUp(p);
          observedCount++;
          this.currentObservationCount++;
        }
      } else {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= r2) {
          p.lastActiveTick = this.tickCount;
          p.lastObservedTick = this.tickCount;
          p.isCollapsed = true; // Collapse on observation
          // Active Observation Cost: Measuring the system extracts a toll on its persistence
          p.persistence -= 0.05; 
          p.energy += 0.01; // Small heat injection from observation
          observedCount++;
        }
      }
    }
    return observedCount;
  }

  private calculateCriticality(p: ParticleCore): number {
    let score = 0;
    
    // 1. Physical Significance (Mass & Energy)
    score += Math.min(0.4, (p.weight * 10) + (p.energy * 0.01));
    
    // 2. Informational Significance (Traces/Memory)
    score += Math.min(0.3, p.traces.length * 0.05);
    
    // 3. Observer Significance (Proximity)
    if (this.observerPos) {
      const dx = p.x - this.observerPos.x;
      const dy = p.y - this.observerPos.y;
      const distSq = dx * dx + dy * dy;
      const r2 = this.observerPos.radius * this.observerPos.radius;
      if (distSq < r2) {
        score += 0.5 * (1 - Math.sqrt(distSq / r2));
      }
    }
    
    // 4. Structural Significance (Bound particles are part of a larger structure)
    if (p.isBound) score += 0.2;
    
    return score;
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

  private updateHabitabilityMap() {
    // We only update the map every few ticks to save performance
    if (this.tickCount % 10 !== 0) return;

    this.habitabilityMap.clear();
    const grid: Map<string, { 
      sumPhaseCos: number, 
      sumPhaseSin: number, 
      count: number, 
      sumEnergy: number 
    }> = new Map();

    // Aggregate active particles into grid cells
    for (const p of this.activeParticles) {
      const gx = Math.floor(p.x / this.HABITABILITY_GRID_SIZE);
      const gy = Math.floor(p.y / this.HABITABILITY_GRID_SIZE);
      const key = `${gx},${gy}`;

      let cell = grid.get(key);
      if (!cell) {
        cell = { sumPhaseCos: 0, sumPhaseSin: 0, count: 0, sumEnergy: 0 };
        grid.set(key, cell);
      }

      cell.sumPhaseCos += Math.cos(p.phase);
      cell.sumPhaseSin += Math.sin(p.phase);
      cell.count++;
      cell.sumEnergy += p.energy;
    }

    // Calculate habitability for each cell
    for (const [key, data] of grid.entries()) {
      const coherence = Math.sqrt(data.sumPhaseCos ** 2 + data.sumPhaseSin ** 2) / data.count;
      const density = data.count;
      const activity = data.sumEnergy / data.count;

      // Habitability Function L(x)
      // 1. Coherence: Edge of Chaos (0.4 < coherence < 0.9)
      const coherenceScore = coherence > 0.4 && coherence < 0.9 ? 1.0 : (coherence > 0.9 ? 0.2 : 0.1);
      
      // 2. Density: Moderate density is best (not too isolated, not a black hole)
      const densityScore = density > 2 && density < 15 ? 1.0 : (density >= 15 ? 0.3 : 0.1);
      
      // 3. Activity: Stable energy flow
      const activityScore = activity > 0.5 && activity < 2.5 ? 1.0 : 0.2;

      const potential = coherenceScore * densityScore * activityScore;

      if (potential > 0.1) {
        this.habitabilityMap.set(key, { potential, coherence, density, activity });
      }
    }
  }

  public getSnapshot(viewport?: { x: number, y: number, width: number, height: number, scale: number }) {
    // Lazy Snapshot: Only send active particles and a stable subset of latent ones
    // This significantly reduces worker postMessage overhead and main thread rendering load.
    let active = Array.from(this.activeParticles);
    
    // Calculate real Coherence (Order Parameter)
    let sumCos = 0;
    let sumSin = 0;
    const n = active.length || 1;
    for (const p of active) {
      sumCos += Math.cos(p.phase);
      sumSin += Math.sin(p.phase);
    }
    const coherence = Math.sqrt(sumCos * sumCos + sumSin * sumSin) / n;

    // Edge of Chaos: Inject phase variance if coherence is too high (Crystallization Prevention)
    if (coherence > 0.95 && active.length > 10) {
      for (const p of active) {
        if (Math.random() < 0.1) {
          p.phase += (Math.random() - 0.5) * 0.5;
        }
      }
    }

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

    const activityLevel = this.activeParticles.size / (this.particles.length || 1);
    const currentExpansionRate = this.effectiveLAMBDA * (activityLevel > 0.001 ? 1.0 : 0.05);

    return {
      tick: this.tickCount,
      particles: [...active, ...sampledLatent].map(p => {
        const { potentialHistories, positionHistory, ...rest } = p;
        return { ...rest };
      }),
      activeCount: Math.max(0, this.activeParticles.size),
      totalCount: Math.max(1, this.particles.length),
      metrics: {
        decisionsPerTick: this.decisionsPerTick,
        avgCandidates: this.avgCandidates,
        totalSelfEnergy: this.totalSelfEnergy,
        activeTracesCount: this.activeTracesCount,
        systemTemperature: this.getSystemTemperature(),
        thermalGradient: this.getThermalGradient(),
        coherence,
        photonCount,
        genesisActivity: this.currentGenesisRate,
        explorationSuccessRate: this.totalExplorations > 0 ? this.successfulExplorations / this.totalExplorations : 0,
        nonLocalEfficiency: this.decisionsPerTick > 0 ? this.nonLocalInteractions / this.decisionsPerTick : 0,
        memoryUsage: this.activeParticles.size / this.particles.length,
        habitabilityMap: Array.from(this.habitabilityMap.entries()).map(([key, val]) => {
          const [gx, gy] = key.split(',').map(Number);
          return {
            x: gx * this.HABITABILITY_GRID_SIZE + this.HABITABILITY_GRID_SIZE / 2,
            y: gy * this.HABITABILITY_GRID_SIZE + this.HABITABILITY_GRID_SIZE / 2,
            ...val
          };
        }),
        events: this.recentEvents,
        universeHorizon: 50000 + this.tickCount * currentExpansionRate * 100
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
        isCollapsed: p.isCollapsed,
        waveRadius: p.waveRadius,
        spin: p.spin,
        color: p.color,
        isDarkMatter: p.isDarkMatter,
        isPhoton: p.isPhoton,
        isConscious: p.isConscious,
        moleculeId: p.moleculeId,
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
        p.isCollapsed = trace.isCollapsed ?? !trace.isLatent;
        p.waveRadius = trace.waveRadius ?? 20;
        p.spin = trace.spin ?? 1;
        p.color = trace.color ?? 'rgba(255,255,255,0.2)';
        p.isDarkMatter = trace.isDarkMatter ?? false;
        p.isPhoton = trace.isPhoton ?? false;
        p.isConscious = trace.isConscious ?? false;
        p.moleculeId = trace.moleculeId ?? null;
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
      lastObservedTick: this.tickCount,
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
      isCollapsed: true,
      waveRadius: 10,
      spin: p1.spin,
      color: p1.color,
      isDarkMatter: p1.isDarkMatter || p2.isDarkMatter,
      isPhoton: false,
      isConscious: p1.isConscious || p2.isConscious,
      moleculeId: null,
      potentialHistories: [],
      positionHistory: [],
      ax: 0, ay: 0,
      persistence: (p1.persistence + p2.persistence) / 2
    };

    this.particles.push(fused);
    this.activeParticles.add(fused);
    this.recentEvents.push(`Fusão Estelar: ${p1.element}+${p2.element} -> ${newElement}`);
    if (this.recentEvents.length > 10) this.recentEvents.shift();
  }
}
