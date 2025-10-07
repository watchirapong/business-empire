import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Skill Tree Branch Schema
const SkillTreeBranchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  isUnlocked: { type: Boolean, default: true },
  unlockCost: { type: Number, default: 0 },
  nodes: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    level: { type: Number, required: true },
    parentId: { type: String },
    isUnlocked: { type: Boolean, default: false },
    isPurchased: { type: Boolean, default: false },
    cost: { type: Number, required: true },
    currency: { type: String, default: 'hamstercoin' },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true }
    },
    connections: [String],
    benefits: [String],
    requirements: [String]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SkillTreeBranch = mongoose.models.SkillTreeBranch || mongoose.model('SkillTreeBranch', SkillTreeBranchSchema);

export async function GET() {
  try {
    await connectDB();
    
    const branches = await SkillTreeBranch.find({}).sort({ createdAt: 1 });
    
    return NextResponse.json({
      success: true,
      branches: branches
    });
  } catch (error) {
    console.error('Error fetching skill tree branches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session.user?.email)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const { id, name, description, icon, color, unlockCost, nodes } = body;

    // Validate required fields
    if (!id || !name || !description || !icon || !color) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if branch already exists
    const existingBranch = await SkillTreeBranch.findOne({ id });
    if (existingBranch) {
      return NextResponse.json(
        { success: false, error: 'Branch with this ID already exists' },
        { status: 400 }
      );
    }

    const newBranch = new SkillTreeBranch({
      id,
      name,
      description,
      icon,
      color,
      unlockCost: unlockCost || 0,
      nodes: nodes || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newBranch.save();

    return NextResponse.json({
      success: true,
      branch: newBranch
    });
  } catch (error) {
    console.error('Error creating skill tree branch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session.user?.email)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const updatedBranch = await SkillTreeBranch.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    );

    if (!updatedBranch) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      branch: updatedBranch
    });
  } catch (error) {
    console.error('Error updating skill tree branch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update branch' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session.user?.email)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Branch ID is required' },
        { status: 400 }
      );
    }

    const deletedBranch = await SkillTreeBranch.findOneAndDelete({ id });

    if (!deletedBranch) {
      return NextResponse.json(
        { success: false, error: 'Branch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill tree branch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
