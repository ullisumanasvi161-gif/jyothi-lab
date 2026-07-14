const express = require('express');
const doctorController = require('../controllers/doctorController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', doctorController.getAll);
router.get('/referrals/monthly', doctorController.getMonthlyReferralsSummary);
router.get('/:id', doctorController.getById);
router.get('/:id/commissions', doctorController.getCommissions);
router.post('/', authorize(['Admin', 'Receptionist']), doctorController.create);
router.put('/:id', authorize(['Admin']), doctorController.update);
router.delete('/:id', authorize(['Admin']), doctorController.delete);

module.exports = router;
