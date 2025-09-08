-- Reporting System Schema
-- Extends existing tables with reporting and analytics capabilities

-- =====================================================
-- REPORTING TABLES
-- =====================================================

-- Report templates and configurations
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'supply', 'financial', 'operational', 'compliance'
    report_type TEXT NOT NULL, -- 'table', 'chart', 'dashboard', 'export'
    template_config JSONB NOT NULL, -- Report configuration and parameters
    chart_config JSONB, -- Chart-specific settings
    filters JSONB DEFAULT '{}', -- Available filters
    permissions JSONB DEFAULT '{}', -- Role-based access control
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Saved reports (user-generated reports)
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL, -- User-selected parameters
    filters JSONB DEFAULT '{}', -- Applied filters
    chart_type TEXT, -- 'line', 'bar', 'pie', 'table', 'dashboard'
    data JSONB, -- Cached report data
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE, -- For cache expiration
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Report subscriptions (scheduled reports)
CREATE TABLE IF NOT EXISTS report_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    schedule TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    schedule_config JSONB DEFAULT '{}', -- Cron-like configuration
    recipients JSONB NOT NULL, -- Email addresses or user IDs
    parameters JSONB NOT NULL,
    filters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_send_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Supply cost tracking (aggregated from invoices and transactions)
CREATE TABLE IF NOT EXISTS supply_cost_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES supply_items(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL,
    total_quantity INTEGER NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    cost_per_unit DECIMAL(10,4) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES supply_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(product_id, supplier_id, date, invoice_id)
);

-- Cost trends and historical data
CREATE TABLE IF NOT EXISTS cost_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES supply_items(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    avg_unit_cost DECIMAL(10,4) NOT NULL,
    min_unit_cost DECIMAL(10,4) NOT NULL,
    max_unit_cost DECIMAL(10,4) NOT NULL,
    total_quantity INTEGER NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    cost_variance DECIMAL(10,4), -- Standard deviation
    trend_direction TEXT, -- 'increasing', 'decreasing', 'stable'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Budget vs actual spending
CREATE TABLE IF NOT EXISTS budget_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'supplies', 'equipment', 'pharmaceuticals', 'maintenance'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    budgeted_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2) NOT NULL,
    variance_amount DECIMAL(10,2) NOT NULL,
    variance_percentage DECIMAL(5,2) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Supplier performance metrics
CREATE TABLE IF NOT EXISTS supplier_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_orders INTEGER NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    avg_order_value DECIMAL(10,2) NOT NULL,
    on_time_delivery_rate DECIMAL(5,2) NOT NULL,
    quality_score DECIMAL(3,2) NOT NULL, -- 0-1 scale
    cost_efficiency_score DECIMAL(3,2) NOT NULL, -- 0-1 scale
    overall_score DECIMAL(3,2) NOT NULL, -- 0-1 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_cost_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_metrics ENABLE ROW LEVEL SECURITY;

-- Report templates policies
CREATE POLICY "Enable read access for authenticated users" ON report_templates
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON report_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON report_templates
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Saved reports policies
CREATE POLICY "Enable read access for authenticated users" ON saved_reports
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON saved_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON saved_reports
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for report owners" ON saved_reports
    FOR DELETE USING (auth.uid() = created_by);

-- Report subscriptions policies
CREATE POLICY "Enable read access for authenticated users" ON report_subscriptions
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON report_subscriptions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON report_subscriptions
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for subscription owners" ON report_subscriptions
    FOR DELETE USING (auth.uid() = created_by);

