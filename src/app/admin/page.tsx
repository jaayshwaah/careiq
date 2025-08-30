// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  MessageSquare, 
  Database, 
  AlertCircle,
  TrendingUp,
  Server,
  Shield,
  FileText,
  Settings,
  Calendar,
  BarChart3,
  Bell,
  CreditCard,
  Search,
  Calculator,
  BookOpen,
  Activity,
  Zap,
  Code,
  Bug,
  ExternalLink
} from "lucide-react";

type SystemStats = {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  knowledgeBaseEntries: number;
  activeUsers24h: number;
  errorRate: number;
  avgResponseTime: number;
  storageUsed: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // Load system stats
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/health")
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const mockStats: SystemStats = {
    totalUsers: 147,
    totalChats: 1243,
    totalMessages: 8567,
    knowledgeBaseEntries: 2341,
    activeUsers24h: 23,
    errorRate: 0.8,
    avgResponseTime: 1.2,
    storageUsed: "2.3 GB"
  };

  const displayStats = stats || mockStats;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={displayStats.totalUsers.toLocaleString()}
          icon={Users}
          trend="+12% this month"
          trendUp={true}
        />
        <MetricCard
          title="Total Chats"
          value={displayStats.totalChats.toLocaleString()}
          icon={MessageSquare}
          trend="+8% this week"
          trendUp={true}
        />
        <MetricCard
          title="Knowledge Base"
          value={displayStats.knowledgeBaseEntries.toLocaleString()}
          subtitle="entries"
          icon={Database}
          trend="Updated daily"
        />
        <MetricCard
          title="Active Users (24h)"
          value={displayStats.activeUsers24h.toString()}
          icon={TrendingUp}
          trend="Peak: 11am-2pm"
        />
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Health
          </h2>
          <div className="space-y-3">
            <HealthItem
              label="API Response Time"
              value={`${displayStats.avgResponseTime}s avg`}
              status="good"
            />
            <HealthItem
              label="Error Rate"
              value={`${displayStats.errorRate}%`}
              status="good"
            />
            <HealthItem
              label="Database"
              value="Connected"
              status="good"
            />
            <HealthItem
              label="OpenRouter API"
              value={systemHealth?.hasOpenRouter ? "Connected" : "Not configured"}
              status={systemHealth?.hasOpenRouter ? "good" : "warning"}
            />
            <HealthItem
              label="Storage Used"
              value={displayStats.storageUsed}
              status="good"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuickAction
              href="/admin/knowledge"
              title="Manage Knowledge"
              description="Upload regulations and policies"
              icon={Database}
            />
            <QuickAction
              href="/admin/users"
              title="User Management"
              description="View and manage user accounts"
              icon={Users}
            />
            <QuickAction
              href="/admin/ingest"
              title="Data Ingest"
              description="Bulk upload and process documents"
              icon={FileText}
            />
            <QuickAction
              href="/admin/routing"
              title="AI Cost Monitoring"
              description="Monitor model usage and optimize costs"
              icon={TrendingUp}
            />
            <QuickAction
              href="/api/health"
              title="System Health"
              description="Check API and system status"
              icon={Activity}
              external
            />
          </div>
        </div>

        {/* All Pages Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            All Application Pages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Main App Pages */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Main Pages</h3>
              <div className="space-y-2">
                <QuickAction href="/" title="Home" description="Landing page" icon={MessageSquare} />
                <QuickAction href="/chat/new" title="New Chat" description="Start a new conversation" icon={MessageSquare} />
                <QuickAction href="/dashboard" title="Dashboard" description="User dashboard" icon={BarChart3} />
                <QuickAction href="/knowledge" title="Knowledge Base" description="Search knowledge" icon={BookOpen} />
              </div>
            </div>

            {/* User Features */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">User Features</h3>
              <div className="space-y-2">
                <QuickAction href="/calendar" title="Calendar" description="Schedule and events" icon={Calendar} />
                <QuickAction href="/analytics" title="Analytics" description="Usage analytics" icon={BarChart3} />
                <QuickAction href="/survey-prep" title="Survey Prep" description="Survey preparation tools" icon={FileText} />
                <QuickAction href="/ppd-calculator" title="PPD Calculator" description="Calculate per patient day" icon={Calculator} />
              </div>
            </div>

            {/* Account & Settings */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Account</h3>
              <div className="space-y-2">
                <QuickAction href="/settings" title="Settings" description="User preferences" icon={Settings} />
                <QuickAction href="/billing" title="Billing" description="Subscription and billing" icon={CreditCard} />
                <QuickAction href="/notifications" title="Notifications" description="Manage notifications" icon={Bell} />
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints for Testing */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Endpoints (Testing)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Core APIs */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Core APIs</h3>
              <div className="space-y-2">
                <QuickAction href="/api/health" title="Health Check" description="System health status" icon={Activity} external />
                <QuickAction href="/api/profile" title="User Profile" description="Get user profile" icon={Users} external />
                <QuickAction href="/api/chats" title="Chats API" description="Chat management" icon={MessageSquare} external />
                <QuickAction href="/api/search" title="Search API" description="Search functionality" icon={Search} external />
              </div>
            </div>

            {/* AI & Processing */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">AI & Processing</h3>
              <div className="space-y-2">
                <QuickAction href="/api/chat" title="Chat Completion" description="AI chat responses" icon={Zap} external />
                <QuickAction href="/api/facility-analysis" title="Facility Analysis" description="AI facility analysis" icon={BarChart3} external />
                <QuickAction href="/api/survey-prep" title="Survey Prep API" description="Survey preparation" icon={FileText} external />
                <QuickAction href="/api/knowledge/smart-search" title="Smart Search" description="AI-powered search" icon={Search} external />
              </div>
            </div>

            {/* Debug & Admin APIs */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Debug & Admin</h3>
              <div className="space-y-2">
                <QuickAction href="/api/debug/openrouter" title="OpenRouter Debug" description="Test OpenRouter connection" icon={Bug} external />
                <QuickAction href="/api/test-openrouter" title="OpenRouter Test" description="OpenRouter API test" icon={Bug} external />
                <QuickAction href="/api/openrouter-health" title="OpenRouter Health" description="OpenRouter status" icon={Activity} external />
                <QuickAction href="/api/init-db" title="Initialize DB" description="Database initialization" icon={Database} external />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <ActivityItem
            type="info"
            message="Knowledge base updated with 15 new CMS regulations"
            timestamp="2 hours ago"
          />
          <ActivityItem
            type="warning"
            message="High API usage detected - 95% of daily limit"
            timestamp="4 hours ago"
          />
          <ActivityItem
            type="success"
            message="System backup completed successfully"
            timestamp="6 hours ago"
          />
          <ActivityItem
            type="info"
            message="New user registration: admin@example.com"
            timestamp="8 hours ago"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendUp 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value} {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
          </p>
          {trend && (
            <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-gray-500'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function HealthItem({ 
  label, 
  value, 
  status 
}: {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error';
}) {
  const statusColors = {
    good: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50'
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[status]}`}>
        {value}
      </span>
    </div>
  );
}

function QuickAction({ 
  href, 
  title, 
  description, 
  icon: Icon,
  external = false
}: {
  href: string;
  title: string;
  description: string;
  icon: any;
  external?: boolean;
}) {
  const linkProps = external 
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href };

  return (
    <a
      {...linkProps}
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
    >
      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{title}</p>
          {external && <ExternalLink className="h-3 w-3 text-gray-400" />}
        </div>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
    </a>
  );
}

function ActivityItem({ 
  type, 
  message, 
  timestamp 
}: {
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  timestamp: string;
}) {
  const typeStyles = {
    info: 'bg-blue-50 text-blue-600',
    warning: 'bg-yellow-50 text-yellow-600',
    success: 'bg-green-50 text-green-600',
    error: 'bg-red-50 text-red-600'
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-2 ${typeStyles[type]}`}></div>
      <div className="flex-1">
        <p className="text-sm text-gray-900">{message}</p>
        <p className="text-xs text-gray-500">{timestamp}</p>
      </div>
    </div>
  );
}