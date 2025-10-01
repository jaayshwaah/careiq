// Advanced Analytics Dashboard API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

interface AdvancedAnalyticsRequest {
  facility_id?: string;
  date_range: {
    start_date: string;
    end_date: string;
  };
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.DEFAULT);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      facility_id,
      date_range,
      metrics,
      dimensions,
      filters
    }: AdvancedAnalyticsRequest = await req.json();

    if (!date_range || !metrics || !dimensions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate comprehensive analytics
    const analyticsData = await generateAdvancedAnalytics({
      facility_id,
      date_range,
      metrics,
      dimensions,
      filters,
      supa
    });

    return NextResponse.json({
      analytics: analyticsData,
      generated_at: new Date().toISOString(),
      message: "Advanced analytics generated successfully"
    });

  } catch (error: any) {
    console.error('Advanced analytics error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function generateAdvancedAnalytics({
  facility_id,
  date_range,
  metrics,
  dimensions,
  filters,
  supa
}: {
  facility_id?: string;
  date_range: any;
  metrics: string[];
  dimensions: string[];
  filters?: any;
  supa: any;
}) {
  const analyticsData: any = {
    summary: {},
    trends: {},
    comparisons: {},
    predictions: {},
    insights: [],
    charts: [],
    kpis: {}
  };

  try {
    // 1. Census Analytics
    if (metrics.includes('census') || metrics.includes('occupancy')) {
      const censusData = await getCensusAnalytics({
        facility_id,
        date_range,
        supa
      });
      analyticsData.summary.census = censusData.summary;
      analyticsData.trends.census = censusData.trends;
      analyticsData.charts.push(...censusData.charts);
    }

    // 2. Staffing Analytics
    if (metrics.includes('staffing') || metrics.includes('productivity')) {
      const staffingData = await getStaffingAnalytics({
        facility_id,
        date_range,
        supa
      });
      analyticsData.summary.staffing = staffingData.summary;
      analyticsData.trends.staffing = staffingData.trends;
      analyticsData.charts.push(...staffingData.charts);
    }

    // 3. Quality Metrics Analytics
    if (metrics.includes('quality') || metrics.includes('compliance')) {
      const qualityData = await getQualityAnalytics({
        facility_id,
        date_range,
        supa
      });
      analyticsData.summary.quality = qualityData.summary;
      analyticsData.trends.quality = qualityData.trends;
      analyticsData.charts.push(...qualityData.charts);
    }

    // 4. Financial Analytics
    if (metrics.includes('financial') || metrics.includes('costs')) {
      const financialData = await getFinancialAnalytics({
        facility_id,
        date_range,
        supa
      });
      analyticsData.summary.financial = financialData.summary;
      analyticsData.trends.financial = financialData.trends;
      analyticsData.charts.push(...financialData.charts);
    }

    // 5. Supply Chain Analytics
    if (metrics.includes('supply') || metrics.includes('inventory')) {
      const supplyData = await getSupplyAnalytics({
        facility_id,
        date_range,
        supa
      });
      analyticsData.summary.supply = supplyData.summary;
      analyticsData.trends.supply = supplyData.trends;
      analyticsData.charts.push(...supplyData.charts);
    }

    // 6. Task Management Analytics
    if (metrics.includes('tasks') || metrics.includes('workflow')) {
      const taskData = await getTaskAnalytics({
        facility_id,
        date_range,
        supa
      });
      analyticsData.summary.tasks = taskData.summary;
      analyticsData.trends.tasks = taskData.trends;
      analyticsData.charts.push(...taskData.charts);
    }

    // 7. Generate Insights
    analyticsData.insights = await generateInsights(analyticsData);

    // 8. Calculate KPIs
    analyticsData.kpis = await calculateKPIs(analyticsData);

    return analyticsData;

  } catch (error) {
    console.error('Analytics generation error:', error);
    throw error;
  }
}

