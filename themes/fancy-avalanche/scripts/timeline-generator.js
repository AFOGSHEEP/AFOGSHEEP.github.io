'use strict';

// 时间轴页面：受 theme.components.timeline 开关控制
hexo.extend.generator.register('timeline', function (locals) {
  const theme = hexo.config.theme_config || hexo.theme.config || {};
  const components = theme.components || {};
  if (!components.timeline) return [];

  return [{
    path: 'timeline/index.html',
    layout: ['timeline'],
    data: {
      title: theme.timeline_title || '时间轴',
      type: 'timeline'
    }
  }];
});
