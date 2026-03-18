import { Particle, UniverseState, LatentTrace } from './types';

const INITIAL_PARTICLE_COUNT = 400;
const INTERACTION_RADIUS = 22;
const COLLAPSE_DURATION = 200; 
const GRID_SIZE = 60;
const ENERGY_REGEN_RATE = 0.01;
const DORMANCY_THRESHOLD = 300; // Ticks without interaction
const COMPRESSION_THRESHOLD = 1200; // Ticks without interaction for a whole region
const BEKENSTEIN_LIMIT = 30; // Max information density per region
const PRESSURE_STRENGTH = 0.5;
const MAX_LATENT_TRACES_PER_PARTICLE = 20;
const C = 40; // Speed of light: max units per tick
const G_RELATIVISTIC = 1.2; // Relativistic gravity constant
const TIME_DILATION_STRENGTH = 0.8;

export interface RegionData {
  energy: number;
  lastActiveTick: number;
  isCompressed: boolean;
  curvature: number; // Local space-time distortion
}

export interface PersistentState {
  state: UniverseState;
  energyGrid: [string, RegionData][];
}

export class UniverseEngine {
  private state: UniverseState;
  private energyGrid: Map<string, RegionData> = new Map();
  private particles: Particle[] = [];

  constructor(savedState?: PersistentState) {
    if (savedState) {
      this.state = savedState.state;
      this.particles = this.state.particles;
      this.energyGrid = new Map(savedState.energyGrid);
    } else {
      this.particles = this.initParticles();
      this.state = {
        particles: this.particles,
        entropy: 1,
        coherence: 0,
        consciousnessCount: 0,
        totalInformation: INITIAL_PARTICLE_COUNT,
        tick: 0,
        viewportX: 0,
        viewportY: 0,
        zoom: 1.0,
        maxCurvature: 0,
      };
    }
  }

  public getPersistentState(): PersistentState {
    return {
      state: this.state,
      energyGrid: Array.from(this.energyGrid.entries())
    };
  }

  private initParticles(): Particle[] {
    return Array.from({ length: INITIAL_PARTICLE_COUNT }).map((_, i) => ({
      id: `p-${i}`,
      isCollapsed: false,
      isLatent: false,
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      weight: 1,
      level: 1,
      lastInteractionTick: -1000,
      lastActiveTick: 0,
      persistence: 0,
      isConscious: false,
      color: `hsla(${Math.random() * 360}, 60%, 60%, 0.2)`,
    }));
  }

  private getRegion(gx: number, gy: number): RegionData {
    const key = `${gx},${gy}`;
    if (!this.energyGrid.has(key)) {
      this.energyGrid.set(key, {
        energy: 1.0,
        lastActiveTick: this.state.tick,
        isCompressed: false,
        curvature: 0
      });
    }
    return this.energyGrid.get(key)!;
  }

