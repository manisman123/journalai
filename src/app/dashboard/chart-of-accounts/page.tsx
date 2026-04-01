'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ChartOfAccount, ApiResponse } from '@/types';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface ExpandedState {
  [key: string]: boolean;
}

const accountTypeColors: Record<string, string> = {
  asset: 'bg-[#EEF3FA] text-[#4A7FC4]',
  liability: 'bg-[#FDF0F0] text-[#C44B4B]',
  equity: 'bg-[#F3EEF8] text-[#7B5EA7]',
  revenue: 'bg-[#EEF6F1] text-[#3D8B5E]',
  expense: 'bg-[#FDF5E8] text-[#C4851C]',
};

const accountTypeLabels: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

export default function ChartOfAccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'asset' as const,
    parent_id: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  const fetchAccounts = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/chart-of-accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch accounts');

      const result: ApiResponse<ChartOfAccount[]> = await response.json();
      if (result.data) {
        setAccounts(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) return;

    try {
      const response = await fetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to add account');

      setFormData({ code: '', name: '', type: 'asset', parent_id: '' });
      setShowAddForm(false);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleExpand = (type: string) => {
    setExpanded({
      ...expanded,
      [type]: !expanded[type],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner"></div>
      </div>
    );
  }

  const accountsByType = accounts.reduce(
    (acc, account) => {
      if (!acc[account.type]) {
        acc[account.type] = [];
      }
      acc[account.type].push(account);
      return acc;
    },
    {} as Record<string, ChartOfAccount[]>
  );

  const types = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-[#1D1B1A]">Chart of Accounts</h1>
          <p className="text-[#71706E] mt-3 text-base">Manage your accounts organized by type</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
        >
          <Plus size={20} />
          Add Account
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FDF0F0] border border-[#C44B4B] text-[#C44B4B] rounded-2xl text-base">
          {error}
        </div>
      )}

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <h2 className="text-2xl font-bold text-[#1D1B1A] mb-6">Add New Account</h2>
          <form onSubmit={handleAddAccount} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                  Account Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="1000"
                  required
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Cash in Hand"
                  required
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
                >
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                  Parent Account (Optional)
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
                >
                  <option value="">None</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                Add Account
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-[#F9F7F4] hover:bg-[#F0EDE9] border border-[#E6E2DD] text-[#1D1B1A] py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts by Type */}
      <div className="space-y-6">
        {types.map((type) => {
          const typeAccounts = accountsByType[type] || [];
          const isExpanded = expanded[type] !== false;

          return (
            <div key={type} className="bg-white rounded-2xl border border-[#E6E2DD] overflow-hidden">
              <button
                onClick={() => toggleExpand(type)}
                className={`w-full flex items-center justify-between p-5 transition-colors text-base font-semibold ${
                  accountTypeColors[type]
                } hover:opacity-90`}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <h2 className="text-lg font-bold">{accountTypeLabels[type]}</h2>
                  <span className="text-base opacity-75">({typeAccounts.length})</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#E6E2DD]">
                  {typeAccounts.length === 0 ? (
                    <div className="p-6 text-center text-[#71706E] text-base">No accounts</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-[#F0EDE9] border-b border-[#E6E2DD]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E2DD]">
                        {typeAccounts.map((account) => (
                          <tr key={account.id} className="hover:bg-[#F0EDE9] transition-colors">
                            <td className="px-6 py-4 text-base font-medium text-[#1D1B1A]">
                              {account.code}
                            </td>
                            <td className="px-6 py-4 text-base text-[#1D1B1A]">
                              {account.name}
                            </td>
                            <td className="px-6 py-4 text-base text-[#71706E]">
                              <span className="px-2 py-1 bg-[#F9F7F4] text-[#71706E] rounded text-sm font-medium">
                                {account.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-base">
                              {account.is_default ? (
                                <span className="px-2 py-1 bg-[#FDF5E8] text-[#C4851C] rounded text-sm font-medium">
                                  Default
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-[#F9F7F4] text-[#71706E] rounded text-sm font-medium">
                                  Custom
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
