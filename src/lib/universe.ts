import { 
  Particle, 
  Stimulus, 
  expandSpace, 
  calculateContextualWeight, 
  redistributePt, 
  distance, 
  dotProduct,
  initializeWorld,
  THETA_F,
  THETA_A
} from './physics';

export class Universe {
  particles: Particle[];
  stimuli: Stimulus[];
  tickCount: number = 0;
  leaderHistory: { tick: number; leaderId: number; peakWeight: number }[] = [];

  constructor() {
    const { particles, stimuli } = initializeWorld();
    this.particles = particles;
    this.stimuli = stimuli;
  }

  tick(): void {
    this.tickCount++;

    // 1. Expande o espaço (Λ)
    expandSpace(this.particles, this.stimuli);

    // 2. Agrupa partículas em clusters (por proximidade)
    // No guia, clusters são recalculados a cada tick.
    // Vamos processar cada estímulo e encontrar seu cluster de influência.
    for (const stimulus of this.stimuli) {
      const clusterRadius = 5.0; // Raio de influência fixo ou emergente
      const cluster = this.particles.filter(p => distance(p.position, stimulus.position) < clusterRadius);

      if (cluster.length === 0) continue;

      // 3. Para cada cluster com estímulo ativo:
      
      // · Filtra por ressonância de frequência
      // Ressonância: diferença relativa < 10%
      const resonant = cluster.filter(p => {
        const pf = p.getFrequency();
        const diff = Math.abs(pf - stimulus.frequency);
        return diff < THETA_F;
      });

      if (resonant.length === 0) continue;

      // · Filtra por alinhamento de vetor interno
      // Vetor do cluster: vamos usar o vetor do estímulo (simplificando para uma direção radial ou fixa)
      // Ou a média dos vetores das partículas (emergente)
      const clusterVector = { x: 1, y: 0 }; // Exemplo: direção X
      const aligned = resonant.filter(p => {
        const alignment = dotProduct(p.internalVector, clusterVector);
        return alignment > THETA_A;
      });

      if (aligned.length === 0) continue;

      // · Calcula contextualWeight para cada partícula filtrada
      for (const p of aligned) {
        p.contextualWeight = calculateContextualWeight(p, stimulus);
      }

      // · Elegge a líder (maior peso)
      const leader = aligned.reduce((prev, current) => 
        (prev.contextualWeight > current.contextualWeight) ? prev : current
      );

      // · A líder processa o estímulo
      // "Ela sente o estímulo, pode ter seu P(t) afetado, gera registro de memória"
      const deltaPt = 0.01 * stimulus.relevance; // Ganho de potencial
      
      // · Redistribui ΣP(t) entre as partículas do cluster
      redistributePt(leader, aligned, deltaPt);

      // Registro de memória
      for (const p of aligned) {
        p.memories.push({
          event: `STIMULUS_${stimulus.id}`,
          weight: p.contextualWeight,
          tick: this.tickCount
        });
      }

      // Histórico para a UI
      if (this.tickCount % 10 === 0) {
        this.leaderHistory.push({
          tick: this.tickCount,
          leaderId: leader.id,
          peakWeight: leader.contextualWeight
        });
        if (this.leaderHistory.length > 20) this.leaderHistory.shift();
      }
    }

    // 4. Atualiza memórias (pesos dissipam naturalmente)
    for (const p of this.particles) {
      p.dissipateMemories();
      // 5. Aplica limites estruturais (nada ultrapassa C, nada menor que H persiste)
      // Frequência já é limitada em getFrequency()
      // P(t) já é limitado em redistributePt()
      
      // Atualiza fase
      p.updatePhase();
    }
  }

  get currentLeader(): Particle | null {
    // Retorna a partícula com maior peso no último tick (aproximação)
    if (this.particles.length === 0) return null;
    return this.particles.reduce((prev, curr) => 
      (prev.contextualWeight > curr.contextualWeight) ? prev : curr
    );
  }
}
