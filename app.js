(function () {
  /* ===== الوضع الليلي / النهاري ===== */
  var root = document.documentElement;
  var btn = document.getElementById('themeBtn');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0e0f0e' : '#f6f5f1');
    if (btn) {
      btn.setAttribute('aria-label', t === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي');
      btn.querySelector('i').className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }
  applyTheme(root.getAttribute('data-theme') || 'light');
  if (btn) btn.addEventListener('click', function () {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  });

  /* ===== التقويم الهجري (حسب التقويم الشيعي المعتمد في العراق) =====
     يعتمد على التقويم الهجري المحسوب ثم يُزاح يوماً واحداً ليوافق ثبوت الهلال عند المرجعية.
     إذا اختلف يوم عن التقويم المعتمد غيّر القيمة إلى 0 أو 2. */
  var SHIFT_DAYS = 1;
  var MONTHS = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','شهر رمضان','شوال','ذو القعدة','ذو الحجة'];
  var DAY = 86400000;
  var hFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });

  function todayTs() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2], 12);
  }
  function hijri(ts) {
    var o = {};
    hFmt.formatToParts(new Date(ts - SHIFT_DAYS * DAY)).forEach(function (x) { o[x.type] = parseInt(x.value, 10); });
    return o;
  }
  function daysText(n) {
    if (n === 1) return 'غداً';
    if (n === 2) return 'بعد يومين';
    if (n <= 10) return 'بعد ' + n + ' أيام';
    return 'بعد ' + n + ' يوماً';
  }

  var ts = todayTs();
  var h = hijri(ts);
  var wd = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: 'UTC', weekday: 'long' }).format(new Date(ts));
  var gr = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ts));

  document.getElementById('hDay').textContent = wd;
  document.getElementById('hDate').textContent = h.day + ' ' + MONTHS[h.month - 1] + ' ' + h.year + ' هـ';
  document.getElementById('gDate').textContent = gr + ' م';

  var box = document.getElementById('occasion');
  var label = document.getElementById('occLabel');
  var text = document.getElementById('occText');
  var meta = document.getElementById('occMeta');

  var todays = OCCASIONS[h.month + '-' + h.day];
  if (todays) {
    label.textContent = 'مناسبة اليوم';
    text.textContent = todays.join(' • ');
    meta.textContent = h.day + ' ' + MONTHS[h.month - 1];
    box.classList.add('is-today');
  } else {
    for (var i = 1; i <= 400; i++) {
      var f = hijri(ts + i * DAY);
      var k = OCCASIONS[f.month + '-' + f.day];
      if (k) {
        label.textContent = 'المناسبة القادمة';
        text.textContent = k.join(' • ');
        meta.textContent = daysText(i) + ' — ' + f.day + ' ' + MONTHS[f.month - 1];
        break;
      }
    }
  }
})();
