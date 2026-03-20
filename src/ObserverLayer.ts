import { UniverseState, Particle } from './types';

export const GRID_SIZE = 60;

export interface PersistentState {
  state: UniverseState;
  energyGrid: any[];
  molecules: any[];
}

export class ObserverLayer {
  private worker: Worker;
  private lastSnapshot: any = null;
  public isHumanMode: boolean = false;
  public onStateUpdate: (state: UniverseState) => void = () => {};

  public metrics = {
    photonCount: 0,
    moleculeCount: 0,
    organicCount: 0,
    lifeCount: 0,
    consciousnessCount: 0,
    culture: 0,
    technology: 0,
    entropy: 1,
    coherence: 0,
    totalInformation: 0,
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
    avgTemperature: 0,
    lazyCost: 0,
    eagerCost: 0,
    efficiency: 0,
    maxCurvature: 0,
    particleCount: 0,
  };

  constructor(savedState?: any) {
    this.worker = new Worker(new URL('./core/simulation.worker.ts', import.meta.url), { type: 'module' });
    
    this.worker.onmessage = (e) => {
      if (e.data.type === 'SNAPSHOT') {
        this.lastSnapshot = e.data.payload;
        this.calculateMetrics(this.lastSnapshot.particles);
        this.onStateUpdate(this.getState());
      }
    };

    if (savedState) {
      this.worker.postMessage({ type: 'RESET', payload: { particles: savedState.state.particles.length } });
    }
    
    this.worker.postMessage({ type: 'START' });
  }

  public step() {
    if (this.isHumanMode) {
      // Força observação na área visível (isso é o que custa caro!)
      this.worker.postMessage({ 
        type: 'OBSERVE', 
        payload: { x: this.metrics.viewportX, y: this.metrics.viewportY, radius: 2000 / this.metrics.zoom } 
      });
      
      // Pede o estado para o humano ver
      this.worker.postMessage({ type: 'GET_SNAPSHOT' });
    }
  }

  private calculateMetrics(particles: any[]) {
    let tempSum = 0;
    let activeCount = 0;
    let maxCurv = 0;
    
    for (const p of particles) {
      if (!p.isLatent) {
        tempSum += p.vx * p.vx + p.vy * p.vy;
        activeCount++;
        const curv = Math.abs(p.vx || 0) + Math.abs(p.vy || 0);
        if (curv > maxCurv) maxCurv = curv;
      }
    }

    this.metrics.avgTemperature = tempSum / (activeCount || 1);
    this.metrics.lazyCost = activeCount;
    this.metrics.eagerCost = particles.length;
    this.metrics.efficiency = 100 - (activeCount / (particles.length || 1)) * 100;
    this.metrics.maxCurvature = maxCurv;
    this.metrics.particleCount = particles.length;
  }

  public getState(): UniverseState {
    const snapshot = this.lastSnapshot || { tick: 0, particles: [] };
    
    return {
      ...snapshot,
      ...this.metrics,
      particles: snapshot.particles,
      tick: snapshot.tick,
    } as UniverseState;
  }

  public getPersistentState() {
    return {
      state: this.getState(),
      energyGrid: [],
      molecules: [],
    };
  }

  public resetUniverse() {
    this.worker.postMessage({ type: 'RESET' });
  }

  public static describeEvent(p: any, tick: number) {
    return {
      funcaoOnda: `ψ = ${(p.amplitude || 0).toFixed(3)} * e^(i${(p.phase || 0).toFixed(3)})`,
      matrizDensidade: `ρ = |${((p.amplitude || 0) ** 2).toFixed(3)}| (Contexto: ${(p.contextualBias || 0).toFixed(2)})`,
      lazyEvaluation: `Estado ${p.isLatent ? "latente" : "colapsado"} (Peso: ${(p.weight || p.mass || 0).toFixed(2)})`,
    };
  }
}
