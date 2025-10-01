"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Prediction {
  id: string;
  type: 'risk' | 'opportunity' | 'trend' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  probability: number;
  recommendations: string[];
  dataPoints: {
    label: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  createdAt: string;
}

export interface PredictiveInsight {
  category: 'staffing' | 'compliance' | 'quality' | 'financial' | 'operational';
  predictions: Prediction[];
  overallRisk: number;
  opportunities: number;
  lastUpdated: string;
}

interface PredictiveAnalyticsProps {
  insights: PredictiveInsight[];
  onPredictionClick: (prediction: Prediction) => void;
  onRefresh: () => void;
}

const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  insights,
  onPredictionClick,
  onRefresh
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const getTypeIcon = (type: Prediction['type']) => {
    switch (type) {
      case 'risk':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'opportunity':
        return <Target className="w-5 h-5 text-green-500" />;
      case 'trend':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'anomaly':
        return <Activity className="w-5 h-5 text-orange-500" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: Prediction['impact']) => {
    switch (impact) {
      case 'low':
        return 'text-green-500 bg-green-100';
      case 'medium':
        return 'text-yellow-500 bg-yellow-100';
      case 'high':
        return 'text-orange-500 bg-orange-100';
      case 'critical':
        return 'text-red-500 bg-red-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getTimeframeColor = (timeframe: Prediction['timeframe']) => {
    switch (timeframe) {
      case 'immediate':
        return 'text-red-600 bg-red-50';
      case 'short_term':
        return 'text-orange-600 bg-orange-50';
      case 'medium_term':
        return 'text-yellow-600 bg-yellow-50';
      case 'long_term':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const filteredInsights = insights.filter(insight => 
    selectedCategory === 'all' || insight.category === selectedCategory
  );

  const allPredictions = filteredInsights.flatMap(insight => insight.predictions);
  
  const filteredPredictions = allPredictions.filter(prediction =>
    selectedTimeframe === 'all' || prediction.timeframe === selectedTimeframe
  );

  const categories = [
    { id: 'all', label: 'All Categories', icon: BarChart3 },
    { id: 'staffing', label: 'Staffing', icon: Users },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
    { id: 'quality', label: 'Quality', icon: Target },
    { id: 'financial', label: 'Financial', icon: PieChart },
    { id: 'operational', label: 'Operational', icon: Activity }
  ];

  const timeframes = [
    { id: 'all', label: 'All Timeframes' },
    { id: 'immediate', label: 'Immediate (0-7 days)' },
    { id: 'short_term', label: 'Short Term (1-4 weeks)' },
    { id: 'medium_term', label: 'Medium Term (1-3 months)' },
    { id: 'long_term', label: 'Long Term (3+ months)' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
            <Brain className="w-6 h-6 text-[var(--accent)]" />
            <span>Predictive Analytics</span>
          </h2>
          <p className="text-muted">AI-powered insights and predictions</p>
        </div>
        
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center space-x-2"
        >
          <Zap className="w-4 h-4" />
          <span>Refresh Predictions</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-primary">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-primary">Timeframe:</label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {timeframes.map(timeframe => (
              <option key={timeframe.id} value={timeframe.id}>
                {timeframe.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Total Predictions</h3>
            <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-bold text-primary">{filteredPredictions.length}</p>
        </div>
        
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">High Risk</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">
            {filteredPredictions.filter(p => p.impact === 'critical' || p.impact === 'high').length}
          </p>
        </div>
        
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Opportunities</h3>
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-500">
            {filteredPredictions.filter(p => p.type === 'opportunity').length}
          </p>
        </div>
        
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted">Avg Confidence</h3>
            <Brain className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {filteredPredictions.length > 0 
              ? Math.round(filteredPredictions.reduce((sum, p) => sum + p.confidence, 0) / filteredPredictions.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredPredictions.map((prediction) => (
            <motion.div
              key={prediction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onPredictionClick(prediction)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(prediction.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{prediction.title}</h3>
                    <p className="text-sm text-muted">{prediction.description}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getImpactColor(prediction.impact)
                  )}>
                    {prediction.impact}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getTimeframeColor(prediction.timeframe)
                  )}>
                    {prediction.timeframe.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Confidence</span>
                  <span className={cn("text-sm font-medium", getConfidenceColor(prediction.confidence))}>
                    {prediction.confidence}%
                  </span>
                </div>
                
                <div className="w-full bg-[var(--muted)] rounded-full h-2">
                  <div
                    className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${prediction.confidence}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Probability</span>
                  <span className="text-sm font-medium text-primary">
                    {prediction.probability}%
                  </span>
                </div>
                
                {prediction.recommendations.length > 0 && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <p className="text-sm font-medium text-primary mb-2">Key Recommendations:</p>
                    <ul className="space-y-1">
                      {prediction.recommendations.slice(0, 2).map((rec, index) => (
                        <li key={index} className="text-sm text-muted flex items-start space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPredictions.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Predictions Found</h3>
          <p className="text-muted">Try adjusting your filters or refresh the data.</p>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
