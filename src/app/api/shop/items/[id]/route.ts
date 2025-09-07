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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const itemId = resolvedParams.id;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find and delete item from MongoDB
    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      image: String,
      inStock: Boolean,
      category: String,
      contentType: String,
      textContent: String,
      linkUrl: String,
      fileUrl: String,
      fileName: String,
      hasFile: Boolean,
      requiresRole: Boolean,
      requiredRoleId: String,
      requiredRoleName: String,
      allowMultiplePurchases: Boolean,
      youtubeUrl: String,
      purchaseCount: Number,
      totalRevenue: Number,
      createdAt: Date,
      updatedAt: Date
    }));

    const deletedItem = await ShopItem.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item deleted successfully',
      item: {
        id: deletedItem._id.toString(),
        name: deletedItem.name,
        description: deletedItem.description,
        price: deletedItem.price,
        image: deletedItem.image,
        inStock: deletedItem.inStock,
        category: deletedItem.category,
        contentType: deletedItem.contentType,
        textContent: deletedItem.textContent,
        linkUrl: deletedItem.linkUrl,
        youtubeUrl: deletedItem.youtubeUrl,
        fileUrl: deletedItem.fileUrl,
        fileName: deletedItem.fileName,
        hasFile: deletedItem.hasFile,
        requiresRole: deletedItem.requiresRole,
        requiredRoleId: deletedItem.requiredRoleId,
        requiredRoleName: deletedItem.requiredRoleName,
        allowMultiplePurchases: deletedItem.allowMultiplePurchases,
        purchaseCount: deletedItem.purchaseCount,
        totalRevenue: deletedItem.totalRevenue,
        createdAt: deletedItem.createdAt,
        updatedAt: deletedItem.updatedAt
      }
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
