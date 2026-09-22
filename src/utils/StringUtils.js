/**
 * String Utility Class (Backend)
 * Centralizes string operations, sanitization, casing, and slug generation.
 */
class StringUtils {
  /**
   * Capitalizes first character of a string.
   * @param {string} [str]
   * @returns {string}
   */
  static capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converts a string to Title Case.
   * @param {string} [str]
   * @returns {string}
   */
  static toTitleCase(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Trims whitespace safely.
   * @param {string} [str]
   * @returns {string}
   */
  static trim(str) {
    return (str || '').trim();
  }

  /**
   * Truncates string to a maximum length with suffix.
   * @param {string} [str]
   * @param {number} [maxLength=50]
   * @param {string} [suffix='...']
   * @returns {string}
   */
  static truncate(str, maxLength = 50, suffix = '...') {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength).trimEnd() + suffix;
  }

  /**
   * Removes control and invisible characters.
   * @param {string} [str]
   * @returns {string}
   */
  static sanitize(str) {
    if (!str) return '';
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
  }

  /**
   * Converts a string into a URL-friendly slug.
   * @param {string} [str]
   * @returns {string}
   */
  static slugify(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = StringUtils;
