# دليلك – الخطة (الخطوة 1، بانتظار موافقة يوسف)

> هذا الملف خطة فقط. لم يُبنَ أي شيء بعد، ولم تُفتح أي خدمة.

## 1. ملخص البيانات (`dalilak-data.json`)

| | العدد |
|---|---|
| المجموع | **265** محل (وليس 266) |
| بروكسل / أنتويرب / لييج / برابانت الفلمنكية | 125 / 74 / 65 / 1 (Grimbergen، تُقبل وتُعرض) |
| `v: 1` (العربية غير مؤكدة) | 62 |
| بدون هاتف / بدون موقع / بدون تقييم | 49 / 111 / 9 |
| أنواع (`t`) مختلفة | 23 (مسجد، ملحمة، محامي، …) – تحتاج ترجمة fr/nl/en لصفحات SEO |
| إحداثيات lat/lng | **غير موجودة** – الاتجاهات تعمل بالعنوان؛ الإحداثيات اختيارية لاحقاً (Nominatim مجاني) |

الأصناف `c` تطابق تماماً: food, meat, sweets, legal, doc, cloth, beauty, travel, edu.

## 2. اختيار التقنية

- **Vite + React + TypeScript + React Router** (كما في المواصفات).
- **SEO**: `vite-react-ssg` يولّد HTML جاهز لكل صفحة محل × 4 لغات (~1060 صفحة) مع title/description و schema.org `LocalBusiness` و hreflang و sitemap.
  المحل الجديد يظهر فوراً في الموقع (من Supabase مباشرة)، وصفحته الثابتة لـ Google تُبنى تلقائياً عند موافقة الأدمن (deploy hook مجاني) + بناء ليلي.
  لماذا ليس Next.js؟ Capacitor يحتاج ملفات ثابتة، و Vite أبسط وأرخص ويحقق نفس SEO لعدد محلات بهذا الحجم.
- **الاستضافة**: Cloudflare Pages (مجاني، يسمح بالاستخدام التجاري). ⚠️ Vercel المجاني يمنع الاستخدام التجاري، وعندنا اشتراكات.
- **PWA**: `vite-plugin-pwa` + تلميح تثبيت لآيفون/سفاري.
- **Android**: Capacitor بنفس الكود؛ ميزات أصلية: إشعارات (Firebase، مجاني)، مشاركة، اتصال، فتح الخرائط.
  في التطبيق: لا زر شراء ولا رابط دفع، فقط "مميّز حتى <تاريخ>".
- **i18n**: i18next، العربية افتراضية RTL، الروابط: `/` عربي، `/fr/…`، `/nl/…`، `/en/…`.
- **Supabase**: Postgres + Auth + RLS + Storage + Edge Functions + pg_cron (كلها ضمن المجاني).

## 3. هيكل الملفات

```
dalilak/
├─ package.json · vite.config.ts · tsconfig.json · index.html
├─ .env.example                  ← أسماء المفاتيح فقط، بدون قيم
├─ capacitor.config.ts
├─ android/                      ← يُنشأ في الخطوة 7
├─ public/                       ← أيقونات، robots.txt، manifest
├─ data/dalilak-data.json
├─ scripts/
│  ├─ import-data.ts             ← npm run import (idempotent)
│  ├─ type-labels.ts             ← ترجمة الـ 23 نوع إلى fr/nl/en
│  └─ sitemap.ts
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 0001_schema.sql         ← الجداول والأنواع
│  │  ├─ 0002_rls.sql            ← سياسات الأمان
│  │  ├─ 0003_functions.sql      ← البحث، الأعلى تقييماً، التدوير، الإحصاءات
│  │  └─ 0004_seed.sql           ← الأصناف والمحافظات بأربع لغات
│  └─ functions/                 ← Edge Functions
│     ├─ notify-admin/           ← إيميل لكل بلاغ/طلب ملكية/محل جديد
│     ├─ stripe-checkout/  stripe-portal/  stripe-webhook/
│     ├─ account-export/   account-delete/   ← GDPR
│     └─ send-push/
├─ src/
│  ├─ main.tsx · App.tsx · routes.tsx
│  ├─ i18n/  (index.ts, locales/ar.json fr.json nl.json en.json)
│  ├─ theme/ (tokens.css: #0b5d5b، #e49b2d، Cairo/Tajawal، فاتح/داكن)
│  ├─ lib/
│  │  ├─ supabase.ts · flags.ts (SMS_ENABLED, GOOGLE_LOGIN…)
│  │  ├─ platform.ts            ← isNativeApp ⇒ إخفاء الدفع
│  │  ├─ native.ts              ← اتصال، خرائط، مشاركة، إشعارات
│  │  └─ seo.tsx                ← meta + JSON-LD + hreflang
│  ├─ hooks/ (useAuth, useListings, useFavorites, useTrack…)
│  ├─ components/
│  │  ├─ ListingCard · FeaturedCarousel · FeaturedBadge ("مميّز")
│  │  ├─ CategoryChips · ProvinceFilter · SearchBox · Stars
│  │  ├─ VerifyArabicTag ("اتصل وتأكد من العربية") · SourceNote ("معلومات من خرائط جوجل…")
│  │  ├─ ReportDialog · LoginGate · InstallHint · BottomNav
│  ├─ pages/
│  │  ├─ Home · TopRated · OurPicks · Listing · Saved · Login
│  │  ├─ AddBusiness · Contact · Settings · Privacy · Terms
│  │  ├─ QrCard (/qr/:slug) · ShortLink (/s/:code)
│  │  ├─ owner/ (MyListings, EditListing, Upgrade ← ويب فقط)
│  │  └─ admin/ (Pending, Claims, Reports, Reviews, Stats)
│  └─ types/database.ts         ← مولّد من Supabase
└─ tests/ (vitest للمنطق والـ RLS، Playwright للشاشات)
```

