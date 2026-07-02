const express = require('express');
const router  = express.Router();
const { getMe, getMyBalances } = require('../controllers/me.controller');
const { getMyApplications } = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth');

router.get('/',  authenticate, getMe);
router.get('/balances', authenticate, getMyBalances);
router.get('/applications', authenticate, getMyApplications);

module.exports = router;