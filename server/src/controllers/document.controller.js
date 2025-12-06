const multer = require('multer');
const { getPrismaClient } = require('../config/prisma');
const { createAuditLog } = require('../services/auditLog.service');
const {
  generateAESKey,
  encryptFileBuffer,
  decryptFileBuffer,
  wrapAESKey,
  unwrapAESKey,
} = require('../services/encryption.service');
const {
  uploadEncryptedFile,
  downloadEncryptedFile,
  deleteFile,
} = require('../services/storage.service');
const bcrypt = require('bcryptjs');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

const uploadDocument = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message || 'File upload failed',
      });
    }

    try {
      if (!req.file) {
        console.warn('[UPLOAD] Missing file field. Received fields:', Object.keys(req.body));
        return res.status(400).json({
          status: 'error',
          message: 'No file provided',
        });
      }

      const userId = req.user.userId;
      const { originalname, mimetype, size, buffer } = req.file;

      const aesKey = generateAESKey();
      const encryptedBuffer = encryptFileBuffer(buffer, aesKey);
      const wrappedKey = wrapAESKey(aesKey);

      const storagePath = await uploadEncryptedFile(encryptedBuffer, originalname, mimetype);

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
    const prisma = getPrismaClient();

    const documents = await prisma.document.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        downloadCount: true,
        lastEditedAt: true,
        lastDownloadAt: true,
        sharedStatus: true,
        createdAt: true,
      },
    });

    res.json({
      status: 'success',
      data: documents,
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

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        ownerUserId: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        downloadCount: true,
        lastEditedAt: true,
        lastDownloadAt: true,
        sharedStatus: true,
        createdAt: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found',
      });
    }

    if (document.ownerUserId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
    }

    res.json({
      status: 'success',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin) {
      return res.status(400).json({
        status: 'error',
        message: 'PIN required for download',
      });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const isPinValid = user.viewPinHash ? await bcrypt.compare(pin, user.viewPinHash) : false;
    if (!isPinValid) {
      await createAuditLog({
        userId,
        action: 'DOWNLOAD_FAILED',
        docId: id,
        status: 'FAILURE',
        message: 'Invalid pin',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid pin',
      });
    }

    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found',
      });
    }

    if (document.ownerUserId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
    }

    const encryptedBuffer = await downloadEncryptedFile(document.storagePath);
    const aesKey = unwrapAESKey(document.encryptedAesKey);
    const decryptedBuffer = decryptFileBuffer(encryptedBuffer, aesKey);

    await prisma.document.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    await createAuditLog({
      userId,
      action: 'DOWNLOAD',
      docId: id,
      status: 'SUCCESS',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.send(decryptedBuffer);
  } catch (error) {
    await createAuditLog({
      userId: req.user.userId,
      action: 'DOWNLOAD_FAILED',
      docId: req.params.id,
      status: 'FAILURE',
      message: error.message,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });
    next(error);
  }
};

const viewDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    if (!pin) {
      return res.status(400).json({
        status: 'error',
        message: 'PIN required to view document',
      });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const isPinValid = user.viewPinHash ? await bcrypt.compare(pin, user.viewPinHash) : false;
    if (!isPinValid) {
      await createAuditLog({
        userId,
        action: 'VIEW_FAILED',
        docId: id,
        status: 'FAILURE',
        message: 'Invalid pin',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid pin',
      });
    }

    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found',
      });
    }

    if (document.ownerUserId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
    }

    const encryptedBuffer = await downloadEncryptedFile(document.storagePath);
    const aesKey = unwrapAESKey(document.encryptedAesKey);
    const decryptedBuffer = decryptFileBuffer(encryptedBuffer, aesKey);

    await createAuditLog({
      userId,
      action: 'VIEW',
      docId: id,
      status: 'SUCCESS',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Set headers for inline viewing (NOT downloading)
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    res.send(decryptedBuffer);
  } catch (error) {
    await createAuditLog({
      userId: req.user.userId,
      action: 'VIEW_FAILED',
      docId: req.params.id,
      status: 'FAILURE',
      message: error.message,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const prisma = getPrismaClient();

    const document = await prisma.document.findUnique({ where: { id } });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found',
      });
    }

    if (document.ownerUserId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
    }

    await deleteFile(document.storagePath);
    await prisma.document.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: 'DELETE',
      docId: id,
      status: 'SUCCESS',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'Document deleted successfully',
    });
  } catch (error) {
    await createAuditLog({
      userId: req.user.userId,
      action: 'DELETE_FAILED',
      docId: req.params.id,
      status: 'FAILURE',
      message: error.message,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });
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
