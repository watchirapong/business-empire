# Discord User Recovery System

## Overview
A comprehensive system to recover user data from Discord after a MongoDB hack. This system fetches all users with role `1397111512619028551` and creates new accounts with 100 hamstercoins each, including Discord nicknames and server-specific data.

## Features

### ✅ **Discord User Recovery**
- Fetches all users with role `1397111512619028551` from Discord
- Captures Discord usernames, global names, and **server nicknames**
- Stores Discord roles and join dates
- Creates new user accounts in MongoDB
- Gives 100 hamstercoins to each recovered user

### ✅ **Enhanced User Model**
- New `EnhancedUser` model with embedded Discord server data
- Includes nickname, display name, roles, and server information
- Embedded currency system (hamstercoins)
- Backward compatibility with existing user system

### ✅ **Admin Interface**
- New "🔄 Discord Recovery" tab in admin panel
- Preview users before recovery
- Real-time recovery progress
- Detailed statistics and error reporting
- Visual display of Discord nicknames and roles

### ✅ **API Endpoints**
- `GET /api/admin/discord-recovery` - Preview users
- `POST /api/admin/discord-recovery` - Perform recovery
- `GET /api/admin/enhanced-users` - Get enhanced user data
- `POST /api/admin/enhanced-users` - Manage user currency

## Implementation Details

### **1. Discord Recovery Service**
**File**: `services/discordRecoveryService.js`
- Fetches users from Discord API with role `1397111512619028551`
- Captures nickname data (`member.nick`)
- Creates display name priority: nickname > globalName > username
- Saves users to MongoDB with 100 hamstercoins each
- Creates enhanced user model with Discord server data

### **2. Enhanced User Model**
```javascript
{
  discordId: String,
  username: String,
  globalName: String,
  discordServerData: {
    nickname: String,        // Server-specific nickname
    displayName: String,     // Best display name
    roles: [String],         // Discord roles
    joinedAt: Date,          // Server join date
    guildId: String,         // Discord server ID
    guildName: String        // Server name
  },
  currency: {
    hamsterCoins: Number,    // Current balance
    totalEarned: Number,     // Total earned
    totalSpent: Number       // Total spent
  }
}
```

### **3. Admin Interface**
**File**: `src/components/admin/DiscordRecoveryManager.tsx`
- Preview users with nicknames before recovery
- Visual display of Discord data
- Recovery progress tracking
- Error handling and reporting

### **4. Recovery Process**
1. **Fetch Users**: Get all users with role `1397111512619028551`
2. **Save Users**: Create/update user accounts in MongoDB
3. **Create Currency**: Give 100 hamstercoins to each user
4. **Enhanced Model**: Create enhanced user model
5. **Migrate Data**: Migrate existing users to enhanced model
6. **Update Server Data**: Populate Discord nicknames and roles

## Usage

### **Via Admin Panel**
1. Go to Admin Panel → "🔄 Discord Recovery" tab
2. Click "👁️ Preview Users" to see users with nicknames
3. Click "🚀 Start Recovery" to begin the process
4. Monitor progress and view results

### **Via Command Line**
```bash
# Run the recovery script
node scripts/discord-recovery.js

# Test nickname functionality
node scripts/test-discord-nicknames.js
```

### **Environment Variables Required**
```env
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=699984143542517801
MONGODB_URI=mongodb://localhost:27017/business-empire
```

## Discord Nickname Support

### **Nickname Priority System**
1. **Server Nickname** (`member.nick`) - Highest priority
2. **Global Name** (`user.global_name`) - Discord's global display name
3. **Username** (`user.username`) - Fallback

### **Display Logic**
```javascript
displayName = nickname || globalName || username
```

### **Data Captured**
- ✅ Discord username (`@username`)
- ✅ Global name (Discord's display name)
- ✅ **Server nickname** (server-specific nickname)
- ✅ Discord roles (including target role `1397111512619028551`)
- ✅ Server join date
- ✅ Avatar and discriminator

## Recovery Results

### **User Data Recovery**
- Users Created: New accounts created
- Users Updated: Existing accounts updated
- Currency Accounts: New currency accounts with 100 hamstercoins
- Errors: Any issues during recovery

### **Enhanced Model Migration**
- Users Migrated: Existing users moved to enhanced model
- Migration Errors: Issues during migration

### **Discord Server Data**
- Users Updated: Discord nicknames and roles populated
- Update Errors: Issues updating server data

## Security Features

- ✅ Admin-only access to recovery functions
- ✅ Preview mode before actual recovery
- ✅ Error handling and rollback capability
- ✅ Detailed logging and audit trail
- ✅ Environment variable validation

## Integration with Existing System

### **Backward Compatibility**
- Existing user system continues to work
- Enhanced model is optional upgrade
- Currency system works with both models
- Admin panel supports both user types

### **User Management**
- Enhanced user management page
- Currency management with hamstercoins
- Discord server data display
- Role-based access control

## Files Created/Modified

### **New Files**
- `services/discordRecoveryService.js` - Core recovery service
- `src/components/admin/DiscordRecoveryManager.tsx` - Admin interface
- `src/app/api/admin/discord-recovery/route.ts` - Recovery API
- `src/app/api/admin/enhanced-users/route.ts` - Enhanced users API
- `src/lib/mongodb.ts` - MongoDB connection utility
- `scripts/discord-recovery.js` - Recovery script
- `scripts/test-discord-nicknames.js` - Test script

### **Modified Files**
- `src/app/admin/page.tsx` - Added Discord Recovery tab
- `models/User.js` - Enhanced with Discord data support
- `models/Currency.js` - Hamstercoin currency system

## Next Steps

1. **Run Recovery**: Execute the recovery process to restore users
2. **Verify Data**: Check that nicknames and roles are properly captured
3. **Update Pages**: Replace old MongoDB connections with new system
4. **Test Currency**: Verify hamstercoin system works correctly
5. **Monitor**: Watch for any issues during the transition

## Support

If you encounter any issues:
1. Check environment variables are set correctly
2. Verify Discord bot has proper permissions
3. Check MongoDB connection
4. Review error logs in the admin panel
5. Run the test script to verify functionality

The system is designed to be robust and handle errors gracefully while providing detailed feedback on the recovery process.
