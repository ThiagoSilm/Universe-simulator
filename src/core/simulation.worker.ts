import { UniverseCore } from './UniverseCore';

let core = new UniverseCore();
let isRunning = false;
let tickInterval: any = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'START':
      isRunning = true;
      if (!tickInterval) {
        tickInterval = setInterval(() => {
          if (isRunning) core.tick();
        }, 1000 / 60);
      }
      break;
    case 'STOP':
      isRunning = false;
      break;
    case 'TICK':
      core.tick();
      break;
    case 'OBSERVE':
      core.observe(payload.x, payload.y, payload.radius);
      break;
    case 'GET_SNAPSHOT':
      self.postMessage({
        type: 'SNAPSHOT',
        payload: core.getSnapshot()
      });
      break;
    case 'RESET':
      core = new UniverseCore(payload?.particles);
      break;
  }
};
