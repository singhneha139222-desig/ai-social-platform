const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const logger = require('../utils/logger');
const FileType = require('file-type');

const uploadDir = path.join(__dirname, '../../uploads/media');

/**
 * Handle media upload
 * Simply saves the file via multer and returns the relative path/filename
 */
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No media file provided' });
    }

    // Validate magic bytes
    const typeFromContent = await FileType.fromFile(req.file.path);
    if (!typeFromContent || (!typeFromContent.mime.startsWith('image/') && !typeFromContent.mime.startsWith('video/'))) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Invalid file content' });
    }

    // Determine type
    const isVideo = req.file.mimetype.startsWith('video/');
    const type = isVideo ? 'video' : 'image';

    res.status(200).json({
      success: true,
      data: {
        filename: req.file.filename,
        type: type,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size
      }
    });
  } catch (error) {
    logger.error('Error uploading media:', error);
    res.status(500).json({ success: false, message: 'Server error during upload' });
  }
};

/**
 * Serve media securely
 * Ensures that rejected or pending media is not publicly accessible
 */
exports.serveMedia = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // Prevent path traversal
    if (!filePath.startsWith(uploadDir)) {
      return res.status(403).json({ success: false, message: 'Forbidden access' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    // Find the post associated with this media
    const post = await Post.findOne({ 'media.url': filename });

    // If no post is associated yet, it might be mid-creation. We allow the uploader to view it.
    // However, without a DB record tying the file to the user, we have to either rely on obscurity 
    // or add a Media collection. For this FYP, we'll allow access if there's no post yet.
    if (post) {
      // If the post is not published, check if the requester is the author or an admin
      if (post.moderationStatus !== 'published') {
        const isAuthor = post.author.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';
        
        if (!isAuthor && !isAdmin) {
          return res.status(403).json({ success: false, message: 'Access denied to this media' });
        }
      }
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error serving media:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
