// src/app/settings/page.tsx - Updated to be read-only for secure fields
"use client";

import { useEffect, useState } from "react";
import { User, Building2, MapPin, Briefcase, Moon, Sun, Monitor, Lock } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";

type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const supabase = getBrowserSupabase();
  
  // Profile data (read-only for secure fields)
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Only allow updating non-secure fields
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save profile' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
    {
      value: "light",
      label: "Light",
      icon: <Sun className="h-4 w-4" />,
      description: "Light theme"
    },
    {
      value: "dark", 
      label: "Dark",
      icon: <Moon className="h-4 w-4" />,
      description: "Dark theme"
    },
    {
      value: "system",
      label: "System",
      icon: <Monitor className="h-4 w-4" />,
      description: "Match system preference"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your personal preferences. Contact your administrator to change facility or role information.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700' 
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>
        </div>

        {/* Facility Information (Read-only) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Facility Information
            <Lock className="h-4 w-4 text-gray-400" title="Managed by administrator" />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role / Position
              </label>
              <input
                type="text"
                value={profile?.role || "Not assigned"}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                value={profile?.facility_state || "Not assigned"}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Facility Name
              </label>
              <input
                type="text"
                value={profile?.facility_name || "Not assigned"}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Need changes?</strong> Contact your administrator to update facility information, role, or location settings.
            </p>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Appearance
          </h2>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  <div className="flex flex-col items-center gap-2">
                    {option.icon}
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Bottom padding */}
        <div className="pb-8" />
      </div>
    </div>
  );
}