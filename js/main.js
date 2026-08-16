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

  });
})();
