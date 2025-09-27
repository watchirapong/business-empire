import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TRACKING_FILE = path.join(process.cwd(), 'data', 'asset-point-tracking.json');

// GET /api/admin/asset-point-bot/tracking - Get tracking data
export async function GET(request: NextRequest) {
  try {
    let trackingData;

    if (fs.existsSync(TRACKING_FILE)) {
      const data = fs.readFileSync(TRACKING_FILE, 'utf8');
      trackingData = JSON.parse(data);
    } else {
      trackingData = {
        lastRun: null,
        dailyCounts: {}
      };
    }

    return NextResponse.json(trackingData);
  } catch (error) {
    console.error('Error reading tracking data:', error);
    return NextResponse.json({
      lastRun: null,
      dailyCounts: {}
    });
  }
}
