export function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface EngineParams {
  C: number;
  H: number;
  LAMBDA: number;
}

export class PureEmergenceEngine {
  C: number;
  H: number;
  LAMBDA: number;

  alpha: number;
  beta: number;
  epsilon: number;
  theta_f: number;
  theta_a: number;
  theta_gen: number;
  rho_min: number;
  coupling_gain: number;
  dt: number;

  MAX_P: number;
  H_SIZE: number;

  active: boolean[];
  X: Float64Array;
  V: Float64Array;
  PT: Float64Array;
  PHI: Float64Array;
  F: Float64Array;
  CHARGE: Float64Array;

  hist_X: Float64Array;
  hist_PT: Float64Array;

  tick: number;

  constructor(
    params: EngineParams,
    alpha = 1.0,
    beta = 1.0,
    epsilon = 1e-9,
    theta_f = 0.5,
    theta_a = 0.1,
    theta_gen = 1.2,
    rho_min = 0.5,
    coupling_gain = 0.05,
    dt = 0.1,
    max_particles = 500,
    history_size = 2000
  ) {
    this.C = params.C;
    this.H = params.H;
    this.LAMBDA = params.LAMBDA;

    this.alpha = alpha;
    this.beta = beta;
    this.epsilon = epsilon;
    this.theta_f = theta_f;
    this.theta_a = theta_a;
    this.theta_gen = theta_gen;
    this.rho_min = rho_min;
    this.coupling_gain = coupling_gain;
    this.dt = dt;

    this.MAX_P = max_particles;
    this.H_SIZE = history_size;

    this.active = new Array(this.MAX_P).fill(false);
    this.X = new Float64Array(this.MAX_P * 3);
    this.V = new Float64Array(this.MAX_P * 3);
    this.PT = new Float64Array(this.MAX_P);
    this.PHI = new Float64Array(this.MAX_P);
    this.F = new Float64Array(this.MAX_P);
    this.CHARGE = new Float64Array(this.MAX_P);

    this.hist_X = new Float64Array(this.H_SIZE * this.MAX_P * 3);
    this.hist_PT = new Float64Array(this.H_SIZE * this.MAX_P);

    this.tick = 0;
    this._big_bang();
  }

  _big_bang() {
    this.active[0] = true;
    this.active[1] = true;

    // Perturbation A
    this.X[0] = 0.0; this.X[1] = 0.0; this.X[2] = 0.0;
    this.PT[0] = 1.0; this.PHI[0] = 0.0; this.F[0] = 1.0; this.CHARGE[0] = 1.0;

    // Perturbation B
    this.X[3] = 0.1; this.X[4] = 0.1; this.X[5] = 0.0;
    this.PT[1] = 1.0; this.PHI[1] = Math.PI; this.F[1] = 1.0; this.CHARGE[1] = -1.0;
  }

  step() {
    this.tick++;

    // 1. Gravação no Espaço-Tempo
    const h_idx = this.tick % this.H_SIZE;
    const h_offset_X = h_idx * this.MAX_P * 3;
    const h_offset_PT = h_idx * this.MAX_P;

    for (let i = 0; i < this.MAX_P; i++) {
      if (this.active[i]) {
        this.hist_X[h_offset_X + i * 3] = this.X[i * 3];
        this.hist_X[h_offset_X + i * 3 + 1] = this.X[i * 3 + 1];
        this.hist_X[h_offset_X + i * 3 + 2] = this.X[i * 3 + 2];
        this.hist_PT[h_offset_PT + i] = this.PT[i];
      }
    }

    const act: number[] = [];
    for (let i = 0; i < this.MAX_P; i++) {
      if (this.active[i]) act.push(i);
    }
    const N = act.length;
    if (N < 2) return;

    // 2. Topologia Local
    const D = new Float64Array(N * N);
    const neighbors_mask = new Uint8Array(N * N);
    const rho = new Int32Array(N);

    for (let i = 0; i < N; i++) {
      const idx_i = act[i];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const idx_j = act[j];
        const dx = this.X[idx_i * 3] - this.X[idx_j * 3];
        const dy = this.X[idx_i * 3 + 1] - this.X[idx_j * 3 + 1];
        const dz = this.X[idx_i * 3 + 2] - this.X[idx_j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        D[i * N + j] = dist;
        if (dist < 5.0) {
          neighbors_mask[i * N + j] = 1;
          rho[i]++;
        }
      }
    }

    const delta_pt = new Float64Array(N);
    const delta_f = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      if (rho[i] > 0) {
        let sum_pt = 0;
        let sum_f = 0;
        const idx_i = act[i];
        for (let j = 0; j < N; j++) {
          if (neighbors_mask[i * N + j]) {
            const idx_j = act[j];
            sum_pt += Math.abs(this.PT[idx_i] - this.PT[idx_j]);
            sum_f += Math.abs(this.F[idx_i] - this.F[idx_j]);
          }
        }
        delta_pt[i] = sum_pt / rho[i];
        delta_f[i] = sum_f / rho[i];
      }
    }