### الروابط
`/` الرئيسية · `/top` الأعلى تقييماً · `/picks` خياراتنا المفضلة · `/l/:slug` صفحة المحل ·
`/c/:category` و `/c/:category/:province` (صفحات SEO) · `/saved` · `/login` · `/add` · `/contact` ·
`/settings` · `/privacy` · `/terms` · `/owner/*` · `/owner/upgrade` (ويب فقط) · `/admin/*` · `/qr/:slug` · `/s/:code`.
كلها بنفس الشكل تحت `/fr` و `/nl` و `/en`.

## 4. قاعدة البيانات (SQL)

### 0001_schema.sql
```sql
create extension if not exists pg_trgm;
create extension if not exists unaccent;
-- unaccent() ليست immutable، فنلفّها لاستخدامها في عمود محسوب وفهرس
create function unaccent_immutable(text) returns text language sql immutable parallel safe
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

create type listing_status as enum ('active','pending','hidden');
create type listing_source as enum ('google_maps','owner','admin');
create type user_role      as enum ('user','owner','admin');
create type review_status  as enum ('visible','hidden');
create type reporter_role  as enum ('user','owner','visitor');
create type report_kind    as enum ('wrong_info','closed','abusive_review','other','owner_complaint');
create type report_status  as enum ('new','in_progress','resolved');
create type request_status as enum ('pending','approved','rejected');   -- claims, edits, photos
create type sub_store      as enum ('stripe','google_play');
create type sub_status     as enum ('trialing','active','past_due','canceled','expired');
create type event_kind     as enum ('view','call','directions','website','share');

create table categories (
  slug text primary key,
  name_ar text not null, name_fr text not null, name_nl text not null, name_en text not null,
  icon text,
  sort_order int not null default 0,
  requires_languages boolean not null default false   -- doc / legal / المترجمون
);

create table provinces (
  slug text primary key,                 -- brussels, antwerp, liege, flemish-brabant …
  name_ar text not null, name_fr text not null, name_nl text not null, name_en text not null,
  is_launch boolean not null default false,
  sort_order int not null default 0
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role user_role not null default 'user',
  preferred_lang text not null default 'ar' check (preferred_lang in ('ar','fr','nl','en')),
  created_at timestamptz not null default now()
);

create table listings (
  id bigint generated by default as identity primary key,   -- نحافظ على id 1..265 من الملف
  slug text not null unique,
  name text not null,
  category text not null references categories,
  type_label text,                       -- "مطعم سوري" … (عربي من البيانات)
  province text not null references provinces,
  city text, address text, phone text, website text,
  rating_google numeric(2,1) check (rating_google between 0 and 5),
  reviews_google int not null default 0,
  lat double precision, lng double precision,
  languages text[] not null default '{}',                    -- {'ar','fr','nl','en',…}
  language_verified boolean not null default true,
  status listing_status not null default 'pending',
  is_premium boolean not null default false,
  premium_until timestamptz,                                 -- null + is_premium = بلا انتهاء (يمنحه الأدمن)
  is_verified boolean not null default false,                -- شارة "موثّق" (بريميوم)
  description jsonb not null default '{}',                   -- {"ar": "...", "fr": "..."}
  offer_text jsonb not null default '{}',                    -- سطر العرض الخاص
  owner_id uuid references auth.users on delete set null,
  source listing_source not null,
  app_rating_avg numeric(3,2),                               -- يُحدَّث بـ trigger من reviews
  app_reviews_count int not null default 0,
  search_doc text generated always as
    (lower(unaccent_immutable(coalesce(name,'')||' '||coalesce(city,'')||' '||coalesce(type_label,'')))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on listings (status, category, province);
create index on listings using gin (search_doc gin_trgm_ops);
create index on listings (is_premium, premium_until);

create table listing_photos (
  id bigint generated always as identity primary key,
  listing_id bigint not null references listings on delete cascade,
  storage_path text not null,            -- bucket listing-photos/<listing_id>/<file>
  sort_order int not null default 0,
  status request_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- تعديلات المالك لا تُطبَّق مباشرة: تنتظر موافقة الأدمن
create table listing_edits (
  id bigint generated always as identity primary key,
  listing_id bigint not null references listings on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  changes jsonb not null,                -- الحقول المسموحة فقط (phone, website, description …)
  status request_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table favorites (
  user_id uuid not null references auth.users on delete cascade,
  listing_id bigint not null references listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table reviews (
  id bigint generated always as identity primary key,
  listing_id bigint not null references listings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  text text check (char_length(text) <= 2000),
  status review_status not null default 'visible',
  owner_reply text check (char_length(owner_reply) <= 1000),   -- رد واحد فقط من المالك
  owner_replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create table reports (
  id bigint generated always as identity primary key,
  listing_id bigint references listings on delete set null,
  review_id bigint references reviews on delete set null,
  reporter_id uuid references auth.users on delete set null,
  reporter_role reporter_role not null,
  kind report_kind not null,
  message text not null check (char_length(message) between 3 and 3000),
  contact_email text,
  status report_status not null default 'new',
  admin_note text,
  created_at timestamptz not null default now()
);

create table claims (
  id bigint generated always as identity primary key,
  listing_id bigint not null references listings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  proof_note text,
  status request_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index on claims (listing_id, user_id) where status = 'pending';

create table subscriptions (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users on delete cascade,
  listing_id bigint not null references listings on delete cascade,
  plan text not null default 'premium_monthly',
  status sub_status not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  store sub_store not null default 'stripe',
  store_purchase_token text,             -- لـ Google Play لاحقاً
  stripe_customer_id text,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- إحصاءات بدون بيانات شخصية (لا كوكيز، لا IP)
create table listing_events (
  id bigint generated always as identity primary key,
  listing_id bigint not null references listings on delete cascade,
  kind event_kind not null,
  created_at timestamptz not null default now()
);
create index on listing_events (listing_id, kind, created_at);

create table search_log (
  id bigint generated always as identity primary key,
  query text, category text, province text, results int,
  created_at timestamptz not null default now()
);

create table push_tokens (
  user_id uuid not null references auth.users on delete cascade,
  token text not null,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table short_links (
  code text primary key,                 -- dalilak.be/s/falfoul
  listing_id bigint not null references listings on delete cascade
);
```

