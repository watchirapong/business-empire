import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TRACKING_FILE = path.join(process.cwd(), 'data', 'asset-point-tracking.json');

// POST /api/admin/asset-point-bot/reset - Reset daily count
export async function POST(request: NextRequest) {
  try {
    const trackingData = {
      lastRun: null,
      dailyCounts: {}
    };

    const dataDir = path.dirname(TRACKING_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(TRACKING_FILE, JSON.stringify(trackingData, null, 2));

    return NextResponse.json({
      message: 'Daily count reset successfully',
      data: trackingData
    });
  } catch (error) {
    console.error('Error resetting daily count:', error);
    return NextResponse.json({ error: 'Failed to reset daily count' }, { status: 500 });
  }
}
