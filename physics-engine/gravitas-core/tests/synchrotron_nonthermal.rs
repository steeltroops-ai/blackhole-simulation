//! Pandya 2016 power-law and kappa-distribution synchrotron branches.
//!
//! What this suite proves:
//! - pandya_2016_powerlaw_fit returns 0 on degenerate inputs.
//! - The fit decays as X^{−(p−1)/2} at fixed p, so doubling X
//!   reduces J by 2^{−(p−1)/2}.
//! - j_powerlaw_synchrotron is zero on degenerate plasma inputs.
//! - j_powerlaw_synchrotron is linear in n_e.
//! - pandya_2016_kappa_fit reduces toward the power-law form when X
//!   is small (the (1 + …)^{−κ−1} factor approaches 1).
//! - pandya_2016_kappa_fit suppresses high-X contributions
//!   (high-energy tail cutoff) more than the power-law branch.
//! - j_kappa_synchrotron is zero on degenerate plasma inputs.

use gravitas::physics::synchrotron::{
    j_kappa_synchrotron, j_powerlaw_synchrotron, pandya_2016_kappa_fit,
    pandya_2016_powerlaw_fit, NonThermalPlasma,
};

fn close(a: f64, b: f64, rel: f64) -> bool {
    if b.abs() < 1e-30 {
        a.abs() < rel
    } else {
        (a - b).abs() / b.abs() < rel
    }
}

// ---------------------------------------------------------------------
// Power-law fit
// ---------------------------------------------------------------------

#[test]
fn powerlaw_fit_zero_on_degenerate_inputs() {
    assert_eq!(pandya_2016_powerlaw_fit(0.0, 2.5), 0.0);
    assert_eq!(pandya_2016_powerlaw_fit(-1.0, 2.5), 0.0);
    assert_eq!(pandya_2016_powerlaw_fit(f64::NAN, 2.5), 0.0);
    // p ≤ 1 has no convergent integral; return 0.
    assert_eq!(pandya_2016_powerlaw_fit(1.0, 1.0), 0.0);
    assert_eq!(pandya_2016_powerlaw_fit(1.0, 0.5), 0.0);
}

#[test]
fn powerlaw_fit_decays_as_negative_p_minus_one_over_two() {
    // J ∝ X^{−(p−1)/2}, so doubling X gives ratio 2^{−(p−1)/2}.
    let p = 2.5;
    let j1 = pandya_2016_powerlaw_fit(1.0, p);
    let j2 = pandya_2016_powerlaw_fit(2.0, p);
    let expected_ratio = 2.0_f64.powf(-(p - 1.0) / 2.0);
    assert!(close(j2 / j1, expected_ratio, 1e-9));
}

#[test]
fn powerlaw_fit_steeper_decay_for_higher_p() {
    // Higher p ⇒ steeper decay; J(X=10) for p=3.5 should be smaller
    // than J(X=10) for p=1.5 once normalized to the same prefactor.
    let j_low_p = pandya_2016_powerlaw_fit(10.0, 1.5);
    let j_high_p = pandya_2016_powerlaw_fit(10.0, 3.5);
    assert!(j_low_p > j_high_p);
}

// ---------------------------------------------------------------------
// Power-law emissivity
// ---------------------------------------------------------------------

fn baseline_powerlaw_plasma() -> NonThermalPlasma {
    NonThermalPlasma {
        n_e: 1.0e6,
        t_e: 1.0e10,
        b_field: 100.0,
        theta_b: std::f64::consts::FRAC_PI_3,
        p_index: 2.5,
        gamma_min: 10.0,
        gamma_max: 1.0e6,
        kappa_width: 4.5,
    }
}

#[test]
fn powerlaw_emissivity_zero_on_zero_density() {
    let mut plasma = baseline_powerlaw_plasma();
    plasma.n_e = 0.0;
    assert_eq!(j_powerlaw_synchrotron(230.0e9, plasma), 0.0);
}