### 0002_rls.sql (الملخص)
```sql
create function is_admin() returns boolean language sql stable security definer
  set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

alter table <كل جدول> enable row level security;
```

| الجدول | قراءة | كتابة |
|---|---|---|
| categories, provinces | الجميع | أدمن |
| listings | الجميع: `status='active'`؛ المالك: محلاته؛ أدمن: الكل | إضافة عبر دالة `submit_listing()` (تفرض pending و is_premium=false)؛ المالك **لا يعدّل مباشرة** بل عبر listing_edits؛ أدمن: الكل |
| listing_edits, listing_photos | المالك: ما يخصه؛ الصور المعتمدة للجميع | المالك يضيف لمحل يملكه؛ أدمن يقرر |
| profiles | المستخدم: نفسه؛ أدمن | المستخدم يعدّل اسمه ولغته فقط (trigger يمنع تغيير role) |
| favorites | صاحبها | صاحبها |
| reviews | الجميع: `visible`؛ الكاتب: مراجعته | المستخدم المسجّل: مراجعة واحدة لنفسه؛ رد المالك عبر `reply_to_review()` مرة واحدة؛ أدمن يخفي |
| reports | المُبلِّغ: بلاغاته؛ أدمن | **أي أحد** يضيف (حتى الزائر) مع `status='new'` و `reporter_id = auth.uid() أو null`؛ أدمن يغيّر الحالة |
| claims | صاحب الطلب؛ أدمن | المستخدم يطلب؛ الموافقة عبر `approve_claim()` (تعيّن owner_id وتجعل الدور owner) |
| subscriptions | المالك: اشتراكاته؛ أدمن | **فقط** Stripe webhook (service role) |
| listing_events, search_log | أدمن؛ المالك يرى إحصاءات محلاته عبر دالة | الجميع عبر `track_event()` و `log_search()` |
| push_tokens, short_links | صاحبها / الجميع | صاحبها / أدمن |

