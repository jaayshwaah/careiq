// Apple Calendar (CalDAV) integration for CareIQ
// Handles CalDAV authentication and calendar synchronization

import * as dav from 'dav';
import ICAL from 'ical.js';

export interface AppleCalendarConfig {
  serverUrl: string;
  username: string;
  password: string; // App-specific password for iCloud
}

export interface AppleCalendarEvent {
  uid?: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Date;
  dtend?: Date;
  allDay?: boolean;
  recurrenceRule?: string;
  categories?: string[];
}

export interface CalDAVCalendar {
  url: string;
  displayName: string;
  description?: string;
  color?: string;
  timezone?: string;
  supportedComponents: string[];
}

export class AppleCalendarService {
  private xhr: dav.transport.Transport;
  private account?: dav.Account;
  private calendars: CalDAVCalendar[] = [];

  constructor(private config: AppleCalendarConfig) {
    this.xhr = new dav.transport.Basic({
      username: config.username,
      password: config.password
    });
  }

  /**
   * Authenticate and discover calendars
   */
  async authenticate(): Promise<void> {
    try {
      // Create account and discover calendars
      this.account = await dav.createAccount({
        server: this.config.serverUrl,
        xhr: this.xhr,
        accountType: 'caldav',
        loadCollections: true
      });

      // Extract calendar information
      this.calendars = this.account.calendars.map((calendar: any) => ({
        url: calendar.url,
        displayName: calendar.displayName || 'Unnamed Calendar',
        description: calendar.description,
        color: calendar.calendarColor,
        timezone: calendar.calendarTimezone,
        supportedComponents: calendar.supportedCalendarComponentSet || ['VEVENT']
      }));

    } catch (error) {
      console.error('CalDAV authentication failed:', error);
      throw new Error('Failed to authenticate with Apple Calendar. Please check your credentials and app-specific password.');
    }
  }

  /**
   * Get list of available calendars
   */
  getCalendarList(): CalDAVCalendar[] {
    return this.calendars;
  }

  /**
   * Create an event in Apple Calendar
   */
  async createEvent(calendarUrl: string, event: AppleCalendarEvent): Promise<{ uid: string; url: string }> {
    try {
      if (!this.account) {
        throw new Error('Not authenticated. Call authenticate() first.');
      }

      // Find the target calendar
      const calendar = this.account.calendars.find(cal => cal.url === calendarUrl);
      if (!calendar) {
        throw new Error(`Calendar not found: ${calendarUrl}`);
      }

      // Create iCalendar event
      const vcalendar = new ICAL.Component(['vcalendar', [], []]);
      vcalendar.updatePropertyWithValue('version', '2.0');
      vcalendar.updatePropertyWithValue('prodid', '-//CareIQ//CalDAV Client//EN');

      const vevent = new ICAL.Component('vevent');
      
      // Generate UID if not provided
      const uid = event.uid || `careiq-${Date.now()}-${Math.random().toString(36).substring(7)}@careiq.com`;
      vevent.updatePropertyWithValue('uid', uid);
      vevent.updatePropertyWithValue('summary', event.summary);
      
      if (event.description) {
        vevent.updatePropertyWithValue('description', event.description);
      }
      
      if (event.location) {
        vevent.updatePropertyWithValue('location', event.location);
      }

      // Set start time
      const dtstart = ICAL.Time.fromJSDate(event.dtstart);
      if (event.allDay) {
        dtstart.isDate = true;
      }
      vevent.updatePropertyWithValue('dtstart', dtstart);

      // Set end time
      if (event.dtend) {
        const dtend = ICAL.Time.fromJSDate(event.dtend);
        if (event.allDay) {
          dtend.isDate = true;
        }
        vevent.updatePropertyWithValue('dtend', dtend);
      }

      // Add categories
      if (event.categories && event.categories.length > 0) {
        vevent.updatePropertyWithValue('categories', event.categories.join(','));
      }

      // Add recurrence rule if specified
      if (event.recurrenceRule) {
        vevent.updatePropertyWithValue('rrule', event.recurrenceRule);
      }

      // Add creation timestamp
      vevent.updatePropertyWithValue('dtstamp', ICAL.Time.now());
      vevent.updatePropertyWithValue('created', ICAL.Time.now());
      vevent.updatePropertyWithValue('last-modified', ICAL.Time.now());

      vcalendar.addSubcomponent(vevent);

      // Create CalDAV object
      const calendarObject = {
        filename: `${uid}.ics`,
        calendar,
        calendarData: vcalendar.toString()
      };

      const createdObjects = await dav.createCalendarObject(calendarObject);
      
      return {
        uid,
        url: createdObjects.url || `${calendarUrl}/${uid}.ics`
      };

    } catch (error) {
      console.error('Error creating CalDAV event:', error);
      throw new Error('Failed to create event in Apple Calendar');
    }
  }

