# Census Integration Guide

CareIQ supports automated census data synchronization from popular EHR systems, allowing you to track occupancy, admissions, discharges, and payer mix data automatically.

## Supported EHR Systems

### ✅ PointClickCare (Fully Supported)
- **Real-time census sync**
- **Resident demographics**
- **Admission/discharge tracking**
- **Payer mix analysis**
- **OAuth 2.0 authentication**

### 🔄 Coming Soon
- **MatrixCare** - In development
- **CareGiver/CareMerge** - Planned
- **Custom API integrations** - Contact us

## Setup Instructions

### 1. PointClickCare Integration

#### Prerequisites
- PointClickCare account with API access
- Administrator or Manager role in CareIQ
- API credentials from PointClickCare

#### Configuration Steps

1. **Navigate to Census Management**
   ```
   CareIQ Dashboard → Census → EHR Setup
   ```

2. **Select PointClickCare**
   - Choose "PointClickCare" from the EHR system options

3. **Enter API Credentials**
   ```
   API Endpoint: https://api.pointclickcare.com
   Client ID: [Your Client ID]
   Client Secret: [Your Client Secret]
   Username: [Your PCC Username]
   Password: [Your PCC Password]
   ```

4. **Set Sync Schedule**
   - Daily at 6:00 AM (recommended)
   - Twice daily (6 AM & 6 PM)
   - Every hour (for high-volume facilities)

5. **Test Connection**
   - Click "Test Connection" to verify credentials
   - Save configuration once test passes

### 2. Manual Entry (No EHR Integration)

If you don't have an EHR integration:

1. **Go to Manual Entry Tab**
   ```
   Census → Manual Entry
   ```

2. **Enter Daily Data**
   - Total beds
   - Occupied beds
   - Today's admissions/discharges
   - Payer mix breakdown

3. **Submit Data**
   - Data is saved immediately
   - Available in dashboard charts

## Features

### 📊 Dashboard Analytics
- **Real-time occupancy rates**
- **30-day occupancy trends**
- **Admission/discharge tracking**
- **Payer mix visualization**
- **Sync status monitoring**

### 🔄 Automated Sync
- **Daily scheduled sync at 6 AM**
- **Manual sync on-demand**
- **Error logging and alerts**
- **Data validation and cleanup**

### 📈 Reporting
- **Occupancy rate trends**
- **Length of stay analysis**
- **Payer source distribution**
- **Admission/discharge patterns**

## API Endpoints

### Get Census Data
```http
GET /api/census/sync
Authorization: Bearer [token]

Response:
{
  "censusData": [...],
  "syncLogs": [...],
  "lastSync": "2024-01-01T06:00:00Z"
}
```

### Manual Sync
```http
POST /api/census/sync
Authorization: Bearer [token]
Content-Type: application/json

{
  "facilityId": "optional-facility-id"
}
```

### Integration Setup
```http
POST /api/census/integration
Authorization: Bearer [token]
Content-Type: application/json

{
  "ehrSystem": "pointclickcare",
  "apiEndpoint": "https://api.pointclickcare.com",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "username": "your-username",
  "password": "your-password",
  "syncFrequency": "daily",
  "syncTime": "06:00:00"
}
```

## Database Schema

### Census Snapshots
```sql
census_snapshots (
  id, facility_id, date,
  total_beds, occupied_beds, available_beds,
  occupancy_rate, admission_count, discharge_count,
  skilled_nursing_beds, memory_care_beds, assisted_living_beds,
  private_pay_count, medicare_count, medicaid_count, insurance_count,
  source, sync_status, error_message,
  created_at, updated_at
)
```

### EHR Integrations
```sql
ehr_integrations (
  id, facility_id, ehr_system,
  api_endpoint, username, password_encrypted,
  client_id, client_secret_encrypted, auth_token_encrypted,
  sync_frequency, sync_time, last_sync_at,
  is_active, created_at, updated_at
)
```

### Sync Logs
```sql
census_sync_logs (
  id, facility_id, integration_id, sync_date,
  status, records_synced, error_message,
  execution_time_ms, created_at
)
```

## Security

### Data Encryption
- **API credentials encrypted at rest**
- **Row-level security (RLS) enabled**
- **Facility-based data isolation**
- **Audit logging for all changes**

### Access Control
- **Administrator**: Full integration setup
- **Manager**: View data, manual sync
- **User**: View dashboard only

## Automation

### Vercel Cron (Recommended)
```json
{
  "crons": [
    {
      "path": "/api/cron/census-sync",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### External Cron
```bash
# Daily at 6 AM
0 6 * * * curl -X POST https://your-app.vercel.app/api/cron/census-sync \
  -H "x-cron-secret: your-secret"
```

### GitHub Actions
```yaml
name: Daily Census Sync
on:
  schedule:
    - cron: '0 6 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Census Sync
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/census-sync \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify API credentials
   - Check if account has API access
   - Ensure proper permissions in EHR system

2. **Sync Failing**
   - Check sync logs in dashboard
   - Verify network connectivity
   - Check rate limiting (API calls per hour)

3. **Data Inconsistencies**
   - Compare with EHR system directly
   - Check for timezone differences
   - Review data mapping configurations

### Error Messages

| Error | Cause | Solution |
|-------|--------|----------|
| `Authentication failed` | Invalid credentials | Update API credentials |
| `Connection timeout` | Network issues | Check firewall/proxy |
| `Rate limit exceeded` | Too many API calls | Reduce sync frequency |
| `Invalid data format` | EHR system changes | Contact support |

## Support

### Getting Help
- **Documentation**: Check this guide first
- **Support Portal**: Submit tickets for integration issues
- **Email**: support@careiq.app
- **Phone**: Available for enterprise customers

### Custom Integrations
If your EHR system isn't supported:
- Contact our integration team
- Provide API documentation
- We'll work with you to build custom connectors
- Typical development time: 2-4 weeks

## Pricing

### Standard Features (Included)
- Daily sync for up to 3 EHR systems
- Dashboard and reporting
- Manual entry capability
- Email alerts for sync failures

### Premium Features
- Real-time sync (every 15 minutes)
- Custom reporting and exports
- Advanced analytics and forecasting
- Priority integration support
- Custom EHR connectors

Contact sales for premium feature pricing.