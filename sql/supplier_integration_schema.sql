-- Supplier Integration Schema
-- Extends supply management with supplier sync and invoice processing

-- =====================================================
-- SUPPLIER MANAGEMENT TABLES
-- =====================================================

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    api_endpoint TEXT,
    api_key TEXT,
    sync_enabled BOOLEAN DEFAULT FALSE,
    sync_frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'manual'
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'success', 'error'
    error_message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Supplier product catalog (synced from supplier)
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    supplier_sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_of_measure TEXT DEFAULT 'each',
    unit_price DECIMAL(10,2),
    minimum_order_quantity INTEGER DEFAULT 1,
    lead_time_days INTEGER,
    is_available BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(supplier_id, supplier_sku)
);

-- Supplier sync logs
CREATE TABLE IF NOT EXISTS supplier_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    products_synced INTEGER DEFAULT 0,
    products_updated INTEGER DEFAULT 0,
    products_added INTEGER DEFAULT 0,
    error_message TEXT,
    sync_duration_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    po_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'confirmed', 'shipped', 'received', 'cancelled'
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    total_amount DECIMAL(10,2),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    supplier_product_id UUID REFERENCES supplier_products(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    supplier_sku TEXT,
    quantity_ordered INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    notes TEXT
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'disputed'
    file_path TEXT, -- Path to uploaded invoice file
    file_type TEXT, -- 'pdf', 'image', 'csv'
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    extracted_data JSONB, -- AI-extracted data
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(supplier_id, invoice_number)
);

-- Invoice items (extracted from invoice)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    line_number INTEGER,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    supplier_sku TEXT,
    matched_product_id UUID REFERENCES supply_items(id) ON DELETE SET NULL,
    confidence_score DECIMAL(3,2), -- AI confidence in extraction (0-1)
    needs_review BOOLEAN DEFAULT FALSE
);

-- Product matching rules (for AI matching)
CREATE TABLE IF NOT EXISTS product_matching_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'sku_match', 'name_similarity', 'category_match', 'custom'
    rule_config JSONB NOT NULL, -- Configuration for the matching rule
    priority INTEGER DEFAULT 1, -- Higher number = higher priority
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_matching_rules ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Enable read access for authenticated users" ON suppliers
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON suppliers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON suppliers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Supplier products policies
CREATE POLICY "Enable read access for authenticated users" ON supplier_products
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON supplier_products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON supplier_products
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Sync logs policies
CREATE POLICY "Enable read access for authenticated users" ON supplier_sync_logs
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON supplier_sync_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Purchase orders policies
CREATE POLICY "Enable read access for authenticated users" ON purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON purchase_orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON purchase_orders
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Purchase order items policies
CREATE POLICY "Enable read access for authenticated users" ON purchase_order_items
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON purchase_order_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON purchase_order_items
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Invoices policies
CREATE POLICY "Enable read access for authenticated users" ON invoices
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON invoices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON invoices
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Invoice items policies
CREATE POLICY "Enable read access for authenticated users" ON invoice_items
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON invoice_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON invoice_items
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Product matching rules policies
CREATE POLICY "Enable read access for authenticated users" ON product_matching_rules
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON product_matching_rules
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON product_matching_rules
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_sku ON supplier_products(supplier_sku);
CREATE INDEX IF NOT EXISTS idx_supplier_sync_logs_supplier ON supplier_sync_logs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_matched ON invoice_items(matched_product_id);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Sample suppliers
INSERT INTO suppliers (name, contact_name, email, phone, address, sync_enabled, sync_frequency) 
SELECT 'MedSupply Pro', 'John Smith', 'john@medsupplypro.com', '555-0123', '123 Medical Dr, Healthcare City, HC 12345', true, 'weekly'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'MedSupply Pro');

INSERT INTO suppliers (name, contact_name, email, phone, address, sync_enabled, sync_frequency) 
SELECT 'Care Equipment Co', 'Sarah Johnson', 'sarah@careequip.com', '555-0456', '456 Supply Ave, Medical District, MD 67890', true, 'daily'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Care Equipment Co');

INSERT INTO suppliers (name, contact_name, email, phone, address, sync_enabled, sync_frequency) 
SELECT 'Pharma Direct', 'Mike Wilson', 'mike@pharmadirect.com', '555-0789', '789 Drug St, Pharmacy Row, PR 11111', false, 'manual'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Pharma Direct');

-- Sample product matching rules
INSERT INTO product_matching_rules (supplier_id, rule_name, rule_type, rule_config, priority) 
SELECT 
    s.id,
    'SKU Exact Match',
    'sku_match',
    '{"match_type": "exact", "case_sensitive": false}',
    10
FROM suppliers s WHERE s.name = 'MedSupply Pro'
AND NOT EXISTS (SELECT 1 FROM product_matching_rules WHERE rule_name = 'SKU Exact Match');

