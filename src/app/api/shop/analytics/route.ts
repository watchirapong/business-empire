import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';

// Mock analytics data
const analyticsData = {
  overview: {
    totalRevenue: 15000,
    totalPurchases: 150,
    uniqueBuyers: 45,
    uniqueItems: 5,
    averageOrderValue: 100
  },
  topSellingItems: [
    {
      item: 'Premium Avatar Frame',
      sales: 45,
      revenue: 22500,
      uniqueBuyers: 35,
      buyers: ['User1', 'User2', 'User3']
    },
    {
      item: 'VIP Badge',
      sales: 23,
      revenue: 23000,
      uniqueBuyers: 20,
      buyers: ['User4', 'User5']
    }
  ],
  topSpenders: [
    {
      user: 'TopSpender1',
      spending: 5000,
      purchases: 10,
      uniqueItems: 4,
      items: ['Premium Avatar Frame', 'VIP Badge', 'Extra Lives Pack']
    },
    {
      user: 'TopSpender2',
      spending: 3500,
      purchases: 7,
      uniqueItems: 3,
      items: ['Premium Avatar Frame', 'Lucky Charm']
    }
  ],
  currencyBreakdown: {
    hamstercoin: { count: 120, revenue: 12000 },
    stardustcoin: { count: 30, revenue: 3000 }
  },
  dailySales: [
    { date: '2024-01-15', count: 5, revenue: 500 },
    { date: '2024-01-16', count: 8, revenue: 800 },
    { date: '2024-01-17', count: 12, revenue: 1200 }
  ],
  contentTypeStats: {
    none: { count: 80, revenue: 8000 },
    text: { count: 25, revenue: 2500 },
    link: { count: 30, revenue: 3000 },
    youtube: { count: 15, revenue: 1500 }
  },
  timeRange: 'all',
  currency: 'all',
  generatedAt: new Date().toISOString()
};

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

    // In a real implementation, you would filter the analytics based on timeRange and currency
    const filteredAnalytics = {
      ...analyticsData,
      timeRange,
      currency
    };

    return NextResponse.json({
      success: true,
      analytics: filteredAnalytics
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}
