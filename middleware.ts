import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Currently no middleware logic needed since /sale was moved to a separate PWA
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
