import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    console.log('YouTube API called with videoId:', videoId);

    if (!videoId) {
      console.log('No videoId provided');
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Fetch YouTube video title using oEmbed API from server side
    console.log('Fetching from YouTube oEmbed API...');
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BusinessEmpire/1.0)',
        },
      }
    );

    console.log('YouTube API response status:', response.status);

    if (!response.ok) {
      console.error('YouTube API error:', response.status, response.statusText);
      return NextResponse.json({
        title: 'YouTube Video',
        error: `Failed to fetch video title: ${response.status}`
      });
    }

    const data = await response.json();
    console.log('YouTube API response data:', data);

    const result = {
      title: data.title || 'YouTube Video'
    };

    console.log('Returning result:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching YouTube video title:', error);
    return NextResponse.json({
      title: 'YouTube Video',
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
