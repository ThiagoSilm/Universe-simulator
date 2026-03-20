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
  mass: number;
  charge: number;
  isLatent: boolean;
  lastActiveTick: number;
  age: number;
  energy: number;
  phase: number;
  amplitude: number;
  level: number;
  weight: number;
  element: 'H' | 'C' | 'O' | 'N';
  generation: number;
  traces: ParticleTrace[];
}

class Quadtree {
  private particles: ParticleCore[] = [];
  private children: Quadtree[] = [];
  private centerX: number;
  private centerY: number;
  private size: number;
  private capacity: number = 4;

  constructor(x: number, y: number, size: number) {
    this.centerX = x;
    this.centerY = y;
    this.size = size;
  }

  public insert(p: ParticleCore): boolean {
    if (!this.contains(p.x, p.y)) return false;

    if (this.particles.length < this.capacity && this.children.length === 0) {
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
    this.children = [
      new Quadtree(this.centerX - s, this.centerY - s, s),
      new Quadtree(this.centerX + s, this.centerY - s, s),
      new Quadtree(this.centerX - s, this.centerY + s, s),
      new Quadtree(this.centerX + s, this.centerY + s, s)
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
  private activeParticles: Set<ParticleCore> = new Set();
  private cosmicMemory: Map<string, ParticleTrace[]> = new Map();
  private seed: number;
  
  // Metrics for ObserverLayer
  public decisionsPerTick: number = 0;
  public avgCandidates: number = 0;
  public totalSelfEnergy: number = 0;
  public activeTracesCount: number = 0;

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
        age: 0,
        energy: 1.0,
        phase: nextR() * Math.PI * 2,
        amplitude: nextR(),
        level: 1,
        weight: nextR() * 5,
        element,
        generation: 0,
        traces: [],
      };
      this.particles.push(p);
    }
  }

  public tick() {
    this.tickCount++;
    this.decisionsPerTick = 0;
    this.totalSelfEnergy = 0;
    this.activeTracesCount = 0;
    let totalCandidatesFound = 0;

    const toSleep: ParticleCore[] = [];
    const toWake: ParticleCore[] = [];

    // Rebuild Quadtree for active particles
    const qt = new Quadtree(0, 0, 35000);
    for (const p of this.activeParticles) {
      qt.insert(p);
    }

    for (const p of this.activeParticles) {
      // 1. Tempo Próprio: Avançar baseado no tick individual
      p.age++;
      p.x += p.vx;
      p.y += p.vy;
      
      if (Math.abs(p.x) > 30000) p.vx *= -1;
      if (Math.abs(p.y) > 30000) p.vy *= -1;

      // 2. Auto-observação: Motor de existência
      this.selfObserve(p);

      // 3. Busca Local Ativa
      const neighbors = qt.query(p.x, p.y, 1000);
      totalCandidatesFound += neighbors.length;
      
      if (neighbors.length > 1) { // neighbors includes self
        this.activeLocalSearch(p, neighbors);
        this.decisionsPerTick++;
      } else {
        // Se não encontrar ninguém, consome energia extra
        p.energy -= 0.005;
      }

      this.activeTracesCount += p.traces.length;

      // Se energia chegar a zero, volta a dormant
      if (p.energy <= 0 || (this.tickCount - p.lastActiveTick > 500)) {
        toSleep.push(p);
      }
    }

    this.avgCandidates = this.decisionsPerTick > 0 ? totalCandidatesFound / this.decisionsPerTick : 0;

    // Spontaneous wake-up (background noise)
    if (this.tickCount % 50 === 0 && this.activeParticles.size < 200) {
      const randomParticle = this.particles[Math.floor(Math.random() * this.particles.length)];
      if (randomParticle.isLatent) {
        toWake.push(randomParticle);
      }
    }

    for (const p of toWake) {
      this.wakeUp(p);
    }

    for (const p of toSleep) {
      this.sleep(p);
    }
  }

  private selfObserve(p: ParticleCore) {
    // Colapsa estado interno e consome energia
    const cost = 0.001 * (1 + Math.sin(p.phase));
    p.energy -= cost;
    this.totalSelfEnergy += cost;
    
    // Evolução da fase quântica própria
    p.phase = (p.phase + 0.05) % (Math.PI * 2);
    
    // Amplitude oscila com a fase, representando a "presença" quântica
    p.amplitude = 0.5 + 0.5 * Math.cos(p.phase);
    
    // Retém informação: posição e fase são inerentes, mas podemos registrar um "log" interno
    if (p.age % 100 === 0) {
      p.traces.push({ targetId: 'self', affinity: 1, tick: this.tickCount });
      if (p.traces.length > 10) p.traces.shift();
    }
  }

  private activeLocalSearch(p: ParticleCore, neighbors: ParticleCore[]) {
    // Calcular afinidade e escolher probabilisticamente
    const candidates = neighbors.filter(n => n.id !== p.id);
    if (candidates.length === 0) return;

    const affinities = candidates.map(n => {
      const dx = p.x - n.x;
      const dy = p.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Afinidade baseada em distância, fase e carga
      const phaseDiff = Math.cos(p.phase - n.phase);
      const chargeMatch = p.charge !== n.charge ? 1.5 : 0.5;
      const affinity = (1 / (dist + 1)) * (1 + phaseDiff) * chargeMatch;
      
      return { particle: n, affinity };
    });

    // Escolha probabilística (Roleta)
    const totalAffinity = affinities.reduce((sum, a) => sum + a.affinity, 0);
    let r = Math.random() * totalAffinity;
    let selected = affinities[0].particle;
    
    for (const a of affinities) {
      r -= a.affinity;
      if (r <= 0) {
        selected = a.particle;
        break;
      }
    }

    // Registrar interação
    p.traces.push({ targetId: selected.id, affinity: totalAffinity / candidates.length, tick: this.tickCount });
    if (p.traces.length > 10) p.traces.shift();
    
    // Ganho de energia por interação bem sucedida
    p.energy = Math.min(1.5, p.energy + 0.01);
    p.lastActiveTick = this.tickCount;
    
    // Influência mútua simples
    p.vx += (selected.vx - p.vx) * 0.01;
    p.vy += (selected.vy - p.vy) * 0.01;
  }

  private wakeUp(p: ParticleCore) {
    if (p.isLatent) {
      p.isLatent = false;
      p.lastActiveTick = this.tickCount;
      p.energy = 1.0;
      
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
      
      // Compactar e salvar traços na Memória Cósmica
      if (p.traces.length > 0) {
        this.cosmicMemory.set(p.id, [...p.traces]);
      }
      
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
          this.wakeUp(p);
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
      totalCount: this.particles.length,
      metrics: {
        decisionsPerTick: this.decisionsPerTick,
        avgCandidates: this.avgCandidates,
        totalSelfEnergy: this.totalSelfEnergy,
        activeTracesCount: this.activeTracesCount
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
        weight: p.weight
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
        if (!p.isLatent) {
          this.activeParticles.add(p);
        }
      }
    });
  }
}
