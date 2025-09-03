"use client";

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Clock, 
  Settings,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface EmailSettings {
  auto_daily_rounds_email: boolean;
  daily_rounds_email_time: string;
  auto_email_recipients: string[];
}

export default function DailyRoundsSettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [settings, setSettings] = useState<EmailSettings>({
    auto_daily_rounds_email: false,
    daily_rounds_email_time: '06:00',
    auto_email_recipients: []
  });
  
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSettings();
    }
  }, [isAuthenticated, user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('auto_daily_rounds_email, daily_rounds_email_time, auto_email_recipients')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings({
          auto_daily_rounds_email: data.auto_daily_rounds_email || false,
          daily_rounds_email_time: data.daily_rounds_email_time ? 
            data.daily_rounds_email_time.substring(0, 5) : '06:00',
          auto_email_recipients: data.auto_email_recipients || []
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          auto_daily_rounds_email: settings.auto_daily_rounds_email,
          daily_rounds_email_time: settings.daily_rounds_email_time + ':00',
          auto_email_recipients: settings.auto_email_recipients
        })
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    if (newRecipientEmail && !settings.auto_email_recipients.includes(newRecipientEmail)) {
      setSettings(prev => ({
        ...prev,
        auto_email_recipients: [...prev.auto_email_recipients, newRecipientEmail]
      }));
      setNewRecipientEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setSettings(prev => ({
      ...prev,
      auto_email_recipients: prev.auto_email_recipients.filter(e => e !== email)
    }));
  };

  if (!isAuthenticated) {
    return <div>Please log in to access settings.</div>;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Daily Rounds Email Settings
        </h1>
        <p className="text-blue-100">
          Configure automated daily round checklist emails for your facility administrators.
        </p>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="space-y-6">
          
          {/* Enable Auto Email */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Enable Automatic Daily Rounds Email
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatically generate and email fresh daily round checklists each morning
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.auto_daily_rounds_email}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  auto_daily_rounds_email: e.target.checked
                }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Email Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4 inline mr-2" />
                Send Time (24-hour format)
              </label>
              <input
                type="time"
                value={settings.daily_rounds_email_time}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  daily_rounds_email_time: e.target.value
                }))}
                disabled={!settings.auto_daily_rounds_email}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Email Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Recipients
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add email addresses of facility administrators who should receive daily rounds.
            </p>
            
            {/* Add New Recipient */}
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                placeholder="Enter email address"
                disabled={!settings.auto_daily_rounds_email}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
              />
              <button
                onClick={addRecipient}
                disabled={!settings.auto_daily_rounds_email || !newRecipientEmail}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {/* Recipients List */}
            <div className="space-y-2">
              {settings.auto_email_recipients.map((email, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100">{email}</span>
                  <button
                    onClick={() => removeRecipient(email)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {settings.auto_email_recipients.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic py-4 text-center">
                  No recipients added yet
                </p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">How it works:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Fresh AI-generated daily round checklists are created each morning</li>
                  <li>• PDFs are automatically generated and emailed to all recipients</li>
                  <li>• Each checklist contains 12 surveyor-focused inspection items</li>
                  <li>• Items vary daily based on current compliance requirements</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? 
                <CheckCircle className="h-5 w-5" /> : 
                <AlertCircle className="h-5 w-5" />
              }
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}