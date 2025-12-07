import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { documentAPI } from '../services/api.js';
import { Upload, FileText, Download, Eye, HardDrive, Shield, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

function DashboardUser() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0, totalDownloads: 0 });
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDocuments();
  }, [page]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getAll({ page, limit: 10 });
      setDocuments(response.data.data.documents);
      setStats(response.data.data.stats);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Logic
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    // Currently handle one file at a time to match backend
    const file = acceptedFiles[0];
    await handleFileUpload(file);
  }, []);

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
    setUploadProgress(10); // Start progress
    try {
      const formData = new FormData();
      formData.append('file', file);
      await documentAPI.upload(formData);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setShowUploadModal(false);
        fetchDocuments();
        showToast('Document uploaded and encrypted successfully!', 'success');
      }, 500);
    } catch (error) {
      setIsUploading(false);
      showToast('Upload failed: ' + (error.response?.data?.message || error.message), 'error');
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
             window.open(url, '_blank');
             showToast('Document opened in new tab', 'success');
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

  const handleDelete = async (documentId) => {
    setDocumentToDelete(documentId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    try {
      await documentAPI.delete(documentToDelete);
      fetchDocuments();
      showToast('Document deleted successfully!', 'success');
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setDocumentToDelete(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Welcome back, {user.name}!</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">Manage your secure documents</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="inline-flex items-center space-x-2 self-start sm:self-auto">
          <Upload size={18} />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:text-sm">Total Documents</p>
              <p className="text-xl font-bold text-blue-900 dark:text-white sm:text-2xl">{stats.totalFiles}</p>
            </div>
            <div className="rounded-lg bg-blue-600 p-2.5">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:text-sm">Total Downloads</p>
              <p className="text-xl font-bold text-emerald-900 dark:text-white sm:text-2xl">{stats.totalDownloads}</p>
            </div>
            <div className="rounded-lg bg-emerald-600 p-2.5">
              <Download className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 sm:text-sm">Storage Used</p>
              <p className="text-xl font-bold text-purple-900 dark:text-white sm:text-2xl">{formatFileSize(stats.totalSize)}</p>
            </div>
            <div className="rounded-lg bg-purple-600 p-2.5">
              <HardDrive className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <Card.Header className="space-y-1">
          <Card.Title>Your Documents</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="hidden md:block">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Document</Table.Head>
                  <Table.Head>Size</Table.Head>
                  <Table.Head>Uploaded</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {loading ? (
                   <Table.Row><Table.Cell colSpan={5} className="text-center py-8"><LoadingSpinner /></Table.Cell></Table.Row>
                ) : documents.length === 0 ? (
                   <Table.Row><Table.Cell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">No documents found.</Table.Cell></Table.Row>
                ) : (
                  documents.map((doc) => (
                    <Table.Row key={doc.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                           <FileText className="h-5 w-5 text-blue-600" />
                           <span className="font-medium text-slate-900 dark:text-white">{doc.fileName}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell><span className="text-slate-600 dark:text-slate-400">{formatFileSize(doc.fileSize)}</span></Table.Cell>
                      <Table.Cell><span className="text-slate-600 dark:text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span></Table.Cell>
                      <Table.Cell>
                         <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-400">Encrypted</span>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(doc)}><Eye size={16} /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}><Download size={16} /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id)} className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
             {documents.map(doc => (
                <div key={doc.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2 items-center">
                         <FileText className="h-5 w-5 text-blue-600" />
                         <span className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{doc.fileName}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(doc.fileSize)}</span>
                   </div>
                   <div className="flex justify-end gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleView(doc)}><Eye size={16}/></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}><Download size={16}/></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(doc.id)} className="text-red-600"><Trash2 size={16}/></Button>
                   </div>
                </div>
             ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
             >
                <ChevronLeft size={16} className="mr-1" /> Previous
             </Button>
             <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</span>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
             >
                Next <ChevronRight size={16} className="ml-1" />
             </Button>
          </div>
        </Card.Content>
      </Card>

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Secure Document" size="md">
         <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag & drop a file here, or click to select</p>
            <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, XLSX up to 50MB</p>
         </div>
         {isUploading && (
            <div className="mt-4">
               <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
               </div>
               <p className="text-center text-xs mt-1 text-slate-500 dark:text-slate-400">Encrypting & Uploading...</p>
            </div>
         )}
      </Modal>

      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Security Check" size="sm">
         <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Enter your 6-digit PIN to access this file.</p>
            <Input 
               type="password" 
               inputMode="numeric" // ADDED THIS LINE
               value={pin} 
               onChange={e => setPin(e.target.value)} 
               placeholder="######" 
               className="text-center text-lg tracking-widest" 
               maxLength={6} 
            />
            {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
            <div className="flex gap-2">
               <Button className="flex-1" onClick={handlePinSubmit} loading={actionLoading}>Confirm</Button>
               <Button variant="outline" className="flex-1" onClick={() => setShowPinModal(false)}>Cancel</Button>
            </div>
         </div>
      </Modal>

      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Document" message="Are you sure? This cannot be undone." danger />
    </div>
  );
}

export default DashboardUser;