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
    
    const isLatent = persistence < 0.1;

    if (isLatent) {
      return { ...p, persistence, isLatent: true };
    }

    // 3. Information Exchange (Observability)
    const neighbors = qt.query({
      x: p.x - 20,
      y: p.y - 20,
      w: 40,
      h: 40
    });

    let infoGain = 0;
    let nextVX = p.vx;
    let nextVY = p.vy;

    neighbors.forEach(n => {
      if (n.id === p.id) return;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10) {
        infoGain += 1; // Exchange 1 bit
        persistence = Math.min(1, persistence + 0.1); // Interaction boosts persistence
        
        // Simple attraction/repulsion based on information
        const force = 0.01;
        nextVX += dx * force;
        nextVY += dy * force;
      }
    });

    // 4. Bekenstein Collapse Check
    const localInfo = neighbors.reduce((acc, curr) => acc + curr.information, 0);
    const isCollapsed = localInfo > BEKENSTEIN_LIMIT;

    return {
      ...p,
      x: p.x + nextVX,
      y: p.y + nextVY,
      vx: nextVX * 0.99,
      vy: nextVY * 0.99,
      persistence,
      information: p.information + infoGain,
      isLatent: false,
      isCollapsed
    };
  });

  return {
    ...state,
    tick: state.tick + 1,
    particles: newParticles,
    metrics: {
      activeParticles: newParticles.filter(p => !p.isLatent).length,
      totalInformation: newParticles.reduce((acc, p) => acc + p.information, 0),
      emergentComplexity: calculateComplexity(newParticles)
    }
  };
}

function calculateComplexity(particles: Particle[]): number {
  // Simplistic complexity metric: ratio of information to active particles
  const active = particles.filter(p => !p.isLatent);
  if (active.length === 0) return 0;
  return active.reduce((acc, p) => acc + p.information, 0) / active.length;
}
