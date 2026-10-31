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
