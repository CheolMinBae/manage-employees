import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const adminOnlyPaths = ['/settings', '/schedule-templates'];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const isAdminRoute = adminOnlyPaths.some((p) => pathname.startsWith(p));
    if (isAdminRoute && token?.position !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/authentication/login',
    },
  }
);

export const config = {
  matcher: [
    '/((?!authentication|api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};
