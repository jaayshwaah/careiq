// Complete Scheduled Jobs Management
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Pause, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Loader2, Calendar, Activity, BarChart3
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  function_name: string;
}

interface Execution {
  id: string;
  job_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  result?: any;
  triggered_by: 'scheduled' | 'manual';
  scheduled_jobs?: { name: string };
}

export default function JobsPage() {
  const supabase = getBrowserSupabase();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/jobs', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJob = async (id: string, enabled: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/jobs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id, enabled: !enabled })
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle job:', error);
    }
  };

  const triggerJob = async (id: string) => {
    setTriggeringJob(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ job_id: id })
      });

      if (response.ok) {
        setTimeout(() => loadData(), 2000); // Reload after 2 seconds
      }
    } catch (error) {
      console.error('Failed to trigger job:', error);
    } finally {
      setTriggeringJob(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const stats = {
    total: jobs.length,
    enabled: jobs.filter(j => j.enabled).length,
    disabled: jobs.filter(j => !j.enabled).length,
    recent_failures: executions.filter(e => e.status === 'failed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Jobs</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage automated system tasks and cron jobs</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jobs</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Enabled</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.enabled}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Pause className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Disabled</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.disabled}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Failures</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.recent_failures}</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Active Jobs</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {jobs.length === 0 ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400">
              No scheduled jobs configured
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{job.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        job.enabled 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {job.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Schedule: {job.schedule}
                      </span>
                      {job.last_run && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {new Date(job.last_run).toLocaleString()}
                        </span>
                      )}
                      {job.next_run && (
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Next: {new Date(job.next_run).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleJob(job.id, job.enabled)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        job.enabled
                          ? 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {job.enabled ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Enable
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => triggerJob(job.id)}
                      disabled={!job.enabled || triggeringJob === job.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {triggeringJob === job.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Run Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Executions</h3>
        </div>
        <div className="p-6">
          {executions.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              No execution history yet
            </div>
          ) : (
            <div className="space-y-3">
              {executions.slice(0, 20).map((execution) => (
                <div 
                  key={execution.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {execution.scheduled_jobs?.name || 'Unknown Job'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Started: {new Date(execution.started_at).toLocaleString()}
                        {execution.completed_at && ` • Duration: ${Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)}s`}
                      </p>
                      {execution.error_message && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Error: {execution.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      execution.triggered_by === 'manual'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {execution.triggered_by}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">About Scheduled Jobs</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Scheduled jobs run automatically based on their cron schedule. You can also trigger them manually.
              All executions are logged for monitoring and debugging purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


