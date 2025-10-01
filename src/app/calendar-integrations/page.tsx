"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, 
  Plus, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from '@/components/AuthProvider';

interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook' | 'apple_caldav';
  displayName: string;
  isActive: boolean;
  syncEnabled: boolean;
  lastRefreshCwAt?: string;
  lastRefreshCwStatus: 'pending' | 'success' | 'error';
  errorMessage?: string;
}

interface CalendarType {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  syncToExternal: boolean;
  syncFromExternal: boolean;
  googleCalendarId?: string;
  outlookCalendarId?: string;
  appleCalendarName?: string;
}

interface ExternalCalendar {
  id: string;
  name: string;
  primary?: boolean;
  canEdit?: boolean;
  isDefaultCalendar?: boolean;
}

const PROVIDER_ICONS = {
  google: '🇬',
  outlook: '📧',
  apple_caldav: '🍎'
};

const PROVIDER_NAMES = {
  google: 'Google Calendar',
  outlook: 'Outlook Calendar',
  apple_caldav: 'Apple Calendar'
};

const CATEGORY_COLORS = {
  care_plan: '#10B981',
  daily_rounds: '#3B82F6',
  appointments: '#8B5CF6',
  compliance: '#EF4444',
  training: '#F59E0B',
  meetings: '#6B7280',
  custom: '#EC4899'
};

