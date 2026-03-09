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
const { verifyHash } = require('../utils/hash');

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
      const { folderId } = req.body;

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
          folderId: folderId || null,
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
    const {
      page = 1,
      limit = 10,
      search = '',
      fileType = '',
      dateRange = '',
      sortBy = 'date-desc',
      folderId = ''
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const prisma = getPrismaClient();

    // Build where clause with filters
    const where = { ownerUserId: userId };

    // Search by filename
    if (search) {
      where.fileName = { contains: search, mode: 'insensitive' };
    } else if (folderId) {
      // If NOT searching, respect the folder navigation
      // 'root' means explicitly null folderId
      where.folderId = folderId === 'root' ? null : folderId;
    }

    // Filter by file type
    if (fileType) {
      const mimeTypeMap = {
        pdf: 'application/pdf',
        doc: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        txt: 'text/plain',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const mimeTypes = mimeTypeMap[fileType];
      if (mimeTypes) {
        where.mimeType = Array.isArray(mimeTypes)
          ? { in: mimeTypes }
          : { equals: mimeTypes };
      }
    }

    // Filter by date range
    if (dateRange) {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      if (startDate) {
        where.createdAt = { gte: startDate };
      }
    }

    // Build order by clause
    let orderBy = { createdAt: 'desc' };

    switch (sortBy) {
      case 'date-asc':
        orderBy = { createdAt: 'asc' };
        break;
      case 'date-desc':
        orderBy = { createdAt: 'desc' };
        break;
      case 'name-asc':
        orderBy = { fileName: 'asc' };
        break;
      case 'name-desc':
        orderBy = { fileName: 'desc' };
        break;
      case 'size-asc':
        orderBy = { fileSize: 'asc' };
        break;
      case 'size-desc':
        orderBy = { fileSize: 'desc' };
        break;
    }

    // Fetch documents AND aggregate stats in parallel
    const [documents, total, aggregations] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true, fileName: true, fileSize: true, mimeType: true,
          downloadCount: true, lastEditedAt: true, lastDownloadAt: true,
          sharedStatus: true, createdAt: true,
        },
      }),
      prisma.document.count({ where }),
      prisma.document.aggregate({
        where: { ownerUserId: userId }, // Stats for all user documents, not filtered
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

    const isPinValid = user.viewPinHash ? await verifyHash(pin, user.viewPinHash) : false;
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

    // Audit BEFORE delete — after deletion the docId FK reference no longer exists
    await createAuditLog({
      userId, action: 'DELETE', docId: null, status: 'SUCCESS',
      message: `Deleted document: ${document.fileName}`,
      ipAddr: req.ip, userAgent: req.get('user-agent'),
    });

    await prisma.document.delete({ where: { id } });

    res.json({ status: 'success', message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// CREATE SHARE LINK
const createShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      expiresIn,
      expiresAt: customExpiresAt,
      password,
      allowDownload = false,
      burnAfterRead = false,
      maxAccess = null
    } = req.body;
    const userId = req.user.userId;

    const prisma = getPrismaClient();

    // Verify document ownership
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) return res.status(404).json({ status: 'error', message: 'Document not found' });
    if (document.ownerUserId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    // Calculate expiration time
    let expiresAt;
    if (customExpiresAt) {
      expiresAt = new Date(customExpiresAt);
    } else {
      const expiryMap = {
        '30s': 30 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 1 * 60 * 60 * 1000,
        '2h': 2 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '2d': 2 * 24 * 60 * 60 * 1000,
      };

      const expiryMs = typeof expiresIn === 'number' ? expiresIn : (expiryMap[expiresIn] || expiryMap['1d']);
      expiresAt = new Date(Date.now() + expiryMs);
    }

    // Generate random share token
    const crypto = require('crypto');
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Hash password if provided
    const { hashValue } = require('../utils/hash');
    const sharePasswordHash = password ? await hashValue(password) : null;

    // Rule Enforcement: if burn-after-reading is on, max access becomes 1
    const actualMaxAccess = burnAfterRead ? 1 : maxAccess;

    // Create share record
    const share = await prisma.documentShare.create({
      data: {
        documentId: id,
        ownerUserId: userId,
        shareToken,
        sharePassword: sharePasswordHash,
        expiresAt,
        allowDownload,
        burnAfterRead,
        maxAccess: actualMaxAccess,
      },
    });

    // Update document shared status
    await prisma.document.update({
      where: { id },
      data: { sharedStatus: true },
    });

    await createAuditLog({
      userId,
      action: 'SHARE_CREATED',
      docId: id,
      status: 'SUCCESS',
      message: `Share link created, expires at ${expiresAt.toISOString()}`,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      status: 'success',
      message: 'Share link created successfully',
      data: {
        shareToken: share.shareToken,
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ACCESS SHARED DOCUMENT (PUBLIC)
const accessSharedDocument = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const prisma = getPrismaClient();

    // Find share by token
    const share = await prisma.documentShare.findUnique({
      where: { shareToken: token },
      include: { document: true },
    });

    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const logShareEvent = async (eventType, shareId = null) => {
      if (!shareId) return;
      await prisma.documentShareEvent.create({
        data: { shareId, eventType, ipAddress, userAgent }
      });
    };

    if (!share) {
      return res.status(404).json({ status: 'error', message: 'Share link not found or expired' });
    }

    await logShareEvent('LINK_OPENED', share.id);

    // Check if expired
    if (new Date() > share.expiresAt) {
      await logShareEvent('BLOCKED', share.id);
      return res.status(410).json({ status: 'error', message: 'Share link has expired' });
    }

    // Check if inactive
    if (!share.isActive) {
      await logShareEvent('BLOCKED', share.id);
      return res.status(403).json({ status: 'error', message: 'Share link has been deactivated' });
    }

    // Check max access
    if (share.maxAccess !== null && share.accessCount >= share.maxAccess) {
      await logShareEvent('BLOCKED', share.id);
      return res.status(403).json({ status: 'error', message: 'Maximum access count reached for this link' });
    }

    // Verify password if required
    if (share.sharePassword) {
      if (!password || password.trim() === '') {
        return res.status(401).json({ status: 'error', message: 'Password required', requiresPassword: true });
      }

      const isPasswordValid = await verifyHash(password, share.sharePassword);

      if (!isPasswordValid) {
        await logShareEvent('PASSWORD_FAIL', share.id);
        return res.status(401).json({ status: 'error', message: 'Invalid password' });
      }
      await logShareEvent('PASSWORD_SUCCESS', share.id);
    }

    // Update access count and log events
    const isDownload = req.query.action === 'download' && share.allowDownload;
    const eventType = isDownload ? 'DOWNLOADED' : 'VIEWED';

    // Auto-revoke only AFTER the last valid access is consumed (newAccessCount > maxAccess)
    // Using >= here was the off-by-one bug: it deactivated the link during the last valid access.
    const newAccessCount = share.accessCount + 1;
    let isActive = share.isActive;
    if (share.maxAccess !== null && newAccessCount >= share.maxAccess) {
      isActive = false;
    }

    await prisma.$transaction([
      prisma.documentShare.update({
        where: { id: share.id },
        data: { accessCount: { increment: 1 }, isActive },
      }),
      prisma.documentShareEvent.create({
        data: { shareId: share.id, eventType, ipAddress, userAgent }
      }),
      prisma.auditLog.create({
        data: {
          userId: share.ownerUserId,
          action: 'SHARE_ACCESSED',
          docId: share.document.id,
          status: 'SUCCESS',
          message: `Shared document accessed via token (${eventType})`,
          ipAddr: ipAddress,
          userAgent: userAgent,
        }
      })
    ]);

    const document = share.document;
    const unwrappedKey = unwrapAESKey(document.encryptedAesKey);
    const encryptedStream = await getDownloadStream(document.storagePath);
    const decryptTransform = createDecryptStream(unwrappedKey);

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('X-Burn-After-Read', share.burnAfterRead ? 'true' : 'false');
    res.setHeader('X-Expires-At', share.expiresAt.toISOString());

    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    }

    encryptedStream.pipe(decryptTransform).pipe(res);

    encryptedStream.on('error', (err) => {
      console.error('Shared stream read error:', err);
      if (!res.headersSent) res.status(500).json({ status: 'error', message: 'Stream error' });
    });

    decryptTransform.on('error', (err) => {
      console.error('Shared stream decrypt error:', err);
    });
  } catch (error) {
    console.error('[accessSharedDocument Error]:', error);
    next(error);
  }
};

// GET SHARE LOGS
const getShareLogs = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const prisma = getPrismaClient();

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [shares, total] = await Promise.all([
      prisma.documentShare.findMany({
        where: { ownerUserId: userId },
        include: {
          document: { select: { fileName: true } },
          events: { orderBy: { timestamp: 'desc' }, take: 10 } // Limited events per share in paginated list
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.documentShare.count({ where: { ownerUserId: userId } })
    ]);

    const formattedShares = shares.map(share => {
      const opens = share.events.filter(e => e.eventType === 'LINK_OPENED').length;
      const views = share.events.filter(e => e.eventType === 'VIEWED').length;
      const downloads = share.events.filter(e => e.eventType === 'DOWNLOADED').length;
      const failed = share.events.filter(e => e.eventType === 'PASSWORD_FAIL' || e.eventType === 'BLOCKED').length;

      return {
        id: share.id,
        documentId: share.documentId,
        fileName: share.document.fileName,
        token: share.shareToken,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        isActive: share.isActive,
        accessCount: share.accessCount,
        maxAccess: share.maxAccess,
        allowDownload: share.allowDownload,
        burnAfterRead: share.burnAfterRead,
        stats: { opens, views, downloads, failed },
        events: share.events
      };
    });

    res.json({
      status: 'success',
      data: {
        shares: formattedShares,
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

// REVOKE SHARE
const revokeShare = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const prisma = getPrismaClient();

    const share = await prisma.documentShare.findUnique({ where: { id } });
    if (!share) return res.status(404).json({ status: 'error', message: 'Share not found' });
    if (share.ownerUserId !== userId) return res.status(403).json({ status: 'error', message: 'Access denied' });

    await prisma.documentShare.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ status: 'success', message: 'Share revoked successfully' });
  } catch (error) {
    next(error);
  }
};

// BULK DELETE SHARES
const bulkDeleteShares = async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of share IDs
    const userId = req.user.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No IDs provided' });
    }

    const prisma = getPrismaClient();

    // Verify all shares belong to the user
    const shares = await prisma.documentShare.findMany({
      where: {
        id: { in: ids },
        ownerUserId: userId
      }
    });

    if (shares.length !== ids.length) {
      return res.status(403).json({ status: 'error', message: 'Access denied: Some shares do not belong to you' });
    }

    // Delete in transaction (events will be deleted via cascade if set, but let's be explicit if not)
    await prisma.$transaction([
      prisma.documentShareEvent.deleteMany({
        where: { shareId: { in: ids } }
      }),
      prisma.documentShare.deleteMany({
        where: { id: { in: ids } }
      })
    ]);

    res.json({ status: 'success', message: `${ids.length} share links deleted successfully` });
  } catch (error) {
    next(error);
  }
};

// EXTEND SHARE
const extendShare = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newExpiresAt } = req.body;
    const userId = req.user.userId;
    const prisma = getPrismaClient();

    const share = await prisma.documentShare.findUnique({ where: { id } });
    if (!share) return res.status(404).json({ status: 'error', message: 'Share not found' });
    if (share.ownerUserId !== userId) return res.status(403).json({ status: 'error', message: 'Access denied' });

    const expiresAt = newExpiresAt ? new Date(newExpiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000); // add 1 day default

    await prisma.documentShare.update({
      where: { id },
      data: { expiresAt, isActive: true },
    });

    res.json({ status: 'success', message: 'Share extended successfully' });
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
  createShareLink,
  accessSharedDocument,
  getShareLogs,
  revokeShare,
  extendShare,
  bulkDeleteShares,
};