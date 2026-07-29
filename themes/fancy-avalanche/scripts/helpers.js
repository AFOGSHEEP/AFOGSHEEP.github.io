// Fancy Avalanche Theme — Helpers
const { config, theme } = hexo;

// Format date
hexo.extend.helper.register('format_date', function (date, format) {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (format === 'date') return `${y}-${m}-${day}`;
  if (format === 'year') return String(y);
  if (format === 'month') return `${y}-${m}`;
  return `${y}-${m}-${day}`;
});

// Reading time estimate
hexo.extend.helper.register('reading_time', function (content) {
  if (!content) return '1 min';
  const speed = theme.misc && theme.misc.reading_speed ? theme.misc.reading_speed : 300;
  // Strip HTML tags
  const text = content.replace(/<[^>]+>/g, '');
  // Count Chinese chars + words
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(Boolean).length;
  const total = chineseChars + englishWords;
  const minutes = Math.max(1, Math.ceil(total / speed));
  return minutes + ' min';
});

// Word count
hexo.extend.helper.register('word_count', function (content) {
  if (!content) return 0;
  const text = content.replace(/<[^>]+>/g, '');
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(Boolean).length;
  return chineseChars + englishWords;
});

// Truncate excerpt
hexo.extend.helper.register('truncate_excerpt', function (content, length) {
  if (!content) return '';
  const text = content.replace(/<[^>]+>/g, '');
  const limit = length || 200;
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
});

// Background config resolver
hexo.extend.helper.register('get_background_config', function (page) {
  const bg = theme.background || {};
  // Check page-specific override
  if (page && page.background) {
    return Object.assign({}, bg, page.background);
  }
  // Check category-specific override
  if (page && page.categories && page.categories.length > 0 && theme.category_backgrounds) {
    const catName = page.categories.data
      ? page.categories.data[0].name
      : (typeof page.categories[0] === 'object' ? page.categories[0].name : page.categories[0]);
    if (theme.category_backgrounds[catName]) {
      return Object.assign({}, bg, theme.category_backgrounds[catName]);
    }
  }
  return bg;
});

// Get post cover image
hexo.extend.helper.register('post_cover', function (post) {
  if (!post) return '';
  var cover = post.cover || post.thumbnail || (post.photos && post.photos.length > 0 ? post.photos[0] : null);
  // Resolve relative paths against post URL
  if (cover && !/^(https?:|\/)/i.test(cover)) {
    var postDir = (post.path || '').replace(/index\.html?$/, '').replace(/\/$/, '');
    if (postDir) cover = '/' + postDir + '/' + cover;
  }
  if (cover) return cover;
  // Check for first image in content
  if (post.content) {
    const imgMatch = post.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
  }
  return '';
});
