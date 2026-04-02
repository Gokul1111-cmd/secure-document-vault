import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { documentAPI, folderAPI } from '../services/api.js';
import { Upload, FileText, Download, Eye, HardDrive, Shield, Trash2, ChevronLeft, ChevronRight, Search, Share2, Copy, Link, Clock, Folder, FolderPlus, Move } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import OfficeViewer from '../components/ui/OfficeViewer.jsx';
import WatermarkOverlay from '../components/ui/WatermarkOverlay.jsx';

function MyDocuments() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [selectedAction, setSelectedAction] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [viewerState, setViewerState] = useState({ isOpen: false, url: '', fileName: '', isOffice: false });

    // Share state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [shareExpiry, setShareExpiry] = useState('1h');
    const [shareExpiryMode, setShareExpiryMode] = useState('preset');
    const [shareCustomDate, setShareCustomDate] = useState('');
    const [sharePassword, setSharePassword] = useState('');
    const [allowDownload, setAllowDownload] = useState(false);
    const [burnAfterRead, setBurnAfterRead] = useState(false);
    const [maxAccess, setMaxAccess] = useState('');
    const [requireEmailVerification, setRequireEmailVerification] = useState(false);
    const [sharingLoading, setSharingLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');

    // Folder State
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [itemsToMove, setItemsToMove] = useState({ documents: [], folders: [] });
    const [targetFolderId, setTargetFolderId] = useState(null);
    const [availableFolders, setAvailableFolders] = useState([]);

    useEffect(() => {
        fetchDocuments();
    }, [page, searchQuery, fileTypeFilter, dateFilter, sortBy, currentFolderId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const contentsRes = await folderAPI.getContents(currentFolderId);
            setFolders(contentsRes.data.data.folders);
            setCurrentFolder(contentsRes.data.data.currentFolder);

            const response = await documentAPI.getAll({
                page,
                limit: 10,
                search: searchQuery,
                fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined,
                dateRange: dateFilter !== 'all' ? dateFilter : undefined,
                sortBy: sortBy,
                folderId: currentFolderId || 'root'
            });

            setDocuments(response.data.data.documents);
            setTotalPages(response.data.data.pagination.pages);
        } catch (error) {
            showToast('Failed to load documents', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            setSharingLoading(true);
            await folderAPI.create({ name: newFolderName, parentId: currentFolderId });
            showToast('Folder created successfully', 'success');
            setNewFolderName('');
            setShowNewFolderModal(false);
            fetchDocuments();
        } catch (error) {
            showToast('Failed to create folder', 'error');
        } finally {
            setSharingLoading(false);
        }
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        await handleFileUpload(acceptedFiles[0]);
    }, [currentFolderId]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        }
    });

    const handleFileUpload = async (file) => {
        setIsUploading(true);
        setUploadProgress(10);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (currentFolderId) formData.append('folderId', currentFolderId);

            await documentAPI.upload(formData);
            setUploadProgress(100);
            setTimeout(() => {
                setIsUploading(false);
                setShowUploadModal(false);
                fetchDocuments();
                showToast('Document uploaded successfully', 'success');
            }, 500);
        } catch (error) {
            setIsUploading(false);
            showToast('Upload failed', 'error');
        }
    };

    const handleDownload = (document) => {
        setSelectedDocument(document);
        setSelectedAction('download');
        setPin('');
        setPinError('');
        setShowPinModal(true);
    };

    const handleView = (document) => {
        setSelectedDocument(document);
        setSelectedAction('view');
        setPin('');
        setPinError('');
        setShowPinModal(true);
    };

    const handlePinSubmit = async () => {
        if (!/^[0-9]{6}$/.test(pin)) {
            setPinError('Enter your 6-digit PIN');
            return;
        }
        setActionLoading(true);
        try {
            const method = selectedAction === 'view' ? documentAPI.view : documentAPI.download;
            const response = await method(selectedDocument.id, pin);
            const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: selectedDocument.mimeType });
            const url = window.URL.createObjectURL(blob);

            if (selectedAction === 'view') {
                const isOffice = !!selectedDocument.fileName.toLowerCase().match(/\.(doc|docx|xls|xlsx|csv|ppt|pptx)$/);
                setViewerState({
                    isOpen: true,
                    url: url,
                    fileName: selectedDocument.fileName,
                    isOffice
                });
                showToast('Document ready', 'success');
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedDocument.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('Download started', 'success');
            }
            setShowPinModal(false);
        } catch (error) {
            setPinError(error.response?.data?.message || 'Invalid PIN');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = (id, type = 'file') => {
        setItemToDelete({ id, type });
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setActionLoading(true);
        try {
            if (itemToDelete.type === 'file') {
                await documentAPI.delete(itemToDelete.id);
                showToast('Document deleted', 'success');
            } else {
                await folderAPI.delete(itemToDelete.id);
                showToast('Folder deleted', 'success');
            }
            fetchDocuments();
        } catch (error) {
            showToast('Delete failed', 'error');
        } finally {
            setActionLoading(false);
            setShowDeleteConfirm(false);
            setItemToDelete(null);
        }
    };

    const handleShare = (document) => {
        setSelectedDocument(document);
        setShareLink('');
        setShareExpiry('1h');
        setShareExpiryMode('preset');
        setShareCustomDate('');
        setSharePassword('');
        setAllowDownload(false);
        setBurnAfterRead(false);
        setRequireEmailVerification(false);
        setMaxAccess('');
        setShowShareModal(true);
    };

    const generateShareLink = async () => {
        setSharingLoading(true);
        try {
            const payload = {
                password: sharePassword || undefined,
                allowDownload,
                burnAfterRead,
                requireEmailVerification,
                expiresIn: shareExpiryMode === 'preset' ? shareExpiry : undefined,
                expiresAt: shareExpiryMode === 'custom' ? new Date(shareCustomDate).toISOString() : undefined,
                maxAccess: maxAccess ? parseInt(maxAccess) : undefined
            };
            const response = await documentAPI.createShare(selectedDocument.id, payload);
            setShareLink(`${window.location.origin}/share/${response.data.data.shareToken}`);
            showToast('Link generated!', 'success');
        } catch (error) {
            showToast('Failed to generate link', 'error');
        } finally {
            setSharingLoading(false);
        }
    };

    const handleMoveClick = async (item, type) => {
        setItemsToMove({
            documentIds: type === 'file' ? [item.id] : [],
            folderIds: type === 'folder' ? [item.id] : []
        });
        try {
            const res = await folderAPI.getContents(null);
            setAvailableFolders(res.data.data.folders.filter(f => f.id !== item.id));
            setShowMoveModal(true);
        } catch (error) {
            showToast('Failed to load folders', 'error');
        }
    };

    const executeMove = async () => {
        try {
            setActionLoading(true);
            await folderAPI.move({ ...itemsToMove, targetFolderId });
            showToast('Moved successfully', 'success');
            setShowMoveModal(false);
            fetchDocuments();
        } catch (error) {
            showToast('Move failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">My Documents</h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">Securely manage and organize your files</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowNewFolderModal(true)} variant="outline" className="inline-flex items-center space-x-2">
                        <FolderPlus size={18} />
                        <span className="hidden sm:inline">New Folder</span>
                    </Button>
                    <Button onClick={() => setShowUploadModal(true)} className="inline-flex items-center space-x-2">
                        <Upload size={18} />
                        <span>Upload Document</span>
                    </Button>
                </div>
            </div>

            {/* Breadcrumbs */}
            {currentFolderId && (
                <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-nowrap pb-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg">
                    <button onClick={() => setCurrentFolderId(null)} className="hover:text-blue-600 transition-colors font-medium">My Documents</button>
                    <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{currentFolder?.name || 'Loading...'}</span>
                </div>
            )}

            <Card>
                <Card.Header className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select value={fileTypeFilter} onChange={(e) => { setFileTypeFilter(e.target.value); setPage(1); }} className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                                <option value="all">All Types</option>
                                <option value="pdf">PDF</option>
                                <option value="doc">Word</option>
                                <option value="txt">Text</option>
                            </select>
                            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="name-asc">Name (A-Z)</option>
                            </select>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content>
                    <div className="hidden md:block">
                        <Table>
                            <Table.Header>
                                <Table.Row>
                                    <Table.Head className="text-slate-700 dark:text-slate-300">Name</Table.Head>
                                    <Table.Head className="text-slate-700 dark:text-slate-300">Size</Table.Head>
                                    <Table.Head className="text-slate-700 dark:text-slate-300">Uploaded</Table.Head>
                                    <Table.Head className="text-slate-700 dark:text-slate-300">Status</Table.Head>
                                    <Table.Head className="text-slate-700 dark:text-slate-300">Actions</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {loading ? (
                                    <Table.Row><Table.Cell colSpan={5} className="text-center py-8"><LoadingSpinner /></Table.Cell></Table.Row>
                                ) : (folders.length === 0 && documents.length === 0) ? (
                                    <Table.Row><Table.Cell colSpan={5} className="text-center py-8 text-slate-600 dark:text-slate-400">This folder is empty.</Table.Cell></Table.Row>
                                ) : (
                                    <>
                                        {folders.map((folder) => (
                                            <Table.Row key={folder.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 group" onClick={() => setCurrentFolderId(folder.id)}>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-3">
                                                        <Folder className="h-5 w-5 text-amber-500 fill-amber-500/10" />
                                                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{folder.name}</span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="text-slate-700 dark:text-slate-300">--</Table.Cell>
                                                <Table.Cell className="text-slate-700 dark:text-slate-300">{new Date(folder.createdAt).toLocaleDateString()}</Table.Cell>
                                                <Table.Cell><span className="text-xs font-bold text-slate-600 dark:text-slate-400">Folder</span></Table.Cell>
                                                <Table.Cell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleDelete(folder.id, 'folder')} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={16} /></Button>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        ))}
                                        {documents.map((doc) => (
                                            <Table.Row key={doc.id}>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-blue-600" />
                                                        <span className="font-bold text-slate-900 dark:text-white">{doc.fileName}</span>
                                                    </div>
                                                </Table.Cell>
                                                <Table.Cell className="text-slate-700 dark:text-slate-300">{formatFileSize(doc.fileSize)}</Table.Cell>
                                                <Table.Cell className="text-slate-700 dark:text-slate-300">{new Date(doc.createdAt).toLocaleDateString()}</Table.Cell>
                                                <Table.Cell><span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-900/20">Encrypted</span></Table.Cell>
                                                <Table.Cell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleView(doc)}><Eye size={16} /></Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}><Download size={16} /></Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleShare(doc)} className="text-blue-600 border-blue-200"><Share2 size={16} /></Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleMoveClick(doc, 'file')} className="text-slate-600 border-slate-200"><Move size={16} /></Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id, 'file')} className="text-red-600 border-red-200"><Trash2 size={16} /></Button>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </>
                                )}
                            </Table.Body>
                        </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {folders.map(folder => (
                            <div key={folder.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" onClick={() => setCurrentFolderId(folder.id)}>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-2 items-center">
                                        <Folder className="h-5 w-5 text-amber-500 fill-amber-500/10" />
                                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{folder.name}</span>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folder'); }} className="text-red-600"><Trash2 size={16} /></Button>
                                </div>
                            </div>
                        ))}
                        {documents.map(doc => (
                            <div key={doc.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2 items-center">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{doc.fileName}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{formatFileSize(doc.fileSize)}</span>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                    <Button size="sm" variant="outline" onClick={() => handleView(doc)} className="flex-1 sm:flex-none justify-center"><Eye size={16} className="sm:mr-0 xl:mr-2" /><span className="hidden xl:inline">View</span></Button>
                                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc)} className="flex-1 sm:flex-none justify-center"><Download size={16} /></Button>
                                    <Button size="sm" variant="outline" onClick={() => handleShare(doc)} className="flex-1 sm:flex-none justify-center text-blue-600 border-blue-200"><Share2 size={16} /></Button>
                                    <Button size="sm" variant="outline" onClick={() => handleMoveClick(doc, 'file')} className="flex-1 sm:flex-none justify-center text-slate-600 border-slate-200"><Move size={16} /></Button>
                                    <Button size="sm" variant="outline" onClick={() => handleDelete(doc.id, 'file')} className="flex-1 sm:flex-none justify-center text-red-600 border-red-200 hover:bg-red-50"><Trash2 size={16} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-slate-700">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                        <span className="text-sm">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                    </div>
                </Card.Content>
            </Card>

            {/* Modals Footer */}
            <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Secure Document" size="md">
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag & drop a file here, or click to select</p>
                </div>
                {isUploading && (
                    <div className="mt-4">
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Security Check" size="sm">
                <div className="space-y-4">
                    <Input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="######" maxLength={6} className="text-center text-lg" />
                    {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={handlePinSubmit} loading={actionLoading}>Confirm</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share Document" size="md">
                <div className="space-y-4">
                    {!shareLink ? (
                        <>
                            {/* Expiry Section */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Link Expiry</label>
                                <div className="flex flex-wrap gap-2">
                                    {['1h', '6h', '24h', '7d'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { setShareExpiryMode('preset'); setShareExpiry(opt); }}
                                            className={`flex-1 min-w-[60px] py-1.5 rounded-md text-sm font-bold border transition-colors ${shareExpiryMode === 'preset' && shareExpiry === opt
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                        >
                                            {opt === '1h' ? '1 Hour' : opt === '6h' ? '6 Hours' : opt === '24h' ? '24 Hours' : '7 Days'}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShareExpiryMode('custom')}
                                    className={`w-full text-sm py-1.5 rounded-md border font-bold transition-colors ${shareExpiryMode === 'custom'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                >
                                    Custom Date & Time
                                </button>
                                {shareExpiryMode === 'custom' && (
                                    <Input
                                        type="datetime-local"
                                        value={shareCustomDate}
                                        onChange={e => setShareCustomDate(e.target.value)}
                                    />
                                )}
                            </div>

                            {/* Options */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Download</span>
                                    <input type="checkbox" checked={allowDownload} onChange={() => setAllowDownload(!allowDownload)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Burn After Reading</span>
                                    <input type="checkbox" checked={burnAfterRead} onChange={() => setBurnAfterRead(!burnAfterRead)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                </div>
                                {!burnAfterRead && (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">Max Access Count</span>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={maxAccess}
                                            onChange={e => setMaxAccess(e.target.value)}
                                            placeholder="Unlimited"
                                            className="w-full sm:w-32 text-left sm:text-right"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t dark:border-slate-700 pt-3">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Verification</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">High Security</span>
                                    </div>
                                    <input type="checkbox" checked={requireEmailVerification} onChange={() => setRequireEmailVerification(!requireEmailVerification)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                </div>
                            </div>

                            {/* Password */}
                            <Input
                                type="password"
                                value={sharePassword}
                                onChange={e => setSharePassword(e.target.value)}
                                placeholder="Optional Password"
                            />

                            <Button className="w-full" onClick={generateShareLink} loading={sharingLoading}>Generate Link</Button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg flex items-center gap-2">
                                <input readOnly value={shareLink} className="flex-1 bg-transparent text-sm border-none focus:ring-0" />
                                <Button size="sm" onClick={() => { navigator.clipboard.writeText(shareLink); showToast('Copied!', 'success'); }}><Copy size={16} /></Button>
                            </div>
                            <QRCodeSVG value={shareLink} className="mx-auto" />
                            <Button className="w-full" onClick={() => setShowShareModal(false)}>Done</Button>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={showNewFolderModal} onClose={() => setShowNewFolderModal(false)} title="Create New Folder" size="sm">
                <div className="space-y-4">
                    <Input label="Folder Name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus />
                    <Button className="w-full" onClick={handleCreateFolder} loading={sharingLoading}>Create</Button>
                </div>
            </Modal>

            <Modal isOpen={showMoveModal} onClose={() => setShowMoveModal(false)} title="Move to Folder" size="sm">
                <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto border rounded-md dark:border-slate-700">
                        <button className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 ${targetFolderId === null ? 'bg-blue-50 text-blue-600' : ''}`} onClick={() => setTargetFolderId(null)}>
                            <HardDrive size={18} /> <span>Root</span>
                        </button>
                        {availableFolders.map(f => (
                            <button key={f.id} className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center gap-3 ${targetFolderId === f.id ? 'bg-blue-50 text-blue-600' : ''}`} onClick={() => setTargetFolderId(f.id)}>
                                <Folder size={18} /> <span>{f.name}</span>
                            </button>
                        ))}
                    </div>
                    <Button className="w-full" onClick={executeMove} loading={actionLoading}>Move Here</Button>
                </div>
            </Modal>

            <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} danger />

            {/* Universal Document Viewer Modal */}
            {viewerState.isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900 shrink-0">
                        <h3 className="text-white font-medium flex items-center gap-2 truncate">
                            <FileText size={18} className="text-blue-400 shrink-0" />
                            <span className="truncate">{viewerState.fileName}</span>
                            {viewerState.isOffice && (
                                <span className="ml-2 py-0.5 px-2 bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold tracking-wider rounded-full border border-amber-500/30 shrink-0">
                                    External Viewer
                                </span>
                            )}
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => {
                            setViewerState({ isOpen: false, url: '', fileName: '', isOffice: false });
                            if (viewerState.url) window.URL.revokeObjectURL(viewerState.url);
                        }} className="text-slate-300 border-slate-600 hover:bg-slate-800 shrink-0">
                            Close Viewer
                        </Button>
                    </div>


                    <div className="flex-1 bg-slate-800 relative w-full h-full overflow-hidden">
                        {viewerState.isOffice ? (
                            <div className="relative h-full w-full overflow-hidden">
                                <OfficeViewer url={viewerState.url} fileName={viewerState.fileName} className="h-full w-full" />
                                <WatermarkOverlay currentUser={user} />
                            </div>
                        ) : (
                            <div className="relative w-full h-full overflow-hidden">
                                <iframe
                                    src={viewerState.url}
                                    className="w-full h-full border-none bg-white block"
                                    title={viewerState.fileName}
                                />
                                <WatermarkOverlay currentUser={user} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyDocuments;
