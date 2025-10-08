// Complete Audit Logs System
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, Filter, Download, RefreshCw, Eye, User,
  FileText, Database, Settings, Trash2, Edit, Plus, Loader2,
  Calendar, Clock
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  metadata?: any;
  changes?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  view: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
};

const ACTION_ICONS: Record<string, any> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: Eye,
  login: User
};

export default function AuditLogsPage() {
  const supabase = getBrowserSupabase();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);
      
      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Description', 'IP Address'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.profiles?.email || log.user_id,
        log.action,
        log.entity_type,
        log.description,
        log.ip_address || '-'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action.split('_')[0]] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    const baseAction = action.split('_')[0];
    return ACTION_COLORS[baseAction] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">Complete system activity and compliance trail</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadLogs}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Creates</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {logs.filter(l => l.action.includes('create')).length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Edit className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Updates</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {logs.filter(l => l.action.includes('update')).length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Deletes</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {logs.filter(l => l.action.includes('delete')).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by description, user, or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="view">View</option>
          <option value="login">Login</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Entities</option>
          <option value="user">User</option>
          <option value="facility">Facility</option>
          <option value="invoice">Invoice</option>
          <option value="ticket">Ticket</option>
          <option value="setting">Setting</option>
        </select>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>
          
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id}
                  onClick={() => {
                    setSelectedLog(log);
                    setShowDetails(true);
                  }}
                  className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.profiles?.full_name || log.profiles?.email || 'System'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {log.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {log.entity_type}
                      </span>
                      {log.ip_address && (
                        <span>IP: {log.ip_address}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Log Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                <p className="text-gray-900 dark:text-white">
                  {selectedLog.profiles?.email || selectedLog.user_id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <p className="text-gray-900 dark:text-white">{selectedLog.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity</label>
                <p className="text-gray-900 dark:text-white">
                  {selectedLog.entity_type} {selectedLog.entity_id && `(${selectedLog.entity_id})`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timestamp</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>

              {selectedLog.ip_address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IP Address</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.ip_address}</p>
                </div>
              )}

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Changes</label>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto text-gray-900 dark:text-white">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metadata</label>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto text-gray-900 dark:text-white">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Compliance & Security</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              All system activities are logged for HIPAA compliance and security auditing. 
              Logs are retained for 7 years and are immutable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


