import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/ToastContainer.jsx';
import { documentAPI } from '../services/api.js';
import { Upload, FileText, Download, HardDrive, Link, Clock, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useDropzone } from 'react-dropzone';

function DashboardUser() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0, totalDownloads: 0 });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getAll({ limit: 5, sortBy: 'date-desc' });
      setRecentFiles(response.data.data.documents);
      setStats(response.data.data.stats);
    } catch (error) {
      showToast('Failed to load dashboard overview', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(20);
    try {
      const formData = new FormData();
      formData.append('file', acceptedFiles[0]);
      await documentAPI.upload(formData);
      setUploadProgress(100);
      showToast('Upload successful', 'success');
      setTimeout(() => {
        setIsUploading(false);
        setShowUploadModal(false);
        fetchOverviewData();
      }, 500);
    } catch (error) {
      setIsUploading(false);
      showToast('Upload failed', 'error');
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop, multiple: false });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading && !isUploading) return <div className="py-20 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Command Center</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Welcome back, {user.name.split(' ')[0]}</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="gap-2">
          <Plus size={20} />
          <span>Quick Upload</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 shadow-none border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider">Total Vault Entries</p>
              <h3 className="text-3xl font-black mt-1 text-blue-900 dark:text-white">{stats.totalFiles}</h3>
            </div>
            <div className="p-3 bg-blue-600/10 dark:bg-blue-500/20 rounded-xl">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 shadow-none border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider">Link Redemptions</p>
              <h3 className="text-3xl font-black mt-1 text-emerald-900 dark:text-white">{stats.totalDownloads}</h3>
            </div>
            <div className="p-3 bg-emerald-600/10 dark:bg-emerald-500/20 rounded-xl">
              <Link className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 shadow-none border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-wider">Storage Occupied</p>
              <h3 className="text-3xl font-black mt-1 text-purple-900 dark:text-white">{formatFileSize(stats.totalSize)}</h3>
            </div>
            <div className="p-3 bg-purple-600/10 dark:bg-purple-500/20 rounded-xl">
              <HardDrive className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Files Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              Recently Uploaded
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-documents')} className="text-blue-600">
              View All <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>

          <Card padding="none">
            {recentFiles.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Your vault is empty. Upload your first document to get started!</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentFiles.map(file => (
                  <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{file.fileName}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{new Date(file.createdAt).toLocaleDateString()} • {formatFileSize(file.fileSize)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/my-documents')} className="text-blue-700 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20">Access</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Help / Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Quick Shortcuts</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => navigate('/my-documents')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left flex items-center gap-4 group"
            >
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900 transition-colors">
                <HardDrive size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">File Explorer</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Organize your folders</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/shared-links')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left flex items-center gap-4 group"
            >
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900 transition-colors">
                <Link size={20} className="text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Link Tracking</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Monitor access activity</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left flex items-center gap-4 group"
            >
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-purple-50 dark:group-hover:bg-purple-900 transition-colors">
                <Upload size={20} className="text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Security Settings</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Change PIN & alerts</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Secure Document" size="md">
        <div {...getRootProps()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="font-bold">Drop your sensitive file here</p>
          <p className="text-sm text-slate-500 mt-1">Files are instantly encrypted before hitting the cloud</p>
        </div>
        {isUploading && (
          <div className="mt-6">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-center text-xs mt-2 text-slate-500 uppercase tracking-widest font-bold">Encrypting...</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DashboardUser;