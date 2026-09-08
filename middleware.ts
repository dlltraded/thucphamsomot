import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from './lib/admin-session';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Bảo vệ route /sale
  if (path.startsWith('/sale')) {
    // Cho phép truy cập trang đăng nhập
    if (path === '/sale/dang-nhap') {
      return NextResponse.next();
    }

    // Kiểm tra session cookie
    const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.redirect(new URL('/sale/dang-nhap', request.url));
    }

    // Có cookie => Cho phép đi tiếp (verification thực sự có thể làm thêm nếu cần)
    return NextResponse.next();
  }

  // Các route khác đi qua bình thường
  return NextResponse.next();
}

export const config = {
  matcher: ['/sale/:path*'],
};
