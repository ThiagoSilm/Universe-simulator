import { Particle, SimulationState } from "./types";

export class Quadtree {
  particles: Particle[] = [];
  children: Quadtree[] = [];
  capacity = 4;

  constructor(public bounds: { x: number; y: number; w: number; h: number }) {}

  insert(p: Particle): boolean {
    if (!this.contains(p)) return false;

    if (this.particles.length < this.capacity && this.children.length === 0) {
      this.particles.push(p);
      return true;
    }

    if (this.children.length === 0) this.subdivide();

    return this.children.some(child => child.insert(p));
  }

  contains(p: Particle): boolean {
    return (
      p.x >= this.bounds.x &&
      p.x < this.bounds.x + this.bounds.w &&
      p.y >= this.bounds.y &&
      p.y < this.bounds.y + this.bounds.h
    );
  }

  subdivide() {
    const { x, y, w, h } = this.bounds;
    const halfW = w / 2;
    const halfH = h / 2;

    this.children = [
      new Quadtree({ x, y, w: halfW, h: halfH }),
      new Quadtree({ x: x + halfW, y, w: halfW, h: halfH }),
      new Quadtree({ x, y: y + halfH, w: halfW, h: halfH }),
      new Quadtree({ x: x + halfW, y: y + halfH, w: halfW, h: halfH }),
    ];

    this.particles.forEach(p => this.children.some(child => child.insert(p)));
    this.particles = [];
  }

  query(range: { x: number; y: number; w: number; h: number }, found: Particle[] = []): Particle[] {
    if (!this.intersects(range)) return found;

    this.particles.forEach(p => {
      if (
        p.x >= range.x &&
        p.x < range.x + range.w &&
        p.y >= range.y &&
        p.y < range.y + range.h
      ) {
        found.push(p);
      }
    });

    this.children.forEach(child => child.query(range, found));
    return found;
  }

  intersects(range: { x: number; y: number; w: number; h: number }): boolean {
    return !(
      range.x > this.bounds.x + this.bounds.w ||
      range.x + range.w < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.h ||
      range.y + range.h < this.bounds.y
    );
  }
}

export const BEKENSTEIN_LIMIT = 1000; // Bits per area unit

