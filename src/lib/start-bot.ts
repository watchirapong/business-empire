import DiscordBot from './discord-bot';

let bot: DiscordBot | null = null;

export async function startDiscordBot() {
  try {
    if (!bot) {
      bot = new DiscordBot();
      await bot.start();
      console.log('🤖 Discord Bot placeholder started (discord.js not installed)');
    }
    return bot;
  } catch (error) {
    console.error('Failed to start Discord bot:', error);
    return null;
  }
}

export async function stopDiscordBot() {
  try {
    if (bot) {
      await bot.stop();
      bot = null;
      console.log('🤖 Discord Bot stopped');
    }
  } catch (error) {
    console.error('Failed to stop Discord bot:', error);
  }
}

export function getBot() {
  return bot;
}
