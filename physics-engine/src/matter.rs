/// Matter & Stress-Energy Field Subsystem
/// Decouples the physical objects (disks, jets) from the geometric spacetime.

pub trait MatterField {
    /// Returns the local Stress-Energy density at coordinate (r, theta, phi)
    fn energy_density(&self, r: f64, theta: f64, phi: f64) -> f64;
    
    /// Returns the 4-velocity u^mu of the matter fluid
    fn velocity_field(&self, r: f64, theta: f64, phi: f64) -> [f64; 4];
    
    /// Returns the local Temperature (K)
    fn temperature(&self, r: f64, theta: f64, phi: f64) -> f64;
}

/// Novikov-Thorne Accretion Disk Model
/// A relativistic thin-disk implementation.
pub struct AccretionDisk {
    pub inner_radius: f64,
    pub outer_radius: f64,
}

impl MatterField for AccretionDisk {
    fn energy_density(&self, r: f64, _theta: f64, _phi: f64) -> f64 {
        if r < self.inner_radius || r > self.outer_radius { 0.0 } 
        else { 1.0 / (r.powf(1.5)) } // Power law decay
    }

    fn velocity_field(&self, r: f64, _theta: f64, _phi: f64) -> [f64; 4] {
        // Keplerian 4-velocity in Kerr spacetime
        // Placeholder components
        [1.0, 0.0, 0.0, 1.0 / (r.powf(1.5))]
    }

    fn temperature(&self, r: f64, _theta: f64, _phi: f64) -> f64 {
        // T(r) \propto r^{-3/4}
        5000.0 * (r / self.inner_radius).powf(-0.75)
    }
}

/// Relativistic Jet (Blandford-Znajek Effect)
pub struct RelativisticJet {
    pub opening_angle: f64, // radians
}

impl MatterField for RelativisticJet {
    fn energy_density(&self, _r: f64, theta: f64, _phi: f64) -> f64 {
        // Concentrate matter at the poles
        let margin = 0.1;
        if theta < margin || theta > std::f64::consts::PI - margin { 1.0 } else { 0.0 }
    }

    fn velocity_field(&self, _r: f64, _theta: f64, _phi: f64) -> [f64; 4] {
        [1.0, 0.99, 0.0, 0.0] // Near-luminal radial velocity (Gamma >> 1)
    }

    fn temperature(&self, _r: f64, _theta: f64, _phi: f64) -> f64 {
        1e9 // Billion-degree plasma
    }
}
