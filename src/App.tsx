import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Activity, Brain, Orbit, RefreshCw, Info, Layers, Cpu, Thermometer, Atom, Sigma } from 'lucide-react';
import { UniverseEngine, PersistentState, GRID_SIZE } from './UniverseEngine';
import { LazyDocumentary } from './LazyDocumentary';
import { UniverseState, Particle } from './types';

const STORAGE_KEY = 'lazy_universe_state_v6';

// ═══════════════════════════════════════════════════════════════════
//  VISUALIZATION
// ═══════════════════════════════════════════════════════════════════

function computeTransform(particles: Particle[], w: number, h: number, spectatorTarget?: { x: number, y: number, zoom: number }) {
  if (spectatorTarget) {
    const scale = spectatorTarget.zoom;
    const cx = spectatorTarget.x;
    const cy = spectatorTarget.y;
    return {
      toX: (wx: number) => (wx-cx)*scale + w/2,
      toY: (wy: number) => (wy-cy)*scale + h/2,
      scale,
    };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of particles) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const pad = 48, rangeX = Math.max(500, maxX-minX), rangeY = Math.max(500, maxY-minY);
  const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
  const scale = Math.min((w-pad*2)/rangeX, (h-pad*2)/rangeY);
  return {
    toX: (wx: number) => (wx-cx)*scale + w/2,
    toY: (wy: number) => (wy-cy)*scale + h/2,
    scale,
  };
}

