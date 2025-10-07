# Leaderboard Discord Nickname System

## Overview
The leaderboard now displays Discord nicknames prominently, showing the best available display name for each user with priority given to Discord server nicknames.

## Features

### ✅ **Discord Nickname Display**
- **Primary Display**: Shows Discord server nickname if available
- **Fallback Priority**: nickname > globalName > username
- **Visual Indicators**: 🏷️ for Discord nicknames, 🌍 for global names
- **Enhanced User Model**: Uses new enhanced user system when available
- **Backward Compatibility**: Falls back to legacy system seamlessly

### ✅ **Display Name Priority System**
1. **Discord Server Nickname** (`member.nick`) - Highest priority
2. **Global Name** (`user.global_name`) - Discord's global display name  
3. **Username** (`user.username`) - Fallback option
4. **Generated Name** (`User1234`) - Last resort

### ✅ **Visual Enhancements**
- Discord nicknames shown with 🏷️ icon in blue
- Global names shown with 🌍 icon in green
- Truncated display to prevent overflow
- Maintains existing leaderboard styling

## Implementation

### **1. Updated Leaderboard API**
**File**: `src/app/api/leaderboard/route.ts`
- Uses enhanced user model when available
- Falls back to legacy system seamlessly
- Fetches Discord nicknames from server data
- Returns additional Discord information

### **2. Enhanced Leaderboard Component**
**File**: `src/components/Leaderboard.tsx`
- Displays Discord nicknames prominently
- Shows global names when different
- Visual indicators for different name types
- Maintains responsive design

### **3. Data Structure**
```typescript
interface LeaderboardEntry {
  userId: string;
  username: string;           // Primary display name
  avatar: string;
  totalEarned: number;
  rank: number;
  discordNickname?: string;   // Server nickname
  globalName?: string;        // Discord global name
  roles?: string[];           // Discord roles
}
```

## How It Works

### **Enhanced User Model (Preferred)**
```javascript
// Priority: Discord nickname > globalName > username
const displayName = user.discordServerData?.nickname || 
                   user.globalName || 
                   user.username || 
                   `User${user.discordId.slice(-4)}`;
```

### **Legacy System (Fallback)**
```javascript
// Try to fetch Discord nickname via API
let discordNickname = null;
if (!user?.username) {
  const discordResponse = await fetch(`/api/users/get-server-nickname?userId=${userId}`);
  discordNickname = discordResponse.nickname;
}

// Priority: Discord nickname > username > globalName > fallback
const displayName = discordNickname || 
                   user?.username || 
                   user?.globalName || 
                   `User${userId.slice(-4)}`;
```

## Visual Display

### **Leaderboard Entry Example**
```
1. JohnDoe                    🏷️ Johnny
   User ID: 123456789
   Total Earned: 1,500 coins
   🌍 John Smith
```

### **Display Logic**
- **Main Name**: Always shows the primary display name
- **Discord Nickname**: Shows with 🏷️ if different from main name
- **Global Name**: Shows with 🌍 if different from main name and nickname
- **Truncation**: Long names are truncated to prevent overflow

## Testing

### **Test Script**
```bash
# Test leaderboard nickname display
node scripts/test-leaderboard-nicknames.js
```

### **What the Test Checks**
- ✅ API returns nickname data
- ✅ Display name priority works correctly
- ✅ Visual indicators are present
- ✅ Statistics on nickname usage
- ✅ Fallback system works

## Integration with Recovery System

### **After Discord Recovery**
1. Run the Discord recovery process
2. Enhanced user model is created with Discord server data
3. Leaderboard automatically uses Discord nicknames
4. No additional configuration needed

### **Before Recovery**
- Leaderboard falls back to legacy system
- May fetch nicknames via Discord API calls
- Still shows best available display name

## Benefits

### **For Users**
- ✅ See familiar Discord nicknames in leaderboard
- ✅ Better recognition of other users
- ✅ Consistent with Discord experience

### **For Admins**
- ✅ Easy to identify users by their Discord nicknames
- ✅ Better user management
- ✅ Enhanced user experience

### **For System**
- ✅ Backward compatible with existing system
- ✅ Automatic fallback to legacy system
- ✅ No breaking changes

## Configuration

### **Environment Variables**
```env
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=699984143542517801
MONGODB_URI=mongodb://localhost:27017/business-empire
NEXTAUTH_URL=http://localhost:3000
```

### **Required Permissions**
- Discord bot needs `guilds.members.read` permission
- Bot must be in the Discord server
- Users must have role `1397111512619028551`

## Troubleshooting

### **Common Issues**

1. **No Nicknames Showing**
   - Check if Discord recovery has been run
   - Verify Discord bot permissions
   - Check if users have the target role

2. **API Errors**
   - Verify environment variables
   - Check MongoDB connection
   - Review server logs

3. **Display Issues**
   - Check browser console for errors
   - Verify API response format
   - Test with different users

### **Debug Steps**
1. Run test script: `node scripts/test-leaderboard-nicknames.js`
2. Check API response: `curl /api/leaderboard`
3. Verify Discord data: Check admin panel
4. Review server logs for errors

## Future Enhancements

### **Potential Improvements**
- Real-time nickname updates
- Role-based display customization
- Avatar integration with Discord
- Custom nickname preferences
- Bulk nickname management

The leaderboard now provides a much better user experience by showing Discord nicknames prominently while maintaining full backward compatibility with the existing system.
