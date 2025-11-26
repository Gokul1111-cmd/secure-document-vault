const { getPrismaClient } = require('../config/prisma');

const createAuditLog = async (data) => {
  try {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        docId: data.docId || null,
        ipAddr: data.ipAddr || null,
        userAgent: data.userAgent || null,
        status: data.status || 'SUCCESS',
        message: data.message || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

const getAuditLogs = async (filters = {}) => {
  const prisma = getPrismaClient();
  
  const where = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.status) where.status = filters.status;
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
    if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
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
    orderBy: {
      timestamp: 'desc',
    },
    take: filters.limit || 100,
    skip: filters.offset || 0,
  });

  return logs;
};

module.exports = {
  createAuditLog,
  getAuditLogs,
};
