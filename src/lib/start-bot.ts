import BotManager from './bot-manager';

const botManager = BotManager.getInstance();

export async function startDiscordBot() {
  return await botManager.startBot();
}

export async function stopDiscordBot() {
  await botManager.stopBot();
}

export function getBot() {
  return botManager.getBot();
}

export function isBotConnected() {
  return botManager.isBotConnected();
}

export async function autoStartBot() {
  await botManager.autoStart();
}
