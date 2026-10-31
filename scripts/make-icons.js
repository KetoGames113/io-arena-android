// يولّد أيقونات أندرويد من نفس أيقونة ويندوز (build/icon.png) بدون أي مكتبات خارجية.
// ينتج الأيقونة الأساسية + نسخا بألوان مختلفة تستطيع الثيمات التبديل بينها (تُسجَّل كـ activity-alias).
// الاستخدام داخل patch-android.js، أو للمعاينة: node scripts/make-icons.js OUT_DIR
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// name: اسم النسخة (حروف صغيرة/أرقام فقط)، shift: دوران اللون بالدرجات، hue: لون النسخة التقريبي (للمطابقة مع ألوان الثيم)
const VARIANTS = [
  { name: 'default', shift: 0, hue: 270, label: 'الأصلي' },
  { name: 'crimson', shift: 75, hue: 345, label: 'قرمزي' },
  { name: 'sunset', shift: 135, hue: 45, label: 'غروب' },
  { name: 'mint', shift: -110, hue: 160, label: 'نعناعي' },
  { name: 'ocean', shift: -50, hue: 220, label: 'محيط' }
];
const BG = [6, 9, 19]; // #060913 خلفية المنصة
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/* ---------- PNG decode / encode ---------- */
let _crcT = null;
function crc32(buf) {
  if (!_crcT) {
    _crcT = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; _crcT[n] = c >>> 0; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = _crcT[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii'), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('الملف ليس PNG');
  let p = 8, w = 0, h = 0, bd = 0, ct = 0, il = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.slice(p + 8, p + 8 + len);
    p += 12 + len;
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; il = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (bd !== 8 || ct !== 6 || il !== 0) throw new Error('الأيقونة يجب أن تكون PNG بصيغة RGBA 8-bit بدون interlace');
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * 4, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], so = y * (stride + 1) + 1, d = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[so + x];
      const a = x >= 4 ? out[d + x - 4] : 0;
      const b = y > 0 ? out[d - stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[d - stride + x - 4] : 0;
      let r;
      if (ft === 0) r = v;
      else if (ft === 1) r = v + a;
      else if (ft === 2) r = v + b;
      else if (ft === 3) r = v + ((a + b) >> 1);
      else {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[d + x] = r & 255;
    }
  }
  return { w, h, data: out };
}
function encodePng(img) {
  const { w, h, data } = img, stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- معالجة الصورة ---------- */
// تصغير بمتوسط المساحة (مع ألفا مضروبة مسبقا حتى لا تظهر حواف داكنة)
function resize(img, dw, dh) {
  const { w: sw, h: sh, data: s } = img, out = Buffer.alloc(dw * dh * 4), xs = sw / dw, ys = sh / dh;
  for (let dy = 0; dy < dh; dy++) {
    const y0 = dy * ys, y1 = y0 + ys;
    for (let dx = 0; dx < dw; dx++) {
      const x0 = dx * xs, x1 = x0 + xs;
      let r = 0, g = 0, b = 0, a = 0, wt = 0;
      for (let sy = Math.floor(y0); sy < Math.min(sh, Math.ceil(y1)); sy++) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < Math.min(sw, Math.ceil(x1)); sx++) {
          const wx = Math.min(x1, sx + 1) - Math.max(x0, sx), wgt = wx * wy, i = (sy * sw + sx) * 4, al = s[i + 3] / 255;
          r += s[i] * al * wgt; g += s[i + 1] * al * wgt; b += s[i + 2] * al * wgt; a += al * wgt; wt += wgt;
        }
      }
      const o = (dy * dw + dx) * 4;
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round((a / wt) * 255);
    }
  }
  return { w: dw, h: dh, data: out };
}
function hueRotate(img, deg) {
  if (!deg) return img;
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072
  ];
  const d = Buffer.from(img.data), cl = function (v) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); };
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = cl(m[0] * r + m[1] * g + m[2] * b);
    d[i + 1] = cl(m[3] * r + m[4] * g + m[5] * b);
    d[i + 2] = cl(m[6] * r + m[7] * g + m[8] * b);
  }
  return { w: img.w, h: img.h, data: d };
}
function blank(w, h) { return { w, h, data: Buffer.alloc(w * h * 4) }; }
function bgShape(S, shape) {
  const img = blank(S, S), c = S / 2, R = S * 0.22;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5 - c, py = y + 0.5 - c;
    let cov;
    if (shape === 'round') cov = c - Math.sqrt(px * px + py * py) + 0.5;
    else {
      const qx = Math.abs(px) - (c - R), qy = Math.abs(py) - (c - R);
      const sd = Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2) + Math.min(Math.max(qx, qy), 0) - R;
      cov = 0.5 - sd;
    }
    cov = Math.max(0, Math.min(1, cov));
    const o = (y * S + x) * 4;
    img.data[o] = BG[0]; img.data[o + 1] = BG[1]; img.data[o + 2] = BG[2]; img.data[o + 3] = Math.round(cov * 255);
  }
  return img;
}
function over(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const dx = x + ox, dy = y + oy;
    if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
    const si = (y * src.w + x) * 4, di = (dy * dst.w + dx) * 4, sa = src.data[si + 3] / 255, da = dst.data[di + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) continue;
    for (let k = 0; k < 3; k++) dst.data[di + k] = Math.round((src.data[si + k] * sa + dst.data[di + k] * da * (1 - sa)) / oa);
    dst.data[di + 3] = Math.round(oa * 255);
  }
}
function placed(icon, S, frac) { // الأيقونة بنسبة frac من مربع S ومتوسّطة
  const t = Math.round(S * frac), im = resize(icon, t, t), c = blank(S, S);
  over(c, im, Math.round((S - t) / 2), Math.round((S - t) / 2));
  return c;
}
function legacy(icon, S, shape) {
  const c = bgShape(S, shape);
  over(c, placed(icon, S, 0.98), 0, 0);
  return c;
}
function foreground(icon, F) { return placed(icon, F, 0.68); } // داخل المنطقة الآمنة للأيقونة التكيفية

