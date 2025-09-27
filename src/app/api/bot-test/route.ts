import { NextResponse } from 'next/server';
import DiscordBot from '@/lib/discord-bot';

let bot: DiscordBot | null = null;

export async function GET() {
  try {
    if (!bot) {
      bot = new DiscordBot();
      await bot.start();
    }

    // Get bot status
    const botStatus = {
      isConnected: bot.isBotConnected(),
      serverInfo: bot.getServerInfo(),
      testMessage: 'Voice tracking test completed - check database for test data'
    };

    return NextResponse.json({
      success: true,
      botStatus,
      message: 'Discord bot test completed with voice tracking test'
    });

  } catch (error) {
    console.error('Error in bot test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Bot test failed'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    if (!bot) {
      bot = new DiscordBot();
      await bot.start();
    }

    // Get voice activity stats
    const voiceStats = await DiscordBot.getVoiceActivityStats();
    
    // Get all voice activity
    const allVoiceActivity = await DiscordBot.getAllVoiceActivity('all', 20);

    return NextResponse.json({
      success: true,
      voiceStats,
      allVoiceActivity,
      message: 'Voice activity check completed'
    });

  } catch (error) {
    console.error('Error in voice activity check:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Voice activity check failed'
    }, { status: 500 });
  }
}
