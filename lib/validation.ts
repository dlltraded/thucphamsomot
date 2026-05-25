import { z } from "zod";

const quoteItemSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
});

const leadCoreSchema = z.object({
  name: z.string().min(2, "Vui lòng nhập họ tên"),
  phone: z.string().min(8, "Vui lòng nhập số điện thoại"),
  company: z.string().optional().or(z.literal("")),
  email: z.string().email("Vui lòng nhập email hợp lệ").optional().or(z.literal("")),
  message: z.string().min(10, "Vui lòng mô tả nhu cầu"),
  selectedItems: z.array(quoteItemSchema).optional(),
});

export const leadSchema = leadCoreSchema.extend({
  facilityType: z.string().min(1, "Vui lòng chọn loại hình đơn vị"),
  interestedIn: z.string().min(1, "Vui lòng chọn nhóm hàng quan tâm"),
  purchaseScale: z.string().min(1, "Vui lòng chọn quy mô nhu cầu"),
  deliveryFrequency: z.string().min(1, "Vui lòng chọn tần suất giao"),
  deliveryArea: z.string().min(2, "Vui lòng nhập khu vực giao"),
  needBy: z.string().optional().or(z.literal("")),
});

export const quoteSchema = leadCoreSchema.extend({
  inquiryType: z.enum(["buyer", "supplier"]),
  facilityType: z.string().optional().or(z.literal("")),
  interestedIn: z.string().optional().or(z.literal("")),
  purchaseScale: z.string().optional().or(z.literal("")),
  deliveryFrequency: z.string().optional().or(z.literal("")),
  deliveryArea: z.string().optional().or(z.literal("")),
  needBy: z.string().optional().or(z.literal("")),
  supplierType: z.string().optional().or(z.literal("")),
  offeredProducts: z.string().optional().or(z.literal("")),
  supplyCapacity: z.string().optional().or(z.literal("")),
  supplyArea: z.string().optional().or(z.literal("")),
  certifications: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.inquiryType === "buyer") {
    if (!data.facilityType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["facilityType"],
        message: "Vui lòng chọn loại hình đơn vị",
      });
    }
    if (!data.interestedIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interestedIn"],
        message: "Vui lòng chọn nhóm hàng quan tâm",
      });
    }
    if (!data.purchaseScale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchaseScale"],
        message: "Vui lòng chọn quy mô nhu cầu",
      });
    }
    if (!data.deliveryFrequency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryFrequency"],
        message: "Vui lòng chọn tần suất giao",
      });
    }
    if (!data.deliveryArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryArea"],
        message: "Vui lòng nhập khu vực giao",
      });
    }
  }

  if (data.inquiryType === "supplier") {
    if (!data.supplierType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supplierType"],
        message: "Vui lòng chọn loại nhà cung cấp",
      });
    }
    if (!data.offeredProducts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offeredProducts"],
        message: "Vui lòng cho biết anh/chị muốn chào hàng gì",
      });
    }
    if (!data.supplyArea) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supplyArea"],
        message: "Vui lòng nhập khu vực cung ứng",
      });
    }
  }
});

export type LeadInput = z.infer<typeof leadSchema>;
export type QuoteLeadInput = z.infer<typeof quoteSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
