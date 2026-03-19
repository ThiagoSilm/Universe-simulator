export const INITIAL_PARTICLE_COUNT = 1800;
export const CLUSTER_COUNT          = 24;
export const CLUSTER_RADIUS         = 350;
export const UNIVERSE_RADIUS        = 60000;

export const GRID_SIZE              = 60;

// Forces
export const C                      = 40;       // speed of light
export const G                      = 1.2;      // gravitational constant
export const K_EM                   = 4.0;      // electromagnetic constant
export const REPULSION_STRENGTH     = 10.0;     // degeneracy / Pauli pressure
export const STRONG_K               = 90;       // nuclear binding force
export const STRONG_RADIUS          = 4.5;      // range of strong nuclear force
export const SPIN_ORBIT_K           = 0.8;      // spin-orbit coupling (magnetic-like)
export const DARK_ENERGY_LAMBDA     = 0.015;    // cosmological constant (expansion)
export const DARK_MATTER_FRACTION   = 0.25;     // 25% of universe is dark matter

// Ranges
export const GRAVITY_RADIUS         = 180;
export const EM_RADIUS              = 90;
export const INTERACTION_RADIUS     = 22;
export const REPULSION_RADIUS       = 8;
export const WAKE_RADIUS            = 60;

// Relativistic
export const TIME_DILATION_STR      = 0.8;

// Quantum
export const HBAR_INV               = 0.06;     // de Broglie: waveRadius = WAVE_INITIAL/(1+p*HBAR_INV)
export const WAVE_INITIAL           = 20;

// Thermodynamics
export const TEMP_DECAY             = 0.97;
export const TEMP_DIFFUSE           = 0.08;
export const TEMP_FROM_KE           = 0.000006;
export const LARMOR_COEFF           = 0.0003;

// Complexity / information
export const BEKENSTEIN_LIMIT       = 30;
export const PRESSURE_STRENGTH      = 0.5;
export const HAWKING_RATE           = 0.0003;
export const DORMANCY_THRESHOLD     = 300;
export const COMPRESSION_THRESHOLD  = 1200;
export const MAX_LATENT_TRACES      = 24;
export const MIN_POPULATION         = 50;
export const ENERGY_REGEN_RATE      = 0.01;

// Chemistry
export const EM_FORCE_K = 4.0;
export const BINDING_TEMP_THRESHOLD = 0.5;
export const MOLECULE_BINDING_ENERGY = 0.2;

// Organic Chemistry
export const CARBON_AFFINITY = 0.8;
export const HYDROGEN_AFFINITY = 0.5;
export const OXYGEN_AFFINITY = 0.7;
export const NITROGEN_AFFINITY = 0.6;

// Replication
export const REPLICATION_PROB = 0.001;
export const REPLICATION_ENERGY_COST = 0.5;
export const MUTATION_PROB = 0.05;

// Metabolism
export const METABOLISM_ENERGY_COST = 0.01;
export const ENERGY_GRADIENT_SENSE = 0.1;

// Particle events
export const FISSION_WEIGHT         = 18;       // minimum weight for spontaneous fission
export const FISSION_PROB_BASE      = 0.0005;   // base fission probability per tick
export const FISSION_HEAT           = 0.8;      // heat released on fission
export const BETA_DECAY_PROB        = 0.00012;  // charge-flip probability per tick (weak force)
export const PAIR_TEMP_THRESHOLD    = 2.5;      // min temperature for pair production
export const PAIR_ENERGY_COST       = 1.2;      // thermal energy consumed per pair
export const PAIR_PROB_PER_REGION   = 0.006;    // probability per hot cell per tick
export const ANNIHILATION_RANGE     = 2.2;      // matter + antimatter collision distance
export const ANNIHILATION_HEAT      = 22;       // energy released on annihilation

export const CHARGE_FRACTION        = 0.38;
