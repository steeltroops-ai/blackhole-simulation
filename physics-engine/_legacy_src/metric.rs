use crate::derivatives::HamiltonianDerivatives;
#[allow(unused_imports)]
use crate::geodesic::RayStateRelativistic;
use crate::kerr;

/// The Spacetime Fabric Abstraction
/// Allows the engine to solve geodesics in any metric (Kerr, Schwarzschild, etc.)
pub trait Metric {
    fn g_covariant(&self, r: f64, theta: f64) -> [f64; 16];
    fn g_contravariant(&self, r: f64, theta: f64) -> [f64; 16];
    fn calculate_hamiltonian_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives;
    fn get_mass(&self) -> f64;
    fn get_spin(&self) -> f64;

    /// Radius of the Event Horizon: r+ = M + sqrt(M^2 - a^2)
    fn get_horizon_radius(&self) -> f64 {
        let m = self.get_mass();
        let a = self.get_spin() * m;
        let disc = m * m - a * a;
        if disc < 0.0 {
            m
        } else {
            m + disc.sqrt()
        }
    }
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

    fn calculate_hamiltonian_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives {
        crate::derivatives::calculate_derivatives(r, theta, p, self.mass, self.spin)
    }

    fn get_mass(&self) -> f64 {
        self.mass
    }
    fn get_spin(&self) -> f64 {
        self.spin
    }
}

/// ADVANCED: Kerr-Schild Metric
/// Non-singular at the Event Horizon.
/// Used for smooth infall simulations without coordinate singularities.
/// Line element: ds^2 = eta_mu_nu dx^mu dx^nu + 2H (l_mu dx^mu)^2
pub struct KerrSchild {
    pub mass: f64,
    pub spin: f64,
}

impl Metric for KerrSchild {
    fn g_covariant(&self, r: f64, theta: f64) -> [f64; 16] {
        let a = self.spin * self.mass;
        let r2 = r * r;
        let a2 = a * a;
        let cos2 = theta.cos() * theta.cos();
        let sin2 = 1.0 - cos2;
        let sigma = r2 + a2 * cos2;

        // H = Mr / Sigma
        let h = (self.mass * r) / sigma;

        // l_mu in (t, r, theta, phi)
        // Correct normalization for quasi-spherical KS:
        // l_mu = (1, Sigma/(r^2+a^2), 0, -a sin^2 theta)
        let l_r = sigma / (r2 + a2);
        let l = [1.0, l_r, 0.0, -a * sin2];

        // eta_mu_nu in (t, r, theta, phi)
        // ds_eta^2 = -dt^2 + (Sigma / (r^2+a^2)) dr^2 + Sigma dtheta^2 + (r^2+a^2) sin^2 dphi^2
        let eta_tt = -1.0;
        let eta_rr = sigma / (r2 + a2);
        let eta_thth = sigma;
        let eta_phph = (r2 + a2) * sin2;

        let mut g = [0.0; 16];
        g[0] = eta_tt + 2.0 * h * l[0] * l[0]; // tt
        g[1] = 2.0 * h * l[0] * l[1]; // tr
        g[3] = 2.0 * h * l[0] * l[3]; // tphi

        g[4] = 2.0 * h * l[1] * l[0]; // rt
        g[5] = eta_rr + 2.0 * h * l[1] * l[1]; // rr
        g[7] = 2.0 * h * l[1] * l[3]; // rphi

        g[10] = eta_thth; // thth

        g[12] = 2.0 * h * l[3] * l[0]; // phit
        g[13] = 2.0 * h * l[3] * l[1]; // phir
        g[15] = eta_phph + 2.0 * h * l[3] * l[3]; // phiph

        g
    }

