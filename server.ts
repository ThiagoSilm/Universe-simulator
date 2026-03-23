import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { tick } from "./src/UniverseCore";
import { SimulationState, Particle } from "./src/types";

const PORT = 3000;
const STATE_FILE = path.join(process.cwd(), "universe-state.json");

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Initial State
  let state: SimulationState = {
    particles: [],
    tick: 0,
    bounds: { width: 1000, height: 1000 },
    metrics: {
      activeParticles: 0,
      totalInformation: 0,
      emergentComplexity: 0,
      processingTime: 0
    }
  };

  // Load persistence if exists
  if (fs.existsSync(STATE_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      state = saved;
      console.log("Substrato carregado da persistência local.");
    } catch (e) {
      console.error("Erro ao carregar estado salvo:", e);
    }
  } else {
    // Initial seeds if no state
    const initialParticles: Particle[] = [
      {
        id: "alpha",
        type: "matter",
        role: "leader",
        charge: 1,
        frequency: 0.5,
        phase: 0,
        x: 400,
        y: 500,
        vx: 0,
        vy: 0,
        persistence: 1,
        information: 100,
        entropy: 0,
        composition: { C: 1, H: 4 },
        isLatent: false,
        isCollapsed: false
      },
      {
        id: "beta",
        type: "matter",
        role: "leader",
        charge: -1,
        frequency: 0.5,
        phase: Math.PI,
        x: 600,
        y: 500,
        vx: 0,
        vy: 0,
        persistence: 1,
        information: 100,
        entropy: 0,
        composition: { C: 1, H: 4 },
        isLatent: false,
        isCollapsed: false
      }
    ];
    state.particles = initialParticles;
  }

  // Simulation Loop (Independente da aba)
  setInterval(() => {
    const start = Date.now();
    state = tick(state);
    state.metrics.processingTime = Date.now() - start;
    
    // Broadcast state to all connected observers
    io.emit("universe-update", state);

    // Save every 1000 ticks for persistence
    if (state.tick % 1000 === 0) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    }
  }, 33); // ~30 FPS simulation

  io.on("connection", (socket) => {
    console.log("Novo observador conectado ao substrato.");
    
    // Emit immediate state upon connection
    socket.emit("universe-update", state);
    
    socket.on("stimulus", (payload) => {
      // Apply stimulus to the server-side state
      state.particles.forEach(p => {
        const dx = payload.x - p.x;
        const dy = payload.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < payload.radius) {
          p.vx += (dx / dist) * 5;
          p.vy += (dy / dist) * 5;
          p.persistence = Math.min(1, p.persistence + 0.1);
        }
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Substrato Auto-Observador rodando em http://localhost:${PORT}`);
  });
}

startServer();
