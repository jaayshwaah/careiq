import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { parseDocxToText, parsePdfToText } from "@/lib/knowledge/parse";
import { chunkText } from "@/lib/knowledge/chunker";
import { embedTexts } from "@/lib/knowledge/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Simple admin guard
    const adminKey = process.env.ADMIN_INGEST_KEY;
    const hdr = req.headers.get("x-admin-token") || "";
    if (adminKey && hdr !== adminKey) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const facilityId = (form.get("facility_id") as string) || null;
    const category = (form.get("category") as string) || "general";
    const sourceUrl = (form.get("source_url") as string) || null;
    const lastUpdatedStr = (form.get("last_updated") as string) || null;

    if (!facilityId) {
      return NextResponse.json({ ok: false, error: "facility_id is required" }, { status: 400 });
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files provided" }, { status: 400 });
    }

    const supa = supabaseService();
    const toInsert: any[] = [];

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const name = file.name || "Untitled";
      const ext = name.toLowerCase().split(".").pop() || "";

      let text = "";
      if (ext === "pdf") text = await parsePdfToText(buf);
      else if (ext === "docx") text = await parseDocxToText(buf);
      else text = buf.toString("utf8");

      const chunks = chunkText(text, {
        title: name.replace(/\.[^/.]+$/, ""),
        metadata: { filename: name, mime: file.type },
      });

      // Embed in batches to avoid payload limits
      const batchSize = 64;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const slice = chunks.slice(i, i + batchSize);
        const embeddings = await embedTexts(slice.map((c) => c.content));

        slice.forEach((c, j) => {
          toInsert.push({
            facility_id: facilityId,
            category,
            title: c.title,
            content: c.content,
            metadata: c.metadata || {},
            source_url: sourceUrl,
            last_updated: lastUpdatedStr ? new Date(lastUpdatedStr).toISOString() : null,
            embedding: embeddings[j],
          });
        });
      }
    }

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