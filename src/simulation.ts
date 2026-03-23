export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface State {
  tick: number;
  x: Vector3;
  v: Vector3;
  pt: number;
  phi: number;
  f: number;
  charge: number;
}

export class Particle {
  id: number;
  x: Vector3;
  v: Vector3;
  pt: number;
  phi: number;
  f: number;
  charge: number;
  connections: number;
  history: State[];
  s!: Vector3; // estado vetorial [pt, phi, f]

  constructor(x: Vector3, v: Vector3, pt: number, phi: number, f: number, charge: number = 1.0) {
    this.id = Math.floor(Math.random() * 2**31);
    this.x = { ...x };
    this.v = { ...v };
    this.pt = pt;
    this.phi = phi;
    this.f = f;
    this.charge = charge;
    this.connections = 0;
    this.history = [];
    this.updateStateVector();
  }

  updateStateVector(): void {
    this.s = { x: this.pt, y: this.phi, z: this.f };
  }

  saveState(tick: number): void {
    this.history.push({
      tick,
      x: { ...this.x },
      v: { ...this.v },
      pt: this.pt,
      phi: this.phi,
      f: this.f,
      charge: this.charge
    });
    if (this.history.length > 1000) this.history.shift();
  }

  getStateAtTime(currentTick: number, delayTicks: number): State | null {
    const targetTick = currentTick - delayTicks;
    if (targetTick < 0) return null;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].tick <= targetTick) return this.history[i];
    }
    return null;
  }
}

// Constantes (parâmetros do substrato)
export const C = 299792458;          // clock máximo
export const H = 6.62607015e-34;     // quantum mínimo
export const LAMBDA = 1e-6;          // expansão

// Parâmetros ajustáveis
export const ALPHA = 1.0;
export const BETA = 1.0;
export const EPS = 1e-9;
export const THETA_F = 0.5;
export const THETA_A = 0.1;
export const COUPLING_GAIN = 0.05;
export const DT = 0.1;

export function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

export function localMetrics(p: Particle, particles: Particle[]): { rho: number; deltaPt: number; deltaF: number; fLocal: number } {
  const r = 5.0;
  const neighbors = particles.filter(q => q !== p && distance(p.x, q.x) < r);
  const rho = neighbors.length;

  let deltaPt = 0, deltaF = 0;
  if (neighbors.length > 0) {
    deltaPt = neighbors.reduce((sum, q) => sum + Math.abs(p.pt - q.pt), 0) / neighbors.length;
    deltaF = neighbors.reduce((sum, q) => sum + Math.abs(p.f - q.f), 0) / neighbors.length;
  }

  const fLocal = Math.pow(rho + EPS, ALPHA) * Math.pow(deltaPt + EPS, BETA) * Math.pow(deltaF + EPS, 0.5);
  return { rho, deltaPt, deltaF, fLocal };
}

export function contextualWeight(p: Particle, particles: Particle[]): number {
  const { fLocal } = localMetrics(p, particles);
  const chargeFactor = 1.0 + 0.5 * Math.abs(p.charge);
  return p.pt * fLocal * chargeFactor;
}

export function shouldCouple(p: Particle, q: Particle): boolean {
  const deltaF = Math.abs(p.f - q.f);
  const norm1 = Math.hypot(p.s.x, p.s.y, p.s.z) + EPS;
  const norm2 = Math.hypot(q.s.x, q.s.y, q.s.z) + EPS;
  const alignment = (p.s.x * q.s.x + p.s.y * q.s.y + p.s.z * q.s.z) / (norm1 * norm2);
  const chargeFactor = p.charge * q.charge >= 0 ? 1.0 : 1.5;
  return (deltaF < THETA_F * chargeFactor) && (alignment > THETA_A);
}

export function redistribute(leader: Particle, result: Vector3, coupled: Particle[], particles: Particle[]): void {
  leader.pt += COUPLING_GAIN * (1 + 0.1 * coupled.length);
  leader.connections += coupled.length;

  for (const p of coupled) {
    p.phi = (p.phi + 0.05) % (2 * Math.PI);
    p.f = p.f * (1.0 + 0.0005);
    p.updateStateVector();
    p.pt += COUPLING_GAIN;
    p.connections++;
  }

  // Normalização para conservar ΣPt
  const totalPt = particles.reduce((sum, p) => sum + p.pt, 0);
  if (totalPt > 0) {
    for (const p of particles) {
      p.pt = (p.pt / totalPt) * particles.length;
      p.updateStateVector();
    }
  }
}

