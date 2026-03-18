import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Activity, Brain, Orbit, RefreshCw, Info, Layers, Cpu, Thermometer } from 'lucide-react';
import { UniverseEngine, PersistentState } from './UniverseEngine';
import { UniverseState, Particle } from './types';

const STORAGE_KEY = 'lazy_universe_state_v5';

// ═══════════════════════════════════════════════════════════════════
//  VISUALIZATION
// ═══════════════════════════════════════════════════════════════════

function computeTransform(particles: Particle[], w: number, h: number) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of particles) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const pad    = 48;
  const rangeX = Math.max(500, maxX - minX);
  const rangeY = Math.max(500, maxY - minY);
  const cx     = (minX + maxX) / 2;
  const cy     = (minY + maxY) / 2;
  const scale  = Math.min((w-pad*2)/rangeX, (h-pad*2)/rangeY);
  return {
    toX: (wx: number) => (wx-cx)*scale + w/2,
    toY: (wy: number) => (wy-cy)*scale + h/2,
    scale,
  };
}

function renderUniverse(ctx: CanvasRenderingContext2D, w: number, h: number, state: UniverseState) {
  const { particles } = state;
  if (particles.length === 0) return;

  // ── Layer 0: clear ────────────────────────────────────────────────────────
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);

  const { toX, toY, scale } = computeTransform(particles, w, h);

  // ── Layer 1: gravitational + temperature field ─────────────────────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || !p.isCollapsed) continue;
    const x = toX(p.x), y = toY(p.y);
    const glowR = Math.max(10, (5 + p.level*7 + p.weight*0.25)*scale);
    const isSing = p.id.startsWith('singularity');
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    if (isSing) {
      glow.addColorStop(0, `rgba(160,80,255,${Math.min(0.3, 0.05*p.level)})`);
      glow.addColorStop(1, 'transparent');
    } else {
      glow.addColorStop(0, `rgba(30,50,110,${Math.min(0.2, 0.02*p.level+0.02)})`);
      glow.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 2: void / latent particles ──────────────────────────────────────
  ctx.save();
  for (const p of particles) {
    if (!p.isLatent) continue;
    const x = toX(p.x), y = toY(p.y);
    ctx.fillStyle = 'rgba(70,70,90,0.25)';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.4, 0.5*scale), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 3: uncollapsed (quantum superposition) ───────────────────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || p.isCollapsed) continue;
    const x    = toX(p.x), y = toY(p.y);
    const size = Math.max(0.8, 1.1*scale);

    // Wave radius — the particle's quantum uncertainty cloud
    const wr = (p.waveRadius || 0) * scale;
    if (wr > 1) {
      ctx.strokeStyle = p.charge === 0
        ? 'rgba(120,180,255,0.12)'
        : (p.charge > 0 ? 'rgba(255,120,80,0.14)' : 'rgba(80,120,255,0.14)');
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, wr, 0, Math.PI*2);
      ctx.stroke();
    }

    // Velocity streak for fast particles
    const spd = Math.sqrt(p.vx**2 + p.vy**2);
    if (spd > 2.5 && scale > 0.0005) {
      const len = Math.min(10, spd) * scale * 2.5;
      const nx  = -p.vx/spd, ny = -p.vy/spd;
      const g   = ctx.createLinearGradient(x, y, x+nx*len, y+ny*len);
      g.addColorStop(0, p.color.replace('0.2)', '0.45)'));
      g.addColorStop(1, 'transparent');
      ctx.strokeStyle = g;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x+nx*len, y+ny*len);
      ctx.stroke();
    }

    // Charge color tint
    let bodyColor = p.color.replace('0.2)', '0.5)');
    if (p.charge > 0) bodyColor = `rgba(255,160,90,0.5)`;
    if (p.charge < 0) bodyColor = `rgba(90,140,255,0.5)`;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 4: collapsed (observed / definite state) ─────────────────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || !p.isCollapsed || p.isConscious) continue;
    const x    = toX(p.x), y = toY(p.y);
    const size = Math.max(1, (1.5 + p.level*0.8 + p.weight*0.1)*scale);
    const isSing = p.id.startsWith('singularity');

    // Level ring
    if (p.level > 1) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.55, 0.07*p.level)})`;
      ctx.lineWidth   = Math.max(0.3, 0.4*scale);
      ctx.beginPath();
      ctx.arc(x, y, size*2, 0, Math.PI*2);
      ctx.stroke();
    }

    // Singularity dashed halo
    if (isSing) {
      ctx.strokeStyle = 'rgba(160,80,255,0.5)';
      ctx.lineWidth   = Math.max(0.5, 0.6*scale);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, size*4.5, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Latent trace ring (stored information)
    if (p.latentTraces?.length) {
      ctx.strokeStyle = `rgba(255,165,0,${Math.min(0.5, 0.04*p.latentTraces.length)})`;
      ctx.lineWidth   = Math.max(0.3, 0.5*scale);
      ctx.beginPath();
      ctx.arc(x, y, size + Math.max(1.5, 2*scale), 0, Math.PI*2);
      ctx.stroke();
    }

    // Charge indicator on collapsed
    if (p.charge !== 0) {
      ctx.strokeStyle = p.charge > 0 ? 'rgba(255,120,60,0.4)' : 'rgba(60,120,255,0.4)';
      ctx.lineWidth   = Math.max(0.3, 0.3*scale);
      ctx.beginPath();
      ctx.arc(x, y, size*1.3, 0, Math.PI*2);
      ctx.stroke();
    }

    // Core
    const bright = Math.min(255, 170 + p.level*14);
    ctx.fillStyle = `rgba(${bright},${bright},${bright},${Math.min(0.95, 0.55+p.level*0.05)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 5: conscious / singularity — highest render priority ─────────────
  ctx.save();
  for (const p of particles) {
    if (!p.isConscious || p.isLatent) continue;
    const x    = toX(p.x), y = toY(p.y);
    const size = Math.max(2, (2 + p.level*1.2 + p.weight*0.12)*scale);

    // Consciousness halo
    const hr   = size * 10;
    const halo = ctx.createRadialGradient(x, y, size*0.5, x, y, hr);
    halo.addColorStop(0,   'rgba(255,255,255,0.55)');
    halo.addColorStop(0.25,'rgba(180,140,255,0.18)');
    halo.addColorStop(1,   'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, hr, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth   = Math.max(0.5, 0.7*scale);
    ctx.beginPath();
    ctx.arc(x, y, size*3, 0, Math.PI*2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UniverseEngine | null>(null);
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

  const p = state?.particles ?? [];
  const maxLevel   = Math.max(1, ...p.map(q => q.level));
  const dormant    = p.filter(q => q.isLatent).length;
  const charged    = p.filter(q => q.charge !== 0).length;

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
              each particle is its own observer · no global clock control
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
          <div className="space-y-4 w-56">
            <Metric label="Entropy"       value={state?.entropy      ?? 1} icon={<Zap         size={11}/>} color="text-blue-400"    pct />
            <Metric label="Coherence"     value={state?.coherence    ?? 0} icon={<Layers      size={11}/>} color="text-emerald-400" pct />
            <Metric label="Temperature"   value={(state?.avgTemperature ?? 0).toFixed(4)} icon={<Thermometer size={11}/>} color="text-orange-400" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 opacity-35">
                <Brain size={11}/>
                <span className="text-[9px] uppercase tracking-widest font-bold">Max Complexity</span>
              </div>
              <div className="text-2xl font-light tracking-tighter">Lvl {maxLevel}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 opacity-35">
                <Orbit size={11}/>
                <span className="text-[9px] uppercase tracking-widest font-bold">Dormant</span>
              </div>
              <div className="text-2xl font-light tracking-tighter text-zinc-500">{dormant}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 opacity-35">
                <Zap size={11}/>
                <span className="text-[9px] uppercase tracking-widest font-bold">Charged</span>
              </div>
              <div className="text-2xl font-light tracking-tighter text-amber-400">{charged}</div>
            </div>
            <Metric label="Consciousness" value={state?.consciousnessCount ?? 0} icon={<Activity size={11}/>} color="text-violet-400" />
          </div>

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
            <div className="space-y-1">
              <div className="text-[9px] opacity-30 uppercase tracking-widest">Information</div>
              <div className="text-xl font-light tracking-tighter text-amber-400">
                {(state?.totalInformation ?? 0).toFixed(0)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-[2px]">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i}
                    className={`w-[3px] h-4 rounded-[1px] transition-colors duration-300 ${
                      i < (state?.coherence ?? 0) * 14 ? 'bg-white/70' : 'bg-white/8'
                    }`} />
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
            <div className="bg-[#080808]/95 border border-white/15 p-8 max-w-lg w-full pointer-events-auto shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em]">Physics Laws</h2>
                <button onClick={() => setShowInfo(false)} className="opacity-30 hover:opacity-80 text-sm">✕</button>
              </div>
              <div className="space-y-3 text-[10.5px] leading-relaxed opacity-65">
                {LAWS.map(([law, desc]) => (
                  <p key={law}><span className="text-white font-bold">{law}: </span>{desc}</p>
                ))}
                <div className="pt-4 border-t border-white/8 flex items-center gap-2 opacity-50">
                  <Cpu size={12}/>
                  <span className="uppercase tracking-widest text-[9px]">each particle is its own observer</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanline */}
      <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.06]
        bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)]
        bg-[length:100%_2px]" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Metric({ label, value, icon, color, pct }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; pct?: boolean;
}) {
  const n       = typeof value === 'string' ? parseFloat(value) : value;
  const display = pct ? `${(n*100).toFixed(1)}%` : value.toString();
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 opacity-35">
        {icon}
        <span className="text-[9px] uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className={`text-xl font-light tracking-tighter ${color}`}>{display}</div>
      <div className="w-full h-px bg-white/8 relative overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-current ${color}`}
          animate={{ width: pct ? `${Math.min(100, n*100)}%` : '100%' }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
        />
      </div>
    </div>
  );
}

