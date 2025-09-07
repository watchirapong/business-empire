import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';
import PurchaseHistory from '@/models/PurchaseHistory';
import ShopItem from '@/models/ShopItem';

interface ShopAnalytics {
  overview: {
    totalRevenue: number;
    totalPurchases: number;
    uniqueBuyers: number;
    uniqueItems: number;
    averageOrderValue: number;
  };
  topSellingItems: Array<{
    id: string;
    item: string;
    sales: number;
    revenue: number;
    uniqueBuyers: number;
    buyers: string[];
  }>;
  topSpenders: Array<{
    userId: string;
    user: string;
    spending: number;
    purchases: number;
    uniqueItems: number;
    items: string[];
  }>;
  currencyBreakdown: {
    hamstercoin: { count: number; revenue: number };
    stardustcoin: { count: number; revenue: number };
  };
  dailySales: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  contentTypeStats: {
    none: { count: number; revenue: number };
    text: { count: number; revenue: number };
    link: { count: number; revenue: number };
    file: { count: number; revenue: number };
    youtube: { count: number; revenue: number };
  };
  userPurchases: Array<{
    userId: string;
    username: string;
    globalName?: string;
    totalPurchases: number;
    totalSpent: number;
    items: Array<{
      itemId: string;
      itemName: string;
      price: number;
      purchaseDate: string;
      currency: string;
    }>;
  }>;
  filters: {
    timeRange: string;
    currency: string;
    category: string;
    contentType: string;
    minPrice: string | null;
    maxPrice: string | null;
  };
  timeRange: string;
  currency: string;
  generatedAt: string;
}

