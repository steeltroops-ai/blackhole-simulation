//! 4x4 symmetric metric tensor type.

use std::ops::Index;

/// A 4x4 metric tensor stored in row-major order.
///
/// Coordinates are ordered as (t, r, theta, phi) = (0, 1, 2, 3).
///
/// # Example
/// ```
/// use gravitas::tensor::MetricTensor4;
///
/// let g = MetricTensor4::diagonal(-1.0, 1.0, 1.0, 1.0); // Minkowski
/// assert_eq!(g[(0, 0)], -1.0);
/// assert_eq!(g[(1, 1)], 1.0);
/// ```
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MetricTensor4 {
    /// Row-major flattened components: g[mu*4 + nu].
    pub components: [f64; 16],
}

impl MetricTensor4 {
    /// Create a metric tensor from a raw 16-element array (row-major).
    pub fn from_array(components: [f64; 16]) -> Self {
        Self { components }
    }

    /// Create a diagonal metric tensor.
    pub fn diagonal(g_tt: f64, g_rr: f64, g_thth: f64, g_phph: f64) -> Self {
        let mut g = [0.0; 16];
        g[0] = g_tt;
        g[5] = g_rr;
        g[10] = g_thth;
        g[15] = g_phph;
        Self { components: g }
    }

    /// Get component g_{mu, nu}.
    #[inline]
    pub fn get(&self, mu: usize, nu: usize) -> f64 {
        self.components[mu * 4 + nu]
    }

    /// Set component g_{mu, nu}.
    #[inline]
    pub fn set(&mut self, mu: usize, nu: usize, value: f64) {
        self.components[mu * 4 + nu] = value;
    }

    /// Contract tensor with two 4-vectors: result = g^{mu nu} p_mu p_nu
    pub fn contract(&self, p: &[f64; 4]) -> f64 {
        let mut result = 0.0;
        for mu in 0..4 {
            for nu in 0..4 {
                result += self.components[mu * 4 + nu] * p[mu] * p[nu];
            }
        }
        result
    }

    /// Raise an index: p^mu = g^{mu nu} p_nu
    pub fn raise_index(&self, p_lower: &[f64; 4]) -> [f64; 4] {
        let mut p_upper = [0.0; 4];
        for mu in 0..4 {
            for nu in 0..4 {
                p_upper[mu] += self.components[mu * 4 + nu] * p_lower[nu];
            }
        }
        p_upper
    }

    /// Return the underlying array.
    pub fn as_array(&self) -> &[f64; 16] {
        &self.components
    }

    /// Compute the determinant of the metric tensor.
    /// Uses the full 4x4 determinant formula for a general matrix.
    pub fn determinant(&self) -> f64 {
        let m = &self.components;
        // Expansion by minors along the first row
        let minor00 = m[5] * (m[10] * m[15] - m[11] * m[14])
            - m[6] * (m[9] * m[15] - m[11] * m[13])
            + m[7] * (m[9] * m[14] - m[10] * m[13]);

        let minor01 = m[4] * (m[10] * m[15] - m[11] * m[14])
            - m[6] * (m[8] * m[15] - m[11] * m[12])
            + m[7] * (m[8] * m[14] - m[10] * m[12]);

        let minor02 = m[4] * (m[9] * m[15] - m[11] * m[13])
            - m[5] * (m[8] * m[15] - m[11] * m[12])
            + m[7] * (m[8] * m[13] - m[9] * m[12]);

        let minor03 = m[4] * (m[9] * m[14] - m[10] * m[13])
            - m[5] * (m[8] * m[14] - m[10] * m[12])
            + m[6] * (m[8] * m[13] - m[9] * m[12]);

        m[0] * minor00 - m[1] * minor01 + m[2] * minor02 - m[3] * minor03
    }
}

impl Index<(usize, usize)> for MetricTensor4 {
    type Output = f64;
    fn index(&self, (mu, nu): (usize, usize)) -> &f64 {
        &self.components[mu * 4 + nu]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_diagonal_metric() {
        let g = MetricTensor4::diagonal(-1.0, 1.0, 1.0, 1.0);
        assert_eq!(g[(0, 0)], -1.0);
        assert_eq!(g[(1, 1)], 1.0);
        assert_eq!(g[(0, 1)], 0.0);
    }

    #[test]
    fn test_minkowski_determinant() {
        let g = MetricTensor4::diagonal(-1.0, 1.0, 1.0, 1.0);
        assert!((g.determinant() - (-1.0)).abs() < 1e-12);
    }

    #[test]
    fn test_raise_index() {
        let g = MetricTensor4::diagonal(-1.0, 1.0, 1.0, 1.0);
        let p_lower = [1.0, 2.0, 3.0, 4.0];
        let p_upper = g.raise_index(&p_lower);
        assert_eq!(p_upper[0], -1.0); // g^tt * p_t = -1 * 1
        assert_eq!(p_upper[1], 2.0);
    }
}
