import { useState, useEffect } from 'react';
import { documentAPI } from '../services/api.js';
import { useToast } from './ui/ToastContainer.jsx';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Modal from './ui/Modal.jsx';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import { Activity, ShieldOff, Clock, Trash2, Eye, Download, Link, Layers, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import Input from './ui/Input.jsx';

function ShareActivity() {
    const { showToast } = useToast();
    const [shares, setShares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedShares, setExpandedShares] = useState({});

    const [showExtendModal, setShowExtendModal] = useState(false);
    const [selectedShare, setSelectedShare] = useState(null);
    const [newExpiryDate, setNewExpiryDate] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchShares(page);
    }, [page]);

    const toggleExpand = (id) => {
        setExpandedShares(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === shares.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(shares.map(s => s.id)));
        }
    };

    const fetchShares = async (p = 1) => {
        setLoading(true);
        try {
            const response = await documentAPI.getShareLogs({ page: p, limit: 10 });
            setShares(response.data.data.shares);
            setTotalPages(response.data.data.pagination.pages);
        } catch (error) {
            showToast('Failed to fetch activity logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('Are you sure you want to revoke this share link?')) return;
        try {
            await documentAPI.revokeShare(id);
            showToast('Share link revoked successfully', 'success');
            fetchShares(page);
        } catch (error) {
            showToast('Failed to revoke share link', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} share links? This cannot be undone.`)) return;

        setActionLoading(true);
        try {
            await documentAPI.bulkDeleteShares(Array.from(selectedIds));
            showToast('Selected links deleted successfully', 'success');
            setSelectedIds(new Set());
            fetchShares(page);
        } catch (error) {
            showToast('Failed to delete selected links', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const openExtendModal = (share) => {
        setSelectedShare(share);
        setNewExpiryDate('');
        setShowExtendModal(true);
    };

    const handleExtend = async () => {
        if (!newExpiryDate) return;
        setActionLoading(true);
        try {
            await documentAPI.extendShare(selectedShare.id, new Date(newExpiryDate).toISOString());
            showToast('Share link extended successfully', 'success');
            setShowExtendModal(false);
            fetchShares(page);
        } catch (error) {
            showToast('Failed to extend share link', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header / Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
                    >
                        {selectedIds.size === shares.length && shares.length > 0 ? (
                            <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                            <Square size={20} className="text-slate-400" />
                        )}
                        <span>{selectedIds.size === 0 ? 'Select All' : `${selectedIds.size} Selected`}</span>
                    </button>

                    {selectedIds.size > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkDelete}
                            loading={actionLoading}
                            className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/10 dark:border-red-900/30"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete Selected
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Activity Feed</p>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><LoadingSpinner size="lg" text="Loading history..." /></div>
            ) : shares.length === 0 ? (
                <Card className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                    <Activity className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No active shares found</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Shared document logs will appear here once links are accessed.</p>
                </Card>
            ) : (
                <>
                    <div className="space-y-4">
                        {shares.map(share => {
                            const isExpanded = expandedShares[share.id];
                            const isSelected = selectedIds.has(share.id);
                            return (
                                <Card key={share.id} className={`overflow-hidden transition-all duration-300 border-l-4 ${isSelected ? 'border-l-blue-600 ring-2 ring-blue-500/10' : 'border-l-transparent'}`}>
                                    <div className="flex">
                                        <div
                                            onClick={() => toggleSelect(share.id)}
                                            className={`flex items-center justify-center px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-r dark:border-slate-800/50 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-300 dark:text-slate-600" />}
                                        </div>

                                        <div className="flex-1">
                                            <Card.Header
                                                className={`cursor-pointer select-none transition-colors dark:border-slate-700/50 ${isExpanded ? 'bg-slate-50 border-b border-slate-100 dark:bg-slate-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                                                onClick={() => toggleExpand(share.id)}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <Card.Title className="flex items-center gap-2 text-lg">
                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                                <Link size={18} className="text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <span className="truncate max-w-[200px] sm:max-w-md">{share.fileName}</span>
                                                            {isExpanded ? <ChevronUp size={20} className="text-slate-400 ml-auto md:hidden" /> : <ChevronDown size={20} className="text-slate-400 ml-auto md:hidden" />}
                                                        </Card.Title>
                                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${share.isActive && new Date(share.expiresAt) > new Date()
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                                }`}>
                                                                {share.isActive && new Date(share.expiresAt) > new Date() ? 'ACTIVE' : 'EXPIRED'}
                                                            </span>
                                                            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center">
                                                                <Clock size={12} className="mr-1" />
                                                                Expires: {formatDate(share.expiresAt)}
                                                            </span>
                                                            {share.burnAfterRead && (
                                                                <span className="text-xs text-red-500 flex items-center font-black bg-red-50 px-2 py-0.5 rounded-md dark:bg-red-900/20">🔥 BURN</span>
                                                            )}
                                                            {share.maxAccess && !share.burnAfterRead && (
                                                                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center font-black bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md">
                                                                    <Layers size={12} className="mr-1" /> MAX: {share.maxAccess}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                            {share.isActive && new Date(share.expiresAt) > new Date() && (
                                                                <>
                                                                    <Button variant="outline" size="sm" onClick={() => openExtendModal(share)}>
                                                                        Extend
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" onClick={() => handleRevoke(share.id)} className="text-red-600 border-red-200 hover:bg-red-100">
                                                                        Revoke
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="hidden md:block">
                                                            {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card.Header>

                                            <Card.Content className="pt-6 border-t dark:border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {/* Share Link Utility */}
                                                <div className="mb-6 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-800/50">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Secure Access Link</p>
                                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                                {window.location.origin}/shared/{share.token}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(`${window.location.origin}/shared/${share.token}`);
                                                                showToast('Link copied to clipboard', 'success');
                                                            }}
                                                            className="flex-shrink-0"
                                                            variant="outline"
                                                        >
                                                            <Link size={14} className="mr-2" />
                                                            Copy Link
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                                                        <span className="text-xl font-black text-slate-900 dark:text-white block">{share.stats.opens}</span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Opens</span>
                                                    </div>
                                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
                                                        <span className="text-xl font-black text-blue-700 dark:text-blue-400 block">{share.stats.views}</span>
                                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 block">Views</span>
                                                    </div>
                                                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                                                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 block">{share.stats.downloads}</span>
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 block">Downloads</span>
                                                    </div>
                                                    <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 text-center">
                                                        <span className="text-xl font-black text-red-700 dark:text-red-400 block">{share.stats.failed}</span>
                                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 block">Failed</span>
                                                    </div>
                                                </div>

                                                {/* Timeline */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Recent Access Logs</h4>
                                                    {share.events.length === 0 ? (
                                                        <div className="p-4 text-center text-sm text-slate-500 italic">No access events recorded yet.</div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {share.events.map(event => (
                                                                <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 shadow-sm">
                                                                    <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900">
                                                                        {event.eventType === 'VIEWED' ? <FileText size={14} className="text-blue-500" /> : <Eye size={14} className="text-slate-400" />}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{event.eventType.replace('_', ' ')}</span>
                                                                            <span className="text-[10px] text-slate-400 font-bold">{formatDate(event.timestamp)}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 font-medium flex gap-4 mt-0.5">
                                                                            <span>IP: {event.ipAddress}</span>
                                                                            <span className="truncate max-w-[150px]">UA: {event.userAgent}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </Card.Content>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-6 border-t dark:border-slate-800">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft size={16} /> Previous
                            </Button>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                Page <span className="text-slate-900 dark:text-white">{page}</span> of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="flex items-center gap-2"
                            >
                                Next <ChevronRight size={16} />
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Extend Modal */}
            <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extend Expiration" size="sm">
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Set a new date and time for this link to expire.</p>
                    <Input
                        type="datetime-local"
                        value={newExpiryDate}
                        onChange={(e) => setNewExpiryDate(e.target.value)}
                    />
                    <div className="flex gap-3 pt-2">
                        <Button className="flex-1" onClick={handleExtend} loading={actionLoading}>Update Link</Button>
                        <Button variant="outline" className="flex-1" onClick={() => setShowExtendModal(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default ShareActivity;
