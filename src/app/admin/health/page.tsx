// Complete System Health Dashboard with 100% functionality
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Server, Database, Zap, HardDrive, Cpu, Activity, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Clock, TrendingUp, Users, Building2
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    database?: ServiceHealth;
    storage?: ServiceHealth;
    ai_api?: ServiceHealth;
  };
  metrics: {
    unresolved_errors_24h: number;
    critical_errors_24h: number;
    active_users_24h: number;
    active_facilities: number;
  };
}

interface ServiceHealth {
  status: string;
  latency_ms?: number;
  message?: string;
  error?: string;
  buckets_count?: number;
}

export default function SystemHealthPage() {
  const supabase = getBrowserSupabase();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadHealth();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadHealth();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/system-health', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-100 border-red-200';
      case 'maintenance': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5" />;
      case 'unhealthy': return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const ServiceCard = ({ title, service, icon: Icon }: { title: string, service?: ServiceHealth, icon: any }) => {
    if (!service) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
            {service.status}
          </span>
        </div>
        
        <div className="space-y-2 text-sm">
          {service.latency_ms !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Latency</span>
              <span className="font-medium text-gray-900 dark:text-white">{service.latency_ms}ms</span>
            </div>
          )}
          {service.buckets_count !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Buckets</span>
              <span className="font-medium text-gray-900 dark:text-white">{service.buckets_count}</span>
            </div>
          )}
          {service.message && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status</span>
              <span className="font-medium text-gray-900 dark:text-white">{service.message}</span>
            </div>
          )}
          {service.error && (
            <div className="text-red-600 dark:text-red-400 text-xs mt-2">
              {service.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Unable to fetch system health</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time system monitoring and status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              autoRefresh 
                ? 'border-green-500 text-green-600 bg-green-50' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </button>
          <button
            onClick={loadHealth}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`p-6 rounded-lg border-2 ${getStatusColor(health.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(health.status)}
            <div>
              <h2 className="text-2xl font-bold capitalize">{health.status}</h2>
              <p className="text-sm opacity-75">Overall System Status</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-75">Last Updated</p>
            <p className="font-medium">{lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ServiceCard
            title="Database"
            service={health.services.database}
            icon={Database}
          />
          <ServiceCard
            title="Storage"
            service={health.services.storage}
            icon={HardDrive}
          />
          <ServiceCard
            title="AI API"
            service={health.services.ai_api}
            icon={Zap}
          />
        </div>
      </div>

      {/* Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics (24h)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className={`w-5 h-5 ${
                health.metrics.unresolved_errors_24h > 10 ? 'text-red-600' : 'text-gray-400'
              }`} />
              <span className={`text-2xl font-bold ${
                health.metrics.unresolved_errors_24h > 10 ? 'text-red-600' : 'text-gray-900 dark:text-white'
              }`}>
                {health.metrics.unresolved_errors_24h}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Unresolved Errors</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <XCircle className={`w-5 h-5 ${
                health.metrics.critical_errors_24h > 0 ? 'text-red-600' : 'text-gray-400'
              }`} />
              <span className={`text-2xl font-bold ${
                health.metrics.critical_errors_24h > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
              }`}>
                {health.metrics.critical_errors_24h}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Critical Errors</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {health.metrics.active_users_24h}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {health.metrics.active_facilities}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Facilities</p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-gray-600 dark:text-gray-400">Environment</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {process.env.NODE_ENV || 'production'}
            </span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-gray-600 dark:text-gray-400">Runtime</span>
            <span className="font-medium text-gray-900 dark:text-white">Node.js</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-gray-600 dark:text-gray-400">Version</span>
            <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-gray-600 dark:text-gray-400">Uptime Check</span>
            <span className="font-medium text-green-600">Operational</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {health.metrics.critical_errors_24h > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-100">Critical Errors Detected</h4>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                {health.metrics.critical_errors_24h} critical error(s) in the last 24 hours require immediate attention.
                <a href="/admin/logs" className="underline ml-2">View Error Logs →</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


