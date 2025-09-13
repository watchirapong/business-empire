import { NextResponse } from 'next/server';
import { connectDB } from '../../../config/database';

export async function GET() {
  try {
    // Check database connection
    await connectDB();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        application: 'running'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        application: 'running'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
