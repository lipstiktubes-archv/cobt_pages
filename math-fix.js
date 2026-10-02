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
        // KaTeX output (including its source annotations and error text) is
        // already processed. Re-entering it can repeatedly expand the DOM.
        ignoredClasses: ['katex', 'katex-display', 'katex-error', 'math-block', 'math-inline'],
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
    const observeOptions = { childList: true, subtree: true, characterData: true };
    const renderWithoutObserving = () => {
      // Rendering changes the DOM itself. Those changes must not schedule
      // another rendering pass, even when a formula cannot be parsed.
      observer.disconnect();
      try {
        renderMath(root);
      } finally {
        observer.observe(root, observeOptions);
      }
    };
    const scheduleRender = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        renderWithoutObserving();
      });
    };

    const observer = new MutationObserver(scheduleRender);
    renderWithoutObserving();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
