import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password'];

// Static files and API routes to skip
const skipPatterns = [
  /^\/_next/,
  /^\/api/,
  /^\/favicon/,
  /^\/splash/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (skipPatterns.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Session-based authentication check
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    // Redirect to login
    const loginUrl = new URL('/login', request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
