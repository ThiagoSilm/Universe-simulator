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

    // 1. Detect Cosmic Transitions
    const singularities = state.particles.filter(p => p.type === "singularity").length;
    const stars = state.particles.filter(p => p.type === "star").length;
    const nebulas = state.particles.filter(p => p.type === "nebula").length;

    if (singularities > 0 && state.tick % 300 === 0) {
      newEvents.push({
        id: `singularity-${state.tick}-${Math.random()}`,
        type: "COLLAPSE",
        description: `Black Hole detected: Substrate limit exceeded. Information is being compressed into a non-computable point.`,
        tick: state.tick
      });
    }

    if (stars > 0 && state.tick % 400 === 0) {
      newEvents.push({
        id: `star-${state.tick}-${Math.random()}`,
        type: "EMERGENCE",
        description: `Star Birth: Density threshold reached. The substrate has ignited into a high-rhythm information node.`,
        tick: state.tick
      });
    }

    if (nebulas > 0 && state.tick % 500 === 0) {
      newEvents.push({
        id: `nebula-${state.tick}-${Math.random()}`,
        type: "EMERGENCE",
        description: `Nebula Cluster: Collective persistence redistribution is seeding new entities in a slow-rhythm cluster.`,
        tick: state.tick
      });
    }

    // 2. Detect Dissonance Exclusion (Negative Omega)
    // We'll use a heuristic for now since we don't store totalOmega in the particle state
    // But we can check for high velocity separation
    const highSpeed = state.particles.filter(p => Math.sqrt(p.vx * p.vx + p.vy * p.vy) > 5).length;
    if (highSpeed > 2 && state.tick % 150 === 0) {
      newEvents.push({
        id: `exclusion-${state.tick}-${Math.random()}`,
        type: "PHYSICS",
        description: "Dissonance Exclusion: Phase misalignment generating emergent repulsion.",
        tick: state.tick
      });
    }

    // 3. Detect Resonant Coupling
    if (state.metrics.activeParticles > 10 && state.tick % 200 === 0) {
      newEvents.push({
        id: `coupling-${state.tick}-${Math.random()}`,
        type: "EMERGENCE",
        description: "Coherence Emergence: Nodes are achieving mutual observation and persistence.",
        tick: state.tick
      });
    }

    // 4. Detect Reproduction (Mitosis vs Sexual)
    const newParticles = state.particles.filter(p => !p.isLatent && p.id.includes("-") && parseInt(p.id.split("-").pop() || "0") === state.tick);
    
    newParticles.forEach(p => {
      if (p.id.startsWith("mitosis")) {
        newEvents.push({
          id: `mitosis-${p.id}-${Math.random()}`,
          type: "BIOGENESIS",
          description: "Mitosis: A high-persistence node has divided, paying the full cost of replication.",
          tick: state.tick
        });
      } else if (p.id.startsWith("sexual")) {
        newEvents.push({
          id: `sexual-${p.id}-${Math.random()}`,
          type: "BIOGENESIS",
          description: "Sexual Coupling: Two resonant nodes have merged their information to seed a new entity.",
          tick: state.tick
        });
      }
    });

    if (newParticles.length > 0) {
      this.lastParticleCount = state.particles.length;
    }

    // 5. Detect Cluster Editing
    const leaders = state.particles.filter(p => p.role === "leader").length;
    if (leaders > 0 && state.tick % 250 === 0) {
      newEvents.push({
        id: `editing-${state.tick}-${Math.random()}`,
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
