"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  BarChart3, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Filter,
  Search,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  licenseNumber: string;
  capacity: number;
  currentOccupancy: number;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  type: 'skilled_nursing' | 'assisted_living' | 'rehabilitation' | 'memory_care';
  region: string;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  metrics: {
    complianceScore: number;
    qualityRating: number;
    occupancyRate: number;
    staffTurnover: number;
    revenue: number;
    expenses: number;
  };
  lastUpdated: string;
  createdAt: string;
}

export interface FacilityMetrics {
  totalFacilities: number;
  activeFacilities: number;
  totalCapacity: number;
  totalOccupancy: number;
  averageComplianceScore: number;
  averageQualityRating: number;
  totalRevenue: number;
  totalExpenses: number;
}

interface MultiFacilityManagementProps {
  facilities: Facility[];
  metrics: FacilityMetrics;
  onFacilitySelect: (facility: Facility) => void;
  onFacilityEdit: (facility: Facility) => void;
  onFacilityDelete: (facilityId: string) => void;
  onFacilityCreate: () => void;
  onMetricsRefresh: () => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

const MultiFacilityManagement: React.FC<MultiFacilityManagementProps> = ({
  facilities,
  metrics,
  onFacilitySelect,
  onFacilityEdit,
  onFacilityDelete,
  onFacilityCreate,
  onMetricsRefresh,
  onExport
}) => {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    region: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState<'name' | 'compliance' | 'occupancy' | 'revenue'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getStatusColor = (status: Facility['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: Facility['type']) => {
    switch (type) {
      case 'skilled_nursing':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'assisted_living':
        return <Users className="w-5 h-5 text-green-500" />;
      case 'rehabilitation':
        return <TrendingUp className="w-5 h-5 text-purple-500" />;
      case 'memory_care':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Building2 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredFacilities = facilities.filter(facility => {
    if (filters.status && facility.status !== filters.status) return false;
    if (filters.type && facility.type !== filters.type) return false;
    if (filters.region && facility.region !== filters.region) return false;
    if (filters.search && !facility.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !facility.city.toLowerCase().includes(filters.search.toLowerCase()) &&
        !facility.state.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const sortedFacilities = [...filteredFacilities].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'compliance':
        aValue = a.metrics.complianceScore;
        bValue = b.metrics.complianceScore;
        break;
      case 'occupancy':
        aValue = a.metrics.occupancyRate;
        bValue = b.metrics.occupancyRate;
        break;
      case 'revenue':
        aValue = a.metrics.revenue;
        bValue = b.metrics.revenue;
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const regions = [...new Set(facilities.map(f => f.region))];
  const types = [
    { id: 'skilled_nursing', label: 'Skilled Nursing' },
    { id: 'assisted_living', label: 'Assisted Living' },
    { id: 'rehabilitation', label: 'Rehabilitation' },
    { id: 'memory_care', label: 'Memory Care' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-[var(--accent)]" />
            <span>Multi-Facility Management</span>
          </h2>
          <p className="text-muted">Manage and monitor all your facilities from one dashboard</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onMetricsRefresh}
            className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onFacilityCreate}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Facility</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Total Facilities</h3>
            <Building2 className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold text-primary">{metrics.totalFacilities}</p>
          <p className="text-sm text-muted">{metrics.activeFacilities} active</p>
        </div>
        
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Total Capacity</h3>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-primary">{metrics.totalCapacity.toLocaleString()}</p>
          <p className="text-sm text-muted">{metrics.totalOccupancy.toLocaleString()} occupied</p>
        </div>
        
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Avg Compliance</h3>
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-primary">{metrics.averageComplianceScore.toFixed(1)}%</p>
          <p className="text-sm text-muted">Quality: {metrics.averageQualityRating.toFixed(1)}/5</p>
        </div>
        
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Total Revenue</h3>
            <BarChart3 className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            ${(metrics.totalRevenue / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-muted">
            Profit: ${((metrics.totalRevenue - metrics.totalExpenses) / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search facilities..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          
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
              <option value="maintenance">Maintenance</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">All Types</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Region</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="name">Name</option>
              <option value="compliance">Compliance Score</option>
              <option value="occupancy">Occupancy Rate</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedFacilities.map((facility) => (
          <motion.div
            key={facility.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onFacilitySelect(facility)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTypeIcon(facility.type)}
                <div>
                  <h3 className="text-lg font-semibold text-primary">{facility.name}</h3>
                  <p className="text-sm text-muted">{facility.city}, {facility.state}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(facility.status)
                )}>
                  {facility.status}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFacilityEdit(facility);
                    }}
                    className="p-1 text-muted hover:text-primary transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFacilityDelete(facility.id);
                    }}
                    className="p-1 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Capacity</span>
                <span className="font-medium text-primary">
                  {facility.currentOccupancy}/{facility.capacity}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Occupancy Rate</span>
                <span className={cn("font-medium", getOccupancyColor(facility.metrics.occupancyRate))}>
                  {facility.metrics.occupancyRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Compliance Score</span>
                <span className={cn("font-medium", getComplianceColor(facility.metrics.complianceScore))}>
                  {facility.metrics.complianceScore.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Quality Rating</span>
                <span className="font-medium text-primary">
                  {facility.metrics.qualityRating.toFixed(1)}/5
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Revenue</span>
                <span className="font-medium text-primary">
                  ${(facility.metrics.revenue / 1000).toFixed(0)}K
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Manager</span>
                <span className="font-medium text-primary">{facility.manager.name}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Last updated: {new Date(facility.lastUpdated).toLocaleDateString()}</span>
                <span>{facility.region}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {sortedFacilities.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Facilities Found</h3>
          <p className="text-muted">Try adjusting your filters or add a new facility.</p>
        </div>
      )}
    </div>
  );
};

export default MultiFacilityManagement;
