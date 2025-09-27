import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
};

// Ticket Currency Schema
const TicketSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastTicketEarned: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await connectDB();

    // Get user's ticket data
    let ticketData = await Ticket.findOne({ userId });
    
    if (!ticketData) {
      // Create new ticket record
      ticketData = new Ticket({
        userId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastTicketEarned: null
      });
      await ticketData.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: ticketData.balance,
        totalEarned: ticketData.totalEarned,
        totalSpent: ticketData.totalSpent,
        lastTicketEarned: ticketData.lastTicketEarned
      }
    });

  } catch (error) {
    console.error('Tickets API error:', error);
    return NextResponse.json(
      { error: 'Failed to get ticket data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, amount } = body;

    await connectDB();

    let ticketData = await Ticket.findOne({ userId });
    
    if (!ticketData) {
      ticketData = new Ticket({
        userId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastTicketEarned: null
      });
    }

    if (action === 'earn') {
      ticketData.balance += amount;
      ticketData.totalEarned += amount;
      ticketData.lastTicketEarned = new Date();
    } else if (action === 'spend') {
      if (ticketData.balance < amount) {
        return NextResponse.json(
          { error: 'Insufficient tickets' },
          { status: 400 }
        );
      }
      ticketData.balance -= amount;
      ticketData.totalSpent += amount;
    }

    ticketData.updatedAt = new Date();
    await ticketData.save();

    return NextResponse.json({
      success: true,
      data: {
        balance: ticketData.balance,
        totalEarned: ticketData.totalEarned,
        totalSpent: ticketData.totalSpent,
        lastTicketEarned: ticketData.lastTicketEarned
      }
    });

  } catch (error) {
    console.error('Tickets update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket data' },
      { status: 500 }
    );
  }
}
