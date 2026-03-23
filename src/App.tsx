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
import { io, Socket } from "socket.io-client";
import { SimulationState } from "./types";
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

  // ── 1. Draw Entanglement Bridges (ER=EPR) ─────────────────────────
  ctx.lineWidth = 0.5;
  particles.forEach(p => {
    if (p.entangledId && !p.isLatent) {
      const target = particles.find(n => n.id === p.entangledId);
      if (target && !target.isLatent) {
        const gradient = ctx.createLinearGradient(p.x, p.y, target.x, target.y);
        gradient.addColorStop(0, `rgba(100, 200, 255, ${p.persistence * 0.3})`);
        gradient.addColorStop(1, `rgba(100, 200, 255, ${target.persistence * 0.3})`);
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }
    
    // ── 1.1 Draw Leader-Coupler Processing Lines ────────────────────
    if (p.leaderId && p.role === "coupler" && !p.isLatent) {
      const leader = particles.find(n => n.id === p.leaderId);
      if (leader && !leader.isLatent) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.persistence * 0.1})`;
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(leader.x, leader.y);
        ctx.stroke();
      }
    }
  });

  // ── 2. Draw Particles ─────────────────────────────────────────────
  particles.forEach(p => {
    if (p.isLatent && p.persistence < 0.01) return;

    const size = p.isCollapsed ? 4 : 1.5;
    const pulse = Math.sin(p.phase) * 0.5 + 0.5;
    const alpha = p.persistence * (0.4 + pulse * 0.6);
    
    // Color mapping based on taxonomy and charge
    let color = "#ffffff";
    if (p.type === "singularity") color = "#ffffff"; // Black Hole (white core, black shadow)
    else if (p.type === "star") color = "#fde047"; // Star (Yellow/White)
    else if (p.type === "nebula") color = "#f472b6"; // Nebula (Pink/Purple)
    else if (p.type === "life") color = "#4ade80";
    else if (p.type === "energy") color = "#60a5fa";
    else if (p.role === "leader") color = "#fbbf24";
    else if (p.role === "coupler") color = "#a78bfa";
    else if (p.charge > 0) color = "#fef08a";
    else color = "#c4b5fd";

    // Information Glow & Cosmic Effects
    if (p.type === "singularity") {
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#ffffff";
      ctx.fillStyle = "#000000"; // Black hole core
    } else if (p.type === "star") {
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#fde047";
      ctx.fillStyle = color;
    } else if (p.type === "nebula") {
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#f472b6";
      ctx.globalAlpha = alpha * 0.5; // Nebulas are diffuse
      ctx.fillStyle = color;
    } else if (p.information > 100) {
      ctx.shadowBlur = (p.information / 1000) * 15;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
    }

    ctx.globalAlpha = p.isLatent ? alpha * 0.3 : alpha;
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.type === "star" ? 3 : p.type === "singularity" ? 5 : size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0; // Reset

    // Resonance Ring for high persistence
    if (p.persistence > 0.9 && !p.isLatent && !p.isCollapsed) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 4 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Velocity vectors (subtle)
    if (!p.isLatent && !p.isCollapsed) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.1;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
      ctx.stroke();
    }
  });

  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const documentaryRef = useRef(new LazyDocumentary());
  
  const [state, setState] = useState<SimulationState | null>(null);
  const [metrics, setMetrics] = useState<ObserverMetrics | null>(null);
  const [events, setEvents] = useState<DocumentaryEvent[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  // ── Socket Initialization ─────────────────────────────────────────
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("universe-update", (nextState: SimulationState) => {
      setState(nextState);
      const nextMetrics = calculateObserverMetrics(nextState);
      setMetrics(nextMetrics);
      const newEvents = documentaryRef.current.observe(nextState);
      if (newEvents.length > 0) {
        setEvents(prev => [...newEvents, ...prev].slice(0, 50));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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
    socketRef.current?.emit("stimulus", { x: e.clientX, y: e.clientY, radius: 100 });
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
            <MetricCard icon={<Cpu className="w-4 h-4 text-purple-400" />} label="Load" value={((state.metrics.processingTime || 0)).toFixed(0) + "ms"} />
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
            {/* ── Ontological Status ─────────────────────────────────── */}
            <div className="absolute top-6 right-6 text-right pointer-events-none">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Status Ontológico</div>
              <div className="text-xl font-light text-white/80 tracking-tight">
                {state.metrics.activeParticles > 0 
                  ? (state.particles.reduce((acc, p) => acc + p.persistence, 0) / state.particles.length * 100).toFixed(1)
                  : "0.0"}% <span className="text-[10px] opacity-40 ml-1">Persistência</span>
              </div>
              <div className="text-[9px] text-white/20 mt-1 italic">
                {state.metrics.emergentComplexity > 15 ? "Realidade Estabilizada" : "Substrato em Flutuação"}
              </div>
            </div>
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
