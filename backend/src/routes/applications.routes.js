const express = require('express');
const router  = express.Router();
const { submitApplication, cancelApplication } = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth');

router.post('/',    authenticate, submitApplication);
router.delete('/:id', authenticate, cancelApplication);

module.exports = router;