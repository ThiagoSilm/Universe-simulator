import { Particle, UniverseState } from './types';
import { ObserverLayer } from './ObserverLayer';

export interface DocumentaryRegion {
  id: string;
  particles: Particle[];
  significance: number;
  center: { x: number; y: number };
}

export class LazyDocumentary {
  private universe: ObserverLayer;
  private historico: any[] = [];
  private economia: number = 0;
  private LIMIAR: number = 0.5;

  constructor(universe: ObserverLayer) {
    this.universe = universe;
  }

  // Só processa o que VALE A PENA (Lazy Evaluation)
  capturarMomento() {
    const state = this.universe.getState();
    const totalEntidades = state.particleCount || 0;
    const activeCount = state.lazyCost || 0;
    const latentCount = totalEntidades - activeCount;
    
    // Simula a economia baseada no que NÃO está sendo calculado (latentes)
    this.economia = state.efficiency / 100;
    
    // Captura eventos significativos (baseado no histórico de eventos do motor)
    const eventosRecentes = state.events && state.events.length > 0 
      ? state.events.slice(-3).map(text => ({
          text,
          importancia: 0.6 + Math.random() * 0.4, // High importance for recent events
          timestamp: state.tick
        }))
      : [];

    return {
      eventos: eventosRecentes,
      economia: `${(this.economia * 100).toFixed(2)}% economizado`,
      latentesPct: (latentCount / (totalEntidades || 1) * 100).toFixed(2),
      calculandoPct: (activeCount / (totalEntidades || 1) * 100).toFixed(2)
    };
  }

  getMetrics() {
    const state = this.universe.getState();
    const momento = this.capturarMomento();
    return {
      economy: momento.economia,
      latentesPct: momento.latentesPct,
      calculandoPct: momento.calculandoPct,
      event: momento.eventos[0]?.text || 'Observação Estática',
      nextScan: state.tick + 10
    };
  }
}
