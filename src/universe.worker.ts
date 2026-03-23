import { Universe } from './lib/universe';

let universe: Universe | null = null;
let tickInterval: number | null = null;
let userParticleId: number | null = null;

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'INIT') {
    universe = new Universe();
    // Escolhe uma partícula aleatória para ser o "usuário"
    if (universe.particles.length > 0) {
      userParticleId = universe.particles[0].id;
    }

    if (tickInterval) clearInterval(tickInterval);
    
    tickInterval = self.setInterval(() => {
      if (!universe) return;
      universe.tick();
      
      const userParticle = universe.particles.find(p => p.id === userParticleId) || universe.particles[0];
      const leader = universe.currentLeader;
      
      // Lazy Observation: Only send global metrics and user-particle sensations
      const renderState = {
        age: universe.tickCount,
        particleCount: universe.particles.length,
        totalPt: universe.particles.reduce((sum, p) => sum + p.pt, 0),
        userSensations: userParticle ? {
          id: userParticle.id,
          pt: userParticle.pt,
          f: userParticle.getFrequency(),
          wc: userParticle.contextualWeight,
          isLeader: leader?.id === userParticle.id,
          memories: userParticle.memories.slice(-5), // Últimas 5 memórias
          position: userParticle.position,
          internalVector: userParticle.internalVector
        } : null,
        leaderHistory: universe.leaderHistory.slice(-10)
      };

      self.postMessage({ type: 'STATE_UPDATE', payload: renderState });
    }, 1000 / 60); // 60 Ticks Per Second
  }
};
