// Reports API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'templates';
    const category = searchParams.get('category');

    if (type === 'templates') {
      // Get report templates
      let query = supa
        .from('report_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data: templates, error } = await query;

      if (error) {
        console.error('Error fetching report templates:', error);
        return NextResponse.json({ error: "Failed to fetch report templates" }, { status: 500 });
      }

      return NextResponse.json({ templates: templates || [] });

    } else if (type === 'saved') {
      // Get saved reports
      const { data: reports, error } = await supa
        .from('saved_reports')
        .select(`
          *,
          template:report_templates(name, description, category)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved reports:', error);
        return NextResponse.json({ error: "Failed to fetch saved reports" }, { status: 500 });
      }

      return NextResponse.json({ reports: reports || [] });

    } else if (type === 'subscriptions') {
      // Get report subscriptions
      const { data: subscriptions, error } = await supa
        .from('report_subscriptions')
        .select(`
          *,
          template:report_templates(name, description, category)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching report subscriptions:', error);
        return NextResponse.json({ error: "Failed to fetch report subscriptions" }, { status: 500 });
      }

      return NextResponse.json({ subscriptions: subscriptions || [] });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });

  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.WRITE);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      template_id,
      name,
      description,
      parameters,
      filters,
      chart_type,
      save_report = false
    } = await req.json();

    if (!template_id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    // Get template configuration
    const { data: template, error: templateError } = await supa
      .from('report_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Report template not found" }, { status: 404 });
    }

    // Generate report data based on template
    let reportData = {};
    
    if (template.name === 'Supply Cost Analysis') {
      reportData = await generateSupplyCostReport(supa, parameters, filters);
    } else if (template.name === 'Budget vs Actual Spending') {
      reportData = await generateBudgetReport(supa, parameters, filters);
    } else if (template.name === 'Supplier Performance Analysis') {
      reportData = await generateSupplierPerformanceReport(supa, parameters, filters);
    }

    // Save report if requested
    if (save_report) {
      const { data: savedReport, error: saveError } = await supa
        .from('saved_reports')
        .insert({
          template_id,
          name: name || `${template.name} - ${new Date().toLocaleDateString()}`,
          description,
          parameters,
          filters,
          chart_type,
          data: reportData,
          created_by: user.id
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving report:', saveError);
        return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
      }

      return NextResponse.json({ 
        report: savedReport,
        data: reportData,
        message: "Report generated and saved successfully" 
      });
    }

    return NextResponse.json({ 
      data: reportData,
      template: template,
      message: "Report generated successfully" 
    });

  } catch (error: any) {
    console.error('Generate report error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// Helper function to generate supply cost report
async function generateSupplyCostReport(supa: any, parameters: any, filters: any) {
  const startDate = parameters?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = parameters?.end_date || new Date().toISOString().split('T')[0];
  const supplierId = filters?.supplier_id || null;
  const category = filters?.category || null;

  // Get cost analytics data
  const { data: costData, error: costError } = await supa
    .rpc('generate_supply_cost_analytics', {
      start_date: startDate,
      end_date: endDate,
      supplier_id_param: supplierId,
      category_param: category
    });

  if (costError) {
    console.error('Error generating cost analytics:', costError);
    return { error: "Failed to generate cost data" };
  }

  // Calculate summary metrics
  const totalSpending = costData?.reduce((sum: number, item: any) => sum + parseFloat(item.total_cost || 0), 0) || 0;
  const totalQuantity = costData?.reduce((sum: number, item: any) => sum + parseInt(item.total_quantity || 0), 0) || 0;
  const avgCostPerUnit = totalQuantity > 0 ? totalSpending / totalQuantity : 0;

  // Group by category for pie chart
  const categoryData = costData?.reduce((acc: any, item: any) => {
    const category = item.category || 'Unknown';
    if (!acc[category]) {
      acc[category] = { category, total_cost: 0, count: 0 };
    }
    acc[category].total_cost += parseFloat(item.total_cost || 0);
    acc[category].count += 1;
    return acc;
  }, {}) || {};

  // Group by month for trend analysis
  const monthlyData = costData?.reduce((acc: any, item: any) => {
    const month = new Date(item.date).toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { month, total_cost: 0, total_quantity: 0 };
    }
    acc[month].total_cost += parseFloat(item.total_cost || 0);
    acc[month].total_quantity += parseInt(item.total_quantity || 0);
    return acc;
  }, {}) || {};

  return {
    summary: {
      total_spending: totalSpending,
      total_quantity: totalQuantity,
      avg_cost_per_unit: avgCostPerUnit,
      period: { start_date: startDate, end_date: endDate }
    },
    category_breakdown: Object.values(categoryData),
    monthly_trends: Object.values(monthlyData),
    detailed_costs: costData || [],
    supplier_analysis: costData?.reduce((acc: any, item: any) => {
      const supplier = item.supplier_name || 'Unknown';
      if (!acc[supplier]) {
        acc[supplier] = { supplier, total_cost: 0, avg_unit_cost: 0, product_count: 0 };
      }
      acc[supplier].total_cost += parseFloat(item.total_cost || 0);
      acc[supplier].product_count += 1;
      return acc;
    }, {}) || {}
  };
}

// Helper function to generate budget report
async function generateBudgetReport(supa: any, parameters: any, filters: any) {
  const startDate = parameters?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = parameters?.end_date || new Date().toISOString().split('T')[0];
  const category = filters?.category || null;

  // Get budget variance data
  const { data: varianceData, error: varianceError } = await supa
    .rpc('calculate_budget_variance', {
      start_date: startDate,
      end_date: endDate,
      category_param: category
    });

  if (varianceError) {
    console.error('Error calculating budget variance:', varianceError);
    return { error: "Failed to generate budget data" };
  }

  const totalBudget = varianceData?.reduce((sum: number, item: any) => sum + parseFloat(item.budgeted_amount || 0), 0) || 0;
  const totalActual = varianceData?.reduce((sum: number, item: any) => sum + parseFloat(item.actual_amount || 0), 0) || 0;
  const totalVariance = totalBudget - totalActual;
  const variancePercentage = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

  return {
    summary: {
      total_budget: totalBudget,
      total_actual: totalActual,
      variance_amount: totalVariance,
      variance_percentage: variancePercentage,
      period: { start_date: startDate, end_date: endDate }
    },
    category_breakdown: varianceData || [],
    monthly_trends: [], // Would need additional query for monthly trends
    detailed_variance: varianceData || []
  };
}

// Helper function to generate supplier performance report
async function generateSupplierPerformanceReport(supa: any, parameters: any, filters: any) {
  const startDate = parameters?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = parameters?.end_date || new Date().toISOString().split('T')[0];
  const supplierId = filters?.supplier_id || null;

  // Get supplier metrics
  const { data: metrics, error: metricsError } = await supa
    .from('supplier_metrics')
    .select(`
      *,
      supplier:suppliers(name, contact_name, email)
    `)
    .gte('period_start', startDate)
    .lte('period_end', endDate)
    .order('overall_score', { ascending: false });

  if (metricsError) {
    console.error('Error fetching supplier metrics:', metricsError);
    return { error: "Failed to generate supplier performance data" };
  }

  const avgDeliveryRate = metrics?.reduce((sum: number, item: any) => sum + parseFloat(item.on_time_delivery_rate || 0), 0) / (metrics?.length || 1) || 0;
  const avgQualityScore = metrics?.reduce((sum: number, item: any) => sum + parseFloat(item.quality_score || 0), 0) / (metrics?.length || 1) || 0;
  const avgCostEfficiency = metrics?.reduce((sum: number, item: any) => sum + parseFloat(item.cost_efficiency_score || 0), 0) / (metrics?.length || 1) || 0;
  const avgOverallScore = metrics?.reduce((sum: number, item: any) => sum + parseFloat(item.overall_score || 0), 0) / (metrics?.length || 1) || 0;

  return {
    summary: {
      avg_delivery_time: avgDeliveryRate,
      quality_score: avgQualityScore,
      cost_efficiency: avgCostEfficiency,
      overall_score: avgOverallScore,
      period: { start_date: startDate, end_date: endDate }
    },
    supplier_rankings: metrics || [],
    performance_metrics: metrics || [],
    detailed_analysis: metrics || []
  };
}