export function emergentAcceleration(particles: Particle[], tick: number): Map<Particle, Vector3> {
  const acc = new Map<Particle, Vector3>();
  if (particles.length < 2) return acc;

  for (const p of particles) {
    let force = { x: 0, y: 0, z: 0 };
    for (const q of particles) {
      if (p === q) continue;
      if (!shouldCouple(p, q)) continue;

      const d = distance(p.x, q.x) + EPS;
      const delaySeconds = d / C;
      const delayTicks = Math.floor(delaySeconds / DT) + 1;

      const qPast = q.getStateAtTime(tick, delayTicks);
      const qPastPt = qPast ? qPast.pt : q.pt;
      const qPastPos = qPast ? qPast.x : q.x;

      const deltaPt = qPastPt - p.pt;
      const dir = { x: p.x.x - qPastPos.x, y: p.x.y - qPastPos.y, z: p.x.z - qPastPos.z };
      force.x += deltaPt * dir.x;
      force.y += deltaPt * dir.y;
      force.z += deltaPt * dir.z;
    }
    const invMass = 1 / (p.pt + EPS);
    acc.set(p, { x: force.x * invMass, y: force.y * invMass, z: force.z * invMass });
  }
  return acc;
}

export function updateMotion(particles: Particle[]): void {
  for (const p of particles) {
    const speed = Math.hypot(p.v.x, p.v.y, p.v.z);
    if (speed > C) {
      p.v.x = p.v.x / speed * C;
      p.v.y = p.v.y / speed * C;
      p.v.z = p.v.z / speed * C;
    }
    p.x.x += p.v.x * DT;
    p.x.y += p.v.y * DT;
    p.x.z += p.v.z * DT;
    p.x.x *= (1 + LAMBDA);
    p.x.y *= (1 + LAMBDA);
    p.x.z *= (1 + LAMBDA);
  }
}

export function quantizePersistence(particles: Particle[]): void {
  for (const p of particles) {
    if (p.pt < H) {
      p.pt = H;
      p.updateStateVector();
    }
  }
}

export function continuousGenesis(particles: Particle[], tick: number, thetaGen: number = 1.2, rhoMin: number = 0.5): void {
  if (tick < 5) return;

  const novas: Particle[] = [];
  for (const p of particles) {
    const { rho } = localMetrics(p, particles);
    if (p.pt > thetaGen && rho > rhoMin && Math.random() < 0.05) {
      const newX = {
        x: p.x.x + (Math.random() - 0.5) * 0.2,
        y: p.x.y + (Math.random() - 0.5) * 0.2,
        z: p.x.z + (Math.random() - 0.5) * 0.2
      };
      const newV = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      };
      const newPt = 0.5;
      const newPhi = Math.random() * 2 * Math.PI;
      const newF = p.f * (1 + (Math.random() - 0.5) * 0.2);
      const newCharge = Math.random() < 0.5 ? 1.0 : -1.0;
      novas.push(new Particle(newX, newV, newPt, newPhi, newF, newCharge));
    }
  }
  particles.push(...novas);
  if (particles.length > 200) {
    particles.sort((a, b) => a.pt - b.pt);
    particles.splice(0, 50);
  }
}

export function initializeBigBang(): Particle[] {
  const p1 = new Particle({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1.0, 0.0, 1.0, 1.0);
  const p2 = new Particle({ x: 0.01, y: 0.01, z: 0.01 }, { x: 0, y: 0, z: 0 }, 1.0, Math.PI, 1.0, -1.0);
  return [p1, p2];
}

export function stepSimulation(
  particles: Particle[],
  tick: number,
  eventMemory: Map<string, number>,
  leaderHistory: any[]
): { currentLeader: Particle | null; leaderPeakWeight: number; wcLeader: number } {
  // Salva estado
  for (const p of particles) p.saveState(tick);

  // Reseta conexões
  for (const p of particles) p.connections = 0;

  // Seleciona líder
  const leader = particles.reduce((a, b) => contextualWeight(a, particles) > contextualWeight(b, particles) ? a : b);
  const wcLeader = contextualWeight(leader, particles);

  // Processa estímulo (apenas líder)
  leader.phi = (leader.phi + 0.1) % (2 * Math.PI);
  leader.f = leader.f * 1.001;
  leader.updateStateVector();
  const result = { x: leader.pt, y: leader.phi, z: leader.f };

  // Identifica acoplados
  const coupled = particles.filter(p => p !== leader && shouldCouple(p, leader));

  // Redistribui
  redistribute(leader, result, coupled, particles);

  // Memória (apenas registro)
  const eventId = `leader_${leader.id}_tick_${tick}`;
  const oldWeight = eventMemory.get(eventId) || 0;
  eventMemory.set(eventId, oldWeight * 0.95 + wcLeader);
  for (const [key, val] of eventMemory.entries()) {
    if (val < EPS) eventMemory.delete(key);
  }

  // Aceleração emergente
  const acc = emergentAcceleration(particles, tick);
  for (const p of particles) {
    const a = acc.get(p);
    if (a) {
      p.v.x += a.x * DT;
      p.v.y += a.y * DT;
      p.v.z += a.z * DT;
    }
  }

  // Dinâmica espacial + expansão
  updateMotion(particles);

  // Quantização
  quantizePersistence(particles);

  // Gênese contínua
  continuousGenesis(particles, tick);

  return { currentLeader: leader, leaderPeakWeight: 0, wcLeader };
}
