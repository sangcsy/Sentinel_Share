'use strict';

const FileModel = require('../models/file.model');
const SharedLinkModel = require('../models/sharedLink.model');
const S3Service = require('./s3.service');
const { validateFile } = require('../utils/fileValidation');
const { generateStoredKey, generateShareToken } = require('../utils/tokenGenerator');

async function uploadFile({ file, ownerId }) {
  const validation = validateFile(file);
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.statusCode = 400;
    throw err;
  }

  const storedKey = generateStoredKey(file.originalname);

  await S3Service.uploadFile(storedKey, file.buffer, file.mimetype);

  const record = await FileModel.create({
    ownerId,
    originalName: file.originalname,
    storedKey,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  });

  return record;
}

async function listFiles(ownerId) {
  return FileModel.findByOwner(ownerId);
}

async function getDownloadUrl(fileId, requesterId) {
  const file = await FileModel.findById(fileId);

  if (!file) {
    const err = new Error('File not found');
    err.statusCode = 404;
    throw err;
  }

  // Ownership check — only the owner can use this endpoint
  if (String(file.owner_id) !== String(requesterId)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const url = await S3Service.generatePresignedDownloadUrl(file.stored_key, file.original_name);
  return { url, expiresIn: require('../config/env').PRESIGNED_URL_TTL };
}

async function deleteFile(fileId, ownerId) {
  const file = await FileModel.findById(fileId);

  if (!file) {
    const err = new Error('File not found');
    err.statusCode = 404;
    throw err;
  }

  if (String(file.owner_id) !== String(ownerId)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  await FileModel.softDelete(fileId, ownerId);

  // Best-effort S3 deletion — log but do not fail the request
  try {
    await S3Service.deleteFile(file.stored_key);
  } catch (s3Err) {
    console.error('[S3] Failed to delete object:', s3Err.message);
  }

  return { deleted: true };
}

async function createShareLink({ fileId, ownerId, expiresInHours = 24 }) {
  const file = await FileModel.findById(fileId);

  if (!file) {
    const err = new Error('File not found');
    err.statusCode = 404;
    throw err;
  }

  if (String(file.owner_id) !== String(ownerId)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const token = generateShareToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const link = await SharedLinkModel.create({
    fileId,
    token,
    expiresAt,
    createdBy: ownerId,
  });

  return link;
}

async function getSharedDownloadUrl(token) {
  const link = await SharedLinkModel.findValidByToken(token);

  if (!link) {
    const err = new Error('Share link not found or expired');
    err.statusCode = 404;
    throw err;
  }

  const url = await S3Service.generatePresignedDownloadUrl(link.stored_key, link.original_name);
  return { url, expiresIn: require('../config/env').PRESIGNED_URL_TTL };
}

module.exports = {
  uploadFile,
  listFiles,
  getDownloadUrl,
  deleteFile,
  createShareLink,
  getSharedDownloadUrl,
};
