// Complete Error Logs Management with 100% functionality
"use client";

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Bug, XCircle, CheckCircle, Filter, Search, 
  Trash2, Eye, RefreshCw, Download, X, Code, Clock, User,
  Globe, Server, Database, Loader2, Check
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface ErrorLog {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  stack_trace?: string;
  error_code?: string;
  user_id?: string;
  facility_id?: string;
  endpoint?: string;
  method?: string;
  user_agent?: string;
  ip_address?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  error_hash: string;
  occurrence_count: number;
  first_occurred_at: string;
  last_occurred_at: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const ERROR_TYPES = ['api_error', 'client_error', 'database_error', 'ai_error', 'auth_error'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function ErrorLogsPage() {
  const { user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('false'); // Show unresolved by default
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [severityFilter, typeFilter, resolvedFilter]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadLogs, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, severityFilter, typeFilter, resolvedFilter]);

  const loadLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (typeFilter !== 'all') params.append('error_type', typeFilter);
      params.append('resolved', resolvedFilter);
      params.append('limit', '200');

      const response = await fetch(`/api/admin/error-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.error_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
  };

  const handleResolve = async (log: ErrorLog) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const confirmResolve = async () => {
    if (!selectedLog) return;
    
    setResolving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/error-logs', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          id: selectedLog.id,
          resolution_notes: resolutionNotes
        })
      });

      if (response.ok) {
        await loadLogs();
        setShowModal(false);
        setResolutionNotes('');
      }
    } catch (error) {
      console.error('Failed to resolve error:', error);
    } finally {
      setResolving(false);
    }
  };

  const handleBulkDelete = async (deleteResolved: boolean = false) => {
    const message = deleteResolved
      ? 'Delete all resolved errors older than 30 days?'
      : 'Delete selected error logs?';
    
    if (!confirm(message)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (deleteResolved) params.append('delete_resolved', 'true');

      const response = await fetch(`/api/admin/error-logs?${params}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (response.ok) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Failed to delete errors:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Severity', 'Type', 'Message', 'Endpoint', 'Occurrences', 'First Seen', 'Last Seen', 'Status'];
    const rows = filteredLogs.map(log => [
      log.severity,
      log.error_type,
      log.message.replace(/,/g, ';'),
      log.endpoint || '',
      log.occurrence_count,
      new Date(log.first_occurred_at).toLocaleString(),
      new Date(log.last_occurred_at).toLocaleString(),
      log.resolved ? 'Resolved' : 'Open'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const viewDetails = (log: ErrorLog) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high': return <XCircle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <Bug className="w-5 h-5 text-yellow-600" />;
      default: return <Bug className="w-5 h-5 text-blue-600" />;
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">System error monitoring and tracking</p>
        </div>
        <div className="flex gap-3">
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
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleBulkDelete(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Clean Old
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['critical', 'high', 'medium', 'low'].map(severity => {
          const count = logs.filter(l => l.severity === severity && !l.resolved).length;
          return (
            <div key={severity} className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{severity}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                {getSeverityIcon(severity)}
              </div>
            </div>
          );
        })}
        <div className="p-4 rounded-lg border bg-green-100 text-green-800 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Resolved</p>
              <p className="text-2xl font-bold">{logs.filter(l => l.resolved).length}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Severities</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            {ERROR_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          
          <select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="false">Unresolved Only</option>
            <option value="true">Resolved Only</option>
          </select>
        </div>
      </div>

      {/* Error Logs List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Error Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {log.error_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white truncate max-w-md">
                      {log.message}
                    </div>
                    {log.error_code && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Code: {log.error_code}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {log.method} {log.endpoint || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white rounded text-sm font-medium">
                      {log.occurrence_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(log.last_occurred_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewDetails(log)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {!log.resolved && (
                        <button
                          onClick={() => handleResolve(log)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400"
                          title="Mark as Resolved"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No error logs found</p>
          </div>
        )}
      </div>

      {/* Details/Resolve Modal */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Error Details</h2>
                <button
                  onClick={() => {setShowModal(false); setResolutionNotes('');}}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Severity</label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedLog.severity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.error_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Occurrences</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.occurrence_count}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">First Seen</label>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedLog.first_occurred_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Error Message</label>
                <p className="text-gray-900 dark:text-white mt-1">{selectedLog.message}</p>
              </div>

              {selectedLog.stack_trace && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Stack Trace</label>
                  <pre className="mt-1 p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-xs">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Endpoint</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.method} {selectedLog.endpoint || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>

              {!selectedLog.resolved && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Describe how this issue was resolved..."
                  />
                </div>
              )}

              {selectedLog.resolved && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900 dark:text-green-100">Resolved</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedLog.resolution_notes}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Resolved on {new Date(selectedLog.resolved_at!).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {setShowModal(false); setResolutionNotes('');}}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              {!selectedLog.resolved && (
                <button
                  onClick={confirmResolve}
                  disabled={resolving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Mark as Resolved
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


