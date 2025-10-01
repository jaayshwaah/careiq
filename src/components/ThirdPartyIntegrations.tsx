"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  RefreshCw,
  ExternalLink,
  Key,
  Database,
  Mail,
  Calendar,
  FileText,
  BarChart3,
  Users,
  Shield,
  Zap,
  Globe,
  Cloud,
  Server,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'ehr' | 'calendar' | 'communication' | 'analytics' | 'storage' | 'payment' | 'compliance';
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'pending' | 'maintenance';
  version: string;
  lastSync?: string;
  nextSync?: string;
  config: {
    endpoint?: string;
    apiKey?: string;
    secret?: string;
    webhookUrl?: string;
    syncFrequency?: string;
    dataMapping?: Record<string, string>;
  };
  capabilities: string[];
  health: {
    status: 'healthy' | 'warning' | 'error';
    lastCheck: string;
    responseTime?: number;
    errorRate?: number;
  };
  usage: {
    requests: number;
    errors: number;
    lastReset: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: Integration['category'];
  provider: string;
  icon: string;
  features: string[];
  pricing: {
    free: boolean;
    plans: {
      name: string;
      price: number;
      features: string[];
    }[];
  };
  setupRequired: string[];
  documentation: string;
}

interface ThirdPartyIntegrationsProps {
  integrations: Integration[];
  templates: IntegrationTemplate[];
  onIntegrationCreate: (templateId: string) => void;
  onIntegrationUpdate: (integration: Integration) => void;
  onIntegrationDelete: (integrationId: string) => void;
  onIntegrationTest: (integrationId: string) => void;
  onIntegrationSync: (integrationId: string) => void;
  onIntegrationConfigure: (integrationId: string) => void;
}

const ThirdPartyIntegrations: React.FC<ThirdPartyIntegrationsProps> = ({
  integrations,
  templates,
  onIntegrationCreate,
  onIntegrationUpdate,
  onIntegrationDelete,
  onIntegrationTest,
  onIntegrationSync,
  onIntegrationConfigure
}) => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'templates'>('integrations');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });
  const [showConfig, setShowConfig] = useState(false);

  const getCategoryIcon = (category: Integration['category']) => {
    switch (category) {
      case 'ehr':
        return <Database className="w-5 h-5 text-blue-500" />;
      case 'calendar':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'communication':
        return <Mail className="w-5 h-5 text-purple-500" />;
      case 'analytics':
        return <BarChart3 className="w-5 h-5 text-orange-500" />;
      case 'storage':
        return <Cloud className="w-5 h-5 text-indigo-500" />;
      case 'payment':
        return <Shield className="w-5 h-5 text-red-500" />;
      case 'compliance':
        return <FileText className="w-5 h-5 text-yellow-500" />;
      default:
        return <Plug className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'maintenance':
        return <Settings className="w-4 h-4 text-blue-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'maintenance':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health: Integration['health']['status']) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    if (filters.category && integration.category !== filters.category) return false;
    if (filters.status && integration.status !== filters.status) return false;
    if (filters.search && !integration.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !integration.provider.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const filteredTemplates = templates.filter(template => {
    if (filters.category && template.category !== filters.category) return false;
    if (filters.search && !template.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !template.provider.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const categories = [
    { id: 'ehr', label: 'EHR Systems', icon: Database },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'communication', label: 'Communication', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'storage', label: 'Storage', icon: Cloud },
    { id: 'payment', label: 'Payment', icon: Shield },
    { id: 'compliance', label: 'Compliance', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
            <Plug className="w-6 h-6 text-[var(--accent)]" />
            <span>Third-Party Integrations</span>
          </h2>
          <p className="text-muted">Connect with external services and APIs</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Integration</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-[var(--muted)] p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('integrations')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'integrations' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Active Integrations ({integrations.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'templates' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Available Templates ({templates.length})
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
                placeholder="Search integrations..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          {activeTab === 'integrations' && (
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
                <option value="error">Error</option>
                <option value="pending">Pending</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'integrations' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredIntegrations.map((integration) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(integration.category)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{integration.name}</h3>
                    <p className="text-sm text-muted">{integration.provider} v{integration.version}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(integration.status)}
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getStatusColor(integration.status)
                    )}>
                      {integration.status}
                    </span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onIntegrationTest(integration.id)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onIntegrationConfigure(integration.id)}
                      className="p-2 text-muted hover:text-primary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onIntegrationDelete(integration.id)}
                      className="p-2 text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Health</span>
                  <span className={cn("font-medium", getHealthColor(integration.health.status))}>
                    {integration.health.status}
                  </span>
                </div>
                
                {integration.health.responseTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Response Time</span>
                    <span className="font-medium text-primary">
                      {integration.health.responseTime}ms
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Requests (24h)</span>
                  <span className="font-medium text-primary">
                    {integration.usage.requests.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Error Rate</span>
                  <span className="font-medium text-primary">
                    {integration.usage.errors > 0 
                      ? ((integration.usage.errors / integration.usage.requests) * 100).toFixed(2)
                      : 0}%
                  </span>
                </div>
                
                {integration.lastSync && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Last Sync</span>
                    <span className="font-medium text-primary">
                      {new Date(integration.lastSync).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {integration.nextSync && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Next Sync</span>
                    <span className="font-medium text-primary">
                      {new Date(integration.nextSync).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {integration.capabilities.slice(0, 3).map((capability, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-[var(--muted)] text-xs text-primary rounded"
                      >
                        {capability}
                      </span>
                    ))}
                    {integration.capabilities.length > 3 && (
                      <span className="px-2 py-1 bg-[var(--muted)] text-xs text-primary rounded">
                        +{integration.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onIntegrationSync(integration.id)}
                    className="px-3 py-1 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onIntegrationCreate(template.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(template.category)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{template.name}</h3>
                    <p className="text-sm text-muted">{template.provider}</p>
                  </div>
                </div>
                
                <button className="p-2 text-muted hover:text-primary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-sm text-muted mb-4">{template.description}</p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-[var(--muted)] text-xs text-primary rounded"
                      >
                        {feature}
                      </span>
                    ))}
                    {template.features.length > 3 && (
                      <span className="px-2 py-1 bg-[var(--muted)] text-xs text-primary rounded">
                        +{template.features.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Pricing</span>
                  <span className="font-medium text-primary">
                    {template.pricing.free ? 'Free' : 'Paid'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Setup Required</span>
                  <span className="font-medium text-primary">
                    {template.setupRequired.length} steps
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <button className="w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Integration</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {((activeTab === 'integrations' && filteredIntegrations.length === 0) ||
        (activeTab === 'templates' && filteredTemplates.length === 0)) && (
        <div className="text-center py-12">
          <Plug className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No {activeTab} found</h3>
          <p className="text-muted">Try adjusting your filters or explore available templates.</p>
        </div>
      )}
    </div>
  );
};

export default ThirdPartyIntegrations;
