import React from "react";
import Section from "@/components/section";

export default function PaymentMethod() {
  return (
    <Section title="Phương thức thanh toán" className="rounded-lg">
      <div className="p-4 pt-2">
        <div className="flex items-center space-x-3 text-base font-medium bg-primary/10 text-primary border border-primary rounded-lg p-3">
          <div className="flex-1">
            <span className="block text-sm">Thanh toán khi nhận hàng (COD)</span>
          </div>
          <div className="w-5 h-5 rounded-full border-4 border-primary flex-shrink-0"></div>
        </div>
      </div>
    </Section>
  );
}
