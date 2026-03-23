import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  RefreshCw,
  Atom,
  Eye,
  X,
  Plus,
  Settings,
  Menu,
} from "lucide-react";
import { Particle, Stimulus, SimulationState } from "./types";
import { createInitialState, tick } from "./engine";

// ═══════════════════════════════════════════════════════════════════
//  VISUALIZATION
// ═══════════════════════════════════════════════════════════════════

function renderSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimulationState,
  selectedParticleId: string | null,
) {
  const { particles, stimuli, clusters } = state;

  // ── Background ────────────────────────────────────────────────────
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  // ── Grid (Subtle) ─────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // ── Clusters ──────────────────────────────────────────────────────
  clusters.forEach(cluster => {
    const clusterParticles = particles.filter(p => cluster.particleIds.includes(p.id));
    if (clusterParticles.length < 2) return;

    // Draw cluster hull or connections
    ctx.strokeStyle = "rgba(100, 200, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    clusterParticles.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    
    // Fill cluster area
    ctx.fillStyle = "rgba(100, 200, 255, 0.02)";
    ctx.fill();
  });

  // ── Stimuli ───────────────────────────────────────────────────────
  stimuli.forEach(s => {
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 5) * 5;
    
    // Outer glow
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 40 + pulse);
    grad.addColorStop(0, "rgba(255, 100, 50, 0.3)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 40 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = "#ff6321";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px JetBrains Mono";
    ctx.fillText(`STIMULUS ${s.id}`, s.x + 10, s.y - 10);
  });

  // ── Particles ─────────────────────────────────────────────────────
  particles.forEach(p => {
    const size = Math.max(0.1, 2 + (p.pt / 50));
    
    // Particle Core
    let color = "#ffffff";
    if (p.isUser) color = "#ff00ff"; // User is Magenta
    else if (p.isLeader) color = "#ff6321";
    else if (p.isResonant && p.isAligned) color = "#00ff00";
    else if (p.isResonant) color = "#00ffff";
    else if (p.isInCluster) color = "#4444ff";

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();

    // User Halo
    if (p.isUser) {
      const pulse = Math.sin(Date.now() * 0.01) * 15;
      ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, size + 10 + pulse), 0, Math.PI * 2);
      ctx.stroke();
      
      // Label
      ctx.fillStyle = "#ff00ff";
      ctx.font = "bold 10px JetBrains Mono";
      ctx.fillText("YOU (OBSERVER)", p.x + 15, p.y + 5);
    }

    // Internal Vector (vx, vy)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * 10, p.y + p.vy * 10);
    ctx.stroke();

    // Selection Highlight
    if (p.id === selectedParticleId) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Leader Pulse
    if (p.isLeader) {
      const pulse = Math.sin(Date.now() * 0.01) * 10;
      ctx.strokeStyle = "rgba(255, 99, 33, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, size + 5 + pulse), 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef<{ x: number; y: number } | null>(null);
  const [state, setState] = useState<SimulationState>(() => createInitialState(100, 800, 600));
  const [selectedParticleId, setSelectedParticleId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState<"params" | "stats" | "logs">("params");
const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // ── Simulation Loop ───────────────────────────────────────────────
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      if (!isPaused) {
        setState(prev => {
          const canvas = canvasRef.current;
          const width = canvas?.width || 800;
          const height = canvas?.height || 600;
          const next = tick(prev, width, height, mousePos.current || undefined);
          return next;
        });
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPaused]);

  // ── Rendering Loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      requestAnimationFrame(() => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }
      });
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement!);
    resize();

    const render = () => {
      renderSimulation(ctx, canvas.width, canvas.height, stateRef.current, selectedParticleId);
      requestAnimationFrame(render);
    };
    const frameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [selectedParticleId]);

  // ── Interaction ───────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find nearest particle
    let nearest: Particle | null = null;
    let minDist = 20;
    state.particles.forEach(p => {
      const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    });

    if (nearest) {
      setSelectedParticleId((nearest as Particle).id);
    } else {
      setSelectedParticleId(null);
    }
  };

  const selectedParticle = state.particles.find(p => p.id === selectedParticleId);

  return (
    <div className="flex h-screen w-screen bg-black text-white font-mono overflow-hidden">
      {/* ── Main Canvas Area ────────────────────────────────────────── */}
      <div className="relative flex-1 h-full">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="w-full h-full cursor-crosshair"
        />
        
        {/* ── Sensory View (User Particle Stats) ──────────────────────── */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
          {state.particles.find(p => p.isUser) && (
            <div className="bg-black/80 border border-fuchsia-500/30 p-4 rounded-lg backdrop-blur-md w-64">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-tighter text-fuchsia-400">Sensory Interface</h2>
              </div>
              
              {(() => {
                const user = state.particles.find(p => p.isUser)!;
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] text-white/40 uppercase">Contextual Weight</span>
                      <span className="text-lg font-bold text-fuchsia-500">{(user.contextualWeight || 0).toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-fuchsia-500 transition-all duration-300" 
                        style={{ width: `${Math.min(100, (user.contextualWeight || 0) * 10)}%` }} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 p-2 rounded">
                        <div className="text-[8px] text-white/40 uppercase">Frequency</div>
                        <div className="text-xs font-bold">{(user.frequency || 0).toFixed(1)} Hz</div>
                      </div>
                      <div className="bg-white/5 p-2 rounded">
                        <div className="text-[8px] text-white/40 uppercase">P(t) Potential</div>
                        <div className="text-xs font-bold">{user.pt.toFixed(1)}</div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[8px] text-white/40 uppercase mb-1">Recent Memories</div>
                      <div className="space-y-1">
                        {user.memory.slice(-3).reverse().map(m => (
                          <div key={m.id} className="text-[9px] flex justify-between">
                            <span className="truncate opacity-60">{m.description}</span>
                            <span className="text-fuchsia-500">+{m.weight.toFixed(1)}</span>
                          </div>
                        ))}
                        {user.memory.length === 0 && <div className="text-[9px] opacity-20 italic">No traces yet...</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className="bg-black/80 border border-white/10 p-3 rounded-lg backdrop-blur-md">
            <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
              <Atom className="w-4 h-4 text-orange-500" />
              Regra Única Simulator
            </h1>
            <div className="text-[10px] text-white/40 mt-1">
              TICK: {state.tick.toString().padStart(8, "0")}
            </div>
          </div>
        </div>

        {/* ── Bottom Stats Bar ──────────────────────────────────────── */}
        <div className="absolute bottom-4 left-4 right-4 flex gap-4 pointer-events-none">
          <div className="bg-black/80 border border-white/10 p-3 rounded-lg backdrop-blur-md flex-1 flex justify-around items-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/40 uppercase">Particles</span>
              <span className="text-sm font-bold">{state.particles.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/40 uppercase">Clusters</span>
              <span className="text-sm font-bold">{state.clusters.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/40 uppercase">Avg P(t)</span>
              <span className="text-sm font-bold">
                {(state.particles.reduce((s, p) => s + p.pt, 0) / state.particles.length).toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-white/40 uppercase">Expansion Λ</span>
              <span className="text-sm font-bold">{state.lambda.toFixed(4)}</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="pointer-events-auto bg-orange-500 hover:bg-orange-600 text-black p-3 rounded-lg flex items-center justify-center transition-colors"
          >
            {isPaused ? <Zap className="w-6 h-6" /> : <RefreshCw className="w-6 h-6 animate-spin-slow" />}
          </button>
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-80 h-full bg-[#151619] border-l border-white/10 flex flex-col"
          >
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab("params")}
                className={`flex-1 p-3 text-[10px] uppercase tracking-widest ${activeTab === "params" ? "bg-white/5 text-orange-500" : "text-white/40"}`}
              >
                Parameters
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 p-3 text-[10px] uppercase tracking-widest ${activeTab === "stats" ? "bg-white/5 text-orange-500" : "text-white/40"}`}
              >
                Inspector
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "params" && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-[10px] text-white/40 uppercase mb-4 flex items-center gap-2">
                      <Settings className="w-3 h-3" />
                      Global Constants
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>Expansion (Λ)</span>
                          <span>{state.lambda.toFixed(4)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.01"
                          step="0.0001"
                          value={state.lambda}
                          onChange={(e) => setState(s => ({ ...s, lambda: parseFloat(e.target.value) }))}
                          className="w-full accent-orange-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>Max Freq (C)</span>
                          <span>{state.c}</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="1"
                          value={state.c}
                          onChange={(e) => setState(s => ({ ...s, c: parseInt(e.target.value) }))}
                          className="w-full accent-orange-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>Influence Radius</span>
                          <span>{state.influenceRadius}</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="200"
                          step="1"
                          value={state.influenceRadius}
                          onChange={(e) => setState(s => ({ ...s, influenceRadius: parseInt(e.target.value) }))}
                          className="w-full accent-orange-500"
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] text-white/40 uppercase mb-4 flex items-center gap-2">
                      <Plus className="w-3 h-3" />
                      Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setState(s => createInitialState(s.particles.length, 800, 600))}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] uppercase"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          const newStimulus: Stimulus = {
                            id: `s-${state.stimuli.length + 1}`,
                            x: Math.random() * 800,
                            y: Math.random() * 600,
                            scaleRelevance: 1 + Math.random(),
                            frequency: 20 + Math.random() * 80,
                            vector: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
                          };
                          setState(s => ({ ...s, stimuli: [...s.stimuli, newStimulus] }));
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] uppercase"
                      >
                        Add Stimulus
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "stats" && (
                <div className="space-y-4">
                  {selectedParticle ? (
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-orange-500">{selectedParticle.id}</h4>
                          <p className="text-[10px] text-white/40 uppercase">Particle Entity</p>
                        </div>
                        <button onClick={() => setSelectedParticleId(null)}>
                          <X className="w-4 h-4 text-white/20" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase">P(t)</p>
                          <p className="text-xs">{selectedParticle.pt.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase">Freq</p>
                          <p className="text-xs">{selectedParticle.frequency?.toFixed(2) || "0.00"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase">Charge</p>
                          <p className="text-xs">{selectedParticle.charge.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase">Phase</p>
                          <p className="text-xs">{selectedParticle.phase.toFixed(2)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-2">Memory Records ({selectedParticle.memory.length})</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                          {selectedParticle.memory.map(m => (
                            <div key={m.id} className="text-[9px] bg-black/40 p-2 border-l border-orange-500/50">
                              <div className="flex justify-between text-white/60">
                                <span>TICK {m.tick}</span>
                                <span>W: {m.weight.toFixed(2)}</span>
                              </div>
                              <div className="truncate">{m.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 text-center p-8">
                      <Eye className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-xs">Select a particle to inspect its internal state and memory traces.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <div className="flex justify-between items-center text-[10px] text-white/40">
                <span>SYSTEM STATUS</span>
                <span className="text-green-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  NOMINAL
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="absolute top-4 right-4 bg-black/80 border border-white/10 p-2 rounded-lg backdrop-blur-md hover:bg-white/5 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
    </div>
  );
}
