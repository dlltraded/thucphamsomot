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

function includesEveryWord(container: string[], required: string[]) {
  const available = new Map<string, number>();
  for (const word of container) available.set(word, (available.get(word) || 0) + 1);
  for (const word of required) {
    const count = available.get(word) || 0;
    if (!count) return false;
    available.set(word, count - 1);
  }
  return true;
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
    const queryIsContained = nameCompact.includes(queryCompact);
    const nameIsContained = queryCompact.includes(nameCompact);
    const allQueryWordsMatch = includesEveryWord(nameWords, queryWords);
    const allNameWordsMatch = includesEveryWord(queryWords, nameWords);
    const sharedWords = queryWords.filter((word, index) => queryWords.indexOf(word) === index && nameWords.includes(word));

    // Chỉ gợi ý khi tên thực sự cùng mặt hàng. Độ giống ký tự đơn thuần
    // không đủ vì "su su" rất dễ bị ghép nhầm với "muỗng sứ".
    const isRelevant = name === query
      || nameCompact === queryCompact
      || queryIsContained
      || nameIsContained
      || allQueryWordsMatch
      || allNameWordsMatch
      || (queryWords.length >= 3 && sharedWords.length >= 2 && sharedWords.length / queryWords.length >= 0.66);
    if (!isRelevant) return null;

    let score = 0;

    if (name === query) score = 1;
    else if (nameCompact === queryCompact) score = 0.995;
    else if (name.startsWith(`${query} `)) score = 0.95 - Math.min(0.08, Math.max(0, nameWords.length - queryWords.length) * 0.02);
    else if (nameCompact.startsWith(queryCompact)) score = 0.92 - Math.min(0.10, Math.max(0, nameCompact.length - queryCompact.length) / 80);
    else if (queryIsContained) score = 0.89 - Math.min(0.12, Math.max(0, nameCompact.length - queryCompact.length) / 80);
    else if (nameIsContained) score = 0.84 - Math.min(0.12, Math.max(0, queryCompact.length - nameCompact.length) / 80);
    else if (allQueryWordsMatch) score = 0.86 - Math.min(0.12, Math.max(0, nameWords.length - queryWords.length) * 0.025);
    else if (allNameWordsMatch) score = 0.80 - Math.min(0.12, Math.max(0, queryWords.length - nameWords.length) * 0.025);
    else score = 0.66 + Math.min(0.12, dice(trigrams(query), trigrams(name)) * 0.12);

    // Những từ này thường làm thay đổi hẳn mặt hàng. Nếu chứng từ không có
    // nhưng tên sản phẩm có, hạ thứ hạng để "su su" không đứng sau "đọt su su".
    const differentiators = ['dot', 'baby', 'mam', 'bong', 'cu', 'la', 'dong', 'lanh', 'kho', 'xay', 'cat', 'loai', 'dac', 'biet'];
    const unexpectedModifiers = differentiators.filter((word) => nameWords.includes(word) && !queryWords.includes(word));
    score -= Math.min(0.32, unexpectedModifiers.length * 0.08);

    return { product, score: Math.max(0, score) };
  }).filter((entry): entry is { product: T; score: number } => entry !== null)
    .filter((entry) => entry.score >= 0.6)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'vi'));
}

export function canonicalProductKey(product: Pick<ProductSearchRow, 'name' | 'unit'>) {
  return canonicalProductName(product);
}
