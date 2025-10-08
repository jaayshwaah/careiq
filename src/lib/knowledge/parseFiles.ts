// src/lib/knowledge/parseFiles.ts
// Utilities for parsing various file types into text for AI consumption

import { parsePdfToText, parseDocxToText } from "./parse";

/**
 * Parse Excel files (.xlsx, .xls) to text
 */
export async function parseExcelToText(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    let allText = '';
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      allText += `\n=== Sheet: ${sheetName} ===\n`;
      
      // Convert sheet to CSV format (preserves structure better than JSON)
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      allText += csv + '\n';
    }
    
    return allText.trim();
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file');
  }
}

/**
 * Parse CSV files to text
 */
export async function parseCsvToText(buffer: Buffer): Promise<string> {
  try {
    // CSV is already text, just decode it
    const text = buffer.toString('utf-8');
    
    // Add some structure for better AI understanding
    const lines = text.split('\n');
    if (lines.length > 0) {
      return `CSV Data:\n${text}`;
    }
    
    return text;
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw new Error('Failed to parse CSV file');
  }
}

/**
 * Main function to parse any supported file type
 * Note: This function uses Node.js libraries and must run server-side only
 */
export async function parseFileToText(file: File | Buffer, filename: string): Promise<string> {
  // Ensure we're running server-side
  if (typeof window !== 'undefined') {
    throw new Error('parseFileToText must be called server-side only. Use /api/parse-file endpoint from client.');
  }
  
  const buffer = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
  const lowerName = filename.toLowerCase();
  
  if (lowerName.endsWith('.pdf')) {
    return await parsePdfToText(buffer);
  } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    return await parseDocxToText(buffer);
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return await parseExcelToText(buffer);
  } else if (lowerName.endsWith('.csv')) {
    return await parseCsvToText(buffer);
  } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    return buffer.toString('utf-8');
  } else {
    throw new Error(`Unsupported file type: ${filename}`);
  }
}

/**
 * Format file content for AI context with metadata
 */
export function formatFileForAI(filename: string, content: string, maxLength: number = 50000): string {
  // Truncate if too long (50k chars ~ 12k tokens)
  const truncated = content.length > maxLength 
    ? content.substring(0, maxLength) + '\n\n[... content truncated due to length ...]'
    : content;
  
  return `
═══════════════════════════════════════════════════════════════════
ATTACHED FILE: ${filename}
═══════════════════════════════════════════════════════════════════

${truncated}

═══════════════════════════════════════════════════════════════════
END OF FILE: ${filename}
═══════════════════════════════════════════════════════════════════
`;
}

