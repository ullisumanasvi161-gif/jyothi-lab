const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// All WhatsApp routes require authentication
router.use(authMiddleware);

// Statistics & Dashboard
router.get('/stats', whatsappController.getStats);

// Delivery Logs
router.get('/logs', whatsappController.getLogs);

// Approved reports not yet sent
router.get('/unsent', whatsappController.getUnsentReports);

// Send & Retry
router.post('/send/:reportId', authorize(['Admin', 'Receptionist', 'Pathologist']), whatsappController.sendReport);
router.post('/bulk', authorize(['Admin', 'Receptionist']), whatsappController.bulkSend);
router.post('/retry/:logId', authorize(['Admin', 'Receptionist']), whatsappController.retryDelivery);

// Templates CRUD
router.get('/templates', whatsappController.getTemplates);
router.post('/templates', authorize(['Admin']), whatsappController.createTemplate);
router.put('/templates/:id', authorize(['Admin']), whatsappController.updateTemplate);
router.delete('/templates/:id', authorize(['Admin']), whatsappController.deleteTemplate);

module.exports = router;