    const Wc = new Float64Array(N);
    let local_leader = 0;
    let max_Wc = -Infinity;

    for (let i = 0; i < N; i++) {
      const idx_i = act[i];
      const f_local = Math.pow(rho[i] + this.epsilon, this.alpha) *
                      Math.pow(delta_pt[i] + this.epsilon, this.beta) *
                      Math.pow(delta_f[i] + this.epsilon, 0.5);
      
      Wc[i] = this.PT[idx_i] * f_local * (1.0 + 0.5 * Math.abs(this.CHARGE[idx_i]));
      if (Wc[i] > max_Wc) {
        max_Wc = Wc[i];
        local_leader = i;
      }
    }

    const global_leader = act[local_leader];

    // 3. O Pulso do Líder
    this.PHI[global_leader] = (this.PHI[global_leader] + 0.1) % (2 * Math.PI);
    this.F[global_leader] *= 1.001;

    // 4. Ressonância
    const norms = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const idx = act[i];
      norms[i] = Math.sqrt(this.PT[idx]*this.PT[idx] + this.PHI[idx]*this.PHI[idx] + this.F[idx]*this.F[idx]) + this.epsilon;
    }

    const couple_all = new Uint8Array(N * N);
    let num_coupled_to_leader = 0;

    for (let i = 0; i < N; i++) {
      const idx_i = act[i];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const idx_j = act[j];
        
        const dot = this.PT[idx_i]*this.PT[idx_j] + this.PHI[idx_i]*this.PHI[idx_j] + this.F[idx_i]*this.F[idx_j];
        const align = dot / (norms[i] * norms[j]);
        const df = Math.abs(this.F[idx_i] - this.F[idx_j]);
        const cf = (this.CHARGE[idx_i] * this.CHARGE[idx_j] >= 0) ? 1.0 : 1.5;

        if (df < this.theta_f * cf && align > this.theta_a) {
          couple_all[i * N + j] = 1;
          if (i === local_leader) num_coupled_to_leader++;
        }
      }
    }

    // 5. Termodinâmica Emergente
    if (num_coupled_to_leader > 0) {
      this.PT[global_leader] += this.coupling_gain * (1 + 0.1 * num_coupled_to_leader);
      for (let j = 0; j < N; j++) {
        if (couple_all[local_leader * N + j]) {
          const idx_j = act[j];
          this.PHI[idx_j] = (this.PHI[idx_j] + 0.05) % (2 * Math.PI);
          this.F[idx_j] *= 1.0005;
          this.PT[idx_j] += this.coupling_gain;
        }
      }
    }

    let total_pt = 0;
    for (let i = 0; i < N; i++) total_pt += this.PT[act[i]];
    if (total_pt > 0) {
      for (let i = 0; i < N; i++) {
        this.PT[act[i]] = (this.PT[act[i]] / total_pt) * N;
      }
    }

    // 6. Aceleração Emergente
    const acc = new Float64Array(N * 3);

    for (let i = 0; i < N; i++) {
      const idx_i = act[i];
      let force_x = 0, force_y = 0, force_z = 0;

      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const idx_j = act[j];

        const delay_seconds = D[i * N + j] / this.C;
        const delay_ticks = Math.floor(delay_seconds / this.dt) + 1;
        const target_ticks = this.tick - delay_ticks;

        let q_past_pt = this.PT[idx_j];
        let q_past_x = this.X[idx_j * 3];
        let q_past_y = this.X[idx_j * 3 + 1];
        let q_past_z = this.X[idx_j * 3 + 2];

        if (target_ticks >= 0) {
          const hist_idx = target_ticks % this.H_SIZE;
          q_past_pt = this.hist_PT[hist_idx * this.MAX_P + idx_j];
          q_past_x = this.hist_X[hist_idx * this.MAX_P * 3 + idx_j * 3];
          q_past_y = this.hist_X[hist_idx * this.MAX_P * 3 + idx_j * 3 + 1];
          q_past_z = this.hist_X[hist_idx * this.MAX_P * 3 + idx_j * 3 + 2];
        }

        const delta_pt_acc = q_past_pt - this.PT[idx_i];
        const dir_x = this.X[idx_i * 3] - q_past_x;
        const dir_y = this.X[idx_i * 3 + 1] - q_past_y;
        const dir_z = this.X[idx_i * 3 + 2] - q_past_z;

        if (couple_all[i * N + j]) {
          force_x += delta_pt_acc * dir_x;
          force_y += delta_pt_acc * dir_y;
          force_z += delta_pt_acc * dir_z;
        }
      }

      const pt_eps = this.PT[idx_i] + this.epsilon;
      acc[i * 3] = force_x / pt_eps;
      acc[i * 3 + 1] = force_y / pt_eps;
      acc[i * 3 + 2] = force_z / pt_eps;
    }

    // 7. Atualização do Espaço
    for (let i = 0; i < N; i++) {
      const idx = act[i];
      
      this.V[idx * 3] += acc[i * 3] * this.dt;
      this.V[idx * 3 + 1] += acc[i * 3 + 1] * this.dt;
      this.V[idx * 3 + 2] += acc[i * 3 + 2] * this.dt;

      const speed = Math.sqrt(
        this.V[idx * 3]*this.V[idx * 3] + 
        this.V[idx * 3 + 1]*this.V[idx * 3 + 1] + 
        this.V[idx * 3 + 2]*this.V[idx * 3 + 2]
      );

      if (speed > this.C) {
        this.V[idx * 3] = (this.V[idx * 3] / speed) * this.C;
        this.V[idx * 3 + 1] = (this.V[idx * 3 + 1] / speed) * this.C;
        this.V[idx * 3 + 2] = (this.V[idx * 3 + 2] / speed) * this.C;
      }

      this.X[idx * 3] += this.V[idx * 3] * this.dt;
      this.X[idx * 3 + 1] += this.V[idx * 3 + 1] * this.dt;
      this.X[idx * 3 + 2] += this.V[idx * 3 + 2] * this.dt;

      this.X[idx * 3] *= (1.0 + this.LAMBDA);
      this.X[idx * 3 + 1] *= (1.0 + this.LAMBDA);
      this.X[idx * 3 + 2] *= (1.0 + this.LAMBDA);
    }

    // 8. Limite Quântico
    for (let i = 0; i < N; i++) {
      const idx = act[i];
      if (this.PT[idx] < this.H) this.PT[idx] = this.H;
    }

    // 9. Gênese (Flutuação do Vácuo)
    if (this.tick >= 5) {
      const parents: number[] = [];
      for (let i = 0; i < N; i++) {
        const idx = act[i];
        if (this.PT[idx] > this.theta_gen && rho[i] > this.rho_min && Math.random() < 0.05) {
          parents.push(idx);
        }
      }

      if (parents.length > 0) {
        const inactive: number[] = [];
        for (let i = 0; i < this.MAX_P; i++) {
          if (!this.active[i]) inactive.push(i);
        }

        const num_to_create = Math.min(parents.length, inactive.length);
        for (let i = 0; i < num_to_create; i++) {
          const p_idx = parents[i];
          const new_idx = inactive[i];

          this.active[new_idx] = true;
          this.X[new_idx * 3] = this.X[p_idx * 3] + randn() * 0.1;
          this.X[new_idx * 3 + 1] = this.X[p_idx * 3 + 1] + randn() * 0.1;
          this.X[new_idx * 3 + 2] = this.X[p_idx * 3 + 2] + randn() * 0.1;

          this.V[new_idx * 3] = randn() * 0.01;
          this.V[new_idx * 3 + 1] = randn() * 0.01;
          this.V[new_idx * 3 + 2] = randn() * 0.01;

          this.PT[new_idx] = 0.5;
          this.PHI[new_idx] = Math.random() * 2 * Math.PI;
          this.F[new_idx] = this.F[p_idx] * (1 + randn() * 0.1);
          this.CHARGE[new_idx] = Math.random() < 0.5 ? -1.0 : 1.0;
        }
      }

      // Colapso gravitacional / Culling
      let current_active_count = 0;
      for (let i = 0; i < this.MAX_P; i++) {
        if (this.active[i]) current_active_count++;
      }

      if (current_active_count > this.MAX_P * 0.8) {
        const active_with_pt = [];
        for (let i = 0; i < this.MAX_P; i++) {
          if (this.active[i]) active_with_pt.push({ idx: i, pt: this.PT[i] });
        }
        active_with_pt.sort((a, b) => b.pt - a.pt); // Descending
        
        // Keep top 100
        for (let i = 100; i < active_with_pt.length; i++) {
          this.active[active_with_pt[i].idx] = false;
        }
      }
    }
  }
}
