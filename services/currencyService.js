const Currency = require('../models/Currency');

class CurrencyService {
  // Get or create user currency account
  async getUserCurrency(userId) {
    try {
      return await Currency.getOrCreateUserCurrency(userId);
    } catch (error) {
      console.error('Error getting user currency:', error);
      throw error;
    }
  }

  // Add coins to user account
  async addCoins(userId, amount, description = 'Earned coins') {
    try {
      const currency = await this.getUserCurrency(userId);
      await currency.addCoins(amount, description);
      return currency;
    } catch (error) {
      console.error('Error adding coins:', error);
      throw error;
    }
  }

  // Spend coins from user account
  async spendCoins(userId, amount, description = 'Spent coins') {
    try {
      const currency = await this.getUserCurrency(userId);
      await currency.spendCoins(amount, description);
      return currency;
    } catch (error) {
      console.error('Error spending coins:', error);
      throw error;
    }
  }

  // Get user balance
  async getBalance(userId) {
    try {
      const currency = await this.getUserCurrency(userId);
      return {
        hamsterCoins: currency.hamsterCoins,
        totalEarned: currency.totalEarned,
        totalSpent: currency.totalSpent
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get leaderboard (top users by coins)
  async getLeaderboard(limit = 10) {
    try {
      return await Currency.find()
        .sort({ hamsterCoins: -1 })
        .limit(limit)
        .select('userId hamsterCoins totalEarned');
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  // Get user stats
  async getUserStats(userId) {
    try {
      const currency = await this.getUserCurrency(userId);
      return {
        balance: currency.hamsterCoins,
        totalEarned: currency.totalEarned,
        totalSpent: currency.totalSpent,
        createdAt: currency.createdAt,
        updatedAt: currency.updatedAt
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new CurrencyService();
