// src/app/api/supply/transactions/route.ts - Supply Transactions API
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
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const item_id = url.searchParams.get('item_id');
    const location_id = url.searchParams.get('location_id');
    const transaction_type = url.searchParams.get('transaction_type');

    let query = supa
      .from('supply_transactions')
      .select(`
        *,
        item:supply_items(name, sku, unit_of_measure),
        performer:profiles(full_name)
      `)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (item_id) {
      query = query.eq('item_id', item_id);
    }

    if (location_id) {
      query = query.or(`from_location_id.eq.${location_id},to_location_id.eq.${location_id}`);
    }

    if (transaction_type) {
      query = query.eq('transaction_type', transaction_type);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('Supply transactions GET error:', error);
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

    const transactionData = await req.json();

    // Validate required fields
    if (!transactionData.item_id || !transactionData.transaction_type || transactionData.quantity === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields: item_id, transaction_type, quantity" 
      }, { status: 400 });
    }

    // Start a transaction to ensure data consistency
    const { data: transaction, error: transactionError } = await supa
      .from('supply_transactions')
      .insert({
        ...transactionData,
        performed_by: user.id,
        transaction_date: new Date().toISOString()
      })
      .select(`
        *,
        item:supply_items(name, sku)
      `)
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    // Update stock levels based on transaction
    await updateStockLevels(supa, transactionData);

    return NextResponse.json({ transaction }, { status: 201 });

  } catch (error) {
    console.error('Supply transactions POST error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updateStockLevels(supa: any, transactionData: any) {
  const { item_id, quantity, transaction_type, from_location_type, from_location_id, to_location_type, to_location_id } = transactionData;

  try {
    // Handle outgoing stock (decrease from source)
    if (from_location_type && (transaction_type === 'stock_out' || transaction_type === 'transfer')) {
      const { data: fromStock } = await supa
        .from('supply_stock')
        .select('current_quantity')
        .eq('item_id', item_id)
        .eq('location_type', from_location_type)
        .eq('location_id', from_location_id || null)
        .single();

      if (fromStock) {
        const newQuantity = Math.max(0, fromStock.current_quantity - Math.abs(quantity));
        await supa
          .from('supply_stock')
          .update({ 
            current_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', item_id)
          .eq('location_type', from_location_type)
          .eq('location_id', from_location_id || null);
      }
    }

    // Handle incoming stock (increase to destination)
    if (to_location_type && (transaction_type === 'stock_in' || transaction_type === 'transfer')) {
      const { data: toStock } = await supa
        .from('supply_stock')
        .select('current_quantity')
        .eq('item_id', item_id)
        .eq('location_type', to_location_type)
        .eq('location_id', to_location_id || null)
        .single();

      if (toStock) {
        const newQuantity = toStock.current_quantity + Math.abs(quantity);
        await supa
          .from('supply_stock')
          .update({ 
            current_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', item_id)
          .eq('location_type', to_location_type)
          .eq('location_id', to_location_id || null);
      } else {
        // Create new stock record if it doesn't exist
        await supa
          .from('supply_stock')
          .insert({
            item_id,
            location_type: to_location_type,
            location_id: to_location_id || null,
            current_quantity: Math.abs(quantity),
            last_updated_by: transactionData.performed_by
          });
      }
    }

    // Handle stock adjustments
    if (transaction_type === 'adjustment') {
      const location_type = to_location_type || from_location_type;
      const location_id = to_location_id || from_location_id;

      const { data: currentStock } = await supa
        .from('supply_stock')
        .select('current_quantity')
        .eq('item_id', item_id)
        .eq('location_type', location_type)
        .eq('location_id', location_id || null)
        .single();

      if (currentStock) {
        const newQuantity = Math.max(0, currentStock.current_quantity + quantity);
        await supa
          .from('supply_stock')
          .update({ 
            current_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', item_id)
          .eq('location_type', location_type)
          .eq('location_id', location_id || null);
      }
    }

  } catch (error) {
    console.error('Error updating stock levels:', error);
    throw error;
  }
}
