import { Particle, UniverseState, LatentTrace, Molecule, CycleHistory } from './types';
import { VariavelInfinita } from './VariavelInfinita';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const INITIAL_PARTICLE_COUNT = 1800;
const CLUSTER_COUNT          = 24;
const CLUSTER_RADIUS         = 350;
const UNIVERSE_RADIUS        = 60000;

export const GRID_SIZE              = 60;

// Forces
const C                      = 40;       // speed of light
const G                      = 1.2;      // gravitational constant
const K_EM                   = 4.0;      // electromagnetic constant
const REPULSION_STRENGTH     = 10.0;     // degeneracy / Pauli pressure
const STRONG_K               = 90;       // nuclear binding force
const STRONG_RADIUS          = 4.5;      // range of strong nuclear force
const SPIN_ORBIT_K           = 0.8;      // spin-orbit coupling (magnetic-like)
const DARK_ENERGY_LAMBDA     = 0.015;    // cosmological constant (expansion)
const DARK_MATTER_FRACTION   = 0.25;     // 25% of universe is dark matter

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

// Chemistry
const EM_FORCE_K = 4.0;
const BINDING_TEMP_THRESHOLD = 0.5;
const MOLECULE_BINDING_ENERGY = 0.2;

// Organic Chemistry
const CARBON_AFFINITY = 0.8;
const HYDROGEN_AFFINITY = 0.5;
const OXYGEN_AFFINITY = 0.7;
const NITROGEN_AFFINITY = 0.6;

// Replication
const REPLICATION_PROB = 0.001;
const REPLICATION_ENERGY_COST = 0.5;
const MUTATION_PROB = 0.05;

// Metabolism
const METABOLISM_ENERGY_COST = 0.01;
const ENERGY_GRADIENT_SENSE = 0.1;

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
//  PERIODIC TABLE
// ═══════════════════════════════════════════════════════════════════

const TABELA_PERIODICA: Record<number, { simbolo: string; nome: string; affinity: number }> = {
  1: { simbolo: 'H', nome: 'Hidrogênio', affinity: 0.5 },
  2: { simbolo: 'He', nome: 'Hélio', affinity: 0.1 },
  6: { simbolo: 'C', nome: 'Carbono', affinity: 0.8 },
  7: { simbolo: 'N', nome: 'Nitrogênio', affinity: 0.6 },
  8: { simbolo: 'O', nome: 'Oxigênio', affinity: 0.7 },
  15: { simbolo: 'P', nome: 'Fósforo', affinity: 0.65 },
  16: { simbolo: 'S', nome: 'Enxofre', affinity: 0.6 },
};

// ═══════════════════════════════════════════════════════════════════
//  REGION DATA
// ═══════════════════════════════════════════════════════════════════

export class Regiao {
  public seed: number;
  public coordenadas: { x: number; y: number };
  public cache: RegionData | null = null;
  public lastActiveTick: number = 0;
  public isCompressed: boolean = false;

  constructor(seed: number, x: number, y: number) {
    this.seed = seed;
    this.coordenadas = { x, y };
  }

  public observar(tick: number): RegionData {
    if (!this.cache) {
      this.cache = this.reconstruir(this.seed, tick);
    }
    this.lastActiveTick = tick;
    this.cache.lastActiveTick = tick;
    return this.cache;
  }

  get temperature() { return this.cache?.temperature || 0; }
  set temperature(v: number) { if (this.cache) this.cache.temperature = v; }
  get energy() { return this.cache?.energy || 0; }
  set energy(v: number) { if (this.cache) this.cache.energy = v; }
  get curvature() { return this.cache?.curvature || 0; }
  set curvature(v: number) { if (this.cache) this.cache.curvature = v; }
  get density() { return this.cache?.density || 0; }
  set density(v: number) { if (this.cache) this.cache.density = v; }

  private reconstruir(seed: number, tick: number): RegionData {
    // Função determinística baseada na posição, tempo e seed
    const hash = (this.coordenadas.x * 374761393 + this.coordenadas.y * 668265263 + seed) ^ (tick * 12741261);
    const pseudoRandom = (Math.sin(hash) + 1) / 2;
    
    return {
      energy: 0.5 + pseudoRandom * 0.5,
      lastActiveTick: tick,
      isCompressed: false,
      curvature: pseudoRandom * 0.1,
      temperature: pseudoRandom * 0.2,
      density: 0
    };
  }

  public esquecer() {
    this.cache = null;
  }
}

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
  energyGrid: [string, { seed: number, x: number, y: number }][];
  molecules:  [string, Molecule][];
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE
// ═══════════════════════════════════════════════════════════════════

export class UniverseEngine {
  public state:      UniverseState;
  private energyGrid: Map<string, Regiao> = new Map();
  private molecules:  Map<string, Molecule>   = new Map();
  public  particles:  Particle[];
  public get energyGridMap() { return this.energyGrid; }
  public get moleculesMap() { return this.molecules; }

  // Lazy metrics
  public temperature: VariavelInfinita;
  public curvature: VariavelInfinita;
  public particleCount: VariavelInfinita;

