# Supabase content storage

This project can store admin-managed content in Supabase instead of local JSON files.

## 1. Create tables

Open Supabase SQL Editor and run:

```sql
-- paste the contents of supabase/schema.sql here
```

The schema creates:

- `products`
- `news`
- `knowledge`

Rows store the editable object in the `data` JSONB column. The `slug` column is the stable unique key.

## 2. Add environment variables

Set these in `.env.local` for local testing and in Vercel Project Settings for production:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the service role key only on the server. Do not expose it with `NEXT_PUBLIC_`.

## 3. Migrate existing JSON content

After the tables and env vars are ready, run:

```bash
npm run migrate:supabase
```

The migration reads:

- `data/products.json`
- `data/news.json`
- `data/knowledge.json`

Missing files are skipped. If a table is empty, the app still falls back to built-in default content until admin content is saved.

## 4. Runtime behavior

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, `/quan-tri` reads and writes Supabase.

When they are missing, the app falls back to the previous local JSON/default-content behavior for development.
