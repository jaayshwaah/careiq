// Microsoft Outlook Calendar integration for CareIQ
// Handles OAuth authentication and API interactions with Microsoft Graph API

import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import axios, { AxiosInstance } from 'axios';

export interface OutlookCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authority?: string;
}

export interface OutlookCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  location?: {
    displayName: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay?: boolean;
  recurrence?: any;
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  categories?: string[];
}

export interface OutlookTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export class OutlookCalendarService {
  private msalApp: ConfidentialClientApplication;
  private httpClient: AxiosInstance;
  private accessToken?: string;

  constructor(private config: OutlookCalendarConfig) {
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: config.authority || 'https://login.microsoftonline.com/common'
      }
    });

    this.httpClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth header
    this.httpClient.interceptors.request.use((requestConfig) => {
      if (this.accessToken) {
        requestConfig.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return requestConfig;
    });
  }

  /**
   * Generate OAuth authorization URL for user consent
   */
  getAuthUrl(): string {
    const scopes = [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'offline_access'
    ];

    const authUrlParameters = {
      scopes,
      redirectUri: this.config.redirectUri,
      prompt: 'consent', // Always show consent screen to get refresh token
      responseMode: 'query' as const
    };

    return this.msalApp.getAuthCodeUrl(authUrlParameters);
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<OutlookTokens> {
    try {
      const tokenRequest = {
        code,
        scopes: [
          'https://graph.microsoft.com/Calendars.ReadWrite',
          'https://graph.microsoft.com/User.Read',
          'offline_access'
        ],
        redirectUri: this.config.redirectUri
      };

      const result: AuthenticationResult = await this.msalApp.acquireTokenByCode(tokenRequest);

      return {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        expires_at: result.expiresOn?.getTime()
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to get tokens from authorization code');
    }
  }

  /**
   * Set access token for API calls
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OutlookTokens> {
    try {
      const refreshTokenRequest = {
        refreshToken,
        scopes: [
          'https://graph.microsoft.com/Calendars.ReadWrite',
          'https://graph.microsoft.com/User.Read',
          'offline_access'
        ]
      };

      const result: AuthenticationResult = await this.msalApp.acquireTokenByRefreshToken(refreshTokenRequest);

      return {
        access_token: result.accessToken,
        refresh_token: result.refreshToken || refreshToken,
        expires_at: result.expiresOn?.getTime()
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
      const response = await this.httpClient.get('/me/calendars');
      
      return response.data.value?.map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        description: cal.description,
        isDefaultCalendar: cal.isDefaultCalendar,
        canEdit: cal.canEdit,
        canShare: cal.canShare,
        canViewPrivateItems: cal.canViewPrivateItems,
        owner: cal.owner
      })) || [];
    } catch (error: any) {
      console.error('Error fetching calendar list:', error);
      throw new Error('Failed to fetch calendar list');
    }
  }

  /**
   * Create an event in Outlook Calendar
   */
  async createEvent(calendarId: string, event: OutlookCalendarEvent) {
    try {
      const endpoint = calendarId === 'primary' ? '/me/events' : `/me/calendars/${calendarId}/events`;
      const response = await this.httpClient.post(endpoint, event);

      return {
        id: response.data.id,
        webLink: response.data.webLink,
        responseStatus: response.data.responseStatus
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event in Outlook Calendar');
    }
  }

  /**
   * Update an event in Outlook Calendar
   */
  async updateEvent(calendarId: string, eventId: string, event: Partial<OutlookCalendarEvent>) {
    try {
      const endpoint = calendarId === 'primary' ? 
        `/me/events/${eventId}` : 
        `/me/calendars/${calendarId}/events/${eventId}`;
        
      const response = await this.httpClient.patch(endpoint, event);

      return {
        id: response.data.id,
        webLink: response.data.webLink,
        responseStatus: response.data.responseStatus
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event in Outlook Calendar');
    }
  }

  /**
   * Delete an event from Outlook Calendar
   */
  async deleteEvent(calendarId: string, eventId: string) {
    try {
      const endpoint = calendarId === 'primary' ? 
        `/me/events/${eventId}` : 
        `/me/calendars/${calendarId}/events/${eventId}`;
        
      await this.httpClient.delete(endpoint);
      return true;
    } catch (error: any) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event from Outlook Calendar');
    }
  }

  /**
   * Get events from Outlook Calendar
   */
  async getEvents(calendarId: string, options: {
    startDateTime?: string;
    endDateTime?: string;
    top?: number;
    filter?: string;
    orderBy?: string;
  } = {}) {
    try {
      const endpoint = calendarId === 'primary' ? '/me/events' : `/me/calendars/${calendarId}/events`;
      
      const params = new URLSearchParams();
      
      if (options.startDateTime) {
        params.append('$filter', `start/dateTime ge '${options.startDateTime}'`);
      }
      if (options.endDateTime) {
        const existingFilter = params.get('$filter');
        const endFilter = `end/dateTime le '${options.endDateTime}'`;
        params.set('$filter', existingFilter ? `${existingFilter} and ${endFilter}` : endFilter);
      }
      if (options.top) {
        params.append('$top', options.top.toString());
      }
      if (options.orderBy) {
        params.append('$orderby', options.orderBy);
      }

      const response = await this.httpClient.get(`${endpoint}?${params.toString()}`);

      return response.data.value?.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        body: event.body,
        location: event.location,
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay,
        recurrence: event.recurrence,
        attendees: event.attendees,
        categories: event.categories,
        webLink: event.webLink,
        createdDateTime: event.createdDateTime,
        lastModifiedDateTime: event.lastModifiedDateTime
      })) || [];
    } catch (error: any) {
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch events from Outlook Calendar');
    }
  }

  /**
   * Create a subscription for calendar changes (webhooks)
   */
  async createSubscription(calendarId: string, webhookUrl: string, expirationDateTime?: string) {
    try {
      const resource = calendarId === 'primary' ? '/me/events' : `/me/calendars/${calendarId}/events`;
      
      const subscription = {
        changeType: 'created,updated,deleted',
        notificationUrl: webhookUrl,
        resource,
        expirationDateTime: expirationDateTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        clientState: Math.random().toString(36).substring(7) // Random string for validation
      };

      const response = await this.httpClient.post('/subscriptions', subscription);

      return {
        id: response.data.id,
        resource: response.data.resource,
        expirationDateTime: response.data.expirationDateTime,
        clientState: response.data.clientState
      };
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create calendar subscription');
    }
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(subscriptionId: string) {
    try {
      await this.httpClient.delete(`/subscriptions/${subscriptionId}`);
      return true;
    } catch (error: any) {
      console.error('Error deleting subscription:', error);
      throw new Error('Failed to delete calendar subscription');
    }
  }
}

