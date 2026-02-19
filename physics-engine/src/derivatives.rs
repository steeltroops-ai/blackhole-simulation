/// Hamiltonian Derivatives for Kerr Metric
///
/// Computes the exact analytic derivatives of the Hamiltonian with respect to coordinates.
/// Used for the symplectic integrator to ensure energy conservation and precision near ISCO.
///
/// H = 1/2 * g^mu_nu * p_mu * p_nu
/// dH/dx^alpha = 1/2 * p_mu * p_nu * (dg^mu_nu / dx^alpha)
///
/// Since metric is stationary and axisymmetric:
/// dH/dt = 0
/// dH/dphi = 0
///
/// We only compute dH/dr and dH/dtheta.

pub struct HamiltonianDerivatives {
    pub dh_dr: f64,
    pub dh_dtheta: f64,
}

pub fn calculate_derivatives(
    r: f64,
    theta: f64,
    p: [f64; 4],
    mass: f64,
    spin: f64,
) -> HamiltonianDerivatives {
    let a = spin * mass;
    let r2 = r * r;
    let a2 = a * a;
    let cos_theta = theta.cos();
    let sin_theta = theta.sin();
    let sin2 = sin_theta * sin_theta;
    let cos2 = cos_theta * cos_theta;

    // Auxiliary functions
    let sigma = r2 + a2 * cos2;
    let delta = r2 - 2.0 * mass * r + a2;
    let _delta_sq = delta * delta;
    let sigma_sq = sigma * sigma;

    // Derivatives of Sigma and Delta
    let dsigma_dr = 2.0 * r;
    let dsigma_dtheta = -2.0 * a2 * cos_theta * sin_theta; // -a^2 sin(2theta)

    let ddelta_dr = 2.0 * r - 2.0 * mass;
    // ddelta_dtheta = 0

    // Components of inverse metric g^mu_nu
    // We need partial derivatives of these components w.r.t r and theta

    // ------------------------------------------------------------------
    // 1. g^rr = Delta / Sigma
    // ------------------------------------------------------------------
    // d(g^rr)/dr = (dDelta/dr * Sigma - Delta * dSigma/dr) / Sigma^2
    let dg_rr_dr = (ddelta_dr * sigma - delta * dsigma_dr) / sigma_sq;

    // d(g^rr)/dtheta = (0 * Sigma - Delta * dSigma/dtheta) / Sigma^2
    let dg_rr_dtheta = -(delta * dsigma_dtheta) / sigma_sq;

    // ------------------------------------------------------------------
    // 2. g^thth = 1 / Sigma
    // ------------------------------------------------------------------
    // d(g^thth)/dr = -dSigma/dr / Sigma^2
    let dg_thth_dr = -dsigma_dr / sigma_sq;

    // d(g^thth)/dtheta = -dSigma/dtheta / Sigma^2
    let dg_thth_dtheta = -dsigma_dtheta / sigma_sq;

    // ------------------------------------------------------------------
    // 3. g^tphi = -2Mra / (Delta * Sigma)
    // ------------------------------------------------------------------
    let num_tphi = -2.0 * mass * r * a;
    let den_tphi = delta * sigma;

    // d(num)/dr = -2Ma
    // d(den)/dr = dDelta/dr * Sigma + Delta * dSigma/dr
    let dnum_tphi_dr = -2.0 * mass * a;
    let dden_tphi_dr = ddelta_dr * sigma + delta * dsigma_dr;

    let dg_tphi_dr = (dnum_tphi_dr * den_tphi - num_tphi * dden_tphi_dr) / (den_tphi * den_tphi);

    // d(num)/dtheta = 0
    // d(den)/dtheta = Delta * dSigma/dtheta
    let dden_tphi_dtheta = delta * dsigma_dtheta;
    let dg_tphi_dtheta = -(num_tphi * dden_tphi_dtheta) / (den_tphi * den_tphi);

    // ------------------------------------------------------------------
    // 4. g^tt = - [ (r^2+a^2)^2 / (Delta*Sigma) - a^2 sin^2 theta / Sigma ]
    // or simplified: g^tt = - (Sigma(r^2+a^2) + 2Mra^2sin^2theta) / (Delta * Sigma)
    // Let's use the simpler form: g^tt = -1 - 2Mr(r^2+a^2)/(Delta*Sigma) approx? No.
    // Let's use: g^tt = -1/Delta * ( (r^2+a^2)^2/Sigma - a^2 sin^2 theta ) ? No.
    // Let's differentiate the terms:
    // Term 1: -(r^2+a^2)^2 / (Delta * Sigma)
    // Term 2: + a^2 sin^2 theta / (Delta * Sigma) ?? NO.

    // Using: g^tt = - [ (r^2+a^2)^2 - Delta * a^2 sin^2 theta ] / (Delta * Sigma)
    // Actually g^tt = - [ (r^2+a^2)^2 - Delta * a^2 sin^2 theta ] / (Delta * Sigma) is incorrect.
    // Correct is: g^tt = -( (r^2+a^2)^2 / (Delta * Sigma) - a^2 sin^2 theta / Sigma ) ?
    // Let's stick to g^tt = - [ Sigma(r^2+a^2) + 2Mra^2sin^2theta ] / (Delta * Sigma)

    // Let U = Sigma(r^2+a^2) + 2Mra^2sin^2theta
    // Let V = Delta * Sigma
    // g^tt = - U / V

    // dU/dr = dSigma/dr * (r^2+a^2) + Sigma * 2r + 2Ma^2 sin^2theta
    let du_dr = dsigma_dr * (r2 + a2) + sigma * 2.0 * r + 2.0 * mass * a2 * sin2;
    // dV/dr = dDelta/dr * Sigma + Delta * dSigma/dr (Same as dden_tphi_dr)
    let dv_dr = dden_tphi_dr;

    let dg_tt_dr = -(du_dr * den_tphi - (sigma * (r2 + a2) + 2.0 * mass * r * a2 * sin2) * dv_dr)
        / (den_tphi * den_tphi);

    // dU/dtheta = dSigma/dtheta * (r^2+a^2) + 2Mra^2 * 2 sin theta cos theta
    let du_dtheta = dsigma_dtheta * (r2 + a2) + 2.0 * mass * r * a2 * 2.0 * sin_theta * cos_theta;

    // dV/dtheta = Delta * dSigma/dtheta (Same as dden_tphi_dtheta)
    let dv_dtheta = dden_tphi_dtheta;

    let dg_tt_dtheta = -(du_dtheta * den_tphi
        - (sigma * (r2 + a2) + 2.0 * mass * r * a2 * sin2) * dv_dtheta)
        / (den_tphi * den_tphi);

    // ------------------------------------------------------------------
    // 5. g^phphi = (Delta - a^2 sin^2 theta) / (Delta * Sigma * sin^2 theta)
    //            = 1 / (Sigma sin^2 theta) - a^2 / (Delta * Sigma)
    // ------------------------------------------------------------------

    // Term A = 1 / (Sigma * sin^2 theta)
    // Term B = a^2 / (Delta * Sigma)
    // g^phphi = A - B

    // dA/dr = -1/(Sigma^2 sin^2 theta) * dSigma/dr * sin^2 theta = -dSigma/dr / (Sigma^2 sin^2 theta)
    let da_dr = -dsigma_dr / (sigma_sq * sin2);

    // dB/dr = -a^2 / (Delta * Sigma)^2 * (dDelta/dr * Sigma + Delta * dSigma/dr)
    let db_dr = -a2 * dden_tphi_dr / (den_tphi * den_tphi);

    let dg_phph_dr = da_dr - db_dr;

    // dA/dtheta = -1/(Sigma * sin^2 theta)^2 * [ dSigma/dtheta * sin^2 theta + Sigma * 2 sin theta cos theta ]
    let d_denom_a_dtheta = dsigma_dtheta * sin2 + sigma * 2.0 * sin_theta * cos_theta;
    let da_dtheta = -d_denom_a_dtheta / (sigma_sq * sin2 * sin2);

    // dB/dtheta = -a^2 / (Delta * Sigma)^2 * (Delta * dSigma/dtheta)
    let db_dtheta = -a2 * dden_tphi_dtheta / (den_tphi * den_tphi);

    let dg_phph_dtheta = da_dtheta - db_dtheta;

    // ------------------------------------------------------------------
    // Assembly: dH/dalpha = 1/2 * p_mu * p_nu * (dg^mu_nu / dx^alpha)
    // ------------------------------------------------------------------

    let p_t = p[0];
    let p_r = p[1];
    let p_th = p[2];
    let p_ph = p[3];

    // Contributions to dH/dr
    let term_tt_r = p_t * p_t * dg_tt_dr;
    let term_rr_r = p_r * p_r * dg_rr_dr;
    let term_thth_r = p_th * p_th * dg_thth_dr;
    let term_phph_r = p_ph * p_ph * dg_phph_dr;
    let term_tph_r = 2.0 * p_t * p_ph * dg_tphi_dr; // Off-diagonal appears twice

    let dh_dr = 0.5 * (term_tt_r + term_rr_r + term_thth_r + term_phph_r + term_tph_r);

    // Contributions to dH/dtheta
    let term_tt_th = p_t * p_t * dg_tt_dtheta;
    let term_rr_th = p_r * p_r * dg_rr_dtheta;
    let term_thth_th = p_th * p_th * dg_thth_dtheta;
    let term_phph_th = p_ph * p_ph * dg_phph_dtheta;
    let term_tph_th = 2.0 * p_t * p_ph * dg_tphi_dtheta;

    let dh_dtheta = 0.5 * (term_tt_th + term_rr_th + term_thth_th + term_phph_th + term_tph_th);

    HamiltonianDerivatives { dh_dr, dh_dtheta }
}
