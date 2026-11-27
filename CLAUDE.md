# Dalilak – notes for Claude

- Owner: Yousef. Reply to him in short Arabic; code, comments and commits in English.
- Spec: `docs/PLAN.md` (+ the original CLAUDE_CODE_SPEC). Follow the order of work there.
- Never commit keys. Never spend money or open paid services without asking Yousef.
- Supabase grants ALL on new public tables to anon/authenticated by default: every new migration must
  enable RLS, revoke, and grant only what is needed (see `20261126000002_rls.sql`), and add tests to
  `supabase/tests/`. Run `npm run db:bundle && npm run db:test` after changing SQL.
- New functions in `public` are executable by PUBLIC by default: revoke and grant explicitly.
- Language comes from the URL (`/`, `/fr`, `/nl`, `/en`) via `LangContext`; use `useT()`, not global i18n state,
  so pre-rendering never mixes languages. Every new string goes in all four locale files (a test checks).
- The Android app must never show a purchase button or payment link (`isNativeApp()`).
- Paid placement is always labelled "مميّز / Featured" (EU law).
- Free listing shows only: name, category, address, phone, Google rating, directions.
  Premium only: website link, logo, gallery (max 8), description, offer line, verified badge, stats (decision by Yousef).
- Current business model (decision by Yousef): no shop-owner login, no Stripe, no domain/emails for now.
  Shops pay Yousef directly; he adds/edits shops, uploads logo/photos and toggles Featured in /admin.
  Visitor accounts are behind `flags.userAccounts` (VITE_USER_ACCOUNTS, off).
- Buy & Sell (`/market`, migration 0007): ads are created only by the admin (`/admin/ads`). Buyers contact Yousef on
  WhatsApp (never the seller). Seller details and commission live in `ads_private` (admin-only RLS) – never select
  them in public code. No payments in the app.
- Banner ads (migration 0008): `banners` are public only while visible, with an image, and today (Brussels) is
  between `starts_on` and `ends_on` (RLS does this). Advertiser/price/notes live in `banners_private` (admin-only).
  Every banner is labelled "إعلان" and links use rel="sponsored".
- Android: never commit the upload key or its passwords (kept outside the repo, `DALILAK_SIGNING`). Raise
  `versionCode` for every Play upload. The app build (`CAP_BUILD=1`) must not register a service worker.
- Subscriptions (migration 0010): billing/logs are admin-only; reminders go through `claim_reminder` (never twice).
  Secrets for the Netlify functions (`SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_APP_PASSWORD`, `REMINDER_REPLY_TO`) live only
  in the Netlify UI. Statistics must never block or break a page (`track()` swallows errors).
