import { UniverseCore } from './UniverseCore';

const core = new UniverseCore();

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'TICK':
      core.tick();
      // Não devolve o estado todo tick para economizar
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
  }
};
