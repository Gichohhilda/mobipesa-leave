const express = require('express');
const router  = express.Router();
const { getQueue, makeDecision } = require('../controllers/manager.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/queue', authenticate, requireRole('MANAGER', 'HR_ADMIN'), getQueue);
router.post('/applications/:id/decision', authenticate, requireRole('MANAGER'), makeDecision);

module.exports = router;