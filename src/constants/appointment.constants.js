/**
 * Appointment Domain Constants & Configuration
 */

const APPOINTMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const APPOINTMENT_STATUSES = Object.values(APPOINTMENT_STATUS);

const BUSINESS_HOURS = {
  START: '09:00',
  END: '20:00',
  START_MINUTES: 9 * 60, // 540
  END_MINUTES: 20 * 60, // 1200
};

/**
 * Converts HH:mm time string to minutes from midnight.
 * @param {string} timeStr - e.g. "09:30"
 * @returns {number}
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return NaN;
  return hours * 60 + minutes;
};

/**
 * Converts minutes from midnight to HH:mm string.
 * @param {number} totalMinutes
 * @returns {string}
 */
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

module.exports = {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUSES,
  BUSINESS_HOURS,
  timeToMinutes,
  minutesToTime,
};
