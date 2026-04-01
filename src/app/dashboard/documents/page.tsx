'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Document, ApiResponse } from '@/types';
import { Upload, Zap, Eye, FileText, X, CheckCircle, Loader2, ArrowRightLeft } from 'lucide-react';

const statusStyles: Record<string, string> = {
  uploaded: 'bg-[#F0EDE9] text-[#A09D9A]',
  processing: 'bg-[#FDF5E8] text-[#C4851C]',
  extracted: 'bg-[#EEF3FA] text-[#4A7FC4]',
  categorized: 'bg-[#EEF6F1] text-[#3D8B5E]',
  posted: 'bg-[#F3EEF8] text-[#7B5EA7]',
};

const formatCurrency = (amount: number, currency: string = 'SGD') => {
  const symbols: Record<string, string> = { SGD: 'S$', USD: 'US$', MYR: 'RM' };
  return `${symbols[currency] || currency}${amount.toFixed(2)}`;
};

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<(Document & { pipeline?: string; classification?: any; exchangeRate?: any }) | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [categorizingId, setCategorizingId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{
    base64: string;
    mediaType: string;
    name: string;
  } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const fetchDocuments = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      const result: ApiResponse<Document[]> = await response.json();
      if (result.data) setDocuments(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!token) return;
    setUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result: ApiResponse<Document & { pipeline?: string; classification?: any; exchangeRate?: any }> = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      if (result.data) {
        setUploadResult(result.data);
        await fetchDocuments();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, [token]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleCategorize = async (docId: string) => {
    if (!token) return;
    setCategorizingId(docId);
    try {
      const response = await fetch(`/api/documents/${docId}/categorize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Categorization failed');
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCategorizingId(null);
    }
  };

  const handleView = async (doc: Document) => {
    setSelectedDoc(doc);
    setViewingFile(null);
    setLoadingFile(true);
    try {
      const response = await fetch(`/api/documents/${doc.id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setViewingFile({
          base64: result.data.file_base64,
          mediaType: result.data.file_media_type,
          name: result.data.original_name,
        });
      }
    } catch (err) {
      console.error('Failed to fetch file:', err);
    } finally {
      setLoadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-[1.75rem] font-semibold text-[#1D1B1A]">Documents</h1>
        <p className="text-sm text-[#71706E] mt-2">
          Upload invoices, receipts, or bank statements — AI extracts the data automatically
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-[#FDF0F0] border border-[#D4CFC9] text-[#C44B4B] rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-[#C44B4B]/60 hover:text-[#C44B4B]">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <div
        className={`mb-10 border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-[#C47254] bg-[#C47254]/5'
            : 'border-[#E6E2DD] bg-white hover:border-[#C47254]/40 hover:bg-[#F9F7F4]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.xlsx"
          onChange={handleFileSelect}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-[#C47254] animate-spin" />
            <p className="text-base font-medium text-[#1D1B1A]">Processing document with AI...</p>
            <p className="text-sm text-[#71706E]">Running OCR extraction and data parsing</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-[#C47254]/10 rounded-2xl flex items-center justify-center">
              <Upload size={32} className="text-[#C47254]" />
            </div>
            <div>
              <p className="text-base font-medium text-[#1D1B1A]">
                Drop your file here or <span className="text-[#C47254]">browse</span>
              </p>
              <p className="text-sm text-[#71706E] mt-2">
                PDF, images, CSV, or text files — Claude AI will extract vendor, amount, date, tax, and line items
              </p>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap justify-center">
              {['PDF', 'PNG', 'JPG', 'CSV', 'TXT'].map((ext) => (
                <span
                  key={ext}
                  className="px-2.5 py-0.5 bg-[#F0EDE9] text-[#71706E] text-xs font-medium rounded-full"
                >
                  .{ext.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Result — OCR Extracted Data */}
      {uploadResult && (
        <div className="mb-10 bg-white rounded-2xl border border-[#E6E2DD] overflow-hidden">
          <div className="p-8 border-b border-[#E6E2DD] bg-[#EEF6F1]/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#3D8B5E]/10 rounded-xl flex items-center justify-center">
                  <CheckCircle size={28} className="text-[#3D8B5E]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#1D1B1A]">AI Extraction Complete</h2>
                  <p className="text-sm text-[#71706E] mt-1">
                    Processed <span className="font-medium text-[#1D1B1A]">{uploadResult.original_name}</span> —
                    confidence {Math.round((uploadResult.extracted_data?.confidence || 0) * 100)}%
                    {uploadResult.pipeline && (
                      <span className={`ml-3 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        uploadResult.pipeline === 'ai'
                          ? 'bg-[#EEF6F1] text-[#3D8B5E]'
                          : 'bg-[#FDF5E8] text-[#C4851C]'
                      }`}>
                        {uploadResult.pipeline === 'ai' ? 'Claude AI' : 'Heuristic'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="text-[#A09D9A] hover:text-[#1D1B1A] p-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#FAFAF8] rounded-xl p-5 border border-[#E6E2DD]">
                <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Vendor</p>
                <p className="text-lg font-semibold text-[#1D1B1A] mt-2">
                  {uploadResult.extracted_data?.vendor || 'Unknown'}
                </p>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-5 border border-[#E6E2DD]">
                <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Date</p>
                <p className="text-lg font-semibold text-[#1D1B1A] mt-2">
                  {uploadResult.extracted_data?.date
                    ? new Date(uploadResult.extracted_data.date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-5 border border-[#E6E2DD]">
                <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Currency</p>
                <p className="text-lg font-semibold text-[#1D1B1A] mt-2">
                  {uploadResult.extracted_data?.currency || 'SGD'}
                </p>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-5 border border-[#E6E2DD]">
                <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Subtotal</p>
                <p className="text-lg font-semibold text-[#1D1B1A] mt-2">
                  {formatCurrency(
                    uploadResult.extracted_data?.amount || 0,
                    uploadResult.extracted_data?.currency ?? 'SGD'
                  )}
                </p>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-5 border border-[#E6E2DD]">
                <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">
                  Tax {(uploadResult.extracted_data as any)?.tax_rate ? `(${(uploadResult.extracted_data as any).tax_rate})` : ''}
                </p>
                <p className="text-lg font-semibold text-[#C47254] mt-2">
                  {formatCurrency(
                    uploadResult.extracted_data?.tax || 0,
                    uploadResult.extracted_data?.currency ?? 'SGD'
                  )}
                </p>
              </div>
              <div className="bg-[#C47254]/5 rounded-xl p-5 border border-[#C47254]/20">
                <p className="text-xs font-medium text-[#C47254] uppercase tracking-wider">Total</p>
                <p className="text-xl font-bold text-[#1D1B1A] mt-2">
                  {formatCurrency(
                    (uploadResult.extracted_data as any)?.total || (uploadResult.extracted_data?.amount || 0) + (uploadResult.extracted_data?.tax || 0),
                    uploadResult.extracted_data?.currency ?? 'SGD'
                  )}
                </p>
              </div>
            </div>

            {/* SGD Conversion Banner — IRAS Foreign Currency Compliance */}
            {uploadResult.exchangeRate && uploadResult.exchangeRate.from !== 'SGD' && (
              <div className="mb-8 bg-[#EEF3FA] border border-[#E6E2DD] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#4A7FC4]/10 rounded-lg flex items-center justify-center">
                    <ArrowRightLeft size={20} className="text-[#4A7FC4]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1D1B1A]">SGD Conversion (IRAS Compliance)</h3>
                    <p className="text-sm text-[#71706E]">
                      Foreign currency converted at spot rate on invoice date per IRAS regulations
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Exchange Rate</p>
                    <p className="text-lg font-bold text-[#4A7FC4] mt-1">
                      1 {uploadResult.exchangeRate.from} = {uploadResult.exchangeRate.rate.toFixed(4)} SGD
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Rate Date</p>
                    <p className="text-lg font-semibold text-[#1D1B1A] mt-1">
                      {new Date(uploadResult.exchangeRate.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Amount in SGD</p>
                    <p className="text-lg font-bold text-[#3D8B5E] mt-1">
                      S${uploadResult.exchangeRate.sgdAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Source</p>
                    <p className="text-sm font-medium text-[#71706E] mt-1">
                      {uploadResult.exchangeRate.source}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {uploadResult.extracted_data?.line_items &&
              uploadResult.extracted_data.line_items.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-base font-semibold text-[#1D1B1A] mb-4">Extracted Line Items</h3>
                  <div className="bg-[#FAFAF8] rounded-xl overflow-hidden border border-[#E6E2DD]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#E6E2DD]">
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.extracted_data.line_items.map((item, idx) => (
                          <tr key={idx} className="border-b border-[#E6E2DD] last:border-b-0">
                            <td className="px-6 py-4 text-sm text-[#1D1B1A]">{item.description}</td>
                            <td className="px-6 py-4 text-sm text-[#71706E] text-right">{item.quantity}</td>
                            <td className="px-6 py-4 text-sm text-[#71706E] text-right">
                              {formatCurrency(item.unit_price ?? 0, uploadResult.extracted_data?.currency ?? 'SGD')}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#1D1B1A] text-right">
                              {formatCurrency(item.amount ?? 0, uploadResult.extracted_data?.currency ?? 'SGD')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleCategorize(uploadResult.id);
                  setUploadResult(null);
                }}
                className="flex items-center gap-2 bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                <Zap size={18} />
                Auto-Categorize with AI
              </button>
              <button
                onClick={() => setUploadResult(null)}
                className="py-2 px-4 border border-[#E6E2DD] rounded-xl text-[#1D1B1A] hover:bg-[#F0EDE9] transition-colors text-sm font-medium bg-[#F9F7F4]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Document Detail */}
      {selectedDoc && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C47254]/10 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-[#C47254]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#1D1B1A]">{selectedDoc.original_name}</h2>
                <p className="text-sm text-[#71706E] mt-1">
                  Uploaded {new Date(selectedDoc.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedDoc(null); setViewingFile(null); }}
              className="text-[#A09D9A] hover:text-[#1D1B1A] p-2"
            >
              <X size={20} />
            </button>
          </div>

          {/* Original File Preview */}
          <div className="mb-6">
            {loadingFile ? (
              <div className="flex items-center justify-center py-12 bg-[#FAFAF8] rounded-xl border border-[#E6E2DD]">
                <Loader2 size={32} className="text-[#C47254] animate-spin" />
                <span className="ml-3 text-[#71706E] text-sm">Loading original document...</span>
              </div>
            ) : viewingFile ? (
              <div className="bg-[#FAFAF8] rounded-xl p-4 border border-[#E6E2DD]">
                <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider mb-3">
                  Original Document
                </p>
                {viewingFile.mediaType.startsWith('image/') ? (
                  <div className="flex justify-center">
                    <img
                      src={`data:${viewingFile.mediaType};base64,${viewingFile.base64}`}
                      alt={viewingFile.name}
                      className="max-w-full max-h-[600px] rounded-lg border border-[#E6E2DD]"
                    />
                  </div>
                ) : viewingFile.mediaType === 'application/pdf' ? (
                  <iframe
                    src={`data:application/pdf;base64,${viewingFile.base64}`}
                    className="w-full h-[600px] rounded-lg border border-[#E6E2DD]"
                    title={viewingFile.name}
                  />
                ) : (
                  <div className="bg-white rounded-lg border border-[#E6E2DD] p-6 max-h-[400px] overflow-auto">
                    <pre className="text-sm text-[#1D1B1A] whitespace-pre-wrap font-mono">
                      {atob(viewingFile.base64)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 bg-[#FAFAF8] rounded-xl border border-[#E6E2DD] text-[#71706E] text-sm">
                No original file stored for this document (uploaded before file storage was enabled)
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Vendor</p>
              <p className="text-base font-semibold text-[#1D1B1A] mt-2">
                {selectedDoc.extracted_data?.vendor || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Amount</p>
              <p className="text-base font-semibold text-[#1D1B1A] mt-2">
                {selectedDoc.extracted_data?.amount
                  ? formatCurrency(selectedDoc.extracted_data.amount, selectedDoc.extracted_data.currency || 'SGD')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Date</p>
              <p className="text-base font-semibold text-[#1D1B1A] mt-2">
                {selectedDoc.extracted_data?.date
                  ? new Date(selectedDoc.extracted_data.date).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Status</p>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  statusStyles[selectedDoc.status] || 'bg-[#F0EDE9] text-[#A09D9A]'
                }`}
              >
                {selectedDoc.status}
              </span>
            </div>
          </div>

          {selectedDoc.extracted_data?.line_items && selectedDoc.extracted_data.line_items.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#E6E2DD]">
              <p className="text-xs font-medium text-[#71706E] uppercase tracking-wider mb-4">
                Line Items
              </p>
              <table className="w-full text-sm">
                <tbody className="border-t border-[#E6E2DD]">
                  {selectedDoc.extracted_data.line_items.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#E6E2DD]">
                      <td className="py-3 text-[#1D1B1A]">{item.description}</td>
                      <td className="text-right text-[#71706E]">
                        {item.quantity} x {formatCurrency(item.unit_price ?? 0)}
                      </td>
                      <td className="text-right font-medium text-[#1D1B1A]">
                        {formatCurrency(item.amount ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F9F7F4] border-b border-[#E6E2DD]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E2DD]">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-[#F9F7F4] transition-colors">
                <td className="px-6 py-4 text-sm text-[#1D1B1A] font-medium">
                  {doc.original_name}
                </td>
                <td className="px-6 py-4 text-sm text-[#71706E]">
                  {doc.extracted_data?.vendor || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-[#1D1B1A] text-right font-medium">
                  {doc.extracted_data?.amount
                    ? formatCurrency(doc.extracted_data.amount, doc.extracted_data.currency || 'SGD')
                    : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-[#71706E]">
                  {doc.extracted_data?.date
                    ? new Date(doc.extracted_data.date).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusStyles[doc.status] || 'bg-[#F0EDE9] text-[#A09D9A]'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleView(doc)}
                      className="inline-flex items-center gap-1.5 text-[#C47254] hover:text-[#B5654A] font-medium"
                    >
                      <Eye size={18} />
                      View
                    </button>
                    <button
                      onClick={() => handleCategorize(doc.id)}
                      disabled={categorizingId === doc.id}
                      className="inline-flex items-center gap-1.5 text-[#3D8B5E] hover:text-[#326947] font-medium disabled:opacity-50"
                    >
                      {categorizingId === doc.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Zap size={18} />
                      )}
                      Categorize
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#F0EDE9] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-[#A09D9A]" />
            </div>
            <p className="text-base font-medium text-[#1D1B1A]">No documents yet</p>
            <p className="text-sm text-[#71706E] mt-2">
              Upload your first invoice or receipt above to get started
            </p>
          </div>
        )}
      </div>
    </>
  );
}
