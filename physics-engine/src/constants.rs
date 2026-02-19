/// Standardized Geometric Units (G = c = 1)
/// In this system, Length and Time have the same units, 
/// and Mass is measured in units of distance (L = GM/c^2).
pub const C: f64 = 1.0;
pub const G: f64 = 1.0;

// All other physical constants are kept in SI for non-GR modules 
// (e.g., spectral rendering for temperature-to-wavelength conversion).

/// SI: Solar Mass in kg
pub const SI_SOLAR_MASS: f64 = 1.98847e30;

/// SI: Speed of light in m/s
pub const SI_C: f64 = 299792458.0;

/// SI: Gravitational constant in m^3 kg^-1 s^-2
pub const SI_G: f64 = 6.67430e-11;

/// SI: Stefan-Boltzmann constant (W m^-2 K^-4)
pub const SI_SIGMA_SB: f64 = 5.670374e-8;

/// SI: Boltzmann Constant (J/K)
pub const SI_KB: f64 = 1.380649e-23;

/// Conversion: SI Mass (kg) -> Geometric Mass (m)
/// m_geom = m_si * G / c^2
pub const SI_TO_GEOM_MASS: f64 = SI_G / (SI_C * SI_C);

/// Schwarzschild radius for 1 Solar Mass (in meters)
/// Rs = 2 * M_solar_geom
pub const RS_SOLAR_METERS: f64 = 2.0 * (SI_SOLAR_MASS * SI_TO_GEOM_MASS);
