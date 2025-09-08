-- Supply Management System Schema
-- Created for CareIQ Supply Tracking

-- Create supply categories table
CREATE TABLE IF NOT EXISTS supply_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply items table
CREATE TABLE IF NOT EXISTS supply_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES supply_categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    unit_of_measure VARCHAR(20) NOT NULL DEFAULT 'each', -- each, box, case, liter, etc.
    cost_per_unit DECIMAL(10,2),
    reorder_level INTEGER DEFAULT 10,
    maximum_stock INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create units/locations table
CREATE TABLE IF NOT EXISTS facility_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    unit_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'ICU', 'MED1', 'REHAB'
    floor_number INTEGER,
    capacity INTEGER, -- bed capacity
    unit_type VARCHAR(50), -- Skilled, Memory Care, Rehab, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply stock table (current inventory levels)
CREATE TABLE IF NOT EXISTS supply_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES supply_items(id) ON DELETE CASCADE,
    location_type VARCHAR(20) NOT NULL DEFAULT 'central_supply', -- central_supply, unit_stock
    location_id UUID, -- References facility_units(id) for unit stock
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0, -- For pending orders
    last_counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_by UUID, -- References auth.users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(item_id, location_type, location_id)
);

-- Create supply transactions table (all stock movements)
CREATE TABLE IF NOT EXISTS supply_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES supply_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- stock_in, stock_out, adjustment, transfer
    quantity INTEGER NOT NULL, -- Positive for in, negative for out
    from_location_type VARCHAR(20), -- central_supply, unit_stock, vendor
    from_location_id UUID, -- References facility_units(id) or vendor_id
    to_location_type VARCHAR(20), -- central_supply, unit_stock, waste
    to_location_id UUID, -- References facility_units(id)
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    notes TEXT,
    performed_by UUID, -- References auth.users(id)
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply orders table (for restocking)
CREATE TABLE IF NOT EXISTS supply_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200),
    vendor_contact TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, ordered, received, cancelled
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    received_date DATE,
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_by UUID, -- References auth.users(id)
    received_by UUID, -- References auth.users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supply order items table
CREATE TABLE IF NOT EXISTS supply_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES supply_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES supply_items(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default supply categories
INSERT INTO supply_categories (name, description, color) VALUES
('Medical Supplies', 'General medical and nursing supplies', '#3b82f6'),
('Personal Care', 'Personal hygiene and care items', '#10b981'),
('Cleaning Supplies', 'Cleaning and sanitation products', '#f59e0b'),
('Office Supplies', 'Administrative and office materials', '#6b7280'),
('Kitchen Supplies', 'Food service and kitchen items', '#ef4444'),
('Maintenance', 'Facility maintenance supplies', '#8b5cf6'),
('PPE', 'Personal protective equipment', '#ec4899'),
('Medications', 'Over-the-counter medications and supplements', '#14b8a6')
ON CONFLICT DO NOTHING;

-- Insert sample supply items
INSERT INTO supply_items (name, description, category_id, sku, barcode, unit_of_measure, cost_per_unit, reorder_level) VALUES
('Nitrile Gloves - Medium', 'Disposable nitrile examination gloves', 
    (SELECT id FROM supply_categories WHERE name = 'PPE'), 
    'PPE-GLOVE-NIT-M', '123456789012', 'box', 15.99, 5),
('Adult Briefs - Large', 'Disposable adult incontinence briefs',
    (SELECT id FROM supply_categories WHERE name = 'Personal Care'),
    'PC-BRIEF-L', '123456789013', 'case', 45.99, 3),
('Hand Sanitizer - 8oz', 'Alcohol-based hand sanitizer',
    (SELECT id FROM supply_categories WHERE name = 'Cleaning Supplies'),
    'CLEAN-HAND-8OZ', '123456789014', 'bottle', 3.99, 10),
('Gauze Pads 4x4', 'Sterile gauze pads for wound care',
    (SELECT id FROM supply_categories WHERE name = 'Medical Supplies'),
    'MED-GAUZE-4X4', '123456789015', 'box', 12.50, 8)
ON CONFLICT DO NOTHING;

-- Insert sample facility units
INSERT INTO facility_units (name, unit_code, floor_number, capacity, unit_type) VALUES
('Memory Care Unit', 'MEMORY', 1, 24, 'Memory Care'),
('Skilled Nursing Floor 2', 'SKILLED2', 2, 32, 'Skilled Nursing'),
('Rehabilitation Wing', 'REHAB', 1, 16, 'Rehabilitation'),
('Central Supply Room', 'CENTRAL', 1, NULL, 'Supply Storage'),
('Administration', 'ADMIN', 2, NULL, 'Administrative')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_supply_stock_item_location ON supply_stock(item_id, location_type, location_id);
CREATE INDEX IF NOT EXISTS idx_supply_transactions_item ON supply_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_supply_transactions_date ON supply_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_supply_items_barcode ON supply_items(barcode);
CREATE INDEX IF NOT EXISTS idx_supply_items_sku ON supply_items(sku);
CREATE INDEX IF NOT EXISTS idx_supply_items_category ON supply_items(category_id);

-- Enable RLS (Row Level Security)
ALTER TABLE supply_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for authenticated users for now)
CREATE POLICY "Allow all for authenticated users" ON supply_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON supply_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON facility_units FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON supply_stock FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON supply_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON supply_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON supply_order_items FOR ALL TO authenticated USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_supply_categories_updated_at BEFORE UPDATE ON supply_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_supply_items_updated_at BEFORE UPDATE ON supply_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_facility_units_updated_at BEFORE UPDATE ON facility_units FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_supply_stock_updated_at BEFORE UPDATE ON supply_stock FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_supply_orders_updated_at BEFORE UPDATE ON supply_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
