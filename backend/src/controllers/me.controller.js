const pool = require('../db/pool');

async function getMe(req, res) {
  try {
    const [[user]] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role,
              m.id AS manager_id, m.full_name AS manager_name
       FROM users u
       LEFT JOIN users m ON m.id = u.manager_id
       WHERE u.id = ?`,
      [req.user.sub]
    );

    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

    return res.status(200).json({
      id:        user.id,
      full_name: user.full_name,
      email:     user.email,
      phone:     user.phone,
      role:      user.role,
      manager:   user.manager_id ? { id: user.manager_id, full_name: user.manager_name } : null,
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

async function getMyBalances(req, res) {
  try {
    const year = req.query.year || new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT lt.name AS leave_type,
              lb.allocated_days,
              lb.used_days,
              lb.pending_days,
              (lb.allocated_days - lb.used_days - lb.pending_days) AS remaining_days
       FROM leave_balances lb
       JOIN leave_types lt ON lt.id = lb.leave_type_id
       WHERE lb.user_id = ? AND lb.year = ?
       ORDER BY lt.name`,
      [req.user.sub, year]
    );

    return res.status(200).json({ year: Number(year), balances: rows });
  } catch (err) {
    console.error('getMyBalances error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

module.exports = { getMe, getMyBalances };