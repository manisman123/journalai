'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { JournalEntry, ApiResponse, ComplianceCheckResult } from '@/types';
import { CheckCircle, AlertTriangle, XCircle, Zap } from 'lucide-react';

export default function CompliancePage() {
  const { token, user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [checkResult, setCheckResult] = useState<ComplianceCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEntries();
  }, [token]);

  const fetchEntries = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/journal-entries', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch entries');

      const result: ApiResponse<JournalEntry[]> = await response.json();
      if (result.data) {
        setEntries(result.data);
        if (result.data.length > 0) {
          setSelectedEntryId(result.data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCompliance = async () => {
    if (!selectedEntryId || !token) return;

    try {
      setChecking(true);
      const response = await fetch(`/api/journal-entries/${selectedEntryId}/compliance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Compliance check failed');

      const result: ApiResponse<ComplianceCheckResult> = await response.json();
      if (result.data) {
        setCheckResult(result.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const canSeeDetails =
    user?.tier === 'pro' || user?.tier === 'enterprise' || user?.tier === 'lifetime';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#1D1B1A]">Compliance Checker</h1>
        <p className="text-[#71706E] mt-3 text-base">
          Check journal entries for Singapore accounting compliance
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FDF0F0] border border-[#C44B4B] text-[#C44B4B] rounded-2xl text-base">
          {error}
        </div>
      )}

      {/* Entry Selection */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
        <h2 className="text-2xl font-bold text-[#1D1B1A] mb-6">Select Journal Entry</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
              Journal Entry
            </label>
            <select
              value={selectedEntryId}
              onChange={(e) => setSelectedEntryId(e.target.value)}
              className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
            >
              <option value="">Select an entry...</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {new Date(entry.date).toLocaleDateString()} - {entry.description}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCheckCompliance}
            disabled={!selectedEntryId || checking}
            className="flex items-center gap-2 bg-[#C47254] hover:bg-[#B5654A] disabled:bg-[#A09D9A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
          >
            <Zap size={20} />
            {checking ? 'Checking...' : 'Run Compliance Check'}
          </button>
        </div>
      </div>

      {/* Compliance Result */}
      {checkResult && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <div className="flex items-start gap-6 mb-8">
            {checkResult.compliant ? (
              <div className="flex items-center gap-4">
                <CheckCircle className="text-[#3D8B5E] flex-shrink-0" size={36} />
                <div>
                  <h3 className="text-xl font-bold text-[#1D1B1A]">Compliant</h3>
                  <p className="text-base text-[#71706E] mt-1">This entry meets all compliance requirements</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <XCircle className="text-[#C44B4B] flex-shrink-0" size={36} />
                <div>
                  <h3 className="text-xl font-bold text-[#1D1B1A]">Issues Found</h3>
                  <p className="text-base text-[#71706E] mt-1">
                    {checkResult.issueCount} issue{checkResult.issueCount !== 1 ? 's' : ''} detected
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Compliance Details */}
          {canSeeDetails ? (
            <>
              {checkResult.issues && checkResult.issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#1D1B1A] text-base">Details:</h4>
                  {checkResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border text-base ${
                        issue.severity === 'error'
                          ? 'bg-[#FDF0F0] border-[#C44B4B]'
                          : 'bg-[#FDF5E8] border-[#C4851C]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {issue.severity === 'error' ? (
                          <XCircle className="text-[#C44B4B] flex-shrink-0 mt-0.5" size={20} />
                        ) : (
                          <AlertTriangle className="text-[#C4851C] flex-shrink-0 mt-0.5" size={20} />
                        )}
                        <div>
                          <p
                            className={`font-semibold text-base ${
                              issue.severity === 'error'
                                ? 'text-[#C44B4B]'
                                : 'text-[#C4851C]'
                            }`}
                          >
                            {issue.type}
                            {issue.field && ` (${issue.field})`}
                          </p>
                          <p
                            className={`text-base mt-2 ${
                              issue.severity === 'error'
                                ? 'text-[#C44B4B]'
                                : 'text-[#C4851C]'
                            }`}
                          >
                            {issue.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#EEF3FA] border border-[#4A7FC4] rounded-2xl p-6">
              <h4 className="font-semibold text-[#4A7FC4] mb-2 text-base">Upgrade to See Details</h4>
              <p className="text-base text-[#4A7FC4] mb-6">
                Detailed compliance issue information is available on Pro, Enterprise, and Lifetime plans.
              </p>
              <a
                href="/dashboard/settings"
                className="inline-block bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl text-sm font-medium transition-colors"
              >
                View Plans
              </a>
            </div>
          )}
        </div>
      )}

      {/* Compliance Guidelines */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8">
        <h2 className="text-2xl font-bold text-[#1D1B1A] mb-6">Singapore Compliance Guidelines</h2>
        <div className="space-y-6">
          <div className="border-l-2 border-[#C47254] pl-6">
            <h3 className="font-semibold text-[#1D1B1A] text-base">GST Records</h3>
            <p className="text-base text-[#71706E] mt-2">
              All transactions must be documented with GST details where applicable.
            </p>
          </div>
          <div className="border-l-2 border-[#C47254] pl-6">
            <h3 className="font-semibold text-[#1D1B1A] text-base">Journal Entry Balancing</h3>
            <p className="text-base text-[#71706E] mt-2">
              All journal entries must have equal debits and credits.
            </p>
          </div>
          <div className="border-l-2 border-[#C47254] pl-6">
            <h3 className="font-semibold text-[#1D1B1A] text-base">IRAS Compliance</h3>
            <p className="text-base text-[#71706E] mt-2">
              Transactions must comply with IRAS tax regulations and reporting requirements.
            </p>
          </div>
          <div className="border-l-2 border-[#C47254] pl-6">
            <h3 className="font-semibold text-[#1D1B1A] text-base">Currency Handling</h3>
            <p className="text-base text-[#71706E] mt-2">
              Foreign currency transactions must be recorded with proper exchange rates.
            </p>
          </div>
          <div className="border-l-2 border-[#C47254] pl-6">
            <h3 className="font-semibold text-[#1D1B1A] text-base">Document References</h3>
            <p className="text-base text-[#71706E] mt-2">
              All entries should be linked to supporting documents for audit trails.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
