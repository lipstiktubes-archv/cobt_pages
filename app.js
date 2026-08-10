const encoder = new TextEncoder();
const decoder = new TextDecoder();
const AAD_TEXT = 'CONNECTBETWEEN_VAULT_V1';
const AAD = encoder.encode(AAD_TEXT);

let vault = null;
let currentMarkdown = '';
let toastTimer = null;
const el = {};

window.addEventListener('DOMContentLoaded', () => {
  Object.assign(el, {
    lockScreen: document.getElementById('lockScreen'),
    unlockForm: document.getElementById('unlockForm'),
    passphrase: document.getElementById('passphrase'),
    unlockStatus: document.getElementById('unlockStatus'),
    appShell: document.getElementById('appShell'),
    sidebar: document.getElementById('sidebar'),
    vaultTitle: document.getElementById('vaultTitle'),
    docNav: document.getElementById('docNav'),
    docTitle: document.getElementById('docTitle'),
    docMeta: document.getElementById('docMeta'),
    content: document.getElementById('content'),
    copyRaw: document.getElementById('copyRaw'),
    copyText: document.getElementById('copyText'),
    lockButton: document.getElementById('lockButton'),
    themeToggle: document.getElementById('themeToggle'),
    menuToggle: document.getElementById('menuToggle'),
    toast: document.getElementById('toast')
  });

  applySavedTheme();
  el.unlockForm.addEventListener('submit', unlockVault);
  el.copyRaw.addEventListener('click', () => copyText(currentMarkdown, 'Markdown 원문을 복사했습니다.'));
  el.copyText.addEventListener('click', () => copyText(el.content.innerText, '표시 텍스트를 복사했습니다.'));
  el.lockButton.addEventListener('click', lockVault);
  el.menuToggle.addEventListener('click', () => el.sidebar.classList.toggle('open'));
  el.themeToggle.addEventListener('click', toggleTheme);
});

function applySavedTheme() {
  const saved = localStorage.getItem('cb-theme');
  const fallback = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = saved || fallback;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('cb-theme', next);
}

function showToast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add('show');
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1500);
}

async function copyText(text, message) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast('복사 권한을 사용할 수 없습니다.');
  }
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase, envelope) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: envelope.kdf.hash,
      salt: fromBase64(envelope.kdf.salt),
      iterations: envelope.kdf.iterations
    },
    material,
    { name: 'AES-GCM', length: envelope.cipher.keyLength },
    false,
    ['decrypt']
  );
}

function validateEnvelope(envelope) {
  if (!envelope || envelope.version !== 1) throw new Error('지원하지 않는 vault 형식입니다.');
  if (envelope.kdf?.name !== 'PBKDF2' || envelope.kdf?.hash !== 'SHA-256') throw new Error('지원하지 않는 KDF입니다.');
  if (envelope.cipher?.name !== 'AES-GCM' || envelope.cipher?.keyLength !== 256) throw new Error('지원하지 않는 암호 형식입니다.');
  if (envelope.cipher?.aad !== AAD_TEXT) throw new Error('Vault 식별자가 올바르지 않습니다.');
  if (!Number.isInteger(envelope.kdf.iterations) || envelope.kdf.iterations < 100000 || envelope.kdf.iterations > 5000000) throw new Error('KDF 반복 횟수가 올바르지 않습니다.');
  if (!envelope.kdf.salt || !envelope.cipher.iv || !envelope.ciphertext) throw new Error('Vault 데이터가 불완전합니다.');
}

function validateVault(payload) {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.documents) || payload.documents.length === 0) throw new Error('복호화된 문서 형식이 올바르지 않습니다.');
  for (const doc of payload.documents) {
    if (!doc.id || !doc.title || typeof doc.markdown !== 'string') throw new Error('문서 데이터가 불완전합니다.');
  }
}

async function unlockVault(event) {
  event.preventDefault();
  const passphrase = el.passphrase.value;
  if (!passphrase) return;
  el.unlockStatus.textContent = '암호화 문서를 여는 중입니다…';
  const submit = el.unlockForm.querySelector('button[type="submit"]');
  submit.disabled = true;

  try {
    const response = await fetch('./vault.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('vault.json을 불러올 수 없습니다.');
    const envelope = await response.json();
    validateEnvelope(envelope);
    const key = await deriveKey(passphrase, envelope);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(envelope.cipher.iv),
        additionalData: AAD,
        tagLength: envelope.cipher.tagLength || 128
      },
      key,
      fromBase64(envelope.ciphertext)
    );
    const payload = JSON.parse(decoder.decode(plaintext));
    validateVault(payload);
    vault = payload;
    el.passphrase.value = '';
    el.unlockStatus.textContent = '';
    openVault();
  } catch (error) {
    el.passphrase.value = '';
    el.passphrase.focus();
    el.unlockStatus.textContent = error?.name === 'OperationError'
      ? '암호가 맞지 않거나 vault가 손상되었습니다.'
      : error.message;
  } finally {
    submit.disabled = false;
  }
}

