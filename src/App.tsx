import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Activity,
  Brain,
  Orbit,
  RefreshCw,
  Info,
  Layers,
  Cpu
} from 'lucide-react';
import { UniverseEngine, PersistentState } from './UniverseEngine';
import { UniverseState } from './types';

const STORAGE_KEY = 'lazy_universe_state_v2';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UniverseEngine | null>(null);
  const [state, setState] = useState<UniverseState | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const requestRef = useRef<number>(0);

  const initEngine = useCallback((forceReset = false) => {
    if (typeof window === 'undefined') return;
    let savedState: PersistentState | null = null;
    if (!forceReset) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { savedState = JSON.parse(raw); } catch (_) {}
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    engineRef.current = new UniverseEngine(savedState || undefined);
    setState(engineRef.current.step());
  }, []);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  const animate = useCallback(() => {
    if (!engineRef.current) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    // One tick per frame — the universe has its own clock
    const newState = engineRef.current.step();
    setState(newState);

    // Persist (throttled: every 120 frames ≈ 2s)
    if (newState.tick % 120 === 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(engineRef.current.getPersistentState()));
      } catch (_) {}
    }

    // Render full-field view — always shows the entire universe like a minimap
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx && newState.particles.length > 0) {
        // Trail effect
        ctx.fillStyle = 'rgba(5, 5, 5, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Compute bounds of the entire universe
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        newState.particles.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });

        const rangeX = Math.max(500, maxX - minX);
        const rangeY = Math.max(500, maxY - minY);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // Fit with padding
        const pad = 40;
        const scale = Math.min(
          (canvas.width - pad * 2) / rangeX,
          (canvas.height - pad * 2) / rangeY
        );

        const toScreenX = (wx: number) => (wx - cx) * scale + canvas.width / 2;
        const toScreenY = (wy: number) => (wy - cy) * scale + canvas.height / 2;

        newState.particles.forEach(p => {
          const x = toScreenX(p.x);
          const y = toScreenY(p.y);

          const size = Math.max(1, (p.isCollapsed ? (1.5 + p.level + p.weight * 0.15) : 1.5) * scale);
          const alpha = p.isLatent ? 0.06 : (p.isCollapsed ? 0.85 : 0.25);

          // Collapsed ring
          if (p.isCollapsed && p.level > 1 && !p.isLatent) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * p.level})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Consciousness glow
          if (p.isConscious && !p.isLatent) {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 8);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size * 8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Particle body
          ctx.fillStyle = p.isLatent
            ? 'rgba(60,60,60,0.5)'
            : (p.isCollapsed ? `rgba(255,255,255,${alpha})` : p.color);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();

          // Latent trace ring
          if (p.latentTraces && p.latentTraces.length > 0 && !p.isLatent) {
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(x, y, size + 2, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Singularity dashed ring
          if (p.id.startsWith('singularity')) {
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white overflow-hidden font-mono selection:bg-white selection:text-black">
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        className="absolute inset-0 z-0"
      />

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">

        {/* Header */}
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <h1 className="text-xs uppercase tracking-[0.3em] font-bold opacity-80">
                System: Lazy Universe Observer
              </h1>
            </div>
            <p className="text-[10px] opacity-40 uppercase tracking-widest">
              Reality Resolution: Emergent / Non-Deterministic
            </p>
          </div>

          <div className="flex gap-4 pointer-events-auto">
            <button
              onClick={() => initEngine(true)}
              className="p-2 border border-white/10 hover:bg-red-500 hover:text-white transition-colors rounded-sm"
              title="Reset Universe (Big Bang)"
            >
              <RefreshCw size={14} className="rotate-45" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 border border-white/10 hover:bg-white hover:text-black transition-colors rounded-sm"
            >
              <Info size={14} />
            </button>
          </div>
        </header>

        {/* Main Dashboard */}
        <main className="flex justify-between items-end">
          {/* Left Panel: Metrics */}
          <div className="space-y-6 w-64">
            <MetricBlock
              label="Entropy"
              value={state?.entropy ?? 1}
              icon={<Zap size={12} />}
              color="text-blue-400"
              percentage
            />
            <MetricBlock
              label="Coherence"
              value={state?.coherence ?? 0}
              icon={<Layers size={12} />}
              color="text-emerald-400"
              percentage
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2 opacity-40">
                <Brain size={12} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Max Complexity</span>
              </div>
              <div className="text-3xl font-light tracking-tighter text-white">
                Lvl {Math.max(1, ...state?.particles.map(p => p.level) ?? [1])}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 opacity-40">
                <RefreshCw size={12} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Information Density</span>
              </div>
              <div className="text-3xl font-light tracking-tighter text-amber-400">
                {state?.totalInformation.toFixed(1) ?? 0}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 opacity-40">
                <Orbit size={12} />
                <span className="text-[10px] uppercase tracking-widest font-bold">Dormant Entities</span>
              </div>
              <div className="text-3xl font-light tracking-tighter text-zinc-500">
                {state?.particles.filter(p => p.isLatent).length ?? 0}
              </div>
            </div>
            <MetricBlock
              label="Consciousness"
              value={state?.consciousnessCount ?? 0}
              icon={<Activity size={12} />}
              color="text-white"
            />
            <MetricBlock
              label="Max Curvature"
              value={state?.maxCurvature.toFixed(2) ?? "0.00"}
              icon={<Zap size={12} />}
              color="text-amber-400"
            />
          </div>

          {/* Right Panel: Temporal Index */}
          <div className="text-right space-y-4">
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 uppercase tracking-widest">Temporal Index</div>
              <div className="flex items-baseline gap-2 justify-end">
                <div className="text-2xl font-light tracking-tighter">
                  {state?.tick.toLocaleString().padStart(8, '0')}
                </div>
                <div className="text-[8px] text-emerald-500/60 font-bold border border-emerald-500/20 px-1 rounded-[2px] animate-pulse">PERSISTENT</div>
                <div className="text-[8px] text-amber-500/60 font-bold border border-amber-500/20 px-1 rounded-[2px]">RELATIVISTIC</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-4 ${i < (state?.coherence ?? 0) * 12 ? 'bg-white' : 'bg-white/10'}`}
                  />
                ))}
              </div>
              <div className="text-[9px] opacity-30 uppercase tracking-[0.2em]">
                Structural Integrity
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-[#0a0a0a] border border-white/20 p-8 max-w-md pointer-events-auto shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Simulation Protocols</h2>
                <button onClick={() => setShowInfo(false)} className="opacity-40 hover:opacity-100">✕</button>
              </div>
              <div className="space-y-4 text-[11px] leading-relaxed opacity-70">
                <p>
                  <span className="text-white font-bold">ONE TICK PER FRAME:</span> The universe runs at its own clock — one step per render frame. No acceleration. No pause. No observer control over time.
                </p>
                <p>
                  <span className="text-white font-bold">FULL-FIELD VIEW:</span> The observer always sees the entire universe. All entities are visible, auto-scaled to fit the canvas. Nothing is hidden by a viewport limit.
                </p>
                <p>
                  <span className="text-white font-bold">LAZY EVALUATION:</span> Active particles run full physics (gravity, interactions, collapse). Dormant (latent) particles only follow minimal geodesic drift — no heavy loops. They wake up when an active particle enters their range.
                </p>
                <p>
                  <span className="text-white font-bold">DORMANCY STATE:</span> Entities that haven't interacted for {300} ticks enter dormancy. They continue geodesic drift at reduced cost until disturbed.
                </p>
                <p>
                  <span className="text-white font-bold">EMERGENT GRAVITY:</span> Active entities exert attraction proportional to their weight. Gravity is the result of following geodesics in curved space-time.
                </p>
                <p>
                  <span className="text-white font-bold">TIME DILATION:</span> In high-curvature regions, local time slows. Active entities in these fields evolve slower relative to the universal tick.
                </p>
                <p>
                  <span className="text-white font-bold">BEKENSTEIN LIMIT:</span> Each region has a max information density. Overflow expels lighter entities and forces heavier ones into higher complexity.
                </p>
                <p>
                  <span className="text-white font-bold">INFORMATION CONSERVATION:</span> No data is lost. Dissolved entities redistribute weight to neighbors. Absorbed entities persist as latent traces.
                </p>
                <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                  <Cpu size={14} />
                  <span className="uppercase tracking-widest opacity-50">Status: Monitoring Active</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-20 opacity-20" />
    </div>
  );
}

function MetricBlock({ label, value, icon, color, percentage }: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  percentage?: boolean;
}) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const displayValue = percentage ? `${(numValue * 100).toFixed(1)}%` : value.toString();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 opacity-40">
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className={`text-3xl font-light tracking-tighter ${color}`}>
        {displayValue}
      </div>
      <div className="w-full h-[1px] bg-white/10 relative">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-current ${color}`}
          initial={{ width: 0 }}
          animate={{ width: percentage ? `${numValue * 100}%` : '100%' }}
          transition={{ type: 'spring', bounce: 0, duration: 1 }}
        />
      </div>
    </div>
  );
}
