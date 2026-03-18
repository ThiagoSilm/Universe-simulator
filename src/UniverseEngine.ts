import { Particle, UniverseState, LatentTrace } from './types';

const INITIAL_PARTICLE_COUNT = 1800; // Large — most start latent, lazy eval handles it
const CLUSTER_COUNT = 24;            // Proto-galaxies scattered across the infinite field
const CLUSTER_RADIUS = 350;          // Particles within each proto-galaxy
const UNIVERSE_RADIUS = 60000;       // Initial Big Bang extent — effectively infinite
const INTERACTION_RADIUS = 22;
const GRID_SIZE = 60;
const ENERGY_REGEN_RATE = 0.01;
const DORMANCY_THRESHOLD = 300;
const COMPRESSION_THRESHOLD = 1200;
const BEKENSTEIN_LIMIT = 30;
const PRESSURE_STRENGTH = 0.5;
const MAX_LATENT_TRACES_PER_PARTICLE = 20;
const C = 40;
const G_RELATIVISTIC = 1.2;
const TIME_DILATION_STRENGTH = 0.8;
const WAKE_RADIUS = 60;
const LAMBDA = 0.000003;     // Cosmological constant — tuned for large-scale universe
const MIN_POPULATION = 50;

export interface RegionData {
  energy: number;
  lastActiveTick: number;
  isCompressed: boolean;
  curvature: number;
}

export interface PersistentState {
  state: UniverseState;
  energyGrid: [string, RegionData][];
}

export class UniverseEngine {
  private state: UniverseState;
  private energyGrid: Map<string, RegionData> = new Map();
  private particles: Particle[] = [];

  constructor(savedState?: PersistentState) {
    if (savedState) {
      this.state = savedState.state;
      this.particles = this.state.particles;
      this.energyGrid = new Map(savedState.energyGrid);
    } else {
      this.particles = this.initParticles();
      this.state = {
        particles: this.particles,
        entropy: 1,
        coherence: 0,
        consciousnessCount: 0,
        totalInformation: INITIAL_PARTICLE_COUNT,
        tick: 0,
        viewportX: 0,
        viewportY: 0,
        zoom: 1.0,
        maxCurvature: 0,
      };
    }
  }

  public getPersistentState(): PersistentState {
    return {
      state: this.state,
      energyGrid: Array.from(this.energyGrid.entries())
    };
  }