    fn g_contravariant(&self, r: f64, theta: f64) -> [f64; 16] {
        let a = self.spin * self.mass;
        let r2 = r * r;
        let a2 = a * a;
        let sin_theta = theta.sin();
        let sin2 = (sin_theta * sin_theta).max(1e-12);
        let cos2 = 1.0 - sin2;
        let sigma = r2 + a2 * cos2;
        let delta = r2 - 2.0 * self.mass * r + a2;

        // Exact Ingoing-like Kerr-Schild Inverse Metric (Stable Form)
        let g_tt = -(1.0 + 2.0 * self.mass * r / sigma);
        let g_tr = 2.0 * self.mass * r / sigma;
        let g_rr = delta / sigma;
        let g_thth = 1.0 / sigma;
        let g_phph = 1.0 / (sigma * sin2);
        let g_rph = a / sigma;
        let g_tph = 0.0; // Cross-term vanishes in this coordinate selection

        let mut g = [0.0; 16];
        g[0] = g_tt;
        g[1] = g_tr;
        g[3] = g_tph;
        g[4] = g_tr;
        g[5] = g_rr;
        g[7] = g_rph;
        g[10] = g_thth;
        g[12] = g_tph;
        g[13] = g_rph;
        g[15] = g_phph;

        g
    }

    fn calculate_hamiltonian_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives {
        let a = self.spin * self.mass;
        let r2 = r * r;
        let a2 = a * a;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();
        let sin2 = (sin_theta * sin_theta).max(1e-12);
        let cos2 = 1.0 - sin2;
        let sigma = r2 + a2 * cos2;
        let sigma2 = sigma * sigma;
        let delta = r2 - 2.0 * self.mass * r + a2;

        let dsigma_dr = 2.0 * r;
        let dsigma_dtheta = -2.0 * a2 * sin_theta * cos_theta;
        let ddelta_dr = 2.0 * r - 2.0 * self.mass;

        // d(g^tt)/dr and d(g^tt)/dtheta
        let dg_tt_dr = -(2.0 * self.mass * (sigma - r * dsigma_dr)) / sigma2;
        let dg_tt_dtheta = (2.0 * self.mass * r * dsigma_dtheta) / sigma2;

        let dg_tr_dr = -dg_tt_dr;
        let dg_tr_dtheta = -dg_tt_dtheta;

        let dg_rr_dr = (ddelta_dr * sigma - delta * dsigma_dr) / sigma2;
        let dg_rr_dtheta = -(delta * dsigma_dtheta) / sigma2;

        let dg_thth_dr = -dsigma_dr / sigma2;
        let dg_thth_dtheta = -dsigma_dtheta / sigma2;

        let dg_phph_dr = -dsigma_dr / (sigma2 * sin2);
        let dg_phph_dtheta =
            -(dsigma_dtheta * sin2 + sigma * 2.0 * sin_theta * cos_theta) / (sigma2 * sin2 * sin2);

        let dg_rph_dr = -(a * dsigma_dr) / sigma2;
        let dg_rph_dtheta = -(a * dsigma_dtheta) / sigma2;

        let mut dh_dr = 0.5
            * (dg_tt_dr * p[0] * p[0]
                + dg_rr_dr * p[1] * p[1]
                + dg_thth_dr * p[2] * p[2]
                + dg_phph_dr * p[3] * p[3]
                + 2.0 * dg_tr_dr * p[0] * p[1]
                + 2.0 * dg_rph_dr * p[1] * p[3]);

        let mut dh_dtheta = 0.5
            * (dg_tt_dtheta * p[0] * p[0]
                + dg_rr_dtheta * p[1] * p[1]
                + dg_thth_dtheta * p[2] * p[2]
                + dg_phph_dtheta * p[3] * p[3]
                + 2.0 * dg_tr_dtheta * p[0] * p[1]
                + 2.0 * dg_rph_dtheta * p[1] * p[3]);

        if sin_theta.abs() < 1e-10 {
            dh_dtheta = 0.0;
        }

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }

    fn get_mass(&self) -> f64 {
        self.mass
    }
    fn get_spin(&self) -> f64 {
        self.spin
    }
}
