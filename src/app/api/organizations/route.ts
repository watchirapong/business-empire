import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../config/database';
import Organization from '../../../../models/Organization';

// GET /api/organizations - Get all organizations for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const organizations = await Organization.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ],
      isActive: true,
      isArchived: false
    })
    .sort({ createdAt: -1 });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, description, color, icon, ownerId } = body;

    if (!name || !ownerId) {
      return NextResponse.json({ 
        error: 'Name and owner ID are required' 
      }, { status: 400 });
    }

    // Check if user already has an organization with this name
    const existingOrg = await Organization.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      ownerId,
      isActive: true,
      isArchived: false
    });

    if (existingOrg) {
      return NextResponse.json({ 
        error: 'An organization with this name already exists' 
      }, { status: 400 });
    }

    const organization = new Organization({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#667eea',
      icon: icon || '🏢',
      ownerId
    });

    await organization.save();

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}