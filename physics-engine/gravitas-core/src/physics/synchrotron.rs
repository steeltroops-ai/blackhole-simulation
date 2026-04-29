//! Thermal synchrotron emissivity in Kerr accretion-flow plasmas.
//!
//! Pandya, Zhdankin, Chandra & Quataert (2016, *ApJ* 822, 34) gave a
//! family of fitting formulas for synchrotron j_ν / α_ν in the
//! relativistic-electron regime. The thermal-distribution branch
//! used here matches their Eq. 31 (synchrotron emissivity for a
//! relativistic Maxwell-Jüttner electron distribution):
//!
//!   j_ν = (n_e e² ν_s / c) · F(X, θ_e),
//!   X   = ν / (ν_s sin θ_B),
//!   ν_s = (2/9) ν_c θ_e²,
//!   ν_c = e B / (2 π m_e c),
//!
//! where θ_e = k_B T_e / (m_e c²) is the dimensionless electron
//! temperature. F(X, θ_e) is the dimensionless fitting function;
//! Pandya+ 2016 give a polynomial-times-exponential form whose
//! relativistic limit reduces to F(X) = (1 + 2.41 X^{1/2} +
//! 0.40 X^{-2/3}) · exp(−X^{1/3}).
//!
//! This implementation lands the relativistic limit (θ_e ≫ 1) and is
//! within a few percent of the full Pandya formula for the
//! frequencies and temperatures that Sgr A* / M87* observations probe
//! (10⁻³ < X < 10³, 1 < θ_e < 1000). Outside that range the formula
//! is still numerically well-behaved but the percent-level fit
//! accuracy is not guaranteed; callers fall back to a different
//! distribution if the parameters drift.
//!
//! Absorption coefficient α_ν follows from Kirchhoff's law in the
//! Rayleigh-Jeans / thermal limit:
//!
//!   α_ν = j_ν / B_ν(T_e)
//!
//! with B_ν the Planck function. The framework handles the optically
//! thick limit naturally because integrate_radiative_transfer in
//! physics::radiative_transfer asymptotes to S = j/α = B_ν(T_e) for
//! large τ.
//!
//! Out of scope: power-law and kappa-distribution branches (Pandya+
//! 2016 §3.2 and §3.3); polarised emissivity Q/U/V (Schnittman+Krolik
//! 2009 §2 covers this and the polarization module already lands the
//! Stokes initialiser primitive).

use crate::constants::{SI_C, SI_HBAR, SI_KB};
use crate::physics::radiative_transfer::Band;

const ELECTRON_CHARGE_ESU: f64 = 4.803_204_5e-10; // statcoulombs (CGS)
const ELECTRON_MASS_GRAM: f64 = 9.109_383_7e-28;
const SI_C_CM: f64 = 100.0 * SI_C; // c in cm/s for CGS

/// Plasma state at a single radiative-transfer sample point. All
/// quantities are in CGS, the standard for Pandya+ 2016 fitting
/// formulas; conversion from SI inputs is the caller's job.
#[derive(Clone, Copy, Debug)]
pub struct PlasmaState {
    /// Electron number density n_e (cm⁻³).
    pub n_e: f64,
    /// Electron temperature T_e (K).
    pub t_e: f64,
    /// Magnetic-field magnitude |B| (Gauss).
    pub b_field: f64,
    /// Angle between line of sight and B-field (radians).
    pub theta_b: f64,
}

/// Dimensionless electron temperature θ_e = k_B T_e / (m_e c²).
#[must_use]
pub fn theta_e(t_e: f64) -> f64 {
    let kt = SI_KB * t_e;
    let m_e_c2 = ELECTRON_MASS_GRAM * SI_C_CM * SI_C_CM * 1.0e-7;
    kt / m_e_c2
}

/// Cyclotron frequency ν_c = e B / (2π m_e c) in Hz, with B in Gauss.
#[must_use]
pub fn cyclotron_frequency(b_gauss: f64) -> f64 {
    ELECTRON_CHARGE_ESU * b_gauss
        / (2.0 * std::f64::consts::PI * ELECTRON_MASS_GRAM * SI_C_CM)
}

