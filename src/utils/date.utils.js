const DateTime = require('./DateTime');

/**
 * Backward-compatible date utility functions delegating to DateTime class.
 */
module.exports = {
  getStartOfDay: (date) => DateTime.getStartOfDay(date),
  getEndOfDay: (date) => DateTime.getEndOfDay(date),
  isToday: (date) => DateTime.isToday(date),
  formatDate: (date) => DateTime.formatDate(date),
  DateTime,
};
