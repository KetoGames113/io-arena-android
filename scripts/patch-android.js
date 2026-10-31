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
fs.writeFileSync(mp, x);

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
console.log('Android project patched.');
