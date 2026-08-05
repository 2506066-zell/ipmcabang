import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATTERNS = [
  /^\/admin(\/.*)?$/,
  /^\/profile(\/.*)?$/,
];

const ADMIN_ONLY_PATTERNS = [
  /^\/admin(\/.*)?$/,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  const isProtected = PROTECTED_PATTERNS.some((p) => p.test(pathname));
  if (!isProtected) return NextResponse.next();

  // Get session token from cookie
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin routes, we do a lightweight check here (role check is done in route handlers)
  // Full validation happens in requireAdminAuth() in each route handler
  // This middleware only ensures the token cookie exists (presence check)
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
  ],
};
