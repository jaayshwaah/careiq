"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Calendar, 
  Download, 
  Share2, 
  Plus, 
  Filter, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Settings,
  Zap,
  Target,
  Users,
  Building2,
  ShoppingCart,
  CreditCard,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  X,
  Check,
  Save,
  Send,
  Bell,
  BellOff
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  report_type: string;
  template_config: any;
  chart_config: any;
  filters: any;
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  template_id: string;
  parameters: any;
  filters: any;
  chart_type: string;
  data: any;
  generated_at: string;
  template: {
    name: string;
    description: string;
    category: string;
  };
}

interface ReportData {
  summary: any;
  category_breakdown: any[];
  monthly_trends: any[];
  detailed_costs: any[];
  supplier_analysis: any;
}

export default function Reports() {
  const { isAuthenticated, user } = useAuth();
  const supabase = getBrowserSupabase();
  
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Current report state
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // Filters and parameters
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    category: '',
    cost_range_min: '',
    cost_range_max: ''
  });
  
  const [activeTab, setActiveTab] = useState<'templates' | 'saved' | 'subscriptions'>('templates');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadTemplates();
      loadSavedReports();
    }
  }, [isAuthenticated, user]);

  const loadTemplates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/reports?type=templates', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setTemplates(result.templates || []);
      } else {
        console.error('Failed to load report templates');
      }
    } catch (error) {
      console.error('Error loading report templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/reports?type=saved', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        setSavedReports(result.reports || []);
      } else {
        console.error('Failed to load saved reports');
      }
    } catch (error) {
      console.error('Error loading saved reports:', error);
    }
  };

  const generateReport = async (template: ReportTemplate, saveReport = false) => {
    try {
      setGenerating(template.id);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          template_id: template.id,
          parameters: {
            start_date: filters.start_date,
            end_date: filters.end_date
          },
          filters: {
            supplier_id: filters.supplier_id || null,
            category: filters.category || null,
            cost_range: {
              min: filters.cost_range_min || null,
              max: filters.cost_range_max || null
            }
          },
          chart_type: 'dashboard',
          save_report: saveReport
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setReportData(result.data);
        setSelectedTemplate(template);
        setShowReportModal(true);
        
        if (saveReport) {
          await loadSavedReports();
        }
      } else {
        const error = await response.json();
        console.error('Failed to generate report:', error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(null);
    }
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    return colors[index % colors.length];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSavedReports = savedReports.filter(report => 
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view reports</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive reporting and cost analysis for your facility
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Report
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'templates' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Report Templates
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'saved' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Saved Reports
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'subscriptions' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Subscriptions
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">From:</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">To:</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Report Templates */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.length === 0 ? (
              <div className="col-span-full p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No report templates found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No templates match your search criteria.
                </p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        {template.category === 'supply' && <Package className="h-6 w-6 text-blue-600" />}
                        {template.category === 'financial' && <DollarSign className="h-6 w-6 text-green-600" />}
                        {template.category === 'operational' && <Activity className="h-6 w-6 text-purple-600" />}
                        {template.category === 'compliance' && <CheckCircle className="h-6 w-6 text-orange-600" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {template.category} Report
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateReport(template)}
                      disabled={generating === template.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {generating === template.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <BarChart3 className="h-4 w-4" />
                      )}
                      Generate Report
                    </button>
                    
                    <button
                      onClick={() => generateReport(template, true)}
                      disabled={generating === template.id}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Saved Reports */}
        {activeTab === 'saved' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Saved Reports ({filteredSavedReports.length})
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSavedReports.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No saved reports</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Generate and save reports to see them here.
                  </p>
                </div>
              ) : (
                filteredSavedReports.map((report) => (
                  <div key={report.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {report.name}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-xs font-medium">
                            {report.template.category}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {report.description || report.template.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Generated: {new Date(report.generated_at).toLocaleDateString()}</span>
                          <span>Template: {report.template.name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            setReportData(report.data);
                            setSelectedTemplate(templates.find(t => t.id === report.template_id) || null);
                            setShowReportModal(true);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </button>
                        
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                          <Download className="h-4 w-4 text-gray-500" />
                        </button>
                        
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && reportData && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedTemplate.name}
                  </h2>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Summary Metrics */}
                {reportData.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {Object.entries(reportData.summary).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {key.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {typeof value === 'number' ? (
                            key.includes('cost') || key.includes('amount') ? formatCurrency(value) : formatNumber(value)
                          ) : (
                            value
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category Breakdown Chart */}
                {reportData.category_breakdown && reportData.category_breakdown.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Spending by Category
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reportData.category_breakdown.map((item: any, index: number) => (
                        <div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: getCategoryColor(index) }}
                            />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.total_cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Costs Table */}
                {reportData.detailed_costs && reportData.detailed_costs.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Detailed Cost Analysis
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Supplier
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Unit Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Total Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Trend
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {reportData.detailed_costs.slice(0, 10).map((item: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {item.product_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {item.supplier_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatNumber(item.total_quantity)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(item.avg_unit_cost)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(item.total_cost)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(item.trend_direction)}
                                  <span className="capitalize">{item.trend_direction}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
