import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock purchase history
let purchaseHistory: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, currency } = body;

    if (!itemId || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Mock item lookup (in real app, this would be from database)
    const mockItems = [
      { id: '1', name: 'Premium Avatar Frame', price: 500 },
      { id: '2', name: 'VIP Badge', price: 1000 },
      { id: '3', name: 'Extra Lives Pack', price: 200 },
      { id: '4', name: 'Lucky Charm', price: 300 },
      { id: '5', name: 'Game Pass Ultimate', price: 2500 }
    ];

    const item = mockItems.find(item => item.id === itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create purchase record
    const purchase = {
      id: Date.now().toString(),
      userId: (session.user as any).id,
      username: session.user.name || 'Unknown',
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      currency: currency,
      purchaseDate: new Date().toISOString(),
      status: 'completed'
    };

    purchaseHistory.push(purchase);

    return NextResponse.json({
      success: true,
      message: 'Purchase successful',
      purchase: purchase
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user's purchase history
    const userId = (session.user as any).id;
    const userPurchases = purchaseHistory.filter(purchase => purchase.userId === userId);

    return NextResponse.json({ purchases: userPurchases });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 });
  }
}
