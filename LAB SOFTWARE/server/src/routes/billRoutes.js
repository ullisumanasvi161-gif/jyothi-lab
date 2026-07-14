const express = require('express');
const billController = require('../controllers/billController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', billController.getAll);
router.get('/payments', billController.getPaymentsHistory);
router.get('/claims', billController.getClaims);
router.get('/dues', billController.getDuesSummary);
router.get('/patient/:patient_id/dues', billController.getPatientDues);
router.get('/number/:bill_number', billController.getByNumber);
router.get('/:id', billController.getById);
router.post('/', authorize(['Admin', 'Receptionist']), billController.create);
router.post('/:id/payments', authorize(['Admin', 'Receptionist']), billController.addPayment);
router.put('/:id/claim-status', authorize(['Admin', 'Receptionist']), billController.updateClaimStatus);

module.exports = router;
