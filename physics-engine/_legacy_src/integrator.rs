#![allow(dead_code)]
/// Adaptive Runge-Kutta-Fehlberg 4(5) Integrator
///
/// Implements an adaptive step-size controller using the RKF45 method.
/// Automatically adjusts step size `h` to maintain local truncation error
/// below a specified tolerance. Critical for efficiency near the event horizon.
///
/// References:
/// - Press et al., "Numerical Recipes", Section 17.2
/// - Fehlberg, E. (1969). "Low-order classical Runge-Kutta formulas with stepsize control"
use crate::geodesic::RayStateRelativistic;

pub struct AdaptiveStepper {
    pub safety_factor: f64,
    pub min_step: f64,
    pub max_step: f64,
    pub tolerance: f64,
    pub errors: f64, // Diagnostic: accumulated error estimate
}

impl AdaptiveStepper {
    pub fn new(tolerance: f64) -> Self {
        Self {
            safety_factor: 0.9,
            min_step: 1e-5,
            max_step: 10.0,
            tolerance,
            errors: 0.0,
        }
    }

    /// Perform a single adaptive step.
    /// Returns the actual step size taken (which might be different from input `h` if rejected/adjusted).
    /// Updates `state` in place.
    pub fn step<M: crate::metric::Metric>(
        &mut self,
        state: &mut RayStateRelativistic,
        metric: &M,
        h_try: f64,
    ) -> f64 {
        let mut h = h_try;

        // Limit h to max_step
        if h.abs() > self.max_step {
            h = self.max_step * h.signum();
        }

        loop {
            // calculated_state: The 5th order solution
            // truncation_error: The difference between 4th and 5th order solutions
            let (new_state, error_estimate) = crate::geodesic::rkf45_step(state, metric, h);

            // Avoid division by zero
            let error_ratio = if error_estimate == 0.0 {
                0.0
            } else {
                error_estimate / self.tolerance
            };

            if error_ratio <= 1.0 {
                // Step accepted
                *state = new_state;

                // Adjust step size for next step (increase if error is low)
                let growth_factor = if error_ratio < 1e-4 {
                    5.0
                } else {
                    self.safety_factor * error_ratio.powf(-0.2)
                };

                let next_h = h * growth_factor.min(5.0);

                return if next_h.abs() > self.max_step {
                    self.max_step * next_h.signum()
                } else {
                    next_h
                };
            } else {
                // Step rejected - shrink h and retry
                let shrink_factor = self.safety_factor * error_ratio.powf(-0.25);
                h *= shrink_factor.max(0.1);

                // Check against min step
                if h.abs() < self.min_step {
                    let (forced_state, _) =
                        crate::geodesic::rkf45_step(state, metric, self.min_step * h.signum());
                    *state = forced_state;
                    return self.min_step * h.signum();
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geodesic;
    use crate::invariants;
    use crate::metric::Metric;

    #[test]
    fn test_hamiltonian_drift_audit() {
        use crate::metric::KerrBL;
        let mass = 1.0;
        let spin = 0.9;
        let r_start = 20.0;
        let theta = 1.57; // Near equator
        let phi = 0.0;

        let mut state =
            geodesic::RayStateRelativistic::new(0.0, r_start, theta, phi, -1.0, -1.0, 0.0, 3.5);

        let metric = KerrBL { mass, spin };

        // Force H = 0 at start
        invariants::renormalize_momentum(&mut state, &metric);

        let initial_consts = invariants::calculate_constants(&state, &metric);
        println!("Initial Hamiltonian: {:e}", initial_consts.hamiltonian);

        let mut stepper = AdaptiveStepper::new(1e-8);
        let mut h = 0.05;
        let mut max_h_drift = 0.0;
        let mut steps_count = 0;

        for _ in 0..5000 {
            h = stepper.step(&mut state, &metric, h);
            steps_count += 1;

            let consts = invariants::calculate_constants(&state, &metric);
            let drift = consts.hamiltonian.abs();
            if drift > max_h_drift {
                max_h_drift = drift;
            }

            if state.x[1] < 2.1 {
                break;
            } // Near horizon
        }

        println!("Steps taken: {}", steps_count);
        println!("Max Hamiltonian Drift: {:e}", max_h_drift);

        // A "stable" integrator should stay below 1e-4 even near the horizon.
        assert!(
            max_h_drift < 1e-4,
            "Hamiltonian drift is too high! Physics integrity compromised."
        );
    }

    #[test]
    fn test_compare_shitty_vs_real_integration() {
        use crate::metric::KerrBL;
        let mass = 1.0;
        let spin = 0.998; // Extreme spin
        let r_start = 5.0; // Very close to the photon sphere
        let theta = 1.57;

        let mut state_adaptive = geodesic::RayStateRelativistic::new(
            0.0, r_start, theta, 0.0, -1.0, 0.0, 0.0, 2.0, // Orbiting photon
        );
        let metric = KerrBL { mass, spin };
        invariants::renormalize_momentum(&mut state_adaptive, &metric);
        let mut state_fixed = state_adaptive;

        // 1. Adaptive Integration (Real)
        let mut stepper = AdaptiveStepper::new(1e-8);
        let mut h_adaptive = 0.01;
        let mut max_drift_adaptive = 0.0;

        for _ in 0..1000 {
            h_adaptive = stepper.step(&mut state_adaptive, &metric, h_adaptive);
            let h_val = invariants::calculate_constants(&state_adaptive, &metric)
                .hamiltonian
                .abs();
            if h_val > max_drift_adaptive {
                max_drift_adaptive = h_val;
            }
        }

        // 2. Fixed Step Integration (Shitty)
        let h_fixed = 0.05;
        let mut max_drift_fixed = 0.0;
        for _ in 0..1000 {
            geodesic::step_rk4(&mut state_fixed, &metric, h_fixed);
            let h_val = invariants::calculate_constants(&state_fixed, &metric)
                .hamiltonian
                .abs();
            if h_val > max_drift_fixed {
                max_drift_fixed = h_val;
            }
        }

        println!("Adaptive Max Drift: {:e}", max_drift_adaptive);
        println!("Fixed Step Max Drift: {:e}", max_drift_fixed);

        // assert!(max_drift_adaptive < max_drift_fixed, "Adaptive step must be more precise than large fixed step!");
    }

    #[test]
    fn test_exhaustive_physics_audit() {
        use crate::metric::{KerrBL, KerrSchild};
        let mass = 1.0;
        let spins = [0.0, 0.5, 0.9, 0.99, 0.998]; // Extreme spins included
        let r_start = 20.0;
        let theta = 1.57; // Near equator
        let phi = 0.0;

        println!("\n=== EXHAUSTIVE PHYSICS AUDIT (10,000 STEPS) ===");
        println!(
            "{:<10} | {:<12} | {:<10} | {:<12}",
            "Spin (a)", "Metric", "Steps", "Max H Drift"
        );
        println!("{:-<10}-|-{:-<12}-|-{:-<10}-|-{:-<12}", "", "", "", "");

        for &spin in &spins {
            // Test KerrBL
            {
                let mut state = geodesic::RayStateRelativistic::new(
                    0.0, r_start, theta, phi, -1.0, -1.0, 0.0, 3.5,
                );
                let metric = KerrBL { mass, spin };
                invariants::renormalize_momentum(&mut state, &metric);

                let mut stepper = AdaptiveStepper::new(1e-9);
                let mut h = 0.05;
                let mut max_h_drift = 0.0;
                let mut actual_steps = 0;

                for _ in 0..10000 {
                    h = stepper.step(&mut state, &metric, h);
                    actual_steps += 1;

                    let drift = invariants::calculate_constants(&state, &metric)
                        .hamiltonian
                        .abs();
                    if drift > max_h_drift {
                        max_h_drift = drift;
                    }

                    if state.x[1] < 2.05 {
                        break;
                    } // Near horizon for BL
                    if state.x[1] > 100.0 {
                        break;
                    }
                }
                println!(
                    "{:<10.3} | {:<12} | {:<10} | {:<12.2e}",
                    spin, "KerrBL", actual_steps, max_h_drift
                );
            }

            // Test KerrSchild
            {
                let mut state = geodesic::RayStateRelativistic::new(
                    0.0, r_start, theta, phi, -1.0, -1.0, 0.0, 3.5,
                );
                let metric = KerrSchild { mass, spin };
                invariants::renormalize_momentum(&mut state, &metric);

                let mut stepper = AdaptiveStepper::new(1e-9);
                let mut h = 0.05;
                let mut max_h_drift = 0.0;
                let mut actual_steps = 0;

                for _ in 0..10000 {
                    h = stepper.step(&mut state, &metric, h);
                    actual_steps += 1;

                    let drift = invariants::calculate_constants(&state, &metric)
                        .hamiltonian
                        .abs();
                    if drift > max_h_drift {
                        max_h_drift = drift;
                    }

                    if state.x[1] < 0.1 {
                        break;
                    } // Inside horizon for KS
                    if state.x[1] > 100.0 {
                        break;
                    }
                }
                println!(
                    "{:<10.3} | {:<12} | {:<10} | {:<12.2e}",
                    spin, "KerrSchild", actual_steps, max_h_drift
                );
            }
        }
        println!("===============================================\n");
    }

    #[test]
    fn test_derivative_accuracy_audit() {
        use crate::audit::NumericalMetricAudit;
        use crate::metric::{KerrBL, KerrSchild};
        let mass = 1.0;
        let spin = 0.5;
        let r = 5.0;
        let theta = 1.2;
        let p = [-1.0, 0.5, 0.1, 2.0];

        use std::io::Write;
        let mut file = std::fs::File::create("audit_results.txt").unwrap();

        writeln!(file, "\n=== DERIVATIVE ACCURACY AUDIT (a=0.5, r=5.0) ===").unwrap();

        {
            let metric = KerrBL { mass, spin };
            let analytic = metric.calculate_hamiltonian_derivatives(r, theta, p);
            let audit = NumericalMetricAudit::new(&metric);
            let numerical = audit.calculate_numerical_derivatives(r, theta, p);

            writeln!(
                file,
                "KerrBL Analytic:  dH/dr={:<10.6e}, dH/dth={:<10.6e}",
                analytic.dh_dr, analytic.dh_dtheta
            )
            .unwrap();
            writeln!(
                file,
                "KerrBL Numerical: dH/dr={:<10.6e}, dH/dth={:<10.6e}",
                numerical.dh_dr, numerical.dh_dtheta
            )
            .unwrap();
        }

        {
            let metric = KerrSchild { mass, spin };
            let analytic = metric.calculate_hamiltonian_derivatives(r, theta, p);
            let audit = NumericalMetricAudit::new(&metric);
            let numerical = audit.calculate_numerical_derivatives(r, theta, p);

            writeln!(
                file,
                "KerrSchild Analytic:  dH/dr={:<10.6e}, dH/dth={:<10.6e}",
                analytic.dh_dr, analytic.dh_dtheta
            )
            .unwrap();
            writeln!(
                file,
                "KerrSchild Numerical: dH/dr={:<10.6e}, dH/dth={:<10.6e}",
                numerical.dh_dr, numerical.dh_dtheta
            )
            .unwrap();
        }
        writeln!(file, "================================================\n").unwrap();
    }

    #[test]
    fn test_horizon_crossing() {
        use crate::metric::KerrSchild;
        let mass = 1.0;
        let spin = 0.9;
        let metric = KerrSchild { mass, spin };

        // Start outside, heading IN
        let mut state =
            geodesic::RayStateRelativistic::new(0.0, 3.0, 1.57, 0.0, -1.0, -1.0, 0.0, 0.0);
        invariants::renormalize_momentum(&mut state, &metric);

        let mut stepper = AdaptiveStepper::new(1e-11);
        let mut h = 0.01;
        let h0 = invariants::calculate_constants(&state, &metric).hamiltonian;

        println!("\n=== HORIZON CROSSING TEST (KerrSchild, a=0.9) ===");
        println!("{:<10} | {:<10} | {:<12}", "Step", "Radius", "H Drift");

        for i in 0..1000 {
            h = stepper.step(&mut state, &metric, h);
            let drift = (invariants::calculate_constants(&state, &metric).hamiltonian - h0).abs();
            if i % 50 == 0 {
                println!("{:<10} | {:<10.4} | {:<12.2e}", i, state.x[1], drift);
            }
            if state.x[1] < 0.5 {
                break;
            } // Go deep inside
        }
        assert!(
            state.x[1] < 1.0,
            "Ray should have crossed the horizon (r+ ~ 1.44)"
        );
        println!("=================================================\n");
    }

    #[test]
    fn test_coordinate_comparison() {
        use crate::metric::{KerrBL, KerrSchild};
        let mass = 1.0;
        let spin = 0.5;
        let r = 3.0; // Outside horizon
        let theta = 1.57;
        let p_bl = [-1.0, 0.0, 0.0, 2.0]; // E=1, Lz=2

        let bl = KerrBL { mass, spin };
        let ks = KerrSchild { mass, spin };

        let a = spin * mass;
        let delta = r * r - 2.0 * mass * r + a * a;

        // Transform p_r from BL to KS:
        // p_r_ks = p_r_bl + (2Mr E - a Lz) / Delta
        let e = -p_bl[0];
        let lz = p_bl[3];
        let p_r_ks_expected = p_bl[1] + (2.0 * mass * r * e - a * lz) / delta;

        let p_ks = [p_bl[0], p_r_ks_expected, p_bl[2], p_bl[3]];

        let h_bl = invariants::calculate_constants(
            &geodesic::RayStateRelativistic {
                x: [0.0, r, theta, 0.0],
                p: p_bl,
            },
            &bl,
        )
        .hamiltonian;
        let h_ks = invariants::calculate_constants(
            &geodesic::RayStateRelativistic {
                x: [0.0, r, theta, 0.0],
                p: p_ks,
            },
            &ks,
        )
        .hamiltonian;

        println!("\n=== COORDINATE COMPARISON (r=3.0, a=0.5) ===");
        println!("Hamiltonian BL: {:.6e}", h_bl);
        println!("Hamiltonian KS: {:.6e}", h_ks);
        println!(
            "p_r BL: {:.4}, p_r KS expected: {:.4}",
            p_bl[1], p_r_ks_expected
        );

        assert!(
            (h_bl - h_ks).abs() < 1e-10,
            "Hamiltonian should be invariant under coordinate transform!"
        );
        println!("============================================\n");
    }
}
