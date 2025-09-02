// Google Calendar integration for CareIQ
// Handles OAuth authentication and API interactions with Google Calendar

import { google } from 'googleapis';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: any;

  constructor(private config: GoogleCalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth authorization URL for user consent
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      prompt: 'consent' // Always show consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GoogleTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to get tokens from authorization code');
    }
  }

  /**
   * Set credentials for API calls
   */
  setCredentials(tokens: GoogleTokens) {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || refreshToken,
        expires_at: credentials.expiry_date
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user's calendar list
   */
  async getCalendarList() {
    try {
      const response = await this.calendar.calendarList.list({
        maxResults: 100
      });

      return response.data.items?.map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor
      })) || [];
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list');
    }
  }

  /**
   * Create an event in Google Calendar
   */
  async createEvent(calendarId: string, event: GoogleCalendarEvent) {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event
      });

      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event in Google Calendar');
    }
  }

  /**
   * Update an event in Google Calendar
   */
  async updateEvent(calendarId: string, eventId: string, event: Partial<GoogleCalendarEvent>) {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: event
      });

      return {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event in Google Calendar');
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(calendarId: string, eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      });
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event from Google Calendar');
    }
  }

  /**
   * Get events from Google Calendar
   */
  async getEvents(calendarId: string, options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: string;
  } = {}) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: options.timeMin || new Date().toISOString(),
        timeMax: options.timeMax,
        maxResults: options.maxResults || 250,
        singleEvents: options.singleEvents ?? true,
        orderBy: options.orderBy || 'startTime'
      });

      return response.data.items?.map((event: any) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        recurrence: event.recurrence,
        status: event.status,
        htmlLink: event.htmlLink,
        created: event.created,
        updated: event.updated
      })) || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events from Google Calendar');
    }
  }

  /**
   * Watch for calendar changes (webhooks)
   */
  async watchCalendar(calendarId: string, webhookUrl: string, channelId: string) {
    try {
      const response = await this.calendar.events.watch({
        calendarId,
        resource: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: (24 * 60 * 60 * 1000).toString() // 24 hours
          }
        }
      });

      return {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration
      };
    } catch (error) {
      console.error('Error setting up calendar watch:', error);
      throw new Error('Failed to set up calendar watch');
    }
  }

  /**
   * Stop watching a calendar
   */
  async stopWatch(channelId: string, resourceId: string) {
    try {
      await this.calendar.channels.stop({
        resource: {
          id: channelId,
          resourceId
        }
      });
      return true;
    } catch (error) {
      console.error('Error stopping calendar watch:', error);
      throw new Error('Failed to stop calendar watch');
    }
  }
}

/**
 * Convert CareIQ event to Google Calendar event format
 */
export function careiqToGoogleEvent(careiqEvent: any): GoogleCalendarEvent {
  return {
    summary: careiqEvent.title,
    description: `${careiqEvent.description || ''}\n\n🏥 Created by CareIQ - ${careiqEvent.category} event${careiqEvent.compliance_related ? ' (Compliance Related)' : ''}`,
    location: careiqEvent.location,
    start: careiqEvent.all_day ? 
      { date: careiqEvent.start_time.split('T')[0] } :
      { 
        dateTime: careiqEvent.start_time,
        timeZone: 'America/New_York' // Default timezone, should be configurable
      },
    end: careiqEvent.end_time ? 
      (careiqEvent.all_day ? 
        { date: careiqEvent.end_time.split('T')[0] } :
        { 
          dateTime: careiqEvent.end_time,
          timeZone: 'America/New_York'
        }
      ) : undefined
  };
}

/**
 * Convert Google Calendar event to CareIQ event format
 */
export function googleToCareiqEvent(googleEvent: any, userId: string, calendarTypeId?: string) {
  const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
  const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;
  const allDay = !googleEvent.start?.dateTime; // If no dateTime, it's an all-day event

  return {
    user_id: userId,
    calendar_type_id: calendarTypeId,
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description,
    location: googleEvent.location,
    start_time: startTime,
    end_time: endTime,
    all_day: allDay,
    google_event_id: googleEvent.id,
    category: 'custom', // Default category
    sync_status: 'synced'
  };
}

/**
 * Create Google Calendar service instance with environment config
 */
export function createGoogleCalendarService(): GoogleCalendarService {
  const config: GoogleCalendarConfig = {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI!
  };

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error('Google Calendar configuration is missing. Please set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI environment variables.');
  }

  return new GoogleCalendarService(config);
}