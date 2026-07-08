const express = require('express');
const router  = express.Router();
const { getMe, getMyBalances } = require('../controllers/me.controller');
const { getMyApplications } = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth');
const pool = require('../db/pool');

router.get('/', authenticate, getMe);
router.get('/balances', authenticate, getMyBalances);
router.get('/applications', authenticate, getMyApplications);

// Leave types for the apply form dropdown
router.get('/leave-types', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, name, default_days_per_year FROM leave_types WHERE is_active = 1 ORDER BY name`);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
});

module.exports = router;