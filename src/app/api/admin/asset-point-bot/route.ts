import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const TRACKING_FILE = path.join(process.cwd(), 'data', 'asset-point-tracking.json');
const LOG_FILE = path.join(process.cwd(), 'logs', 'asset-point-bot.log');
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'asset-point-bot.js');

// Function to read tracking data
function readTrackingData() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const data = fs.readFileSync(TRACKING_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading tracking data:', error);
  }

  return {
    lastRun: null,
    dailyCounts: {}
  };
}

// Function to write tracking data
function writeTrackingData(data: any) {
  try {
    const dataDir = path.dirname(TRACKING_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing tracking data:', error);
  }
}

// GET /api/admin/asset-point-bot - Get tracking data
export async function GET(request: NextRequest) {
  try {
    const trackingData = readTrackingData();
    return NextResponse.json(trackingData);
  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
  }
}

// POST /api/admin/asset-point-bot - Run the bot manually
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Run the asset point bot script
    const child = spawn('node', [SCRIPT_PATH], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    return new Promise<Response>((resolve) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            message: 'Asset Point Bot executed successfully',
            output: stdout
          }));
        } else {
          console.error('Bot execution failed:', stderr);
          resolve(NextResponse.json({
            error: 'Bot execution failed',
            output: stdout,
            error_output: stderr
          }, { status: 500 }));
        }
      });

      child.on('error', (error) => {
        console.error('Failed to start bot:', error);
        resolve(NextResponse.json({
          error: 'Failed to start bot process'
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('Error running bot:', error);
    return NextResponse.json({ error: 'Failed to run bot' }, { status: 500 });
  }
}
