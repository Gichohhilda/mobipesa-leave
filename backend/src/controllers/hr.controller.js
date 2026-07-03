const bcrypt = require('bcrypt');
const pool   = require('../db/pool');

// GET /api/hr/users
async function getUsers(req, res) {
  try {
    const { search, role, is_active, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role)      { where += ' AND u.role = ?';      params.push(role); }
    if (is_active !== undefined) { where += ' AND u.is_active = ?'; params.push(is_active); }

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.is_active,
              u.manager_id, m.full_name AS manager_name, u.created_at
       FROM users u
       LEFT JOIN users m ON m.id = u.manager_id
       ${where}
       ORDER BY u.full_name
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u ${where}`, params
    );

    return res.status(200).json({ data: rows, page: Number(page), limit: Number(limit), total });

  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// POST /api/hr/users
async function createUser(req, res) {
  try {
    const { full_name, email, phone, role, manager_id } = req.body;
    const actorId = req.user.sub;

    if (!full_name || !email || !phone || !role) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'full_name, email, phone, and role are required' } });
    }
    if (!['EMPLOYEE', 'MANAGER', 'HR_ADMIN'].includes(role)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role' } });
    }

    // Check email unique
    const [[existing]] = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'A user with this email already exists' } });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hash = await bcrypt.hash(tempPassword, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, manager_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone, hash, role, manager_id || null]
    );

    const newUserId = result.insertId;

    // Create leave balances for current year
    const year = new Date().getFullYear();
    const [types] = await pool.query(`SELECT id, default_days_per_year FROM leave_types WHERE is_active = 1`);
    for (const type of types) {
      await pool.query(
        `INSERT IGNORE INTO leave_balances (user_id, leave_type_id, year, allocated_days)
         VALUES (?, ?, ?, ?)`,
        [newUserId, type.id, year, type.default_days_per_year ?? 0]
      );
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
       VALUES (?, 'USER_CREATED', 'users', ?, ?)`,
      [actorId, newUserId, JSON.stringify({ full_name, email, role })]
    );

    // Queue welcome SMS
    await pool.query(
      `INSERT INTO notifications (user_id, application_id, channel, payload, status)
       VALUES (?, NULL, 'SMS', ?, 'QUEUED')`,
      [newUserId, `Welcome to Mobipesa Leave System! Your email is ${email}. Please log in and change your password.`]
    );

    return res.status(201).json({ id: newUserId, full_name, email, role });

  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// PATCH /api/hr/users/:id
async function updateUser(req, res) {
  try {
    const targetId = req.params.id;
    const actorId  = req.user.sub;
    const { is_active, role, manager_id } = req.body;

    const [[before]] = await pool.query(
      `SELECT id, full_name, role, is_active, manager_id FROM users WHERE id = ?`, [targetId]
    );
    if (!before) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

    const updates = [];
    const params  = [];

    if (is_active !== undefined) { updates.push('is_active = ?');  params.push(is_active); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (manager_id !== undefined){ updates.push('manager_id = ?'); params.push(manager_id); }

    if (updates.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } });
    }

    params.push(targetId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, 'USER_UPDATED', 'users', ?, ?, ?)`,
      [actorId, targetId, JSON.stringify(before), JSON.stringify(req.body)]
    );

    const [[updated]] = await pool.query(`SELECT id, full_name, email, role, is_active, manager_id FROM users WHERE id = ?`, [targetId]);
    return res.status(200).json(updated);

  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// POST /api/hr/balance-adjustments
async function adjustBalance(req, res) {
  try {
    const actorId = req.user.sub;
    const { user_id, leave_type_id, year, delta_days, reason } = req.body;

    if (!user_id || !leave_type_id || !year || delta_days === undefined || !reason || reason.trim() === '') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'user_id, leave_type_id, year, delta_days, and reason are all required' } });
    }

    const [[balance]] = await pool.query(
      `SELECT * FROM leave_balances WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [user_id, leave_type_id, year]
    );
    if (!balance) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Balance record not found for this user/type/year' } });
    }

    await pool.query(
      `UPDATE leave_balances SET allocated_days = allocated_days + ? WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [delta_days, user_id, leave_type_id, year]
    );

    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, 'BALANCE_ADJUSTED', 'leave_balances', ?, ?, ?)`,
      [
        actorId, balance.id,
        JSON.stringify({ allocated_days: balance.allocated_days }),
        JSON.stringify({ allocated_days: balance.allocated_days + Number(delta_days), reason })
      ]
    );

    const [[updated]] = await pool.query(
      `SELECT * FROM leave_balances WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [user_id, leave_type_id, year]
    );

    return res.status(200).json(updated);

  } catch (err) {
    console.error('adjustBalance error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// GET /api/hr/applications
async function getAllApplications(req, res) {
  try {
    const { status, user_id, from, to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (status)  { where += ' AND la.status = ?'; params.push(status); }
    if (user_id) { where += ' AND la.user_id = ?'; params.push(user_id); }
    if (from) { where += ' AND la.start_date >= ?'; params.push(from); }
    if (to) { where += ' AND la.end_date <= ?';   params.push(to); }

    const [rows] = await pool.query(
      `SELECT la.id, la.start_date, la.end_date, la.working_days,
              la.status, la.reason, la.manager_comment, la.decided_at, la.created_at,
              lt.name AS leave_type,
              u.full_name AS employee_name, u.email AS employee_email,
              m.full_name AS manager_name
       FROM leave_applications la
       JOIN leave_types lt ON lt.id = la.leave_type_id
       JOIN users u ON u.id = la.user_id
       LEFT JOIN users m ON m.id = la.manager_id
       ${where}
       ORDER BY la.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leave_applications la ${where}`, params
    );

    return res.status(200).json({ data: rows, page: Number(page), limit: Number(limit), total });

  } catch (err) {
    console.error('getAllApplications error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

module.exports = { getUsers, createUser, updateUser, adjustBalance, getAllApplications };