/* ---------- كتابة موارد أندرويد ---------- */
const adaptive = function (fg) {
  return '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/' + fg + '"/>\n</adaptive-icon>\n';
};
function iconBase(v) { return v.name === 'default' ? 'ic_launcher' : 'ic_launcher_' + v.name; }

function generate(resDir, srcPng) {
  const src = decodePng(fs.readFileSync(srcPng));
  if (src.w !== src.h) throw new Error('الأيقونة يجب أن تكون مربعة');
  const wr = function (rel, buf) { const p = path.join(resDir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); };
  VARIANTS.forEach(function (v) {
    const icon = hueRotate(src, v.shift), base = iconBase(v);
    Object.keys(DENS).forEach(function (d) {
      const f = DENS[d], dir = 'mipmap-' + d + '/';
      wr(dir + base + '.png', encodePng(legacy(icon, Math.round(48 * f), 'rect')));
      wr(dir + base + '_round.png', encodePng(legacy(icon, Math.round(48 * f), 'round')));
      wr(dir + base + '_foreground.png', encodePng(foreground(icon, Math.round(108 * f))));
    });
    wr('mipmap-anydpi-v26/' + base + '.xml', adaptive(base + '_foreground'));
    wr('mipmap-anydpi-v26/' + base + '_round.xml', adaptive(base + '_foreground'));
  });
  wr('values/ic_launcher_background.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#060913</color>\n</resources>\n');
  return VARIANTS.length;
}

module.exports = { VARIANTS, iconBase, generate, decodePng, encodePng, hueRotate, resize, legacy, blank, over };

if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'icon-preview');
  const n = generate(out, path.join(__dirname, '..', 'build', 'icon.png'));
  console.log('make-icons: تم توليد', n, 'نسخ ->', out);
}
