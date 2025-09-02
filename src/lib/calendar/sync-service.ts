// Calendar synchronization service for CareIQ
// Handles bidirectional sync between CareIQ and external calendar providers

import { supabaseService } from "@/lib/supabase/server";
import { 
  createGoogleCalendarService, 
  GoogleCalendarService, 
  careiqToGoogleEvent, 
  googleToCareiqEvent 
} from "./google";
import { 
  createOutlookCalendarService, 
  OutlookCalendarService, 
  careiqToOutlookEvent, 
  outlookToCareiqEvent 
} from "./outlook";
import { 
  createAppleCalendarService, 
  AppleCalendarService, 
  careiqToAppleEvent, 
  appleToCareiqEvent 
} from "./apple";

export type CalendarProvider = 'google' | 'outlook' | 'apple_caldav';

export interface SyncOptions {
  provider: CalendarProvider;
  userId: string;
  direction: 'push' | 'pull' | 'bidirectional';
  calendarTypeId?: string;
  externalCalendarId?: string;
  syncType?: 'manual' | 'scheduled' | 'webhook';
}

export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  executionTimeMs: number;
  errors: string[];
}

export interface ConflictResolution {
  conflictType: 'time_overlap' | 'data_mismatch' | 'external_change' | 'permission_error';
  resolution: 'use_local' | 'use_external' | 'merge' | 'skip';
  autoResolve?: boolean;
}

export class CalendarSyncService {
  private supabase = supabaseService();
  
  /**
   * Main sync orchestrator
   */
  async syncCalendar(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      executionTimeMs: 0,
      errors: []
    };

