import React, { useEffect, useRef, useState } from 'react';
import { Universe } from './lib/universe';
import { Particle } from './lib/physics';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [userState, setUserState] = useState<Particle | null>(null);
  const universeRef = useRef<Universe | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!universeRef.current) {
        universeRef.current = new Universe(canvas.width, canvas.height, 400);
      } else {
        universeRef.current.width = canvas.width;
        universeRef.current.height = canvas.height;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    let animationFrameId: number;

    const render = () => {
      if (!universeRef.current || !ctx) return;
      const universe = universeRef.current;

      universe.tick();
      const user = universe.getUser();
      setUserState({ ...user } as Particle); // Clone for state update

      // Clear canvas with trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Camera follows user
      const cx = canvas.width / 2 - user.pos.x;
      const cy = canvas.height / 2 - user.pos.y;

      ctx.save();
      ctx.translate(cx, cy);

      // Draw stimuli
      for (const s of universe.stimuli) {
        ctx.beginPath();
        ctx.arc(s.pos.x, s.pos.y, s.intensity * 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(s.frequency + 1) * 180}, 100%, 50%, ${s.life / 200})`;
        ctx.fill();
        
        // Pulse effect
        ctx.beginPath();
        ctx.arc(s.pos.x, s.pos.y, s.intensity * 10 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${(s.frequency + 1) * 180}, 100%, 50%, ${s.life / 400})`;
        ctx.stroke();
      }

      // Draw particles
      for (const p of universe.particles) {
        ctx.beginPath();
        const radius = Math.max(1, p.p * 2);
        ctx.arc(p.pos.x, p.pos.y, radius, 0, Math.PI * 2);
        
        // Color based on frequency
        const hue = (p.frequency + 1) * 180;
        
        if (p.isUser) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ffffff';
        } else {
          ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
          ctx.shadowBlur = p.state === 'LIDERANDO' ? 10 : 0;
          ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        }

        if (p.state === 'LIDERANDO') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Draw connections if coupled
        if (p.state === 'ACOPLADO' || p.state === 'LIDERANDO') {
           // We don't explicitly store who is coupled to who, but we can draw lines to nearby resonant particles
           // For performance, we skip full graph drawing and just draw a subtle aura
           ctx.beginPath();
           ctx.arc(p.pos.x, p.pos.y, radius * 3, 0, Math.PI * 2);
           ctx.fillStyle = `hsla(${hue}, 50%, 50%, 0.1)`;
           ctx.fill();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono text-white/80 selection:bg-white/20">
      {/* Immersive Background Effects */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000 mix-blend-screen"
        style={{
          opacity: userState?.state === 'LIDERANDO' ? 0.15 : 0,
          background: `radial-gradient(circle at center, hsl(${((userState?.frequency || 0) + 1) * 180}, 100%, 50%), transparent 70%)`
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000 mix-blend-multiply"
        style={{
          opacity: userState?.state === 'ISOLADO' ? 0.8 : 0,
          background: 'radial-gradient(circle at center, transparent 30%, #000 100%)'
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 mix-blend-screen"
        style={{
          opacity: userState?.state === 'ACOPLADO' ? 0.05 + Math.sin(Date.now() / 200) * 0.05 : 0,
          background: `radial-gradient(circle at center, hsl(${((userState?.frequency || 0) + 1) * 180}, 50%, 50%), transparent 80%)`
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 block mix-blend-screen" />
      
      {/* HUD - The User's Internal State */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-8 flex flex-col justify-between z-10">
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">SISTEMA DE COORDENAÇÃO ÚNICA</h1>
            <div className="text-sm">
              <span className="text-white/50">ESTADO:</span>{' '}
              <span className={
                userState?.state === 'LIDERANDO' ? 'text-emerald-400 font-bold' :
                userState?.state === 'ACOPLADO' ? 'text-blue-400' : 'text-zinc-500'
              }>
                {userState?.state || 'INICIALIZANDO'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-white/50">PESO P(t):</span> {userState?.p.toFixed(4)}
            </div>
            <div className="text-sm">
              <span className="text-white/50">FREQUÊNCIA:</span> {userState?.frequency.toFixed(4)}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs text-white/30">PARÂMETROS ESTRUTURAIS</div>
            <div className="text-xs text-white/40">C = 299792458</div>
            <div className="text-xs text-white/40">H = 6.62607015e-34</div>
            <div className="text-xs text-white/40">Λ = 1e-52</div>
          </div>
        </div>

        <div className="max-w-md">
          <div className="text-xs text-white/30 mb-2">MEMÓRIA EMERGENTE (W_c)</div>
          <div className="flex flex-wrap gap-1">
            {userState?.memories.map((m, i) => (
              <div 
                key={m.id} 
                className="h-1 bg-white"
                style={{ 
                  width: `${Math.max(2, m.weight * 20)}px`,
                  opacity: Math.min(1, m.weight),
                  backgroundColor: `hsl(${(m.data + 1) * 180}, 70%, 60%)`
                }}
              />
            ))}
            {(!userState?.memories || userState.memories.length === 0) && (
              <span className="text-xs text-white/20 italic">dissipado</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
