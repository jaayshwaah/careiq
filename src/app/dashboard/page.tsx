"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, FileText, Calendar, Bell } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface MetricCard {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'chat' | 'training' | 'policy' | 'incident';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export default function FacilityDashboard() {
  const { isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      title: 'Compliance Score',
      value: '92%',
      change: '+2.1%',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Active Staff',
      value: 156,
      change: '+8',
      trend: 'up', 
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Pending Training',
      value: 23,
      change: '-5',
      trend: 'down',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Open Incidents',
      value: 3,
      change: '+1',
      trend: 'up',
      icon: AlertTriangle,
      color: 'text-red-600'
    }
  ]);

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'chat',
      title: 'Policy Review Chat',
      description: 'Discussed infection control updates with CareIQ',
      timestamp: '2 hours ago',
      user: 'Sarah Johnson'
    },
    {
      id: '2', 
      type: 'training',
      title: 'CNA Training Completed',
      description: '15 staff members completed mandatory training',
      timestamp: '4 hours ago',
      user: 'Training Department'
    },
    {
      id: '3',
      type: 'policy',
      title: 'Emergency Procedures Updated',
      description: 'Policy v2.1 approved and distributed',
      timestamp: '1 day ago',
      user: 'Admin Team'
    },
    {
      id: '4',
      type: 'incident',
      title: 'Fall Prevention Review',
      description: 'Incident investigation completed, recommendations implemented',
      timestamp: '2 days ago',
      user: 'Quality Assurance'
    }
  ]);

  const [upcomingDeadlines] = useState([
    { title: 'State Survey Window Opens', date: '2024-02-15', type: 'survey', priority: 'high' },
    { title: 'Fire Safety Training Due', date: '2024-02-10', type: 'training', priority: 'medium' },
    { title: 'MDS Coordinator Certification', date: '2024-02-20', type: 'certification', priority: 'high' },
    { title: 'Policy Review: Medication Management', date: '2024-02-12', type: 'policy', priority: 'medium' }
  ]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view the facility dashboard</p>
          <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Facility Dashboard</h1>
            <div className="flex items-center gap-3">
              <Link href="/notifications" className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Bell size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${metric.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="text-green-500" size={16} />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="text-red-500" size={16} />
                  ) : (
                    <div className="w-4 h-4 bg-gray-400 rounded-full" />
                  )}
                  <span className={`ml-2 text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.change} from last month
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const typeIcons = {
                      chat: '💬',
                      training: '🎓',
                      policy: '📋',
                      incident: '⚠️'
                    };
                    
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="text-2xl">{typeIcons[activity.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {activity.description}
                          </p>
                          <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{activity.timestamp}</span>
                            {activity.user && (
                              <>
                                <span>•</span>
                                <span>{activity.user}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {upcomingDeadlines.map((deadline, index) => {
                    const daysUntil = Math.ceil((new Date(deadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 7;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                            {deadline.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {daysUntil} days left • {deadline.type}
                          </p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          deadline.priority === 'high' ? 'bg-red-500' : 'bg-orange-500'
                        }`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Link href="/chat/new?message=Help me prepare for the upcoming state survey" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors">
                    <span className="text-blue-600 dark:text-blue-400">🎯</span>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Start Survey Prep</span>
                  </Link>
                  <Link href="/chat/new?message=Create a staff training plan for this month"
                        className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors">
                    <span className="text-green-600 dark:text-green-400">📚</span>
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Plan Training</span>
                  </Link>
                  <Link href="/chat/new?message=Review our current policies and suggest updates"
                        className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-colors">
                    <span className="text-purple-600 dark:text-purple-400">📋</span>
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Review Policies</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}