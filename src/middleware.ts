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

  // Track analytics for page visits (non-API routes)
  if (request.method === 'GET' && 
      !request.nextUrl.pathname.startsWith('/api/') && 
      !request.nextUrl.pathname.startsWith('/_next/') &&
      !request.nextUrl.pathname.startsWith('/favicon') &&
      !request.nextUrl.pathname.includes('.')) {
    
    // Create a response
    const response = NextResponse.next();
    
    // Add analytics tracking headers that can be read by client-side code
    response.headers.set('x-analytics-track', 'true');
    response.headers.set('x-page-path', request.nextUrl.pathname);
    response.headers.set('x-referrer', request.headers.get('referer') || '');
    response.headers.set('x-user-agent', request.headers.get('user-agent') || '');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/shop/upload-file',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
