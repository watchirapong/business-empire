import { NextRequest, NextResponse } from 'next/server';

// Simple shop items data
const shopItems = [
  {
    id: '1',
    name: 'Premium Avatar Frame',
    description: 'Exclusive golden avatar frame for your profile',
    price: 500,
    image: '👑',
    inStock: true,
    category: 'cosmetic'
  },
  {
    id: '2',
    name: 'VIP Badge',
    description: 'Show your VIP status with this exclusive badge',
    price: 1000,
    image: '⭐',
    inStock: true,
    category: 'cosmetic'
  },
  {
    id: '3',
    name: 'Extra Lives Pack',
    description: 'Get 5 extra lives for games',
    price: 200,
    image: '❤️',
    inStock: true,
    category: 'gaming'
  },
  {
    id: '4',
    name: 'Lucky Charm',
    description: 'Increase your luck in all games by 10%',
    price: 300,
    image: '🍀',
    inStock: false,
    category: 'gaming'
  }
];

export async function GET() {
  try {
    return NextResponse.json({ items: shopItems });
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, userId } = body;

    // Simple purchase simulation
    const item = shopItems.find(item => item.id === itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!item.inStock) {
      return NextResponse.json({ error: 'Item out of stock' }, { status: 400 });
    }

    // Mock purchase success
    return NextResponse.json({
      success: true,
      message: 'Purchase successful',
      item: item,
      purchaseId: Date.now().toString()
    });
  } catch (error) {
    console.error('Error processing purchase:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}
