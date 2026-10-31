// يعدّل مشروع أندرويد بعد "cap add android": صلاحيات المايك والإشعارات + ملء الشاشة كاملة (حتى منطقة الكاميرا)
const fs = require('fs');
const path = require('path');

// 1) AndroidManifest: الصلاحيات
const mp = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(mp, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK'
];
let add = '';
perms.forEach(function (n) {
  if (x.indexOf('"' + n + '"') === -1) add += '    <uses-permission android:name="' + n + '" />\n';
});
if (x.indexOf('android.hardware.microphone') === -1)
  add += '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n';
x = x.replace('</manifest>', add + '</manifest>');

// أيقونات التطبيق: نقل intent-filter الخاص بالتشغيل إلى activity-alias لكل نسخة أيقونة
// (الثيمات تبدّل بينها عبر إضافة IconSwitcher). الأيقونة الأصلية فقط مفعّلة افتراضيا.
const icons = require('./make-icons.js');
const cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
const launcherRe = /<intent-filter>\s*<action android:name="android.intent.action.MAIN"\s*\/>\s*<category android:name="android.intent.category.LAUNCHER"\s*\/>\s*<\/intent-filter>/;
if (launcherRe.test(x) && x.indexOf('<activity-alias') === -1) {
  x = x.replace(launcherRe, '');
  const aliases = icons.VARIANTS.map(function (v) {
    const b = icons.iconBase(v);
    return '        <activity-alias\n            android:name=".Icon' + cap(v.name) + '"\n            android:targetActivity=".MainActivity"\n            android:enabled="' + (v.name === 'default' ? 'true' : 'false') + '"\n            android:exported="true"\n            android:icon="@mipmap/' + b + '"\n            android:roundIcon="@mipmap/' + b + '_round"\n            android:label="@string/app_name">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity-alias>\n';
  }).join('');
  x = x.replace('</application>', aliases + '    </application>');
  console.log('Icon aliases added:', icons.VARIANTS.map(function (v) { return v.name; }).join(', '));
} else {
  console.log('WARNING: لم يتم العثور على LAUNCHER intent-filter، لن تُضاف أيقونات التبديل (الأيقونة الأساسية تعمل).');
}
fs.writeFileSync(mp, x);

// موارد الأيقونات (من build/icon.png نفس أيقونة ويندوز)
icons.generate('android/app/src/main/res', path.join(__dirname, '..', 'build', 'icon.png'));
console.log('Android icons generated from build/icon.png');

// 2) styles.xml: الرسم تحت منطقة الكاميرا (النوتش) + خلفية بلون المنصة
const sp = 'android/app/src/main/res/values/styles.xml';
if (fs.existsSync(sp)) {
  let s = fs.readFileSync(sp, 'utf8');
  if (s.indexOf('windowLayoutInDisplayCutoutMode') === -1) {
    s = s.replace('<item name="android:background">@null</item>',
      '<item name="android:background">@null</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>\n        <item name="android:windowBackground">@color/ioBg</item>\n        <item name="android:statusBarColor">@android:color/transparent</item>\n        <item name="android:navigationBarColor">@android:color/transparent</item>');
    fs.writeFileSync(sp, s);
  }
}
const cp = 'android/app/src/main/res/values/colors.xml';
if (!fs.existsSync(cp)) fs.writeFileSync(cp, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ioBg">#060913</color>\n</resources>\n');
else {
  let c = fs.readFileSync(cp, 'utf8');
  if (c.indexOf('ioBg') === -1) fs.writeFileSync(cp, c.replace('</resources>', '    <color name="ioBg">#060913</color>\n</resources>'));
}

// 3) MainActivity: إخفاء شريطي النظام (وضع غامر) والرسم حتى حواف الشاشة
const dir = 'android/app/src/main/java/com/ioarena/hub';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'MainActivity.java'), `package com.ioarena.hub;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IconSwitcherPlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    private void hideBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
// توقيع ثابت: نفك keystore/debug.keystore.b64 ونثبّته صراحة في Gradle (بدل الاعتماد على ~/.android)
// حتى لا تتغير بصمة SHA-1 مع كل بناء فينكسر تسجيل Google.
(function () {
  const b64 = path.join(__dirname, '..', 'keystore', 'debug.keystore.b64');
  if (!fs.existsSync(b64)) { console.log('WARNING: keystore/debug.keystore.b64 غير موجود، سيُستخدم توقيع عشوائي وتتغير البصمة كل بناء.'); return; }
  const ks = Buffer.from(fs.readFileSync(b64, 'utf8').replace(/\s+/g, ''), 'base64');
  if (ks.length < 500) { console.log('WARNING: ملف المفتاح تالف أو فارغ (' + ks.length + ' بايت).'); return; }
  fs.writeFileSync(path.join(__dirname, '..', 'keystore', 'debug.keystore'), ks);
  const gp = 'android/app/build.gradle';
  if (!fs.existsSync(gp)) { console.log('WARNING: لم أجد ' + gp); return; }
  let g = fs.readFileSync(gp, 'utf8');
  if (g.indexOf('io-arena fixed signing') === -1) {
    g += "\n// io-arena fixed signing\nandroid {\n    signingConfigs {\n        debug {\n            storeFile file('../../keystore/debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n        }\n    }\n}\n";
    fs.writeFileSync(gp, g);
  }
  console.log('Fixed debug signing key configured (' + ks.length + ' bytes).');
})();

const names = icons.VARIANTS.map(function (v) { return '"' + v.name + '"'; }).join(', ');
fs.writeFileSync(path.join(dir, 'IconSwitcherPlugin.java'), `package com.ioarena.hub;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IconSwitcher")
public class IconSwitcherPlugin extends Plugin {
    private static final String[] NAMES = { ${names} };

    private static String cls(String n) {
        return "com.ioarena.hub.Icon" + Character.toUpperCase(n.charAt(0)) + n.substring(1);
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String name = call.getString("name", "default");
        boolean ok = false;
        for (String n : NAMES) if (n.equals(name)) ok = true;
        if (!ok) { call.reject("unknown icon: " + name); return; }
        try {
            PackageManager pm = getContext().getPackageManager();
            String pkg = getContext().getPackageName();
            // نفعّل الجديدة أولا ثم نعطّل الباقي حتى لا يختفي التطبيق من الشاشة
            pm.setComponentEnabledSetting(new ComponentName(pkg, cls(name)), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (String n : NAMES) {
                if (n.equals(name)) continue;
                pm.setComponentEnabledSetting(new ComponentName(pkg, cls(n)), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
            JSObject r = new JSObject();
            r.put("name", name);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("icon switch failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getIcon(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        String pkg = getContext().getPackageName();
        String cur = "default";
        for (String n : NAMES) {
            try {
                int s = pm.getComponentEnabledSetting(new ComponentName(pkg, cls(n)));
                if (s == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) { cur = n; break; }
            } catch (Exception e) { }
        }
        JSObject r = new JSObject();
        r.put("name", cur);
        call.resolve(r);
    }
}
`);
console.log('Android project patched.');