export function tick(state: SimulationState): SimulationState {
  const { particles, bounds } = state;
  const loadFactor = Math.max(1, state.metrics.processingTime / 33);
  const qt = new Quadtree({ x: 0, y: 0, w: bounds.width, h: bounds.height });
  
  // 1. Insert active particles into Quadtree
  particles.forEach(p => {
    if (!p.isLatent) qt.insert(p);
  });

  const newParticles = particles.map(p => {
    if (p.isCollapsed) return p;

    // 2. Lazy Persistence Decay (with thermal noise)
    let persistence = p.persistence - (0.001 * loadFactor);
    if (persistence < 0) persistence = 0;
    
    let isLatent = persistence < 0.1;

    if (isLatent) {
      return { ...p, persistence, isLatent: true };
    }

    // 3. Unique Rule: Leader-Driven Processing & Collective Persistence
    const isLeader = p.persistence > 0.7 && p.information > 100;
    
    const neighbors = qt.query({
      x: p.x - 80,
      y: p.y - 80,
      w: 160,
      h: 160
    });

    let totalOmega = 0;
    let nextVX = p.vx;
    let nextVY = p.vy;
    let clusterPersistence = p.persistence;
    let localDensity = 0;
    let neighborInfoSum = 0;

    neighbors.forEach(n => {
      if (n.id === p.id) return;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      if (dist < 40) {
        localDensity++;
        neighborInfoSum += n.information;
      }

      // A Regra Única: Ressonância como Convite (Φ)
      const phaseDiff = p.phase - n.phase;
      const freqDiff = Math.abs(p.frequency - n.frequency);
      const resonance = Math.cos(phaseDiff) * Math.max(0, 1 - freqDiff);
      const polarity = p.charge * n.charge < 0 ? 1.2 : 0.8;
      
      // Ω = Força de Acoplamento (O Convite é aceito?)
      const omega = (p.persistence * n.persistence * resonance * polarity) / dist;
      totalOmega += omega;

      // COLLECTIVE PERSISTENCE (Nebula Behavior)
      // High-persistence nodes redistribute weight to keep the cluster coupled
      if (p.persistence > 0.8 && n.persistence < 0.5 && omega > 0.3) {
        const gift = 0.005 * omega;
        (n as any)._persistenceGain = ((n as any)._persistenceGain || 0) + gift;
        clusterPersistence -= gift;
      }

      // LEADER LOGIC: The Leader "edits" the cluster
      if (isLeader && omega > 0.2) {
        (n as any)._leaderId = p.id;
        (n as any)._processedByLeader = true;
        
        const exchange = (p.information * 0.02 * omega);
        (n as any)._infoGain = ((n as any)._infoGain || 0) + exchange;
        
        const syncStrength = 0.1 * omega;
        (n as any)._phaseShift = ((n as any)._phaseShift || 0) - (Math.sin(phaseDiff) * syncStrength);
        
        clusterPersistence += n.persistence;
      }

      // Emergent Gravity (Density-driven)
      const gravity = (n.information / BEKENSTEIN_LIMIT) * 0.05;
      const force = (omega * 0.1) + gravity;
      const jitter = (Math.random() - 0.5) * loadFactor * 0.05;
      const fx = (dx / dist) * force * (1 + jitter);
      const fy = (dy / dist) * force * (1 + jitter);
      
      if (isFinite(fx)) nextVX += fx;
      if (isFinite(fy)) nextVY += fy;

      // ER=EPR Entanglement
      if (omega > 5.0 && !p.entangledId && !n.entangledId && Math.random() < 0.05) {
        (p as any)._entangle = n.id;
      }

      // MATE DETECTION
      if (omega > 0.8 && p.persistence > 0.7 && n.persistence > 0.7) {
        (p as any)._potentialMate = n;
      }
    });

    // 4. State Update based on Ω (Resonance)
    const infoGain = ((p as any)._infoGain || 0) + (Math.abs(totalOmega) * 0.01);
    const persistenceGain = (p as any)._persistenceGain || 0;
    
    let nextPersistence = Math.min(1, p.persistence + (totalOmega * 0.1) + persistenceGain - 0.002);
    
    if ((p as any)._dissipate) {
      nextPersistence *= 0.5;
    }

    const phaseShift = (p as any)._phaseShift || 0;
    const nextPhase = (p.phase + p.frequency * 0.1 + phaseShift) % (Math.PI * 2);
    const nextCharge = (p as any)._chargeShift !== undefined ? (p as any)._chargeShift : p.charge;

    isLatent = nextPersistence < 0.05;

    // 5. Bekenstein Collapse & Cosmic Thresholds
    // Nebula: Low density, high collective persistence
    // Star: High density, high information
    // Black Hole: Exceeding Bekenstein Limit
    const isCollapsed = p.information > BEKENSTEIN_LIMIT || localDensity > 15;

    // 6. Emergent Taxonomy (Cosmic Stages)
    let type = p.type;
    if (p.information > BEKENSTEIN_LIMIT) {
      type = "singularity"; // Black Hole
    } else if (localDensity > 12) {
      type = "star"; // High density collapse
    } else if (localDensity > 5 && nextPersistence > 0.8) {
      type = "nebula"; // Collective cluster
    } else if (nextPersistence > 0.8 && p.information > 500) {
      type = "life";
    } else if (nextPersistence < 0.3) {
      type = "energy";
    } else {
      type = "matter";
    }

    // 7. Reproduction: Mitosis vs Sexual Coupling
    let spawn: Particle | null = null;
    const MITOSIS_THRESHOLD = 0.94; // Higher threshold for self-division
    const SEXUAL_THRESHOLD = 0.8;   // Lower threshold if a partner helps
    const REPLICATION_COST = 0.35;

    // MITOSIS (Asexual Replication)
    // The mother cell divides when its persistence (weight) is high enough to pay the full cost.
    if (nextPersistence > MITOSIS_THRESHOLD && particles.length < 1500 && Math.random() < 0.02) {
      nextPersistence -= REPLICATION_COST;
      spawn = {
        id: `mitosis-${p.id}-${state.tick}`,
        type: p.type,
        role: isLeader ? "leader" : "none",
        charge: p.charge,
        frequency: p.frequency + (Math.random() - 0.5) * 0.02,
        phase: (p.phase + Math.PI) % (Math.PI * 2),
        x: p.x + (Math.random() - 0.5) * 15,
        y: p.y + (Math.random() - 0.5) * 15,
        vx: -p.vx * 0.4,
        vy: -p.vy * 0.4,
        persistence: REPLICATION_COST,
        information: p.information * 0.1,
        entropy: 0.001,
        composition: { ...p.composition },
        isLatent: false,
        isCollapsed: false,
        leaderId: p.id
      };
    }

    // SEXUAL REPRODUCTION (Emergent Coupling)
    // Occurs when two particles (usually opposite charges) achieve high resonance (omega > 0.8).
    const mate = (p as any)._potentialMate;
    if (!spawn && mate && nextPersistence > SEXUAL_THRESHOLD && mate.persistence > SEXUAL_THRESHOLD && Math.random() < 0.04) {
      const costPerParent = REPLICATION_COST / 2;
      nextPersistence -= costPerParent;
      
      // Signal to deduct from mate in the post-processing step
      (p as any)._mateToDeduct = { id: mate.id, amount: costPerParent };
      
      spawn = {
        id: `sexual-${p.id}-${mate.id}-${state.tick}`,
        // Offspring inherits traits from both
        type: p.information > mate.information ? p.type : mate.type,
        role: "none",
        charge: Math.random() > 0.5 ? p.charge : mate.charge,
        frequency: (p.frequency + mate.frequency) / 2 + (Math.random() - 0.5) * 0.01,
        phase: Math.random() * Math.PI * 2,
        x: (p.x + mate.x) / 2,
        y: (p.y + mate.y) / 2,
        vx: (p.vx + mate.vx) * 0.5,
        vy: (p.vy + mate.vy) * 0.5,
        persistence: REPLICATION_COST,
        information: (p.information + mate.information) * 0.15,
        entropy: 0.001,
        composition: { ...p.composition },
        isLatent: false,
        isCollapsed: false,
        leaderId: p.id
      };
    }

    return {
      ...p,
      type,
      role: isLeader ? "leader" : ((p as any)._processedByLeader ? "coupler" : "none"),
      phase: nextPhase,
      charge: nextCharge,
      x: p.x + nextVX,
      y: p.y + nextVY,
      vx: nextVX * 0.98,
      vy: nextVY * 0.98,
      persistence: nextPersistence,
      information: p.information + infoGain,
      isLatent: false,
      isCollapsed,
      leaderId: (p as any)._leaderId || p.leaderId,
      clusterPersistence,
      _spawn: spawn,
      _entangle: (p as any)._entangle
    } as any;
  });

  // Handle Spawns, Entanglement, and Sexual Cost Deductions
  const spawnedParticles: Particle[] = [];
  const mateDeductions: Record<string, number> = {};

  newParticles.forEach((p: any) => {
    if (p._spawn) {
      spawnedParticles.push(p._spawn);
      delete p._spawn;
    }
    if (p._entangle) {
      p.entangledId = p._entangle;
      delete p._entangle;
    }
    if (p._mateToDeduct) {
      mateDeductions[p._mateToDeduct.id] = (mateDeductions[p._mateToDeduct.id] || 0) + p._mateToDeduct.amount;
      delete p._mateToDeduct;
    }
  });

  // Apply deductions to mates
  newParticles.forEach((p: any) => {
    if (mateDeductions[p.id]) {
      p.persistence = Math.max(0, p.persistence - mateDeductions[p.id]);
    }
  });

  const finalParticles = [...newParticles, ...spawnedParticles];

  return {
    ...state,
    tick: state.tick + 1,
    particles: finalParticles,
    metrics: {
      activeParticles: finalParticles.filter(p => !p.isLatent).length,
      totalInformation: finalParticles.reduce((acc, p) => acc + p.information, 0),
      emergentComplexity: calculateComplexity(finalParticles),
      processingTime: state.metrics.processingTime
    }
  };
}

function calculateComplexity(particles: Particle[]): number {
  // Simplistic complexity metric: ratio of information to active particles
  const active = particles.filter(p => !p.isLatent);
  if (active.length === 0) return 0;
  return active.reduce((acc, p) => acc + p.information, 0) / active.length;
}
