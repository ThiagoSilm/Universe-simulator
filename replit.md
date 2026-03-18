# React Example - Physics-based Universe Simulation

## Project Overview
A Physics-based Universe Simulation built with React + Vite + TypeScript. Features a complex particle simulation engine with gravity, relativistic effects, time dilation, entropy, and emergent "consciousness" properties. Integrates with Google Gemini AI.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion)
- **Build System**: Vite 6
- **AI Integration**: Google Generative AI SDK (`@google/genai`)
- **Icons**: Lucide React
- **Package Manager**: npm

## Project Layout
```
.
├── index.html           # Entry HTML
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite build/dev configuration
└── src/
    ├── main.tsx         # React entry point
    ├── App.tsx          # Main UI component
    ├── UniverseEngine.ts# Core simulation logic
    ├── types.ts         # TypeScript types/interfaces
    └── index.css        # Global styles (Tailwind)
```

## Running the App
- Dev server: `npm run dev` (runs on port 5000, host 0.0.0.0)
- Build: `npm run build`
- Workflow: "Start application" → `npm run dev` on port 5000

## Environment Variables
- `GEMINI_API_KEY`: Required for Gemini AI API calls (set in Secrets panel)
- `APP_URL`: The hosted URL of the app

## Deployment
- Target: Static site
- Build command: `npm run build`
- Public directory: `dist`
