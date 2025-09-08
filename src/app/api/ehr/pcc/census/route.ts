// src/app/api/ehr/pcc/census/route.ts - PCC EHR Census Integration
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";

interface PCCCensusData {
  date: string;
  total_census: number;
  skilled_census: number;
  memory_care_census: number;
  rehab_census: number;
  private_pay_census: number;
  medicare_a_census: number;
  medicare_b_census: number;
  medicaid_census: number;
  managed_care_census: number;
  admissions: number;
  discharges: number;
  unit_breakdowns: {
    unit_name: string;
    unit_code: string;
    census: number;
    capacity: number;
    occupancy_rate: number;
  }[];
}

interface PCCAPIResponse {
  success: boolean;
  data: {
    facilities: {
      facility_id: string;
      facility_name: string;
      census_date: string;
      total_residents: number;
      units: {
        unit_id: string;
        unit_name: string;
        unit_type: string;
        current_census: number;
        capacity: number;
        residents: {
          resident_id: string;
          first_name: string;
          last_name: string;
          room_number: string;
          admission_date: string;
          payer_source: string;
          care_level: string;
        }[];
      }[];
    }[];
  };
  message?: string;
}

// PCC API Configuration
const PCC_API_CONFIG = {
  baseUrl: process.env.PCC_API_URL || 'https://api.pcc.com/v1',
  clientId: process.env.PCC_CLIENT_ID,
  clientSecret: process.env.PCC_CLIENT_SECRET,
  facilityId: process.env.PCC_FACILITY_ID,
  timeout: 30000 // 30 seconds
};

