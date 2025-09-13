const { io } = require('socket.io-client');

// Test admin status function
function isAdmin(userId) {
  const ADMIN_USER_IDS = ['898059066537029692', 'watchirapongggg'];
  const SUPER_ADMIN_ID = '898059066537029692';
  
  return ADMIN_USER_IDS.includes(userId) || userId === SUPER_ADMIN_ID;
}

// Test data
const testUserId = '898059066537029692';
const testUsername = 'watchirapongggg';

console.log('🔍 Testing Admin Status:');
console.log(`User ID: ${testUserId}`);
console.log(`Username: ${testUsername}`);
console.log(`Is Admin: ${isAdmin(testUserId)}`);
console.log(`Is Admin (by username): ${isAdmin(testUsername)}`);

// Test Socket.IO connection
console.log('\n🔌 Testing Socket.IO Connection:');

const socket = io('https://hamsterhub.fun', {
  transports: ['websocket', 'polling'],
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connected successfully!');
  console.log(`Socket ID: ${socket.id}`);
  
  // Test joining assessment room
  console.log('\n🎯 Testing assessment:joinRoom:');
  socket.emit('assessment:joinRoom', {
    roomId: 'ASSESS01',
    name: testUsername,
    isAdmin: isAdmin(testUserId),
    userId: testUserId
  });
});

socket.on('assessment:state', (state) => {
  console.log('📤 Received assessment:state:', JSON.stringify(state, null, 2));
});

socket.on('assessment:error', (error) => {
  console.log('❌ Received assessment:error:', error);
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket.IO connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout reached');
  socket.disconnect();
  process.exit(0);
}, 10000);
