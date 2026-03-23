import { Particle, Stimulus, Cluster, SimulationState } from "./types";

export function createInitialState(numParticles: number, width: number, height: number): SimulationState {
  const particles: Particle[] = Array.from({ length: numParticles }, (_, i) => ({
    id: `p-${i}`,
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() * 2 - 1) * 2,
    vy: (Math.random() * 2 - 1) * 2,
    pt: Math.random() * 100 + 10,
    charge: Math.random() * 2 - 1,
    phase: Math.random() * Math.PI * 2,
    isUser: i === 0,
    memory: [],
  }));

  const stimuli: Stimulus[] = [
    {
      id: "s-1",
      x: width / 2,
      y: height / 2,
      scaleRelevance: 1.5,
      frequency: 50,
      vector: { x: 1, y: 0 },
    },
  ];

  return {
    particles,
    stimuli,
    clusters: [],
    tick: 0,
    lambda: 0.001, // Expansion
    c: 100,        // Max frequency
    h: 1,          // Min memory weight
    resonanceThreshold: 0.1,
    alignmentThreshold: 0.7,
    dissipationRate: 0.05,
    influenceRadius: 50,
  };
}

export function tick(state: SimulationState, width: number, height: number, userPos?: { x: number, y: number }): SimulationState {
  const { lambda, c, h, resonanceThreshold, dissipationRate, influenceRadius } = state;
  let newParticles = [...state.particles];
  const newStimuli = [...state.stimuli];
  const newTick = state.tick + 1;

  // 1. Update User Particle if exists
  if (userPos) {
    newParticles = newParticles.map(p => {
      if (p.isUser) {
        return { ...p, x: userPos.x, y: userPos.y, vx: 0, vy: 0 };
      }
      return p;
    });
  }

  // 2. Expand space (Λ)
  const centerX = width / 2;
  const centerY = height / 2;
  newParticles = newParticles.map(p => {
    if (p.isUser) return p;
    return {
      ...p,
      x: centerX + (p.x - centerX) * (1 + lambda),
      y: centerY + (p.y - centerY) * (1 + lambda),
      // Reset transient flags
      isLeader: false,
      isInCluster: false,
      clusterId: undefined,
      isResonant: false,
      isAligned: false,
      contextualWeight: 0,
      frequency: Math.min(c, Math.abs(p.charge * p.pt * (1 + Math.sin(p.phase)))),
    };
  });

  // 3. Single Rule Interaction: Every particle feels stimuli
  newParticles = newParticles.map(p => {
    if (p.isUser) return p;

    let totalFX = 0;
    let totalFY = 0;
    let maxWeight = 0;

    newStimuli.forEach(s => {
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // contextualWeight = P(t) * (1 / dist) * scale_relevance
      const weight = p.pt * (1 / dist) * s.scaleRelevance;
      
      // resonance = 1 - abs(p.frequency - s.frequency) / c
      const resonance = Math.max(0, 1 - Math.abs(p.frequency! - s.frequency) / c);
      
      // Force = Direction * Weight * Resonance
      const isLatent = resonance < resonanceThreshold;

      if (!isLatent) {
        totalFX += (dx / dist) * weight * resonance * 0.1;
        totalFY += (dy / dist) * weight * resonance * 0.1;
        
        if (weight > maxWeight) {
          maxWeight = weight;
          p.contextualWeight = weight;
          p.isResonant = true;
          p.isLatent = false;
          p.amplitude = 1.0;
        }
      } else {
        // Lazy: Minimal drift when latent
        totalFX += (Math.random() - 0.5) * 0.01;
        totalFY += (Math.random() - 0.5) * 0.01;
        p.isLatent = true;
        p.amplitude = 0.1;
      }
    });

    // Update velocity
    const newVX = p.vx + totalFX;
    const newVY = p.vy + totalFY;
    
    // Friction/Damping
    const damping = 0.98;

    return {
      ...p,
      vx: newVX * damping,
      vy: newVY * damping,
    };
  });

  // 4. Update Positions
  newParticles = newParticles.map(p => {
    if (p.isUser) return p;
    
    // Boundary check
    let nextX = p.x + p.vx;
    let nextY = p.y + p.vy;
    let nextVX = p.vx;
    let nextVY = p.vy;

    if (nextX < 0 || nextX > width) nextVX *= -0.5;
    if (nextY < 0 || nextY > height) nextVY *= -0.5;

    return {
      ...p,
      x: Math.max(0, Math.min(width, nextX)),
      y: Math.max(0, Math.min(height, nextY)),
      vx: nextVX,
      vy: nextVY,
    };
  });

  // 5. Cluster formation (by proximity) - for visualization
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < newParticles.length; i++) {
    const p1 = newParticles[i];
    if (assigned.has(p1.id)) continue;

    const clusterParticles: Particle[] = [p1];
    assigned.add(p1.id);

    for (let j = i + 1; j < newParticles.length; j++) {
      const p2 = newParticles[j];
      if (assigned.has(p2.id)) continue;

      const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      if (dist < influenceRadius) {
        clusterParticles.push(p2);
        assigned.add(p2.id);
      }
    }

    if (clusterParticles.length > 1) {
      const clusterId = `c-${clusters.length}`;
      clusterParticles.forEach(p => {
        p.isInCluster = true;
        p.clusterId = clusterId;
      });
      clusters.push({
        id: clusterId,
        particleIds: clusterParticles.map(p => p.id),
      });
    }
  }

  // 6. Update memories & Structural limits
  newParticles = newParticles.map(p => {
    // Dissipate memories
    const newMemory = p.memory
      .map(m => ({ ...m, weight: m.weight * (1 - dissipationRate) }))
      .filter(m => m.weight >= h);

    return {
      ...p,
      memory: newMemory,
      phase: (p.phase + 0.1) % (Math.PI * 2), // Update phase
    };
  });

  return {
    ...state,
    particles: newParticles,
    stimuli: newStimuli,
    clusters,
    tick: newTick,
  };
}
