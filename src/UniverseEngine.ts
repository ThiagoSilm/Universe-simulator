import { Particle, UniverseState, LatentTrace } from './types';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const INITIAL_PARTICLE_COUNT = 1800;
const CLUSTER_COUNT          = 24;
const CLUSTER_RADIUS         = 350;
const UNIVERSE_RADIUS        = 60000;

const GRID_SIZE              = 60;

const C                      = 40;
const G                      = 1.2;
const K_EM                   = 4.0;
const REPULSION_STRENGTH     = 14.0;
const LAMBDA_LOCAL           = 0.012;

const GRAVITY_RADIUS         = 180;
const EM_RADIUS              = 90;
const INTERACTION_RADIUS     = 22;
const REPULSION_RADIUS       = 8;
const WAKE_RADIUS            = 60;

const TIME_DILATION_STR      = 0.8;

const WAVE_INITIAL           = 20;
const WAVE_COLLAPSE_RATE     = 0.25;
const WAVE_EXPAND_RATE       = 0.02;

const TEMP_DECAY             = 0.97;
const TEMP_DIFFUSE           = 0.08;
const TEMP_FROM_KE           = 0.000008;
const LARMOR_COEFF           = 0.0004;

const BEKENSTEIN_LIMIT       = 30;
const PRESSURE_STRENGTH      = 0.5;
const HAWKING_RATE           = 0.0003;
const DORMANCY_THRESHOLD     = 300;
const COMPRESSION_THRESHOLD  = 1200;
const MAX_LATENT_TRACES      = 20;
const MIN_POPULATION         = 50;
const ENERGY_REGEN_RATE      = 0.01;

const CHARGE_FRACTION        = 0.38;

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export interface RegionData {
  energy:         number;
  lastActiveTick: number;
  isCompressed:   boolean;
  curvature:      number;
  temperature:    number;
  density:        number;
}

export interface PersistentState {
  state:      UniverseState;
  energyGrid: [string, RegionData][];
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE
// ═══════════════════════════════════════════════════════════════════

export class UniverseEngine {
  private state:      UniverseState;
  private energyGrid: Map<string, RegionData> = new Map();
  private particles:  Particle[];

  constructor(savedState?: PersistentState) {
    if (savedState) {
      this.state      = savedState.state;
      this.particles  = this.state.particles;
      this.energyGrid = new Map(savedState.energyGrid);
      this.particles.forEach(p => {
        if (p.waveRadius === undefined) p.waveRadius = p.isCollapsed ? 0 : WAVE_INITIAL;
        if (p.charge     === undefined) p.charge = 0;
      });
    } else {
      this.particles = this.initParticles();
      this.state = {
        particles: this.particles,
        entropy: 1, coherence: 0, consciousnessCount: 0,
        totalInformation: INITIAL_PARTICLE_COUNT,
        tick: 0, maxCurvature: 0, avgTemperature: 0,
        viewportX: 0, viewportY: 0, zoom: 1,
      };
    }
  }

  public getPersistentState(): PersistentState {
    return { state: this.state, energyGrid: Array.from(this.energyGrid.entries()) };
  }

  // ─────────────────────────────────────────────────────────────────
  private makeCharge(): number {
    const r = Math.random();
    if (r < CHARGE_FRACTION / 2) return -1;
    if (r < CHARGE_FRACTION)     return  1;
    return 0;
  }

