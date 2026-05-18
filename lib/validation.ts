import { z } from "zod";

const quoteItemSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2, "Vui lòng nhập họ tên"),
  phone: z.string().min(8, "Vui lòng nhập số điện thoại"),
  company: z.string().optional().or(z.literal("")),
  facilityType: z.string().min(1, "Vui lòng chọn loại hình đơn vị"),
  interestedIn: z.string().min(1, "Vui lòng chọn nhóm hàng quan tâm"),
  purchaseScale: z.string().min(1, "Vui lòng chọn quy mô nhu cầu"),
  deliveryFrequency: z.string().min(1, "Vui lòng chọn tần suất giao"),
  deliveryArea: z.string().min(2, "Vui lòng nhập khu vực giao"),
  email: z.string().email("Vui lòng nhập email hợp lệ").optional().or(z.literal("")),
  needBy: z.string().optional().or(z.literal("")),
  message: z.string().min(10, "Vui lòng mô tả nhu cầu"),
  selectedItems: z.array(quoteItemSchema).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
