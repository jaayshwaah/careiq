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

const PROVIDER_LOGOS = {
  google: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  outlook: (
    <svg clipRule="evenodd" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="1.414" viewBox="170 90.006 220 219.986" className="w-6 h-6">
      <g fillRule="nonzero">
        <path d="m366.585 103.756h-118.187c-5.295 0-9.652 4.357-9.652 9.652v10.971l66.614 20.625 70.877-20.625v-10.971c0-5.295-4.357-9.652-9.652-9.652z" fill="#0364b8"/>
        <path d="m387.58 209.659c1.007-3.165 1.811-6.391 2.406-9.659.001-1.635-.873-3.15-2.289-3.967l-.089-.048-.028-.013-74.507-42.444c-.321-.208-.654-.399-.996-.571-2.885-1.43-6.279-1.43-9.164 0-.342.172-.675.362-.997.571l-74.506 42.444-.028.013-.09.048c-1.415.817-2.289 2.332-2.288 3.967.595 3.268 1.399 6.494 2.406 9.659l79.002 57.78z" fill="#0a2767"/>
        <path d="m334.99 124.379h-48.122l-13.894 20.625 13.894 20.623 48.122 41.247h41.247v-41.247z" fill="#28a8ea"/>
      </g>
      <path d="m238.746 124.379h48.122v41.247h-48.122z" fill="#0078d4"/>
      <path d="m334.99 124.379h41.247v41.247h-41.247z" fill="#50d9ff"/>
      <path d="m334.99 206.874-48.122-41.247h-48.122v41.247l48.122 41.248 74.465 12.154z" fill="#0364b8" fillRule="nonzero"/>
      <path d="m286.868 165.627h48.122v41.247h-48.122z" fill="#0078d4"/>
      <path d="m238.746 206.874h48.122v41.247h-48.122z" fill="#064a8c"/>
      <path d="m334.99 206.874h41.247v41.247h-41.247z" fill="#0078d4"/>
      <g fillRule="nonzero">
        <path d="m227.402 204.056v-.069h-.068l-.207-.137c-1.334-.821-2.144-2.284-2.131-3.85v85.946c0 5.649 4.649 10.298 10.299 10.298h144.38c.858-.009 1.713-.124 2.543-.344.431-.075.848-.214 1.238-.412.146-.015.286-.062.412-.138.562-.23 1.094-.53 1.581-.894l.275-.206z" fill="#28a8ea"/>
        <path d="m179.164 145.004h91.658c5.027 0 9.164 4.136 9.164 9.163v91.659c0 5.027-4.137 9.164-9.164 9.164h-91.658c-5.027 0-9.164-4.137-9.164-9.164v-91.659c0-5.027 4.137-9.163 9.164-9.163z" fill="#0078d4"/>
        <path d="m196.584 182.593c2.435-5.189 6.367-9.532 11.288-12.47 5.453-3.122 11.662-4.677 17.943-4.496 5.817-.128 11.559 1.347 16.595 4.262 4.739 2.822 8.556 6.962 10.985 11.914 2.646 5.456 3.966 11.46 3.85 17.523.129 6.337-1.23 12.617-3.966 18.335-2.483 5.127-6.415 9.416-11.309 12.333-5.232 3.007-11.188 4.522-17.221 4.379-5.943.141-11.812-1.35-16.966-4.311-4.776-2.827-8.639-6.971-11.123-11.934-2.663-5.378-3.998-11.317-3.891-17.317-.118-6.283 1.189-12.511 3.822-18.218zm12.03 29.272c1.299 3.281 3.502 6.128 6.353 8.208 2.901 2.032 6.379 3.08 9.919 2.991 3.772.149 7.491-.932 10.594-3.08 2.816-2.08 4.961-4.942 6.167-8.229 1.356-3.664 2.024-7.547 1.973-11.453.042-3.94-.586-7.86-1.856-11.59-1.12-3.358-3.188-6.322-5.954-8.531-3.021-2.256-6.73-3.402-10.497-3.245-3.617-.094-7.173.96-10.154 3.011-2.904 2.087-5.156 4.958-6.49 8.277-2.95 7.599-2.967 16.031-.048 23.641z" fill="#fff"/>
      </g>
    </svg>
  ),
  apple_caldav: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path fill="#000000" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  )
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
                    <span className="inline-flex">{PROVIDER_LOGOS[provider]}</span>
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
                      <span className="inline-flex w-8 h-8">{PROVIDER_LOGOS[integration.provider]}</span>
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
                      <span className="inline-flex">{PROVIDER_LOGOS[provider]}</span>
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