import { Particle, UniverseState, LatentTrace } from './types';

// ── Universe Constants ──────────────────────────────────────────────────────
const INITIAL_PARTICLE_COUNT = 1800;
const CLUSTER_COUNT          = 24;
const CLUSTER_RADIUS         = 350;
const UNIVERSE_RADIUS        = 60000;

const GRID_SIZE              = 60;
const INTERACTION_RADIUS     = 22;
const REPULSION_RADIUS       = 8;          // Below this: short-range repulsion (Pauli / nuclear)
const GRAVITY_RADIUS         = 180;

const C                      = 40;         // Speed of light
const G                      = 1.2;        // Gravitational constant
const LAMBDA                 = 0.000003;   // Cosmological constant (dark energy)
const TIME_DILATION_STR      = 0.8;

const BEKENSTEIN_LIMIT       = 30;
const PRESSURE_STRENGTH      = 0.5;
const REPULSION_STRENGTH     = 12.0;       // Short-range repulsion magnitude
const HAWKING_RATE           = 0.0003;     // Rate at which high-level entities radiate energy

const ENERGY_REGEN_RATE      = 0.01;
const DORMANCY_THRESHOLD     = 300;
const COMPRESSION_THRESHOLD  = 1200;
const WAKE_RADIUS            = 60;
const MAX_LATENT_TRACES      = 20;
const MIN_POPULATION         = 50;

// ── Types ───────────────────────────────────────────────────────────────────
export interface RegionData {
  energy:        number;
  lastActiveTick: number;
  isCompressed:  boolean;
  curvature:     number;
}

export interface PersistentState {
  state:      UniverseState;
  energyGrid: [string, RegionData][];
}

// ── Engine ──────────────────────────────────────────────────────────────────
export class UniverseEngine {
  private state:      UniverseState;
  private energyGrid: Map<string, RegionData> = new Map();
  private particles:  Particle[] = [];

  constructor(savedState?: PersistentState) {
    if (savedState) {
      this.state     = savedState.state;
      this.particles = this.state.particles;
      this.energyGrid = new Map(savedState.energyGrid);
    } else {
      this.particles = this.initParticles();
      this.state = {
        particles: this.particles,
        entropy: 1, coherence: 0, consciousnessCount: 0,
        totalInformation: INITIAL_PARTICLE_COUNT,
        tick: 0, viewportX: 0, viewportY: 0, zoom: 1.0, maxCurvature: 0,
      };
    }
  }

  public getPersistentState(): PersistentState {
    return { state: this.state, energyGrid: Array.from(this.energyGrid.entries()) };
  }

  // ── Initialization: Big Bang across infinite space ────────────────────────
  private initParticles(): Particle[] {
    const particles: Particle[] = [];
    let id = 0;

    // Proto-galaxy seeds scattered across the vast universe
    const seeds = Array.from({ length: CLUSTER_COUNT }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * UNIVERSE_RADIUS;
      return {
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        hue: Math.random() * 360,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      };
    });

    const clusterSize = Math.floor(INITIAL_PARTICLE_COUNT * 0.85 / CLUSTER_COUNT);
    const voidCount   = INITIAL_PARTICLE_COUNT - clusterSize * CLUSTER_COUNT;

