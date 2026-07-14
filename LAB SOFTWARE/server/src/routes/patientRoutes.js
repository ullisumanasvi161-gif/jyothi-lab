const express = require('express');
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
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

router.use(authMiddleware); // All patient endpoints require login

router.post('/upload', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const filePath = `/uploads/${req.file.filename}`;
  return res.json({ filePath });
});

router.get('/', patientController.getAll);
router.get('/uhid/:uhid', patientController.getByUHID);
router.get('/:id', patientController.getById);
router.get('/:id/history', patientController.getHistory);
router.post('/', patientController.create);
router.put('/:id', patientController.update);
router.delete('/:id', authorize(['Admin']), patientController.delete);

module.exports = router;
