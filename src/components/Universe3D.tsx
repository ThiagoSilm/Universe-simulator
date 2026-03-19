import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { FlyControls, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { UniverseState, Particle } from '../types';

interface Universe3DProps {
  state: UniverseState | null;
  viewMode: 'particles' | 'gravity' | 'temperature' | 'chemistry';
}

const MAX_PARTICLES = 10000;

const OBSERVER_RADIUS = 2000;

const Observed3DLayer = ({ particles, viewMode }: { particles: Particle[], viewMode: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current || !particles) return;
    let i = 0;
    const camPos = camera.position;
    
    for (const p of particles) {
      if (p.isLatent) continue;
      const distSq = (p.x - camPos.x)**2 + (p.y - camPos.y)**2 + ((p.z || 0) - camPos.z)**2;
      if (distSq > OBSERVER_RADIUS**2) continue;
      
      dummy.position.set(p.x, p.y, p.z || 0);
      let size = Math.max(0.5, (1.5 + p.level * 0.8 + p.weight * 0.1) * 0.5);
      if (viewMode === 'chemistry' && p.element) size *= 1.5;
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      // Color logic (simplified for brevity, same as before)
      if (viewMode === 'chemistry' && p.element) {
        switch (p.element) {
          case 'H': color.setHex(0xffffff); break;
          case 'C': color.setHex(0x444444); break;
          case 'N': color.setHex(0x4444ff); break;
          case 'O': color.setHex(0xff4444); break;
          default: color.setHex(0x888888);
        }
      } else if (viewMode === 'temperature') {
        const temp = Math.min(10, p.level * 2 + Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.vz || 0));
        color.setHSL(Math.max(0, 0.7 - temp * 0.07), 1, 0.5);
      } else if (p.isConscious) color.setHex(0xffffff);
      else if (p.isBound) color.setHex(0x3cdc78);
      else if (p.charge > 0) color.setHex(0xff9650);
      else if (p.charge < 0) color.setHex(0x5082ff);
      else if (p.isDarkMatter) color.setHex(0x7800c8);
      else {
        const bright = Math.min(255, 165 + p.level * 14);
        color.setRGB(bright/255, bright/255, bright/255);
      }
      
      meshRef.current.setColorAt(i, color);
      i++;
      if (i >= MAX_PARTICLES) break;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial toneMapped={false} vertexColors />
    </instancedMesh>
  );
};

const Latent2DLayer = ({ particles }: { particles: Particle[] }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (!pointsRef.current || !particles) return;
    const camPos = camera.position;
    const points: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    
    for (const p of particles) {
      if (p.isLatent) continue;
      const distSq = (p.x - camPos.x)**2 + (p.y - camPos.y)**2 + ((p.z || 0) - camPos.z)**2;
      if (distSq <= OBSERVER_RADIUS**2) continue;
      
      points.push(new THREE.Vector3(p.x, p.y, -OBSERVER_RADIUS));
      colors.push(new THREE.Color(0.2, 0.2, 0.2));
    }
    
    pointsRef.current.geometry.setFromPoints(points);
    pointsRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors.flatMap(c => [c.r, c.g, c.b])), 3));
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial size={2} vertexColors sizeAttenuation={false} />
    </points>
  );
};

const ConsciousHighlights = ({ particles }: { particles: Particle[] }) => {
  const consciousParticles = particles.filter(p => p.isConscious && !p.isLatent);
  
  return (
    <>
      {consciousParticles.map(p => (
        <pointLight key={`light-${p.id}`} position={[p.x, p.y, p.z || 0]} color="#ffffff" intensity={2} distance={500} />
      ))}
    </>
  );
};

const BoundTrajectories = ({ particles }: { particles: Particle[] }) => {
  const boundParticles = particles.filter(p => p.isBound && !p.isLatent);
  
  return (
    <>
      {boundParticles.map(p => {
        // Simple trajectory visualization based on velocity
        const endPoint = new THREE.Vector3(p.x + p.vx * 10, p.y + p.vy * 10, (p.z || 0) + (p.vz || 0) * 10);
        return (
          <Line
            key={`traj-${p.id}`}
            points={[[p.x, p.y, p.z || 0], endPoint.toArray()]}
            color="#3cdc78"
            lineWidth={1}
            transparent
            opacity={0.5}
          />
        );
      })}
    </>
  );
};

const ChemicalBonds = ({ particles }: { particles: Particle[] }) => {
  const particleMap = useMemo(() => {
    const map = new Map<string, Particle>();
    for (const p of particles) {
      map.set(p.id, p);
    }
    return map;
  }, [particles]);

  const lines = useMemo(() => {
    const drawn = new Set<string>();
    const result: [number, number, number][][] = [];
    
    for (const p of particles) {
      if (p.isLatent || !p.bonds) continue;
      
      for (const bondId of p.bonds) {
        const p2 = particleMap.get(bondId);
        if (!p2 || p2.isLatent) continue;
        
        // Ensure we only draw each bond once
        const bondKey = p.id < p2.id ? `${p.id}-${p2.id}` : `${p2.id}-${p.id}`;
        if (drawn.has(bondKey)) continue;
        drawn.add(bondKey);
        
        result.push([
          [p.x, p.y, p.z || 0],
          [p2.x, p2.y, p2.z || 0]
        ]);
      }
    }
    return result;
  }, [particles, particleMap]);

  return (
    <>
      {lines.map((points, i) => (
        <Line
          key={`bond-${i}`}
          points={points}
          color="#ffffff"
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      ))}
    </>
  );
};

const GravityGrid = ({ state }: { state: UniverseState }) => {
  // A simplified gravity visualization using a grid
  // In a real scenario, this would be a dynamic mesh deformed by mass
  return (
    <gridHelper args={[10000, 100, 0x444444, 0x222222]} position={[0, -100, 0]} />
  );
};

export default function Universe3D({ state, viewMode }: Universe3DProps) {
  if (!state) return null;

  return (
    <Canvas camera={{ position: [0, 0, 2000], fov: 60, far: 100000 }}>
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={0.2} />
      
      <FlyControls movementSpeed={1000} rollSpeed={0.5} dragToLook={true} />
      
      <Stars radius={1000} depth={500} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <Observed3DLayer particles={state.particles} viewMode={viewMode} />
      <Latent2DLayer particles={state.particles} />
      <ConsciousHighlights particles={state.particles} />
      
      {viewMode === 'gravity' && <GravityGrid state={state} />}
      {viewMode === 'particles' && <BoundTrajectories particles={state.particles} />}
      {viewMode === 'chemistry' && <ChemicalBonds particles={state.particles} />}
      
    </Canvas>
  );
}
