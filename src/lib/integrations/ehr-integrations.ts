// EHR Integration Service
// Supports PointClickCare, MatrixCare, CareGiver, and other systems

import { createClient } from '@supabase/supabase-js';

export interface CensusData {
  date: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  admissionCount?: number;
  dischargeCount?: number;
  skilledNursingBeds?: number;
  memoryCare?: number;
  assistedLiving?: number;
  privatePay?: number;
  medicare?: number;
  medicaid?: number;
  insurance?: number;
  residents?: ResidentData[];
}

export interface ResidentData {
  id: string;
  name: string;
  roomNumber: string;
  admissionDate: string;
  payerSource: 'medicare' | 'medicaid' | 'private' | 'insurance';
  careLevel: 'skilled' | 'memory' | 'assisted' | 'independent';
  lengthOfStay: number;
}

export interface EHRConfig {
  id: string;
  facilityId: string;
  ehrSystem: 'pointclickcare' | 'matrixcare' | 'caremerge' | 'caregiver' | 'other';
  apiEndpoint?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  authToken?: string;
  tokenExpiresAt?: Date;
}

abstract class EHRIntegration {
  protected config: EHRConfig;
  protected supabase: ReturnType<typeof createClient>;

  constructor(config: EHRConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  abstract authenticate(): Promise<boolean>;
  abstract getCensusData(): Promise<CensusData>;
  abstract getResidentData(): Promise<ResidentData[]>;
  abstract validateConnection(): Promise<boolean>;

  protected async logSync(status: 'success' | 'error' | 'partial', recordsCount: number = 0, error?: string) {
    await this.supabase.from('census_sync_logs').insert({
      facility_id: this.config.facilityId,
      integration_id: this.config.id,
      sync_date: new Date().toISOString().split('T')[0],
      status,
      records_synced: recordsCount,
      error_message: error,
      execution_time_ms: Date.now() - this.syncStartTime
    });
  }

  private syncStartTime = Date.now();

  async syncCensusData(): Promise<boolean> {
    try {
      this.syncStartTime = Date.now();
      
      // Authenticate first
      const authenticated = await this.authenticate();
      if (!authenticated) {
        await this.logSync('error', 0, 'Authentication failed');
        return false;
      }

      // Get census data
      const censusData = await this.getCensusData();
      
      // Save to database
      const { error } = await this.supabase.from('census_snapshots').upsert({
        facility_id: this.config.facilityId,
        date: censusData.date,
        total_beds: censusData.totalBeds,
        occupied_beds: censusData.occupiedBeds,
        available_beds: censusData.availableBeds,
        admission_count: censusData.admissionCount || 0,
        discharge_count: censusData.dischargeCount || 0,
        skilled_nursing_beds: censusData.skilledNursingBeds || 0,
        memory_care_beds: censusData.memoryCare || 0,
        assisted_living_beds: censusData.assistedLiving || 0,
        private_pay_count: censusData.privatePay || 0,
        medicare_count: censusData.medicare || 0,
        medicaid_count: censusData.medicaid || 0,
        insurance_count: censusData.insurance || 0,
        source: this.config.ehrSystem,
        sync_status: 'success'
      });

      if (error) {
        await this.logSync('error', 0, error.message);
        return false;
      }

      // Update last sync time
      await this.supabase.from('ehr_integrations').update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success'
      }).eq('id', this.config.id);

      await this.logSync('success', 1);
      return true;

    } catch (error) {
      console.error('Census sync error:', error);
      await this.logSync('error', 0, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
}

// PointClickCare Integration
export class PointClickCareIntegration extends EHRIntegration {
  private accessToken?: string;

  async authenticate(): Promise<boolean> {
    try {
      // PointClickCare OAuth 2.0 authentication
      const response = await fetch(`${this.config.apiEndpoint}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          username: this.config.username,
          password: this.config.password
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;

      // Update token in database (encrypted)
      await this.supabase.from('ehr_integrations').update({
        auth_token_encrypted: tokenData.access_token, // Should be encrypted in production
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000))
      }).eq('id', this.config.id);

      return true;
    } catch (error) {
      console.error('PointClickCare authentication error:', error);
      return false;
    }
  }

  async getCensusData(): Promise<CensusData> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const today = new Date().toISOString().split('T')[0];

    // Get census summary
    const censusResponse = await fetch(
      `${this.config.apiEndpoint}/api/census/summary?date=${today}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!censusResponse.ok) {
      throw new Error(`Failed to fetch census data: ${censusResponse.statusText}`);
    }

    const censusData = await censusResponse.json();

    // Transform PointClickCare format to our format
    return {
      date: today,
      totalBeds: censusData.totalBeds,
      occupiedBeds: censusData.occupiedBeds,
      availableBeds: censusData.totalBeds - censusData.occupiedBeds,
      admissionCount: censusData.todayAdmissions || 0,
      dischargeCount: censusData.todayDischarges || 0,
      skilledNursingBeds: censusData.skilledNursingCount || 0,
      memoryCare: censusData.memoryCareCount || 0,
      assistedLiving: censusData.assistedLivingCount || 0,
      privatePay: censusData.privatePayCount || 0,
      medicare: censusData.medicareCount || 0,
      medicaid: censusData.medicaidCount || 0,
      insurance: censusData.insuranceCount || 0
    };
  }

  async getResidentData(): Promise<ResidentData[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.config.apiEndpoint}/api/residents/active`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch resident data: ${response.statusText}`);
    }

    const residents = await response.json();

    return residents.map((resident: any) => ({
      id: resident.residentId,
      name: `${resident.firstName} ${resident.lastName}`,
      roomNumber: resident.roomNumber,
      admissionDate: resident.admissionDate,
      payerSource: this.mapPayerSource(resident.primaryPayer),
      careLevel: this.mapCareLevel(resident.careLevel),
      lengthOfStay: this.calculateLengthOfStay(resident.admissionDate)
    }));
  }

