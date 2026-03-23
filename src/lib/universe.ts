import { Particle, Stimulus, Vector2, C, H, LAMBDA } from './physics';

export class Universe {
  particles: Particle[] = [];
  stimuli: Stimulus[] = [];
  width: number;
  height: number;
  userIndex: number = 0;

  constructor(width: number, height: number, numParticles: number = 300) {
    this.width = width;
    this.height = height;
    
    // Create user particle in the center
    this.particles.push(new Particle(width / 2, height / 2, true));
    
    for (let i = 1; i < numParticles; i++) {
      this.particles.push(new Particle(Math.random() * width, Math.random() * height));
    }
  }

  tick() {
    // 1. Update basic intrinsic properties
    for (const p of this.particles) {
      p.updateFrequency();
      p.state = 'ISOLADO'; // Reset state
      p.contextualWeight = 0;
    }

    // 2. Manage Stimuli
    if (Math.random() < 0.05 && this.stimuli.length < 5) {
      // Spawn stimulus near user occasionally to ensure interaction
      const userPos = this.particles[this.userIndex].pos;
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 200;
      this.stimuli.push(new Stimulus(userPos.x + Math.cos(angle) * dist, userPos.y + Math.sin(angle) * dist));
    }

    for (let i = this.stimuli.length - 1; i >= 0; i--) {
      this.stimuli[i].life--;
      if (this.stimuli[i].life <= 0) {
        this.stimuli.splice(i, 1);
      }
    }

    // 3. Process Clusters and Leadership per Stimulus
    const RESONANCE_THRESHOLD = 0.5;
    const ALIGNMENT_THRESHOLD = 0.0; // Dot product > 0 means roughly same direction

    for (const stimulus of this.stimuli) {
      let cluster: Particle[] = [];
      
      // Find resonant particles
      for (const p of this.particles) {
        const dist = p.pos.clone().sub(stimulus.pos).mag();
        if (dist < 300) {
          const resonance = Math.abs(p.frequency - stimulus.frequency);
          if (resonance < RESONANCE_THRESHOLD) {
            cluster.push(p);
            // Calculate contextual weight: P(t) * (1/d) * scale (1)
            p.contextualWeight = p.p * (1 / Math.max(dist, 1));
          }
        }
      }

      if (cluster.length > 0) {
        // Elect leader
        let leader = cluster[0];
        for (const p of cluster) {
          if (p.contextualWeight > leader.contextualWeight) {
            leader = p;
          }
        }

        leader.state = 'LIDERANDO';
        
        // Leader processes stimulus (moves towards it, gains memory)
        const dirToStimulus = stimulus.pos.clone().sub(leader.pos).normalize();
        leader.vel.add(dirToStimulus.mult(0.5));
        leader.addMemory(leader.contextualWeight, stimulus.frequency);

        // Calculate total P(t) to conserve
        let totalP = 0;
        let coupledParticles: Particle[] = [];

        for (const p of cluster) {
          if (p === leader) {
            totalP += p.p;
            coupledParticles.push(p);
            continue;
          }

          // Voluntary coupling: check internal vector alignment with leader
          const alignment = p.vel.clone().normalize().dot(leader.vel.clone().normalize());
          if (alignment > ALIGNMENT_THRESHOLD) {
            p.state = 'ACOPLADO';
            totalP += p.p;
            coupledParticles.push(p);
            
            // Passive coupling: align velocity with leader
            p.vel.add(leader.vel.clone().mult(0.1));
            p.addMemory(p.contextualWeight * 0.5, stimulus.frequency);
          }
        }

        // Redistribute P(t) conserving totalP
        if (coupledParticles.length === 1) {
          leader.p = totalP;
        } else if (coupledParticles.length > 1) {
          const leaderTargetP = (totalP / coupledParticles.length) * 1.5;
          const othersTargetP = (totalP - leaderTargetP) / (coupledParticles.length - 1);
          
          for (const p of coupledParticles) {
            if (p === leader) {
              p.p = p.p * 0.9 + leaderTargetP * 0.1;
            } else {
              p.p = p.p * 0.9 + othersTargetP * 0.1;
            }
          }
          
          // Force strict conservation after smoothing
          let newTotalP = coupledParticles.reduce((sum, p) => sum + p.p, 0);
          const correction = totalP / newTotalP;
          for (const p of coupledParticles) {
            p.p *= correction;
          }
        }
      }
    }

    // 4. Update all particles
    for (const p of this.particles) {
      if (p.state === 'ISOLADO') {
        // Isolation penalty
        p.p -= LAMBDA;
      }

      // Spatial expansion
      p.pos.x += (p.pos.x - this.width / 2) * LAMBDA;
      p.pos.y += (p.pos.y - this.height / 2) * LAMBDA;

      // Enforce limits
      if (p.p < H) p.p = H;
      
      p.vel.limit(C);
      p.pos.add(p.vel);

      // Wrap around universe bounds (toroidal space)
      if (p.pos.x < 0) p.pos.x += this.width;
      if (p.pos.x > this.width) p.pos.x -= this.width;
      if (p.pos.y < 0) p.pos.y += this.height;
      if (p.pos.y > this.height) p.pos.y -= this.height;

      p.updateMemory();
    }
  }

  getUser() {
    return this.particles[this.userIndex];
  }
}
