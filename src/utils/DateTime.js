/**
 * DateTime Utility Class (Backend)
 * Centralizes date/time manipulation, UTC boundary calculations, and duration parsing.
 */
class DateTime {
  /**
   * Returns the start of day (00:00:00.000) for a given date or today in UTC.
   * @param {Date|string|number} [date=new Date()]
   * @returns {Date}
   */
  static getStartOfDay(date = new Date()) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Returns the end of day (23:59:59.999) for a given date or today in UTC.
   * @param {Date|string|number} [date=new Date()]
   * @returns {Date}
   */
  static getEndOfDay(date = new Date()) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  }

  /**
   * Checks if a given date falls within "today" in UTC.
   * @param {Date|string|number} date
   * @returns {boolean}
   */
  static isToday(date) {
    const target = new Date(date);
    const start = this.getStartOfDay();
    const end = this.getEndOfDay();
    return target >= start && target <= end;
  }

  /**
   * Formats a date into ISO date string (YYYY-MM-DD).
   * @param {Date|string|number} [date=new Date()]
   * @returns {string}
   */
  static formatDate(date = new Date()) {
    return new Date(date).toISOString().split('T')[0];
  }

  /**
   * Returns today's date formatted as local "YYYY-MM-DD".
   * @returns {string}
   */
  static getTodayLocalDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Returns today's date formatted as UTC "YYYY-MM-DD".
   * @returns {string}
   */
  static getTodayUtcDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Returns current time as "HH:mm" in 24-hour format.
   * @returns {string}
   */
  static getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Converts a 24-hour time string ("HH:mm") into 12-hour format with AM/PM (e.g. "09:00" -> "9:00 AM", "20:00" -> "8:00 PM").
   * @param {string} [timeStr]
   * @returns {string}
   */
  static formatTime12h(timeStr) {
    if (!timeStr) return '';
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return String(timeStr);

    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  /**
   * Calculates duration between two "HH:mm" time strings or Date instances.
   * @param {string|Date} startTime
   * @param {string|Date} endTime
   * @returns {string}
   */
  static calculateDuration(startTime, endTime) {
    try {
      let startMinutes = 0;
      let endMinutes = 0;

      if (startTime instanceof Date && endTime instanceof Date) {
        const diffMs = endTime.getTime() - startTime.getTime();
        const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        startMinutes = 0;
        endMinutes = diffMinutes;
      } else if (typeof startTime === 'string' && typeof endTime === 'string') {
        const [startH, startM] = startTime.split(':').map((v) => parseInt(v, 10));
        const [endH, endM] = endTime.split(':').map((v) => parseInt(v, 10));
        startMinutes = (startH || 0) * 60 + (startM || 0);
        endMinutes = (endH || 0) * 60 + (endM || 0);
      }

      const totalDiff = Math.max(0, endMinutes - startMinutes);
      const hours = Math.floor(totalDiff / 60);
      const mins = totalDiff % 60;

      if (hours > 0 && mins > 0) {
        return `${hours} hr ${mins} mins`;
      } else if (hours > 0) {
        return `${hours} hr${hours > 1 ? 's' : ''}`;
      } else {
        return `${mins} min${mins !== 1 ? 's' : ''}`;
      }
    } catch {
      return 'N/A';
    }
  }
}

module.exports = DateTime;
