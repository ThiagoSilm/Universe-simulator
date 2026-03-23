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
      
      // A Regra Única Revisitada: Ressonância (Φ)
      // Φ = cos(phase_diff) * (1 - abs(freq_diff))
      const phaseDiff = p.phase - n.phase;
      const freqDiff = Math.abs(p.frequency - n.frequency);
      const resonance = Math.cos(phaseDiff) * Math.max(0, 1 - freqDiff);
      
      // Polarity (charge) affects interaction
      const polarity = p.charge * n.charge < 0 ? 1.2 : 0.8;
      
      // Ω = Força de Acoplamento (Caminho de Maior Persistência)
      const omega = (p.persistence * n.persistence * (n.information + 1) * resonance * polarity) / dist;
      totalOmega += omega;

      // Atração/Repulsão: Partículas buscam ressonância, não apenas proximidade
      const force = omega * 0.1;
      nextVX += (dx / dist) * force;
      nextVY += (dy / dist) * force;
    });

    // 4. State Update based on Ω (Resonance)
    const infoGain = Math.abs(totalOmega) * 0.1;
    
    // Persistência é a recompensa pela ressonância
    // Se Ω é positivo (ressonância), P(t) aumenta. Se negativo (dissonância), P(t) decai.
    persistence = Math.min(1, p.persistence + (totalOmega * 0.1) - 0.002);
    
    // Update internal clock (phase)
    const nextPhase = (p.phase + p.frequency * 0.1) % (Math.PI * 2);

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

    // 7. Spawning (Emergence of new nodes via Resonance)
    let spawn: Particle | null = null;
    if (totalOmega > 3.0 && Math.random() < 0.02 && particles.length < 1000) {
      spawn = {
        id: `spawn-${p.id}-${state.tick}`,
        type: "matter",
        role: "none",
        charge: Math.random() > 0.5 ? 1 : -1,
        frequency: p.frequency + (Math.random() - 0.5) * 0.1, // Inherit frequency with mutation
        phase: Math.random() * Math.PI * 2,
        x: p.x + (Math.random() - 0.5) * 20,
        y: p.y + (Math.random() - 0.5) * 20,
        vx: p.vx + (Math.random() - 0.5),
        vy: p.vy + (Math.random() - 0.5),
        persistence: 0.5,
        information: 0,
        entropy: 0.001,
        composition: { C: 0, H: 0, O: 0, N: 0 },
        isLatent: false,
        isCollapsed: false
      };
    }

    return {
      ...p,
      type,
      phase: nextPhase,
      x: p.x + nextVX,
      y: p.y + nextVY,
      vx: nextVX * 0.99,
      vy: nextVY * 0.99,
      persistence,
      information: p.information + infoGain,
      isLatent: false,
      isCollapsed,
      _spawn: spawn
    } as any;
  });

  // Handle Spawns
  const spawnedParticles: Particle[] = [];
  newParticles.forEach((p: any) => {
    if (p._spawn) {
      spawnedParticles.push(p._spawn);
      delete p._spawn;
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
