const express = require('express');
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(authorize(['Admin'])); // Settings modifications are restricted to Admin

router.get('/', settingController.getAll);
router.put('/', settingController.update);

module.exports = router;
