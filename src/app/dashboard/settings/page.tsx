'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ApiResponse, SubscriptionTier } from '@/types';
import { Check, X } from 'lucide-react';

interface SettingsData {
  currentPlan: 'free' | 'pro' | 'enterprise' | 'lifetime';
  usage: {
    docsProcessed: number;
    docsLimit: number;
    storageUsed: number;
    storageLimit: number;
  };
  company: {
    name: string;
    registrationNumber: string;
    address: string;
    phone: string;
  };
}

interface TierFeatures {
  [key: string]: SubscriptionTier;
}

const tierFeatures: TierFeatures = {
  free: {
    name: 'Free',
    docsPerMonth: 10,
    platforms: ['Web'],
    storageMB: 100,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: false,
      irasTax: false,
      multiEntity: false,
      prioritySupport: false,
    },
    llmRouter: 'gpt-3.5-turbo',
    maxPagesPerDoc: 5,
  },
  pro: {
    name: 'Pro',
    docsPerMonth: 100,
    platforms: ['Web', 'API'],
    storageMB: 1000,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: true,
      irasTax: true,
      multiEntity: true,
      prioritySupport: true,
    },
    llmRouter: 'gpt-4',
    maxPagesPerDoc: 50,
  },
  enterprise: {
    name: 'Enterprise',
    docsPerMonth: 1000,
    platforms: ['Web', 'API', 'Custom Integration'],
    storageMB: 10000,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: true,
      irasTax: true,
      multiEntity: true,
      prioritySupport: true,
    },
    llmRouter: 'gpt-4-turbo',
    maxPagesPerDoc: 500,
  },
  lifetime: {
    name: 'Lifetime',
    docsPerMonth: 5000,
    platforms: ['Web', 'API', 'Custom Integration'],
    storageMB: 50000,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: true,
      irasTax: true,
      multiEntity: true,
      prioritySupport: true,
    },
    llmRouter: 'gpt-4-turbo',
    maxPagesPerDoc: 1000,
  },
};

const featureLabels: Record<string, string> = {
  ocr: 'OCR Text Recognition',
  extraction: 'Data Extraction',
  complianceWarnings: 'Compliance Warnings',
  complianceDetails: 'Detailed Compliance Reports',
  irasTax: 'IRAS Tax Compliance',
  multiEntity: 'Multi-Entity Support',
  prioritySupport: 'Priority Support',
};

