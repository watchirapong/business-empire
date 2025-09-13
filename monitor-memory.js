const pm2 = require('pm2');

function checkMemory() {
  pm2.list((err, list) => {
    if (err) {
      console.error('Error getting PM2 list:', err);
      return;
    }
    
    const businessEmpire = list.find(app => app.name === 'business-empire');
    if (businessEmpire) {
      const memoryMB = Math.round(businessEmpire.monit.memory / 1024 / 1024);
      const cpu = businessEmpire.monit.cpu;
      const timestamp = new Date().toISOString();
      
      console.log(`[${timestamp}] Memory: ${memoryMB}MB, CPU: ${cpu}%`);
      
      // Alert if memory usage is too high
      if (memoryMB > 500) {
        console.warn(`⚠️  HIGH MEMORY USAGE: ${memoryMB}MB`);
      }
    }
  });
}

// Check memory every 30 seconds
setInterval(checkMemory, 30000);

// Initial check
checkMemory();

console.log('Memory monitoring started. Checking every 30 seconds...');
