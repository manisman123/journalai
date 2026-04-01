'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@journalai.sg');
    setPassword('demo123');
    setError('');
    setIsSubmitting(true);

    try {
      await login('demo@journalai.sg', 'demo123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F7F4] p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#C47254]/10 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C47254" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
              <path d="M16 16l1 3 3-1"/>
              <path d="M8 16l-1 3-3-1"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1D1B1A] tracking-tight">JournalAI</h1>
          <p className="text-[#71706E] mt-1.5 text-sm">AI-Powered Bookkeeping for Singapore SMEs</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E6E2DD] p-7">
          {error && (
            <div className="mb-5 p-3 bg-[#FDF0F0] border border-[#F5D5D5] text-[#C44B4B] rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-[#71706E] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 border border-[#E6E2DD] rounded-xl focus:ring-2 focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-sm bg-[#FAFAF8] transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#71706E] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 border border-[#E6E2DD] rounded-xl focus:ring-2 focus:ring-[#C47254]/20 focus:border-[#C47254] focus:outline-none text-sm bg-[#FAFAF8] transition-colors"
                required
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#C47254] hover:bg-[#B5654A] disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-all text-sm"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E6E2DD]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-[#A09D9A]">or try the demo</span>
            </div>
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={isSubmitting}
            className="w-full bg-[#F9F7F4] hover:bg-[#F0EDE9] disabled:opacity-50 text-[#1D1B1A] font-medium py-2.5 rounded-xl transition-all border border-[#E6E2DD] text-sm"
          >
            {isSubmitting ? 'Signing in...' : 'Try Demo Account'}
          </button>

          <div className="mt-5 p-3.5 bg-[#F9F7F4] rounded-xl text-xs text-[#71706E]">
            <p className="font-medium text-[#1D1B1A] mb-1.5">Demo credentials</p>
            <p>demo@journalai.sg / demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
