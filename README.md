# thuc_pham_so_1

Website B2B cho `thucphamso1.vn` theo huong SEO-first va local-first.

## Stack

- Next.js 16.2.6
- TypeScript
- Tailwind CSS 4
- shadcn/ui-ready
- React Hook Form
- Zod
- next-sitemap

## Chay local

```bash
copy .env.example .env.local
npm install
npm run dev
```

Mo website tai:

- http://localhost:3000

## Build

```bash
npm run build
```

## Mo hinh website

- Homepage dinh vi B2B
- Trang san pham
- Trang danh muc
- Trang nganh hang
- Trang dich vu
- Trang kien thuc
- Trang lien he va bao gia
- Trang chinh sach

## Luu y handoff

- Doc `HANDOFF_STACK.md` neu can tiep tuc code khi het quota.
- Source code moi hoan toan, khong reuse theme cu.
- Toi uu SEO quanh cac cum: bep an tap the, suat an cong nghiep, truong hoc, benh vien, nha hang, khach san.

## Google Sheet cho form bao gia

- Webhook nhan form nam o `google-sheet-webhook.gs`.
- Neu Apps Script la project rieng, hay dat `SPREADSHEET_ID` trong `Script Properties` de script biet ghi vao file nao.
- Neu script duoc tao bang cach gan truc tiep trong Google Sheet, `SpreadsheetApp.getActiveSpreadsheet()` se hoat dong luon.
- Sau khi sua Apps Script, `Deploy` lai `Web app` va cap nhat lai `GOOGLE_SHEET_WEBHOOK_URL` neu can.

## Deploy len Vercel

- Vercel khong tu lay `.env.local` trong repo de dung cho production.
- Vao `Project Settings` -> `Environment Variables` tren Vercel va them `GOOGLE_SHEET_WEBHOOK_URL` cho moi environment can dung.
- Neu muon doi mat khau quan tri, them `ADMIN_TOKEN` tren Vercel. Mac dinh cua repo la `88888888`.
- Sau khi doi env, can redeploy lai deployment moi co hieu luc.
