import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { parseDocxToText, parsePdfToText } from "@/lib/knowledge/parse";
import { chunkText } from "@/lib/knowledge/chunker";
import { embedTexts } from "@/lib/knowledge/embed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const facilityId = (form.get("facility_id") as string) || null;
    if (!facilityId) {
      return NextResponse.json({ ok: false, error: "facility_id is required" }, { status: 400 });
    }

    const category = (form.get("category") as string) || "other";
    const title = (form.get("title") as string) || "Untitled";
    const sourceUrl = (form.get("source_url") as string) || null;
    const lastUpdatedStr = (form.get("last_updated") as string) || null;

    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const lower = file.name.toLowerCase();
    let rawText = "";
    if (lower.endsWith(".pdf")) rawText = await parsePdfToText(buffer);
    else if (lower.endsWith(".docx")) rawText = await parseDocxToText(buffer);
    else if (lower.endsWith(".txt") || lower.endsWith(".md")) rawText = buffer.toString("utf-8");
    else return NextResponse.json({ ok: false, error: "Unsupported file type" }, { status: 400 });

    if (!rawText.trim()) {
      return NextResponse.json({ ok: false, error: "No extractable text" }, { status: 400 });
    }

    const chunks = chunkText(title, rawText, {
      chunkSize: 1200,
      overlap: 150,
      metadata: { filename: file.name, category },
    });

    const embeddings = await embedTexts(chunks.map((c) => c.content));

    const rows = chunks.map((c, i) => ({
      facility_id: facilityId,
      category,
      title: c.title,
      content: c.content,
      metadata: c.metadata,
      embedding: embeddings[i],
      source_url: sourceUrl,
      last_updated: lastUpdatedStr ? new Date(lastUpdatedStr).toISOString() : null,
    }));

    const supa = supabaseService();
    const { error } = await supa.from("knowledge_base").insert(rows);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "unknown error" }, { status: 500 });
  }
}
