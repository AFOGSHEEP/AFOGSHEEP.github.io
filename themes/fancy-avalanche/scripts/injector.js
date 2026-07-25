// Fancy Avalanche Theme — Injector
// Controls which components are loaded on which pages

(function () {
  var theme = hexo.config.theme_config || hexo.theme.config || {};
  var components = theme.components || {};
  var effects = theme.effects || {};

  // Register background script
  hexo.extend.injector.register('body_end', function () {
    var bg = theme.background || {};
    if (bg.type === 'canvas' || bg.type === 'three') {
      return '<script src="/js/background.js"></script>';
    }
    return '';
  });

  // Inject custom CSS from theme config
  if (theme.custom && theme.custom.css && theme.custom.css.length > 0) {
    hexo.extend.injector.register('head_end', function () {
      return theme.custom.css.map(function (p) {
        return '<link rel="stylesheet" href="' + p + '">';
      }).join('\n');
    });
  }

  // Inject custom JS from theme config
  if (theme.custom && theme.custom.js && theme.custom.js.length > 0) {
    hexo.extend.injector.register('body_end', function () {
      return theme.custom.js.map(function (p) {
        return '<script src="' + p + '"></script>';
      }).join('\n');
    });
  }

  // Inject Google Analytics / Baidu Tongji if configured
  if (theme.seo && theme.seo.google_analytics) {
    hexo.extend.injector.register('head_end', function () {
      return '<!-- Google Analytics would go here -- config: ' + theme.seo.google_analytics + ' -->';
    });
  }

})();
