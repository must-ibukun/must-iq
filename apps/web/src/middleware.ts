import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/reset-password', '/change-password'];
const ADMIN_ROUTES = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie (set on login)
  const token = request.cookies.get('must-iq-token')?.value;
  const role = request.cookies.get('must-iq-role')?.value;

  // Already authenticated → skip login page, but let them visit landing page (/)
  if (pathname === '/login' && token) {
    if (role === 'ADMIN' || role === 'MANAGER') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  // Protected routes → redirect to login if not authenticated
  if (!PUBLIC_ROUTES.includes(pathname) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes → redirect non-admins/non-managers
  const isAuthorizedForAdmin = role === 'ADMIN' || role === 'MANAGER';
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && !isAuthorizedForAdmin) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
