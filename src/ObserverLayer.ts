import { UniverseCore } from './core/UniverseCore';
import { UniverseState, Particle } from './types';
import { VariavelInfinita } from './VariavelInfinita';

export const GRID_SIZE = 60;

export interface PersistentState {
  state: UniverseState;
  energyGrid: any[];
  molecules: any[];
}

export class ObserverLayer {
  private core: UniverseCore;
  private lastSnapshot: UniverseState | null = null;
  public isHumanMode: boolean = false;
  
  public state: UniverseState;
  public particles: Particle[] = [];

  public temperature: VariavelInfinita;
  public curvature: VariavelInfinita;
  public particleCount: VariavelInfinita;

  // Métricas calculadas apenas quando observado
  public metrics = {
    photonCount: 0,
    moleculeCount: 0,
    organicCount: 0,
    lifeCount: 0,
    consciousnessCount: 0,
    culture: 0,
    technology: 0,
    avgTemperature: 0,
    efficiency: 0,
    lazyCost: 0,
    eagerCost: 0,
    entropy: 1,
    coherence: 0,
    totalInformation: 0,
    maxCurvature: 0,
    pairProductionCount: 0,
    annihilationCount: 0,
    fissionCount: 0,
    replicantCount: 0,
    maxGeneration: 0,
    recycledMatterCount: 0,
    latentTraceCount: 0,
    fertility: 0,
    relationsCount: 0,
    collectiveConsciousnessNodes: 0,
    metaConsciousness: false,
    extinctionCycles: 0,
    currentCycle: 1,
    history: [],
    isSpectatorMode: false,
    lastNodes: 0,
    lastRelations: 0,
    significantEvents: [],
    campoLatente: [],
    events: [],
    viewportX: 0,
    viewportY: 0,
    zoom: 1,
    activeGridKeys: [],
    avgPhase: 0,
    interferenceCount: 0,
    contextualityRate: 0,
    entangledPairsCount: 0,
    darkEnergy: 0,
    avgTimeDilation: 0,
    discoveryLog: [],
  };

  constructor(savedState?: any) {
    this.core = new UniverseCore(savedState ? savedState.state.particles.length : 1800);
    this.state = this.getState();
    this.particles = this.state.particles;
    this.temperature = new VariavelInfinita(() => this.state.avgTemperature);
    this.curvature = new VariavelInfinita(() => this.state.maxCurvature);
    this.particleCount = new VariavelInfinita(() => this.particles.length);
  }

  public step(): UniverseState {
    // O core sempre avança o tempo
    this.core.tick();

    if (this.isHumanMode) {
      // O humano está observando! Força colapso na área visível
      const visibleRadius = 2000 / this.state.zoom; 
      const observedCount = this.core.observe(this.state.viewportX, this.state.viewportY, visibleRadius);
      
      // Pega o snapshot para renderizar e calcular métricas
      this.lastSnapshot = this.core.getSnapshot() as any;
      
      // Calcula métricas pesadas apenas no modo humano
      this.calculateMetrics(this.lastSnapshot.particles, observedCount);
    } else {
      // Modo Universo Real: quase zero custo
      // Não pede snapshot, não calcula métricas
      this.lastSnapshot = this.core.getSnapshot() as any; // Pega snapshot mínimo para não quebrar a UI
    }

    this.state = this.getState();
    return this.state;
  }

  private calculateMetrics(particles: Particle[], observedCount: number) {
    let tempSum = 0;
    let photons = 0;
    
    for (const p of particles) {
      if (!p.isLatent) {
        tempSum += p.vx * p.vx + p.vy * p.vy;
      }
      if (p.isPhoton) photons++;
    }

    this.metrics.avgTemperature = tempSum / (particles.length || 1);
    this.metrics.photonCount = photons;
    
    // Simula o custo de observação
    this.metrics.eagerCost = particles.length;
    this.metrics.lazyCost = observedCount;
    this.metrics.efficiency = 100 - (observedCount / particles.length) * 100;
  }

  public getState(): UniverseState {
    const snapshot = this.lastSnapshot || (this.core.getSnapshot() as any);
    
    return {
      ...snapshot,
      ...this.metrics,
      particles: snapshot.particles,
      tick: snapshot.tick,
    } as UniverseState;
  }

  public getPersistentState() {
    return {
      state: this.state,
      energyGrid: [],
      molecules: [],
    };
  }

  public resetUniverse() {
    this.core = new UniverseCore();
    this.state = this.getState();
  }

  public static describeEvent(p: any, tick: number) {
    return {
      funcaoOnda: `ψ = ${(p.amplitude || 0).toFixed(3)} * e^(i${(p.phase || 0).toFixed(3)})`,
      matrizDensidade: `ρ = |${((p.amplitude || 0) ** 2).toFixed(3)}| (Contexto: ${(p.contextualBias || 0).toFixed(2)})`,
      lazyEvaluation: `Estado ${p.isLatent ? "latente" : "colapsado"} (Peso: ${(p.weight || p.mass || 0).toFixed(2)})`,
    };
  }
}
