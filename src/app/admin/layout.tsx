// Admin Layout with Navigation
"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, Building2, AlertCircle, Activity, Settings, 
  BarChart3, DollarSign, FileText, MessageSquare, Clock,
  Database, ArrowLeft
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: Shield },
  { href: '/admin/facilities', label: 'Facilities', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Database },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: FileText },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/billing', label: 'Billing', icon: DollarSign },
  { href: '/admin/logs', label: 'Error Logs', icon: AlertCircle },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { href: '/admin/tickets', label: 'Support Tickets', icon: MessageSquare },
  { href: '/admin/jobs', label: 'Scheduled Jobs', icon: Clock },
  { href: '/admin/health', label: 'System Health', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">CareIQ Internal</p>
            </div>
          </div>
          <Link 
            href="/"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Main App
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
