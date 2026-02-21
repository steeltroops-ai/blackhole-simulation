//! Tensor algebra types for general relativity computations.
//!
//! Provides a [`MetricTensor4`] type for 4x4 symmetric tensors
//! and utilities for Christoffel symbol computation.

mod metric_tensor;
mod christoffel;

pub use metric_tensor::MetricTensor4;
pub use christoffel::christoffel_from_metric_derivs;
