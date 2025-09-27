import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.id;
    const externalApiUrl = `https://1359877612054249543.discordsays.com/.proxy/api/users/${discordId}`;

    console.log(`Fetching external Discord data for user: ${discordId}`);

    const response = await fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Business-Empire/1.0'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseText = await response.text();
    let externalData;
    
    try {
      externalData = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse external API response:', responseText);
      return NextResponse.json({ 
        error: "Invalid response from external API",
        details: responseText
      }, { status: 500 });
    }

    // Handle "User not found" case specifically
    if (response.status === 400 && externalData.message === "User not found") {
      console.log(`User ${discordId} not found in external Discord system`);
      return NextResponse.json({
        success: true,
        data: {
          externalDiscordId: discordId,
          externalUsername: session.user.name || 'Unknown',
          externalCoins: 0,
          externalBalance: 0,
          externalLevel: 0,
          externalXp: 0,
          lastUpdated: new Date().toISOString(),
          rawData: externalData,
          status: 'user_not_found',
          message: 'User not found in external Discord system'
        }
      });
    }

    if (!response.ok) {
      console.error(`External API error: ${response.status} ${response.statusText}`, externalData);
      return NextResponse.json({ 
        error: "Failed to fetch external data",
        status: response.status,
        statusText: response.statusText,
        details: externalData
      }, { status: response.status });
    }

    console.log('External Discord data received:', externalData);

    // Transform the external data to match our portfolio format
    const transformedData = {
      externalDiscordId: discordId,
      externalUsername: externalData.username || session.user.name || 'Unknown',
      externalCoins: externalData.stats?.coin || 0,
      externalBalance: externalData.stats?.coin || 0,
      externalLevel: externalData.stats?.level || 0,
      externalXp: externalData.stats?.exp || 0,
      lastUpdated: new Date().toISOString(),
      rawData: externalData, // Keep original data for debugging
      status: 'success'
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching external Discord data:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Request timeout - external API took too long to respond" 
      }, { status: 408 });
    }

    return NextResponse.json({ 
      error: "Failed to fetch external data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
