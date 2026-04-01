'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { BankTransaction, Document, ApiResponse } from '@/types';
import { Link2, X, CheckCircle2, TrendingUp } from 'lucide-react';

const formatCurrency = (amount: number, currency: string = 'SGD') => {
  const symbols: Record<string, string> = {
    SGD: 'S$',
    USD: 'US$',
    MYR: 'RM',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
};

export default function ReconciliationPage() {
  const { token } = useAuth();
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBankTxn, setSelectedBankTxn] = useState<BankTransaction | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [bankRes, docsRes] = await Promise.all([
        fetch('/api/bank-transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!bankRes.ok || !docsRes.ok) throw new Error('Failed to fetch data');

      const bankData: ApiResponse<BankTransaction[]> = await bankRes.json();
      const docsData: ApiResponse<Document[]> = await docsRes.json();

      if (bankData.data) setBankTransactions(bankData.data.filter((t) => !t.reconciled));
      if (docsData.data) setDocuments(docsData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (!selectedBankTxn || !selectedDoc || !token) return;

    try {
      const response = await fetch(`/api/bank-transactions/${selectedBankTxn.id}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_id: selectedDoc.id,
        }),
      });

      if (!response.ok) throw new Error('Reconciliation failed');

      setSelectedBankTxn(null);
      setSelectedDoc(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUnreconcile = async (txnId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/bank-transactions/${txnId}/unreconcile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to unreconcile');

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getMatchingSuggestions = () => {
    if (!selectedBankTxn) return [];

    return documents.filter(
      (doc) =>
        doc.extracted_data?.amount &&
        Math.abs(doc.extracted_data.amount - selectedBankTxn.amount) < 0.01
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner"></div>
      </div>
    );
  }

  const reconciled = bankTransactions.length === 0 ? 0 : bankTransactions.length;
  const totalUnreconciled = bankTransactions.reduce((sum, t) => sum + t.amount, 0);
  const reconciliationRate = bankTransactions.length === 0 ? 100 : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[#1D1B1A]">Bank Reconciliation</h1>
        <p className="text-[#71706E] mt-3 text-base">Match bank transactions with documents to keep your records in sync</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-base">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 hover:border-[#C47254] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Unreconciled</p>
              <p className="text-3xl font-bold text-[#1D1B1A] mt-4">{bankTransactions.length}</p>
            </div>
            <TrendingUp className="text-[#C47254]" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 hover:border-[#C47254] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-[#1D1B1A] mt-4">
                {formatCurrency(totalUnreconciled)}
              </p>
            </div>
            <div className="bg-[#EEF6F1] rounded-xl p-3">
              <div className="w-6 h-6 bg-[#3D8B5E] rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 hover:border-[#C47254] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-[#1D1B1A] mt-4">{reconciliationRate}%</p>
            </div>
            <CheckCircle2 className="text-[#3D8B5E]" size={24} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedBankTxn ? (
        <div className="grid grid-cols-2 gap-8">
          {/* Selected Bank Transaction */}
          <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-xl font-bold text-[#1D1B1A]">Selected Transaction</h2>
              <button
                onClick={() => setSelectedBankTxn(null)}
                className="text-[#A09D9A] hover:text-[#C47254] transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Transaction Details */}
            <div className="space-y-6 mb-8">
              <div className="bg-[#F0EDE9] rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Date</p>
                <p className="font-semibold text-[#1D1B1A] mt-2">
                  {new Date(selectedBankTxn.date).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-[#F0EDE9] rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Description</p>
                <p className="font-semibold text-[#1D1B1A] mt-2">{selectedBankTxn.description}</p>
              </div>
              <div className="bg-[#F0EDE9] rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Amount</p>
                <p className="text-2xl font-bold text-[#C47254] mt-2">
                  {formatCurrency(selectedBankTxn.amount, selectedBankTxn.currency)}
                </p>
              </div>
              <div className="bg-[#F0EDE9] rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-[#A09D9A] font-medium">Bank</p>
                <p className="font-semibold text-[#1D1B1A] mt-2">{selectedBankTxn.bank_name}</p>
              </div>
            </div>

            {/* Matching Suggestions */}
            {getMatchingSuggestions().length > 0 && (
              <div className="bg-[#EEF3FA] border border-[#B8D4F0] rounded-xl p-6">
                <p className="text-sm font-bold text-[#4A7FC4] mb-4 uppercase tracking-wider">
                  Matching Documents ({getMatchingSuggestions().length})
                </p>
                <div className="space-y-2">
                  {getMatchingSuggestions().map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                        selectedDoc?.id === doc.id
                          ? 'bg-white border-[#4A7FC4] shadow-sm'
                          : 'bg-white border-[#E6E2DD] hover:border-[#A09D9A]'
                      }`}
                    >
                      <p className="font-medium text-[#1D1B1A]">{doc.original_name}</p>
                      <p className="text-xs text-[#71706E] mt-1">
                        {formatCurrency(
                          doc.extracted_data?.amount || 0,
                          doc.extracted_data?.currency || 'SGD'
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Document Selection */}
          <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8">
            <h2 className="text-xl font-bold text-[#1D1B1A] mb-8">Select Document to Match</h2>

            {/* Selected Document Preview */}
            {selectedDoc && (
              <div className="mb-8 p-6 bg-[#EEF6F1] border border-[#3D8B5E] rounded-xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-[#3D8B5E] uppercase tracking-wider">Selected</p>
                    <p className="font-semibold text-[#1D1B1A] mt-2">{selectedDoc.original_name}</p>
                    <p className="text-sm text-[#71706E] mt-1">
                      {formatCurrency(
                        selectedDoc.extracted_data?.amount || 0,
                        selectedDoc.extracted_data?.currency || 'SGD'
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-[#3D8B5E] hover:text-[#357A52] transition-colors p-1"
                  >
                    <X size={20} />
                  </button>
                </div>
                <button
                  onClick={handleReconcile}
                  className="w-full flex items-center justify-center gap-2 bg-[#3D8B5E] hover:bg-[#357A52] text-white py-3 px-4 rounded-xl transition-colors text-sm font-medium"
                >
                  <Link2 size={18} />
                  Reconcile
                </button>
              </div>
            )}

            {/* Document List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents
                .filter(
                  (doc) =>
                    doc.extracted_data?.amount &&
                    !doc.extracted_data.amount.toString().includes('undefined')
                )
                .map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full text-left p-4 rounded-xl border transition-all text-sm ${
                      selectedDoc?.id === doc.id
                        ? 'bg-[#EEF3FA] border-[#4A7FC4]'
                        : 'bg-white border-[#E6E2DD] hover:bg-[#F0EDE9]'
                    }`}
                  >
                    <p className="font-medium text-[#1D1B1A]">{doc.original_name}</p>
                    <p className="text-xs text-[#71706E] mt-1">
                      {doc.extracted_data?.vendor || 'Unknown'} - {' '}
                      {formatCurrency(
                        doc.extracted_data?.amount || 0,
                        doc.extracted_data?.currency || 'SGD'
                      )}
                    </p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8">
          {/* Bank Transactions */}
          <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8">
            <h2 className="text-xl font-bold text-[#1D1B1A] mb-6">Unreconciled Transactions</h2>
            {bankTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="mx-auto text-[#3D8B5E] mb-3" size={32} />
                <p className="text-[#71706E]">All transactions reconciled!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bankTransactions.map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() => setSelectedBankTxn(txn)}
                    className="w-full text-left p-4 bg-white hover:bg-[#F0EDE9] border border-[#E6E2DD] hover:border-[#C47254] rounded-xl transition-all text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#1D1B1A]">{txn.description}</p>
                        <p className="text-xs text-[#A09D9A] mt-1">
                          {new Date(txn.date).toLocaleDateString()} • {txn.bank_name}
                        </p>
                      </div>
                      <p className="font-bold text-[#C47254]">
                        {formatCurrency(txn.amount, txn.currency)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8">
            <h2 className="text-xl font-bold text-[#1D1B1A] mb-6">Documents</h2>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#71706E]">No documents found</p>
                </div>
              ) : (
                documents
                  .filter(
                    (doc) =>
                      doc.extracted_data?.amount &&
                      !doc.extracted_data.amount.toString().includes('undefined')
                  )
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-white border border-[#E6E2DD] hover:border-[#C47254] rounded-xl transition-colors text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[#1D1B1A]">{doc.original_name}</p>
                          <p className="text-xs text-[#A09D9A] mt-1">
                            {doc.extracted_data?.vendor || 'Unknown'}
                          </p>
                        </div>
                        <p className="font-bold text-[#C47254]">
                          {formatCurrency(
                            doc.extracted_data?.amount || 0,
                            doc.extracted_data?.currency || 'SGD'
                          )}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
