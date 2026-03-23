import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Activity,
  Database,
  Eye,
  Terminal,
  Info,
  Layers,
  Cpu,
} from "lucide-react";
import { Particle, SimulationState, WorkerMessage, WorkerResponse } from "./types";
import { calculateObserverMetrics, ObserverMetrics } from "./ObserverLayer";
import { LazyDocumentary, DocumentaryEvent } from "./LazyDocumentary";

// ═══════════════════════════════════════════════════════════════════
//  VISUALIZATION
// ═══════════════════════════════════════════════════════════════════

function renderSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimulationState,
) {
  const { particles } = state;

  // ── Background ────────────────────────────────────────────────────
  ctx.fillStyle = "#020203";
  ctx.fillRect(0, 0, w, h);

  // ── Particles ─────────────────────────────────────────────────────
  particles.forEach(p => {
    if (p.isLatent && p.persistence < 0.01) return; // Don't even draw if extremely latent

    const size = p.isCollapsed ? 4 : 1.5;
    
    // Color mapping
    let color = "#ffffff";
    if (p.isCollapsed) color = "#ff3300"; // Singularity
    else if (p.type === "energy") color = "#00ffff";
    else if (p.persistence > 0.8) color = "#ffffff";
    else color = `rgba(255, 255, 255, ${p.persistence})`;

    ctx.globalAlpha = p.isLatent ? 0.2 : 1.0;
    ctx.fillStyle = color;
    
    if (p.isCollapsed) {
      // Draw Singularity with glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ff3300";
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0; // Reset

    // Velocity vectors for active particles
    if (!p.isLatent && !p.isCollapsed) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${p.persistence * 0.2})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 5, p.y + p.vy * 5);
      ctx.stroke();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

const INITIAL_PARTICLE_COUNT = 500;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const documentaryRef = useRef(new LazyDocumentary());
  
  const [state, setState] = useState<SimulationState | null>(null);
  const [metrics, setMetrics] = useState<ObserverMetrics | null>(null);
  const [events, setEvents] = useState<DocumentaryEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  // ── Worker Initialization ─────────────────────────────────────────
  useEffect(() => {
    const worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const initialParticles: Particle[] = Array.from({ length: INITIAL_PARTICLE_COUNT }).map((_, i) => ({
      id: `p-${i}`,
      type: Math.random() > 0.9 ? "energy" : "matter",
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      persistence: Math.random(),
      information: 0,
      entropy: 0.001,
      composition: { C: 0, H: 0, O: 0, N: 0 },
      isLatent: false,
      isCollapsed: false
    }));

    const initialState: SimulationState = {
      particles: initialParticles,
      tick: 0,
      bounds: { width, height },
      metrics: {
        activeParticles: INITIAL_PARTICLE_COUNT,
        totalInformation: 0,
        emergentComplexity: 0
      }
    };

    worker.postMessage({ type: "INIT", payload: initialState } as WorkerMessage);

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, payload } = e.data;
      if (type === "STATE_UPDATE") {
        const nextState = payload as SimulationState;
        setState(nextState);
        setMetrics(calculateObserverMetrics(nextState));
        const newEvents = documentaryRef.current.observe(nextState);
        if (newEvents.length > 0) {
          setEvents(prev => [...newEvents, ...prev].slice(0, 50));
        }
      }
    };

    return () => worker.terminate();
  }, []);

  // ── Simulation Loop ───────────────────────────────────────────────
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      workerRef.current?.postMessage({ type: "TICK" } as WorkerMessage);
    }, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPaused]);

  // ── Rendering Loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    renderSimulation(ctx, canvas.width, canvas.height, state);

    return () => window.removeEventListener("resize", resize);
  }, [state]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    workerRef.current?.postMessage({
      type: "STIMULUS",
      payload: { x: e.clientX, y: e.clientY, radius: 100 }
    } as WorkerMessage);
  };

  if (!state || !metrics) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white font-mono animate-pulse">Initializing Substrate...</div>;

  return (
    <div className="flex h-screen w-screen bg-[#020203] text-white font-mono overflow-hidden">
      {/* ── Main Canvas Area ────────────────────────────────────────── */}
      <div className="relative flex-1 h-full">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair"
        />
        
        {/* ── Top HUD: Observer Metrics ─────────────────────────────── */}
        <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none">
          <div className="flex gap-4">
            <MetricCard icon={<Activity className="w-4 h-4 text-cyan-400" />} label="Culture" value={metrics.culture.toFixed(1)} />
            <MetricCard icon={<Cpu className="w-4 h-4 text-purple-400" />} label="Tech" value={metrics.technology.toFixed(1)} />
            <MetricCard icon={<Zap className="w-4 h-4 text-yellow-400" />} label="Efficiency" value={(metrics.efficiency * 100).toFixed(1) + "%"} />
            <MetricCard icon={<Database className="w-4 h-4 text-red-400" />} label="Entropy" value={(metrics.entropy * 100).toFixed(1) + "%"} />
          </div>

          <div className="bg-black/60 border border-white/10 p-3 rounded backdrop-blur-md flex flex-col items-end">
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Universal Tick</div>
            <div className="text-xl font-bold tracking-tighter">{state.tick.toString().padStart(8, "0")}</div>
          </div>
        </div>

        {/* ── Bottom Controls ───────────────────────────────────────── */}
        <div className="absolute bottom-6 left-6 flex gap-3">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded backdrop-blur-md transition-all group"
          >
            {isPaused ? <Zap className="w-5 h-5 text-yellow-500" /> : <Activity className="w-5 h-5 text-cyan-500 animate-pulse" />}
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded backdrop-blur-md transition-all"
          >
            <Terminal className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* ── Lazy Documentary Logs ─────────────────────────────────── */}
        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-6 right-6 w-80 max-h-64 bg-black/60 border border-white/10 rounded backdrop-blur-md overflow-hidden flex flex-col pointer-events-none"
            >
              <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Eye className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Lazy Documentary</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {events.map(event => (
                  <div key={event.id} className="text-[10px] border-l-2 border-cyan-500/30 pl-2 py-1">
                    <div className="flex justify-between opacity-40 mb-1">
                      <span>{event.type}</span>
                      <span>T+{event.tick}</span>
                    </div>
                    <div className="text-white/80 leading-tight">{event.description}</div>
                  </div>
                ))}
                {events.length === 0 && <div className="text-[10px] opacity-20 italic">Observing the void...</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sidebar: Substrate Info ─────────────────────────────────── */}
      <div className="w-72 border-l border-white/10 bg-[#050507] p-6 flex flex-col gap-8">
        <section>
          <div className="flex items-center gap-2 mb-4 text-cyan-400">
            <Layers className="w-4 h-4" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Substrate</h2>
          </div>
          <div className="space-y-4">
            <InfoRow label="Active Nodes" value={state.metrics.activeParticles} />
            <InfoRow label="Latent Nodes" value={state.particles.length - state.metrics.activeParticles} />
            <InfoRow label="Information" value={state.metrics.totalInformation.toFixed(0) + " bits"} />
            <InfoRow label="Complexity" value={state.metrics.emergentComplexity.toFixed(4)} />
          </div>
        </section>

        <section className="flex-1">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Info className="w-4 h-4" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Ontology</h2>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed">
            Reality emerges from evaluation. Persistence decays without interaction. 
            Information density is capped by the Bekenstein Limit.
          </p>
        </section>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] text-white/20">
            <span>EMERGENT COSMOS v2.0</span>
            <span className="animate-pulse">● ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-black/60 border border-white/10 p-3 rounded backdrop-blur-md flex items-center gap-3 min-w-[120px]">
      <div className="p-2 bg-white/5 rounded">{icon}</div>
      <div>
        <div className="text-[8px] text-white/40 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-end border-b border-white/5 pb-2">
      <span className="text-[10px] text-white/40 uppercase">{label}</span>
      <span className="text-xs font-bold text-white/80">{value}</span>
    </div>
  );
}
