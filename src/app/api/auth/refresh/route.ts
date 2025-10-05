import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }
    
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ 
        error: 'Refresh token is required' 
      }, { status: 400 });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any;

    // Generate new access token
    const newToken = jwt.sign(
      { 
        userId: decoded.userId, 
        email: decoded.email,
        username: decoded.username 
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    return NextResponse.json({ 
      success: true, 
      token: newToken,
      message: 'Token refreshed successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error in token refresh:', error);
    return NextResponse.json({ 
      error: 'Invalid refresh token' 
    }, { status: 401 });
  }
}
