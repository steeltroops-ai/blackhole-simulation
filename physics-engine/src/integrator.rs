/// Adaptive Runge-Kutta-Fehlberg 4(5) Integrator
///
/// Implements an adaptive step-size controller using the RKF45 method.
/// Automatically adjusts step size `h` to maintain local truncation error
/// below a specified tolerance. Critical for efficiency near the event horizon.
///
/// References:
/// - Press et al., "Numerical Recipes", Section 17.2
/// - Fehlberg, E. (1969). "Low-order classical Runge-Kutta formulas with stepsize control"

use crate::geodesic::{RayStateRelativistic};

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
    pub fn step(&mut self, state: &mut RayStateRelativistic, mass: f64, spin: f64, h_try: f64) -> f64 {
        let mut h = h_try;
        
        // Limit h to max_step
        if h.abs() > self.max_step {
            h = self.max_step * h.signum();
        }

        loop {
            // calculated_state: The 5th order solution
            // truncation_error: The difference between 4th and 5th order solutions
            let (new_state, error_estimate) = rkf45_step(state, mass, spin, h);
            
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
                // h_next = h * safety * (error_ratio)^-0.2
                // We clamp the growth to avoid instability (e.g., max 5x growth)
                let growth_factor = if error_ratio < 1e-4 {
                    5.0 
                } else {
                    self.safety_factor * error_ratio.powf(-0.2)
                };
                
                // Don't grow more than 5x
                let next_h = h * growth_factor.min(5.0);
                
                return if next_h.abs() > self.max_step {
                    self.max_step * next_h.signum()
                } else {
                    next_h
                };
            } else {
                // Step rejected - shrink h and retry
                // h_next = h * safety * (error_ratio)^-0.25
                let shrink_factor = self.safety_factor * error_ratio.powf(-0.25);
                h *= shrink_factor.max(0.1); // Don't shrink by more than 10x
                
                // Check against min step
                if h.abs() < self.min_step {
                    // Force step at min_step if we hit the floor (loss of precision or singularity)
                    // In a real engine, we might want to return an error or flag termination.
                    // For now, we take the step and warn (conceptually).
                     let (forced_state, _) = rkf45_step(state, mass, spin, self.min_step * h.signum());
                     *state = forced_state;
                     return self.min_step * h.signum();
                }
            }
        }
    }
}

/// Cash-Karp Coefficients for RKF45
/// These are generally considered more efficient than the original Fehlberg coefficients.
const A2: f64 = 1.0/5.0;
const A3: f64 = 3.0/10.0;
const A4: f64 = 3.0/5.0;
const A5: f64 = 1.0;
const A6: f64 = 7.0/8.0;

const B21: f64 = 1.0/5.0;
const B31: f64 = 3.0/40.0;
const B32: f64 = 9.0/40.0;
const B41: f64 = 3.0/10.0;
const B42: f64 = -9.0/10.0;
const B43: f64 = 6.0/5.0;
const B51: f64 = -11.0/54.0;
const B52: f64 = 5.0/2.0;
const B53: f64 = -70.0/27.0;
const B54: f64 = 35.0/27.0;
const B61: f64 = 1631.0/55296.0;
const B62: f64 = 175.0/512.0;
const B63: f64 = 575.0/13824.0;
const B64: f64 = 44275.0/110592.0;
const B65: f64 = 253.0/4096.0;

// 5th order coefficients (result)
const C1: f64 = 37.0/378.0;
const C3: f64 = 250.0/621.0;
const C4: f64 = 125.0/594.0;
const C6: f64 = 512.0/1771.0;

// 4th order coefficients (embedded) - used for error estimation
// Error = Result(5th) - Result(4th)
// We use the difference of coefficients directly: DC_i = C_i - C*_i
const DC1: f64 = C1 - 2825.0/27648.0;
const DC3: f64 = C3 - 18575.0/48384.0;
const DC4: f64 = C4 - 13525.0/55296.0;
const DC5: f64 = -277.0/14336.0; // C5 is 0
const DC6: f64 = C6 - 1.0/4.0;

