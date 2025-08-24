import DiscordBot from './discord-bot';

class BotManager {
  private static instance: BotManager;
  private bot: DiscordBot | null = null;
  private autoStartEnabled: boolean = true;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  public async startBot(): Promise<DiscordBot | null> {
    try {
      if (this.bot && this.bot.isBotConnected()) {
        console.log('🤖 Discord bot is already running');
        return this.bot;
      }

      console.log('🚀 Starting Discord bot...');
      this.bot = new DiscordBot();
      await this.bot.start();
      
      this.reconnectAttempts = 0; // Reset on successful start
      console.log('✅ Discord bot started successfully');
      
      return this.bot;
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
      
      if (this.autoStartEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to restart bot in ${this.reconnectDelay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
          this.startBot();
        }, this.reconnectDelay);
      } else {
        console.log('❌ Max reconnection attempts reached or auto-start disabled');
      }
      
      return null;
    }
  }

  public async stopBot(): Promise<void> {
    try {
      if (this.bot) {
        await this.bot.stop();
        this.bot = null;
        console.log('🛑 Discord bot stopped');
      }
    } catch (error) {
      console.error('❌ Error stopping Discord bot:', error);
    }
  }

  public getBot(): DiscordBot | null {
    return this.bot;
  }

  public isBotConnected(): boolean {
    return this.bot ? this.bot.isBotConnected() : false;
  }

  public setAutoStart(enabled: boolean): void {
    this.autoStartEnabled = enabled;
    console.log(`🔧 Auto-start ${enabled ? 'enabled' : 'disabled'}`);
  }

  public async autoStart(): Promise<void> {
    if (this.autoStartEnabled && process.env.DISCORD_BOT_TOKEN) {
      console.log('🔄 Auto-starting Discord bot...');
      await this.startBot();
    } else if (!process.env.DISCORD_BOT_TOKEN) {
      console.log('⚠️ Discord bot token not configured, skipping auto-start');
    } else {
      console.log('⚠️ Auto-start disabled');
    }
  }
}

export default BotManager;
