# Handoff Context - Thuc Pham So 1

Last updated: 2026-05-27

## Current repo state

- Workspace: `D:\AI_Business\workspace\thuc_pham_so_1`
- Branch: `main`
- Remote: `origin https://github.com/dlltraded/thucphamsomot.git`
- Status before this handoff file: clean and synced with `origin/main`
- Latest pushed work before this note:
  - `7560fbb Keep partner logos within mobile frame`
  - `d19af06 Scale partner logos on mobile`
  - `bf6e76d Sync Zalo contact number`
  - `4509cd9 Polish homepage layout and partner section`

## What was changed recently

### Layout width and section consistency

- Main layout control is in `app/globals.css`.
- `.container-shell` was changed from full-width behavior to a shared shell system:
  - `--site-shell-max: 1280px`
  - `--site-gutter: clamp(24px, 4vw, 56px)`
  - `width: min(calc(100% - var(--site-gutter)), var(--site-shell-max))`
- Goal: sections should share the same left/right edge, avoid random wide/narrow blocks, and keep desktop menu in one row.
- Desktop nav was changed to avoid wrapping:
  - `.site-nav { flex-wrap: nowrap; white-space: nowrap; }` inside the desktop media block.
- `html` and `body` include `overflow-x: clip` to prevent horizontal overflow.

### Partner logo section

- Partner/client logo section was added to:
  - `app/page.tsx`
  - `app/en/page.tsx`
- Image assets were added under:
  - `public/images/partners/tps1-partner-logos-1.png`
  - `public/images/partners/tps1-partner-logos-2.png`
  - `public/images/partners/tps1-partner-logos-3.png`
  - `public/images/partners/tps1-partner-logos-all.png`
- The site currently displays `tps1-partner-logos-all.png`.
- Relevant CSS classes:
  - `.home-partners`
  - `.home-partners__grid`
  - `.home-partners__panel`
  - `.home-partners__image`
- Important: the mobile logo image was previously enlarged with `transform: scale(...)`, but that caused logo edges to be cropped. The current fix removes scaling, uses `object-fit: contain`, uses low padding, and sets the panel ratio close to the source image:
  - desktop/mobile panel `aspect-ratio: 8 / 3`
  - mobile `min-height: 132px`
  - mobile image `padding: 2px`

### Zalo and phone number

- Contact config is centralized in `lib/site.ts`.
- Zalo should be `0898902222`.
- Phone display is derived from the same source number:
  - `primaryPhoneDigits = "0898902222"`
  - `primaryPhoneDisplay = "089 890 2222"`
- `components/social-widget.tsx` builds the Zalo link from `siteConfig.zalo`:
  - `https://zalo.me/${siteConfig.zalo}`

## Verification already run

- `cmd /c npm run lint` passed after layout/logo changes.
- `npm run build` / `cmd /c npm run build` passed after changes.
- On this Windows machine, PowerShell may block direct `npm run ...` because of execution policy. Prefer:
  - `cmd /c npm run lint`
  - `cmd /c npm run build`
- During build, repeated Supabase fallback logs for `/kien-thuc`, `/kien-thuc/[slug]`, and `/sitemap.xml` can appear. These were non-blocking and build still completed.
- `next-sitemap` updates `public/sitemap-0.xml` timestamps after builds. This is expected.

## If continuing after software update

1. Start in `D:\AI_Business\workspace\thuc_pham_so_1`.
2. Read this file first.
3. Check:
   - `git status --short --branch`
   - `git log --oneline -8`
4. For layout issues, start at `app/globals.css`.
5. For partner logos, inspect `app/page.tsx`, `app/en/page.tsx`, and `public/images/partners/`.
6. For Zalo/phone issues, inspect `lib/site.ts` and `components/social-widget.tsx`.
7. Before pushing, run at least `cmd /c npm run lint`; for visual/layout changes, also run `cmd /c npm run build`.

## Recent user intent

- User wanted sections to be consistent in width and not overflow on mobile.
- User wanted the desktop menu to fit in one row.
- User wanted Zalo number unified as `0898902222`.
- User wanted partner logos visible larger on mobile, but not cropped or losing rounded corners.
- User prefers direct GitHub pushes to `main` for Vercel/GitHub deploy flow once changes are accepted.
