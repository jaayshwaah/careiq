# CareIQ Calendar Integrations

This document provides a comprehensive guide for setting up and using the calendar integration system in CareIQ. The system allows users to sync their CareIQ events with external calendar providers including Google Calendar, Microsoft Outlook Calendar, and Apple Calendar (via CalDAV).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup and Configuration](#setup-and-configuration)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Usage Guide](#usage-guide)
6. [Troubleshooting](#troubleshooting)

## Architecture Overview

The calendar integration system consists of:

- **Multiple Provider Support**: Google Calendar, Outlook Calendar, and Apple Calendar (CalDAV)
- **Calendar Types**: Categorized calendars for different types of events (care plans, daily rounds, etc.)
- **Bidirectional Sync**: Push CareIQ events to external calendars and import external events
- **Conflict Resolution**: Handle sync conflicts with user-configurable resolution strategies
- **Real-time Updates**: Support for webhooks and scheduled sync operations

### Key Components

```
src/lib/calendar/
├── google.ts          # Google Calendar API integration
├── outlook.ts         # Microsoft Outlook Calendar integration
├── apple.ts           # Apple Calendar (CalDAV) integration
└── sync-service.ts    # Main synchronization service

src/app/api/calendar/
├── types/            # Calendar type management
├── integrations/     # Integration CRUD operations
├── conflicts/        # Conflict resolution
├── google/
│   ├── auth/        # Google OAuth flow
│   └── sync/        # Google sync operations
└── outlook/
    └── auth/        # Outlook OAuth flow
```

## Setup and Configuration

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Google Calendar Integration
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/google/callback

# Microsoft Outlook Calendar Integration
OUTLOOK_CALENDAR_CLIENT_ID=your_outlook_client_id
OUTLOOK_CALENDAR_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/outlook/callback
OUTLOOK_CALENDAR_AUTHORITY=https://login.microsoftonline.com/common

# Apple Calendar (CalDAV) - No API keys needed, uses per-user credentials
```

### 2. Google Calendar Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/calendar/google/callback`
5. Copy the client ID and secret to your environment variables

### 3. Microsoft Outlook Setup

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration:
   - Name: CareIQ Calendar Integration
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: `http://localhost:3000/api/calendar/outlook/callback`
4. Add API permissions:
   - Microsoft Graph > Delegated permissions
   - Add: `Calendars.ReadWrite`, `User.Read`, `offline_access`
5. Create a client secret and copy the application ID and secret

### 4. Database Migration

Run the database migration to create the calendar integration tables:

```bash
# Apply the calendar integration schema
psql -d your_database -f src/app/api/init-db/calendar-integrations-schema.sql
```

## Database Schema

### Core Tables

- **`calendar_integrations`**: Stores OAuth tokens and integration settings for each provider
- **`calendar_types`**: Defines different calendar categories with sync preferences
- **`calendar_events`**: Enhanced events table with external calendar sync tracking
- **`calendar_sync_logs`**: Tracks sync operations and their results
- **`calendar_sync_conflicts`**: Manages sync conflicts requiring user resolution

### Key Relationships

```sql
calendar_integrations (user_id) → auth.users (id)
calendar_types (user_id) → auth.users (id)
calendar_events (user_id) → auth.users (id)
calendar_events (calendar_type_id) → calendar_types (id)
calendar_sync_logs (integration_id) → calendar_integrations (id)
calendar_sync_conflicts (event_id) → calendar_events (id)
```

## API Endpoints

### Integration Management

- `GET /api/calendar/integrations` - List user's integrations
- `PUT /api/calendar/integrations` - Update integration settings
- `DELETE /api/calendar/integrations?id={id}` - Remove integration

### Provider Authentication

- `GET /api/calendar/google/auth` - Get Google OAuth URL
- `POST /api/calendar/google/auth` - Complete Google OAuth flow
- `GET /api/calendar/outlook/auth` - Get Outlook OAuth URL
- `POST /api/calendar/outlook/auth` - Complete Outlook OAuth flow

### Synchronization

- `POST /api/calendar/google/sync` - Sync with Google Calendar
- `GET /api/calendar/google/sync` - Get sync status and logs

### Calendar Types

- `GET /api/calendar/types` - List calendar types
- `POST /api/calendar/types` - Create calendar type
- `PUT /api/calendar/types` - Update calendar type
- `DELETE /api/calendar/types?id={id}` - Delete calendar type

### Conflict Resolution

- `GET /api/calendar/conflicts` - List sync conflicts
- `POST /api/calendar/conflicts` - Resolve individual conflict
- `PUT /api/calendar/conflicts/batch` - Batch resolve conflicts

## Usage Guide

### 1. Setting Up Calendar Integrations

1. Navigate to `/calendar-integrations` in your CareIQ application
2. Click "Connect" for your desired calendar provider
3. Complete the OAuth authorization flow
4. Configure sync preferences for each integration

### 2. Creating Calendar Types

Calendar types allow you to categorize events and control which external calendars they sync to:

```javascript
// Example calendar type creation
{
  name: "Care Plan Calendar",
  description: "Care plan events and milestones", 
  category: "care_plan",
  color: "#10B981",
  syncToExternal: true,
  syncFromExternal: false,
  googleCalendarId: "primary",
  outlookCalendarId: "AQMkADAwATY3ZmYAZS1kN...",
  appleCalendarName: "CareIQ Care Plans"
}
```

### 3. Event Synchronization

Events are automatically synced based on calendar type settings:

- **Push Sync**: CareIQ events → External calendars
- **Pull Sync**: External calendar events → CareIQ  
- **Bidirectional**: Both directions with conflict detection

### 4. Managing Sync Conflicts

When the same event is modified in both CareIQ and an external calendar, conflicts are detected and stored for resolution:

- **Use Local**: Keep the CareIQ version
- **Use External**: Accept the external calendar version
- **Manual Resolution**: Manually specify the correct data
- **Ignore**: Skip syncing this event

### 5. Programmatic Usage

```javascript
// Create a sync service instance
import { createCalendarSyncService } from '@/lib/calendar/sync-service';

const syncService = createCalendarSyncService();

// Sync all Google Calendar integrations for a user
const result = await syncService.syncCalendar({
  provider: 'google',
  userId: 'user-123',
  direction: 'bidirectional',
  syncType: 'manual'
});

console.log(`Processed ${result.eventsProcessed} events`);
console.log(`Created ${result.eventsCreated}, Updated ${result.eventsUpdated}`);
```

## Calendar Provider Specifics

### Google Calendar

- **Authentication**: OAuth 2.0 with offline access
- **Scopes Required**: `Calendars.ReadWrite`
- **Rate Limits**: 1,000 requests per 100 seconds per user
- **Features**: Full CRUD operations, webhook support
- **Event Format**: Standard Google Calendar API format

### Microsoft Outlook Calendar

- **Authentication**: OAuth 2.0 via Microsoft Graph
- **Scopes Required**: `Calendars.ReadWrite`, `User.Read`, `offline_access`
- **Rate Limits**: Varies by license type
- **Features**: Full CRUD operations, webhook support via Microsoft Graph
- **Event Format**: Microsoft Graph API format

### Apple Calendar (CalDAV)

- **Authentication**: Username/Password (App-specific password for iCloud)
- **Protocol**: CalDAV over HTTPS
- **Rate Limits**: Server-dependent
- **Features**: Basic CRUD operations, no webhook support
- **Event Format**: iCalendar (RFC 5545) format

## Error Handling

The system includes comprehensive error handling:

1. **Token Refresh**: Automatic refresh of expired OAuth tokens
2. **Rate Limiting**: Respect provider rate limits with backoff
3. **Network Errors**: Retry logic for transient failures
4. **Conflict Detection**: Automatic detection and resolution workflows
5. **Audit Logging**: Complete sync operation logs

## Security Considerations

1. **Token Storage**: OAuth tokens are stored encrypted in the database
2. **Credential Security**: CalDAV passwords should be app-specific passwords
3. **Data Privacy**: Only sync events that users explicitly configure
4. **Access Control**: All operations respect Row Level Security (RLS) policies
5. **Audit Trail**: Complete logging of sync operations and data changes

## Troubleshooting

### Common Issues

1. **"Token expired" errors**
   - Ensure refresh tokens are properly stored
   - Check token refresh logic in sync service

2. **"Calendar not found" errors**  
   - Verify external calendar IDs are correct
   - Check that calendars still exist and are accessible

3. **"Sync conflicts" appearing frequently**
   - Review conflict resolution policies
   - Consider adjusting sync frequency
   - Check for clock synchronization issues

4. **Apple Calendar connection failures**
   - Ensure using app-specific passwords for iCloud
   - Verify CalDAV server URL is correct
   - Check network connectivity to caldav.icloud.com

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=calendar:*
```

This will provide detailed logs for all calendar operations.

### Health Check

Monitor calendar integration health:

```javascript
// Check integration status
const integrations = await fetch('/api/calendar/integrations');
const conflicts = await fetch('/api/calendar/conflicts?status=pending');

// Alert if there are many pending conflicts or failed syncs
```

## Contributing

When adding new calendar providers or features:

1. Follow the existing provider interface patterns
2. Add comprehensive error handling
3. Include integration tests
4. Update documentation
5. Consider rate limiting and performance impact

## License

This calendar integration system is part of CareIQ and follows the same licensing terms.