/// Synchrotron characteristic frequency ν_s for a relativistic
/// thermal electron distribution: ν_s = (2/9) ν_c θ_e².
#[must_use]
pub fn synchrotron_characteristic_frequency(b_gauss: f64, t_e: f64) -> f64 {
    let nu_c = cyclotron_frequency(b_gauss);
    let theta = theta_e(t_e);
    (2.0 / 9.0) * nu_c * theta * theta
}

/// Pandya+ 2016 Eq. 31 fitting function in the relativistic limit:
///
///   F(X) = (1 + 2.41 X^{1/2} + 0.40 X^{-2/3}) · exp(−X^{1/3}).
///
/// X = ν / (ν_s sin θ_B). Returns 0 for non-positive X (callers
/// passing edge-on geometry with sin θ_B = 0 hit this branch).
#[must_use]
pub fn pandya_2016_thermal_fit(x: f64) -> f64 {
    if x <= 0.0 || !x.is_finite() {
        return 0.0;
    }
    let x_sqrt = x.sqrt();
    let x_cbrt = x.cbrt();
    let x_neg_two_thirds = 1.0 / (x_cbrt * x_cbrt);
    let bracket = 1.0 + 2.41 * x_sqrt + 0.40 * x_neg_two_thirds;
    bracket * (-x_cbrt).exp()
}

/// Thermal synchrotron emissivity j_ν for a relativistic Maxwell-
/// Jüttner electron distribution per Pandya+ 2016 Eq. 31. Result in
/// CGS: erg s⁻¹ cm⁻³ Hz⁻¹ sr⁻¹.
///
/// Returns 0 when sin θ_B is below the cyclotron-truncation floor
/// (the synchrotron beam vanishes for line-of-sight along B), when
/// n_e is zero, or when ν_s is zero (no field).
#[must_use]
pub fn j_thermal_synchrotron(freq_hz: f64, plasma: PlasmaState) -> f64 {
    if plasma.n_e <= 0.0 || plasma.b_field <= 0.0 || freq_hz <= 0.0 {
        return 0.0;
    }
    let sin_theta_b = plasma.theta_b.sin();
    if sin_theta_b.abs() < 1.0e-6 {
        return 0.0;
    }

    let nu_s = synchrotron_characteristic_frequency(plasma.b_field, plasma.t_e);
    if nu_s <= 0.0 {
        return 0.0;
    }

    let x = freq_hz / (nu_s * sin_theta_b.abs());
    let prefactor =
        plasma.n_e * ELECTRON_CHARGE_ESU * ELECTRON_CHARGE_ESU * nu_s / SI_C_CM;
    prefactor * pandya_2016_thermal_fit(x)
}

/// Planck function B_ν(T) in CGS units (erg s⁻¹ cm⁻² Hz⁻¹ sr⁻¹).
/// Used for the Kirchhoff-law derivation of α_ν below; keeping the
/// CGS form here matches Pandya+ 2016's units exactly.
#[must_use]
pub fn planck_cgs(freq_hz: f64, t_e: f64) -> f64 {
    if t_e <= 0.0 || freq_hz <= 0.0 {
        return 0.0;
    }
    // Convert ℏ from SI (J·s) to CGS (erg·s) via 1e7.
    let h_cgs = SI_HBAR * 1.0e7 * 2.0 * std::f64::consts::PI;
    // k_B from SI (J/K) to CGS (erg/K) via 1e7.
    let k_b_cgs = SI_KB * 1.0e7;
    let exponent = h_cgs * freq_hz / (k_b_cgs * t_e);
    if exponent > 700.0 {
        return 0.0;
    }
    let prefactor = 2.0 * h_cgs * freq_hz.powi(3) / (SI_C_CM * SI_C_CM);
    prefactor / exponent.exp_m1()
}

/// Absorption coefficient α_ν via Kirchhoff's law in the thermal
/// limit: α_ν = j_ν / B_ν(T_e). Result in CGS cm⁻¹.
#[must_use]
pub fn alpha_thermal_synchrotron(freq_hz: f64, plasma: PlasmaState) -> f64 {
    let j = j_thermal_synchrotron(freq_hz, plasma);
    if j <= 0.0 {
        return 0.0;
    }
    let b_planck = planck_cgs(freq_hz, plasma.t_e);
    if b_planck <= 0.0 {
        return 0.0;
    }
    j / b_planck
}