  async validateConnection(): Promise<boolean> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) return false;

      // Test a simple API call
      const response = await fetch(
        `${this.config.apiEndpoint}/api/facility/info`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private mapPayerSource(payer: string): 'medicare' | 'medicaid' | 'private' | 'insurance' {
    const payerLower = payer.toLowerCase();
    if (payerLower.includes('medicare')) return 'medicare';
    if (payerLower.includes('medicaid')) return 'medicaid';
    if (payerLower.includes('private') || payerLower.includes('self')) return 'private';
    return 'insurance';
  }

  private mapCareLevel(level: string): 'skilled' | 'memory' | 'assisted' | 'independent' {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('skilled')) return 'skilled';
    if (levelLower.includes('memory') || levelLower.includes('dementia')) return 'memory';
    if (levelLower.includes('assisted')) return 'assisted';
    return 'independent';
  }

  private calculateLengthOfStay(admissionDate: string): number {
    const admission = new Date(admissionDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - admission.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// MatrixCare Integration
export class MatrixCareIntegration extends EHRIntegration {
  async authenticate(): Promise<boolean> {
    // MatrixCare specific authentication
    // Implementation would depend on their API documentation
    return false;
  }

  async getCensusData(): Promise<CensusData> {
    throw new Error('MatrixCare integration not yet implemented');
  }

  async getResidentData(): Promise<ResidentData[]> {
    return [];
  }

  async validateConnection(): Promise<boolean> {
    return false;
  }
}

// Generic Integration Factory
export class EHRIntegrationFactory {
  static create(config: EHRConfig): EHRIntegration {
    switch (config.ehrSystem) {
      case 'pointclickcare':
        return new PointClickCareIntegration(config);
      case 'matrixcare':
        return new MatrixCareIntegration(config);
      default:
        throw new Error(`Unsupported EHR system: ${config.ehrSystem}`);
    }
  }
}

// Service to manage all integrations
export class CensusIntegrationService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async syncAllFacilities(): Promise<void> {
    const { data: integrations, error } = await this.supabase
      .from('ehr_integrations')
      .select('*')
      .eq('is_active', true);

    if (error || !integrations) {
      console.error('Failed to fetch integrations:', error);
      return;
    }

    for (const integration of integrations) {
      try {
        const ehr = EHRIntegrationFactory.create({
          id: integration.id,
          facilityId: integration.facility_id,
          ehrSystem: integration.ehr_system,
          apiEndpoint: integration.api_endpoint,
          username: integration.username,
          password: integration.password_encrypted, // Should decrypt in production
          apiKey: integration.api_key_encrypted,
          clientId: integration.client_id,
          clientSecret: integration.client_secret_encrypted,
          authToken: integration.auth_token_encrypted
        });

        await ehr.syncCensusData();
        console.log(`Synced census for facility ${integration.facility_id}`);
      } catch (error) {
        console.error(`Failed to sync facility ${integration.facility_id}:`, error);
      }
    }
  }

  async syncFacility(facilityId: string): Promise<boolean> {
    const { data: integration, error } = await this.supabase
      .from('ehr_integrations')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('is_active', true)
      .single();

    if (error || !integration) {
      console.error('Integration not found:', error);
      return false;
    }

    try {
      const ehr = EHRIntegrationFactory.create({
        id: integration.id,
        facilityId: integration.facility_id,
        ehrSystem: integration.ehr_system,
        apiEndpoint: integration.api_endpoint,
        username: integration.username,
        password: integration.password_encrypted,
        apiKey: integration.api_key_encrypted,
        clientId: integration.client_id,
        clientSecret: integration.client_secret_encrypted,
        authToken: integration.auth_token_encrypted
      });

      return await ehr.syncCensusData();
    } catch (error) {
      console.error(`Failed to sync facility ${facilityId}:`, error);
      return false;
    }
  }
}