  constructor(savedState?: PersistentState) {
    if (savedState) {
      console.log('UniverseEngine: restoring state');
      this.state      = savedState.state;
      this.particles  = this.state.particles;
      this.energyGrid = new Map(savedState.energyGrid.map(([key, data]) => [key, new Regiao(data.seed, data.x, data.y)]));
      this.molecules  = new Map(savedState.molecules);
      // patch legacy particles missing new fields
      this.particles.forEach(p => {
        if (p.waveRadius === undefined) p.waveRadius = p.isCollapsed ? 0 : WAVE_INITIAL;
        if (p.charge     === undefined) p.charge = 0;
        if (p.spin       === undefined) p.spin = Math.random() < 0.5 ? 0.5 : -0.5;
        if (p.isBound    === undefined) p.isBound = false;
        if (p.isDarkMatter === undefined) p.isDarkMatter = Math.random() < DARK_MATTER_FRACTION;
        if (p.entangledWith === undefined) p.entangledWith = null;
        if (p.energy === undefined) p.energy = 1.0;
        if (p.isMetabolizing === undefined) p.isMetabolizing = false;
        if (p.isReplicating === undefined) p.isReplicating = false;
        if (p.generation === undefined) p.generation = 0;
        if (p.mentalModels === undefined) p.mentalModels = {};
        if (p.isCollectiveConscious === undefined) p.isCollectiveConscious = false;
        if (p.knowledge === undefined) p.knowledge = 0;
        if (p.tools === undefined) p.tools = 0;
      });
      // patch state
      if (this.state.pairProductionCount === undefined) this.state.pairProductionCount = 0;
      if (this.state.annihilationCount   === undefined) this.state.annihilationCount   = 0;
      if (this.state.fissionCount        === undefined) this.state.fissionCount        = 0;
      if (this.state.moleculeCount       === undefined) this.state.moleculeCount       = 0;
      if (this.state.organicCount        === undefined) this.state.organicCount        = 0;
      if (this.state.replicantCount      === undefined) this.state.replicantCount      = 0;
      if (this.state.maxGeneration       === undefined) this.state.maxGeneration       = 0;
      if (this.state.lifeCount           === undefined) this.state.lifeCount           = 0;
      if (this.state.culture             === undefined || isNaN(this.state.culture)) this.state.culture             = 0;
      if (this.state.relationsCount      === undefined || isNaN(this.state.relationsCount)) this.state.relationsCount      = 0;
      if (this.state.collectiveConsciousnessNodes === undefined || isNaN(this.state.collectiveConsciousnessNodes)) this.state.collectiveConsciousnessNodes = 0;
      if (this.state.recycledMatterCount === undefined || isNaN(this.state.recycledMatterCount)) this.state.recycledMatterCount = 0;
      if (this.state.latentTraceCount    === undefined || isNaN(this.state.latentTraceCount)) this.state.latentTraceCount    = 0;
      if (this.state.fertility           === undefined || isNaN(this.state.fertility)) this.state.fertility           = 0;
      if (this.state.currentCycle        === undefined) this.state.currentCycle = 1;
      if (this.state.history             === undefined) this.state.history = [];
      if (this.state.isSpectatorMode     === undefined) this.state.isSpectatorMode = false;
      if (this.state.lastNodes           === undefined) this.state.lastNodes = 0;
      if (this.state.lastRelations       === undefined) this.state.lastRelations = 0;
      if (this.state.significantEvents   === undefined) this.state.significantEvents = [];
      if (this.state.technology          === undefined || isNaN(this.state.technology)) this.state.technology = 0;
      if (this.state.metaConsciousness   === undefined) this.state.metaConsciousness = false;
      if (this.state.extinctionCycles    === undefined || isNaN(this.state.extinctionCycles)) this.state.extinctionCycles = 0;
      if (this.state.avgPhase           === undefined) this.state.avgPhase = 0;
      if (this.state.interferenceCount  === undefined) this.state.interferenceCount = 0;
      if (this.state.contextualityRate  === undefined) this.state.contextualityRate = 0;
      if (this.state.entangledPairsCount === undefined) this.state.entangledPairsCount = 0;
      if (this.state.activeGridKeys === undefined) this.state.activeGridKeys = [];
    } else {
      this.particles = this.initParticles();
      this.state = {
        particles: this.particles,
        entropy: 1, coherence: 0, consciousnessCount: 0,
        totalInformation: INITIAL_PARTICLE_COUNT,
        tick: 0, maxCurvature: 0, avgTemperature: 0,
        pairProductionCount: 0, annihilationCount: 0, fissionCount: 0,
        moleculeCount: 0, organicCount: 0, replicantCount: 0, maxGeneration: 0, lifeCount: 0,
        recycledMatterCount: 0, latentTraceCount: 0, fertility: 0,
        relationsCount: 0, collectiveConsciousnessNodes: 0, culture: 0,
        technology: 0, metaConsciousness: false, extinctionCycles: 0,
        currentCycle: 1, history: [], isSpectatorMode: false,
        lastNodes: 0, lastRelations: 0, significantEvents: [],
        campoLatente: [], events: [],
        viewportX: 0, viewportY: 0, zoom: 1,
        activeGridKeys: [],
        avgPhase: 0, interferenceCount: 0, contextualityRate: 0, entangledPairsCount: 0,
      };
    }
    this.temperature = new VariavelInfinita(() => this.state.avgTemperature);
    this.curvature = new VariavelInfinita(() => this.state.maxCurvature);
    this.particleCount = new VariavelInfinita(() => this.particles.length);
  }

  public getPersistentState(): PersistentState {
    return { 
      state: this.state, 
      energyGrid: Array.from(this.energyGrid.entries()).map(([key, reg]) => [key, { seed: reg.seed, x: reg.coordenadas.x, y: reg.coordenadas.y }]),
      molecules: Array.from(this.molecules.entries())
    };
  }

  public addSignificantEvent(x: number, y: number, type: string, tick: number) {
    this.state.significantEvents.push({ x, y, type, tick });
    if (this.state.significantEvents.length > 50) this.state.significantEvents.shift();
  }