export default function SettingsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    registrationNumber: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const result: ApiResponse<SettingsData> = await response.json();
      if (result.data) {
        setData(result.data);
        setCompanyForm(result.data.company);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = (tier: string) => {
    alert(`Upgrade to ${tier} plan - Payment processing would be integrated here`);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const response = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(companyForm),
      });

      if (!response.ok) throw new Error('Failed to save company info');

      setEditingCompany(false);
      await fetchSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner"></div>
      </div>
    );
  }

  const currentTierData = user?.tier ? tierFeatures[user.tier] : null;
  const usagePercent = data ? (data.usage.docsProcessed / data.usage.docsLimit) * 100 : 0;

  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#1D1B1A]">Settings</h1>
        <p className="text-[#71706E] mt-3 text-base">Manage your account and subscription</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FDF0F0] border border-[#C44B4B] text-[#C44B4B] rounded-2xl text-base">
          {error}
        </div>
      )}

      {/* Current Plan */}
      {data && currentTierData && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <h2 className="text-2xl font-bold text-[#1D1B1A] mb-6">Current Plan</h2>
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div>
              <p className="text-sm text-[#71706E]">Plan Name</p>
              <p className="text-2xl font-bold text-[#1D1B1A] mt-2">
                {currentTierData.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#71706E]">Monthly Documents</p>
              <p className="text-2xl font-bold text-[#1D1B1A] mt-2">
                {currentTierData.docsPerMonth.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#71706E]">Storage</p>
              <p className="text-2xl font-bold text-[#1D1B1A] mt-2">
                {currentTierData.storageMB.toLocaleString()} MB
              </p>
            </div>
            <div>
              <p className="text-sm text-[#71706E]">Max Pages/Doc</p>
              <p className="text-2xl font-bold text-[#1D1B1A] mt-2">
                {currentTierData.maxPagesPerDoc}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-[#1D1B1A] mb-4 text-base">Included Features</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(currentTierData.features).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-3">
                  {enabled ? (
                    <Check className="text-[#3D8B5E]" size={20} />
                  ) : (
                    <X className="text-[#A09D9A]" size={20} />
                  )}
                  <span className={enabled ? 'text-[#1D1B1A] text-base' : 'text-[#A09D9A] text-base'}>
                    {featureLabels[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {data && (
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
          <h2 className="text-2xl font-bold text-[#1D1B1A] mb-8">Usage Statistics</h2>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-base font-medium text-[#1D1B1A]">Documents Processed</span>
                <span className="text-base font-semibold text-[#1D1B1A]">
                  {data.usage.docsProcessed} / {data.usage.docsLimit}
                </span>
              </div>
              <div className="w-full bg-[#E6E2DD] rounded-full h-3">
                <div
                  className="bg-[#C47254] h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-[#A09D9A] mt-2">
                {Math.round(usagePercent)}% of monthly limit
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-base font-medium text-[#1D1B1A]">Storage Used</span>
                <span className="text-base font-semibold text-[#1D1B1A]">
                  {(data.usage.storageUsed / 1024).toFixed(2)} MB /{' '}
                  {(data.usage.storageLimit / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="w-full bg-[#E6E2DD] rounded-full h-3">
                <div
                  className="bg-[#7B5EA7] h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min((data.usage.storageUsed / data.usage.storageLimit) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Information */}
      <div className="bg-white rounded-2xl border border-[#E6E2DD] p-8 mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#1D1B1A]">Company Information</h2>
          {!editingCompany && (
            <button
              onClick={() => setEditingCompany(true)}
              className="text-[#C47254] hover:text-[#B5654A] text-base font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {editingCompany ? (
          <form onSubmit={handleSaveCompany} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                Company Name
              </label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                Registration Number
              </label>
              <input
                type="text"
                value={companyForm.registrationNumber}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, registrationNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                Address
              </label>
              <input
                type="text"
                value={companyForm.address}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#71706E] mb-2 uppercase tracking-wider">
                Phone
              </label>
              <input
                type="tel"
                value={companyForm.phone}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-[#E6E2DD] rounded-xl bg-[#FAFAF8] focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-base"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingCompany(false)}
                className="bg-[#F9F7F4] hover:bg-[#F0EDE9] border border-[#E6E2DD] text-[#1D1B1A] py-2 px-4 rounded-xl transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-[#71706E]">Company Name</p>
              <p className="font-medium text-[#1D1B1A] mt-1">{data?.company.name}</p>
            </div>
            <div>
              <p className="text-sm text-[#71706E]">Registration Number</p>
              <p className="font-medium text-[#1D1B1A] mt-1">
                {data?.company.registrationNumber || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#71706E]">Address</p>
              <p className="font-medium text-[#1D1B1A] mt-1">
                {data?.company.address || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#71706E]">Phone</p>
              <p className="font-medium text-[#1D1B1A] mt-1">
                {data?.company.phone || '-'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Plans */}
      {user?.tier === 'free' && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-[#1D1B1A] mb-6">Upgrade Your Plan</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border-2 border-[#C47254]">
              <h3 className="text-xl font-bold text-[#1D1B1A] mb-3">Pro Plan</h3>
              <p className="text-base text-[#71706E] mb-6">Perfect for growing businesses</p>
              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="text-[#3D8B5E]" size={16} />
                  <span className="text-base text-[#1D1B1A]">100 documents/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="text-[#3D8B5E]" size={16} />
                  <span className="text-base text-[#1D1B1A]">Detailed compliance reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="text-[#3D8B5E]" size={16} />
                  <span className="text-base text-[#1D1B1A]">IRAS tax compliance</span>
                </div>
              </div>
              <button
                onClick={() => handleUpgradeClick('Pro')}
                className="w-full bg-[#C47254] hover:bg-[#B5654A] text-white py-2 px-4 rounded-xl font-medium transition-colors text-sm"
              >
                Upgrade to Pro
              </button>
            </div>

            <div className="bg-white rounded-2xl p-8 border-2 border-[#7B5EA7]">
              <h3 className="text-xl font-bold text-[#1D1B1A] mb-3">Enterprise Plan</h3>
              <p className="text-base text-[#71706E] mb-6">For large organizations</p>
              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="text-[#3D8B5E]" size={16} />
                  <span className="text-base text-[#1D1B1A]">1000 documents/month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="text-[#3D8B5E]" size={16} />
                  <span className="text-base text-[#1D1B1A]">Multi-entity support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="text-[#3D8B5E]" size={16} />
                  <span className="text-base text-[#1D1B1A]">Priority support</span>
                </div>
              </div>
              <button
                onClick={() => handleUpgradeClick('Enterprise')}
                className="w-full bg-[#7B5EA7] hover:bg-[#6B4E97] text-white py-2 px-4 rounded-xl font-medium transition-colors text-sm"
              >
                Upgrade to Enterprise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
