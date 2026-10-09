export type OrderConstraintProduct = {
  id: string;
  name?: string | null;
  unit?: string | null;
  min_order_qty?: number | string | null;
  order_step?: number | string | null;
  enforce_order_step?: boolean | null;
  quantity_precision?: number | string | null;
  packaging_note?: string | null;
};

export type UnitConversion = {
  input_unit: string;
  input_unit_normalized?: string | null;
  factor_to_order_unit: number | string;
};

export type QuantityValidationResult = {
  ok: boolean;
  quantity: number | null;
  inputQuantity: number;
  inputUnit: string;
  orderUnit: string;
  conversionFactor: number | null;
  code?: 'INVALID_QUANTITY' | 'UNIT_CONFLICT' | 'BELOW_MINIMUM' | 'INVALID_STEP' | 'INVALID_PRECISION';
  message?: string;
};

export function normalizeUnit(value: unknown) {
  const unit = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const aliases: Record<string, string> = {
    ky: 'kg', kilo: 'kg', kilogram: 'kg', kilograms: 'kg',
    g: 'g', gram: 'g', grams: 'g',
    lit: 'l', litre: 'l', liter: 'l', l: 'l',
    cai: 'cai', qua: 'qua', trai: 'qua',
    bich: 'bich', goi: 'goi', hop: 'hop', khay: 'khay', thung: 'thung', bao: 'bao', can: 'can', bo: 'bo',
  };
  return aliases[unit] || unit;
}

function decimalPlaces(value: number) {
  if (!Number.isFinite(value)) return 99;
  const text = value.toString().toLowerCase();
  if (text.includes('e-')) return Number(text.split('e-')[1]) || 0;
  return (text.split('.')[1] || '').length;
}

export function validateOrderQuantity(
  product: OrderConstraintProduct,
  inputQuantity: number,
  inputUnit?: string | null,
  conversions: UnitConversion[] = [],
): QuantityValidationResult {
  const orderUnit = String(product.unit || '').trim();
  const rawUnit = String(inputUnit || orderUnit).trim();
  if (!Number.isFinite(inputQuantity) || inputQuantity <= 0) {
    return { ok: false, quantity: null, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: null, code: 'INVALID_QUANTITY', message: 'Số lượng phải lớn hơn 0' };
  }

  const normalizedInput = normalizeUnit(rawUnit);
  const normalizedOrder = normalizeUnit(orderUnit);
  let factor = 1;
  if (normalizedInput && normalizedOrder && normalizedInput !== normalizedOrder) {
    const conversion = conversions.find((item) =>
      normalizeUnit(item.input_unit_normalized || item.input_unit) === normalizedInput
    );
    if (!conversion) {
      return {
        ok: false, quantity: null, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: null,
        code: 'UNIT_CONFLICT',
        message: `Đơn vị “${rawUnit}” chưa có quy đổi sang ${orderUnit || 'đơn vị đặt hàng'}`,
      };
    }
    factor = Number(conversion.factor_to_order_unit);
  }

  const quantity = inputQuantity * factor;
  const minimum = Math.max(0, Number(product.min_order_qty) || 0);
  const step = Math.max(0, Number(product.order_step) || 0);
  const precision = Math.max(0, Number(product.quantity_precision) || 0);
  const epsilon = Math.max(1e-9, 10 ** -(precision + 4));

  // Các cột quy cách cũ có giá trị mặc định 1/0 cho toàn bộ danh mục. Chỉ áp
  // tối thiểu, bước đặt và số lẻ khi nhân viên đã bật kiểm soát quy cách cho
  // đúng sản phẩm; nếu chưa bật thì chỉ kiểm tra số lượng dương và đơn vị.
  if (!product.enforce_order_step) {
    return { ok: true, quantity, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: factor };
  }

  if (quantity + epsilon < minimum) {
    return { ok: false, quantity, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: factor, code: 'BELOW_MINIMUM', message: `Tối thiểu ${minimum} ${orderUnit}` };
  }
  if (step > 0) {
    const ratio = quantity / step;
    if (Math.abs(ratio - Math.round(ratio)) > epsilon) {
      return { ok: false, quantity, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: factor, code: 'INVALID_STEP', message: `Số lượng phải là bội số của ${step} ${orderUnit}` };
    }
  }
  if (decimalPlaces(quantity) > precision) {
    return { ok: false, quantity, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: factor, code: 'INVALID_PRECISION', message: precision === 0 ? `Sản phẩm chỉ nhận số lượng nguyên (${orderUnit})` : `Số lượng chỉ được tối đa ${precision} chữ số thập phân` };
  }
  return { ok: true, quantity, inputQuantity, inputUnit: rawUnit, orderUnit, conversionFactor: factor };
}
