// Real-time Data Sync API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

interface RealtimeSyncRequest {
  integration_type: 'ehr' | 'census' | 'staffing' | 'quality' | 'supply';
  facility_id: string;
  sync_data: any;
  sync_type: 'full' | 'incremental' | 'real_time';
  last_sync_timestamp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.WRITE);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      integration_type,
      facility_id,
      sync_data,
      sync_type,
      last_sync_timestamp
    }: RealtimeSyncRequest = await req.json();

    if (!integration_type || !facility_id || !sync_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Process sync based on integration type
    const syncResult = await processRealtimeSync({
      integration_type,
      facility_id,
      sync_data,
      sync_type,
      last_sync_timestamp,
      supa
    });

    // Log sync activity
    await logSyncActivity({
      facility_id,
      integration_type,
      sync_type,
      records_processed: syncResult.records_processed,
      status: syncResult.status,
      supa
    });

    return NextResponse.json({
      sync_result: syncResult,
      message: "Real-time sync completed successfully"
    });

  } catch (error: any) {
    console.error('Real-time sync error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function processRealtimeSync({
  integration_type,
  facility_id,
  sync_data,
  sync_type,
  last_sync_timestamp,
  supa
}: {
  integration_type: string;
  facility_id: string;
  sync_data: any;
  sync_type: string;
  last_sync_timestamp?: string;
  supa: any;
}) {
  let recordsProcessed = 0;
  let errors: string[] = [];

  try {
    switch (integration_type) {
      case 'ehr':
        const ehrResult = await syncEHRData({
          facility_id,
          sync_data,
          sync_type,
          last_sync_timestamp,
          supa
        });
        recordsProcessed = ehrResult.records_processed;
        errors = ehrResult.errors;
        break;

      case 'census':
        const censusResult = await syncCensusData({
          facility_id,
          sync_data,
          sync_type,
          last_sync_timestamp,
          supa
        });
        recordsProcessed = censusResult.records_processed;
        errors = censusResult.errors;
        break;

      case 'staffing':
        const staffingResult = await syncStaffingData({
          facility_id,
          sync_data,
          sync_type,
          last_sync_timestamp,
          supa
        });
        recordsProcessed = staffingResult.records_processed;
        errors = staffingResult.errors;
        break;

      case 'quality':
        const qualityResult = await syncQualityData({
          facility_id,
          sync_data,
          sync_type,
          last_sync_timestamp,
          supa
        });
        recordsProcessed = qualityResult.records_processed;
        errors = qualityResult.errors;
        break;

      case 'supply':
        const supplyResult = await syncSupplyData({
          facility_id,
          sync_data,
          sync_type,
          last_sync_timestamp,
          supa
        });
        recordsProcessed = supplyResult.records_processed;
        errors = supplyResult.errors;
        break;

      default:
        throw new Error(`Unsupported integration type: ${integration_type}`);
    }

    return {
      status: errors.length === 0 ? 'success' : 'partial_success',
      records_processed: recordsProcessed,
      errors: errors,
      sync_timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Sync processing error:', error);
    return {
      status: 'error',
      records_processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      sync_timestamp: new Date().toISOString()
    };
  }
}

async function syncEHRData({
  facility_id,
  sync_data,
  sync_type,
  last_sync_timestamp,
  supa
}: {
  facility_id: string;
  sync_data: any;
  sync_type: string;
  last_sync_timestamp?: string;
  supa: any;
}) {
  let recordsProcessed = 0;
  const errors: string[] = [];

  try {
    // Sync resident data
    if (sync_data.residents) {
      for (const resident of sync_data.residents) {
        try {
          const { error } = await supa
            .from('residents')
            .upsert({
              facility_id,
              external_id: resident.id,
              name: resident.name,
              room_number: resident.room_number,
              admission_date: resident.admission_date,
              discharge_date: resident.discharge_date,
              status: resident.status,
              last_updated: new Date().toISOString()
            });

          if (error) {
            errors.push(`Resident ${resident.id}: ${error.message}`);
          } else {
            recordsProcessed++;
          }
        } catch (error) {
          errors.push(`Resident ${resident.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Sync medication data
    if (sync_data.medications) {
      for (const medication of sync_data.medications) {
        try {
          const { error } = await supa
            .from('medications')
            .upsert({
              facility_id,
              resident_id: medication.resident_id,
              medication_name: medication.name,
              dosage: medication.dosage,
              frequency: medication.frequency,
              start_date: medication.start_date,
              end_date: medication.end_date,
              prescriber: medication.prescriber,
              last_updated: new Date().toISOString()
            });

          if (error) {
            errors.push(`Medication ${medication.id}: ${error.message}`);
          } else {
            recordsProcessed++;
          }
        } catch (error) {
          errors.push(`Medication ${medication.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

  } catch (error) {
    errors.push(`EHR sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { records_processed: recordsProcessed, errors };
}

async function syncCensusData({
  facility_id,
  sync_data,
  sync_type,
  last_sync_timestamp,
  supa
}: {
  facility_id: string;
  sync_data: any;
  sync_type: string;
  last_sync_timestamp?: string;
  supa: any;
}) {
  let recordsProcessed = 0;
  const errors: string[] = [];

  try {
    const censusSnapshot = {
      facility_id,
      date: sync_data.date || new Date().toISOString().split('T')[0],
      total_beds: sync_data.total_beds,
      occupied_beds: sync_data.occupied_beds,
      available_beds: sync_data.available_beds,
      admission_count: sync_data.admissions || 0,
      discharge_count: sync_data.discharges || 0,
      skilled_nursing_beds: sync_data.skilled_nursing_beds || 0,
      memory_care_beds: sync_data.memory_care_beds || 0,
      assisted_living_beds: sync_data.assisted_living_beds || 0,
      private_pay_count: sync_data.private_pay_count || 0,
      medicare_count: sync_data.medicare_count || 0,
      medicaid_count: sync_data.medicaid_count || 0,
      insurance_count: sync_data.insurance_count || 0,
      source: 'ehr_sync',
      sync_status: 'success',
      last_updated: new Date().toISOString()
    };

    const { error } = await supa
      .from('census_snapshots')
      .upsert(censusSnapshot);

    if (error) {
      errors.push(`Census sync error: ${error.message}`);
    } else {
      recordsProcessed = 1;
    }

  } catch (error) {
    errors.push(`Census sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { records_processed: recordsProcessed, errors };
}

async function syncStaffingData({
  facility_id,
  sync_data,
  sync_type,
  last_sync_timestamp,
  supa
}: {
  facility_id: string;
  sync_data: any;
  sync_type: string;
  last_sync_timestamp?: string;
  supa: any;
}) {
  let recordsProcessed = 0;
  const errors: string[] = [];

  try {
    if (sync_data.shifts) {
      for (const shift of sync_data.shifts) {
        try {
          const { error } = await supa
            .from('staff_shifts')
            .upsert({
              facility_id,
              employee_id: shift.employee_id,
              employee_name: shift.employee_name,
              role: shift.role,
              shift_date: shift.date,
              start_time: shift.start_time,
              end_time: shift.end_time,
              hours_worked: shift.hours,
              unit: shift.unit,
              overtime: shift.overtime || false,
              last_updated: new Date().toISOString()
            });

          if (error) {
            errors.push(`Shift ${shift.id}: ${error.message}`);
          } else {
            recordsProcessed++;
          }
        } catch (error) {
          errors.push(`Shift ${shift.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

  } catch (error) {
    errors.push(`Staffing sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { records_processed: recordsProcessed, errors };
}

async function syncQualityData({
  facility_id,
  sync_data,
  sync_type,
  last_sync_timestamp,
  supa
}: {
  facility_id: string;
  sync_data: any;
  sync_type: string;
  last_sync_timestamp?: string;
  supa: any;
}) {
  let recordsProcessed = 0;
  const errors: string[] = [];

  try {
    if (sync_data.quality_indicators) {
      for (const indicator of sync_data.quality_indicators) {
        try {
          const { error } = await supa
            .from('quality_indicators')
            .upsert({
              facility_id,
              indicator_name: indicator.name,
              indicator_value: indicator.value,
              target_value: indicator.target,
              measurement_date: indicator.date,
              category: indicator.category,
              status: indicator.status,
              last_updated: new Date().toISOString()
            });

          if (error) {
            errors.push(`Quality indicator ${indicator.name}: ${error.message}`);
          } else {
            recordsProcessed++;
          }
        } catch (error) {
          errors.push(`Quality indicator ${indicator.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

  } catch (error) {
    errors.push(`Quality sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { records_processed: recordsProcessed, errors };
}

async function syncSupplyData({
  facility_id,
  sync_data,
  sync_type,
  last_sync_timestamp,
  supa
}: {
  facility_id: string;
  sync_data: any;
  sync_type: string;
  last_sync_timestamp?: string;
  supa: any;
}) {
  let recordsProcessed = 0;
  const errors: string[] = [];

  try {
    if (sync_data.inventory) {
      for (const item of sync_data.inventory) {
        try {
          const { error } = await supa
            .from('supply_stock')
            .upsert({
              facility_id,
              item_id: item.item_id,
              location_id: item.location_id,
              current_quantity: item.quantity,
              minimum_quantity: item.minimum_quantity,
              maximum_quantity: item.maximum_quantity,
              last_updated: new Date().toISOString()
            });

          if (error) {
            errors.push(`Supply item ${item.item_id}: ${error.message}`);
          } else {
            recordsProcessed++;
          }
        } catch (error) {
          errors.push(`Supply item ${item.item_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

  } catch (error) {
    errors.push(`Supply sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { records_processed: recordsProcessed, errors };
}

async function logSyncActivity({
  facility_id,
  integration_type,
  sync_type,
  records_processed,
  status,
  supa
}: {
  facility_id: string;
  integration_type: string;
  sync_type: string;
  records_processed: number;
  status: string;
  supa: any;
}) {
  try {
    await supa
      .from('integration_sync_logs')
      .insert({
        facility_id,
        integration_type,
        sync_type,
        records_processed,
        status,
        sync_timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging sync activity:', error);
  }
}
