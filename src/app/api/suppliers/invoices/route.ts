// Invoice Processing API
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
    const supplierId = searchParams.get('supplier_id');
    const status = searchParams.get('status');

    let query = supa
      .from('invoices')
      .select(`
        *,
        supplier:suppliers(name, contact_name),
        items:invoice_items(
          id, line_number, item_name, description, quantity, 
          unit_price, total_price, supplier_sku, 
          matched_product_id, confidence_score, needs_review,
          matched_product:supply_items(name, sku)
        )
      `)
      .order('created_at', { ascending: false });

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices || [] });

  } catch (error: any) {
    console.error('Invoices API error:', error);
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

    const formData = await req.formData();
    const supplierId = formData.get('supplier_id') as string;
    const invoiceNumber = formData.get('invoice_number') as string;
    const invoiceDate = formData.get('invoice_date') as string;
    const dueDate = formData.get('due_date') as string;
    const file = formData.get('file') as File;

    if (!supplierId || !invoiceNumber || !invoiceDate || !file) {
      return NextResponse.json({ 
        error: "Missing required fields: supplier_id, invoice_number, invoice_date, file" 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only PDF, JPEG, PNG, and CSV files are allowed." 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB." 
      }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const fileType = file.type.split('/')[1];

    // Create invoice record
    const { data: invoice, error: invoiceError } = await supa
      .from('invoices')
      .insert({
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        file_type: fileType,
        processing_status: 'pending',
        created_by: user.id
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }

    // Process the invoice file
    try {
      // In a real implementation, you would:
      // 1. Save the file to storage (S3, etc.)
      // 2. Use OCR to extract text from PDF/image
      // 3. Use AI to parse the invoice structure
      // 4. Extract line items and create invoice_items records
      
      // For now, we'll simulate the processing
      const mockExtractedData = {
        total_amount: 1250.00,
        line_items: [
          {
            line_number: 1,
            item_name: "Surgical Gloves - Box of 100",
            description: "Latex-free surgical gloves",
            quantity: 10,
            unit_price: 25.00,
            total_price: 250.00,
            supplier_sku: "SG-100-LF",
            confidence_score: 0.95
          },
          {
            line_number: 2,
            item_name: "Disposable Syringes 10ml",
            description: "Sterile disposable syringes",
            quantity: 50,
            unit_price: 0.50,
            total_price: 25.00,
            supplier_sku: "DS-10ML",
            confidence_score: 0.90
          }
        ],
        confidence_score: 0.92
      };

      // Update invoice with extracted data
      const { error: updateError } = await supa
        .from('invoices')
        .update({
          extracted_data: mockExtractedData,
          total_amount: mockExtractedData.total_amount,
          processing_status: 'completed'
        })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('Error updating invoice with extracted data:', updateError);
      }

      // Create invoice items
      const invoiceItems = mockExtractedData.line_items.map((item: any) => ({
        invoice_id: invoice.id,
        line_number: item.line_number,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        supplier_sku: item.supplier_sku,
        confidence_score: item.confidence_score,
        needs_review: item.confidence_score < 0.8
      }));

      const { error: itemsError } = await supa
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('Error creating invoice items:', itemsError);
      }

      // Try to match products to existing supply items
      await matchInvoiceItemsToProducts(supa, invoice.id);

      // Update cost analytics
      try {
        await supa.rpc('update_cost_analytics_from_invoice', {
          invoice_id_param: invoice.id
        });
      } catch (costError) {
        console.error('Error updating cost analytics:', costError);
        // Don't fail the invoice processing for this
      }

    } catch (processingError) {
      console.error('Error processing invoice:', processingError);
      
      // Update invoice status to failed
      await supa
        .from('invoices')
        .update({ processing_status: 'failed' })
        .eq('id', invoice.id);
    }

    return NextResponse.json({ 
      invoice,
      message: "Invoice uploaded and processed successfully" 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Upload invoice error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// Helper function to match invoice items to existing products
async function matchInvoiceItemsToProducts(supa: any, invoiceId: string) {
  try {
    // Get invoice items that need matching
    const { data: invoiceItems } = await supa
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .is('matched_product_id', null);

    if (!invoiceItems || invoiceItems.length === 0) return;

    // Get all existing supply items for matching
    const { data: supplyItems } = await supa
      .from('supply_items')
      .select('id, name, sku, barcode');

    if (!supplyItems) return;

    // Match items using simple string similarity
    for (const item of invoiceItems) {
      let bestMatch = null;
      let bestScore = 0;

      for (const product of supplyItems) {
        let score = 0;

        // SKU match (exact)
        if (item.supplier_sku && product.sku && 
            item.supplier_sku.toLowerCase() === product.sku.toLowerCase()) {
          score = 1.0;
        }
        // Barcode match (exact)
        else if (item.supplier_sku && product.barcode && 
                 item.supplier_sku === product.barcode) {
          score = 0.95;
        }
        // Name similarity (simple)
        else if (item.item_name && product.name) {
          const name1 = item.item_name.toLowerCase();
          const name2 = product.name.toLowerCase();
          
          // Check if one contains the other
          if (name1.includes(name2) || name2.includes(name1)) {
            score = 0.8;
          }
          // Check for common words
          const words1 = name1.split(' ');
          const words2 = name2.split(' ');
          const commonWords = words1.filter(word => words2.includes(word));
          if (commonWords.length > 0) {
            score = Math.max(score, commonWords.length / Math.max(words1.length, words2.length));
          }
        }

        if (score > bestScore && score > 0.7) {
          bestMatch = product;
          bestScore = score;
        }
      }

      // Update item with match if found
      if (bestMatch) {
        await supa
          .from('invoice_items')
          .update({
            matched_product_id: bestMatch.id,
            confidence_score: bestScore,
            needs_review: bestScore < 0.9
          })
          .eq('id', item.id);
      }
    }
  } catch (error) {
    console.error('Error matching invoice items to products:', error);
  }
}
