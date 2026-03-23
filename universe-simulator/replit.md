# Lazy Universe Observer

## Project Overview
A physics-based "Lazy Universe Observer" simulation built with React 19 + Vite 6 + TypeScript.

**Core philosophy:**
- **Each particle is its own observer** — no global state, no centralized control, no global barycenter
- **Lazy evaluation as physics foundation** — not an optimization, but the fundamental law: the universe never processes what it doesn't need to
- **One tick per frame** — fixed rate, no pause/speed controls
- **Full-field canvas** — always shows entire universe auto-scaled to bounds, no zoom controls

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion)
- **Build System**: Vite 6
- **Icons**: Lucide React
- **Package Manager**: npm

## Project Layout
```
src/
├── main.tsx           # React entry point
├── App.tsx            # Main UI + 5-layer canvas rendering
├── UniverseEngine.ts  # Core simulation engine (all physics laws)
├── types.ts           # TypeScript types
└── index.css          # Global styles (Tailwind)
```

## Architecture: Lazy Evaluation

### Grid System
- **spatialGrid** — active particles only. Curvature is only contributed by observed (active) particles.
- **dormantGrid** — latent particles in quantum superposition. No gravitational field, no physics loops.
- Wake-up: O(active_cells × wakeRange²) — NOT O(all_particles). Active borders check dormant neighbours.

### Dormant path: O(1) per tick
Only geodesic drift from curvature gradient + wave radius growth. No nested loops.

### Active path: full physics
Gravity, EM, repulsion, fusion, thermodynamics, wave function, dormancy check.

## Physics Laws

| Law | Details |
|-----|---------|
| LOCAL OBSERVER | No particle has global knowledge. Expansion is a local density observation, not a global barycenter force. |
| GRAVITY | F = G·m₁·m₂/(r²+ε). Only active particles curve spacetime. |
| ELECTROMAGNETISM | F = K·q₁·q₂/(r²+ε). 38% of particles carry charge ±1. Range=90, faster than gravity. |
| SHORT-RANGE REPULSION | Degeneracy pressure below r<8. Pauli exclusion analogue. |
| MOMENTUM CONSERVATION | All fusion: v_result = (p₁m₁+p₂m₂)/(m₁+m₂). Singularity compression too. |
| SPEED OF LIGHT C=40 | No particle exceeds C/tick. Local light cone only. |
| TIME DILATION | tf = 1/(1+κ·α). High-curvature regions evolve slower. |
| LOCAL EXPANSION | Sparse regions feel outward pressure proportional to density gradient. No global reference. |
| WAVE FUNCTION | Uncollapsed particles have waveRadius. Grows in isolation, shrinks on observation (interaction). |
| THERMODYNAMICS | Temperature per region. Larmor radiation (acceleration→heat), heat diffusion, Hawking from high-level entities. |
| INFORMATION CONSERVATION | Dissolved entities redistribute weight. Latent traces re-emerge when host has excess weight. |
| BIG BANG | 1800 particles. 24 proto-galaxy clusters with spin. Void particles dormant from birth. ±60,000 unit radius. |

## Constants
```
C=40, G=1.2, K_EM=4.0, REPULSION_STRENGTH=14, LAMBDA_LOCAL=0.012
GRID_SIZE=60, WAKE_RADIUS=60, GRAVITY_RADIUS=180, EM_RADIUS=90
BEKENSTEIN_LIMIT=30, DORMANCY_THRESHOLD=300, MIN_POPULATION=50
CHARGE_FRACTION=0.38, CLUSTER_COUNT=24, UNIVERSE_RADIUS=60000
```

## Storage Key
`lazy_universe_state_v5` — bump if breaking changes to state shape

## Running
- Dev server: `npm run dev` → port 5000
- Build: `npm run build` (output: `dist/`)
- Workflow: "Start application"

## Deployment
- Type: Static site
- Build command: `npm run build`
- Public directory: `dist`
