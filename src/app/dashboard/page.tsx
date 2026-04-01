'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ApiResponse } from '@/types';
import { TrendingUp, FileText, AlertCircle, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardData {
  total_documents: number;
  documents_this_month: number;
  total_journal_entries: number;
  pending_entries: number;
  unreconciled_transactions: number;
  reconciled_count: number;
  revenue_total: number;
  expense_total: number;
  net_income: number;
  gst_collected: number;
  gst_paid: number;
  gst_liability: number;
  usage: {
    docs_processed: number;
    docs_limit: number;
    storage_used: number;
    storage_limit: number;
  };
  recent_activity: Array<{
    type: string;
    date: string;
    description: string;
  }>;
  currency_breakdown: Record<string, number>;
}

const formatCurrency = (amount: number, currency: string = 'SGD') => {
  const symbols: Record<string, string> = { SGD: 'S$', USD: 'US$', MYR: 'RM' };
  return `${symbols[currency] || currency}${amount.toFixed(2)}`;
};

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const result: ApiResponse<DashboardData> = await response.json();
        if (result.data) setData(result.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#FDF0F0] border border-[#F5D5D5] text-[#C44B4B] rounded-xl text-sm">
        {error}
      </div>
    );
  }

  const usagePercent = data ? (data.usage.docs_processed / data.usage.docs_limit) * 100 : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[#1D1B1A]">Dashboard</h1>
        <p className="text-[#71706E] mt-1 text-sm">Welcome back, {user?.name}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Documents',
            value: data?.total_documents || 0,
            icon: FileText,
            color: '#C47254',
            bg: 'rgba(196, 114, 84, 0.08)',
          },
          {
            label: 'Journal Entries',
            value: data?.total_journal_entries || 0,
            icon: TrendingUp,
            color: '#3D8B5E',
            bg: '#EEF6F1',
          },
          {
            label: 'Unreconciled',
            value: data?.unreconciled_transactions || 0,
            icon: AlertCircle,
            color: '#C4851C',
            bg: '#FDF5E8',
          },
          {
            label: 'Net Income',
            value: data ? formatCurrency(data.net_income) : 'S$0.00',
            icon: DollarSign,
            color: '#4A7FC4',
            bg: '#EEF3FA',
            isText: true,
          },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-[#E6E2DD] p-5 hover:border-[#D4CFC9] transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#A09D9A] uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-semibold text-[#1D1B1A] mt-2 tracking-tight">
                  {stat.isText ? stat.value : stat.value}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* P&L and GST Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-6">
          <h2 className="text-[#1D1B1A] mb-5">Profit & Loss</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={14} className="text-[#3D8B5E]" />
                <span className="text-sm text-[#71706E]">Revenue</span>
              </div>
              <span className="font-medium text-[#3D8B5E] text-sm">
                {data ? formatCurrency(data.revenue_total) : 'S$0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <div className="flex items-center gap-2">
                <ArrowDownRight size={14} className="text-[#C44B4B]" />
                <span className="text-sm text-[#71706E]">Expenses</span>
              </div>
              <span className="font-medium text-[#C44B4B] text-sm">
                {data ? formatCurrency(data.expense_total) : 'S$0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium text-[#1D1B1A] text-sm">Net Income</span>
              <span className="font-semibold text-[#1D1B1A]">
                {data ? formatCurrency(data.net_income) : 'S$0.00'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-6">
          <h2 className="text-[#1D1B1A] mb-5">GST Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <span className="text-sm text-[#71706E]">GST Collected</span>
              <span className="font-medium text-[#4A7FC4] text-sm">
                {data ? formatCurrency(data.gst_collected) : 'S$0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <span className="text-sm text-[#71706E]">GST Paid</span>
              <span className="font-medium text-[#C47254] text-sm">
                {data ? formatCurrency(data.gst_paid) : 'S$0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium text-[#1D1B1A] text-sm">Net Liability</span>
              <span className="font-semibold text-[#1D1B1A]">
                {data ? formatCurrency(data.gst_liability) : 'S$0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Meter */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] p-6 mb-8">
        <h2 className="text-[#1D1B1A] mb-4">Processing Usage</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#71706E]">
            {data?.usage.docs_processed || 0} of {data?.usage.docs_limit || 0} documents
          </span>
          <span className="text-sm font-medium text-[#1D1B1A]">
            {Math.round(usagePercent)}%
          </span>
        </div>
        <div className="w-full bg-[#F0EDE9] rounded-full h-1.5">
          <div
            className="bg-[#C47254] h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Currency Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data?.currency_breakdown &&
          Object.entries(data.currency_breakdown).map(([currency, amount]) => (
            <div key={currency} className="bg-white rounded-2xl border border-[#E6E2DD] p-5">
              <p className="text-xs font-medium text-[#A09D9A] uppercase tracking-wider">
                {currency} Balance
              </p>
              <p className="text-2xl font-semibold text-[#1D1B1A] mt-2 tracking-tight">
                {formatCurrency(amount, currency)}
              </p>
            </div>
          ))}
      </div>

      {/* Recent Activity */}
      {data?.recent_activity && data.recent_activity.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-[#E6E2DD] p-6">
          <h2 className="text-[#1D1B1A] mb-4">Recent Activity</h2>
          <div className="space-y-0">
            {data.recent_activity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-3 border-b border-[#F0EDE9] last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-[#1D1B1A]">{activity.description}</p>
                  <p className="text-xs text-[#A09D9A] mt-0.5 capitalize">{activity.type.replace('_', ' ')}</p>
                </div>
                <span className="text-xs text-[#A09D9A]">
                  {new Date(activity.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
