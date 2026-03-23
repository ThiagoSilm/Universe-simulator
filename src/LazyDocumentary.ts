import { SimulationState } from "./types";

export interface DocumentaryEvent {
  id: string;
  type: "COLLAPSE" | "EMERGENCE" | "ENTANGLEMENT" | "PHYSICS" | "BIOGENESIS" | "EDITING";
  description: string;
  tick: number;
}

export class LazyDocumentary {
  events: DocumentaryEvent[] = [];
  lastTick = 0;
  lastParticleCount = 0;

  observe(state: SimulationState): DocumentaryEvent[] {
    const newEvents: DocumentaryEvent[] = [];

    // 1. Detect State Collapses
    const newCollapses = state.particles.filter(p => p.isCollapsed && !p.isLatent);
    if (newCollapses.length > 0 && state.tick % 100 === 0) {
      newEvents.push({
        id: `collapse-${state.tick}`,
        type: "COLLAPSE",
        description: `Bekenstein Limit reached. Substrate is compressing information into singular points.`,
        tick: state.tick
      });
    }

    // 2. Detect Dissonance Exclusion (Negative Omega)
    // We'll use a heuristic for now since we don't store totalOmega in the particle state
    // But we can check for high velocity separation
    const highSpeed = state.particles.filter(p => Math.sqrt(p.vx * p.vx + p.vy * p.vy) > 5).length;
    if (highSpeed > 2 && state.tick % 150 === 0) {
      newEvents.push({
        id: `exclusion-${state.tick}`,
        type: "PHYSICS",
        description: "Dissonance Exclusion: Phase misalignment generating emergent repulsion.",
        tick: state.tick
      });
    }

    // 3. Detect Resonant Coupling
    if (state.metrics.activeParticles > 10 && state.tick % 200 === 0) {
      newEvents.push({
        id: `coupling-${state.tick}`,
        type: "EMERGENCE",
        description: "Coherence Emergence: Nodes are achieving mutual observation and persistence.",
        tick: state.tick
      });
    }

    // 4. Detect Replication
    if (state.particles.length > this.lastParticleCount + 5) {
      newEvents.push({
        id: `replication-${state.tick}`,
        type: "BIOGENESIS",
        description: "Replication Event: High-persistence nodes are dividing and evolving.",
        tick: state.tick
      });
      this.lastParticleCount = state.particles.length;
    }

    // 5. Detect Cluster Editing
    const leaders = state.particles.filter(p => p.role === "leader").length;
    if (leaders > 0 && state.tick % 250 === 0) {
      newEvents.push({
        id: `editing-${state.tick}`,
        type: "EDITING",
        description: `Internal Observation: ${leaders} nodes have assumed leadership to stabilize reality.`,
        tick: state.tick
      });
    }

    this.events = [...newEvents, ...this.events].slice(0, 50); // Keep last 50 events
    this.lastTick = state.tick;
    return newEvents;
  }
}
