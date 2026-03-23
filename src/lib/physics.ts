export const C = 10; // Scaled down speed of light for simulation (max velocity)
export const H = 0.001; // Scaled down Planck constant (minimum persistence)
export const LAMBDA = 0.0005; // Scaled down cosmological constant (isolation decay / expansion)

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