const LAWS: [string, string][] = [
  ['LOCAL OBSERVER', 'No particle has global knowledge. Each computes only from its neighbourhood. No global barycenter — expansion is a local measurement of underdensity.'],
  ['LAZY EVALUATION', 'Separate active/dormant grids. Active particles run full physics O(active). Wake-up checks are O(active_cells × wakeRange²), not O(all_particles). Dormant particles do minimal geodesic drift — no nested loops.'],
  ['GRAVITY', 'F = G·m₁·m₂ / (r²+ε). All active particles follow geodesics in curved spacetime. Curvature is only contributed by active (observed) particles.'],
  ['ELECTROMAGNETISM', 'F = K·q₁·q₂ / (r²+ε). Charged particles (38% of total) attract opposites and repel same-sign at range=90, faster than gravity. Charge is conserved on fusion.'],
  ['SHORT-RANGE REPULSION', 'Below r<8: degeneracy pressure repels (Pauli exclusion analogue). Prevents point-collapse.'],
  ['CONSERVATION OF MOMENTUM', 'All fusion events: v_result = (p₁m₁ + p₂m₂)/(m₁+m₂). Singularity compression also conserves total momentum.'],
  ['SPEED OF LIGHT C=40', 'No particle exceeds C units/tick. Interactions only within local light cone.'],
  ['TIME DILATION', 'timeFactor = 1/(1 + κ·α). High-curvature regions evolve slower. All forces and motion scale with timeFactor.'],
  ['LOCAL EXPANSION', 'In underdense regions (density < target), particles feel outward expansion pressure proportional to local density gradient. No global reference needed.'],
  ['WAVE FUNCTION', 'Uncollapsed particles have a waveRadius (quantum uncertainty). It grows in isolation, shrinks on interaction. Rendered as a faint circle. Collapse is triggered by observation (interaction).'],
  ['THERMODYNAMICS', 'Each region has a temperature field. Particle kinetic energy heats the region (Larmor radiation from acceleration). Heat diffuses between adjacent regions and decays over time.'],
  ['HAWKING RADIATION', 'Collapsed entities with level>2 emit energy into their local region, heating it. Information stored in latent traces remains accessible.'],
  ['INFORMATION CONSERVATION', 'No information is lost. Dissolved entities redistribute weight. Absorbed ones persist as latent traces — re-emergeable when host has excess weight.'],
  ['BIG BANG', 'Universe spawns across 60,000 unit radius. Void particles are dormant at birth. Clusters form from 24 proto-galaxy seeds with proto-galactic spin.'],
];
