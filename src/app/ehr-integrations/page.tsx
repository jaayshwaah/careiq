"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { Plus, Settings, Trash2, CheckCircle, AlertCircle, RefreshCw, Database, Calendar, Users, Activity } from 'lucide-react';

interface EHRIntegration {
  id: string;
  ehr_system: string;
  api_endpoint?: string;
  username?: string;
  is_active: boolean;
  sync_frequency: string;
  sync_time: string;
  last_sync_at?: string;
  last_sync_status: string;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  ehr_system: string;
  sync_date: string;
  status: string;
  records_synced: number;
  execution_time_ms: number;
  error_message?: string;
  created_at: string;
}

const EHR_SYSTEMS = [
  { value: 'pointclickcare', label: 'PointClickCare', icon: '🏥' },
  { value: 'matrixcare', label: 'MatrixCare', icon: '📊' },
  { value: 'epic', label: 'Epic', icon: '⚡' },
  { value: 'cerner', label: 'Cerner', icon: '🔷' },
  { value: 'allscripts', label: 'Allscripts', icon: '📋' },
  { value: 'meditech', label: 'Meditech', icon: '🔬' },
  { value: 'custom', label: 'Custom API', icon: '⚙️' }
];

const SYNC_FREQUENCIES = [
  { value: 'real-time', label: 'Real-time' },
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' }
];

export default function EHRIntegrations() {
  const [integrations, setIntegrations] = useState<EHRIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<EHRIntegration | null>(null);

  const supabase = getBrowserSupabase();

  const loadIntegrations = async () => {
    try {
      const { data: integrationsData, error: intError } = await supabase
        .from('ehr_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (intError) throw intError;

      const { data: logsData, error: logsError } = await supabase
        .from('census_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      setIntegrations(integrationsData || []);
      setSyncLogs(logsData || []);
    } catch (error) {
      console.error('Error loading EHR data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleAddIntegration = async (formData: any) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data, error } = await supabase
        .from('ehr_integrations')
        .insert([{
          ...formData,
          user_id: session.session.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setIntegrations(prev => [data, ...prev]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding integration:', error);
    }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('ehr_integrations')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;

      setIntegrations(prev => 
        prev.map(int => 
          int.id === id ? { ...int, is_active: !is_active } : int
        )
      );
    } catch (error) {
      console.error('Error toggling integration:', error);
    }
  };

  const handleTestConnection = async (integration: EHRIntegration) => {
    try {
      // This would typically call your EHR integration API endpoint
      console.log('Testing connection to:', integration.ehr_system);
      // Simulate test
      alert(`Testing connection to ${integration.ehr_system}... Check would happen here.`);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const handleManualSync = async (integration: EHRIntegration) => {
    try {
      console.log('Manual sync for:', integration.ehr_system);
      
      // Create sync log entry
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { error } = await supabase
        .from('census_sync_logs')
        .insert([{
          user_id: session.session.user.id,
          facility_id: 'manual',
          integration_id: integration.id,
          sync_date: new Date().toISOString().split('T')[0],
          status: 'in_progress',
          records_synced: 0,
          execution_time_ms: 0
        }]);

      if (error) throw error;

      // Simulate sync process
      setTimeout(async () => {
        await supabase
          .from('census_sync_logs')
          .update({
            status: 'success',
            records_synced: Math.floor(Math.random() * 100),
            execution_time_ms: Math.floor(Math.random() * 5000)
          })
          .eq('integration_id', integration.id)
          .eq('status', 'in_progress');

        loadIntegrations();
      }, 2000);

      alert('Manual sync initiated. Check sync logs for progress.');
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading EHR integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">EHR Integrations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your Electronic Health Record system connections
            </p>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {EHR_SYSTEMS.find(s => s.value === integration.ehr_system)?.icon || '🏥'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {EHR_SYSTEMS.find(s => s.value === integration.ehr_system)?.label || integration.ehr_system}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {integration.sync_frequency} sync
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {integration.is_active ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${
                    integration.is_active ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {integration.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Last Sync:</span>
                  <span className="text-gray-900 dark:text-white">
                    {integration.last_sync_at 
                      ? new Date(integration.last_sync_at).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Sync Status:</span>
                  <span className={`font-medium ${
                    integration.last_sync_status === 'success' ? 'text-green-600' :
                    integration.last_sync_status === 'error' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {integration.last_sync_status || 'Pending'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(integration.id, integration.is_active)}
                  className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    integration.is_active
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {integration.is_active ? 'Disable' : 'Enable'}
                </button>
                
                <button
                  onClick={() => handleTestConnection(integration)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                >
                  Test
                </button>
                
                <button
                  onClick={() => handleManualSync(integration)}
                  className="px-3 py-1.5 bg-purple-100 text-purple-600 hover:bg-purple-200 rounded text-sm font-medium transition-colors"
                >
                  Sync
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sync Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Sync Activity</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {syncLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {EHR_SYSTEMS.find(s => s.value === log.ehr_system)?.label || log.ehr_system}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(log.sync_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {log.records_synced.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {log.execution_time_ms ? `${(log.execution_time_ms / 1000).toFixed(1)}s` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Integration Modal */}
        {showAddForm && (
          <AddIntegrationModal
            onClose={() => setShowAddForm(false)}
            onSave={handleAddIntegration}
          />
        )}
      </div>
    </div>
  );
}

function AddIntegrationModal({ onClose, onSave }: { 
  onClose: () => void; 
  onSave: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    ehr_system: '',
    api_endpoint: '',
    username: '',
    password: '',
    api_key: '',
    sync_frequency: 'daily',
    sync_time: '06:00:00',
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add EHR Integration
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              EHR System
            </label>
            <select
              value={formData.ehr_system}
              onChange={(e) => setFormData({...formData, ehr_system: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select EHR System</option>
              {EHR_SYSTEMS.map(system => (
                <option key={system.value} value={system.value}>
                  {system.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Endpoint (Optional)
            </label>
            <input
              type="url"
              value={formData.api_endpoint}
              onChange={(e) => setFormData({...formData, api_endpoint: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://api.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sync Frequency
            </label>
            <select
              value={formData.sync_frequency}
              onChange={(e) => setFormData({...formData, sync_frequency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {SYNC_FREQUENCIES.map(freq => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              Enable immediately
            </label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Integration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}