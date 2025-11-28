const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getPrismaClient } = require('../config/prisma');
const { createAuditLog } = require('../services/auditLog.service');
const {
  generateAESKey,
  createEncryptStream,
  createDecryptStream,
  wrapAESKey,
  unwrapAESKey,
} = require('../services/encryption.service');
const {
  uploadEncryptedStream,
  getDownloadStream,
  deleteFile,
} = require('../services/storage.service');
const bcrypt = require('bcryptjs');

// USE DISK STORAGE TO PREVENT MEMORY CRASHES
const upload = multer({
  dest: 'uploads/', // Temp folder
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

const uploadDocument = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file provided' });

    const filePath = req.file.path;

    try {
      const userId = req.user.userId;
      const { originalname, mimetype, size } = req.file;

      // 1. Generate Keys
      const aesKey = generateAESKey();
      const wrappedKey = wrapAESKey(aesKey);

      // 2. Setup Streams
      const fileReadStream = fs.createReadStream(filePath);
      const { cipher, output } = createEncryptStream(aesKey);

      // 3. Pipe: File -> Encrypt -> Firebase
      fileReadStream.pipe(cipher);
      const storagePath = await uploadEncryptedStream(output, originalname, mimetype);

      // 4. Save Metadata to DB
      const prisma = getPrismaClient();
      const document = await prisma.document.create({
        data: {
          ownerUserId: userId,
          fileName: originalname,
          fileSize: size,
          mimeType: mimetype,
          storagePath,
          encryptedAesKey: wrappedKey,
        },
      });

      // 5. Cleanup Temp File
      await fs.promises.unlink(filePath);

      await createAuditLog({
        userId,
        action: 'UPLOAD',
        docId: document.id,
        status: 'SUCCESS',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        status: 'success',
        message: 'Document uploaded successfully',
        data: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          createdAt: document.createdAt,
        },
      });
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
      
      await createAuditLog({
        userId: req.user.userId,
        action: 'UPLOAD_FAILED',
        status: 'FAILURE',
        message: error.message,
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });
      next(error);
    }
  });
};

const getDocuments = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const prisma = getPrismaClient();
    
    // Fetch documents AND aggregate stats in parallel
    const [documents, total, aggregations] = await Promise.all([
        prisma.document.findMany({
            where: { ownerUserId: userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
            select: {
              id: true, fileName: true, fileSize: true, mimeType: true,
              downloadCount: true, lastEditedAt: true, lastDownloadAt: true,
              sharedStatus: true, createdAt: true,
            },
        }),
        prisma.document.count({ where: { ownerUserId: userId } }),
        prisma.document.aggregate({
            where: { ownerUserId: userId },
            _sum: { fileSize: true, downloadCount: true }
        })
    ]);

    res.json({
      status: 'success',
      data: {
          documents,
          stats: {
             totalFiles: total,
             totalSize: aggregations._sum.fileSize || 0,
             totalDownloads: aggregations._sum.downloadCount || 0
          },
          pagination: {
              total,
              page: parseInt(page),
              pages: Math.ceil(total / take)
          }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getDocumentMetadata = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const prisma = getPrismaClient();
    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) return res.status(404).json({ status: 'error', message: 'Document not found' });
    if (document.ownerUserId !== userId) return res.status(403).json({ status: 'error', message: 'Access denied' });

    res.json({ status: 'success', data: document });
  } catch (error) {
    next(error);
  }
};

// HELPER FOR DOWNLOAD/VIEW
const streamDocument = async (req, res, disposition, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin) return res.status(400).json({ status: 'error', message: 'PIN required' });

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    const isPinValid = user.viewPinHash ? await bcrypt.compare(pin, user.viewPinHash) : false;
    if (!isPinValid) {
      await createAuditLog({
        userId, action: `${disposition.toUpperCase()}_FAILED`, docId: id, status: 'FAILURE',
        message: 'Invalid pin', ipAddr: req.ip, userAgent: req.get('user-agent'),
      });
      return res.status(401).json({ status: 'error', message: 'Invalid pin' });
    }

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return res.status(404).json({ status: 'error', message: 'Document not found' });
    if (document.ownerUserId !== userId) return res.status(403).json({ status: 'error', message: 'Access denied' });

    // Stream Setup
    const aesKey = unwrapAESKey(document.encryptedAesKey);
    const downloadStream = getDownloadStream(document.storagePath);
    const decryptTransform = createDecryptStream(aesKey);

    // Set Headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${document.fileName}"`);

    // Pipe: Storage -> Decrypt -> Response
    downloadStream.pipe(decryptTransform).pipe(res);

    downloadStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).json({ status: 'error', message: 'Stream error' });
    });

    decryptTransform.on('error', (err) => {
      console.error('Decryption error:', err);
      // If headers sent, stream will just cut off, simpler to let client handle
    });

    if (disposition === 'attachment') {
      await prisma.document.update({
        where: { id },
        data: { downloadCount: { increment: 1 }, lastDownloadAt: new Date() },
      });
    }

    await createAuditLog({
      userId, action: disposition === 'attachment' ? 'DOWNLOAD' : 'VIEW', docId: id, status: 'SUCCESS',
      ipAddr: req.ip, userAgent: req.get('user-agent'),
    });

  } catch (error) {
    next(error);
  }
};

const downloadDocument = (req, res, next) => streamDocument(req, res, 'attachment', next);
const viewDocument = (req, res, next) => streamDocument(req, res, 'inline', next);

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const prisma = getPrismaClient();

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return res.status(404).json({ status: 'error', message: 'Document not found' });

    if (document.ownerUserId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    await deleteFile(document.storagePath);
    await prisma.document.delete({ where: { id } });

    await createAuditLog({
      userId, action: 'DELETE', docId: id, status: 'SUCCESS',
      ipAddr: req.ip, userAgent: req.get('user-agent'),
    });

    res.json({ status: 'success', message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentMetadata,
  downloadDocument,
  viewDocument,
  deleteDocument,
};