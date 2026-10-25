/* Hinweis "Die App wurde geändert"
   Jede Seite trägt ihre Version in <meta name="app-version">. Diese Datei fragt version.json ab.
   Ist dort eine neuere Version, erscheint unten eine Leiste mit dem Knopf "Neu laden".
   Bei jeder Änderung vor dem Veröffentlichen ./neue-version.sh ausführen (erhöht beides gemeinsam). */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="app-version"]');
  if (!meta || !document.currentScript) return;
  var mine = String(meta.content);
  var url = new URL('version.json', document.currentScript.src).href;
  var bar = null, busy = false, last = 0;

  function check() {
    if (bar || busy || document.visibilityState === 'hidden') return;
    var now = Date.now();
    if (now - last < 20000) return; // nicht öfter als alle 20 Sekunden
    last = now; busy = true;
    fetch(url + '?t=' + now, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || d.v == null) return;
        var srv = String(d.v);
        if (srv === mine) return;
        // Schutz gegen eine Endlosschleife, falls eine Seite die neue Nummer nicht bekommen hat
        if (new URLSearchParams(location.search).get('v') === srv) return;
        show(srv);
      })
      .catch(function () {})
      .then(function () { busy = false; });
  }

  function show(srv) {
    var st = document.createElement('style');
    st.textContent =
      '.tl-upd{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:9999;' +
      'max-width:520px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 16px;border-radius:18px;' +
      'background:#16452B;color:#F6EBD5;box-shadow:0 6px 0 rgba(0,0,0,.22),0 10px 30px rgba(0,0,0,.25);' +
      'font:600 17px/1.25 "Fredoka","Trebuchet MS","Segoe UI",system-ui,sans-serif}' +
      '.tl-upd span{flex:1;min-width:0}' +
      '.tl-upd button{flex:none;min-height:48px;padding:6px 18px;border:0;border-radius:14px;background:#F28C28;color:#1C2B24;' +
      'font:600 17px/1 "Fredoka","Trebuchet MS","Segoe UI",system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.tl-upd button:focus-visible{outline:3px solid #1BA6A6;outline-offset:2px}' +
      'body.tl-upd-on{padding-bottom:96px}' +
      '@media print{.tl-upd{display:none!important}body.tl-upd-on{padding-bottom:0}}';
    document.head.appendChild(st);
    bar = document.createElement('div');
    bar.className = 'tl-upd';
    bar.setAttribute('role', 'status');
    var txt = document.createElement('span');
    txt.textContent = 'Die App wurde geändert.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Neu laden';
    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = 'Lädt …';
      var u = new URL(location.href);
      u.searchParams.set('v', srv); // neue Adresse, damit nicht die alte Seite aus dem Zwischenspeicher kommt
      location.replace(u.href);
    });
    bar.appendChild(txt); bar.appendChild(btn);
    document.body.appendChild(bar);
    document.body.classList.add('tl-upd-on');
  }

  setTimeout(check, 1500);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { last = 0; check(); } });
  setInterval(check, 5 * 60 * 1000);
})();
