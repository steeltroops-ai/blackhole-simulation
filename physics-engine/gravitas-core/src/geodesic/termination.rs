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
}
