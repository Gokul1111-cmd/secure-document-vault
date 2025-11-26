const { Router } = require('express');
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

router.use(authMiddleware);

router.post('/upload', documentController.uploadDocument);
router.get('/', documentController.getDocuments);
router.get('/:id/metadata', documentController.getDocumentMetadata);
router.post('/:id/view', documentController.viewDocument);
router.post('/:id/download', documentController.downloadDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
