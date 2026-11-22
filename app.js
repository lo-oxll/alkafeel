(function () {
  /* ================= الإعدادات ================= */

  /* بدايات الأشهر حسب إعلان المرجعية: ['تاريخ الغرة الميلادي', السنة الهجرية, رقم الشهر]
     أضف سطراً جديداً كلما ثبت هلال شهر جديد (الأحدث في الآخر).
     الشهر 1=محرم ... 6=جمادى الآخرة ... 12=ذو الحجة.
     ما لم يُسجَّل هنا يُحسب تقريبياً تلقائياً. */
  var MONTH_STARTS = [
    ['2026-11-12', 1448, 6]   // غرة جمادى الآخرة 1448 (مكتب السيد السيستاني)
  ];

  /* تغيير اليوم الهجري عند المغرب (true) أو عند منتصف الليل (false) */
  var CHANGE_AT_MAGHRIB = true;
  var MAGHRIB_DELAY_MIN = 17;                     // دقائق بعد الغروب (ذهاب الحمرة المشرقية تقريباً)
  var LAT = 33.3152, LON = 44.3661, TZ = 3;       // بغداد
  var APPROX_SHIFT_DAYS = 1;                      // إزاحة الحساب التقريبي عن تقويم أم القرى

  /* ================= الوضع الليلي / النهاري ================= */
  var root = document.documentElement;
  var themeBtn = document.getElementById('themeBtn');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0e0f0e' : '#f6f5f1');
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي');
  }
  applyTheme(root.getAttribute('data-theme') || 'light');
  themeBtn.addEventListener('click', function () {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  });

  /* ================= التقويم الهجري ================= */
  var MONTHS = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','شهر رمضان','شوال','ذو القعدة','ذو الحجة'];
  var DAY = 86400000;
  var approxFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });

  var STARTS = MONTH_STARTS.map(function (e) { return { ts: Date.parse(e[0] + 'T12:00:00Z'), year: e[1], month: e[2] }; })
                           .sort(function (a, b) { return a.ts - b.ts; });

  function fromTable(ts) {
    var best = null;
    for (var i = 0; i < STARTS.length; i++) if (STARTS[i].ts <= ts) best = STARTS[i];
    if (!best) return null;
    var d = Math.round((ts - best.ts) / DAY) + 1;
    return d >= 1 && d <= 30 ? { day: d, month: best.month, year: best.year } : null;
  }
  function approx(ts) {
    var o = {};
    approxFmt.formatToParts(new Date(ts - APPROX_SHIFT_DAYS * DAY)).forEach(function (x) { o[x.type] = parseInt(x.value, 10); });
    return o;
  }
  function hijri(ts) { return fromTable(ts) || approx(ts); }

  /* ---- وقت المغرب في بغداد (معادلات NOAA المبسّطة) ---- */
  function sunsetLocalMinutes(ts) {
    var d = new Date(ts), start = Date.UTC(d.getUTCFullYear(), 0, 0);
    var n = Math.floor((ts - start) / DAY);
    var g = 2 * Math.PI / 365 * (n - 1), r = Math.PI / 180;
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(LAT * r) * Math.cos(dec)) - Math.tan(LAT * r) * Math.tan(dec)) / r;
    return 720 - 4 * (LON - ha) - eq + TZ * 60;
  }

  /* ---- تاريخ ووقت بغداد الآن ---- */
  var now = new Date();
  var p = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).forEach(function (x) { p[x.type] = parseInt(x.value, 10); });
  var civilTs = Date.UTC(p.year, p.month - 1, p.day, 12);
  var nowMin = p.hour * 60 + p.minute;
  var afterMaghrib = CHANGE_AT_MAGHRIB && nowMin >= sunsetLocalMinutes(civilTs) + MAGHRIB_DELAY_MIN;
  var ts = afterMaghrib ? civilTs + DAY : civilTs;   // اليوم الهجري الفعّال

  function occFor(t) {
    var x = hijri(t), list = (OCCASIONS[x.month + '-' + x.day] || []).slice();
    if (x.day === 29 && hijri(t + DAY).day === 1) list = list.concat(OCCASIONS[x.month + '-30'] || []);
    return list.length ? { h: x, list: list } : null;
  }
  function daysText(n) {
    if (n === 1) return 'غداً';
    if (n === 2) return 'بعد يومين';
    if (n <= 10) return 'بعد ' + n + ' أيام';
    return 'بعد ' + n + ' يوماً';
  }

  var h = hijri(ts);
  var wdFmt = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: 'UTC', weekday: 'long' });
  var wd = wdFmt.format(new Date(ts));
  var gr = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(civilTs));

  document.getElementById('hDay').textContent = (afterMaghrib ? 'ليلة ' : '') + wd;
  document.getElementById('hDate').textContent = h.day + ' ' + MONTHS[h.month - 1] + ' ' + h.year + ' هـ';
  document.getElementById('gDate').textContent = gr + ' م';

  var box = document.getElementById('occasion'), label = document.getElementById('occLabel'),
      text = document.getElementById('occText'), meta = document.getElementById('occMeta');
  var todays = occFor(ts);
  if (todays) {
    label.textContent = afterMaghrib ? 'مناسبة هذه الليلة' : 'مناسبة اليوم';
    text.textContent = todays.list.join(' • ');
    meta.textContent = h.day + ' ' + MONTHS[h.month - 1];
    box.classList.add('is-today');
  } else {
    for (var i = 1; i <= 400; i++) {
      var k = occFor(ts + i * DAY);
      if (k) {
        label.textContent = 'المناسبة القادمة';
        text.textContent = k.list.join(' • ');
        meta.textContent = daysText(i) + ' — ' + k.h.day + ' ' + MONTHS[k.h.month - 1];
        break;
      }
    }
  }

  /* ================= نسخ / مشاركة / QR ================= */
  var pageUrl = location.href.split('#')[0];
  var copyBtn = document.getElementById('copyBtn'), shareBtn = document.getElementById('shareBtn');

  function flash(btn, msg) {
    var s = btn.querySelector('span'), old = s.textContent;
    s.textContent = msg; btn.classList.add('done');
    setTimeout(function () { s.textContent = old; btn.classList.remove('done'); }, 1600);
  }
  copyBtn.addEventListener('click', function () {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = pageUrl; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); flash(copyBtn, 'تم النسخ'); } catch (e) { flash(copyBtn, 'تعذّر النسخ'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pageUrl).then(function () { flash(copyBtn, 'تم النسخ'); }, fallback);
    } else fallback();
  });
  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () {
      navigator.share({ title: document.title, url: pageUrl }).catch(function () {});
    });
  }

  var dlg = document.getElementById('qrDlg'), qrBox = document.getElementById('qrBox');
  function drawQR() {
    var qr = new QRCode(-1, QRErrorCorrectLevel.M);
    qr.addData(pageUrl); qr.make();
    var n = qr.getModuleCount(), q = 4, size = n + q * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    qrBox.innerHTML = '<svg viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" role="img" aria-label="رمز QR للصفحة"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  document.getElementById('qrBtn').addEventListener('click', function () {
    drawQR();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  function closeQR() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  document.getElementById('qrClose').addEventListener('click', closeQR);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeQR(); });
})();
