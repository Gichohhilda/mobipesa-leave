const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email and password are required' } });
    }

    const [[user]] = await pool.query(
      `SELECT id, full_name, email, role, manager_id, password_hash, is_active
       FROM users WHERE email = ?`,
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: { code: 'ACCOUNT_INACTIVE', message: 'Account is deactivated. Contact HR.' } });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, manager_id: user.manager_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.status(200).json({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

async function resetPin(req, res) {
  try {
    const { current_password, new_pin } = req.body;
    const userId = req.user.sub;

    if (!current_password || !new_pin) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'current_password and new_pin are required' } });
    }

    if (!/^\d{4}$/.test(new_pin)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'new_pin must be exactly 4 digits' } });
    }

    const [[user]] = await pool.query(
      `SELECT password_hash FROM users WHERE id = ?`, [userId]
    );

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } });
    }

    const pinHash = await bcrypt.hash(new_pin, 10);
    await pool.query(`UPDATE users SET ivr_pin_hash = ? WHERE id = ?`, [pinHash, userId]);

    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
       VALUES (?, 'PIN_RESET', 'users', ?)`,
      [userId, userId]
    );

    return res.status(200).json({ message: 'PIN updated successfully' });
  } catch (err) {
    console.error('reset-pin error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

module.exports = { login, resetPin };