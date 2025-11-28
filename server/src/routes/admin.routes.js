const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/users', adminController.getUsers);
router.get('/stats', adminController.getStats);
router.post('/users/:userId/lock', adminController.lockUser);
router.post('/users/:userId/unlock', adminController.unlockUser);
router.post('/users/:userId/reset-password', adminController.requestPasswordReset);
router.get('/logs', adminController.getAuditLogs);
router.get('/documents', adminController.getAllDocuments);
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;