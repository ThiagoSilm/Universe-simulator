import { SimulationState } from "./types";

export interface ObserverMetrics {
  culture: number;
  technology: number;
  efficiency: number;
  entropy: number;
}

export function calculateObserverMetrics(state: SimulationState): ObserverMetrics {
  const { particles, metrics } = state;
  const active = particles.filter(p => !p.isLatent);
  const collapsed = particles.filter(p => p.isCollapsed);

  // Culture: Emergent complexity per active particle
  const culture = metrics.emergentComplexity * 10;

  // Technology: Ratio of information to total particles
  const technology = metrics.totalInformation / particles.length;

  // Efficiency: Ratio of active to latent particles
  const efficiency = active.length / particles.length;

  // Entropy: Ratio of collapsed to total particles
  const entropy = collapsed.length / particles.length;

  return { culture, technology, efficiency, entropy };
}
