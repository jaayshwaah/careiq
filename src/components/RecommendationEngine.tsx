"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  BookOpen, 
  Target,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Filter,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'compliance' | 'efficiency' | 'quality' | 'cost_savings' | 'staffing' | 'technology';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  impact: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  confidence: number;
  source: 'ai_analysis' | 'best_practice' | 'regulatory' | 'peer_comparison';
  tags: string[];
  benefits: string[];
  requirements: string[];
  resources: {
    title: string;
    url: string;
    type: 'document' | 'video' | 'article' | 'template';
  }[];
  similarImplementations: {
    facility: string;
    results: string;
    timeframe: string;
  }[];
  createdAt: string;
  expiresAt?: string;
}

export interface RecommendationFilters {
  category?: string;
  priority?: string;
  impact?: string;
  effort?: string;
  source?: string;
  search?: string;
}

interface RecommendationEngineProps {
  recommendations: Recommendation[];
  onRecommendationClick: (recommendation: Recommendation) => void;
  onFeedback: (recommendationId: string, feedback: 'positive' | 'negative') => void;
  onDismiss: (recommendationId: string) => void;
  onApply: (recommendationId: string) => void;
}

const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  recommendations,
  onRecommendationClick,
  onFeedback,
  onDismiss,
  onApply
}) => {
  const [filters, setFilters] = useState<RecommendationFilters>({});
  const [sortBy, setSortBy] = useState<'relevance' | 'priority' | 'impact' | 'effort'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  const getCategoryIcon = (category: Recommendation['category']) => {
    switch (category) {
      case 'compliance':
        return <Shield className="w-5 h-5 text-blue-500" />;
      case 'efficiency':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'quality':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'cost_savings':
        return <DollarSign className="w-5 h-5 text-yellow-500" />;
      case 'staffing':
        return <Users className="w-5 h-5 text-orange-500" />;
      case 'technology':
        return <BookOpen className="w-5 h-5 text-indigo-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 bg-red-100';
      case 'high':
        return 'text-orange-500 bg-orange-100';
      case 'medium':
        return 'text-yellow-500 bg-yellow-100';
      case 'low':
        return 'text-green-500 bg-green-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getImpactColor = (impact: Recommendation['impact']) => {
    switch (impact) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getEffortColor = (effort: Recommendation['effort']) => {
    switch (effort) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSourceIcon = (source: Recommendation['source']) => {
    switch (source) {
      case 'ai_analysis':
        return <Lightbulb className="w-4 h-4" />;
      case 'best_practice':
        return <Star className="w-4 h-4" />;
      case 'regulatory':
        return <Shield className="w-4 h-4" />;
      case 'peer_comparison':
        return <Users className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.category && rec.category !== filters.category) return false;
    if (filters.priority && rec.priority !== filters.priority) return false;
    if (filters.impact && rec.impact !== filters.impact) return false;
    if (filters.effort && rec.effort !== filters.effort) return false;
    if (filters.source && rec.source !== filters.source) return false;
    if (filters.search && !rec.title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !rec.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'impact':
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      case 'effort':
        const effortOrder = { low: 1, medium: 2, high: 3 };
        return effortOrder[a.effort] - effortOrder[b.effort];
      default:
        return b.confidence - a.confidence;
    }
  });

  const categories = [
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'efficiency', label: 'Efficiency', icon: TrendingUp },
    { id: 'quality', label: 'Quality', icon: Target },
    { id: 'cost_savings', label: 'Cost Savings', icon: DollarSign },
    { id: 'staffing', label: 'Staffing', icon: Users },
    { id: 'technology', label: 'Technology', icon: BookOpen }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center space-x-2">
            <Lightbulb className="w-6 h-6 text-[var(--accent)]" />
            <span>Recommendation Engine</span>
          </h2>
          <p className="text-muted">AI-powered suggestions to improve your facility</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors"
          >
            {viewMode === 'grid' ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--card)] rounded-lg p-4 border border-[var(--border)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search recommendations..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
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
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Priority</label>
            <select
              value={filters.priority || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="relevance">Relevance</option>
              <option value="priority">Priority</option>
              <option value="impact">Impact</option>
              <option value="effort">Effort</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations Grid/List */}
      <div className={cn(
        "grid gap-6",
        viewMode === 'grid' ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        <AnimatePresence>
          {sortedRecommendations.map((recommendation) => (
            <motion.div
              key={recommendation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRecommendation(recommendation)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(recommendation.category)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{recommendation.title}</h3>
                    <p className="text-sm text-muted">{recommendation.description}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getPriorityColor(recommendation.priority)
                  )}>
                    {recommendation.priority}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getImpactColor(recommendation.impact)
                  )}>
                    {recommendation.impact} impact
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Confidence</span>
                  <span className="font-medium text-primary">{recommendation.confidence}%</span>
                </div>
                
                <div className="w-full bg-[var(--muted)] rounded-full h-2">
                  <div
                    className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${recommendation.confidence}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Effort</span>
                  <span className={cn("font-medium", getEffortColor(recommendation.effort))}>
                    {recommendation.effort}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Timeframe</span>
                  <span className="font-medium text-primary">{recommendation.timeframe}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Source</span>
                  <div className="flex items-center space-x-1">
                    {getSourceIcon(recommendation.source)}
                    <span className="text-xs text-muted capitalize">
                      {recommendation.source.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                {recommendation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recommendation.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-[var(--muted)] text-xs text-muted rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {recommendation.tags.length > 3 && (
                      <span className="px-2 py-1 bg-[var(--muted)] text-xs text-muted rounded">
                        +{recommendation.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeedback(recommendation.id, 'positive');
                    }}
                    className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeedback(recommendation.id, 'negative');
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(recommendation.id);
                    }}
                    className="px-3 py-1 text-sm text-muted hover:text-primary transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApply(recommendation.id);
                    }}
                    className="px-3 py-1 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sortedRecommendations.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Recommendations Found</h3>
          <p className="text-muted">Try adjusting your filters or check back later for new suggestions.</p>
        </div>
      )}
    </div>
  );
};

export default RecommendationEngine;
