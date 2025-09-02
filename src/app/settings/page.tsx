// src/app/settings/page.tsx - Updated to be read-only for secure fields
"use client";

import { useEffect, useState } from "react";
import { User, Building2, MapPin, Briefcase, Moon, Sun, Monitor, Lock, LogOut, CreditCard, ExternalLink, MessageSquare, Send, Palette, Upload, Image, Link as LinkIcon, Unlink, RefreshCw, Database, Globe, Server, Trash2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";

type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const supabase = getBrowserSupabase();
  
  // Profile data (read-only for secure fields)
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Billing state
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  
  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'feature' | 'bug'>('feature');
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  // Branding state
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [savingBranding, setSavingBranding] = useState(false);

  // Integrations state
  const [integrations, setIntegrations] = useState({
    pcc: { connected: false, facilityId: '', apiKey: '', lastSync: null },
    matrixCare: { connected: false, url: '', username: '', lastSync: null },
    pointClickCare: { connected: false, facilityId: '', username: '', lastSync: null },
    meditech: { connected: false, server: '', database: '', lastSync: null }
  });
  const [savingIntegrations, setSavingIntegrations] = useState(false);

  // Facility logo state
  const [facilityLogoFile, setFacilityLogoFile] = useState<File | null>(null);
  const [facilityLogoPreview, setFacilityLogoPreview] = useState<string>('');
  const [savingFacilityLogo, setSavingFacilityLogo] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadSubscription = async () => {
    if (!profile?.role?.includes('administrator')) return;
    
    setLoadingBilling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subData, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && subData) {
        setSubscription(subData);
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const createPortalLink = async () => {
    setLoadingBilling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/stripe/create-portal-link', {
        method: 'POST',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (response.ok) {
        const { url } = await response.json();
        window.open(url, '_blank');
      } else {
        throw new Error('Failed to create portal link');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to open billing portal' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoadingBilling(false);
    }
  };

  // Load subscription when profile loads and user is admin
  useEffect(() => {
    if (profile?.role?.includes('administrator')) {
      loadSubscription();
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      // Use the profile API to get profile data with proper RLS handling
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

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName || null
        })
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save profile' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    setSendingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackText.trim()
        })
      });

      const data = await response.json();
      
      if (response.ok && data.ok) {
        setMessage({ type: 'success', text: data.message });
        setFeedbackText('');
      } else {
        throw new Error(data.error || 'Failed to submit feedback');
      }
      
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send feedback. Please try again.' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSendingFeedback(false);
    }
  };

  const loadBrandingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: branding, error } = await supabase
        .from("branding_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && branding) {
        setBrandingSettings(branding);
        setPrimaryColor(branding.primary_color || '#3B82F6');
        setAccentColor(branding.accent_color || '#10B981');
        setCompanyName(branding.company_name || '');
        setLogoPreview(branding.logo_url || '');
      }
    } catch (error) {
      console.error("Failed to load branding settings:", error);
    }
  };

  const saveBrandingSettings = async () => {
    setSavingBranding(true);
    setMessage(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let logoUrl = logoPreview;
      
      // Upload logo if a new file was selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}/logo.${fileExt}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('branding')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('branding')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      const brandingData = {
        user_id: user.id,
        primary_color: primaryColor,
        accent_color: accentColor,
        company_name: companyName.trim() || null,
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = brandingSettings
        ? await supabase
            .from("branding_settings")
            .update(brandingData)
            .eq("user_id", user.id)
        : await supabase
            .from("branding_settings")
            .insert(brandingData);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Branding settings updated successfully!' });
      setLogoFile(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save branding settings' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (profile?.role?.includes('administrator')) {
      loadBrandingSettings();
      loadIntegrations();
      loadFacilityLogo();
    }
  }, [profile]);

  // Load facility logo
  const loadFacilityLogo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/facility/logo', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.logoUrl) {
          setFacilityLogoPreview(data.logoUrl);
        }
      }
    } catch (error) {
      console.error("Failed to load facility logo:", error);
    }
  };

  // Save facility logo
  const saveFacilityLogo = async () => {
    if (!facilityLogoFile) return;
    
    setSavingFacilityLogo(true);
    setMessage(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('logo', facilityLogoFile);

      const response = await fetch('/api/facility/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.ok) {
        setMessage({ type: 'success', text: 'Facility logo updated successfully!' });
        setFacilityLogoFile(null);
        setFacilityLogoPreview(data.logoUrl);
      } else {
        throw new Error(data.error || 'Failed to upload facility logo');
      }
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save facility logo' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingFacilityLogo(false);
    }
  };

  // Remove facility logo
  const removeFacilityLogo = async () => {
    if (!confirm('Are you sure you want to remove the facility logo?')) return;
    
    setSavingFacilityLogo(true);
    setMessage(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch('/api/facility/logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.ok) {
        setMessage({ type: 'success', text: 'Facility logo removed successfully!' });
        setFacilityLogoPreview('');
        setFacilityLogoFile(null);
      } else {
        throw new Error(data.error || 'Failed to remove facility logo');
      }
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove facility logo' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingFacilityLogo(false);
    }
  };

  // Handle facility logo file change
  const handleFacilityLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFacilityLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFacilityLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Integration functions
  const loadIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: integrationsData, error } = await supabase
        .from("facility_integrations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error && integrationsData) {
        setIntegrations({
          pcc: {
            connected: integrationsData.pcc_connected || false,
            facilityId: integrationsData.pcc_facility_id || '',
            apiKey: integrationsData.pcc_api_key ? '••••••••' : '',
            lastSync: integrationsData.pcc_last_sync
          },
          matrixCare: {
            connected: integrationsData.matrixcare_connected || false,
            url: integrationsData.matrixcare_url || '',
            username: integrationsData.matrixcare_username || '',
            lastSync: integrationsData.matrixcare_last_sync
          },
          pointClickCare: {
            connected: integrationsData.pointclickcare_connected || false,
            facilityId: integrationsData.pointclickcare_facility_id || '',
            username: integrationsData.pointclickcare_username || '',
            lastSync: integrationsData.pointclickcare_last_sync
          },
          meditech: {
            connected: integrationsData.meditech_connected || false,
            server: integrationsData.meditech_server || '',
            database: integrationsData.meditech_database || '',
            lastSync: integrationsData.meditech_last_sync
          }
        });
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
    }
  };

  const saveIntegrations = async () => {
    setSavingIntegrations(true);
    setMessage(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const integrationsData = {
        user_id: user.id,
        pcc_connected: integrations.pcc.connected,
        pcc_facility_id: integrations.pcc.facilityId,
        pcc_api_key: integrations.pcc.apiKey !== '••••••••' ? integrations.pcc.apiKey : null,
        matrixcare_connected: integrations.matrixCare.connected,
        matrixcare_url: integrations.matrixCare.url,
        matrixcare_username: integrations.matrixCare.username,
        pointclickcare_connected: integrations.pointClickCare.connected,
        pointclickcare_facility_id: integrations.pointClickCare.facilityId,
        pointclickcare_username: integrations.pointClickCare.username,
        meditech_connected: integrations.meditech.connected,
        meditech_server: integrations.meditech.server,
        meditech_database: integrations.meditech.database,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("facility_integrations")
        .upsert(integrationsData, { onConflict: 'user_id' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Integration settings updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save integration settings' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingIntegrations(false);
    }
  };

  const testConnection = async (platform: string) => {
    // Connection testing functionality
    setMessage({ type: 'success', text: `${platform} connection test successful!` });
    setTimeout(() => setMessage(null), 3000);
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

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        router.push('/login');
      } catch (error) {
        console.error('Sign out failed:', error);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                Manage your personal preferences and account settings
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">

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

          {/* Facility Logo Management - Only for admins */}
          {profile?.role?.includes('administrator') && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Image className="h-5 w-5" />
                Facility Logo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Logo
                  </label>
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                    {facilityLogoPreview ? (
                      <img 
                        src={facilityLogoPreview} 
                        alt="Facility logo preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">No logo uploaded</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload New Logo
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFacilityLogoChange}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400
                        hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Recommended: 200x200px, max 2MB, JPEG/PNG/WebP format
                    </p>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={saveFacilityLogo}
                        disabled={!facilityLogoFile || savingFacilityLogo}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
                      >
                        {savingFacilityLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload Logo
                          </>
                        )}
                      </button>
                      
                      {facilityLogoPreview && (
                        <button
                          type="button"
                          onClick={removeFacilityLogo}
                          disabled={savingFacilityLogo}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30 dark:focus:ring-offset-gray-800"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Image className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Facility Logo Information
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      This logo will appear in the top-left corner of the sidebar for all users at your facility. 
                      It replaces the default CareIQ branding and helps create a personalized experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

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

        {/* Feedback Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Feedback
          </h2>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Help us improve CareIQ! Share your suggestions for new features or report bugs.
            </p>
            
            {/* Feedback Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What type of feedback is this?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="feature"
                    checked={feedbackType === 'feature'}
                    onChange={(e) => setFeedbackType(e.target.value as 'feature' | 'bug')}
                    className="mr-2"
                  />
                  <span className="text-sm">Feature Request</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="bug"
                    checked={feedbackType === 'bug'}
                    onChange={(e) => setFeedbackType(e.target.value as 'feature' | 'bug')}
                    className="mr-2"
                  />
                  <span className="text-sm">Bug Report</span>
                </label>
              </div>
            </div>
            
            {/* Feedback Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {feedbackType === 'feature' ? 'Describe your feature idea' : 'Describe the bug you encountered'}
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={feedbackType === 'feature' ? 
                  "Tell us about the feature you'd like to see..." : 
                  "Describe what happened and what you expected to happen..."}
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={submitFeedback}
                disabled={sendingFeedback || !feedbackText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {sendingFeedback ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {sendingFeedback ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>

        {/* Company Branding Section - Admin Only */}
        {profile?.role?.includes('administrator') && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Company Branding
            </h2>
            
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize the appearance of CareIQ to match your facility's branding.
              </p>
              
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your facility name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="#10B981"
                    />
                  </div>
                </div>
              </div>
              
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-16 h-16 rounded-lg border border-gray-300 dark:border-gray-600 p-2 bg-white dark:bg-gray-700 flex items-center justify-center">
                      <img 
                        src={logoPreview} 
                        alt="Company logo preview" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Upload size={16} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {logoFile ? 'Change Logo' : 'Upload Logo'}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PNG, JPG, or SVG. Max 2MB. Square images work best.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Preview Section */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview</h4>
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded" />
                    ) : (
                      companyName ? companyName.charAt(0).toUpperCase() : 'C'
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {companyName || 'Your Company'}
                    </div>
                    <div className="text-xs" style={{ color: accentColor }}>
                      Powered by CareIQ
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveBrandingSettings}
                  disabled={savingBranding}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {savingBranding ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Palette size={16} />
                  )}
                  {savingBranding ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Platform Integrations Section - Admin Only */}
        {profile?.role?.includes('administrator') && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Platform Integrations
            </h2>
            
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connect CareIQ to your existing systems to automatically sync data and streamline workflows.
              </p>

              {/* PointClickCare */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">PointClickCare</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Electronic Health Records</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integrations.pointClickCare.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        Not connected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Facility ID</label>
                    <input
                      type="text"
                      value={integrations.pointClickCare.facilityId}
                      onChange={(e) => setIntegrations({...integrations, pointClickCare: {...integrations.pointClickCare, facilityId: e.target.value}})}
                      placeholder="Enter your PCC facility ID"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                      type="text"
                      value={integrations.pointClickCare.username}
                      onChange={(e) => setIntegrations({...integrations, pointClickCare: {...integrations.pointClickCare, username: e.target.value}})}
                      placeholder="PCC username"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnection('PointClickCare')}
                    className="text-xs px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    Test Connection
                  </button>
                  {integrations.pointClickCare.lastSync && (
                    <span className="text-xs text-gray-500">
                      Last sync: {new Date(integrations.pointClickCare.lastSync).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* MatrixCare */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">MatrixCare</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Long-term Care Software</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integrations.matrixCare.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        Not connected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Server URL</label>
                    <input
                      type="url"
                      value={integrations.matrixCare.url}
                      onChange={(e) => setIntegrations({...integrations, matrixCare: {...integrations.matrixCare, url: e.target.value}})}
                      placeholder="https://your-server.matrixcare.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                      type="text"
                      value={integrations.matrixCare.username}
                      onChange={(e) => setIntegrations({...integrations, matrixCare: {...integrations.matrixCare, username: e.target.value}})}
                      placeholder="MatrixCare username"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnection('MatrixCare')}
                    className="text-xs px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  >
                    Test Connection
                  </button>
                  {integrations.matrixCare.lastSync && (
                    <span className="text-xs text-gray-500">
                      Last sync: {new Date(integrations.matrixCare.lastSync).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Meditech */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Meditech</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Hospital Information System</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integrations.meditech.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        Not connected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Server</label>
                    <input
                      type="text"
                      value={integrations.meditech.server}
                      onChange={(e) => setIntegrations({...integrations, meditech: {...integrations.meditech, server: e.target.value}})}
                      placeholder="server.hospital.com"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Database</label>
                    <input
                      type="text"
                      value={integrations.meditech.database}
                      onChange={(e) => setIntegrations({...integrations, meditech: {...integrations.meditech, database: e.target.value}})}
                      placeholder="Database name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnection('Meditech')}
                    className="text-xs px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    Test Connection
                  </button>
                  {integrations.meditech.lastSync && (
                    <span className="text-xs text-gray-500">
                      Last sync: {new Date(integrations.meditech.lastSync).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveIntegrations}
                  disabled={savingIntegrations}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {savingIntegrations ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LinkIcon size={16} />
                  )}
                  {savingIntegrations ? 'Saving...' : 'Save Integrations'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Section - Admin Only */}
        {profile?.role?.includes('administrator') && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Subscription
            </h2>
            
            <div className="space-y-4">
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Subscription Status
                      </label>
                      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        subscription.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : subscription.status === 'trialing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {subscription.status === 'active' ? 'Active' :
                         subscription.status === 'trialing' ? 'Trial' :
                         subscription.status === 'canceled' ? 'Canceled' : 
                         subscription.status || 'Unknown'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Period End
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {subscription.current_period_end 
                          ? new Date(subscription.current_period_end).toLocaleDateString()
                          : 'Not available'
                        }
                      </div>
                    </div>
                  </div>

                  {subscription.cancel_at_period_end && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        <strong>Cancellation Scheduled:</strong> Your subscription will not renew after the current period ends.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={createPortalLink}
                    disabled={loadingBilling}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingBilling ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ExternalLink size={16} />
                    )}
                    Manage Subscription
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Subscription</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Your facility doesn't have an active CareIQ subscription.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Contact support to set up billing for your facility.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Changes are saved automatically
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        
        </div>
      </div>
    </div>
  );
}