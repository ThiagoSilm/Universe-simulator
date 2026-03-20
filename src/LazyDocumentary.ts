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
    const particles = this.universe.particles;
    const totalEntidades = particles.length;
    
    // Use pre-calculated counts if possible, or do a single pass
    let latentCount = 0;
    for (const p of particles) {
      if (p.isLatent) latentCount++;
    }
    const activeCount = totalEntidades - latentCount;
    
    // Simula a economia baseada no que NÃO está sendo calculado (latentes)
    this.economia = 1 - (activeCount / (totalEntidades || 1));
    
    // Captura eventos significativos (baseado no histórico de eventos do motor)
    const eventosRecentes = this.universe.state.events.length > 0 
      ? this.universe.state.events.slice(-3).map(text => ({
          text,
          importancia: 0.6 + Math.random() * 0.4, // High importance for recent events
          timestamp: this.universe.state.tick
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
    const momento = this.capturarMomento();
    return {
      economy: momento.economia,
      latentesPct: momento.latentesPct,
      calculandoPct: momento.calculandoPct,
      event: momento.eventos[0]?.text || 'Observação Estática',
      nextScan: this.universe.state.tick + 10
    };
  }
}
