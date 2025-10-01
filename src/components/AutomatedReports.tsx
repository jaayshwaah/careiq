"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  Users, 
  BarChart3,
  PieChart,
  TrendingUp,
  Mail,
  Settings,
  Play,
  Pause,
  Square,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'compliance' | 'quality' | 'financial' | 'operational' | 'staffing' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'on_demand';
  format: 'pdf' | 'excel' | 'csv' | 'html';
  sections: ReportSection[];
  recipients: string[];
  isActive: boolean;
  lastGenerated?: string;
  nextGeneration?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'text' | 'image' | 'kpi';
  dataSource: string;
  config: Record<string, any>;
  order: number;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  status: 'generating' | 'completed' | 'failed' | 'scheduled';
  format: string;
  size: number;
  generatedAt: string;
  expiresAt: string;
  downloadUrl?: string;
  error?: string;
}

interface AutomatedReportsProps {
  templates: ReportTemplate[];
  generatedReports: GeneratedReport[];
  onGenerateReport: (templateId: string) => void;
  onScheduleReport: (templateId: string, frequency: ReportTemplate['frequency']) => void;
  onDownloadReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onEditTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const AutomatedReports: React.FC<AutomatedReportsProps> = ({
  templates,
  generatedReports,
  onGenerateReport,
  onScheduleReport,
  onDownloadReport,
  onDeleteReport,
  onEditTemplate,
  onDeleteTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'reports'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });

  const getCategoryIcon = (category: ReportTemplate['category']) => {
    switch (category) {
      case 'compliance':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'quality':
        return <BarChart3 className="w-5 h-5 text-green-500" />;
      case 'financial':
        return <PieChart className="w-5 h-5 text-yellow-500" />;
      case 'operational':
        return <TrendingUp className="w-5 h-5 text-purple-500" />;
      case 'staffing':
        return <Users className="w-5 h-5 text-orange-500" />;
      case 'custom':
        return <Settings className="w-5 h-5 text-gray-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFrequencyColor = (frequency: ReportTemplate['frequency']) => {
    switch (frequency) {
      case 'daily':
        return 'text-green-600 bg-green-50';
      case 'weekly':
        return 'text-blue-600 bg-blue-50';
      case 'monthly':
        return 'text-purple-600 bg-purple-50';
      case 'quarterly':
        return 'text-orange-600 bg-orange-50';
      case 'yearly':
        return 'text-red-600 bg-red-50';
      case 'on_demand':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: GeneratedReport['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'generating':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'scheduled':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'excel':
        return <BarChart3 className="w-4 h-4 text-green-500" />;
      case 'csv':
        return <PieChart className="w-4 h-4 text-blue-500" />;
      case 'html':
        return <FileText className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredTemplates = templates.filter(template => {
    if (filters.category && template.category !== filters.category) return false;
    if (filters.search && !template.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !template.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const filteredReports = generatedReports.filter(report => {
    if (filters.status && report.status !== filters.status) return false;
    if (filters.search && !report.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const categories = [
    { id: 'compliance', label: 'Compliance', icon: FileText },
    { id: 'quality', label: 'Quality', icon: BarChart3 },
    { id: 'financial', label: 'Financial', icon: PieChart },
    { id: 'operational', label: 'Operational', icon: TrendingUp },
    { id: 'staffing', label: 'Staffing', icon: Users },
    { id: 'custom', label: 'Custom', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
            <FileText className="w-6 h-6 text-[var(--accent)]" />
            <span>Automated Reports</span>
          </h2>
          <p className="text-muted">Generate and schedule comprehensive facility reports</p>
        </div>
        
        <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-[var(--muted)] p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'templates' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === 'reports' 
              ? "bg-white text-primary shadow-sm" 
              : "text-muted hover:text-primary"
          )}
        >
          Generated Reports ({generatedReports.length})
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
                placeholder="Search templates or reports..."
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
          
          {activeTab === 'reports' && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="generating">Generating</option>
                <option value="failed">Failed</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'templates' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(template.category)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{template.name}</h3>
                    <p className="text-sm text-muted">{template.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getFrequencyColor(template.frequency)
                  )}>
                    {template.frequency.replace('_', ' ')}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onEditTemplate(template.id)}
                      className="p-1 text-muted hover:text-primary transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTemplate(template.id)}
                      className="p-1 text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Sections</span>
                  <span className="font-medium text-primary">{template.sections.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Recipients</span>
                  <span className="font-medium text-primary">{template.recipients.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Format</span>
                  <span className="font-medium text-primary uppercase">{template.format}</span>
                </div>
                
                {template.lastGenerated && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Last Generated</span>
                    <span className="font-medium text-primary">
                      {new Date(template.lastGenerated).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {template.nextGeneration && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Next Generation</span>
                    <span className="font-medium text-primary">
                      {new Date(template.nextGeneration).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onGenerateReport(template.id)}
                    className="px-3 py-1 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                  <button
                    onClick={() => onScheduleReport(template.id, template.frequency)}
                    className="px-3 py-1 bg-[var(--muted)] text-primary text-sm rounded-lg hover:bg-[var(--muted)]/80 transition-colors flex items-center space-x-1"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Schedule</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    template.isActive ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <span className="text-xs text-muted">
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getFormatIcon(report.format)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{report.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted">
                      <span>{formatFileSize(report.size)}</span>
                      <span>{new Date(report.generatedAt).toLocaleString()}</span>
                      <span>Expires: {new Date(report.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getStatusColor(report.status)
                  )}>
                    {report.status}
                  </span>
                  
                  {report.status === 'completed' && (
                    <button
                      onClick={() => onDownloadReport(report.id)}
                      className="p-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDeleteReport(report.id)}
                    className="p-2 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {report.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{report.error}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {((activeTab === 'templates' && filteredTemplates.length === 0) || 
        (activeTab === 'reports' && filteredReports.length === 0)) && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No {activeTab} found</h3>
          <p className="text-muted">Try adjusting your filters or create a new template.</p>
        </div>
      )}
    </div>
  );
};

export default AutomatedReports;
