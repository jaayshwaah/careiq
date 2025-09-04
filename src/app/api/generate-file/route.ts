// src/app/api/generate-file/route.ts - Dynamic file generation endpoint
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface FileGenerationRequest {
  type: 'excel' | 'pdf' | 'word';
  template: string;
  data: Record<string, any>;
  filename?: string;
  chatId: string;
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.PDF_EXPORT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { type, template, data, filename, chatId }: FileGenerationRequest = await req.json();
    
    if (!type || !template || !data || !chatId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Skip profiles table entirely to avoid RLS recursion issues
    // Use basic fallback profile data for file generation
    const profile = {
      facility_name: 'Healthcare Facility',
      facility_state: null,
      full_name: user?.email?.split('@')[0] || 'User'
    };
    
    console.log('Using fallback profile data for file generation');

    let fileBuffer: Buffer;
    let contentType: string;
    let defaultFilename: string;

    switch (type) {
      case 'excel':
        ({ buffer: fileBuffer, contentType, filename: defaultFilename } = await generateExcel(template, data, profile));
        break;
      case 'pdf':
        ({ buffer: fileBuffer, contentType, filename: defaultFilename } = await generatePDF(template, data, profile));
        break;
      case 'word':
        ({ buffer: fileBuffer, contentType, filename: defaultFilename } = await generateWord(template, data, profile));
        break;
      default:
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const finalFilename = filename || defaultFilename;

    // Store file metadata in database for tracking
    await supa.from("generated_files").insert({
      chat_id: chatId,
      filename: finalFilename,
      file_type: type,
      template_used: template,
      generated_by: user.id,
      file_size: fileBuffer.length
    });

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("File generation error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "File generation failed" 
    }, { status: 500 });
  }
}

async function generateExcel(template: string, data: Record<string, any>, profile: any) {
  const workbook = new ExcelJS.Workbook();
  
  switch (template) {
    case 'survey-prep-checklist':
      return generateSurveyPrepChecklist(workbook, data, profile);
    case 'staff-training-matrix':
      return generateStaffTrainingMatrix(workbook, data, profile);
    case 'incident-report':
      return generateIncidentReport(workbook, data, profile);
    case 'policy-review-tracker':
      return generatePolicyReviewTracker(workbook, data, profile);
    case 'regulatory-compliance-summary':
      return generateComplianceSummary(workbook, data, profile);
    default:
      return generateGenericDataSheet(workbook, data, profile, template);
  }
}

async function generateSurveyPrepChecklist(workbook: ExcelJS.Workbook, data: Record<string, any>, profile: any) {
  const worksheet = workbook.addWorksheet('Survey Prep Checklist');
  
  // Header
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = `Survey Preparation Checklist - ${profile?.facility_name || 'Facility'}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Date and details
  worksheet.getCell('A3').value = 'Preparation Date:';
  worksheet.getCell('B3').value = new Date().toLocaleDateString();
  worksheet.getCell('A4').value = 'Survey Type:';
  worksheet.getCell('B4').value = data.surveyType || 'Standard Annual Survey';

  // Checklist items
  const checklistItems = data.items || [
    'Review all policies and procedures',
    'Update staff training records',
    'Conduct facility mock survey',
    'Review MDS assessments for accuracy',
    'Inspect environment for safety hazards',
    'Verify medication management processes',
    'Check infection control protocols',
    'Review resident care plans',
    'Ensure proper documentation',
    'Staff orientation on survey process'
  ];

  worksheet.getCell('A6').value = 'Checklist Items';
  worksheet.getCell('A6').font = { bold: true };
  worksheet.getCell('B6').value = 'Status';
  worksheet.getCell('B6').font = { bold: true };
  worksheet.getCell('C6').value = 'Assigned To';
  worksheet.getCell('C6').font = { bold: true };
  worksheet.getCell('D6').value = 'Due Date';
  worksheet.getCell('D6').font = { bold: true };
  worksheet.getCell('E6').value = 'Notes';
  worksheet.getCell('E6').font = { bold: true };

  checklistItems.forEach((item, index) => {
    const row = 7 + index;
    worksheet.getCell(`A${row}`).value = item;
    worksheet.getCell(`B${row}`).value = 'Pending';
    worksheet.getCell(`C${row}`).value = '';
    worksheet.getCell(`D${row}`).value = '';
    worksheet.getCell(`E${row}`).value = '';
  });

  // Auto-size columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `survey-prep-checklist-${Date.now()}.xlsx`
  };
}

async function generateStaffTrainingMatrix(workbook: ExcelJS.Workbook, data: Record<string, any>, profile: any) {
  const worksheet = workbook.addWorksheet('Training Matrix');
  
  // Header
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = `Staff Training Matrix - ${profile?.facility_name || 'Facility'}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Column headers
  const headers = ['Staff Name', 'Position', 'Hire Date', 'Basic Training', 'Infection Control', 'Emergency Prep', 'Annual Competency', 'Next Due'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
  });

  // Sample data or use provided data
  const staffData = data.staff || [
    { name: 'Sample Staff 1', position: 'CNA', hireDate: '2023-01-15' },
    { name: 'Sample Staff 2', position: 'LPN', hireDate: '2023-03-20' },
    { name: 'Sample Staff 3', position: 'RN', hireDate: '2023-02-10' }
  ];

  staffData.forEach((staff, index) => {
    const row = 4 + index;
    worksheet.getCell(row, 1).value = staff.name;
    worksheet.getCell(row, 2).value = staff.position;
    worksheet.getCell(row, 3).value = staff.hireDate;
    worksheet.getCell(row, 4).value = 'Completed';
    worksheet.getCell(row, 5).value = 'Due';
    worksheet.getCell(row, 6).value = 'Completed';
    worksheet.getCell(row, 7).value = 'Scheduled';
    worksheet.getCell(row, 8).value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  });

  // Auto-size columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `staff-training-matrix-${Date.now()}.xlsx`
  };
}

