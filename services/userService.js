const User = require('../models/User');

class UserService {
  // Create or update user from Discord data
  async createOrUpdateUser(discordData) {
    try {
      const { id, username, email, avatar, discriminator, globalName, accessToken, refreshToken } = discordData;
      
      // Check if user already exists
      let user = await User.findOne({ discordId: id });
      
      if (user) {
        // Update existing user
        user.username = username;
        user.email = email;
        user.avatar = avatar;
        user.discriminator = discriminator;
        user.globalName = globalName;
        user.accessToken = accessToken;
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        user.loginCount += 1;
        user.isActive = true;
        
        await user.save();
        console.log(`Updated existing user: ${username} (${id})`);
      } else {
        // Create new user
        user = new User({
          discordId: id,
          username,
          email,
          avatar,
          discriminator,
          globalName,
          accessToken,
          refreshToken,
          lastLogin: new Date(),
          loginCount: 1,
          isActive: true
        });
        
        await user.save();
        console.log(`Created new user: ${username} (${id})`);
      }
      
      return user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Find user by Discord ID
  async findUserByDiscordId(discordId) {
    try {
      return await User.findOne({ discordId });
    } catch (error) {
      console.error('Error finding user by Discord ID:', error);
      throw error;
    }
  }

  // Find user by email
  async findUserByEmail(email) {
    try {
      return await User.findOne({ email });
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Get all active users
  async getActiveUsers() {
    try {
      return await User.find({ isActive: true }).sort({ lastLogin: -1 });
    } catch (error) {
      console.error('Error getting active users:', error);
      throw error;
    }
  }

  // Update user's last login
  async updateLastLogin(discordId) {
    try {
      const user = await User.findOne({ discordId });
      if (user) {
        await user.updateLastLogin();
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Deactivate user
  async deactivateUser(discordId) {
    try {
      return await User.findOneAndUpdate(
        { discordId },
        { isActive: false },
        { new: true }
      );
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const todayLogins = await User.countDocuments({
        lastLogin: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });
      
      return {
        totalUsers,
        activeUsers,
        todayLogins
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