/// Core RKF45 Stepper
/// Returns (New State, Error Estimate)
fn rkf45_step(state: &RayStateRelativistic, mass: f64, spin: f64, h: f64) -> (RayStateRelativistic, f64) {
    let y = state;
    
    // k1 = h * f(y)
    let k1 = evaluate_derivative(y, mass, spin, h);
    
    // k2 = h * f(y + b21*k1)
    let y2 = y.add_k(&k1, B21);
    let k2 = evaluate_derivative(&y2, mass, spin, h);
    
    // k3 = h * f(y + b31*k1 + b32*k2)
    let y3 = y.add_k2(&k1, B31, &k2, B32);
    let k3 = evaluate_derivative(&y3, mass, spin, h);
    
    // k4 = h * f(y + b41*k1 + b42*k2 + b43*k3)
    let y4 = y.add_k3(&k1, B41, &k2, B42, &k3, B43);
    let k4 = evaluate_derivative(&y4, mass, spin, h);
    
    // k5 = h * f(y + b51*k1 + b52*k2 + b53*k3 + b54*k4)
    let y5 = y.add_k4(&k1, B51, &k2, B52, &k3, B53, &k4, B54);
    let k5 = evaluate_derivative(&y5, mass, spin, h);
    
    // k6 = h * f(y + b61*k1 + b62*k2 + b63*k3 + b64*k4 + b65*k5)
    let y6 = y.add_k5(&k1, B61, &k2, B62, &k3, B63, &k4, B64, &k5, B65);
    let k6 = evaluate_derivative(&y6, mass, spin, h);
    
    // Final 5th order solution
    let mut x_new = [0.0; 4];
    let mut p_new = [0.0; 4];
    
    for i in 0..4 {
        x_new[i] = y.x[i] + C1*k1.x[i] + C3*k3.x[i] + C4*k4.x[i] + C6*k6.x[i];
        p_new[i] = y.p[i] + C1*k1.p[i] + C3*k3.p[i] + C4*k4.p[i] + C6*k6.p[i];
    }
    
    let result_state = RayStateRelativistic { x: x_new, p: p_new };
    
    // Error Estimate
    let mut max_error = 0.0;
    for i in 0..4 {
        let err_x = (DC1*k1.x[i] + DC3*k3.x[i] + DC4*k4.x[i] + DC5*k5.x[i] + DC6*k6.x[i]).abs();
        let err_p = (DC1*k1.p[i] + DC3*k3.p[i] + DC4*k4.p[i] + DC5*k5.p[i] + DC6*k6.p[i]).abs();
        
        if err_x > max_error { max_error = err_x; }
        if err_p > max_error { max_error = err_p; }
    }
    
    (result_state, max_error)
}

/// Helper to compute k = h * f(y)
fn evaluate_derivative(state: &crate::geodesic::RayStateRelativistic, mass: f64, spin: f64, h: f64) -> crate::geodesic::RayStateRelativistic {
    let deriv = crate::geodesic::get_state_derivative(state, mass, spin);
    
    crate::geodesic::RayStateRelativistic {
        x: [deriv.x[0]*h, deriv.x[1]*h, deriv.x[2]*h, deriv.x[3]*h],
        p: [deriv.p[0]*h, deriv.p[1]*h, deriv.p[2]*h, deriv.p[3]*h],
    }
}

// Helpers for linear combinations of states
impl RayStateRelativistic {
    fn add_k(&self, k: &Self, s: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k.x[i] * s;
            n.p[i] += k.p[i] * s;
        }
        n
    }
    
    fn add_k2(&self, k1: &Self, s1: f64, k2: &Self, s2: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2;
        }
        n
    }

    fn add_k3(&self, k1: &Self, s1: f64, k2: &Self, s2: f64, k3: &Self, s3: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3;
        }
        n
    }
    
    fn add_k4(&self, k1: &Self, s1: f64, k2: &Self, s2: f64, k3: &Self, s3: f64, k4: &Self, s4: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3 + k4.x[i] * s4;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3 + k4.p[i] * s4;
        }
        n
    }
    
    fn add_k5(&self, k1: &Self, s1: f64, k2: &Self, s2: f64, k3: &Self, s3: f64, k4: &Self, s4: f64, k5: &Self, s5: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3 + k4.x[i] * s4 + k5.x[i] * s5;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3 + k4.p[i] * s4 + k5.p[i] * s5;
        }
        n
    }
}
