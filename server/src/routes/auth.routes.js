const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshAccessToken);
router.post('/verify-password', authMiddleware, authController.verifyPassword);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/password', authMiddleware, authController.updatePassword);
router.put('/pin', authMiddleware, authController.updatePin);

module.exports = router;
