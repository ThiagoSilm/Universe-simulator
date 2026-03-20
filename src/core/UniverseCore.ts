export interface ParticleCore {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  charge: number;
  isLatent: boolean;
  lastActiveTick: number;
  element: 'H' | 'C' | 'O' | 'N';
  energy: number;
  generation: number;
  isConscious: boolean;
  isPhoton: boolean;
}

export class UniverseCore {
  public particles: ParticleCore[] = [];
  public tickCount: number = 0;
  private activeParticles: Set<ParticleCore> = new Set();
  private seed: number;

  constructor(seed: number = Math.random(), initialParticles: number = 1800) {
    this.seed = seed;
    this.initialize(initialParticles);
  }

  private initialize(count: number) {
    // Deterministic-ish initialization based on seed
    let r = this.seed;
    const nextR = () => {
      r = (r * 16807) % 2147483647;
      return r / 2147483647;
    };

    for (let i = 0; i < count; i++) {
      const charge = nextR() < 0.5 ? 1 : -1;
      let element: 'H' | 'C' | 'O' | 'N' = 'H';
      if (charge > 0) element = 'C';
      else if (charge < 0) element = 'O';
      
      const p: ParticleCore = {
        id: `p-${i}`,
        x: (nextR() - 0.5) * 60000,
        y: (nextR() - 0.5) * 60000,
        vx: (nextR() - 0.5) * 2,
        vy: (nextR() - 0.5) * 2,
        mass: nextR() * 2 + 0.1,
        charge,
        isLatent: true,
        lastActiveTick: 0,
        element,
        energy: 1.0,
        generation: 0,
        isConscious: false,
        isPhoton: false,
      };
      this.particles.push(p);
    }
  }

  public tick() {
    this.tickCount++;
    
    const toSleep: ParticleCore[] = [];
    const toWake: ParticleCore[] = [];
    
    for (const p of this.activeParticles) {
      p.x += p.vx;
      p.y += p.vy;
      
      if (Math.abs(p.x) > 30000) p.vx *= -1;
      if (Math.abs(p.y) > 30000) p.vy *= -1;

      if (this.tickCount % 10 === 0) {
        // Optimization: only check a few particles for wake-up propagation
        const checkCount = 5;
        for (let i = 0; i < checkCount; i++) {
          const other = this.particles[Math.floor(Math.random() * this.particles.length)];
          if (other.isLatent) {
            const dx = p.x - other.x;
            const dy = p.y - other.y;
            if (dx * dx + dy * dy < 40000) {
              toWake.push(other);
            }
          }
        }
      }
      
      if (this.tickCount - p.lastActiveTick > 300) {
        toSleep.push(p);
      }
    }

    // Spontaneous wake-up (background noise)
    if (this.tickCount % 100 === 0 && this.activeParticles.size < 50) {
      const randomParticle = this.particles[Math.floor(Math.random() * this.particles.length)];
      if (randomParticle.isLatent) {
        toWake.push(randomParticle);
      }
    }
    
    for (const p of toWake) {
      if (p.isLatent) {
        p.isLatent = false;
        p.lastActiveTick = this.tickCount;
        this.activeParticles.add(p);
      }
    }

    for (const p of toSleep) {
      p.isLatent = true;
      this.activeParticles.delete(p);
    }
  }

  public observe(x: number, y: number, radius: number = 1000): number {
    const r2 = radius * radius;
    let observedCount = 0;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      if (p.isLatent) {
        const dt = this.tickCount - p.lastActiveTick;
        const predictedX = p.x + p.vx * dt;
        const predictedY = p.y + p.vy * dt;
        
        const dx = predictedX - x;
        const dy = predictedY - y;
        
        if (dx * dx + dy * dy <= r2) {
          p.x = predictedX;
          p.y = predictedY;
          p.isLatent = false;
          p.lastActiveTick = this.tickCount;
          this.activeParticles.add(p);
          observedCount++;
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

  public getSnapshot() {
    return {
      tick: this.tickCount,
      particles: this.particles.map(p => ({ ...p })),
      activeCount: this.activeParticles.size,
      totalCount: this.particles.length
    };
  }

  public getPersistentState() {
    return {
      seed: this.seed,
      tickCount: this.tickCount,
      latentTraces: this.particles.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        isLatent: p.isLatent,
        lastActiveTick: p.lastActiveTick
      }))
    };
  }

  public loadPersistentState(state: any) {
    this.seed = state.seed;
    this.tickCount = state.tickCount;
    this.activeParticles.clear();
    
    state.latentTraces.forEach((trace: any) => {
      const p = this.particles.find(part => part.id === trace.id);
      if (p) {
        p.x = trace.x;
        p.y = trace.y;
        p.vx = trace.vx;
        p.vy = trace.vy;
        p.isLatent = trace.isLatent;
        p.lastActiveTick = trace.lastActiveTick;
        if (!p.isLatent) {
          this.activeParticles.add(p);
        }
      }
    });
  }
}
