const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getPrismaClient } = require('../config/prisma');
const { createAuditLog } = require('../services/auditLog.service');
const { deleteFile } = require('../services/storage.service');
const env = require('../config/env');

const getUsers = async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        failedAttempts: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const prisma = getPrismaClient();

    const [
      totalUsers,
      totalDocuments,
      totalDownloads,
      activeUsers,
      lockedUsers,
      recentUploads,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.document.aggregate({ _sum: { downloadCount: true } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'LOCKED' } }),
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalDocuments,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        activeUsers,
        lockedUsers,
        recentUploads,
      },
    });
  } catch (error) {
    next(error);
  }
};

const lockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot lock admin users',
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'LOCKED' },
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'USER_LOCKED',
      status: 'SUCCESS',
      message: `Locked user ${user.email}`,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'User locked successfully',
    });
  } catch (error) {
    next(error);
  }
};

const unlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        failedAttempts: 0,
      },
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'USER_UNLOCKED',
      status: 'SUCCESS',
      message: `Unlocked user ${user.email}`,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'User unlocked successfully',
    });
  } catch (error) {
    next(error);
  }
};

const requestPasswordReset = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    await createAuditLog({
      userId: req.user.userId,
      action: 'PASSWORD_RESET_REQUEST',
      status: 'SUCCESS',
      message: `Reset requested for ${user.email}`,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    const resetLink = `${env.clientOrigin}/reset-password?token=${resetToken}`;

    res.json({
      status: 'success',
      message: 'Password reset initiated',
      data: {
        resetLink,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { action, status, startDate, endDate, limit = 100, offset = 0 } = req.query;

    const prisma = getPrismaClient();
    const where = {};

    if (action) where.action = action;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        document: {
          select: {
            id: true,
            fileName: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      status: 'success',
      data: {
        logs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllDocuments = async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const { limit = 100, offset = 0 } = req.query;

    const documents = await prisma.document.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.document.count();
    const totalSize = await prisma.document.aggregate({
      _sum: { fileSize: true },
    });
    const totalDownloads = await prisma.document.aggregate({
      _sum: { downloadCount: true },
    });

    res.json({
      status: 'success',
      data: {
        documents,
        total,
        totalSize: totalSize._sum.fileSize || 0,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prisma = getPrismaClient();

    // 1. Find user and their documents
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { documents: true }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // 2. Prevent deleting Admins
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete admin users',
      });
    }

    // 3. Delete physical files from Firebase/Storage
    if (user.documents && user.documents.length > 0) {
      const deletePromises = user.documents.map(doc =>
        deleteFile(doc.storagePath).catch(err => 
          // Log but continue if file missing in storage
          console.error(`Failed to delete file ${doc.storagePath}:`, err.message)
        )
      );
      await Promise.all(deletePromises);
    }

    // 4. Delete user from DB (Cascades to documents & logs)
    await prisma.user.delete({ where: { id: userId } });

    // 5. Log the action
    await createAuditLog({
      userId: req.user.userId,
      action: 'USER_DELETED',
      status: 'SUCCESS',
      message: `Deleted user ${user.email}`,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'User and associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getStats,
  lockUser,
  unlockUser,
  requestPasswordReset,
  getAuditLogs,
  getAllDocuments,
  deleteUser,
};