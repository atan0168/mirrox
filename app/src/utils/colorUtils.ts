/**
 * Color utility functions for health and progress visualizations
 */

/**
 * Get color for progress bars and health metrics based on value
 * @param value Percentage value (0-100)
 * @returns Hex color string
 */
export const getBarColor = (value: number): string => {
  if (value >= 85) return '#22C55E'; // fresh green (excellent)
  if (value >= 70) return '#2DD4BF'; // aqua / teal (good, cool modern vibe)
  if (value >= 55) return '#FACC15'; // golden yellow (caution)
  if (value >= 40) return '#F97316'; // modern orange (warning)
  return '#EF4444'; // clean red (critical)
};

/**
 * Get health status color based on percentage
 * @param percentage Health percentage (0-100)
 * @returns Object with color and status description
 */
export const getHealthStatus = (
  percentage: number
): {
  color: string;
  status: string;
  description: string;
} => {
  if (percentage >= 85) {
    return {
      color: '#22C55E',
      status: 'Excellent',
      description: 'Optimal health levels',
    };
  }
  if (percentage >= 70) {
    return {
      color: '#2DD4BF',
      status: 'Good',
      description: 'Above average health',
    };
  }
  if (percentage >= 55) {
    return {
      color: '#FACC15',
      status: 'Fair',
      description: 'Room for improvement',
    };
  }
  if (percentage >= 40) {
    return {
      color: '#F97316',
      status: 'Poor',
      description: 'Below optimal levels',
    };
  }
  return {
    color: '#EF4444',
    status: 'Critical',
    description: 'Immediate attention needed',
  };
};

/**
 * Convert hex color to rgba with opacity
 * @param hex Hex color string (with or without #)
 * @param opacity Opacity value (0-1)
 * @returns RGBA color string
 */
export const hexToRgba = (hex: string, opacity: number): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

