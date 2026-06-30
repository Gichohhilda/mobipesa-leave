const pool = require('../db/pool');

/**
 * Calculates working days between two dates (inclusive),
 * excluding weekends and public holidays stored in the DB.
 * 
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate  - YYYY-MM-DD
 * @returns {Promise<number>}
 */
async function calcWorkingDays(startDate, endDate) {
    //  Fetch all holidays from DB as a Set for 0(1) lookup
    const [rows] = await pool.query(
        `SELECT DATE_FORMAT(holiday_date, '%Y-%m-%d') AS d FROM public_holidays`
    );
    const holidays = new Set(rows.map(r => r.d));

    let count = 0;
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (current <= end) {
        const day = current.getDay(); // 0 = Sunday. 6 = Saturday
        const iso = current.toISOString().slice(0, 10);

        if (day !== 0 && day !== 6 && !holidays.has(iso)) {
            count++;
        }
        current.setDate(current.getDate() +1);
    }

return count;
}

module.exports = { calcWorkingDays };