INSERT INTO product_matching_rules (supplier_id, rule_name, rule_type, rule_config, priority) 
SELECT 
    s.id,
    'Name Similarity Match',
    'name_similarity',
    '{"threshold": 0.8, "use_fuzzy": true}',
    5
FROM suppliers s WHERE s.name = 'MedSupply Pro'
AND NOT EXISTS (SELECT 1 FROM product_matching_rules WHERE rule_name = 'Name Similarity Match');

-- =====================================================
-- FUNCTIONS FOR AUTOMATION
-- =====================================================

-- Function to sync supplier products
CREATE OR REPLACE FUNCTION sync_supplier_products(
    supplier_id_param UUID,
    sync_type_param TEXT DEFAULT 'incremental'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sync_log_id UUID;
    supplier_rec RECORD;
    products_synced INTEGER := 0;
    products_updated INTEGER := 0;
    products_added INTEGER := 0;
    start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    start_time := now();
    
    -- Get supplier info
    SELECT * INTO supplier_rec FROM suppliers WHERE id = supplier_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Supplier not found: %', supplier_id_param;
    END IF;
    
    -- Create sync log
    INSERT INTO supplier_sync_logs (supplier_id, sync_type, status, started_at)
    VALUES (supplier_id_param, sync_type_param, 'started', start_time)
    RETURNING id INTO sync_log_id;
    
    -- Update supplier sync status
    UPDATE suppliers 
    SET sync_status = 'syncing', last_sync_at = start_time
    WHERE id = supplier_id_param;
    
    -- In a real implementation, this would:
    -- 1. Call the supplier's API
    -- 2. Fetch product catalog
    -- 3. Compare with existing products
    -- 4. Insert/update products
    -- 5. Handle errors gracefully
    
    -- For now, we'll simulate the sync
    -- In production, replace this with actual API calls
    
    -- Update sync log with results
    UPDATE supplier_sync_logs 
    SET 
        status = 'completed',
        completed_at = now(),
        products_synced = products_synced,
        products_updated = products_updated,
        products_added = products_added,
        sync_duration_seconds = EXTRACT(EPOCH FROM (now() - start_time))::INTEGER
    WHERE id = sync_log_id;
    
    -- Update supplier status
    UPDATE suppliers 
    SET sync_status = 'success'
    WHERE id = supplier_id_param;
    
    RETURN sync_log_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Update sync log with error
        UPDATE supplier_sync_logs 
        SET 
            status = 'failed',
            completed_at = now(),
            error_message = SQLERRM,
            sync_duration_seconds = EXTRACT(EPOCH FROM (now() - start_time))::INTEGER
        WHERE id = sync_log_id;
        
        -- Update supplier status
        UPDATE suppliers 
        SET sync_status = 'error', error_message = SQLERRM
        WHERE id = supplier_id_param;
        
        RAISE;
END;
$$;

-- Function to process invoice and extract products
CREATE OR REPLACE FUNCTION process_invoice_file(
    invoice_id_param UUID,
    file_content BYTEA,
    file_type_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invoice_rec RECORD;
    extracted_data JSONB;
    items_processed INTEGER := 0;
BEGIN
    -- Get invoice info
    SELECT * INTO invoice_rec FROM invoices WHERE id = invoice_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', invoice_id_param;
    END IF;
    
    -- Update processing status
    UPDATE invoices 
    SET processing_status = 'processing'
    WHERE id = invoice_id_param;
    
    -- In a real implementation, this would:
    -- 1. Use OCR to extract text from PDF/image
    -- 2. Use AI/ML to parse invoice structure
    -- 3. Extract line items, quantities, prices
    -- 4. Match products to existing catalog
    -- 5. Create invoice_items records
    
    -- For now, return mock extracted data
    extracted_data := '{
        "total_amount": 1250.00,
        "line_items": [
            {
                "line_number": 1,
                "item_name": "Surgical Gloves - Box of 100",
                "description": "Latex-free surgical gloves",
                "quantity": 10,
                "unit_price": 25.00,
                "total_price": 250.00,
                "supplier_sku": "SG-100-LF"
            },
            {
                "line_number": 2,
                "item_name": "Disposable Syringes 10ml",
                "description": "Sterile disposable syringes",
                "quantity": 50,
                "unit_price": 0.50,
                "total_price": 25.00,
                "supplier_sku": "DS-10ML"
            }
        ],
        "confidence_score": 0.95
    }';
    
    -- Update invoice with extracted data
    UPDATE invoices 
    SET 
        extracted_data = extracted_data,
        processing_status = 'completed',
        total_amount = (extracted_data->>'total_amount')::DECIMAL
    WHERE id = invoice_id_param;
    
    RETURN extracted_data;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Update processing status to failed
        UPDATE invoices 
        SET processing_status = 'failed'
        WHERE id = invoice_id_param;
        
        RAISE;
END;
$$;
