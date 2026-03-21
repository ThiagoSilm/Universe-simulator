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
  public isObserving: boolean = false;
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
    maxLevel: 1,
    dormantCount: 0,
    chargedCount: 0,
    boundCount: 0,
    decisionsPerTick: 0,
    avgCandidates: 0,
    totalSelfEnergy: 0,
    activeTracesCount: 0,
    blackHoleCount: 0,
    horizonSize: 0,
    systemTemperature: 0,
    thermalGradient: 0,
  };

  constructor(savedState?: any) {
    this.worker = new Worker(new URL('./core/simulation.worker.ts', import.meta.url), { type: 'module' });
    
    this.worker.onmessage = (e) => {
      if (e.data.type === 'SNAPSHOT') {
        this.lastSnapshot = e.data.payload;
        this.calculateMetrics(this.lastSnapshot);
        this.onStateUpdate(this.getState());
      }
    };

    if (savedState) {
      this.worker.postMessage({ type: 'RESET', payload: { particles: savedState.state.particles.length } });
    }
    
    this.worker.postMessage({ type: 'START' });
  }

  public step() {
    if (this.isObserving) {
      // Pede o estado para o humano ver
      this.worker.postMessage({ type: 'GET_SNAPSHOT' });
    }
  }

  public observeAt(x: number, y: number, radius: number = 1000) {
    this.worker.postMessage({ 
      type: 'OBSERVE', 
      payload: { x, y, radius } 
    });
  }

  public teleport(x: number, y: number) {
    this.metrics.viewportX = x;
    this.metrics.viewportY = y;
    this.metrics.isSpectatorMode = true;
    this.worker.postMessage({ 
      type: 'TELEPORT', 
      payload: { x, y } 
    });
  }

  public setZoom(zoom: number) {
    this.metrics.zoom = Math.max(0.0001, Math.min(10, zoom));
  }

  public setSpectatorMode(enabled: boolean) {
    this.metrics.isSpectatorMode = enabled;
  }

  private calculateMetrics(snapshot: any) {
    const { particles, activeCount, totalCount, metrics: coreMetrics } = snapshot;
    let tempSum = 0;
    let maxCurv = 0;
    let maxLvl = 1;
    let chrgd = 0;
    let bnd = 0;
    let bhCount = 0;
    let totalVel = 0;
    
    // As métricas são calculadas apenas sobre o que está ATIVO (Lazy)
    // Se o worker já nos deu o activeCount, não precisamos contar de novo!
    for (const p of particles) {
      if (!p.isLatent) {
        const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        totalVel += vel;
        tempSum += vel * vel;
        const curv = Math.abs(p.vx || 0) + Math.abs(p.vy || 0);
        if (curv > maxCurv) maxCurv = curv;
        if (p.level > maxLvl) maxLvl = p.level;
        if (p.charge !== 0) chrgd++;
        if (p.isBound) bnd++;
        if (p.isBlackHole) bhCount++;
      }
    }

    this.metrics.avgTemperature = tempSum / (activeCount || 1);
    this.metrics.avgTimeDilation = totalVel / (activeCount * 50 || 1); // Normalized to C=50
    this.metrics.blackHoleCount = bhCount;
    this.metrics.horizonSize = 50000 + snapshot.tick * 0.0001 * 100;
    this.metrics.lazyCost = activeCount;
    this.metrics.eagerCost = totalCount;
    this.metrics.efficiency = 100 - (activeCount / (totalCount || 1)) * 100;
    this.metrics.maxCurvature = maxCurv;
    this.metrics.particleCount = totalCount;
    this.metrics.maxLevel = maxLvl;
    this.metrics.dormantCount = totalCount - activeCount;
    this.metrics.chargedCount = chrgd;
    this.metrics.boundCount = bnd;

    // Update from Core Metrics
    if (coreMetrics) {
      this.metrics.decisionsPerTick = coreMetrics.decisionsPerTick;
      this.metrics.avgCandidates = coreMetrics.avgCandidates;
      this.metrics.totalSelfEnergy = coreMetrics.totalSelfEnergy;
      this.metrics.activeTracesCount = coreMetrics.activeTracesCount;
      this.metrics.systemTemperature = coreMetrics.systemTemperature;
      this.metrics.thermalGradient = coreMetrics.thermalGradient;
      this.metrics.photonCount = coreMetrics.photonCount;
    }
    
    // Simulação de métricas complexas baseadas na densidade de atividade
    this.metrics.coherence = Math.min(1, activeCount / 500);
    this.metrics.interferenceCount = Math.floor(activeCount * 1.5);
    this.metrics.entangledPairsCount = Math.floor(activeCount / 10);
    this.metrics.lifeCount = Math.floor(activeCount / 50);
    this.metrics.culture = Math.min(100, activeCount / 20);
    this.metrics.technology = Math.min(100, activeCount / 10);
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
