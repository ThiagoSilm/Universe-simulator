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

const STORAGE_KEY = 'lazy_universe_state_v1';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UniverseEngine | null>(null);
  const [state, setState] = useState<UniverseState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState<number | 'MAX'>(1);
  const [actualTPS, setActualTPS] = useState(0);
  const requestRef = useRef<number>(0);
  const lastVisualUpdateRef = useRef<number>(0);
  const tickCounterRef = useRef<number>(0);
  const lastTPSUpdateRef = useRef<number>(0);

  const initEngine = useCallback((forceReset = false) => {
    if (typeof window !== 'undefined') {
      let savedState: PersistentState | null = null;
      
      if (!forceReset) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            savedState = JSON.parse(raw);
            console.log('Restoring universe from temporal anchor...');
          } catch (e) {
            console.error('Temporal anchor corrupted. Initiating Big Bang...');
          }
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      engineRef.current = new UniverseEngine(savedState || undefined);
      // Initial state sync
      const initialState = engineRef.current.step(window.innerWidth, window.innerHeight);
      setState(initialState);
    }
  }, []);

  useEffect(() => {
    initEngine();
    
    const handleResize = () => {
      initEngine();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initEngine]);

  const animate = useCallback(() => {
    if (!engineRef.current || isPaused) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = performance.now();
    let newState = state;
    let ticksThisFrame = 0;

    // Physics Processing
    const canvas = canvasRef.current;
    const viewW = canvas?.width ?? 800;
    const viewH = canvas?.height ?? 600;

    if (timeSpeed === 'MAX') {
      // Time-budgeted processing for MAX speed (~12ms per frame to stay under 16ms)
      const budget = 12;
      while (performance.now() - now < budget) {
        newState = engineRef.current.step(viewW, viewH);
        ticksThisFrame++;
      }
    } else {
      // Fixed number of steps per frame
      for (let i = 0; i < (timeSpeed as number); i++) {
        newState = engineRef.current.step(viewW, viewH);
        ticksThisFrame++;
      }
    }

    tickCounterRef.current += ticksThisFrame;

    // TPS Calculation (once per second)
    if (now - lastTPSUpdateRef.current > 1000) {
      setActualTPS(tickCounterRef.current);
      tickCounterRef.current = 0;
      lastTPSUpdateRef.current = now;
    }

    // Rendering Logic
    // If speed > 1, only update visual state and draw once per second
    const shouldUpdateVisuals = (timeSpeed as any) <= 1 || (now - lastVisualUpdateRef.current > 1000);

    if (newState && shouldUpdateVisuals) {
      setState(newState);
      lastVisualUpdateRef.current = now;
      
      // Persist state to localStorage (throttled to visual updates)
      try {
        const persistentState = engineRef.current.getPersistentState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState));
      } catch (e) {}

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const vX = newState.viewportX;
          const vY = newState.viewportY;
          const zoom = newState.zoom;

          newState.particles.forEach(p => {
            const x = (p.x - vX) * zoom + centerX;
            const y = (p.y - vY) * zoom + centerY;

            if (x < -100 || x > canvas.width + 100 || y < -100 || y > canvas.height + 100) return;

            const size = (p.isCollapsed ? (1.5 + p.level + p.weight * 0.2) : 1.5) * zoom;
            const alpha = p.isLatent ? 0.05 : (p.isCollapsed ? 0.8 : 0.2);
            
            if (p.isCollapsed && p.level > 1 && !p.isLatent) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * p.level})`;
              ctx.lineWidth = 0.5 * zoom;
              ctx.beginPath();
              ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (p.isConscious && !p.isLatent) {
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 6);
              gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, size * 6, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.fillStyle = p.isLatent ? '#333' : (p.isCollapsed ? `rgba(255, 255, 255, ${alpha})` : p.color);
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();

            if (p.latentTraces && p.latentTraces.length > 0 && !p.isLatent) {
              ctx.strokeStyle = 'rgba(255, 165, 0, 0.4)';
              ctx.lineWidth = 1 * zoom;
              ctx.beginPath();
              ctx.arc(x, y, size + 2 * zoom, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (p.id.startsWith('singularity')) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.setLineDash([2 * zoom, 2 * zoom]);
              ctx.beginPath();
              ctx.arc(x, y, size * 3, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });

          // Re-add Tactical Radar (Minimap)
          drawTacticalRadar(ctx, canvas, newState);
        }
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isPaused, timeSpeed, state]);

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

      {/* Overlay UI - Hardware/Specialist Tool Aesthetic */}
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
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-sm">
              {[1, 10, 100, 1000, 'MAX'].map((s) => (
                <button
                  key={s}
                  onClick={() => setTimeSpeed(s as any)}
                  className={`px-2 py-1 text-[9px] transition-colors rounded-[1px] ${
                    timeSpeed === s 
                      ? 'bg-white text-black font-bold' 
                      : 'hover:bg-white/10 text-white/60'
                  }`}
                >
                  {s === 'MAX' ? s : `${s}X`}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 border border-white/10 hover:bg-white hover:text-black transition-colors rounded-sm"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <RefreshCw size={14} /> : <Activity size={14} />}
            </button>
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
            <MetricBlock 
              label="Observer Zoom" 
              value={state?.zoom ?? 1} 
              icon={<Orbit size={12} />} 
              color="text-zinc-400"
            />
          </div>

          {/* Right Panel: Status */}
          <div className="text-right space-y-4">
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 uppercase tracking-widest">Coordinates</div>
              <div className="text-xs font-mono opacity-60">
                X: {state?.viewportX.toFixed(0)} Y: {state?.viewportY.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] opacity-40 uppercase tracking-widest">Temporal Index</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-light tracking-tighter">
                  {state?.tick.toLocaleString().padStart(8, '0')}
                </div>
                <div className="text-[10px] text-amber-500 font-bold">
                  {timeSpeed === 'MAX' ? 'MAX' : `${timeSpeed}X`} SPEED
                </div>
                <div className="text-[8px] text-emerald-500/60 font-bold border border-emerald-500/20 px-1 rounded-[2px] animate-pulse">PERSISTENT</div>
                <div className="text-[8px] text-amber-500/60 font-bold border border-amber-500/20 px-1 rounded-[2px]">RELATIVISTIC</div>
              </div>
              <div className="text-[9px] opacity-40 flex items-center gap-2">
                <Activity size={10} className="text-emerald-500" />
                <span>{actualTPS.toLocaleString()} TICKS/SEC</span>
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
                  <span className="text-white font-bold">UNIVERSAL PHYSICS:</span> The universe is a persistent simulation. Physics processing (gravity, collisions, expansion) occurs for all entities simultaneously, regardless of whether they are being observed.
                </p>
                <p>
                  <span className="text-white font-bold">LAZY RENDERING:</span> To optimize visual throughput, only entities within the observer's current field of vision are rendered to the display buffer. Reality exists beyond the frame.
                </p>
                <p>
                  <span className="text-white font-bold">DORMANCY STATE:</span> Entities that haven't interacted for extended periods enter a "Dormant" state. They continue to follow gravitational geodesics but minimize complex local interactions until disturbed.
                </p>
                <p>
                  <span className="text-white font-bold">ADAPTIVE ZOOM:</span> The observer's focal length automatically adjusts based on the weighted mass distribution of the entire universe, maintaining structural context across scales.
                </p>
                <p>
                  <span className="text-white font-bold">EMERGENT GRAVITY:</span> Entities exert attraction proportional to their weight. In this relativistic model, gravity is the result of entities following geodesics in curved space-time.
                </p>
                <p>
                  <span className="text-white font-bold">SPACE-TIME CURVATURE:</span> Entities distort the local field proportional to their weight. Other entities follow geodesics in this distorted field, creating emergent gravitational paths.
                </p>
                <p>
                  <span className="text-white font-bold">TIME DILATION:</span> In regions of high curvature (high mass), local time slows down. Entities in these fields process interactions and evolution at a lower rate relative to the universal tick.
                </p>
                <p>
                  <span className="text-white font-bold">SPEED OF LIGHT (C):</span> Information and entities cannot exceed <span className="text-amber-400">C = 40</span> units per tick. Interactions only occur within an entity's local light cone.
                </p>
                <p>
                  <span className="text-white font-bold">BEKENSTEIN LIMIT:</span> Each spatial region has a maximum information capacity. When exceeded, pressure forces smaller entities out, while larger ones are forced to collapse into higher-level complexity (Fusion).
                </p>
                <p>
                  <span className="text-white font-bold">INFORMATION CONSERVATION:</span> No data is lost. Dissolved entities redistribute their weight to neighbors. Absorbed entities persist as latent traces, capable of re-emerging when energy density allows.
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

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-20 opacity-20" />
    </div>
  );
}

function drawTacticalRadar(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: UniverseState) {
  const radarSize = 140;
  const padding = 24;
  const x = canvas.width - radarSize - padding;
  const y = canvas.height - radarSize - padding;

  // Radar Frame (Hardware Aesthetic)
  ctx.save();
  ctx.translate(x, y);
  
  // Outer Glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
  
  // Background
  ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(0, 0, radarSize, radarSize);
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowBlur = 0;

  // Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const pos = (radarSize / 4) * i;
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, radarSize);
    ctx.moveTo(0, pos);
    ctx.lineTo(radarSize, pos);
  }
  ctx.stroke();

  // Find bounds for scaling
  let minX = -1000, maxX = 1000, minY = -1000, maxY = 1000;
  state.particles.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const range = Math.max(3000, maxX - minX, maxY - minY);
  const scale = radarSize / range;
  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;

  // Draw Particles on Radar
  state.particles.forEach(p => {
    const px = (p.x - offsetX) * scale + radarSize / 2;
    const py = (p.y - offsetY) * scale + radarSize / 2;
    
    if (px < 0 || px > radarSize || py < 0 || py > radarSize) return;

    if (p.isLatent) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(px - 0.5, py - 0.5, 1, 1);
    } else {
      ctx.fillStyle = p.isCollapsed ? '#fff' : 'rgba(255, 255, 255, 0.4)';
      const size = p.isCollapsed ? 2 : 1;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw Viewport Indicator
  const viewW = (canvas.width / state.zoom) * scale;
  const viewH = (canvas.height / state.zoom) * scale;
  const viewX = (state.viewportX - offsetX) * scale + radarSize / 2 - viewW / 2;
  const viewY = (state.viewportY - offsetY) * scale + radarSize / 2 - viewH / 2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(viewX, viewY, viewW, viewH);

  // Crosshair in viewport
  ctx.beginPath();
  ctx.moveTo(viewX + viewW / 2 - 3, viewY + viewH / 2);
  ctx.lineTo(viewX + viewW / 2 + 3, viewY + viewH / 2);
  ctx.moveTo(viewX + viewW / 2, viewY + viewH / 2 - 3);
  ctx.lineTo(viewX + viewW / 2, viewY + viewH / 2 + 3);
  ctx.stroke();

  // Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('TACTICAL RADAR', 4, -6);
  ctx.fillText('RANGE: ' + (range / 1000).toFixed(1) + 'kLY', 4, radarSize + 12);

  ctx.restore();
}

function MetricBlock({ label, value, icon, color, percentage }: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  percentage?: boolean;
}) {
  const displayValue = percentage ? `${(value * 100).toFixed(1)}%` : value.toString();
  
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
          animate={{ width: percentage ? `${value * 100}%` : '100%' }}
          transition={{ type: 'spring', bounce: 0, duration: 1 }}
        />
      </div>
    </div>
  );
}

