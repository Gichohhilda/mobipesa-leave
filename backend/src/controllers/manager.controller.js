const pool = require('../db/pool');

// GET /api/manager/queue
async function getQueue(req, res) {
  try {
    const managerId = req.user.sub;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT la.id, la.start_date, la.end_date, la.working_days,
              la.status, la.reason, la.created_at,
              lt.name AS leave_type,
              u.id AS employee_id, u.full_name AS employee_name, u.phone AS employee_phone
       FROM leave_applications la
       JOIN leave_types lt ON lt.id = la.leave_type_id
       JOIN users u ON u.id = la.user_id
       WHERE la.manager_id = ? AND la.status = 'PENDING'
       ORDER BY la.created_at ASC
       LIMIT ? OFFSET ?`,
      [managerId, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM leave_applications
       WHERE manager_id = ? AND status = 'PENDING'`,
      [managerId]
    );

    return res.status(200).json({ data: rows, page: Number(page), limit: Number(limit), total });

  } catch (err) {
    console.error('getQueue error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

// POST /api/manager/applications/:id/decision
async function makeDecision(req, res) {
  try {
    const managerId     = req.user.sub;
    const applicationId = req.params.id;
    if (!req.body) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is required' }});
    }
    const { decision, comment } = req.body;

    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'decision must be APPROVED or REJECTED' } });
    }

    if (decision === 'REJECTED' && (!comment || comment.trim() === '')) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'comment is required when rejecting' } });
    }

    const [[app]] = await pool.query(
      `SELECT la.*, lt.name AS leave_type_name, lt.default_days_per_year,
              u.full_name AS employee_name
       FROM leave_applications la
       JOIN leave_types lt ON lt.id = la.leave_type_id
       JOIN users u ON u.id = la.user_id
       WHERE la.id = ?`,
      [applicationId]
    );

    if (!app) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }
    if (app.manager_id !== managerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You are not the assigned manager for this application' } });
    }
    if (app.status !== 'PENDING') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'This application has already been decided' } });
    }

    const before = { status: app.status, used_days: null, pending_days: null };

    // Update application status
    await pool.query(
      `UPDATE leave_applications
       SET status = ?, manager_comment = ?, decided_at = NOW()
       WHERE id = ?`,
      [decision, comment || null, applicationId]
    );

    const year = new Date(app.start_date).getFullYear();

    if (decision === 'APPROVED') {
      // Move days from pending to used
      if (app.default_days_per_year !== null) {
        await pool.query(
          `UPDATE leave_balances
           SET pending_days = pending_days - ?,
               used_days    = used_days    + ?
           WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
          [app.working_days, app.working_days, app.user_id, app.leave_type_id, year]
        );
      }
      // SMS employee
      await pool.query(
        `INSERT INTO notifications (user_id, application_id, channel, payload, status)
         VALUES (?, ?, 'SMS', ?, 'QUEUED')`,
        [app.user_id, applicationId,
         `Your ${app.leave_type_name} leave application #${applicationId} (${app.start_date} to ${app.end_date}) has been APPROVED.`]
      );
    } else {
      // REJECTED — restore pending_days
      if (app.default_days_per_year !== null) {
        await pool.query(
          `UPDATE leave_balances
           SET pending_days = pending_days - ?
           WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
          [app.working_days, app.user_id, app.leave_type_id, year]
        );
      }
      // SMS employee with reason
      await pool.query(
        `INSERT INTO notifications (user_id, application_id, channel, payload, status)
         VALUES (?, ?, 'SMS', ?, 'QUEUED')`,
        [app.user_id, applicationId,
         `Your ${app.leave_type_name} leave application #${applicationId} has been REJECTED. Reason: ${comment}`]
      );
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json)
       VALUES (?, ?, 'leave_applications', ?, ?, ?)`,
      [
        managerId,
        decision === 'APPROVED' ? 'APPLICATION_APPROVED' : 'APPLICATION_REJECTED',
        applicationId,
        JSON.stringify({ status: 'PENDING' }),
        JSON.stringify({ status: decision, comment: comment || null })
      ]
    );

    return res.status(200).json({ id: Number(applicationId), status: decision });

  } catch (err) {
    console.error('makeDecision error:', err);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' } });
  }
}

module.exports = { getQueue, makeDecision };