# IO ARENA كتطبيق أندرويد (APK)

المنصة (www/index.html) تعمل داخل WebView عبر Capacitor، والمايك والصوت المكاني يعملان بإذن أندرويد.

## الطريقة 1: بدون Android Studio (GitHub)
1. أنشئ مستودعا جديدا على GitHub وارفع محتويات هذا المجلد كلها (بما فيها المجلد المخفي .github).
2. افتح تبويب Actions ثم "Build Android APK" ثم Run workflow.
3. بعد دقائق نزّل الملف io-arena-apk من Artifacts (داخله app-debug.apk) وثبّته على جوالك.
   (فعّل "التثبيت من مصادر غير معروفة" للمتصفح أو مدير الملفات.)

## الطريقة 2: على جهازك
المتطلبات: Node 20 وJDK 17 وAndroid Studio (أو Android SDK).
```
npm install
npm run android:add
npm run android:open     # يفتح Android Studio ثم Build > Build APK
# أو من الطرفية:
npm run android:apk      # الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

## تحديث المنصة لاحقا
استبدل www/index.html بالنسخة الجديدة ثم ارفعها (الطريقة 1) أو نفّذ `npm run android:sync` وأعد البناء (الطريقة 2).

## المايك
- أول مرة تفعّل المايك داخل لعبة، يطلب أندرويد الإذن. إن رفضته: الإعدادات > التطبيقات > IO ARENA > الأذونات > الميكروفون.
- الصوت المكاني والكتم وضغط للتحدث تعمل كما في المتصفح.

## الإشعارات
- تعمل عبر LocalNotifications عندما يكون التطبيق مفتوحا في الخلفية (بدون خادم دفع).
- إذا أغلقت التطبيق تماما أو أوقفه أندرويد لتوفير البطارية فلن تصل. اسمح للتطبيق بتجاهل تحسين البطارية لنتيجة أفضل.

## ملاحظات
- الناتج APK للتجربة (debug) وهو موقّع تلقائيا ويثبّت مباشرة. للنشر على Google Play تحتاج توقيع release وملف AAB.
- الأيقونة الافتراضية هي أيقونة Capacitor. لتغييرها ضع صورتك في android/app/src/main/res/mipmap-* بعد التوليد.

---

# IO ARENA كتطبيق ويندوز (EXE)

نفس المنصة (www/index.html) داخل نافذة Electron، والمايك والإشعارات تعمل كما في المتصفح.

## الطريقة 1: بدون تثبيت أي شيء (GitHub)
1. ارفع المشروع كاملا إلى مستودع GitHub (بما فيه المجلد المخفي .github).
2. تبويب Actions ثم "Build Windows EXE" ثم Run workflow.
3. بعد دقائق نزّل io-arena-windows من Artifacts. بداخله ملفان:
   - `IO-ARENA-Setup-1.0.0.exe` مثبّت عادي (اختصار على سطح المكتب وقائمة ابدأ).
   - `IO-ARENA-Portable-1.0.0.exe` نسخة محمولة تعمل بنقرتين بلا تثبيت.

## الطريقة 2: على جهاز ويندوز
المتطلبات: Node 20 فقط.
```
npm install
npm run win:start    # تجربة سريعة بدون بناء
npm run win:build    # الناتج في مجلد dist/
```

## ملاحظات
- F11 ملء الشاشة، Esc للخروج منه، Ctrl+R إعادة تحميل.
- يقدّم التطبيق الملفات من خادم محلي على المنفذ 47615 (يجرّب ما بعده إن كان مشغولا) ليبقى الأصل ثابتا وتبقى بياناتك محفوظة.
- ويندوز قد يعرض تحذير SmartScreen لأن الملف غير موقّع رقميا: اضغط "مزيد من المعلومات" ثم "تشغيل على أي حال".
- تسجيل الدخول بـ Google: أضف `http://localhost:47615` إلى "Authorized JavaScript origins" في Client ID الخاص بك، وإلا سيرفضه Google.
- الأيقونة في build/icon.png، استبدلها بصورتك (512×512 PNG).

---

# نظام التحديثات

## كيف يعمل
التطبيقان (APK وEXE) صارا يفتحان **الموقع المنشور على GitHub Pages** مباشرة، فأي تعديل على `www/index.html` يصل لكل المستخدمين عند فتح التطبيق، **بدون تنزيل APK أو EXE من جديد**. المتصفح يحفظ نسخة للعمل بدون إنترنت.
أما تحديث التطبيق نفسه (أمر نادر: تغيير صلاحيات، أيقونة، إصدار Electron) فيتحكم به الملف `www/update.json`.

## إعداد لمرة واحدة
1. المستودع يجب أن يكون **Public** (Pages المجانية تتطلب ذلك).
2. Settings ← Pages ← Source: **GitHub Actions**.
3. احذف ملفي `.github/workflows/android.yml` و`windows.yml` القديمين إن كانا موجودين (حلّ محلهما `release.yml`).
4. Actions ← **Build Release (APK + EXE)** ← Run workflow. ينتج Release فيه `IO-ARENA.apk` و`IO-ARENA-Setup.exe` و`IO-ARENA-Portable.exe`.
5. مهم للأندرويد: النسخة الجديدة موقّعة بمفتاح ثابت (`keystore/debug.keystore.b64`)، فإن كان عندك APK قديم **احذفه مرة واحدة** ثم ثبّت الجديد. بعدها كل التحديثات تُثبّت فوق القديم بدون حذف.

