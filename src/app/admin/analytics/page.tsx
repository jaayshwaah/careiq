// Complete Analytics Dashboard with 100% functionality
"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, MessageSquare, Building2, DollarSign, 
  AlertCircle, Download, RefreshCw, Calendar, BarChart3,
  Activity, Zap, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface Analytics {
  users: {
    total: number;
    active: number;
    new: number;
    daily_trend: Array<{date: string, count: number}>;
  };
  chats: {
    total: number;
    recent: number;
    messages: number;
    avg_per_chat: number;
  };
  facilities: {
    total: number;
    active: number;
    by_tier: Record<string, number>;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
  };
  errors: {
    total: number;
    critical: number;
  };
  feature_usage: Array<{category: string, clicks: number}>;
}

export default function AnalyticsPage() {
  const supabase = getBrowserSupabase();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/analytics?period=${period}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!analytics) return;
    
    const csv = [
      ['Metric', 'Value'],
      ['Total Users', analytics.users.total],
      ['Active Users', analytics.users.active],
      ['New Users', analytics.users.new],
      ['Total Chats', analytics.chats.total],
      ['Total Messages', analytics.chats.messages],
      ['Active Facilities', analytics.facilities.active],
      ['MRR', `$${analytics.revenue.mrr}`],
      ['ARR', `$${analytics.revenue.arr}`],
      ['ARPU', `$${analytics.revenue.arpu}`]
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            change > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reporting</h1>
          <p className="text-gray-600 dark:text-gray-400">System-wide metrics and insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={analytics.users.total}
          icon={Users}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Active Users"
          value={analytics.users.active}
          icon={Activity}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Active Facilities"
          value={analytics.facilities.active}
          icon={Building2}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${analytics.revenue.mrr.toLocaleString()}`}
          icon={DollarSign}
          color="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Annual Revenue</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${analytics.revenue.arr.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">ARR (Annual Recurring Revenue)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Avg Revenue Per User</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${analytics.revenue.arpu}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">ARPU (Per Facility)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">New Users</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.users.new}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Last {period} days</p>
        </div>
      </div>

      {/* Chat & Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Chat Analytics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Chats</span>
              <span className="font-semibold text-gray-900 dark:text-white">{analytics.chats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Recent Chats</span>
              <span className="font-semibold text-gray-900 dark:text-white">{analytics.chats.recent}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Messages</span>
              <span className="font-semibold text-gray-900 dark:text-white">{analytics.chats.messages}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Avg Messages/Chat</span>
              <span className="font-semibold text-gray-900 dark:text-white">{analytics.chats.avg_per_chat}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Subscription Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.facilities.by_tier).map(([tier, count]) => (
              <div key={tier}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{tier}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{count as number}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${((count as number) / analytics.facilities.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Features by Usage</h3>
        <div className="space-y-3">
          {analytics.feature_usage.slice(0, 10).map((feature, index) => (
            <div key={feature.category} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">#{index + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {feature.category.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {feature.clicks} clicks
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full"
                    style={{ 
                      width: `${(feature.clicks / Math.max(...analytics.feature_usage.map(f => f.clicks))) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Summary */}
      {(analytics.errors.total > 0 || analytics.errors.critical > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">System Errors</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Total Errors (Last {period} days)</p>
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{analytics.errors.total}</p>
                </div>
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">Critical Errors</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.errors.critical}</p>
                </div>
              </div>
              <a href="/admin/logs" className="text-sm text-yellow-800 dark:text-yellow-200 underline mt-3 inline-block">
                View Error Logs →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Daily Active Users Chart (Simple) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Active Users</h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {analytics.users.daily_trend.map((day) => {
            const maxCount = Math.max(...analytics.users.daily_trend.map(d => d.count));
            const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer"
                  style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                  title={`${day.date}: ${day.count} users`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 rotate-45 origin-top-left mt-2">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


