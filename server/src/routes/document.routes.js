const { Router } = require('express');
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// Public route for accessing shared documents (no auth required)
router.post('/shared/:token', documentController.accessSharedDocument);

// Protected routes (require authentication)
router.use(authMiddleware);

router.post('/upload', documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/shares/logs', documentController.getShareLogs);
router.delete('/shares/bulk', documentController.bulkDeleteShares);
router.post('/shares/:id/revoke', documentController.revokeShare);
router.post('/shares/:id/extend', documentController.extendShare);
router.get('/:id/metadata', documentController.getDocumentMetadata);
router.post('/:id/view', documentController.viewDocument);
router.post('/:id/download', documentController.downloadDocument);
router.post('/:id/share', documentController.createShareLink);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
