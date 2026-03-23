import { SimulationState, WorkerMessage, WorkerResponse } from "./types";
import { tick } from "./UniverseCore";

let state: SimulationState | null = null;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case "INIT":
      state = payload as SimulationState;
      break;
    case "TICK":
      if (state) {
        state = tick(state);
        self.postMessage({ type: "STATE_UPDATE", payload: state } as WorkerResponse);
      }
      break;
    case "STIMULUS":
      if (state) {
        // Apply external stimulus (e.g., mouse click)
        const { x, y, radius } = payload;
        state.particles = state.particles.map(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius) {
            return { ...p, persistence: 1.0, isLatent: false }; // Wake up particles
          }
          return p;
        });
      }
      break;
  }
};
