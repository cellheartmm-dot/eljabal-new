# 🏢 نظام الجبل الذهبي للمقاولات (Eljabal Construction System)

نظام إدارة شامل للمقاولات، المشاريع، المصروفات، المقبوضات، عمال الموقع، والمهندسين.

---

## ⚡ معمارية النظام (System Architecture)

- **الواجهة الرئيسية والاقتراضية**: React + Vite (SPA)
- **المجلد الافتراضي**: `frontend/`
- **الاتصال بقاعدة البيانات**: اتصال مباشر بسحابة **Supabase** من طرف العميل (Client-Side) باستخدام:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `@supabase/supabase-js`

*(تم الاستغناء كلياً عن سيرفر Next.js وخلفية Prisma API).*

---

## 🚀 تشغيل النظام (Running the App)

عند تشغيل الأوامر التالية من الفولدر الرئيسي للمشروع، يتم توجيه الأوامر تلقائياً لمجلد `frontend`:

```bash
# تشغيل خادم التطوير (Vite Dev Server)
npm run dev

# بناء النسخة النهائية للإنتاج (Production Build)
npm run build

# معاينة البناء النهائي (Preview Build)
npm run preview
```

---

## 📁 هيكل مجلدات النظام (`frontend/src`)

- `src/pages/`: جميع صفحات النظام الـ 25+ (المشاريع، المصروفات، الإيرادات، العمال، المشرفون، مقاولو الباطن، المعدات، التقارير)
- `src/lib/supabase.ts`: العميل الرسمي للاتصال المباشر بـ Supabase
- `src/components/`: المكونات التفاعلية، الجداول، النماذج، والتنبيهات (`Toast`)
