import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import Organization from '../../../../../models/Organization';
import mongoose from 'mongoose';

// GET /api/organizations/[id] - Get a specific organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid organization ID format' }, { status: 400 });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/organizations/[id] - Update an organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    const { name, description, color, icon, settings } = body;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid organization ID format' }, { status: 400 });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Update fields if provided
    if (name !== undefined) organization.name = name.trim();
    if (description !== undefined) organization.description = description.trim();
    if (color !== undefined) organization.color = color;
    if (icon !== undefined) organization.icon = icon;
    if (settings !== undefined) {
      organization.settings = { ...organization.settings, ...settings };
    }

    await organization.save();

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/organizations/[id] - Delete an organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid organization ID format' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only the owner can delete the organization
    if (organization.ownerId !== userId) {
      return NextResponse.json({ 
        error: 'Only the organization owner can delete the organization' 
      }, { status: 403 });
    }

    // Soft delete by archiving
    organization.isArchived = true;
    organization.isActive = false;
    await organization.save();

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}