async function getCensusAnalytics({ facility_id, date_range, supa }: any) {
  const { data: censusData, error } = await supa
    .from('census_snapshots')
    .select('*')
    .gte('date', date_range.start_date)
    .lte('date', date_range.end_date)
    .order('date', { ascending: true });

  if (error) {
    console.error('Census data error:', error);
    return { summary: {}, trends: {}, charts: [] };
  }

  const summary = {
    avg_occupancy_rate: 0,
    max_occupancy_rate: 0,
    min_occupancy_rate: 0,
    total_admissions: 0,
    total_discharges: 0,
    avg_length_of_stay: 0
  };

  const trends = {
    daily_occupancy: [],
    admissions_trend: [],
    discharges_trend: []
  };

  const charts = [
    {
      type: 'line',
      title: 'Daily Occupancy Rate',
      data: trends.daily_occupancy,
      xAxis: 'date',
      yAxis: 'occupancy_rate'
    },
    {
      type: 'bar',
      title: 'Admissions vs Discharges',
      data: trends.admissions_trend,
      xAxis: 'date',
      yAxis: 'count'
    }
  ];

  if (censusData && censusData.length > 0) {
    const occupancyRates = censusData.map(d => d.occupancy_rate).filter(r => r !== null);
    summary.avg_occupancy_rate = occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length;
    summary.max_occupancy_rate = Math.max(...occupancyRates);
    summary.min_occupancy_rate = Math.min(...occupancyRates);
    summary.total_admissions = censusData.reduce((sum, d) => sum + (d.admission_count || 0), 0);
    summary.total_discharges = censusData.reduce((sum, d) => sum + (d.discharge_count || 0), 0);

    trends.daily_occupancy = censusData.map(d => ({
      date: d.date,
      occupancy_rate: d.occupancy_rate
    }));

    trends.admissions_trend = censusData.map(d => ({
      date: d.date,
      admissions: d.admission_count || 0,
      discharges: d.discharge_count || 0
    }));
  }

  return { summary, trends, charts };
}

async function getStaffingAnalytics({ facility_id, date_range, supa }: any) {
  const { data: staffingData, error } = await supa
    .from('staff_shifts')
    .select('*')
    .gte('shift_date', date_range.start_date)
    .lte('shift_date', date_range.end_date);

  if (error) {
    console.error('Staffing data error:', error);
    return { summary: {}, trends: {}, charts: [] };
  }

  const summary = {
    total_hours_worked: 0,
    avg_hours_per_shift: 0,
    overtime_hours: 0,
    unique_employees: 0,
    avg_staff_per_day: 0
  };

  const trends = {
    daily_staffing: [],
    overtime_trend: [],
    role_distribution: []
  };

  const charts = [
    {
      type: 'line',
      title: 'Daily Staffing Levels',
      data: trends.daily_staffing,
      xAxis: 'date',
      yAxis: 'staff_count'
    },
    {
      type: 'pie',
      title: 'Role Distribution',
      data: trends.role_distribution,
      label: 'role',
      value: 'count'
    }
  ];

  if (staffingData && staffingData.length > 0) {
    summary.total_hours_worked = staffingData.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
    summary.avg_hours_per_shift = summary.total_hours_worked / staffingData.length;
    summary.overtime_hours = staffingData.filter(s => s.overtime).reduce((sum, s) => sum + (s.hours_worked || 0), 0);
    summary.unique_employees = new Set(staffingData.map(s => s.employee_id)).size;

    // Group by date for daily trends
    const dailyGroups = staffingData.reduce((groups, shift) => {
      const date = shift.shift_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(shift);
      return groups;
    }, {} as any);

    trends.daily_staffing = Object.keys(dailyGroups).map(date => ({
      date,
      staff_count: dailyGroups[date].length,
      total_hours: dailyGroups[date].reduce((sum: number, s: any) => sum + (s.hours_worked || 0), 0)
    }));

    // Role distribution
    const roleGroups = staffingData.reduce((groups, shift) => {
      const role = shift.role;
      groups[role] = (groups[role] || 0) + 1;
      return groups;
    }, {} as any);

    trends.role_distribution = Object.keys(roleGroups).map(role => ({
      role,
      count: roleGroups[role]
    }));
  }

  return { summary, trends, charts };
}

