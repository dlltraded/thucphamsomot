import assert from "assert";
import { quoteSchema } from "../lib/validation.ts";

async function testValidation() {
  console.log("=== BẮT ĐẦU TEST QUICK QUOTE & VALIDATION ===");

  // Test Case 1: Valid 3-field Quick Quote payload
  const validPayload = {
    inquiryType: "buyer",
    name: "Bếp ăn Cty May Đồng Nai",
    company: "Bếp ăn Cty May Đồng Nai",
    phone: "0912345678",
    message: "Nhu cầu B2B: Cần 500 suất rau củ và thịt heo mỗi ngày",
    interestedIn: "Rau củ và thịt heo",
    facilityType: "Bếp ăn / Doanh nghiệp",
    hasBuyingList: "Chưa",
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "b2b_kitchen_lead",
    utmContent: "ad_1",
    utmTerm: "cung cap thuc pham bien hoa",
    gclid: "Cj0KCQjwmOm3BhC8ARIsAbl064vTestGclid123",
    fbclid: "",
    pagePath: "/nhan-bao-gia?utm_source=google&gclid=Cj0KCQjwmOm3BhC8ARIsAbl064vTestGclid123",
  };

  const res1 = quoteSchema.safeParse(validPayload);
  assert.strictEqual(res1.success, true, "Valid quick quote payload must pass validation");
  assert.strictEqual(res1.data.gclid, "Cj0KCQjwmOm3BhC8ARIsAbl064vTestGclid123", "gclid must be preserved");
  console.log("✓ Test 1: Payload 3 trường hợp lệ + GCLID + UTMs PASSED");

  // Test Case 2: Missing company (name)
  const invalidName = {
    ...validPayload,
    name: "A", // too short (<2)
  };
  const res2 = quoteSchema.safeParse(invalidName);
  assert.strictEqual(res2.success, false, "Name < 2 must fail");
  console.log("✓ Test 2: Name < 2 bị từ chối chính xác PASSED");

  // Test Case 3: Missing phone (<8 chars)
  const invalidPhone = {
    ...validPayload,
    phone: "123",
  };
  const res3 = quoteSchema.safeParse(invalidPhone);
  assert.strictEqual(res3.success, false, "Phone < 8 must fail");
  console.log("✓ Test 3: Phone < 8 bị từ chối chính xác PASSED");

  // Test Case 4: Missing message (<10 chars)
  const shortMessage = {
    ...validPayload,
    message: "Rau",
  };
  const res4 = quoteSchema.safeParse(shortMessage);
  assert.strictEqual(res4.success, false, "Message < 10 must fail");
  console.log("✓ Test 4: Message < 10 bị từ chối chính xác PASSED");

  // Test Case 5: Buyer missing interestedIn
  const missingInterestedIn = {
    ...validPayload,
    interestedIn: "",
  };
  const res5 = quoteSchema.safeParse(missingInterestedIn);
  assert.strictEqual(res5.success, false, "Buyer missing interestedIn must fail superRefine");
  console.log("✓ Test 5: Buyer thiếu interestedIn bị từ chối chính xác PASSED");

  console.log("=== TẤT CẢ 5 TEST CASES SCHEMA ĐÃ ĐẠT 100% ===");
}

testValidation().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
