import { Particle, UniverseState } from './types';
import { UniverseEngine } from './UniverseEngine';

export interface DocumentaryRegion {
  id: string;
  particles: Particle[];
  significance: number;
  center: { x: number; y: number };
}

export class LazyDocumentary {
  private universe: UniverseEngine;
  private lastRenderTick: number = 0;
  private cache: Record<string, any> = {};

  constructor(universe: UniverseEngine) {
    this.universe = universe;
  }

  getInterestingRegions(): DocumentaryRegion[] {
    const tick = this.universe.state.tick;
    const changedParticles = this.universe.particles.filter(p => p.lastActiveTick > this.lastRenderTick);
    
    // Cluster by proximity (simple grid-based clustering)
    const regions: Record<string, DocumentaryRegion> = {};
    const GRID_SIZE = 100;

    for (const p of changedParticles) {
      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (!regions[key]) {
        regions[key] = { id: key, particles: [], significance: 0, center: { x: gx * GRID_SIZE, y: gy * GRID_SIZE } };
      }
      regions[key].particles.push(p);
      regions[key].significance += p.weight * (p.isMetabolizing ? 2 : 1) + (p.isReplicating ? 5 : 0);
    }

    return Object.values(regions).filter(r => r.significance > 50);
  }

  render() {
    const regions = this.getInterestingRegions();
    if (regions.length === 0) return null;

    this.lastRenderTick = this.universe.state.tick;

    return regions.map(r => ({
      region: r,
      detailLevel: this.calculateDetailLevel(r.significance),
      particles: r.particles
    }));
  }

  calculateDetailLevel(significance: number): 'ultra' | 'high' | 'medium' | 'low' | 'none' {
    if (significance > 900) return 'ultra';
    if (significance > 400) return 'high';
    if (significance > 200) return 'medium';
    if (significance > 50) return 'low';
    return 'none';
  }

  getMetrics() {
    const totalParticles = this.universe.particles.length;
    const renderedParticles = this.getInterestingRegions().reduce((sum, r) => sum + r.particles.length, 0);
    const economy = totalParticles > 0 ? ((totalParticles - renderedParticles) / totalParticles * 100).toFixed(1) : '100.0';
    
    return {
      economy: `${economy}%`,
      event: 'Replicação', // Placeholder
      nextScan: this.universe.state.tick + 3
    };
  }
}
