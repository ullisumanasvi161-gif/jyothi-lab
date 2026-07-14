const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', reportController.getAll);
router.get('/:id', reportController.getById);
router.put('/:id/results', authorize(['Admin', 'Pathologist', 'Lab Technician']), reportController.saveValues);
router.put('/:id/approve', authorize(['Admin', 'Pathologist']), reportController.approve);
router.get('/:id/pdf', reportController.downloadPDF); // Public/Authenticated display

module.exports = router;
