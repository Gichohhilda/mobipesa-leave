const pool            = require('../db/pool');
const { calcWorkingDays } = require('../utils/WorkingDays');

// POST /api/applications
async function submitApplication(req, res) {
  try {
    const { leave_type_id, start_date, end_date, reason } = req.body;
    const userId = req.user.sub;

    // Validation
    if (!leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'leave_type_id, start_date, and end_date are required' } });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'start_date must be before or equal to end_date' } });
    }

    if (new Date(start_date) < new Date(new Date().toDateString())) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'start_date cannot be in the past' } });
    }

    // Check leave type exists
    const [[leaveType]] = await pool.query(
      `SELECT id, name, default_days_per_year FROM leave_types WHERE id = ? AND is_active = 1`,
      [leave_type_id]
    );
    if (!leaveType) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or inactive leave type' } });
    }

    // Calculate working days
    const workingDays = await calcWorkingDays(start_date, end_date);
    if (workingDays === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'The selected dates contain no working days' } });
    }

    // Check balance (skip for Unpaid which has NULL default_days_per_year)
    if (leaveType.default_days_per_year !== null) {
      const year = new Date(start_date).getFullYear();
      const [[balance]] = await pool.query(
        `SELECT (allocated_days - used_days - pending_days) AS remaining
         FROM leave_balances
         WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
        [userId, leave_type_id, year]
      );

      if (!balance || balance.remaining < workingDays) {
        return res.status(409).json({
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: `You only have ${balance ? balance.remaining : 0} days remaining for this leave type`
          }
        });
      }
    }

    // Get user's manager
    const [[user]] = await pool.query(
      `SELECT manager_id FROM users WHERE id = ?`, [userId]
    );

    // Insert application
    const [result] = await pool.query(
      `INSERT INTO leave_applications
         (user_id, leave_type_id, start_date, end_date, working_days, reason, status, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [userId, leave_type_id, start_date, end_date, workingDays, reason || null, user.manager_id]
    );

    const applicationId = result.insertId;

    // Update pending_days in balance
    if (leaveType.default_days_per_year !== null) {
      const year = new Date(start_date).getFullYear();
      await pool.query(
        `UPDATE leave_balances SET pending_days = pending_days + ?
         WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
        [workingDays, userId, leave_type_id, year]
      );
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
       VALUES (?, 'APPLICATION_SUBMITTED', 'leave_applications', ?, ?)`,
      [userId, applicationId, JSON.stringify({ leave_type_id, start_date, end_date, working_days: workingDays })]
    );

    // SMS notification (logged to notifications table)
    await pool.query(
      `INSERT INTO notifications (user_id, application_id, channel, payload, status)
       VALUES (?, ?, 'SMS', ?, 'QUEUED')`,
      [userId, applicationId, `Your leave application #${applicationId} for ${leaveType.name} (${start_date} to ${end_date}) has been submitted.`]
    );

    if (user.manager_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, application_id, channel, payload, status)
         VALUES (?, ?, 'SMS', ?, 'QUEUED')`,
        [user.manager_id, applicationId, `New leave application #${applicationId} from your team member requires your approval.`]
      );
    }

    return res.status(201).json({
      id: applicationId,
      status: 'PENDING',
      working_days: workingDays,
      message: 'Application submitted successfully'
    });

  } catch (err) {
    console.error('submitApplication error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// GET /api/me/applications
async function getMyApplications(req, res) {
  try {
    const userId = req.user.sub;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE la.user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND la.status = ?';
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT la.id, lt.name AS leave_type, la.start_date, la.end_date,
              la.working_days, la.status, la.reason, la.manager_comment,
              la.decided_at, la.created_at
       FROM leave_applications la
       JOIN leave_types lt ON lt.id = la.leave_type_id
       ${whereClause}
       ORDER BY la.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leave_applications la ${whereClause}`,
      params
    );

    return res.status(200).json({ data: rows, page: Number(page), limit: Number(limit), total });

  } catch (err) {
    console.error('getMyApplications error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// DELETE /api/applications/:id  (cancel)
async function cancelApplication(req, res) {
  try {
    const userId        = req.user.sub;
    const applicationId = req.params.id;

    const [[app]] = await pool.query(
      `SELECT id, user_id, status, working_days, leave_type_id, start_date
       FROM leave_applications WHERE id = ?`,
      [applicationId]
    );

    if (!app) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }
    if (app.user_id !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only cancel your own applications' } });
    }
    if (app.status !== 'PENDING') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Only PENDING applications can be cancelled' } });
    }

    await pool.query(
      `UPDATE leave_applications SET status = 'CANCELLED' WHERE id = ?`,
      [applicationId]
    );

    // Restore pending_days
    const year = new Date(app.start_date).getFullYear();
    await pool.query(
      `UPDATE leave_balances SET pending_days = pending_days - ?
       WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
      [app.working_days, userId, app.leave_type_id, year]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
       VALUES (?, 'APPLICATION_CANCELLED', 'leave_applications', ?)`,
      [userId, applicationId]
    );

    return res.status(200).json({ id: Number(applicationId), status: 'CANCELLED' });

  } catch (err) {
    console.error('cancelApplication error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

module.exports = { submitApplication, getMyApplications, cancelApplication };