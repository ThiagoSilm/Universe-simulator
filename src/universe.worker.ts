import { UniverseEngine, PersistentState } from './UniverseEngine';

let engine: UniverseEngine | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      engine = new UniverseEngine(payload as PersistentState | undefined);
      self.postMessage({ type: 'INITIALIZED', payload: engine.state });
      break;

    case 'STEP':
      if (engine) {
        const state = engine.step();
        self.postMessage({ type: 'STATE_UPDATE', payload: state });
      }
      break;

    case 'RESET':
      if (engine) {
        engine.resetUniverse();
        self.postMessage({ type: 'STATE_UPDATE', payload: engine.state });
      }
      break;

    case 'GET_PERSISTENT_STATE':
      if (engine) {
        const persistentState = engine.getPersistentState();
        self.postMessage({ type: 'PERSISTENT_STATE', payload: persistentState });
      }
      break;
  }
};
