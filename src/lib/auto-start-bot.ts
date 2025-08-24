import { autoStartBot } from './start-bot';

// Auto-start the Discord bot when the server starts
let autoStartInitialized = false;

export async function initializeAutoStart() {
  if (autoStartInitialized) {
    return;
  }
  
  autoStartInitialized = true;
  
  console.log('🔧 Initializing Discord bot auto-start...');
  
  // Wait a bit for the server to fully initialize
  setTimeout(async () => {
    try {
      await autoStartBot();
    } catch (error) {
      console.error('❌ Error during auto-start initialization:', error);
    }
  }, 3000); // 3 second delay
}

// Initialize on module load if in production or development
if (process.env.NODE_ENV !== 'test') {
  initializeAutoStart();
}
