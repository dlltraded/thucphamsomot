export type ImportChannel = 'website' | 'pos';
export type ImportActor = {
  type: 'customer' | 'staff';
  actorId: string | null;
  customerId: string;
  channel: ImportChannel;
  role?: string | null;
};

export type ExtractedOrderLine = {
  sourceFile: string;
  sourcePage?: number | null;
  sourceRow?: number | null;
  rawText?: string | null;
  sku?: string | null;
  name: string;
  quantity: number;
  unit?: string | null;
  note?: string | null;
  documentPrice?: number | null;
  confidence?: number | null;
};

export type ImportFileDescriptor = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  path: string;
  sha256?: string;
};

export type ProductSuggestion = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  score: number;
  price?: number | null;
};
