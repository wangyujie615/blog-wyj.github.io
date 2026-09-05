'use strict';

const fs = require('hexo-fs');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Preserve Mermaid fences before Hexo's syntax highlighter turns them into
// anonymous plaintext blocks. The browser renderer consumes the text content.
hexo.extend.filter.register('before_post_render', function preserveMermaid(data) {
  if (!data.content) return data;

  data.content = data.content.replace(
    /^[ \t]*```[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*$/gim,
    (_, diagram) => `<div class="mermaid">${escapeHtml(diagram.trim())}</div>`
  );
  return data;
}, 1);

// Serve Mermaid from node_modules so diagrams also work without a CDN.
hexo.extend.generator.register('mermaid-browser-bundle', function mermaidBundle() {
  const bundlePath = require.resolve('mermaid/dist/mermaid.min.js');
  return {
    path: 'js/vendor/mermaid.min.js',
    data: { data: () => fs.createReadStream(bundlePath) }
  };
});

