export class Particle {
  x: Float64Array;
  v: Float64Array;
  pt: number;
  phi: number;
  f: number;
  charge: number;
  connections: number;
  id: number;
  s: Float64Array;
  history: any[];

  constructor(x: number[], v: number[], pt: number, phi: number, f: number, charge: number = 1.0) {
    this.x = new Float64Array(x);
    this.v = new Float64Array(v);
    this.pt = pt;
    this.phi = phi;
    this.f = f;
    this.charge = charge;
    this.connections = 0;
    this.id = Math.floor(Math.random() * 2147483648);
    this.s = new Float64Array(3);
    this._updateStateVector();
    this.history = [];
  }

  _updateStateVector() {
    this.s[0] = this.pt;
    this.s[1] = this.phi;
    this.s[2] = this.f;
  }

  saveState(tick: number) {
    this.history.push({
      tick,
      x: new Float64Array(this.x),
      v: new Float64Array(this.v),
      pt: this.pt,
      phi: this.phi,
      f: this.f,
      charge: this.charge
    });
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }

  getStateAtTime(currentTick: number, delayTicks: number) {
    const targetTick = currentTick - delayTicks;
    if (targetTick < 0) return null;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].tick <= targetTick) {
        return this.history[i];
      }
    }
    return null;
  }
}

export class Simulation {
  params: any;
  alpha: number;
  beta: number;
  epsilon: number;
  theta_f: number;
  theta_a: number;
  theta_gen: number;
  rho_min: number;
  decay: number;
  coupling_gain: number;
  dt: number;

  particles: Particle[];
  event_memory: Record<string, any>;
  tick: number;
  currentLeader: Particle | null;
  leaderPeakWeight: number;

  constructor() {
    this.params = {
      C: 299792458.0,
      H: 6.62607015e-34,
      LAMBDA: 1e-6
    };
    this.alpha = 1.0;
    this.beta = 1.0;
    this.epsilon = 1e-9;
    this.theta_f = 0.5;
    this.theta_a = 0.1;
    this.theta_gen = 1.2;
    this.rho_min = 0.5;
    this.decay = 0.95;
    this.coupling_gain = 0.05;
    this.dt = 0.1;

    this.particles = this._initializeBigBang();
    this.event_memory = {};
    this.tick = 0;
    this.currentLeader = null;
    this.leaderPeakWeight = 0.0;
  }

  _initializeBigBang() {
    const p1 = new Particle([0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.0, 0.0, 1.0, 1.0);
    const p2 = new Particle([0.01, 0.01, 0.01], [0.0, 0.0, 0.0], 1.0, Math.PI, 1.0, -1.0);
    return [p1, p2];
  }

  _dist(a: Float64Array, b: Float64Array) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  _localMetrics(p: Particle, allParticles: Particle[]) {
    const r = 5.0;
    const neighbors = allParticles.filter(q => q !== p && this._dist(p.x, q.x) < r);
    const rho = neighbors.length;

    let delta_pt = 0.0;
    let delta_f = 0.0;

    if (rho > 0) {
      let sum_pt = 0;
      let sum_f = 0;
      for (const q of neighbors) {
        sum_pt += Math.abs(p.pt - q.pt);
        sum_f += Math.abs(p.f - q.f);
      }
      delta_pt = sum_pt / rho;
      delta_f = sum_f / rho;
    }

    const f_local = Math.pow(rho + this.epsilon, this.alpha) * 
                    Math.pow(delta_pt + this.epsilon, this.beta) * 
                    Math.pow(delta_f + this.epsilon, 0.5);
    return { rho, delta_pt, delta_f, f_local };
  }

  _contextualWeight(p: Particle, allParticles: Particle[]) {
    const { f_local } = this._localMetrics(p, allParticles);
    const charge_factor = 1.0 + 0.5 * Math.abs(p.charge);
    return p.pt * f_local * charge_factor;
  }

  _selectLeader(allParticles: Particle[]) {
    let leader = allParticles[0];
    let maxWeight = -Infinity;

    for (const p of allParticles) {
      const w = this._contextualWeight(p, allParticles);
      if (w > maxWeight) {
        maxWeight = w;
        leader = p;
      }
    }

    const wc_leader = maxWeight;

    if (this.currentLeader !== leader) {
      this.currentLeader = leader;
      this.leaderPeakWeight = wc_leader;
    } else {
      if (wc_leader > this.leaderPeakWeight) {
        this.leaderPeakWeight = wc_leader;
      }
    }

    return { leader, wc_leader };
  }

  _processStimulus(leader: Particle) {
    leader.phi = (leader.phi + 0.1) % (2 * Math.PI);
    leader.f = leader.f * (1.0 + 0.001);
    leader._updateStateVector();
    return new Float64Array(leader.s);
  }

  _dot(a: Float64Array, b: Float64Array) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  }

  _norm(a: Float64Array) {
    return Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
  }

  _shouldCouple(p: Particle, q: Particle) {
    const delta_f = Math.abs(p.f - q.f);
    const s1 = p.s;
    const s2 = q.s;
    const norm1 = this._norm(s1) + this.epsilon;
    const norm2 = this._norm(s2) + this.epsilon;
    const alignment = this._dot(s1, s2) / (norm1 * norm2);
    const charge_factor = (p.charge * q.charge >= 0) ? 1.0 : 1.5;
    return (delta_f < this.theta_f * charge_factor) && (alignment > this.theta_a);
  }

