import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
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
  }
});

const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', purchaseHistorySchema);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { purchaseId } = await request.json();
    const userId = (session.user as any).id;

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 });
    }

    // Get the purchase record
    const purchase = await PurchaseHistory.findById(purchaseId);
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Verify ownership
    if (purchase.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to this purchase' }, { status: 403 });
    }

    // Check if file exists
    if (!purchase.hasFile || !purchase.fileUrl) {
      return NextResponse.json({ error: 'No file available for this purchase' }, { status: 404 });
    }

    // Get file path
    const filePath = path.join(process.cwd(), 'public', purchase.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    // Update download count and last download date
    await PurchaseHistory.findByIdAndUpdate(purchaseId, {
      downloadCount: purchase.downloadCount + 1,
      lastDownloadDate: new Date()
    });

    // Read file and return as download
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = purchase.fileName || 'download';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/octet-stream',
      },
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
