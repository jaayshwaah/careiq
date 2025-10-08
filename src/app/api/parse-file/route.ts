// src/app/api/parse-file/route.ts
// Server-side file parsing for bulk supply imports
import { NextRequest, NextResponse } from "next/server";
import { parseFileToText } from "@/lib/knowledge/parseFiles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse the file
    const content = await parseFileToText(buffer, file.name);
    
    return NextResponse.json({
      ok: true,
      content,
      filename: file.name
    });
  } catch (error: any) {
    console.error('File parsing error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Failed to parse file'
    }, { status: 500 });
  }
}