  _redistribute(leader: Particle, coupled: Particle[]) {
    leader.pt += this.coupling_gain * (1 + 0.1 * coupled.length);
    leader.connections += coupled.length;

    for (const p of coupled) {
      p.phi = (p.phi + 0.05) % (2 * Math.PI);
      p.f = p.f * (1.0 + 0.0005);
      p._updateStateVector();
      p.pt += this.coupling_gain;
      p.connections += 1;
    }

    let total_pt = 0;
    for (const p of this.particles) {
      total_pt += p.pt;
    }

    if (total_pt > 0) {
      const len = this.particles.length;
      for (const p of this.particles) {
        p.pt = (p.pt / total_pt) * len;
        p.s[0] = p.pt;
      }
    }
  }

  _updateMemory(leader: Particle, wc_leader: number) {
    for (const key in this.event_memory) {
      this.event_memory[key].weight *= this.decay;
      if (this.event_memory[key].weight < this.epsilon) {
        delete this.event_memory[key];
      }
    }

    const event_id = `leader_${leader.id}_tick_${this.tick}`;
    if (this.event_memory[event_id]) {
      this.event_memory[event_id].weight += wc_leader;
    } else {
      this.event_memory[event_id] = { interaction: event_id, weight: wc_leader };
    }
  }

  _updateMotion() {
    for (const p of this.particles) {
      const speed = this._norm(p.v);
      if (speed > this.params.C) {
        p.v[0] = (p.v[0] / speed) * this.params.C;
        p.v[1] = (p.v[1] / speed) * this.params.C;
        p.v[2] = (p.v[2] / speed) * this.params.C;
      }
      p.x[0] += p.v[0] * this.dt;
      p.x[1] += p.v[1] * this.dt;
      p.x[2] += p.v[2] * this.dt;
      
      const exp = 1.0 + this.params.LAMBDA;
      p.x[0] *= exp;
      p.x[1] *= exp;
      p.x[2] *= exp;
    }
  }

  _quantizePersistence() {
    for (const p of this.particles) {
      if (p.pt < this.params.H) {
        p.pt = this.params.H;
        p.s[0] = p.pt;
      }
    }
  }

  _continuousGenesis() {
    if (this.tick < 5) return;

    const novas: Particle[] = [];
    for (const p of this.particles) {
      const { rho } = this._localMetrics(p, this.particles);
      if (p.pt > this.theta_gen && rho > this.rho_min && Math.random() < 0.05) {
        const new_x = [
          p.x[0] + (Math.random() - 0.5) * 0.2,
          p.x[1] + (Math.random() - 0.5) * 0.2,
          p.x[2] + (Math.random() - 0.5) * 0.2
        ];
        const new_v = [
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ];
        const new_pt = 0.5;
        const new_phi = Math.random() * 2 * Math.PI;
        const new_f = p.f * (1 + (Math.random() - 0.5) * 0.2);
        const new_charge = Math.random() < 0.5 ? -1.0 : 1.0;
        novas.push(new Particle(new_x, new_v, new_pt, new_phi, new_f, new_charge));
      }
    }

    for (const n of novas) {
      this.particles.push(n);
    }

    if (this.particles.length > 200) {
      this.particles.sort((a, b) => a.pt - b.pt);
      this.particles = this.particles.slice(this.particles.length - 50);
    }
  }

  _emergentAcceleration() {
    const accelerations = new Map<Particle, Float64Array>();
    
    for (const p of this.particles) {
      accelerations.set(p, new Float64Array(3));
    }

    if (this.particles.length < 2) return accelerations;

    for (const p of this.particles) {
      const force = new Float64Array(3);
      for (const q of this.particles) {
        if (p === q) continue;
        if (!this._shouldCouple(p, q)) continue;

        const d = this._dist(p.x, q.x) + this.epsilon;
        const delay_seconds = d / this.params.C;
        const delay_ticks = Math.floor(delay_seconds / this.dt) + 1;

        const q_past_state = q.getStateAtTime(this.tick, delay_ticks);
        let q_past_pt = q.pt;
        let q_past_x = q.x;

        if (q_past_state) {
          q_past_pt = q_past_state.pt;
          q_past_x = q_past_state.x;
        }

        const delta_pt = q_past_pt - p.pt;
        const dirX = p.x[0] - q_past_x[0];
        const dirY = p.x[1] - q_past_x[1];
        const dirZ = p.x[2] - q_past_x[2];

        force[0] += delta_pt * dirX;
        force[1] += delta_pt * dirY;
        force[2] += delta_pt * dirZ;
      }

      const acc = accelerations.get(p)!;
      const factor = p.pt + this.epsilon;
      acc[0] = force[0] / factor;
      acc[1] = force[1] / factor;
      acc[2] = force[2] / factor;
    }

    return accelerations;
  }

  runTick() {
    this.tick += 1;

    for (const p of this.particles) {
      p.saveState(this.tick);
      p.connections = 0;
    }

    const { leader, wc_leader } = this._selectLeader(this.particles);
    this._processStimulus(leader);

    const coupled = this.particles.filter(p => p !== leader && this._shouldCouple(p, leader));

    this._redistribute(leader, coupled);
    this._updateMemory(leader, wc_leader);

    const acc = this._emergentAcceleration();
    for (const p of this.particles) {
      const a = acc.get(p)!;
      p.v[0] += a[0] * this.dt;
      p.v[1] += a[1] * this.dt;
      p.v[2] += a[2] * this.dt;
    }

    this._updateMotion();
    this._quantizePersistence();
    this._continuousGenesis();
  }
}
