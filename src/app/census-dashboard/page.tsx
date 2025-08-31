"use client";

import { useState, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Users, BedDouble, DollarSign, AlertTriangle, Calendar, Download, RefreshCw } from 'lucide-react';

interface CensusSnapshot {
  id: string;
  date: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  admission_count: number;
  discharge_count: number;
  skilled_nursing_beds: number;
  memory_care_beds: number;
  assisted_living_beds: number;
  private_pay_count: number;
  medicare_count: number;
  medicaid_count: number;
  insurance_count: number;
}

interface CensusTrend {
  id: string;
  month: string;
  avg_occupancy_rate: number;
  max_occupancy_rate: number;
  min_occupancy_rate: number;
  total_admissions: number;
  total_discharges: number;
  avg_length_of_stay: number;
}

interface CensusMetrics {
  currentOccupancy: number;
  occupancyTrend: 'up' | 'down' | 'stable';
  totalRevenue: number;
  revenueProjection: number;
  avgLengthOfStay: number;
  admissionRate: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function CensusDashboard() {
  const [snapshots, setSnapshots] = useState<CensusSnapshot[]>([]);
  const [trends, setTrends] = useState<CensusTrend[]>([]);
  const [metrics, setMetrics] = useState<CensusMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [error, setError] = useState<string | null>(null);

  const supabase = getBrowserSupabase();

  const loadCensusData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get date filter
      const startDate = new Date();
      if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);
      else startDate.setFullYear(startDate.getFullYear() - 1);

      // Load census snapshots
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('census_snapshots')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (snapshotError) throw snapshotError;

      // Load census trends
      const { data: trendData, error: trendError } = await supabase
        .from('census_trends')
        .select('*')
        .gte('month', startDate.toISOString().slice(0, 7))
        .order('month', { ascending: true });

      if (trendError) throw trendError;

      setSnapshots(snapshotData || []);
      setTrends(trendData || []);

      // Calculate metrics
      if (snapshotData && snapshotData.length > 0) {
        const latest = snapshotData[snapshotData.length - 1];
        const previous = snapshotData.length > 1 ? snapshotData[snapshotData.length - 2] : latest;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (latest.occupancy_rate > previous.occupancy_rate + 2) trend = 'up';
        else if (latest.occupancy_rate < previous.occupancy_rate - 2) trend = 'down';

        // Simple revenue calculation (you can adjust rates)
        const dailyRates = {
          medicare: 450,
          medicaid: 320,
          private_pay: 380,
          insurance: 400
        };

        const dailyRevenue = 
          (latest.medicare_count * dailyRates.medicare) +
          (latest.medicaid_count * dailyRates.medicaid) +
          (latest.private_pay_count * dailyRates.private_pay) +
          (latest.insurance_count * dailyRates.insurance);

        const monthlyRevenue = dailyRevenue * 30;
        const projectedRevenue = (dailyRevenue * latest.total_beds / latest.occupied_beds) * 30;

        setMetrics({
          currentOccupancy: latest.occupancy_rate,
          occupancyTrend: trend,
          totalRevenue: monthlyRevenue,
          revenueProjection: projectedRevenue,
          avgLengthOfStay: trendData?.[trendData.length - 1]?.avg_length_of_stay || 0,
          admissionRate: latest.admission_count
        });
      }

    } catch (err) {
      console.error('Error loading census data:', err);
      setError('Failed to load census data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCensusData();
  }, [dateRange]);

  // Prepare chart data
  const occupancyChartData = snapshots.map(s => ({
    date: new Date(s.date).toLocaleDateString(),
    occupancy: s.occupancy_rate,
    occupied: s.occupied_beds,
    available: s.available_beds
  }));

  const payerMixData = snapshots.length > 0 ? [
    { name: 'Medicare', value: snapshots[snapshots.length - 1].medicare_count, color: '#0088FE' },
    { name: 'Medicaid', value: snapshots[snapshots.length - 1].medicaid_count, color: '#00C49F' },
    { name: 'Private Pay', value: snapshots[snapshots.length - 1].private_pay_count, color: '#FFBB28' },
    { name: 'Insurance', value: snapshots[snapshots.length - 1].insurance_count, color: '#FF8042' }
  ] : [];

  const admissionTrendData = snapshots.map(s => ({
    date: new Date(s.date).toLocaleDateString(),
    admissions: s.admission_count,
    discharges: s.discharge_count
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading census data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadCensusData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Census Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time occupancy analytics and revenue insights
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <button
              onClick={loadCensusData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Occupancy</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics.currentOccupancy.toFixed(1)}%
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  metrics.occupancyTrend === 'up' ? 'bg-green-100 text-green-600' :
                  metrics.occupancyTrend === 'down' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {metrics.occupancyTrend === 'up' ? <TrendingUp className="h-6 w-6" /> :
                   metrics.occupancyTrend === 'down' ? <TrendingDown className="h-6 w-6" /> :
                   <Users className="h-6 w-6" />}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${(metrics.totalRevenue / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Length of Stay</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics.avgLengthOfStay.toFixed(1)} days
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent Admissions</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics.admissionRate}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <BedDouble className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Occupancy Trend Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Occupancy Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={occupancyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#0088FE" 
                  fill="#0088FE" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payer Mix Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Current Payer Mix
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={payerMixData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {payerMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Admission/Discharge Trends */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Admission & Discharge Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={admissionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="admissions" 
                stroke="#00C49F" 
                strokeWidth={2}
                name="Admissions"
              />
              <Line 
                type="monotone" 
                dataKey="discharges" 
                stroke="#FF8042" 
                strokeWidth={2}
                name="Discharges"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Projections */}
        {metrics && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Revenue Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Monthly</p>
                <p className="text-2xl font-bold text-green-600">
                  ${metrics.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Full Occupancy Potential</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${metrics.revenueProjection.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Opportunity</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${(metrics.revenueProjection - metrics.totalRevenue).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}