export default function CalendarIntegrationsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [calendarTypes, setCalendarTypes] = useState<CalendarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [showAddCalendarType, setShowAddCalendarType] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<CalendarIntegration | null>(null);
  const [externalCalendars, setExternalCalendars] = useState<{[key: string]: ExternalCalendar[]}>({});
  const [syncing, setRefreshCwing] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (user) {
      loadIntegrations();
      loadCalendarTypes();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/calendar/integrations');
      const data = await response.json();
      
      if (data.ok) {
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const loadCalendarTypes = async () => {
    try {
      const response = await fetch('/api/calendar/types');
      const data = await response.json();
      
      if (data.ok) {
        setCalendarTypes(data.calendarTypes || []);
      }
    } catch (error) {
      console.error('Failed to load calendar types:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectProvider = async (provider: string) => {
    setConnectingProvider(provider);
    try {
      // Get OAuth URL
      const response = await fetch(`/api/calendar/${provider}/auth`);
      const data = await response.json();
      
      if (data.ok) {
        // Redirect to OAuth URL
        window.location.href = data.authUrl;
      } else {
        alert(`Failed to connect ${provider}: ${data.error}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert(`Failed to connect ${provider}`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const syncIntegration = async (integration: CalendarIntegration) => {
    setRefreshCwing(prev => ({ ...prev, [integration.id]: true }));
    try {
      const response = await fetch(`/api/calendar/${integration.provider}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          direction: 'bidirectional'
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        alert(`RefreshCw completed: ${data.syncResults.eventsProcessed} events processed`);
        loadIntegrations();
      } else {
        alert(`RefreshCw failed: ${data.error}`);
      }
    } catch (error) {
      console.error('RefreshCw error:', error);
      alert('RefreshCw failed');
    } finally {
      setRefreshCwing(prev => ({ ...prev, [integration.id]: false }));
    }
  };

  const toggleIntegration = async (integration: CalendarIntegration) => {
    try {
      const response = await fetch(`/api/calendar/integrations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: integration.id,
          isActive: !integration.isActive
        })
      });
      
      if (response.ok) {
        loadIntegrations();
      }
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const deleteIntegration = async (integration: CalendarIntegration) => {
    if (!confirm(`Are you sure you want to disconnect ${integration.displayName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/integrations?id=${integration.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadIntegrations();
      }
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const createCalendarType = async (formData: Partial<CalendarType>) => {
    try {
      const response = await fetch('/api/calendar/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        loadCalendarTypes();
        setShowAddCalendarType(false);
      }
    } catch (error) {
      console.error('Failed to create calendar type:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading calendar integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar Integrations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Connect your external calendars to sync CareIQ events
            </p>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Connected Calendars</h2>
          
          {integrations.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No calendars connected</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect your Google Calendar, Outlook, or Apple Calendar to sync events automatically
              </p>
              <div className="flex justify-center gap-4">
                {(['google', 'outlook', 'apple_caldav'] as const).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => connectProvider(provider)}
                    disabled={connectingProvider === provider}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <span className="text-lg">{PROVIDER_ICONS[provider]}</span>
                    {connectingProvider === provider ? 'Connecting...' : `Connect ${PROVIDER_NAMES[provider]}`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{PROVIDER_ICONS[integration.provider]}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {integration.displayName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {PROVIDER_NAMES[integration.provider]}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.lastRefreshCwStatus)}
                      <button
                        onClick={() => toggleIntegration(integration)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {integration.isActive ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`font-medium ${
                        integration.isActive ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {integration.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Last RefreshCw:</span>
                      <span className="text-gray-900 dark:text-white">
                        {integration.lastRefreshCwAt 
                          ? new Date(integration.lastRefreshCwAt).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    
                    {integration.errorMessage && (
                      <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {integration.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => syncIntegration(integration)}
                      disabled={syncing[integration.id]}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing[integration.id] ? 'animate-spin' : ''}`} />
                      {syncing[integration.id] ? 'RefreshCwing...' : 'RefreshCw'}
                    </button>
                    
                    <button
                      onClick={() => setSelectedIntegration(integration)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteIntegration(integration)}
                      className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded text-sm font-medium transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Integration */}
          {integrations.length > 0 && (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Connect additional calendars</p>
              <div className="flex justify-center gap-4">
                {(['google', 'outlook', 'apple_caldav'] as const)
                  .filter(provider => !integrations.find(i => i.provider === provider))
                  .map((provider) => (
                    <button
                      key={provider}
                      onClick={() => connectProvider(provider)}
                      disabled={connectingProvider === provider}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      <span className="text-lg">{PROVIDER_ICONS[provider]}</span>
                      {connectingProvider === provider ? 'Connecting...' : `Add ${PROVIDER_NAMES[provider]}`}
                    </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calendar Types */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Calendar Types</h2>
            <button
              onClick={() => setShowAddCalendarType(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Calendar Type
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarTypes.map((type) => (
              <div
                key={type.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: type.color }}
                  ></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {type.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {type.category.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                {type.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {type.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{type.syncToExternal ? '→ RefreshCw Out' : '⊗ No RefreshCw Out'}</span>
                  <span>{type.syncFromExternal ? '← RefreshCw In' : '⊗ No RefreshCw In'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Calendar Type Modal */}
        {showAddCalendarType && (
          <AddCalendarTypeModal
            onClose={() => setShowAddCalendarType(false)}
            onCreate={createCalendarType}
          />
        )}
      </div>
    </div>
  );
}

function AddCalendarTypeModal({ 
  onClose, 
  onCreate 
}: { 
  onClose: () => void; 
  onCreate: (data: Partial<CalendarType>) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    color: '#3B82F6',
    syncToExternal: true,
    syncFromExternal: false
  });

  const categories = [
    { value: 'care_plan', label: 'Care Plan' },
    { value: 'daily_rounds', label: 'Daily Rounds' },
    { value: 'appointments', label: 'Appointments' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'training', label: 'Training' },
    { value: 'meetings', label: 'Meetings' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Calendar Type
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="syncToExternal"
                checked={formData.syncToExternal}
                onChange={(e) => setFormData({...formData, syncToExternal: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="syncToExternal" className="text-sm text-gray-700 dark:text-gray-300">
                RefreshCw events to external calendars
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="syncFromExternal"
                checked={formData.syncFromExternal}
                onChange={(e) => setFormData({...formData, syncFromExternal: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="syncFromExternal" className="text-sm text-gray-700 dark:text-gray-300">
                Import events from external calendars
              </label>
            </div>
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}