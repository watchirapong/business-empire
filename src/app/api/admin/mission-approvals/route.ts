import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'https://cartoon-christmas-function-compromise.trycloudflare.com';

// GET /api/admin/mission-approvals - Get all pending mission approvals
export async function GET() {
  try {
    // Fetch from external API
    const response = await fetch(`${EXTERNAL_API_URL}/api/admin/mission-approvals`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching mission approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mission approvals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
