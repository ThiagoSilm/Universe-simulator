import { Particle, UniverseState, LatentTrace } from './types';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const INITIAL_PARTICLE_COUNT = 1800;
const CLUSTER_COUNT          = 24;
const CLUSTER_RADIUS         = 350;
const UNIVERSE_RADIUS        = 60000;

const GRID_SIZE              = 60;

// Forces
const C                      = 40;       // speed of light
const G                      = 1.2;      // gravitational constant
const K_EM                   = 4.0;      // electromagnetic constant
const REPULSION_STRENGTH     = 10.0;     // degeneracy / Pauli pressure
const STRONG_K               = 90;       // nuclear binding force
const STRONG_RADIUS          = 4.5;      // range of strong nuclear force
const SPIN_ORBIT_K           = 0.8;      // spin-orbit coupling (magnetic-like)
const LAMBDA_LOCAL           = 0.012;    // local expansion constant

// Ranges
const GRAVITY_RADIUS         = 180;
const EM_RADIUS              = 90;
const INTERACTION_RADIUS     = 22;
const REPULSION_RADIUS       = 8;
const WAKE_RADIUS            = 60;

// Relativistic
const TIME_DILATION_STR      = 0.8;

// Quantum
const HBAR_INV               = 0.06;     // de Broglie: waveRadius = WAVE_INITIAL/(1+p*HBAR_INV)
const WAVE_INITIAL           = 20;

// Thermodynamics
const TEMP_DECAY             = 0.97;
const TEMP_DIFFUSE           = 0.08;
const TEMP_FROM_KE           = 0.000006;
const LARMOR_COEFF           = 0.0003;

// Complexity / information
const BEKENSTEIN_LIMIT       = 30;
const PRESSURE_STRENGTH      = 0.5;
const HAWKING_RATE           = 0.0003;
const DORMANCY_THRESHOLD     = 300;
const COMPRESSION_THRESHOLD  = 1200;
const MAX_LATENT_TRACES      = 24;
const MIN_POPULATION         = 50;
const ENERGY_REGEN_RATE      = 0.01;

// Particle events
const FISSION_WEIGHT         = 18;       // minimum weight for spontaneous fission
const FISSION_PROB_BASE      = 0.0005;   // base fission probability per tick
const FISSION_HEAT           = 0.8;      // heat released on fission
const BETA_DECAY_PROB        = 0.00012;  // charge-flip probability per tick (weak force)
const PAIR_TEMP_THRESHOLD    = 2.5;      // min temperature for pair production
const PAIR_ENERGY_COST       = 1.2;      // thermal energy consumed per pair
const PAIR_PROB_PER_REGION   = 0.006;    // probability per hot cell per tick
const ANNIHILATION_RANGE     = 2.2;      // matter + antimatter collision distance
const ANNIHILATION_HEAT      = 22;       // energy released on annihilation

const CHARGE_FRACTION        = 0.38;

