'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ApiResponse } from '@/types';
import { Download } from 'lucide-react';

// ── Minimal PDF builder — zero dependencies ──
function buildPDF(lines: Array<{ text: string; x: number; y: number; size?: number; bold?: boolean; color?: string }>): Uint8Array {
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;

  const enc = (s: string) => new TextEncoder().encode(s);
  const colorCmd = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
  };
  const escPdf = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  let stream = 'BT\n';
  for (const l of lines) {
    const sz = l.size || 10;
    const font = l.bold ? '/F2' : '/F1';
    const c = l.color || '#1a1a1a';
    stream += `${colorCmd(c)}\n`;
    stream += `${font} ${sz} Tf\n`;
    stream += `${l.x} ${(PAGE_H - l.y).toFixed(2)} Td\n`;
    stream += `(${escPdf(l.text)}) Tj\n`;
    stream += `${-l.x} ${-(PAGE_H - l.y).toFixed(2)} Td\n`;
  }
  stream += 'ET\n';

  const header = '%PDF-1.4\n';
  let pdf = header;
  const trackOffsets: number[] = [];

  const addObject = (content: string) => {
    const num = trackOffsets.length + 1;
    trackOffsets.push(pdf.length);
    pdf += `${num} 0 obj\n${content}\nendobj\n`;
    return num;
  };

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>`);
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const streamBytes = enc(stream);
  addObject(`<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream`);

  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${trackOffsets.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of trackOffsets) {
    pdf += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += 'trailer\n';
  pdf += `<< /Size ${trackOffsets.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return enc(pdf);
}

interface AccountCategory {
  name: string;
  amount: number;
}

interface PnLData {
  period: string;
  revenue: { total: number; categories: AccountCategory[] };
  expenses: { total: number; categories: AccountCategory[] };
  net_income: number;
  gst_collected: number;
  gst_paid: number;
  currency: string;
}

const formatCurrency = (amount: number, currency: string = 'SGD') => {
  const symbols: Record<string, string> = { SGD: 'S$', USD: 'US$', MYR: 'RM' };
  return `${symbols[currency] || currency}${amount.toFixed(2)}`;
};

