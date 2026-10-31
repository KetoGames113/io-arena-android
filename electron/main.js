// IO ARENA — تطبيق سطح المكتب (ويندوز) عبر Electron
// يقدّم مجلد www من خادم محلي على 127.0.0.1 بمنفذ ثابت، حتى يكون:
//  - سياقا آمنا (المايك + Service Worker + الإشعارات تعمل)
//  - الأصل (origin) ثابتا فلا تضيع بيانات localStorage بين التشغيلات
//  - مقبولا لدى تسجيل الدخول بحساب Google (http://localhost:PORT)
const { app, BrowserWindow, shell, session, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const WWW = path.join(__dirname, '..', 'www');
const BASE_PORT = 47615;
const MAX_TRIES = 15;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

let server = null;
let origin = '';
let win = null;

function handler(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(WWW, rel));
  // منع الخروج من مجلد www
  if (file !== WWW && !file.startsWith(WWW + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    res.end(data);
  });
}

function listen(port, tries) {
  return new Promise(function (resolve, reject) {
    const s = http.createServer(handler);
    s.once('error', function (e) {
      if (e.code === 'EADDRINUSE' && tries < MAX_TRIES) {
        resolve(listen(port + 1, tries + 1));
      } else {
        reject(e);
      }
    });
    s.listen(port, '127.0.0.1', function () {
      server = s;
      resolve(port);
    });
  });
}

function isOurs(url) {
  return typeof url === 'string' && origin && url.indexOf(origin) === 0;
}

function setupPermissions() {
  const ses = session.defaultSession;
  const allowed = [
    'media',
    'audioCapture',
    'notifications',
    'fullscreen',
    'clipboard-sanitized-write',
    'clipboard-read',
    'pointerLock'
  ];
  ses.setPermissionRequestHandler(function (wc, permission, cb, details) {
    const url = (details && details.requestingUrl) || wc.getURL();
    cb(isOurs(url) && allowed.indexOf(permission) !== -1);
  });
  ses.setPermissionCheckHandler(function (wc, permission, requestingOrigin) {
    return isOurs(requestingOrigin + '/') && allowed.indexOf(permission) !== -1;
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#060913',
    title: 'IO ARENA',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false // يبقى الصوت والمايك شغالين حتى لو النافذة في الخلفية
    }
  });
  Menu.setApplicationMenu(null);

  win.once('ready-to-show', function () {
    win.show();
  });

  // F11 = ملء الشاشة، Esc يخرج منه، Ctrl+R إعادة تحميل
  win.webContents.on('before-input-event', function (e, input) {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
    } else if (input.control && input.key.toLowerCase() === 'r') {
      win.webContents.reload();
      e.preventDefault();
    }
  });

  // الروابط الخارجية تفتح في المتصفح، ما عدا نافذة تسجيل دخول Google
  win.webContents.setWindowOpenHandler(function (d) {
    let host = '';
    try { host = new URL(d.url).hostname; } catch (e) {}
    if (host === 'accounts.google.com') {
      return { action: 'allow' };
    }
    if (/^https?:/i.test(d.url) && !isOurs(d.url)) shell.openExternal(d.url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', function (e, url) {
    if (!isOurs(url)) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(origin + '/index.html');
  win.on('closed', function () { win = null; });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async function () {
    try {
      const port = await listen(BASE_PORT, 0);
      origin = 'http://127.0.0.1:' + port;
    } catch (e) {
      console.error('تعذر تشغيل الخادم المحلي', e);
      app.quit();
      return;
    }
    // نعرّف localhost بدل 127.0.0.1 ليطابق ما يقبله Google كأصل مسموح
    origin = origin.replace('127.0.0.1', 'localhost');
    setupPermissions();
    createWindow();
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', function () {
    if (server) server.close();
    app.quit();
  });
}
