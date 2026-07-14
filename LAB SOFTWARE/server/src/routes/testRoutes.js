const express = require('express');
const testController = require('../controllers/testController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', testController.getAll);
router.get('/:id', testController.getById);
router.post('/', authorize(['Admin', 'Pathologist', 'Lab Technician']), testController.create);
router.put('/:id', authorize(['Admin', 'Pathologist', 'Lab Technician']), testController.update);
router.delete('/:id', authorize(['Admin']), testController.delete);

module.exports = router;
