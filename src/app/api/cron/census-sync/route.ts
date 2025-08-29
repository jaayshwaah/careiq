// Cron job endpoint for automated daily census sync
// This should be called by Vercel Cron, GitHub Actions, or external service
import { NextRequest, NextResponse } from "next/server";
import { CensusIntegrationService } from "@/lib/integrations/ehr-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    if (cronSecret !== expectedSecret) {
      console.error('Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting automated census sync...');
    const startTime = Date.now();

    const integrationService = new CensusIntegrationService();
    await integrationService.syncAllFacilities();

    const duration = Date.now() - startTime;
    console.log(`Census sync completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Census sync completed successfully',
      duration: duration
    });

  } catch (error) {
    console.error('Automated census sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Allow GET requests for health checks
  return NextResponse.json({
    service: 'census-sync',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}