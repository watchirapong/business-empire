import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

// Purchase history schema
const purchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [{
    itemId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, default: 'completed' }
});

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
  return ADMIN_USER_IDS.includes(userId);
};

// GET - Get purchase history (admin can view all, users can view their own)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    await connectDB();

    let purchases;

    if (isAdmin(userId)) {
      // Admin can view all purchases or specific user's purchases
      if (targetUserId) {
        purchases = await Purchase.find({ userId: targetUserId }).sort({ purchaseDate: -1 });
      } else {
        purchases = await Purchase.find().sort({ purchaseDate: -1 });
      }
    } else {
      // Regular users can only view their own purchases
      purchases = await Purchase.find({ userId }).sort({ purchaseDate: -1 });
    }

    // Format the response
    const formattedPurchases = purchases.map(purchase => ({
      id: purchase._id.toString(),
      userId: purchase.userId,
      items: purchase.items,
      totalAmount: purchase.totalAmount,
      purchaseDate: purchase.purchaseDate,
      status: purchase.status
    }));

    return NextResponse.json({ 
      purchases: formattedPurchases,
      isAdmin: isAdmin(userId)
    });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 });
  }
}
