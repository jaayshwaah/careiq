"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Key,
  UserCheck,
  UserX
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  permissions: Permission[];
  facilityId: string;
  facilityName: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin?: string;
  createdAt: string;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  resource: string;
  conditions: string[];
  effect: 'allow' | 'deny';
  priority: number;
  isActive: boolean;
}

interface AdvancedRBACProps {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  policies: AccessPolicy[];
  onUserUpdate: (user: User) => void;
  onRoleUpdate: (role: Role) => void;
  onPermissionUpdate: (permission: Permission) => void;
  onPolicyUpdate: (policy: AccessPolicy) => void;
  onUserDelete: (userId: string) => void;
  onRoleDelete: (roleId: string) => void;
  onPermissionDelete: (permissionId: string) => void;
  onPolicyDelete: (policyId: string) => void;
}

const AdvancedRBAC: React.FC<AdvancedRBACProps> = ({
  users,
  roles,
  permissions,
  policies,
  onUserUpdate,
  onRoleUpdate,
  onPermissionUpdate,
  onPolicyUpdate,
  onUserDelete,
  onRoleDelete,
  onPermissionDelete,
  onPolicyDelete
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions' | 'policies'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    facility: ''
  });
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <UserX className="w-4 h-4 text-gray-500" />;
      case 'suspended':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <UserCheck className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEffectColor = (effect: AccessPolicy['effect']) => {
    return effect === 'allow' 
      ? 'text-green-600 bg-green-100' 
      : 'text-red-600 bg-red-100';
  };

  const filteredUsers = users.filter(user => {
    if (filters.search && !user.fullName.toLowerCase().includes(filters.search.toLowerCase()) && 
        !user.email.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && user.status !== filters.status) return false;
    if (filters.facility && user.facilityId !== filters.facility) return false;
    return true;
  });

  const facilities = [...new Set(users.map(u => u.facilityName))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
            <Shield className="w-6 h-6 text-[var(--accent)]" />
            <span>Advanced RBAC</span>
          </h2>
          <p className="text-muted">Role-based access control and permission management</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-[var(--muted)] p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'users' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'roles' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'permissions' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Permissions ({permissions.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'policies' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Policies ({policies.length})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search users, roles, or permissions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          
          {activeTab === 'users' && (
            <>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Facility</label>
                <select
                  value={filters.facility}
                  onChange={(e) => setFilters(prev => ({ ...prev, facility: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <option value="">All Facilities</option>
                  {facilities.map(facility => (
                    <option key={facility} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[var(--accent)] rounded-full flex items-center justify-center text-white font-semibold">
                    {user.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{user.fullName}</h3>
                    <p className="text-sm text-muted">{user.email}</p>
                    <p className="text-sm text-muted">{user.facilityName}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(user.status)}
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getStatusColor(user.status)
                    )}>
                      {user.status}
                    </span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onUserUpdate(user)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onUserDelete(user.id)}
                      className="p-2 text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Roles</h4>
                  <div className="space-y-1">
                    {user.roles.map((role) => (
                      <span
                        key={role.id}
                        className="inline-block px-2 py-1 bg-[var(--muted)] text-xs text-primary rounded"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Permissions</h4>
                  <p className="text-sm text-muted">{user.permissions.length} permissions</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Last Login</h4>
                  <p className="text-sm text-muted">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center text-white">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{role.name}</h3>
                    <p className="text-sm text-muted">{role.description}</p>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className="p-2 text-muted hover:text-primary transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRoleUpdate(role)}
                    className="p-2 text-muted hover:text-primary transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => onRoleDelete(role.id)}
                      className="p-2 text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Permissions</span>
                  <span className="font-medium text-primary">{role.permissions.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Type</span>
                  <span className="font-medium text-primary">
                    {role.isSystem ? 'System' : 'Custom'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Created</span>
                  <span className="font-medium text-primary">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-4">
          {permissions.map((permission) => (
            <motion.div
              key={permission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{permission.name}</h3>
                    <p className="text-sm text-muted">{permission.description}</p>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  <button
                    onClick={() => onPermissionUpdate(permission)}
                    className="p-2 text-muted hover:text-primary transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onPermissionDelete(permission.id)}
                    className="p-2 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Resource</h4>
                  <p className="text-sm text-muted">{permission.resource}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Action</h4>
                  <p className="text-sm text-muted">{permission.action}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Conditions</h4>
                  <p className="text-sm text-muted">
                    {permission.conditions?.length || 0} conditions
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          {policies.map((policy) => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{policy.name}</h3>
                    <p className="text-sm text-muted">{policy.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getEffectColor(policy.effect)
                  )}>
                    {policy.effect}
                  </span>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onPolicyUpdate(policy)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onPolicyDelete(policy.id)}
                      className="p-2 text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Resource</h4>
                  <p className="text-sm text-muted">{policy.resource}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Priority</h4>
                  <p className="text-sm text-muted">{policy.priority}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-primary mb-1">Status</h4>
                  <p className="text-sm text-muted">
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {((activeTab === 'users' && filteredUsers.length === 0) ||
        (activeTab === 'roles' && roles.length === 0) ||
        (activeTab === 'permissions' && permissions.length === 0) ||
        (activeTab === 'policies' && policies.length === 0)) && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No {activeTab} found</h3>
          <p className="text-muted">Try adjusting your filters or create a new {activeTab.slice(0, -1)}.</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedRBAC;
