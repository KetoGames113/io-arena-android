// يجهّز إعدادات الوضع الأونلاين تلقائيا من اسم المستودع على GitHub:
//  - electron/config.json        <- عنوان الموقع المنشور (لتطبيق ويندوز)
//  - capacitor.config.json       <- server.url + رقم الإصدار (لتطبيق أندرويد)
//  - www/offline.html            <- عنوان إعادة المحاولة
//  - www/update.json             <- روابط التحميل إن كانت فارغة
// في GitHub Actions يقرأ GITHUB_REPOSITORY تلقائيا. محليا: node scripts/prepare.js OWNER/REPO
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };
const wr = function (p, t) { fs.writeFileSync(path.join(root, p), t); };

// تسجيل الدخول بـ Google في أندرويد: ننسخ Client ID من www/config.json إلى إعدادات الإضافة
(function () {
  let id = '';
  try { id = (JSON.parse(rd('www/config.json')).googleClientId || '').trim(); } catch (e) {}
  if (!id) { console.log('prepare: googleClientId فارغ في www/config.json (تسجيل Google الأصلي معطّل)'); return; }
  const c = JSON.parse(rd('capacitor.config.json'));
  c.plugins = Object.assign({}, c.plugins, {
    GoogleAuth: {
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.appdata'],
      serverClientId: id,
      forceCodeForRefreshToken: false
    }
  });
  wr('capacitor.config.json', JSON.stringify(c, null, 2) + '\n');
  console.log('prepare: تم ضبط GoogleAuth في capacitor.config.json');
})();

const repo = process.env.GITHUB_REPOSITORY || process.argv[2] || '';
if (repo.indexOf('/') < 1) {
  console.log('prepare: لا يوجد اسم مستودع، تم التخطي (وضع محلي).');
  process.exit(0);
}
const owner = repo.split('/')[0];
const name = repo.split('/')[1];
const host = owner.toLowerCase() + '.github.io';
const pagesUrl = name.toLowerCase() === host ? 'https://' + host + '/' : 'https://' + host + '/' + name + '/';
const relBase = 'https://github.com/' + owner + '/' + name + '/releases/latest/download/';
const pkg = JSON.parse(rd('package.json'));

// ويندوز
wr('electron/config.json', JSON.stringify({ remoteUrl: pagesUrl }, null, 2) + '\n');

// أندرويد
const cc = JSON.parse(rd('capacitor.config.json'));
cc.server = Object.assign({}, cc.server, { url: pagesUrl, errorPath: 'offline.html' });
cc.android = Object.assign({}, cc.android, { appendUserAgent: 'IOArenaAndroid/' + pkg.version });
wr('capacitor.config.json', JSON.stringify(cc, null, 2) + '\n');

// صفحة عدم الاتصال
wr('www/offline.html', rd('www/offline.html').replace(/var R='[^']*'/, "var R='" + pagesUrl + "'"));

// روابط التحميل الافتراضية
const up = JSON.parse(rd('www/update.json'));
if (up.android && !up.android.url) up.android.url = relBase + 'IO-ARENA.apk';
if (up.windows && !up.windows.url) up.windows.url = relBase + 'IO-ARENA-Setup.exe';
wr('www/update.json', JSON.stringify(up, null, 2) + '\n');

console.log('prepare OK ->', pagesUrl, '| shell version', pkg.version);