async function generateIncidentReport(workbook: ExcelJS.Workbook, data: Record<string, any>, profile: any) {
  const worksheet = workbook.addWorksheet('Incident Report');
  
  // Header
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = `Incident Report - ${profile?.facility_name || 'Facility'}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Report details
  const fields = [
    ['Date of Incident:', data.incidentDate || new Date().toLocaleDateString()],
    ['Time of Incident:', data.incidentTime || ''],
    ['Resident Name:', data.residentName || ''],
    ['Room Number:', data.roomNumber || ''],
    ['Type of Incident:', data.incidentType || ''],
    ['Description:', data.description || ''],
    ['Witnesses:', data.witnesses || ''],
    ['Action Taken:', data.actionTaken || ''],
    ['Reported By:', data.reportedBy || profile?.full_name || ''],
    ['Report Date:', new Date().toLocaleDateString()]
  ];

  fields.forEach(([label, value], index) => {
    const row = 3 + index;
    worksheet.getCell(`A${row}`).value = label;
    worksheet.getCell(`A${row}`).font = { bold: true };
    worksheet.getCell(`B${row}`).value = value;
  });

  // Auto-size columns
  worksheet.getColumn('A').width = 20;
  worksheet.getColumn('B').width = 40;

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `incident-report-${Date.now()}.xlsx`
  };
}

async function generatePolicyReviewTracker(workbook: ExcelJS.Workbook, data: Record<string, any>, profile: any) {
  const worksheet = workbook.addWorksheet('Policy Review Tracker');
  
  // Header
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = `Policy Review Tracker - ${profile?.facility_name || 'Facility'}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Column headers
  const headers = ['Policy Name', 'Category', 'Last Review Date', 'Review Cycle', 'Next Due', 'Status'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
  });

  const policies = data.policies || [
    { name: 'Infection Control Policy', category: 'Safety', lastReview: '2024-01-15', cycle: 'Annual' },
    { name: 'Resident Rights Policy', category: 'Compliance', lastReview: '2024-02-20', cycle: 'Annual' },
    { name: 'Emergency Preparedness', category: 'Safety', lastReview: '2024-01-10', cycle: 'Annual' }
  ];

  policies.forEach((policy, index) => {
    const row = 4 + index;
    worksheet.getCell(row, 1).value = policy.name;
    worksheet.getCell(row, 2).value = policy.category;
    worksheet.getCell(row, 3).value = policy.lastReview;
    worksheet.getCell(row, 4).value = policy.cycle;
    worksheet.getCell(row, 5).value = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString();
    worksheet.getCell(row, 6).value = 'Current';
  });

  // Auto-size columns
  worksheet.columns.forEach(column => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `policy-review-tracker-${Date.now()}.xlsx`
  };
}

