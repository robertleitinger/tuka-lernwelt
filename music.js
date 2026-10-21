/* Tukas Dschungelmusik: ruhige, live erzeugte Hintergrundmusik (Web Audio).
   Kalimba-Melodie in C-Pentatonik, weiche Akkordflaechen, leiser Bach, gelegentliche Voegel.
   Schalter: alle button.tl-music auf der Seite. Einstellung bleibt in localStorage. */
(function () {
  'use strict';
  var KEY = 'tuka-music';
  var BEAT = 0.85;               // Sekunden pro Schlag (ca. 70 bpm)
  var CHORD_LEN = 8 * BEAT;      // Akkordwechsel alle 8 Schlaege
  var CHORDS = [                 // C, Am, F, G (Grundton Bass, Flaechentoene)
    { bass: 65.41, pad: [130.81, 164.81, 196.00] },
    { bass: 55.00, pad: [110.00, 130.81, 164.81] },
    { bass: 43.65, pad: [87.31, 110.00, 130.81] },
    { bass: 49.00, pad: [98.00, 123.47, 146.83] }
  ];
  var SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

  function Engine(ctx, dest) {
    this.ctx = ctx;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.master.connect(comp); comp.connect(dest || ctx.destination);
    // Hall: einfache Verzoegerung mit Rueckkopplung und Tiefpass
    this.fx = ctx.createGain(); this.fx.gain.value = 0.35;
    var d = ctx.createDelay(2); d.delayTime.value = 0.42;
    var fb = ctx.createGain(); fb.gain.value = 0.32;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.fx.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(this.master);
    this.padBus = ctx.createBiquadFilter(); this.padBus.type = 'lowpass'; this.padBus.frequency.value = 900;
    this.padBus.connect(this.master);
    this.t0 = ctx.currentTime + 0.1; this.next = this.t0; this.step = 0; this.note = 5; this.nextBird = this.t0 + 4;
    this.rand = Math.random;
    this.stream();
  }
  Engine.prototype.stream = function () {
    var ctx = this.ctx, len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; ch[i] = w * 0.6 + last * 2; }
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.5;
    var g = ctx.createGain(); g.gain.value = 0.018;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    var lg = ctx.createGain(); lg.gain.value = 0.007; lfo.connect(lg); lg.connect(g.gain);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(); lfo.start();
  };
  Engine.prototype.pad = function (t, f, len) {
    var ctx = this.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.028, t + 2.4);
    g.gain.setValueAtTime(0.028, t + len - 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 2.6);
    g.connect(this.padBus);
    [-4, 4].forEach(function (det) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + len + 2.8);
    });
  };
  Engine.prototype.bass = function (t, f) {
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 3.3);
  };
  Engine.prototype.pluck = function (t, f, vel) {
    var ctx = this.ctx, g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = 'sine'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 4.02;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.018 * vel, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    var out = g;
    if (pan) { pan.pan.value = (this.rand() - 0.5) * 0.6; g.connect(pan); out = pan; }
    out.connect(this.master); out.connect(this.fx);
    o1.start(t); o2.start(t); o1.stop(t + 1.7); o2.stop(t + 0.3);
  };
  Engine.prototype.bird = function (t) {
    var ctx = this.ctx, n = 2 + Math.floor(this.rand() * 4), base = 2300 + this.rand() * 1400;
    var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null, bus = ctx.createGain();
    bus.gain.value = 0.016;
    if (pan) { pan.pan.value = this.rand() < 0.5 ? -0.7 : 0.7; bus.connect(pan); pan.connect(this.master); pan.connect(this.fx); }
    else { bus.connect(this.master); }
    for (var i = 0; i < n; i++) {
      var s = t + i * (0.11 + this.rand() * 0.06), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, s);
      o.frequency.exponentialRampToValueAtTime(base * (1.25 + this.rand() * 0.2), s + 0.04);
      o.frequency.exponentialRampToValueAtTime(base * 0.85, s + 0.09);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(1, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
      o.connect(g); g.connect(bus); o.start(s); o.stop(s + 0.12);
    }
  };
  Engine.prototype.schedule = function (until) {
    if (this.next < this.ctx.currentTime - 0.2) { // nach einer Pause nicht alles nachholen
      this.t0 = this.ctx.currentTime + 0.1 - this.step * BEAT; this.next = this.t0 + this.step * BEAT;
      this.nextBird = Math.max(this.nextBird, this.next + 3);
    }
    while (this.next < until) {
      var t = this.next, beatInChord = this.step % 8, chord = CHORDS[Math.floor(this.step / 8) % CHORDS.length];
      if (beatInChord === 0) {
        var self = this;
        chord.pad.forEach(function (f) { self.pad(t, f, CHORD_LEN); });
        this.bass(t, chord.bass);
      }
      var play = beatInChord === 0 ? 0.9 : (beatInChord % 2 === 0 ? 0.6 : 0.35);
      if (this.rand() < play) {
        var move = [-2, -1, -1, 1, 1, 2, 0][Math.floor(this.rand() * 7)];
        this.note = Math.max(1, Math.min(SCALE.length - 2, this.note + move));
        this.pluck(t + (this.rand() - 0.5) * 0.03, SCALE[this.note], 0.7 + this.rand() * 0.3);
        if (this.rand() < 0.15) this.pluck(t + BEAT / 2, SCALE[Math.max(0, this.note - 2)], 0.5);
      }
      if (t >= this.nextBird) { this.bird(t + 0.2); this.nextBird = t + 6 + this.rand() * 10; }
      this.step++; this.next = this.t0 + this.step * BEAT;
    }
  };
  Engine.prototype.fade = function (to, secs) {
    var g = this.master.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(to, now + secs);
  };
  window.TukaMusicEngine = Engine; // fuer Tests

  // Steuerung im Browser
  var ctx = null, eng = null, timer = null, on = false;
  function readPref() { try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; } }
  function writePref(v) { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {} }
  function buttons() { return Array.prototype.slice.call(document.querySelectorAll('button.tl-music')); }
  function paint() {
    buttons().forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? 'Musik ausschalten' : 'Musik einschalten');
      b.classList.toggle('is-on', on);
      var l = b.querySelector('.tl-music-label'); if (l) l.textContent = on ? 'Musik an' : 'Musik aus';
    });
  }
  function start() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        ctx = new AC(); eng = new Engine(ctx);
      }
      if (ctx.state === 'suspended') ctx.resume();
      if (!timer) timer = setInterval(function () { if (ctx.state === 'running') eng.schedule(ctx.currentTime + 0.6); }, 150);
      eng.schedule(ctx.currentTime + 0.6);
      eng.fade(1.2, 2.5);
    } catch (e) {}
  }
  function stop() {
    if (!ctx) return;
    try { eng.fade(0, 0.8); setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 900); } catch (e) {}
  }
  function toggle() { on = !on; writePref(on); paint(); if (on) start(); else stop(); }
  function armFirstTouch() {
    // Browser erlauben Ton erst nach einer Beruehrung: Musik startet beim ersten Tippen
    function go(ev) {
      if (ev && ev.target && ev.target.closest && ev.target.closest('button.tl-music')) return;
      document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true);
      if (on) start();
    }
    document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
  }
  function init() {
    on = readPref(); paint();
    buttons().forEach(function (b) { b.addEventListener('click', toggle); });
    if (on) armFirstTouch();
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (on) { ctx.resume(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
