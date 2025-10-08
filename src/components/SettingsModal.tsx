// src/components/SettingsModal.tsx - Settings in a modal overlay
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Building2, Moon, Sun, Monitor, LogOut, CreditCard, MessageSquare, Palette, Upload, RefreshCw, Database, Mail, Calendar, ArrowRight, Sparkles, Sliders, Bell, Lock, Shield, Download, Trash2, Key, Globe, Smartphone, Clock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import Link from "next/link";
import SidebarCustomizer from "@/components/SidebarCustomizer";

type Theme = "light" | "dark" | "system";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'sidebar' | 'notifications' | 'privacy' | 'security' | 'integrations' | 'data'>('profile');
  const [showSidebarCustomizer, setShowSidebarCustomizer] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [notifyCompliance, setNotifyCompliance] = useState(true);
  const [notifySurveys, setNotifySurveys] = useState(true);
  const [notifyTasks, setNotifyTasks] = useState(true);
  
  // Privacy settings
  const [profileVisible, setProfileVisible] = useState(true);
  const [activityTracking, setActivityTracking] = useState(true);
  const [dataCollection, setDataCollection] = useState(true);
  
  // Language & region
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/New_York');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  const themeOptions = [
    { value: 'light' as Theme, label: 'Light', icon: Sun },
    { value: 'dark' as Theme, label: 'Dark', icon: Moon },
    { value: 'system' as Theme, label: 'System', icon: Monitor },
  ];

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (result.ok && result.profile) {
        setProfile(result.profile);
        setFullName(result.profile.full_name || "");
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ full_name: fullName })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleSidebarPreferencesSave = async () => {
    // Reload to apply changes
    window.location.reload();
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">⚙️ Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your preferences and account
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-1">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'appearance', label: 'Appearance', icon: Palette },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'privacy', label: 'Privacy', icon: Eye },
                { id: 'security', label: 'Security', icon: Lock },
                { id: 'sidebar', label: 'Sidebar', icon: Sliders },
                { id: 'integrations', label: 'Integrations', icon: Database },
                { id: 'data', label: 'Data & Storage', icon: Download },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' 
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Email cannot be changed from settings
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={profile?.role || 'User'}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                      />
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {profile?.facility_name && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Facility Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Facility</div>
                          <div className="text-sm text-gray-900 dark:text-white">{profile.facility_name}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Theme</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Choose your preferred theme
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          theme === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <option.icon className={`h-6 w-6 mx-auto mb-2 ${
                          theme === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <div className={`text-sm font-medium ${
                          theme === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Email Notifications</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Receive updates via email</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Push Notifications</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Mobile and web push alerts</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pushNotifications}
                          onChange={(e) => setPushNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Desktop Notifications</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Browser notifications on desktop</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={desktopNotifications}
                          onChange={(e) => setDesktopNotifications(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alert Types</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer">
                      <span className="text-sm text-gray-900 dark:text-white">Compliance & Survey Alerts</span>
                      <input
                        type="checkbox"
                        checked={notifyCompliance}
                        onChange={(e) => setNotifyCompliance(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer">
                      <span className="text-sm text-gray-900 dark:text-white">Survey Deadlines</span>
                      <input
                        type="checkbox"
                        checked={notifySurveys}
                        onChange={(e) => setNotifySurveys(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer">
                      <span className="text-sm text-gray-900 dark:text-white">Task Assignments</span>
                      <input
                        type="checkbox"
                        checked={notifyTasks}
                        onChange={(e) => setNotifyTasks(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy Controls</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Profile Visibility</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Make your profile visible to other staff</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileVisible}
                          onChange={(e) => setProfileVisible(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Activity Tracking</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Track usage for analytics and improvements</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activityTracking}
                          onChange={(e) => setActivityTracking(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Data Collection</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Allow anonymous usage data collection</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dataCollection}
                          onChange={(e) => setDataCollection(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Your Privacy Matters
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    We take your privacy seriously. All PHI data is encrypted and HIPAA-compliant. 
                    <Link href="/privacy-policy" className="underline ml-1" onClick={onClose}>Learn more</Link>
                  </p>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Password & Authentication</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">Change Password</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Update your password</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Add extra security to your account</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900 dark:text-white text-sm">Current Device</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                          Active Now
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(0, 3).join(' ') : 'Current Browser'}
                      </p>
                    </div>
                  </div>
                </div>

                <button className="w-full px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium">
                  Sign Out All Other Devices
                </button>
              </div>
            )}

            {/* Sidebar Tab */}
            {activeTab === 'sidebar' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Customize Navigation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Personalize your sidebar by marking favorites, hiding items, and reordering navigation
                  </p>
                  
                  <button
                    onClick={() => setShowSidebarCustomizer(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Sliders size={18} />
                    Open Sidebar Customizer
                  </button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Features</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>✨ Mark frequently used items as favorites</li>
                    <li>👁️ Show or hide navigation items</li>
                    <li>🔄 Reorder items by dragging</li>
                    <li>💾 Automatically saved to your account</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Calendar & Email</h3>
                  <div className="space-y-3">
                    <Link 
                      href="/calendar-integrations"
                      onClick={onClose}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Calendar Integrations</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Connect Google, Outlook, or Apple Calendar</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>

                    <Link 
                      href="/calendar-integrations"
                      onClick={onClose}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Email Integration</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Connect your email for automated notifications</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">EHR & Business Systems</h3>
                  <div className="space-y-3">
                    <Link 
                      href="/ehr-integrations"
                      onClick={onClose}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">EHR Integrations</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Connect to PCC, PointClickCare, MatrixCare, and more</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>

                    <Link 
                      href="/billing"
                      onClick={onClose}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Billing Integration</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Connect billing and payroll systems</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Rounds Email</h3>
                  <Link 
                    href="/settings/daily-rounds"
                    onClick={onClose}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Automated Email Settings</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Configure daily round checklist emails</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>
              </div>
            )}

            {/* Data & Storage Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Your Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Download a copy of your personal data and activity
                  </p>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">Download Your Data</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Get a complete export of your information</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>

                    <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 dark:text-white">Export Chat History</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Download all your AI conversations</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storage Management</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Storage Used</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">2.4 GB / 10 GB</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                  <button className="mt-3 w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                    Clear Cache & Temporary Files
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3 mb-3">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <div className="font-semibold text-red-900 dark:text-red-100 mb-1">Delete Account</div>
                        <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <button className="px-4 py-2 text-sm text-red-600 hover:text-white hover:bg-red-600 dark:text-red-400 dark:hover:bg-red-600 border border-red-600 rounded-lg transition-all">
                          Request Account Deletion
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Language & Region</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English (US)</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date Format
                      </label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    System Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 dark:text-green-200">Connection</span>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                        Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-800 dark:text-green-200">Last Synced</span>
                      <span className="text-green-700 dark:text-green-300 text-xs">Just now</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feedback</h3>
                  <Link 
                    href="/feature-requests"
                    onClick={onClose}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Feature Requests</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Suggest improvements or report issues</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Version</span>
                      <span className="font-medium text-gray-900 dark:text-white">1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Build</span>
                      <span className="font-medium text-gray-900 dark:text-white">2025.01</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Last Updated</span>
                      <span className="font-medium text-gray-900 dark:text-white">Jan 3, 2025</span>
                    </div>
                  </div>
                </div>

                {profile?.role?.includes('administrator') && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Administration</h3>
                    <Link 
                      href="/admin"
                      onClick={onClose}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Admin Dashboard</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Manage users, facilities, and system settings</div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-4 text-sm">
                    <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" onClick={onClose}>
                      Terms of Service
                    </Link>
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" onClick={onClose}>
                      Privacy Policy
                    </Link>
                    <Link href="/support" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" onClick={onClose}>
                      Support
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Customizer (nested modal) */}
          {showSidebarCustomizer && (
            <SidebarCustomizer
              isOpen={showSidebarCustomizer}
              onClose={() => setShowSidebarCustomizer(false)}
              onSave={handleSidebarPreferencesSave}
            />
          )}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

