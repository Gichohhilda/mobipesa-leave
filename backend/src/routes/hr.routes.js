const express = require('express');
const router  = express.Router();
const { getUsers, createUser, updateUser, adjustBalance, getAllApplications } = require('../controllers/hr.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const hrOnly = [authenticate, requireRole('HR_ADMIN')];

router.get('/users', ...hrOnly, getUsers);
router.post('/users', ...hrOnly, createUser);
router.patch('/users/:id', ...hrOnly, updateUser);
router.post('/balance-adjustments',...hrOnly, adjustBalance);
router.get('/applications', ...hrOnly, getAllApplications);

module.exports = router;