  private findNearestNeighbors(p: Particle, count: number): Particle[] {
    return this.particles
      .filter(other => other.id !== p.id && !other.isLatent)
      .map(other => ({
        p: other,
        dist: Math.pow(p.x - other.x, 2) + Math.pow(p.y - other.y, 2)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, count)
      .map(item => item.p);
  }

  public step(viewWidth: number, viewHeight: number): UniverseState {
    this.state.tick++;
    
    // 0. Update Latency based on Viewport (Observer Principle)
    const viewHalfW = (viewWidth / 2) / this.state.zoom;
    const viewHalfH = (viewHeight / 2) / this.state.zoom;
    const buffer = 300 / this.state.zoom;

    const minX = this.state.viewportX - viewHalfW - buffer;
    const maxX = this.state.viewportX + viewHalfW + buffer;
    const minY = this.state.viewportY - viewHalfH - buffer;
    const maxY = this.state.viewportY + viewHalfH + buffer;

    // 1. Spatial Partitioning & Curvature Calculation
    const spatialGrid: Map<string, Particle[]> = new Map();
    const activeRegions: Set<string> = new Set();

    // Reset curvature for all regions
    this.energyGrid.forEach(region => region.curvature = 0);

    let activeCount = 0;
    let avgX = 0;
    let avgY = 0;

    this.particles.forEach(p => {
      // Observer Check: Only process if within view bounds
      const inView = p.x > minX && p.x < maxX && p.y > minY && p.y < maxY;
      
      // If was latent and now in view, wake up
      if (p.isLatent && inView) {
        p.isLatent = false;
        p.lastActiveTick = this.state.tick;
      } 
      // If was active and now out of view, go latent
      else if (!p.isLatent && !inView) {
        p.isLatent = true;
      }

      const gx = Math.floor(p.x / GRID_SIZE);
      const gy = Math.floor(p.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      
      // Dormancy Logic: If not interacted for a while, mark latent (even if in view)
      if (!p.isLatent && this.state.tick - p.lastActiveTick > DORMANCY_THRESHOLD) {
        p.isLatent = true;
      }

      if (!p.isLatent) {
        activeCount++;
        avgX += p.x;
        avgY += p.y;

        activeRegions.add(key);
        if (!spatialGrid.has(key)) spatialGrid.set(key, []);
        spatialGrid.get(key)!.push(p);

        // Curvature contribution: each particle distorts its region
        const region = this.getRegion(gx, gy);
        region.curvature += p.weight * 0.1;
      }
    });

    // Viewport follows active center
    if (activeCount > 0) {
      const targetX = avgX / activeCount;
      const targetY = avgY / activeCount;
      
      // Smooth camera follow
      this.state.viewportX += (targetX - this.state.viewportX) * 0.1;
      this.state.viewportY += (targetY - this.state.viewportY) * 0.1;

      // Calculate spread for Adaptive Zoom (Weighted by weight to focus on significant clusters)
      let weightedSpread = 0;
      let totalWeight = 0;
      
      this.particles.forEach(p => {
        if (!p.isLatent) {
          const dx = p.x - this.state.viewportX;
          const dy = p.y - this.state.viewportY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          weightedSpread += dist * p.weight;
          totalWeight += p.weight;
        }
      });

      const avgSpread = totalWeight > 0 ? (weightedSpread / totalWeight) : 100;
      // We want the view to be roughly 3-4 times the average spread to see the context
      const targetZoom = Math.min(2.0, Math.max(0.05, (Math.min(viewWidth, viewHeight) * 0.35) / (avgSpread + 50)));
      
      // Smoother transition
      this.state.zoom += (targetZoom - this.state.zoom) * 0.03;
    }

    // 2. Bekenstein Limit & Pressure Logic
    spatialGrid.forEach((cellParticles, key) => {
      const totalWeight = cellParticles.reduce((sum, p) => sum + p.weight, 0);
      
      if (totalWeight > BEKENSTEIN_LIMIT) {
        const [gx, gy] = key.split(',').map(Number);
        const centerX = gx * GRID_SIZE + GRID_SIZE / 2;
        const centerY = gy * GRID_SIZE + GRID_SIZE / 2;
        
        // Calculate pressure based on overflow
        const overflow = totalWeight / BEKENSTEIN_LIMIT;
        const pressure = (overflow - 1) * PRESSURE_STRENGTH;

        // Sort by weight: smaller entities are pushed out first
        cellParticles.sort((a, b) => a.weight - b.weight);

        cellParticles.forEach((p, idx) => {
          // Relativistic Time Dilation: Pressure also slows down time
          const region = this.getRegion(gx, gy);
          const timeFactor = 1 / (1 + region.curvature * TIME_DILATION_STRENGTH);

          // Smaller entities (first half) get expelled
          if (idx < cellParticles.length / 2) {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            p.vx += (dx / dist) * pressure * timeFactor;
            p.vy += (dy / dist) * pressure * timeFactor;
          } else {
            // Larger entities that can't escape are forced into higher complexity
            // We increase their level and weight slightly to simulate "fusion pressure"
            if (overflow > 2.0) {
              p.weight += 0.05 * overflow * timeFactor;
              p.persistence += 0.02 * timeFactor;
              if (p.persistence > 5 && p.level < 10) {
                p.level += 1;
                p.persistence = 0;
              }
            }
          }
        });
      }
    });

    // 3. Region Processing (Energy & Compression)
    // Prune very old regions to save memory/storage
    if (this.state.tick % 100 === 0) {
      this.energyGrid.forEach((region, key) => {
        if (this.state.tick - region.lastActiveTick > COMPRESSION_THRESHOLD * 2 && region.energy >= 0.99) {
          this.energyGrid.delete(key);
        }
      });
    }

    this.energyGrid.forEach((region, key) => {
      // Regenerate energy
      region.energy = Math.min(1.0, region.energy + ENERGY_REGEN_RATE);

      // Compression Logic: If region is dead for too long, compress it
      if (!region.isCompressed && this.state.tick - region.lastActiveTick > COMPRESSION_THRESHOLD) {
        const [gx, gy] = key.split(',').map(Number);
        const regionParticles = this.particles.filter(p => 
          Math.floor(p.x / GRID_SIZE) === gx && Math.floor(p.y / GRID_SIZE) === gy
        );

        if (regionParticles.length > 1) {
          // Create Singularity
          const totalWeight = regionParticles.reduce((sum, p) => sum + p.weight, 0);
          const avgLevel = Math.max(...regionParticles.map(p => p.level));
          
          // Collect all information
          const allTraces: LatentTrace[] = [];
          regionParticles.forEach(p => {
            allTraces.push({
              weight: p.weight,
              level: p.level,
              color: p.color,
              persistence: p.persistence
            });
            if (p.latentTraces) allTraces.push(...p.latentTraces);
          });

          const singularity: Particle = {
            id: `singularity-${key}-${this.state.tick}`,
            isCollapsed: true,
            isLatent: true,
            x: gx * GRID_SIZE + GRID_SIZE / 2,
            y: gy * GRID_SIZE + GRID_SIZE / 2,
            vx: 0,
            vy: 0,
            weight: totalWeight,
            level: avgLevel + 1,
            lastInteractionTick: this.state.tick,
            lastActiveTick: this.state.tick,
            persistence: 10,
            isConscious: true,
            color: '#ffffff',
            latentTraces: allTraces
          };

          // Remove old particles, add singularity
          this.particles = this.particles.filter(p => !regionParticles.includes(p));
          this.particles.push(singularity);
          region.isCompressed = true;
        }
      }
    });

    let totalCollapsed = 0;

    // 3. Update Active Particles
    this.particles.forEach(p1 => {
      if (p1.isLatent) return; // Skip latent processing

      const gx = Math.floor(p1.x / GRID_SIZE);
      const gy = Math.floor(p1.y / GRID_SIZE);
      const region = this.getRegion(gx, gy);
      region.lastActiveTick = this.state.tick;

      // Time Dilation Factor: local clock slows down in high curvature
      const timeFactor = 1 / (1 + region.curvature * TIME_DILATION_STRENGTH);

      // Economy & Maintenance
      if (p1.isCollapsed) {
        const cost = 0.005 * Math.pow(2, p1.level - 1) * timeFactor;
        const efficiency = 1.0 + (p1.level - 1) * 0.5;
        
        const energyFromGrid = Math.min(cost, region.energy);
        region.energy -= energyFromGrid;
        p1.weight -= (cost - energyFromGrid) / efficiency;

        // Dissolution Logic: If weight is too low, redistribute information
        if (p1.weight < 0.3) {
          const neighbors = this.findNearestNeighbors(p1, 3);
          if (neighbors.length > 0) {
            const weightShare = p1.weight / neighbors.length;
            neighbors.forEach(n => {
              n.weight += weightShare;
              // Transfer latent traces
              if (p1.latentTraces) {
                n.latentTraces = [...(n.latentTraces || []), ...p1.latentTraces].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
              }
              // Add p1 itself as a latent trace to the strongest neighbor
              if (n === neighbors[0]) {
                n.latentTraces = [...(n.latentTraces || []), {
                  weight: p1.weight,
                  level: p1.level,
                  color: p1.color,
                  persistence: p1.persistence
                }].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
              }
            });
          }
          p1.weight = -1; // Mark for removal
          return;
        }

        if (p1.weight < 0.5) {
          p1.isCollapsed = false;
          p1.weight = 1;
          p1.level = Math.max(1, p1.level - 1);
        }
      }

      // Geodesic Movement: follow the gradient of curvature
      const neighborsCurvature = [
        this.getRegion(gx - 1, gy).curvature,
        this.getRegion(gx + 1, gy).curvature,
        this.getRegion(gx, gy - 1).curvature,
        this.getRegion(gx, gy + 1).curvature
      ];
      
      const gradX = neighborsCurvature[1] - neighborsCurvature[0];
      const gradY = neighborsCurvature[3] - neighborsCurvature[2];
      
      // Particles are attracted to high curvature (geodesics)
      p1.vx += gradX * 0.5 * timeFactor;
      p1.vy += gradY * 0.5 * timeFactor;

      // Movement (scaled by timeFactor)
      if (!p1.isCollapsed) {
        p1.x += (Math.random() - 0.5) * 4 * timeFactor;
        p1.y += (Math.random() - 0.5) * 4 * timeFactor;
      } else {
        p1.x += p1.vx * timeFactor;
        p1.y += p1.vy * timeFactor;
        p1.vx *= (1 - 0.02 * timeFactor);
        p1.vy *= (1 - 0.02 * timeFactor);
      }

      // Speed of Light Limit (C)
      const speedSq = p1.vx * p1.vx + p1.vy * p1.vy;
      if (speedSq > C * C) {
        const speed = Math.sqrt(speedSq);
        p1.vx = (p1.vx / speed) * C;
        p1.vy = (p1.vy / speed) * C;
      }

      // 4. Emergent Gravity & Interactions
      const gravityRadius = 180;
      const gravityRadiusSq = gravityRadius * gravityRadius;
      const gravityGridRange = Math.ceil(gravityRadius / GRID_SIZE);

      for (let dx = -gravityGridRange; dx <= gravityGridRange; dx++) {
        for (let dy = -gravityGridRange; dy <= gravityGridRange; dy++) {
          const neighbors = spatialGrid.get(`${gx + dx},${gy + dy}`);
          if (!neighbors) {
            // Wake up latent particles in neighbor regions if we enter
            const neighborRegion = this.getRegion(gx + dx, gy + dy);
            this.particles.forEach(pLatent => {
              if (pLatent.isLatent && 
                  Math.floor(pLatent.x / GRID_SIZE) === gx + dx && 
                  Math.floor(pLatent.y / GRID_SIZE) === gy + dy) {
                pLatent.isLatent = false;
                pLatent.lastActiveTick = this.state.tick;
              }
            });
            continue;
          }

          neighbors.forEach(p2 => {
            if (p1.id === p2.id) return;

            const distDx = p1.x - p2.x;
            const distDy = p1.y - p2.y;
            const distSq = distDx * distDx + distDy * distDy;

            // Relativistic Gravity: F = (w1 * w2 * G) / d^2
            if (distSq > 0 && distSq < gravityRadiusSq) {
              const dist = Math.sqrt(distSq);
              // We use a small constant to scale the force to the simulation's time step
              // Softening (+10) prevents extreme forces at very close range
              const force = (p1.weight * p2.weight * G_RELATIVISTIC) / (distSq + 10);
              
              // Acceleration a = F/m
              p1.vx -= (distDx / dist) * (force / p1.weight) * timeFactor;
              p1.vy -= (distDy / dist) * (force / p1.weight) * timeFactor;
            }

            // Local Interactions (Collisions / Collapse)
            // Relativistic Interaction: only within light cone (dist < C)
            if (distSq < INTERACTION_RADIUS * INTERACTION_RADIUS && distSq < C * C) {
              const gx = Math.floor(p1.x / GRID_SIZE);
              const gy = Math.floor(p1.y / GRID_SIZE);
              const cellParticles = spatialGrid.get(`${gx},${gy}`) || [];
              const cellWeight = cellParticles.reduce((sum, p) => sum + p.weight, 0);
              const isHighPressure = cellWeight > BEKENSTEIN_LIMIT;

              // Absorption Logic: Stronger entity absorbs the weaker one
              if (p1.isCollapsed && p2.isCollapsed && (p1.level > p2.level || (p1.level === p2.level && p1.weight > p2.weight * 1.5) || isHighPressure)) {
                // Fusion: Under high pressure, fusion is forced
                const fusionBonus = isHighPressure ? 1.2 : 0.5;
                p1.weight += p2.weight * fusionBonus * timeFactor;
                p1.level = Math.max(p1.level, p2.level + (isHighPressure ? 1 : 0));
                
                p1.latentTraces = [...(p1.latentTraces || []), {
                  weight: p2.weight,
                  level: p2.level,
                  color: p2.color,
                  persistence: p2.persistence
                }].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
                
                if (p2.latentTraces) {
                  p1.latentTraces = [...p1.latentTraces, ...p2.latentTraces].slice(-MAX_LATENT_TRACES_PER_PARTICLE);
                }
                p2.weight = -1; // Mark for removal
                return;
              }

              p1.isCollapsed = true;
              p2.isCollapsed = true;
              p1.lastInteractionTick = this.state.tick;
              p2.lastInteractionTick = this.state.tick;
              p1.lastActiveTick = this.state.tick;
              p2.lastActiveTick = this.state.tick;

              p1.persistence += 0.01 * timeFactor;
              p2.persistence += 0.01 * timeFactor;
              p1.weight += 0.01 * timeFactor;
              p2.weight += 0.01 * timeFactor;
            }
          });
        }
      }

      if (p1.isCollapsed) totalCollapsed++;
    });

    // 5. Re-emergence & Cleanup
    const newParticles: Particle[] = [];
    this.particles = this.particles.filter(p => {
      if (p.weight < 0) return false; // Removed particles

      // Re-emergence Logic: If a particle has latent traces and high energy, spawn them
      if (p.isCollapsed && p.latentTraces && p.latentTraces.length > 0 && p.weight > 10 * p.level) {
        const trace = p.latentTraces.pop()!;
        p.weight -= trace.weight;
        newParticles.push({
          id: `emergent-${this.state.tick}-${Math.random()}`,
          isCollapsed: true,
          isLatent: false,
          x: p.x + (Math.random() - 0.5) * 10,
          y: p.y + (Math.random() - 0.5) * 10,
          vx: p.vx + (Math.random() - 0.5),
          vy: p.vy + (Math.random() - 0.5),
          weight: trace.weight,
          level: trace.level,
          lastInteractionTick: this.state.tick,
          lastActiveTick: this.state.tick,
          persistence: trace.persistence,
          isConscious: false,
          color: trace.color,
          latentTraces: []
        });
      }
      return true;
    });
    this.particles.push(...newParticles);

    this.state.particles = this.particles;
    this.state.entropy = 1 - (totalCollapsed / this.particles.length);
    this.state.coherence = totalCollapsed / this.particles.length;
    this.state.consciousnessCount = this.particles.filter(p => p.isConscious).length;
    
    let maxCurv = 0;
    this.energyGrid.forEach(r => {
      if (r.curvature > maxCurv) maxCurv = r.curvature;
    });
    this.state.maxCurvature = maxCurv;
    
    // Calculate total information (conservation check)
    this.state.totalInformation = this.particles.reduce((sum, p) => {
      let info = p.weight;
      if (p.latentTraces) {
        info += p.latentTraces.reduce((s, t) => s + t.weight, 0);
      }
      return sum + info;
    }, 0);

    return this.state;
  }
}