#[test]
fn powerlaw_emissivity_zero_on_zero_field() {
    let mut plasma = baseline_powerlaw_plasma();
    plasma.b_field = 0.0;
    assert_eq!(j_powerlaw_synchrotron(230.0e9, plasma), 0.0);
}

#[test]
fn powerlaw_emissivity_zero_on_invalid_gamma_range() {
    // gamma_min ≤ 1 has no relativistic distribution.
    let mut plasma = baseline_powerlaw_plasma();
    plasma.gamma_min = 1.0;
    assert_eq!(j_powerlaw_synchrotron(230.0e9, plasma), 0.0);

    // gamma_max ≤ gamma_min collapses the integral.
    let mut plasma = baseline_powerlaw_plasma();
    plasma.gamma_max = 5.0;
    plasma.gamma_min = 10.0;
    assert_eq!(j_powerlaw_synchrotron(230.0e9, plasma), 0.0);
}

#[test]
fn powerlaw_emissivity_linear_in_density() {
    let plasma1 = baseline_powerlaw_plasma();
    let plasma2 = NonThermalPlasma {
        n_e: 2.0 * plasma1.n_e,
        ..plasma1
    };
    let j1 = j_powerlaw_synchrotron(230.0e9, plasma1);
    let j2 = j_powerlaw_synchrotron(230.0e9, plasma2);
    assert!(close(j2 / j1, 2.0, 1e-9));
}

#[test]
fn powerlaw_emissivity_positive_and_finite_for_typical_input() {
    let plasma = baseline_powerlaw_plasma();
    let j = j_powerlaw_synchrotron(230.0e9, plasma);
    assert!(j > 0.0);
    assert!(j.is_finite());
}

// ---------------------------------------------------------------------
// Kappa-distribution fit + emissivity
// ---------------------------------------------------------------------

#[test]
fn kappa_fit_zero_on_degenerate_inputs() {
    assert_eq!(pandya_2016_kappa_fit(0.0, 4.0), 0.0);
    assert_eq!(pandya_2016_kappa_fit(-1.0, 4.0), 0.0);
    // κ < 2.5 is outside the validated band; treat as zero rather
    // than silently extrapolate.
    assert_eq!(pandya_2016_kappa_fit(1.0, 1.0), 0.0);
}

#[test]
fn kappa_fit_suppresses_high_x_more_than_power_law() {
    // The (1 + …)^{−κ−1} factor compounds with the X dependence to
    // suppress high-X emission. At X=100 the kappa branch should
    // sit below the power-law branch evaluated at the same
    // effective p = κ.
    let x = 100.0;
    let kappa = 4.0;
    let pl = pandya_2016_powerlaw_fit(x, kappa);
    let kp = pandya_2016_kappa_fit(x, kappa);
    assert!(kp < pl, "kappa({kp}) should be below PL({pl}) at high X");
}

#[test]
fn kappa_fit_at_small_x_close_to_power_law() {
    // For very small X the bracket (1 + small) → 1 and the
    // (κ + 1)-power amplifies the small correction; X = 1e-6 keeps
    // the asymptote inside 5 %.
    let x = 1.0e-6;
    let kappa = 4.0;
    let pl = pandya_2016_powerlaw_fit(x, kappa);
    let kp = pandya_2016_kappa_fit(x, kappa);
    let ratio = kp / pl;
    assert!(ratio > 0.9 && ratio < 1.0, "kappa/PL = {ratio} at X=1e-6");
}

#[test]
fn kappa_emissivity_zero_on_zero_density() {
    let mut plasma = baseline_powerlaw_plasma();
    plasma.n_e = 0.0;
    assert_eq!(j_kappa_synchrotron(230.0e9, plasma), 0.0);
}

#[test]
fn kappa_emissivity_positive_and_finite() {
    let plasma = baseline_powerlaw_plasma();
    let j = j_kappa_synchrotron(230.0e9, plasma);
    assert!(j > 0.0 && j.is_finite());
}
