// src/app/api/supply/items/route.ts - Supply Items API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const location_type = url.searchParams.get('location_type') || 'central_supply';
    const location_id = url.searchParams.get('location_id');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');

    let query = supa
      .from('supply_items')
      .select(`
        *,
        category:supply_categories(name, color),
        stock:supply_stock(current_quantity, reserved_quantity)
      `)
      .eq('is_active', true);

    // Filter by stock location
    if (location_type) {
      query = query.eq('supply_stock.location_type', location_type);
      if (location_id) {
        query = query.eq('supply_stock.location_id', location_id);
      } else if (location_type === 'central_supply') {
        query = query.is('supply_stock.location_id', null);
      }
    }

    // Filter by category
    if (category) {
      query = query.eq('category_id', category);
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.eq.${search}`);
    }

    const { data: items, error } = await query.order('name');

    if (error) {
      console.error('Error fetching supply items:', error);
      return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }

    // Process the data to include current stock
    const processedItems = items?.map(item => ({
      ...item,
      current_stock: item.stock?.[0]?.current_quantity || 0,
      reserved_stock: item.stock?.[0]?.reserved_quantity || 0
    })) || [];

    return NextResponse.json({ items: processedItems });

  } catch (error) {
    console.error('Supply items API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itemData = await req.json();

    // Validate required fields
    if (!itemData.name || !itemData.sku || !itemData.category_id) {
      return NextResponse.json({ 
        error: "Missing required fields: name, sku, category_id" 
      }, { status: 400 });
    }

    const { data: newItem, error } = await supa
      .from('supply_items')
      .insert({
        ...itemData,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        category:supply_categories(name, color)
      `)
      .single();

    if (error) {
      console.error('Error creating supply item:', error);
      return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }

    // Create initial stock record for central supply
    await supa
      .from('supply_stock')
      .insert({
        item_id: newItem.id,
        location_type: 'central_supply',
        location_id: null,
        current_quantity: 0,
        last_updated_by: user.id
      });

    return NextResponse.json({ item: newItem }, { status: 201 });

  } catch (error) {
    console.error('Supply items POST error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
