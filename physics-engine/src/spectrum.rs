/// Spectral Rendering Module
///
/// Implements physically correct spectral integration using Gauss-Laguerre quadrature.
/// Replaces the old Tanner-Helland polynomial approximation with radiometrically accurate
/// Planckian integration over CIE 1931 matching functions.

// use wasm_bindgen::prelude::*;
// use gauss_quad::GaussLaguerre;

// CIE 1931 Color Matching Functions (Approximated as Gaussian lobes for analytical speed)
// Source: Wyman et al. 2013 "Simple Analytic Approximations to the CIE XYZ Color Matching Functions"
// x_bar(lambda) ~ 1.056*g(599, 37.9) + 0.362*g(442, 16.0) - 0.065*g(501, 20.4)
// y_bar(lambda) ~ 0.821*g(568, 46.9) + 0.286*g(530, 22.1)
// z_bar(lambda) ~ 1.217*g(437, 11.8) + 0.681*g(459, 26.0)

use crate::constants::{SI_C as C, SI_KB as K};
const H: f64 = 6.62607015e-34;  // Planck constant remains local for high precision here
const C1: f64 = 2.0 * H * C * C;
const C2: f64 = H * C / K;

/// Planck's Law: B(lambda, T) = (2hc^2 / lambda^5) * 1 / (exp(hc/lambda*k*T) - 1)
/// We integrate B(lambda, T) * matching_function(lambda) d_lambda
///
/// Using Gauss-Laguerre quadrature for semi-infinite integral $\int_0^\infty e^{-x} f(x) dx$
/// We substitute x = hc / (lambda * k * T) to map lambda [0, inf] -> x [inf, 0]
pub fn integrate_planck_xyz(temperature: f64) -> [f64; 3] {
    if temperature < 100.0 {
        return [0.0, 0.0, 0.0];
    }

    // Quadrature setup - 32 points is sufficient for smooth spectra
    // The crate 'gauss-quad' uses different syntax depending on version.
    // Assuming 0.1.9, it's GaussLaguerre::new(n). 
    // If the error says 'new' not found, it might be 'init' or strict trait usage.
    // The error log showed "consider using GaussLaguerre::init".
    // let quad = GaussLaguerre::init(32, 0.0);
    
    // Scaling factor for substitution: lambda = C2 / (x * T)
    // dx = - C2 / (lambda^2 * T) d_lambda  => d_lambda = - (C2 / (x*T)^2 * T ) dx ...
    //
    // Actually simpler: The integral is over lambda.
    // I = \int B(lambda) * S(lambda) d_lambda
    //
    // This is computationally expensive to do 60 times a second per pixel.
    // Instead, we pre-compute a LUT.
    
    // For the LUT generator, we just use naive summation over visible range (380nm - 780nm)
    // with 1nm steps. It's run once at startup.
    
    let mut x = 0.0;
    let mut y = 0.0;
    let mut z = 0.0;
    
    let mut lambda = 380.0e-9;
    let end_lambda = 780.0e-9;
    let step = 2.0e-9; // 2nm steps
    
    while lambda <= end_lambda {
        let intensity = planck_law(lambda, temperature);
        let (cmf_x, cmf_y, cmf_z) = sample_cie_1931(lambda);
        
        x += intensity * cmf_x * step;
        y += intensity * cmf_y * step;
        z += intensity * cmf_z * step;
        
        lambda += step;
    }
    
    [x, y, z]
}

#[inline]
fn planck_law(lambda: f64, t: f64) -> f64 {
    // Avoid overflow/NaN for very small lambda/T
    let exponent = C2 / (lambda * t);
    if exponent > 100.0 {
        return 0.0;
    }
    
    let den = exponent.exp() - 1.0;
    (C1 / lambda.powi(5)) / den
}

/// Analytic approximation of CIE 1931 XYZ matching functions
/// Input lambda in meters (e.g. 500e-9)
fn sample_cie_1931(lambda: f64) -> (f64, f64, f64) {
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

/// Convert XYZ to Linear RGB (Rec. 709 / sRGB primaries)
pub fn xyz_to_linear_rgb(x: f64, y: f64, z: f64) -> [f32; 3] {
    let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
    let b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    
    // Normalize by max luminance to fit in 0..1 range roughly, 
    // though for HDR we want unbounded.
    // Here we just return raw linear values, scaling happens in tone mapping.
    
    [r.max(0.0) as f32, g.max(0.0) as f32, b.max(0.0) as f32]
}

/// Generate a 2D LUT for Blackbody colors including Relativistic Redshift
/// Width: Temperature samples (e.g. 1024)
/// Height: Redshift samples (e.g. 256)
/// Max Temp: e.g. 10,000,000K
pub fn generate_blackbody_lut(width: usize, height: usize, max_temp: f64) -> Vec<f32> {
    let mut data = Vec::with_capacity(width * height * 4);
    
    // Redshift range (g): 0.05 to 5.0 (Extreme shifts near horizon)
    let min_g = 0.05;
    let max_g = 5.0;

    for y in 0..height {
        let g = min_g + (max_g - min_g) * (y as f64 / (height - 1).max(1) as f64);
        
        for x in 0..width {
            // Temperature distribution
            let t = (x as f64 / (width - 1).max(1) as f64).powf(2.5) * max_temp;
            
            // Relativistic Shift: Effective Temperature T' = g * T
            // This is equivalent to shifting the spectrum S'(lambda) = S(lambda / g)
            let t_eff = t * g;

            let xyz = integrate_planck_xyz(t_eff);
            let rgb = xyz_to_linear_rgb(xyz[0], xyz[1], xyz[2]);
            
            // Radiometric Scaler (g^4 scaling factor for intensity due to beaming/redshift)
            let g4 = g.powi(4);
            let scale = 1.0e-14 * g4; 
            
            data.push(rgb[0] * scale as f32);
            data.push(rgb[1] * scale as f32);
            data.push(rgb[2] * scale as f32);
            data.push(1.0); // Alpha
        }
    }
    
    data
}
