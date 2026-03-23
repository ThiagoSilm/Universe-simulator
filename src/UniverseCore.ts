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
  const qt = new Quadtree({ x: 0, y: 0, w: bounds.width, h: bounds.height });
  
  // 1. Insert active particles into Quadtree
  particles.forEach(p => {
    if (!p.isLatent) qt.insert(p);
  });

  const newParticles = particles.map(p => {
    if (p.isCollapsed) return p;

    // 2. Lazy Persistence Decay
    let persistence = p.persistence - 0.001;
    if (persistence < 0) persistence = 0;
    
    let isLatent = persistence < 0.1;

    if (isLatent) {
      return { ...p, persistence, isLatent: true };
    }

    // 3. Unique Rule Interaction (Ω = P(t) * (1/dist) * Info_Density)
    const neighbors = qt.query({
      x: p.x - 50,
      y: p.y - 50,
      w: 100,
      h: 100
    });

    let totalOmega = 0;
    let nextVX = p.vx;
    let nextVY = p.vy;

    neighbors.forEach(n => {
      if (n.id === p.id) return;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // A Regra Única: Ressonância como Convite (Φ)
      // A partícula emite sua assinatura (freq, phase, persistence)
      const phaseDiff = p.phase - n.phase;
      const freqDiff = Math.abs(p.frequency - n.frequency);
      const resonance = Math.cos(phaseDiff) * Math.max(0, 1 - freqDiff);
      
      const polarity = p.charge * n.charge < 0 ? 1.2 : 0.8;
      
      // Ω = Força de Acoplamento (O Convite é aceito?)
      const omega = (p.persistence * n.persistence * resonance * polarity) / dist;
      totalOmega += omega;

      // Se o acoplamento ocorre (Ω > 0), há troca de informação e sincronização
      if (omega > 0.1) {
        // Sincronização de fase (Acoplamento Voluntário)
        const syncStrength = 0.05 * omega;
        (p as any)._phaseShift = ((p as any)._phaseShift || 0) - (Math.sin(phaseDiff) * syncStrength);
        
        // Troca de Informação (Contextual Weight)
        // Apenas o que é relevante (resultado da interação) é compartilhado
        const exchange = (n.information * 0.01 * omega);
        (p as any)._infoGain = ((p as any)._infoGain || 0) + exchange;

        // Mutabilidade de Carga (Polarização sob alta densidade)
        if (n.information > 800 && Math.random() < 0.01) {
          (p as any)._chargeShift = n.charge;
        }
      }

      // Gravidade Emergente (Distorção do substrato pela densidade de info)
      const gravity = (n.information / BEKENSTEIN_LIMIT) * 0.02;
      const force = (omega * 0.1) + gravity;
      nextVX += (dx / dist) * force;
      nextVY += (dy / dist) * force;

      // ER=EPR Entanglement
      if (omega > 5.0 && !p.entangledId && !n.entangledId && Math.random() < 0.05) {
        (p as any)._entangle = n.id;
      }
    });

    // 4. State Update based on Ω (Resonance)
    // A informação ganha vem do acoplamento seletivo
    const infoGain = ((p as any)._infoGain || 0) + (Math.abs(totalOmega) * 0.01);
    
    // Persistência é a recompensa pela ressonância
    persistence = Math.min(1, p.persistence + (totalOmega * 0.1) - 0.002);
    
    // Update internal clock (phase) + Synchronization shift
    const phaseShift = (p as any)._phaseShift || 0;
    const nextPhase = (p.phase + p.frequency * 0.1 + phaseShift) % (Math.PI * 2);

    // Charge mutation/polarization
    const nextCharge = (p as any)._chargeShift !== undefined ? (p as any)._chargeShift : p.charge;

    isLatent = persistence < 0.05;

    // 5. Bekenstein Collapse Check
    const isCollapsed = p.information > BEKENSTEIN_LIMIT;

    // 6. Emergent Taxonomy (Type arises from state)
    let type = p.type;
    if (isCollapsed) {
      type = "singularity";
    } else if (persistence > 0.8 && p.information > 500) {
      type = "life"; // High persistence + High information = Complexity
    } else if (persistence < 0.3) {
      type = "energy"; // Low persistence = Ghostly wave-like state
    } else {
      type = "matter"; // Stable interaction state
    }

    // 7. Replication (Self-Sustaining Evolution)
    // A particle replicates if it reaches a high persistence threshold
    let spawn: Particle | null = null;
    const REPLICATION_THRESHOLD = 0.95;
    const REPLICATION_COST = 0.4;

    if (persistence > REPLICATION_THRESHOLD && particles.length < 1500 && Math.random() < 0.05) {
      // Mother pays the cost
      persistence -= REPLICATION_COST;
      
      spawn = {
        id: `rep-${p.id}-${state.tick}`,
        type: p.type,
        role: "none",
        charge: p.charge,
        frequency: p.frequency + (Math.random() - 0.5) * 0.02, // Inherit frequency with small mutation
        phase: (p.phase + Math.PI) % (Math.PI * 2), // Daughter starts in opposite phase
        x: p.x + (Math.random() - 0.5) * 10,
        y: p.y + (Math.random() - 0.5) * 10,
        vx: -p.vx * 0.5, // Ejected in opposite direction
        vy: -p.vy * 0.5,
        persistence: REPLICATION_COST, // Daughter starts with the cost paid by mother
        information: p.information * 0.1, // Inherit a fraction of information
        entropy: 0.001,
        composition: { ...p.composition },
        isLatent: false,
        isCollapsed: false
      };
    }

    return {
      ...p,
      type,
      phase: nextPhase,
      charge: nextCharge,
      x: p.x + nextVX,
      y: p.y + nextVY,
      vx: nextVX * 0.98,
      vy: nextVY * 0.98,
      persistence,
      information: p.information + infoGain,
      isLatent: false,
      isCollapsed,
      _spawn: spawn,
      _entangle: (p as any)._entangle
    } as any;
  });

  // Handle Spawns and Entanglement
  const spawnedParticles: Particle[] = [];
  newParticles.forEach((p: any) => {
    if (p._spawn) {
      spawnedParticles.push(p._spawn);
      delete p._spawn;
    }
    if (p._entangle) {
      p.entangledId = p._entangle;
      delete p._entangle;
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
      emergentComplexity: calculateComplexity(finalParticles)
    }
  };
}

function calculateComplexity(particles: Particle[]): number {
  // Simplistic complexity metric: ratio of information to active particles
  const active = particles.filter(p => !p.isLatent);
  if (active.length === 0) return 0;
  return active.reduce((acc, p) => acc + p.information, 0) / active.length;
}
