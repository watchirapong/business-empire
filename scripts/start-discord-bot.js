const DiscordBot = require('../src/lib/discord-bot.ts').default;

async function startBot() {
  console.log('🤖 Starting Discord Bot for voice activity tracking...');
  
  try {
    const bot = new DiscordBot();
    await bot.start();
    
    console.log('✅ Discord Bot started successfully!');
    console.log('🎤 Voice activity tracking is now active');
    console.log('📊 Users joining/leaving voice channels will be tracked');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Discord Bot...');
      await bot.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down Discord Bot...');
      await bot.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Discord Bot:', error);
    process.exit(1);
  }
}

startBot();
