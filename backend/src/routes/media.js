const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/media');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Validation filter
const fileFilter = (req, file, cb) => {
  const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoMimeTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  
  if (allowedImageMimeTypes.includes(file.mimetype) || allowedVideoMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only standard images and videos are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size (videos)
  }
});

// Protect all media routes
router.use(auth);

// Endpoint to upload media
router.post('/upload', upload.single('media'), mediaController.uploadMedia);

// Secure endpoint to fetch media by filename (validates authorization)
router.get('/:filename', mediaController.serveMedia);

module.exports = router;