function openVault() {
  el.vaultTitle.textContent = vault.title || 'ConnectBetween';
  el.docNav.replaceChildren();
  for (const doc of vault.documents) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'doc-link';
    button.dataset.docId = doc.id;
    const title = document.createElement('span');
    title.textContent = doc.title;
    button.appendChild(title);
    if (doc.description) {
      const small = document.createElement('small');
      small.textContent = doc.description;
      button.appendChild(small);
    }
    button.addEventListener('click', () => renderDocument(doc.id));
    el.docNav.appendChild(button);
  }
  el.lockScreen.classList.add('hidden');
  el.appShell.classList.remove('hidden');
  renderDocument(vault.documents[0].id);
}

function lockVault() {
  vault = null;
  currentMarkdown = '';
  el.content.replaceChildren();
  el.docNav.replaceChildren();
  el.docTitle.textContent = '문서';
  el.docMeta.textContent = '';
  el.sidebar.classList.remove('open');
  el.appShell.classList.add('hidden');
  el.lockScreen.classList.remove('hidden');
  el.passphrase.value = '';
  el.unlockStatus.textContent = '';
  el.passphrase.focus();
}

function renderDocument(id) {
  const doc = vault?.documents.find((item) => item.id === id);
  if (!doc) return;
  currentMarkdown = doc.markdown;
  el.docTitle.textContent = doc.title;
  el.docMeta.textContent = vault.updatedAt ? `vault updated: ${new Date(vault.updatedAt).toLocaleString()}` : '';
  document.querySelectorAll('.doc-link').forEach((button) => button.classList.toggle('active', button.dataset.docId === id));
  el.content.innerHTML = markdownToHtml(doc.markdown);
  decorateCodeBlocks();
  renderMath();
  el.sidebar.classList.remove('open');
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function renderInline(source) {
  const codeTokens = [];
  let text = String(source).replace(/`([^`]+)`/g, (_, code) => {
    const token = `CBINLINECODE${codeTokens.length}TOKEN`;
    codeTokens.push(code);
    return token;
  });
  text = escapeHtml(text);
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  codeTokens.forEach((code, index) => { text = text.replace(`CBINLINECODE${index}TOKEN`, `<code>${escapeHtml(code)}</code>`); });
  return text;
}

function isTableDivider(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((x) => x.trim());
  return cells.length > 0 && cells.every((x) => /^:?-{3,}:?$/.test(x));
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((x) => x.trim());
}

function markdownToHtml(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim() || 'code';
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) { code.push(lines[i]); i += 1; }
      if (i < lines.length) i += 1;
      out.push(`<div class="code-shell"><div class="code-toolbar"><span>${escapeHtml(language)}</span><button class="code-copy" type="button">복사</button></div><pre><code data-language="${escapeHtml(language)}">${escapeHtml(code.join('\n'))}</code></pre></div>`);
      continue;
    }
    if (!line.trim()) { i += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { const level = heading[1].length; out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`); i += 1; continue; }
    if (line.trim().startsWith('> ')) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) { quote.push(lines[i].trim().slice(2)); i += 1; }
      out.push(`<blockquote>${quote.map(renderInline).join('<br>')}</blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i += 1; }
      out.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i += 1; }
      out.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`);
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(splitTableRow(lines[i])); i += 1; }
      const headHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
      const bodyHtml = rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
      continue;
    }
    const paragraph = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim()) {
      const next = lines[i];
      if (/^```/.test(next.trim()) || /^(#{1,6})\s+/.test(next) || next.trim().startsWith('> ') || /^\s*[-*+]\s+/.test(next) || /^\s*\d+\.\s+/.test(next)) break;
      if (next.includes('|') && i + 1 < lines.length && isTableDivider(lines[i + 1])) break;
      paragraph.push(next.trim());
      i += 1;
    }
    out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }
  return out.join('\n');
}

function decorateCodeBlocks() {
  el.content.querySelectorAll('.code-copy').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.closest('.code-shell')?.querySelector('code')?.textContent || '';
      copyText(code, '코드를 복사했습니다.');
    });
  });
}

function renderMath() {
  if (typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(el.content, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false }
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    throwOnError: false,
    trust: false,
    strict: 'warn',
    maxExpand: 1000
  });
}
