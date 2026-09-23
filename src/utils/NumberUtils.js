/**
 * Number Utility Class (Backend)
 * Centralizes numeric formatting, rounding, bounds checking, and spatial distance calculation.
 */
class NumberUtils {
  /**
   * Formats a monetary amount into a localized currency string.
   * @param {number|string} [amount]
   * @param {string} [symbol='₹']
   * @param {number} [fractionDigits=2]
   * @returns {string}
   */
  static formatCurrency(amount, symbol = '₹', fractionDigits = 2) {
    if (amount === undefined || amount === null || amount === '') return `${symbol}0.00`;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return `${symbol}0.00`;

    const formatted = num.toLocaleString('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });

    return `${symbol}${formatted}`;
  }

  /**
   * Formats a numeric value with standard thousands separators.
   * @param {number|string} [value]
   * @returns {string}
   */
  static formatNumber(value) {
    if (value === undefined || value === null || value === '') return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString();
  }

  /**
   * Restricts a number to be within specified bounds [min, max].
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Rounds a number to a specified number of decimal places.
   * @param {number} value
   * @param {number} [decimals=2]
   * @returns {number}
   */
  static round(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Safely parses any value to a number, returning fallback if invalid.
   * @param {*} value
   * @param {number} [fallback=0]
   * @returns {number}
   */
  static parseNumber(value, fallback = 0) {
    if (typeof value === 'number') return isNaN(value) ? fallback : value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  }

  /**
   * Calculates great-circle distance between two points on Earth using the Haversine formula.
   * @param {number} lat1 - Latitude of point 1 in decimal degrees
   * @param {number} lon1 - Longitude of point 1 in decimal degrees
   * @param {number} lat2 - Latitude of point 2 in decimal degrees
   * @param {number} lon2 - Longitude of point 2 in decimal degrees
   * @returns {number} Distance in meters rounded to 2 decimal places
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
  }
}

module.exports = NumberUtils;
