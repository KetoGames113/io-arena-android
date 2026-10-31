// يضيف صلاحيات المايك والإشعارات إلى AndroidManifest.xml بعد "cap add android"
const fs = require('fs');
const p = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(p, 'utf8');
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
fs.writeFileSync(p, x);
console.log('Manifest patched.');
