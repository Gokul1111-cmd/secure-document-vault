import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { documentAPI } from '../services/api.js';
import { Upload, FileText, Download, Eye, HardDrive, Shield, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

function DashboardUser() {
  const { user, verifyPassword } = useAuth();
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
  const [documentToDelete, setDocumentToDelete] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getAll();
      setDocuments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

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
      }, 400);
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
      if (selectedAction === 'view') {
        const viewableMimeTypes = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/gif',
          'image/webp',
          'text/plain',
          'text/html',
          'text/csv',
          'video/mp4',
          'video/webm',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav'
        ];

        const isViewable = viewableMimeTypes.includes(selectedDocument.mimeType);

        if (!isViewable) {
          showToast(`${selectedDocument.fileName.split('.').pop().toUpperCase()} files cannot be viewed in browser. Downloading instead...`, 'info');

          const response = await documentAPI.download(selectedDocument.id, pin);
          const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = selectedDocument.fileName;
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);

          setShowPinModal(false);
          setPin('');
          showToast('Document downloaded successfully!', 'success');
          fetchDocuments();
          return;
        }

        const response = await documentAPI.view(selectedDocument.id, pin);
        const mimeType = selectedDocument.mimeType || 'application/octet-stream';
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');

        if (!newWindow) {
          showToast('Please allow pop-ups to view documents', 'warning');
        }

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);

        setShowPinModal(false);
        setPin('');
        showToast('Document opened in new tab', 'success');
        fetchDocuments();
      } else if (selectedAction === 'download') {
        const response = await documentAPI.download(selectedDocument.id, pin);
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedDocument.fileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        setShowPinModal(false);
        setPin('');
        showToast('Document downloaded successfully!', 'success');
        fetchDocuments();
      }
    } catch (error) {
      console.error('PIN Submit Error:', error);
      setPinError(error.response?.data?.message || 'Invalid PIN');
      showToast(error.response?.data?.message || 'Invalid PIN', 'error');
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
      showToast('Delete failed: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDocumentToDelete(null);
    }
  };

  const getFileIcon = () => <FileText className="h-5 w-5 text-blue-600" />;

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const totalStorage = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Welcome back, {user.name}!</h1>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">Manage your secure documents and files</p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center space-x-2 self-start sm:self-auto"
          size="md"
        >
          <Upload size={18} />
          <span>Upload Document</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 sm:text-sm">Total Documents</p>
              <p className="text-xl font-bold text-blue-900 sm:text-2xl">{documents.length}</p>
            </div>
            <div className="rounded-lg bg-blue-600 p-2.5">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 sm:text-sm">Total Downloads</p>
              <p className="text-xl font-bold text-emerald-900 sm:text-2xl">
                {documents.reduce((sum, doc) => sum + doc.downloadCount, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-600 p-2.5">
              <Download className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 sm:text-sm">Storage Used</p>
              <p className="text-xl font-bold text-purple-900 sm:text-2xl">{formatFileSize(totalStorage)}</p>
            </div>
            <div className="rounded-lg bg-purple-600 p-2.5">
              <HardDrive className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 sm:text-sm">Encrypted Files</p>
              <p className="text-xl font-bold text-amber-900 sm:text-2xl">{documents.length}</p>
            </div>
            <div className="rounded-lg bg-amber-600 p-2.5">
              <Shield className="h-5 w-5 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <Card.Header className="space-y-1">
          <Card.Title>Your Documents</Card.Title>
          <p className="text-xs text-slate-500 sm:text-sm">Manage downloads, views, and secure access to your files.</p>
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
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center">
                      <LoadingSpinner size="md" text="Loading documents..." />
                    </Table.Cell>
                  </Table.Row>
                ) : documents.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center">
                      <p className="text-slate-500">No documents yet. Upload your first document to get started!</p>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  documents.map((document) => (
                    <Table.Row key={document.id}>
                      <Table.Cell>
                        <div className="flex items-center space-x-3">
                          {getFileIcon()}
                          <div>
                            <p className="font-medium text-slate-900">{document.fileName}</p>
                            <p className="text-xs text-slate-500 sm:text-sm">{document.downloadCount} downloads</p>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-slate-600">{formatFileSize(document.fileSize)}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-slate-600">{formatDate(document.createdAt)}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Encrypted
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(document)}>
                            <Eye size={16} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(document)}>
                            <Download size={16} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(document.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="md" text="Loading documents..." />
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">No documents yet. Upload your first document to get started!</p>
              </div>
            ) : (
              documents.map((document) => (
                <div key={document.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon()}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{document.fileName}</p>
                        <p className="text-xs text-slate-500">{document.downloadCount} downloads</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      Encrypted
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span>{formatFileSize(document.fileSize)}</span>
                    <span>{formatDate(document.createdAt)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => handleView(document)}>
                      <Eye size={14} />
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => handleDownload(document)}>
                      <Download size={14} />
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => handleDelete(document.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card.Content>
      </Card>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Secure Document"
        size="md"
      >
        <div className="space-y-6">
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <p className="text-lg font-medium text-slate-900">Upload your document</p>
            <p className="mt-1 text-sm text-slate-600">Files will be automatically encrypted for security</p>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.xlsx"
            />
            <label
              htmlFor="file-upload"
              className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Choose File
            </label>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading and encrypting...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="text-sm text-slate-500">
            <p className="font-medium">Supported formats:</p>
            <p>PDF, DOC, DOCX, TXT, XLSX (Max size: 10MB)</p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        title={`Enter PIN to ${selectedAction === 'download' ? 'Download' : 'View'}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your 6-digit PIN to {selectedAction === 'download' ? 'download' : 'view'} this document.
          </p>

          <Input
            type="text"
            label="PIN"
            value={pin}
            maxLength={6}
            onChange={(e) => {
              setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
              setPinError('');
            }}
            placeholder="e.g. 123456"
            autoFocus
          />

          {pinError && <div className="text-sm text-red-600">{pinError}</div>}

          <div className="flex gap-3">
            <Button onClick={handlePinSubmit} className="flex-1" loading={actionLoading}>
              {selectedAction === 'download' ? 'Download' : 'View'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPinModal(false)}
              className="flex-1"
              disabled={actionLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDocumentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Document"
        message="Are you sure you want to permanently delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
      />
    </div>
  );
}

export default DashboardUser;
