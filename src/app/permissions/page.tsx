// src/app/permissions/page.tsx - Staff Permissions Management for Facility Administrators
"use client";

import { useState, useEffect } from 'react';
import { Shield, Users, Save, X, Check, Search, Filter, AlertCircle, Lock, Unlock, Edit2, Eye, EyeOff } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  facility_id: string;
  permissions: ModulePermissions;
  status: 'active' | 'inactive';
  last_login?: string;
}

interface ModulePermissions {
  [key: string]: boolean;
}

interface Module {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'clinical' | 'operations' | 'compliance' | 'analytics' | 'admin';
  icon: string;
  requiresUpgrade?: boolean;
}

const CAREIQ_MODULES: Module[] = [
  // Core Modules
  { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard and home screen', category: 'core', icon: '🏠' },
  { id: 'ai_assistant', name: 'AI Assistant', description: 'CareIQ AI chat and assistance', category: 'core', icon: '🤖' },
  { id: 'notifications', name: 'Notifications', description: 'Alerts and reminders', category: 'core', icon: '🔔' },
  
  // Clinical
  { id: 'care_plans', name: 'Care Plans', description: 'Care plan creation and management', category: 'clinical', icon: '📋' },
  { id: 'daily_rounds', name: 'Daily Rounds', description: 'Daily round checklists and tracking', category: 'clinical', icon: '✅' },
  { id: 'incident_reports', name: 'Incident Reports', description: 'Incident tracking and reporting', category: 'clinical', icon: '⚠️' },
  { id: 'census', name: 'Census Management', description: 'Resident census and tracking', category: 'clinical', icon: '👥' },
  
  // Operations
  { id: 'task_management', name: 'Task Management', description: 'Task assignment and tracking', category: 'operations', icon: '📝' },
  { id: 'supply_management', name: 'Supply Management', description: 'Inventory and supply tracking', category: 'operations', icon: '📦' },
  { id: 'schedule_import', name: 'Schedule Import', description: 'Staff schedule management', category: 'operations', icon: '📅' },
  { id: 'calendar', name: 'Calendar', description: 'Facility calendar and events', category: 'operations', icon: '🗓️' },
  
  // Compliance
  { id: 'cms_guidance', name: 'CMS Guidance', description: 'Compliance guidance and survey prep', category: 'compliance', icon: '🏛️' },
  { id: 'survey_prep', name: 'Survey Preparation', description: 'CMS survey preparation tools', category: 'compliance', icon: '🎯' },
  { id: 'mock_survey', name: 'Mock Survey Training', description: 'Mock survey scenarios and training', category: 'compliance', icon: '📚' },
  { id: 'pbj_corrector', name: 'PBJ Corrector', description: 'PBJ data validation and correction', category: 'compliance', icon: '📊' },
  { id: 'knowledge_base', name: 'Knowledge Base', description: 'Policy and regulatory documents', category: 'compliance', icon: '📖' },
  
  // Analytics & Reports
  { id: 'reports', name: 'Reports & Analytics', description: 'Data analysis and reporting', category: 'analytics', icon: '📈' },
  { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Advanced data insights and predictions', category: 'analytics', icon: '🔬' },
  
  // Admin (Facility Admin only)
  { id: 'integrations', name: 'Integrations', description: 'EHR, calendar, and billing integrations', category: 'admin', icon: '🔗' },
  { id: 'settings', name: 'Settings', description: 'Facility settings and configuration', category: 'admin', icon: '⚙️' },
  { id: 'user_management', name: 'User Management', description: 'Staff user accounts (view only)', category: 'admin', icon: '👤' },
];

const ROLE_TEMPLATES = {
  'Facility Administrator': {
    name: 'Facility Administrator (LNHA)',
    permissions: Object.fromEntries(CAREIQ_MODULES.map(m => [m.id, true]))
  },
  'Director of Nursing': {
    name: 'Director of Nursing',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      care_plans: true,
      daily_rounds: true,
      incident_reports: true,
      census: true,
      task_management: true,
      cms_guidance: true,
      survey_prep: true,
      mock_survey: true,
      knowledge_base: true,
      reports: true,
      advanced_analytics: true,
    }
  },
  'Nurse Manager': {
    name: 'Nurse Manager / Charge Nurse',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      care_plans: true,
      daily_rounds: true,
      incident_reports: true,
      census: true,
      task_management: true,
      schedule_import: true,
      calendar: true,
      cms_guidance: true,
      reports: true,
    }
  },
  'Registered Nurse': {
    name: 'Registered Nurse (RN)',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      care_plans: true,
      daily_rounds: true,
      incident_reports: true,
      census: true,
      task_management: true,
      cms_guidance: true,
    }
  },
  'Licensed Practical Nurse': {
    name: 'Licensed Practical Nurse (LPN)',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      care_plans: true,
      daily_rounds: true,
      incident_reports: true,
      task_management: true,
    }
  },
  'Certified Nursing Assistant': {
    name: 'Certified Nursing Assistant (CNA)',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      daily_rounds: true,
      task_management: true,
    }
  },
  'Social Worker': {
    name: 'Social Worker',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      care_plans: true,
      census: true,
      incident_reports: true,
      cms_guidance: true,
      reports: true,
    }
  },
  'Activities Director': {
    name: 'Activities Director',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      census: true,
      task_management: true,
      calendar: true,
    }
  },
  'Dietary Manager': {
    name: 'Dietary Manager',
    permissions: {
      dashboard: true,
      ai_assistant: true,
      notifications: true,
      census: true,
      supply_management: true,
      task_management: true,
    }
  },
};

