'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Building2,
  ListTree,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/journal-entries', label: 'Journal Entries', icon: BookOpen },
  { href: '/dashboard/reconciliation', label: 'Reconciliation', icon: Building2 },
  { href: '/dashboard/chart-of-accounts', label: 'Chart of Accounts', icon: ListTree },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/compliance', label: 'Compliance', icon: Shield },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const tierColors: Record<string, string> = {
  free: 'bg-white/8 text-[#9C9490]',
  pro: 'bg-[#C47254]/15 text-[#E8A88C]',
  enterprise: 'bg-[#C47254]/15 text-[#E8A88C]',
  lifetime: 'bg-[#3D8B5E]/15 text-[#7BC49E]',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-[260px] bg-[#2F2B29] min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C47254]/20 flex items-center justify-center">
            <Sparkles size={18} className="text-[#E8A88C]" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white tracking-tight leading-tight">JournalAI</h1>
            <p className="text-[11px] text-[#7A7572] leading-tight">Bookkeeping Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] font-medium ${
                isActive
                  ? 'bg-[#C47254]/12 text-[#E8A88C]'
                  : 'text-[#9C9490] hover:bg-white/5 hover:text-[#D4CEC8]'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Subscription Tier Badge */}
      {user && (
        <div className="px-5 py-2">
          <div
            className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
              tierColors[user.tier] || 'bg-white/8 text-[#9C9490]'
            }`}
          >
            {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} Plan
          </div>
        </div>
      )}

      {/* User Info & Logout */}
      <div className="px-4 py-4 border-t border-white/8 space-y-3">
        {user && (
          <div className="px-2">
            <p className="text-[13px] font-medium text-[#D4CEC8] truncate">{user.email}</p>
            <p className="text-[11px] text-[#7A7572] mt-0.5 truncate">{user.company_name}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-colors text-[13px] text-[#9C9490] hover:bg-white/5 hover:text-[#D4CEC8]"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
