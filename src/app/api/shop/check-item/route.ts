import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Shop Item Schema
    const shopItemSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true },
      image: { type: String, required: true },
      inStock: { type: Boolean, default: true },
      allowMultiplePurchases: { type: Boolean, default: false },
      contentType: { type: String, default: 'none' },
      textContent: { type: String, default: '' },
      linkUrl: { type: String, default: '' },
      fileUrl: { type: String, default: '' },
      fileName: { type: String, default: '' },
      hasFile: { type: Boolean, default: false },
      requiresRole: { type: Boolean, default: false },
      requiredRoleId: { type: String, default: '' },
      requiredRoleName: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);

    // Find the item
    const item = await ShopItem.findById(itemId);
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item._id,
        name: item.name,
        requiresRole: item.requiresRole,
        requiredRoleId: item.requiredRoleId,
        requiredRoleName: item.requiredRoleName,
        price: item.price,
        inStock: item.inStock
      }
    });

  } catch (error) {
    console.error('Error checking item:', error);
    return NextResponse.json({ 
      error: 'Failed to check item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