## تحديث المنصة (الأكثر استخداما)
عدّل `www/index.html` على GitHub (أيقونة القلم) ثم Commit. خلال دقيقة يعمل workflow **Deploy Web** وتصل النسخة الجديدة للجميع.

## تحديث التطبيق نفسه (اختياري أو إجباري)
1. ارفع `version` في `package.json` (مثلا 1.1.0).
2. شغّل **Build Release** مرة أخرى.
3. عدّل `www/update.json`:
```json
{
  "android": { "latest": "1.1.0", "min": "1.0.0", "url": "", "notes": ["إضافة ميزة كذا"] },
  "windows": { "latest": "1.1.0", "min": "1.0.0", "url": "", "notes": ["إضافة ميزة كذا"] }
}
```
- `latest` أحدث إصدار. من إصداره أقل منه يظهر له **تحديث اختياري** (زر "تحديث الآن" وزر "لاحقا").
- `min` أقل إصدار مسموح. من إصداره أقل منه يظهر له **تحديث إجباري** بدون زر إغلاق ولا يستطيع استخدام التطبيق حتى يحدّث.
- `url` اتركه فارغا ليُملأ تلقائيا برابط آخر Release.
- `notes` سطور تظهر في نافذة التحديث.

## ملاحظات
- أول تشغيل يحتاج إنترنت. بعدها يعمل الموقع من الذاكرة المؤقتة عند انقطاع الاتصال.
- في أندرويد، زر "تحديث الآن" يفتح الرابط في المتصفح، ثم تضغط الملف المحمّل وتثبّته (أندرويد لا يسمح بالتثبيت الصامت).
- في ويندوز، شغّل `IO-ARENA-Setup.exe` الجديد وسيحل محل القديم.
- لتجربة محلية بدون GitHub شغّل `npm run remote:config -- OWNER/REPO` لتوليد الإعدادات.

---

# تسجيل الدخول بـ Google

## ما الذي تغيّر
- لا حاجة للصق Client ID على كل جهاز: يُقرأ من `www/config.json` المستضاف، وتعديله يصل للجميع فورا.
- **أندرويد:** تسجيل دخول أصلي من النظام (نافذة حسابات Google) لأن Google تحجب النافذة المنبثقة داخل WebView.
- **ويندوز والمتصفح:** نافذة Google المنبثقة، مع تذكّر الحساب وبدون إعادة موافقة بعد أول مرة.
- في أندرويد تُجدَّد الجلسة بصمت عند فتح التطبيق، فيعمل الرفع التلقائي إلى Drive مباشرة.

## الإعداد (مرة واحدة) من console.cloud.google.com
1. أنشئ مشروعا، ثم APIs & Services ← Library ← فعّل **Google Drive API**.
2. OAuth consent screen: اختر External، واملأ اسم التطبيق وبريدك، وأضف النطاق `.../auth/drive.appdata`، وأضف بريدك في **Test users** (أو اضغط Publish app ليدخل أي شخص).
3. Credentials ← Create credentials ← OAuth client ID ← **Web application**:
   - Authorized JavaScript origins: `https://ketogames113.github.io`
   - انسخ الـ Client ID الناتج.
4. Credentials ← Create OAuth client ID ← **Android**:
   - Package name: `com.ioarena.hub`
   - SHA-1: `33:EE:83:EF:D0:F6:98:B7:A4:CC:38:6C:CF:DE:77:5C:CF:E7:B8:74`
5. ضع الـ Client ID (من الخطوة 3) في `www/config.json`:
```json
{ "googleClientId": "xxxx.apps.googleusercontent.com" }
```
6. شغّل **Deploy Web** ثم **Build Release** (الأخير لازم مرة واحدة لأن إعداد أندرويد يُحفظ داخل التطبيق).

ملاحظة: تطبيق Google في وضع Testing تنتهي موافقة المستخدمين فيه بعد 7 أيام تقريبا، ويحتاجون تسجيل الدخول من جديد. اضغط Publish app لتفادي ذلك.

## تسجيل الدخول بـ Google
- **المتصفح / PWA / الصفحة المنشورة**: تسجيل في نفس الصفحة بالتحويل (redirect) ويعود الرمز في الـ Hash (`#access_token=...`) ثم يُمسح من الرابط فورا.
  في Google Console > Credentials > عميل Web: أضف في **Authorized redirect URIs** عنوان الصفحة بالضبط (مثال: `https://OWNER.github.io/REPO/`).
- **تطبيق أندرويد**: Google تمنع تسجيل الدخول داخل WebView (خطأ `disallowed_useragent`)، لذلك يستخدم التطبيق نافذة Google الأصلية. تحتاج عميل **Android** في نفس المشروع:
  - Package name: `com.ioarena.hub`
  - SHA-1 (مفتاح keystore/debug.keystore.b64): `33:EE:83:EF:D0:F6:98:B7:A4:CC:38:6C:CF:DE:77:5C:CF:E7:B8:74`
  - إن بقي المشروع في وضع Testing أضف بريدك في Test users.