/**
 * Convert CareIQ event to Outlook Calendar event format
 */
export function careiqToOutlookEvent(careiqEvent: any): OutlookCalendarEvent {
  const timeZone = 'Eastern Standard Time'; // Should be configurable
  
  return {
    subject: careiqEvent.title,
    body: {
      contentType: 'HTML',
      content: `${careiqEvent.description || ''}<br><br>🏥 <i>Created by CareIQ - ${careiqEvent.category} event${careiqEvent.compliance_related ? ' (Compliance Related)' : ''}</i>`
    },
    location: careiqEvent.location ? {
      displayName: careiqEvent.location
    } : undefined,
    start: {
      dateTime: careiqEvent.start_time,
      timeZone
    },
    end: careiqEvent.end_time ? {
      dateTime: careiqEvent.end_time,
      timeZone
    } : {
      dateTime: new Date(new Date(careiqEvent.start_time).getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour
      timeZone
    },
    isAllDay: careiqEvent.all_day || false,
    categories: careiqEvent.compliance_related ? ['CareIQ', 'Compliance', careiqEvent.category] : ['CareIQ', careiqEvent.category]
  };
}

/**
 * Convert Outlook Calendar event to CareIQ event format
 */
export function outlookToCareiqEvent(outlookEvent: any, userId: string, calendarTypeId?: string) {
  return {
    user_id: userId,
    calendar_type_id: calendarTypeId,
    title: outlookEvent.subject || 'Untitled Event',
    description: outlookEvent.body?.content ? 
      outlookEvent.body.content.replace(/<[^>]*>/g, '') : // Strip HTML tags
      undefined,
    location: outlookEvent.location?.displayName,
    start_time: outlookEvent.start?.dateTime,
    end_time: outlookEvent.end?.dateTime,
    all_day: outlookEvent.isAllDay || false,
    outlook_event_id: outlookEvent.id,
    category: 'custom', // Default category
    sync_status: 'synced'
  };
}

/**
 * Create Outlook Calendar service instance with environment config
 */
export function createOutlookCalendarService(): OutlookCalendarService {
  const config: OutlookCalendarConfig = {
    clientId: process.env.OUTLOOK_CALENDAR_CLIENT_ID!,
    clientSecret: process.env.OUTLOOK_CALENDAR_CLIENT_SECRET!,
    redirectUri: process.env.OUTLOOK_CALENDAR_REDIRECT_URI!,
    authority: process.env.OUTLOOK_CALENDAR_AUTHORITY
  };

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error('Outlook Calendar configuration is missing. Please set OUTLOOK_CALENDAR_CLIENT_ID, OUTLOOK_CALENDAR_CLIENT_SECRET, and OUTLOOK_CALENDAR_REDIRECT_URI environment variables.');
  }

  return new OutlookCalendarService(config);
}