Storage: bucket `listing-photos` قراءة عامة، الكتابة للمالك داخل مجلد محله فقط.

### 0003_functions.sql (الأهم)
- `search_listings(q, category, province, lang)` – بحث بالاسم/المدينة/النوع + أسماء الأصناف بأربع لغات. البريميوم النشط يظهر أولاً **داخل نفس الصنف/المحافظة** ومعلَّم "مميّز"، ثم الترتيب بتقييم جوجل وعدد المراجعات.
- `top_rated(category, province)` – ترتيب حسب التقييم فقط، **بدون أي أثر للدفع**:
  متوسط بايزي يجمع تقييم جوجل + تقييمات التطبيق:
  `(r_g·n_g + r_app·n_app + C·m) / (n_g + n_app + m)` حيث C = المتوسط العام و m = 20 (حتى لا يتصدر محل عنده مراجعة واحدة 5 نجوم).
- `featured_listings(category, province, seed)` – البريميوم النشط فقط، بترتيب عشوائي متغيّر (`md5(id || seed)`)، والـ seed يتغيّر كل ساعة/زيارة → فرصة ظهور متساوية.
- `premium_active(l)` = `is_premium and (premium_until is null or premium_until > now())`.
- pg_cron يومياً: `expire_premium()` يطفئ البريميوم المنتهي.
- trigger على reviews يحدّث `app_rating_avg` و `app_reviews_count`.
- `owner_stats(listing_id)` – زيارات/اتصالات/اتجاهات لكل محل (للبريميوم).
- `submit_listing()`, `approve_listing()`, `approve_claim()`, `approve_edit()`, `reply_to_review()`, `hide_review()`, `hide_listing()`.

### 0004_seed.sql
الأصناف التسعة بأربع لغات (edu = مساجد وجمعيات)، `requires_languages = true` لـ doc و legal.
المحافظات: brussels, antwerp, liege (is_launch) + flemish-brabant وباقي المحافظات البلجيكية.

## 5. سكربت الاستيراد (`npm run import`)
- `upsert` على `id` (1..265) → تشغيله مرتين لا يكرر شيئاً، ثم ضبط الـ sequence.
- لا يكتب فوق محل صار له مالك أو عدّله الأدمن (`source='google_maps' and owner_id is null` فقط).
- `n→name`, `c→category`, `t→type_label`, `p→province` (Bruxelles-Capitale→brussels, Anvers→antwerp, Liège→liege, Brabant flamand→flemish-brabant), `a→address`, `ph→phone`, `w→website`, `r→rating_google`, `rv→reviews_google`, `d→description.ar`.
- `v:1` → `language_verified=false`, `languages='{}'` + وسم "اتصل وتأكد من العربية". غيرها → `languages='{ar}'`, `language_verified=true`.
- كل المحلات `status='active'`, `source='google_maps'`، والـ slug من الاسم + المدينة.
- id 1 (M et Mme Falfoul): `is_premium=true`, `premium_until=null`, `is_verified=true`، ويُربط بحسابك (أدمن) بعد تسجيلك.

## 6. المفاتيح والخدمات

| الخدمة | لماذا | التكلفة | متى |
|---|---|---|---|
| Supabase | قاعدة البيانات والحسابات | مجاني | الخطوة 2 |
| Cloudflare Pages | استضافة الموقع | مجاني | الخطوة 3 |
| Resend (أو أي SMTP) | إيميلات الدخول + إيميلات البلاغات للأدمن (إيميل Supabase الافتراضي لا يرسل للعامة) | مجاني حتى 3000/شهر | الخطوة 4 |
| Google OAuth | دخول بجوجل (اختياري) | مجاني | الخطوة 4 |
| Stripe | الاشتراكات (وضع تجريبي أولاً) | فتح الحساب مجاني؛ عمولة على كل دفعة فقط | الخطوة 6 |
| Firebase | إشعارات أندرويد | مجاني | الخطوة 7 |
| **دومين** (مثلاً dalilak.be) | SEO، الإيميل، Stripe | 💶 ~10–15 €/سنة | قبل الإطلاق — بموافقتك |
| **Twilio** (SMS) | الدخول بالهاتف | 💶 مدفوع لكل رسالة | مطفأ حتى توافق |
| **Google Play Console** | نشر التطبيق | 💶 25$ مرة واحدة | الخطوة 7 — بموافقتك |

