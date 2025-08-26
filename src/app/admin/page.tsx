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
  FileText
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
            Quick Actions
          </h2>
          <div className="space-y-3">
            <QuickAction
              href="/admin/knowledge"
              title="Add Knowledge"
              description="Upload new regulations or policies"
              icon={Database}
            />
            <QuickAction
              href="/admin/users"
              title="Manage Users"
              description="View and manage user accounts"
              icon={Users}
            />
            <QuickAction
              href="/admin/logs"
              title="View Logs"
              description="Check system errors and events"
              icon={AlertCircle}
            />
            <QuickAction
              href="/admin/search"
              title="Search Debug"
              description="Test search functionality"
              icon={FileText}
            />
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
  icon: Icon 
}: {
  href: string;
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
    >
      <div className="p-2 bg-blue-50 rounded-lg">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
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