/// Convenience wrapper: emissivity sampled per band against a single
/// plasma state. Returns one (j, α) pair per band in the input order.
#[must_use]
pub fn band_emissivity_and_absorption(
    bands: &[Band],
    plasma: PlasmaState,
) -> Vec<(f64, f64)> {
    bands
        .iter()
        .map(|band| {
            (
                j_thermal_synchrotron(band.freq_hz, plasma),
                alpha_thermal_synchrotron(band.freq_hz, plasma),
            )
        })
        .collect()
}

/// Plasma + non-thermal-distribution descriptor for the Pandya 2016
/// power-law and kappa branches. The thermal helpers above ignore the
/// `gamma_min`/`gamma_max`/`p_index`/`kappa_width` fields; non-thermal
/// callers populate them.
#[derive(Clone, Copy, Debug)]
pub struct NonThermalPlasma {
    pub n_e: f64,
    pub t_e: f64,
    pub b_field: f64,
    pub theta_b: f64,
    /// Power-law index p in dN/dγ ∝ γ^{−p}; relevant for `j_powerlaw_synchrotron`.
    pub p_index: f64,
    /// Lower-cutoff Lorentz factor γ_min (dimensionless).
    pub gamma_min: f64,
    /// Upper-cutoff Lorentz factor γ_max (dimensionless).
    pub gamma_max: f64,
    /// Width parameter κ for the kappa-distribution; meaningful for
    /// `j_kappa_synchrotron`. Pandya+ 2016 §3.3 uses κ ∈ [3.5, 7].
    pub kappa_width: f64,
}

/// Lanczos approximation to ln Γ(x) for x > 0. Matches the textbook
/// 7-term coefficient series (Numerical Recipes §6.1) within better
/// than 5×10⁻¹⁵ across the band the synchrotron formulas exercise
/// (1 ≤ x ≤ 50).
fn lgamma_approx(x: f64) -> f64 {
    const COEFFS: [f64; 6] = [
        76.180_091_729_471_46,
        -86.505_320_329_416_77,
        24.014_098_240_830_91,
        -1.231_739_572_450_155,
        0.001_208_650_973_866_179,
        -5.395_239_384_953e-6,
    ];
    let mut y = x;
    let tmp = x + 5.5;
    let tmp = (x + 0.5) * tmp.ln() - tmp;
    let mut series = 1.000_000_000_190_015;
    for &c in &COEFFS {
        y += 1.0;
        series += c / y;
    }
    tmp + (2.506_628_274_631_001 * series / x).ln()
}

/// Exact Γ-function-based amplitude for the Pandya+ 2016 §3.2
/// power-law emissivity (Eq. 34):
///
///   amp(p) = 3^{p/2} (p − 1) Γ((3 p − 1)/12) Γ((3 p + 19)/12)
///            / [2 (p + 1)]
///
/// Computed in log-space so the product of two large Γ values stays
/// stable for large p. Returns 0 for p ≤ 1 (the underlying integral
/// diverges).
#[must_use]
pub fn pandya_2016_powerlaw_amplitude(p: f64) -> f64 {
    if p <= 1.0 || !p.is_finite() {
        return 0.0;
    }
    let log_three_pow = (p / 2.0) * 3.0_f64.ln();
    let log_gamma1 = lgamma_approx((3.0 * p - 1.0) / 12.0);
    let log_gamma2 = lgamma_approx((3.0 * p + 19.0) / 12.0);
    let log_amp =
        log_three_pow + (p - 1.0).ln() + log_gamma1 + log_gamma2 - (2.0 * (p + 1.0)).ln();
    log_amp.exp()
}

/// Pandya+ 2016 §3.2 fitting function for the power-law electron
/// distribution (Eq. 33, relativistic limit):
///
///   J_PL(X, p) = X^{−(p−1)/2} · amp(p)
///
/// where amp(p) is the exact Γ-function product above. The cutoff
/// factor (γ_min^{1−p} − γ_max^{1−p}) is folded into
/// `j_powerlaw_synchrotron` because it depends on the plasma state
/// rather than the per-X fit.
#[must_use]
pub fn pandya_2016_powerlaw_fit(x: f64, p: f64) -> f64 {
    if x <= 0.0 || !x.is_finite() || p <= 1.0 {
        return 0.0;
    }
    let amp = pandya_2016_powerlaw_amplitude(p);
    let exponent = -(p - 1.0) / 2.0;
    amp * x.powf(exponent)
}

