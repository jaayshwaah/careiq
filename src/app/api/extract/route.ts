import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("files");

    const results: Array<{ name: string; text?: string; error?: string }> = [];

    for (const f of files) {
      if (!(f instanceof File)) continue;

      const name = f.name;
      const type = (f.type || "").toLowerCase();
      const ab = await f.arrayBuffer();
      const buf = Buffer.from(ab);

      try {
        if (type.startsWith("text/") || /\.txt$|\.md$|\.csv$/i.test(name)) {
          results.push({ name, text: buf.toString("utf-8") });
          continue;
        }

        if (type === "application/json" || /\.json$/i.test(name)) {
          const obj = JSON.parse(buf.toString("utf-8"));
          results.push({ name, text: JSON.stringify(obj, null, 2) });
          continue;
        }

        if (type === "application/pdf" || /\.pdf$/i.test(name)) {
          // Try pdf-parse if installed
          try {
            const pdfParse = (await import("pdf-parse")).default as any;
            const data = await pdfParse(buf);
            results.push({ name, text: String(data?.text || "") });
          } catch {
            results.push({
              name,
              error:
                "PDF extraction not available (install pdf-parse). You can still paste text manually.",
            });
          }
          continue;
        }

        if (
          type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          /\.docx$/i.test(name)
        ) {
          // Try mammoth if installed
          try {
            const mammoth = await import("mammoth");
            const { value } = await mammoth.extractRawText({ buffer: buf });
            results.push({ name, text: String(value || "") });
          } catch {
            results.push({
              name,
              error:
                "DOCX extraction not available (install mammoth). You can still paste text manually.",
            });
          }
          continue;
        }

        // Fallback: treat as binary/unsupported
        results.push({
          name,
          error:
            `Unsupported file type (${type || "unknown"}). Try .txt, .md, .csv, .json, .pdf, or .docx.`,
        });
      } catch (e: any) {
        results.push({ name, error: e?.message || "Failed to read file" });
      }
    }

    return Response.json({ ok: true, files: results }, { status: 200 });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || "extract error" },
      { status: 500 }
    );
  }
}
