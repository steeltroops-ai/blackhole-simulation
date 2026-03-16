//! Tensor algebra types for general relativity computations.
//!
//! Provides a [`MetricTensor4`] type for 4x4 symmetric tensors
//! and utilities for Christoffel symbol computation.

mod christoffel;
mod metric_tensor;

pub use christoffel::christoffel_from_metric_derivs;
pub use metric_tensor::MetricTensor4;