    for (const seed of seeds) {
      for (let i = 0; i < clusterSize; i++) {
        const r    = Math.pow(Math.random(), 0.5) * CLUSTER_RADIUS;
        const a    = Math.random() * Math.PI * 2;
        const spin = (Math.random() - 0.5) * 0.8;
        particles.push({
          id: `p-${id++}`,
          isCollapsed: false, isLatent: false,
          x: seed.x + Math.cos(a) * r,
          y: seed.y + Math.sin(a) * r,
          vx: seed.vx + Math.cos(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          vy: seed.vy + Math.sin(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          weight: 0.8 + Math.random() * 0.4,
          level: 1,
          lastInteractionTick: -DORMANCY_THRESHOLD,
          lastActiveTick: 0,
          persistence: 0, isConscious: false,
          color: `hsla(${seed.hue + (Math.random() - 0.5) * 40},60%,60%,0.2)`,
        });
      }
    }

    // Void particles — latent from birth, exist without cost
    for (let i = 0; i < voidCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * UNIVERSE_RADIUS;
      particles.push({
        id: `p-void-${id++}`,
        isCollapsed: false, isLatent: true,
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        weight: 0.5 + Math.random() * 0.5,
        level: 1,
        lastInteractionTick: -DORMANCY_THRESHOLD * 10,
        lastActiveTick: -DORMANCY_THRESHOLD,
        persistence: 0, isConscious: false,
        color: `hsla(${Math.random() * 360},30%,40%,0.1)`,
      });
    }

    return particles;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private getRegion(gx: number, gy: number): RegionData {
    const key = `${gx},${gy}`;
    if (!this.energyGrid.has(key)) {
      this.energyGrid.set(key, {
        energy: 1.0, lastActiveTick: this.state.tick,
        isCompressed: false, curvature: 0
      });
    }
    return this.energyGrid.get(key)!;
  }

  private findNearestNeighbors(p: Particle, count: number): Particle[] {
    return this.particles
      .filter(o => o.id !== p.id)
      .map(o => ({ p: o, d2: (p.x-o.x)**2 + (p.y-o.y)**2 }))
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, count)
      .map(x => x.p);
  }

  // ── Main step — one tick of the universe ──────────────────────────────────
  public step(): UniverseState {
    this.state.tick++;
    const tick = this.state.tick;

    // ── 1. Spatial partitioning & curvature ──────────────────────────────
    const spatialGrid: Map<string, Particle[]> = new Map();
    this.energyGrid.forEach(r => r.curvature = 0);

    this.particles.forEach(p => {
      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (!spatialGrid.has(key)) spatialGrid.set(key, []);
      spatialGrid.get(key)!.push(p);
      this.getRegion(gx, gy).curvature += p.weight * 0.1;
    });

    // Active-particle grid for wake-up checks
    const activeGrid: Map<string, Particle[]> = new Map();
    this.particles.forEach(p => {
      if (p.isLatent) return;
      const key = `${Math.floor(p.x/GRID_SIZE)},${Math.floor(p.y/GRID_SIZE)}`;
      if (!activeGrid.has(key)) activeGrid.set(key, []);
      activeGrid.get(key)!.push(p);
    });

    // ── 2. Barycenter (for cosmological force) ────────────────────────────
    let baryX = 0, baryY = 0, baryW = 0;
    this.particles.forEach(p => { baryX += p.x*p.weight; baryY += p.y*p.weight; baryW += p.weight; });
    if (baryW > 0) { baryX /= baryW; baryY /= baryW; }

    // ── 3. Bekenstein pressure ────────────────────────────────────────────
    spatialGrid.forEach((cell, key) => {
      const totalW = cell.reduce((s, p) => s + p.weight, 0);
      if (totalW <= BEKENSTEIN_LIMIT) return;

      const [gx, gy] = key.split(',').map(Number);
      const cx = gx * GRID_SIZE + GRID_SIZE / 2;
      const cy = gy * GRID_SIZE + GRID_SIZE / 2;
      const overflow = totalW / BEKENSTEIN_LIMIT;
      const pressure = (overflow - 1) * PRESSURE_STRENGTH;

      cell.sort((a, b) => a.weight - b.weight);
      cell.forEach((p, idx) => {
        const tf = 1 / (1 + this.getRegion(gx,gy).curvature * TIME_DILATION_STR);
        if (idx < cell.length / 2) {
          const dx = p.x - cx, dy = p.y - cy;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          p.vx += (dx/d) * pressure * tf;
          p.vy += (dy/d) * pressure * tf;
        } else if (overflow > 2.0) {
          p.weight += 0.05 * overflow * tf;
          p.persistence += 0.02 * tf;
          if (p.persistence > 5 && p.level < 10) { p.level++; p.persistence = 0; }
        }
      });
    });

    // ── 4. Region energy & singularity compression ────────────────────────
    if (tick % 100 === 0) {
      this.energyGrid.forEach((r, key) => {
        if (tick - r.lastActiveTick > COMPRESSION_THRESHOLD * 2 && r.energy >= 0.99)
          this.energyGrid.delete(key);
      });
    }

    this.energyGrid.forEach((region, key) => {
      region.energy = Math.min(1.0, region.energy + ENERGY_REGEN_RATE);
      if (region.isCompressed || tick - region.lastActiveTick <= COMPRESSION_THRESHOLD) return;

      const [gx, gy] = key.split(',').map(Number);
      const rp = this.particles.filter(p =>
        Math.floor(p.x/GRID_SIZE) === gx && Math.floor(p.y/GRID_SIZE) === gy
      );
      if (rp.length <= 1) return;

      const totalW = rp.reduce((s, p) => s + p.weight, 0);
      const allTraces: LatentTrace[] = [];
      rp.forEach(p => {
        allTraces.push({ weight: p.weight, level: p.level, color: p.color, persistence: p.persistence });
        if (p.latentTraces) allTraces.push(...p.latentTraces);
      });

      // Conservation of momentum: singularity inherits combined momentum
      const totalPx = rp.reduce((s, p) => s + p.vx * p.weight, 0);
      const totalPy = rp.reduce((s, p) => s + p.vy * p.weight, 0);

      this.particles.push({
        id: `singularity-${key}-${tick}`,
        isCollapsed: true, isLatent: true,
        x: gx * GRID_SIZE + GRID_SIZE / 2,
        y: gy * GRID_SIZE + GRID_SIZE / 2,
        vx: totalPx / totalW,   // conserved momentum
        vy: totalPy / totalW,
        weight: totalW, level: Math.max(...rp.map(p=>p.level)) + 1,
        lastInteractionTick: tick, lastActiveTick: tick,
        persistence: 10, isConscious: true,
        color: '#ffffff', latentTraces: allTraces
      });
      this.particles = this.particles.filter(p => !rp.includes(p));
      region.isCompressed = true;
    });

    // ── 5. Particle update — lazy evaluation ──────────────────────────────
    let totalCollapsed = 0;

    this.particles.forEach(p1 => {
      const gx = Math.floor(p1.x / GRID_SIZE);
      const gy = Math.floor(p1.y / GRID_SIZE);
      const region = this.getRegion(gx, gy);

      // ── LATENT PATH: minimal cost ──────────────────────────────────────
      if (p1.isLatent) {
        const wr = Math.ceil(WAKE_RADIUS / GRID_SIZE);
        let wake = false;
        outer: for (let dx = -wr; dx <= wr; dx++) {
          for (let dy = -wr; dy <= wr; dy++) {
            const nb = activeGrid.get(`${gx+dx},${gy+dy}`);
            if (!nb) continue;
            for (const o of nb) {
              if ((p1.x-o.x)**2 + (p1.y-o.y)**2 < WAKE_RADIUS**2) { wake = true; break outer; }
            }
          }
        }
        if (wake) {
          p1.isLatent = false;
          p1.lastActiveTick = tick;
          p1.lastInteractionTick = tick;
        } else {
          // Geodesic drift only
          const tf = 1 / (1 + region.curvature * TIME_DILATION_STR);
          const nc = [
            this.getRegion(gx-1,gy).curvature, this.getRegion(gx+1,gy).curvature,
            this.getRegion(gx,gy-1).curvature, this.getRegion(gx,gy+1).curvature,
          ];
          p1.vx += (nc[1]-nc[0]) * 0.1 * tf;
          p1.vy += (nc[3]-nc[2]) * 0.1 * tf;
          p1.x  += p1.vx * tf * 0.5;
          p1.y  += p1.vy * tf * 0.5;
          p1.vx *= 0.99; p1.vy *= 0.99;
          if (p1.isCollapsed) totalCollapsed++;
          return;
        }
      }

      // ── ACTIVE PATH: full physics ──────────────────────────────────────
      region.lastActiveTick = tick;
      const tf = 1 / (1 + region.curvature * TIME_DILATION_STR);

      // Law: maintenance cost for collapsed complexity
      if (p1.isCollapsed) {
        const cost = 0.005 * Math.pow(2, p1.level-1) * tf;
        const eff  = 1.0 + (p1.level-1) * 0.5;
        const fromGrid = Math.min(cost, region.energy);
        region.energy -= fromGrid;
        p1.weight -= (cost - fromGrid) / eff;

        // Law: Hawking-like radiation — high-level entities heat their region
        if (p1.level > 2) {
          region.energy = Math.min(1.0, region.energy + HAWKING_RATE * p1.level);
        }

        if (p1.weight < 0.3) {
          const nb = this.findNearestNeighbors(p1, 3);
          nb.forEach((n, i) => {
            n.weight += p1.weight / nb.length;
            if (p1.latentTraces)
              n.latentTraces = [...(n.latentTraces||[]), ...p1.latentTraces].slice(-MAX_LATENT_TRACES);
            if (i === 0)
              n.latentTraces = [...(n.latentTraces||[]), {
                weight: p1.weight, level: p1.level, color: p1.color, persistence: p1.persistence
              }].slice(-MAX_LATENT_TRACES);
          });
          p1.weight = -1;
          return;
        }
        if (p1.weight < 0.5) {
          p1.isCollapsed = false; p1.weight = 1; p1.level = Math.max(1, p1.level-1);
        }
      }

      // Law: geodesic movement — follow curvature gradient
      const nc = [
        this.getRegion(gx-1,gy).curvature, this.getRegion(gx+1,gy).curvature,
        this.getRegion(gx,gy-1).curvature, this.getRegion(gx,gy+1).curvature,
      ];
      p1.vx += (nc[1]-nc[0]) * 0.5 * tf;
      p1.vy += (nc[3]-nc[2]) * 0.5 * tf;

      // Law: cosmological constant — outward push from barycenter (dark energy)
      const cdx = p1.x - baryX, cdy = p1.y - baryY;
      const cdist = Math.sqrt(cdx*cdx + cdy*cdy) || 1;
      p1.vx += (cdx/cdist) * cdist * LAMBDA;
      p1.vy += (cdy/cdist) * cdist * LAMBDA;

      // Law: position integration — both collapsed and uncollapsed use velocity
      // Uncollapsed adds quantum noise on top of deterministic motion
      if (!p1.isCollapsed) {
        const thermalNoise = 1.5 + region.curvature * 0.5; // hotter near mass
        p1.x += p1.vx * tf + (Math.random()-0.5) * thermalNoise * tf;
        p1.y += p1.vy * tf + (Math.random()-0.5) * thermalNoise * tf;
        p1.vx *= (1 - 0.01 * tf);
        p1.vy *= (1 - 0.01 * tf);
      } else {
        p1.x += p1.vx * tf;
        p1.y += p1.vy * tf;
        p1.vx *= (1 - 0.02 * tf);
        p1.vy *= (1 - 0.02 * tf);
      }

      // Law: speed of light — no information faster than C
      const spd2 = p1.vx*p1.vx + p1.vy*p1.vy;
      if (spd2 > C*C) {
        const spd = Math.sqrt(spd2);
        p1.vx = (p1.vx/spd)*C; p1.vy = (p1.vy/spd)*C;
      }

      // ── Law: gravity & interactions ────────────────────────────────────
      const gRange = Math.ceil(GRAVITY_RADIUS / GRID_SIZE);
      const gR2    = GRAVITY_RADIUS * GRAVITY_RADIUS;

      for (let dx = -gRange; dx <= gRange; dx++) {
        for (let dy = -gRange; dy <= gRange; dy++) {
          const nb = spatialGrid.get(`${gx+dx},${gy+dy}`);
          if (!nb) continue;

          nb.forEach(p2 => {
            if (p1.id === p2.id) return;
            const ddx = p1.x-p2.x, ddy = p1.y-p2.y;
            const d2  = ddx*ddx + ddy*ddy;
            if (d2 === 0) return;
            const d   = Math.sqrt(d2);

            // Law: gravity — attract along geodesics (within range, softened)
            if (d2 < gR2) {
              const F = (p1.weight * p2.weight * G) / (d2 + 10);
              p1.vx -= (ddx/d) * (F/p1.weight) * tf;
              p1.vy -= (ddy/d) * (F/p1.weight) * tf;
            }

            if (d2 < INTERACTION_RADIUS * INTERACTION_RADIUS && d2 < C*C) {

              // Law: short-range repulsion — degeneracy pressure prevents overlap
              if (d < REPULSION_RADIUS) {
                const repF = REPULSION_STRENGTH * (1 - d/REPULSION_RADIUS) / Math.max(d, 0.1);
                p1.vx += (ddx/d) * repF * tf;
                p1.vy += (ddy/d) * repF * tf;
                return; // repulsion takes priority over collapse at this range
              }

              const cell = spatialGrid.get(`${gx},${gy}`) || [];
              const cellW = cell.reduce((s,p) => s+p.weight, 0);
              const hiP   = cellW > BEKENSTEIN_LIMIT;

              // Law: fusion — with momentum conservation
              if (p1.isCollapsed && p2.isCollapsed &&
                  (p1.level > p2.level || (p1.level === p2.level && p1.weight > p2.weight*1.5) || hiP)) {
                const bonus = hiP ? 1.2 : 0.5;
                const newW  = p1.weight + p2.weight * bonus * tf;
                // Conservation of momentum: p_total = p1 + p2
                p1.vx = (p1.vx*p1.weight + p2.vx*p2.weight) / newW;
                p1.vy = (p1.vy*p1.weight + p2.vy*p2.weight) / newW;
                p1.weight = newW;
                p1.level  = Math.max(p1.level, p2.level + (hiP ? 1 : 0));
                p1.latentTraces = [...(p1.latentTraces||[]), {
                  weight: p2.weight, level: p2.level, color: p2.color, persistence: p2.persistence
                }, ...(p2.latentTraces||[])].slice(-MAX_LATENT_TRACES);
                p2.weight = -1;
                return;
              }

              // Wake latent p2 on contact
              if (p2.isLatent) { p2.isLatent = false; p2.lastActiveTick = tick; }

              // Collapse both on interaction
              p1.isCollapsed = true; p2.isCollapsed = true;
              p1.isLatent = false;  p2.isLatent = false;
              p1.lastInteractionTick = tick; p2.lastInteractionTick = tick;
              p1.lastActiveTick = tick;      p2.lastActiveTick = tick;
              p1.persistence += 0.01*tf;    p2.persistence += 0.01*tf;
              p1.weight += 0.01*tf;         p2.weight += 0.01*tf;
            }
          });
        }
      }

      if (p1.isCollapsed) totalCollapsed++;

      // Dormancy — enter latent state after long idle
      if (tick - p1.lastActiveTick > DORMANCY_THRESHOLD) p1.isLatent = true;
    });

    // ── 6. Re-emergence & cleanup ─────────────────────────────────────────
    const newParticles: Particle[] = [];

    // Population floor — if universe collapses too far, force rebirth
    if (this.particles.length < MIN_POPULATION) {
      const survivors = [...this.particles].sort((a,b) => b.weight - a.weight);
      for (const p of survivors) {
        if (newParticles.length + this.particles.length >= MIN_POPULATION) break;
        const emitN = Math.min(6, MIN_POPULATION - this.particles.length);
        for (let e = 0; e < emitN; e++) {
          const a = (e/emitN) * Math.PI*2, spd = 1+Math.random();
          newParticles.push({
            id: `rebirth-${tick}-${Math.random()}`,
            isCollapsed: p.isCollapsed, isLatent: false,
            x: p.x + Math.cos(a)*20, y: p.y + Math.sin(a)*20,
            vx: Math.cos(a)*spd, vy: Math.sin(a)*spd,
            weight: Math.max(0.5, p.weight*0.1/emitN),
            level: Math.max(1, p.level-1),
            lastInteractionTick: tick, lastActiveTick: tick,
            persistence: 0, isConscious: false, color: p.color, latentTraces: []
          });
          p.weight *= 0.9;
        }
        if (newParticles.length > 0) break;
      }
    }

    this.particles = this.particles.filter(p => {
      if (p.weight < 0) return false;

      // Re-emergence from stored latent traces
      if (p.isCollapsed && p.latentTraces?.length && p.weight > 10 * p.level) {
        const trace = p.latentTraces.pop()!;
        p.weight -= trace.weight;
        newParticles.push({
          id: `emergent-${tick}-${Math.random()}`,
          isCollapsed: true, isLatent: false,
          x: p.x + (Math.random()-0.5)*10, y: p.y + (Math.random()-0.5)*10,
          vx: p.vx + (Math.random()-0.5), vy: p.vy + (Math.random()-0.5),
          weight: trace.weight, level: trace.level,
          lastInteractionTick: tick, lastActiveTick: tick,
          persistence: trace.persistence, isConscious: false,
          color: trace.color, latentTraces: []
        });
      }
      return true;
    });
    this.particles.push(...newParticles);

    // ── 7. Universe state summary ─────────────────────────────────────────
    const n = Math.max(1, this.particles.length);
    this.state.particles         = this.particles;
    this.state.entropy           = 1 - totalCollapsed/n;
    this.state.coherence         = totalCollapsed/n;
    this.state.consciousnessCount = this.particles.filter(p=>p.isConscious).length;
    this.state.totalInformation  = this.particles.reduce((s,p) => {
      return s + p.weight + (p.latentTraces?.reduce((ss,t)=>ss+t.weight,0) ?? 0);
    }, 0);

    let maxCurv = 0;
    this.energyGrid.forEach(r => { if (r.curvature > maxCurv) maxCurv = r.curvature; });
    this.state.maxCurvature = maxCurv;

    return this.state;
  }
}
