"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  FileText, 
  Shield,
  BarChart3,
  Calendar,
  Package,
  Zap,
  ExternalLink,
  RefreshCw,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  action?: () => void;
  href?: string;
}

interface RoleDashboard {
  widgets: DashboardWidget[];
  quickActions: QuickAction[];
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  color: string;
}

const EnhancedHomePage: React.FC = () => {
  const { userProfile, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today');

  // Role-based dashboard configurations
  const getDashboardConfig = (role: string): RoleDashboard => {
    const baseWidgets: DashboardWidget[] = [
      {
        id: 'census',
        title: 'Current Census',
        description: 'Total occupied beds',
        value: '120/150',
        change: '+5 from yesterday',
        trend: 'up',
        icon: Users,
        color: 'var(--info)',
        href: '/census'
      },
      {
        id: 'ppd',
        title: 'PPD Compliance',
        description: 'Per-patient-day staffing',
        value: '1.125',
        change: 'Compliant',
        trend: 'up',
        icon: Activity,
        color: 'var(--ok)',
        href: '/ppd-calculator'
      }
    ];

    const baseQuickActions: QuickAction[] = [
      {
        id: 'new-chat',
        title: 'Start New Chat',
        description: 'AI-powered conversation',
        icon: Plus,
        href: '/chat/new',
        color: 'var(--accent)'
      },
      {
        id: 'daily-rounds',
        title: 'Daily Rounds',
        description: 'Digital rounding process',
        icon: FileText,
        href: '/daily-ops',
        color: 'var(--info)'
      }
    ];

    switch (role) {
      case 'administrator':
        return {
          widgets: [
            ...baseWidgets,
            {
              id: 'open-surveys',
              title: 'Open Surveys',
              description: 'CMS survey status',
              value: '2',
              change: '1 overdue',
              trend: 'down',
              icon: Shield,
              color: 'var(--warn)',
              href: '/compliance'
            },
            {
              id: 'integration-health',
              title: 'Integration Health',
              description: 'External system status',
              value: '95%',
              change: 'All systems operational',
              trend: 'up',
              icon: ExternalLink,
              color: 'var(--ok)',
              href: '/integrations'
            },
            {
              id: 'risk-alerts',
              title: 'Risk Alerts',
              description: 'High-priority issues',
              value: '3',
              change: '2 resolved this week',
              trend: 'down',
              icon: AlertTriangle,
              color: 'var(--err)',
              href: '/analytics'
            },
            {
              id: 'overdue-tasks',
              title: 'Overdue Tasks',
              description: 'Tasks requiring attention',
              value: '7',
              change: '3 completed today',
              trend: 'down',
              icon: Clock,
              color: 'var(--warn)',
              href: '/task-management'
            }
          ],
          quickActions: [
            ...baseQuickActions,
            {
              id: 'user-management',
              title: 'Manage Users',
              description: 'User accounts and roles',
              icon: Users,
              href: '/admin/users',
              color: 'var(--accent)'
            },
            {
              id: 'facility-settings',
              title: 'Facility Settings',
              description: 'Configure facility options',
              icon: Shield,
              href: '/admin/facilities',
              color: 'var(--info)'
            }
          ]
        };

      case 'director_of_nursing':
        return {
          widgets: [
            ...baseWidgets,
            {
              id: 'staffing-compliance',
              title: 'Staffing Compliance',
              description: 'RN supervision status',
              value: '98%',
              change: 'Above target',
              trend: 'up',
              icon: Users,
              color: 'var(--ok)',
              href: '/analytics'
            },
            {
              id: 'incidents-review',
              title: 'Incidents to Review',
              description: 'Pending incident reports',
              value: '4',
              change: '2 completed today',
              trend: 'down',
              icon: FileText,
              color: 'var(--warn)',
              href: '/daily-ops'
            },
            {
              id: 'care-plans-due',
              title: 'Care Plans Due',
              description: 'Updates required',
              value: '12',
              change: '5 updated this week',
              trend: 'down',
              icon: FileText,
              color: 'var(--info)',
              href: '/care-plans'
            },
            {
              id: 'f-tag-watchlist',
              title: 'F-Tag Watchlist',
              description: 'Areas of concern',
              value: '3',
              change: 'F684, F686, F725',
              trend: 'neutral',
              icon: Shield,
              color: 'var(--warn)',
              href: '/compliance'
            }
          ],
          quickActions: [
            ...baseQuickActions,
            {
              id: 'survey-prep',
              title: 'Survey Preparation',
              description: 'Mock survey and readiness',
              icon: Shield,
              href: '/survey-prep',
              color: 'var(--warn)'
            },
            {
              id: 'quality-reports',
              title: 'Quality Reports',
              description: 'Performance analytics',
              icon: BarChart3,
              href: '/analytics',
              color: 'var(--info)'
            }
          ]
        };

      case 'unit_manager':
        return {
          widgets: [
            ...baseWidgets,
            {
              id: 'todays-rounds',
              title: "Today's Rounds",
              description: 'Completed vs total',
              value: '8/12',
              change: '4 remaining',
              trend: 'neutral',
              icon: FileText,
              color: 'var(--info)',
              href: '/daily-ops'
            },
            {
              id: 'staff-assignments',
              title: 'Staff Assignments',
              description: 'Current shift coverage',
              value: '100%',
              change: 'All positions filled',
              trend: 'up',
              icon: Users,
              color: 'var(--ok)',
              href: '/daily-ops'
            },
            {
              id: 'incidents-today',
              title: 'Incidents Today',
              description: 'New incident reports',
              value: '2',
              change: '1 resolved',
              trend: 'down',
              icon: AlertTriangle,
              color: 'var(--warn)',
              href: '/daily-ops'
            },
 {
              id: 'expiring-orders',
              title: 'Expiring Orders',
              description: 'Orders expiring soon',
              value: '5',
              change: '2 renewed today',
              trend: 'down',
              icon: Clock,
              color: 'var(--warn)',
              href: '/care-plans'
            }
          ],
          quickActions: [
            ...baseQuickActions,
            {
              id: 'start-rounds',
              title: 'Start Rounds',
              description: 'Begin digital rounding',
              icon: FileText,
              href: '/daily-ops?action=round',
              color: 'var(--accent)'
            },
            {
              id: 'incident-report',
              title: 'Report Incident',
              description: 'Create incident report',
              icon: AlertTriangle,
              href: '/daily-ops?action=incident',
              color: 'var(--warn)'
            }
          ]
        };

      default: // Staff
        return {
          widgets: [
            {
              id: 'my-tasks',
              title: 'My Tasks',
              description: 'Assigned to me',
              value: '5',
              change: '2 completed today',
              trend: 'down',
              icon: CheckCircle,
              color: 'var(--info)',
              href: '/task-management'
            },
            {
              id: 'quick-links',
              title: 'Quick Access',
              description: 'Most used tools',
              value: '8',
              change: 'Available tools',
              trend: 'neutral',
              icon: Zap,
              color: 'var(--accent)',
              href: '/'
            }
          ],
          quickActions: [
            ...baseQuickActions,
            {
              id: 'supply-request',
              title: 'Supply Request',
              description: 'Request supplies',
              icon: Package,
              href: '/supply',
              color: 'var(--info)'
            },
            {
              id: 'training',
              title: 'Training',
              description: 'Complete training modules',
              icon: Shield,
              href: '/mock-survey-training',
              color: 'var(--accent)'
            }
          ]
        };
    }
  };

  const dashboardConfig = getDashboardConfig(userProfile?.role || 'staff');

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 1000);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} className="status-ok" />;
      case 'down':
        return <TrendingUp size={16} className="status-error rotate-180" />;
      default:
        return <Activity size={16} className="text-muted" />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Welcome back, {userProfile?.full_name || 'User'}
            </h1>
            <p className="text-muted mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock size={16} />
              <span>Last updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
            <Button
              onClick={handleRefresh}
              loading={loading}
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Time Range Filter */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="text-sm font-medium text-primary">Time Range:</span>
          <div className="flex gap-1">
            {(['today', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range === 'today' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Widgets Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimatePresence>
            {dashboardConfig.widgets.map((widget, index) => (
              <motion.div
                key={widget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  variant="glass"
                  interactive
                  className="h-full cursor-pointer"
                  onClick={() => widget.href && (window.location.href = widget.href)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-[var(--radius-md)]"
                          style={{ backgroundColor: `${widget.color}20` }}
                        >
                          <widget.icon 
                            size={20} 
                            style={{ color: widget.color }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{widget.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {widget.description}
                          </CardDescription>
                        </div>
                      </div>
                      {widget.trend && getTrendIcon(widget.trend)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-primary">
                        {widget.value}
                      </div>
                      {widget.change && (
                        <div className="text-sm text-muted">
                          {widget.change}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-primary">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashboardConfig.quickActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  variant="glass"
                  interactive
                  className="h-full cursor-pointer"
                  onClick={() => window.location.href = action.href}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-3 rounded-[var(--radius-md)]"
                        style={{ backgroundColor: `${action.color}20` }}
                      >
                        <action.icon 
                          size={24} 
                          style={{ color: action.color }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedHomePage;