export default function PermissionsPage() {
  const { user, userProfile } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<ModulePermissions>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Check if user is facility admin
  const isFacilityAdmin = userProfile?.role?.includes('administrator') || userProfile?.role?.includes('Facility Administrator');

  useEffect(() => {
    if (isFacilityAdmin) {
      loadStaff();
    }
  }, [isFacilityAdmin]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, facility_id, permissions, status, last_login')
        .eq('facility_id', userProfile?.facility_id)
        .neq('id', user?.id) // Don't show current user
        .order('full_name');

      if (error) throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermissions = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setEditedPermissions(staffMember.permissions || {});
  };

  const handleTogglePermission = (moduleId: string) => {
    setEditedPermissions(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleApplyTemplate = (templateKey: string) => {
    const template = ROLE_TEMPLATES[templateKey as keyof typeof ROLE_TEMPLATES];
    if (template) {
      setEditedPermissions(template.permissions);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: editedPermissions })
        .eq('id', selectedStaff.id);

      if (error) throw error;

      setSuccessMessage('Permissions updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reload staff to reflect changes
      await loadStaff();
      setSelectedStaff(null);
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAllCategory = (category: string, enabled: boolean) => {
    const categoryModules = CAREIQ_MODULES.filter(m => m.category === category);
    const updates = Object.fromEntries(
      categoryModules.map(m => [m.id, enabled])
    );
    setEditedPermissions(prev => ({ ...prev, ...updates }));
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role))).filter(Boolean);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return '⭐';
      case 'clinical': return '🏥';
      case 'operations': return '⚙️';
      case 'compliance': return '✅';
      case 'analytics': return '📊';
      case 'admin': return '🔐';
      default: return '📁';
    }
  };

  const getCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (!isFacilityAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Only facility administrators (LNHA) can manage staff permissions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading staff permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Staff Permissions
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage which CareIQ modules your staff can access based on their roles and responsibilities
          </p>
        </div>

        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2"
            >
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-800 dark:text-green-200">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-4">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery || filterRole !== 'all' 
                  ? 'No staff members match your filters'
                  : 'No staff members found. Add users in the Admin panel.'}
              </p>
            </div>
          ) : (
            filteredStaff.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {member.full_name || 'Unnamed User'}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {member.status || 'active'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {member.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Role: <span className="font-medium">{member.role || 'No role assigned'}</span>
                    </p>
                    {member.last_login && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Last login: {new Date(member.last_login).toLocaleDateString()}
                      </p>
                    )}
                    
                    {/* Permission Summary */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(member.permissions || {})
                        .filter(([_, enabled]) => enabled)
                        .slice(0, 5)
                        .map(([moduleId]) => {
                          const module = CAREIQ_MODULES.find(m => m.id === moduleId);
                          return module ? (
                            <span
                              key={moduleId}
                              className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              {module.icon} {module.name}
                            </span>
                          ) : null;
                        })}
                      {Object.values(member.permissions || {}).filter(Boolean).length > 5 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          +{Object.values(member.permissions || {}).filter(Boolean).length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleEditPermissions(member)}
                    className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Permissions
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Edit Permissions Modal */}
        <AnimatePresence>
          {selectedStaff && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedStaff(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Edit Permissions
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedStaff.full_name} ({selectedStaff.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Role Templates */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Apply Role Template:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(ROLE_TEMPLATES).map((templateKey) => (
                      <button
                        key={templateKey}
                        onClick={() => handleApplyTemplate(templateKey)}
                        className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {ROLE_TEMPLATES[templateKey as keyof typeof ROLE_TEMPLATES].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions List */}
                <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-16rem)]">
                  {['core', 'clinical', 'operations', 'compliance', 'analytics', 'admin'].map((category) => {
                    const categoryModules = CAREIQ_MODULES.filter(m => m.category === category);
                    const allEnabled = categoryModules.every(m => editedPermissions[m.id]);
                    const someEnabled = categoryModules.some(m => editedPermissions[m.id]);

                    return (
                      <div key={category} className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-2xl">{getCategoryIcon(category)}</span>
                            {getCategoryName(category)} Modules
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleAllCategory(category, true)}
                              className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            >
                              Enable All
                            </button>
                            <button
                              onClick={() => handleToggleAllCategory(category, false)}
                              className="text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                              Disable All
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {categoryModules.map((module) => (
                            <label
                              key={module.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                            >
                              <input
                                type="checkbox"
                                checked={editedPermissions[module.id] || false}
                                onChange={() => handleTogglePermission(module.id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{module.icon}</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {module.name}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                                  {module.description}
                                </p>
                              </div>
                              {editedPermissions[module.id] ? (
                                <Eye className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                              ) : (
                                <EyeOff className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Object.values(editedPermissions).filter(Boolean).length} of {CAREIQ_MODULES.length} modules enabled
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedStaff(null)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


