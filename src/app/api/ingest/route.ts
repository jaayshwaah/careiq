import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { parseDocxToText, parsePdfToText } from "@/lib/knowledge/parse";
import { chunkText } from "@/lib/knowledge/chunker";
import { embedTexts } from "@/lib/knowledge/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const adminKey = process.env.ADMIN_INGEST_KEY;
    const hdr = req.headers.get("x-admin-token") || "";
    if (adminKey && hdr !== adminKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supa = supabaseService();
    const ctype = req.headers.get("content-type") || "";
    const isJson = ctype.includes("application/json");
    const isMultipart = ctype.includes("multipart/form-data");

    let payload: any = {};
    let file: File | null = null;

    if (isJson) {
      payload = await req.json();
    } else if (isMultipart) {
      const form = await req.formData();
      payload = JSON.parse(String(form.get("payload") || "{}"));
      file = form.get("file") as unknown as File;
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported content-type" }, { status: 400 });
    }

    const {
      title = null,
      content = null,
      source_url = null,
      last_updated = null,
      category = null,
      facility_id = null,
      state = null, // optional state for categorization
    } = payload;

    let raw = content || "";
    if (!raw && file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const name = (file as any).name || "file";
      if (name.toLowerCase().endsWith(".pdf")) raw = await parsePdfToText(buf);
      else if (name.toLowerCase().endsWith(".docx")) raw = await parseDocxToText(buf);
      else raw = buf.toString("utf8");
    }

    if (!raw) {
      return NextResponse.json({ ok: false, error: "No content submitted" }, { status: 400 });
    }

    // Chunk into manageable pieces and embed
    const chunkObjs = chunkText(raw, { chunkSize: 1200, overlap: 120, title: title ?? undefined, metadata: { source_url, facility_id, state, category } });
    const chunkTexts = chunkObjs.map((c) => c.content);
    const embeddings = await embedTexts(chunkTexts);

    // Simple auto-categorization if none supplied
    const detectCategory = (name: string, txt: string): string => {
      const hay = `${name}\n${txt}`.toLowerCase();
      if (hay.match(/\b(42 cfr|cms|f\-?tag|f\d{3})\b/)) return "CMS Regulation";
      if (hay.match(/\b(joint commission|jcaho|accreditation)\b/)) return "Joint Commission";
      if (hay.match(/\b(cdc|infection control|public health)\b/)) return "CDC Guidelines";
      if (hay.match(/\b(state|texas|california|florida|new york|illinois)\b/)) return "State Regulation";
      return "Facility Policy";
    };

    const autoCategory = category || detectCategory(String(source_url || title || ""), raw);

    const toInsert = chunkObjs.map((chunk, i) => ({
      facility_id,
      state,
      category: autoCategory,
      title: title || `Doc chunk ${i + 1}`,
      content: chunk.content,
      source_url,
      last_updated,
      embedding: embeddings[i],
      metadata: { seq: i, total: chunkObjs.length, state, facility_id, category: autoCategory, source_url },
    }));

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: false, error: "No content extracted" }, { status: 400 });
    }

    const { error } = await supa.from("knowledge_base").insert(toInsert);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, inserted: toInsert.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "unknown error" }, { status: 500 });
  }
}
