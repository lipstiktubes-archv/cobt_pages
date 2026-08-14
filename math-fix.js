(() => {
  'use strict';

  function renderMath(root) {
    if (!root || typeof window.katex?.render !== 'function') return;

    root.querySelectorAll('.math-block').forEach((block) => {
      if (block.dataset.mathRendered === '1') return;
      const source = block.querySelector('pre')?.textContent ?? block.textContent ?? '';
      block.dataset.mathRendered = '1';
      block.textContent = '';
      try {
        window.katex.render(source, block, {
          displayMode: true,
          throwOnError: false,
          trust: false,
          strict: 'warn'
        });
      } catch {
        block.textContent = source;
      }
    });

    root.querySelectorAll('.math-inline').forEach((span) => {
      if (span.dataset.mathRendered === '1') return;
      const source = span.textContent ?? '';
      span.dataset.mathRendered = '1';
      span.textContent = '';
      try {
        window.katex.render(source, span, {
          displayMode: false,
          throwOnError: false,
          trust: false,
          strict: 'warn'
        });
      } catch {
        span.textContent = source;
      }
    });

    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        throwOnError: false,
        trust: false,
        strict: 'warn'
      });
    }
  }

  function install() {
    const root = document.getElementById('content');
    if (!root) return;

    let scheduled = false;
    const scheduleRender = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        renderMath(root);
      });
    };

    const observer = new MutationObserver(scheduleRender);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    renderMath(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
