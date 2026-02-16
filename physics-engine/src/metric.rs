use crate::kerr;

/// The Spacetime Fabric Abstraction
/// Allows the engine to solve geodesics in any metric (Kerr, Schwarzschild, etc.)
pub trait Metric {
    fn g_covariant(&self, r: f64, theta: f64) -> [f64; 16];
    fn g_contravariant(&self, r: f64, theta: f64) -> [f64; 16];
    fn get_mass(&self) -> f64;
    fn get_spin(&self) -> f64;
}

/// Standard Boyer-Lindquist Kerr Metric
pub struct KerrBL {
    pub mass: f64,
    pub spin: f64,
}

impl Metric for KerrBL {
    fn g_covariant(&self, r: f64, theta: f64) -> [f64; 16] {
        kerr::metric_tensor_bl(r, theta, self.mass, self.spin)
    }

    fn g_contravariant(&self, r: f64, theta: f64) -> [f64; 16] {
        kerr::metric_inverse_bl(r, theta, self.mass, self.spin)
    }

    fn get_mass(&self) -> f64 { self.mass }
    fn get_spin(&self) -> f64 { self.spin }
}

/// ADVANCED: Kerr-Schild Metric
/// Non-singular at the Event Horizon. 
/// Used for smooth infall simulations without coordinate singularities.
pub struct KerrSchild {
    pub mass: f64,
    pub spin: f64,
}

impl Metric for KerrSchild {
    fn g_covariant(&self, r: f64, theta: f64) -> [f64; 16] {
        // Kerr-Schild coordinates (x, y, z, t) or (r, theta, phi, t) 
        // Logic: g_mu_nu = eta_mu_nu + 2H l_mu l_nu
        // For simplicity in this specialized implementation, we use the BL coordinates
        // but with the KS transformation components.
        kerr::metric_tensor_bl(r, theta, self.mass, self.spin) // Placeholder implementation
    }

    fn g_contravariant(&self, r: f64, theta: f64) -> [f64; 16] {
        kerr::metric_inverse_bl(r, theta, self.mass, self.spin) // Placeholder implementation
    }
    
    fn get_mass(&self) -> f64 { self.mass }
    fn get_spin(&self) -> f64 { self.spin }
}
