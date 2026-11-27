// server/http/assetProxy.js — 把 /assets/、/fonts/、/media/ 三类静态素材转发到独立的素材服务。
//
// 「规程 LITE」部署版把 72 MB 美术素材、精灵图集和字体从主服务镜像里挪出去，主服务镜像只剩代码与数据，
// 每次部署上传量从 135 MB 降到 10 MB 级。浏览器这一侧仍按原来的同源路径请求，所以 Cache Storage、
// Service Worker 的命中规则、CSP 和预下载门一行都不用改——素材只是由主服务转发过去。
//
// 未设置 SP_ASSETS_ORIGIN 时整段逻辑不生效，服务照旧从本地 public/assets 读文件（本地开发和单机部署不受影响）。
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const PREFIXES = ['/assets/', '/fonts/', '/media/'];

// 原样转发的请求头：条件请求、范围请求、压缩协商。
const FORWARD_HEADERS = ['range', 'if-range', 'if-none-match', 'if-modified-since', 'accept-encoding', 'accept'];

// 原样回传的响应头；content-length 由本条响应自己决定，不跟随上游压缩后的长度。
// 素材服务对 .css/.woff 之类会回 application/octet-stream，浏览器拒绝把它当样式表；按扩展名兜底。
const MIME_BY_EXT = {
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
};
function mimeFor(pathname) {
  const at = pathname.lastIndexOf('.');
  if (at < 0) return null;
  return MIME_BY_EXT[pathname.slice(at).toLowerCase()] || null;
}

const PASS_HEADERS = [
  'content-type', 'content-range', 'accept-ranges', 'etag', 'last-modified',
  'cache-control', 'expires', 'content-encoding', 'vary',
];

/**
 * @param {{ origin: string, log: any, timeoutMs?: number }} opts
 *   origin: 素材服务基址，例如 http://stronghold-assets 或 https://xxx.sh.run.tcloudbase.com
 */
export function createAssetProxy({ origin, log, timeoutMs = 30000 }) {
  const base = origin ? new URL(origin) : null;
  const client = base?.protocol === 'https:' ? https : http;
  const agent = new client.Agent({ keepAlive: true, maxSockets: 64 });

  return {
    handles: (rawPath) => Boolean(base) && PREFIXES.some((p) => rawPath.startsWith(p)),
    handle,
  };

  function handle(req, res, rawPath, query) {
    return new Promise((resolve) => {
      const target = new URL(rawPath + (query ? `?${query}` : ''), base);
      const headers = { host: base.host };
      for (const h of FORWARD_HEADERS) if (req.headers[h]) headers[h] = req.headers[h];

      let settled = false;
      const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };

      const upstream = client.request(
        { protocol: target.protocol, hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, agent, timeout: timeoutMs },
        (up) => {
          const status = up.statusCode || 502;
          res.statusCode = status;
          for (const h of PASS_HEADERS) if (up.headers[h]) res.setHeader(h, up.headers[h]);
          // 上游带 content-length 时才转，压缩流没有长度就让它分块。
          if (up.headers['content-length'] && !up.headers['content-encoding']) res.setHeader('content-length', up.headers['content-length']);
          const got = String(res.getHeader('content-type') || '');
          if (!got || /octet-stream/i.test(got)) {
            const fixed = mimeFor(target.pathname);
            if (fixed) res.setHeader('content-type', fixed);
          }
          if (!res.getHeader('cache-control')) res.setHeader('cache-control', 'public, max-age=31536000, immutable');
          if (req.method === 'HEAD') { res.end(); up.resume(); done(true); return; }
          up.pipe(res);
          up.on('end', () => done(true));
          up.on('error', (e) => { log?.error?.('[assets] upstream stream failed', e?.message || e); res.destroy(); done(false); });
        },
      );

      upstream.on('timeout', () => { log?.error?.('[assets] upstream timeout', target.pathname); upstream.destroy(new Error('timeout')); });
      upstream.on('error', (e) => {
        log?.error?.('[assets] upstream failed', target.pathname, e?.message || e);
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader('content-type', 'text/plain; charset=utf-8');
          res.end('素材服务暂不可用 · asset service unavailable');
        } else res.destroy();
        done(false);
      });
      upstream.end();
    });
  }
}
