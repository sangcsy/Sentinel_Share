'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const {
  upload,
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
  shareFile,
  shareValidation,
} = require('../controllers/files.controller');

const router = Router();

// All file routes require a valid JWT
router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', listFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);
router.post('/:id/share', shareValidation, shareFile);

module.exports = router;
