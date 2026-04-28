//! Momentum renormalization for null geodesics.
//!
//! Projects the radial momentum p_r onto the null constraint surface H = 0
//! to correct numerical drift accumulated during integration.

use crate::geodesic::GeodesicState;
use crate::metric::Metric;

/// Tolerance for clamping a slightly-negative discriminant caused by
/// floating-point rounding accumulated over many integration steps. A
/// discriminant in `[-ROUNDING_TOLERANCE, 0)` is treated as zero (the
/// vector is on the null cone within numerical precision); a more
/// negative discriminant indicates real drift and is propagated as an
/// error.
pub const ROUNDING_TOLERANCE: f64 = 1e-12;

/// Errors from null-momentum renormalization.
#[derive(Debug, Clone, PartialEq)]
pub enum NormalizationError {
    /// Discriminant fell below the rounding-tolerance band, indicating
    /// accumulated numerical drift well beyond what clamping can fix.
    /// Caller should reset the geodesic state from a known-good source
    /// or abort the integration.
    NegativeDiscriminant {
        /// Actual discriminant value (negative, < -ROUNDING_TOLERANCE).
        value: f64,
    },
}

impl core::fmt::Display for NormalizationError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::NegativeDiscriminant { value } => write!(
                f,
                "renormalization failed: discriminant = {} (must be >= -{:e})",
                value, ROUNDING_TOLERANCE,
            ),
        }
    }
}

impl std::error::Error for NormalizationError {}

/// Renormalize momentum to strictly satisfy H = 0 (null geodesic condition).
///
/// Solves for p_r from the quadratic `A*p_r^2 + B*p_r + C = 0`, choosing
/// the root closest to the current p_r to preserve ray direction.
///
/// # Errors
///
/// Returns `NormalizationError::NegativeDiscriminant` when `B^2 - 4AC`
/// falls below `-ROUNDING_TOLERANCE`. The geodesic has drifted off the
/// null cone by more than rounding noise; the renormalizer cannot fix it
/// and the caller should reset state from a known-good source or abort
/// integration.
pub fn renormalize_null<M: Metric>(
    state: &mut GeodesicState,
    metric: &M,
) -> Result<(), NormalizationError> {
    let r = state.x[1];
    let theta = state.x[2];
    let g_inv = metric.contravariant(r, theta);
    let g = g_inv.as_array();

    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];

    // Quadratic in p_r: A*pr^2 + B*pr + C = 0
    let a_quad = g[5]; // g^rr
    let b_quad = 2.0 * (g[1] * p_t + g[7] * p_ph); // 2(g^tr*pt + g^rph*pph)
    let c_quad =
        g[0] * p_t * p_t + g[10] * p_th * p_th + g[15] * p_ph * p_ph + 2.0 * g[3] * p_t * p_ph;

    if a_quad.abs() <= 1e-12 {
        // Degenerate: g^rr ≈ 0 (e.g., on horizon in some coordinate systems).
        // Skip without error; the integrator will move past the singularity.
        return Ok(());
    }

    let discriminant = b_quad * b_quad - 4.0 * a_quad * c_quad;

    if discriminant < -ROUNDING_TOLERANCE {
        return Err(NormalizationError::NegativeDiscriminant {
            value: discriminant,
        });
    }

    // Clamp to 0 if in the rounding band: the geodesic is on the null cone
    // within numerical precision; the negative value is rounding noise, not
    // physical drift.
    let safe_discriminant = discriminant.max(0.0);
    let sqrt_d = safe_discriminant.sqrt();
    let sol1 = (-b_quad + sqrt_d) / (2.0 * a_quad);
    let sol2 = (-b_quad - sqrt_d) / (2.0 * a_quad);

    // Choose root closest to current p_r to preserve ray direction.
    state.p[1] = if (sol1 - p_r).abs() < (sol2 - p_r).abs() {
        sol1
    } else {
        sol2
    };

    Ok(())
}
