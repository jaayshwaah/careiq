// Complete Admin Dashboard
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Shield, Building2, Users, DollarSign, AlertCircle, TrendingUp,
  Activity, Clock, MessageSquare, CheckCircle, Loader2, ArrowRight, Sparkles
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface DashboardStats {
  facilities: {
    total: number;
    active: number;
  };
  users: {
    total: number;
    active: number;
  };
  revenue: {
    mrr: number;
    arr: number;
  };
  errors: {
    total: number;
    critical: number;
  };
  tickets: {
    open: number;
    in_progress: number;
  };
  health: {
    database: string;
    api: string;
    storage: string;
  };
}

export default function AdminDashboard() {
  const supabase = getBrowserSupabase();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Load all stats in parallel
      const [facilitiesRes, analyticsRes, healthRes, ticketsRes] = await Promise.all([
        fetch('/api/admin/facilities', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch('/api/admin/analytics?period=30', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch('/api/admin/system-health', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch('/api/admin/tickets', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
      ]);

      const [facilities, analytics, health, tickets] = await Promise.all([
        facilitiesRes.ok ? facilitiesRes.json() : { facilities: [] },
        analyticsRes.ok ? analyticsRes.json() : {},
        healthRes.ok ? healthRes.json() : {},
        ticketsRes.ok ? ticketsRes.json() : { tickets: [] }
      ]);

      setStats({
        facilities: {
          total: facilities.facilities?.length || 0,
          active: facilities.facilities?.filter((f: any) => f.status === 'active').length || 0
        },
        users: {
          total: analytics.users?.total || 0,
          active: analytics.users?.active || 0
        },
        revenue: {
          mrr: analytics.revenue?.mrr || 0,
          arr: analytics.revenue?.arr || 0
        },
        errors: {
          total: analytics.errors?.total || 0,
          critical: analytics.errors?.critical || 0
        },
        tickets: {
          open: tickets.tickets?.filter((t: any) => t.status === 'open').length || 0,
          in_progress: tickets.tickets?.filter((t: any) => t.status === 'in_progress').length || 0
        },
        health: {
          database: health.components?.database?.status || 'unknown',
          api: health.components?.api?.status || 'unknown',
          storage: health.components?.storage?.status || 'unknown'
        }
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/suggestions/generate-weekly', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('✅ Successfully generated 100 new chat suggestions!');
      } else {
        alert(`❌ Error: ${result.error || 'Failed to generate suggestions'}`);
      }
    } catch (error: any) {
      console.error('Failed to generate suggestions:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!stats) return null;

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">CareIQ internal administration and monitoring</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/facilities" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Facilities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.facilities.active}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.facilities.total} total facilities
            </p>
          </div>
        </Link>

        <Link href="/admin/analytics" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users.active}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.users.total} total users
            </p>
          </div>
        </Link>

        <Link href="/admin/billing" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(stats.revenue.mrr / 1000).toFixed(1)}k
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ${(stats.revenue.arr / 1000).toFixed(0)}k ARR
            </p>
          </div>
        </Link>

        <Link href="/admin/logs" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical Errors</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.errors.critical}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.errors.total} total errors (30d)
            </p>
          </div>
        </Link>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
          <Link 
            href="/admin/health"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            View Details
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className={`w-5 h-5 ${getHealthColor(stats.health.database)}`} />
              <span className="font-medium text-gray-900 dark:text-white">Database</span>
            </div>
            <CheckCircle className={`w-5 h-5 ${getHealthColor(stats.health.database)}`} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className={`w-5 h-5 ${getHealthColor(stats.health.api)}`} />
              <span className="font-medium text-gray-900 dark:text-white">API</span>
            </div>
            <CheckCircle className={`w-5 h-5 ${getHealthColor(stats.health.api)}`} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className={`w-5 h-5 ${getHealthColor(stats.health.storage)}`} />
              <span className="font-medium text-gray-900 dark:text-white">Storage</span>
            </div>
            <CheckCircle className={`w-5 h-5 ${getHealthColor(stats.health.storage)}`} />
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Support Tickets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Support Tickets</h3>
            <Link 
              href="/admin/tickets"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Open Tickets</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{stats.tickets.open}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">In Progress</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{stats.tickets.in_progress}</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
          
          <div className="space-y-2">
            <Link 
              href="/admin/facilities"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Manage Facilities</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link 
              href="/admin/knowledge-base"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">CMS Knowledge Base</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link 
              href="/admin/audit-logs"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Audit Logs</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link 
              href="/admin/jobs"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Scheduled Jobs</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <button
              onClick={generateSuggestions}
              disabled={generatingSuggestions}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
            >
              <div className="flex items-center gap-2">
                {generatingSuggestions ? (
                  <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {generatingSuggestions ? 'Generating...' : 'Generate AI Suggestions'}
                </span>
              </div>
              {!generatingSuggestions && <ArrowRight className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
