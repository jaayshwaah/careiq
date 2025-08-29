// Schedule Import API - Import staff schedules with AI compliance validation
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { openai } from "@/lib/ai/providers";

interface ShiftData {
  employee_name: string;
  employee_id?: string;
  role: 'RN' | 'LPN' | 'CNA' | 'Unit Manager' | 'Other';
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  unit?: string;
  overtime?: boolean;
}

interface ComplianceIssue {
  type: 'staffing_ratio' | 'overtime_violation' | 'coverage_gap' | 'license_requirement' | 'double_booking';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  shift_id?: string;
  suggestions?: string[];
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

    // Get user profile for facility context
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_name, facility_state, role, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ ok: false, error: "User profile not found" }, { status: 400 });
    }

    // Parse form data
    const form = await req.formData();
    const file = form.get("schedule_file") as File;
    const importType = form.get("import_type")?.toString() || "weekly";
    const facilityCapacity = parseInt(form.get("facility_capacity")?.toString() || "0");

    if (!file) {
      return NextResponse.json({ 
        ok: false, 
        error: "No schedule file provided" 
      }, { status: 400 });
    }

    // Parse CSV file
    const text = await file.text();
    const lines = text.split('\n');
    const shifts: ShiftData[] = [];
    const parseErrors: string[] = [];

    // Skip header row
    const dataLines = lines[0].toLowerCase().includes('employee') ? lines.slice(1) : lines;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;

      try {
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        if (columns.length < 6) {
          parseErrors.push(`Row ${i + 2}: Insufficient columns (expected: Employee Name, Role, Date, Start Time, End Time, Hours)`);
          continue;
        }

        const startTime = columns[3];
        const endTime = columns[4];
        const hours = parseFloat(columns[5]) || 0;

        // Validate role
        const role = columns[1].toUpperCase();
        if (!['RN', 'LPN', 'CNA', 'UNIT MANAGER', 'OTHER'].includes(role)) {
          parseErrors.push(`Row ${i + 2}: Invalid role "${columns[1]}" (must be RN, LPN, CNA, Unit Manager, or Other)`);
          continue;
        }

        const shift: ShiftData = {
          employee_name: columns[0],
          employee_id: columns[6] || undefined, // Optional employee ID
          role: role === 'UNIT MANAGER' ? 'Unit Manager' : role as ShiftData['role'],
          date: columns[2],
          start_time: startTime,
          end_time: endTime,
          hours: hours,
          unit: columns[7] || undefined, // Optional unit
          overtime: hours > 8 // Simple overtime detection
        };

        shifts.push(shift);
      } catch (error) {
        parseErrors.push(`Row ${i + 2}: Parse error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (shifts.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "No valid shifts found in uploaded file",
        parseErrors 
      }, { status: 400 });
    }

    // AI-powered compliance checking
    const complianceIssues = await checkScheduleCompliance(shifts, facilityCapacity, profile);

    // Store schedules in database
    const scheduleEntries = shifts.map(shift => ({
      facility_id: profile.facility_id || profile.facility_name,
      facility_name: profile.facility_name,
      employee_name: shift.employee_name,
      employee_id: shift.employee_id,
      role: shift.role,
      shift_date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      hours: shift.hours,
      unit: shift.unit,
      is_overtime: shift.overtime,
      imported_by: user.id,
      imported_at: new Date().toISOString(),
      metadata: {
        import_type: importType,
        original_filename: file.name
      }
    }));

    const { error: insertError } = await supa
      .from("staff_schedules")
      .insert(scheduleEntries);

    if (insertError) {
      console.error("Failed to insert schedules:", insertError);
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to save schedules to database" 
      }, { status: 500 });
    }

    // Store compliance issues
    if (complianceIssues.length > 0) {
      const complianceEntries = complianceIssues.map(issue => ({
        facility_name: profile.facility_name,
        issue_type: issue.type,
        severity: issue.severity,
        message: issue.message,
        suggestions: issue.suggestions || [],
        created_by: user.id,
        created_at: new Date().toISOString(),
        metadata: {
          import_filename: file.name,
          shift_id: issue.shift_id
        }
      }));

      await supa
        .from("compliance_issues")
        .insert(complianceEntries);
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully imported ${shifts.length} shifts`,
      summary: {
        total_shifts: shifts.length,
        parse_errors: parseErrors.length,
        compliance_issues: complianceIssues.length,
        critical_issues: complianceIssues.filter(i => i.severity === 'critical').length,
        warnings: complianceIssues.filter(i => i.severity === 'warning').length
      },
      shifts: shifts,
      compliance_issues: complianceIssues,
      parse_errors: parseErrors
    });

  } catch (error: any) {
    console.error("Schedule import error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to import schedules" 
    }, { status: 500 });
  }
}

