"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalyticsMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
  format: 'number' | 'percentage' | 'currency' | 'duration';
  category: 'performance' | 'compliance' | 'staffing' | 'financial' | 'quality';
}

export interface AnalyticsData {
  metrics: AnalyticsMetric[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  lastUpdated: string;
  facilityId: string;
}

interface AdvancedAnalyticsProps {
  data: AnalyticsData;
  onTimeRangeChange: (range: AnalyticsData['timeRange']) => void;
  onRefresh: () => void;
  onExport: (format: 'csv' | 'pdf' | 'excel') => void;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  data,
  onTimeRangeChange,
  onRefresh,
  onExport
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [showTrends, setShowTrends] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatValue = (value: number | string, format: AnalyticsMetric['format']) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${Math.floor(value / 60)}h ${value % 60}m`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeIcon = (changeType: AnalyticsMetric['changeType']) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: AnalyticsMetric['category']) => {
    switch (category) {
      case 'performance':
        return 'bg-blue-500';
      case 'compliance':
        return 'bg-green-500';
      case 'staffing':
        return 'bg-purple-500';
      case 'financial':
        return 'bg-yellow-500';
      case 'quality':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    onExport(format);
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const filteredMetrics = selectedMetrics.length > 0 
    ? data.metrics.filter(metric => selectedMetrics.includes(metric.id))
    : data.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Advanced Analytics</h2>
          <p className="text-muted">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={data.timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as AnalyticsData['timeRange'])}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
          
          <div className="relative">
            <button className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[var(--border)] z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 hover:bg-[var(--muted)] text-sm"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 hover:bg-[var(--muted)] text-sm"
              >
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 hover:bg-[var(--muted)] text-sm"
              >
                Export as Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.metrics.slice(0, 4).map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", getCategoryColor(metric.category))}>
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center space-x-1">
                {getChangeIcon(metric.changeType)}
                <span className={cn(
                  "text-sm font-medium",
                  metric.changeType === 'increase' ? "text-green-500" : 
                  metric.changeType === 'decrease' ? "text-red-500" : "text-gray-500"
                )}>
                  {Math.abs(metric.change).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <h3 className="text-sm font-medium text-muted mb-1">{metric.title}</h3>
            <p className="text-2xl font-bold text-primary">
              {formatValue(metric.value, metric.format)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMetrics.map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getCategoryColor(metric.category))}>
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{metric.title}</h3>
                  <p className="text-sm text-muted capitalize">{metric.category}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleMetric(metric.id)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedMetrics.includes(metric.id) 
                      ? "bg-[var(--accent)] text-white" 
                      : "bg-[var(--muted)] text-primary hover:bg-[var(--muted)]/80"
                  )}
                >
                  {selectedMetrics.includes(metric.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-primary">
                  {formatValue(metric.value, metric.format)}
                </span>
                <div className="flex items-center space-x-2">
                  {getChangeIcon(metric.changeType)}
                  <span className={cn(
                    "text-sm font-medium",
                    metric.changeType === 'increase' ? "text-green-500" : 
                    metric.changeType === 'decrease' ? "text-red-500" : "text-gray-500"
                  )}>
                    {metric.changeType === 'increase' ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {showTrends && metric.trend.length > 0 && (
                <div className="h-20 bg-[var(--muted)] rounded-lg p-2">
                  <div className="flex items-end justify-between h-full space-x-1">
                    {metric.trend.map((value, index) => (
                      <div
                        key={index}
                        className="bg-[var(--accent)] rounded-t"
                        style={{
                          height: `${(value / Math.max(...metric.trend)) * 100}%`,
                          width: `${100 / metric.trend.length}%`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