  /**
   * Update an event in Apple Calendar
   */
  async updateEvent(calendarUrl: string, eventUrl: string, event: Partial<AppleCalendarEvent>): Promise<void> {
    try {
      if (!this.account) {
        throw new Error('Not authenticated. Call authenticate() first.');
      }

      // First, get the existing event
      const existingObjects = await dav.listCalendarObjects(
        this.account.calendars.find(cal => cal.url === calendarUrl),
        { xhr: this.xhr }
      );

      const existingObject = existingObjects.find(obj => obj.url === eventUrl);
      if (!existingObject) {
        throw new Error(`Event not found: ${eventUrl}`);
      }

      // Parse existing calendar data
      const jcalData = ICAL.parse(existingObject.calendarData);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent('vevent');

      if (!vevent) {
        throw new Error('No VEVENT component found in existing event');
      }

      // Update properties
      if (event.summary !== undefined) {
        vevent.updatePropertyWithValue('summary', event.summary);
      }
      
      if (event.description !== undefined) {
        vevent.updatePropertyWithValue('description', event.description);
      }
      
      if (event.location !== undefined) {
        vevent.updatePropertyWithValue('location', event.location);
      }

      if (event.dtstart !== undefined) {
        const dtstart = ICAL.Time.fromJSDate(event.dtstart);
        if (event.allDay) {
          dtstart.isDate = true;
        }
        vevent.updatePropertyWithValue('dtstart', dtstart);
      }

      if (event.dtend !== undefined) {
        const dtend = ICAL.Time.fromJSDate(event.dtend);
        if (event.allDay) {
          dtend.isDate = true;
        }
        vevent.updatePropertyWithValue('dtend', dtend);
      }

      if (event.categories !== undefined) {
        vevent.updatePropertyWithValue('categories', event.categories.join(','));
      }

      // Update last-modified timestamp
      vevent.updatePropertyWithValue('last-modified', ICAL.Time.now());

      // Update the calendar object
      const updatedObject = {
        ...existingObject,
        calendarData: vcalendar.toString()
      };

      await dav.updateCalendarObject(updatedObject);

    } catch (error) {
      console.error('Error updating CalDAV event:', error);
      throw new Error('Failed to update event in Apple Calendar');
    }
  }

  /**
   * Delete an event from Apple Calendar
   */
  async deleteEvent(eventUrl: string): Promise<void> {
    try {
      if (!this.account) {
        throw new Error('Not authenticated. Call authenticate() first.');
      }

      await dav.deleteCalendarObject({ url: eventUrl, xhr: this.xhr });

    } catch (error) {
      console.error('Error deleting CalDAV event:', error);
      throw new Error('Failed to delete event from Apple Calendar');
    }
  }