-- Supply cost analytics policies
CREATE POLICY "Enable read access for authenticated users" ON supply_cost_analytics
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON supply_cost_analytics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Cost trends policies
CREATE POLICY "Enable read access for authenticated users" ON cost_trends
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON cost_trends
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Budget tracking policies
CREATE POLICY "Enable read access for authenticated users" ON budget_tracking
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON budget_tracking
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON budget_tracking
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Supplier metrics policies
CREATE POLICY "Enable read access for authenticated users" ON supplier_metrics
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON supplier_metrics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_supply_cost_analytics_product ON supply_cost_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_supply_cost_analytics_supplier ON supply_cost_analytics(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supply_cost_analytics_date ON supply_cost_analytics(date);
CREATE INDEX IF NOT EXISTS idx_cost_trends_product ON cost_trends(product_id);
CREATE INDEX IF NOT EXISTS idx_cost_trends_period ON cost_trends(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_category ON budget_tracking(category);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_period ON budget_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_supplier_metrics_supplier ON supplier_metrics(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_metrics_period ON supplier_metrics(period_start, period_end);

-- =====================================================
-- SAMPLE REPORT TEMPLATES
-- =====================================================

-- Supply Cost Analysis Report
INSERT INTO report_templates (name, description, category, report_type, template_config, chart_config, filters) 
SELECT 
    'Supply Cost Analysis',
    'Comprehensive analysis of supply costs with per-unit pricing trends',
    'supply',
    'dashboard',
    '{
        "sections": [
            {
                "title": "Cost Overview",
                "type": "kpi",
                "metrics": ["total_spending", "avg_cost_per_unit", "cost_trend", "budget_variance"]
            },
            {
                "title": "Top Spending Categories",
                "type": "pie_chart",
                "data_source": "supply_costs_by_category"
            },
            {
                "title": "Cost Trends Over Time",
                "type": "line_chart",
                "data_source": "monthly_cost_trends"
            },
            {
                "title": "Supplier Cost Comparison",
                "type": "bar_chart",
                "data_source": "supplier_cost_analysis"
            },
            {
                "title": "Per-Unit Cost Analysis",
                "type": "table",
                "data_source": "detailed_unit_costs"
            }
        ]
    }',
    '{
        "default_chart_type": "line",
        "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
        "responsive": true
    }',
    '{
        "date_range": true,
        "supplier_filter": true,
        "category_filter": true,
        "product_filter": true,
        "cost_range": true
    }'
WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE name = 'Supply Cost Analysis');

-- Budget vs Actual Report
INSERT INTO report_templates (name, description, category, report_type, template_config, chart_config, filters) 
SELECT 
    'Budget vs Actual Spending',
    'Compare budgeted vs actual spending across all categories',
    'financial',
    'dashboard',
    '{
        "sections": [
            {
                "title": "Budget Overview",
                "type": "kpi",
                "metrics": ["total_budget", "total_actual", "variance_amount", "variance_percentage"]
            },
            {
                "title": "Budget Performance by Category",
                "type": "bar_chart",
                "data_source": "budget_vs_actual_by_category"
            },
            {
                "title": "Monthly Budget Trends",
                "type": "line_chart",
                "data_source": "monthly_budget_trends"
            },
            {
                "title": "Variance Analysis",
                "type": "table",
                "data_source": "detailed_variance_analysis"
            }
        ]
    }',
    '{
        "default_chart_type": "bar",
        "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
        "responsive": true
    }',
    '{
        "date_range": true,
        "category_filter": true,
        "variance_threshold": true
    }'
WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE name = 'Budget vs Actual Spending');

-- Supplier Performance Report
INSERT INTO report_templates (name, description, category, report_type, template_config, chart_config, filters) 
SELECT 
    'Supplier Performance Analysis',
    'Comprehensive supplier performance metrics and cost analysis',
    'supply',
    'dashboard',
    '{
        "sections": [
            {
                "title": "Performance Overview",
                "type": "kpi",
                "metrics": ["avg_delivery_time", "quality_score", "cost_efficiency", "overall_score"]
            },
            {
                "title": "Supplier Rankings",
                "type": "bar_chart",
                "data_source": "supplier_rankings"
            },
            {
                "title": "Cost vs Quality Analysis",
                "type": "scatter_chart",
                "data_source": "cost_quality_scatter"
            },
            {
                "title": "Delivery Performance",
                "type": "line_chart",
                "data_source": "delivery_trends"
            },
            {
                "title": "Detailed Supplier Metrics",
                "type": "table",
                "data_source": "supplier_metrics_table"
            }
        ]
    }',
    '{
        "default_chart_type": "bar",
        "colors": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
        "responsive": true
    }',
    '{
        "date_range": true,
        "supplier_filter": true,
        "performance_threshold": true
    }'
WHERE NOT EXISTS (SELECT 1 FROM report_templates WHERE name = 'Supplier Performance Analysis');

-- =====================================================
-- FUNCTIONS FOR REPORT GENERATION
-- =====================================================

