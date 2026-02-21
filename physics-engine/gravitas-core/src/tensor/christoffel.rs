//! Christoffel symbol computation from metric derivatives.
//!
//! The Christoffel symbols (connection coefficients) are computed numerically
//! from the metric tensor via finite differences when analytic derivatives
//! are not available.

use crate::metric::Metric;

/// Compute Christoffel symbols Gamma^alpha_{mu nu} at a point (r, theta)
/// using numerical differentiation of the metric.
///
/// Returns a [4][4][4] array indexed as [alpha][mu][nu].
///
/// This is the "brute force" approach. Individual metric implementations
/// may provide faster analytic Hamiltonian derivatives instead --
/// see [`Metric::hamiltonian_derivatives`].
pub fn christoffel_from_metric_derivs<M: Metric>(
    metric: &M,
    r: f64,
    theta: f64,
    eps: f64,
) -> [[[f64; 4]; 4]; 4] {
    // We only have r and theta as free coordinates (t and phi are cyclic in Kerr).
    // For the full computation we'd need derivatives w.r.t. all 4 coordinates,
    // but dg/dt = 0 and dg/dphi = 0 by stationarity and axisymmetry.

    let _g = metric.covariant(r, theta);
    let g_inv = metric.contravariant(r, theta);

    // Numerical derivatives of the covariant metric
    let dg_dr = metric_derivative_r(metric, r, theta, eps);
    let dg_dtheta = metric_derivative_theta(metric, r, theta, eps);

    // dg/dt = 0, dg/dphi = 0
    let zero = [0.0f64; 16];

    // dg_sigma[coordinate_index] = dg_{mu nu} / dx^sigma
    let dg = [&zero, &dg_dr, &dg_dtheta, &zero]; // t, r, theta, phi

    let mut gamma = [[[0.0f64; 4]; 4]; 4];

    for alpha in 0..4 {
        for mu in 0..4 {
            for nu in 0..4 {
                // Gamma^alpha_{mu nu} = 1/2 g^{alpha sigma} (dg_{sigma mu}/dx^nu + dg_{sigma nu}/dx^mu - dg_{mu nu}/dx^sigma)
                let mut sum = 0.0;
                for sigma in 0..4 {
                    let term = dg[nu][sigma * 4 + mu]
                        + dg[mu][sigma * 4 + nu]
                        - dg[sigma][mu * 4 + nu];
                    sum += g_inv.components[alpha * 4 + sigma] * term;
                }
                gamma[alpha][mu][nu] = 0.5 * sum;
            }
        }
    }

    gamma
}

fn metric_derivative_r<M: Metric>(metric: &M, r: f64, theta: f64, eps: f64) -> [f64; 16] {
    let g_plus = metric.covariant(r + eps, theta);
    let g_minus = metric.covariant(r - eps, theta);
    let mut dg = [0.0; 16];
    for i in 0..16 {
        dg[i] = (g_plus.components[i] - g_minus.components[i]) / (2.0 * eps);
    }
    dg
}

fn metric_derivative_theta<M: Metric>(metric: &M, r: f64, theta: f64, eps: f64) -> [f64; 16] {
    let g_plus = metric.covariant(r, theta + eps);
    let g_minus = metric.covariant(r, theta - eps);
    let mut dg = [0.0; 16];
    for i in 0..16 {
        dg[i] = (g_plus.components[i] - g_minus.components[i]) / (2.0 * eps);
    }
    dg
}
