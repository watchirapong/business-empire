// Centralized admin configuration
export const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '563644358352568331', '315548736388333568'];

// Super admin - only this user can manage admin users
export const SUPER_ADMIN_ID = '898059066537029692';

// Helper function to check if a user is admin
export const isAdmin = (userId: string): boolean => {
  return ADMIN_USER_IDS.includes(userId);
};

// Helper function to check if a user is admin (including dynamic admins from database)
export const isAdminWithDB = async (userId: string): Promise<boolean> => {
  console.log('🔍 isAdminWithDB called with userId:', userId);
  
  // First check hardcoded admins
  if (ADMIN_USER_IDS.includes(userId)) {
    console.log('✅ User found in hardcoded admins');
    return true;
  }
  console.log('❌ User not in hardcoded admins, checking database...');

  // Then check dynamic admins from database
  try {
    // Use a direct database query approach
    const mongoose = await import('mongoose');
    
    // Connect if not already connected
    if (!mongoose.default.connection.readyState || mongoose.default.connection.readyState !== 1) {
      await mongoose.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Define schema and model
    const adminUserSchema = new mongoose.default.Schema({
      userId: { type: String, required: true, unique: true },
      addedBy: { type: String, required: true },
      addedAt: { type: Date, default: Date.now },
    });

    const AdminUser = mongoose.default.models.AdminUser || mongoose.default.model('AdminUser', adminUserSchema);
    console.log('🔍 Querying database for userId:', userId);
    const dynamicAdmin = await AdminUser.findOne({ userId });
    
    if (dynamicAdmin) {
      console.log('✅ User found in database:', dynamicAdmin);
      return true;
    } else {
      console.log('❌ User not found in database');
      return false;
    }
  } catch (error) {
    console.error('Error checking dynamic admin:', error);
    return false;
  }
};

// Check if user is super admin
export const isSuperAdmin = (userId: string | undefined | null): boolean => {
  if (!userId) return false;
  return userId === SUPER_ADMIN_ID;
};

// Function to check if user has a specific Discord role
export const hasDiscordRole = async (userId: string, requiredRoleId: string): Promise<boolean> => {
  try {
    console.log(`hasDiscordRole called - User ID: ${userId}, Required Role ID: ${requiredRoleId}`);
    
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('Discord bot token not configured');
      return false;
    }

    // Get guild ID from environment or use default
    const guildId = process.env.DISCORD_GUILD_ID || '699984143542517801';
    console.log(`Using guild ID: ${guildId}`);

    console.log('Discord bot token is configured, fetching member data...');

    // Get user's roles from Discord
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Discord API response status: ${response.status}`);

    if (!response.ok) {
      console.error('Failed to fetch Discord member data:', response.status);
      const errorText = await response.text();
      console.error('Discord API error response:', errorText);
      
      // If user is not found in the guild, they don't have the role
      if (response.status === 404) {
        console.log(`User ${userId} not found in guild ${guildId}`);
        return false;
      }
      
      // For other errors, log but don't fail completely
      console.error('Discord API error, but continuing with role check');
      return false;
    }

    const memberData = await response.json();
    console.log('Discord member data:', JSON.stringify(memberData, null, 2));
    
    const userRoles = memberData.roles || [];
    console.log(`User roles: ${JSON.stringify(userRoles)}`);

    // Check if user has the required role
    const hasRole = userRoles.includes(requiredRoleId);
    console.log(`User ${userId} has role ${requiredRoleId}: ${hasRole}`);
    
    return hasRole;
  } catch (error) {
    console.error('Error checking Discord role:', error);
    // Don't fail completely on network errors, just log and return false
    return false;
  }
};

// Admin configuration object
export const adminConfig = {
  userIds: ADMIN_USER_IDS,
  isAdmin,
  isAdminWithDB,
  isSuperAdmin,
  hasDiscordRole,
};
