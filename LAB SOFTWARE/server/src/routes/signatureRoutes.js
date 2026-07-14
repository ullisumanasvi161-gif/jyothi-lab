const express = require('express');
const signatureController = require('../controllers/signatureController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/signatures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = express.Router();

router.use(authMiddleware); // All endpoints require login

router.get('/', signatureController.getAll);
router.post('/', authorize(['Admin', 'Pathologist']), upload.single('signature'), signatureController.create);
router.put('/:id', authorize(['Admin', 'Pathologist']), upload.single('signature'), signatureController.update);
router.delete('/:id', authorize(['Admin']), signatureController.delete);

module.exports = router;