async function checkScheduleCompliance(
  shifts: ShiftData[], 
  facilityCapacity: number,
  profile: any
): Promise<ComplianceIssue[]> {
  const issues: ComplianceIssue[] = [];

  // Group shifts by date for daily analysis
  const shiftsByDate = shifts.reduce((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = [];
    acc[shift.date].push(shift);
    return acc;
  }, {} as Record<string, ShiftData[]>);

  // Check each day for compliance issues
  for (const [date, dayShifts] of Object.entries(shiftsByDate)) {
    const dailyIssues = await checkDailyCompliance(date, dayShifts, facilityCapacity, profile);
    issues.push(...dailyIssues);
  }

  // Check for overtime violations across the week
  const overtimeIssues = checkOvertimeCompliance(shifts);
  issues.push(...overtimeIssues);

  // AI-powered analysis for complex patterns
  const aiIssues = await aiComplianceAnalysis(shifts, facilityCapacity, profile);
  issues.push(...aiIssues);

  return issues;
}

async function checkDailyCompliance(
  date: string, 
  dayShifts: ShiftData[], 
  facilityCapacity: number,
  profile: any
): Promise<ComplianceIssue[]> {
  const issues: ComplianceIssue[] = [];

  // Calculate nursing hours by role
  const rnHours = dayShifts.filter(s => s.role === 'RN').reduce((sum, s) => sum + s.hours, 0);
  const lpnHours = dayShifts.filter(s => s.role === 'LPN').reduce((sum, s) => sum + s.hours, 0);
  const cnaHours = dayShifts.filter(s => s.role === 'CNA').reduce((sum, s) => sum + s.hours, 0);
  const totalNursingHours = rnHours + lpnHours + cnaHours;

  // Assume 85% capacity as a reasonable estimate if not provided
  const estimatedCensus = facilityCapacity > 0 ? facilityCapacity * 0.85 : 45;
  const ppd = totalNursingHours / estimatedCensus;

  // CMS minimum requirements
  const minPPD = 3.2;
  const minRNPPD = 0.75;
  const actualRNPPD = rnHours / estimatedCensus;

  // Check PPD requirements
  if (ppd < minPPD) {
    issues.push({
      type: 'staffing_ratio',
      severity: 'critical',
      message: `${date}: Total nursing PPD (${ppd.toFixed(2)}) below CMS minimum (${minPPD})`,
      suggestions: [
        'Add additional nursing hours to meet minimum requirements',
        'Consider adjusting staff assignments or schedules',
        'Review census projections for accuracy'
      ]
    });
  }

  if (actualRNPPD < minRNPPD) {
    issues.push({
      type: 'staffing_ratio',
      severity: 'critical',
      message: `${date}: RN PPD (${actualRNPPD.toFixed(2)}) below CMS minimum (${minRNPPD})`,
      suggestions: [
        'Increase RN staffing hours',
        'Consider converting some LPN hours to RN hours',
        'Ensure 24-hour RN coverage is maintained'
      ]
    });
  }

  // Check for 24-hour coverage gaps
  const coverageIssues = checkCoverageGaps(date, dayShifts);
  issues.push(...coverageIssues);

  // Check for double bookings
  const doubleBookings = checkDoubleBookings(dayShifts);
  issues.push(...doubleBookings);

  return issues;
}

function checkCoverageGaps(date: string, dayShifts: ShiftData[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    hasRN: false,
    hasLPN: false,
    hasCNA: false,
    totalStaff: 0
  }));

  // Map shifts to time slots
  dayShifts.forEach(shift => {
    const startHour = parseInt(shift.start_time.split(':')[0]);
    const endHour = parseInt(shift.end_time.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slot = timeSlots[hour % 24];
      slot.totalStaff++;
      
      switch (shift.role) {
        case 'RN':
          slot.hasRN = true;
          break;
        case 'LPN':
          slot.hasLPN = true;
          break;
        case 'CNA':
          slot.hasCNA = true;
          break;
      }
    }
  });

  // Check for gaps in coverage
  timeSlots.forEach(slot => {
    if (!slot.hasRN) {
      issues.push({
        type: 'coverage_gap',
        severity: 'critical',
        message: `${date} Hour ${slot.hour}:00: No RN coverage (CMS requires 24/7 RN presence)`,
        suggestions: [
          'Schedule an RN for this time period',
          'Extend existing RN shift to cover gap',
          'Consider on-call RN coverage'
        ]
      });
    }

    if (slot.totalStaff < 2) {
      issues.push({
        type: 'coverage_gap',
        severity: 'warning',
        message: `${date} Hour ${slot.hour}:00: Minimal staffing (${slot.totalStaff} staff member(s))`,
        suggestions: [
          'Consider additional staffing for resident safety',
          'Review acuity levels for this time period'
        ]
      });
    }
  });

  return issues;
}

