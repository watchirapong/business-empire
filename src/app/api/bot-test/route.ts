import { NextRequest, NextResponse } from 'next/server';
import DiscordBot from '@/lib/discord-bot';

let bot: DiscordBot | null = null;

export async function GET() {
  try {
    if (!bot) {
      bot = new DiscordBot();
      await bot.start();
    }

    // Test connection
    const connectionTest = await bot.testConnection();
    
    // Get bot status
    const botStatus = {
      isConnected: bot.isBotConnected(),
      botMode: bot.getBotMode(),
      connectionTest,
      activeSessions: bot.getActiveVoiceSessions(),
      recentVoiceActivity: bot.getRecentVoiceActivity(),
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

    // Force check voice activity
    const forceCheck = await bot.forceCheckVoiceActivity();
    
    // Check specific user (your user ID)
    const userVoiceStatus = await bot.checkUserVoiceStatus('641285950902632459', 'watchirapongth');
    
    // Get all voice users
    const allVoiceUsers = await bot.getAllVoiceUsers();
    
    // Get all voice channels
    const allVoiceChannels = await bot.getAllVoiceChannels();
    
    // Set bot presence to online
    const botPresence = await bot.setBotPresence('online', 'Monitoring Voice Channels');

    return NextResponse.json({
      success: true,
      forceCheck,
      userVoiceStatus,
      allVoiceUsers,
      allVoiceChannels,
      botPresence,
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
