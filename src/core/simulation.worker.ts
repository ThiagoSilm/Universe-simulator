import { UniverseCore } from './UniverseCore';

const DB_NAME = 'UniverseDB';
const STORE_NAME = 'UniverseState';
const STATE_KEY = 'current_state';

async function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveState(state: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(state, STATE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadState() {
  const db = await openDB();
  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let core: UniverseCore;
let isRunning = true;
let tickCount = 0;

async function init() {
  const saved = await loadState();
  core = new UniverseCore(saved?.seed, 2);
  if (saved) {
    core.loadPersistentState(saved);
  }
  
  // Start ticking immediately
  tick();
  
  // Auto-save every 5 seconds
  setInterval(async () => {
    if (core) {
      await saveState(core.getPersistentState());
    }
  }, 5000);
}

function tick() {
  if (isRunning && core) {
    // Apply feedback loop
    const snapshot = core.getSnapshot();
    
    // Simple feedback logic:
    // Life (decisionsPerTick) reduces Entropy
    // Technology (represented by activeTracesCount) affects Gravity
    // Culture (represented by totalSelfEnergy) affects Lambda
    
    const entropyFactor = Math.max(0.1, 1.0 - (snapshot.metrics.decisionsPerTick / 1000));
    const gFactor = 1.0 + (snapshot.metrics.activeTracesCount / 5000);
    const lambdaFactor = 1.0 + (snapshot.metrics.totalSelfEnergy / 100000);
    
    core.applyPhysicsInfluence(gFactor, lambdaFactor, entropyFactor);
    
    core.tick();
    
    tickCount++;
    if (tickCount % 1000 === 0) {
      self.postMessage({
        type: 'AUTO_SNAPSHOT',
        payload: core.getSnapshot()
      });
    }
  }
  setTimeout(tick, 1000 / 60);
}

init();

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (!core) return;

  switch (type) {
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
      core = new UniverseCore(payload?.seed, 2);
      break;
    case 'TELEPORT':
      core.teleport(payload.x, payload.y);
      break;
  }
};
