//! Physical constants in both SI and Geometric (G = c = 1) unit systems.

// ============================================================================
// Geometric Units (G = c = 1)
// In this system, mass has units of length: L = GM/c^2
// ============================================================================

/// Speed of light in geometric units.
pub const C: f64 = 1.0;

/// Gravitational constant in geometric units.
pub const G: f64 = 1.0;

// ============================================================================
// SI Units (for spectral rendering, temperature, wavelength conversions)
// ============================================================================

/// Solar mass in kilograms.
pub const SI_SOLAR_MASS: f64 = 1.98847e30;

/// Speed of light in m/s.
pub const SI_C: f64 = 299_792_458.0;

/// Gravitational constant in m^3 kg^-1 s^-2.
pub const SI_G: f64 = 6.67430e-11;

/// Stefan-Boltzmann constant in W m^-2 K^-4.
pub const SI_SIGMA_SB: f64 = 5.670374e-8;

/// Boltzmann constant in J/K.
pub const SI_KB: f64 = 1.380649e-23;

/// Planck constant in J*s.
pub const SI_H: f64 = 6.626_070_15e-34;

/// Reduced Planck constant (hbar) in J*s.
pub const SI_HBAR: f64 = SI_H / (2.0 * std::f64::consts::PI);

/// Conversion factor: SI mass (kg) -> geometric mass (m).
/// m_geom = m_si * G / c^2
pub const SI_TO_GEOM_MASS: f64 = SI_G / (SI_C * SI_C);

/// Schwarzschild radius of 1 solar mass in meters.
/// Rs = 2 * M_solar_geom = 2 * M_solar * G / c^2
pub const RS_SOLAR_METERS: f64 = 2.0 * (SI_SOLAR_MASS * SI_TO_GEOM_MASS);

/// Planck length in meters.
pub const PLANCK_LENGTH: f64 = 1.616_255e-35;