async function getQualityAnalytics({ facility_id, date_range, supa }: any) {
  const { data: qualityData, error } = await supa
    .from('quality_indicators')
    .select('*')
    .gte('measurement_date', date_range.start_date)
    .lte('measurement_date', date_range.end_date);

  if (error) {
    console.error('Quality data error:', error);
    return { summary: {}, trends: {}, charts: [] };
  }

  const summary = {
    total_indicators: 0,
    avg_performance_score: 0,
    indicators_above_target: 0,
    indicators_below_target: 0,
    improvement_trend: 'stable'
  };

  const trends = {
    performance_over_time: [],
    category_performance: []
  };

  const charts = [
    {
      type: 'line',
      title: 'Quality Performance Over Time',
      data: trends.performance_over_time,
      xAxis: 'date',
      yAxis: 'performance_score'
    },
    {
      type: 'bar',
      title: 'Performance by Category',
      data: trends.category_performance,
      xAxis: 'category',
      yAxis: 'avg_score'
    }
  ];

  if (qualityData && qualityData.length > 0) {
    summary.total_indicators = qualityData.length;
    
    const scores = qualityData.map(q => q.indicator_value).filter(v => v !== null);
    summary.avg_performance_score = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    summary.indicators_above_target = qualityData.filter(q => 
      q.indicator_value && q.target_value && q.indicator_value >= q.target_value
    ).length;
    
    summary.indicators_below_target = qualityData.filter(q => 
      q.indicator_value && q.target_value && q.indicator_value < q.target_value
    ).length;

    // Performance over time
    const dailyGroups = qualityData.reduce((groups, indicator) => {
      const date = indicator.measurement_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(indicator);
      return groups;
    }, {} as any);

    trends.performance_over_time = Object.keys(dailyGroups).map(date => {
      const dayIndicators = dailyGroups[date];
      const avgScore = dayIndicators.reduce((sum: number, i: any) => sum + (i.indicator_value || 0), 0) / dayIndicators.length;
      return { date, performance_score: avgScore };
    });

    // Category performance
    const categoryGroups = qualityData.reduce((groups, indicator) => {
      const category = indicator.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(indicator);
      return groups;
    }, {} as any);

    trends.category_performance = Object.keys(categoryGroups).map(category => {
      const categoryIndicators = categoryGroups[category];
      const avgScore = categoryIndicators.reduce((sum: number, i: any) => sum + (i.indicator_value || 0), 0) / categoryIndicators.length;
      return { category, avg_score: avgScore };
    });
  }

  return { summary, trends, charts };
}

async function getFinancialAnalytics({ facility_id, date_range, supa }: any) {
  const { data: costData, error } = await supa
    .from('supply_cost_analytics')
    .select('*')
    .gte('date', date_range.start_date)
    .lte('date', date_range.end_date);

  if (error) {
    console.error('Financial data error:', error);
    return { summary: {}, trends: {}, charts: [] };
  }

  const summary = {
    total_cost: 0,
    avg_cost_per_unit: 0,
    total_quantity: 0,
    cost_trend: 'stable',
    top_cost_categories: []
  };

  const trends = {
    daily_costs: [],
    cost_by_category: []
  };

  const charts = [
    {
      type: 'line',
      title: 'Daily Supply Costs',
      data: trends.daily_costs,
      xAxis: 'date',
      yAxis: 'total_cost'
    },
    {
      type: 'bar',
      title: 'Costs by Category',
      data: trends.cost_by_category,
      xAxis: 'category',
      yAxis: 'total_cost'
    }
  ];

  if (costData && costData.length > 0) {
    summary.total_cost = costData.reduce((sum, c) => sum + (c.total_cost || 0), 0);
    summary.total_quantity = costData.reduce((sum, c) => sum + (c.total_quantity || 0), 0);
    summary.avg_cost_per_unit = summary.total_cost / summary.total_quantity;

    // Daily costs
    const dailyGroups = costData.reduce((groups, cost) => {
      const date = cost.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(cost);
      return groups;
    }, {} as any);

    trends.daily_costs = Object.keys(dailyGroups).map(date => ({
      date,
      total_cost: dailyGroups[date].reduce((sum: number, c: any) => sum + (c.total_cost || 0), 0)
    }));
  }

  return { summary, trends, charts };
}

async function getSupplyAnalytics({ facility_id, date_range, supa }: any) {
  const { data: supplyData, error } = await supa
    .from('supply_transactions')
    .select('*, supply_items(*)')
    .gte('transaction_date', date_range.start_date)
    .lte('transaction_date', date_range.end_date);

  if (error) {
    console.error('Supply data error:', error);
    return { summary: {}, trends: {}, charts: [] };
  }

  const summary = {
    total_transactions: 0,
    total_items_moved: 0,
    low_stock_alerts: 0,
    reorder_recommendations: 0
  };

  const trends = {
    transaction_volume: [],
    stock_levels: []
  };

  const charts = [
    {
      type: 'line',
      title: 'Transaction Volume Over Time',
      data: trends.transaction_volume,
      xAxis: 'date',
      yAxis: 'transaction_count'
    },
    {
      type: 'bar',
      title: 'Current Stock Levels',
      data: trends.stock_levels,
      xAxis: 'item_name',
      yAxis: 'current_quantity'
    }
  ];

  if (supplyData && supplyData.length > 0) {
    summary.total_transactions = supplyData.length;
    summary.total_items_moved = supplyData.reduce((sum, t) => sum + (t.quantity || 0), 0);

    // Transaction volume over time
    const dailyGroups = supplyData.reduce((groups, transaction) => {
      const date = transaction.transaction_date.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(transaction);
      return groups;
    }, {} as any);

    trends.transaction_volume = Object.keys(dailyGroups).map(date => ({
      date,
      transaction_count: dailyGroups[date].length
    }));
  }

  return { summary, trends, charts };
}