class PCCAPIClient {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const authResponse = await fetch(`${PCC_API_CONFIG.baseUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: PCC_API_CONFIG.clientId,
          client_secret: PCC_API_CONFIG.clientSecret,
          grant_type: 'client_credentials',
          scope: 'census.read residents.read facilities.read'
        })
      });

      if (!authResponse.ok) {
        throw new Error(`PCC Auth failed: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authData = await authResponse.json();
      this.accessToken = authData.access_token;
      this.tokenExpiry = new Date(Date.now() + (authData.expires_in * 1000));

      return this.accessToken;

    } catch (error) {
      console.error('PCC Authentication error:', error);
      throw new Error('Failed to authenticate with PCC API');
    }
  }

  async fetchCensusData(date?: string): Promise<PCCAPIResponse> {
    const token = await this.authenticate();
    const censusDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(`${PCC_API_CONFIG.baseUrl}/facilities/${PCC_API_CONFIG.facilityId}/census`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(PCC_API_CONFIG.timeout)
      });

      if (!response.ok) {
        throw new Error(`PCC API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('PCC Census fetch error:', error);
      throw new Error('Failed to fetch census data from PCC');
    }
  }

  async fetchResidentDetails(unitId?: string): Promise<any> {
    const token = await this.authenticate();

    try {
      let url = `${PCC_API_CONFIG.baseUrl}/facilities/${PCC_API_CONFIG.facilityId}/residents`;
      if (unitId) {
        url += `?unit_id=${unitId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(PCC_API_CONFIG.timeout)
      });

      if (!response.ok) {
        throw new Error(`PCC Residents API failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('PCC Residents fetch error:', error);
      throw new Error('Failed to fetch resident data from PCC');
    }
  }
}

function transformPCCToCensusData(pccData: PCCAPIResponse): PCCCensusData {
  const facility = pccData.data.facilities[0];
  
  if (!facility) {
    throw new Error('No facility data found in PCC response');
  }

  // Calculate census by care level and payer source
  let skilledCensus = 0;
  let memoryCensus = 0;
  let rehabCensus = 0;
  let privatePayCensus = 0;
  let medicareACensus = 0;
  let medicareBCensus = 0;
  let medicaidCensus = 0;
  let managedCareCensus = 0;

  const unitBreakdowns = facility.units.map(unit => {
    // Count residents by care level and payer source
    unit.residents.forEach(resident => {
      switch (resident.care_level?.toLowerCase()) {
        case 'skilled':
        case 'skilled nursing':
          skilledCensus++;
          break;
        case 'memory care':
        case 'dementia':
          memoryCensus++;
          break;
        case 'rehabilitation':
        case 'rehab':
          rehabCensus++;
          break;
      }

      switch (resident.payer_source?.toLowerCase()) {
        case 'private pay':
        case 'private':
          privatePayCensus++;
          break;
        case 'medicare a':
        case 'medicare part a':
          medicareACensus++;
          break;
        case 'medicare b':
        case 'medicare part b':
          medicareBCensus++;
          break;
        case 'medicaid':
          medicaidCensus++;
          break;
        case 'managed care':
        case 'insurance':
          managedCareCensus++;
          break;
      }
    });

    return {
      unit_name: unit.unit_name,
      unit_code: unit.unit_id,
      census: unit.current_census,
      capacity: unit.capacity,
      occupancy_rate: unit.capacity > 0 ? (unit.current_census / unit.capacity) * 100 : 0
    };
  });

  return {
    date: facility.census_date,
    total_census: facility.total_residents,
    skilled_census: skilledCensus,
    memory_care_census: memoryCensus,
    rehab_census: rehabCensus,
    private_pay_census: privatePayCensus,
    medicare_a_census: medicareACensus,
    medicare_b_census: medicareBCensus,
    medicaid_census: medicaidCensus,
    managed_care_census: managedCareCensus,
    admissions: 0, // Would need separate API call for admission data
    discharges: 0, // Would need separate API call for discharge data
    unit_breakdowns: unitBreakdowns
  };
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check if we have recent census data (unless force refresh)
    if (!forceRefresh) {
      const supaService = supabaseService();
      const { data: existingCensus } = await supaService
        .from('daily_census')
        .select('*')
        .eq('date', date || new Date().toISOString().split('T')[0])
        .eq('source', 'pcc_ehr')
        .single();

      if (existingCensus) {
        return NextResponse.json({ 
          success: true, 
          data: existingCensus,
          cached: true 
        });
      }
    }

    // Validate PCC configuration
    if (!PCC_API_CONFIG.clientId || !PCC_API_CONFIG.clientSecret || !PCC_API_CONFIG.facilityId) {
      return NextResponse.json({ 
        error: "PCC API not configured. Missing credentials or facility ID." 
      }, { status: 500 });
    }

    // Fetch data from PCC
    const pccClient = new PCCAPIClient();
    const pccData = await pccClient.fetchCensusData(date);
    
    if (!pccData.success) {
      throw new Error(pccData.message || 'PCC API returned error');
    }

    // Transform PCC data to our format
    const censusData = transformPCCToCensusData(pccData);

    // Store in database
    const supaService = supabaseService();
    const { data: savedCensus, error: saveError } = await supaService
      .from('daily_census')
      .upsert({
        date: censusData.date,
        total_census: censusData.total_census,
        skilled_census: censusData.skilled_census,
        memory_care_census: censusData.memory_care_census,
        rehab_census: censusData.rehab_census,
        private_pay_census: censusData.private_pay_census,
        medicare_a_census: censusData.medicare_a_census,
        medicare_b_census: censusData.medicare_b_census,
        medicaid_census: censusData.medicaid_census,
        managed_care_census: censusData.managed_care_census,
        admissions: censusData.admissions,
        discharges: censusData.discharges,
        source: 'pcc_ehr',
        raw_data: pccData.data,
        unit_breakdowns: censusData.unit_breakdowns,
        last_updated: new Date().toISOString(),
        updated_by: user.id
      }, {
        onConflict: 'date,source'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving census data:', saveError);
      return NextResponse.json({ error: "Failed to save census data" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: savedCensus,
      pcc_data: censusData 
    });

  } catch (error: any) {
    console.error('PCC Census API error:', error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch census data from PCC",
      details: error.stack
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, date_range } = await req.json();

    if (action === 'bulk_sync') {
      // Sync multiple days of census data
      const startDate = new Date(date_range?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const endDate = new Date(date_range?.end || new Date());
      
      const results = [];
      const pccClient = new PCCAPIClient();

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        try {
          const dateStr = d.toISOString().split('T')[0];
          const pccData = await pccClient.fetchCensusData(dateStr);
          
          if (pccData.success) {
            const censusData = transformPCCToCensusData(pccData);
            
            const supaService = supabaseService();
            await supaService
              .from('daily_census')
              .upsert({
                date: censusData.date,
                total_census: censusData.total_census,
                source: 'pcc_ehr',
                raw_data: pccData.data,
                last_updated: new Date().toISOString(),
                updated_by: user.id
              }, {
                onConflict: 'date,source'
              });

            results.push({ date: dateStr, status: 'success' });
          } else {
            results.push({ date: dateStr, status: 'failed', error: pccData.message });
          }
        } catch (error: any) {
          results.push({ date: d.toISOString().split('T')[0], status: 'error', error: error.message });
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return NextResponse.json({ 
        success: true, 
        message: `Synced ${results.filter(r => r.status === 'success').length} days`,
        results 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error('PCC Census POST error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