async function generateAnalytics(
  timeRange: string = 'all',
  currency: string = 'all',
  category: string = 'all',
  contentType: string = 'all',
  minPrice?: string,
  maxPrice?: string
): Promise<ShopAnalytics> {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Build date filter based on timeRange
    let dateFilter = {};
    const now = new Date();

    if (timeRange !== 'all') {
      const days = parseInt(timeRange);
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      dateFilter = { purchaseDate: { $gte: startDate } };
    }

    // Build currency filter
    let currencyFilter = {};
    if (currency !== 'all') {
      currencyFilter = { currency: currency };
    }

    // Build category filter
    let categoryFilter = {};
    if (category !== 'all') {
      categoryFilter = { 'itemId.category': category };
    }

    // Build content type filter
    let contentTypeFilter = {};
    if (contentType !== 'all') {
      contentTypeFilter = { 'itemId.contentType': contentType };
    }

    // Build price range filter
    let priceFilter = {};
    if (minPrice || maxPrice) {
      priceFilter = {};
      if (minPrice) {
        (priceFilter as any).$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        (priceFilter as any).$lte = parseFloat(maxPrice);
      }
    }

    const matchFilter = {
      ...dateFilter,
      ...currencyFilter,
      ...categoryFilter,
      ...contentTypeFilter,
      ...(Object.keys(priceFilter).length > 0 ? { price: priceFilter } : {})
    };

    // Get all purchases with filters
    const purchases = await PurchaseHistory.find(matchFilter)
      .populate('itemId')
      .sort({ purchaseDate: -1 });

    // Calculate overview stats
    const totalRevenue = purchases.reduce((sum, p) => sum + p.price, 0);
    const totalPurchases = purchases.length;
    const uniqueBuyers = new Set(purchases.map(p => p.userId)).size;
    const uniqueItems = new Set(purchases.map(p => p.itemId?._id).filter(Boolean)).size;
    const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

    // Top selling items
    const itemStats = new Map();
    const itemBuyers = new Map();

    purchases.forEach(purchase => {
      const itemId = purchase.itemId?._id?.toString();
      if (!itemId) return;

      const itemName = (purchase.itemId as any)?.name || 'Unknown Item';

      // Item stats
      if (!itemStats.has(itemId)) {
        itemStats.set(itemId, {
          id: itemId,
          item: itemName,
          sales: 0,
          revenue: 0,
          uniqueBuyers: new Set()
        });
      }

      const stats = itemStats.get(itemId);
      stats.sales += 1;
      stats.revenue += purchase.price;
      stats.uniqueBuyers.add(purchase.userId);

      // Track buyers per item
      if (!itemBuyers.has(itemId)) {
        itemBuyers.set(itemId, new Set());
      }
      itemBuyers.get(itemId).add(purchase.userId);
    });

    const topSellingItems = Array.from(itemStats.values())
      .map(stat => ({
        id: stat.id,
        item: stat.item,
        sales: stat.sales,
        revenue: stat.revenue,
        uniqueBuyers: stat.uniqueBuyers.size,
        buyers: Array.from(itemBuyers.get(stat.id) || []) as string[]
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top spenders
    const userStats = new Map();
    const userItems = new Map();

    purchases.forEach(purchase => {
      const userId = purchase.userId;
      const itemName = (purchase.itemId as any)?.name || 'Unknown Item';

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          user: purchase.username,
          spending: 0,
          purchases: 0,
          uniqueItems: new Set()
        });
      }

      const stats = userStats.get(userId);
      stats.spending += purchase.price;
      stats.purchases += 1;
      stats.uniqueItems.add(itemName);

      if (!userItems.has(userId)) {
        userItems.set(userId, []);
      }
      userItems.get(userId).push(itemName);
    });

    const topSpenders = Array.from(userStats.values())
      .map(stat => ({
        userId: stat.userId,
        user: stat.user,
        spending: stat.spending,
        purchases: stat.purchases,
        uniqueItems: stat.uniqueItems.size,
        items: Array.from(stat.uniqueItems) as string[]
      }))
      .sort((a, b) => b.spending - a.spending)
      .slice(0, 10);

    // Currency breakdown - Note: Currency information not currently stored in purchase history
    // For now, we'll show total purchases since currency tracking isn't implemented
    const currencyBreakdown = {
      hamstercoin: {
        count: purchases.length, // Fallback to total purchases
        revenue: totalRevenue     // Fallback to total revenue
      },
      stardustcoin: {
        count: 0,
        revenue: 0
      }
    };

    // Daily sales
    const dailyStats = new Map();

    purchases.forEach(purchase => {
      const date = purchase.purchaseDate.toISOString().split('T')[0];
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { count: 0, revenue: 0 });
      }
      const stats = dailyStats.get(date);
      stats.count += 1;
      stats.revenue += purchase.price;
    });

    const dailySales = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    // Content type stats
    const contentTypeStats = {
      none: { count: 0, revenue: 0 },
      text: { count: 0, revenue: 0 },
      link: { count: 0, revenue: 0 },
      file: { count: 0, revenue: 0 },
      youtube: { count: 0, revenue: 0 }
    };

    purchases.forEach(purchase => {
      const item = purchase.itemId as any;
      if (item && item.contentType) {
        const contentType = item.contentType as keyof typeof contentTypeStats;
        if (contentTypeStats[contentType]) {
          contentTypeStats[contentType].count += 1;
          contentTypeStats[contentType].revenue += purchase.price;
        }
      }
    });

    // User purchases detail
    const userPurchaseDetails = new Map();

    purchases.forEach(purchase => {
      const userId = purchase.userId;

      if (!userPurchaseDetails.has(userId)) {
        userPurchaseDetails.set(userId, {
          userId,
          username: purchase.username,
          globalName: '',
          totalPurchases: 0,
          totalSpent: 0,
          items: []
        });
      }

      const userDetail = userPurchaseDetails.get(userId);
      userDetail.totalPurchases += 1;
      userDetail.totalSpent += purchase.price;
      userDetail.items.push({
        itemId: purchase.itemId?._id?.toString() || '',
        itemName: (purchase.itemId as any)?.name || 'Unknown Item',
        price: purchase.price,
        purchaseDate: purchase.purchaseDate.toISOString(),
        currency: 'hamstercoin' // Default currency since it's not stored
      });
    });

    // Note: Global names could be added later if needed from session data
    // For now, we'll use username as the display name

    const userPurchases = Array.from(userPurchaseDetails.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      overview: {
        totalRevenue,
        totalPurchases,
        uniqueBuyers,
        uniqueItems,
        averageOrderValue
      },
      topSellingItems,
      topSpenders,
      currencyBreakdown,
      dailySales,
      contentTypeStats,
      userPurchases,
      filters: {
        timeRange,
        currency,
        category,
        contentType,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null
      },
      timeRange,
      currency,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating analytics:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'all';
    const currency = searchParams.get('currency') || 'all';
    const category = searchParams.get('category') || 'all';
    const contentType = searchParams.get('contentType') || 'all';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const analytics = await generateAnalytics(timeRange, currency, category, contentType, minPrice || undefined, maxPrice || undefined);

    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}
