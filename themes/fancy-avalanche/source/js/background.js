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
