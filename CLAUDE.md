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
