import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Activity,
  Brain,
  Orbit,
  RefreshCw,
  Info,
  Layers,
  Cpu,
  Thermometer,
  Atom,
  Sigma,
  Link,
  Heart,
  TrendingUp,
  Globe,
  Share2,
  Network,
  Eye,
  Wind,
  Circle,
  CircleDot,
  Expand,
  Database,
  X,
  Beaker,
  Clock,
  Lock,
  Users,
  History as HistoryIcon,
  Map as MapIcon,
  Maximize2,
  ScrollText,
  Camera,
  Sparkles,
  Compass,
} from "lucide-react";
import { ObserverLayer, PersistentState, GRID_SIZE } from "./ObserverLayer";
import { LazyDocumentary } from "./LazyDocumentary";
import { UniverseState, Particle } from "./types";

const STORAGE_KEY = "lazy_universe_state_v6";

// ═══════════════════════════════════════════════════════════════════
//  VISUALIZATION
// ═══════════════════════════════════════════════════════════════════

function computeTransform(
  particles: Particle[],
  w: number,
  h: number,
  spectatorTarget?: { x: number; y: number; zoom: number },
) {
  if (spectatorTarget) {
    const scale = spectatorTarget.zoom;
    const cx = spectatorTarget.x;
    const cy = spectatorTarget.y;
    return {
      toX: (wx: number) => (wx - cx) * scale + w / 2,
      toY: (wy: number) => (wy - cy) * scale + h / 2,
      scale,
    };
  }
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of particles) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = 48,
    rangeX = Math.max(500, maxX - minX),
    rangeY = Math.max(500, maxY - minY);
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  const scale = Math.min((w - pad * 2) / rangeX, (h - pad * 2) / rangeY);
  return {
    toX: (wx: number) => (wx - cx) * scale + w / 2,
    toY: (wy: number) => (wy - cy) * scale + h / 2,
    scale,
  };
}

