// Trimmed search index — generated once at build time, fetched on demand.
// Replaces the ~30KB inline __SD payload that used to ship in every page.
hexo.extend.generator.register('trimmed-search', function (locals) {
  var strip = function (html) { return String(html || '').replace(/<[^>]+>/g, ''); };
  var sd = locals.posts.sort('-date').map(function (p) {
    return {
      t: p.title,
      u: '/' + p.path,
      e: strip(p.excerpt).slice(0, 120),
      c: strip(p.content).slice(0, 500),
      d: p.date.format('YYYY-MM-DD')
    };
  });
  return { path: 'search.json', data: JSON.stringify(sd) };
});
