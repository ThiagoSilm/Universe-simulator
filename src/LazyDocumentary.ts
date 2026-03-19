import { Particle, UniverseState } from './types';
import { UniverseEngine } from './UniverseEngine';

export interface DocumentaryRegion {
  id: string;
  particles: Particle[];
  significance: number;
  center: { x: number; y: number };
}

export class LazyDocumentary {
  private universe: UniverseEngine;
  private historico: any[] = [];
  private economia: number = 0;
  private LIMIAR: number = 0.5;

  constructor(universe: UniverseEngine) {
    this.universe = universe;
  }

  // Só processa o que VALE A PENA (Lazy Evaluation)
  capturarMomento() {
    const particles = this.universe.particles;
    const totalEntidades = particles.length;
    
    // Filtra partículas que "valem a pena" (não latentes e com atividade recente)
    const entidadesAtivas = particles.filter(p => !p.isLatent);
    
    // Simula a economia baseada no que NÃO está sendo calculado (latentes)
    this.economia = 1 - (entidadesAtivas.length / (totalEntidades || 1));
    
    // Captura eventos significativos (baseado no histórico de eventos do motor)
    const eventosRecentes = this.universe.state.events.slice(-5).map(text => ({
      text,
      importancia: Math.random(), // Simulação de importância
      timestamp: this.universe.state.tick
    })).filter(e => e.importancia > this.LIMIAR);

    return {
      eventos: eventosRecentes,
      economia: `${(this.economia * 100).toFixed(2)}% economizado`,
      latentesPct: (particles.filter(p => p.isLatent).length / (totalEntidades || 1) * 100).toFixed(2),
      calculandoPct: (entidadesAtivas.length / (totalEntidades || 1) * 100).toFixed(2)
    };
  }

  getMetrics() {
    const momento = this.capturarMomento();
    return {
      economia: momento.economia,
      latentesPct: momento.latentesPct,
      calculandoPct: momento.calculandoPct,
      event: momento.eventos[0]?.text || 'Observação Estática',
      nextScan: this.universe.state.tick + 10
    };
  }
}
