export type ProductSearchRow = { id: string; sku: string; name: string; unit: string };

export function normalizeProductText(value: unknown) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ|Đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function compactProductText(value: unknown) {
  return normalizeProductText(value).replace(/\s+/g, '');
}

function canonicalProductName(product: Pick<ProductSearchRow, 'name' | 'unit'>) {
  const withoutParentheses = String(product.name || '').replace(/\([^)]*\)/g, ' ');
  const normalized = normalizeProductText(withoutParentheses);
  const unit = normalizeProductText(product.unit || '');
  if (unit && normalized.endsWith(` ${unit}`)) return normalized.slice(0, -(unit.length + 1)).trim();
  return normalized;
}

function trigrams(value: string) {
  const padded = `  ${value} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

function dice(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const gram of a) if (b.has(gram)) overlap++;
  return (2 * overlap) / (a.size + b.size);
}

export function rankProductCandidates<T extends ProductSearchRow>(products: T[], rawName: string) {
  const query = normalizeProductText(rawName);
  const queryCompact = compactProductText(rawName);
  const queryWords = query.split(' ').filter(Boolean);
  if (!queryCompact) return [];

  return products.map((product) => {
    const name = canonicalProductName(product);
    const nameCompact = compactProductText(name);
    const nameWords = name.split(' ').filter(Boolean);
    let score = dice(trigrams(query), trigrams(name));

    if (name === query) score = 1;
    else if (nameCompact === queryCompact) score = 0.995;
    else if (name.startsWith(`${query} `)) score = Math.max(score, 0.97 - Math.min(0.06, (nameWords.length - queryWords.length) * 0.01));
    else if (nameCompact.startsWith(queryCompact)) score = Math.max(score, 0.93 - Math.min(0.08, (nameCompact.length - queryCompact.length) / 100));
    else if (queryWords.every((word) => nameWords.includes(word))) {
      score = Math.max(score, 0.86 - Math.min(0.12, (nameWords.length - queryWords.length) * 0.025));
    }

    // Những từ này thường làm thay đổi hẳn mặt hàng. Nếu chứng từ không có
    // nhưng tên sản phẩm có, hạ thứ hạng để "su su" không đứng sau "đọt su su".
    const differentiators = ['dot', 'baby', 'mam', 'bong', 'cu', 'la', 'dong', 'lanh', 'kho', 'xay', 'cat', 'loai', 'dac', 'biet'];
    const unexpectedModifiers = differentiators.filter((word) => nameWords.includes(word) && !queryWords.includes(word));
    score -= Math.min(0.32, unexpectedModifiers.length * 0.08);

    return { product, score };
  }).filter((entry) => entry.score >= 0.28)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'vi'));
}

export function canonicalProductKey(product: Pick<ProductSearchRow, 'name' | 'unit'>) {
  return canonicalProductName(product);
}
