import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle large file uploads
  if (request.nextUrl.pathname.startsWith('/api/shop/upload-file')) {
    const response = NextResponse.next();
    
    // Set headers for large file uploads
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/shop/upload-file',
  ],
};