async function generateComplianceSummary(workbook: ExcelJS.Workbook, data: Record<string, any>, profile: any) {
  const worksheet = workbook.addWorksheet('Compliance Summary');
  
  // Header
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = `Regulatory Compliance Summary - ${profile?.facility_name || 'Facility'}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  // Summary data
  worksheet.getCell('A3').value = 'Reporting Period:';
  worksheet.getCell('B3').value = data.period || `${new Date().getFullYear()} Q1`;
  
  worksheet.getCell('A4').value = 'Last Survey Date:';
  worksheet.getCell('B4').value = data.lastSurvey || '2023-09-15';

  // Compliance areas
  const headers = ['Compliance Area', 'Status', 'Score', 'Issues', 'Action Required'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(6, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
  });

  const complianceAreas = [
    { area: 'Resident Rights', status: 'Compliant', score: '95%', issues: '0', action: 'None' },
    { area: 'Quality of Care', status: 'Compliant', score: '92%', issues: '1', action: 'Review care plans' },
    { area: 'Nursing Services', status: 'Compliant', score: '94%', issues: '0', action: 'None' },
    { area: 'Dietary Services', status: 'Needs Improvement', score: '87%', issues: '2', action: 'Staff training' },
    { area: 'Pharmacy Services', status: 'Compliant', score: '96%', issues: '0', action: 'None' }
  ];

  complianceAreas.forEach((area, index) => {
    const row = 7 + index;
    worksheet.getCell(row, 1).value = area.area;
    worksheet.getCell(row, 2).value = area.status;
    worksheet.getCell(row, 3).value = area.score;
    worksheet.getCell(row, 4).value = area.issues;
    worksheet.getCell(row, 5).value = area.action;
    
    // Color code status
    if (area.status === 'Needs Improvement') {
      worksheet.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    } else if (area.status === 'Compliant') {
      worksheet.getCell(row, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
    }
  });

  // Auto-size columns
  worksheet.columns.forEach(column => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `compliance-summary-${Date.now()}.xlsx`
  };
}

async function generateGenericDataSheet(workbook: ExcelJS.Workbook, data: Record<string, any>, profile: any, template: string) {
  const worksheet = workbook.addWorksheet('Data Sheet');
  
  worksheet.getCell('A1').value = `${template} - ${profile?.facility_name || 'Facility'}`;
  worksheet.getCell('A1').font = { bold: true, size: 16 };

  // Convert data to tabular format
  const entries = Object.entries(data);
  entries.forEach(([key, value], index) => {
    const row = 3 + index;
    worksheet.getCell(`A${row}`).value = key;
    worksheet.getCell(`B${row}`).value = typeof value === 'object' ? JSON.stringify(value) : value;
  });

  worksheet.getColumn('A').width = 25;
  worksheet.getColumn('B').width = 50;

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${template}-${Date.now()}.xlsx`
  };
}

async function generatePDF(template: string, data: Record<string, any>, profile: any) {
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  
  const html = await generateHTMLContent(template, data, profile);
  await page.setContent(html);
  
  const buffer = await page.pdf({
    format: 'A4',
    margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' }
  });

  await browser.close();

  return {
    buffer,
    contentType: 'application/pdf',
    filename: `${template}-${Date.now()}.pdf`
  };
}

async function generateHTMLContent(template: string, data: Record<string, any>, profile: any): Promise<string> {
  const facilityName = profile?.facility_name || 'Healthcare Facility';
  const currentDate = new Date().toLocaleDateString();

  switch (template) {
    case 'policy-template':
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .policy-number { float: right; font-weight: bold; }
            .section { margin-bottom: 25px; }
            .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="policy-number">Policy #: ${data.policyNumber || 'POL-001'}</div>
            <h1>${data.title || 'New Policy'}</h1>
            <p><strong>${facilityName}</strong></p>
            <p>Effective Date: ${data.effectiveDate || currentDate}</p>
          </div>
          
          <div class="section">
            <h2>Purpose</h2>
            <p>${data.purpose || 'To establish guidelines and procedures for...'}</p>
          </div>
          
          <div class="section">
            <h2>Policy Statement</h2>
            <p>${data.policyStatement || 'It is the policy of this facility to...'}</p>
          </div>
          
          <div class="section">
            <h2>Procedure</h2>
            <p>${data.procedure || '1. Staff will...\n2. Documentation shall...\n3. Training will be provided...'}</p>
          </div>
          
          <div class="section">
            <h2>References</h2>
            <p>${data.references || '42 CFR 483.12 - Resident Behavior and Facility Practices'}</p>
          </div>
        </body>
        </html>
      `;
    
    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${template}</h1>
            <p><strong>${facilityName}</strong></p>
            <p>Generated: ${currentDate}</p>
          </div>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </body>
        </html>
      `;
  }
}

async function generateWord(template: string, data: Record<string, any>, profile: any) {
  // For now, generate HTML and return as .doc (which browsers can open)
  const html = await generateHTMLContent(template, data, profile);
  
  return {
    buffer: Buffer.from(html),
    contentType: 'application/msword',
    filename: `${template}-${Date.now()}.doc`
  };
}