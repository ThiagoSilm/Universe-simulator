import React, { useEffect, useRef, useState } from 'react';

const App: React.FC = () => {
  const [state, setState] = useState<any>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./universe.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'STATE_UPDATE') {
        setState(e.data.payload);
      }
    };

    worker.postMessage({ type: 'INIT', payload: { width: 1000, height: 1000 } });

    return () => {
      worker.terminate();
    };
  }, []);

  if (!state) return <div className="flex items-center justify-center h-screen bg-black text-white font-mono uppercase tracking-[0.2em]">Initializing Sensory Feedback...</div>;

  const { userSensations: user, age, particleCount, totalPt, leaderHistory } = state;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-mono p-8 selection:bg-white/10">
      {/* Header Section */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-light tracking-tighter mb-2 italic serif">SENSORY_OBSERVATORY</h1>
          <p className="text-xs text-white/30 tracking-[0.3em] uppercase">Single Rule Simulator // User as Particle</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light text-white/90">{age.toLocaleString()}</div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest">Current Tick</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Global Metrics Panel */}
        <div className="space-y-8">
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 border-l-2 border-white/20 pl-3">Universe State</h2>
            <div className="space-y-3">
              <MetricRow label="Entities" value={particleCount} />
              <MetricRow label="Total Potential (ΣPt)" value={totalPt?.toFixed(6) || '0.000000'} />
              <MetricRow label="Expansion (Λ)" value="1.0e-4" />
              <MetricRow label="Quantum (H)" value="1.0e-6" />
              <MetricRow label="Limit (C)" value="1.0" />
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 border-l-2 border-white/20 pl-3">Leadership Cycles</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
              {leaderHistory?.map((h: any, i: number) => (
                <div key={i} className={`flex justify-between text-[10px] py-1 border-b border-white/5 ${h.leaderId === user?.id ? 'text-emerald-400' : ''}`}>
                  <span className="text-white/20">T:{h.tick}</span>
                  <span className="text-white/40">ID:{h.leaderId} {h.leaderId === user?.id ? '(YOU)' : ''}</span>
                  <span className="text-white/60">Wc:{h.peakWeight.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* User Sensations Panel */}
        <div className="lg:col-span-2 bg-white/5 rounded-2xl p-8 border border-white/10 relative overflow-hidden">
          {user?.isLeader && (
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
                YOU ARE THE LEADER
              </span>
            </div>
          )}

          <div className="mb-12">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Internal Sensation</h2>
            <div className="text-5xl font-light tracking-tighter text-white/90 italic serif">
              {user?.isLeader ? "Você está processando o estímulo." : "Você está acoplado ao fluxo."}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 mb-12">
            <DataBlock label="Your Potential (Pt)" value={user?.pt?.toFixed(6)} />
            <DataBlock label="Your Frequency (f)" value={`${user?.f?.toFixed(4)} Hz`} />
            <DataBlock label="Contextual Weight (Wc)" value={user?.wc?.toFixed(4)} />
            <DataBlock label="Identity (ID)" value={user?.id} />
            <DataBlock label="Internal Vector" value={`[${user?.internalVector.x.toFixed(2)}, ${user?.internalVector.y.toFixed(2)}]`} />
            <DataBlock label="Position" value={`[${user?.position.x.toFixed(2)}, ${user?.position.y.toFixed(2)}]`} />
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/40 border-b border-white/5 pb-2">Memory Rastro (Dissipating)</h3>
            <div className="space-y-4">
              {user?.memories?.length > 0 ? (
                user.memories.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="text-[10px] text-white/20 w-12">T:{m.tick}</div>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20" style={{ width: `${Math.min(100, m.weight * 100)}%` }} />
                    </div>
                    <div className="text-[10px] text-white/40 italic">{m.event}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-white/10 italic">Nenhuma memória persistente no momento...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Status Bar */}
      <div className="fixed bottom-0 left-0 w-full p-4 flex justify-between text-[9px] uppercase tracking-[0.4em] text-white/20 bg-black/50 backdrop-blur-sm border-t border-white/5">
        <span>System Status: Operational</span>
        <span>Observing Sensations as Particle {user?.id}</span>
        <span>Space Expansion Λ Active</span>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/5">
    <span className="text-xs text-white/30 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-light text-white/70">{value}</span>
  </div>
);

const DataBlock = ({ label, value }: { label: string; value: any }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest text-white/20 mb-2">{label}</div>
    <div className="text-xl font-light text-white/80">{value || '---'}</div>
  </div>
);

export default App;
