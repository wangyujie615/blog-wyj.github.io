'use strict';

const path = require('path');
const fs = require('fs');
const { parse } = require('hexo-front-matter');

const SOURCE_NOTE_PATTERN = /^(?!_posts\/|_drafts\/)(?!.*(?:^|\/)[_.])(.+)\.(md|markdown)$/i;

function asArray(value) {
  if (value == null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function unique(values) {
  return [...new Set(values.map(String).map(item => item.trim()).filter(Boolean))];
}

function parseNote(raw) {
  const normalized = raw.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { _content: raw };
  }

  try {
    return parse(raw);
  } catch (error) {
    hexo.log.warn('忽略无效 Front Matter，按普通 Markdown 读取：%s', error.message);
    return { _content: raw };
  }
}

let assetIndex;

function buildAssetIndex(sourceDir) {
  const index = new Map();
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_')) visit(fullPath);
      } else {
        const relativePath = path.relative(sourceDir, fullPath).replace(/\\/g, '/');
        const key = entry.name.toLowerCase();
        if (!index.has(key)) index.set(key, relativePath);
      }
    }
  };
  visit(sourceDir);
  return index;
}

function rewriteLocalImages(content, noteSource, sourceDir) {
  if (!assetIndex) assetIndex = buildAssetIndex(sourceDir);
  const noteDirectory = path.posix.dirname(noteSource);

  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, targetWithTitle) => {
    const target = targetWithTitle.trim().split(/\s+["']/)[0].replace(/\\/g, '/');
    if (/^(?:https?:|data:|\/|#)/i.test(target)) return match;

    const basename = path.posix.basename(target).toLowerCase();
    let relativeAsset;

    if (!/^[a-z]:\//i.test(target)) {
      const direct = path.posix.normalize(path.posix.join(noteDirectory, target));
      if (fs.existsSync(path.join(sourceDir, ...direct.split('/')))) relativeAsset = direct;
    }

    if (!relativeAsset) relativeAsset = assetIndex.get(basename);
    if (!relativeAsset || /\.(?:md|markdown)$/i.test(relativeAsset)) return match;

    return `![${alt}](/${relativeAsset.split('/').map(encodeURIComponent).join('/')})`;
  });
}

hexo.extend.processor.register(SOURCE_NOTE_PATTERN, async function importSourceNote(file) {
  const Post = this.model('Post');
  const Page = this.model('Page');
  const Asset = this.model('Asset');
  const source = file.path.replace(/\\/g, '/');
  const existingPost = Post.findOne({ source });

  // The built-in source processor sees these Markdown files as standalone pages.
  // Remove that duplicate because the same file is represented as a blog post here.
  const duplicatePage = Page.findOne({ source });
  if (duplicatePage) await duplicatePage.remove();
  const duplicateAsset = Asset.findById(`source/${source}`);
  if (duplicateAsset) await duplicateAsset.remove();

  if (file.type === 'delete') {
    if (existingPost) await existingPost.remove();
    return;
  }

  if (file.type === 'skip' && existingPost) return;

  const [stats, raw] = await Promise.all([file.stat(), file.read()]);
  const frontMatter = parseNote(raw);
  frontMatter._content = rewriteLocalImages(frontMatter._content || '', source, this.source_dir);
  const extension = path.posix.extname(source);
  const withoutExtension = source.slice(0, -extension.length);
  const directoryNames = path.posix.dirname(source).split('/').filter(name => name && name !== '.');
  const filename = path.posix.basename(withoutExtension);
  const inferredTitle = /^readme$/i.test(filename) && directoryNames.length
    ? directoryNames[directoryNames.length - 1]
    : filename;

  const frontMatterTags = asArray(frontMatter.tags || frontMatter.tag);
  const folderTags = directoryNames.filter(name => name.toLowerCase() !== 'img');
  const tags = unique([...folderTags, ...frontMatterTags]);
  const date = frontMatter.date ? new Date(frontMatter.date) : stats.birthtime;
  const updated = frontMatter.updated ? new Date(frontMatter.updated) : stats.mtime;

  const data = {
    ...frontMatter,
    title: frontMatter.title || inferredTitle,
    source,
    raw,
    slug: withoutExtension.replace(/\//g, '-'),
    date: Number.isNaN(date.getTime()) ? stats.birthtime : date,
    updated: Number.isNaN(updated.getTime()) ? stats.mtime : updated,
    published: frontMatter.published !== false,
    layout: 'post'
  };

  delete data.tag;
  delete data.tags;

  const post = existingPost ? await existingPost.replace(data) : await Post.insert(data);
  await post.setTags(tags);
});
