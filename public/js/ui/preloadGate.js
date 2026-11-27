// 首屏资源预下载门（重构版新增）：进入标题/大厅之前，先把 /data/assets.json 清单里的素材全部拉进
// Cache Storage（assetCache.js 的 sp-imported-assets-v1，由 public/sw.js 命中返回），并显示进度条。
// 下载未完成（部分失败 / 清单失败）时不允许进入；重试按钮会复用同一队列，已缓存的条目不会重新请求，
// 因此第二次进入只做一次索引核对，不再走网络。
import { render } from '../../vendor/preact.module.js';
import { useEffect, useState } from '../../vendor/hooks.module.js';
import { html, Panel, MicroLabel, ProgressBar, Button, Spinner } from './components.js';
import { assetDownload } from '../assetDownload.js';
import { askPersistStorage, clearImportedAssets } from '../assetCache.js';

// 卡住（停在某个百分比不动、或反复失败）时的逃生口：清掉本站的素材缓存与 HTTP 缓存再整页重来。
async function resetPreload() {
  try { await clearImportedAssets(); } catch { /* 没有缓存存储时继续清 HTTP 缓存 */ }
  try {
    const keys = await globalThis.caches?.keys?.() || [];
    await Promise.all(keys.map((key) => globalThis.caches.delete(key)));
  } catch { /* 清不掉也照样重载 */ }
  location.reload();
}

function percent(state) {
  const total = state.total || 0;
  const done = state.done || 0;
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function phaseText(state, pct) {
  switch (state.phase) {
    case 'preparing': return '正在读取资源清单…';
    case 'downloading': return `正在预下载资源 ${pct}%`;
    case 'complete': return '资源已就绪';
    case 'partial': return `有 ${state.failures?.length || 0} 个文件下载失败`;
    case 'error': return '无法读取资源清单，请检查网络';
    case 'paused': return '下载已暂停';
    default: return '准备下载资源…';
  }
}

function Gate({ onDone }) {
  const [state, setState] = useState(() => assetDownload.get());
  useEffect(() => {
    const off = assetDownload.subscribe(setState);
    setState(assetDownload.get());
    void askPersistStorage();
    void assetDownload.start();
    return () => off();
  }, []);
  const pct = percent(state);
  const busy = state.phase === 'preparing' || state.phase === 'downloading' || state.phase === 'idle';
  const failures = state.failures || [];
  // 404/空文件是服务器上本来就没有的条目：跳过即可，不把玩家永久锁在门口。
  const missingOnly = failures.every((f) => f.status === 404 || f.status === 'empty');
  const failed = state.phase === 'error' || (state.phase === 'partial' && !missingOnly);
  const skipped = state.phase === 'partial' && missingOnly;
  useEffect(() => {
    if (state.phase !== 'complete' && !skipped) return;
    const timer = setTimeout(() => onDone(), skipped ? 900 : 260);
    return () => clearTimeout(timer);
  }, [state.phase, skipped]);
  return html`<div class="preload-gate" data-testid="preload-gate">
    <div class="preload-gate__grid"></div>
    <div class="preload-gate__top">RHODES ISLAND // SIMULATION SERVICE<span>TACTICAL CO-OP NODE 02 · ASSET SYNC</span></div>
    <div class="preload-gate__bottom">重构版 · 资源预下载终端</div>
    <div class="preload-gate__inner">
      <${Panel} tone="ice" glow class="preload-gate__panel"
        micro=${html`<${MicroLabel}>资源预下载 · ASSET PRELOAD<//>`}
        title="正在准备战场资源">
        <div class="preload-gate__readout">
          <div class="preload-gate__pct">${pct}<span>%</span></div>
          <div class="preload-gate__stats">
            <div><em>文件</em><b>${state.done || 0} / ${state.total || 0}</b></div>
            <div><em>已拉取</em><b>${((state.bytes || 0) / 1048576).toFixed(1)} MB</b></div>
            <div><em>缓存命中</em><b>${state.cached || 0}</b></div>
          </div>
        </div>
        <${ProgressBar} value=${pct} max=${100} tone="ice" size="lg" segments=${40} class="preload-gate__bar" />
        <div class="preload-gate__status">
          ${busy ? html`<${Spinner} size="sm" />` : null}
          <span>${phaseText(state, pct)}</span>
        </div>
        ${skipped ? html`<div class="preload-gate__skip">服务器缺少 ${failures.length} 个资源文件，已跳过，直接进入。</div>` : null}
        ${failed ? html`<div class="preload-gate__error">
          <p>${state.phase === 'error' ? '资源清单读取失败，确认服务器已启动后重试。' : '部分资源下载失败，重试会从断点继续，已缓存的不会重下。'}</p>
          <${Button} variant="ice" onClick=${() => { void askPersistStorage(); void assetDownload.start(); }}>重试<//>
          ${state.failures?.length ? html`<details class="preload-gate__details"><summary>查看失败文件</summary>
            <ul>${state.failures.slice(0, 20).map((f) => html`<li key=${f.url}><code>${f.url}</code> (${String(f.status)})</li>`)}</ul>
          </details>` : null}
        </div>` : null}
        ${busy ? html`<div class="preload-gate__hint">首次进入需把整包资源存入浏览器缓存，完成后才进入主页；之后启动只核对缓存，不再下载。请保持本页在前台。</div>` : null}
        <div class="preload-gate__tools">
          <${Button} variant="secondary" size="sm" icon="refresh" onClick=${resetPreload}>卡住了？清除缓存重新下载<//>
        </div>
      <//>
    </div>
  </div>`;
}

let mounted = null;

/** 挂载并返回 Promise：素材全部就绪、覆盖层淡出后才 resolve。 */
export function mountPreloadGate() {
  if (mounted) return mounted.promise;
  const host = document.createElement('div');
  host.id = 'sp-preload-gate';
  document.body.appendChild(host);
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  const onDone = () => {
    host.classList.add('is-done');
    setTimeout(() => {
      render(null, host);
      host.remove();
    }, 320);
    resolve(true);
    mounted = null;
  };
  render(html`<${Gate} onDone=${onDone} />`, host);
  mounted = { promise, host };
  return promise;
}
