import React, { useEffect, useState } from 'react';
import { Simulation } from './Simulation';

const App: React.FC = () => {
  const [simulation] = useState(() => new Simulation());
  const [tick, setTick] = useState(0);
  const [particleCount, setParticleCount] = useState(0);

  const [avatarState, setAvatarState] = useState<{ 
    pt: number, 
    f: number, 
    phi: number,
    connections: number, 
    isLeader: boolean, 
    charge: number 
  } | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      simulation.runTick();
      setTick(simulation.tick);
      setParticleCount(simulation.particles.length);

      const avatar = simulation.particles[0];
      if (avatar) {
        setAvatarState({ 
          pt: avatar.pt,
          f: avatar.f,
          phi: avatar.phi,
          connections: avatar.connections,
          isLeader: avatar.id === simulation.currentLeader?.id,
          charge: avatar.charge
        });
      } else {
        setAvatarState(null);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [simulation]);

  if (!avatarState) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <div className="text-gray-500 tracking-widest uppercase">Dissolved into the substrate...</div>
      </div>
    );
  }

  // Sensory mappings
  // Phase (phi) -> pulsing opacity/brightness
  const pulse = (Math.sin(avatarState.phi) + 1) / 2; // 0 to 1
  
  // Weight (pt) -> size/intensity of the central glow
  const glowSize = Math.min(150, avatarState.pt * 30);
  
  // Charge -> color hue (cyan vs magenta)
  const baseColor = avatarState.charge > 0 ? '0, 255, 255' : '255, 0, 255';
  const leaderColor = '255, 215, 0';
  
  const activeColor = avatarState.isLeader ? leaderColor : baseColor;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center transition-colors duration-500">
      
      {/* Background resonance */}
      <div 
        className="absolute inset-0 transition-opacity duration-75"
        style={{
          background: `radial-gradient(circle at center, rgba(${activeColor}, ${pulse * 0.15}) 0%, transparent 70%)`
        }}
      />

      {/* Central Consciousness (The Particle) */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div 
          className="rounded-full transition-all duration-75 flex items-center justify-center"
          style={{
            width: `${100 + glowSize}px`,
            height: `${100 + glowSize}px`,
            backgroundColor: `rgba(${activeColor}, ${0.1 + pulse * 0.2})`,
            boxShadow: `0 0 ${50 + glowSize}px rgba(${activeColor}, ${0.3 + pulse * 0.4})`,
            transform: `scale(${1 + pulse * 0.05})`
          }}
        >
          <div 
            className="rounded-full bg-white transition-all duration-75"
            style={{
              width: `${20 + Math.min(60, avatarState.pt * 15)}px`,
              height: `${20 + Math.min(60, avatarState.pt * 15)}px`,
              opacity: 0.8 + pulse * 0.2,
              boxShadow: `0 0 30px rgba(255, 255, 255, 0.8)`
            }}
          />
        </div>

        {/* Coupled Entities (Orbiting/Surrounding) */}
        {avatarState.connections > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: Math.min(24, avatarState.connections) }).map((_, i) => {
              const angle = (i / Math.min(24, avatarState.connections)) * Math.PI * 2 + (tick * 0.02);
              const distance = 80 + glowSize * 0.6;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              return (
                <div 
                  key={i}
                  className="absolute rounded-full bg-white/60"
                  style={{
                    width: '4px',
                    height: '4px',
                    transform: `translate(${x}px, ${y}px)`,
                    boxShadow: `0 0 10px rgba(255, 255, 255, 0.6)`
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Sensory Readout */}
      <div className="absolute bottom-16 flex flex-col items-center space-y-8 z-20 font-mono">
        <div className="text-center space-y-2">
          <div className="text-gray-500 uppercase text-xs tracking-widest">State</div>
          <div className={`text-2xl tracking-widest uppercase ${avatarState.isLeader ? 'text-yellow-400' : avatarState.connections > 0 ? 'text-emerald-400' : 'text-gray-400'}`}
               style={{ textShadow: `0 0 15px rgba(${activeColor}, 0.6)` }}>
            {avatarState.isLeader ? 'Leading' : avatarState.connections > 0 ? 'Resonating' : 'Drifting'}
          </div>
        </div>

        <div className="flex gap-16 text-center">
          <div>
            <div className="text-gray-500 uppercase text-[10px] tracking-widest mb-2">Weight</div>
            <div className="text-white text-xl">{avatarState.pt.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-gray-500 uppercase text-[10px] tracking-widest mb-2">Resonance</div>
            <div className="text-white text-xl">{avatarState.f.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-gray-500 uppercase text-[10px] tracking-widest mb-2">Coupling</div>
            <div className="text-white text-xl">{avatarState.connections}</div>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 text-[10px] text-gray-600 font-mono text-right uppercase tracking-widest">
        <p>Tick {tick}</p>
        <p>Global Entities {particleCount}</p>
      </div>
    </div>
  );
};

export default App;