function renderUniverse(ctx: CanvasRenderingContext2D, w: number, h: number, state: UniverseState, engine: UniverseEngine) {
  const { particles } = state;
  if (particles.length === 0) return;

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);

  const spectatorTarget = state.isSpectatorMode ? { x: state.viewportX, y: state.viewportY, zoom: state.zoom } : undefined;
  const { toX, toY, scale } = computeTransform(particles, w, h, spectatorTarget);

  // ── Layer 0: Energy Grid (Removed for performance/aesthetic) ──────

  // ── Layer 0.5: Cosmic Memory (Latent Information) ──────────────────
  if (state.campoLatente && state.campoLatente.length > 0) {
    ctx.save();
    for (const info of state.campoLatente) {
      const x = toX(info.x), y = toY(info.y);
      const size = Math.max(0.5, 0.8 * scale);
      ctx.fillStyle = `rgba(180, 180, 255, ${Math.min(0.15, 0.02 * info.intensity)})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Layer 1: gravitational field glow (Subtle) ──────────────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || !p.isCollapsed) continue;
    const isSing = p.id.startsWith('singularity');
    if (!isSing && !p.isBound) continue; // Only show subtle glow for singularities or bound matter

    const x = toX(p.x), y = toY(p.y);
    const glowR = Math.max(4, (2 + p.level * 2 + p.weight * 0.1) * scale);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    
    if (isSing) {
      glow.addColorStop(0, `rgba(160,80,255,${Math.min(0.15, 0.02 * p.level)})`);
      glow.addColorStop(1, 'transparent');
    } else {
      glow.addColorStop(0, `rgba(60,200,120,${Math.min(0.1, 0.01 * p.level)})`);
      glow.addColorStop(1, 'transparent');
    }
    
    ctx.fillStyle = glow;
    ctx.beginPath(); 
    ctx.arc(x, y, glowR, 0, Math.PI * 2); 
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 2: void / latent particles (quantum superposition) ────────
  ctx.save();
  for (const p of particles) {
    if (!p.isLatent) continue;
    const x = toX(p.x), y = toY(p.y);
    ctx.fillStyle = 'rgba(70,70,90,0.22)';
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.4, 0.45*scale), 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Layer 3: photon-like fast particles (Subtle Trails) ────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || p.isCollapsed || p.charge !== 0) continue;
    const spd2 = p.vx**2 + p.vy**2;
    if (spd2 < 400) continue; 
    const x = toX(p.x), y = toY(p.y);
    const spd = Math.sqrt(spd2);
    const len = Math.min(8, spd) * scale * 2;
    const nx = -p.vx/spd, ny = -p.vy/spd;
    
    ctx.strokeStyle = 'rgba(255,255,200,0.3)';
    ctx.lineWidth = Math.max(0.3, 0.5 * scale);
    ctx.beginPath(); 
    ctx.moveTo(x, y); 
    ctx.lineTo(x + nx * len, y + ny * len); 
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,220,0.6)';
    ctx.beginPath(); 
    ctx.arc(x, y, Math.max(0.4, 0.6 * scale), 0, Math.PI * 2); 
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 4: uncollapsed particles (quantum superposition state) ─────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || p.isCollapsed) continue;
    const spd2 = p.vx**2 + p.vy**2;
    if (spd2 >= 400 && p.charge === 0) continue; // handled above as photon
    const x = toX(p.x), y = toY(p.y);
    const size = Math.max(0.8, 1.0*scale);

    // Wave radius cloud — quantum uncertainty
    const wr = (p.waveRadius || 0) * scale;
    if (wr > 1) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, wr);
      if (p.charge > 0) {
        grad.addColorStop(0, 'rgba(255,120,60,0.08)');
        grad.addColorStop(0.6, 'rgba(255,120,60,0.03)');
      } else if (p.charge < 0) {
        grad.addColorStop(0, 'rgba(60,120,255,0.08)');
        grad.addColorStop(0.6, 'rgba(60,120,255,0.03)');
      } else {
        grad.addColorStop(0, 'rgba(120,180,255,0.06)');
        grad.addColorStop(0.6, 'rgba(120,180,255,0.02)');
      }
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, wr, 0, Math.PI*2); ctx.fill();

      // Wave boundary circle
      ctx.strokeStyle = p.charge === 0
        ? 'rgba(120,180,255,0.1)'
        : (p.charge > 0 ? 'rgba(255,120,60,0.12)' : 'rgba(60,120,255,0.12)');
      ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.arc(x, y, wr, 0, Math.PI*2); ctx.stroke();
    }

    // Velocity streak
    const spd = Math.sqrt(spd2);
    if (spd > 2.5 && scale > 0.0005) {
      const len = Math.min(10, spd) * scale * 2.5;
      const nx = -p.vx/spd, ny = -p.vy/spd;
      const g = ctx.createLinearGradient(x, y, x+nx*len, y+ny*len);
      g.addColorStop(0, p.color.replace('0.2)', '0.4)'));
      g.addColorStop(1, 'transparent');
      ctx.strokeStyle = g; ctx.lineWidth = size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+nx*len, y+ny*len); ctx.stroke();
    }

    // Core with charge color
    let bodyColor = p.color.replace('0.2)', '0.5)');
    if (p.isDarkMatter) {
      bodyColor = 'rgba(120, 0, 200, 0.15)'; // faint purple for dark matter
    } else {
      if (p.charge > 0) bodyColor = 'rgba(255,150,80,0.55)';
      if (p.charge < 0) bodyColor = 'rgba(80,130,255,0.55)';
    }
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Layer 4.5: Entanglement and Molecule links ───────────────────────
  ctx.save();
  const drawnLinks = new Set<string>();
  const particleMap = new Map<string, Particle>();
  const moleculeMap = new Map<string, Particle[]>();
  
  for (const p of particles) {
    particleMap.set(p.id, p);
    if (p.moleculeId) {
      if (!moleculeMap.has(p.moleculeId)) moleculeMap.set(p.moleculeId, []);
      moleculeMap.get(p.moleculeId)!.push(p);
    }
  }

  for (const p of particles) {
    // Entanglement
    if (p.entangledWith && !drawnLinks.has(p.id + p.entangledWith)) {
      const partner = particleMap.get(p.entangledWith);
      if (partner) {
        ctx.strokeStyle = 'rgba(255, 100, 255, 0.15)';
        ctx.lineWidth = Math.max(0.5, 0.5 * scale);
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(toX(p.x), toY(p.y));
        ctx.lineTo(toX(partner.x), toY(partner.y));
        ctx.stroke();
        drawnLinks.add(partner.id + p.id);
        drawnLinks.add(p.id + partner.id);
      }
    }
  }
  
  // Molecule bonds
  for (const [molId, molParticles] of moleculeMap) {
    if (molParticles.length >= 2) {
      const p1 = molParticles[0];
      const p2 = molParticles[1];
      const isOrganic = (p1.element === 'C' || p1.element === 'H') && (p2.element === 'C' || p2.element === 'H');
      ctx.strokeStyle = isOrganic ? 'rgba(50, 255, 50, 0.6)' : 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toX(p1.x), toY(p1.y));
      ctx.lineTo(toX(p2.x), toY(p2.y));
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  // ── Layer 5: collapsed particles ────────────────────────────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || !p.isCollapsed || p.isConscious) continue;
    const x = toX(p.x), y = toY(p.y);
    const isSing  = p.id.startsWith('singularity');
    const size    = Math.max(1, (1.5 + p.level*0.8 + p.weight*0.1)*scale);

    // Bound state glow (nuclear binding — green tint)
    if (p.isBound) {
      ctx.strokeStyle = `rgba(60,220,120,${Math.min(0.7, 0.15*p.level+0.1)})`;
      ctx.lineWidth   = Math.max(0.4, 0.5*scale);
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(x, y, size*2.2, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Level ring
    if (p.level > 1) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.5, 0.07*p.level)})`;
      ctx.lineWidth   = Math.max(0.3, 0.4*scale);
      ctx.beginPath(); ctx.arc(x, y, size*2, 0, Math.PI*2); ctx.stroke();
    }

    // Singularity halo
    if (isSing) {
      ctx.strokeStyle = 'rgba(160,80,255,0.5)';
      ctx.lineWidth   = Math.max(0.5, 0.6*scale);
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y, size*4.5, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Latent trace ring (stored information)
    if (p.latentTraces?.length) {
      ctx.strokeStyle = `rgba(255,165,0,${Math.min(0.5, 0.04*p.latentTraces.length)})`;
      ctx.lineWidth   = Math.max(0.3, 0.5*scale);
      ctx.beginPath(); ctx.arc(x, y, size + Math.max(1.5, 2*scale), 0, Math.PI*2); ctx.stroke();
    }

    // Charge indicator
    if (p.charge !== 0) {
      ctx.strokeStyle = p.charge > 0 ? 'rgba(255,110,50,0.5)' : 'rgba(50,110,255,0.5)';
      ctx.lineWidth   = Math.max(0.3, 0.35*scale);
      ctx.beginPath(); ctx.arc(x, y, size*1.4, 0, Math.PI*2); ctx.stroke();
    }

    // Spin indicator — tiny arc showing spin direction
    if (Math.abs(p.spin) > 0 && size > 1.5) {
      const spinArc = p.spin > 0 ? [0, Math.PI] : [Math.PI, Math.PI*2];
      ctx.strokeStyle = 'rgba(200,200,255,0.3)';
      ctx.lineWidth = Math.max(0.2, 0.25*scale);
      ctx.beginPath(); ctx.arc(x, y, size*0.7, spinArc[0], spinArc[1]); ctx.stroke();
    }

    // Core
    const bright = Math.min(255, 165+p.level*14);
    ctx.fillStyle = `rgba(${bright},${bright},${bright},${Math.min(0.95, 0.5+p.level*0.06)})`;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Layer 6: conscious entities ─────────────────────────────────────
  ctx.save();
  for (const p of particles) {
    if ((!p.isConscious && !p.isCollectiveConscious) || p.isLatent) continue;
    const x = toX(p.x), y = toY(p.y);
    const size = Math.max(2, (2 + p.level*1.2 + p.weight*0.12)*scale);
    const hr = size*10;
    const halo = ctx.createRadialGradient(x, y, size*0.5, x, y, hr);
    
    if (p.isCollectiveConscious) {
      halo.addColorStop(0,    'rgba(255,255,255,0.7)');
      halo.addColorStop(0.25, 'rgba(255,180,80,0.25)');
      halo.addColorStop(1,    'transparent');
    } else {
      halo.addColorStop(0,    'rgba(255,255,255,0.55)');
      halo.addColorStop(0.25, 'rgba(180,140,255,0.18)');
      halo.addColorStop(1,    'transparent');
    }
    
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, hr, 0, Math.PI*2); ctx.fill();
    
    ctx.strokeStyle = p.isCollectiveConscious ? 'rgba(255,200,100,0.4)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = Math.max(0.5, 0.7*scale);
    ctx.beginPath(); ctx.arc(x, y, size*3, 0, Math.PI*2); ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UniverseEngine | null>(null);
  const lazyDocRef = useRef<LazyDocumentary | null>(null);
  const [state, setState] = useState<UniverseState | null>(null);
  const [lazyMetrics, setLazyMetrics] = useState({ 
    economy: '0%', 
    latentesPct: '0%', 
    calculandoPct: '0%', 
    event: 'None', 
    nextScan: 0 
  });
  const [showInfo, setShowInfo] = useState(false);
  const requestRef = useRef<number>(0);

  const initEngine = useCallback((forceReset = false) => {
    if (typeof window === 'undefined') return;
    let saved: PersistentState | null = null;
    if (!forceReset) {
      try {
        const item = localStorage.getItem(STORAGE_KEY);
        console.log('Persistence: loading from localStorage', item ? 'found' : 'not found');
        if (item) {
          saved = JSON.parse(item);
          console.log('Persistence: loaded successfully');
        }
      } catch (e) {
        console.error('Persistence: failed to load', e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    engineRef.current = new UniverseEngine(saved || undefined);
    lazyDocRef.current = new LazyDocumentary(engineRef.current);
    setState(engineRef.current.step());
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (engineRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(engineRef.current.getPersistentState()));
          console.log('Persistence: saved on beforeunload');
        } catch (e) {
          console.error('Persistence: failed to save on beforeunload', e);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => { initEngine(); }, [initEngine]);

  const animate = useCallback(() => {
    if (!engineRef.current) { requestRef.current = requestAnimationFrame(animate); return; }
    const newState = engineRef.current.step();
    
    // Spectator Mode Camera
    if (newState.isSpectatorMode && newState.significantEvents.length > 0) {
        const lastEvent = newState.significantEvents[newState.significantEvents.length - 1];
        // Smooth pan to event
        newState.viewportX += (lastEvent.x - newState.viewportX) * 0.05;
        newState.viewportY += (lastEvent.y - newState.viewportY) * 0.05;
        newState.zoom += (1.2 - newState.zoom) * 0.02;
    } else if (newState.isSpectatorMode) {
        // Default slow pan if no events
        newState.viewportX += Math.sin(newState.tick * 0.01) * 2;
        newState.viewportY += Math.cos(newState.tick * 0.01) * 2;
        newState.zoom += (0.8 - newState.zoom) * 0.01;
    }

    setState(newState);
    if (newState.tick % 120 === 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(engineRef.current.getPersistentState())); }
      catch (_) {}
    }
    if (newState.tick % 10 === 0 && lazyDocRef.current) {
      setLazyMetrics(lazyDocRef.current.getMetrics());
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx && engineRef.current) renderUniverse(ctx, canvas.width, canvas.height, newState, engineRef.current);
    }
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  const p   = state?.particles ?? [];
  const maxLevel  = Math.max(1, ...p.map(q => q.level));
  const dormant   = p.filter(q => q.isLatent).length;
  const charged   = p.filter(q => q.charge !== 0).length;
  const bound     = p.filter(q => q.isBound && !q.isLatent).length;

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white overflow-hidden font-mono">
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        className="absolute inset-0 z-0"
      />

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">

        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <h1 className="text-xs uppercase tracking-[0.3em] font-bold opacity-80">
                Lazy Universe Observer
              </h1>
            </div>
            <p className="text-[10px] opacity-30 uppercase tracking-widest">
              each particle is its own observer · freedom through physics
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

        <main className="flex justify-between items-end">
          <div className="space-y-3 w-60">
            {/* Documentary Mode Overlay */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-lg space-y-3 mb-4 pointer-events-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-[10px] uppercase tracking-widest font-bold text-orange-400">Modo Documentário</h2>
                <button 
                  onClick={() => {
                    if (engineRef.current) {
                      engineRef.current.state.isSpectatorMode = !engineRef.current.state.isSpectatorMode;
                      setState({...engineRef.current.state});
                    }
                  }}
                  className={`px-2 py-1 text-[8px] rounded border transition-all ${state?.isSpectatorMode ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'border-white/20 text-white/40'}`}
                >
                  {state?.isSpectatorMode ? 'ESPECTADOR ATIVO' : 'ATIVAR ESPECTADOR'}
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="opacity-50">Ciclo atual:</span>
                  <span className="text-white">#{state?.currentCycle} | Tick {state?.tick}</span>
                </div>
                {state?.history && state.history.length > 0 && (
                  <div className="text-[9px] border-t border-white/5 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-50">Vs Ciclo #{state.history[state.history.length-1].cycleId}:</span>
                      <span className={(state.collectiveConsciousnessNodes ?? 0) > (state.history[state.history.length-1].maxNodes ?? 0) ? 'text-emerald-400' : 'text-red-400'}>
                        {Math.round(((state.collectiveConsciousnessNodes ?? 0) / (state.history[state.history.length-1].maxNodes || 1) - 1) * 100)}% Nós
                      </span>
                    </div>
                    <div className="opacity-40 italic">
                      Próximo marco previsto: Consciência em {Math.max(1, 50 - ((state?.tick ?? 0) % 50))} ticks
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/5 pt-3 space-y-1.5">
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Eficiência lazy:</span>
                  <span className="text-emerald-400 font-bold">{lazyMetrics.economy}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Entidades latentes:</span>
                  <span className="text-zinc-400">{lazyMetrics.latentesPct}% do universo</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Sendo calculado agora:</span>
                  <span className="text-orange-400">{lazyMetrics.calculandoPct}%</span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 space-y-1.5">
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Cultura Transmissível:</span>
                  <span className="text-blue-400 font-bold">{(state?.culture || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Tecnologia Emergente:</span>
                  <span className="text-cyan-400 font-bold">{state?.technology || 0} TECH</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Memória Cósmica:</span>
                  <span className="text-purple-400 font-bold">{state?.latentTraceCount || 0} traços</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="opacity-40">Ciclos de Extinção:</span>
                  <span className="text-red-400 font-bold">{state?.extinctionCycles || 0}</span>
                </div>
                {state?.metaConsciousness && (
                  <div className="text-[10px] text-center font-bold text-yellow-400 animate-pulse mt-2 border border-yellow-500/30 py-1 bg-yellow-500/10 rounded">
                    META-CONSCIÊNCIA ATINGIDA
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  if (engineRef.current) {
                    engineRef.current.resetUniverse();
                    setState({...engineRef.current.state});
                  }
                }}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] uppercase tracking-widest transition-all"
              >
                Reiniciar Ciclo (Big Bang)
              </button>
            </div>

            <Metric label="Entropy"       value={state?.entropy      ?? 1} icon={<Zap          size={11}/>} color="text-blue-400"    pct />
            <Metric label="Coherence"     value={state?.coherence    ?? 0} icon={<Layers       size={11}/>} color="text-emerald-400" pct />
            <Metric label="Temperature"   value={engineRef.current ? (engineRef.current.temperature.observar().toFixed(4)) : 0} icon={<Thermometer size={11}/>} color="text-orange-400" />

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
              <Stat label="Complexity" value={`Lvl ${maxLevel}`} icon={<Brain size={10}/>} color="text-white" />
              <Stat label="Dormant"    value={dormant}           icon={<Orbit size={10}/>} color="text-zinc-400" />
              <Stat label="Charged"    value={charged}           icon={<Zap   size={10}/>} color="text-amber-400" />
              <Stat label="Bound"      value={bound}             icon={<Atom  size={10}/>} color="text-emerald-400" />
              <Stat label="Moléculas"  value={state?.moleculeCount ?? 0} icon={<Atom size={10}/>} color="text-emerald-300" />
              <Stat label="Orgânicas"  value={state?.organicCount ?? 0} icon={<Atom size={10}/>} color="text-emerald-500" />
              <Stat label="Replicantes" value={state?.replicantCount ?? 0} icon={<Activity size={10}/>} color="text-blue-400" />
              <Stat label="Vida"       value={state?.lifeCount ?? 0} icon={<Activity size={10}/>} color="text-violet-400" />
              <Stat label="Relações"   value={state?.relationsCount ?? 0} icon={<Brain size={10}/>} color="text-blue-300" />
              <Stat label="Nós"        value={state?.collectiveConsciousnessNodes ?? 0} icon={<Brain size={10}/>} color="text-violet-300" />
              <Stat label="Cultura"    value={state?.culture?.toFixed(2) ?? 0} icon={<Activity size={10}/>} color="text-orange-300" />
              <Stat label="Gerações"   value={state?.maxGeneration ?? 0} icon={<Activity size={10}/>} color="text-violet-600" />
              <Stat label="Pairs"      value={state?.pairProductionCount ?? 0} icon={<Sigma size={10}/>} color="text-orange-300" />
              <Stat label="Annihilat." value={state?.annihilationCount   ?? 0} icon={<Zap  size={10}/>} color="text-red-400" />
              <Stat label="Fissions"   value={state?.fissionCount        ?? 0} icon={<Atom size={10}/>} color="text-yellow-400" />
              <Stat label="Conscious"  value={state?.consciousnessCount  ?? 0} icon={<Activity size={10}/>} color="text-violet-400" />
              <Stat label="Ciclos"     value={state?.recycledMatterCount ?? 0} icon={<RefreshCw size={10}/>} color="text-emerald-400" />
              <Stat label="Memória"    value={state?.latentTraceCount    ?? 0} icon={<Brain size={10}/>} color="text-blue-400" />
              <Stat label="Fertilidade" value={(state?.fertility ?? 0).toFixed(2)} icon={<Activity size={10}/>} color="text-orange-400" />
            </div>
          </div>

          <div className="w-60 text-right space-y-2">
            <div className="text-[9px] opacity-30 uppercase tracking-widest">Linha do Tempo Cósmica</div>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {state?.history?.slice().reverse().map((h, i) => (
                <div key={i} className="text-right space-y-1 border-r border-white/10 pr-3 mr-1">
                  <div className="text-[9px] font-bold text-orange-300">Ciclo #{h.cycleId}</div>
                  <div className="text-[8px] opacity-40">Finalizado em {h.totalTicks} ticks</div>
                  <div className="text-[8px] text-zinc-500 italic">
                    {h.milestones.slice(-1).map(m => m.event)}
                  </div>
                </div>
              ))}
              <div className="text-right space-y-1 border-r border-emerald-500/30 pr-3 mr-1">
                <div className="text-[9px] font-bold text-emerald-400">Ciclo #{state?.currentCycle} (Atual)</div>
                <div className="text-[8px] opacity-40 animate-pulse">Evoluindo...</div>
              </div>
            </div>

            <div className="pt-4">
              <div className="text-[9px] opacity-30 uppercase tracking-widest">Eventos Recentes</div>
              <div className="space-y-1 text-[10px] text-zinc-400 max-h-40 overflow-y-auto">
                {state?.events?.slice(-5)?.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            </div>
          </div>

          <div className="text-right space-y-3">
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
                {engineRef.current ? engineRef.current.curvature.observar().toFixed(3) : 0}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] opacity-30 uppercase tracking-widest">Particle Count</div>
              <div className="text-xl font-light tracking-tighter text-amber-400">
                {engineRef.current ? engineRef.current.particleCount.observar() : 0}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-[2px]">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i}
                    className={`w-[3px] h-4 rounded-[1px] transition-colors duration-300 ${
                      i < (state?.coherence ?? 0)*14 ? 'bg-white/70' : 'bg-white/8'
                    }`} />
                ))}
              </div>
              <div className="text-[8px] opacity-20 uppercase tracking-[0.2em]">Structural Integrity</div>
            </div>
          </div>
        </main>
      </div>

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
              <div className="space-y-2.5 text-[10px] leading-relaxed opacity-65">
                {LAWS.map(([law, desc]) => (
                  <p key={law}><span className="text-white font-bold">{law}: </span>{desc}</p>
                ))}
                <div className="pt-4 border-t border-white/8 flex items-center gap-2 opacity-50">
                  <Cpu size={12}/><span className="uppercase tracking-widest text-[9px]">each particle is its own observer</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.055]
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
        {icon}<span className="text-[9px] uppercase tracking-widest font-bold">{label}</span>
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

function Stat({ label, value, icon, color }: {
  label: string; value: number | string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 opacity-30">
        {icon}<span className="text-[8px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-lg font-light tracking-tighter ${color}`}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAWS REFERENCE
// ═══════════════════════════════════════════════════════════════════

const LAWS: [string, string][] = [
  ['LOCAL OBSERVER', 'No particle has global knowledge. Each only processes its local neighbourhood. No global barycenter — expansion emerges from local density observation.'],
  ['LAZY EVALUATION', 'Separate active/dormant grids. Active: full physics O(active). Wake-up: O(active_cells × wakeRange²). Dormant: O(1) geodesic drift only. The universe never processes what it doesn\'t need to.'],
  ['FREEDOM', 'Particle identity is not fixed at birth. It changes through physics: charge flips (beta decay), mass splits (fission), new matter born from energy (pair production), bound states form (atoms). The physics decides, not the programmer.'],
  ['GRAVITY', 'F = G·m₁·m₂/(r²+ε). Only active (observed) particles curve spacetime. Dormant particles are in superposition — no classical gravitational field.'],
  ['DARK MATTER', '25% of the universe. Interacts only via gravity. Invisible to electromagnetism, strong, and weak forces. Forms the unseen scaffolding of galaxies.'],
  ['DARK ENERGY', 'Cosmological constant (Λ) driving local expansion when density drops below a critical threshold. Pushes particles apart in voids.'],
  ['ELECTROMAGNETISM', 'F = K·q·q/(r²+ε). Charged particles (38%) attract opposites, repel same at range=90. Faster than gravity.'],
  ['SPIN-ORBIT COUPLING', 'Magnetic-like force: spin × charge creates an additional force. Same spin + same charge = extra repulsion. Opposite spin + opposite charge = extra attraction (bonding).'],
  ['STRONG NUCLEAR FORCE', 'At r < 4.5, very strong attractive force overwhelms EM repulsion. Creates bound states analogous to atoms. Hard core prevents r < 1.5. Bound particles have reduced orbital drag.'],
  ['WEAK FORCE (BETA DECAY)', 'Rare charge flip per tick (0.012%/tick). Spin also flips. W boson emitted as heat. Particles can change their electromagnetic identity over time.'],
  ['QUANTUM ENTANGLEMENT', 'Spooky action at a distance. Interacting particles can become entangled. If one undergoes beta decay and flips its spin, its partner instantly flips its spin regardless of distance.'],
  ['FISSION', 'Spontaneous splitting when weight > 18. Probability scales with excess weight. Daughter has opposite momentum (conserved) and opposite charge. Energy released as heat. Latent traces split.'],
  ['PAIR PRODUCTION', 'In hot regions (T > 2.5), thermal energy creates particle + antiparticle pairs. Energy E is conserved: T -= cost. Pairs have opposite momenta.'],
  ['ANNIHILATION', 'When opposite-charged collapsed particles meet within r < 2.2: E = m·c². Both destroyed. 2 photon-like particles emitted at C in opposite directions. Huge heat burst.'],
  ['DEGENERACY PRESSURE', 'At 4.5 < r < 8: Pauli exclusion repulsion. Prevents classical collapse to a point.'],
  ['WAVE FUNCTION / DE BROGLIE', 'waveRadius = ħ/p. Fast/heavy particles are localized (particle-like). Slow/light are spread (wave-like). Observation (interaction) collapses the wave function.'],
  ['THERMODYNAMICS', 'Per-region temperature field. Larmor radiation: acceleration → heat. Collapse emits heat. Fusion emits heat. Heat diffuses between adjacent regions and decays.'],
  ['HAWKING RADIATION', 'Level > 2 collapsed entities emit energy into local region. Information stored in latent traces.'],
  ['MOMENTUM CONSERVATION', 'Fusion: v = (p₁m₁+p₂m₂)/(m₁+m₂). Fission: daughter has opposite momentum recoil. Singularity compression conserves total momentum. Annihilation: photons emitted in opposite directions.'],
  ['SPEED OF LIGHT C=40', 'No particle exceeds C per tick. Photon-like particles (fast, uncharged, massless) travel at ≈C.'],
  ['TIME DILATION', 'tf = 1/(1+κ·α). All forces and motion scale by tf. Dense regions evolve slower.'],
  ['INFORMATION CONSERVATION', 'Dissolution: weight redistributed. Fusion: latent traces inherited. Fission: traces split. Latent traces re-emerge when host weight allows.'],
  ['BIG BANG', '1800 particles. 24 proto-galaxy clusters with proto-galactic spin. Void particles dormant from birth. ±60,000 unit radius.'],
];
