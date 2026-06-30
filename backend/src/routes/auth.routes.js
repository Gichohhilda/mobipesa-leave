const express             = require('express');
const router              = express.Router();
const { login, resetPin } = require('../controllers/auth.controller');
const { authenticate }    = require('../middleware/auth');

router.post('/login',     login);
router.post('/reset-pin', authenticate, resetPin);

module.exports = router;