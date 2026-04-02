import { useState, useEffect, useCallback } from 'react';
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
import OfficeViewer from '../components/ui/OfficeViewer.jsx';
import WebcamSecurity from '../components/ui/WebcamSecurity.jsx';
import WatermarkOverlay from '../components/ui/WatermarkOverlay.jsx';

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
  const [zoom, setZoom] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 70 : 120);
  const [numPages, setNumPages] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  // Viewer Identity (for watermark — captured before document is opened)
  const [viewerName, setViewerName] = useState('');
  const [viewerEmail, setViewerEmail] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [viewerNameInput, setViewerNameInput] = useState('');
  const [viewerEmailInput, setViewerEmailInput] = useState('');
  const [identityError, setIdentityError] = useState('');

  // OTP Verification State
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [emailToken, setEmailToken] = useState(null);
  const [otpStep, setOtpStep] = useState('email'); // 'email' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }
  const handleThreatDetected = useCallback((type) => console.warn("Physical threat detected:", type), []);
  const handleThreatCleared = useCallback(() => console.log("Physical threat cleared"), []);

  useEffect(() => {
    // Use an 'ignored' flag to prevent React StrictMode's double invocation
    // from consuming two access counts on page load.
    let ignored = false;
    handleAccess('', () => ignored);
    return () => { ignored = true; };
  }, [token]);

  useEffect(() => {
    // ─────────────────────────────────────────────────────────────
    // ANTI-SCREENSHOT PROTECTION  (multi-layer)
    // ─────────────────────────────────────────────────────────────

    // Layer 1 – page visibility (Win+D, task-switch, Snip & Sketch
    //           all cause document.hidden before capturing on Windows)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsScreenshotting(true);
      } else {
        setTimeout(() => setIsScreenshotting(false), 500);
      }
    };

    // Layer 2 – window focus/blur  (Alt+PrintScreen, Snipping Tool,
    //           macOS Cmd+Shift+4, Greenshot etc. all blur the window)
    const handleWindowBlur = () => {
      setIsScreenshotting(true);
    };
    const handleWindowFocus = () => {
      setTimeout(() => setIsScreenshotting(false), 500);
    };

    // Layer 3 – keyboard pre-blur
    // We blur immediately on ANY key that can start a screenshot combo:
    //   • PrintScreen / SysRq (direct capture)
    //   • Shift / Meta / Control / Alt (for Win+Shift+S, Cmd+Shift+4, etc.)
    // This pre-blur fires before the OS composites the frame on most GPUs.
    let screenshotTimeout = null;
    const BLUR_MODIFIER_KEYS = new Set([
      'PrintScreen', 'SysRq',
      'Shift', 'Control', 'Meta', 'Alt', 'OS'
    ]);

    const handleKeyDown = (e) => {
      if (BLUR_MODIFIER_KEYS.has(e.key)) {
        setIsScreenshotting(true);
        clearTimeout(screenshotTimeout);
        if (e.key === 'PrintScreen' || e.key === 'SysRq') {
          navigator.clipboard.writeText('').catch(() => { });
          showToast('Screenshots are disabled for this document.', 'error');
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        showToast('Saving and printing are disabled for this document.', 'error');
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      if (BLUR_MODIFIER_KEYS.has(e.key)) {
        screenshotTimeout = setTimeout(() => {
          if (document.hasFocus()) setIsScreenshotting(false);
        }, 600);
      }
    };

    // Layer 4 – continuous clipboard poison (make paste of any cached
    //           screenshot attempt useless by overwriting the clipboard)
    let clipboardInterval = null;
    const startClipboardPoison = () => {
      clipboardInterval = setInterval(() => {
        navigator.clipboard.writeText('').catch(() => { });
      }, 500);
    };
    const stopClipboardPoison = () => clearInterval(clipboardInterval);
    startClipboardPoison();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    // DevTools detection
    const devToolsInterval = setInterval(() => {
      let devToolsDetected = false;
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: () => { devToolsDetected = true; }
      });
      console.debug('%c', element);
      setIsDevToolsOpen(devToolsDetected);
    }, 1500);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      clearInterval(devToolsInterval);
      stopClipboardPoison();
      clearTimeout(screenshotTimeout);
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

  const handleAccess = async (pwd = '', isIgnored = () => false, currentEmailToken = null) => {
    setLoading(true);
    setError('');

    try {
      const response = await documentAPI.accessShared(token, pwd || null, 'download', currentEmailToken || emailToken);
      if (isIgnored()) return; // StrictMode cleanup: discard the first cancelled mount

      // File access successful
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      setBlobUrl(url);
      setBlobRevoked(false); // Reset so the viewer renders correctly on re-open

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

          if (err.response?.status === 401 && errorData.requiresVerification) {
            setRequiresVerification(true);
            setError('');
            return;
          } else if (err.response?.status === 401 && errorData.requiresPassword) {
            setRequiresPassword(true);
            setError('');
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
        if (err.response.data?.requiresVerification) {
          setRequiresVerification(true);
        } else {
          setRequiresPassword(true);
        }
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

  const handleRequestOTP = async (e) => {
    e?.preventDefault();
    if (!viewerEmailInput.trim()) {
      setIdentityError('Please enter your email address.');
      return;
    }
    setOtpLoading(true);
    setIdentityError('');
    try {
      await documentAPI.requestShareOTP(token, viewerEmailInput.trim());
      showToast('Verification code sent!', 'success');
      setOtpStep('otp');
    } catch (err) {
      setIdentityError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    if (otpCode.length !== 6) {
      setIdentityError('Please enter the 6-digit code.');
      return;
    }
    setOtpLoading(true);
    setIdentityError('');
    try {
      const response = await documentAPI.verifyShareOTP(token, viewerEmailInput.trim(), otpCode);
      const { emailToken: newToken, email: verifiedEmail } = response.data.data;
      setEmailToken(newToken);
      setViewerEmail(verifiedEmail);
      setViewerName(verifiedEmail.split('@')[0]);
      setIdentityConfirmed(true);
      setRequiresVerification(false);
      showToast('Email verified!', 'success');

      // Auto-trigger access with the new token
      handleAccess(password, () => false, newToken);
    } catch (err) {
      setIdentityError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the password');
      return;
    }
    handleAccess(password, () => false, emailToken);
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

  if (requiresVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-amber-400" />
            <div>
              <h3 className="text-white font-bold text-lg">Verify Your Email</h3>
              <p className="text-slate-400 text-sm">This document requires verified access.</p>
            </div>
          </div>

          <div className="space-y-3">
            {otpStep === 'email' ? (
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter your email to receive a code"
                  value={viewerEmailInput}
                  onChange={e => setViewerEmailInput(e.target.value)}
                  className="w-full"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Verification Code</label>
                <Input
                  type="text"
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                <button
                  onClick={handleRequestOTP}
                  className="text-blue-400 text-xs mt-2 hover:underline inline-block"
                >
                  Resend Code
                </button>
              </div>
            )}

            {identityError && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle size={14} /> {identityError}
              </p>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {otpStep === 'email' ? (
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={handleRequestOTP}
                loading={otpLoading}
              >
                Send Verification Code
              </Button>
            ) : (
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={handleVerifyOTP}
                loading={otpLoading}
              >
                Confirm Code & View
              </Button>
            )}

            {otpStep === 'otp' && (
              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
                onClick={() => setOtpStep('email')}
              >
                Use Different Email
              </Button>
            )}
          </div>
        </div>
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
                }} className="w-full">
                  <Eye size={18} className="mr-2" />
                  View Document
                </Button>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Secure Access Gate (Identity / Verification) */}
        {showViewer && !identityConfirmed && !isAttachment && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-blue-400" />
                <div>
                  <h3 className="text-white font-bold text-lg">Secure Document Access</h3>
                  <p className="text-slate-400 text-sm">Your identity is required before viewing this document.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Full Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={viewerNameInput}
                    onChange={e => setViewerNameInput(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={viewerEmailInput}
                    onChange={e => setViewerEmailInput(e.target.value)}
                    className="w-full"
                  />
                </div>

                {identityError && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle size={14} /> {identityError}
                  </p>
                )}
              </div>

              <div className="space-y-2 mt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!viewerNameInput.trim() || !viewerEmailInput.trim()) {
                      setIdentityError('Please enter both your name and email.');
                      return;
                    }
                    setViewerName(viewerNameInput.trim());
                    setViewerEmail(viewerEmailInput.trim());
                    setIdentityConfirmed(true);
                    handleAccess(password); // Final check to see if verified identity is accepted
                  }}
                  loading={loading}
                >
                  <Eye size={16} className="mr-2" />
                  Confirm & View Document
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-slate-400 hover:text-white border-slate-700 hover:bg-slate-700"
                  onClick={() => setShowViewer(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Inline Viewer Modal */}
        {showViewer && (identityConfirmed || emailToken) && !isAttachment && (
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
                  if (blobUrl) window.URL.revokeObjectURL(blobUrl);
                  setBlobUrl('');
                  if (isBurnAfterRead) {
                    setFileReady(false);
                    setError('This document was set to burn after reading. It has been securely wiped from your browser memory and the link is now permanently deactivated.');
                  }
                }} className="text-slate-300 border-slate-600 hover:bg-slate-800 shrink-0">
                  Close Viewer
                </Button>
              </div>
            </div>

            {/* Webcam ML Security Layer (Only runs when viewer is open) */}
            <WebcamSecurity
              onThreatDetected={handleThreatDetected}
              onThreatCleared={handleThreatCleared}
            />

            <div
              className={`flex-1 bg-slate-800 relative w-full h-full overflow-hidden flex items-center justify-center select-none transition-all duration-75 ${(isScreenshotting || isDevToolsOpen) ? 'blur-xl' : ''}`}
              style={(isScreenshotting || isDevToolsOpen) ? { filter: 'blur(24px) brightness(0.1) saturate(0)', pointerEvents: 'none' } : {}}
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
                        {/* Watermark clipped exactly to this page */}
                        {!isScreenshotting && !isDevToolsOpen && (
                          <WatermarkOverlay currentUser={{ name: viewerName, email: viewerEmail }} />
                        )}
                        {/* Transparent security intercept layer */}
                        <div className="absolute inset-0 z-10 w-full h-full opacity-0" onContextMenu={(e) => e.preventDefault()}></div>
                      </div>
                    ))}
                  </PdfDocument>
                </div>
              ) : (blobUrl && fileName.toLowerCase().match(/\.(docx|xlsx|csv)$/)) ? (
                <div className="relative h-full w-full overflow-hidden">
                  <OfficeViewer url={blobUrl} fileName={fileName} className="h-full w-full" />
                  {!isScreenshotting && !isDevToolsOpen && (
                    <WatermarkOverlay currentUser={{ name: viewerName, email: viewerEmail }} />
                  )}
                </div>
              ) : (blobUrl) ? (
                <div className="relative w-full h-full overflow-hidden">
                  <iframe
                    src={blobUrl}
                    className="w-full h-full border-none bg-white block"
                    title={fileName}
                  />
                  {!isScreenshotting && !isDevToolsOpen && (
                    <WatermarkOverlay currentUser={{ name: viewerName, email: viewerEmail }} />
                  )}
                </div>
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