    try {
      // Get user's integration for the provider
      const integration = await this.getIntegration(options.userId, options.provider);
      if (!integration) {
        throw new Error(`No ${options.provider} integration found for user`);
      }

      if (!integration.is_active) {
        throw new Error(`${options.provider} integration is not active`);
      }

      // Log sync start
      const syncLogId = await this.startSyncLog(options, integration.id);

      try {
        // Perform sync based on provider
        switch (options.provider) {
          case 'google':
            await this.syncWithGoogle(options, integration, result);
            break;
          case 'outlook':
            await this.syncWithOutlook(options, integration, result);
            break;
          case 'apple_caldav':
            await this.syncWithApple(options, integration, result);
            break;
          default:
            throw new Error(`Unsupported provider: ${options.provider}`);
        }

        result.success = true;

        // Update integration last sync status
        await this.updateIntegrationStatus(integration.id, 'success');

      } catch (syncError: any) {
        result.errors.push(syncError.message);
        await this.updateIntegrationStatus(integration.id, 'error', syncError.message);
        throw syncError;
      } finally {
        result.executionTimeMs = Date.now() - startTime;
        
        // Complete sync log
        await this.completeSyncLog(syncLogId, result);
      }

    } catch (error: any) {
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Sync with Google Calendar
   */
  private async syncWithGoogle(
    options: SyncOptions, 
    integration: any, 
    result: SyncResult
  ): Promise<void> {
    const googleService = createGoogleCalendarService();
    
    // Handle token refresh if needed
    let tokens = {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: integration.expires_at ? new Date(integration.expires_at).getTime() : undefined
    };

    if (tokens.expires_at && tokens.expires_at <= Date.now()) {
      if (!tokens.refresh_token) {
        throw new Error("Access token expired and no refresh token available");
      }
      tokens = await googleService.refreshAccessToken(tokens.refresh_token);
      await this.updateIntegrationTokens(integration.id, tokens);
    }

    googleService.setCredentials(tokens);

    const calendarId = options.externalCalendarId || 'primary';

    // Push events to Google Calendar
    if (options.direction === 'push' || options.direction === 'bidirectional') {
      await this.pushEventsToGoogle(googleService, calendarId, options, result);
    }

    // Pull events from Google Calendar
    if (options.direction === 'pull' || options.direction === 'bidirectional') {
      await this.pullEventsFromGoogle(googleService, calendarId, options, result);
    }
  }

  /**
   * Sync with Outlook Calendar
   */
  private async syncWithOutlook(
    options: SyncOptions, 
    integration: any, 
    result: SyncResult
  ): Promise<void> {
    const outlookService = createOutlookCalendarService();
    
    // Handle token refresh if needed
    let tokens = {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: integration.expires_at ? new Date(integration.expires_at).getTime() : undefined
    };

    if (tokens.expires_at && tokens.expires_at <= Date.now()) {
      if (!tokens.refresh_token) {
        throw new Error("Access token expired and no refresh token available");
      }
      tokens = await outlookService.refreshAccessToken(tokens.refresh_token);
      await this.updateIntegrationTokens(integration.id, tokens);
    }

    outlookService.setAccessToken(tokens.access_token);

    const calendarId = options.externalCalendarId || 'primary';

    // Push events to Outlook Calendar
    if (options.direction === 'push' || options.direction === 'bidirectional') {
      await this.pushEventsToOutlook(outlookService, calendarId, options, result);
    }

    // Pull events from Outlook Calendar
    if (options.direction === 'pull' || options.direction === 'bidirectional') {
      await this.pullEventsFromOutlook(outlookService, calendarId, options, result);
    }
  }

  /**
   * Sync with Apple Calendar (CalDAV)
   */
  private async syncWithApple(
    options: SyncOptions, 
    integration: any, 
    result: SyncResult
  ): Promise<void> {
    const appleConfig = {
      serverUrl: integration.caldav_url || 'https://caldav.icloud.com',
      username: integration.caldav_username,
      password: integration.caldav_password
    };

    const appleService = createAppleCalendarService(appleConfig);
    await appleService.authenticate();

    const calendarUrl = options.externalCalendarId;
    if (!calendarUrl) {
      throw new Error("Apple Calendar URL is required");
    }

    // Push events to Apple Calendar
    if (options.direction === 'push' || options.direction === 'bidirectional') {
      await this.pushEventsToApple(appleService, calendarUrl, options, result);
    }

    // Pull events from Apple Calendar
    if (options.direction === 'pull' || options.direction === 'bidirectional') {
      await this.pullEventsFromApple(appleService, calendarUrl, options, result);
    }
  }

  /**
   * Push CareIQ events to Google Calendar
   */
  private async pushEventsToGoogle(
    googleService: GoogleCalendarService,
    calendarId: string,
    options: SyncOptions,
    result: SyncResult
  ): Promise<void> {
    // Get unsent CareIQ events
    const { data: events, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', options.userId)
      .is('google_event_id', null)
      .in('sync_status', ['pending', 'error']);

    if (error) throw new Error(`Failed to fetch events: ${error.message}`);

    for (const event of events || []) {
      try {
        const googleEvent = careiqToGoogleEvent(event);
        const createdEvent = await googleService.createEvent(calendarId, googleEvent);

        // Update CareIQ event with Google event ID
        await this.supabase
          .from('calendar_events')
          .update({
            google_event_id: createdEvent.id,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString()
          })
          .eq('id', event.id);

        result.eventsCreated++;
      } catch (error: any) {
        result.errors.push(`Failed to sync event ${event.id}: ${error.message}`);
        
        // Mark event as error
        await this.supabase
          .from('calendar_events')
          .update({
            sync_status: 'error',
            sync_error: error.message
          })
          .eq('id', event.id);
      }
      result.eventsProcessed++;
    }
  }

  /**
   * Pull events from Google Calendar
   */
  private async pullEventsFromGoogle(
    googleService: GoogleCalendarService,
    calendarId: string,
    options: SyncOptions,
    result: SyncResult
  ): Promise<void> {
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // Last month
    
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6); // 6 months ahead

    const googleEvents = await googleService.getEvents(calendarId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 500
    });

    for (const googleEvent of googleEvents) {
      try {
        // Check if event already exists
        const { data: existingEvent } = await this.supabase
          .from('calendar_events')
          .select('*')
          .eq('google_event_id', googleEvent.id)
          .single();

        const careiqEvent = googleToCareiqEvent(googleEvent, options.userId, options.calendarTypeId);

        if (existingEvent) {
          // Check for conflicts and update
          const hasConflicts = await this.detectConflicts(existingEvent, careiqEvent, 'google');
          if (hasConflicts) {
            result.conflictsDetected++;
            await this.handleConflict(existingEvent, careiqEvent, 'google', 'external_change');
          } else {
            await this.supabase
              .from('calendar_events')
              .update({
                ...careiqEvent,
                last_synced_at: new Date().toISOString()
              })
              .eq('id', existingEvent.id);
            result.eventsUpdated++;
          }
        } else {
          // Create new event
          await this.supabase
            .from('calendar_events')
            .insert({
              ...careiqEvent,
              last_synced_at: new Date().toISOString()
            });
          result.eventsCreated++;
        }
      } catch (error: any) {
        result.errors.push(`Failed to import Google event ${googleEvent.id}: ${error.message}`);
      }
      result.eventsProcessed++;
    }
  }

