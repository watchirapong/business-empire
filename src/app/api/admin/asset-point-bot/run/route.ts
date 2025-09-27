import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'asset-point-bot.js');

// POST /api/admin/asset-point-bot/run - Run the bot manually
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
            output: stdout.trim()
          }));
        } else {
          console.error('Bot execution failed:', stderr);
          resolve(NextResponse.json({
            error: 'Bot execution failed',
            output: stdout.trim(),
            error_output: stderr.trim()
          }, { status: 500 }));
        }
      });

      child.on('error', (error) => {
        console.error('Failed to start bot:', error);
        resolve(NextResponse.json({
          error: 'Failed to start bot process',
          details: error.message
        }, { status: 500 }));
      });
    });
  } catch (error) {
    console.error('Error running bot:', error);
    return NextResponse.json({
      error: 'Failed to run bot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
