export interface Vector2 {
  x: number;
  y: number;
}

export interface MemoryEntry {
  event: string;
  weight: number;
  tick: number;
}

export interface Stimulus {
  id: string;
  position: Vector2;
  relevance: number;
  frequency: number;
}

export const C = 1.0;          // Velocidade limite / Frequência máxima
export const H = 1e-6;         // Quantum mínimo
export const LAMBDA = 1e-4;    // Expansão do espaço
export const THETA_F = 0.1;    // Threshold de ressonância (10%)
export const THETA_A = 0.7;    // Threshold de alinhamento (cos theta)
export const DT = 1.0;

export class Particle {
  id: number;
  position: Vector2;
  internalVector: Vector2; // Vetor unitário
  pt: number;              // Potencial total P(t)
  charge: number;
  phase: number;           // Ângulo (0 a 2PI)
  memories: MemoryEntry[];
  contextualWeight: number = 0;
  connections: number = 0;

  constructor(pos: Vector2, pt: number, charge: number) {
    this.id = Math.floor(Math.random() * 2**31);
    this.position = { ...pos };
    const angle = Math.random() * 2 * Math.PI;
    this.internalVector = { x: Math.cos(angle), y: Math.sin(angle) };
    this.pt = pt;
    this.charge = charge;
    this.phase = Math.random() * 2 * Math.PI;
    this.memories = [];
  }

  getFrequency(): number {
    // frequência = carga * P(t) * (1 + seno(fase))
    const f = this.charge * this.pt * (1 + Math.sin(this.phase));
    // Limite C: se frequência calculada > C, usa C.
    return Math.min(C, Math.max(-C, f));
  }

  updatePhase(): void {
    this.phase = (this.phase + 0.1) % (2 * Math.PI);
  }

  dissipateMemories(): void {
    // A cada tick, você aplica dissipação: todos os pesos de memória diminuem um pouco.
    // Quando um peso cai abaixo de H (quantum mínimo), o registro é removido.
    this.memories = this.memories
      .map(m => ({ ...m, weight: m.weight * 0.98 }))
      .filter(m => m.weight >= H);
  }
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dotProduct(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function expandSpace(particles: Particle[], stimuli: Stimulus[]): void {
  // A cada tick, você pode aumentar ligeiramente as distâncias entre todas as partículas
  for (const p of particles) {
    p.position.x *= (1 + LAMBDA);
    p.position.y *= (1 + LAMBDA);
  }
  for (const s of stimuli) {
    s.position.x *= (1 + LAMBDA);
    s.position.y *= (1 + LAMBDA);
  }
}

export function calculateContextualWeight(p: Particle, stimulus: Stimulus): number {
  const d = distance(p.position, stimulus.position) + 1e-9;
  // contextualWeight = P(t) × (1 / distância_ao_estímulo) × relevância_de_escala
  return p.pt * (1 / d) * stimulus.relevance;
}

export function redistributePt(leader: Particle, cluster: Particle[], deltaPt: number): void {
  // ΣP(t) do cluster se conserva.
  // Quando a líder processa o estímulo, algo é ganho ou perdido.
  // Esse ganho/perda é redistribuído entre todas as partículas do cluster.
  
  // Se a líder ganha deltaPt, as outras perdem proporcionalmente.
  // Aqui simplificamos: a líder ganha deltaPt, e removemos deltaPt do resto do cluster proporcionalmente ao peso.
  
  if (cluster.length <= 1) return;

  const others = cluster.filter(p => p !== leader);
  const totalWeightOthers = others.reduce((sum, p) => sum + p.contextualWeight, 0) + 1e-9;

  leader.pt += deltaPt;
  for (const p of others) {
    const share = (p.contextualWeight / totalWeightOthers) * deltaPt;
    p.pt -= share;
    // Limite H: nada menor que H persiste
    if (p.pt < H) p.pt = H;
  }
}

export function initializeWorld(): { particles: Particle[], stimuli: Stimulus[] } {
  const particles: Particle[] = [];
  for (let i = 0; i < 50; i++) {
    particles.push(new Particle(
      { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
      1.0 + Math.random(),
      Math.random() < 0.5 ? 1.0 : -1.0
    ));
  }

  const stimuli: Stimulus[] = [
    { id: 'CORE_STIMULUS', position: { x: 0, y: 0 }, relevance: 1.0, frequency: 0.5 }
  ];

  return { particles, stimuli };
}
