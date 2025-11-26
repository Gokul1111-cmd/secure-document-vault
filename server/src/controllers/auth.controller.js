const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPrismaClient } = require('../config/prisma');
const env = require('../config/env');
const logger = require('../utils/logger');
const { createAuditLog } = require('../services/auditLog.service');

const MAX_FAILED_ATTEMPTS = 5;

const register = async (req, res, next) => {
  try {
    const { name, email, password, pin } = req.body;

    if (!name || !email || !password || !pin) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, password and pin are required',
      });
    }

    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({
        status: 'error',
        message: 'PIN must be exactly 6 digits',
      });
    }

    const prisma = getPrismaClient();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, env.passwordSaltRounds);
    const viewPinHash = await bcrypt.hash(pin, env.passwordSaltRounds);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        viewPinHash,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      status: 'SUCCESS',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        message: 'User not found',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'LOCKED') {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        status: 'FAILURE',
        message: 'Account locked',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(403).json({
        status: 'error',
        message: 'Account is locked. Contact administrator.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const newFailedAttempts = user.failedAttempts + 1;
      const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newFailedAttempts,
          status: shouldLock ? 'LOCKED' : user.status,
        },
      });

      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        status: 'FAILURE',
        message: `Failed attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS}`,
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      if (shouldLock) {
        logger.warn(`Account locked for user: ${email}`);
        return res.status(403).json({
          status: 'error',
          message: 'Account locked due to multiple failed login attempts',
        });
      }

      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lastLogin: new Date(),
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.jwtAccessSecret,
      { expiresIn: env.jwtAccessExpiresIn },
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      env.jwtRefreshSecret,
      { expiresIn: env.jwtRefreshExpiresIn },
    );

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      status: 'SUCCESS',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required',
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

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await createAuditLog({
        userId: user.id,
        action: 'PASSWORD_VERIFY_FAILED',
        status: 'FAILURE',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid password',
      });
    }

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_VERIFIED',
      status: 'SUCCESS',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'Password verified',
    });
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid refresh token',
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.jwtAccessSecret,
      { expiresIn: env.jwtAccessExpiresIn },
    );

    res.json({
      status: 'success',
      data: { accessToken },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid or expired refresh token',
      });
    }
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    if (!name && !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Name or email is required',
      });
    }

    const prisma = getPrismaClient();

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already in use',
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await createAuditLog({
      userId,
      action: 'PROFILE_UPDATE',
      status: 'SUCCESS',
      message: `Profile updated`,
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long',
      });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      await createAuditLog({
        userId,
        action: 'PASSWORD_CHANGE_FAILED',
        status: 'FAILURE',
        message: 'Invalid current password',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, env.passwordSaltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await createAuditLog({
      userId,
      action: 'PASSWORD_CHANGED',
      status: 'SUCCESS',
      message: 'Password changed successfully',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

const updatePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    const userId = req.user.userId;

    if (!currentPin || !newPin) {
      return res.status(400).json({
        status: 'error',
        message: 'Current PIN and new PIN are required',
      });
    }

    if (!/^\d{6}$/.test(newPin)) {
      return res.status(400).json({
        status: 'error',
        message: 'PIN must be exactly 6 digits',
      });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user.viewPinHash) {
      return res.status(400).json({
        status: 'error',
        message: 'No PIN set for this account',
      });
    }

    const isPinValid = await bcrypt.compare(currentPin, user.viewPinHash);
    if (!isPinValid) {
      await createAuditLog({
        userId,
        action: 'PIN_CHANGE_FAILED',
        status: 'FAILURE',
        message: 'Invalid current PIN',
        ipAddr: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(401).json({
        status: 'error',
        message: 'Current PIN is incorrect',
      });
    }

    const newPinHash = await bcrypt.hash(newPin, env.passwordSaltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { viewPinHash: newPinHash },
    });

    await createAuditLog({
      userId,
      action: 'PIN_CHANGED',
      status: 'SUCCESS',
      message: 'PIN changed successfully',
      ipAddr: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      status: 'success',
      message: 'PIN changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verifyPassword,
  refreshAccessToken,
  updateProfile,
  updatePassword,
  updatePin,
};
