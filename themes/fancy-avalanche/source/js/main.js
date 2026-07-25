// Fancy Avalanche — Global Scripts
document.addEventListener('DOMContentLoaded', function () {

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

  // Back to top
  var btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', function () {
      btt.classList.toggle('visible', window.scrollY > 400);
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
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); window.toggleSearch(); }
    if (e.key === 'Escape') { var ov = document.getElementById('search-overlay'); if (ov && ov.classList.contains('active')) ov.classList.remove('active'); }
  });

});
