/**
 * Calculate the number of days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} - Number of days between the dates
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const normalizedDate1 = new Date(date1);
  const normalizedDate2 = new Date(date2);
  
  // Set both dates to midnight to ignore time
  normalizedDate1.setHours(0, 0, 0, 0);
  normalizedDate2.setHours(0, 0, 0, 0);
  
  // Calculate the difference in days
  return Math.floor((normalizedDate2 - normalizedDate1) / oneDay);
};

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if the date is today
 */
const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  // Set both dates to midnight to ignore time
  today.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);
  
  return today.getTime() === checkDate.getTime();
};

/**
 * Get the start of day for a given date
 * @param {Date} date - Date to get start of day for
 * @returns {Date} - Start of day
 */
const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get the start of a period ago
 * @param {Date} date - Base date
 * @param {number} amount - Amount to subtract
 * @param {string} unit - Unit to subtract (day, week, month)
 * @returns {Date} - Resulting date
 */
const startOfPeriodAgo = (date = new Date(), amount = 1, unit = 'day') => {
  const result = new Date(date);
  
  switch (unit.toLowerCase()) {
    case 'day':
      result.setDate(result.getDate() - amount);
      break;
    case 'week':
      result.setDate(result.getDate() - (amount * 7));
      break;
    case 'month':
      result.setMonth(result.getMonth() - amount);
      break;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
  
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date
 */
const formatYYYYMMDD = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

module.exports = {
  daysBetween,
  isToday,
  startOfDay,
  startOfPeriodAgo,
  formatYYYYMMDD
};