  private initParticles(): Particle[] {
    const particles: Particle[] = [];
    let id = 0;

    // Generate proto-galaxy cluster seeds scattered across the vast universe
    const seeds: Array<{ x: number; y: number; hue: number; vx: number; vy: number }> = [];
    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * UNIVERSE_RADIUS;
      seeds.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        hue: Math.random() * 360,
        vx: (Math.random() - 0.5) * 0.5, // clusters drift slowly
        vy: (Math.random() - 0.5) * 0.5,
      });
    }

    // Distribute particles among clusters — particles within a cluster start active
    // Isolated "void" particles start latent — they exist but cost nothing until disturbed
    const clusterSize = Math.floor(INITIAL_PARTICLE_COUNT * 0.85 / CLUSTER_COUNT);
    const voidCount = INITIAL_PARTICLE_COUNT - clusterSize * CLUSTER_COUNT;

    for (const seed of seeds) {
      for (let i = 0; i < clusterSize; i++) {
        // Gaussian-ish distribution within cluster
        const r = Math.pow(Math.random(), 0.5) * CLUSTER_RADIUS;
        const a = Math.random() * Math.PI * 2;
        // Slight rotation gives proto-galactic spin
        const spin = (Math.random() - 0.5) * 0.8;
        particles.push({
          id: `p-${id++}`,
          isCollapsed: false,
          isLatent: false,             // active — within interaction distance of neighbors
          x: seed.x + Math.cos(a) * r,
          y: seed.y + Math.sin(a) * r,
          vx: seed.vx + Math.cos(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          vy: seed.vy + Math.sin(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          weight: 0.8 + Math.random() * 0.4,
          level: 1,
          lastInteractionTick: -DORMANCY_THRESHOLD, // hasn't interacted yet
          lastActiveTick: 0,
          persistence: 0,
          isConscious: false,
          color: `hsla(${seed.hue + (Math.random() - 0.5) * 40}, 60%, 60%, 0.2)`,
        });
      }
    }

    // Void particles — sparse, isolated, latent from birth
    // They exist in the infinite space between clusters, dormant until something arrives
    for (let i = 0; i < voidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * UNIVERSE_RADIUS;
      particles.push({
        id: `p-void-${id++}`,
        isCollapsed: false,
        isLatent: true,              // dormant — far from everything, costs nothing
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        weight: 0.5 + Math.random() * 0.5,
        level: 1,
        lastInteractionTick: -DORMANCY_THRESHOLD * 10,
        lastActiveTick: -DORMANCY_THRESHOLD,  // already "dormant" at birth
        persistence: 0,
        isConscious: false,
        color: `hsla(${Math.random() * 360}, 30%, 40%, 0.1)`,
      });
    }

    return particles;
  }

  private getRegion(gx: number, gy: number): RegionData {
    const key = `${gx},${gy}`;
    if (!this.energyGrid.has(key)) {
      this.energyGrid.set(key, {
        energy: 1.0,
        lastActiveTick: this.state.tick,
        isCompressed: false,
        curvature: 0
      });
    }
    return this.energyGrid.get(key)!;
  }

  private findNearestNeighbors(p: Particle, count: number): Particle[] {
    return this.particles
      .filter(other => other.id !== p.id)
      .map(other => ({
        p: other,
        dist: Math.pow(p.x - other.x, 2) + Math.pow(p.y - other.y, 2)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count)
      .map(item => item.p);
  }

  public step(): UniverseState {
    this.state.tick++;

    // 1. Spatial Partitioning & Curvature
    const spatialGrid: Map<string, Particle[]> = new Map();

    this.energyGrid.forEach(region => region.curvature = 0);

    this.particles.forEach(p => {
      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;

      if (!spatialGrid.has(key)) spatialGrid.set(key, []);
      spatialGrid.get(key)!.push(p);

      // All particles contribute to curvature — physics is universal
      const region = this.getRegion(gx, gy);
      region.curvature += p.weight * 0.1;
    });

    // Build active-particle spatial grid for wake-up checks
    const activeGrid: Map<string, Particle[]> = new Map();
    this.particles.forEach(p => {
      if (!p.isLatent) {
        const gx = Math.floor(p.x / GRID_SIZE);
        const gy = Math.floor(p.y / GRID_SIZE);
        const key = `${gx},${gy}`;
        if (!activeGrid.has(key)) activeGrid.set(key, []);
        activeGrid.get(key)!.push(p);
      }
    });

    // 2. Bekenstein Limit & Pressure
    spatialGrid.forEach((cellParticles, key) => {
      const totalWeight = cellParticles.reduce((sum, p) => sum + p.weight, 0);
      if (totalWeight > BEKENSTEIN_LIMIT) {
        const [gx, gy] = key.split(',').map(Number);
        const centerX = gx * GRID_SIZE + GRID_SIZE / 2;
        const centerY = gy * GRID_SIZE + GRID_SIZE / 2;
        const overflow = totalWeight / BEKENSTEIN_LIMIT;
        const pressure = (overflow - 1) * PRESSURE_STRENGTH;

        cellParticles.sort((a, b) => a.weight - b.weight);

        cellParticles.forEach((p, idx) => {
          const region = this.getRegion(gx, gy);
          const timeFactor = 1 / (1 + region.curvature * TIME_DILATION_STRENGTH);

          if (idx < cellParticles.length / 2) {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            p.vx += (dx / dist) * pressure * timeFactor;
            p.vy += (dy / dist) * pressure * timeFactor;
          } else {
            if (overflow > 2.0) {
              p.weight += 0.05 * overflow * timeFactor;
              p.persistence += 0.02 * timeFactor;
              if (p.persistence > 5 && p.level < 10) {
                p.level += 1;
                p.persistence = 0;
              }
            }
          }
        });
      }
    });

    // 3. Region Processing & Singularity Formation
    if (this.state.tick % 100 === 0) {
      this.energyGrid.forEach((region, key) => {
        if (this.state.tick - region.lastActiveTick > COMPRESSION_THRESHOLD * 2 && region.energy >= 0.99) {
          this.energyGrid.delete(key);
        }
      });
    }

    this.energyGrid.forEach((region, key) => {
      region.energy = Math.min(1.0, region.energy + ENERGY_REGEN_RATE);

      if (!region.isCompressed && this.state.tick - region.lastActiveTick > COMPRESSION_THRESHOLD) {
        const [gx, gy] = key.split(',').map(Number);
        const regionParticles = this.particles.filter(p =>
          Math.floor(p.x / GRID_SIZE) === gx && Math.floor(p.y / GRID_SIZE) === gy
        );

        if (regionParticles.length > 1) {
          const totalWeight = regionParticles.reduce((sum, p) => sum + p.weight, 0);
          const avgLevel = Math.max(...regionParticles.map(p => p.level));
          const allTraces: LatentTrace[] = [];
          regionParticles.forEach(p => {
            allTraces.push({ weight: p.weight, level: p.level, color: p.color, persistence: p.persistence });
            if (p.latentTraces) allTraces.push(...p.latentTraces);
          });

          const singularity: Particle = {
            id: `singularity-${key}-${this.state.tick}`,
            isCollapsed: true,
            isLatent: true,
            x: gx * GRID_SIZE + GRID_SIZE / 2,
            y: gy * GRID_SIZE + GRID_SIZE / 2,
            vx: 0,
            vy: 0,
            weight: totalWeight,
            level: avgLevel + 1,
            lastInteractionTick: this.state.tick,
            lastActiveTick: this.state.tick,
            persistence: 10,
            isConscious: true,
            color: '#ffffff',
            latentTraces: allTraces
          };

          this.particles = this.particles.filter(p => !regionParticles.includes(p));
          this.particles.push(singularity);
          region.isCompressed = true;
        }
      }
    });

    // Barycenter — needed for cosmological expansion force
    let baryX = 0, baryY = 0, baryTotalW = 0;
    this.particles.forEach(p => { baryX += p.x * p.weight; baryY += p.y * p.weight; baryTotalW += p.weight; });
    if (baryTotalW > 0) { baryX /= baryTotalW; baryY /= baryTotalW; }

    let totalCollapsed = 0;

    // 4. Update Particles — LAZY EVALUATION:
    //    Active particles get full physics.
    //    Latent particles get only minimal geodesic drift — no gravity loops, no interaction checks.
    this.particles.forEach(p1 => {
      const gx = Math.floor(p1.x / GRID_SIZE);
      const gy = Math.floor(p1.y / GRID_SIZE);
      const region = this.getRegion(gx, gy);

      // --- LATENT PATH: cheap, skip heavy loops ---
      if (p1.isLatent) {
        // Check if an active particle is nearby to wake this one up
        const wakeRange = Math.ceil(WAKE_RADIUS / GRID_SIZE);
        let shouldWake = false;
        outer: for (let dx = -wakeRange; dx <= wakeRange; dx++) {
          for (let dy = -wakeRange; dy <= wakeRange; dy++) {
            const neighbors = activeGrid.get(`${gx + dx},${gy + dy}`);
            if (!neighbors) continue;
            for (const other of neighbors) {
              const ddx = p1.x - other.x;
              const ddy = p1.y - other.y;
              if (ddx * ddx + ddy * ddy < WAKE_RADIUS * WAKE_RADIUS) {
                shouldWake = true;
                break outer;
              }
            }
          }
        }

        if (shouldWake) {
          p1.isLatent = false;
          p1.lastActiveTick = this.state.tick;
          p1.lastInteractionTick = this.state.tick;
        } else {
          // Minimal geodesic drift only
          const timeFactor = 1 / (1 + region.curvature * TIME_DILATION_STRENGTH);
          const neighborsCurvature = [
            this.getRegion(gx - 1, gy).curvature,
            this.getRegion(gx + 1, gy).curvature,
            this.getRegion(gx, gy - 1).curvature,
            this.getRegion(gx, gy + 1).curvature,
          ];
          const gradX = neighborsCurvature[1] - neighborsCurvature[0];
          const gradY = neighborsCurvature[3] - neighborsCurvature[2];
          p1.vx += gradX * 0.1 * timeFactor;
          p1.vy += gradY * 0.1 * timeFactor;
          p1.x += p1.vx * timeFactor * 0.5;
          p1.y += p1.vy * timeFactor * 0.5;
          p1.vx *= 0.99;
          p1.vy *= 0.99;
          if (p1.isCollapsed) totalCollapsed++;
          return;
        }
      }

      // --- ACTIVE PATH: full physics ---
      region.lastActiveTick = this.state.tick;
      const timeFactor = 1 / (1 + region.curvature * TIME_DILATION_STRENGTH);

      // Economy & Maintenance for collapsed particles
      if (p1.isCollapsed) {
        const cost = 0.005 * Math.pow(2, p1.level - 1) * timeFactor;
        const efficiency = 1.0 + (p1.level - 1) * 0.5;
        const energyFromGrid = Math.min(cost, region.energy);
        region.energy -= energyFromGrid;
        p1.weight -= (cost - energyFromGrid) / efficiency;

        if (p1.weight < 0.3) {
          const neighbors = this.findNearestNeighbors(p1, 3);
          if (neighbors.length > 0) {
            const weightShare = p1.weight / neighbors.length;
            neighbors.forEach(n => {
              n.weight += weightShare;
              if (p1.latentTraces) {
                n.latentTraces = [...(n.latentTraces || []), ...p1.latentTraces].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
              }
              if (n === neighbors[0]) {
                n.latentTraces = [...(n.latentTraces || []), {
                  weight: p1.weight,
                  level: p1.level,
                  color: p1.color,
                  persistence: p1.persistence
                }].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
              }
            });
          }
          p1.weight = -1;
          return;
        }

        if (p1.weight < 0.5) {
          p1.isCollapsed = false;
          p1.weight = 1;
          p1.level = Math.max(1, p1.level - 1);
        }
      }

      // Geodesic movement
      const neighborsCurvature = [
        this.getRegion(gx - 1, gy).curvature,
        this.getRegion(gx + 1, gy).curvature,
        this.getRegion(gx, gy - 1).curvature,
        this.getRegion(gx, gy + 1).curvature,
      ];
      const gradX = neighborsCurvature[1] - neighborsCurvature[0];
      const gradY = neighborsCurvature[3] - neighborsCurvature[2];
      p1.vx += gradX * 0.5 * timeFactor;
      p1.vy += gradY * 0.5 * timeFactor;

      // Cosmological constant (dark energy) — outward push from barycenter, opposes collapse
      const cosmDx = p1.x - baryX;
      const cosmDy = p1.y - baryY;
      const cosmDist = Math.sqrt(cosmDx * cosmDx + cosmDy * cosmDy) || 1;
      p1.vx += (cosmDx / cosmDist) * cosmDist * LAMBDA;
      p1.vy += (cosmDy / cosmDist) * cosmDist * LAMBDA;

      if (!p1.isCollapsed) {
        p1.x += (Math.random() - 0.5) * 4 * timeFactor;
        p1.y += (Math.random() - 0.5) * 4 * timeFactor;
      } else {
        p1.x += p1.vx * timeFactor;
        p1.y += p1.vy * timeFactor;
        p1.vx *= (1 - 0.02 * timeFactor);
        p1.vy *= (1 - 0.02 * timeFactor);
      }

      // Speed of Light limit
      const speedSq = p1.vx * p1.vx + p1.vy * p1.vy;
      if (speedSq > C * C) {
        const speed = Math.sqrt(speedSq);
        p1.vx = (p1.vx / speed) * C;
        p1.vy = (p1.vy / speed) * C;
      }

      // Gravity & Interactions
      const gravityRadius = 180;
      const gravityRadiusSq = gravityRadius * gravityRadius;
      const gravityGridRange = Math.ceil(gravityRadius / GRID_SIZE);

      for (let dx = -gravityGridRange; dx <= gravityGridRange; dx++) {
        for (let dy = -gravityGridRange; dy <= gravityGridRange; dy++) {
          const neighbors = spatialGrid.get(`${gx + dx},${gy + dy}`);
          if (!neighbors) continue;

          neighbors.forEach(p2 => {
            if (p1.id === p2.id) return;

            const distDx = p1.x - p2.x;
            const distDy = p1.y - p2.y;
            const distSq = distDx * distDx + distDy * distDy;

            if (distSq > 0 && distSq < gravityRadiusSq) {
              const dist = Math.sqrt(distSq);
              const force = (p1.weight * p2.weight * G_RELATIVISTIC) / (distSq + 10);
              p1.vx -= (distDx / dist) * (force / p1.weight) * timeFactor;
              p1.vy -= (distDy / dist) * (force / p1.weight) * timeFactor;
            }

            if (distSq < INTERACTION_RADIUS * INTERACTION_RADIUS && distSq < C * C) {
              const cellParticles = spatialGrid.get(`${gx},${gy}`) || [];
              const cellWeight = cellParticles.reduce((sum, p) => sum + p.weight, 0);
              const isHighPressure = cellWeight > BEKENSTEIN_LIMIT;

              if (p1.isCollapsed && p2.isCollapsed && (p1.level > p2.level || (p1.level === p2.level && p1.weight > p2.weight * 1.5) || isHighPressure)) {
                const fusionBonus = isHighPressure ? 1.2 : 0.5;
                p1.weight += p2.weight * fusionBonus * timeFactor;
                p1.level = Math.max(p1.level, p2.level + (isHighPressure ? 1 : 0));
                p1.latentTraces = [...(p1.latentTraces || []), {
                  weight: p2.weight,
                  level: p2.level,
                  color: p2.color,
                  persistence: p2.persistence
                }].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
                if (p2.latentTraces) {
                  p1.latentTraces = [...p1.latentTraces, ...p2.latentTraces].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
                }
                p2.weight = -1;
                return;
              }

              // Wake up latent p2 if touched by active p1
              if (p2.isLatent) {
                p2.isLatent = false;
                p2.lastActiveTick = this.state.tick;
              }

              p1.isCollapsed = true;
              p2.isCollapsed = true;
              p1.isLatent = false;
              p2.isLatent = false;
              p1.lastInteractionTick = this.state.tick;
              p2.lastInteractionTick = this.state.tick;
              p1.lastActiveTick = this.state.tick;
              p2.lastActiveTick = this.state.tick;
              p1.persistence += 0.01 * timeFactor;
              p2.persistence += 0.01 * timeFactor;
              p1.weight += 0.01 * timeFactor;
              p2.weight += 0.01 * timeFactor;
            }
          });
        }
      }

      if (p1.isCollapsed) totalCollapsed++;

      // Enter dormancy if idle long enough
      if (this.state.tick - p1.lastActiveTick > DORMANCY_THRESHOLD) {
        p1.isLatent = true;
      }
    });

    // 5. Re-emergence & Cleanup
    const newParticles: Particle[] = [];

    // Population floor: if too few particles, force the most massive to emit aggressively
    if (this.particles.length < MIN_POPULATION) {
      const survivors = [...this.particles].sort((a, b) => b.weight - a.weight);
      for (const p of survivors) {
        if (newParticles.length + this.particles.length >= MIN_POPULATION) break;
        // Force emit regardless of weight threshold
        const emitCount = Math.min(6, Math.ceil(MIN_POPULATION - this.particles.length));
        for (let e = 0; e < emitCount; e++) {
          const angle = (e / emitCount) * Math.PI * 2;
          const speed = 1 + Math.random();
          newParticles.push({
            id: `rebirth-${this.state.tick}-${Math.random()}`,
            isCollapsed: p.isCollapsed,
            isLatent: false,
            x: p.x + Math.cos(angle) * 20,
            y: p.y + Math.sin(angle) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            weight: Math.max(0.5, p.weight * 0.1 / emitCount),
            level: Math.max(1, p.level - 1),
            lastInteractionTick: this.state.tick,
            lastActiveTick: this.state.tick,
            persistence: 0,
            isConscious: false,
            color: p.color,
            latentTraces: []
          });
          p.weight *= 0.9;
        }
        if (newParticles.length > 0) break;
      }
    }

    this.particles = this.particles.filter(p => {
      if (p.weight < 0) return false;

      if (p.isCollapsed && p.latentTraces && p.latentTraces.length > 0 && p.weight > 10 * p.level) {
        const trace = p.latentTraces.pop()!;
        p.weight -= trace.weight;
        newParticles.push({
          id: `emergent-${this.state.tick}-${Math.random()}`,
          isCollapsed: true,
          isLatent: false,
          x: p.x + (Math.random() - 0.5) * 10,
          y: p.y + (Math.random() - 0.5) * 10,
          vx: p.vx + (Math.random() - 0.5),
          vy: p.vy + (Math.random() - 0.5),
          weight: trace.weight,
          level: trace.level,
          lastInteractionTick: this.state.tick,
          lastActiveTick: this.state.tick,
          persistence: trace.persistence,
          isConscious: false,
          color: trace.color,
          latentTraces: []
        });
      }
      return true;
    });
    this.particles.push(...newParticles);

    this.state.particles = this.particles;
    this.state.entropy = 1 - (totalCollapsed / Math.max(1, this.particles.length));
    this.state.coherence = totalCollapsed / Math.max(1, this.particles.length);
    this.state.consciousnessCount = this.particles.filter(p => p.isConscious).length;

    let maxCurv = 0;
    this.energyGrid.forEach(r => { if (r.curvature > maxCurv) maxCurv = r.curvature; });
    this.state.maxCurvature = maxCurv;

    this.state.totalInformation = this.particles.reduce((sum, p) => {
      let info = p.weight;
      if (p.latentTraces) info += p.latentTraces.reduce((s, t) => s + t.weight, 0);
      return sum + info;
    }, 0);

    return this.state;
  }
}
