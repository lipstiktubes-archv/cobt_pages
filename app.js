(() => {
'use strict';
const enc=new TextEncoder(),dec=new TextDecoder(),AAD_TEXT='CONNECTBETWEEN_LINK_V2',AAD=enc.encode(AAD_TEXT);
let vault=null,currentMarkdown='',toastTimer=null; const el={};
window.addEventListener('DOMContentLoaded',()=>{
  for(const id of ['lockScreen','lockMessage','unlockForm','secretKey','unlockStatus','appShell','sidebar','vaultTitle','docNav','docTitle','docMeta','content','copyRaw','copyText','lockButton','themeToggle','menuToggle','toast']) el[id]=document.getElementById(id);
  applyTheme();
  el.unlockForm.addEventListener('submit',e=>{e.preventDefault();const s=el.secretKey.value.trim();if(s)unlock(s);});
  el.copyRaw.addEventListener('click',()=>copy(currentMarkdown,'Markdown 원문을 복사했습니다.'));
  el.copyText.addEventListener('click',()=>copy(el.content.innerText,'표시 텍스트를 복사했습니다.'));
  el.lockButton.addEventListener('click',lock);
  el.menuToggle.addEventListener('click',()=>el.sidebar.classList.toggle('open'));
  el.themeToggle.addEventListener('click',toggleTheme);
  const m=(location.hash||'').match(/^#key=([A-Za-z0-9_-]{43})$/);
  if(m){el.lockMessage.textContent='비밀 링크를 확인했습니다. 문서를 여는 중입니다…';unlock(m[1]);}
});
function applyTheme(){const s=localStorage.getItem('cb-theme');document.documentElement.dataset.theme=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}
function toggleTheme(){const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('cb-theme',n);}
function toast(msg){clearTimeout(toastTimer);el.toast.textContent=msg;el.toast.classList.add('show');toastTimer=setTimeout(()=>el.toast.classList.remove('show'),1500);}
async function copy(text,msg){if(!text)return;try{await navigator.clipboard.writeText(text);toast(msg);}catch{toast('복사 권한을 사용할 수 없습니다.');}}
function b64u(v){const n=v.replace(/-/g,'+').replace(/_/g,'/'),p=n+'='.repeat((4-n.length%4)%4),b=atob(p),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
async function importKey(secret){const raw=b64u(secret);if(raw.byteLength!==32)throw new Error('비밀키 길이가 올바르지 않습니다.');return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);}
function validEnv(e){if(!e||e.version!==2||e.cipher?.name!=='AES-GCM'||e.cipher?.keyLength!==256||e.cipher?.aad!==AAD_TEXT||!e.cipher?.iv||!e.ciphertext)throw new Error('지원하지 않거나 불완전한 vault입니다.');}
async function gunzip(bytes){if(typeof DecompressionStream==='undefined')throw new Error('이 브라우저는 압축 해제를 지원하지 않습니다. 최신 Chrome/Edge/Safari에서 열어 주십시오.');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}
async function unlock(secret){const btn=el.unlockForm.querySelector('button[type="submit"]');btn.disabled=true;el.unlockStatus.textContent='암호화 문서를 여는 중입니다…';try{
  const r=await fetch('./vault.json',{cache:'no-store'});if(!r.ok)throw new Error('vault.json을 불러올 수 없습니다.');const env=await r.json();validEnv(env);
  const key=await importKey(secret);let plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64u(env.cipher.iv),additionalData:AAD,tagLength:env.cipher.tagLength||128},key,b64u(env.ciphertext)));
  if(env.compression==='gzip')plain=await gunzip(plain);const p=JSON.parse(dec.decode(plain));if(p.version!==2||!Array.isArray(p.documents)||!p.documents.length)throw new Error('복호화된 문서 형식이 올바르지 않습니다.');
  vault=p;el.secretKey.value='';el.unlockStatus.textContent='';open();
}catch(e){el.secretKey.value='';el.unlockStatus.textContent=e?.name==='OperationError'?'비밀키가 맞지 않거나 vault가 손상되었습니다.':e.message;}finally{btn.disabled=false;}}
function open(){el.vaultTitle.textContent=vault.title||'ConnectBetween';el.docNav.replaceChildren();for(const d of vault.documents){const b=document.createElement('button');b.type='button';b.className='doc-link';b.dataset.docId=d.id;const t=document.createElement('span');t.textContent=d.title;b.append(t);if(d.description){const s=document.createElement('small');s.textContent=d.description;b.append(s);}b.onclick=()=>render(d.id);el.docNav.append(b);}el.lockScreen.classList.add('hidden');el.appShell.classList.remove('hidden');render(vault.documents[0].id);}
function lock(){vault=null;currentMarkdown='';el.content.replaceChildren();el.docNav.replaceChildren();el.appShell.classList.add('hidden');el.lockScreen.classList.remove('hidden');el.unlockStatus.textContent='다시 열려면 비밀 링크를 새로 열거나 비밀키를 입력하십시오.';}
function render(id){const d=vault?.documents.find(x=>x.id===id);if(!d)return;currentMarkdown=d.markdown;el.docTitle.textContent=d.title;el.docMeta.textContent=vault.updatedAt?`vault updated: ${new Date(vault.updatedAt).toLocaleString()}`:'';document.querySelectorAll('.doc-link').forEach(b=>b.classList.toggle('active',b.dataset.docId===id));el.content.innerHTML=md(d.markdown);el.content.querySelectorAll('.code-copy').forEach(b=>b.onclick=()=>copy(b.closest('.code-shell').querySelector('code').textContent,'코드를 복사했습니다.'));el.sidebar.classList.remove('open');}
function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function inline(src){const codes=[],math=[];let s=String(src).replace(/\\\(([\s\S]*?)\\\)/g,(_,x)=>{const k=`CBM${math.length}X`;math.push(x);return k;}).replace(/`([^`]+)`/g,(_,x)=>{const k=`CBC${codes.length}X`;codes.push(x);return k;});s=esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/~~([^~]+)~~/g,'<del>$1</del>');codes.forEach((x,i)=>s=s.replace(`CBC${i}X`,`<code>${esc(x)}</code>`));math.forEach((x,i)=>s=s.replace(`CBM${i}X`,`<span class="math-inline">${esc(x)}</span>`));return s;}
function divider(l){const c=l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());return c.length&&c.every(x=>/^:?-{3,}:?$/.test(x));}
function row(l){return l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());}
function md(markdown){const lines=String(markdown).replace(/\r\n?/g,'\n').split('\n'),o=[];let i=0;while(i<lines.length){const l=lines[i],t=l.trim();
  if(/^```/.test(t)){const lang=t.slice(3).trim()||'code',c=[];i++;while(i<lines.length&&!/^```\s*$/.test(lines[i].trim()))c.push(lines[i++]);if(i<lines.length)i++;o.push(`<div class="code-shell"><div class="code-toolbar"><span>${esc(lang)}</span><button class="code-copy" type="button">복사</button></div><pre><code>${esc(c.join('\n'))}</code></pre></div>`);continue;}
  if(t==='$$'||t==='\\['){const end=t==='$$'?'$$':'\\]',a=[];i++;while(i<lines.length&&lines[i].trim()!==end)a.push(lines[i++]);if(i<lines.length)i++;o.push(`<div class="math-block"><pre>${esc(a.join('\n'))}</pre></div>`);continue;}
  if(!t){i++;continue;}const h=l.match(/^(#{1,6})\s+(.+)$/);if(h){const n=h[1].length;o.push(`<h${n}>${inline(h[2])}</h${n}>`);i++;continue;}
  if(t.startsWith('> ')){const q=[];while(i<lines.length&&lines[i].trim().startsWith('> '))q.push(lines[i++].trim().slice(2));o.push(`<blockquote>${q.map(inline).join('<br>')}</blockquote>`);continue;}
  if(/^\s*[-*+]\s+/.test(l)){const a=[];while(i<lines.length&&/^\s*[-*+]\s+/.test(lines[i]))a.push(lines[i++].replace(/^\s*[-*+]\s+/,''));o.push(`<ul>${a.map(x=>`<li>${inline(x)}</li>`).join('')}</ul>`);continue;}
  if(/^\s*\d+\.\s+/.test(l)){const a=[];while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i]))a.push(lines[i++].replace(/^\s*\d+\.\s+/,''));o.push(`<ol>${a.map(x=>`<li>${inline(x)}</li>`).join('')}</ol>`);continue;}
  if(l.includes('|')&&i+1<lines.length&&divider(lines[i+1])){const hh=row(l);i+=2;const rr=[];while(i<lines.length&&lines[i].includes('|')&&lines[i].trim())rr.push(row(lines[i++]));o.push(`<table><thead><tr>${hh.map(x=>`<th>${inline(x)}</th>`).join('')}</tr></thead><tbody>${rr.map(r=>`<tr>${r.map(x=>`<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);continue;}
  const p=[t];i++;while(i<lines.length&&lines[i].trim()){const n=lines[i],nt=n.trim();if(/^```/.test(nt)||nt==='$$'||nt==='\\['||/^(#{1,6})\s+/.test(n)||nt.startsWith('> ')||/^\s*[-*+]\s+/.test(n)||/^\s*\d+\.\s+/.test(n)||(n.includes('|')&&i+1<lines.length&&divider(lines[i+1])))break;p.push(nt);i++;}o.push(`<p>${inline(p.join(' '))}</p>`);
}return o.join('\n');}
})();
