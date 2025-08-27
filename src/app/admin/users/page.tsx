// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Plus, 
  Edit, 
  Shield, 
  Building2,
  Mail,
  Calendar,
  Search,
  Filter
} from "lucide-react";

type UserProfile = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  facility_name: string;
  facility_state: string;
  created_at: string;
  last_sign_in_at: string;
  approved_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedState, setSelectedState] = useState("");
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    role: "",
    facility_name: "",
    facility_state: "",
    full_name: "",
  });

  const roles = [
    "Administrator",
    "Director of Nursing (DON)",
    "Assistant Director of Nursing (ADON)",
    "Registered Nurse (RN)",
    "Licensed Practical Nurse (LPN)",
    "Certified Nursing Assistant (CNA)",
    "Social Services Director",
    "Activities Director",
    "Dietary Manager",
    "Maintenance Director",
    "Business Office Manager",
    "HR Director",
    "Payroll Coordinator",
    "Medical Director",
    "Quality Assurance Coordinator",
    "Infection Control Nurse",
    "MDS Coordinator",
    "Staff"
  ];

  const states = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Call the admin function to list users
      const { data, error } = await supabase.rpc('admin_list_users');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const editUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      facility_name: user.facility_name,
      facility_state: user.facility_state,
      full_name: user.full_name,
    });
    setShowEditModal(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase.rpc('admin_create_profile', {
        target_user_id: editingUser.user_id,
        user_role: editForm.role,
        user_facility_id: null, // You can add facility_id if needed
        user_facility_name: editForm.facility_name,
        user_facility_state: editForm.facility_state,
        user_full_name: editForm.full_name,
        user_email: editingUser.email,
      });

      if (error) throw error;
      
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert('Failed to update user: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.facility_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesState = !selectedState || user.facility_state === selectedState;
    
    return matchesSearch && matchesRole && matchesState;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user profiles, roles, and facility assignments</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          
          <div className="text-sm text-gray-500 flex items-center">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.full_name || "No name set"}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">No role assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{user.facility_name || "Not assigned"}</div>
                    {user.facility_state && (
                      <div className="text-sm text-gray-500">{user.facility_state}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.approved_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending Setup
                        </span>
                      )}
                      <div className="text-xs text-gray-500">
                        Last: {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => editUser(user)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit user"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Edit User: {editingUser.email}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name</label>
                  <input
                    type="text"
                    value={editForm.facility_name}
                    onChange={(e) => setEditForm({...editForm, facility_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Sunshine Manor Nursing Home"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={editForm.facility_state}
                    onChange={(e) => setEditForm({...editForm, facility_state: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select State</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}