import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import Game from '@/models/Game';
import https from 'https';
import http from 'http';
import { isAdmin } from '@/lib/admin-config';

// fetchItchThumbnail function is available within this file

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    console.log('MongoDB already connected');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected successfully');
};

// Fetch thumbnail image from itch.io URL
const fetchItchThumbnail = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log('Fetching thumbnail from:', url);
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Received HTML data, length:', data.length);

        // Extract thumbnail image from the HTML
        // Look for og:image meta tag first
        const ogImageMatch = data.match(/property="og:image" content="([^"]+)"/);
        if (ogImageMatch && ogImageMatch[1]) {
          console.log('Found og:image:', ogImageMatch[1]);
          resolve(ogImageMatch[1]);
          return;
        }

        // Look for twitter:image meta tag
        const twitterImageMatch = data.match(/name="twitter:image" content="([^"]+)"/);
        if (twitterImageMatch && twitterImageMatch[1]) {
          console.log('Found twitter:image:', twitterImageMatch[1]);
          resolve(twitterImageMatch[1]);
          return;
        }

        // Look for the main game image in the HTML - try multiple patterns
        const imagePatterns = [
          /<img[^>]*class="[^"]*game_thumb[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]*itch\.zone[^"]*315x250[^"]*)"[^>]*>/i,
          /<img[^>]*src="([^"]*img\.itch\.zone[^"]*)"[^>]*>/i,
          /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i
        ];

        for (const pattern of imagePatterns) {
          const match = data.match(pattern);
          if (match && match[1]) {
            console.log('Found image with pattern:', pattern, 'URL:', match[1]);
            resolve(match[1]);
            return;
          }
        }

        // Look for any image in the game header area
        const headerImageMatch = data.match(/<div[^>]*class="[^"]*header[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i);
        if (headerImageMatch && headerImageMatch[1]) {
          console.log('Found header image:', headerImageMatch[1]);
          resolve(headerImageMatch[1]);
          return;
        }

        // Fallback: try to construct a likely thumbnail URL based on itch.io patterns
        const fallbackUrl = `https://img.itch.zone/aW1nLzE0MjI3MzEucG5n/315x250%23c/8L%2F8L.png`;
        console.log('Using fallback URL:', fallbackUrl);
        resolve(fallbackUrl);
      });
    });

    request.on('error', (err) => {
      console.error('Error fetching itch.io page:', err);
      reject(err);
    });

    request.setTimeout(10000, () => {
      console.error('Request timeout for:', url);
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/games called with URL:', request.url);
    const { searchParams } = new URL(request.url);

    // Check if this is a thumbnail fetch request
    const fetchThumbnail = searchParams.get('fetchThumbnail');
    const itchIoUrl = searchParams.get('url');


    if (fetchThumbnail && itchIoUrl) {
      // Fetch thumbnail from itch.io
      try {
        const thumbnailUrl = await fetchItchThumbnail(itchIoUrl);
        console.log('Thumbnail fetch successful:', thumbnailUrl);
        return NextResponse.json({
          success: true,
          thumbnailUrl,
          source: 'itch.io'
        });
      } catch (error) {
        console.error('Thumbnail fetch failed:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch thumbnail from itch.io',
          thumbnailUrl: null
        }, { status: 500 });
      }
    }

    // Regular games listing
    await connectDB();

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId');
    const tag = searchParams.get('tag');
    const genre = searchParams.get('genre');
    const sortBy = searchParams.get('sortBy') || 'priority';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Search parameters
    const search = searchParams.get('search');
    const searchFilter = searchParams.get('searchFilter') || 'all';

    const query: any = { isActive: true };

    if (userId) {
      query['author.userId'] = userId;
    }

    if (tag) {
      query.tags = { $in: [tag.toLowerCase()] };
    }

    if (genre) {
      query.genre = genre;
    }

    // Search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search

      if (searchFilter === 'all') {
        query.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } },
          { genre: searchRegex },
          { 'author.username': searchRegex },
          { 'author.nickname': searchRegex }
        ];
      } else if (searchFilter === 'title') {
        query.title = searchRegex;
      } else if (searchFilter === 'tags') {
        query.tags = { $in: [searchRegex] };
      } else if (searchFilter === 'genre') {
        query.genre = searchRegex;
      } else if (searchFilter === 'author') {
        query.$or = [
          { 'author.username': searchRegex },
          { 'author.nickname': searchRegex }
        ];
      }
    }

    const sortOptions: any = {};

    // Custom sorting for priority-based feed algorithm
    if (sortBy === 'priority') {
      sortOptions.priority = sortOrder === 'asc' ? 1 : -1;
      sortOptions.createdAt = -1; // Secondary sort by creation date
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const skip = (page - 1) * limit;

    const games = await Game.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Game.countDocuments(query);

    return NextResponse.json({
      success: true,
      games,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/games - Starting request processing');

    const session = await getServerSession(authOptions);
    console.log('Session check:', session?.user ? 'User authenticated' : 'No session');

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    const { title, description, itchIoUrl, tags, genre } = body;
    let thumbnailUrl = body.thumbnailUrl;

    // Fetch user server data to get nickname
    let nickname = null;
    try {
      console.log('Fetching user server data for nickname...');
      const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/users/get-server-nickname?userId=${(session.user as any).id}`, {
        method: 'GET',
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        nickname = userData.nickname || null;
        console.log('Fetched nickname:', nickname);
      } else {
        console.log('Failed to fetch user server data, using username only');
      }
    } catch (error) {
      console.error('Error fetching user server data:', error);
      console.log('Using username only');
    }

    if (!title || !description || !itchIoUrl) {
      return NextResponse.json(
        { error: 'Title, description, and itch.io URL are required' },
        { status: 400 }
      );
    }

    // Validate itch.io URL format
    if (!/^https?:\/\/[a-zA-Z0-9\-]+\.itch\.io\/[a-zA-Z0-9\-]+$/.test(itchIoUrl)) {
      return NextResponse.json(
        { error: 'Invalid itch.io URL format' },
        { status: 400 }
      );
    }

    // Auto-fetch thumbnail from itch.io if not provided
    if (!thumbnailUrl) {
      console.log('No thumbnail provided, fetching from itch.io...');
      try {
        thumbnailUrl = await fetchItchThumbnail(itchIoUrl);
        console.log('Fetched thumbnail:', thumbnailUrl);
      } catch (error) {
        console.warn('Failed to fetch thumbnail from itch.io, using default');
        // Use a default thumbnail or leave it empty
        thumbnailUrl = '';
      }
    }

    console.log('Creating new game object...');
    const newGame = new Game({
      title,
      description,
      itchIoUrl,
      thumbnailUrl,
      tags: tags || [],
      genre,
      author: {
        userId: (session.user as any).id || session.user.email,
        username: session.user.name || 'Unknown',
        nickname: nickname,
        avatar: session.user.image
      },
      likes: [],
      comments: [],
      views: 0,
      isActive: true
    });

    console.log('Game object created:', JSON.stringify(newGame.toObject ? newGame.toObject() : newGame, null, 2));

    console.log('Saving game to database...');
    const savedGame = await newGame.save();
    console.log('Game saved successfully:', savedGame._id);

    return NextResponse.json({
      success: true,
      game: savedGame
    });

  } catch (error) {
    console.error('Error creating game:', error);
    console.error('Error details:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to create game', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/games - Starting request processing');

    const session = await getServerSession(authOptions);
    console.log('Session check:', session?.user ? 'User authenticated' : 'No session');

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = session.user.id || session.user.email;
    console.log('Checking admin status for user:', userId);

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Admin access granted for user:', userId);

    // Connect to database
    await connectDB();

    // Get game ID from URL
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('id');

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to delete game with ID:', gameId);

    // Find and soft delete the game
    const deletedGame = await Game.findByIdAndUpdate(
      gameId,
      { isActive: false },
      { new: true }
    );

    if (!deletedGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    console.log('Game soft deleted successfully:', deletedGame._id);

    return NextResponse.json({
      success: true,
      message: 'Game deleted successfully',
      game: {
        _id: deletedGame._id,
        title: deletedGame.title,
        isActive: deletedGame.isActive
      }
    });

  } catch (error) {
    console.error('Error deleting game:', error);
    console.error('Error details:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to delete game', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
