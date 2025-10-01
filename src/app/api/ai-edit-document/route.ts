// AI Document Editor API - Version-controlled document editing with AI assistance
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { providerFromEnv } from "@/lib/ai/providers";

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  changes_made: string;
  edited_by: string;
  created_at: string;
  ai_suggestions: string[];
  approval_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      document_id, 
      original_content, 
      edit_instruction, 
      document_type = 'Facility Policy',
      save_as_draft = true 
    } = body;

    if (!document_id || !original_content || !edit_instruction) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: document_id, original_content, edit_instruction" 
      }, { status: 400 });
    }

    // Get user profile for facility context
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_name, facility_state, role, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ ok: false, error: "User profile not found" }, { status: 400 });
    }

    // Create AI prompt for document editing
    const systemPrompt = `You are CareIQ, an AI assistant specialized in healthcare compliance document editing for nursing homes and long-term care facilities.

Your task is to edit healthcare documents according to user instructions while maintaining:
1. Regulatory compliance (CMS, state regulations, CDC guidelines)
2. Professional healthcare language and tone
3. Accuracy of medical and regulatory information
4. Proper formatting and structure

Context:
- Facility: ${profile.facility_name}
- State: ${profile.facility_state}
- Document Type: ${document_type}
- Editor: ${profile.full_name} (${profile.role})

Instructions for editing:
- Make the requested changes while preserving compliance requirements
- Ensure all medical terminology is accurate
- Maintain professional healthcare document formatting
- Add necessary regulatory references where appropriate
- Flag any potential compliance issues in your response

IMPORTANT: Return a JSON object with this structure:
{
  "edited_content": "The edited document content",
  "changes_summary": "Summary of changes made",
  "compliance_notes": ["Any compliance considerations"],
  "suggestions": ["Additional improvement suggestions"],
  "requires_review": boolean (true if legal/clinical review needed)
}`;

    const userPrompt = `Please edit this ${document_type} document according to the following instruction:

INSTRUCTION: ${edit_instruction}

ORIGINAL DOCUMENT:
${original_content}

Please provide the edited version following the JSON format specified in the system prompt.`;

    // Call OpenAI for document editing
    const provider = providerFromEnv();
    const aiResponse = await provider.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], {
      temperature: 0.3, // Lower temperature for more consistent editing
      max_tokens: 4000
    });
    if (!aiResponse) {
      return NextResponse.json({ 
        ok: false, 
        error: "No response from AI editor" 
      }, { status: 500 });
    }

    let editResult;
    try {
      editResult = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback if AI doesn't return proper JSON
      editResult = {
        edited_content: aiResponse,
        changes_summary: "AI editing completed",
        compliance_notes: ["Please review for compliance"],
        suggestions: [],
        requires_review: true
      };
    }

    // Get current document version
    const { data: currentDoc, error: docError } = await supa
      .from("knowledge_base")
      .select("metadata")
      .eq("id", document_id)
      .single();

    if (docError) {
      return NextResponse.json({ 
        ok: false, 
        error: "Original document not found" 
      }, { status: 404 });
    }

    const currentVersion = currentDoc.metadata?.version_number || 1;
    const newVersionNumber = currentVersion + 1;

    // Create document version record
    const versionRecord: Partial<DocumentVersion> = {
      document_id,
      version_number: newVersionNumber,
      content: editResult.edited_content,
      changes_made: editResult.changes_summary,
      edited_by: user.id,
      ai_suggestions: editResult.suggestions || [],
      approval_status: save_as_draft ? 'draft' : 'pending_review'
    };

    // Save version to database (assuming we have a document_versions table)
    const { data: savedVersion, error: versionError } = await supa
      .from("document_versions")
      .insert(versionRecord)
      .select()
      .single();

    if (versionError) {
      console.error("Failed to save document version:", versionError);
      // Continue anyway - return the AI result even if version tracking fails
    }

    // Update original document metadata to reference new version
    if (savedVersion && !save_as_draft) {
      await supa
        .from("knowledge_base")
        .update({
          content: editResult.edited_content,
          last_updated: new Date().toISOString(),
          metadata: {
            ...currentDoc.metadata,
            version_number: newVersionNumber,
            last_edited_by: user.id,
            last_edit_date: new Date().toISOString(),
            requires_review: editResult.requires_review
          }
        })
        .eq("id", document_id);
    }

    return NextResponse.json({
      ok: true,
      edited_content: editResult.edited_content,
      changes_summary: editResult.changes_summary,
      compliance_notes: editResult.compliance_notes || [],
      suggestions: editResult.suggestions || [],
      requires_review: editResult.requires_review || false,
      version_number: newVersionNumber,
      version_id: savedVersion?.id,
      saved_as_draft: save_as_draft,
      message: save_as_draft ? "Document edited and saved as draft" : "Document edited and updated"
    });

  } catch (error: any) {
    console.error("AI document editing error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to edit document" 
    }, { status: 500 });
  }
}

// GET endpoint to retrieve document versions
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const document_id = searchParams.get('document_id');

    if (!document_id) {
      return NextResponse.json({ 
        ok: false, 
        error: "document_id parameter required" 
      }, { status: 400 });
    }

    // Get all versions for this document
    const { data: versions, error: versionsError } = await supa
      .from("document_versions")
      .select(`
        id,
        version_number,
        changes_made,
        created_at,
        approval_status,
        ai_suggestions,
        edited_by,
        profiles!edited_by(full_name, role)
      `)
      .eq("document_id", document_id)
      .order("version_number", { ascending: false });

    if (versionsError) {
      return NextResponse.json({ 
        ok: false, 
        error: versionsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      document_id,
      versions: versions || [],
      total_versions: versions?.length || 0
    });

  } catch (error: any) {
    console.error("Get document versions error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to retrieve versions" 
    }, { status: 500 });
  }
}