  private initParticles(): Particle[] {
    const particles: Particle[] = [];
    let id = 0;

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
          level: 1, lastInteractionTick: -DORMANCY_THRESHOLD,
          lastActiveTick: 0, persistence: 0, isConscious: false,
          color: `hsla(${seed.hue + (Math.random() - 0.5) * 40},60%,60%,0.2)`,
          waveRadius: WAVE_INITIAL, charge: this.makeCharge(),
        });
      }
    }

    // Void particles — dormant from birth
    for (let i = 0; i < voidCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * UNIVERSE_RADIUS;
      particles.push({
        id: `void-${id++}`,
        isCollapsed: false, isLatent: true,
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        weight: 0.5 + Math.random() * 0.5, level: 1,
        lastInteractionTick: -DORMANCY_THRESHOLD * 10,
        lastActiveTick: -DORMANCY_THRESHOLD,
        persistence: 0, isConscious: false,
        color: `hsla(${Math.random() * 360},30%,40%,0.1)`,
        waveRadius: WAVE_INITIAL, charge: this.makeCharge(),
      });
    }

    return particles;
  }

  private getRegion(gx: number, gy: number): RegionData {
    const key = `${gx},${gy}`;
    let r = this.energyGrid.get(key);
    if (!r) {
      r = { energy: 1.0, lastActiveTick: this.state.tick, isCompressed: false, curvature: 0, temperature: 0, density: 0 };
      this.energyGrid.set(key, r);
    }
    return r;
  }

  // ─────────────────────────────────────────────────────────────────
  //  STEP
  // ─────────────────────────────────────────────────────────────────
  public step(): UniverseState {
    const tick = ++this.state.tick;

    // ── 1. Build separate active/dormant grids ─────────────────────
    //    Dormant particles are in quantum superposition — they do not
    //    curve spacetime until observed (interacted with).
    const spatialGrid = new Map<string, Particle[]>();
    const dormantGrid = new Map<string, Particle[]>();

    this.energyGrid.forEach(r => { r.curvature = 0; r.density = 0; });

    for (const p of this.particles) {
      const gx  = Math.floor(p.x / GRID_SIZE);
      const gy  = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (p.isLatent) {
        let cell = dormantGrid.get(key);
        if (!cell) { cell = []; dormantGrid.set(key, cell); }
        cell.push(p);
      } else {
        let cell = spatialGrid.get(key);
        if (!cell) { cell = []; spatialGrid.set(key, cell); }
        cell.push(p);
        const r = this.getRegion(gx, gy);
        r.curvature += p.weight * 0.1;
        r.density   += 1;
      }
    }

    // ── 2. Wake dormant at active borders ─────────────────────────
    const wakeRange = Math.ceil(WAKE_RADIUS / GRID_SIZE);
    for (const [aKey, activeCell] of spatialGrid) {
      const [agx, agy] = aKey.split(',').map(Number);
      for (let dx = -wakeRange; dx <= wakeRange; dx++) {
        for (let dy = -wakeRange; dy <= wakeRange; dy++) {
          const dKey    = `${agx+dx},${agy+dy}`;
          const dormants = dormantGrid.get(dKey);
          if (!dormants) continue;
          for (const dp of dormants) {
            if (!dp.isLatent) continue;
            for (const ap of activeCell) {
              if ((dp.x - ap.x) ** 2 + (dp.y - ap.y) ** 2 < WAKE_RADIUS ** 2) {
                dp.isLatent       = false;
                dp.lastActiveTick = tick;
                let sc = spatialGrid.get(dKey);
                if (!sc) { sc = []; spatialGrid.set(dKey, sc); }
                sc.push(dp);
                const r = this.getRegion(agx+dx, agy+dy);
                r.curvature += dp.weight * 0.1;
                r.density   += 1;
                break;
              }
            }
          }
          dormantGrid.set(dKey, dormants.filter(dp => dp.isLatent));
        }
      }
    }

    // ── 3. Temperature diffusion ───────────────────────────────────
    for (const [key, region] of this.energyGrid) {
      if (region.temperature < 0.001) continue;
      const [gx, gy] = key.split(',').map(Number);
      const diffuse  = region.temperature * TEMP_DIFFUSE;
      for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        this.getRegion(gx+ddx, gy+ddy).temperature += diffuse / 4;
      }
      region.temperature = region.temperature * TEMP_DECAY - diffuse;
    }

    // ── 4. Bekenstein pressure ─────────────────────────────────────
    for (const [key, cell] of spatialGrid) {
      const totalW = cell.reduce((s, p) => s + p.weight, 0);
      if (totalW <= BEKENSTEIN_LIMIT) continue;
      const [gx, gy]  = key.split(',').map(Number);
      const cx        = gx * GRID_SIZE + GRID_SIZE / 2;
      const cy        = gy * GRID_SIZE + GRID_SIZE / 2;
      const overflow  = totalW / BEKENSTEIN_LIMIT;
      const pressure  = (overflow - 1) * PRESSURE_STRENGTH;
      const tf        = 1 / (1 + this.getRegion(gx, gy).curvature * TIME_DILATION_STR);
      cell.sort((a, b) => a.weight - b.weight);
      cell.forEach((p, idx) => {
        if (idx < cell.length / 2) {
          const ddx = p.x - cx, ddy = p.y - cy;
          const d   = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
          p.vx += (ddx/d) * pressure * tf;
          p.vy += (ddy/d) * pressure * tf;
        } else if (overflow > 2.0) {
          p.weight      += 0.05 * overflow * tf;
          p.persistence += 0.02 * tf;
          if (p.persistence > 5 && p.level < 10) { p.level++; p.persistence = 0; }
        }
      });
    }

    // ── 5. Singularity compression ─────────────────────────────────
    if (tick % 100 === 0) {
      for (const [key, r] of this.energyGrid) {
        if (tick - r.lastActiveTick > COMPRESSION_THRESHOLD * 2 && r.energy >= 0.99)
          this.energyGrid.delete(key);
      }
    }

    const deadSet = new Set<string>();
    const newBorn: Particle[] = [];

    for (const [key, region] of this.energyGrid) {
      region.energy = Math.min(1.0, region.energy + ENERGY_REGEN_RATE);
      if (region.isCompressed || tick - region.lastActiveTick <= COMPRESSION_THRESHOLD) continue;
      const [gx, gy] = key.split(',').map(Number);
      const rp       = (spatialGrid.get(key) ?? []).filter(p => !p.isLatent);
      if (rp.length <= 1) continue;

      const totalW  = rp.reduce((s, p) => s + p.weight, 0);
      const totalPx = rp.reduce((s, p) => s + p.vx * p.weight, 0);
      const totalPy = rp.reduce((s, p) => s + p.vy * p.weight, 0);
      const allTraces: LatentTrace[] = [];
      rp.forEach(p => {
        allTraces.push({ weight: p.weight, level: p.level, color: p.color, persistence: p.persistence });
        if (p.latentTraces) allTraces.push(...p.latentTraces);
        deadSet.add(p.id);
      });

      newBorn.push({
        id: `singularity-${key}-${tick}`,
        isCollapsed: true, isLatent: false,
        x: gx*GRID_SIZE + GRID_SIZE/2, y: gy*GRID_SIZE + GRID_SIZE/2,
        vx: totalPx / totalW, vy: totalPy / totalW,
        weight: totalW, level: Math.max(...rp.map(p => p.level)) + 1,
        lastInteractionTick: tick, lastActiveTick: tick,
        persistence: 10, isConscious: true, color: '#ffffff',
        waveRadius: 0, charge: 0, latentTraces: allTraces,
      });
      region.isCompressed = true;
    }

    this.particles = this.particles.filter(p => !deadSet.has(p.id));
    this.particles.push(...newBorn);

    // ── 6. Full physics for active particles ───────────────────────
    const gRange = Math.ceil(GRAVITY_RADIUS / GRID_SIZE);
    const gR2    = GRAVITY_RADIUS ** 2;
    const emR2   = EM_RADIUS ** 2;
    const intR2  = INTERACTION_RADIUS ** 2;

    const toKill  = new Set<string>();
    const toSpawn: Particle[] = [];

    for (const p1 of this.particles) {
      if (toKill.has(p1.id)) continue;

      // ── DORMANT PATH — O(1), only geodesic drift ────────────────
      if (p1.isLatent) {
        const gx = Math.floor(p1.x / GRID_SIZE);
        const gy = Math.floor(p1.y / GRID_SIZE);
        const r  = this.getRegion(gx, gy);
        const tf = 1 / (1 + r.curvature * TIME_DILATION_STR);
        const nc = [
          this.getRegion(gx-1,gy).curvature, this.getRegion(gx+1,gy).curvature,
          this.getRegion(gx,gy-1).curvature, this.getRegion(gx,gy+1).curvature,
        ];
        p1.vx += (nc[1] - nc[0]) * 0.05 * tf;
        p1.vy += (nc[3] - nc[2]) * 0.05 * tf;
        p1.x  += p1.vx * tf * 0.3;
        p1.y  += p1.vy * tf * 0.3;
        p1.vx *= 0.995; p1.vy *= 0.995;
        p1.waveRadius = Math.min(WAVE_INITIAL * 2, p1.waveRadius + WAVE_EXPAND_RATE);
        continue;
      }

      // ── ACTIVE PATH — full physics ───────────────────────────────
      const gx     = Math.floor(p1.x / GRID_SIZE);
      const gy     = Math.floor(p1.y / GRID_SIZE);
      const region = this.getRegion(gx, gy);
      region.lastActiveTick = tick;
      const tf = 1 / (1 + region.curvature * TIME_DILATION_STR);

      // a. Collapsed maintenance cost
      if (p1.isCollapsed) {
        const cost     = 0.005 * Math.pow(2, p1.level - 1) * tf;
        const eff      = 1.0 + (p1.level - 1) * 0.5;
        const fromGrid = Math.min(cost, region.energy);
        region.energy -= fromGrid;
        p1.weight     -= (cost - fromGrid) / eff;

        if (p1.level > 2) region.temperature += HAWKING_RATE * p1.level;

        if (p1.weight < 0.3) {
          // Dissolve — redistribute weight to neighbours, never lost
          const neighbours = this.particles.filter(n =>
            !n.isLatent && n.id !== p1.id &&
            (n.x - p1.x)**2 + (n.y - p1.y)**2 < GRAVITY_RADIUS**2
          ).slice(0, 3);
          neighbours.forEach((n, i) => {
            n.weight += p1.weight / 3;
            if (i === 0 && p1.latentTraces) {
              n.latentTraces = [...(n.latentTraces ?? []), ...p1.latentTraces].slice(-MAX_LATENT_TRACES);
            }
          });
          toKill.add(p1.id);
          continue;
        }
        if (p1.weight < 0.5) { p1.isCollapsed = false; p1.level = Math.max(1, p1.level - 1); }
      }

      // b. Geodesic — follow curvature gradient
      const nc = [
        this.getRegion(gx-1,gy).curvature, this.getRegion(gx+1,gy).curvature,
        this.getRegion(gx,gy-1).curvature, this.getRegion(gx,gy+1).curvature,
      ];
      p1.vx += (nc[1] - nc[0]) * 0.5 * tf;
      p1.vy += (nc[3] - nc[2]) * 0.5 * tf;

      // c. Local expansion — each particle observes only LOCAL density
      //    No global barycenter. No global observer.
      const localDensity  = region.density;
      const targetDensity = 4;
      if (localDensity < targetDensity) {
        const dens = [
          this.getRegion(gx-1,gy).density - this.getRegion(gx+1,gy).density,
          this.getRegion(gx,gy-1).density - this.getRegion(gx,gy+1).density,
        ];
        const expansionStr = LAMBDA_LOCAL * (1 - localDensity / targetDensity);
        p1.vx += dens[0] * expansionStr * tf;
        p1.vy += dens[1] * expansionStr * tf;
      }

      // d. Velocity integration + quantum thermal noise
      const vxPrev = p1.vx, vyPrev = p1.vy;
      const thermalNoise = p1.isCollapsed
        ? 0
        : Math.sqrt(Math.max(0, region.temperature)) * 2.0 + 0.6;
      p1.x += p1.vx * tf + (Math.random() - 0.5) * thermalNoise * tf;
      p1.y += p1.vy * tf + (Math.random() - 0.5) * thermalNoise * tf;
      p1.vx *= p1.isCollapsed ? (1 - 0.02 * tf) : (1 - 0.01 * tf);
      p1.vy *= p1.isCollapsed ? (1 - 0.02 * tf) : (1 - 0.01 * tf);

      // e. Larmor radiation — acceleration → local heat
      const ax = p1.vx - vxPrev, ay = p1.vy - vyPrev;
      region.temperature += LARMOR_COEFF * (ax*ax + ay*ay) * p1.weight;
      region.temperature += TEMP_FROM_KE * (p1.vx*p1.vx + p1.vy*p1.vy);

      // f. Speed of light
      const spd2 = p1.vx*p1.vx + p1.vy*p1.vy;
      if (spd2 > C*C) {
        const spd = Math.sqrt(spd2);
        p1.vx = (p1.vx / spd) * C;
        p1.vy = (p1.vy / spd) * C;
      }

      // g. Gravity + EM + repulsion + fusion (local neighbourhood only)
      for (let dx = -gRange; dx <= gRange; dx++) {
        for (let dy = -gRange; dy <= gRange; dy++) {
          const nb = spatialGrid.get(`${gx+dx},${gy+dy}`);
          if (!nb) continue;

          for (const p2 of nb) {
            if (p2.id === p1.id) continue;             // ← CONTINUE, not return
            if (toKill.has(p2.id)) continue;

            const ddx = p1.x - p2.x;
            const ddy = p1.y - p2.y;
            const d2  = ddx*ddx + ddy*ddy;
            if (d2 === 0) continue;
            const d = Math.sqrt(d2);

            // Gravity
            if (d2 < gR2) {
              const F = (p1.weight * p2.weight * G) / (d2 + 10);
              p1.vx -= (ddx / d) * (F / p1.weight) * tf;
              p1.vy -= (ddy / d) * (F / p1.weight) * tf;
            }

            // Electromagnetism — each charged particle observes charge locally
            if (p1.charge !== 0 && p2.charge !== 0 && d2 < emR2) {
              const sign = p1.charge * p2.charge;       // +1 = repel, -1 = attract
              const F_em = sign * K_EM / (d2 + 4);
              p1.vx += (ddx / d) * (F_em / p1.weight) * tf;
              p1.vy += (ddy / d) * (F_em / p1.weight) * tf;
            }

            if (d2 >= intR2) continue;

            // Short-range repulsion — degeneracy pressure
            if (d < REPULSION_RADIUS) {
              const repF = REPULSION_STRENGTH * (1 - d / REPULSION_RADIUS) / Math.max(d, 0.1);
              p1.vx += (ddx / d) * repF * tf;
              p1.vy += (ddy / d) * repF * tf;
              continue;
            }

            // Observation: wave function collapses when particles observe each other
            if (d < (p1.waveRadius || 0) + (p2.waveRadius || 0)) {
              p1.waveRadius = Math.max(0, p1.waveRadius - WAVE_COLLAPSE_RATE * d);
              p2.waveRadius = Math.max(0, p2.waveRadius - WAVE_COLLAPSE_RATE * d);
            }

            // Wake dormant p2 on close approach
            if (p2.isLatent) { p2.isLatent = false; p2.lastActiveTick = tick; }

            // Fusion with full momentum conservation
            const cellW = (spatialGrid.get(`${gx},${gy}`) ?? []).reduce((s, q) => s + q.weight, 0);
            const hiP   = cellW > BEKENSTEIN_LIMIT;
            if (p1.isCollapsed && p2.isCollapsed &&
               (p1.level > p2.level ||
               (p1.level === p2.level && p1.weight > p2.weight * 1.5) ||
                hiP)) {
              const bonus = hiP ? 1.2 : 0.5;
              const newW  = p1.weight + p2.weight * bonus * tf;
              // Conserve momentum: p_total = m1*v1 + m2*v2
              p1.vx = (p1.vx * p1.weight + p2.vx * p2.weight) / newW;
              p1.vy = (p1.vy * p1.weight + p2.vy * p2.weight) / newW;
              p1.weight  = newW;
              p1.level   = Math.max(p1.level, p2.level + (hiP ? 1 : 0));
              p1.charge  = Math.sign(p1.charge + p2.charge); // charge conservation
              p1.latentTraces = [
                ...(p1.latentTraces ?? []),
                { weight: p2.weight, level: p2.level, color: p2.color, persistence: p2.persistence },
                ...(p2.latentTraces ?? []),
              ].slice(-MAX_LATENT_TRACES);
              region.temperature += 0.05;
              toKill.add(p2.id);
              continue;
            }

            // Collapse on interaction — observation forces definite state
            p1.isCollapsed = true; p2.isCollapsed = true;
            p1.isLatent    = false; p2.isLatent    = false;
            p1.lastInteractionTick = tick; p2.lastInteractionTick = tick;
            p1.lastActiveTick      = tick; p2.lastActiveTick      = tick;
            p1.persistence += 0.01 * tf;  p2.persistence += 0.01 * tf;
            p1.weight      += 0.01 * tf;  p2.weight      += 0.01 * tf;
            region.temperature += 0.01;   // collapse emits heat
          }
        }
      }

      // h. Wave radius — grows in isolation, shrinks on observation
      if (!p1.isCollapsed) {
        const interacted = tick - p1.lastInteractionTick < 5;
        p1.waveRadius = interacted
          ? Math.max(0, p1.waveRadius - WAVE_COLLAPSE_RATE)
          : Math.min(WAVE_INITIAL * 1.5, p1.waveRadius + WAVE_EXPAND_RATE);
      } else {
        p1.waveRadius = 0;
      }

      // i. Dormancy — stop processing when inactive
      if (tick - p1.lastActiveTick > DORMANCY_THRESHOLD) p1.isLatent = true;
    }

    // ── 7. Re-emergence from latent traces ─────────────────────────
    for (const p of this.particles) {
      if (toKill.has(p.id)) continue;
      if (!p.isCollapsed || !p.latentTraces?.length) continue;
      if (p.weight < 10 * p.level) continue;
      const trace = p.latentTraces.pop()!;
      p.weight -= trace.weight * 0.5;
      const a = Math.random() * Math.PI * 2;
      toSpawn.push({
        id: `re-${tick}-${Math.random().toString(36).slice(2)}`,
        isCollapsed: true, isLatent: false,
        x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 8,
        vx: p.vx + Math.cos(a), vy: p.vy + Math.sin(a),
        weight: trace.weight * 0.5, level: trace.level,
        lastInteractionTick: tick, lastActiveTick: tick,
        persistence: trace.persistence, isConscious: false,
        color: trace.color, waveRadius: 0,
        charge: this.makeCharge(), latentTraces: [],
      });
    }

    this.particles = this.particles.filter(p => !toKill.has(p.id));
    this.particles.push(...toSpawn);

    // Population floor — prevent total extinction
    if (this.particles.filter(p => !p.isLatent).length < MIN_POPULATION) {
      const anchor = this.particles.find(p => p.isCollapsed) ?? this.particles[0];
      if (anchor) {
        for (let e = 0; e < 10; e++) {
          const a = (e / 10) * Math.PI * 2, spd = 1 + Math.random();
          this.particles.push({
            id: `rebirth-${tick}-${e}`,
            isCollapsed: false, isLatent: false,
            x: anchor.x + Math.cos(a) * 25, y: anchor.y + Math.sin(a) * 25,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            weight: 0.8, level: 1,
            lastInteractionTick: tick, lastActiveTick: tick,
            persistence: 0, isConscious: false,
            color: anchor.color, waveRadius: WAVE_INITIAL,
            charge: this.makeCharge(), latentTraces: [],
          });
        }
      }
    }

    // ── 8. State summary ───────────────────────────────────────────
    const n = Math.max(1, this.particles.length);
    const collapsed = this.particles.filter(p => p.isCollapsed && !p.isLatent).length;

    this.state.particles          = this.particles;
    this.state.entropy            = 1 - collapsed / n;
    this.state.coherence          = collapsed / n;
    this.state.consciousnessCount = this.particles.filter(p => p.isConscious && !p.isLatent).length;
    this.state.totalInformation   = this.particles.reduce(
      (s, p) => s + p.weight + (p.latentTraces?.reduce((ss, t) => ss + t.weight, 0) ?? 0), 0
    );

    let maxCurv = 0, totalTemp = 0, tempCount = 0;
    this.energyGrid.forEach(r => {
      if (r.curvature > maxCurv) maxCurv = r.curvature;
      if (r.temperature > 0.001) { totalTemp += r.temperature; tempCount++; }
    });
    this.state.maxCurvature   = maxCurv;
    this.state.avgTemperature = tempCount > 0 ? totalTemp / tempCount : 0;

    return this.state;
  }
}
