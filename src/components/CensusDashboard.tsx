"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Bed,
  CalendarDays,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
// Import recharts dynamically to avoid build issues
let LineChart: any, Line: any, XAxis: any, YAxis: any, CartesianGrid: any, Tooltip: any, ResponsiveContainer: any, BarChart: any, Bar: any;
try {
  const recharts = require('recharts');
  ({ LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } = recharts);
} catch (e) {
  // Recharts not available, will show placeholder
}

interface CensusSnapshot {
  id: string;
  date: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  admission_count: number;
  discharge_count: number;
  private_pay_count: number;
  medicare_count: number;
  medicaid_count: number;
  insurance_count: number;
  source: string;
  sync_status: string;
}

interface SyncLog {
  id: string;
  sync_date: string;
  status: string;
  records_synced: number;
  error_message?: string;
  created_at: string;
}

interface CensusData {
  censusData: CensusSnapshot[];
  syncLogs: SyncLog[];
  lastSync: string | null;
}

export default function CensusDashboard() {
  const [data, setData] = useState<CensusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCensusData();
  }, []);

  const loadCensusData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/census/sync', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load census data');
      }

      const censusData = await response.json();
      setData(censusData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/census/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to sync census data');
      }

      const result = await response.json();
      if (result.success) {
        await loadCensusData(); // Reload data
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const latestSnapshot = data?.censusData?.[0];
  const chartData = data?.censusData
    ?.slice()
    ?.reverse()
    ?.map(snapshot => ({
      date: new Date(snapshot.date).toLocaleDateString(),
      occupancyRate: snapshot.occupancy_rate,
      occupiedBeds: snapshot.occupied_beds,
      totalBeds: snapshot.total_beds,
      admissions: snapshot.admission_count,
      discharges: snapshot.discharge_count
    })) || [];

  const payerMixData = latestSnapshot ? [
    { name: 'Medicare', value: latestSnapshot.medicare_count, color: '#3b82f6' },
    { name: 'Medicaid', value: latestSnapshot.medicaid_count, color: '#10b981' },
    { name: 'Private Pay', value: latestSnapshot.private_pay_count, color: '#f59e0b' },
    { name: 'Insurance', value: latestSnapshot.insurance_count, color: '#8b5cf6' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Census Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time facility occupancy and resident data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Occupancy"
          value={`${latestSnapshot?.occupied_beds || 0}/${latestSnapshot?.total_beds || 0}`}
          subtitle={`${latestSnapshot?.occupancy_rate?.toFixed(1) || 0}% occupied`}
          icon={Bed}
          trend={getOccupancyTrend(data?.censusData || [])}
        />
        <MetricCard
          title="Available Beds"
          value={latestSnapshot?.available_beds?.toString() || '0'}
          subtitle="Ready for admission"
          icon={Users}
          color="green"
        />
        <MetricCard
          title="Today's Admissions"
          value={latestSnapshot?.admission_count?.toString() || '0'}
          subtitle="New residents"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Today's Discharges"
          value={latestSnapshot?.discharge_count?.toString() || '0'}
          subtitle="Residents discharged"
          icon={TrendingDown}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Occupancy Trend (30 Days)</h3>
          <div className="h-64">
            {ResponsiveContainer ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="occupancyRate" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Occupancy Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-gray-500 dark:text-gray-400">Chart loading...</p>
              </div>
            )}
          </div>
        </div>

        {/* Payer Mix */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Payer Mix</h3>
          <div className="h-64">
            {ResponsiveContainer ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payerMixData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-gray-500 dark:text-gray-400">Chart loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admission/Discharge Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Daily Admissions & Discharges</h3>
        <div className="h-64">
          {ResponsiveContainer ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="admissions" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Admissions"
                />
                <Line 
                  type="monotone" 
                  dataKey="discharges" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Discharges"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-gray-500 dark:text-gray-400">Chart loading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Sync Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Sync Status</h3>
        <div className="space-y-3">
          {data?.lastSync && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                Last sync: {new Date(data.lastSync).toLocaleString()}
              </span>
            </div>
          )}
          
          {data?.syncLogs?.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-3">
                {log.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm text-gray-900 dark:text-white">
                  {new Date(log.sync_date).toLocaleDateString()}
                </span>
                <span className="text-xs text-gray-500">
                  {log.records_synced} records
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                log.status === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {log.status}
              </span>
            </div>
          ))}
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
  color = 'blue' 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600 mr-1" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600 mr-1" />}
          {trend === 'neutral' && <Activity className="h-4 w-4 text-gray-600 mr-1" />}
          <span className={`text-sm ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
          </span>
        </div>
      )}
    </div>
  );
}

function getOccupancyTrend(snapshots: CensusSnapshot[]): 'up' | 'down' | 'neutral' {
  if (snapshots.length < 2) return 'neutral';
  
  const recent = snapshots[0]?.occupancy_rate || 0;
  const previous = snapshots[1]?.occupancy_rate || 0;
  
  if (recent > previous + 2) return 'up';
  if (recent < previous - 2) return 'down';
  return 'neutral';
}