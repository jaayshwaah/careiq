// src/app/admin/users/page.tsx - Admin User Management Interface
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Crown, 
  Building2,
  Mail,
  Calendar,
  Search,
  Filter,
  UserCheck,
  UserX,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import UserOnboardingWorkflow from '@/components/admin/UserOnboardingWorkflow';
import { useErrorHandler } from '@/lib/errorHandler';
import { useDataValidation } from '@/hooks/useDataValidation';
import LoadingState from '@/components/LoadingState';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  facility_name: string;
  facility_state: string;
  facility_id: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string;
  last_sign_in_at?: string;
  email_confirmed: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const USER_ROLES = [
  'Administrator',
  'CareIQ Staff',
  'Director of Nursing',
  'Assistant Director of Nursing', 
  'MDS Coordinator',
  'Quality Assurance Coordinator',
  'Staff Nurse',
  'Scheduler',
  'Training Coordinator'
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const { handleError } = useErrorHandler();
  const { validate, getFieldError, hasErrors } = useDataValidation();
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOnboardingWorkflow, setShowOnboardingWorkflow] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    facility_name: '',
    facility_state: '',
    facility_id: '',
    is_admin: false,
    password: ''
  });

  // Access control
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthorized) {
      loadUsers();
    }
  }, [isAuthorized]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, showInactive]);

  const checkAccess = async () => {
    if (!isAuthenticated || !user?.id) {
      router.push('/login');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_admin, email")
        .eq("user_id", user.id)
        .single();

      // Check both profile and user email for access
      const hasAccess = profile?.is_admin || 
                       profile?.role?.includes('Administrator') || 
                       profile?.role?.includes('administrator') ||
                       profile?.email?.endsWith('@careiq.com') ||
                       user?.email?.endsWith('@careiq.com') ||
                       user?.email === 'jking@pioneervalleyhealth.com' ||
                       profile?.email === 'jking@pioneervalleyhealth.com';

      if (!hasAccess) {
        router.push('/dashboard');
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Access check failed:", error);
      router.push('/dashboard');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const result = await response.json();
      if (result.ok) {
        setUsers(result.users || []);
      } else {
        const errorMessage = result.error || 'Failed to load users';
        setError(errorMessage);
        handleError(new Error(errorMessage), 'loadUsers');
      }
    } catch (error) {
      const errorMessage = 'Failed to load users';
      setError(errorMessage);
      handleError(error as Error, 'loadUsers');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.facility_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'create_profile',
          ...formData,
          user_id: crypto.randomUUID() // Generate UUID for new users
        })
      });

      const result = await response.json();
      if (result.ok) {
        setMessage({ type: 'success', text: result.message || 'User created successfully' });
        setShowCreateModal(false);
        resetForm();
        loadUsers();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create user' });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'update_user',
          user_id: selectedUser.user_id,
          role: formData.role,
          is_admin: formData.is_admin,
          facility_name: formData.facility_name,
          facility_state: formData.facility_state,
          facility_id: formData.facility_id || null,
          full_name: formData.full_name
        })
      });

      const result = await response.json();
      if (result.ok) {
        setMessage({ type: 'success', text: result.message || 'User updated successfully' });
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        loadUsers();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update user' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/users?user_id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`
        }
      });

      const result = await response.json();
      if (result.ok) {
        setMessage({ type: 'success', text: result.message || 'User deleted successfully' });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete user' });
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      facility_name: user.facility_name || '',
      facility_state: user.facility_state || '',
      facility_id: user.facility_id || '',
      is_admin: user.is_admin,
      password: ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: '',
      facility_name: '',
      facility_state: '',
      facility_id: '',
      is_admin: false,
      password: ''
    });
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/90 to-purple-700/90 text-white rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Users size={24} />
              User Management
            </h1>
            <p className="text-purple-100">
              Manage user accounts, roles, and permissions across all facilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnboardingWorkflow(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add User & Facility
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Quick Add User
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="float-right text-lg font-semibold"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles</option>
            {USER_ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Users ({filteredUsers.length})
          </h2>
        </div>
        
        {loading ? (
          <LoadingState 
            message="Loading users..." 
            size="lg" 
            variant="spinner"
            className="py-12"
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-red-500 mb-4">
              <UserX size={48} />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Error Loading Users</h3>
            <p className="text-muted mb-4">{error}</p>
            <button
              onClick={loadUsers}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Facility</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          user.is_admin ? 'bg-purple-600' : user.role?.includes('Administrator') ? 'bg-blue-600' : 'bg-gray-600'
                        }`}>
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {user.full_name || 'No name'}
                            {user.is_admin && <Crown className="text-purple-600" size={14} />}
                            {user.role?.includes('Administrator') && <Shield className="text-blue-600" size={14} />}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_admin 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                          : user.role?.includes('Administrator')
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : user.role?.includes('CareIQ')
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {user.role || 'No role'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{user.facility_name || 'No facility'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.facility_state}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit user"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.user_id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No users found matching your search criteria.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New User Profile</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter email address"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Creates profile for existing user</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Role</option>
                  {USER_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Facility Name</label>
                <input
                  type="text"
                  value={formData.facility_name}
                  onChange={(e) => setFormData({...formData, facility_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter facility name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">State</label>
                <select
                  value={formData.facility_state}
                  onChange={(e) => setFormData({...formData, facility_state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select State</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium">Super Admin</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Full system access, can manage all users</div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {setShowCreateModal(false); resetForm();}}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Edit User Permissions</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {USER_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Facility Name</label>
                <input
                  type="text"
                  value={formData.facility_name}
                  onChange={(e) => setFormData({...formData, facility_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter facility name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">State</label>
                <select
                  value={formData.facility_state}
                  onChange={(e) => setFormData({...formData, facility_state: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select State</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium">Super Admin</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Full system access, can manage all users</div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {setShowEditModal(false); setSelectedUser(null); resetForm();}}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Onboarding Workflow */}
      <UserOnboardingWorkflow
        isOpen={showOnboardingWorkflow}
        onClose={() => setShowOnboardingWorkflow(false)}
        onComplete={(users) => {
          setMessage({ type: 'success', text: `Successfully created ${users.length} user(s)` });
          loadUsers();
          setShowOnboardingWorkflow(false);
        }}
      />
    </div>
  );
}