function checkDoubleBookings(dayShifts: ShiftData[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const employeeShifts = new Map<string, ShiftData[]>();

  // Group by employee
  dayShifts.forEach(shift => {
    const key = shift.employee_name.toLowerCase().trim();
    if (!employeeShifts.has(key)) {
      employeeShifts.set(key, []);
    }
    employeeShifts.get(key)!.push(shift);
  });

  // Check for overlapping shifts
  employeeShifts.forEach((shifts, employeeName) => {
    if (shifts.length > 1) {
      for (let i = 0; i < shifts.length; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
          const shift1 = shifts[i];
          const shift2 = shifts[j];
          
          // Check for time overlap
          const start1 = parseInt(shift1.start_time.replace(':', ''));
          const end1 = parseInt(shift1.end_time.replace(':', ''));
          const start2 = parseInt(shift2.start_time.replace(':', ''));
          const end2 = parseInt(shift2.end_time.replace(':', ''));

          if (start1 < end2 && start2 < end1) {
            issues.push({
              type: 'double_booking',
              severity: 'critical',
              message: `${employeeName} has overlapping shifts: ${shift1.start_time}-${shift1.end_time} and ${shift2.start_time}-${shift2.end_time}`,
              suggestions: [
                'Adjust shift times to eliminate overlap',
                'Assign one shift to different employee',
                'Verify employee availability'
              ]
            });
          }
        }
      }
    }
  });

  return issues;
}

function checkOvertimeCompliance(shifts: ShiftData[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const weeklyHours = new Map<string, number>();

  // Calculate weekly hours per employee
  shifts.forEach(shift => {
    const key = shift.employee_name.toLowerCase().trim();
    weeklyHours.set(key, (weeklyHours.get(key) || 0) + shift.hours);
  });

  weeklyHours.forEach((hours, employeeName) => {
    if (hours > 40) {
      const overtimeHours = hours - 40;
      issues.push({
        type: 'overtime_violation',
        severity: overtimeHours > 16 ? 'critical' : 'warning',
        message: `${employeeName} scheduled for ${hours} hours (${overtimeHours} overtime hours)`,
        suggestions: [
          'Review if overtime is necessary and approved',
          'Consider redistributing hours to other staff',
          'Ensure compliance with labor regulations'
        ]
      });
    }
  });

  return issues;
}

async function aiComplianceAnalysis(
  shifts: ShiftData[], 
  facilityCapacity: number,
  profile: any
): Promise<ComplianceIssue[]> {
  try {
    const systemPrompt = `You are CareIQ, an AI assistant specialized in nursing home staffing compliance. 
Analyze the provided staff schedule for potential compliance issues beyond basic PPD calculations.

Look for:
1. Patterns that might indicate staffing problems
2. Skill mix issues (appropriate balance of RN/LPN/CNA)
3. Continuity of care concerns
4. State-specific requirements for ${profile.facility_state}
5. Experience level distribution
6. Weekend/holiday staffing adequacy

Return a JSON array of compliance issues with this format:
[{
  "type": "staffing_ratio|overtime_violation|coverage_gap|license_requirement|skill_mix",
  "severity": "critical|warning|info",
  "message": "Description of the issue",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}]

Only return issues that aren't already covered by basic PPD and coverage checks.`;

    const userPrompt = `Facility: ${profile.facility_name} (${profile.facility_state})
Capacity: ${facilityCapacity} beds

Schedule Data:
${JSON.stringify(shifts, null, 2)}

Please analyze this schedule for advanced compliance issues.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) return [];

    try {
      const aiIssues = JSON.parse(aiResponse);
      return Array.isArray(aiIssues) ? aiIssues : [];
    } catch (parseError) {
      console.error("Failed to parse AI compliance analysis:", parseError);
      return [];
    }

  } catch (error) {
    console.error("AI compliance analysis failed:", error);
    return [];
  }
}