const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Import models
const Achievement = require('../models/Achievement');

const defaultAchievements = [
  // Login Achievements
  {
    id: 'first_login',
    name: 'First Steps',
    description: 'Welcome to HamsterHub! Complete your first login.',
    category: 'login',
    rarity: 'common',
    icon: '🏠',
    requirement: {
      type: 'login_count',
      value: 1,
      description: 'Login 1 time'
    },
    reward: {
      hamsterCoins: 50,
      experience: 10
    },
    isActive: true
  },
  {
    id: 'login_streak_7',
    name: 'Week Warrior',
    description: 'Login for 7 consecutive days.',
    category: 'login',
    rarity: 'uncommon',
    icon: '📅',
    requirement: {
      type: 'login_streak',
      value: 7,
      description: 'Login for 7 days in a row'
    },
    reward: {
      hamsterCoins: 200,
      experience: 50
    },
    isActive: true
  },
  {
    id: 'login_streak_30',
    name: 'Monthly Master',
    description: 'Login for 30 consecutive days.',
    category: 'login',
    rarity: 'rare',
    icon: '📆',
    requirement: {
      type: 'login_streak',
      value: 30,
      description: 'Login for 30 days in a row'
    },
    reward: {
      hamsterCoins: 1000,
      experience: 200
    },
    isActive: true
  },

  // Trading Achievements
  {
    id: 'first_trade',
    name: 'Market Newcomer',
    description: 'Complete your first trade.',
    category: 'trading',
    rarity: 'common',
    icon: '📈',
    requirement: {
      type: 'trades_completed',
      value: 1,
      description: 'Complete 1 trade'
    },
    reward: {
      hamsterCoins: 100,
      experience: 25
    },
    isActive: true
  },
  {
    id: 'trade_master',
    name: 'Trading Master',
    description: 'Complete 100 trades.',
    category: 'trading',
    rarity: 'epic',
    icon: '🎯',
    requirement: {
      type: 'trades_completed',
      value: 100,
      description: 'Complete 100 trades'
    },
    reward: {
      hamsterCoins: 2000,
      experience: 500
    },
    isActive: true
  },
  {
    id: 'profit_maker',
    name: 'Profit Maker',
    description: 'Earn 1000 coins from trading.',
    category: 'trading',
    rarity: 'rare',
    icon: '💰',
    requirement: {
      type: 'trading_profit',
      value: 1000,
      description: 'Earn 1000 coins from trading'
    },
    reward: {
      hamsterCoins: 500,
      experience: 100
    },
    isActive: true
  },

  // Gacha Achievements
  {
    id: 'first_gacha',
    name: 'Gacha Beginner',
    description: 'Pull your first gacha item.',
    category: 'gacha',
    rarity: 'common',
    icon: '🎰',
    requirement: {
      type: 'gacha_pulls',
      value: 1,
      description: 'Pull 1 gacha item'
    },
    reward: {
      hamsterCoins: 75,
      experience: 15
    },
    isActive: true
  },
  {
    id: 'gacha_collector',
    name: 'Gacha Collector',
    description: 'Pull 50 gacha items.',
    category: 'gacha',
    rarity: 'uncommon',
    icon: '🎁',
    requirement: {
      type: 'gacha_pulls',
      value: 50,
      description: 'Pull 50 gacha items'
    },
    reward: {
      hamsterCoins: 300,
      experience: 75
    },
    isActive: true
  },
  {
    id: 'legendary_pull',
    name: 'Legendary Luck',
    description: 'Pull a legendary item from gacha.',
    category: 'gacha',
    rarity: 'legendary',
    icon: '👑',
    requirement: {
      type: 'legendary_pulls',
      value: 1,
      description: 'Pull 1 legendary item'
    },
    reward: {
      hamsterCoins: 5000,
      experience: 1000
    },
    isActive: true
  },

  // Shop Achievements
  {
    id: 'first_purchase',
    name: 'First Purchase',
    description: 'Make your first purchase from the shop.',
    category: 'shop',
    rarity: 'common',
    icon: '🛒',
    requirement: {
      type: 'shop_purchases',
      value: 1,
      description: 'Make 1 purchase'
    },
    reward: {
      hamsterCoins: 50,
      experience: 10
    },
    isActive: true
  },
  {
    id: 'shopaholic',
    name: 'Shopaholic',
    description: 'Make 25 purchases from the shop.',
    category: 'shop',
    rarity: 'uncommon',
    icon: '💳',
    requirement: {
      type: 'shop_purchases',
      value: 25,
      description: 'Make 25 purchases'
    },
    reward: {
      hamsterCoins: 400,
      experience: 100
    },
    isActive: true
  },

  // Voice Achievements
  {
    id: 'voice_participant',
    name: 'Voice Participant',
    description: 'Join a voice channel for the first time.',
    category: 'voice',
    rarity: 'common',
    icon: '🎤',
    requirement: {
      type: 'voice_joins',
      value: 1,
      description: 'Join 1 voice channel'
    },
    reward: {
      hamsterCoins: 100,
      experience: 20
    },
    isActive: true
  },
  {
    id: 'voice_veteran',
    name: 'Voice Veteran',
    description: 'Spend 10 hours in voice channels.',
    category: 'voice',
    rarity: 'rare',
    icon: '⏰',
    requirement: {
      type: 'voice_hours',
      value: 10,
      description: 'Spend 10 hours in voice'
    },
    reward: {
      hamsterCoins: 800,
      experience: 150
    },
    isActive: true
  },

  // Social Achievements
  {
    id: 'profile_complete',
    name: 'Profile Complete',
    description: 'Complete your profile setup.',
    category: 'social',
    rarity: 'common',
    icon: '👤',
    requirement: {
      type: 'profile_views',
      value: 1,
      description: 'View your profile 1 time'
    },
    reward: {
      hamsterCoins: 50,
      experience: 10
    },
    isActive: true
  },

  // Special Achievements
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join HamsterHub during its early days.',
    category: 'special',
    rarity: 'epic',
    icon: '🚀',
    requirement: {
      type: 'join_date',
      value: 1,
      description: 'Join before a certain date'
    },
    reward: {
      hamsterCoins: 1000,
      experience: 200
    },
    isActive: true
  },
  {
    id: 'achievement_hunter',
    name: 'Achievement Hunter',
    description: 'Unlock 10 achievements.',
    category: 'special',
    rarity: 'rare',
    icon: '🏆',
    requirement: {
      type: 'achievements_unlocked',
      value: 10,
      description: 'Unlock 10 achievements'
    },
    reward: {
      hamsterCoins: 1500,
      experience: 300
    },
    isActive: true
  }
];

async function seedAchievements() {
  try {
    console.log('Starting achievement seeding...');
    
    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('Cleared existing achievements');
    
    // Insert new achievements
    const result = await Achievement.insertMany(defaultAchievements);
    console.log(`Successfully seeded ${result.length} achievements`);
    
    console.log('Achievement seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding achievements:', error);
    process.exit(1);
  }
}

seedAchievements();
