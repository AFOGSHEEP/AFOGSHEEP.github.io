// Fancy Avalanche Theme — Dynamic Background Renderer
(function () {
  'use strict';

  var configEl = document.getElementById('bg-config');
  if (!configEl) return;

  var cfg;
  try {
    cfg = JSON.parse(configEl.textContent);
  } catch (e) {
    return;
  }

  // ---------- Canvas Particle System ----------
  if (cfg.type === 'canvas') {
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var color = cfg.color || '#6366F1';
    var density = cfg.density || 50;
    var speed = cfg.speed || 0.5;
    var interactive = cfg.interactive !== false;
    var isMobile = window.innerWidth < 768;
    var particleCount = Math.floor((isMobile ? density / 2 : density) * (canvas.width / 1920));

    var w, h;
    var particles = [];
    var mouse = { x: null, y: null, radius: 150 };

    function hexToRGB(hex) {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return { r: r, g: g, b: b };
    }
    var rgb = hexToRGB(color);

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      particleCount = Math.floor((isMobile ? density / 2 : density) * (w / 1920));
      initParticles();
    }

    function initParticles() {
      particles = [];
      for (var i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          radius: Math.random() * 3 + 0.5,
          baseRadius: Math.random() * 3 + 0.5,
          angle: Math.random() * Math.PI * 2,
          speed: (Math.random() * 0.5 + 0.3) * speed,
          amplitude: Math.random() * 40 + 20
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        // Wave motion
        if (cfg.preset === 'waves') {
          p.y += Math.sin(p.angle) * 0.3;
          p.angle += 0.01 * speed;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Mouse interaction
        var dist = interactive && mouse.x !== null
          ? Math.hypot(p.x - mouse.x, p.y - mouse.y)
          : Infinity;
        var r = dist < mouse.radius ? p.baseRadius + (1 - dist / mouse.radius) * 5 : p.baseRadius;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        var alpha = interactive && dist < mouse.radius
          ? 0.6 + (1 - dist / mouse.radius) * 0.4
          : 0.3;
        ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
        ctx.fill();

        // Draw connections
        if (cfg.preset !== 'stars') {
          for (var j = i + 1; j < particles.length; j++) {
            var p2 = particles[j];
            var d = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (d < 120) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (0.15 * (1 - d / 120)) + ')';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      requestAnimationFrame(draw);
    }

    // GPU-optimized: pause when not visible
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        draw();
      }
    }, { threshold: 0 });
    observer.observe(canvas);

    // Reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    window.addEventListener('resize', resize);
    if (interactive) {
      window.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });
      window.addEventListener('mouseout', function () {
        mouse.x = null;
        mouse.y = null;
      });
      window.addEventListener('touchmove', function (e) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }, { passive: true });
    }

    resize();
    draw();
  }

  // ---------- Dust motes — 纸上尘光 (Anthropic warm minimalism) ----------
  // Flow-field motes breathing on desynced 12-17s envelopes; terracotta
  // accents capped at ~10%; mouse = gentle tangent deflection (never
  // magnification); scrolling adds a whisper of drift. Palette comes from
  // CSS vars (--fa-dust-*) so both styles × light/dark work with a 500ms
  // crossfade. Degrades itself on slow frames; reduced-motion → static CSS.
  if (cfg.type === 'dust') {
    window.__faDust = function () {
      if (window.__faDustLive) window.__faDustLive.stop();
      var canvas = document.getElementById('bg-dust');
      if (!canvas) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var ctx = canvas.getContext('2d');
      var isMobile = window.innerWidth < 768;
      var saveData = false;
      try { saveData = navigator.connection && navigator.connection.saveData; } catch (e) {}
      var lowPower = (navigator.hardwareConcurrency || 8) <= 4 || !!saveData;

      var density = cfg.density || 90;
      var baseSpeed = cfg.speed || 6;
      var accentRatio = typeof cfg.accent === 'number' ? cfg.accent : 0.1;
      var mouseOn = cfg.mouse !== false;

      var target = density * (isMobile ? 0.45 : 1) * (lowPower ? 0.6 : 1);
      if (isMobile) target = Math.min(target, 40);
      var DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

      var w = 0, h = 0, raf = 0, running = false, last = 0;
      var motes = [];
      var mouse = { x: null, y: null, tx: null, ty: null, R: 110 };
      var scrollDrift = 0, lastScroll = window.scrollY;
      var degrade = 0;
      var frames = [];

      var pal = { r1: 138, g1: 133, b1: 120, r2: 217, g2: 119, b2: 87, a: 0.16 };
      var palT = { r1: 138, g1: 133, b1: 120, r2: 217, g2: 119, b2: 87, a: 0.16 };

      function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      }
      function triplet(s, fallback) {
        var m = (s || '').split(/\s+/).map(Number);
        return m.length === 3 && m.every(function (n) { return !isNaN(n); }) ? m : fallback;
      }
      function readPalette() {
        var d1 = triplet(cssVar('--fa-dust-1'), [138, 133, 120]);
        var d2 = triplet(cssVar('--fa-dust-2'), [217, 119, 87]);
        var a = parseFloat(cssVar('--fa-dust-alpha'));
        palT = { r1: d1[0], g1: d1[1], b1: d1[2], r2: d2[0], g2: d2[1], b2: d2[2], a: isNaN(a) ? 0.16 : a };
      }
      function lerpPalette(dt) {
        var k = Math.min(1, dt / 0.5);
        var keys = ['r1', 'g1', 'b1', 'r2', 'g2', 'b2', 'a'];
        for (var i = 0; i < keys.length; i++) pal[keys[i]] += (palT[keys[i]] - pal[keys[i]]) * k;
      }

      function makeMote() {
        var roll = Math.random();
        var layer = roll < 0.45 ? 0 : roll < 0.9 ? 1 : 2;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: layer === 0 ? 0.4 + Math.random() * 0.5 : layer === 1 ? 0.9 + Math.random() * 0.6 : 2.0 + Math.random() * 1.3,
          layer: layer,
          accent: Math.random() < accentRatio,
          phi: Math.random() * Math.PI * 2,
          breathPeriod: 12 + Math.random() * 5,
          life: 0,
          lifespan: 20 + Math.random() * 20,
          seed: Math.random() * 1000,
          spd: baseSpeed * (layer === 0 ? 0.6 : layer === 1 ? 1 : 1.4)
        };
      }
      function seedMotes() {
        motes = [];
        for (var i = 0; i < Math.round(target); i++) motes.push(makeMote());
      }
      function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * DPR);
        canvas.height = Math.round(h * DPR);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }

      function flowAngle(x, y, t, seed) {
        var f = 0.6 * Math.sin(0.003 * x + t * 0.11 + seed * 0.13)
              + 0.4 * Math.sin(0.005 * y - t * 0.07 + seed * 0.07);
        return f * Math.PI;
      }

      function frame(now) {
        if (!running) return;
        var dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        frames.push(dt);
        if (frames.length >= 120) {
          frames.sort(function (a, b) { return a - b; });
          var p90 = frames[Math.floor(frames.length * 0.9)];
          frames = [];
          if (p90 > 0.024) {
            if (degrade === 0) { degrade = 1; motes = motes.slice(0, Math.ceil(motes.length / 2)); }
            else { degrade = 2; ctx.clearRect(0, 0, w, h); stop(); return; }
          }
        }

        lerpPalette(dt);

        if (mouseOn && mouse.tx !== null) {
          if (mouse.x === null) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
          mouse.x += (mouse.tx - mouse.x) * 0.1;
          mouse.y += (mouse.ty - mouse.y) * 0.1;
        }

        var sy = window.scrollY;
        scrollDrift = scrollDrift * 0.9 + Math.max(-1.2, Math.min(1.2, (sy - lastScroll) * 0.012));
        lastScroll = sy;

        ctx.clearRect(0, 0, w, h);

        for (var i = 0; i < motes.length; i++) {
          var p = motes[i];
          p.life += dt;
          if (p.life >= p.lifespan) { motes[i] = makeMote(); continue; }

          var env = 1;
          if (p.life < 3) env = p.life / 3;
          else if (p.life > p.lifespan - 3) env = Math.max(0, (p.lifespan - p.life) / 3);

          var breath = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 / p.breathPeriod + p.phi));
          var s = p.spd * breath;
          var ang = flowAngle(p.x, p.y, now / 1000, p.seed);
          var vx = Math.cos(ang) * s;
          var vy = Math.sin(ang) * s - (p.layer === 2 ? 0.35 : 0.15);

          if (mouseOn && mouse.x !== null) {
            var dxm = p.x - mouse.x, dym = p.y - mouse.y;
            var d2 = dxm * dxm + dym * dym;
            if (d2 < mouse.R * mouse.R) {
              var d = Math.sqrt(d2) || 1;
              var fall = 1 - d / mouse.R;
              var k = fall * fall * 0.15 * p.spd;
              vx += (-dym / d) * k;
              vy += (dxm / d) * k;
            }
          }

          vy += scrollDrift * (p.layer === 0 ? 0.5 : p.layer === 1 ? 1 : 1.5);

          p.x += vx * dt;
          p.y += vy * dt;
          if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

          var layerA = p.layer === 0 ? 0.35 : p.layer === 1 ? 0.6 : 0.95;
          var alpha = pal.a * layerA * env;
          var cr = p.accent ? pal.r2 : pal.r1;
          var cg = p.accent ? pal.g2 : pal.g1;
          var cb = p.accent ? pal.b2 : pal.b1;

          if (p.layer === 2) {
            var R = p.r * 4;
            var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
            g.addColorStop(0, 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + alpha.toFixed(3) + ')');
            g.addColorStop(1, 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(' + (cr | 0) + ',' + (cg | 0) + ',' + (cb | 0) + ',' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        raf = requestAnimationFrame(frame);
      }

      function start() {
        if (running) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
      function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      }

      // singleton listeners survive PJAX body swaps
      if (!window.__faDustWired) {
        window.__faDustWired = true;
        window.addEventListener('resize', function () {
          clearTimeout(window.__faDustRs);
          window.__faDustRs = setTimeout(function () {
            if (window.__faDustLive) window.__faDustLive.onResize();
          }, 250);
        }, { passive: true });
        document.addEventListener('visibilitychange', function () {
          if (!window.__faDustLive) return;
          if (document.hidden) window.__faDustLive.stop();
          else window.__faDustLive.start();
        });
        if (mouseOn) {
          window.addEventListener('mousemove', function (e) {
            if (window.__faDustLive) { window.__faDustLive.mouse.tx = e.clientX; window.__faDustLive.mouse.ty = e.clientY; }
          }, { passive: true });
          window.addEventListener('mouseout', function () {
            if (window.__faDustLive) { window.__faDustLive.mouse.tx = null; window.__faDustLive.mouse.x = null; window.__faDustLive.mouse.y = null; }
          });
        }
        new MutationObserver(function () {
          if (window.__faDustLive) window.__faDustLive.readPalette();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-style'] });
      }

      window.__faDustLive = {
        mouse: mouse,
        readPalette: readPalette,
        onResize: function () { resize(); seedMotes(); },
        start: start,
        stop: stop
      };

      resize();
      readPalette();
      pal = { r1: palT.r1, g1: palT.g1, b1: palT.b1, r2: palT.r2, g2: palT.g2, b2: palT.b2, a: palT.a };
      seedMotes();
      start();
    };
    window.__faDust();
  }

  // ---------- Three.js / Vanta ----------
  if (cfg.type === 'three') {
    var threeCanvas = document.getElementById('bg-three-canvas');
    if (!threeCanvas) return;

    // Only load Three.js + Vanta if needed
    var vantaScript = document.createElement('script');
    vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.' + (cfg.effect || 'waves') + '.min.js';
    vantaScript.onload = function () {
      var threeScript = document.createElement('script');
      threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.min.js';
      threeScript.onload = function () {
        if (typeof VANTA !== 'undefined' && VANTA[cfg.effect.toUpperCase()]) {
          VANTA[cfg.effect.toUpperCase()]({
            el: threeCanvas,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 0.50,
            color: parseInt(cfg.color.replace('#', ''), 16),
            shininess: 30.00,
            waveSpeed: cfg.speed || 1.0,
            zoom: 1.00
          });
        }
      };
      document.head.appendChild(threeScript);
    };
    document.head.appendChild(vantaScript);
  }
})();
