/// Physical Constants for Black Hole Simulation
///
/// Use standard MKS units unless otherwise specified (Dimensionless is common in GR).
// Speed of light in m/s (exact)
pub const C: f64 = 299_792_458.0;

// Gravitational constant in m^3 kg^-1 s^-2
pub const G: f64 = 6.67430e-11;

// Solar Mass in kg (approximate)
pub const SOLAR_MASS: f64 = 1.989e30;

// Stefan-Boltzmann constant in W m^-2 K^-4
pub const SIGMA_SB: f64 = 5.670374419e-8;

// Planck Constant in J s
pub const H_BAR: f64 = 1.0545718e-34;

// Schwarzschild radius for 1 Solar Mass (normalized units used in simulation usually)
// But for consistency:
pub const RS_SOLAR: f64 = 2.0 * G * SOLAR_MASS / (C * C);