## 7. ملاحظات على المواصفات
1. عدد المحلات 265 وليس 266.
2. القسم 5 يقول `store = google_play` والقسم 9 يقول `stripe` أو `google_play` → اعتمدت الاثنين، والافتراضي `stripe`.
3. "خياراتنا المفضلة" (البريميوم) و"المفضلة" (حفظ المستخدم) اسمان متشابهان → أقترح تسمية حفظ المستخدم **"محفوظاتي / Saved"**.
4. أضفت جداول غير مذكورة لكنها لازمة لميزات المواصفات: `listing_edits` (موافقة الأدمن على التعديلات)، `listing_photos`، `listing_events` و `search_log` (الإحصاءات)، `push_tokens`، `short_links`، وأعمدة `owner_reply` في reviews.
5. الإحصاءات بدون كوكيز ولا بيانات شخصية → لا نحتاج نافذة موافقة كوكيز طالما لا نستخدم Google Analytics.
6. البلاغات من الزوار بدون حساب قد تجلب سبام → حماية Cloudflare Turnstile (مجانية) على نموذج البلاغ.

## 8. قرارات بعد الموافقة على الخطة
- البناء في مستودع مستقل `Falfoul2026/dalilak`.
- "خياراتنا المفضلة" = المحلات المدفوعة؛ "محفوظاتي" = ما يحفظه المستخدم.
- M et Mme Falfoul: مميّز بلا تاريخ انتهاء، مربوط بحساب يوسف (أدمن).
- إضافة محل تحتاج تسجيل دخول؛ البلاغات مفتوحة للجميع.
- المحل المجاني: اسم، تصنيف، عنوان، تلفون، تقييم جوجل، اتجاهات فقط.
- المحل المشترك فقط: رابط الموقع، لوغو، معرض صور (حتى 8 صور يرفعها بنفسه)، وصف، عرض خاص، شارة موثّق، إحصاءات.
- المحلات غير المشتركة تبقى في القائمة ولا تُحذف أبداً.
- الدفع على الموقع عبر Stripe فقط؛ التطبيق يعرض حالة الاشتراك.
- ملف البيانات: 266 محل (أضيف Smoke House، id 266).

## 9. تغيير الخطة (يوسف)
- لا دخول لأصحاب المحلات، لا Stripe، لا دومين ولا إيميلات حالياً.
- المحلات تتواصل مع يوسف وتدفع له مباشرة؛ يوسف يضيف/يعدّل المحلات ويرفع اللوغو والصور ويفعّل «مميّز» من لوحة الإدارة `/admin`.
- ميزات حسابات الزوار (محفوظاتي، المراجعات، نماذج الإبلاغ والملكية) مخفية خلف `VITE_USER_ACCOUNTS=false`، وبدلها صفحة «أضف محلك» للتواصل.

## 10. بيع وشراء
- الرئيسية فيها خيارين كبار: «ابحث عن أماكن» و«بيع وشراء» (`/market`).
- الأقسام: محلات ومشاريع للبيع، عقارات، سيارات، أثاث وأغراض، أخرى. فلترة بالقسم والمدينة وبحث.
- صفحة الإعلان: صور، وصف، سعر، مدينة، وزر واتساب ليوسف مع رسالة جاهزة فيها رقم الإعلان. المشتري يتواصل مع يوسف وليس البائع.
- `/market/sell`: زر واتساب للبائعين.
- لوحة الإدارة `/admin/ads`: إضافة/تعديل/إخفاء، حتى 8 صور، «مباع»، وعمولة ومعلومات البائع في جدول خاص لا يراه الزوار.

## 11. إعلاناتكم (بانرات مدفوعة)
- منطقة بانرات على الرئيسية (صورة + عنوان + رابط أو واتساب)، تتبدّل كل 6 ثواني، وعلى كل بانر «إعلان».
- صفحة «أعلن معنا» `/advertise` مع زر واتساب ليوسف.
- لوحة الإدارة `/admin/banners`: إضافة/تعديل/إخفاء، صورة، رابط، تاريخ بداية ونهاية (يختفي تلقائياً بعد آخر يوم)، ومعلومات خاصة (المعلن، المبلغ، ملاحظات).
