# تجهيز Supabase لدليلك (مجاني)

## 1. فتح الحساب والمشروع
1. ادخل على **supabase.com** واضغط **Start your project**، وسجّل دخول بحساب GitHub أو بالإيميل.
2. اضغط **New project**:
   - **Name:** `dalilak`
   - **Database Password:** اضغط *Generate a password* واحفظها عندك (مثلاً في مدير كلمات السر). **لا تبعثها لحدا، ولا إلي.**
   - **Region:** `Central EU (Frankfurt)` (الأقرب لبلجيكا).
   - **Plan:** Free.
3. اضغط **Create new project** واستنى دقيقتين لحد ما يجهز.

## 2. إنشاء قاعدة البيانات (لصقة وحدة)
1. من القائمة الجانبية افتح **SQL Editor** ثم **New query**.
2. افتح الملف `supabase/setup.sql` من المستودع، انسخ كل محتواه، والصقه.
3. اضغط **Run**. لازم يطلع *Success*.
4. افتح **Table Editor** ← جدول `listings`: لازم تشوف كل المحلات.

> شغّل `setup.sql` **مرة وحدة بس** على مشروع جديد. لتحديث البيانات لاحقاً منستعمل ملف الاستيراد لحاله (آمن تكراره).

## 3. خلّي حسابك أدمن
1. **Authentication** ← **Users** ← **Add user** ← **Create new user**: إيميلك + كلمة سر، وفعّل *Auto Confirm User*.
2. ارجع لـ **SQL Editor** ← New query، واكتب (بإيميلك):
   ```sql
   select public.bootstrap_admin('إيميلك@example.com');
   ```
   هذا بيخليك أدمن وبيربط مطعم M et Mme Falfoul بحسابك.

## 4. المفاتيح اللي بحتاجها منك
من **Project Settings** ← **API** (أو **API Keys**):
- **Project URL** (بيشبه `https://xxxx.supabase.co`)
- **anon / publishable key**

هدول الاثنين **عامّين** (بيوصلوا لمتصفح كل زائر، والحماية بقواعد RLS)، فعادي تبعثهم.

⛔ **لا تبعث أبداً:** `service_role` / `secret key`، ولا كلمة سر قاعدة البيانات.
