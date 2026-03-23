import { add, sub, mul, div, norm, dot, mean, randn, randnArray } from './math';

export class Particle {
  x: number[];
  v: number[];
  pt: number;
  phi: number;
  f: number;
  charge: number;
  connections: number;
  id: number;
  s: number[];
  history: any[];

  constructor(x: number[], v: number[], pt: number, phi: number, f: number, charge: number = 1.0) {
    this.x = [...x];
    this.v = [...v];
    this.pt = pt;
    this.phi = phi;
    this.f = f;
    this.charge = charge;
    this.connections = 0;
    this.id = Math.floor(Math.random() * Math.pow(2, 31));
    this.s = [0, 0, 0];
    this._update_state_vector();
    this.history = [];
  }

  _update_state_vector() {
    this.s = [this.pt, this.phi, this.f];
  }

  save_state(tick: number) {
    this.history.push({
      tick: tick,
      x: [...this.x],
      v: [...this.v],
      pt: this.pt,
      phi: this.phi,
      f: this.f,
      charge: this.charge
    });
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }

  get_state_at_time(current_tick: number, delay_ticks: number) {
    const target_tick = current_tick - delay_ticks;
    if (target_tick < 0) {
      return null;
    }
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].tick <= target_tick) {
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
  particle_data: any[];
  memory_data: any[];
  leader_history: any[];
  tick: number;
  current_leader: Particle | null;
  leader_peak_weight: number;

  constructor(
    params: any,
    alpha = 1.0,
    beta = 1.0,
    epsilon = 1e-9,
    theta_f = 0.5,
    theta_a = 0.1,
    theta_gen = 1.2,
    rho_min = 0.5,
    decay = 0.95,
    coupling_gain = 0.05,
    dt = 0.1
  ) {
    this.params = params;
    this.alpha = alpha;
    this.beta = beta;
    this.epsilon = epsilon;
    this.theta_f = theta_f;
    this.theta_a = theta_a;
    this.theta_gen = theta_gen;
    this.rho_min = rho_min;
    this.decay = decay;
    this.coupling_gain = coupling_gain;
    this.dt = dt;

    this.particles = this._initialize_big_bang();
    this.event_memory = {};
    this.particle_data = [];
    this.memory_data = [];
    this.leader_history = [];
    this.tick = 0;
    this.current_leader = null;
    this.leader_peak_weight = 0.0;
  }

  _initialize_big_bang() {
    const p1 = new Particle(
      [0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0],
      1.0,
      0.0,
      1.0,
      1.0
    );
    const p2 = new Particle(
      [0.01, 0.01, 0.01],
      [0.0, 0.0, 0.0],
      1.0,
      Math.PI,
      1.0,
      -1.0
    );
    return [p1, p2];
  }

  _local_metrics(p: Particle, all_particles: Particle[]) {
    const r = 5.0;
    const neighbors = all_particles.filter(q => q !== p && norm(sub(p.x, q.x)) < r);
    const rho = neighbors.length;

    let delta_pt = 0.0;
    let delta_f = 0.0;

    if (neighbors.length > 0) {
      delta_pt = mean(neighbors.map(q => Math.abs(p.pt - q.pt)));
      delta_f = mean(neighbors.map(q => Math.abs(p.f - q.f)));
    }

    const f_local = Math.pow(rho + this.epsilon, this.alpha) * 
                    Math.pow(delta_pt + this.epsilon, this.beta) * 
                    Math.pow(delta_f + this.epsilon, 0.5);
    
    return { rho, delta_pt, delta_f, f_local };
  }

  _contextual_weight(p: Particle, all_particles: Particle[]) {
    const { f_local } = this._local_metrics(p, all_particles);
    const charge_factor = 1.0 + 0.5 * Math.abs(p.charge);
    
    // O Acoplamento Extremamente Próximo (Nascimento dos Átomos)
    // A distância pequena faz o 1/d explodir, forçando a liderança e o acoplamento.
    let min_d = Infinity;
    for (const q of all_particles) {
      if (p === q) continue;
      const d = norm(sub(p.x, q.x));
      if (d < min_d) min_d = d;
    }
    const distance_factor = min_d === Infinity ? 1.0 : 1.0 / (min_d + this.epsilon);

    return p.pt * distance_factor * f_local * charge_factor;
  }

  _select_leader(all_particles: Particle[]) {
    let leader = all_particles[0];
    let max_weight = this._contextual_weight(leader, all_particles);

    for (let i = 1; i < all_particles.length; i++) {
      const weight = this._contextual_weight(all_particles[i], all_particles);
      if (weight > max_weight) {
        max_weight = weight;
        leader = all_particles[i];
      }
    }

    const wc_leader = max_weight;

    if (this.current_leader !== leader) {
      if (this.current_leader !== null && this.leader_peak_weight > 1e-6) {
        this.leader_history.push({
          tick: this.tick,
          leader_id: this.current_leader.id,
          peak_weight: this.leader_peak_weight
        });
      }
      this.current_leader = leader;
      this.leader_peak_weight = wc_leader;
    } else {
      if (wc_leader > this.leader_peak_weight) {
        this.leader_peak_weight = wc_leader;
      }
    }

    return leader;
  }

  _process_stimulus(leader: Particle) {
    leader.phi = (leader.phi + 0.1) % (2 * Math.PI);
    leader.f = leader.f * (1.0 + 0.001);
    leader._update_state_vector();
    return [...leader.s];
  }

  _should_couple(p: Particle, q: Particle) {
    const delta_f = Math.abs(p.f - q.f);
    const s1 = p.s;
    const s2 = q.s;
    const norm1 = norm(s1) + this.epsilon;
    const norm2 = norm(s2) + this.epsilon;
    const alignment = dot(s1, s2) / (norm1 * norm2);
    const charge_factor = (p.charge * q.charge >= 0) ? 1.0 : 1.5;
    return (delta_f < this.theta_f * charge_factor) && (alignment > this.theta_a);
  }

  _redistribute(leader: Particle, result: number[], coupled: Particle[]) {
    leader.pt += this.coupling_gain * (1 + 0.1 * coupled.length);
    leader.connections += coupled.length;

    for (const p of coupled) {
      p.phi = (p.phi + 0.05) % (2 * Math.PI);
      p.f = p.f * (1.0 + 0.0005);
      p._update_state_vector();
      p.pt += this.coupling_gain;
      p.connections += 1;
    }

    let total_pt = 0;
    for (const p of this.particles) {
      total_pt += p.pt;
    }

    if (total_pt > 0) {
      for (const p of this.particles) {
        p.pt = (p.pt / total_pt) * this.particles.length;
        p.s[0] = p.pt;
      }
    }
  }

  _update_memory(leader: Particle, wc_leader: number) {
    for (const key of Object.keys(this.event_memory)) {
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

  _update_motion() {
    for (const p of this.particles) {
      const speed = norm(p.v);
      if (speed > this.params.C) {
        p.v = mul(div(p.v, speed), this.params.C);
      }
      p.x = add(p.x, mul(p.v, this.dt));
      p.x = mul(p.x, 1.0 + this.params.LAMBDA);
    }
  }

  _quantize_persistence() {
    for (const p of this.particles) {
      if (p.pt < this.params.H) {
        p.pt = this.params.H;
        p.s[0] = p.pt;
      }
    }
  }

  _continuous_genesis() {
    if (this.tick < 5) {
      return;
    }

    const novas: Particle[] = [];
    for (const p of this.particles) {
      const { rho } = this._local_metrics(p, this.particles);
      if (p.pt > this.theta_gen && rho > this.rho_min && Math.random() < 0.05) {
        const new_x = add(p.x, mul(randnArray(3), 0.1));
        const new_v = mul(randnArray(3), 0.01);
        const new_pt = 0.5;
        const new_phi = Math.random() * 2 * Math.PI;
        const new_f = p.f * (1 + randn() * 0.1);
        const new_charge = Math.random() < 0.5 ? -1.0 : 1.0;
        novas.push(new Particle(new_x, new_v, new_pt, new_phi, new_f, new_charge));
      }
    }

    this.particles.push(...novas);

    if (this.particles.length > 200) {
      this.particles.sort((a, b) => a.pt - b.pt);
      this.particles = this.particles.slice(this.particles.length - 150);
    }
  }

  _emergent_acceleration() {
    const accelerations: Map<Particle, number[]> = new Map();
    
    if (this.particles.length < 2) {
      for (const p of this.particles) {
        accelerations.set(p, [0, 0, 0]);
      }
      return accelerations;
    }

    for (const p of this.particles) {
      let force = [0, 0, 0];
      for (const q of this.particles) {
        if (p === q) continue;

        if (!this._should_couple(p, q)) continue;

        const d = norm(sub(p.x, q.x)) + this.epsilon;
        const delay_seconds = d / this.params.C;
        const delay_ticks = Math.floor(delay_seconds / this.dt) + 1;

        const q_past_state = q.get_state_at_time(this.tick, delay_ticks);
        let q_past_pt: number;
        let q_past_x: number[];

        if (q_past_state === null) {
          q_past_pt = q.pt;
          q_past_x = q.x;
        } else {
          q_past_pt = q_past_state.pt;
          q_past_x = q_past_state.x;
        }

        const delta_pt = q_past_pt - p.pt;
        const direction = sub(p.x, q_past_x);
        force = add(force, mul(direction, delta_pt));
      }

      accelerations.set(p, div(force, p.pt + this.epsilon));
    }

    return accelerations;
  }

  run_tick() {
    this.tick += 1;

    for (const p of this.particles) {
      p.save_state(this.tick);
    }

    for (const p of this.particles) {
      p.connections = 0;
    }

    const leader = this._select_leader(this.particles);
    const wc_leader = this._contextual_weight(leader, this.particles);

    const result = this._process_stimulus(leader);

    const coupled = this.particles.filter(p => p !== leader && this._should_couple(p, leader));

    this._redistribute(leader, result, coupled);

    this._update_memory(leader, wc_leader);

    const acc = this._emergent_acceleration();
    for (const p of this.particles) {
      const a = acc.get(p) || [0, 0, 0];
      p.v = add(p.v, mul(a, this.dt));
    }

    this._update_motion();

    this._quantize_persistence();

    this._continuous_genesis();

    // Only keep the last tick data to prevent memory leaks in the browser
    // We can emit events or just keep a small buffer if needed.
    // For now, we will just keep the latest state to render.
    this.particle_data = [{
      tick: this.tick,
      positions: this.particles.map(p => [...p.x]),
      velocities: this.particles.map(p => [...p.v]),
      accelerations: this.particles.map(p => [...(acc.get(p) || [0, 0, 0])]),
      persistences: this.particles.map(p => p.pt),
      frequencies: this.particles.map(p => p.f),
      charges: this.particles.map(p => p.charge)
    }];

    this.memory_data = [{
      tick: this.tick,
      events: Object.keys(this.event_memory).map(k => ({
        interaction: k,
        weight: this.event_memory[k].weight
      })),
      current_leader_id: leader.id,
      current_leader_weight: wc_leader,
      leader_peak_weight: this.leader_peak_weight
    }];
  }
}
