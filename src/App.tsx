import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Activity, Brain, Orbit, RefreshCw, Info, Layers, Cpu } from 'lucide-react';
import { UniverseEngine, PersistentState } from './UniverseEngine';
import { UniverseState, Particle } from './types';

const STORAGE_KEY = 'lazy_universe_state_v4';

// ── Visualization ────────────────────────────────────────────────────────────
// Computes screen transform: universe coords → canvas pixels
function computeTransform(particles: Particle[], w: number, h: number) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of particles) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const rangeX = Math.max(500, maxX - minX);
  const rangeY = Math.max(500, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const pad = 48;
  const scale = Math.min((w - pad*2) / rangeX, (h - pad*2) / rangeY);
  return {
    toX: (wx: number) => (wx - cx) * scale + w / 2,
    toY: (wy: number) => (wy - cy) * scale + h / 2,
    scale,
  };
}

function renderUniverse(ctx: CanvasRenderingContext2D, w: number, h: number, state: UniverseState) {
  const { particles } = state;
  if (particles.length === 0) return;

  // ── Layer 0: clear ────────────────────────────────────────────────────────
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);

  const { toX, toY, scale } = computeTransform(particles, w, h);

  // ── Layer 1: gravitational field — subtle curvature glow ─────────────────
  // Only render for collapsed entities (they curve spacetime most)
  ctx.save();
  const collapsed = particles.filter(p => p.isCollapsed && !p.isLatent);
  for (const p of collapsed) {
    const x = toX(p.x), y = toY(p.y);
    const glowR = Math.max(12, (4 + p.level * 6 + p.weight * 0.3) * scale);
    const isSingularity = p.id.startsWith('singularity');
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    if (isSingularity) {
      glow.addColorStop(0, `rgba(180,120,255,${Math.min(0.25, 0.04*p.level)})`);
      glow.addColorStop(1, 'transparent');
    } else {
      glow.addColorStop(0, `rgba(40,60,120,${Math.min(0.18, 0.02*p.level + 0.02)})`);
      glow.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 2: latent / void particles ─────────────────────────────────────
  ctx.save();
  const latent = particles.filter(p => p.isLatent);
  for (const p of latent) {
    const x = toX(p.x), y = toY(p.y);
    const size = Math.max(0.4, 0.5 * scale);
    ctx.fillStyle = 'rgba(80,80,100,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 3: active uncollapsed particles ─────────────────────────────────
  ctx.save();
  const uncollapsed = particles.filter(p => !p.isLatent && !p.isCollapsed);
  for (const p of uncollapsed) {
    const x = toX(p.x), y = toY(p.y);
    const size = Math.max(0.8, 1.2 * scale);
    // Velocity streak for fast particles
    const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
    if (speed > 3 && scale > 0.001) {
      const streakLen = Math.min(8, speed) * scale * 2;
      const nx = -p.vx/speed, ny = -p.vy/speed;
      const grad = ctx.createLinearGradient(x, y, x + nx*streakLen, y + ny*streakLen);
      grad.addColorStop(0, p.color.replace('0.2)', '0.5)'));
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + nx*streakLen, y + ny*streakLen);
      ctx.stroke();
    }
    ctx.fillStyle = p.color.replace('0.2)', '0.45)');
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 4: active collapsed particles ───────────────────────────────────
  ctx.save();
  const active = particles.filter(p => p.isCollapsed && !p.isLatent && !p.isConscious);
  for (const p of active) {
    const x = toX(p.x), y = toY(p.y);
    const size = Math.max(1, (1.5 + p.level * 0.8 + p.weight * 0.1) * scale);
    const isSing = p.id.startsWith('singularity');

    // Level ring
    if (p.level > 1) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.6, 0.08*p.level)})`;
      ctx.lineWidth = Math.max(0.3, 0.4 * scale);
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Singularity dashed halo
    if (isSing) {
      ctx.strokeStyle = 'rgba(180,120,255,0.4)';
      ctx.lineWidth = Math.max(0.5, 0.6 * scale);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, size * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Latent traces ring (stored information)
    if (p.latentTraces?.length) {
      ctx.strokeStyle = `rgba(255,165,0,${Math.min(0.6, 0.05*p.latentTraces.length)})`;
      ctx.lineWidth = Math.max(0.3, 0.5 * scale);
      ctx.beginPath();
      ctx.arc(x, y, size + Math.max(1.5, 2*scale), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Core
    const brightness = Math.min(255, 180 + p.level * 15);
    ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},${Math.min(0.95, 0.6 + p.level*0.05)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 5: conscious entities — top render priority ────────────────────
  ctx.save();
  const conscious = particles.filter(p => p.isConscious && !p.isLatent);
  for (const p of conscious) {
    const x = toX(p.x), y = toY(p.y);
    const size = Math.max(2, (2 + p.level * 1.2 + p.weight * 0.15) * scale);

    // Strong consciousness halo
    const haloR = size * 10;
    const halo = ctx.createRadialGradient(x, y, size*0.5, x, y, haloR);
    halo.addColorStop(0,   'rgba(255,255,255,0.5)');
    halo.addColorStop(0.3, 'rgba(200,180,255,0.15)');
    halo.addColorStop(1,   'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Outer pulse ring
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(0.5, 0.8 * scale);
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<UniverseEngine | null>(null);
  const [state, setState] = useState<UniverseState | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const requestRef = useRef<number>(0);

  const initEngine = useCallback((forceReset = false) => {
    if (typeof window === 'undefined') return;
    let saved: PersistentState | null = null;
    if (!forceReset) {
      try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? ''); } catch (_) {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    engineRef.current = new UniverseEngine(saved || undefined);
    setState(engineRef.current.step());
  }, []);

  useEffect(() => { initEngine(); }, [initEngine]);

  const animate = useCallback(() => {
    if (!engineRef.current) { requestRef.current = requestAnimationFrame(animate); return; }

    const newState = engineRef.current.step();
    setState(newState);

    if (newState.tick % 120 === 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(engineRef.current.getPersistentState())); }
      catch (_) {}
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) renderUniverse(ctx, canvas.width, canvas.height, newState);
    }

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  const maxLevel = Math.max(1, ...(state?.particles.map(p => p.level) ?? [1]));
  const dormant  = state?.particles.filter(p => p.isLatent).length ?? 0;

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white overflow-hidden font-mono">
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
                Lazy Universe Observer
              </h1>
            </div>
            <p className="text-[10px] opacity-30 uppercase tracking-widest">
              one tick · one frame · no observer control
            </p>
          </div>
          <div className="flex gap-3 pointer-events-auto">
            <button onClick={() => initEngine(true)}
              className="p-2 border border-white/10 hover:bg-red-500/80 transition-colors rounded-sm"
              title="Reset — Big Bang">
              <RefreshCw size={13} className="rotate-45" />
            </button>
            <button onClick={() => setShowInfo(!showInfo)}
              className="p-2 border border-white/10 hover:bg-white/10 transition-colors rounded-sm">
              <Info size={13} />
            </button>
          </div>
        </header>

        {/* Dashboard */}
        <main className="flex justify-between items-end">

          {/* Left panel */}
          <div className="space-y-5 w-56">
            <Metric label="Entropy"     value={state?.entropy   ?? 1}   icon={<Zap    size={11}/>} color="text-blue-400"    pct />
            <Metric label="Coherence"   value={state?.coherence ?? 0}   icon={<Layers size={11}/>} color="text-emerald-400" pct />
            <div className="space-y-1">
              <div className="flex items-center gap-2 opacity-35">
                <Brain size={11}/>
                <span className="text-[9px] uppercase tracking-widest font-bold">Max Complexity</span>
              </div>
              <div className="text-3xl font-light tracking-tighter">Lvl {maxLevel}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 opacity-35">
                <Orbit size={11}/>
                <span className="text-[9px] uppercase tracking-widest font-bold">Dormant</span>
              </div>
              <div className="text-3xl font-light tracking-tighter text-zinc-500">{dormant}</div>
            </div>
            <Metric label="Consciousness" value={state?.consciousnessCount ?? 0} icon={<Activity size={11}/>} color="text-violet-400" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 opacity-35">
                <Zap size={11}/>
                <span className="text-[9px] uppercase tracking-widest font-bold">Information</span>
              </div>
              <div className="text-2xl font-light tracking-tighter text-amber-400">
                {(state?.totalInformation ?? 0).toFixed(0)}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="text-right space-y-4">
            <div className="space-y-1">
              <div className="text-[9px] opacity-30 uppercase tracking-widest">Tick</div>
              <div className="flex items-baseline gap-2 justify-end">
                <div className="text-2xl font-light tabular-nums tracking-tighter">
                  {String(state?.tick ?? 0).padStart(10, '0')}
                </div>
                <div className="text-[8px] text-emerald-500/50 border border-emerald-500/20 px-1 rounded-[2px] animate-pulse">LIVE</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] opacity-30 uppercase tracking-widest">Max Curvature</div>
              <div className="text-xl font-light tracking-tighter text-amber-400">
                {(state?.maxCurvature ?? 0).toFixed(3)}
              </div>
            </div>
            {/* Coherence bar */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-[2px]">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i}
                    className={`w-[3px] h-4 rounded-[1px] transition-colors duration-300 ${
                      i < (state?.coherence ?? 0) * 14 ? 'bg-white/70' : 'bg-white/8'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[8px] opacity-20 uppercase tracking-[0.2em]">Structural Integrity</div>
            </div>
          </div>
        </main>
      </div>

      {/* Info modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-[#080808]/95 border border-white/15 p-8 max-w-lg pointer-events-auto shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em]">Physics Laws</h2>
                <button onClick={() => setShowInfo(false)} className="opacity-30 hover:opacity-80 text-sm">✕</button>
              </div>
              <div className="space-y-3 text-[10.5px] leading-relaxed opacity-65">
                {[
                  ['GRAVITY', 'F = G·m₁·m₂ / (r² + ε). All active particles follow geodesics in curved space-time.'],
                  ['SHORT-RANGE REPULSION', 'Below r < 8 units, degeneracy pressure repels. Prevents point-collapse — analogue of Pauli exclusion.'],
                  ['CONSERVATION OF MOMENTUM', 'Fusion conserves total momentum: v_result = (p₁·m₁ + p₂·m₂) / (m₁+m₂). No velocity is lost.'],
                  ['SPEED OF LIGHT (C=40)', 'No particle exceeds C units/tick. Interactions only within local light cone.'],
                  ['TIME DILATION', 'In high-curvature regions, local time slows: timeFactor = 1/(1 + κ·α). Massive regions evolve slower.'],
                  ['COSMOLOGICAL CONSTANT Λ', 'Outward push from barycenter, proportional to distance. Opposes gravitational collapse at large scale.'],
                  ['BEKENSTEIN LIMIT', 'Maximum information density per region. Overflow expels lighter entities and forces heavier into higher complexity.'],
                  ['HAWKING RADIATION', 'High-level collapsed entities (level > 2) emit energy back into their local region — heating it.'],
                  ['THERMAL AGITATION', 'Uncollapsed particles have quantum noise proportional to local curvature — hotter near mass.'],
                  ['LAZY EVALUATION', 'Latent (dormant) particles skip all heavy loops. They wake only when an active particle enters WAKE_RADIUS=60. The universe never processes what it doesn\'t need to.'],
                  ['INFORMATION CONSERVATION', 'No data is lost. Dissolved entities redistribute weight. Absorbed ones persist as latent traces — re-emergeable.'],
                  ['BIG BANG', 'Universe born across 60,000 units radius. Void particles exist dormant from birth. Only local clusters process physics.'],
                ].map(([law, desc]) => (
                  <p key={law}>
                    <span className="text-white font-bold">{law}: </span>{desc}
                  </p>
                ))}
                <div className="pt-4 border-t border-white/8 flex items-center gap-2 opacity-50">
                  <Cpu size={12}/><span className="uppercase tracking-widest text-[9px]">Status: Monitoring Active</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.07]
        bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)]
        bg-[length:100%_2px]" />
    </div>
  );
}

// ── Metric component ─────────────────────────────────────────────────────────
function Metric({ label, value, icon, color, pct }: {
  label: string; value: number | string; icon: React.ReactNode;
  color: string; pct?: boolean;
}) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  const display = pct ? `${(n*100).toFixed(1)}%` : value.toString();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 opacity-35">
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className={`text-2xl font-light tracking-tighter ${color}`}>{display}</div>
      <div className="w-full h-px bg-white/8 relative overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-current ${color}`}
          animate={{ width: pct ? `${n*100}%` : '100%' }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
        />
      </div>
    </div>
  );
}
