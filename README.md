# دليلك · Dalilak

The directory of the Arab community in Belgium – website, installable PWA and Android app from one codebase.

- **Web:** React 19 + Vite + TypeScript, pre-rendered with `vite-react-ssg` (every page is static HTML for Google), PWA via `vite-plugin-pwa`.
- **Languages:** Arabic (default, RTL, `/`), French `/fr`, Dutch `/nl`, English `/en` – i18next.
- **Backend:** Supabase (Postgres + RLS, Auth, Storage, Edge Functions, pg_cron).
- **Android:** Capacitor (step 7). Payments only on the website (Stripe, step 6).

## Commands

| | |
|---|---|
| `npm install` | install |
| `npm run dev` | local dev server |
| `npm run build` | static build into `dist/` |
| `npm test` | unit tests (translations, data mapping, URLs) |
| `npm run typecheck` | TypeScript |
| `npm run db:test` | applies all migrations + data on a throwaway local Postgres and runs the RLS tests |
| `npm run db:bundle` | regenerates `supabase/setup.sql` (all migrations + data, for the Supabase SQL editor) |
| `npm run import` | upserts `data/dalilak-data.json` into `DATABASE_URL` (idempotent); `-- --sql out.sql` writes SQL instead |

## Setup

1. `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. New Supabase project → SQL Editor → paste `supabase/setup.sql` → Run.
3. Sign up / add your user, then in the SQL editor: `select public.bootstrap_admin('you@example.com');`

Arabic step-by-step guide: [`docs/SUPABASE_SETUP_AR.md`](docs/SUPABASE_SETUP_AR.md).

## Database

Migrations in `supabase/migrations/` (in order): schema → RLS & grants → functions → storage → lookup data.
Rules that matter:

- Every table has RLS. Visitors read active listings only. Users write only their own rows.
- Owners never update `listings` directly: edits go to `listing_edits`, photos to `listing_photos`, both approved by the admin.
- Admin actions are `admin_*()` functions that check `is_admin()`.
- Free listing: name, category, address, phone, Google rating. Premium adds logo, up to 8 photos, description, offer line, website, verified badge, stats. When premium ends the listing stays; only the extras disappear.
- "الأعلى تقييماً" (`top_rated`) is rating only; "خياراتنا المفضلة" (`featured_listings`) is premium only, shuffled for equal exposure; search boosts premium inside its category/province and the UI always labels it.

## Deploy (Cloudflare Pages, free)

- Build command `npm run build`, output directory `dist`, Node 22 (`.node-version`).
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_SITE_URL`.
- The build reads all active listings from Supabase and pre-renders `/l/<slug>` in 4 languages, plus `sitemap.xml`.
  New or changed listings appear on the site immediately (loaded in the browser); their static page for Google
  comes with the next build (deploy hook – step 5).
- `dist/404.html` is an empty app shell: pages without a static file still work in the browser.

In this cloud container Node's `fetch` needs `NODE_USE_ENV_PROXY=1 npm run build` (proxy); Cloudflare does not.

## Admin panel (`/admin`)

Log in with the admin account (email + password created in Supabase → Authentication → Users, then
`select public.bootstrap_admin('email')`). From there: add/edit shops, upload logo (1) and photos (max 8, resized in
the browser), Featured on/off with optional end date, hide/show. Needs migration `20261126000006_admin_tools.sql`.
A new shop is live at once; its pre-rendered page for Google comes with the next Netlify deploy.

## Buy & Sell (`/market`)

Ads are managed in `/admin/ads` (needs migration `20261126000007_marketplace.sql`): title, section, city, price
(empty = on request), description, up to 8 photos (first = cover), status active/sold/hidden, and private fields
(commission, seller name/phone, notes) stored in `ads_private`, readable by the admin only.
