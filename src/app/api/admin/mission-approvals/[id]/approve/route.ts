import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'https://cartoon-christmas-function-compromise.trycloudflare.com';

// POST /api/admin/mission-approvals/[id]/approve - Approve a mission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate the ID
    if (!id) {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      );
    }

    console.log(`Approving mission with ID: ${id} via external API`);

    // Call external API to approve mission
    const response = await fetch(`${EXTERNAL_API_URL}/api/admin/mission-approvals/${id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`External API returned ${response.status}: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: `Mission ${id} approved successfully`,
      data: data
    });

  } catch (error) {
    console.error('Error approving mission:', error);
    return NextResponse.json(
      { error: 'Failed to approve mission', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
