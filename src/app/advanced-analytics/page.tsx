"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Shield, 
  DollarSign, 
  Package,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Target,
  Activity,
  Zap,
  Database,
  Clock
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface AnalyticsData {
  summary: any;
  trends: any;
  charts: any[];
  insights: string[];
  kpis: any;
}

interface ChartData {
  type: string;
  title: string;
  data: any[];
  xAxis: string;
  yAxis: string;
}

export default function AdvancedAnalyticsPage() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'census', 'staffing', 'quality', 'financial', 'supply', 'tasks'
  ]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([
    'time', 'department', 'category'
  ]);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedMetrics, selectedDimensions, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/analytics/advanced-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: user?.facility_id || 'facility-001',
          date_range: dateRange,
          metrics: selectedMetrics,
          dimensions: selectedDimensions
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      } else {
        console.error('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricOptions = [
    { value: 'census', label: 'Census & Occupancy', icon: Users },
    { value: 'staffing', label: 'Staffing', icon: Users },
    { value: 'quality', label: 'Quality Metrics', icon: Shield },
    { value: 'financial', label: 'Financial', icon: DollarSign },
    { value: 'supply', label: 'Supply Chain', icon: Package },
    { value: 'tasks', label: 'Task Management', icon: CheckSquare }
  ];

  const dimensionOptions = [
    { value: 'time', label: 'Time Series' },
    { value: 'department', label: 'Department' },
    { value: 'category', label: 'Category' },
    { value: 'priority', label: 'Priority' }
  ];

  const renderKPICard = (title: string, value: any, icon: React.ComponentType, color: string) => {
    const Icon = icon;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (chart: ChartData) => {
    // This would render actual charts using a charting library like Chart.js or Recharts
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{chart.title}</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              {chart.type === 'line' ? 'Line Chart' : chart.type === 'bar' ? 'Bar Chart' : 'Chart'} 
              <br />
              <span className="text-sm">({chart.data?.length || 0} data points)</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Comprehensive insights and performance metrics for your facility
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadAnalyticsData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Metrics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metrics
              </label>
              <div className="space-y-2">
                {metricOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMetrics(prev => [...prev, option.value]);
                          } else {
                            setSelectedMetrics(prev => prev.filter(m => m !== option.value));
                          }
                        }}
                        className="mr-2"
                      />
                      <Icon className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dimensions
              </label>
              <div className="space-y-2">
                {dimensionOptions.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedDimensions.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDimensions(prev => [...prev, option.value]);
                        } else {
                          setSelectedDimensions(prev => prev.filter(d => d !== option.value));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Actions
              </label>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  <Target className="h-4 w-4 inline mr-2" />
                  Set Targets
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                  <Activity className="h-4 w-4 inline mr-2" />
                  Benchmark
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                  <Zap className="h-4 w-4 inline mr-2" />
                  Optimize
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {analyticsData?.kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {renderKPICard(
              'Overall Facility Score',
              analyticsData.kpis.facility_score || 0,
              Target,
              'bg-blue-500'
            )}
            {renderKPICard(
              'Occupancy Rate',
              analyticsData.kpis.occupancy_rate || 0,
              Users,
              'bg-green-500'
            )}
            {renderKPICard(
              'Quality Score',
              analyticsData.kpis.quality_score || 0,
              Shield,
              'bg-purple-500'
            )}
            {renderKPICard(
              'Task Completion',
              analyticsData.kpis.task_completion_rate || 0,
              CheckSquare,
              'bg-orange-500'
            )}
          </div>
        )}

        {/* Charts */}
        {analyticsData?.charts && analyticsData.charts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {analyticsData.charts.map((chart, index) => (
              <div key={index}>
                {renderChart(chart)}
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {analyticsData?.insights && analyticsData.insights.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Key Insights
            </h3>
            <div className="space-y-3">
              {analyticsData.insights.map((insight, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-700 dark:text-gray-300">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {analyticsData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(analyticsData.summary).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">
                  {key.replace('_', ' ')}
                </h3>
                <div className="space-y-2">
                  {typeof value === 'object' && value !== null ? (
                    Object.entries(value).map(([subKey, subValue]: [string, any]) => (
                      <div key={subKey} className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {subKey.replace('_', ' ')}:
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {typeof subValue === 'number' ? subValue.toFixed(1) : subValue}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Value:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {typeof value === 'number' ? value.toFixed(1) : value}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
