import { NextRequest } from 'next/server';

export interface ZaloConfig {
  id: string;
  app_id: string;
  secret_key: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
}

const SUPABASE_URL = process.env.SUPABASE_PRODUCTS_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PRODUCTS_ANON_KEY || '';

/**
 * Lấy cấu hình Zalo OA từ Supabase
 */
export async function getZaloConfig(): Promise<ZaloConfig | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Zalo Integration: Missing Supabase URL or Key');
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/zalo_config?id=eq.tps1_oa`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Zalo Integration: Failed to get config from Supabase (${response.status}): ${errorText}`);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return data[0] as ZaloConfig;
    }

    console.warn('Zalo Integration: No config found for id tps1_oa');
    return null;
  } catch (error) {
    console.error('Zalo Integration: Error fetching config from Supabase:', error);
    return null;
  }
}

/**
 * Lưu/Cập nhật cấu hình Zalo OA vào Supabase
 */
export async function saveZaloConfig(config: Partial<ZaloConfig>): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return false;
  }

  try {
    const payload = {
      id: 'tps1_oa',
      ...config,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/zalo_config?id=eq.tps1_oa`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Zalo Integration: Failed to save config to Supabase (${response.status}): ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Zalo Integration: Error saving config to Supabase:', error);
    return false;
  }
}

/**
 * Tự động kiểm tra và làm mới Access Token Zalo OA bằng Refresh Token (OAuth v4)
 */
export async function getOrRefreshToken(): Promise<string | null> {
  const config = await getZaloConfig();
  if (!config) {
    return null;
  }

  const { app_id, secret_key, access_token, refresh_token, expires_at } = config;

  // Nếu vẫn còn hạn dùng (và còn hơn 5 phút nữa mới hết hạn), trả về access_token hiện tại
  if (access_token && expires_at) {
    const expiresTime = new Date(expires_at).getTime();
    const nowTime = Date.now();
    const safetyBuffer = 5 * 60 * 1000; // 5 phút

    if (expiresTime - nowTime > safetyBuffer) {
      return access_token;
    }
  }

  // Nếu không có refresh_token, không thể refresh
  if (!refresh_token) {
    console.error('Zalo Integration: Cannot refresh token, missing refresh_token');
    return null;
  }

  console.log('Zalo Integration: Access token expired or expiring soon. Refreshing...');

  try {
    const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': secret_key,
      },
      body: new URLSearchParams({
        refresh_token: refresh_token,
        app_id: app_id,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Zalo Integration: Refresh token API failed:', data);
      return null;
    }

    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token;
    const expiresIn = parseInt(data.expires_in, 10) || 3600; // Mặc định 1 giờ

    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    // Refresh token có hạn 3 tháng (90 ngày)
    const newRefreshExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const success = await saveZaloConfig({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt,
      refresh_expires_at: newRefreshExpiresAt,
    });

    if (success) {
      console.log('Zalo Integration: Successfully refreshed tokens and saved to Supabase');
      return newAccessToken;
    } else {
      console.error('Zalo Integration: Refreshed tokens but failed to save to Supabase');
      return null;
    }
  } catch (error) {
    console.error('Zalo Integration: Error calling Zalo refresh token API:', error);
    return null;
  }
}

/**
 * Gửi tin nhắn mẫu ZNS (ZBS Template Message v3) cho khách hàng qua số điện thoại
 */
export async function sendZNSTemplate(
  phone: string,
  templateId: string,
  templateData: Record<string, any>,
  trackingId?: string
): Promise<{ error: number; message: string; message_id?: string } | null> {
  const accessToken = await getOrRefreshToken();
  if (!accessToken) {
    return { error: -1, message: 'Cannot retrieve active Zalo Access Token' };
  }

  // Chuẩn hóa số điện thoại: 0898902222 -> 84898902222
  let formattedPhone = phone.trim().replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '84' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('84')) {
    formattedPhone = '84' + formattedPhone;
  }

  try {
    const payload = {
      phone: formattedPhone,
      template_id: templateId,
      template_data: templateData,
      tracking_id: trackingId || `tps1_${Date.now()}`,
    };

    const response = await fetch('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: {
        'access_token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Zalo Integration: Error calling ZNS Template API:', error);
    return { error: -2, message: String(error) };
  }
}

/**
 * Gửi tin nhắn tư vấn dạng văn bản cho khách hàng (trong khung 48 giờ kể từ khi có tương tác)
 */
export async function sendOAConsultingMessage(
  userId: string,
  text: string
): Promise<{ error: number; message: string; message_id?: string } | null> {
  const accessToken = await getOrRefreshToken();
  if (!accessToken) {
    return { error: -1, message: 'Cannot retrieve active Zalo Access Token' };
  }

  try {
    const payload = {
      recipient: {
        user_id: userId,
      },
      message: {
        text: text,
      },
    };

    const response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'access_token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Zalo Integration: Error calling OA Consulting Message API:', error);
    return { error: -2, message: String(error) };
  }
}
