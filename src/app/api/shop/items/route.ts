import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';

// Comprehensive shop items data with all features
const shopItems = [
  {
    id: '1',
    name: 'Premium Avatar Frame',
    description: 'Exclusive golden avatar frame for your profile',
    price: 500,
    image: '👑',
    inStock: true,
    category: 'cosmetic',
    contentType: 'none' as const,
    allowMultiplePurchases: true,
    requiresRole: false,
    hasFile: false,
    purchaseCount: 45,
    totalRevenue: 22500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'VIP Badge',
    description: 'Show your VIP status with this exclusive badge',
    price: 1000,
    image: '⭐',
    inStock: true,
    category: 'cosmetic',
    contentType: 'text' as const,
    textContent: 'Congratulations! You are now a VIP member. This badge grants you access to exclusive channels and priority support.',
    allowMultiplePurchases: false,
    requiresRole: true,
    requiredRoleId: '1388546120912998554',
    requiredRoleName: 'Starway',
    hasFile: false,
    purchaseCount: 23,
    totalRevenue: 23000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Extra Lives Pack',
    description: 'Get 5 extra lives for games',
    price: 200,
    image: '❤️',
    inStock: true,
    category: 'gaming',
    contentType: 'link' as const,
    linkUrl: 'https://example.com/download-extra-lives',
    allowMultiplePurchases: true,
    requiresRole: false,
    hasFile: true,
    fileName: 'extra-lives-pack.zip',
    purchaseCount: 67,
    totalRevenue: 13400,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Lucky Charm',
    description: 'Increase your luck in all games by 10%',
    price: 300,
    image: '🍀',
    inStock: false,
    category: 'gaming',
    contentType: 'youtube' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    allowMultiplePurchases: true,
    requiresRole: false,
    hasFile: false,
    purchaseCount: 12,
    totalRevenue: 3600,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Game Pass Ultimate',
    description: 'Access to all premium games and features',
    price: 2500,
    image: '🎮',
    inStock: true,
    category: 'gaming',
    contentType: 'file' as const,
    fileUrl: '/downloads/game-pass-ultimate.exe',
    fileName: 'game-pass-ultimate.exe',
    allowMultiplePurchases: false,
    requiresRole: true,
    requiredRoleId: '1388546120912998554',
    requiredRoleName: 'Starway',
    hasFile: true,
    purchaseCount: 8,
    totalRevenue: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check if this is an admin creating an item or a user making a purchase
    const body = await request.json();

    // If it has itemId, it's a purchase request
    if (body.itemId) {
      const { itemId } = body;

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
    }

    // If no itemId, it's an admin creating a new item
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      name,
      description,
      price,
      image,
      category,
      contentType,
      textContent,
      linkUrl,
      youtubeUrl,
      inStock,
      allowMultiplePurchases,
      requiresRole,
      requiredRoleId,
      requiredRoleName
    } = body;

    // Validate required fields
    if (!name || !description || !price || !image || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new item
    const newItem = {
      id: Date.now().toString(),
      name,
      description,
      price: parseFloat(price),
      image,
      category,
      contentType: contentType || 'none',
      textContent: textContent || '',
      linkUrl: linkUrl || '',
      youtubeUrl: youtubeUrl || '',
      inStock: inStock !== undefined ? inStock : true,
      allowMultiplePurchases: allowMultiplePurchases || false,
      requiresRole: requiresRole || false,
      requiredRoleId: requiredRoleId || '',
      requiredRoleName: requiredRoleName || '',
      hasFile: false,
      fileUrl: '',
      fileName: '',
      purchaseCount: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real app, this would save to database
    shopItems.push(newItem);

    return NextResponse.json({
      message: 'Item created successfully',
      item: newItem
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const itemIndex = shopItems.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Update item
    const updatedItem = {
      ...shopItems[itemIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    shopItems[itemIndex] = updatedItem;

    return NextResponse.json({
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const itemIndex = shopItems.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const deletedItem = shopItems.splice(itemIndex, 1)[0];

    return NextResponse.json({
      message: 'Item deleted successfully',
      item: deletedItem
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
