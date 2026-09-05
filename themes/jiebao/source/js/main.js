(() => {
  const header = document.querySelector('#site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  const themeToggle = document.querySelector('.theme-toggle');
  const typewriterTitle = document.querySelector('[data-typewriter]');

  if (typewriterTitle) {
    const typewriterText = typewriterTitle.dataset.typewriter || typewriterTitle.textContent;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      typewriterTitle.textContent = typewriterText;
      typewriterTitle.classList.add('is-complete');
    } else {
      typewriterTitle.textContent = '';
      let characterIndex = 0;
      const typeNextCharacter = () => {
        typewriterTitle.textContent = typewriterText.slice(0, characterIndex += 1);
        if (characterIndex < typewriterText.length) {
          window.setTimeout(typeNextCharacter, characterIndex < 7 ? 105 : 62);
        } else {
          typewriterTitle.classList.add('is-complete');
        }
      };
      window.setTimeout(typeNextCharacter, 380);
    }
  }

  if (themeToggle) {
    themeToggle.setAttribute(
      'aria-label',
      document.documentElement.dataset.theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'
    );
  }

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  toggle?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
  }));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

  document.querySelectorAll('.article-content table').forEach(table => {
    if (table.closest('figure.highlight') || table.parentElement?.classList.contains('table-wrap')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrap';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', '可横向滚动的数据表格');
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  const searchInput = document.querySelector('#article-search');
  const clearSearch = document.querySelector('#clear-search');
  const resultCount = document.querySelector('#article-result-count');
  const searchEmpty = document.querySelector('#search-empty');
  const articleCards = [...document.querySelectorAll('#article-results .post-card')];
  const tagFilters = [...document.querySelectorAll('.tag-filter')];
  let activeTag = '';

  const filterArticles = () => {
    const keyword = (searchInput?.value || '').trim().toLocaleLowerCase();
    let visibleCount = 0;

    articleCards.forEach(card => {
      const tags = (card.dataset.tags || '').split('|').filter(Boolean);
      const matchesKeyword = !keyword || (card.dataset.search || '').includes(keyword);
      const matchesTag = !activeTag || tags.includes(activeTag);
      const visible = matchesKeyword && matchesTag;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    if (resultCount) resultCount.textContent = String(visibleCount);
    if (searchEmpty) searchEmpty.hidden = visibleCount !== 0;
    clearSearch?.classList.toggle('is-visible', Boolean(keyword));
  };

  searchInput?.addEventListener('input', filterArticles);
  clearSearch?.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    filterArticles();
  });
  tagFilters.forEach(button => button.addEventListener('click', () => {
    activeTag = button.dataset.filterTag || '';
    tagFilters.forEach(item => item.classList.toggle('is-active', item === button));
    filterArticles();
    document.querySelector('.search-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  const copyText = async text => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  document.querySelectorAll('.article-content figure.highlight, .article-content pre:not(.mermaid)').forEach(block => {
    if (block.closest('.mermaid')) return;
    if (block.matches('pre') && block.closest('figure.highlight')) return;
    const button = document.createElement('button');
    button.className = 'copy-code';
    button.type = 'button';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    button.addEventListener('click', async () => {
      const code = block.matches('figure') ? block.querySelector('.code pre') : block.querySelector('code') || block;
      try {
        await copyText(code?.textContent || '');
        button.textContent = '已复制 ✓';
      } catch (_) {
        button.textContent = '复制失败';
      }
      setTimeout(() => { button.textContent = '复制'; }, 1600);
    });
    block.appendChild(button);
  });

  const renderMermaid = async () => {
    if (!window.mermaid || !document.querySelector('.mermaid')) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    window.mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'DM Sans, Noto Sans SC, sans-serif'
    });
    document.querySelectorAll('.mermaid').forEach(diagram => {
      if (!diagram.dataset.source) diagram.dataset.source = diagram.textContent.trim();
      diagram.removeAttribute('data-processed');
      diagram.textContent = diagram.dataset.source;
    });
    try {
      await window.mermaid.run({ querySelector: '.mermaid' });
    } catch (error) {
      console.error('Mermaid render failed:', error);
    }
  };

  themeToggle?.addEventListener('click', async () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('jiebao-theme', next); } catch (_) {}
    themeToggle.setAttribute('aria-label', next === 'dark' ? '切换为浅色模式' : '切换为深色模式');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#0b0f14' : '#f4f1ea');
    await renderMermaid();
  });

  renderMermaid();

  const tocLinks = [...document.querySelectorAll('.toc-link')];
  const tocTargets = tocLinks
    .map(link => {
      try {
        const id = decodeURIComponent(link.hash.slice(1));
        link.dataset.targetId = id;
        return document.getElementById(id);
      } catch (_) { return null; }
    })
    .filter(Boolean);

  if (tocTargets.length) {
    const tocObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const activeId = visible[0].target.id;
      tocLinks.forEach(link => link.classList.toggle('is-active', link.dataset.targetId === activeId));
    }, { rootMargin: '-90px 0px -70% 0px' });
    tocTargets.forEach(target => tocObserver.observe(target));
  }
})();
