/**
 * General mathematical utility functions
 */

/**
 * Clamp a value between a minimum and maximum
 * @param value The value to clamp
 * @param min Minimum value (default: 0)
 * @param max Maximum value (default: 100)
 * @returns Clamped value
 */
export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));

/**
 * Linear interpolation between two values
 * @param start Starting value
 * @param end Ending value
 * @param factor Interpolation factor (0-1)
 * @returns Interpolated value
 */
export const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * clamp(factor, 0, 1);

/**
 * Map a value from one range to another
 * @param value Input value
 * @param inMin Input range minimum
 * @param inMax Input range maximum
 * @param outMin Output range minimum
 * @param outMax Output range maximum
 * @returns Mapped value
 */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  const factor = (value - inMin) / (inMax - inMin);
  return lerp(outMin, outMax, factor);
};

/**
 * Round a number to a specified number of decimal places
 * @param value Number to round
 * @param decimals Number of decimal places (default: 0)
 * @returns Rounded number
 */
export const roundTo = (value: number, decimals = 0): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const stdDev = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

export const average = (values: number[]): number | null => {
  const nums = values.filter(v => typeof v === 'number' && isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};