  /**
   * Get events from Apple Calendar
   */
  async getEvents(calendarUrl: string, options: {
    start?: Date;
    end?: Date;
  } = {}): Promise<any[]> {
    try {
      if (!this.account) {
        throw new Error('Not authenticated. Call authenticate() first.');
      }

      const calendar = this.account.calendars.find(cal => cal.url === calendarUrl);
      if (!calendar) {
        throw new Error(`Calendar not found: ${calendarUrl}`);
      }

      // Build time range filter if specified
      let filters: any = {};
      if (options.start || options.end) {
        filters.timeRange = {
          start: options.start || new Date('1970-01-01'),
          end: options.end || new Date('2099-12-31')
        };
      }

      const calendarObjects = await dav.listCalendarObjects(calendar, {
        xhr: this.xhr,
        ...filters
      });

      const events = [];
      for (const calObj of calendarObjects) {
        try {
          const jcalData = ICAL.parse(calObj.calendarData);
          const vcalendar = new ICAL.Component(jcalData);
          const vevents = vcalendar.getAllSubcomponents('vevent');

          for (const vevent of vevents) {
            const event = {
              uid: vevent.getFirstPropertyValue('uid'),
              url: calObj.url,
              summary: vevent.getFirstPropertyValue('summary'),
              description: vevent.getFirstPropertyValue('description'),
              location: vevent.getFirstPropertyValue('location'),
              dtstart: vevent.getFirstPropertyValue('dtstart')?.toJSDate(),
              dtend: vevent.getFirstPropertyValue('dtend')?.toJSDate(),
              categories: vevent.getFirstPropertyValue('categories')?.split(',') || [],
              created: vevent.getFirstPropertyValue('created')?.toJSDate(),
              lastModified: vevent.getFirstPropertyValue('last-modified')?.toJSDate()
            };

            events.push(event);
          }
        } catch (parseError) {
          console.warn('Failed to parse calendar object:', parseError);
        }
      }

      return events;

    } catch (error) {
      console.error('Error fetching CalDAV events:', error);
      throw new Error('Failed to fetch events from Apple Calendar');
    }
  }

  /**
   * Sync calendar changes (basic implementation)
   */
  async syncCalendar(calendarUrl: string, lastSyncToken?: string): Promise<{
    events: any[];
    syncToken: string;
    hasMore: boolean;
  }> {
    try {
      // For basic CalDAV, we don't have sophisticated sync tokens
      // This is a simplified implementation - in practice, you'd want to implement
      // proper WebDAV sync-collection for efficient syncing
      
      const events = await this.getEvents(calendarUrl);
      
      return {
        events,
        syncToken: new Date().toISOString(), // Simple timestamp-based token
        hasMore: false
      };

    } catch (error) {
      console.error('Error syncing CalDAV calendar:', error);
      throw new Error('Failed to sync Apple Calendar');
    }
  }
}

/**
 * Convert CareIQ event to Apple Calendar event format
 */
export function careiqToAppleEvent(careiqEvent: any): AppleCalendarEvent {
  return {
    summary: careiqEvent.title,
    description: `${careiqEvent.description || ''}\n\n🏥 Created by CareIQ - ${careiqEvent.category} event${careiqEvent.compliance_related ? ' (Compliance Related)' : ''}`,
    location: careiqEvent.location,
    dtstart: new Date(careiqEvent.start_time),
    dtend: careiqEvent.end_time ? new Date(careiqEvent.end_time) : undefined,
    allDay: careiqEvent.all_day || false,
    categories: careiqEvent.compliance_related ? 
      ['CareIQ', 'Compliance', careiqEvent.category] : 
      ['CareIQ', careiqEvent.category]
  };
}

/**
 * Convert Apple Calendar event to CareIQ event format
 */
export function appleToCareiqEvent(appleEvent: any, userId: string, calendarTypeId?: string) {
  return {
    user_id: userId,
    calendar_type_id: calendarTypeId,
    title: appleEvent.summary || 'Untitled Event',
    description: appleEvent.description,
    location: appleEvent.location,
    start_time: appleEvent.dtstart?.toISOString(),
    end_time: appleEvent.dtend?.toISOString(),
    all_day: appleEvent.dtstart?.isDate || false,
    apple_event_uid: appleEvent.uid,
    category: 'custom', // Default category
    sync_status: 'synced'
  };
}

/**
 * Create Apple Calendar service instance with user config
 */
export function createAppleCalendarService(config: AppleCalendarConfig): AppleCalendarService {
  if (!config.serverUrl || !config.username || !config.password) {
    throw new Error('Apple Calendar configuration is incomplete. Please provide server URL, username, and app-specific password.');
  }

  return new AppleCalendarService(config);
}

/**
 * Get iCloud CalDAV server URL for a given Apple ID
 */
export function getICloudCalDAVUrl(appleId: string): string {
  return 'https://caldav.icloud.com';
}