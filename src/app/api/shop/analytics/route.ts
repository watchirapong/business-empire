import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Purchase History Schema
const purchaseHistorySchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ShopItem',
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true
  },
  price: { 
    type: Number, 
    required: true 
  },
  currency: {
    type: String,
    default: 'hamstercoin',
    enum: ['hamstercoin', 'stardustcoin']
  },
  purchaseDate: { 
    type: Date, 
    default: Date.now 
  },
  downloadCount: { 
    type: Number, 
    default: 0 
  },
  lastDownloadDate: { 
    type: Date 
  },
  hasFile: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  contentType: {
    type: String,
    default: 'none'
  },
  textContent: {
    type: String,
    default: ''
  },
  linkUrl: {
    type: String,
    default: ''
  }
});

const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', purchaseHistorySchema);

// Admin check function is now imported from @/lib/admin-config

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Check if user is admin
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'all'; // all, week, month, year
    const currency = searchParams.get('currency') || 'all'; // all, hamstercoin, stardustcoin

    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        dateFilter = { purchaseDate: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { purchaseDate: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        dateFilter = { purchaseDate: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = {};
    }

    // Currency filter
    let currencyFilter = {};
    if (currency !== 'all') {
      currencyFilter = { currency };
    }

    // Combine filters
    const filter = { ...dateFilter, ...currencyFilter };

    // Get all purchases with filters
    const purchases = await PurchaseHistory.find(filter).sort({ purchaseDate: -1 });

    // 1. Item Sales Analytics
    const itemSales: Record<string, number> = {};
    const itemRevenue: Record<string, number> = {};
    const itemBuyers: Record<string, Set<string>> = {};
    const itemBuyersArray: Record<string, string[]> = {};

    purchases.forEach(purchase => {
      const itemKey = `${purchase.itemName} (${purchase.itemId})`;
      
      if (!itemSales[itemKey]) {
        itemSales[itemKey] = 0;
        itemRevenue[itemKey] = 0;
        itemBuyers[itemKey] = new Set();
      }
      
      itemSales[itemKey]++;
      itemRevenue[itemKey] += purchase.price;
      itemBuyers[itemKey].add(purchase.username);
    });

    // Convert item buyers sets to arrays
    Object.keys(itemBuyers).forEach(itemKey => {
      itemBuyersArray[itemKey] = Array.from(itemBuyers[itemKey]);
    });

    // Sort items by sales count and fetch nicknames for buyers
    const topSellingItems = await Promise.all(
      Object.entries(itemSales)
        .map(async ([item, sales]) => {
          // Fetch nicknames for buyers
          const buyersWithNicknames = await Promise.all(
            itemBuyersArray[item].map(async (buyer) => {
              try {
                // Find the user's Discord ID from purchases
                const userPurchase = purchases.find(p => p.username === buyer);
                if (userPurchase && userPurchase.userId) {
                  // Fetch nickname from Discord API
                  const nicknameResponse = await fetch(
                    `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID || '699984143542517801'}/members/${userPurchase.userId}`,
                    {
                      headers: {
                        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );
                  
                  if (nicknameResponse.ok) {
                    const memberData = await nicknameResponse.json();
                    return memberData.nick || memberData.user.global_name || memberData.user.username || buyer;
                  }
                }
              } catch (error) {
                console.log(`Could not fetch nickname for buyer ${buyer}:`, error);
              }
              return buyer; // Fallback to original username
            })
          );
          
          return {
            item,
            sales,
            revenue: itemRevenue[item],
            uniqueBuyers: itemBuyers[item].size,
            buyers: buyersWithNicknames
          };
        })
    );
    
    // Sort by sales count after fetching nicknames
    topSellingItems.sort((a, b) => b.sales - a.sales);
    
    // Get all items (not just top 10) for scrollable view
    const allSellingItems = topSellingItems;

    // 2. User Spending Analytics
    const userSpending: Record<string, number> = {};
    const userPurchases: Record<string, number> = {};
    const userItems: Record<string, Set<string>> = {};
    const userItemsArray: Record<string, string[]> = {};

    purchases.forEach(purchase => {
      const userKey = purchase.username;
      
      if (!userSpending[userKey]) {
        userSpending[userKey] = 0;
        userPurchases[userKey] = 0;
        userItems[userKey] = new Set();
      }
      
      userSpending[userKey] += purchase.price;
      userPurchases[userKey]++;
      userItems[userKey].add(purchase.itemName);
    });

    // Convert user items sets to arrays
    Object.keys(userItems).forEach(userKey => {
      userItemsArray[userKey] = Array.from(userItems[userKey]);
    });

    // Sort users by spending and fetch nicknames
    const topSpenders = await Promise.all(
      Object.entries(userSpending)
        .map(async ([user, spending]) => {
          // Try to get Discord nickname for the user
          let displayName = user;
          try {
            // Find the user's Discord ID from purchases
            const userPurchase = purchases.find(p => p.username === user);
            if (userPurchase && userPurchase.userId) {
              // Fetch nickname from Discord API
              const nicknameResponse = await fetch(
                `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID || '699984143542517801'}/members/${userPurchase.userId}`,
                {
                  headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              if (nicknameResponse.ok) {
                const memberData = await nicknameResponse.json();
                displayName = memberData.nick || memberData.user.global_name || memberData.user.username || user;
              }
            }
          } catch (error) {
            console.log(`Could not fetch nickname for user ${user}:`, error);
            // Keep original username if nickname fetch fails
          }
          
          return {
            user: displayName,
            spending,
            purchases: userPurchases[user],
            uniqueItems: userItems[user].size,
            items: userItemsArray[user]
          };
        })
    );
    
    // Sort by spending after fetching nicknames
    topSpenders.sort((a, b) => b.spending - a.spending);

    // 3. Revenue Analytics
    const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
    const totalPurchases = purchases.length;
    const uniqueBuyers = new Set(purchases.map(p => p.username)).size;
    const uniqueItems = new Set(purchases.map(p => p.itemName)).size;

    // 4. Currency Breakdown
    const currencyBreakdown: Record<string, { count: number; revenue: number }> = {};
    purchases.forEach(purchase => {
      if (!currencyBreakdown[purchase.currency]) {
        currencyBreakdown[purchase.currency] = { count: 0, revenue: 0 };
      }
      currencyBreakdown[purchase.currency].count++;
      currencyBreakdown[purchase.currency].revenue += purchase.price;
    });

    // 5. Daily Sales Trend (last 30 days)
    const dailySales: Record<string, { count: number; revenue: number }> = {};
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentPurchases = purchases.filter(p => p.purchaseDate >= last30Days);
    
    recentPurchases.forEach(purchase => {
      const date = purchase.purchaseDate.toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = { count: 0, revenue: 0 };
      }
      dailySales[date].count++;
      dailySales[date].revenue += purchase.price;
    });

    // Convert to array and sort by date
    const dailySalesArray = Object.entries(dailySales)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Content Type Analytics
    const contentTypeStats: Record<string, { count: number; revenue: number }> = {};
    purchases.forEach(purchase => {
      const type = purchase.contentType || 'none';
      if (!contentTypeStats[type]) {
        contentTypeStats[type] = { count: 0, revenue: 0 };
      }
      contentTypeStats[type].count++;
      contentTypeStats[type].revenue += purchase.price;
    });

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalRevenue,
          totalPurchases,
          uniqueBuyers,
          uniqueItems,
          averageOrderValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0
        },
        topSellingItems: allSellingItems, // All items for scrollable view
        topSpenders: topSpenders.slice(0, 20), // Top 20
        currencyBreakdown,
        dailySales: dailySalesArray,
        contentTypeStats,
        timeRange,
        currency,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}
