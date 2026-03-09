import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { read, utils } from 'xlsx';
import { FileText } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const OfficeViewer = ({ url, fileName, className = '' }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [htmlContent, setHtmlContent] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const loadDocument = async () => {
            if (!url) return;
            try {
                if (isMounted) {
                    setLoading(true);
                    setError(null);
                }

                // Fetch the array buffer from the Blob URL
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();

                const ext = fileName.split('.').pop().toLowerCase();

                if (ext === 'docx') {
                    if (containerRef.current) {
                        try {
                            containerRef.current.innerHTML = '';
                            await renderAsync(arrayBuffer, containerRef.current, null, {
                                className: 'docx',
                                inWrapper: true,
                                ignoreWidth: false,
                                ignoreHeight: false,
                            });
                        } catch (e) {
                            console.error('docx-preview error:', e);
                            if (isMounted) setError('Failed to render Word document natively. Please download it.');
                        }
                    }
                } else if (ext === 'doc') {
                    if (isMounted) setError('Older Word documents (.doc) cannot be previewed natively. Please download it.');
                } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
                    try {
                        const workbook = read(arrayBuffer, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        // Convert to clean HTML table
                        const html = utils.sheet_to_html(worksheet, { id: 'excel-table' });
                        if (isMounted) setHtmlContent(html);
                    } catch (e) {
                        console.error('xlsx logic error:', e);
                        if (isMounted) setError('Failed to render Excel worksheet natively. Please download it.');
                    }
                } else {
                    if (isMounted) setError('Unsupported Office format for inline preview.');
                }
            } catch (err) {
                console.error("Error loading document:", err);
                if (isMounted) setError("Failed to parse document for viewing.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDocument();
        return () => { isMounted = false; };
    }, [url, fileName]);

    if (error) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-white ${className}`}>
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">Preview Failed</h3>
                <p className="max-w-md">{error}</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full overflow-auto bg-slate-100 relative ${className}`}>
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 transition-opacity">
                    <LoadingSpinner />
                    <p className="mt-4 text-slate-500 font-medium">Processing document locally...</p>
                </div>
            )}

            {/* DOCX Container */}
            <div
                ref={containerRef}
                className={`${htmlContent ? 'hidden' : 'block'} min-h-full flex flex-col items-center`}
            />

            {/* XLSX Container */}
            {htmlContent && (
                <div className="p-4 sm:p-8 min-h-full bg-white shadow-sm overflow-x-auto">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        #excel-table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 14px; }
                        #excel-table td, #excel-table th { border: 1px solid #e2e8f0; padding: 8px 12px; }
                        #excel-table tr:nth-child(even){ background-color: #f8fafc; }
                        #excel-table tr:hover { background-color: #f1f5f9; }
                    `}} />
                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </div>
            )}
        </div>
    );
};

export default OfficeViewer;
