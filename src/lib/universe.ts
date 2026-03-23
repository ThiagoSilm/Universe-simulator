import {
  Particle,
  initializeBigBang,
  contextualWeight,
  shouldCouple,
  redistribute,
  emergentAcceleration,
  updateMotion,
  quantizePersistence,
  continuousGenesis,
  EPS,
  DT
} from './physics';

export class Universe {
  particles: Particle[];
  tickCount: number;
  currentLeader: Particle | null;
  leaderPeakWeight: number;
  leaderHistory: any[];
  eventMemory: Map<string, number>;

  constructor() {
    this.particles = initializeBigBang();
    this.tickCount = 0;
    this.currentLeader = null;
    this.leaderPeakWeight = 0;
    this.leaderHistory = [];
    this.eventMemory = new Map();
  }

  tick() {
    this.tickCount++;

    // Salva estado
    for (const p of this.particles) p.saveState(this.tickCount);

    // Reseta conexões
    for (const p of this.particles) p.connections = 0;

    // Seleciona líder
    const leader = this.particles.reduce((a, b) => contextualWeight(a, this.particles) > contextualWeight(b, this.particles) ? a : b);
    const wcLeader = contextualWeight(leader, this.particles);

    if (this.currentLeader !== leader) {
      if (this.currentLeader && this.leaderPeakWeight > 1e-6) {
        this.leaderHistory.push({ tick: this.tickCount, leaderId: this.currentLeader.id, peakWeight: this.leaderPeakWeight });
      }
      this.currentLeader = leader;
      this.leaderPeakWeight = wcLeader;
    } else if (wcLeader > this.leaderPeakWeight) {
      this.leaderPeakWeight = wcLeader;
    }

    // Processa estímulo (apenas líder)
    leader.phi = (leader.phi + 0.1) % (2 * Math.PI);
    leader.f = leader.f * 1.001;
    leader.updateStateVector();
    const result = { x: leader.pt, y: leader.phi, z: leader.f };

    // Identifica acoplados
    const coupled = this.particles.filter(p => p !== leader && shouldCouple(p, leader));

    // Redistribui
    redistribute(leader, result, coupled, this.particles);

    // Memória (apenas registro)
    const eventId = `leader_${leader.id}_tick_${this.tickCount}`;
    const oldWeight = this.eventMemory.get(eventId) || 0;
    this.eventMemory.set(eventId, oldWeight * 0.95 + wcLeader);
    for (const [key, val] of this.eventMemory.entries()) {
      if (val < EPS) this.eventMemory.delete(key);
    }

    // Aceleração emergente
    const acc = emergentAcceleration(this.particles, this.tickCount);
    for (const p of this.particles) {
      const a = acc.get(p);
      if (a) {
        p.v.x += a.x * DT;
        p.v.y += a.y * DT;
        p.v.z += a.z * DT;
      }
    }

    // Dinâmica espacial + expansão
    updateMotion(this.particles);

    // Quantização
    quantizePersistence(this.particles);

    // Gênese contínua
    continuousGenesis(this.particles, this.tickCount);
  }
}
