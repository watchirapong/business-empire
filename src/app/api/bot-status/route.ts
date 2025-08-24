import { NextResponse } from 'next/server';
import { isBotConnected } from '@/lib/start-bot';

export async function GET() {
  try {
    const isConnected = isBotConnected();
    
    return NextResponse.json({
      success: true,
      botConnected: isConnected,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bot status check error:', error);
    return NextResponse.json({
      success: false,
      botConnected: false,
      error: 'Failed to check bot status'
    });
  }
}
