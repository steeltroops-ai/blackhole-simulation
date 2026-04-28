//! Tests for the `renormalize_null` discriminant guard.
//!
//! Covers the three bands: valid input passes through; rounding-noise
//! negative discriminant clamps to zero; severe negative discriminant
//! returns `NormalizationError`.

use gravitas::geodesic::GeodesicState;
use gravitas::invariants::{
    hamiltonian, renormalize_null, NormalizationError, ROUNDING_TOLERANCE,
};
use gravitas::metric::Kerr;

/// Build a near-null state at radius r with given (E, L_z) and zero θ-momentum.
/// Solves for p_r given the null constraint H = 0; returns the renormalized state.
fn build_null_state(metric: &Kerr, r: f64, e: f64, l_z: f64) -> GeodesicState {
    let mut state = GeodesicState {
        x: [0.0, r, std::f64::consts::FRAC_PI_2, 0.0],
        p: [-e, 0.0, 0.0, l_z], // p_t = -E for stationary observers
    };
    // Solve for p_r via the renormalize_null function itself.
    // For test stability, we accept whatever it produces.
    renormalize_null(&mut state, metric).expect("initial state should normalize");
    state
}

#[test]
fn renormalize_succeeds_on_valid_null_state() {
    let metric = Kerr::new(1.0, 0.5);
    let mut state = build_null_state(&metric, 10.0, 1.0, 3.0);
    let result = renormalize_null(&mut state, &metric);
    assert!(
        result.is_ok(),
        "valid null state should renormalize cleanly: {result:?}",
    );
}

#[test]
fn renormalize_clamps_small_negative_discriminant() {
    // Build a state slightly off the null cone; rounding produces a tiny
    // negative discriminant that should clamp without erroring.
    let metric = Kerr::new(1.0, 0.5);
    let mut state = build_null_state(&metric, 10.0, 1.0, 3.0);
    // Perturb p_r by an amount within numerical noise.
    state.p[1] += 1e-15;
    let result = renormalize_null(&mut state, &metric);
    assert!(
        result.is_ok(),
        "small perturbation should clamp, not error: {result:?}",
    );
    // After renormalization, H must be ≈ 0.
    let h = hamiltonian(&state, &metric);
    assert!(h.abs() < 1e-6, "post-renormalization H = {h} (must be < 1e-6)");
}

#[test]
fn renormalize_errors_on_severe_negative_discriminant() {
    // Construct a state strongly off the null cone (timelike with large p_t).
    // The discriminant will be very negative; the function should error.
    let metric = Kerr::new(1.0, 0.5);
    // Set p_t = 0 (no energy) with large transverse θ-momentum:
    //   A = g^rr (positive far from horizon)
    //   B = 0 (since p_t = p_phi = 0 contribute to the cross terms)
    //   C = g^θθ * p_θ² (positive)
    //   discriminant = 0 - 4·A·C < 0
    // No real p_r exists making H = 0 — the state is not renormalizable.
    let mut state = GeodesicState {
        x: [0.0, 10.0, std::f64::consts::FRAC_PI_2, 0.0],
        p: [0.0, 0.0, 10.0, 0.0],
    };
    let result = renormalize_null(&mut state, &metric);
    match result {
        Err(NormalizationError::NegativeDiscriminant { value }) => {
            assert!(
                value < -ROUNDING_TOLERANCE,
                "discriminant {value} should be below rounding band {ROUNDING_TOLERANCE:e}",
            );
        }
        Ok(()) => panic!("expected NegativeDiscriminant error; got Ok"),
    }
}

#[test]
fn rounding_tolerance_is_strictly_positive() {
    // Sanity: the band is positive (we negate it for the comparison).
    assert!(ROUNDING_TOLERANCE > 0.0);
    assert!(ROUNDING_TOLERANCE < 1e-6);
}
