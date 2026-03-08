import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentAPI } from '../services/api.js';
import { useToast } from '../components/ui/ToastContainer.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { Download, Lock, FileText, Shield, Clock, AlertCircle, Eye, Plus, Minus } from 'lucide-react';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function SharedDocument() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [blobUrl, setBlobUrl] = useState('');
  const [fileName, setFileName] = useState('shared-document');
  const [isAttachment, setIsAttachment] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [isBurnAfterRead, setIsBurnAfterRead] = useState(false);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [blobRevoked, setBlobRevoked] = useState(false);
  const [zoom, setZoom] = useState(120);
  const [numPages, setNumPages] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    // Use an 'ignored' flag to prevent React StrictMode's double invocation
    // from consuming two access counts on page load.
    let ignored = false;
    handleAccess('', () => ignored);
    return () => { ignored = true; };
  }, [token]);

  useEffect(() => {
    // Anti-screenshot protection mechanism
    // Native OS screenshot tools usually trigger window blur/visibility loss
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsScreenshotting(true);
      } else {
        // Add a slight delay before revealing to defeat rapid capture
        setTimeout(() => setIsScreenshotting(false), 200);
      }
    };

    const handleWindowBlur = () => {
      setIsScreenshotting(true);
    };

    const handleWindowFocus = () => {
      setTimeout(() => setIsScreenshotting(false), 200);
    };

    // Prevent print screen, save page, and preemptively blur on modifier keys for screenshot combos
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.key === 'p')) {
        setIsScreenshotting(true);
        showToast('Screenshots and printing are disabled for this document.', 'error');
        e.preventDefault();
      } else if ((e.ctrlKey && e.key === 's') || (e.metaKey && e.key === 's')) {
        // Block Ctrl+S / Cmd+S Save Page
        showToast('Saving this document is disabled.', 'error');
        e.preventDefault();
      } else if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Shift') {
        // Blur immediately when the user starts holding the combination for Win+Shift+S or Cmd+Shift+4
        setIsScreenshotting(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Shift' || e.key === 'PrintScreen') {
        // Only unblur if the window still has focus (meaning the screenshot tool didn't actually open)
        if (document.hasFocus()) {
          setTimeout(() => setIsScreenshotting(false), 300);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // DevTools detection - only use the image getter trick (reliable)
    // The outerWidth heuristic had too many false positives on different screen/window configurations
    const devToolsInterval = setInterval(() => {
      let devToolsDetected = false;
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: () => {
          devToolsDetected = true;
        }
      });
      // Triggers getters only when DevTools console formats the object
      // This won't be read when DevTools is closed
      console.debug('%c', element);
      setIsDevToolsOpen(devToolsDetected);
    }, 1500);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(devToolsInterval);
    };
  }, []);

  useEffect(() => {
    if (!expiresAt || !fileReady) return;

    const checkExpiration = () => {
      const now = new Date();
      const expiryDate = new Date(expiresAt);

      if (now >= expiryDate) {
        setFileReady(false);
        setBlobUrl('');
        setBlobRevoked(true);
        setShowViewer(false);
        setError('This link has expired.');
        setExpired(true);
        showToast('Document access has expired', 'error');
      }
    };

    // Check immediately and then every second
    checkExpiration();
    const interval = setInterval(checkExpiration, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, fileReady]);

  const handleAccess = async (pwd = '', isIgnored = () => false) => {
    setLoading(true);
    setError('');

    try {
      const response = await documentAPI.accessShared(token, pwd || null, 'download');
      if (isIgnored()) return; // StrictMode cleanup: discard the first cancelled mount

      // File access successful
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      setBlobUrl(url);

      // Extract filename
      const contentDisposition = response.headers['content-disposition'];
      const burnHeader = response.headers['x-burn-after-read'];
      const expiryHeader = response.headers['x-expires-at'];

      setIsBurnAfterRead(burnHeader === 'true');
      if (expiryHeader) setExpiresAt(expiryHeader);

      let fn = 'shared-document';
      let isAttach = true;

      if (contentDisposition) {
        if (contentDisposition.includes('inline')) {
          isAttach = false;
        }
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          fn = matches[1].replace(/['"]/g, '');
        }
      }

      setFileName(fn);
      setIsAttachment(isAttach);
      setRequiresPassword(false);  // Clear password gate so fileReady block renders
      setFileReady(true);
      showToast('Document access granted!', 'success');
      setLoading(false);
    } catch (err) {
      setLoading(false);

      // Check if response is JSON error
      if (err.response?.data instanceof Blob && err.response.data.type === 'application/json') {
        // Parse JSON error from blob
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);

          if (err.response?.status === 401 && errorData.requiresPassword) {
            setRequiresPassword(true);
            setError('');
            return;
          } else if (err.response?.status === 401) {
            setError('Invalid password. Please try again.');
            return;
          } else if (err.response?.status === 410) {
            setExpired(true);
            setError('This share link has expired.');
            return;
          } else if (err.response?.status === 404) {
            setError('Share link not found or has been revoked.');
            return;
          }

          setError(errorData.message || 'Failed to access shared document');
        } catch (parseError) {
          setError('Failed to access shared document');
        }
      } else if (err.response?.status === 401) {
        setRequiresPassword(true);
        setError('');
      } else if (err.response?.status === 410) {
        setExpired(true);
        setError('This share link has expired.');
      } else if (err.response?.status === 404) {
        setError('Share link not found or has been revoked.');
      } else {
        setError('Failed to access shared document. Please try again.');
      }
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the password');
      return;
    }
    handleAccess(password);
  };

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Card className="w-full max-w-md">
          <Card.Content className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
                <Clock className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Expired</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This share link has expired and is no longer accessible.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Card className="w-full max-w-md">
          <Card.Header>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4">
                <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <Card.Title className="text-center">Password Protected</Card.Title>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-2">
              This document is password protected. Enter the password to access it.
            </p>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Shield size={16} className="inline mr-1" />
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                <Shield size={18} className="mr-2" />
                Access Document
              </Button>
            </form>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Card className="w-full max-w-md">
          <Card.Content className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (fileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Card className="w-full max-w-md">
          <Card.Content className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/20 p-4">
                <FileText className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Document Ready</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
              {fileName}
            </p>

            {!isAttachment && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-6 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                This document is restricted to <strong>view-only</strong>. Downloading is disabled by the owner.
              </p>
            )}

            <div className="flex flex-col gap-3">
              {isAttachment ? (
                <Button onClick={() => {
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }} className="w-full">
                  <Download size={18} className="mr-2" />
                  Download File
                </Button>
              ) : (
                <Button onClick={() => {
                  setShowViewer(true);
                  // Revoke the raw blob URL from memory after react-pdf has loaded it.
                  // We use a blobRevoked flag to avoid clearing blobUrl from state (which
                  // would cause the viewer to fall to the blank iframe fallback).
                  setTimeout(() => {
                    if (blobUrl) window.URL.revokeObjectURL(blobUrl);
                    setBlobRevoked(true);
                  }, 1500);
                }} className="w-full">
                  <Eye size={18} className="mr-2" />
                  View Document
                </Button>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Fullscreen Inline Viewer Modal */}
        {showViewer && !isAttachment && (
          <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900">
              <h3 className="text-white font-medium flex items-center gap-2 truncate">
                <FileText size={18} className="text-blue-400 shrink-0" />
                <span className="truncate">{fileName}</span>
                <span className="ml-2 py-0.5 px-2 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-500/30 shrink-0">
                  View Only
                </span>
              </h3>
              <div className="flex items-center gap-4">
                {blobUrl && fileName.toLowerCase().endsWith('.pdf') && (
                  <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button
                      onClick={() => setZoom(z => Math.max(50, z - 20))}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-slate-300 text-sm font-medium w-12 text-center select-none">
                      {zoom}%
                    </span>
                    <button
                      onClick={() => setZoom(z => Math.min(300, z + 20))}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="Zoom In"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => {
                  setShowViewer(false);
                  if (isBurnAfterRead) {
                    if (blobUrl) window.URL.revokeObjectURL(blobUrl);
                    setBlobUrl('');
                    setFileReady(false);
                    setError('This document was set to burn after reading. It has been securely wiped from your browser memory and the link is now permanently deactivated.');
                  }
                }} className="text-slate-300 border-slate-600 hover:bg-slate-800 shrink-0">
                  Close Viewer
                </Button>
              </div>
            </div>

            <div
              className={`flex-1 bg-slate-800 relative w-full h-full overflow-hidden flex items-center justify-center select-none transition-all duration-75 ${(isScreenshotting || isDevToolsOpen) ? 'blur-xl brightness-50 contrast-200' : ''
                }`}
              style={(isScreenshotting || isDevToolsOpen) ? { filter: 'blur(20px) brightness(0.2)' } : {}}
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => {
                e.preventDefault();
                showToast('Copying is disabled for this document', 'error');
              }}
              onCut={(e) => {
                e.preventDefault();
                showToast('Cutting is disabled for this document', 'error');
              }}
              onDragStart={(e) => e.preventDefault()}
            >
              {(isScreenshotting || isDevToolsOpen) && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80">
                  <div className="bg-slate-800 p-6 rounded-xl border border-red-900/50 flex flex-col items-center shadow-2xl">
                    <Shield className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">
                      {isDevToolsOpen ? 'DevTools Detected' : 'Screenshot Protected'}
                    </h3>
                    <p className="text-slate-400 text-center">
                      {isDevToolsOpen
                        ? 'Browser developer tools are not allowed while viewing this document.'
                        : 'Capture tools detected. Document hidden for security.'}
                    </p>
                  </div>
                </div>
              )}
              {blobUrl && fileName.toLowerCase().endsWith('.pdf') ? (
                <div className="overflow-y-auto overflow-x-auto h-full w-full flex flex-col items-center p-4 gap-4 custom-scroll">
                  <span className="text-slate-400 text-sm py-2">Scroll downward to read all pages</span>
                  <PdfDocument
                    file={blobUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col gap-4 items-center"
                    loading={<LoadingSpinner size={32} />}
                  >
                    {Array.from(new Array(numPages || 0), (el, index) => (
                      <div key={`page_${index + 1}`} className="shadow-2xl rounded overflow-hidden relative">
                        <Page
                          pageNumber={index + 1}
                          scale={zoom / 100}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          loading={<div className="bg-slate-700 animate-pulse w-[600px] h-[800px]"></div>}
                        />
                        {/* Security Layer that catches any direct DOM events escaping the page content */}
                        <div className="absolute inset-0 z-10 w-full h-full opacity-0" onContextMenu={(e) => e.preventDefault()}></div>
                      </div>
                    ))}
                  </PdfDocument>
                </div>
              ) : blobUrl && (fileName.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/)) ? (
                <div className="overflow-auto w-full h-full flex justify-center items-center">
                  <img src={blobUrl} alt={fileName} className="max-w-none transition-all duration-200" style={{ transform: `scale(${zoom / 100})` }} />
                </div>
              ) : (!blobRevoked && blobUrl) ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-none bg-white"
                  title={fileName}
                />
              ) : null}
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md">
        <Card.Content className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4">
              <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Accessing Shared Document</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Loading your secure link...
          </p>
          <LoadingSpinner />
        </Card.Content>
      </Card>
    </div>
  );
}

export default SharedDocument;
