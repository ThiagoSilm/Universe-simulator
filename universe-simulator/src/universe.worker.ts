import { UniverseEngine } from './UniverseEngine';

let engine = new UniverseEngine();

// Physics loop independent of the main thread
setInterval(() => {
  engine.step();
}, 16); // ~60fps physics simulation

self.onmessage = (e: MessageEvent) => {
  if (e.data === 'snapshot') {
    // Respond only when asked
    const state = engine.getState();
    self.postMessage({ type: 'snapshot', state });
  } else if (e.data === 'reset') {
    engine = new UniverseEngine();
  }
};
