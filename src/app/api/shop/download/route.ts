import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import PurchaseHistory from '@/models/PurchaseHistory';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get('purchaseId') || searchParams.get('itemId');

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID is required' }, { status: 400 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const userId = (session.user as any).id;

    // Find the purchase record

    const purchase = await PurchaseHistory.findOne({
      $or: [
        { _id: purchaseId },
        { itemId: purchaseId }
      ],
      userId: userId,
      hasFile: true
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found or no file available' }, { status: 404 });
    }

    // Check if file exists
    if (!purchase.fileUrl) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Update download count
    await PurchaseHistory.updateOne(
      { _id: purchase._id },
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadDate: new Date() }
      }
    );

    // For now, return a mock file since we don't have actual file storage
    // In production, you would serve the actual file from the fileUrl
    const mockFileContent = `Mock file content for: ${purchase.fileName || purchase.itemName}\nDownloaded on: ${new Date().toISOString()}\nPurchase ID: ${purchase._id}`;

    const buffer = Buffer.from(mockFileContent, 'utf-8');
    const filename = purchase.fileName || `${purchase.itemName}.txt`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
