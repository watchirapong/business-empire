const mongoose = require('mongoose');

const StardustCoinSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  globalName: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
StardustCoinSchema.index({ userId: 1 });
StardustCoinSchema.index({ balance: -1 });

// Static method to get or create user's StardustCoin account
StardustCoinSchema.statics.getOrCreateAccount = async function(userId, username, globalName = '') {
  try {
    let account = await this.findOne({ userId });
    
    if (!account) {
      account = new this({
        userId,
        username,
        globalName,
        balance: 0
      });
      await account.save();
    } else {
      // Update username and globalName if they've changed
      if (account.username !== username || account.globalName !== globalName) {
        account.username = username;
        account.globalName = globalName;
        account.lastUpdated = new Date();
        await account.save();
      }
    }
    
    return account;
  } catch (error) {
    console.error('Error getting or creating StardustCoin account:', error);
    throw error;
  }
};

// Instance method to add StardustCoin
StardustCoinSchema.methods.addStardustCoin = async function(amount, reason = '') {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  this.balance += amount;
  this.totalEarned += amount;
  this.lastUpdated = new Date();
  
  await this.save();
  
  console.log(`Added ${amount} StardustCoin to ${this.username} (${this.userId}). Reason: ${reason}`);
  return this;
};

// Instance method to spend StardustCoin
StardustCoinSchema.methods.spendStardustCoin = async function(amount, reason = '') {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  if (this.balance < amount) {
    throw new Error('Insufficient StardustCoin balance');
  }
  
  this.balance -= amount;
  this.totalSpent += amount;
  this.lastUpdated = new Date();
  
  await this.save();
  
  console.log(`Spent ${amount} StardustCoin from ${this.username} (${this.userId}). Reason: ${reason}`);
  return this;
};

// Instance method to transfer StardustCoin
StardustCoinSchema.methods.transferStardustCoin = async function(amount, recipientUserId, reason = '') {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  if (this.balance < amount) {
    throw new Error('Insufficient StardustCoin balance');
  }
  
  // Get or create recipient account
  const StardustCoin = mongoose.model('StardustCoin');
  const recipient = await StardustCoin.getOrCreateAccount(recipientUserId, 'Unknown', '');
  
  // Perform transfer
  this.balance -= amount;
  this.totalSpent += amount;
  recipient.balance += amount;
  recipient.totalEarned += amount;
  
  this.lastUpdated = new Date();
  recipient.lastUpdated = new Date();
  
  await this.save();
  await recipient.save();
  
  console.log(`Transferred ${amount} StardustCoin from ${this.username} to ${recipient.username}. Reason: ${reason}`);
  return { sender: this, recipient };
};

module.exports = mongoose.models.StardustCoin || mongoose.model('StardustCoin', StardustCoinSchema);
