import { NextResponse } from 'next/server';
import { autoStartBot } from '@/lib/start-bot';

export async function POST() {
  try {
    console.log('🚀 Manual bot start triggered...');
    await autoStartBot();
    
    return NextResponse.json({
      success: true,
      message: 'Bot auto-start triggered'
    });
  } catch (error) {
    console.error('Manual bot start error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start bot'
    }, { status: 500 });
  }
}
