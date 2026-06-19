import { NextRequest, NextResponse } from 'next/server';
import { getZaloConfig, saveZaloConfig } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/zalo/oauth`;

  // 1. Nếu có lỗi từ Zalo gửi về
  if (error) {
    return new NextResponse(
      `<html>
        <head>
          <title>Lỗi ủy quyền Zalo OA</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fdf2f2; color: #9b1c1c; text-align: center; padding: 50px; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: inline-block; max-width: 500px; border: 1px solid #f8b4b4; }
            h1 { font-size: 24px; margin-bottom: 20px; }
            p { font-size: 16px; line-height: 1.5; color: #7f1d1d; }
            .btn { background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Uỷ quyền thất bại!</h1>
            <p>Đã xảy ra lỗi trong quá trình cấp quyền Zalo OA: <strong>${error}</strong></p>
            <a href="/api/zalo/oauth" class="btn">Thử lại</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // 2. Nếu không có Authorization Code -> Redirect người dùng tới trang xin quyền của Zalo
  if (!code) {
    const config = await getZaloConfig();
    if (!config || !config.app_id) {
      return NextResponse.json(
        { 
          error: -1, 
          message: 'Chưa có cấu hình Zalo app_id trong database. Vui lòng tạo bản ghi trong bảng zalo_config trước.' 
        }, 
        { status: 400 }
      );
    }

    const zaloAuthUrl = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=tps1_state`;
    return NextResponse.redirect(zaloAuthUrl);
  }

  // 3. Nếu đã có Authorization Code -> Thực hiện đổi Access Token & Refresh Token
  const config = await getZaloConfig();
  if (!config || !config.app_id || !config.secret_key) {
    return NextResponse.json(
      { error: -2, message: 'Thiếu cấu hình app_id hoặc secret_key trong database.' }, 
      { status: 500 }
    );
  }

  try {
    console.log('Zalo OAuth Callback: Exchanging authorization code for tokens...');
    
    const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': config.secret_key,
      },
      body: new URLSearchParams({
        code: code,
        app_id: config.app_id,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Zalo OAuth Callback: Exchange failed:', data);
      return new NextResponse(
        `<html>
          <head>
            <title>Lỗi đổi Token Zalo</title>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background: #fdf2f2; color: #9b1c1c; text-align: center; padding: 50px; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: inline-block; max-width: 500px; border: 1px solid #f8b4b4; }
              pre { background: #f9fafb; padding: 15px; border-radius: 6px; text-align: left; overflow-x: auto; font-size: 13px; color: #374151; border: 1px solid #e5e7eb; }
              .btn { background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Lỗi đổi mã Token!</h1>
              <p>Zalo từ chối đổi Authorization Code lấy Token:</p>
              <pre>${JSON.stringify(data, null, 2)}</pre>
              <p>Mã Authorization Code có thể đã hết hạn (10 phút) hoặc được sử dụng.</p>
              <a href="/api/zalo/oauth" class="btn">Thực hiện lại</a>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = parseInt(data.expires_in, 10) || 3600;

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    // Lưu các token vào Supabase
    const saved = await saveZaloConfig({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt,
    });

    if (!saved) {
      throw new Error('Không thể lưu token mới vào database Supabase');
    }

    return new NextResponse(
      `<html>
        <head>
          <title>Kết nối Zalo OA thành công</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0fdf4; color: #166534; text-align: center; padding: 50px; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); display: inline-block; max-width: 500px; border: 1px solid #bbf7d0; }
            .icon { font-size: 60px; color: #22c55e; margin-bottom: 20px; }
            h1 { font-size: 24px; margin-top: 0; }
            p { font-size: 16px; line-height: 1.6; color: #1e293b; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: left; margin: 20px 0; font-size: 14px; }
            .info-item { margin-bottom: 8px; }
            .info-item strong { color: #0f172a; }
            .btn { background: #16a34a; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>Kết nối Zalo OA thành công!</h1>
            <p>Ứng dụng của bạn đã được kết nối với Zalo OA của Thực Phẩm Số Một. Các token đã được khởi tạo và lưu trữ an toàn.</p>
            
            <div class="info-box">
              <div class="info-item"><strong>Access Token (hạn 1h):</strong> Có hiệu lực đến ${new Date(expiresAt).toLocaleString('vi-VN')}</div>
              <div class="info-item"><strong>Refresh Token (hạn 3 tháng):</strong> Có hiệu lực đến ${new Date(refreshExpiresAt).toLocaleString('vi-VN')}</div>
              <div class="info-item"><strong>Cơ chế tự động:</strong> Hệ thống sẽ tự động làm mới token trước khi hết hạn.</div>
            </div>
            
            <a href="/" class="btn">Quay lại Trang chủ</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Zalo OAuth Callback: Error exchanging code:', error);
    return new NextResponse(
      `<html>
        <head>
          <title>Lỗi hệ thống</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fdf2f2; color: #9b1c1c; text-align: center; padding: 50px; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: inline-block; max-width: 500px; border: 1px solid #f8b4b4; }
            h1 { font-size: 24px; }
            p { font-size: 16px; color: #7f1d1d; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Lỗi hệ thống!</h1>
            <p>Đã xảy ra lỗi nghiêm trọng trên máy chủ: ${String(error)}</p>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
