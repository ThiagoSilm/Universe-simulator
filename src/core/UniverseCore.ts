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
  // Propriedades para interações complexas (química, vida, etc.)
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

  constructor(initialParticles: number = 1800) {
    for (let i = 0; i < initialParticles; i++) {
      const charge = Math.random() < 0.5 ? 1 : -1;
      let element: 'H' | 'C' | 'O' | 'N' = 'H';
      if (charge > 0) element = 'C';
      else if (charge < 0) element = 'O';
      
      const p: ParticleCore = {
        id: `p-${i}`,
        x: (Math.random() - 0.5) * 60000,
        y: (Math.random() - 0.5) * 60000,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        mass: Math.random() * 2 + 0.1,
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
    
    // 1. Avançar partículas ativas e detectar colisões/proximidade
    for (const p of this.activeParticles) {
      p.x += p.vx;
      p.y += p.vy;
      
      // Limites do universo (bounce)
      if (Math.abs(p.x) > 30000) p.vx *= -1;
      if (Math.abs(p.y) > 30000) p.vy *= -1;

      // Propagação: se uma partícula ativa passar perto de uma latente, acorda ela
      // Para performance, fazemos isso apenas ocasionalmente ou com raio pequeno
      if (this.tickCount % 5 === 0) {
        for (const other of this.particles) {
          if (other.isLatent) {
            const dx = p.x - other.x;
            const dy = p.y - other.y;
            if (dx * dx + dy * dy < 40000) { // Raio de 200 para acordar
              toWake.push(other);
            }
          }
        }
      }
      
      // Se ficar muito tempo sem interação ou observação, dorme
      if (this.tickCount - p.lastActiveTick > 300) {
        toSleep.push(p);
      }
    }
    
    // 2. Acordar partículas
    for (const p of toWake) {
      if (p.isLatent) {
        p.isLatent = false;
        p.lastActiveTick = this.tickCount;
        this.activeParticles.add(p);
      }
    }

    // 3. Dormir partículas
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
}