async function getTaskAnalytics({ facility_id, date_range, supa }: any) {
  const { data: taskData, error } = await supa
    .from('tasks')
    .select('*')
    .gte('created_at', date_range.start_date)
    .lte('created_at', date_range.end_date);

  if (error) {
    console.error('Task data error:', error);
    return { summary: {}, trends: {}, charts: [] };
  }

  const summary = {
    total_tasks: 0,
    completed_tasks: 0,
    completion_rate: 0,
    avg_completion_time: 0,
    overdue_tasks: 0
  };

  const trends = {
    task_completion: [],
    task_by_priority: []
  };

  const charts = [
    {
      type: 'line',
      title: 'Task Completion Over Time',
      data: trends.task_completion,
      xAxis: 'date',
      yAxis: 'completion_rate'
    },
    {
      type: 'pie',
      title: 'Tasks by Priority',
      data: trends.task_by_priority,
      label: 'priority',
      value: 'count'
    }
  ];

  if (taskData && taskData.length > 0) {
    summary.total_tasks = taskData.length;
    summary.completed_tasks = taskData.filter(t => t.status === 'completed').length;
    summary.completion_rate = (summary.completed_tasks / summary.total_tasks) * 100;
    summary.overdue_tasks = taskData.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;

    // Task completion over time
    const dailyGroups = taskData.reduce((groups, task) => {
      const date = task.created_at.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
      return groups;
    }, {} as any);

    trends.task_completion = Object.keys(dailyGroups).map(date => {
      const dayTasks = dailyGroups[date];
      const completed = dayTasks.filter(t => t.status === 'completed').length;
      return { date, completion_rate: (completed / dayTasks.length) * 100 };
    });

    // Tasks by priority
    const priorityGroups = taskData.reduce((groups, task) => {
      const priority = task.priority || 'medium';
      groups[priority] = (groups[priority] || 0) + 1;
      return groups;
    }, {} as any);

    trends.task_by_priority = Object.keys(priorityGroups).map(priority => ({
      priority,
      count: priorityGroups[priority]
    }));
  }

  return { summary, trends, charts };
}

async function generateInsights(analyticsData: any): Promise<string[]> {
  const insights: string[] = [];

  // Census insights
  if (analyticsData.summary.census) {
    const census = analyticsData.summary.census;
    if (census.avg_occupancy_rate > 90) {
      insights.push("High occupancy rate detected - consider capacity planning");
    }
    if (census.total_admissions > census.total_discharges) {
      insights.push("Net positive admissions trend - monitor capacity");
    }
  }

  // Staffing insights
  if (analyticsData.summary.staffing) {
    const staffing = analyticsData.summary.staffing;
    if (staffing.overtime_hours > staffing.total_hours_worked * 0.1) {
      insights.push("High overtime usage - consider additional staffing");
    }
  }

  // Quality insights
  if (analyticsData.summary.quality) {
    const quality = analyticsData.summary.quality;
    if (quality.indicators_below_target > quality.indicators_above_target) {
      insights.push("Multiple quality indicators below target - review processes");
    }
  }

  // Financial insights
  if (analyticsData.summary.financial) {
    const financial = analyticsData.summary.financial;
    if (financial.cost_trend === 'increasing') {
      insights.push("Supply costs trending upward - review procurement strategy");
    }
  }

  return insights;
}

async function calculateKPIs(analyticsData: any): Promise<any> {
  const kpis: any = {};

  // Overall facility KPI
  kpis.facility_score = 85; // This would be calculated based on multiple factors

  // Individual KPIs
  if (analyticsData.summary.census) {
    kpis.occupancy_rate = analyticsData.summary.census.avg_occupancy_rate;
  }

  if (analyticsData.summary.quality) {
    kpis.quality_score = analyticsData.summary.quality.avg_performance_score;
  }

  if (analyticsData.summary.tasks) {
    kpis.task_completion_rate = analyticsData.summary.tasks.completion_rate;
  }

  if (analyticsData.summary.financial) {
    kpis.cost_efficiency = 100 - (analyticsData.summary.financial.avg_cost_per_unit / 10); // Simplified calculation
  }

  return kpis;
}
