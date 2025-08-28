"use client";

import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function AdminStatusPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string>('');

  const supabase = getBrowserSupabase();

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const grantAdminAccess = async () => {
    if (!user?.email || user.email !== 'jking@pioneervalleyhealth.com') {
      setMessage('Unauthorized email address');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/debug/grant-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage('Admin access granted! Please refresh the page.');
        await loadProfile(); // Reload profile
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Status Debug</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current User Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Profile Data</h2>
          {profile ? (
            <div className="space-y-2 text-sm">
              <p><strong>Role:</strong> {profile.role || 'None'}</p>
              <p><strong>Is Admin:</strong> {profile.is_admin ? 'Yes' : 'No'}</p>
              <p><strong>Full Name:</strong> {profile.full_name || 'None'}</p>
              <p><strong>Email in Profile:</strong> {profile.email || 'None'}</p>
            </div>
          ) : (
            <p>No profile data found</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Admin Access Check</h2>
          <div className="space-y-2 text-sm">
            <p><strong>CareIQ Email:</strong> {user?.email?.endsWith('@careiq.com') ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Authorized Email:</strong> {user?.email === 'jking@pioneervalleyhealth.com' ? '✅ Yes' : '❌ No'}</p>
            <p><strong>CareIQ Admin Role:</strong> {profile?.role === 'careiq_admin' ? '✅ Yes' : '❌ No'}</p>
          </div>
        </div>

        {user?.email === 'jking@pioneervalleyhealth.com' && profile?.role !== 'careiq_admin' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Grant Admin Access</h3>
            <p className="text-yellow-700 mb-4">
              You are authorized but don't have admin role. Click below to grant admin access.
            </p>
            <button
              onClick={grantAdminAccess}
              disabled={updating}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Grant Admin Access'}
            </button>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Next Steps</h3>
          <ol className="text-blue-700 space-y-1 text-sm">
            <li>1. Ensure you have admin role (careiq_admin)</li>
            <li>2. Refresh the page after role update</li>
            <li>3. Check sidebar for "CareIQ Admin" button</li>
            <li>4. Access admin dashboard at /admin</li>
          </ol>
        </div>
      </div>
    </div>
  );
}