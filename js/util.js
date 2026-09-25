/* ===================================================================
   공용 도구 — 이스케이프, id, 크기 · 시간 표기, 이벤트
   =================================================================== */
(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function hex(n) {
    let s = '';
    const a = new Uint8Array(Math.ceil(n / 2));
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256 | 0);
    a.forEach(b => s += b.toString(16).padStart(2, '0'));
    return s.slice(0, n);
  }
  /** 문자열로 결정되는 해시 (캐시 키 · 가짜 digest 용) */
  function hash(str, len = 64) {
    let h1 = 0x811c9dc5, h2 = 0x1234567, out = '';
    str = String(str);
    while (out.length < len) {
      for (let i = 0; i < str.length; i++) {
        h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 16777619) >>> 0;
        h2 = Math.imul(h2 ^ str.charCodeAt(i), 2654435761) >>> 0;
      }
      out += h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
      str = out;
    }
    return out.slice(0, len);
  }

  /** 바이트 → "12.3MB" (docker 표기) */
  function size(b, si = true) {
    const k = si ? 1000 : 1024;
    const u = si ? ['B', 'kB', 'MB', 'GB', 'TB'] : ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let i = 0; b = +b || 0;
    while (b >= k && i < u.length - 1) { b /= k; i++; }
    return (i === 0 ? b.toFixed(0) : b < 10 ? b.toFixed(2) : b < 100 ? b.toFixed(1) : b.toFixed(0)).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') + u[i];
  }
  /** "512m" "1g" "300M" → 바이트 */
  function parseSize(s) {
    const m = String(s || '').trim().match(/^([\d.]+)\s*([kmgt]?)(i?b?)?$/i);
    if (!m) return NaN;
    const mul = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4 }[m[2].toLowerCase()];
    return Math.round(parseFloat(m[1]) * mul);
  }

  /** ms → "3 minutes" (docker ps 표기) */
  function human(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 1) return 'Less than a second';
    if (s < 60) return s + ' second' + (s > 1 ? 's' : '');
    const m = Math.round(s / 60);
    if (m < 60) return (m === 1 ? 'About a minute' : m + ' minutes');
    const h = Math.round(m / 60);
    if (h < 48) return (h === 1 ? 'About an hour' : h + ' hours');
    const d = Math.round(h / 24);
    if (d < 14) return d + ' days';
    const w = Math.round(d / 7);
    if (d < 60) return w + ' weeks';
    const mo = Math.round(d / 30);
    if (mo < 24) return mo + ' months';
    return Math.round(d / 365) + ' years';
  }
  const ago = t => human(Date.now() - t) + ' ago';

  function iso(t) { return new Date(t).toISOString().replace(/\.(\d{3})Z$/, '.$1000000Z'); }

  /** 표 출력: rows 는 배열의 배열, 첫 줄이 머리글 (칸 사이 3칸 이상) */
  function table(rows, gap = 3) {
    const w = [];
    rows.forEach(r => r.forEach((c, i) => { w[i] = Math.max(w[i] || 0, strW(String(c))); }));
    return rows.map(r => r.map((c, i) => i === r.length - 1 ? String(c) : String(c) + ' '.repeat(w[i] - strW(String(c)) + gap)).join('').replace(/\s+$/, '')).join('\n');
  }
  /** 한글 · 이모지는 2칸 */
  function strW(s) {
    let n = 0;
    for (const ch of s) n += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|[\u{1f300}-\u{1faff}]/u.test(ch) ? 2 : 1;
    return n;
  }
  function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - strW(s))); }

  function sleep(ms, signal) {
    return new Promise(res => {
      if (signal && signal.aborted) return res(false);
      const t = setTimeout(() => { cleanup(); res(true); }, ms);
      const on = () => { clearTimeout(t); cleanup(); res(false); };
      const cleanup = () => signal && signal.removeEventListener && signal.removeEventListener('abort', on);
      if (signal && signal.addEventListener) signal.addEventListener('abort', on);
    });
  }

  class Emitter {
    constructor() { this._h = {}; }
    on(ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); return () => this.off(ev, fn); }
    off(ev, fn) { this._h[ev] = (this._h[ev] || []).filter(f => f !== fn); }
    emit(ev, ...a) { (this._h[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem('sd:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('sd:' + k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem('sd:' + k); } catch (_) {} }
  };

  /** 글자 단위 비슷한 명령 찾기 (오타 안내) */
  function closest(word, list) {
    let best = null, bd = 3;
    list.forEach(w => { const d = lev(word, w); if (d < bd) { bd = d; best = w; } });
    return best;
  }
  function lev(a, b) {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) for (let j = 1; j <= a.length; j++)
      m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    return m[b.length][a.length];
  }

  window.U = { esc, hex, hash, size, parseSize, human, ago, iso, table, strW, pad, sleep, Emitter, store, closest };
})();
