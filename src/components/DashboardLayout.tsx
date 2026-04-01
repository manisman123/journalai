'use client';

import React from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#F9F7F4] overflow-y-auto">
        <div className="px-10 py-8 max-w-[1200px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
