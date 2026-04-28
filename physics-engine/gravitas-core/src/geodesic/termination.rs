//! Geodesic termination conditions.

/// Reason a geodesic integration was terminated.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TerminationReason {
    /// Integration has not yet terminated.
    None,
    /// Ray fell within the event horizon.
    Horizon,
    /// Ray escaped to large radius.
    Escape,
    /// Maximum step count reached.
    MaxSteps,
    /// Ray hit the accretion disk plane.
    DiskCrossing,
    /// Renormalization detected the geodesic drifted off the null cone
    /// by more than rounding noise. Indicates accumulated numerical drift
    /// the renormalizer cannot correct.
    NormalizationFailure,
}
