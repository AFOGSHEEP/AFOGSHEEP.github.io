// Fancy Avalanche — Global Scripts
(function () {

  var RING_CIRC = 125.66; // 2 * PI * 20

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  window.copyPostLink = function () {
    var url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () { showToast('链接已复制'); },
        function () { showToast('复制失败，请手动复制'); }
      );
    } else {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('链接已复制'); }
      catch (e) { showToast('复制失败，请手动复制'); }
      document.body.removeChild(ta);
    }
  };

  window.copyEmail = function (addr) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(
        function () { showToast('邮箱已复制：' + addr); },
        function () { showToast('复制失败，请手动选择'); }
      );
    } else {
      var ta = document.createElement('textarea');
      ta.value = addr;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('邮箱已复制：' + addr); }
      catch (e) { showToast('复制失败，请手动选择'); }
      document.body.removeChild(ta);
    }
  };

  window.randomPost = function (btn) {
    var pool = [];
    try { pool = JSON.parse(btn.getAttribute('data-pool') || '[]'); } catch (e) {}
    // secret: wanderer — read 3 random posts
    try {
      var w = (parseInt(localStorage.getItem('fa-random') || '0', 10) || 0) + 1;
      localStorage.setItem('fa-random', String(w));
      if (w >= 3) window.__faSecretFound('wander');
    } catch (e) {}
    if (!pool.length) return;
    window.location.href = pool[Math.floor(Math.random() * pool.length)];
  };

  // ---- Avatar card secrets (collectible easter eggs, Josh Comeau style) ----
  var FA_SECRETS = [
    { id: 'first', name: '初次见面' },
    { id: 'night', name: '夜深了' },
    { id: 'combo', name: '手速惊人' },
    { id: 'key', name: '键盘侠' },
    { id: 'fur', name: '顺了顺毛' },
    { id: 'wander', name: '随缘读者' },
    { id: 'regular', name: '老朋友' }
  ];
  var faSecretStore = function () {
    try { return JSON.parse(localStorage.getItem('fa-secrets') || '{}'); } catch (e) { return {}; }
  };
  window.__faSecretFound = function (id) {
    var store = faSecretStore();
    if (store[id]) return;
    var meta = null;
    for (var i = 0; i < FA_SECRETS.length; i++) if (FA_SECRETS[i].id === id) meta = FA_SECRETS[i];
    if (!meta) return;
    store[id] = true;
    try { localStorage.setItem('fa-secrets', JSON.stringify(store)); } catch (e) {}
    var n = 0; for (var k in store) n++;
    showToast('✦ 发现秘密「' + meta.name + '」 ' + n + '/' + FA_SECRETS.length);
    window.__faSecretRender();
    if (n >= FA_SECRETS.length) {
      showToast('🎉 你找齐了全部七个秘密！');
      window.__faConfetti(document.getElementById('nav-avatar-btn'));
    }
  };
  window.__faSecretRender = function () {
    var box = document.getElementById('avatar-pop-secrets');
    if (!box) return;
    var store = faSecretStore();
    var n = 0;
    var html = FA_SECRETS.map(function (s) {
      var f = !!store[s.id];
      if (f) n++;
      return '<span class="secret-dot' + (f ? ' on' : '') + '" title="' + (f ? s.name : '？？？') + '"></span>';
    }).join('') + '<span class="secret-count">秘密 ' + n + '/' + FA_SECRETS.length + '</span>';
    box.innerHTML = html;
  };
  // minimal gold confetti burst
  window.__faConfetti = function (originEl) {
    var r = originEl ? originEl.getBoundingClientRect() : { left: innerWidth / 2 - 20, top: 60, width: 40, height: 40 };
    var colors = ['#D4A853', '#E9C97F', '#B88D35', '#F4E9D4', '#FEFBF7'];
    for (var i = 0; i < 90; i++) {
      var c = document.createElement('i');
      c.className = 'fa-confetti';
      c.style.left = (r.left + r.width / 2 + (Math.random() * 50 - 25)) + 'px';
      c.style.top = (r.top + r.height / 2) + 'px';
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--fx', (Math.random() * 280 - 140) + 'px');
      c.style.setProperty('--fr', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDelay = (Math.random() * 0.15) + 's';
      document.body.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 2600); })(c);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {

    // Toast container
    if (!document.getElementById('toast')) {
      var toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }

    // Mobile menu
    var menuBtn = document.getElementById('mobile-menu-btn');
    var mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', function () {
        var open = !mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden', open);
        var icon = menuBtn.querySelector('[data-lucide]');
        if (icon) icon.setAttribute('data-lucide', open ? 'menu' : 'x');
        if (typeof lucide !== 'undefined') lucide.createIcons();
      });
    }

    // Back to top + progress ring
    var btt = document.getElementById('back-to-top');
    var ringFg = btt ? btt.querySelector('.ring-fg') : null;
    if (btt) {
      window.addEventListener('scroll', function () {
        var show = window.scrollY > 400;
        btt.classList.toggle('visible', show);
        if (ringFg) {
          var total = document.documentElement.scrollHeight - window.innerHeight;
          var pct = total > 0 ? (window.scrollY / total) * 100 : 0;
          var clamped = Math.min(Math.max(pct, 0), 100);
          ringFg.style.strokeDashoffset = RING_CIRC - (RING_CIRC * clamped / 100);
        }
      });
      btt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    // Reading progress
    var pb = document.querySelector('.reading-progress');
    if (pb) {
      window.addEventListener('scroll', function () {
        var pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        pb.style.setProperty('--progress', Math.min(pct, 100) + '%');
      });
    }

    // Code copy — only wrap once
    document.querySelectorAll('pre').forEach(function (pre) {
      if (pre.parentElement.classList.contains('code-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'code-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(pre.textContent).then(function () {
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
        });
      });
      wrap.appendChild(btn);
    });

    // TOC scroll sync
    var tocLinks = document.querySelectorAll('.toc-box a');
    if (tocLinks.length) {
      var headings = [];
      tocLinks.forEach(function (link) {
        var id = link.getAttribute('href');
        if (!id || id.charAt(0) !== '#') return;
        var h = document.getElementById(id.slice(1));
        if (h) headings.push({ el: h, link: link });
      });
      window.addEventListener('scroll', function () {
        var cur = '';
        headings.forEach(function (item) {
          if (item.el.getBoundingClientRect().top <= 120) cur = item.link.getAttribute('href');
        });
        tocLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === cur);
        });
      });
    }

    // Search
    window.toggleSearch = function () {
      var ov = document.getElementById('search-overlay');
      if (!ov) return;
      ov.classList.toggle('active');
      var inp = ov.querySelector('input');
      if (inp && ov.classList.contains('active')) setTimeout(function () { inp.focus(); }, 100);
    };

    // Lightbox
    var lb = document.getElementById('lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.id = 'lightbox';
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-label', '图片预览');
      lb.innerHTML =
        '<img id="lb-img" src="" alt="">' +
        '<button class="lb-close" aria-label="关闭">✕</button>' +
        '<button class="lb-prev lb-nav" aria-label="上一张">‹</button>' +
        '<button class="lb-next lb-nav" aria-label="下一张">›</button>' +
        '<div class="lb-caption"></div>';
      document.body.appendChild(lb);
    }
    var lbImg = lb.querySelector('#lb-img');
    var lbCaption = lb.querySelector('.lb-caption');
    var lbImages = [];
    var lbIndex = 0;

    function updateLightbox() {
      var img = lbImages[lbIndex];
      if (!img) return;
      lbImg.src = img.getAttribute('src') || img.src;
      lbCaption.textContent = img.alt || '';
    }
    function openLightbox(i) {
      if (!lbImages.length) return;
      lbIndex = i;
      updateLightbox();
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lb.classList.remove('active');
      document.body.style.overflow = '';
    }
    function lbPrev() {
      if (!lbImages.length) return;
      lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
      updateLightbox();
    }
    function lbNext() {
      if (!lbImages.length) return;
      lbIndex = (lbIndex + 1) % lbImages.length;
      updateLightbox();
    }

    var articleImgs = document.querySelectorAll('.article-body img');
    lbImages = Array.prototype.slice.call(articleImgs).filter(function (img) {
      return img.getAttribute('src');
    });
    lbImages.forEach(function (img, i) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () { openLightbox(i); });
    });

    lb.addEventListener('click', function (e) {
      if (e.target === lb) closeLightbox();
    });
    lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
    lb.querySelector('.lb-prev').addEventListener('click', lbPrev);
    lb.querySelector('.lb-next').addEventListener('click', lbNext);

    // Tag group accordion (click toggle; hover handled by CSS)
    document.querySelectorAll('.tag-group-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var group = header.closest('.tag-group');
        if (!group) return;
        var willOpen = !group.classList.contains('open');
        group.classList.toggle('open', willOpen);
        header.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });

    // Keyboard: escape / search hotkey / post nav / lightbox nav
    document.addEventListener('keydown', function (e) {
      var lbActive = lb && lb.classList.contains('active');
      if (e.key === 'Escape') {
        if (lbActive) closeLightbox();
        var ov = document.getElementById('search-overlay');
        if (ov && ov.classList.contains('active')) ov.classList.remove('active');
        return;
      }
      if (lbActive) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); lbPrev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); lbNext(); }
        return;
      }
      if (e.key === '/' && document.activeElement === document.body) {
        e.preventDefault();
        window.toggleSearch();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        var ae = document.activeElement;
        var tag = ae ? ae.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (ae && ae.isContentEditable)) return;
        if (e.key === 'ArrowLeft') {
          var p = document.getElementById('post-prev');
          if (p) { e.preventDefault(); p.click(); }
        } else {
          var n = document.getElementById('post-next');
          if (n) { e.preventDefault(); n.click(); }
        }
      }
    });

    // Style-theme (鲸蓝 whale / 素瓷 porcelain) + light-dark mode switcher.
    // Buttons carry data-style-btn / data-mode-toggle so desktop and mobile
    // variants bind identically; re-run after pjax via InstantClick hook.
    window.__faTheme = function () {
      var root = document.documentElement;
      function curStyle() { return root.getAttribute('data-style') === 'porcelain' ? 'porcelain' : 'whale'; }
      function syncMeta() {
        var m = document.querySelector('meta[name="theme-color"]');
        var v = getComputedStyle(root).getPropertyValue('--fa-theme-color').trim();
        if (m && v) m.setAttribute('content', v);
      }
      function paint() {
        var s = curStyle();
        var isDark = root.classList.contains('dark');
        document.querySelectorAll('[data-style-btn]').forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-style-btn') === s ? 'true' : 'false');
        });
        document.querySelectorAll('[data-mode-icon]').forEach(function (i) {
          i.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        });
        if (window.lucide) lucide.createIcons();
        syncMeta();
      }
      function applyMode(isDark) {
        root.classList.toggle('dark', isDark);
        try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
      }
      function setStyle(name) {
        if (name === 'whale') root.removeAttribute('data-style');
        else root.setAttribute('data-style', name);
        try { localStorage.setItem('fa-style', name); } catch (e) {}
        // signature look per brand: 素瓷 → OpenAI's charcoal dark · 鲸蓝 → DeepSeek's cool light
        applyMode(name === 'porcelain');
        paint();
      }
      function toggleMode() {
        applyMode(!root.classList.contains('dark'));
        paint();
      }
      document.querySelectorAll('[data-style-btn]').forEach(function (b) {
        if (b.dataset.faBound) return;
        b.dataset.faBound = '1';
        b.addEventListener('click', function () { setStyle(b.getAttribute('data-style-btn')); });
      });
      document.querySelectorAll('[data-mode-toggle]').forEach(function (b) {
        if (b.dataset.faBound) return;
        b.dataset.faBound = '1';
        b.addEventListener('click', toggleMode);
      });
      paint();
    };
    window.__faTheme();

    // Editorial masthead date + global scroll progress hairline.
    // Exposed as window.__faWidgets so InstantClick's 'change' hook can
    // re-run it after pjax swaps the navbar DOM.
    window.__faWidgets = function () {
      var d = document.getElementById('nav-date');
      if (d) {
        var now = new Date();
        var weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        var sep = '<span class="nav-date-sep">·</span>';
        d.innerHTML = now.getFullYear() + sep + pad(now.getMonth() + 1) + sep + pad(now.getDate()) + sep + weeks[now.getDay()];
      }
      var bar = document.getElementById('nav-progress');
      if (bar && !bar.dataset.bound) {
        bar.dataset.bound = '1';
        var ticking = false;
        var update = function () {
          ticking = false;
          var max = document.documentElement.scrollHeight - window.innerHeight;
          var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
          bar.style.transform = 'scaleX(' + p + ')';
        };
        window.addEventListener('scroll', function () {
          if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();
      }
    };
    // Navbar avatar — hover zoom (pure CSS) + click-to-open profile card.
    // Shared open/close helper so pjax-swapped DOM stays consistent.
    window.__faAvatarSet = function (open) {
      var btn = document.getElementById('nav-avatar-btn');
      var card = document.getElementById('avatar-pop-card');
      var title = document.getElementById('nav-site-title');
      if (card) card.classList.toggle('open', open);
      if (btn) {
        btn.classList.toggle('active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      // Yield room to the enlarged avatar so it never covers the site title.
      if (title) title.classList.toggle('avatar-yield', open);
      // Lazy-load busuanzi visit counter on first open only.
      if (open && !window.__faBusuanzi) {
        window.__faBusuanzi = true;
        var s = document.createElement('script');
        s.async = true;
        s.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
        document.body.appendChild(s);
      }
      // Secrets: first open / night owl / regular visitor + render dots
      if (open) {
        var opens = 0;
        try {
          opens = (parseInt(localStorage.getItem('fa-card-opens') || '0', 10) || 0) + 1;
          localStorage.setItem('fa-card-opens', String(opens));
        } catch (e) { opens = 1; }
        window.__faSecretFound('first');
        var h = new Date().getHours();
        if (h < 5) window.__faSecretFound('night');
        if (opens >= 10) window.__faSecretFound('regular');
        window.__faSecretRender();
      }
    };
    window.__faAvatar = function () {
      var btn = document.getElementById('nav-avatar-btn');
      var card = document.getElementById('avatar-pop-card');
      if (!btn || !card || btn.dataset.faBound) return;
      btn.dataset.faBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        // Secret: combo — 5 clicks within 30s
        btn._clicks = (btn._clicks || []).filter(function (t) { return Date.now() - t < 30000; });
        btn._clicks.push(Date.now());
        if (btn._clicks.length >= 5) {
          btn._clicks = [];
          window.__faConfetti(btn);
          window.__faSecretFound('combo');
        }
        window.__faAvatarSet(!card.classList.contains('open'));
      });
      // Secret: fur — rest the cursor on the avatar for 3 seconds
      btn.addEventListener('pointerenter', function () {
        clearTimeout(btn._furTimer);
        btn._furTimer = setTimeout(function () { window.__faSecretFound('fur'); }, 3000);
      });
      btn.addEventListener('pointerleave', function () { clearTimeout(btn._furTimer); });
      card.addEventListener('click', function (e) { e.stopPropagation(); });
    };
    // Document-level dismiss (outside click / ESC) — bound once, resolves
    // the current card at event time so pjax-swapped DOM stays correct.
    if (!window.__faAvatarDismiss) {
      window.__faAvatarDismiss = true;
      var dismiss = function () { window.__faAvatarSet(false); };
      document.addEventListener('click', dismiss);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { dismiss(); return; }
        // Secret: keyboard — press "A" to toggle the card
        if (e.key === 'a' || e.key === 'A') {
          var t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          var c = document.getElementById('avatar-pop-card');
          if (!c) return;
          window.__faSecretFound('key');
          window.__faAvatarSet(!c.classList.contains('open'));
        }
      });
      // "Fur-stroke" halo — the gold ring leans toward the nearby cursor
      // (simplified homage to Josh Comeau's rainbow header).
      var furRAF = null;
      document.addEventListener('mousemove', function (e) {
        if (furRAF) return;
        furRAF = requestAnimationFrame(function () {
          furRAF = null;
          var b = document.getElementById('nav-avatar-btn');
          if (!b || b.classList.contains('active')) return;
          var r = b.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          var d = Math.sqrt(dx * dx + dy * dy);
          var range = 200;
          if (d > range || d < 1) {
            b.style.setProperty('--fur-x', '0');
            b.style.setProperty('--fur-y', '0');
            return;
          }
          var f = 1 - d / range;
          b.style.setProperty('--fur-x', (dx / d * f).toFixed(3));
          b.style.setProperty('--fur-y', (dy / d * f).toFixed(3));
        });
      }, { passive: true });
    }
    window.__faAvatar();

    window.__faWidgets();

  });
})();