function renderUniverse(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: UniverseState,
  engine: ObserverLayer,
  latentMode: boolean,
  selectedParticleId: string | null,
  mousePos: { x: number; y: number } | null,
) {
  const { particles } = state;
  if (particles.length === 0) return;

  // ── Layer 1: Background & Horizon ──────────────────────────────────
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  const spectatorTarget = state.isSpectatorMode
    ? { x: state.viewportX, y: state.viewportY, zoom: state.zoom }
    : undefined;
  const { toX, toY, scale } = computeTransform(
    particles,
    w,
    h,
    spectatorTarget,
  );

  // Universe Horizon Visualization
  const horizon = 50000 + state.tick * 0.0001 * 100;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 50, 50, 0.1)";
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.arc(toX(0), toY(0), horizon * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ── Layer -1: Heatmap (Active vs Latent) ───────────────────────────
  if (state.activeGridKeys) {
    ctx.save();
    const activeKeys = new Set(state.activeGridKeys);
    const visibleGridRange = 35;
    const centerX = spectatorTarget
      ? spectatorTarget.x
      : particles.reduce((s, p) => s + p.x, 0) / (particles.length || 1);
    const centerY = spectatorTarget
      ? spectatorTarget.y
      : particles.reduce((s, p) => s + p.y, 0) / (particles.length || 1);
    const gx0 = Math.floor(centerX / GRID_SIZE) - visibleGridRange;
    const gy0 = Math.floor(centerY / GRID_SIZE) - visibleGridRange;

    for (let gx = gx0; gx < gx0 + visibleGridRange * 2; gx++) {
      for (let gy = gy0; gy < gy0 + visibleGridRange * 2; gy++) {
        const key = `${gx},${gy}`;
        const isActive = activeKeys.has(key);
        const x = toX(gx * GRID_SIZE),
          y = toY(gy * GRID_SIZE);
        const size = GRID_SIZE * scale;

        if (isActive) {
          ctx.strokeStyle = "rgba(255, 100, 0, 0.1)";
          ctx.strokeRect(x, y, size, size);
          ctx.fillStyle = "rgba(255, 100, 0, 0.02)";
          ctx.fillRect(x, y, size, size);
        } else if (latentMode) {
          ctx.strokeStyle = "rgba(50, 50, 100, 0.05)";
          ctx.strokeRect(x, y, size, size);
          ctx.fillStyle = "rgba(50, 50, 100, 0.01)";
          ctx.fillRect(x, y, size, size);
        }
      }
    }
    ctx.restore();
  }

  // ── Layer 0: Fog of War / Quantum Mist ───────────────────────────
  // Desenha uma névoa sobre áreas não observadas
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const activeParticles = particles.filter((p) => !p.isLatent);

  // Se não houver partículas ativas, o universo está em "névoa total"
  if (activeParticles.length < particles.length * 0.05) {
    ctx.fillStyle = "rgba(5, 5, 15, 0.4)";
    ctx.fillRect(0, 0, w, h);

    // Adiciona ruído quântico
    for (let i = 0; i < 20; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const rs = Math.random() * 100 * scale;
      const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rs);
      grad.addColorStop(0, "rgba(100, 100, 255, 0.05)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(rx - rs, ry - rs, rs * 2, rs * 2);
    }
  }
  ctx.restore();

  // ── Layer 0.5: Cosmic Memory (Latent Information) ──────────────────
  if (state.campoLatente && state.campoLatente.length > 0) {
    ctx.save();
    for (const info of state.campoLatente) {
      const x = toX(info.x),
        y = toY(info.y);
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
    const isSing = p.id.startsWith("singularity");
    if (!isSing && !p.isBound) continue; // Only show subtle glow for singularities or bound matter

    const x = toX(p.x),
      y = toY(p.y);
    const glowR = Math.max(4, (2 + p.level * 2 + p.weight * 0.1) * scale);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);

    if (isSing) {
      glow.addColorStop(
        0,
        `rgba(160,80,255,${Math.min(0.15, 0.02 * p.level)})`,
      );
      glow.addColorStop(1, "transparent");
    } else {
      glow.addColorStop(0, `rgba(60,200,120,${Math.min(0.1, 0.01 * p.level)})`);
      glow.addColorStop(1, "transparent");
    }

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 1.5: Habitability Map (Emergent Life Zones) ──────────
  if (state.habitabilityMap && state.habitabilityMap.length > 0) {
    ctx.save();
    for (const cell of state.habitabilityMap) {
      const x = toX(cell.x);
      const y = toY(cell.y);
      const cellSize = 800 * scale; // Match HABITABILITY_GRID_SIZE

      const alpha = cell.potential * 0.12;
      // Emerald green for habitability
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
      ctx.fillRect(x - cellSize / 2, y - cellSize / 2, cellSize, cellSize);

      if (cell.potential > 0.7) {
        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 2})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - cellSize / 2, y - cellSize / 2, cellSize, cellSize);
      }
    }
    ctx.restore();
  }

  // ── Layer 2: void / latent particles (quantum superposition) ────────
  ctx.save();
  for (const p of particles) {
    if (!p.isLatent) continue;
    const x = toX(p.x),
      y = toY(p.y);
    ctx.fillStyle = "rgba(70,70,90,0.22)";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.4, 0.45 * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 3: photon-like fast particles (Subtle Trails) ────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || p.isCollapsed || p.charge !== 0) continue;
    const spd2 = p.vx ** 2 + p.vy ** 2;
    if (spd2 < 400) continue;
    const x = toX(p.x),
      y = toY(p.y);
    const spd = Math.sqrt(spd2);
    const len = Math.min(8, spd) * scale * 2;
    const nx = -p.vx / spd,
      ny = -p.vy / spd;

    ctx.strokeStyle = "rgba(255,255,200,0.3)";
    ctx.lineWidth = Math.max(0.3, 0.5 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + nx * len, y + ny * len);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,220,0.6)";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.4, 0.6 * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 4: uncollapsed particles (quantum superposition state) ─────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || p.isCollapsed) continue;
    const spd2 = p.vx ** 2 + p.vy ** 2;
    if (spd2 >= 400 && p.charge === 0) continue; // handled above as photon
    const x = toX(p.x),
      y = toY(p.y);
    const size = Math.max(0.8, 1.0 * scale);

    // Wave radius cloud — quantum uncertainty
    const wr = (p.waveRadius || 0) * scale;
    if (wr > 1) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, wr);
      if (p.charge > 0) {
        grad.addColorStop(0, "rgba(255,120,60,0.08)");
        grad.addColorStop(0.6, "rgba(255,120,60,0.03)");
      } else if (p.charge < 0) {
        grad.addColorStop(0, "rgba(60,120,255,0.08)");
        grad.addColorStop(0.6, "rgba(60,120,255,0.03)");
      } else {
        grad.addColorStop(0, "rgba(120,180,255,0.06)");
        grad.addColorStop(0.6, "rgba(120,180,255,0.02)");
      }
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, wr, 0, Math.PI * 2);
      ctx.fill();

      // Wave boundary circle
      ctx.strokeStyle =
        p.charge === 0
          ? "rgba(120,180,255,0.1)"
          : p.charge > 0
            ? "rgba(255,120,60,0.12)"
            : "rgba(60,120,255,0.12)";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(x, y, wr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Velocity streak
    const spd = Math.sqrt(spd2);
    if (spd > 2.5 && scale > 0.0005) {
      const len = Math.min(10, spd) * scale * 2.5;
      const nx = -p.vx / spd,
        ny = -p.vy / spd;
      const g = ctx.createLinearGradient(x, y, x + nx * len, y + ny * len);
      const color = p.color || "rgba(255,255,255,0.2)";
      g.addColorStop(0, color.replace("0.2)", "0.4)"));
      g.addColorStop(1, "transparent");
      ctx.strokeStyle = g;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + nx * len, y + ny * len);
      ctx.stroke();
    }

    // Singularities (Black Holes) are not rendered directly
    // They are points of silence, visible only by their effects on neighbors
    if (p.isBlackHole) continue;

    // Core with charge color
    let bodyColor = (p.color || "rgba(255,255,255,0.2)").replace(
      "0.2)",
      "0.5)",
    );
    if (p.isDarkMatter) {
      bodyColor = "rgba(120, 0, 200, 0.15)"; // faint purple for dark matter
    } else {
      if (p.charge > 0) bodyColor = "rgba(255,150,80,0.55)";
      if (p.charge < 0) bodyColor = "rgba(80,130,255,0.55)";
    }
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
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
    if (p.entangledId && !drawnLinks.has(p.id + p.entangledId)) {
      const partner = particleMap.get(p.entangledId);
      if (partner) {
        ctx.strokeStyle = "rgba(255, 100, 255, 0.15)";
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
      const isOrganic =
        (p1.element === "C" || p1.element === "H") &&
        (p2.element === "C" || p2.element === "H");
      ctx.strokeStyle = isOrganic
        ? "rgba(50, 255, 50, 0.6)"
        : "rgba(200, 200, 200, 0.3)";
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

  // ── Layer 4.5: ER=EPR Bridges (Non-local Entanglement) ──────────
  ctx.save();
  ctx.lineWidth = 0.5;
  for (const p of particles) {
    if (p.entangledId && !p.isLatent) {
      const target = particles.find((pt) => pt.id === p.entangledId);
      if (target && !target.isLatent && p.id < target.id) {
        const x1 = toX(p.x),
          y1 = toY(p.y);
        const x2 = toX(target.x),
          y2 = toY(target.y);

        // Draw a subtle, pulsing bridge
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (dist > 50) {
          // Only draw long-range bridges
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          const alpha = 0.1 + Math.sin(Date.now() * 0.005) * 0.05;
          grad.addColorStop(0, `rgba(168, 85, 247, ${alpha})`); // Purple
          grad.addColorStop(0.5, `rgba(236, 72, 153, ${alpha * 1.5})`); // Pink
          grad.addColorStop(1, `rgba(168, 85, 247, ${alpha})`);

          ctx.strokeStyle = grad;
          ctx.setLineDash([5, 15]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }
  ctx.restore();

  // ── Layer 5: collapsed particles ────────────────────────────────────
  ctx.save();
  for (const p of particles) {
    if (p.isLatent || !p.isCollapsed || p.isConscious) continue;
    const x = toX(p.x),
      y = toY(p.y);
    const isSing = p.id.startsWith("singularity");
    const size = Math.max(1, (1.5 + p.level * 0.8 + p.weight * 0.1) * scale);

    // Bound state glow (nuclear binding — green tint)
    if (p.isBound) {
      ctx.strokeStyle = `rgba(60,220,120,${Math.min(0.7, 0.15 * p.level + 0.1)})`;
      ctx.lineWidth = Math.max(0.4, 0.5 * scale);
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(x, y, size * 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Level ring
    if (p.level > 1) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.5, 0.07 * p.level)})`;
      ctx.lineWidth = Math.max(0.3, 0.4 * scale);
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Singularity halo
    if (isSing) {
      ctx.strokeStyle = "rgba(160,80,255,0.5)";
      ctx.lineWidth = Math.max(0.5, 0.6 * scale);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, size * 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Latent trace ring (stored information)
    if (p.latentTraces?.length) {
      ctx.strokeStyle = `rgba(255,165,0,${Math.min(0.5, 0.04 * p.latentTraces.length)})`;
      ctx.lineWidth = Math.max(0.3, 0.5 * scale);
      ctx.beginPath();
      ctx.arc(x, y, size + Math.max(1.5, 2 * scale), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Charge indicator
    if (p.charge !== 0) {
      ctx.strokeStyle =
        p.charge > 0 ? "rgba(255,110,50,0.5)" : "rgba(50,110,255,0.5)";
      ctx.lineWidth = Math.max(0.3, 0.35 * scale);
      ctx.beginPath();
      ctx.arc(x, y, size * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Spin indicator — tiny arc showing spin direction
    if (Math.abs(p.spin) > 0 && size > 1.5) {
      const spinArc = p.spin > 0 ? [0, Math.PI] : [Math.PI, Math.PI * 2];
      ctx.strokeStyle = "rgba(200,200,255,0.3)";
      ctx.lineWidth = Math.max(0.2, 0.25 * scale);
      ctx.beginPath();
      ctx.arc(x, y, size * 0.7, spinArc[0], spinArc[1]);
      ctx.stroke();
    }

    // Core
    const bright = Math.min(255, 165 + p.level * 14);
    ctx.fillStyle = `rgba(${bright},${bright},${bright},${Math.min(0.95, 0.5 + p.level * 0.06)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 6: conscious entities ─────────────────────────────────────
  ctx.save();
  for (const p of particles) {
    if ((!p.isConscious && !p.isCollectiveConscious) || p.isLatent) continue;
    const x = toX(p.x),
      y = toY(p.y);
    const size = Math.max(2, (2 + p.level * 1.2 + p.weight * 0.12) * scale);
    const hr = size * 10;
    const halo = ctx.createRadialGradient(x, y, size * 0.5, x, y, hr);

    if (p.isCollectiveConscious) {
      halo.addColorStop(0, "rgba(255,255,255,0.7)");
      halo.addColorStop(0.25, "rgba(255,180,80,0.25)");
      halo.addColorStop(1, "transparent");
    } else {
      halo.addColorStop(0, "rgba(255,255,255,0.55)");
      halo.addColorStop(0.25, "rgba(180,140,255,0.18)");
      halo.addColorStop(1, "transparent");
    }

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, hr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.isCollectiveConscious
      ? "rgba(255,200,100,0.4)"
      : "rgba(255,255,255,0.2)";
    ctx.lineWidth = Math.max(0.5, 0.7 * scale);
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Layer 7: Selection Highlight ──────────────────────────────────
  if (selectedParticleId) {
    const p = particles.find((p) => p.id === selectedParticleId);
    if (p && !p.isLatent) {
      const x = toX(p.x),
        y = toY(p.y);
      const size = Math.max(2, (2 + p.level * 1.2 + p.weight * 0.12) * scale);
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(x, y, size * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Layer 8: Fog of War / Cosmic Telescope ────────────────────────
  ctx.save();
  const holeRadius = 250;
  const fogOpacity = 0.8;

  if (mousePos) {
    const grad = ctx.createRadialGradient(
      mousePos.x,
      mousePos.y,
      holeRadius * 0.4,
      mousePos.x,
      mousePos.y,
      holeRadius,
    );
    grad.addColorStop(0, "rgba(5, 5, 5, 0)");
    grad.addColorStop(1, `rgba(5, 5, 5, ${fogOpacity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Telescope UI
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, holeRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Coordinates
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "10px monospace";
    ctx.fillText(
      `OBSERVING: ${Math.floor(mousePos.x)}, ${Math.floor(mousePos.y)}`,
      mousePos.x + 10,
      mousePos.y - 10,
    );
  } else {
    ctx.fillStyle = `rgba(5, 5, 5, ${fogOpacity})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ObserverLayer | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const lazyDocRef = useRef<LazyDocumentary | null>(null);
  const [state, setState] = useState<UniverseState | null>(null);
  const stateRef = useRef<UniverseState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [lazyMetrics, setLazyMetrics] = useState({
    economy: "0%",
    latentesPct: "0%",
    calculandoPct: "0%",
    event: "None",
    nextScan: 0,
  });
  const [selectedParticleId, setSelectedParticleId] = useState<string | null>(
    null,
  );
  const selectedParticleIdRef = useRef<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [latentMode, setLatentMode] = useState(false);
  const latentModeRef = useRef(false);
  const [activeTab, setActiveTab] = useState<
    | "core"
    | "quantum"
    | "life"
    | "civ"
    | "cosmic"
    | "horizon"
    | "log"
    | "manifesto"
  >("core");
  const horizonRadius = 5000;
  const [isObserving, setIsObserving] = useState(false);
  const [documentaryMode, setDocumentaryMode] = useState(false);
  const isObservingRef = useRef(false);
  const documentaryModeRef = useRef(false);
  const [scientistMode, setScientistMode] = useState(false);
  const [showNarrative, setShowNarrative] = useState(true);
  const [selectedParticle, setSelectedParticle] = useState<Particle | null>(
    null,
  );
  const [prevStats, setPrevStats] = useState<Record<string, number>>({});
  const requestRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sync refs with state
  useEffect(() => {
    selectedParticleIdRef.current = selectedParticleId;
  }, [selectedParticleId]);

  useEffect(() => {
    latentModeRef.current = latentMode;
  }, [latentMode]);

  useEffect(() => {
    documentaryModeRef.current = documentaryMode;
    if (documentaryMode) {
      setIsObserving(false);
    }
  }, [documentaryMode]);

  useEffect(() => {
    isObservingRef.current = isObserving;
    if (engineRef.current) {
      engineRef.current.isObserving = isObserving;
    }
  }, [isObserving]);

  const getNarrative = () => {
    if (!state) return "";
    const {
      metaConsciousness,
      culture,
      lifeCount,
      moleculeCount,
      entropy,
      coherence,
      technology,
      relationsCount,
    } = state;

    if (metaConsciousness)
      return "A simulação atingiu o ponto de singularidade. A consciência coletiva agora observa o observador.";
    if (technology > 80)
      return "A tecnologia transcende a matéria. Civilizações manipulam as leis fundamentais para sustentar sua existência.";
    if (culture > 50)
      return "Uma civilização galáctica está em pleno florescimento, moldando a realidade através da cultura e tecnologia.";
    if (relationsCount > 100)
      return "Uma rede complexa de interações sociais emerge, criando uma inteligência coletiva distribuída.";
    if (lifeCount > 100)
      return "A vida prospera em diversos nichos, a replicação molecular atingiu uma escala planetária.";
    if (moleculeCount > 50)
      return "A química complexa está preparando o terreno para a emergência da vida biológica.";
    if (coherence > 0.8)
      return "A ordem quântica é absoluta. O universo ressoa em uma harmonia perfeita de fases.";
    if (entropy < 0.5)
      return "A matéria está se organizando em estruturas complexas sob a influência da gravidade e forças nucleares.";

    return "O universo está em seus estágios primordiais, onde flutuações quânticas dão origem à primeira matéria.";
  };

  const lastObserveTime = useRef(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current || !stateRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const spectatorTarget = stateRef.current.isSpectatorMode
      ? {
          x: stateRef.current.viewportX,
          y: stateRef.current.viewportY,
          zoom: stateRef.current.zoom,
        }
      : undefined;

    const { scale } = computeTransform(
      stateRef.current.particles,
      canvasRef.current.width,
      canvasRef.current.height,
      spectatorTarget,
    );

    // Inverter a transformação para obter coordenadas do universo
    const universeX =
      (x - canvasRef.current.width / 2) / scale + (spectatorTarget?.x ?? 0);
    const universeY =
      (y - canvasRef.current.height / 2) / scale + (spectatorTarget?.y ?? 0);

    mousePosRef.current = { x, y };

    // Telescópio Cósmico: Observar localmente com throttle para evitar avalanche
    const now = Date.now();
    if (now - lastObserveTime.current > 100) {
      engineRef.current.observeAt(universeX, universeY, horizonRadius / scale);
      lastObserveTime.current = now;
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !stateRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const spectatorTarget = stateRef.current.isSpectatorMode
      ? {
          x: stateRef.current.viewportX,
          y: stateRef.current.viewportY,
          zoom: stateRef.current.zoom,
        }
      : undefined;
    const { toX, toY, scale } = computeTransform(
      stateRef.current.particles,
      canvasRef.current.width,
      canvasRef.current.height,
      spectatorTarget,
    );

    let closest: Particle | null = null;
    let minDist = 20;

    for (const p of stateRef.current.particles) {
      if (p.isLatent) continue;
      const dx = toX(p.x) - x;
      const dy = toY(p.y) - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    setSelectedParticleId(closest?.id || null);
  };

  const initEngine = useCallback((forceReset = false) => {
    if (typeof window === "undefined") return;
    let saved: PersistentState | null = null;
    if (!forceReset) {
      try {
        const item = localStorage.getItem(STORAGE_KEY);
        console.log(
          "Persistence: loading from localStorage",
          item ? "found" : "not found",
        );
        if (item) {
          saved = JSON.parse(item);
          console.log("Persistence: loaded successfully");
        }
      } catch (e) {
        console.error("Persistence: failed to load", e);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    engineRef.current = new ObserverLayer(saved || undefined);
    if (window.innerWidth < 768) {
      engineRef.current.setSpectatorMode(true);
    }
    engineRef.current.isObserving = isObservingRef.current;
    engineRef.current.onStateUpdate = (newState) => {
      setState(newState);

      if (newState.tick % 60 === 0) {
        const currentStats: Record<string, number> = {
          entropy: newState.entropy,
          coherence: newState.coherence,
          relations: newState.relationsCount,
          culture: newState.culture,
          tech: newState.technology,
          life: newState.lifeCount,
          nodes: newState.collectiveConsciousnessNodes,
          entangled: newState.entangledPairsCount,
          interference: newState.interferenceCount,
          persistenceScale: newState.persistenceScale,
        };
        setPrevStats(currentStats);
      }

      if (newState.tick % 10 === 0 && lazyDocRef.current) {
        setLazyMetrics(lazyDocRef.current.getMetrics());
      }

      if (newState.tick % 120 === 0) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(engineRef.current?.getPersistentState()),
          );
        } catch (_) {}
      }
    };
    lazyDocRef.current = new LazyDocumentary(engineRef.current);
    setState(engineRef.current.getState());
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (engineRef.current) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(engineRef.current.getPersistentState()),
          );
          console.log("Persistence: saved on beforeunload");
        } catch (e) {
          console.error("Persistence: failed to save on beforeunload", e);
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  const animate = useCallback(() => {
    if (!engineRef.current) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    engineRef.current.isObserving = isObservingRef.current;

    // Viewport Optimization: Tell the engine where we are looking
    if (isObservingRef.current && canvasRef.current && stateRef.current) {
      const spectatorTarget = stateRef.current.isSpectatorMode
        ? {
            x: stateRef.current.viewportX,
            y: stateRef.current.viewportY,
            zoom: stateRef.current.zoom,
          }
        : undefined;

      const { scale } = computeTransform(
        stateRef.current.particles,
        canvasRef.current.width,
        canvasRef.current.height,
        spectatorTarget,
      );

      engineRef.current.setViewport({
        x: spectatorTarget?.x ?? 0,
        y: spectatorTarget?.y ?? 0,
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        scale: scale,
      });
    }

    engineRef.current.step();

    // If not in observing mode, we skip all expensive UI updates and rendering
    if (!isObservingRef.current) {
      // Clear canvas to show it's "off"
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#050505";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const currentState = stateRef.current;
    if (currentState) {
      // Spectator Mode Camera
      if (
        currentState.isSpectatorMode &&
        currentState.significantEvents &&
        currentState.significantEvents.length > 0
      ) {
        const lastEvent =
          currentState.significantEvents[
            currentState.significantEvents.length - 1
          ];
        // Smooth pan to event
        currentState.viewportX += (lastEvent.x - currentState.viewportX) * 0.05;
        currentState.viewportY += (lastEvent.y - currentState.viewportY) * 0.05;
        currentState.zoom += (1.2 - currentState.zoom) * 0.02;
      } else if (currentState.isSpectatorMode) {
        // Default slow pan if no events
        currentState.viewportX += Math.sin(currentState.tick * 0.01) * 2;
        currentState.viewportY += Math.cos(currentState.tick * 0.01) * 2;
        currentState.zoom += (0.8 - currentState.zoom) * 0.01;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx && engineRef.current)
          renderUniverse(
            ctx,
            canvas.width,
            canvas.height,
            currentState,
            engineRef.current,
            latentModeRef.current,
            selectedParticleIdRef.current,
            mousePosRef.current,
          );
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  const maxLevel = state?.maxLevel ?? 1;
  const dormant = state?.dormantCount ?? 0;
  const charged = state?.chargedCount ?? 0;
  const bound = state?.boundCount ?? 0;

  return (
    <div className="relative w-full h-screen bg-[#050505] text-white overflow-hidden font-mono">
      <canvas
        ref={canvasRef}
        width={typeof window !== "undefined" ? window.innerWidth : 800}
        height={typeof window !== "undefined" ? window.innerHeight : 600}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        className="absolute inset-0 z-0 cursor-crosshair"
      />

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <h1 className="text-xl uppercase tracking-[0.3em] font-black">
                Universo Real
              </h1>
            </div>
            <p className="text-[10px] opacity-30 uppercase tracking-widest">
              {isObserving
                ? "Observação ativa • Lazy comprometida"
                : "Evoluindo em silêncio • Modo Lazy"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 pointer-events-auto">
            <div className="flex gap-3">
              <button
                onClick={() => setDocumentaryMode(!documentaryMode)}
                className={`group relative flex items-center gap-2 px-4 py-2 border rounded-md transition-all ${
                  documentaryMode
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                    : "bg-slate-500/20 border-slate-500/50 text-slate-400"
                }`}
              >
                <Clock size={14} />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                  {documentaryMode
                    ? "Modo Documentário Ativo"
                    : "Ativar Modo Documentário"}
                </span>
              </button>

              {documentaryMode && (
                <button
                  onClick={() => engineRef.current?.forceSnapshot()}
                  className="group relative flex items-center gap-2 px-4 py-2 border rounded-md transition-all bg-purple-500/20 border-purple-500/50 text-purple-400"
                >
                  <Camera size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                    Capturar Snapshot
                  </span>
                </button>
              )}

              <button
                onClick={() => setIsObserving(!isObserving)}
                className={`group relative flex items-center gap-2 px-4 py-2 border rounded-md transition-all ${
                  isObserving
                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                    : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                }`}
              >
                {isObserving ? (
                  <>
                    <X size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                      Fechar Observação
                    </span>
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                      Abrir Janela de Observação
                    </span>
                    <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-black/90 border border-white/10 rounded text-[9px] text-white/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Custo: Aumenta o processamento ao forçar o colapso de onda
                      em todo o campo de visão.
                    </div>
                  </>
                )}
              </button>
              <button
                onClick={() => initEngine(true)}
                className="p-2 border border-white/10 hover:bg-red-500/80 transition-colors rounded-md text-white/60 hover:text-white"
                title="Reiniciar — Big Bang"
              >
                <RefreshCw size={14} className="rotate-45" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {!isObserving ? (
              <motion.div
                key="real-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center space-y-4"
              >
                <p className="text-xl font-serif italic text-white/40 max-w-lg">
                  "O silêncio é a linguagem da criação pura."
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-emerald-500/60">
                    Universo rodando em silêncio • Modo Real
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div
          className={`transition-all duration-1000 ${!isObserving ? "opacity-0 translate-y-10 pointer-events-none" : "opacity-100 translate-y-0"}`}
        >
          {!isMobile && (
            <main className="flex justify-between items-end">
              <div className="space-y-3 w-72">
                {/* Documentary Mode Overlay */}
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-lg space-y-3 mb-4 pointer-events-auto">
                  <div className="flex justify-between items-center">
                    <h2 className="text-[10px] uppercase tracking-widest font-bold text-orange-400">
                      Cosmos Emergente
                    </h2>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (engineRef.current) {
                            engineRef.current.metrics.isSpectatorMode =
                              !engineRef.current.metrics.isSpectatorMode;
                            setState({ ...engineRef.current.getState() });
                          }
                        }}
                        className={`px-2 py-1 text-[8px] rounded border transition-all ${state?.isSpectatorMode ? "bg-orange-500/20 border-orange-500 text-orange-400" : "border-white/20 text-white/40"}`}
                      >
                        {state?.isSpectatorMode
                          ? "ESPECTADOR ATIVO"
                          : "ATIVAR ESPECTADOR"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 p-2 rounded text-[9px] text-zinc-300 italic border-l-2 border-orange-500/50">
                    {state?.events && state.events.length > 0 ? (
                      <p>"{state.events[state.events.length - 1]}"</p>
                    ) : (
                      <p>"O vácuo quântico flutua em silêncio..."</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="opacity-50">Ciclo atual:</span>
                      <span className="text-white">
                        #{state?.currentCycle} | Tick {state?.tick}
                      </span>
                    </div>
                  </div>

                  {/* Tabbed Metrics */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between mb-3 bg-white/5 p-1 rounded">
                      {(
                        [
                          "core",
                          "quantum",
                          "life",
                          "civ",
                          "cosmic",
                          "horizon",
                          "log",
                          "manifesto",
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-2 py-1 text-[8px] uppercase tracking-tighter rounded transition-all ${activeTab === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3 min-h-[160px]">
                      {activeTab === "core" && (
                        <div className="space-y-2">
                          <Metric
                            label="Gênese Contínua"
                            value={state?.genesisActivity ?? 0}
                            icon={<Sparkles size={11} />}
                            color="text-purple-400"
                            pct
                            tooltip="Taxa emergente de criação. O vácuo torna-se instável quando há baixa coerência ou vazio informacional."
                            formula="G = α(1-Coh) + β(1-Act)"
                            range="Emergente / Dinâmico"
                            scientistMode={scientistMode}
                          />
                          <Metric
                            label="Eficiência Lazy"
                            value={state?.efficiency ?? 0}
                            icon={<Zap size={11} />}
                            color="text-emerald-400"
                            pct
                            tooltip="Porcentagem de partículas latentes (não processadas). Quanto maior, mais eficiente é a simulação."
                            formula="1 - (Active / Total)"
                            range="90% - 99% (Ideal)"
                            scientistMode={scientistMode}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Stat
                              label="Decisões/Tick"
                              value={state?.decisionsPerTick ?? 0}
                              icon={<Brain size={10} />}
                              color="text-cyan-400"
                              tooltip="Número de partículas que realizaram busca local e tomaram decisões de interação."
                              range="Atividade real do core"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Candidatos Méd."
                              value={(state?.avgCandidates ?? 0).toFixed(1)}
                              icon={<Users size={10} />}
                              color="text-blue-400"
                              tooltip="Média de vizinhos encontrados via Quadtree para cada decisão."
                              range="Densidade local"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Energia Auto"
                              value={(state?.totalSelfEnergy ?? 0).toFixed(3)}
                              icon={<Activity size={10} />}
                              color="text-yellow-400"
                              tooltip="Energia total consumida pelo mecanismo de auto-observação (motor de existência)."
                              range="Custo de existir"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Traços Ativos"
                              value={state?.activeTracesCount ?? 0}
                              icon={<HistoryIcon size={10} />}
                              color="text-purple-400"
                              tooltip="Total de memórias de interação (traces) atualmente em processamento."
                              range="Memória de curto prazo"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Buracos Negros"
                              value={state?.blackHoleCount ?? 0}
                              icon={<CircleDot size={10} />}
                              color="text-red-500"
                              tooltip="Colapsos gravitacionais por excesso de informação (Bekenstein) ou massa."
                              range="Singularidades"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Horizonte (Ly)"
                              value={(state?.horizonSize ?? 0).toFixed(0)}
                              icon={<Expand size={10} />}
                              color="text-rose-400"
                              tooltip="Raio do universo observável. A expansão (Λ) dilui a densidade de partículas, reduzindo o custo computacional local. O espaço se expande para manter a simulação 'lazy'."
                              range="Causalidade"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Dilatação Méd."
                              value={(state?.avgTimeDilation ?? 0).toFixed(3)}
                              icon={<Clock size={10} />}
                              color="text-blue-300"
                              tooltip="Média da dilatação temporal (v/c). 1.0 = Velocidade da luz."
                              range="Relatividade"
                              scientistMode={scientistMode}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "quantum" && (
                        <div className="space-y-2">
                          <Metric
                            label="Coherence"
                            value={state?.coherence ?? 0}
                            icon={<Layers size={11} />}
                            color="text-emerald-400"
                            pct
                            trend={getTrend(
                              state?.coherence,
                              prevStats.coherence,
                            )}
                            tooltip="Ordem global da fase quântica. Alta coerência permite interferência construtiva e estabilidade de estruturas."
                            formula="Σ|ψ_i|² / N"
                            range="0.0 (Caos) - 1.0 (Cristalino)"
                            scientistMode={scientistMode}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Stat
                              label="Interferência"
                              value={state?.interferenceCount ?? 0}
                              icon={<Sigma size={10} />}
                              color="text-cyan-400"
                              tooltip="Eventos de superposição de ondas. Essencial para a formação de ligações químicas."
                              range="Típico: 1000-20000"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Emaranhados"
                              value={state?.entangledPairsCount ?? 0}
                              icon={<Link size={10} />}
                              color="text-purple-400"
                              tooltip="Pares de partículas com estados correlacionados. Base para a consciência coletiva."
                              range="Cresce com a complexidade"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Fase Média"
                              value={(state?.avgPhase ?? 0).toFixed(2)}
                              icon={<Orbit size={10} />}
                              color="text-indigo-400"
                              tooltip="Média das fases quânticas. Determina se a interferência é construtiva ou destrutiva."
                              range="0 - 2π (π = Destrutiva)"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Contexto"
                              value={(state?.contextualityRate ?? 0).toFixed(2)}
                              icon={<Info size={10} />}
                              color="text-yellow-400"
                              tooltip="Taxa de viés contextual. Mede o quanto o universo é influenciado pelo ato de observar."
                              range="0.0 - 1.0"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Exploração"
                              value={
                                (
                                  (state?.explorationSuccessRate ?? 0) * 100
                                ).toFixed(1) + "%"
                              }
                              icon={<Compass size={10} />}
                              color="text-orange-400"
                              tooltip="Taxa de sucesso das partículas ao explorar novas configurações de fase e velocidade para aumentar a persistência."
                              range="Exploração do espaço de estados"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Ponte ER=EPR"
                              value={
                                (
                                  (state?.nonLocalEfficiency ?? 0) * 100
                                ).toFixed(1) + "%"
                              }
                              icon={<Network size={10} />}
                              color="text-indigo-400"
                              tooltip="Eficiência das interações não-locais via entrelaçamento. Permite comunicação instantânea entre partículas distantes sem custo de espaço intermediário."
                              range="Não-localidade"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Memória Ativa"
                              value={
                                ((state?.memoryUsage ?? 0) * 100).toFixed(1) +
                                "%"
                              }
                              icon={<Cpu size={10} />}
                              color="text-blue-400"
                              tooltip="Proporção de partículas que estão sendo 'lembradas' ou observadas. Partículas na memória consomem processamento ativo."
                              range="Custo de Atenção"
                              scientistMode={scientistMode}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "life" && (
                        <div className="space-y-2">
                          <Metric
                            label="Habitabilidade"
                            value={
                              (state?.habitabilityMap?.reduce(
                                (acc, c) => acc + c.potential,
                                0,
                              ) || 0) / (state?.habitabilityMap?.length || 1)
                            }
                            icon={<Globe size={11} />}
                            color="text-emerald-400"
                            pct
                            tooltip="Média global de habitabilidade. Mede o quão propício o universo é para a emergência de complexidade."
                            formula="Σ L(x) / N"
                            range="0.4 - 0.7 (Ideal)"
                            scientistMode={scientistMode}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Stat
                              label="Moléculas"
                              value={state?.moleculeCount ?? 0}
                              icon={<Atom size={10} />}
                              color="text-emerald-300"
                              tooltip="Estruturas químicas estáveis."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Zonas de Vida"
                              value={state?.lifeCount ?? 0}
                              icon={<Heart size={10} />}
                              color="text-pink-400"
                              tooltip="Número de regiões que atingiram o limiar de habitabilidade crítica (Edge of Chaos)."
                              range="L(x) > 0.6"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Cultura"
                              value={state?.culture ?? 0}
                              icon={<ScrollText size={10} />}
                              color="text-amber-400"
                              tooltip="Acúmulo de informação persistente em zonas habitáveis."
                              range="Memória coletiva"
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Tecnologia"
                              value={state?.technology ?? 0}
                              icon={<Cpu size={10} />}
                              color="text-cyan-400"
                              tooltip="Capacidade de manipulação do ambiente baseada em informação acumulada."
                              range="Eficiência informacional"
                              scientistMode={scientistMode}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "log" && (
                        <div className="space-y-0 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                          {state?.discoveryLog &&
                          state.discoveryLog.length > 0 ? (
                            state.discoveryLog
                              .slice()
                              .reverse()
                              .map((d, i) => (
                                <div
                                  key={i}
                                  className="flex gap-3 p-2 border-b border-white/5 last:border-0 group hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex flex-col items-center gap-1 mt-1">
                                    <div className="w-1 h-1 rounded-full bg-orange-500/50" />
                                    <div className="w-[1px] flex-1 bg-white/10" />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1.5">
                                        <Clock
                                          size={10}
                                          className="text-orange-400 opacity-60"
                                        />
                                        <span className="text-[8px] uppercase tracking-widest font-bold text-white/40">
                                          {d.category}
                                        </span>
                                      </div>
                                      <span className="text-[8px] font-mono text-white/20">
                                        T+{d.tick}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-300 leading-snug italic">
                                      "{d.event}"
                                    </p>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="text-center py-8 opacity-20 text-[9px]">
                              Nenhuma descoberta registrada ainda...
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === "civ" && (
                        <div className="space-y-2">
                          <Metric
                            label="Cultura"
                            value={state?.culture ?? 0}
                            icon={<Globe size={11} />}
                            color="text-orange-300"
                            trend={getTrend(state?.culture, prevStats.culture)}
                            tooltip="Acúmulo de informação compartilhada entre consciências."
                            scientistMode={scientistMode}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Stat
                              label="Relações"
                              value={state?.relationsCount ?? 0}
                              icon={<Share2 size={10} />}
                              color="text-blue-300"
                              tooltip="Conexões significativas entre mentes."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Nós"
                              value={state?.collectiveConsciousnessNodes ?? 0}
                              icon={<Network size={10} />}
                              color="text-violet-300"
                              tooltip="Número de mentes integradas na rede coletiva."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Tecnologia"
                              value={state?.technology ?? 0}
                              icon={<Cpu size={10} />}
                              color="text-cyan-400"
                              tooltip="Nível de manipulação da realidade física."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Conscious"
                              value={state?.consciousnessCount ?? 0}
                              icon={<Eye size={10} />}
                              color="text-violet-400"
                              tooltip="Total de observadores individuais."
                              scientistMode={scientistMode}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "cosmic" && (
                        <div className="space-y-2">
                          <Metric
                            label="Entropia"
                            value={state?.entropy ?? 1}
                            icon={<Wind size={11} />}
                            color="text-gray-400"
                            pct
                            trend={getTrend(state?.entropy, prevStats.entropy)}
                            tooltip="Medida de desordem e informação perdida no universo."
                            scientistMode={scientistMode}
                          />
                          <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                            <Metric
                              label="Persistência P(t)"
                              value={state?.persistenceScale ?? 0}
                              icon={<Clock size={11} />}
                              color="text-emerald-400"
                              trend={getTrend(
                                state?.persistenceScale,
                                prevStats.persistenceScale,
                              )}
                              tooltip="Escala de tempo de persistência instantânea. P(t) = (⟨k⟩ × τ × H × A) / D. Quanto tempo o sistema 'acha' que vai durar antes de dissipar."
                              scientistMode={scientistMode}
                            />
                            {scientistMode && state?.ptEquation && (
                              <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-mono text-gray-400">
                                <div className="flex justify-between"><span>⟨k⟩ Acoplamento:</span> <span className="text-white">{state.ptEquation.avgCoupling.toFixed(3)}</span></div>
                                <div className="flex justify-between"><span>τ Idade Média:</span> <span className="text-white">{state.ptEquation.avgPersistence.toFixed(1)}</span></div>
                                <div className="flex justify-between"><span>H Entropia:</span> <span className="text-white">{state.ptEquation.horizon.toFixed(3)}</span></div>
                                <div className="flex justify-between"><span>A Observação:</span> <span className="text-white">{state.ptEquation.activeObservation.toFixed(3)}</span></div>
                                <div className="flex justify-between col-span-2"><span>D Dissipação:</span> <span className="text-white">{state.ptEquation.density.toFixed(3)}</span></div>
                                <div className="col-span-2 mt-1 text-center text-emerald-400/70">
                                  P(t) = (⟨k⟩ × τ × H × A) / D
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Stat
                              label="Curvatura"
                              value={state?.maxCurvature ?? 0}
                              icon={<Circle size={10} />}
                              color="text-indigo-400"
                              tooltip="Distorção máxima do espaço-tempo causada pela massa."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Temperatura"
                              value={state?.systemTemperature ?? 0}
                              icon={<Thermometer size={10} />}
                              color="text-red-400"
                              tooltip="Energia cinética média das partículas ativas."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Gradiente"
                              value={state?.thermalGradient ?? 0}
                              icon={<Layers size={10} />}
                              color="text-orange-400"
                              tooltip="Diferença térmica. O universo não 'cria' complexidade, ele comprime dados. O gradiente é a zona onde a computação ativa tenta se estabilizar em estruturas 'lazy' (ligadas)."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Informação"
                              value={Math.round(state?.totalInformation ?? 0)}
                              icon={<Database size={10} />}
                              color="text-blue-500"
                              tooltip="Conteúdo total de bits/energia processados pela simulação."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Pares"
                              value={state?.pairProductionCount ?? 0}
                              icon={<RefreshCw size={10} />}
                              color="text-orange-500"
                              tooltip="Total de pares matéria-antimatter criados a partir de energia pura."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Fótons (c)"
                              value={state?.photonCount ?? 0}
                              icon={<Zap size={10} />}
                              color="text-yellow-300"
                              tooltip="Partículas viajando à velocidade da luz (c). O limite 'c' atua como o clock speed máximo e limite de bandwidth do simulador, garantindo a causalidade local."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Dilatação"
                              value={(state?.avgTimeDilation ?? 0).toFixed(4)}
                              icon={<Clock size={10} />}
                              color="text-purple-300"
                              tooltip="Média de dilatação temporal. Quanto maior, mais devagar o tempo passa para as partículas."
                              scientistMode={scientistMode}
                            />
                            <Stat
                              label="Energia Escura"
                              value={(state?.darkEnergy ?? 0).toFixed(2)}
                              icon={<Orbit size={10} />}
                              color="text-zinc-400"
                              tooltip="Contribuição dos fótons para a expansão acelerada do universo."
                              scientistMode={scientistMode}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "horizon" && (
                        <div className="space-y-4">
                          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center text-center shadow-2xl shadow-rose-500/5">
                            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 border border-rose-500/30 animate-pulse">
                              <Zap size={32} className="text-rose-400" />
                            </div>

                            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-rose-100 mb-3">
                              Salto Quântico
                            </h3>

                            <p className="text-[11px] text-white/50 leading-relaxed mb-8 max-w-[200px]">
                              "Onde a física colapsa, a curiosidade salta." A
                              área atual pode estar saturada por singularidades.
                              Tente a sorte em outra coordenada do multiverso.
                            </p>

                            <button
                              onClick={() => {
                                const range = 100000;
                                const x = (Math.random() - 0.5) * range;
                                const y = (Math.random() - 0.5) * range;
                                engineRef.current?.teleport(x, y);
                              }}
                              className="w-full py-5 bg-rose-500/20 hover:bg-rose-500/40 border-2 border-rose-500/40 rounded-xl transition-all group relative overflow-hidden active:scale-95"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              <span className="text-[12px] font-black uppercase tracking-[0.5em] text-rose-100 flex items-center justify-center gap-4">
                                <Zap
                                  size={16}
                                  className="group-hover:rotate-12 transition-transform"
                                />
                                Saltar
                              </span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col">
                              <span className="text-[9px] uppercase tracking-widest opacity-30 mb-1">
                                Setor X
                              </span>
                              <span className="text-[11px] font-mono text-rose-300 font-bold">
                                {Math.round(state?.viewportX ?? 0)}
                              </span>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col">
                              <span className="text-[9px] uppercase tracking-widest opacity-30 mb-1">
                                Setor Y
                              </span>
                              <span className="text-[11px] font-mono text-rose-300 font-bold">
                                {Math.round(state?.viewportY ?? 0)}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
                            <span className="text-[9px] uppercase tracking-widest opacity-30 mb-1">
                              Horizonte Total do Universo
                            </span>
                            <span className="text-sm font-black font-mono text-rose-400 animate-pulse">
                              {Math.round(state?.horizonSize ?? 0)} Ly
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                engineRef.current?.setSpectatorMode(
                                  !state?.isSpectatorMode,
                                );
                              }}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${state?.isSpectatorMode ? "bg-blue-500/20 border-blue-500/50 text-blue-200" : "bg-white/5 border-white/10 hover:bg-white/10 text-white/40"}`}
                            >
                              <Eye
                                size={14}
                                className={
                                  state?.isSpectatorMode
                                    ? "text-blue-400"
                                    : "text-white/20"
                                }
                              />
                              {state?.isSpectatorMode ? "Espectador" : "Manual"}
                            </button>

                            <button
                              onClick={() => {
                                engineRef.current?.setZoom(0.01);
                              }}
                              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/40"
                              title="Reset Zoom"
                            >
                              <Maximize2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {activeTab === "manifesto" && (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2 mb-4 text-orange-300">
                              <ScrollText size={14} />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                Manifesto do Universo Contente
                              </span>
                            </div>

                            <div className="space-y-6 text-[10px] leading-relaxed text-white/70 font-serif italic">
                              <section className="space-y-2">
                                <p className="text-white/90 font-bold not-italic">
                                  "O universo não está esperando a gente
                                  descobrir nada novo. Ele já está contente com
                                  o que tem."
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-[8px] uppercase tracking-tighter opacity-60 not-italic">
                                  <div className="p-2 border border-white/5 rounded">
                                    Nós: "Descobrir novas leis"
                                  </div>
                                  <div className="p-2 border border-white/5 rounded bg-white/5">
                                    Universo: "As leis já estão lá"
                                  </div>
                                  <div className="p-2 border border-white/5 rounded">
                                    Nós: "Criar o inédito"
                                  </div>
                                  <div className="p-2 border border-white/5 rounded bg-white/5">
                                    Universo: "Tudo é latente"
                                  </div>
                                </div>
                              </section>

                              <section className="space-y-2 border-l-2 border-orange-500/20 pl-3">
                                <p>
                                  O universo é preguiçoso. E contente com a
                                  própria preguiça.
                                </p>
                                <p>
                                  Não há "novas" leis. Só há leis que ainda não
                                  observamos.
                                </p>
                              </section>

                              <section className="space-y-2">
                                <p className="text-orange-200/80">
                                  A Beleza Disso:
                                </p>
                                <ul className="space-y-1 list-disc list-inside opacity-80">
                                  <li>O pão é pão. A manteiga é manteiga.</li>
                                  <li>
                                    O horizonte se afasta. O buraco negro
                                    silencia.
                                  </li>
                                  <li>
                                    A observação colapsa. O latente descansa.
                                  </li>
                                </ul>
                              </section>

                              <section className="space-y-2 pt-4 border-t border-white/5 not-italic font-sans">
                                <div className="flex items-center gap-2 text-emerald-400 text-[8px] font-bold uppercase">
                                  <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                                  O Que Isso Ensina
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-white/5 rounded border border-white/10">
                                    <span className="block text-[7px] opacity-40">
                                      01
                                    </span>
                                    <span className="text-white/90">
                                      Não force.
                                    </span>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded border border-white/10">
                                    <span className="block text-[7px] opacity-40">
                                      02
                                    </span>
                                    <span className="text-white/90">
                                      Observe.
                                    </span>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded border border-white/10">
                                    <span className="block text-[7px] opacity-40">
                                      03
                                    </span>
                                    <span className="text-white/90">
                                      Aceite.
                                    </span>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded border border-white/10">
                                    <span className="block text-[7px] opacity-40">
                                      04
                                    </span>
                                    <span className="text-white/90">
                                      Confie.
                                    </span>
                                  </div>
                                </div>
                              </section>

                              <p className="text-center text-[9px] text-orange-300/60 pt-4">
                                "Você não criou nada. Você só observou. E o
                                universo respondeu."
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-1.5">
                    <div className="group relative flex justify-between text-[9px]">
                      <span className="opacity-40 uppercase tracking-tighter">
                        Eficiência Lazy:
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {(state?.efficiency ?? 0).toFixed(1)}%
                      </span>
                      <Tooltip
                        content="Economia de processamento ao não calcular regiões não observadas (Lazy Evaluation)."
                        formula="100 - (Active / Total) * 100"
                        range={`Custo Real: ${Math.round(state?.lazyCost ?? 0)} | Custo Teórico: ${Math.round(state?.eagerCost ?? 0)}`}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (engineRef.current) {
                        engineRef.current.resetUniverse();
                        setState({ ...engineRef.current.getState() });
                      }
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] uppercase tracking-widest transition-all"
                  >
                    Reiniciar Ciclo (Big Bang)
                  </button>
                </div>
              </div>

              <div className="w-60 text-right space-y-2">
                <div className="text-[9px] opacity-30 uppercase tracking-widest">
                  Linha do Tempo Cósmica
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {state?.history
                    ?.slice()
                    .reverse()
                    .map((h, i) => (
                      <div
                        key={i}
                        className="text-right space-y-1 border-r border-white/10 pr-3 mr-1"
                      >
                        <div className="text-[9px] font-bold text-orange-300">
                          Ciclo #{h.cycleId}
                        </div>
                        <div className="text-[8px] opacity-40">
                          Finalizado em {h.totalTicks} ticks
                        </div>
                        <div className="text-[8px] text-zinc-500 italic">
                          {h.milestones.slice(-1).map((m) => m.event)}
                        </div>
                      </div>
                    ))}
                  <div className="text-right space-y-1 border-r border-emerald-500/30 pr-3 mr-1">
                    <div className="text-[9px] font-bold text-emerald-400">
                      Ciclo #{state?.currentCycle} (Atual)
                    </div>
                    <div className="text-[8px] opacity-40 animate-pulse">
                      Evoluindo...
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="text-[9px] opacity-30 uppercase tracking-widest">
                    Eventos Recentes
                  </div>
                  <div className="space-y-1 text-[10px] text-zinc-400 max-h-40 overflow-y-auto">
                    {state?.events?.slice(-5)?.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right space-y-3">
                {isObserving && (
                  <>
                    <div className="space-y-1">
                      <div className="text-[9px] opacity-30 uppercase tracking-widest">
                        Tick
                      </div>
                      <div className="flex items-baseline gap-2 justify-end">
                        <div className="text-2xl font-light tabular-nums tracking-tighter">
                          {String(state?.tick ?? 0).padStart(10, "0")}
                        </div>
                        <div className="text-[8px] text-emerald-500/50 border border-emerald-500/20 px-1 rounded-[2px] animate-pulse">
                          LIVE
                        </div>
                        <div className="flex items-center gap-2 text-[8px] text-orange-200/40 border border-orange-500/20 px-2 py-1 rounded-full bg-orange-500/5">
                          <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                          PÃO COM MANTEIGA: CONSISTENTE
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] opacity-30 uppercase tracking-widest">
                        Max Curvature
                      </div>
                      <div className="text-xl font-light tracking-tighter text-amber-400">
                        {state?.maxCurvature?.toFixed(3) ?? 0}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] opacity-30 uppercase tracking-widest">
                        Particle Count
                      </div>
                      <div className="text-xl font-light tracking-tighter text-amber-400">
                        {state?.particleCount ?? 0}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-[2px]">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-[3px] h-4 rounded-[1px] transition-colors duration-300 ${
                              i < (state?.coherence ?? 0) * 14
                                ? "bg-white/70"
                                : "bg-white/8"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[8px] opacity-20 uppercase tracking-[0.2em]">
                        Structural Integrity
                      </div>
                    </div>
                  </>
                )}

                {/* Epistemological Panel */}
                {isObserving &&
                  selectedParticleId &&
                  state?.particles.find((p) => p.id === selectedParticleId) && (
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-lg w-72 text-left pointer-events-auto mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-cyan-400">
                          Observação Epistemológica
                        </h3>
                        <button
                          onClick={() => setSelectedParticleId(null)}
                          className="text-[10px] opacity-40 hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                      {(() => {
                        const p = state.particles.find(
                          (p) => p.id === selectedParticleId,
                        )!;
                        const descriptions = ObserverLayer.describeEvent(
                          p,
                          state.tick,
                        );
                        return (
                          <div className="space-y-3">
                            <div>
                              <div className="text-[8px] opacity-40 uppercase mb-1">
                                Ontologia (Lazy Evaluation)
                              </div>
                              <p className="text-[10px] text-zinc-300 leading-relaxed italic">
                                "{descriptions.lazyEvaluation}"
                              </p>
                            </div>
                            <div>
                              <div className="text-[8px] opacity-40 uppercase mb-1">
                                Formalismo (Função de Onda)
                              </div>
                              <p className="text-[10px] text-blue-300 leading-relaxed">
                                "{descriptions.funcaoOnda}"
                              </p>
                            </div>
                            <div>
                              <div className="text-[8px] opacity-40 uppercase mb-1">
                                Contexto (Matriz Densidade)
                              </div>
                              <p className="text-[10px] text-purple-300 leading-relaxed">
                                "{descriptions.matrizDensidade}"
                              </p>
                            </div>
                            <div className="pt-2 border-t border-white/5 flex justify-between text-[9px]">
                              <span className="opacity-40">Amplitude:</span>
                              <span className="text-white">
                                {(p.amplitude ?? 0).toFixed(3)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className="opacity-40">Fase:</span>
                              <span className="text-white">
                                {(((p.phase ?? 0) * 180) / Math.PI).toFixed(1)}°
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className="opacity-40">
                                Viés de Contexto:
                              </span>
                              <span className="text-yellow-400">
                                {(p.contextualBias ?? 0).toFixed(3)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className="opacity-40">Tempo Próprio:</span>
                              <span className="text-emerald-400">
                                {Math.floor(p.properTime || 0)} ticks
                              </span>
                            </div>
                            {p.isPhoton && (
                              <div className="flex justify-between text-[9px]">
                                <span className="text-yellow-300 font-bold">
                                  FÓTON (v = c)
                                </span>
                                <span className="text-yellow-300">
                                  Tempo Parado
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
              </div>
            </main>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-[#080808]/95 border border-white/15 p-8 max-w-lg w-full pointer-events-auto shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.25em]">
                  Physics Laws
                </h2>
                <button
                  onClick={() => setShowInfo(false)}
                  className="opacity-30 hover:opacity-80 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2.5 text-[10px] leading-relaxed opacity-65">
                {LAWS.map(([law, desc]) => (
                  <p key={law}>
                    <span className="text-white font-bold">{law}: </span>
                    {desc}
                  </p>
                ))}
                <div className="pt-4 border-t border-white/8 flex items-center gap-2 opacity-50">
                  <Cpu size={12} />
                  <span className="uppercase tracking-widest text-[9px]">
                    each particle is its own observer
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Narrative Overlay (only in observing mode) */}
      <AnimatePresence>
        {showNarrative && isObserving && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl pointer-events-auto">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono text-white/40 uppercase tracking-widest">
                    Estado da Existência
                  </h3>
                  <div className="group relative">
                    <Info
                      size={10}
                      className="text-[10px] opacity-40 hover:opacity-100 transition-opacity"
                    />
                    <Tooltip content="Frase gerada dinamicamente com base no estado atual do cosmos (complexidade, vida, tecnologia)." />
                  </div>
                </div>
                <button
                  onClick={() => setShowNarrative(false)}
                  className="text-white/20 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-lg font-serif italic text-white/90 leading-relaxed">
                "{getNarrative()}"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute inset-0 pointer-events-none z-20 opacity-[0.055]
        bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)]
        bg-[length:100%_2px]"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function getTrend(
  current: number | undefined,
  prev: number | undefined,
): "up" | "down" | "neutral" {
  if (current === undefined || prev === undefined) return "neutral";
  if (current > prev) return "up";
  if (current < prev) return "down";
  return "neutral";
}

function Tooltip({
  content,
  formula,
  range,
}: {
  content: string;
  formula?: string;
  range?: string;
}) {
  return (
    <div className="absolute left-0 -top-16 z-50 w-56 p-2.5 bg-black/95 border border-white/15 rounded-lg shadow-2xl text-[9px] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all transform translate-y-2 group-hover:translate-y-0">
      <div className="text-white/90 font-medium mb-1">{content}</div>
      {range && (
        <div className="text-emerald-400/80 mb-1 italic">Ref: {range}</div>
      )}
      {formula && (
        <div className="mt-1.5 pt-1.5 border-t border-white/10 font-mono text-[8px] text-white/40">
          {formula}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  color,
  pct,
  trend,
  tooltip,
  formula,
  range,
  scientistMode,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  pct?: boolean;
  trend?: "up" | "down" | "neutral";
  tooltip?: string;
  formula?: string;
  range?: string;
  scientistMode?: boolean;
}) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  const display = pct
    ? `${(n * 100).toFixed(1)}%`
    : typeof value === "number"
      ? value.toFixed(2)
      : value;
  return (
    <div className="group relative space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 opacity-35 group-hover:opacity-100 transition-opacity">
          {icon}
          <span className="text-[9px] uppercase tracking-widest font-bold">
            {label}
          </span>
        </div>
        {trend && trend !== "neutral" && (
          <span
            className={`text-[8px] ${trend === "up" ? "text-emerald-400" : "text-red-400"}`}
          >
            {trend === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>
      <div className={`text-xl font-light tracking-tighter ${color}`}>
        {display}
      </div>
      <div className="w-full h-px bg-white/8 relative overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-current ${color}`}
          animate={{ width: pct ? `${Math.min(100, n * 100)}%` : "100%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.8 }}
        />
      </div>

      {tooltip && <Tooltip content={tooltip} formula={formula} range={range} />}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
  tooltip,
  formula,
  range,
  scientistMode,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
  formula?: string;
  range?: string;
  scientistMode?: boolean;
}) {
  return (
    <div className="group relative space-y-0.5">
      <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
        {icon}
        <span className="text-[8px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-lg font-light tracking-tighter ${color}`}>
        {value}
      </div>

      {tooltip && <Tooltip content={tooltip} formula={formula} range={range} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAWS REFERENCE
// ═══════════════════════════════════════════════════════════════════

const LAWS: [string, string][] = [
  [
    "LOCAL OBSERVER",
    "No particle has global knowledge. Each only processes its local neighbourhood. No global barycenter — expansion emerges from local density observation.",
  ],
  [
    "LAZY EVALUATION",
    "Separate active/dormant grids. Active: full physics O(active). Wake-up: O(active_cells × wakeRange²). Dormant: O(1) geodesic drift only. The universe never processes what it doesn't need to.",
  ],
  [
    "FREEDOM",
    "Particle identity is not fixed at birth. It changes through physics: charge flips (beta decay), mass splits (fission), new matter born from energy (pair production), bound states form (atoms). The physics decides, not the programmer.",
  ],
  [
    "GRAVITY",
    "F = G·m₁·m₂/(r²+ε). Only active (observed) particles curve spacetime. Dormant particles are in superposition — no classical gravitational field.",
  ],
  [
    "DARK MATTER",
    "25% of the universe. Interacts only via gravity. Invisible to electromagnetism, strong, and weak forces. Forms the unseen scaffolding of galaxies.",
  ],
  [
    "DARK ENERGY",
    "Cosmological constant (Λ) driving local expansion when density drops below a critical threshold. Pushes particles apart in voids.",
  ],
  [
    "ELECTROMAGNETISM",
    "F = K·q·q/(r²+ε). Charged particles (38%) attract opposites, repel same at range=90. Faster than gravity.",
  ],
  [
    "SPIN-ORBIT COUPLING",
    "Magnetic-like force: spin × charge creates an additional force. Same spin + same charge = extra repulsion. Opposite spin + opposite charge = extra attraction (bonding).",
  ],
  [
    "STRONG NUCLEAR FORCE",
    "At r < 4.5, very strong attractive force overwhelms EM repulsion. Creates bound states analogous to atoms. Hard core prevents r < 1.5. Bound particles have reduced orbital drag.",
  ],
  [
    "WEAK FORCE (BETA DECAY)",
    "Rare charge flip per tick (0.012%/tick). Spin also flips. W boson emitted as heat. Particles can change their electromagnetic identity over time.",
  ],
  [
    "QUANTUM ENTANGLEMENT",
    "Spooky action at a distance. Interacting particles can become entangled. If one undergoes beta decay and flips its spin, its partner instantly flips its spin regardless of distance.",
  ],
  [
    "FISSION",
    "Spontaneous splitting when weight > 18. Probability scales with excess weight. Daughter has opposite momentum (conserved) and opposite charge. Energy released as heat. Latent traces split.",
  ],
  [
    "PAIR PRODUCTION",
    "In hot regions (T > 2.5), thermal energy creates particle + antiparticle pairs. Energy E is conserved: T -= cost. Pairs have opposite momenta.",
  ],
  [
    "ANNIHILATION",
    "When opposite-charged collapsed particles meet within r < 2.2: E = m·c². Both destroyed. 2 photon-like particles emitted at C in opposite directions. Huge heat burst.",
  ],
  [
    "DEGENERACY PRESSURE",
    "At 4.5 < r < 8: Pauli exclusion repulsion. Prevents classical collapse to a point.",
  ],
  [
    "WAVE FUNCTION / DE BROGLIE",
    "waveRadius = ħ/p. Fast/heavy particles are localized (particle-like). Slow/light are spread (wave-like). Observation (interaction) collapses the wave function.",
  ],
  [
    "THERMODYNAMICS",
    "Per-region temperature field. Larmor radiation: acceleration → heat. Collapse emits heat. Fusion emits heat. Heat diffuses between adjacent regions and decays.",
  ],
  [
    "HAWKING RADIATION",
    "Level > 2 collapsed entities emit energy into local region. Information stored in latent traces.",
  ],
  [
    "MOMENTUM CONSERVATION",
    "Fusion: v = (p₁m₁+p₂m₂)/(m₁+m₂). Fission: daughter has opposite momentum recoil. Singularity compression conserves total momentum. Annihilation: photons emitted in opposite directions.",
  ],
  [
    "SPEED OF LIGHT C=40",
    "No particle exceeds C per tick. Photon-like particles (fast, uncharged, massless) travel at ≈C.",
  ],
  [
    "TIME DILATION",
    "tf = 1/(1+κ·α). All forces and motion scale by tf. Dense regions evolve slower.",
  ],
  [
    "QUANTUM COHERENCE",
    "Particles have phase and amplitude. Interaction causes interference (constructive/destructive) based on phase alignment. Coherence measures the global phase order.",
  ],
  [
    "NON-LOCALITY",
    "Entanglement creates instantaneous correlations. Measuring one particle affects its partner across any distance, violating classical locality.",
  ],
  [
    "CONTEXTUALITY",
    "Measurement outcomes are not pre-determined but depend on the experimental context (Kochen-Specker). The universe is not a collection of independent facts.",
  ],
  [
    "EPISTEMOLOGY",
    "Mathematics (Wave Functions, Matrices) are human tools to model reality, not the reality itself. The simulation uses lazy evaluation as a primary ontological substrate.",
  ],
  [
    "INFORMATION CONSERVATION",
    "Dissolution: weight redistributed. Fusion: latent traces inherited. Fission: traces split. Latent traces re-emerge when host weight allows.",
  ],
  [
    "BIG BANG",
    "1800 particles. 24 proto-galaxy clusters with proto-galactic spin. Void particles dormant from birth. ±60,000 unit radius.",
  ],
];
