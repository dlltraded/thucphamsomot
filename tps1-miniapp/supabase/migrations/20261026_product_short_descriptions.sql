-- Mô tả ngắn dùng chung cho web đặt hàng, Mini App, POS và quản lý.
-- Không tự sinh mô tả cho toàn bộ danh mục; dữ liệu phải được xác nhận theo sản phẩm.
alter table public.products
  add column if not exists short_description text;

comment on column public.products.short_description is
  'Mô tả ngắn, đã xác minh, hiển thị cùng sản phẩm trên các kênh.';

alter table public.order_items
  add column if not exists short_description_snapshot text;

comment on column public.order_items.short_description_snapshot is
  'Bản chụp mô tả ngắn tại thời điểm đặt hàng; null trên đơn cũ nếu chưa có dữ liệu.';

-- Hai mặt hàng được anh nêu làm mẫu. Trọng lượng trứng CP dùng theo thông tin
-- anh cung cấp; ảnh thùng 150 quả lấy từ trang sản phẩm CP Brand.
update public.products
set short_description = 'Trứng gà CP cỡ số 3, quy cách 150 quả/cây; khoảng 50 g/quả theo thông tin quy cách anh cung cấp.',
    image_url = coalesce(nullif(btrim(image_url), ''), 'https://bizweb.dktcdn.net/100/516/090/products/thu-ng-tru-ng-ga-150-qua-04151389-2731-44f0-8e77-86f143bd24e3.png?v=1733804205317'),
    thumb_url = coalesce(nullif(btrim(thumb_url), ''), 'https://bizweb.dktcdn.net/100/516/090/products/thu-ng-tru-ng-ga-150-qua-04151389-2731-44f0-8e77-86f143bd24e3.png?v=1733804205317')
where lower(sku) = 'tr-trunggacp';

update public.products
set short_description = 'Vỉ gồm 4 trứng vịt muối.',
    image_url = coalesce(nullif(btrim(image_url), ''), 'https://image-handler-prod.s3-ap-southeast-1.amazonaws.com/supplier/654/PRODUCT_IMAGE/924db5ac-7fec-4dd2-9162-be3f97336cde.png'),
    thumb_url = coalesce(nullif(btrim(thumb_url), ''), 'https://image-handler-prod.s3-ap-southeast-1.amazonaws.com/supplier/654/PRODUCT_IMAGE/924db5ac-7fec-4dd2-9162-be3f97336cde.png')
where lower(sku) = 'tr-vitmuoivi';