export default function ReportsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('SGD');

  useEffect(() => {
    fetchReport();
  }, [token, currency]);

  const fetchReport = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/pnl?currency=${currency}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      const result: ApiResponse<PnLData> = await response.json();
      if (result.data) setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;

    const sym = currency === 'SGD' ? 'S$' : currency === 'USD' ? 'US$' : currency === 'MYR' ? 'RM' : currency;
    const fmt = (n: number) => `${sym}${n.toFixed(2)}`;
    const totalRevenue = data.revenue?.total || 0;
    const totalExpenses = data.expenses?.total || 0;
    const netGST = (data.gst_collected || 0) - (data.gst_paid || 0);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const L: Array<{ text: string; x: number; y: number; size?: number; bold?: boolean; color?: string }> = [];
    let y = 50;
    const left = 56;
    const right = 540;

    L.push({ text: 'JournalAI', x: left, y, size: 22, bold: true, color: '#C47254' });
    L.push({ text: 'Bookkeeping Assistant', x: left, y: y + 18, size: 9, color: '#787878' });
    L.push({ text: `Generated: ${new Date().toLocaleDateString()}`, x: right - 120, y, size: 9, color: '#787878' });
    L.push({ text: `Currency: ${currency}`, x: right - 120, y: y + 12, size: 9, color: '#787878' });
    y += 50;

    L.push({ text: 'Profit & Loss Statement', x: left, y, size: 18, bold: true });
    y += 18;
    L.push({ text: `Period: ${currentMonth}  |  Currency: ${currency}`, x: left, y, size: 10, color: '#787878' });
    y += 28;

    L.push({ text: 'Revenue', x: left, y, size: 14, bold: true });
    y += 22;
    if (data.revenue?.categories?.length) {
      for (const cat of data.revenue.categories) {
        L.push({ text: cat.name, x: left + 10, y, size: 10, color: '#646464' });
        L.push({ text: fmt(cat.amount), x: right - 60, y, size: 10 });
        y += 16;
      }
    } else {
      L.push({ text: 'No revenue accounts found', x: left + 10, y, size: 10, color: '#a0a0a0' });
      y += 16;
    }
    y += 4;
    L.push({ text: 'Total Revenue', x: left + 10, y, size: 11, bold: true });
    L.push({ text: fmt(totalRevenue), x: right - 60, y, size: 11, bold: true, color: '#3D8B5E' });
    y += 30;

    L.push({ text: 'Expenses', x: left, y, size: 14, bold: true });
    y += 22;
    if (data.expenses?.categories?.length) {
      for (const cat of data.expenses.categories) {
        L.push({ text: cat.name, x: left + 10, y, size: 10, color: '#646464' });
        L.push({ text: fmt(cat.amount), x: right - 60, y, size: 10 });
        y += 16;
      }
    } else {
      L.push({ text: 'No expense accounts found', x: left + 10, y, size: 10, color: '#a0a0a0' });
      y += 16;
    }
    y += 4;
    L.push({ text: 'Total Expenses', x: left + 10, y, size: 11, bold: true });
    L.push({ text: fmt(totalExpenses), x: right - 60, y, size: 11, bold: true, color: '#C44B4B' });
    y += 30;

    L.push({ text: 'Net Income', x: left + 10, y, size: 13, bold: true });
    L.push({ text: fmt(data.net_income || 0), x: right - 60, y, size: 13, bold: true, color: (data.net_income || 0) >= 0 ? '#3D8B5E' : '#C44B4B' });
    y += 36;

    L.push({ text: 'GST Summary', x: left, y, size: 14, bold: true });
    y += 22;
    L.push({ text: 'GST Collected', x: left + 10, y, size: 10, color: '#646464' });
    L.push({ text: fmt(data.gst_collected || 0), x: left + 220, y, size: 10, color: '#4A7FC4' });
    y += 16;
    L.push({ text: 'GST Paid', x: left + 10, y, size: 10, color: '#646464' });
    L.push({ text: fmt(data.gst_paid || 0), x: left + 220, y, size: 10, color: '#C47254' });
    y += 16;
    L.push({ text: 'Net GST', x: left + 10, y, size: 11, bold: true });
    L.push({ text: fmt(netGST), x: left + 220, y, size: 11, bold: true });
    y += 36;

    L.push({ text: `Generated by JournalAI  |  ${new Date().toLocaleString()}  |  For reference purposes only.`, x: left, y, size: 8, color: '#a0a0a0' });

    const pdfBytes = buildPDF(L);
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PnL_Report_${currentMonth}_${currency}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  const totalRevenue = data?.revenue?.total || 0;
  const totalExpenses = data?.expenses?.total || 0;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-[#1D1B1A]">Reports</h1>
          <p className="text-sm text-[#71706E] mt-1">View your Profit & Loss statement</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      {/* Currency Filter */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-xs font-medium text-[#71706E] uppercase tracking-wider">Currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="px-3 py-1.5 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-2 focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-sm"
        >
          <option>SGD</option>
          <option>USD</option>
          <option>MYR</option>
        </select>
      </div>

      {/* P&L Statement */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-6">
        <h2 className="text-[#1D1B1A] text-xl font-semibold mb-8">Profit & Loss Statement</h2>

        {/* Revenue */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[#1D1B1A] mb-4">Revenue</h3>
          {data?.revenue?.categories && data.revenue.categories.length > 0 ? (
            <div className="space-y-0 mb-4">
              {data.revenue.categories.map((account, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
                  <span className="text-sm text-[#71706E]">{account.name}</span>
                  <span className="text-sm font-medium text-[#1D1B1A]">
                    {formatCurrency(account.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#A09D9A] py-4">No revenue accounts found</p>
          )}
          <div className="flex justify-between items-center border-t-2 border-[#E6E2DD] pt-3">
            <span className="text-sm font-semibold text-[#1D1B1A]">Total Revenue</span>
            <span className="font-semibold text-[#3D8B5E]">
              {formatCurrency(totalRevenue, currency)}
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[#1D1B1A] mb-4">Expenses</h3>
          {data?.expenses?.categories && data.expenses.categories.length > 0 ? (
            <div className="space-y-0 mb-4">
              {data.expenses.categories.map((account, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
                  <span className="text-sm text-[#71706E]">{account.name}</span>
                  <span className="text-sm font-medium text-[#1D1B1A]">
                    {formatCurrency(account.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#A09D9A] py-4">No expense accounts found</p>
          )}
          <div className="flex justify-between items-center border-t-2 border-[#E6E2DD] pt-3">
            <span className="text-sm font-semibold text-[#1D1B1A]">Total Expenses</span>
            <span className="font-semibold text-[#C44B4B]">
              {formatCurrency(totalExpenses, currency)}
            </span>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-[#F9F7F4] -mx-8 -mb-8 px-8 py-6 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#1D1B1A]">Net Income</span>
            <span className={`text-2xl font-semibold tracking-tight ${data?.net_income && data.net_income >= 0 ? 'text-[#3D8B5E]' : 'text-[#C44B4B]'}`}>
              {formatCurrency(data?.net_income || 0, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* GST Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-6">
          <h3 className="text-sm font-semibold text-[#1D1B1A] mb-4">GST Summary</h3>
          <div className="space-y-0">
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <span className="text-sm text-[#71706E]">GST Collected</span>
              <span className="text-sm font-medium text-[#4A7FC4]">
                {formatCurrency(data?.gst_collected || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <span className="text-sm text-[#71706E]">GST Paid</span>
              <span className="text-sm font-medium text-[#C47254]">
                {formatCurrency(data?.gst_paid || 0, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-sm font-semibold text-[#1D1B1A]">Net GST</span>
              <span className="font-semibold text-[#1D1B1A]">
                {formatCurrency((data?.gst_collected || 0) - (data?.gst_paid || 0), currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-6">
          <h3 className="text-sm font-semibold text-[#1D1B1A] mb-4">Summary</h3>
          <div className="space-y-0">
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <span className="text-sm text-[#71706E]">Total Revenue</span>
              <span className="text-sm font-medium text-[#3D8B5E]">
                {formatCurrency(totalRevenue, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-[#F0EDE9]">
              <span className="text-sm text-[#71706E]">Total Expenses</span>
              <span className="text-sm font-medium text-[#C44B4B]">
                {formatCurrency(totalExpenses, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-sm font-semibold text-[#1D1B1A]">Net Profit/Loss</span>
              <span className={`font-semibold ${(data?.net_income || 0) >= 0 ? 'text-[#3D8B5E]' : 'text-[#C44B4B]'}`}>
                {formatCurrency(data?.net_income || 0, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