  public resetUniverse() {
    // Save history
    const historyEntry: CycleHistory = {
      cycleId: this.state.currentCycle,
      totalTicks: this.state.tick,
      maxCulture: this.state.culture,
      maxNodes: this.state.collectiveConsciousnessNodes,
      maxRelations: this.state.relationsCount,
      milestones: this.state.events.map(e => ({ tick: this.state.tick, event: e })).slice(-10) // last 10 events as milestones
    };
    this.state.history.push(historyEntry);
    if (this.state.history.length > 10) this.state.history.shift();
    
    // Reset state but keep history and currentCycle
    const nextCycle = this.state.currentCycle + 1;
    const history = this.state.history;
    const isSpectatorMode = this.state.isSpectatorMode;
    const campoLatente = this.state.campoLatente;
    const latentTraceCount = this.state.latentTraceCount;
    
    this.particles = this.initParticles();
    this.state = {
      particles: this.particles,
      entropy: 1, coherence: 0, consciousnessCount: 0,
      totalInformation: INITIAL_PARTICLE_COUNT,
      tick: 0, maxCurvature: 0, avgTemperature: 0,
      pairProductionCount: 0, annihilationCount: 0, fissionCount: 0,
      moleculeCount: 0, organicCount: 0, replicantCount: 0, maxGeneration: 0, lifeCount: 0,
      recycledMatterCount: 0, latentTraceCount: latentTraceCount, fertility: 0,
      relationsCount: 0, collectiveConsciousnessNodes: 0, culture: 0,
      technology: 0, metaConsciousness: false, extinctionCycles: this.state.extinctionCycles,
      currentCycle: nextCycle, history: history, isSpectatorMode: isSpectatorMode,
      lastNodes: 0, lastRelations: 0, significantEvents: [],
      campoLatente: campoLatente, events: [`Ciclo #${nextCycle} iniciado`],
      viewportX: 0, viewportY: 0, zoom: 1,
      activeGridKeys: [],
      avgPhase: 0, interferenceCount: 0, contextualityRate: 0, entangledPairsCount: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  private makeCharge(): number {
    const r = Math.random();
    if (r < CHARGE_FRACTION / 2) return -1;
    if (r < CHARGE_FRACTION)     return  1;
    return 0;
  }
  private makeSpin(): number { return Math.random() < 0.5 ? 0.5 : -0.5; }

  // ── QUANTUM REFINEMENT ───────────────────────────────────────────
  private interactQuantum(p1: Particle, p2: Particle, tick: number) {
    // 1. Coherence and Interference
    // If latent, collapse state on interaction
    if (p1.isLatent) { p1.isLatent = false; p1.lastActiveTick = tick; }
    if (p2.isLatent) { p2.isLatent = false; p2.lastActiveTick = tick; }

    // Interference logic
    const phaseDiff = p1.phase - p2.phase;
    const resultantAmplitude = Math.sqrt(
      p1.amplitude ** 2 + p2.amplitude ** 2 +
      2 * p1.amplitude * p2.amplitude * Math.cos(phaseDiff)
    );

    // Update amplitudes (energy redistribution)
    const newAmp = resultantAmplitude / 2;
    p1.amplitude = newAmp;
    p2.amplitude = newAmp;

    // Record interaction for epistemological description
    p1.lastInteractionType = 'interference';
    p2.lastInteractionType = 'interference';
    this.state.interferenceCount++;

    // 2. Contextuality and Non-locality (Entanglement)
    if (p1.entangledWith === p2.id || Math.random() < 0.001) {
      if (!p1.entangledWith) {
        p1.entangledWith = p2.id;
        p2.entangledWith = p1.id;
      }

      // Non-local correlation: measuring (interacting with) one affects the other
      // Contextual bias affects the outcome
      const context = p1.contextualBias > 0.5 ? 1 : -1;
      p2.spin = p1.spin * context;
      p2.phase = p1.phase + Math.PI * (p1.contextualBias > 0.5 ? 1 : 0);
      
      p1.lastInteractionType = 'entanglement';
      p2.lastInteractionType = 'entanglement';
    }
  }

  public static describeEvent(p: Particle, tick: number): { funcaoOnda: string, matrizDensidade: string, lazyEvaluation: string } {
    return {
      funcaoOnda: `ψ = ${p.amplitude.toFixed(3)} * e^(i${p.phase.toFixed(3)})`,
      matrizDensidade: `ρ = |${(p.amplitude ** 2).toFixed(3)}| (Contexto: ${p.contextualBias.toFixed(2)})`,
      lazyEvaluation: `Estado ${p.isLatent ? 'latente' : 'colapsado'} (Peso: ${p.weight.toFixed(2)})`
    };
  }

  private newParticle(
    id: string, x: number, y: number, vx: number, vy: number,
    weight: number, charge: number, isCollapsed: boolean,
    color: string, tick: number, extra: Partial<Particle> = {}
  ): Particle {
    let element: 'C' | 'H' | 'O' | 'N' = 'H';
    if (charge > 0) element = 'C';
    else if (charge < 0) element = 'O';
    else if (weight > 1.5) element = 'N';

    return {
      id, isCollapsed, isLatent: false,
      x, y, vx, vy, weight,
      level: 1, lastInteractionTick: tick, lastActiveTick: tick,
      persistence: 0, isConscious: false,
      color, waveRadius: isCollapsed ? 0 : WAVE_INITIAL,
      spin: this.makeSpin(), charge, isBound: false,
      latentTraces: [],
      isDarkMatter: Math.random() < DARK_MATTER_FRACTION,
      entangledWith: null,
      // New properties
      moleculeId: null,
      element,
      energy: 1.0,
      isMetabolizing: false,
      isReplicating: false,
      generation: 0,
      mentalModels: {},
      isCollectiveConscious: false,
      knowledge: 0,
      tools: 0,
      age: 0,
      amplitude: Math.random(),
      phase: Math.random() * 2 * Math.PI,
      contextualBias: Math.random(),
      ...extra,
    };
  }

  private processExtinctions(tick: number) {
    const activeParticles = this.particles.filter(p => !p.isLatent);
    if (activeParticles.length === 0) return;

    const avgEnergy = activeParticles.reduce((sum, p) => sum + p.weight * (p.vx * p.vx + p.vy * p.vy), 0) / activeParticles.length;
    const isScarce = avgEnergy < 0.05; // Low kinetic energy means cold/dead universe
    const isConflict = this.state.collectiveConsciousnessNodes > 200;

    if ((isScarce || isConflict) && Math.random() < 0.05) {
      this.state.extinctionCycles++;
      this.state.events.push(`CICLO DE EXTINÇÃO INICIADO (#${this.state.extinctionCycles})`);
      this.addSignificantEvent(0, 0, 'EXTINCTION', tick);

      // Kill 80% of active particles
      for (const p of activeParticles) {
        if (Math.random() < 0.8) {
          this.morrer(p);
        }
      }
      this.state.fertility += 10;
    }
  }

  private processChemistry(tick: number, spatialGrid: Map<string, Particle[]>) {
    for (const p1 of this.particles) {
      if (p1.isLatent || p1.isBound) continue;
      const gx = Math.floor(p1.x / GRID_SIZE);
      const gy = Math.floor(p1.y / GRID_SIZE);
      const region = this.getRegion(gx, gy);
      
      let bound = false;
      for (let dx = -1; dx <= 1 && !bound; dx++) {
        for (let dy = -1; dy <= 1 && !bound; dy++) {
          const neighbors = spatialGrid.get(`${gx + dx},${gy + dy}`);
          if (!neighbors) continue;
          
          for (const p2 of neighbors) {
            if (p1.id === p2.id || p2.isLatent || p2.isBound) continue;
            const d2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
            
            // ── FORÇA FORTE (Emergente) ───────────────────────────────
            // Emerge quando partículas estão muito próximas e em baixa temperatura
            if (d2 < STRONG_RADIUS * STRONG_RADIUS && region.temperature < BINDING_TEMP_THRESHOLD) {
              const molId = `atom-${tick}-${p1.id}-${p2.id}`;
              const particlesInAtom = [p1, p2];
              
              // Identifica componentes
              const protons = particlesInAtom.filter(p => p.charge > 0).length;
              const neutrons = particlesInAtom.filter(p => p.charge === 0).length;
              const electrons = particlesInAtom.filter(p => p.charge < 0).length;
              
              const element = TABELA_PERIODICA[protons] || { simbolo: 'Uu', nome: 'Desconhecido', affinity: 0.1 };
              
              const isStable = protons > 0 ? (neutrons / protons >= 0.8 && neutrons / protons <= 1.5) : true;

              if (isStable) {
                p1.isBound = true; p2.isBound = true;
                p1.moleculeId = molId; p2.moleculeId = molId;
                
                if (this.molecules.size === 0) {
                    this.state.events.push("Primeiro átomo estável formado!");
                    this.addSignificantEvent(p1.x, p1.y, 'CHEMISTRY', tick);
                }

                this.molecules.set(molId, {
                  id: molId,
                  particleIds: [p1.id, p2.id],
                  protons,
                  neutrons,
                  electrons,
                  symbol: element.simbolo,
                  name: element.nome,
                  energy: 1.0,
                  isOrganic: element.simbolo === 'C' || element.simbolo === 'H' || element.simbolo === 'O' || element.simbolo === 'N',
                  isReplicating: false,
                  generation: 0,
                  isStable: true
                });
                bound = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  private processReplication(tick: number) {
    const newMolecules = new Map<string, Molecule>();
    const newParticles: Particle[] = [];
    const particleMap = new Map<string, Particle>();
    for (const p of this.particles) {
      particleMap.set(p.id, p);
    }

    for (const [molId, molecule] of this.molecules) {
      const prob = molecule.isOrganic ? REPLICATION_PROB * 5 : REPLICATION_PROB;
      if (molecule.energy > REPLICATION_ENERGY_COST && Math.random() < prob) {
        molecule.energy -= REPLICATION_ENERGY_COST;
        molecule.isReplicating = true;
        molecule.generation++;

        const p1 = particleMap.get(molecule.particleIds[0]);
        const p2 = particleMap.get(molecule.particleIds[1]);
        
        if (p1 && p2) {
            const newP1 = this.newParticle(
                `rep-${tick}-${p1.id}`,
                p1.x + Math.random() * 10 - 5, p1.y + Math.random() * 10 - 5,
                p1.vx, p1.vy,
                p1.weight, p1.charge, p1.isCollapsed, p1.color, tick
            );
            const newP2 = this.newParticle(
                `rep-${tick}-${p2.id}`,
                p2.x + Math.random() * 10 - 5, p2.y + Math.random() * 10 - 5,
                p2.vx, p2.vy,
                p2.weight, p2.charge, p2.isCollapsed, p2.color, tick
            );
            
            newP1.isBound = true; newP2.isBound = true;
            const newMolId = `mol-${tick}-${newP1.id}-${newP2.id}`;
            newP1.moleculeId = newMolId; newP2.moleculeId = newMolId;
            
            newParticles.push(newP1, newP2);
            newMolecules.set(newMolId, {
                id: newMolId,
                particleIds: [newP1.id, newP2.id],
                protons: molecule.protons,
                neutrons: molecule.neutrons,
                electrons: molecule.electrons,
                symbol: molecule.symbol,
                name: molecule.name,
                energy: molecule.energy,
                isOrganic: molecule.isOrganic,
                isReplicating: false,
                generation: molecule.generation,
                isStable: molecule.isStable
            });
            
            if (molecule.generation === 1 && this.state.events.filter(e => e.includes("replicação")).length === 0) {
                this.state.events.push("Primeira replicação molecular!");
                this.addSignificantEvent(p1.x, p1.y, 'BIOLOGY', tick);
            }
        }
      }
    }
    
    if (newParticles.length > 0) {
        this.particles.push(...newParticles);
        for (const [id, mol] of newMolecules) {
            this.molecules.set(id, mol);
        }
    }
  }

  private processMetabolism(tick: number) {
    const particleMap = new Map<string, Particle>();
    for (const p of this.particles) {
      particleMap.set(p.id, p);
    }

    for (const [molId, mol] of this.molecules) {
      const p1 = particleMap.get(mol.particleIds[0]);
      const p2 = particleMap.get(mol.particleIds[1]);
      
      if (!p1 || !p2) {
        this.molecules.delete(molId);
        if (p1) { p1.isBound = false; p1.moleculeId = null; }
        if (p2) { p2.isBound = false; p2.moleculeId = null; }
        continue;
      }

      const gx = Math.floor(p1.x / GRID_SIZE);
      const gy = Math.floor(p1.y / GRID_SIZE);
      const region = this.getRegion(gx, gy);
      
      // Absorb energy from environment (temperature/curvature)
      if (region.temperature > 0.05) {
        const absorbed = Math.min(0.05, region.temperature);
        mol.energy += absorbed;
        region.temperature -= absorbed;
      }
      if (region.curvature > 0.5) {
        mol.energy += 0.02;
      }

      mol.energy -= METABOLISM_ENERGY_COST;
      
      p1.isMetabolizing = mol.energy > 0;
      p2.isMetabolizing = mol.energy > 0;
      
      if (mol.energy <= 0) {
        // Dissolve molecule
        this.molecules.delete(mol.id);
        p1.moleculeId = null;
        p1.isBound = false;
        p2.moleculeId = null;
        p2.isBound = false;
      }
    }
  }

  public morrer(entidade: Particle) {
    const gx = Math.floor(entidade.x / GRID_SIZE);
    const gy = Math.floor(entidade.y / GRID_SIZE);
    const region = this.getRegion(gx, gy);
    
    // Libera energia (aumenta temperatura)
    region.temperature += entidade.energy * 0.7;
    
    // Guarda informação como atrator fractal (seed + metadados)
    const attractorSeed = Math.abs((entidade.knowledge * 1000 + entidade.tools * 100 + entidade.level) % 1000000);
    
    this.state.campoLatente.push({
        x: entidade.x,
        y: entidade.y,
        data: { 
          seed: attractorSeed,
          id: entidade.id, 
          knowledge: entidade.knowledge, 
          tools: entidade.tools, 
          tracesCount: entidade.latentTraces?.length || 0 
        },
        intensity: entidade.level
    });
    
    // Limit Cosmic Memory size
    if (this.state.campoLatente.length > 500) {
        this.state.campoLatente.shift();
    }
    
    // Torna a entidade latente em vez de remover
    entidade.isLatent = true;
    entidade.knowledge = 0;
    entidade.tools = 0;
    entidade.energy = 0.1;
    entidade.isCollectiveConscious = false;
    entidade.mentalModels = {};
    
    this.state.recycledMatterCount++;
    this.state.latentTraceCount++;
  }

  private criarParticulaDormente(posicao: { x: number, y: number }) {
    const p = this.newParticle(
        `dormant-${this.state.tick}-${Math.random().toString(36).slice(2)}`,
        posicao.x + (Math.random()-0.5)*10, posicao.y + (Math.random()-0.5)*10,
        (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1,
        0.1, 0, true, '#444444', this.state.tick
    );
    this.particles.push(p);
  }

  private processCollectiveConsciousness(tick: number, spatialGrid: Map<string, Particle[]>) {
    // 1. Observation and Mental Models
    for (const p of this.particles) {
        if (p.isLatent) continue;
        
        const gx = Math.floor(p.x / GRID_SIZE);
        const gy = Math.floor(p.y / GRID_SIZE);
        
        // Observe neighbors in grid
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const neighbors = spatialGrid.get(`${gx + dx},${gy + dy}`);
                if (!neighbors) continue;
                
                for (const other of neighbors) {
                    if (p.id === other.id) continue;
                    
                    const d2 = (p.x - other.x) ** 2 + (p.y - other.y) ** 2;
                    if (d2 < 10000) { // observation range
                        p.mentalModels[other.id] = { state: { x: other.x, y: other.y, energy: other.energy }, lastObserved: tick };
                    }
                }
            }
        }
    }
    
    // 2. Second-order Consciousness and Collective Consciousness
    let nodes = 0;
    let relations = 0;
    let totalKnowledge = 0;
    
    const particleMap = new Map<string, Particle>();
    for (const p of this.particles) {
        if (!p.isLatent) particleMap.set(p.id, p);
    }

    for (const p of this.particles) {
        if (p.isLatent) continue;
        
        let mutualModels = 0;
        for (const id in p.mentalModels) {
            const other = particleMap.get(id);
            if (other && other.mentalModels[p.id]) {
                mutualModels++;
                // Transmissible Culture: exchange knowledge
                const diff = other.knowledge - p.knowledge;
                if (diff > 0) {
                    p.knowledge += diff * 0.05; // learn from other
                }
            }
        }
        relations += mutualModels;
        
        if (mutualModels >= 2) {
            if (!p.isCollectiveConscious) {
                p.isCollectiveConscious = true;
                this.state.events.push(`Consciência coletiva emergida: ${p.id}`);
                this.addSignificantEvent(p.x, p.y, 'EMERGENCE', tick);
            }
            nodes++;
            p.knowledge += 0.01; // generate knowledge
            
            // Emergent Technology
            if (this.state.culture > 0.5 && Math.random() < 0.01) {
                p.tools++;
                this.state.technology++;
                if (Math.random() < 0.05) {
                    this.state.events.push(`Ferramenta criada por ${p.id.slice(0,4)}`);
                    this.addSignificantEvent(p.x, p.y, 'TECH', tick);
                }
            }
        } else {
            p.isCollectiveConscious = false;
        }
        totalKnowledge += p.knowledge;
    }
    this.state.collectiveConsciousnessNodes = nodes;
    this.state.relationsCount = relations / 2; // Each relation counted twice
    const activeCount = this.particles.filter(p => !p.isLatent).length || 1;
    this.state.culture = totalKnowledge / activeCount;
    
    // First Contact detection
    const collectiveNodes = this.particles.filter(p => p.isCollectiveConscious);
    for (const p1 of collectiveNodes) {
        const gx = Math.floor(p1.x / GRID_SIZE);
        const gy = Math.floor(p1.y / GRID_SIZE);
        
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const neighbors = spatialGrid.get(`${gx + dx},${gy + dy}`);
                if (!neighbors) continue;
                
                for (const p2 of neighbors) {
                    if (p1.id >= p2.id || !p2.isCollectiveConscious) continue; // Avoid double counting and self
                    
                    const d2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
                    if (d2 < 10000) { // first contact range
                        if (Math.random() < 0.01) { // Throttle events
                            this.state.events.push(`Primeiro contato entre grupos: ${p1.id.slice(0,4)} e ${p2.id.slice(0,4)}`);
                            this.addSignificantEvent((p1.x + p2.x)/2, (p1.y + p2.y)/2, 'CONTACT', tick);
                            // Exchange culture
                            const avgK = (p1.knowledge + p2.knowledge) / 2;
                            p1.knowledge = avgK;
                            p2.knowledge = avgK;
                        }
                    }
                }
            }
        }
    }

    // Natural Migration
    if (nodes > 100 && Math.random() < 0.05) {
        // Find a latent particle far away
        const latent = this.particles.find(p => p.isLatent);
        if (latent) {
            latent.isLatent = false;
            latent.knowledge = this.state.culture;
            latent.tools = 1;
            latent.isCollectiveConscious = true;
            this.state.events.push(`Migração natural ativou nova região`);
            this.addSignificantEvent(latent.x, latent.y, 'MIGRATION', tick);
        }
    }
    
    // Meta-consciousness
    if (this.state.culture > 0.9 && this.state.technology > 1000 && !this.state.metaConsciousness) {
        this.state.metaConsciousness = true;
        this.state.events.push(`META-CONSCIÊNCIA ATINGIDA: A SIMULAÇÃO FOI DESCOBERTA`);
        this.addSignificantEvent(0, 0, 'META_CONSCIOUSNESS', tick);
    }

    // Highlights detection
    if (nodes > this.state.lastNodes * 1.1 && nodes > 5) {
        this.state.events.push(`Expansão de grupos conscientes: +${Math.round((nodes/this.state.lastNodes - 1)*100)}%`);
        // Find centroid of nodes for camera focus
        const consciousParticles = this.particles.filter(p => p.isCollectiveConscious);
        if (consciousParticles.length > 0) {
            const avgX = consciousParticles.reduce((s, p) => s + p.x, 0) / consciousParticles.length;
            const avgY = consciousParticles.reduce((s, p) => s + p.y, 0) / consciousParticles.length;
            this.addSignificantEvent(avgX, avgY, 'EXPANSION', tick);
        }
    }
    if (this.state.relationsCount > this.state.lastRelations * 2 && this.state.relationsCount > 10) {
        this.state.events.push(`Explosão de conexões: ${this.state.relationsCount} relações`);
        const consciousParticles = this.particles.filter(p => p.isCollectiveConscious);
        if (consciousParticles.length > 0) {
            const avgX = consciousParticles.reduce((s, p) => s + p.x, 0) / consciousParticles.length;
            const avgY = consciousParticles.reduce((s, p) => s + p.y, 0) / consciousParticles.length;
            this.addSignificantEvent(avgX, avgY, 'EXPLOSION', tick);
        }
    }
    this.state.lastNodes = nodes;
    this.state.lastRelations = this.state.relationsCount;

    // 3. Civilization Trigger (refined)
    if (nodes >= 3) {
        if (isNaN(this.state.culture)) this.state.culture = 0;
        if (isNaN(this.state.technology)) this.state.technology = 0;
        
        // Culture grows with nodes and relations
        const cultureGrowth = (nodes * 0.001) + (this.state.relationsCount * 0.0005);
        this.state.culture += cultureGrowth;
        
        // Technology grows with knowledge and tools of conscious particles
        const consciousParticles = this.particles.filter(p => p.isCollectiveConscious);
        const avgKnowledge = consciousParticles.reduce((s, p) => s + p.knowledge, 0) / nodes;
        const avgTools = consciousParticles.reduce((s, p) => s + p.tools, 0) / nodes;
        
        const techGrowth = (avgKnowledge * 0.01) + (avgTools * 0.005);
        this.state.technology += techGrowth;

        if (Math.random() < 0.01) {
            this.state.events.push(`Avanço cultural detectado. Cultura: ${this.state.culture.toFixed(2)}`);
        }
        if (Math.random() < 0.01 && techGrowth > 0.01) {
            this.state.events.push(`Salto tecnológico! Nível: ${this.state.technology.toFixed(2)}`);
        }
    }
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
        particles.push(this.newParticle(
          `p-${id++}`,
          seed.x + Math.cos(a) * r, seed.y + Math.sin(a) * r,
          seed.vx + Math.cos(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          seed.vy + Math.sin(a + Math.PI / 2) * spin + (Math.random() - 0.5) * 1.5,
          0.8 + Math.random() * 0.4, this.makeCharge(), false,
          `hsla(${seed.hue + (Math.random() - 0.5) * 40},60%,60%,0.2)`, 0
        ));
      }
    }

    // Void particles — dormant from birth (in quantum superposition, zero cost)
    for (let i = 0; i < voidCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * UNIVERSE_RADIUS;
      particles.push(this.newParticle(
        `void-${id++}`,
        Math.cos(a) * r, Math.sin(a) * r,
        (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3,
        0.5 + Math.random() * 0.5, this.makeCharge(), false,
        `hsla(${Math.random() * 360},30%,40%,0.1)`, -DORMANCY_THRESHOLD
      ));
    }

    return particles;
  }

  private getRegion(gx: number, gy: number): RegionData {
    const key = `${gx},${gy}`;
    let reg = this.energyGrid.get(key);
    if (!reg) {
      // Create new region with deterministic seed
      const seed = Math.abs((gx * 12345 + gy * 67890) % 1000000);
      reg = new Regiao(seed, gx, gy);
      this.energyGrid.set(key, reg);
    }
    return reg.observar(this.state.tick);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STEP — the universe clock
  //  Philosophy: each particle is its own observer; no global knowledge.
  //  Lazy evaluation is the physics law, not an optimization.
  // ═══════════════════════════════════════════════════════════════════
  public step(): UniverseState {
    const tick = ++this.state.tick;

    // ── 0. LAZY CLEANUP ─────────────────────────────────────────────
    // Esquecer regiões não observadas para liberar memória
    if (tick % 100 === 0) {
      for (const [key, reg] of this.energyGrid) {
        if (tick - reg.observar(tick).lastActiveTick > 100) {
          reg.esquecer();
        }
        // Se a região estiver muito antiga e sem energia, remover do mapa
        if (tick - reg.observar(tick).lastActiveTick > 1000 && reg.observar(tick).energy < 0.01) {
          this.energyGrid.delete(key);
        }
      }
    }

    // ── 1. BUILD GRIDS — active particles curve spacetime. ─────────
    //    Dormant particles are unobserved: they don't emit a classical
    //    gravitational field. They exist in quantum superposition.
    const spatialGrid = new Map<string, Particle[]>();
    const dormantGrid = new Map<string, Particle[]>();
    const activeRegions = new Set<string>();

    // Reset density/curvature for observed regions
    for (const reg of this.energyGrid.values()) {
      const data = reg.cache;
      if (data) {
        data.curvature = 0;
        data.density = 0;
      }
    }

    for (const p of this.particles) {
      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (p.isLatent) {
        let c = dormantGrid.get(key); if (!c) { c = []; dormantGrid.set(key, c); } c.push(p);
      } else {
        let c = spatialGrid.get(key); if (!c) { c = []; spatialGrid.set(key, c); } c.push(p);
        activeRegions.add(key);
        const r = this.getRegion(gx, gy);
        r.curvature += p.weight * 0.1;
        r.density   += 1;
      }
    }

    this.processCollectiveConsciousness(tick, spatialGrid);

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
                if (dp.id.startsWith('dormant-')) {
                    this.state.events.push("Ciclo completo: vida → morte → nova vida");
                }
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
    for (const key of activeRegions) {
      const region = this.energyGrid.get(key);
      if (!region || region.temperature < 0.001) continue;
      const [gx, gy] = key.split(',').map(Number);
      const diffuse  = region.temperature * TEMP_DIFFUSE;
      for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
        this.getRegion(gx+ddx, gy+ddy).temperature += diffuse / 4;
      }
      region.temperature = region.temperature * TEMP_DECAY - diffuse;
    }

    // ── 4. PAIR PRODUCTION — energy → matter + antimatter ──────────
    let pairCount = 0;
    for (const key of activeRegions) {
      const region = this.energyGrid.get(key);
      if (!region || region.temperature < PAIR_TEMP_THRESHOLD) continue;
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
      const newP = this.newParticle(
        `singularity-${key}-${tick}`,
        gx*GRID_SIZE+GRID_SIZE/2, gy*GRID_SIZE+GRID_SIZE/2,
        totalPx/totalW, totalPy/totalW,
        totalW, 0, true, '#ffffff', tick,
        {
            level: Math.max(...rp.map(p=>p.level))+1,
            persistence: 10,
            isConscious: true,
            waveRadius: 0,
            spin: 0,
            latentTraces: allTraces,
            energy: 0
        }
      );
      newBorn.push(newP);
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

      const gx = Math.floor(p1.x/GRID_SIZE);
      const gy = Math.floor(p1.y/GRID_SIZE);
      const gridKey = `${gx},${gy}`;
      const region = this.getRegion(gx, gy);

      // ── DORMANT PATH — O(1); no nested loops ─────────────────────
      //    In quantum superposition: only geodesic drift + wave growth
      if (p1.isLatent) {
        // Even more lazy: if region is totally dead and particle is slow, skip movement entirely
        if (!activeRegions.has(gridKey) && Math.abs(p1.vx) < 0.001 && Math.abs(p1.vy) < 0.001) {
          // Still age the particle slightly
          p1.age += 0.1;
          continue;
        }

        const tf = 1 / (1 + region.curvature * TIME_DILATION_STR);
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
        
        // Dormant particles can absorb energy from the field
        if (region.energy > 0.1) {
          const absorb = Math.min(region.energy, 0.001 * tf);
          region.energy -= absorb;
          p1.energy = Math.min(1.0, p1.energy + absorb * 10); // High efficiency for dormant patterns
        }
        
        // Chance to wake up if energy is sufficient
        if (p1.energy > 0.5 && Math.random() < 0.01) {
          p1.isLatent = false;
          p1.lastActiveTick = tick;
        }
        continue;
      }

      // ── ACTIVE PATH ──────────────────────────────────────────────
      region.lastActiveTick = tick;
      const tf = 1 / (1 + region.curvature * TIME_DILATION_STR);
      p1.age += 1 * tf;

      // l. Metabolic / Energy Maintenance — O(1)
      //    Each particle consumes local energy to maintain its pattern.
      //    If energy is low, the pattern becomes unstable and recycles.
      const energyCost = (0.0005 + p1.level * 0.0002) * tf;
      if (region.energy > energyCost * 2) {
        region.energy -= energyCost;
        p1.energy = Math.min(1.0, p1.energy + 0.01 * tf);
      } else {
        p1.energy -= energyCost * 2;
      }

      // m. Recycling — when pattern is inviable
      if (p1.energy < 0.05 && !p1.isLatent) {
        p1.isLatent = true;
        p1.energy = 0;
        region.temperature += p1.weight * 0.2; // Dissipate energy as heat
        
        // Store in Cosmic Memory (Latent Field)
        this.state.campoLatente.push({
          x: p1.x, y: p1.y,
          data: { 
            id: p1.id, 
            level: p1.level, 
            knowledge: p1.knowledge,
            tools: p1.tools,
            traces: p1.latentTraces ? [...p1.latentTraces] : [] 
          },
          intensity: p1.level
        });
        
        // Limit Cosmic Memory size
        if (this.state.campoLatente.length > 500) {
          this.state.campoLatente.shift();
        }
        
        this.state.events.push(`Padrão ${p1.id.slice(0,4)} reciclado por ineficiência`);
        continue;
      }

      // Throttled interaction: only check neighbors every few ticks if moving slowly
      const speed2 = p1.vx**2 + p1.vy**2;
      const shouldSkipInteraction = speed2 < 0.1 && (tick + p1.weight * 100) % 4 !== 0;
      
      if (shouldSkipInteraction) {
        // Basic movement only
        p1.x += p1.vx * tf;
        p1.y += p1.vy * tf;
        p1.vx *= 0.99; p1.vy *= 0.99;
        continue;
      }

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
        
        // Entanglement: spooky action at a distance
        if (p1.entangledWith) {
          const partner = this.particles.find(p => p.id === p1.entangledWith);
          if (partner) {
            partner.spin = -partner.spin; // instantly flip partner's spin
            // Break entanglement after one use
            p1.entangledWith = null;
            partner.entangledWith = null;
          } else {
            p1.entangledWith = null;
          }
        }
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
        const str = DARK_ENERGY_LAMBDA * (1 - localDensity/targetDensity);
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
            if (!p1.isDarkMatter && !p2.isDarkMatter && p1.charge !== 0 && p2.charge !== 0 && d2 < emR2) {
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

            // ── QUANTUM INTERACTION (Interference & Entanglement) ──
            if (d2 < intR2) {
              this.interactQuantum(p1, p2, tick);
            }

            // ── ANNIHILATION — matter + antimatter → energy ─────────
            if (!p1.isDarkMatter && !p2.isDarkMatter && d2 < annihR2 &&
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
            if (!p1.isDarkMatter && !p2.isDarkMatter && d2 < strongR2 && p1.isCollapsed && p2.isCollapsed) {
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
      this.state.events.push("Informação ancestral reativada");
    }

    this.particles = this.particles.filter(p => !toKill.has(p.id));
    this.particles.push(...toSpawn);

    // ── 8. CHEMISTRY & BIOLOGY ──────────────────────────────────────
    this.processChemistry(tick, spatialGrid);
    this.processReplication(tick);
    this.processMetabolism(tick);
    this.processExtinctions(tick);

    this.state.activeGridKeys = Array.from(activeRegions);

    // ── 9. QUANTUM METRICS ─────────────────────────────────────────
    const activeParticles = this.particles.filter(p => !p.isLatent);
    if (activeParticles.length > 0) {
      this.state.avgPhase = activeParticles.reduce((s, p) => s + p.phase, 0) / activeParticles.length;
      this.state.entangledPairsCount = Math.floor(this.particles.filter(p => p.entangledWith).length / 2);
      this.state.contextualityRate = activeParticles.reduce((s, p) => s + p.contextualBias, 0) / activeParticles.length;
    }

    // ── 10. POPULATION FLOOR ─────────────────────────────────────────
    if (this.particles.filter(p => !p.isLatent).length < MIN_POPULATION) {
      const anchor = this.particles.find(p => p.isCollapsed) ?? this.particles[0];
      if (anchor) {
        for (let e = 0; e < 10; e++) {
          const a = (e/10)*Math.PI*2, spd = 1+Math.random();
          let extra: Partial<Particle> = {};
          if (this.state.campoLatente.length > 0 && Math.random() < 0.5) {
            const info = this.state.campoLatente.pop()!;
            const data = info.data || {};
            // Reconstroi o estado a partir da seed do atrator
            const seed = data.seed || 0;
            extra = { 
              knowledge: data.knowledge || (seed % 10), 
              tools: data.tools || (Math.floor(seed / 10) % 5), 
              latentTraces: [] // Traces are lost in compression, but potential is kept
            };
            this.state.latentTraceCount--;
            this.state.events.push(`Padrão fractal ${data.id?.slice(0,4)} re-emergindo`);
          }
          this.particles.push(this.newParticle(
            `rb-${tick}-${e}`,
            anchor.x+Math.cos(a)*30, anchor.y+Math.sin(a)*30,
            Math.cos(a)*spd, Math.sin(a)*spd,
            0.8, this.makeCharge(), false, anchor.color, tick, extra
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

    let maxCurv = 0, totalTemp = 0, tempCount = 0;
    this.energyGrid.forEach(r => {
      if (r.curvature > maxCurv) maxCurv = r.curvature;
      if (r.temperature > 0.001) { totalTemp += r.temperature; tempCount++; }
    });
    this.state.maxCurvature   = maxCurv;
    this.state.avgTemperature = tempCount > 0 ? totalTemp/tempCount : 0;
    
    this.state.moleculeCount = this.molecules.size;
    this.state.organicCount = Array.from(this.molecules.values()).filter(m => m.isOrganic).length;
    this.state.replicantCount = Array.from(this.molecules.values()).filter(m => m.isReplicating).length;
    this.state.maxGeneration = Math.max(0, ...Array.from(this.molecules.values()).map(m => m.generation));
    this.state.lifeCount = this.particles.filter(p => p.isMetabolizing).length;
    
    // Update fertility: regions with high recycling and organic density
    const organicParticles = this.particles.filter(p => p.isMetabolizing);
    const organicDensity = organicParticles.length / Math.max(1, this.particles.length);
    const recyclingRate = (this.state.recycledMatterCount || 0) / Math.max(1, tick);
    
    this.state.fertility = (organicDensity * 10) + (recyclingRate * 5) + (this.state.organicCount * 0.1);

    return this.state;
  }
}
