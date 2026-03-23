export const C = 10; // Scaled down speed of light for simulation (max velocity)
export const H = 0.001; // Scaled down Planck constant (minimum persistence)
export const LAMBDA = 0.0005; // Scaled down cosmological constant (isolation decay / expansion)
export const MAX_DENSITY = 12; // Bekenstein limit (max particles per local region)
export const HORIZON = 800; // Hubble horizon (observability limit)
export const INTERACTION_RADIUS = 150; // Max distance for information exchange

export class Vector2 {
  constructor(public x: number, public y: number) {}

  add(v: Vector2) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector2) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) {
      this.mult(1 / m);
    }
    return this;
  }

  limit(max: number) {
    if (this.mag() > max) {
      this.normalize();
      this.mult(max);
    }
    return this;
  }

  dot(v: Vector2) {
    return this.x * v.x + this.y * v.y;
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}

export interface Memory {
  id: number;
  weight: number;
  data: number; // Abstract representation of what is remembered
}

export class Particle {
  pos: Vector2;
  vel: Vector2;
  p: number; // Persistence P(t)
  charge: number;
  phase: number;
  isUser: boolean;
  memories: Memory[];
  state: 'LIDERANDO' | 'ACOPLADO' | 'ISOLADO';
  frequency: number;
  contextualWeight: number;
  observability: number; // 0 to 1, based on persistence and distance to observer

  constructor(x: number, y: number, isUser: boolean = false) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
    this.p = 1.0 + Math.random() * 0.5;
    this.charge = (Math.random() - 0.5) * 2;
    this.phase = Math.random() * Math.PI * 2;
    this.isUser = isUser;
    this.memories = [];
    this.state = 'ISOLADO';
    this.frequency = 0;
    this.contextualWeight = 0;
    this.observability = 1;
  }

  interact(other: Particle, distance: number) {
    // Information exchange restores persistence
    const infoExchange = 1 - (distance / INTERACTION_RADIUS);
    
    if (infoExchange > 0) {
      // 1. Restore persistence (Sustentabilidade via troca de informação)
      this.p += infoExchange * 0.002;
      other.p += infoExchange * 0.002;
      
      // 2. Electromagnetism (Charge info exchange)
      // Opposite charges attract, same repel
      const forceMag = (this.charge * other.charge) / (distance * distance + 10);
      const dir = this.pos.clone().sub(other.pos).normalize();
      
      this.vel.add(dir.clone().mult(forceMag));
      other.vel.sub(dir.clone().mult(forceMag));
      
      // 3. Gravity (Position & Mass info exchange)
      // Mutual attraction based on persistence (mass equivalent)
      const gravMag = (this.p * other.p * 0.01) / (distance + 10);
      this.vel.sub(dir.clone().mult(gravMag));
      other.vel.add(dir.clone().mult(gravMag));
    }
  }

  updateFrequency() {
    this.phase += 0.05;
    this.frequency = this.charge * Math.sin(this.phase) * this.p;
  }

  updateMemory() {
    // Memory emerges from rule: cull low weight, keep high weight
    this.memories = this.memories.filter(m => m.weight > H * 10);
    // Decay memory weights
    this.memories.forEach(m => m.weight *= 0.99);
  }

  addMemory(weight: number, data: number) {
    this.memories.push({ id: Math.random(), weight, data });
    if (this.memories.length > 20) {
      this.memories.sort((a, b) => b.weight - a.weight);
      this.memories.pop();
    }
  }
}

export class Stimulus {
  pos: Vector2;
  intensity: number;
  frequency: number;
  life: number;

  constructor(x: number, y: number) {
    this.pos = new Vector2(x, y);
    this.intensity = 2 + Math.random() * 3;
    this.frequency = (Math.random() - 0.5) * 2;
    this.life = 100 + Math.random() * 100;
  }
}
