const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

// Set up Multer for Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ai_social/posts',
    resource_type: 'auto', // Allows both image and video
  },
});

// Validation filter
const fileFilter = (req, file, cb) => {
  const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoMimeTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  const allowedAudioMimeTypes = ['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'];
  
  if (allowedImageMimeTypes.includes(file.mimetype) || allowedVideoMimeTypes.includes(file.mimetype) || allowedAudioMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only standard images, videos, and audio are allowed.'), false);
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
