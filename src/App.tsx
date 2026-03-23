import React, { useEffect, useRef, useState } from 'react';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userState, setUserState] = useState<any>(null);
  const [universeStats, setUniverseStats] = useState({ age: 0, particles: 0 });
  const workerRef = useRef<Worker | null>(null);
  const renderStateRef = useRef<any>(null);
  const cameraPosRef = useRef({ x: 0, y: 0 });
  const lastReactUpdate = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const worker = new Worker(new URL('./universe.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      worker.postMessage({ type: 'RESIZE', payload: { width: canvas.width, height: canvas.height } });
    };

    window.addEventListener('resize', resize);
    resize();
    worker.postMessage({ type: 'INIT', payload: { width: canvas.width, height: canvas.height } });

    worker.onmessage = (e) => {
      if (e.data.type === 'STATE_UPDATE') {
        renderStateRef.current = e.data.payload;
        
        const now = performance.now();
        if (now - lastReactUpdate.current > 100) { // Throttle React state updates to 10fps
          setUserState(e.data.payload.focalParticle);
          setUniverseStats({ age: e.data.payload.age, particles: e.data.payload.particleCount });
          lastReactUpdate.current = now;
        }
      }
    };

    let animationFrameId: number;

    const render = () => {
      const state = renderStateRef.current;
      if (!state || !ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Clear canvas (solid black for realistic space)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const user = state.focalParticle;
      // Scale factor to map physics coordinates to screen pixels
      const SCALE = 5000;

      if (user) {
        // Camera follows user smoothly
        const targetCx = canvas.width / 2 - user.x * SCALE;
        const targetCy = canvas.height / 2 - user.y * SCALE;

        // Initialize camera pos if it's 0,0
        if (cameraPosRef.current.x === 0 && cameraPosRef.current.y === 0) {
          cameraPosRef.current.x = targetCx;
          cameraPosRef.current.y = targetCy;
        }

        const dx = targetCx - cameraPosRef.current.x;
        const dy = targetCy - cameraPosRef.current.y;

        // Snap camera if distance is too large
        if (Math.abs(dx) > canvas.width / 2 || Math.abs(dy) > canvas.height / 2) {
          cameraPosRef.current.x = targetCx;
          cameraPosRef.current.y = targetCy;
        } else {
          cameraPosRef.current.x += dx * 0.05;
          cameraPosRef.current.y += dy * 0.05;
        }
      }

      ctx.save();
      ctx.translate(cameraPosRef.current.x, cameraPosRef.current.y);

      // Draw particles (Celestial bodies)
      // Lazy Evaluation: Viewport Culling bounds
      const cx = cameraPosRef.current.x;
      const cy = cameraPosRef.current.y;
      const screenLeft = -cx - 100;
      const screenRight = canvas.width - cx + 100;
      const screenTop = -cy - 100;
      const screenBottom = canvas.height - cy + 100;

      for (const p of state.particles) {
        const px = p.x * SCALE;
        const py = p.y * SCALE;

        // Lazy Evaluation: Spatial Culling (Don't render if outside viewport)
        if (px < screenLeft || px > screenRight || py < screenTop || py > screenBottom) {
          continue;
        }

        const radius = Math.max(0.5, p.pt * 0.8);
        const hue = (p.f + 1) * 180;
        const alpha = Math.min(1, p.pt);
        
        // Pure star-like rendering
        ctx.fillStyle = p.isLeader ? `rgba(255, 255, 255, ${alpha})` : `hsla(${hue}, 60%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      worker.terminate();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono text-white/80 selection:bg-white/20">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      
      {/* HUD - Technical Observatory Dashboard */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between z-10">
        
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-white/70 mb-1">UNIVERSE ENGINE</h1>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                Observatory Mode // Live
              </div>
            </div>

            <div className="space-y-1 w-64">
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 border-b border-white/10 pb-1">Global Metrics</div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">AGE (TICKS)</span> <span className="text-white/70">{universeStats.age}</span></div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">ENTITIES</span> <span className="text-white/70">{universeStats.particles}</span></div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">EXPANSION (Λ)</span> <span className="text-white/70">ACTIVE</span></div>
            </div>

            <div className="space-y-1 w-64">
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 border-b border-white/10 pb-1">Focal Observer (Leader)</div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/40">ID</span> 
                <span className="text-white/70">
                  {userState?.id || '---'}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">MASS P(t)</span> <span className="text-white/70">{userState?.pt?.toFixed(4) || '0.0000'}</span></div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">WEIGHT W_c</span> <span className="text-white/70">{userState?.wc?.toFixed(4) || '0.0000'}</span></div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">FREQUENCY</span> <span className="text-white/70">{userState?.f?.toFixed(4) || '0.0000'} Hz</span></div>
              <div className="flex justify-between text-xs font-mono"><span className="text-white/40">CONNECTIONS</span> <span className="text-white/70">{userState?.connections || 0}</span></div>
            </div>
          </div>

          <div className="space-y-1 w-48 text-right">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 border-b border-white/10 pb-1 text-right">Physics Constants</div>
            <div className="text-xs font-mono text-white/40">c = 299792458</div>
            <div className="text-xs font-mono text-white/40">h = 6.626e-34</div>
            <div className="text-xs font-mono text-white/40">Λ = 1e-6</div>
            <div className="text-xs font-mono text-white/40">α = 1.0, β = 1.0</div>
            <div className="text-xs font-mono text-white/40">dt = 0.1</div>
          </div>
        </div>

        <div className="max-w-md">
          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 border-b border-white/10 pb-1">Event Memory Size</div>
          <div className="text-xs font-mono text-white/70">{renderStateRef.current?.eventMemorySize || 0} events tracked</div>
        </div>

      </div>
    </div>
  );
};

export default App;
