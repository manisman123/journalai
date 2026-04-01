'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { JournalEntry, ChartOfAccount, ApiResponse } from '@/types';
import { Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LineItemForm {
  account_id: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
  currency: string;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-[#F0EDE9] text-[#A09D9A]',
  pending: 'bg-[#FDF5E8] text-[#C4851C]',
  posted: 'bg-[#EEF6F1] text-[#3D8B5E]',
  voided: 'bg-[#FDF0F0] text-[#C44B4B]',
};

const formatCurrency = (amount: number, currency: string = 'SGD') => {
  const symbols: Record<string, string> = {
    SGD: 'S$',
    USD: 'US$',
    MYR: 'RM',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
};

export default function JournalEntriesPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [complianceCheck, setComplianceCheck] = useState<any>(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    currency: 'SGD',
    lines: [
      { account_id: '', account_name: '', debit: '', credit: '', description: '', currency: 'SGD' },
    ] as LineItemForm[],
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [entriesRes, accountsRes] = await Promise.all([
        fetch('/api/journal-entries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/chart-of-accounts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!entriesRes.ok || !accountsRes.ok) throw new Error('Failed to fetch data');

      const entriesData: ApiResponse<JournalEntry[]> = await entriesRes.json();
      const accountsData: ApiResponse<ChartOfAccount[]> = await accountsRes.json();

      if (entriesData.data) setEntries(entriesData.data);
      if (accountsData.data) setAccounts(accountsData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { account_id: '', account_name: '', debit: '', credit: '', description: '', currency: 'SGD' },
      ],
    });
  };

  const handleRemoveLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    (newLines[index] as any)[field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const calculateTotals = () => {
    const totalDebit = formData.lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
    const totalCredit = formData.lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
    return { totalDebit, totalCredit };
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const { totalDebit, totalCredit } = calculateTotals();

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError('Debits must equal credits');
      return;
    }

    if (!token) return;

    try {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: formData.date,
          description: formData.description,
          currency: formData.currency,
          entries: formData.lines.map((line) => ({
            account_id: line.account_id,
            account_name: line.account_name,
            debit: parseFloat(line.debit || '0'),
            credit: parseFloat(line.credit || '0'),
            description: line.description,
            currency: line.currency,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to create entry');

      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        currency: 'SGD',
        lines: [
          { account_id: '', account_name: '', debit: '', credit: '', description: '', currency: 'SGD' },
        ],
      });
      setShowCreateForm(false);
      setError('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePostEntry = async (entryId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/journal-entries/${entryId}/post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to post entry');

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVoidEntry = async (entryId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/journal-entries/${entryId}/void`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to void entry');

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCheckCompliance = async (entryId: string) => {
    if (!token) return;

    try {
      setCheckingCompliance(true);
      const response = await fetch(`/api/journal-entries/${entryId}/compliance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to check compliance');

      const result: ApiResponse = await response.json();
      setComplianceCheck({ entryId, ...result.data });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingCompliance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner"></div>
      </div>
    );
  }

  const { totalDebit, totalCredit } = calculateTotals();

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-[#1D1B1A]">Journal Entries</h1>
          <p className="text-[#71706E] mt-3 text-base">Record and manage journal entries</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Create Entry
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FDF0F0] border border-[#E6E2DD] text-[#C44B4B] rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Create Entry Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <h2 className="text-2xl font-bold text-[#1D1B1A] mb-6">Create Journal Entry</h2>
          <form onSubmit={handleCreateEntry} className="space-y-6">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Entry description"
                  required
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-sm"
                >
                  <option>SGD</option>
                  <option>USD</option>
                  <option>MYR</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[#1D1B1A] text-sm">Line Items</h3>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-[#C47254] hover:text-[#B5654A] text-sm font-medium"
                >
                  + Add Line
                </button>
              </div>

              {formData.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                  <select
                    value={line.account_id}
                    onChange={(e) => {
                      const account = accounts.find((a) => a.id === e.target.value);
                      handleLineChange(idx, 'account_id', e.target.value);
                      if (account) {
                        handleLineChange(idx, 'account_name', account.name);
                      }
                    }}
                    className="px-3 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] text-sm focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none"
                  >
                    <option>Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                    className="px-3 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] text-sm focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Credit"
                    value={line.credit}
                    onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                    className="px-3 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] text-sm focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                    className="px-3 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] text-sm focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none"
                  />
                  <select
                    value={line.currency}
                    onChange={(e) => handleLineChange(idx, 'currency', e.target.value)}
                    className="px-3 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] text-sm focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none"
                  >
                    <option>SGD</option>
                    <option>USD</option>
                    <option>MYR</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="text-[#C44B4B] hover:text-[#A63C3C]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E6E2DD]">
              <div className="text-sm">
                <p className="text-[#71706E]">
                  Debit: <span className="font-semibold text-[#1D1B1A]">{totalDebit.toFixed(2)}</span>
                </p>
                <p className="text-[#71706E]">
                  Credit: <span className="font-semibold text-[#1D1B1A]">{totalCredit.toFixed(2)}</span>
                </p>
                {Math.abs(totalDebit - totalCredit) > 0.01 && (
                  <p className="text-[#C44B4B] text-xs mt-1">Not balanced!</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={Math.abs(totalDebit - totalCredit) > 0.01}
                className="bg-[#C47254] hover:bg-[#B5654A] disabled:bg-[#A09D9A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                Create Entry
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-[#F9F7F4] hover:bg-[#F0EDE9] border border-[#E6E2DD] text-[#1D1B1A] py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Compliance Check Result */}
      {complianceCheck && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {complianceCheck.compliant ? (
                  <CheckCircle className="text-[#3D8B5E]" size={28} />
                ) : (
                  <XCircle className="text-[#C44B4B]" size={28} />
                )}
                <h2 className="text-xl font-bold text-[#1D1B1A]">
                  Compliance Check: {complianceCheck.compliant ? 'Compliant' : 'Issues Found'}
                </h2>
              </div>
              {complianceCheck.issues && complianceCheck.issues.length > 0 && (
                <div className="mt-6 space-y-3">
                  {complianceCheck.issues.map((issue: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <AlertCircle
                        className={issue.severity === 'error' ? 'text-[#C44B4B]' : 'text-[#C4851C]'}
                        size={18}
                      />
                      <span className="text-sm text-[#71706E]">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setComplianceCheck(null)}
              className="text-[#A09D9A] hover:text-[#1D1B1A]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F9F7F4] border-b border-[#E6E2DD]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Debit Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                Credit Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">Currency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E2DD]">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#F9F7F4] transition-colors">
                <td className="px-6 py-4 text-sm text-[#1D1B1A]">
                  {new Date(entry.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-[#1D1B1A] font-medium">
                  {entry.description}
                </td>
                <td className="px-6 py-4 text-sm text-[#1D1B1A] text-right">
                  {formatCurrency(entry.total_debit, entry.currency)}
                </td>
                <td className="px-6 py-4 text-sm text-[#1D1B1A] text-right">
                  {formatCurrency(entry.total_credit, entry.currency)}
                </td>
                <td className="px-6 py-4 text-sm text-[#71706E]">{entry.currency}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusStyles[entry.status] || 'bg-[#F0EDE9] text-[#A09D9A]'
                    }`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-3">
                  {entry.status === 'draft' && (
                    <button
                      onClick={() => handlePostEntry(entry.id)}
                      className="text-[#3D8B5E] hover:text-[#2D6B4A] font-medium"
                    >
                      Post
                    </button>
                  )}
                  <button
                    onClick={() => handleCheckCompliance(entry.id)}
                    disabled={checkingCompliance}
                    className="text-[#C47254] hover:text-[#B5654A] font-medium"
                  >
                    Check
                  </button>
                  {entry.status !== 'voided' && (
                    <button
                      onClick={() => handleVoidEntry(entry.id)}
                      className="text-[#C44B4B] hover:text-[#A63C3C] font-medium"
                    >
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="p-8 text-center text-[#71706E] text-sm">
            No journal entries found. Create your first entry to get started!
          </div>
        )}
      </div>
    </div>
  );
}
