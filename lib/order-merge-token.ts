import crypto from 'crypto';

function getSecret() {
  const secret = process.env.ORDER_MERGE_SECRET || process.env.CUSTOMER_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Thiếu ORDER_MERGE_SECRET/CUSTOMER_SESSION_SECRET an toàn trên server');
  }
  return secret;
}

export interface MergePreviewTokenData {
  orderIds: string[];
  customerId: string;
  deliveryDate: string;
  itemsBeforeCount: number;
  itemsAfterCount: number;
  subtotal: number;
  timestamp: number;
  expiresAt: number;
}

export function signMergePreviewToken(data: Omit<MergePreviewTokenData, 'timestamp' | 'expiresAt'>): string {
  const timestamp = Date.now();
  const expiresAt = timestamp + 30 * 60 * 1000; // 30 phút hiệu lực
  const payload: MergePreviewTokenData = {
    ...data,
    orderIds: [...data.orderIds].sort(),
    timestamp,
    expiresAt,
  };

  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(base64Data).digest('base64url');
  return `${base64Data}.${signature}`;
}

export function verifyMergePreviewToken(token: string): { valid: boolean; data?: MergePreviewTokenData; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Thiếu token xem trước khi gộp đơn' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Token xem trước không hợp lệ' };
  }

  try {
    const [base64Data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', getSecret()).update(base64Data).digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);

    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return { valid: false, error: 'Chữ ký token xem trước không đúng hoặc đã bị sửa đổi' };
    }

    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf8');
    const data: MergePreviewTokenData = JSON.parse(jsonStr);

    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'Token xem trước đã hết hạn. Vui lòng mở lại bản xem trước để cập nhật' };
    }

    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Dữ liệu token không đọc được',
    };
  }
}
