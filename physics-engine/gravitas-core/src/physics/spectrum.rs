//! Spectral rendering: Planck law, CIE 1931 color matching, blackbody LUT.

use crate::constants::{SI_C, SI_KB};

const H: f64 = 6.626_070_15e-34;
const C1: f64 = 2.0 * H * SI_C * SI_C;
const C2: f64 = H * SI_C / SI_KB;

/// Planck's Law: spectral radiance B(lambda, T).
///
/// B = (2hc^2 / lambda^5) / (exp(hc / lambda k T) - 1)
pub fn planck_law(lambda: f64, temperature: f64) -> f64 {
    let exponent = C2 / (lambda * temperature);
    if exponent > 100.0 {
        return 0.0;
    }
    (C1 / lambda.powi(5)) / (exponent.exp() - 1.0)
}

/// Integrate Planck spectrum against CIE 1931 XYZ color matching functions.
///
/// Returns [X, Y, Z] tristimulus values.
pub fn integrate_planck_xyz(temperature: f64) -> [f64; 3] {
    if temperature < 100.0 {
        return [0.0, 0.0, 0.0];
    }

    let mut x = 0.0;
    let mut y = 0.0;
    let mut z = 0.0;

    let mut lambda = 380.0e-9;
    let end = 780.0e-9;
    let step = 2.0e-9;

    while lambda <= end {
        let intensity = planck_law(lambda, temperature);
        let (cx, cy, cz) = cie_1931(lambda);
        x += intensity * cx * step;
        y += intensity * cy * step;
        z += intensity * cz * step;
        lambda += step;
    }

    [x, y, z]
}

/// Analytic approximation of CIE 1931 XYZ matching functions.
/// Input: lambda in meters.
fn cie_1931(lambda: f64) -> (f64, f64, f64) {
    let l_nm = lambda * 1e9;
    let g = |mean: f64, std: f64| -> f64 {
        let x = (l_nm - mean) / std;
        (-0.5 * x * x).exp()
    };

    let x = 1.056 * g(599.0, 37.9) + 0.362 * g(442.0, 16.0) - 0.065 * g(501.0, 20.4);
    let y = 0.821 * g(568.0, 46.9) + 0.286 * g(530.0, 22.1);
    let z = 1.217 * g(437.0, 11.8) + 0.681 * g(459.0, 26.0);

    (x.max(0.0), y.max(0.0), z.max(0.0))
}

/// Convert CIE XYZ to linear sRGB.
pub fn xyz_to_linear_rgb(x: f64, y: f64, z: f64) -> [f32; 3] {
    let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    [r.max(0.0) as f32, g.max(0.0) as f32, b.max(0.0) as f32]
}

/// Generate a 2D blackbody LUT with temperature and relativistic redshift axes.
///
/// Width: temperature samples. Height: redshift (g-factor) samples.
/// Returns flat RGBA f32 data suitable for GPU texture upload.
pub fn generate_blackbody_lut(width: usize, height: usize, max_temp: f64) -> Vec<f32> {
    let mut data = Vec::with_capacity(width * height * 4);
    let min_g = 0.05;
    let max_g = 5.0;

    for y in 0..height {
        let g = min_g + (max_g - min_g) * (y as f64 / (height - 1).max(1) as f64);

        for x in 0..width {
            let t = (x as f64 / (width - 1).max(1) as f64).powf(2.5) * max_temp;
            let t_eff = t * g;

            let xyz = integrate_planck_xyz(t_eff);
            let rgb = xyz_to_linear_rgb(xyz[0], xyz[1], xyz[2]);

            let g4 = g.powi(4);
            let scale = 1.0e-14 * g4;

            data.push(rgb[0] * scale as f32);
            data.push(rgb[1] * scale as f32);
            data.push(rgb[2] * scale as f32);
            data.push(1.0);
        }
    }

    data
}
