//! Embedding diagrams (Flamm's paraboloid) for spacetime visualization.
//!
//! The embedding diagram shows how the radial geometry of a black hole is warped
//! by mapping the equatorial plane into a 3D surface. For a Schwarzschild BH,
//! this is the famous "Flamm's paraboloid": z = 2 * sqrt(r_s * (r - r_s)).

use crate::metric::Metric;

/// Flamm's paraboloid height for the Schwarzschild metric at equatorial slice.
///
/// z(r) = 2 * sqrt(r_s * (r - r_s))  where r_s = 2M
///
/// Returns 0.0 for r <= r_s.
pub fn flamm_height(r: f64, mass: f64) -> f64 {
    let rs = 2.0 * mass;
    if r <= rs {
        return 0.0;
    }
    2.0 * (rs * (r - rs)).sqrt()
}

/// Generalized embedding height for Kerr metric (equatorial, approximate).
///
/// For a rotating black hole, the equatorial embedding is computed by integrating
/// sqrt(g_rr - 1) dr, which gives the "height" of the deformed surface.
///
/// This uses a simple numerical integration (trapezoidal) from r to r_max.
pub fn kerr_embedding_height<M: Metric>(metric: &M, r: f64, r_ref: f64, n_steps: usize) -> f64 {
    let theta = std::f64::consts::FRAC_PI_2;
    let dr = (r_ref - r) / n_steps as f64;
    let mut z = 0.0;

    for i in 0..n_steps {
        let r_i = r + (i as f64 + 0.5) * dr;
        let g = metric.covariant(r_i, theta);
        let g_rr = g.get(1, 1);

        // The embedding function integrand: dz/dr = sqrt(|g_rr - 1|)
        let integrand = (g_rr - 1.0).abs().sqrt();
        z += integrand * dr;
    }

    z
}

/// Proper radial distance between two radii (equatorial plane).
///
/// d_proper = integral from r1 to r2 of sqrt(g_rr) dr
pub fn proper_distance<M: Metric>(metric: &M, r1: f64, r2: f64, n_steps: usize) -> f64 {
    let theta = std::f64::consts::FRAC_PI_2;
    let (r_lo, r_hi) = if r1 < r2 { (r1, r2) } else { (r2, r1) };
    let dr = (r_hi - r_lo) / n_steps as f64;
    let mut dist = 0.0;

    for i in 0..n_steps {
        let r_i = r_lo + (i as f64 + 0.5) * dr;
        let g = metric.covariant(r_i, theta);
        let g_rr = g.get(1, 1);
        dist += g_rr.abs().sqrt() * dr;
    }

    dist
}

/// Generate a 3D mesh of the embedding diagram for rendering.
///
/// Returns a flat Vec<f32> of (x, y, z) triples suitable for a BufferGeometry.
/// The mesh is in cylindrical coordinates, converted to Cartesian:
///   x = r * cos(phi)
///   y = embedding_height(r)
///   z = r * sin(phi)
pub fn embedding_mesh(
    mass: f64,
    spin: f64,
    r_min: f64,
    r_max: f64,
    n_radial: usize,
    n_angular: usize,
) -> Vec<f32> {
    use crate::metric::Kerr;

    let metric = Kerr::new(mass, spin);
    let r_ref = r_max;
    let mut vertices = Vec::with_capacity(n_radial * n_angular * 3);

    for i in 0..n_radial {
        let t = i as f64 / (n_radial - 1) as f64;
        let r = r_min + t * (r_max - r_min);

        // Use Flamm's paraboloid for Schwarzschild, Kerr embedding for spinning
        let height = if spin.abs() < 1e-6 {
            flamm_height(r, mass)
        } else {
            kerr_embedding_height(&metric, r, r_ref, 100)
        };

        for j in 0..n_angular {
            let phi = 2.0 * std::f64::consts::PI * j as f64 / n_angular as f64;

            let x = r * phi.cos();
            let y = -height; // Negative so the funnel points down
            let z = r * phi.sin();

            vertices.push(x as f32);
            vertices.push(y as f32);
            vertices.push(z as f32);
        }
    }

    vertices
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flamm_at_horizon() {
        assert_eq!(flamm_height(2.0, 1.0), 0.0);
    }

    #[test]
    fn test_flamm_at_large_r() {
        let z = flamm_height(100.0, 1.0);
        assert!(z > 0.0);
        // At large r: z ~ 2*sqrt(2M*r) ~ 2*sqrt(2*100) ~ 28.28
        assert!((z - 2.0 * (2.0 * 98.0_f64).sqrt()).abs() < 0.1);
    }
}
