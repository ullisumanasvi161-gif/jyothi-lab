const express = require('express');
const exportController = require('../controllers/exportController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = Router = express.Router();

router.use(authMiddleware);
router.use(authorize(['Admin', 'Pathologist'])); // Restrict data downloads to Admin and Pathologist roles

router.get('/transactions', exportController.exportTransactions);
router.get('/tests', exportController.exportTests);

module.exports = router;
