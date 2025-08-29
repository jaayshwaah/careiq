"use client";

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function BootstrapPage() {
  const { user, isAuthenticated } = useAuth();
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  const bootstrapAdmin = async () => {
    if (!isAuthenticated || !user) {
      setMessage({ type: 'error', text: 'Please sign in first' });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/bootstrap-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.ok) {
        setMessage({ type: 'success', text: result.message });
        // Refresh the page after 2 seconds
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to bootstrap admin' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">Please sign in first</h1>
          <a href="/login" className="text-blue-600 hover:underline">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm border max-w-md w-full p-6">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Bootstrap Admin Access</h1>
          <p className="text-gray-600 text-sm">
            This will create an admin profile for your account: <strong>{user?.email}</strong>
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
              {message.type === 'success' && (
                <p className="text-xs text-green-700 mt-1">
                  Redirecting to admin panel...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This functionality is restricted to authorized emails only. 
                  Only use this if you are the system administrator.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={bootstrapAdmin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating Admin Profile...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Bootstrap Admin Access
              </>
            )}
          </button>

          <div className="text-center">
            <a 
              href="/dashboard" 
              className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}