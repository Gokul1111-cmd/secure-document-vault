const { Router } = require('express');

const healthRouter = require('./health.routes');
const authRouter = require('./auth.routes');
const documentRouter = require('./document.routes');
const adminRouter = require('./admin.routes');
const folderRouter = require('./folder.routes');

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/docs', documentRouter);
router.use('/admin', adminRouter);
router.use('/folders', folderRouter);

module.exports = router;
