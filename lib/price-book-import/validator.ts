import { ItemPriceStatus, ResolvedItemPrice } from './types';

export function parseNumericCell(val: any): { isBlank: boolean; numVal: number | null; isInvalid: boolean } {
  if (val == null || val === '') {
    return { isBlank: true, numVal: null, isInvalid: false };
  }

  if (typeof val === 'number') {
    if (isNaN(val)) return { isBlank: false, numVal: null, isInvalid: true };
    return { isBlank: false, numVal: val, isInvalid: false };
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === 'N/A' || trimmed === 'na') {
      return { isBlank: true, numVal: null, isInvalid: false };
    }
    // Clean currency formatting like "221,100", "221.100", "đ", "%"
    const cleaned = trimmed
      .replace(/\s+/g, '')
      .replace(/[đvn₫]/gi, '')
      .replace(/,/g, ''); // assume standard comma thousand separator or handle dot
    const parsed = Number(cleaned);
    if (isNaN(parsed)) {
      return { isBlank: false, numVal: null, isInvalid: true };
    }
    return { isBlank: false, numVal: parsed, isInvalid: false };
  }

  return { isBlank: false, numVal: null, isInvalid: true };
}

export function validatePriceAndDiscount(
  rawPriceVal: any,
  rawDiscountVal: any,
  priceBookKey: string,
  allowZeroPrice: boolean = false
): ResolvedItemPrice {
  const priceParsed = parseNumericCell(rawPriceVal);
  const discountParsed = parseNumericCell(rawDiscountVal);

  // 1. Check blank price
  if (priceParsed.isBlank) {
    return {
      priceBookKey,
      sourcePrice: null,
      discountPercent: 0,
      discountAmount: 0,
      finalPrice: null,
      status: 'blank_price',
      errorNote: 'Thiếu giá (ô trống)',
    };
  }

  // 2. Check invalid price format
  if (priceParsed.isInvalid || priceParsed.numVal === null) {
    return {
      priceBookKey,
      sourcePrice: null,
      discountPercent: 0,
      discountAmount: 0,
      finalPrice: null,
      status: 'invalid_format',
      errorNote: `Giá không đúng định dạng số: "${rawPriceVal}"`,
    };
  }

  const priceVal = priceParsed.numVal;

  // 3. Check negative price
  if (priceVal < 0) {
    return {
      priceBookKey,
      sourcePrice: priceVal,
      discountPercent: 0,
      discountAmount: 0,
      finalPrice: null,
      status: 'invalid_price',
      errorNote: `Giá âm (${priceVal}) không hợp lệ`,
    };
  }

  // 4. Check zero price
  if (priceVal === 0 && !allowZeroPrice) {
    return {
      priceBookKey,
      sourcePrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      finalPrice: 0,
      status: 'zero_price',
      errorNote: 'Giá bằng 0 (cần xác nhận giá 0 có chủ ý)',
    };
  }

  // 5. Parse discount
  let discountPercent = 0;
  let discountAmount = 0;
  let discountStatusNote: string | undefined = undefined;

  if (!discountParsed.isBlank && discountParsed.numVal != null && !discountParsed.isInvalid) {
    let dVal = discountParsed.numVal;
    // Handle decimal discount e.g. 0.09 = 9%, or whole number e.g. 9 = 9%
    if (dVal > 0 && dVal <= 1) {
      discountPercent = Number((dVal * 100).toFixed(2));
    } else {
      discountPercent = dVal;
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return {
        priceBookKey,
        sourcePrice: priceVal,
        discountPercent,
        discountAmount: 0,
        finalPrice: null,
        status: 'invalid_discount',
        errorNote: `Chiết khấu ngoài khoảng 0% - 100% (${discountPercent}%)`,
      };
    }
  }

  // Final price calculation: In kitchen pricebooks, GIÁ is already the quoted unit price
  const finalPrice = Math.round(priceVal);

  return {
    priceBookKey,
    sourcePrice: priceVal,
    discountPercent,
    discountAmount,
    finalPrice,
    status: priceVal === 0 ? 'zero_price' : 'valid',
    errorNote: discountStatusNote,
  };
}
