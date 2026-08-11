(() => {
'use strict';

const KATEX_OPTIONS = {
  throwOnError: false,
  trust: false,
  strict: 'warn'
};

function renderTaggedMath(root) {
  if (!root || typeof window.katex?.render !== 'function') return;

  root.querySelectorAll('.math-inline:not([data-math-rendered])').forEach((node) => {
    const tex = node.textContent || '';
    node.dataset.mathRendered = '1';
    try {
      window.katex.render(tex, node, { ...KATEX_OPTIONS, displayMode: false });
    } catch {
      node.textContent = tex;
      node.dataset.mathError = '1';
    }
  });

  root.querySelectorAll('.math-block:not([data-math-rendered])').forEach((node) => {
    const source = node.querySelector('pre');
    const tex = source?.textContent || node.textContent || '';
    node.dataset.mathRendered = '1';
    node.replaceChildren();
    try {
      window.katex.render(tex, node, { ...KATEX_OPTIONS, displayMode: true });
    } catch {
      const fallback = document.createElement('pre');
      fallback.textContent = tex;
      node.appendChild(fallback);
      node.dataset.mathError = '1';
    }
  });
}

function renderDelimiterMath(root) {
  if (!root || typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
    throwOnError: false,
    trust: false,
    strict: 'warn'
  });
}

function renderMath(root) {
  renderTaggedMath(root);
  renderDelimiterMath(root);
}

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('content');
  if (!content) return;

  let scheduled = false;
  const scheduleRender = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      renderMath(content);
    });
  };

  const observer = new MutationObserver(scheduleRender);
  observer.observe(content, { childList: true, subtree: true, characterData: true });
  scheduleRender();
});
})();