  // Similar methods for Outlook and Apple Calendar...
  private async pushEventsToOutlook(
    outlookService: OutlookCalendarService,
    calendarId: string,
    options: SyncOptions,
    result: SyncResult
  ): Promise<void> {
    // Implementation similar to pushEventsToGoogle but for Outlook
  }

  private async pullEventsFromOutlook(
    outlookService: OutlookCalendarService,
    calendarId: string,
    options: SyncOptions,
    result: SyncResult
  ): Promise<void> {
    // Implementation similar to pullEventsFromGoogle but for Outlook
  }

  private async pushEventsToApple(
    appleService: AppleCalendarService,
    calendarUrl: string,
    options: SyncOptions,
    result: SyncResult
  ): Promise<void> {
    // Implementation similar to pushEventsToGoogle but for Apple Calendar
  }

  private async pullEventsFromApple(
    appleService: AppleCalendarService,
    calendarUrl: string,
    options: SyncOptions,
    result: SyncResult
  ): Promise<void> {
    // Implementation similar to pullEventsFromGoogle but for Apple Calendar
  }

  /**
   * Detect conflicts between local and external events
   */
  private async detectConflicts(localEvent: any, externalEvent: any, provider: CalendarProvider): Promise<boolean> {
    // Simple conflict detection - you can expand this logic
    const localUpdated = new Date(localEvent.updated_at).getTime();
    const externalUpdated = new Date(externalEvent.lastModified || 0).getTime();

    // Check for data mismatches
    if (
      localEvent.title !== externalEvent.title ||
      localEvent.description !== externalEvent.description ||
      new Date(localEvent.start_time).getTime() !== new Date(externalEvent.start_time).getTime()
    ) {
      return true;
    }

    return false;
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(
    localEvent: any,
    externalEvent: any,
    provider: CalendarProvider,
    conflictType: ConflictResolution['conflictType']
  ): Promise<void> {
    // Create conflict record
    await this.supabase
      .from('calendar_sync_conflicts')
      .insert({
        user_id: localEvent.user_id,
        event_id: localEvent.id,
        conflict_type: conflictType,
        local_data: localEvent,
        external_data: externalEvent,
        resolution_status: 'pending'
      });

    // For now, auto-resolve by using external data (can be made configurable)
    await this.supabase
      .from('calendar_events')
      .update({
        ...externalEvent,
        sync_status: 'conflict',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', localEvent.id);
  }

  /**
   * Helper methods for database operations
   */
  private async getIntegration(userId: string, provider: CalendarProvider) {
    const { data, error } = await this.supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error) return null;
    return data;
  }

  private async startSyncLog(options: SyncOptions, integrationId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('calendar_sync_logs')
      .insert({
        user_id: options.userId,
        integration_id: integrationId,
        sync_type: options.syncType || 'manual',
        sync_direction: options.direction,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create sync log: ${error.message}`);
    return data.id;
  }

  private async completeSyncLog(syncLogId: string, result: SyncResult): Promise<void> {
    await this.supabase
      .from('calendar_sync_logs')
      .update({
        status: result.success ? (result.errors.length > 0 ? 'partial_success' : 'success') : 'error',
        events_processed: result.eventsProcessed,
        events_created: result.eventsCreated,
        events_updated: result.eventsUpdated,
        events_deleted: result.eventsDeleted,
        conflicts_detected: result.conflictsDetected,
        execution_time_ms: result.executionTimeMs,
        error_message: result.errors.join('; ') || null,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLogId);
  }

  private async updateIntegrationStatus(integrationId: string, status: string, errorMessage?: string): Promise<void> {
    await this.supabase
      .from('calendar_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        error_message: errorMessage || null
      })
      .eq('id', integrationId);
  }

  private async updateIntegrationTokens(integrationId: string, tokens: any): Promise<void> {
    await this.supabase
      .from('calendar_integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null
      })
      .eq('id', integrationId);
  }
}

/**
 * Create calendar sync service instance
 */
export function createCalendarSyncService(): CalendarSyncService {
  return new CalendarSyncService();
}