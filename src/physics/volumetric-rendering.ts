/**
 * Volumetric rendering calculations for accretion disk
 * These functions provide testable implementations of volumetric rendering logic
 * that mirrors the shader implementation.
 */

/**
 * Calculate exponential density falloff from disk midplane
 * Formula: ρ(y) = ρ₀ × exp(-k|y|/h)
 * 
 * Requirements: 14.1
 * 
 * @param verticalDistance - Distance from disk midplane (|y|)
 * @param diskThickness - Disk thickness (h)
 * @param falloffRate - Falloff rate constant (k), default: 3.0
 * @returns Density factor [0, 1]
 */
export function calculateExponentialDensityFalloff(
    verticalDistance: number,
    diskThickness: number,
    falloffRate: number = 3.0
): number {
    if (diskThickness <= 0) return 0;

    const normalizedDistance = Math.abs(verticalDistance) / diskThickness;
    const density = Math.exp(-falloffRate * normalizedDistance);

    return Math.max(0, Math.min(1, density));
}

/**
 * Check if density has reached saturation threshold for early termination
 * 
 * Requirements: 14.2
 * 
 * @param accumulatedDensity - Current accumulated density
 * @param saturationThreshold - Threshold for saturation (default: 0.98)
 * @returns True if density has reached saturation
 */
export function shouldTerminateOnSaturation(
    accumulatedDensity: number,
    saturationThreshold: number = 0.98
): boolean {
    return accumulatedDensity >= saturationThreshold;
}

/**
 * Calculate smooth edge fading at disk boundaries using smoothstep
 * 
 * Requirements: 14.3
 * 
 * @param radius - Current radius
 * @param edgeRadius - Edge boundary radius
 * @param fadeWidth - Width of fade region
 * @param isInnerEdge - True for inner edge, false for outer edge
 * @returns Fade factor [0, 1]
 */
export function calculateSmoothEdgeFading(
    radius: number,
    edgeRadius: number,
    fadeWidth: number,
    isInnerEdge: boolean
): number {
    if (isInnerEdge) {
        // Inner edge: fade in as radius increases from edge
        const t = (radius - edgeRadius) / fadeWidth;
        return smoothstep(t);
    } else {
        // Outer edge: fade out as radius approaches edge
        const t = (edgeRadius - radius) / fadeWidth;
        return smoothstep(t);
    }
}

/**
 * Smoothstep function for smooth interpolation
 * Formula: t² × (3 - 2t)
 */
function smoothstep(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Calculate opacity based on viewing angle
 * Opacity increases when viewing edge-on, decreases when viewing face-on
 * 
 * Requirements: 14.4
 * 
 * @param viewAngle - Angle between view direction and disk normal [0, 1]
 *                    0 = edge-on, 1 = face-on
 * @returns Opacity factor [0, 1]
 */
export function calculateViewAngleOpacity(viewAngle: number): number {
    // Clamp view angle to valid range
    const clampedAngle = Math.max(0, Math.min(1, viewAngle));

    // Opacity increases when viewing edge-on (viewAngle close to 0)
    // Opacity decreases when viewing face-on (viewAngle close to 1)
    const opacity = 1.0 - clampedAngle * 0.5;

    return Math.max(0, Math.min(1, opacity));
}

/**
 * Calculate path length factor based on viewing angle
 * Path length through gas is longer when viewing edge-on
 * 
 * Requirements: 14.4
 * 
 * @param viewAngle - Angle between view direction and disk normal [0, 1]
 * @returns Path length factor [1, 3]
 */
export function calculatePathLengthFactor(viewAngle: number): number {
    // Clamp view angle to valid range
    const clampedAngle = Math.max(0, Math.min(1, viewAngle));

    // Path length factor increases when viewing edge-on
    const factor = 1.0 / (clampedAngle + 0.3);

    // Clamp to reasonable range [1, 3]
    return Math.max(1, Math.min(3, factor));
}

/**
 * Perform alpha blending of two colors
 * Formula: C_result = C_new × α + C_old × (1 - α)
 * 
 * Requirements: 14.5
 * 
 * @param newColor - New color to blend [r, g, b]
 * @param oldColor - Existing color [r, g, b]
 * @param alpha - Opacity of new color [0, 1]
 * @returns Blended color [r, g, b]
 */
export function alphaBlend(
    newColor: [number, number, number],
    oldColor: [number, number, number],
    alpha: number
): [number, number, number] {
    // Clamp alpha to valid range
    const clampedAlpha = Math.max(0, Math.min(1, alpha));

    const r = newColor[0] * clampedAlpha + oldColor[0] * (1 - clampedAlpha);
    const g = newColor[1] * clampedAlpha + oldColor[1] * (1 - clampedAlpha);
    const b = newColor[2] * clampedAlpha + oldColor[2] * (1 - clampedAlpha);

    return [
        Math.max(0, Math.min(1, r)),
        Math.max(0, Math.min(1, g)),
        Math.max(0, Math.min(1, b)),
    ];
}

/**
 * Verify that alpha blending formula is correct
 * 
 * Requirements: 14.5
 * 
 * @param newColor - New color [r, g, b]
 * @param oldColor - Old color [r, g, b]
 * @param alpha - Opacity [0, 1]
 * @param result - Result color [r, g, b]
 * @returns True if result matches alpha blending formula
 */
export function verifyAlphaBlendingFormula(
    newColor: [number, number, number],
    oldColor: [number, number, number],
    alpha: number,
    result: [number, number, number]
): boolean {
    const expected = alphaBlend(newColor, oldColor, alpha);

    const tolerance = 1e-6;
    return (
        Math.abs(result[0] - expected[0]) < tolerance &&
        Math.abs(result[1] - expected[1]) < tolerance &&
        Math.abs(result[2] - expected[2]) < tolerance
    );
}
