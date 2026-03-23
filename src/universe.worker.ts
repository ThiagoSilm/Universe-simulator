import { Universe } from './lib/universe';
import { contextualWeight } from './lib/physics';

let universe: Universe | null = null;
let tickInterval: number | null = null;

self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'INIT') {
    universe = new Universe();
    if (tickInterval) clearInterval(tickInterval);
    
    tickInterval = self.setInterval(() => {
      if (!universe) return;
      universe.tick();
      
      const focalParticle = universe.currentLeader;
      
      const renderState = {
        age: universe.tickCount,
        particleCount: universe.particles.length,
        focalParticle: focalParticle ? {
          id: focalParticle.id,
          x: focalParticle.x.x,
          y: focalParticle.x.y,
          z: focalParticle.x.z,
          pt: focalParticle.pt,
          f: focalParticle.f,
          charge: focalParticle.charge,
          connections: focalParticle.connections,
          wc: contextualWeight(focalParticle, universe.particles)
        } : null,
        particles: universe.particles.map(p => ({
          id: p.id,
          x: p.x.x,
          y: p.x.y,
          z: p.x.z,
          pt: p.pt,
          f: p.f,
          charge: p.charge,
          connections: p.connections,
          isLeader: p === focalParticle
        })),
        eventMemorySize: universe.eventMemory.size
      };

      self.postMessage({ type: 'STATE_UPDATE', payload: renderState });
    }, 1000 / 60); // 60 Ticks Per Second
  }
};
