// Fancy Avalanche Theme — Dynamic Background Renderer
(function () {
  'use strict';

  /* ============================================================
     Ambient engine v5 — Anthropic-style warm parchment light.
     A WebGL shader breathes LIGHTNESS over the paper: low-frequency
     domain-warped FBM drives a tonal (near-neutral) ramp, plus
     staged lighting — soft key glow top-right, counter fill
     lower-left, edge occlusion. No colored blobs, no particles;
     the gradient is felt more than seen, like light moving across
     paper. Palettes swap per 鲸蓝/素瓷 × light/dark via a gradient
     texture (crossfade on flip). CSS blobs remain as the no-WebGL
     fallback; prefers-reduced-motion renders one static frame.
     ============================================================ */
  (function ambientEngine() {
    // pjax (InstantClick) re-runs this file on every navigation —
    // tear down the previous instance before binding to the new DOM
    if (window.__faAmbientEngine) {
      try { window.__faAmbientEngine.destroy(); } catch (e) {}
      window.__faAmbientEngine = null;
    }

    var bgEl = document.querySelector('.ambient-bg');
    var glCanvas = document.getElementById('ambient-gl');
    if (!bgEl || !glCanvas) return;

    var root = document.documentElement;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var cfg = { flow: true, interactive: true };
    try {
      var cfgEl = document.getElementById('ambient-cfg');
      if (cfgEl) cfg = JSON.parse(cfgEl.textContent);
    } catch (e) {}
    cfg.flow = cfg.flow !== false;

    /* ---------- palette ramps (lightness 0 → 1), per mode ----------
       鲸蓝 = blue family (misty blue paper / deep-sea night ink),
       素瓷 = warm near-mono paper. Each style keeps its own identity
       while the field stays Anthropic-soft; medium frequency + strong
       warp weave hues into flowing washes, never large discrete pools. */
    var RAMPS = {
      'whale-light': [
        [0.00, '#e4e3df'], [0.20, '#eeeee9'], [0.40, '#e9ecf1'],
        [0.60, '#dfe6f1'], [0.76, '#d2dcee'], [0.90, '#c2d2ea'],
        [1.00, '#f6f8fb']
      ],
      'whale-dark': [
        [0.00, '#101116'], [0.24, '#14151d'], [0.46, '#1a1c28'],
        [0.66, '#222638'], [0.82, '#2c3350'], [0.93, '#374266'],
        [1.00, '#4d5f96']
      ],
      'porcelain-light': [
        [0.00, '#e6e5dc'], [0.28, '#f3f2ea'], [0.52, '#eceada'],
        [0.74, '#e9e9d9'], [0.90, '#e7e6cf'], [1.00, '#faf7ec']
      ],
      'porcelain-dark': [
        [0.00, '#141413'], [0.32, '#1c1c1a'], [0.58, '#27251f'],
        [0.82, '#363126'], [0.94, '#453c2c'], [1.00, '#5a4b33']
      ]
    };

    function mode() {
      var style = root.getAttribute('data-style') === 'porcelain' ? 'porcelain' : 'whale';
      return style + '-' + (root.classList.contains('dark') ? 'dark' : 'light');
    }

    /* ================= WebGL parchment light ================= */
    var gl = null, uni = {}, palTexA = null, palTexB = null;
    var palMix = 1; // 0 → fully A, 1 → fully B (new palette lands in B)

    var VERT =
      'attribute vec2 a;' +
      'void main(){ gl_Position = vec4(a, 0.0, 1.0); }';

    // 4-octave fbm, MEDIUM frequency + STRONG domain warp: hues marble
    // into interlocking flowing washes — color everywhere, puddles nowhere
    var FRAG = [
      'precision highp float;',
      'uniform float u_time;',
      'uniform vec2 u_res;',
      'uniform vec2 u_par;',
      'uniform float u_scroll;',
      'uniform sampler2D u_palA;',
      'uniform sampler2D u_palB;',
      'uniform float u_mix;',
      'float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }',
      'float noise(vec2 p){',
      '  vec2 i = floor(p), f = fract(p);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
      '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
      '}',
      'float fbm(vec2 p){',
      '  float v = 0.0, a = 0.5;',
      '  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);',
      '  for (int i = 0; i < 3; i++){ v += a * noise(p); p = m * p * 2.03 + vec2(3.7, 9.1); a *= 0.5; }',
      '  return v;',
      '}',
      'void main(){',
      '  vec2 uv = gl_FragCoord.xy / u_res;',
      '  vec2 asp = vec2(u_res.x / u_res.y, 1.0);',
      '  vec2 p = uv * asp * 2.1;',                       // medium frequency → interwoven fields
      '  p += u_par * 0.20;',
      '  p.y += u_scroll * 0.30;',
      '  float t = u_time * 0.045;',
      '  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.85)),',
      '                fbm(p + vec2(5.2, 1.3) - vec2(t * 0.55, 0.0)));',
      '  float n = fbm(p + 1.75 * q + vec2(t * 0.32, -t * 0.22));', // strong warp smears boundaries',
      '  n = smoothstep(0.14, 0.94, n);',
      // staged lighting: soft key glow at the top-right corner,
      // counter fill lower-left, edge occlusion vignette (遮蔽光)
      '  float key = clamp(1.0 - length((uv - vec2(0.92, 0.88)) * asp * 0.85), 0.0, 1.0);',
      '  float lp  = clamp(1.0 - 0.38 * length((uv - vec2(0.80, 0.84)) * asp * 1.15), 0.0, 1.0);',
      '  float lp2 = clamp(1.0 - 0.55 * length((uv - vec2(0.14, 0.16)) * asp * 1.60), 0.0, 1.0);',
      '  float vig = clamp(1.0 - 0.38 * pow(length((uv - 0.5) * vec2(1.35, 1.10)), 2.0), 0.0, 1.0);',
      '  float n2 = n * (0.72 + 0.28 * lp) + 0.05 * lp2 * n + 0.24 * key * key;',
      '  n2 *= (0.80 + 0.20 * vig);',
      '  float l = clamp(0.20 + 0.80 * n2, 0.0, 1.0);',
      // ivory key glow: blend the corner toward the ramp's ivory PEAK (1.0) —
      // anything less lands in the clay band and reads as a peach oval
      '  l = mix(l, 1.0, 0.9 * smoothstep(0.5, 1.0, key));',
      '  vec3 cA = texture2D(u_palA, vec2(l, 0.5)).rgb;',
      '  vec3 cB = texture2D(u_palB, vec2(l, 0.5)).rgb;',
      '  gl_FragColor = vec4(mix(cA, cB, u_mix), 1.0);',
      '}'
    ].join('\n');

    function rampTexture(ramp) {
      var c = document.createElement('canvas');
      c.width = 256; c.height = 1;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 256, 0);
      ramp.forEach(function (s) { g.addColorStop(s[0], s[1]); });
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 1);
      return c;
    }

    function makeTex(srcCanvas, unit) {
      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    }

    function initGL() {
      try {
        gl = glCanvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' })
          || glCanvas.getContext('experimental-webgl');
        if (!gl) return false;

        function sh(type, src) {
          var s = gl.createShader(type);
          gl.shaderSource(s, src);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
          }
          return s;
        }
        var prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
        }
        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'a');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        ['u_time', 'u_res', 'u_par', 'u_scroll', 'u_mix'].forEach(function (n) {
          uni[n] = gl.getUniformLocation(prog, n);
        });
        gl.uniform1i(gl.getUniformLocation(prog, 'u_palA'), 0);
        gl.uniform1i(gl.getUniformLocation(prog, 'u_palB'), 1);

        var ramp = RAMPS[mode()] || RAMPS['whale-light'];
        palTexA = makeTex(rampTexture(ramp), 0);
        palTexB = makeTex(rampTexture(ramp), 1);
        palMix = 1;
        return true;
      } catch (e) {
        gl = null;
        return false;
      }
    }

    // retint: new ramp slides into slot B while A holds the old one
    function retintGL() {
      if (!gl) return;
      var ramp = rampTexture(RAMPS[mode()] || RAMPS['whale-light']);
      if (reduced || !cfg.flow) { // no anim loop running — swap instantly on both slots
        gl.deleteTexture(palTexA);
        gl.deleteTexture(palTexB);
        palTexA = makeTex(ramp, 0);
        palTexB = makeTex(ramp, 1);
        palMix = 1;
        drawGL(tNow || 12.0);
        return;
      }
      gl.deleteTexture(palTexA);
      palTexA = palTexB;
      palTexB = makeTex(ramp, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, palTexA);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, palTexB);
      palMix = 0;
    }

    var glW = 0, glH = 0;
    var isMobileUA = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    function resizeGL() {
      if (!gl) return;
      // phones render the gradient at 0.3x CSS pixels — the field is so
      // soft that upscaling is invisible, and it's the single biggest
      // frame-time win on mobile GPUs (≈11x fewer fragment invocations
      // than native retina). degraded (adaptive) bottoms out at 0.18x.
      var s = degraded ? 0.18 : (isMobileUA ? 0.3 : 0.5 * Math.min(window.devicePixelRatio || 1, 1.5));
      glW = Math.max(2, Math.round(window.innerWidth * s));
      glH = Math.max(2, Math.round(window.innerHeight * s));
      glCanvas.width = glW;
      glCanvas.height = glH;
      gl.viewport(0, 0, glW, glH);
    }

    // eased parallax (-1..1) + normalized scroll feed the shader
    var par = { x: 0, y: 0, cx: 0, cy: 0 };
    var scrollN = 0, tScrollN = 0;

    function drawGL(t) {
      if (!gl) return;
      gl.uniform1f(uni.u_time, t);
      gl.uniform2f(uni.u_res, glW, glH);
      gl.uniform2f(uni.u_par, par.x, par.y);
      gl.uniform1f(uni.u_scroll, scrollN);
      gl.uniform1f(uni.u_mix, palMix);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /* ================= loop ================= */
    var raf = null, tNow = 0, resizeTimer = null;
    var loopErrs = [];
    var FRAME_MIN = isMobileUA ? 1000 / 30 : 0; // cap mobile at 30fps — the field
                                                // drifts so slowly that 30fps and
                                                // 60fps look identical, but the GPU
                                                // load halves
    var lastDraw = 0;
    var slowFrames = 0, degraded = false;

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (FRAME_MIN && ts - lastDraw < FRAME_MIN) return;
      var gap = lastDraw ? ts - lastDraw : 16;
      lastDraw = ts;

      // adaptive fallback: if frames still arrive slowly after the cap,
      // drop render resolution another notch (one-time, bottoming at 0.18x)
      if (gap > 55) { if (++slowFrames > 24 && !degraded) { degraded = true; resizeGL(); } }
      else slowFrames = 0;

      var dt = Math.min(0.05, gap / 1000);
      tNow += dt;

      par.x += (par.cx - par.x) * Math.min(1, dt * 3.2);
      par.y += (par.cy - par.y) * Math.min(1, dt * 3.2);
      scrollN += (tScrollN - scrollN) * Math.min(1, dt * 4);

      if (palMix < 1) palMix = Math.min(1, palMix + dt / 0.7);
      try {
        if (cfg.flow) drawGL(tNow);
      } catch (e) { if (loopErrs.length < 5) loopErrs.push(String(e && e.message)); }
    }

    function start() {
      if (raf !== null || document.hidden || reduced) return;
      lastDraw = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    }

    function fullResize() {
      resizeGL();
      if (reduced || !cfg.flow) drawGL(12.0); // static frame for reduced-motion / frozen flow
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fullResize, 180);
    }
    function onMove(e) {
      if (!cfg.interactive) return;
      par.cx = (e.clientX / window.innerWidth) * 2 - 1;
      par.cy = (e.clientY / window.innerHeight) * 2 - 1;
    }
    function onLeave() { par.cx = 0; par.cy = 0; }
    function onScroll() { tScrollN = Math.min(3, window.scrollY / Math.max(1, window.innerHeight)); }
    function onVisibility() { if (document.hidden) stop(); else start(); }

    var styleObserver = new MutationObserver(function () { retintGL(); });
    styleObserver.observe(root, { attributes: true, attributeFilter: ['class', 'data-style'] });

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    // boot
    if (initGL()) {
      bgEl.classList.add('gl-on');       // CSS blobs are the fallback only
      resizeGL();
      drawGL(12.0);                      // paint immediately — never a black frame
    }
    onScroll();
    if (reduced || !cfg.flow) {
      drawGL(12.0);                      // one calm frozen frame
    } else {
      start();
    }

    window.__faAmbientEngine = {
      info: function () {
        return { running: raf !== null, W: glW, H: glH, errs: loopErrs.slice(0, 3) };
      },
      destroy: function () {
        stop();
        clearTimeout(resizeTimer);
        styleObserver.disconnect();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseout', onLeave);
        document.removeEventListener('visibilitychange', onVisibility);
        if (gl) {
          try {
            gl.deleteTexture(palTexA);
            gl.deleteTexture(palTexB);
            gl.getExtension('WEBGL_lose_context').loseContext();
          } catch (e) {}
        }
      }
    };
  })();

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
    // re-read config on every bind: page profile (reading vs full) travels in #bg-config
    function readCfg() {
      var el = document.getElementById('bg-config');
      if (!el) return cfg;
      try { var c = JSON.parse(el.textContent); return c && c.type === 'dust' ? c : cfg; } catch (e) { return cfg; }
    }

    window.__faDust = function () {
      var cfgNow = readCfg();
      // PJAX rebinding: the canvas element was swapped but motes/loop live on —
      // retarget density/speed/fps in place instead of a hard reseed.
      if (window.__faDustLive) { window.__faDustLive.retarget(cfgNow); return; }
      var canvas = document.getElementById('bg-dust');
      if (!canvas) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var ctx = canvas.getContext('2d');
      var isMobile = window.innerWidth < 768;
      var saveData = false;
      try { saveData = navigator.connection && navigator.connection.saveData; } catch (e) {}
      var lowPower = (navigator.hardwareConcurrency || 8) <= 4 || !!saveData;

      var density = cfgNow.density || 90;
      var baseSpeed = cfgNow.speed || 6;
      var accentRatio = typeof cfgNow.accent === 'number' ? cfgNow.accent : 0.1;
      var mouseOn = cfgNow.mouse !== false;

      var baseTarget = density * (isMobile ? 0.45 : 1) * (lowPower ? 0.6 : 1);
      if (isMobile) baseTarget = Math.min(baseTarget, 40);
      var DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

      var w = 0, h = 0, raf = 0, running = false, last = 0, lastDraw = 0;
      var motes = [];
      // page profile state — reading (post) pages run sparser, slower, fps-capped
      var desiredCount = baseTarget, targetSpeedScale = 1, fpsCap = 0, speedScale = 1;
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
        for (var i = 0; i < Math.round(desiredCount); i++) motes.push(makeMote());
      }
      // switch page profile; excess motes fade out on staggered lifespans (~1s crossfade,
      // never a hard pop), missing motes fade back in through the natural 3s env
      function applyPageProfile(c) {
        var reading = !!c.reading;
        desiredCount = reading ? Math.min(baseTarget, c.post_density || 35) : baseTarget;
        targetSpeedScale = reading ? (typeof c.post_speed === 'number' ? c.post_speed : 0.4) : 1;
        fpsCap = reading ? (c.post_fps || 30) : 0;
        var want = Math.round(desiredCount);
        var excess = motes.length - want;
        for (var i = 0; i < excess; i++) {
          var m = motes[(Math.random() * motes.length) | 0];
          m.lifespan = Math.min(m.lifespan, m.life + 0.5 + Math.random() * 3);
        }
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
        // reading pages: cap at ~30fps — half the frames, calmer feel, battery win
        if (fpsCap && lastDraw && now - lastDraw < 1000 / fpsCap - 1) {
          raf = requestAnimationFrame(frame);
          return;
        }
        lastDraw = now;
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
        speedScale += (targetSpeedScale - speedScale) * Math.min(1, dt);

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
          if (p.life >= p.lifespan) {
            // retire instead of respawn while above the page's desired density
            if (motes.length > Math.round(desiredCount)) { motes.splice(i, 1); i--; continue; }
            motes[i] = makeMote();
            continue;
          }

          var env = 1;
          if (p.life < 3) env = p.life / 3;
          else if (p.life > p.lifespan - 3) env = Math.max(0, (p.lifespan - p.life) / 3);

          var breath = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 / p.breathPeriod + p.phi));
          var s = p.spd * breath * speedScale;
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

        // grow back gradually (fade-in env makes new motes appear softly);
        // never regrow past an auto-degrade verdict
        if (degrade === 0 && motes.length < Math.round(desiredCount) && Math.random() < dt * 6) {
          motes.push(makeMote());
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
        onResize: function () { resize(); },
        retarget: function (c) {
          var el = document.getElementById('bg-dust');
          if (!el) return;
          canvas = el;
          ctx = canvas.getContext('2d');
          resize();
          applyPageProfile(c || readCfg());
          if (!running && !document.hidden) start();
        },
        start: start,
        stop: stop
      };

      resize();
      readPalette();
      pal = { r1: palT.r1, g1: palT.g1, b1: palT.b1, r2: palT.r2, g2: palT.g2, b2: palT.b2, a: palT.a };
      applyPageProfile(cfgNow);
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
