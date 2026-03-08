const { getPrismaClient } = require('../config/prisma');

// CREATE FOLDER
const createFolder = async (req, res, next) => {
    try {
        const { name, parentId = null } = req.body;
        const userId = req.user.userId;

        if (!name || name.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'Folder name is required' });
        }

        const prisma = getPrismaClient();

        // If parentId is provided, verify it exists and belongs to the user
        if (parentId) {
            const parentFolder = await prisma.folder.findUnique({
                where: { id: parentId }
            });

            if (!parentFolder || parentFolder.ownerUserId !== userId) {
                return res.status(404).json({ status: 'error', message: 'Parent folder not found' });
            }
        }

        const folder = await prisma.folder.create({
            data: {
                name: name.trim(),
                ownerUserId: userId,
                parentId: parentId || null
            }
        });

        res.status(201).json({
            status: 'success',
            data: folder
        });
    } catch (error) {
        console.error('[createFolder Error]:', error);
        next(error);
    }
};

// GET FOLDERS & DOCUMENTS (Current Level)
const getFolderContents = async (req, res, next) => {
    try {
        const { parentId = null } = req.query;
        const userId = req.user.userId;
        const prisma = getPrismaClient();

        // Get folders at this level
        const folders = await prisma.folder.findMany({
            where: {
                ownerUserId: userId,
                parentId: parentId === 'null' || parentId === '' ? null : parentId
            },
            orderBy: { name: 'asc' }
        });

        // Get documents at this level
        const documents = await prisma.document.findMany({
            where: {
                ownerUserId: userId,
                folderId: parentId === 'null' || parentId === '' ? null : parentId
            },
            orderBy: { fileName: 'asc' }
        });

        // If we are inside a folder, get its info for breadcrumbs
        let currentFolder = null;
        if (parentId && parentId !== 'null') {
            currentFolder = await prisma.folder.findUnique({
                where: { id: parentId },
                include: { parent: true }
            });
        }

        res.json({
            status: 'success',
            data: {
                folders,
                documents,
                currentFolder
            }
        });
    } catch (error) {
        console.error('[getFolderContents Error]:', error);
        next(error);
    }
};

// RENAME FOLDER
const renameFolder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user.userId;

        if (!name || name.trim() === '') {
            return res.status(400).json({ status: 'error', message: 'New name is required' });
        }

        const prisma = getPrismaClient();

        const folder = await prisma.folder.findUnique({ where: { id } });
        if (!folder || folder.ownerUserId !== userId) {
            return res.status(404).json({ status: 'error', message: 'Folder not found' });
        }

        const updatedFolder = await prisma.folder.update({
            where: { id },
            data: { name: name.trim() }
        });

        res.json({
            status: 'success',
            data: updatedFolder
        });
    } catch (error) {
        console.error('[renameFolder Error]:', error);
        next(error);
    }
};

// DELETE FOLDER
const deleteFolder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const prisma = getPrismaClient();

        const folder = await prisma.folder.findUnique({
            where: { id },
            include: { subfolders: true, documents: true }
        });

        if (!folder || folder.ownerUserId !== userId) {
            return res.status(404).json({ status: 'error', message: 'Folder not found' });
        }

        // Policy: Moving items to root before deletion or recursive delete?
        // Let's implement recursive delete for subfolders but orphan documents to their current parent or root.
        // For now, let's just do an simple recursive delete of the folder itself.
        // documents will have folderId set to null via SetNull in schema (if we configured it)
        // Actually, prisma onDelete: SetNull only works if the field is optional.

        await prisma.folder.delete({
            where: { id }
        });

        res.json({
            status: 'success',
            message: 'Folder deleted and contents moved to root'
        });
    } catch (error) {
        console.error('[deleteFolder Error]:', error);
        next(error);
    }
};

// MOVE ITEMS
const moveItems = async (req, res, next) => {
    try {
        const { documentIds = [], folderIds = [], targetFolderId = null } = req.body;
        const userId = req.user.userId;
        const prisma = getPrismaClient();

        // Verify target folder if not root
        if (targetFolderId) {
            const target = await prisma.folder.findUnique({ where: { id: targetFolderId } });
            if (!target || target.ownerUserId !== userId) {
                return res.status(404).json({ status: 'error', message: 'Target folder not found' });
            }
        }

        // Move documents
        if (documentIds.length > 0) {
            await prisma.document.updateMany({
                where: {
                    id: { in: documentIds },
                    ownerUserId: userId
                },
                data: { folderId: targetFolderId }
            });
        }

        // Move folders (cannot move a folder into itself or its own subfolders)
        if (folderIds.length > 0) {
            // Basic check: skip if target is one of the folders to move
            const validFolderIds = folderIds.filter(fid => fid !== targetFolderId);

            if (validFolderIds.length > 0) {
                await prisma.folder.updateMany({
                    where: {
                        id: { in: validFolderIds },
                        ownerUserId: userId
                    },
                    data: { parentId: targetFolderId }
                });
            }
        }

        res.json({
            status: 'success',
            message: 'Items moved successfully'
        });
    } catch (error) {
        console.error('[moveItems Error]:', error);
        next(error);
    }
};

module.exports = {
    createFolder,
    getFolderContents,
    renameFolder,
    deleteFolder,
    moveItems
};
