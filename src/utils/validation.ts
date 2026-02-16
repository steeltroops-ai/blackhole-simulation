/**
 * Input validation utilities
 * Requirement 8.3: Clamp all parameter inputs to valid ranges and validate numeric inputs
 */

/**
 * Clamps a numeric value to a specified range and validates it's not NaN or Infinity
 *
 * @param value - The value to clamp and validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default value to use if input is invalid
 * @returns Clamped and validated value
 */
export function clampAndValidate(
  value: number,
  min: number,
  max: number,
  defaultValue: number,
): number {
  // Validate numeric inputs are not NaN or Infinity
  if (!isFinite(value) || isNaN(value)) {
    console.warn(
      `Invalid numeric input detected: ${value}, using default: ${defaultValue}`,
    );
    return defaultValue;
  }

  // Clamp to valid range
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates that a number is finite and not NaN
 *
 * @param value - The value to validate
 * @returns True if the value is a valid finite number
 */
export function isValidNumber(value: number): boolean {
  return isFinite(value) && !isNaN(value);
}

/**
 * Validates touch coordinates are within canvas bounds
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @returns True if coordinates are within bounds
 */
export function isWithinCanvasBounds(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  return (
    isValidNumber(x) &&
    isValidNumber(y) &&
    x >= 0 &&
    x <= canvasWidth &&
    y >= 0 &&
    y <= canvasHeight
  );
}
