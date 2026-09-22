/**
 * Centralized Date Utilities
 * Enforces predictable UTC-based boundary calculations for dashboard metric queries.
 */

/**
 * Returns the start of day (00:00:00.000) for a given date or today in UTC.
 * @param {Date|string|number} [date=new Date()]
 * @returns {Date}
 */
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Returns the end of day (23:59:59.999) for a given date or today in UTC.
 * @param {Date|string|number} [date=new Date()]
 * @returns {Date}
 */
const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
};

/**
 * Checks if a given date falls within "today" in UTC.
 * @param {Date|string|number} date
 * @returns {boolean}
 */
const isToday = (date) => {
  const target = new Date(date);
  const start = getStartOfDay();
  const end = getEndOfDay();
  return target >= start && target <= end;
};

/**
 * Formats a date into ISO date string (YYYY-MM-DD).
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
const formatDate = (date = new Date()) => {
  return new Date(date).toISOString().split('T')[0];
};

module.exports = {
  getStartOfDay,
  getEndOfDay,
  isToday,
  formatDate,
};