// ═══════════════════════════════════════════════════════════════════
//  REGION DATA
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
      // patch legacy particles missing new fields
      this.particles.forEach(p => {
        if (p.waveRadius === undefined) p.waveRadius = p.isCollapsed ? 0 : WAVE_INITIAL;
        if (p.charge     === undefined) p.charge = 0;
        if (p.spin       === undefined) p.spin = Math.random() < 0.5 ? 0.5 : -0.5;
        if (p.isBound    === undefined) p.isBound = false;
      });
      // patch state
      if (this.state.pairProductionCount === undefined) this.state.pairProductionCount = 0;
      if (this.state.annihilationCount   === undefined) this.state.annihilationCount   = 0;
      if (this.state.fissionCount        === undefined) this.state.fissionCount        = 0;
    } else {
      this.particles = this.initParticles();
      this.state = {
        particles: this.particles,
        entropy: 1, coherence: 0, consciousnessCount: 0,
        totalInformation: INITIAL_PARTICLE_COUNT,
        tick: 0, maxCurvature: 0, avgTemperature: 0,
        pairProductionCount: 0, annihilationCount: 0, fissionCount: 0,
        maxLevel: 1, dormantCount: 0, chargedCount: 0, boundCount: 0,
        viewportX: 0, viewportY: 0, zoom: 1,
      };
    }
  }

  public getPersistentState(): PersistentState {
    return { state: this.state, energyGrid: Array.from(this.energyGrid.entries()) };
  }

  public getState(): UniverseState {
    return this.state;
  }

  // ─────────────────────────────────────────────────────────────────
  private makeCharge(): number {
    const r = Math.random();
    if (r < CHARGE_FRACTION / 2) return -1;
    if (r < CHARGE_FRACTION)     return  1;
    return 0;
  }
  private makeSpin(): number { return Math.random() < 0.5 ? 0.5 : -0.5; }

  private newParticle(
    id: string, x: number, y: number, vx: number, vy: number,
    weight: number, charge: number, isCollapsed: boolean,
    color: string, tick: number, extra: Partial<Particle> = {}
  ): Particle {
    return {
      id, isCollapsed, isLatent: false,
      x, y, vx, vy, weight,
      level: 1, lastInteractionTick: tick, lastActiveTick: tick,
      persistence: 0, isConscious: false,
      color, waveRadius: isCollapsed ? 0 : WAVE_INITIAL,
      spin: this.makeSpin(), charge, isBound: false,
      latentTraces: [],
      ...extra,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  private initParticles(): Particle[] {
    const particles: Particle[] = [];
    let id = 0;

    const seeds = Array.from({ length: CLUSTER_COUNT }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * UNIVERSE_RADIUS;
      return {
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        hue: Math.random() * 360,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
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
          id: `p-${id++}`, isCollapsed: false, isLatent: false,
          x: seed.x + Math.cos(a) * r, y: seed.y + Math.sin(a) * r,
          vx: seed.vx + Math.cos(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          vy: seed.vy + Math.sin(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          weight: 0.8 + Math.random() * 0.4, level: 1,
          lastInteractionTick: -DORMANCY_THRESHOLD,
          lastActiveTick: 0, persistence: 0, isConscious: false,
          color: `hsla(${seed.hue + (Math.random() - 0.5) * 40},60%,60%,0.2)`,
          waveRadius: WAVE_INITIAL, spin: this.makeSpin(),
          charge: this.makeCharge(), isBound: false,
        });
      }
    }

    // Void particles — dormant from birth (in quantum superposition, zero cost)
    for (let i = 0; i < voidCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * UNIVERSE_RADIUS;
      particles.push({
        id: `void-${id++}`, isCollapsed: false, isLatent: true,
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        weight: 0.5 + Math.random() * 0.5, level: 1,
        lastInteractionTick: -DORMANCY_THRESHOLD * 10,
        lastActiveTick: -DORMANCY_THRESHOLD,
        persistence: 0, isConscious: false,
        color: `hsla(${Math.random() * 360},30%,40%,0.1)`,
        waveRadius: WAVE_INITIAL, spin: this.makeSpin(),
        charge: this.makeCharge(), isBound: false,
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

  // ═══════════════════════════════════════════════════════════════════
  //  STEP — the universe clock
  //  Philosophy: each particle is its own observer; no global knowledge.
  //  Lazy evaluation is the physics law, not an optimization.
  // ═══════════════════════════════════════════════════════════════════
  public step(): UniverseState {
    const tick = ++this.state.tick;

    // ── 1. BUILD GRIDS — active particles curve spacetime. ─────────
    //    Dormant particles are unobserved: they don't emit a classical
    //    gravitational field. They exist in quantum superposition.
    const spatialGrid = new Map<string, Particle[]>();
    const dormantGrid = new Map<string, Particle[]>();

    this.energyGrid.forEach(r => { r.curvature = 0; r.density = 0; });

    for (const p of this.particles) {
      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (p.isLatent) {
        let c = dormantGrid.get(key); if (!c) { c = []; dormantGrid.set(key, c); } c.push(p);
      } else {
        let c = spatialGrid.get(key); if (!c) { c = []; spatialGrid.set(key, c); } c.push(p);
        const r = this.getRegion(gx, gy);
        r.curvature += p.weight * 0.1;
        r.density   += 1;
      }
    }

    // ── 2. WAKE DORMANT — O(active_cells × wakeRange²) ─────────────
    //    Not O(all particles). Active borders check dormant neighbours.
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
                dp.isLatent = false; dp.lastActiveTick = tick;
                let sc = spatialGrid.get(dKey);
                if (!sc) { sc = []; spatialGrid.set(dKey, sc); } sc.push(dp);
                const r = this.getRegion(agx+dx, agy+dy);
                r.curvature += dp.weight * 0.1; r.density += 1;
                break;
              }
            }
          }
          dormantGrid.set(dKey, dormants.filter(dp => dp.isLatent));
        }
      }
    }

    // ── 3. TEMPERATURE DIFFUSION ────────────────────────────────────
    for (const [key, region] of this.energyGrid) {
      if (region.temperature < 0.001) continue;
      const [gx, gy] = key.split(',').map(Number);
      const diffuse  = region.temperature * TEMP_DIFFUSE;
      for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
        this.getRegion(gx+ddx, gy+ddy).temperature += diffuse / 4;
      }
      region.temperature = region.temperature * TEMP_DECAY - diffuse;
    }

    // ── 4. PAIR PRODUCTION — energy → matter + antimatter ──────────
    //    In hot enough regions, thermal energy spontaneously creates
    //    particle/antiparticle pairs. Energy is conserved.
    let pairCount = 0;
    for (const [key, region] of this.energyGrid) {
      if (region.temperature < PAIR_TEMP_THRESHOLD) continue;
      if (Math.random() > PAIR_PROB_PER_REGION) continue;
      const [gx, gy] = key.split(',').map(Number);
      const cx = gx*GRID_SIZE + GRID_SIZE/2, cy = gy*GRID_SIZE + GRID_SIZE/2;
      const a = Math.random() * Math.PI * 2, spd = 1 + Math.random() * 2;
      const w = Math.max(0.3, region.temperature * 0.08);

      // Particle (charge +1)
      const p1id = `pair+${tick}-${pairCount}`;
      const p2id = `pair-${tick}-${pairCount}`;
      this.particles.push(
        this.newParticle(p1id, cx+Math.cos(a)*3, cy+Math.sin(a)*3,
          Math.cos(a)*spd, Math.sin(a)*spd, w, 1, false,
          'rgba(255,140,60,0.3)', tick)
      );
      // Antiparticle (charge -1, opposite momentum — conservation)
      this.particles.push(
        this.newParticle(p2id, cx-Math.cos(a)*3, cy-Math.sin(a)*3,
          -Math.cos(a)*spd, -Math.sin(a)*spd, w, -1, false,
          'rgba(60,140,255,0.3)', tick)
      );
      region.temperature -= PAIR_ENERGY_COST;
      pairCount++;
    }
    this.state.pairProductionCount += pairCount;

    // ── 5. BEKENSTEIN PRESSURE ──────────────────────────────────────
    for (const [key, cell] of spatialGrid) {
      const totalW = cell.reduce((s, p) => s + p.weight, 0);
      if (totalW <= BEKENSTEIN_LIMIT) continue;
      const [gx, gy] = key.split(',').map(Number);
      const cx       = gx*GRID_SIZE + GRID_SIZE/2, cy = gy*GRID_SIZE + GRID_SIZE/2;
      const overflow = totalW / BEKENSTEIN_LIMIT;
      const pressure = (overflow - 1) * PRESSURE_STRENGTH;
      const tf       = 1 / (1 + this.getRegion(gx, gy).curvature * TIME_DILATION_STR);
      cell.sort((a, b) => a.weight - b.weight);
      cell.forEach((p, idx) => {
        if (idx < cell.length / 2) {
          const ddx = p.x-cx, ddy = p.y-cy;
          const d = Math.sqrt(ddx*ddx+ddy*ddy) || 1;
          p.vx += (ddx/d)*pressure*tf; p.vy += (ddy/d)*pressure*tf;
        } else if (overflow > 2.0) {
          p.weight += 0.05*overflow*tf; p.persistence += 0.02*tf;
          if (p.persistence > 5 && p.level < 10) { p.level++; p.persistence = 0; }
        }
      });
    }

    // ── 6. SINGULARITY COMPRESSION ──────────────────────────────────
    if (tick % 100 === 0) {
      for (const [key, r] of this.energyGrid) {
        if (tick-r.lastActiveTick > COMPRESSION_THRESHOLD*2 && r.energy >= 0.99)
          this.energyGrid.delete(key);
      }
    }

    const deadSet = new Set<string>();
    const newBorn: Particle[] = [];

    for (const [key, region] of this.energyGrid) {
      region.energy = Math.min(1.0, region.energy + ENERGY_REGEN_RATE);
      if (region.isCompressed || tick-region.lastActiveTick <= COMPRESSION_THRESHOLD) continue;
      const [gx, gy] = key.split(',').map(Number);
      const rp = (spatialGrid.get(key) ?? []).filter(p => !p.isLatent);
      if (rp.length <= 1) continue;

      const totalW  = rp.reduce((s, p) => s+p.weight, 0);
      const totalPx = rp.reduce((s, p) => s+p.vx*p.weight, 0);
      const totalPy = rp.reduce((s, p) => s+p.vy*p.weight, 0);
      const allTraces: LatentTrace[] = [];
      rp.forEach(p => {
        allTraces.push({ weight: p.weight, level: p.level, color: p.color, persistence: p.persistence });
        if (p.latentTraces) allTraces.push(...p.latentTraces);
        deadSet.add(p.id);
      });
      newBorn.push({
        id: `singularity-${key}-${tick}`, isCollapsed: true, isLatent: false,
        x: gx*GRID_SIZE+GRID_SIZE/2, y: gy*GRID_SIZE+GRID_SIZE/2,
        vx: totalPx/totalW, vy: totalPy/totalW,
        weight: totalW, level: Math.max(...rp.map(p=>p.level))+1,
        lastInteractionTick: tick, lastActiveTick: tick,
        persistence: 10, isConscious: true, color: '#ffffff',
        waveRadius: 0, spin: 0, charge: 0, isBound: false,
        latentTraces: allTraces,
      });
      region.isCompressed = true;
    }

    this.particles = this.particles.filter(p => !deadSet.has(p.id));
    this.particles.push(...newBorn);

    // ── 7. MAIN PHYSICS LOOP — each particle is its own observer ────
    const gRange     = Math.ceil(GRAVITY_RADIUS / GRID_SIZE);
    const gR2        = GRAVITY_RADIUS ** 2;
    const emR2       = EM_RADIUS ** 2;
    const intR2      = INTERACTION_RADIUS ** 2;
    const strongR2   = STRONG_RADIUS ** 2;
    const annihR2    = ANNIHILATION_RANGE ** 2;

    const toKill    = new Set<string>();
    const toSpawn:  Particle[] = [];
    let annihCount  = 0;
    let fissCount   = 0;

    for (const p1 of this.particles) {
      if (toKill.has(p1.id)) continue;

      // ── DORMANT PATH — O(1); no nested loops ─────────────────────
      //    In quantum superposition: only geodesic drift + wave growth
      if (p1.isLatent) {
        const gx = Math.floor(p1.x/GRID_SIZE), gy = Math.floor(p1.y/GRID_SIZE);
        const r  = this.getRegion(gx, gy);
        const tf = 1 / (1 + r.curvature * TIME_DILATION_STR);
        const nc = [
          this.getRegion(gx-1,gy).curvature, this.getRegion(gx+1,gy).curvature,
          this.getRegion(gx,gy-1).curvature, this.getRegion(gx,gy+1).curvature,
        ];
        p1.vx += (nc[1]-nc[0]) * 0.05 * tf;
        p1.vy += (nc[3]-nc[2]) * 0.05 * tf;
        p1.x  += p1.vx * tf * 0.3;
        p1.y  += p1.vy * tf * 0.3;
        p1.vx *= 0.995; p1.vy *= 0.995;
        // De Broglie: in isolation, wave packet spreads
        const p_mag = Math.sqrt(p1.vx**2+p1.vy**2) * p1.weight;
        p1.waveRadius = Math.min(WAVE_INITIAL*2, WAVE_INITIAL / (1 + p_mag*HBAR_INV));
        continue;
      }

      // ── ACTIVE PATH ──────────────────────────────────────────────
      const gx     = Math.floor(p1.x/GRID_SIZE);
      const gy     = Math.floor(p1.y/GRID_SIZE);
      const region = this.getRegion(gx, gy);
      region.lastActiveTick = tick;
      const tf = 1 / (1 + region.curvature * TIME_DILATION_STR);

      // a. Complexity maintenance cost
      if (p1.isCollapsed) {
        const cost     = 0.005 * Math.pow(2, p1.level-1) * tf;
        const eff      = 1.0 + (p1.level-1) * 0.5;
        const fromGrid = Math.min(cost, region.energy);
        region.energy -= fromGrid;
        p1.weight     -= (cost-fromGrid) / eff;

        // Hawking radiation — heats local region
        if (p1.level > 2) region.temperature += HAWKING_RATE * p1.level;

        if (p1.weight < 0.3) {
          // Dissolution — information redistributed, never lost
          const nearby = this.particles.filter(n =>
            !n.isLatent && n.id !== p1.id &&
            (n.x-p1.x)**2+(n.y-p1.y)**2 < GRAVITY_RADIUS**2
          ).slice(0, 3);
          nearby.forEach((n, i) => {
            n.weight += p1.weight/3;
            if (i === 0 && p1.latentTraces)
              n.latentTraces = [...(n.latentTraces ?? []), ...p1.latentTraces].slice(-MAX_LATENT_TRACES);
          });
          toKill.add(p1.id); continue;
        }
        if (p1.weight < 0.5) { p1.isCollapsed = false; p1.level = Math.max(1, p1.level-1); }
      }

      // b. BETA DECAY — weak force: identity can change
      //    A particle is not forever what it was born as.
      if (p1.charge !== 0 && Math.random() < BETA_DECAY_PROB * tf) {
        p1.charge = -p1.charge;             // charge flips
        p1.spin   = -p1.spin;               // spin flips (angular momentum conservation)
        region.temperature += 0.008;        // W boson → heat
        // Recoil from W boson emission
        const a = Math.random() * Math.PI * 2;
        p1.vx += Math.cos(a) * 0.3 * tf;
        p1.vy += Math.sin(a) * 0.3 * tf;
      }

      // c. FISSION — spontaneous splitting of massive particles
      //    Freedom: heavy particles CHOOSE to split based on local conditions
      const fissionProb = p1.isCollapsed && p1.weight > FISSION_WEIGHT
        ? FISSION_PROB_BASE * (p1.weight / FISSION_WEIGHT) * tf
        : 0;
      if (fissionProb > 0 && Math.random() < fissionProb) {
        const halfW = p1.weight * 0.5;
        const a     = Math.random() * Math.PI * 2;
        const spd   = 1.5 + Math.random() * 2;
        // Recoil (momentum conserved: total stays the same)
        const recoilVx = Math.cos(a) * spd;
        const recoilVy = Math.sin(a) * spd;
        p1.weight = halfW;
        p1.vx    += recoilVx;
        p1.vy    += recoilVy;
        // Daughter particle — opposite momentum, opposite charge for balance
        const daughterCharge = p1.charge !== 0 ? -p1.charge : this.makeCharge();
        toSpawn.push(this.newParticle(
          `fis-${tick}-${Math.random().toString(36).slice(2)}`,
          p1.x + Math.cos(a+Math.PI)*4, p1.y + Math.sin(a+Math.PI)*4,
          p1.vx - recoilVx*2, p1.vy - recoilVy*2,
          halfW, daughterCharge, true, p1.color, tick,
          { level: Math.max(1, p1.level-1), latentTraces: p1.latentTraces?.splice(0, Math.floor((p1.latentTraces?.length ?? 0)/2)) }
        ));
        region.temperature += FISSION_HEAT;
        fissCount++;
      }

      // d. Geodesic — follow spacetime curvature gradient
      const nc = [
        this.getRegion(gx-1,gy).curvature, this.getRegion(gx+1,gy).curvature,
        this.getRegion(gx,gy-1).curvature, this.getRegion(gx,gy+1).curvature,
      ];
      p1.vx += (nc[1]-nc[0]) * 0.5 * tf;
      p1.vy += (nc[3]-nc[2]) * 0.5 * tf;

      // e. Local expansion — each particle observes its LOCAL density only
      //    No global observer. No global barycenter.
      const localDensity  = region.density;
      const targetDensity = 4;
      if (localDensity < targetDensity) {
        const dens = [
          this.getRegion(gx-1,gy).density - this.getRegion(gx+1,gy).density,
          this.getRegion(gx,gy-1).density - this.getRegion(gx,gy+1).density,
        ];
        const str = LAMBDA_LOCAL * (1 - localDensity/targetDensity);
        p1.vx += dens[0] * str * tf;
        p1.vy += dens[1] * str * tf;
      }

      // f. Position integration + thermal Brownian noise
      const vxPrev = p1.vx, vyPrev = p1.vy;
      const thermalNoise = p1.isCollapsed ? 0
        : Math.sqrt(Math.max(0, region.temperature)) * 2.0 + 0.5;
      p1.x += p1.vx*tf + (Math.random()-0.5)*thermalNoise*tf;
      p1.y += p1.vy*tf + (Math.random()-0.5)*thermalNoise*tf;
      // Orbital drag: bound particles lose less energy (stable orbits last longer)
      const drag = p1.isBound ? 0.002 : (p1.isCollapsed ? 0.018 : 0.008);
      p1.vx *= (1 - drag*tf);
      p1.vy *= (1 - drag*tf);

      // g. Larmor radiation — acceleration heats the region
      const ax = p1.vx-vxPrev, ay = p1.vy-vyPrev;
      region.temperature += LARMOR_COEFF * (ax*ax+ay*ay) * p1.weight;
      region.temperature += TEMP_FROM_KE  * (p1.vx*p1.vx+p1.vy*p1.vy);

      // h. Speed of light
      const spd2 = p1.vx*p1.vx+p1.vy*p1.vy;
      if (spd2 > C*C) {
        const spd = Math.sqrt(spd2);
        p1.vx = (p1.vx/spd)*C; p1.vy = (p1.vy/spd)*C;
      }

      // i. De Broglie — wave radius inversely proportional to momentum
      //    Fast / heavy = more particle-like (small waveRadius)
      //    Slow / light = more wave-like (large waveRadius)
      if (!p1.isCollapsed) {
        const p_mag = Math.sqrt(p1.vx**2+p1.vy**2) * p1.weight;
        const dBTarget = WAVE_INITIAL / (1 + p_mag * HBAR_INV);
        p1.waveRadius += (dBTarget - p1.waveRadius) * 0.15;
        p1.waveRadius  = Math.max(0.5, Math.min(WAVE_INITIAL*2, p1.waveRadius));
      } else {
        p1.waveRadius = 0;
      }

      // j. FORCE INTERACTIONS (gravity + EM + nuclear + strong + annihilation)
      p1.isBound = false; // reset each tick; set true if strong bond detected
      for (let dx = -gRange; dx <= gRange; dx++) {
        for (let dy = -gRange; dy <= gRange; dy++) {
          const nb = spatialGrid.get(`${gx+dx},${gy+dy}`);
          if (!nb) continue;

          for (const p2 of nb) {
            if (p2.id === p1.id) continue;
            if (toKill.has(p2.id)) continue;

            const ddx = p1.x-p2.x, ddy = p1.y-p2.y;
            const d2  = ddx*ddx+ddy*ddy;
            if (d2 === 0) continue;
            const d = Math.sqrt(d2);

            // ── GRAVITY ──────────────────────────────────────────────
            if (d2 < gR2) {
              const F = (p1.weight * p2.weight * G) / (d2 + 10);
              p1.vx -= (ddx/d) * (F/p1.weight) * tf;
              p1.vy -= (ddy/d) * (F/p1.weight) * tf;
            }

            // ── ELECTROMAGNETISM ──────────────────────────────────────
            if (p1.charge !== 0 && p2.charge !== 0 && d2 < emR2) {
              const sign = p1.charge * p2.charge;  // +1=repel, -1=attract
              const F_em = sign * K_EM / (d2 + 4);
              p1.vx += (ddx/d) * (F_em/p1.weight) * tf;
              p1.vy += (ddy/d) * (F_em/p1.weight) * tf;

              // ── SPIN-ORBIT COUPLING (magnetic-like force) ───────────
              // Same spin + same charge = extra repulsion (Pauli-like)
              // Opposite spin + opposite charge = extra attraction (bonding)
              if (d2 < emR2 * 0.25) {
                const spinFactor = p1.spin * p2.spin * sign; // +: align, -: anti
                const F_so = SPIN_ORBIT_K * spinFactor / (d + 2);
                p1.vx += (ddx/d) * (F_so/p1.weight) * tf;
                p1.vy += (ddy/d) * (F_so/p1.weight) * tf;
              }
            }

            if (d2 >= intR2) continue;

            // ── ANNIHILATION — matter + antimatter → energy ─────────
            if (d2 < annihR2 &&
                p1.charge + p2.charge === 0 && p1.charge !== 0 &&
                p1.isCollapsed && p2.isCollapsed) {
              // Energy conserved: E = (m1 + m2) * c²
              const E = (p1.weight + p2.weight) * ANNIHILATION_HEAT;
              region.temperature += E;
              // Emit 2 photon-like particles at C in opposite directions
              const pa = Math.random() * Math.PI * 2;
              for (const [pvx, pvy] of [[Math.cos(pa)*C*0.95, Math.sin(pa)*C*0.95], [-Math.cos(pa)*C*0.95, -Math.sin(pa)*C*0.95]]) {
                toSpawn.push(this.newParticle(
                  `ph-${tick}-${Math.random().toString(36).slice(2)}`,
                  (p1.x+p2.x)/2, (p1.y+p2.y)/2, pvx, pvy,
                  0.08, 0, false, 'rgba(255,255,200,0.6)', tick
                ));
              }
              toKill.add(p1.id); toKill.add(p2.id);
              annihCount++;
              break; // p1 is dead
            }
            if (toKill.has(p1.id)) break;

            // ── STRONG NUCLEAR FORCE ─────────────────────────────────
            // At very short range: overwhelms EM repulsion, creates bound states.
            // This is why atoms can exist: protons stay together despite EM repulsion.
            if (d2 < strongR2 && p1.isCollapsed && p2.isCollapsed) {
              // Strong attraction — deeper well than repulsion at this range
              const F_strong = STRONG_K * (1 - d/STRONG_RADIUS);
              p1.vx -= (ddx/d) * (F_strong/p1.weight) * tf;
              p1.vy -= (ddy/d) * (F_strong/p1.weight) * tf;
              p1.isBound = true; p2.isBound = true;
              // Hard core: if overlap < 1.5, add ultra-strong repulsion
              if (d < 1.5) {
                const hcF = STRONG_K * 10 * (1.5-d);
                p1.vx += (ddx/d) * (hcF/p1.weight) * tf;
                p1.vy += (ddy/d) * (hcF/p1.weight) * tf;
              }
              // Binding keeps them active
              p1.lastActiveTick = tick; p2.lastActiveTick = tick;
              p1.lastInteractionTick = tick; p2.lastInteractionTick = tick;
              continue;
            }

            // ── DEGENERACY PRESSURE (Pauli exclusion) ──────────────
            if (d < REPULSION_RADIUS) {
              const repF = REPULSION_STRENGTH * (1-d/REPULSION_RADIUS) / Math.max(d, 0.1);
              p1.vx += (ddx/d) * repF * tf;
              p1.vy += (ddy/d) * repF * tf;
              continue;
            }

            // ── WAVE FUNCTION COLLAPSE ────────────────────────────────
            // Observation causes both particles to commit to a definite state
            if (d < (p1.waveRadius||0) + (p2.waveRadius||0)) {
              p1.waveRadius = Math.max(0, p1.waveRadius - 0.25*d);
              p2.waveRadius = Math.max(0, p2.waveRadius - 0.25*d);
            }

            // Wake dormant partner
            if (p2.isLatent) { p2.isLatent = false; p2.lastActiveTick = tick; }

            // ── FUSION (with momentum conservation) ───────────────────
            const cellW = (spatialGrid.get(`${gx},${gy}`) ?? []).reduce((s,q)=>s+q.weight, 0);
            const hiP   = cellW > BEKENSTEIN_LIMIT;
            if (p1.isCollapsed && p2.isCollapsed &&
               (p1.level > p2.level || (p1.level === p2.level && p1.weight > p2.weight*1.5) || hiP)) {
              const bonus = hiP ? 1.2 : 0.5;
              const newW  = p1.weight + p2.weight*bonus*tf;
              // p_total = m1v1 + m2v2 — momentum never disappears
              p1.vx = (p1.vx*p1.weight + p2.vx*p2.weight) / newW;
              p1.vy = (p1.vy*p1.weight + p2.vy*p2.weight) / newW;
              p1.weight = newW;
              p1.level  = Math.max(p1.level, p2.level+(hiP?1:0));
              p1.charge = Math.sign(p1.charge+p2.charge) as (-1|0|1); // conserved
              p1.spin   = Math.abs(p1.spin+p2.spin) < 0.3 ? 0 : (p1.spin+p2.spin > 0 ? 0.5 : -0.5);
              p1.latentTraces = [
                ...(p1.latentTraces ?? []),
                { weight: p2.weight, level: p2.level, color: p2.color, persistence: p2.persistence },
                ...(p2.latentTraces ?? []),
              ].slice(-MAX_LATENT_TRACES);
              region.temperature += 0.06;
              toKill.add(p2.id);
              continue;
            }

            // ── COLLAPSE ON OBSERVATION ───────────────────────────────
            // Interaction forces both particles into definite state
            p1.isCollapsed = p2.isCollapsed = true;
            p1.isLatent    = p2.isLatent    = false;
            p1.lastInteractionTick = p2.lastInteractionTick = tick;
            p1.lastActiveTick      = p2.lastActiveTick      = tick;
            p1.persistence += 0.01*tf; p2.persistence += 0.01*tf;
            p1.weight      += 0.01*tf; p2.weight      += 0.01*tf;
            region.temperature += 0.012;
          }
          if (toKill.has(p1.id)) break;
        }
        if (toKill.has(p1.id)) break;
      }
      if (toKill.has(p1.id)) continue;

      // k. Dormancy — particle enters superposition when unobserved
      if (tick - p1.lastActiveTick > DORMANCY_THRESHOLD) p1.isLatent = true;
    }

    // ── 8. RE-EMERGENCE FROM LATENT TRACES ─────────────────────────
    for (const p of this.particles) {
      if (toKill.has(p.id)) continue;
      if (!p.isCollapsed || !p.latentTraces?.length) continue;
      if (p.weight < 10*p.level) continue;
      const trace = p.latentTraces.pop()!;
      p.weight -= trace.weight * 0.5;
      const a = Math.random() * Math.PI * 2;
      toSpawn.push(this.newParticle(
        `re-${tick}-${Math.random().toString(36).slice(2)}`,
        p.x+Math.cos(a)*8, p.y+Math.sin(a)*8,
        p.vx+Math.cos(a), p.vy+Math.sin(a),
        trace.weight*0.5, this.makeCharge(), true, trace.color, tick,
        { level: trace.level, persistence: trace.persistence }
      ));
    }

    this.particles = this.particles.filter(p => !toKill.has(p.id));
    this.particles.push(...toSpawn);

    // ── 9. POPULATION FLOOR ─────────────────────────────────────────
    if (this.particles.filter(p => !p.isLatent).length < MIN_POPULATION) {
      const anchor = this.particles.find(p => p.isCollapsed) ?? this.particles[0];
      if (anchor) {
        for (let e = 0; e < 10; e++) {
          const a = (e/10)*Math.PI*2, spd = 1+Math.random();
          this.particles.push(this.newParticle(
            `rb-${tick}-${e}`,
            anchor.x+Math.cos(a)*30, anchor.y+Math.sin(a)*30,
            Math.cos(a)*spd, Math.sin(a)*spd,
            0.8, this.makeCharge(), false, anchor.color, tick
          ));
        }
      }
    }

    // ── 10. STATE SUMMARY ────────────────────────────────────────────
    const n         = Math.max(1, this.particles.length);
    const collapsed = this.particles.filter(p => p.isCollapsed && !p.isLatent).length;

    this.state.particles          = this.particles;
    this.state.entropy            = 1 - collapsed/n;
    this.state.coherence          = collapsed/n;
    this.state.consciousnessCount = this.particles.filter(p => p.isConscious && !p.isLatent).length;
    this.state.totalInformation   = this.particles.reduce(
      (s, p) => s + p.weight + (p.latentTraces?.reduce((ss,t)=>ss+t.weight, 0) ?? 0), 0
    );
    this.state.annihilationCount += annihCount;
    this.state.fissionCount      += fissCount;

    // Calculate metrics
    this.state.maxLevel = Math.max(1, ...this.particles.map(p => p.level));
    this.state.dormantCount = this.particles.filter(p => p.isLatent).length;
    this.state.chargedCount = this.particles.filter(p => p.charge !== 0).length;
    this.state.boundCount = this.particles.filter(p => p.isBound && !p.isLatent).length;

    let maxCurv = 0, totalTemp = 0, tempCount = 0;
    this.energyGrid.forEach(r => {
      if (r.curvature > maxCurv) maxCurv = r.curvature;
      if (r.temperature > 0.001) { totalTemp += r.temperature; tempCount++; }
    });
    this.state.maxCurvature   = maxCurv;
    this.state.avgTemperature = tempCount > 0 ? totalTemp/tempCount : 0;

    return this.state;
  }
}
