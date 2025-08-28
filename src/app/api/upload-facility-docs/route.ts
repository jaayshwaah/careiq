// src/app/api/upload-facility-docs/route.ts - Enhanced facility document upload
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";
import { parseDocxToText, parsePdfToText } from "@/lib/knowledge/parse";
import { chunkText } from "@/lib/knowledge/chunker";
import { embedTexts } from "@/lib/knowledge/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's facility information
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, facility_name, facility_state, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_name) {
      return NextResponse.json({ 
        ok: false, 
        error: "Please set your facility name in settings before uploading documents" 
      }, { status: 400 });
    }

    const form = await req.formData();
    const files = form.getAll("files") as File[];
    const documentType = form.get("documentType")?.toString() || "Policy";
    const description = form.get("description")?.toString() || "";

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No files provided" }, { status: 400 });
    }

    const results = [];
    const supabaseAdmin = supabaseService(); // Use service role for uploads

    // helper: smart category detection
    const detectCategory = (name: string, txt: string): string => {
      const hay = `${name}\n${txt}`.toLowerCase();
      if (hay.match(/\b(42 cfr|cms|f\-?tag|f\d{3})\b/)) return "CMS Regulation";
      if (hay.match(/\b(joint commission|jcaho|accreditation)\b/)) return "Joint Commission";
      if (hay.match(/\b(cdc|infection control|public health)\b/)) return "CDC Guidelines";
      if (hay.match(/\b(state|texas|california|florida|new york|illinois)\b/)) return "State Regulation";
      return "Facility Policy";
    };

    for (const file of files) {
      try {
        console.log(`Processing ${file.name} for facility ${profile.facility_name}`);
        
        // Extract text from file
        const buffer = Buffer.from(await file.arrayBuffer());
        let content = "";
        
        if (file.name.toLowerCase().endsWith('.pdf')) {
          content = await parsePdfToText(buffer);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          content = await parseDocxToText(buffer);
        } else if (file.type?.startsWith('text/')) {
          content = buffer.toString('utf8');
        } else {
          results.push({
            filename: file.name,
            status: 'error',
            error: 'Unsupported file type. Please use PDF, DOCX, or text files.'
          });
          continue;
        }

        if (!content.trim()) {
          results.push({
            filename: file.name,
            status: 'error',
            error: 'No text content found in file'
          });
          continue;
        }

        // Create chunks with facility-specific metadata
        const chunkObjs = chunkText(content, { 
          chunkSize: 1200, 
          overlap: 120,
          title: file.name,
          metadata: { facility_id: profile.facility_id, facility_name: profile.facility_name, facility_state: profile.facility_state }
        });
        const texts = chunkObjs.map(c => c.content);
        
        // Generate embeddings
        const embeddings = await embedTexts(texts);

        // Prepare knowledge base entries with facility-specific information
        const autoCategory = documentType || detectCategory(file.name, content);

        const knowledgeEntries = chunkObjs.map((chunk, i) => ({
          facility_id: profile.facility_id,
          facility_name: profile.facility_name,
          state: profile.facility_state,
          category: autoCategory,
          title: `${profile.facility_name} - ${file.name}${chunkObjs.length > 1 ? ` (Part ${i + 1}/${chunkObjs.length})` : ''}`,
          content: chunk.content,
          source_url: null, // Internal document
          last_updated: new Date().toISOString(),
          embedding: embeddings[i],
          metadata: {
            original_filename: file.name,
            document_type: autoCategory,
            description: description,
            uploaded_by: user.id,
            uploaded_by_role: profile.role,
            facility_specific: true,
            chunk_index: i,
            total_chunks: chunkObjs.length,
            file_size: file.size,
            upload_date: new Date().toISOString()
          }
        }));

        // Insert into knowledge base
        const { error: insertError } = await supabaseAdmin
          .from("knowledge_base")
          .insert(knowledgeEntries);

        if (insertError) {
          console.error(`Failed to insert ${file.name}:`, insertError);
          results.push({
            filename: file.name,
            status: 'error',
            error: insertError.message
          });
        } else {
          results.push({
            filename: file.name,
            status: 'success',
            chunks: chunkObjs.length,
            characters: content.length
          });
          
          console.log(`Successfully uploaded ${file.name}: ${chunks.length} chunks, ${content.length} characters`);
        }

      } catch (error: any) {
        console.error(`Error processing ${file.name}:`, error);
        results.push({
          filename: file.name,
          status: 'error',
          error: error.message || 'Processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      ok: true,
      message: `Processed ${files.length} files: ${successCount} successful, ${errorCount} failed`,
      facility: profile.facility_name,
      results: results,
      summary: {
        total: files.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error: any) {
    console.error("Facility document upload error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to process documents" 
    }, { status: 500 });
  }
}

// GET endpoint to list facility documents
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's facility information
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, facility_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_name) {
      return NextResponse.json({ ok: true, documents: [] });
    }

    // Get facility-specific documents
    const { data: documents, error } = await supa
      .from("knowledge_base")
      .select("id, title, category, metadata, created_at, last_updated")
      .eq("facility_name", profile.facility_name)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Group by original filename
    const groupedDocs = documents.reduce((acc: any, doc: any) => {
      const filename = doc.metadata?.original_filename || doc.title;
      if (!acc[filename]) {
        acc[filename] = {
          filename,
          title: doc.title,
          category: doc.category,
          uploadDate: doc.metadata?.upload_date || doc.created_at,
          lastUpdated: doc.last_updated,
          chunks: 0,
          documentType: doc.metadata?.document_type || 'Document',
          description: doc.metadata?.description || ''
        };
      }
      acc[filename].chunks++;
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      facility: profile.facility_name,
      documents: Object.values(groupedDocs),
      totalDocuments: Object.keys(groupedDocs).length,
      totalChunks: documents.length
    });

  } catch (error: any) {
    console.error("List facility documents error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to list documents" 
    }, { status: 500 });
  }
}
