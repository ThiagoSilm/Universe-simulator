import { SimulationState } from "./types";

export interface DocumentaryEvent {
  id: string;
  type: "COLLAPSE" | "EMERGENCE" | "ENTANGLEMENT";
  description: string;
  tick: number;
}

export class LazyDocumentary {
  events: DocumentaryEvent[] = [];
  lastTick = 0;

  observe(state: SimulationState): DocumentaryEvent[] {
    const newEvents: DocumentaryEvent[] = [];

    // 1. Detect State Collapses
    const newCollapses = state.particles.filter(p => p.isCollapsed && !p.isLatent);
    if (newCollapses.length > 0) {
      newEvents.push({
        id: `collapse-${state.tick}`,
        type: "COLLAPSE",
        description: `${newCollapses.length} particles reached Bekenstein Limit and collapsed.`,
        tick: state.tick
      });
    }

    // 2. Detect Emergence (High complexity spikes)
    if (state.metrics.emergentComplexity > 10 && this.lastTick % 100 === 0) {
      newEvents.push({
        id: `emergence-${state.tick}`,
        type: "EMERGENCE",
        description: `Complexity threshold reached: ${state.metrics.emergentComplexity.toFixed(2)}`,
        tick: state.tick
      });
    }

    this.events = [...newEvents, ...this.events].slice(0, 50); // Keep last 50 events
    this.lastTick = state.tick;
    return newEvents;
  }
}