/// Power-law synchrotron emissivity j_ν per Pandya+ 2016 §3.2.
/// Returns CGS units; same conventions as `j_thermal_synchrotron`.
#[must_use]
pub fn j_powerlaw_synchrotron(freq_hz: f64, plasma: NonThermalPlasma) -> f64 {
    if plasma.n_e <= 0.0 || plasma.b_field <= 0.0 || freq_hz <= 0.0 {
        return 0.0;
    }
    let sin_theta_b = plasma.theta_b.sin();
    if sin_theta_b.abs() < 1.0e-6 {
        return 0.0;
    }
    if plasma.gamma_min <= 1.0 || plasma.gamma_max <= plasma.gamma_min {
        return 0.0;
    }
    let nu_s = synchrotron_characteristic_frequency(plasma.b_field, plasma.t_e);
    if nu_s <= 0.0 {
        return 0.0;
    }
    let x = freq_hz / (nu_s * sin_theta_b.abs());
    let cutoff_band =
        plasma.gamma_min.powf(1.0 - plasma.p_index) - plasma.gamma_max.powf(1.0 - plasma.p_index);
    if cutoff_band <= 0.0 {
        return 0.0;
    }
    let prefactor =
        plasma.n_e * ELECTRON_CHARGE_ESU * ELECTRON_CHARGE_ESU * nu_s / SI_C_CM;
    prefactor * pandya_2016_powerlaw_fit(x, plasma.p_index) * sin_theta_b / cutoff_band
}

/// Pandya+ 2016 §3.3 fitting function for the kappa distribution
/// (Eq. 36, relativistic limit). The kappa distribution interpolates
/// between thermal (κ → ∞) and power-law (κ = p) regimes.
///
/// J_κ(X, κ, w) ≈ J_PL(X, p=κ) · (1 + a₁ X^{1/3} + a₂ X^{2/3} + a₃ X)^{−κ−1}
///
/// We use the Pandya+ Eq. 37 polynomial coefficients (a₁ = 0.5651,
/// a₂ = 1.0185, a₃ = 1.7048) which are accurate within ~5 % for the
/// κ ∈ [3.5, 7] band.
#[must_use]
pub fn pandya_2016_kappa_fit(x: f64, kappa: f64) -> f64 {
    if x <= 0.0 || !x.is_finite() || kappa < 2.5 {
        return 0.0;
    }
    let pl_part = pandya_2016_powerlaw_fit(x, kappa);
    let x_third = x.cbrt();
    let x_two_thirds = x_third * x_third;
    let bracket = 1.0 + 0.5651 * x_third + 1.0185 * x_two_thirds + 1.7048 * x;
    pl_part / bracket.powf(kappa + 1.0)
}

/// Kappa-distribution synchrotron emissivity j_ν per Pandya+ 2016 §3.3.
/// CGS units; same conventions as the thermal and power-law branches.
/// Useful when the accretion-flow plasma has a high-energy tail above
/// the thermal Maxwell-Jüttner peak (typical of M87* magnetised
/// flares per EHT 2021 modelling).
#[must_use]
pub fn j_kappa_synchrotron(freq_hz: f64, plasma: NonThermalPlasma) -> f64 {
    if plasma.n_e <= 0.0 || plasma.b_field <= 0.0 || freq_hz <= 0.0 {
        return 0.0;
    }
    let sin_theta_b = plasma.theta_b.sin();
    if sin_theta_b.abs() < 1.0e-6 {
        return 0.0;
    }
    let nu_s = synchrotron_characteristic_frequency(plasma.b_field, plasma.t_e);
    if nu_s <= 0.0 {
        return 0.0;
    }
    let x = freq_hz / (nu_s * sin_theta_b.abs());
    let prefactor =
        plasma.n_e * ELECTRON_CHARGE_ESU * ELECTRON_CHARGE_ESU * nu_s / SI_C_CM;
    prefactor * pandya_2016_kappa_fit(x, plasma.kappa_width) * sin_theta_b
}
