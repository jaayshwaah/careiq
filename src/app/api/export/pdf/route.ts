export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import PDFDocument from "pdfkit";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { title = "CareIQ Chat Export", messages = [] } = await req.json();

  const stream = new ReadableStream({
    start(controller) {
      const doc = new PDFDocument({ size: "LETTER", margin: 54 });

      const chunks: Buffer[] = [];
      const write = (chunk: any) => {
        if (chunk) controller.enqueue(new Uint8Array(chunk));
      };

      doc.on("data", write);
      doc.on("end", () => controller.close());

      // Header
      doc.fontSize(18).text(title, { align: "left" });
      doc.moveDown(0.5);
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(`Exported: ${new Date().toLocaleString()}`);
      doc.moveDown(1);
      doc.fillColor("#000");

      // Messages
      for (const m of messages) {
        const who = m.role === "user" ? "You" : "CareIQ";
        doc
          .fontSize(11)
          .fillColor("#111")
          .text(`${who}`, { continued: true })
          .fillColor("#999")
          .text(
            m.createdAt ? `  •  ${new Date(m.createdAt).toLocaleString()}` : ""
          );
        doc.moveDown(0.2);

        doc.fillColor("#000").fontSize(11).text(m.content || "", {
          width: 500,
        });
        doc.moveDown(0.6);
      }

      doc.end();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `attachment; filename="careiq-chat-${Date.now()}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
