# thuc_pham_so_1 - Stack Chuan Va Handoff

Tieu chi: rebuild website `thucphamso1.vn` theo huong B2B, SEO-first, de mo rong, de handoff cho agent moi.

## 1) Muc tieu san pham

- Website moi phai phuc vu dung dinh vi catalog: thuc pham cho bep an tap the, suat an cong nghiep, truong hoc, benh vien, nha hang, khach san.
- Uu tien: SEO local, toc do, landing page cho tung nhom san pham/nhu cau, form nhan bao gia, CTA goi dien/Zalo.
- Khong lam site ban le chung chung, khong de blog lech nganh chiem vi tri trung tam.

## 2) Stack chot

### Frontend

- Next.js 16
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod

### SEO va content

- Next.js Metadata API
- `robots.ts`
- `sitemap.ts`
- JSON-LD schema: `Organization`, `LocalBusiness`, `Product`, `FAQPage`, `BreadcrumbList`
- Content dung MDX hoac JSON truoc, CMS sau

### Data layer

- Giai doan 1: content tinh trong repo
- Giai doan 2: PostgreSQL hoac Supabase neu can CMS / lead storage

### Hinh anh va media

- `sharp` de optimize anh
- WebP/AVIF
- lazy load anh

### Deploy

- Staging: Vercel hoac VPS staging
- Production: Vercel neu can nhanh, hoac Docker + Nginx neu can kiem soat server
- DNS/CDN: Cloudflare

## 3) Quy uoc codebase

```text
thucphamso1/
  app/
    (public)/
      page.tsx
      gioi-thieu/page.tsx
      san-pham/page.tsx
      san-pham/[slug]/page.tsx
      danh-muc/[slug]/page.tsx
      nganh-hang/[slug]/page.tsx
      dich-vu/[slug]/page.tsx
      kien-thuc/page.tsx
      kien-thuc/[slug]/page.tsx
      bao-gia/page.tsx
      lien-he/page.tsx
      chinh-sach/[slug]/page.tsx
    api/
      contact/route.ts
      quote/route.ts
    layout.tsx
    robots.ts
    sitemap.ts
  components/
    sections/
    ui/
    seo/
  content/
    products/
    categories/
    industries/
    posts/
    pages/
  lib/
    seo.ts
    site.ts
    content.ts
    validation.ts
  public/
    images/
    icons/
```

## 4) Cau truc noi dung bat buoc

### Trang chu

- Hero: 1 dong dinh vi B2B ro rang
- 4 nhom san pham chinh
- 4 nhom khach hang chinh
- cam ket chat luong
- khu vuc phuc vu
- CTA bao gia

### Nhom trang can co

- San pham
- Danh muc san pham
- Nganh hang
- Dich vu
- Kien thuc
- Gioi thieu
- Lien he
- Bao gia
- Chinh sach

### Landing page phai co

- Mo ta ngan gon
- Doi tuong phuc vu
- Danh muc hang cu the
- Quy trinh giao hang
- Loi ich khi chon dong nai / bien hoa / khu vuc phuc vu
- FAQ
- CTA lien he

## 5) SEO rule bat buoc

- Title va meta description phai tuyen theo y dinh tim kiem.
- URL khong dau, ngan, co y nghia.
- Moi trang co 1 H1 duy nhat.
- Co breadcrumb.
- Anh co alt text mo ta dung san pham.
- Khong lap noi dung giua cac landing page.
- Noindex cac trang that su khong can index neu co.
- Toi uu Core Web Vitals ngay tu dau.

## 6) Local SEO va trust

- NAP phai thong nhat 100%: ten cong ty, dia chi, hotline, email.
- Co trang lien he day du, Google Map, gio lam viec, khu vuc giao.
- Co trang khach hang tieu bieu / doi tac neu duoc phep cong bo.
- Co trang quy trinh van hanh, kiem soat chat luong, van chuyen, bao quan.

## 7) Data content can nhap

- Nhom san pham:
  - rau cu qua
  - thit ca hai san
  - hang dong lanh
  - gia vi
  - thuc pham chay
- Nhom khach hang:
  - be an tap the
  - suat an cong nghiep
  - truong hoc
  - benh vien
  - nha hang
  - khach san

## 8) Checklist khoi dong project

1. Tao project Next.js.
2. Cai `tailwind`, `shadcn/ui`, `zod`, `react-hook-form`, `sharp`, `next-sitemap`.
3. Tao `site config` va bien moi truong.
4. Tao sitemap cac route co ban.
5. Tao schema JSON-LD.
6. Tao layout public.
7. Tao landing page cho 5 nhom san pham + 5 nhom khach hang.
8. Tao form Lien he / Bao gia.
9. Tao trang chinh sach.
10. Tao noi dung blog ho tro SEO.
11. Toi uu anh va test mobile.
12. Test indexability, sitemap, robots, redirect.

## 9) Bien moi truong de nghi

```env
NEXT_PUBLIC_SITE_URL=https://thucphamso1.vn
NEXT_PUBLIC_SITE_NAME=Thuc Pham So 1
NEXT_PUBLIC_PHONE=
NEXT_PUBLIC_EMAIL=
NEXT_PUBLIC_ZALO=
NEXT_PUBLIC_ADDRESS=
```

## 10) Decision log

- Domain chot de lam site moi: `thucphamso1.vn`
- Vi tri SEO chinh: B2B supply, khong phai site ban le chung
- Source code moi hoan toan, khong reuse theme cu
- Content cu chi dung lam nguyen lieu, khong dung cuc bo cue
- Contact chot: hotline `0898 902 222`, email `banhang@thucphamso1.vn`

## 11) Cach tiep tuc neu quota het

- Doc file nay truoc tien.
- Neu can code tiep, uu tien lam:
  1. scaffold project
  2. tao route + layout
  3. tao content model
  4. tao homepage va landing pages
  5. them SEO schema va sitemap
