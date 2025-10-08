// Complete Admin Settings with 100% functionality
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, RefreshCw, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle, Loader2, Zap, Bell, Shield, Database,
  Globe, Mail, Code, Key
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  updated_at: string;
  updated_by?: string;
}

const CATEGORIES = ['general', 'ai', 'features', 'email', 'security', 'integrations'];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [activeCategory, setActiveCategory] = useState('general');
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
        
        // Initialize edited settings
        const initial: Record<string, any> = {};
        data.settings?.forEach((s: SystemSetting) => {
          initial[s.key] = s.value;
        });
        setEditedSettings(initial);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          key,
          value: editedSettings[key]
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Setting updated successfully' });
        await loadSettings();
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to update setting');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update setting' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: string) => {
    const currentValue = editedSettings[key];
    const newValue = currentValue === true || currentValue === 'true' ? false : true;
    setEditedSettings({...editedSettings, [key]: newValue});
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general': return SettingsIcon;
      case 'ai': return Zap;
      case 'features': return Code;
      case 'email': return Mail;
      case 'security': return Shield;
      case 'integrations': return Globe;
      default: return Database;
    }
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const value = editedSettings[setting.key];
    const isBooleanValue = value === true || value === false || value === 'true' || value === 'false';

    if (isBooleanValue) {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggle(setting.key)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value === true || value === 'true' ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value === true || value === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value === true || value === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    }

    // For arrays/objects (JSON)
    if (typeof value === 'object') {
      return (
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setEditedSettings({...editedSettings, [setting.key]: parsed});
            } catch (err) {
              // Invalid JSON, keep as string for now
            }
          }}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
        />
      );
    }

    // For numbers
    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setEditedSettings({...editedSettings, [setting.key]: parseFloat(e.target.value)})}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      );
    }

    // For strings
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => setEditedSettings({...editedSettings, [setting.key]: e.target.value})}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const categorySettings = settings.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure global system settings and feature flags</p>
        </div>
        <button
          onClick={loadSettings}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Categories</h3>
            <div className="space-y-1">
              {CATEGORIES.map(category => {
                const Icon = getCategoryIcon(category);
                const count = settings.filter(s => s.category === category).length;
                
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeCategory === category
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{category}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {activeCategory} Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {categorySettings.length === 0 ? (
                <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                  No settings in this category
                </div>
              ) : (
                categorySettings.map(setting => (
                  <div key={setting.key} className="pb-6 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {setting.key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </label>
                        {setting.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {setting.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        {renderSettingInput(setting)}
                      </div>
                      <button
                        onClick={() => handleSave(setting.key)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </button>
                    </div>

                    {setting.updated_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Last updated: {new Date(setting.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Warning</h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Changing system settings can affect all users and facilities. Make changes carefully and test in a non-production environment first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


