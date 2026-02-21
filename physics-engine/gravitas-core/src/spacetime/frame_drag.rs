//! Frame dragging visualization.
//!
//! In the Kerr spacetime, the rotation of the black hole drags spacetime itself,
//! forcing all objects (including light) to co-rotate with the black hole.

use crate::metric::Kerr;

/// Frame dragging angular velocity omega at arbitrary (r, theta).
///
/// omega = -g_{t phi} / g_{phi phi}
///
/// This is the angular velocity at which a zero-angular-momentum observer (ZAMO) is forced to orbit.
pub fn frame_dragging_omega(bh: &Kerr, r: f64, theta: f64) -> f64 {
    bh.frame_dragging(r, theta)
}

/// Generate a vector field of frame dragging for 3D visualization.
///
/// Returns Vec<(r, theta, omega)> tuples.
/// In a 3D renderer, omega can be visualized as arrows pointing in the phi direction
/// with magnitude proportional to omega.
pub fn frame_drag_field(
    bh: &Kerr,
    r_min: f64,
    r_max: f64,
    n_radial: usize,
    n_polar: usize,
) -> Vec<(f64, f64, f64)> {
    let mut field = Vec::with_capacity(n_radial * n_polar);

    for i in 0..n_radial {
        let r = r_min + (r_max - r_min) * i as f64 / (n_radial - 1) as f64;
        for j in 0..n_polar {
            let theta = 0.1 + (std::f64::consts::PI - 0.2) * j as f64 / (n_polar - 1) as f64;
            let omega = frame_dragging_omega(bh, r, theta);
            field.push((r, theta, omega));
        }
    }

    field
}

/// Ergosphere surface points for 3D rendering.
///
/// Generates (x, y, z) coordinates for the ergosphere boundary in Cartesian space.
/// The ergosphere is an oblate surface that touches the horizon at the poles
/// and extends to r_ergo = M + sqrt(M^2 - a^2 cos^2 theta) at other latitudes.
pub fn ergosphere_mesh(
    bh: &Kerr,
    n_polar: usize,
    n_azimuthal: usize,
) -> Vec<f32> {
    let mut vertices = Vec::with_capacity(n_polar * n_azimuthal * 3);

    for i in 0..n_polar {
        let theta = std::f64::consts::PI * i as f64 / (n_polar - 1) as f64;
        let r_ergo = bh.ergosphere(theta);

        for j in 0..n_azimuthal {
            let phi = 2.0 * std::f64::consts::PI * j as f64 / n_azimuthal as f64;

            let x = r_ergo * theta.sin() * phi.cos();
            let y = r_ergo * theta.cos();
            let z = r_ergo * theta.sin() * phi.sin();

            vertices.push(x as f32);
            vertices.push(y as f32);
            vertices.push(z as f32);
        }
    }

    vertices
}
