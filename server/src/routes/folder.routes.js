const { Router } = require('express');
const folderController = require('../controllers/folder.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = Router();

// All folder routes require authentication
router.use(authMiddleware);

router.post('/', folderController.createFolder);
router.get('/contents', folderController.getFolderContents);
router.patch('/:id', folderController.renameFolder);
router.delete('/:id', folderController.deleteFolder);
router.post('/move', folderController.moveItems);

module.exports = router;