-- Function to generate supply cost analytics
CREATE OR REPLACE FUNCTION generate_supply_cost_analytics(
    start_date DATE,
    end_date DATE,
    supplier_id_param UUID DEFAULT NULL,
    category_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    supplier_name TEXT,
    category TEXT,
    total_quantity BIGINT,
    total_cost DECIMAL(10,2),
    avg_unit_cost DECIMAL(10,4),
    min_unit_cost DECIMAL(10,4),
    max_unit_cost DECIMAL(10,4),
    cost_variance DECIMAL(10,4),
    trend_direction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id as product_id,
        si.name as product_name,
        s.name as supplier_name,
        si.category,
        SUM(sca.total_quantity) as total_quantity,
        SUM(sca.total_cost) as total_cost,
        AVG(sca.cost_per_unit) as avg_unit_cost,
        MIN(sca.cost_per_unit) as min_unit_cost,
        MAX(sca.cost_per_unit) as max_unit_cost,
        STDDEV(sca.cost_per_unit) as cost_variance,
        CASE 
            WHEN AVG(sca.cost_per_unit) > LAG(AVG(sca.cost_per_unit)) OVER (ORDER BY sca.date) THEN 'increasing'
            WHEN AVG(sca.cost_per_unit) < LAG(AVG(sca.cost_per_unit)) OVER (ORDER BY sca.date) THEN 'decreasing'
            ELSE 'stable'
        END as trend_direction
    FROM supply_cost_analytics sca
    JOIN supply_items si ON sca.product_id = si.id
    LEFT JOIN suppliers s ON sca.supplier_id = s.id
    WHERE sca.date BETWEEN start_date AND end_date
        AND (supplier_id_param IS NULL OR sca.supplier_id = supplier_id_param)
        AND (category_param IS NULL OR si.category = category_param)
    GROUP BY si.id, si.name, s.name, si.category
    ORDER BY total_cost DESC;
END;
$$;

-- Function to calculate budget variance
CREATE OR REPLACE FUNCTION calculate_budget_variance(
    start_date DATE,
    end_date DATE,
    category_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    category TEXT,
    budgeted_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    variance_amount DECIMAL(10,2),
    variance_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(bt.category, 'Unknown') as category,
        COALESCE(bt.budgeted_amount, 0) as budgeted_amount,
        COALESCE(SUM(sca.total_cost), 0) as actual_amount,
        COALESCE(bt.budgeted_amount, 0) - COALESCE(SUM(sca.total_cost), 0) as variance_amount,
        CASE 
            WHEN COALESCE(bt.budgeted_amount, 0) > 0 THEN 
                ((COALESCE(bt.budgeted_amount, 0) - COALESCE(SUM(sca.total_cost), 0)) / bt.budgeted_amount * 100)
            ELSE 0
        END as variance_percentage
    FROM supply_cost_analytics sca
    JOIN supply_items si ON sca.product_id = si.id
    FULL OUTER JOIN budget_tracking bt ON si.category = bt.category 
        AND bt.period_start <= start_date AND bt.period_end >= end_date
    WHERE sca.date BETWEEN start_date AND end_date
        AND (category_param IS NULL OR si.category = category_param)
    GROUP BY bt.category, bt.budgeted_amount
    ORDER BY variance_percentage DESC;
END;
$$;

-- Function to update cost analytics from invoice data
CREATE OR REPLACE FUNCTION update_cost_analytics_from_invoice(
    invoice_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invoice_rec RECORD;
    item_rec RECORD;
BEGIN
    -- Get invoice details
    SELECT * INTO invoice_rec FROM invoices WHERE id = invoice_id_param;
    
    -- Process each invoice item
    FOR item_rec IN 
        SELECT 
            ii.*,
            si.id as product_id,
            si.category
        FROM invoice_items ii
        JOIN supply_items si ON ii.matched_product_id = si.id
        WHERE ii.invoice_id = invoice_id_param
    LOOP
        -- Insert or update cost analytics
        INSERT INTO supply_cost_analytics (
            product_id,
            supplier_id,
            date,
            unit_cost,
            total_quantity,
            total_cost,
            cost_per_unit,
            invoice_id
        ) VALUES (
            item_rec.product_id,
            invoice_rec.supplier_id,
            invoice_rec.invoice_date,
            item_rec.unit_price,
            item_rec.quantity,
            item_rec.total_price,
            item_rec.unit_price,
            invoice_id_param
        )
        ON CONFLICT (product_id, supplier_id, date, invoice_id) 
        DO UPDATE SET
            unit_cost = EXCLUDED.unit_cost,
            total_quantity = EXCLUDED.total_quantity,
            total_cost = EXCLUDED.total_cost,
            cost_per_unit = EXCLUDED.cost_per_unit;
    END LOOP;
END;
$$;
