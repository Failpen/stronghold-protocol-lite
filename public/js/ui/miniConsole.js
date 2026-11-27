// 实时输出框：把控制台日志、未捕获异常和素材请求失败收进一个环形缓冲，在左下角画一个小窗。
// 设置里「实时输出框」开关控制显隐，状态存在 localStorage，刷新后保持。
const KEY = 'sp.pref.miniConsole';
const LIMIT = 200;

const lines = [];
let panel = null;
let body = null;
let installed = false;
let visible = false;
let collapsed = false;

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmt(v) {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.stack || v.message;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function push(kind, args) {
  const text = args.map(fmt).join(' ').replace(/\s+/g, ' ').slice(0, 300);
  lines.push({ kind, text, at: stamp() });
  if (lines.length > LIMIT) lines.shift();
  paint();
}

function paint() {
  if (!body) return;
  body.textContent = '';
  for (const l of lines.slice(-80)) {
    const row = document.createElement('div');
    row.className = `mc-row mc-${l.kind}`;
    row.textContent = `${l.at} ${l.text}`;
    body.appendChild(row);
  }
  body.scrollTop = body.scrollHeight;
}

function build() {
  panel = document.createElement('div');
  panel.className = 'mc-panel';
  panel.innerHTML = '<div class="mc-head"><span class="mc-title">LOG</span><span class="mc-count"></span><button type="button" class="mc-btn mc-fold">－</button><button type="button" class="mc-btn mc-clear">清空</button></div><div class="mc-body"></div>';
  body = panel.querySelector('.mc-body');
  panel.querySelector('.mc-clear').addEventListener('click', (e) => { e.stopPropagation(); lines.length = 0; paint(); });
  panel.querySelector('.mc-fold').addEventListener('click', (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : 'block';
    e.currentTarget.textContent = collapsed ? '＋' : '－';
  });
  const style = document.createElement('style');
  style.textContent = `
.mc-panel{position:fixed;left:4px;bottom:4px;width:min(30vw,220px);max-height:15vh;z-index:2147483000;
  background:rgba(4,10,9,.8);border:1px solid rgba(78,216,175,.4);border-radius:3px;color:#a9dccb;
  font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;overflow:hidden}
.mc-head{display:flex;gap:4px;align-items:center;padding:1px 4px;background:rgba(78,216,175,.14);color:#4ed8af;user-select:none}
.mc-title{flex:1}
.mc-btn{background:none;border:0;color:#4ed8af;font:10px ui-monospace,monospace;padding:0 2px;cursor:pointer}
.mc-body{max-height:calc(15vh - 14px);overflow-y:auto;padding:1px 4px;word-break:break-all}
.mc-row{white-space:pre-wrap}
.mc-warn{color:#e2cf8b}
.mc-error{color:#ff8f7a}
.mc-net{color:#ffb27a}
`;
  panel.appendChild(style);
  document.body.appendChild(panel);
  paint();
}

function setVisible(on) {
  visible = !!on;
  if (visible && !panel) build();
  if (panel) panel.style.display = visible ? 'block' : 'none';
}

export function initMiniConsole() {
  if (installed) return;
  installed = true;
  for (const kind of ['log', 'warn', 'error']) {
    const orig = console[kind].bind(console);
    console[kind] = (...args) => { push(kind, args); orig(...args); };
  }
  globalThis.addEventListener('error', (e) => push('error', [e.message || 'error', e.filename ? `${String(e.filename).split('/').pop()}:${e.lineno}` : '']));
  globalThis.addEventListener('unhandledrejection', (e) => push('error', ['rejection', e.reason]));
  // 素材请求失败最值得看：404 是服务器没有、5xx 是源站抖动、429 是被限流。
  const origFetch = globalThis.fetch;
  if (typeof origFetch === 'function') {
    globalThis.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      try {
        const res = await origFetch(...args);
        if (res && !res.ok && /\/assets\/|\/spine\/|\/media\/|\/data\//.test(url)) {
          push('net', [`${res.status}`, url.split('/').slice(-2).join('/')]);
        }
        return res;
      } catch (err) {
        push('net', ['FAIL', url.split('/').slice(-2).join('/'), String(err && err.message || err).slice(0, 60)]);
        throw err;
      }
    };
  }
  let on = false;
  try { on = localStorage.getItem(KEY) === '1'; } catch { on = false; }
  setVisible(on);
}

export function miniConsoleOn() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function setMiniConsole(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* 无存储时只在本次生效 */ }
  if (!installed) initMiniConsole();
  setVisible(on);
  if (on) push('info', ['实时输出已开启']);
}
