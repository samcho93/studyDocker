/* ===================================================================
   작은 YAML 해석기 (compose.yaml · 쿠버네티스 매니페스트용 부분 집합)
   블록 매핑/시퀀스, 흐름 [a, b] {a: 1}, 따옴표, | > 여러 줄, 주석, --- 문서 구분
   =================================================================== */
(function () {
  'use strict';

  class YamlError extends Error { constructor(line, msg) { super(`yaml: line ${line}: ${msg}`); this.line = line; } }

  function stripComment(s) {
    let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === q && s[i - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'") { if (i === 0 || /[\s:,\[{-]/.test(s[i - 1])) q = c; continue; }
      if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
    }
    return s;
  }

  function scalar(v, ln) {
    v = v.trim();
    if (v === '' || v === '~' || v === 'null' || v === 'Null' || v === 'NULL') return null;
    if (v[0] === '"') { if (!/"$/.test(v) || v.length < 2) throw new YamlError(ln, 'found unexpected end of stream'); try { return JSON.parse(v); } catch (_) { return v.slice(1, -1); } }
    if (v[0] === "'") { if (!/'$/.test(v) || v.length < 2) throw new YamlError(ln, 'found unexpected end of stream'); return v.slice(1, -1).replace(/''/g, "'"); }
    if (v[0] === '[' || v[0] === '{') return flow(v, ln);
    if (/^(true|True|TRUE)$/.test(v)) return true;
    if (/^(false|False|FALSE)$/.test(v)) return false;
    if (/^[-+]?\d+$/.test(v) && !/^0\d/.test(v)) return parseInt(v, 10);
    if (/^[-+]?(\d+\.\d*|\.\d+)([eE][-+]?\d+)?$/.test(v)) return parseFloat(v);
    if (/^[&*]/.test(v)) return v;
    return v;
  }

  function flow(s, ln) {
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    const val = () => {
      ws();
      if (s[i] === '[') { i++; const a = []; ws(); if (s[i] === ']') { i++; return a; } while (i < s.length) { a.push(val()); ws(); if (s[i] === ',') { i++; ws(); if (s[i] === ']') { i++; return a; } continue; } if (s[i] === ']') { i++; return a; } throw new YamlError(ln, `did not find expected ',' or ']'`); } throw new YamlError(ln, `did not find expected ',' or ']'`); }
      if (s[i] === '{') { i++; const o = {}; ws(); if (s[i] === '}') { i++; return o; } while (i < s.length) { ws(); const k = key(); ws(); let v = null; if (s[i] === ':') { i++; v = val(); } o[k] = v; ws(); if (s[i] === ',') { i++; continue; } if (s[i] === '}') { i++; return o; } throw new YamlError(ln, `did not find expected ',' or '}'`); } throw new YamlError(ln, `did not find expected ',' or '}'`); }
      if (s[i] === '"' || s[i] === "'") { const q = s[i]; let j = i + 1; while (j < s.length && !(s[j] === q && s[j - 1] !== '\\')) j++; const r = scalar(s.slice(i, j + 1), ln); i = j + 1; return r; }
      let j = i; while (j < s.length && !/[,\]}]/.test(s[j])) j++;
      const r = scalar(s.slice(i, j), ln); i = j; return r;
    };
    const key = () => {
      if (s[i] === '"' || s[i] === "'") { const q = s[i]; let j = i + 1; while (j < s.length && s[j] !== q) j++; const k = s.slice(i + 1, j); i = j + 1; return k; }
      let j = i; while (j < s.length && s[j] !== ':' && s[j] !== ',' && s[j] !== '}') j++;
      const k = s.slice(i, j).trim(); i = j; return k;
    };
    const r = val();
    return r;
  }

  /** 여러 문서 (---) → 배열 */
  function parseAll(src) {
    const docs = String(src || '').replace(/\r/g, '').split(/^---\s*$/m);
    return docs.map(d => parse(d)).filter(d => d != null);
  }

  function parse(src) {
    const raw = String(src || '').replace(/\r/g, '').replace(/\t/g, '    ').split('\n');
    const lines = [];
    raw.forEach((l, i) => {
      if (/^(---|\.\.\.)\s*$/.test(l)) return;
      const t = stripComment(l);
      if (!t.trim()) { lines.push({ blank: true, n: i + 1, raw: l }); return; }
      lines.push({ ind: t.match(/^ */)[0].length, text: t.trim(), n: i + 1, raw: l });
    });
    let p = 0;
    const skip = () => { while (p < lines.length && lines[p].blank) p++; };
    const cur = () => { skip(); return lines[p]; };

    function block(ind) {
      const l = cur();
      if (!l) return null;
      if (l.text.startsWith('- ') || l.text === '-') return seq(l.ind);
      return map(l.ind);
    }
    function blockScalar(parentInd, style) {
      // | 또는 > 다음 줄들
      const out = [];
      let bInd = null;
      while (p < lines.length) {
        const l = lines[p];
        if (l.blank) { out.push(''); p++; continue; }
        if (l.ind <= parentInd) break;
        if (bInd == null) bInd = l.ind;
        out.push(l.raw.slice(bInd));
        p++;
      }
      while (out.length && out[out.length - 1] === '') out.pop();
      const keep = style.includes('+'), strip = style.includes('-');
      let s = style[0] === '>' ? out.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ') : out.join('\n');
      return s + (strip ? '' : '\n');
    }
    function valueAfter(v, l, childInd) {
      // "key: v" 의 v 처리 (빈 값이면 아래 블록)
      if (v === '' ) {
        const nx = cur();
        if (nx && (nx.ind > l.ind || (nx.ind === l.ind && (nx.text.startsWith('- ') || nx.text === '-') && childInd != null))) return block(nx.ind);
        return null;
      }
      if (/^[|>][+-]?\d*$/.test(v)) return blockScalar(l.ind, v);
      if ((v[0] === '[' || v[0] === '{')) {
        // 여러 줄 흐름
        let s = v, depth = 0;
        const bal = t => { let d = 0, q = null; for (const ch of t) { if (q) { if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") q = ch; else if ('[{'.includes(ch)) d++; else if (']}'.includes(ch)) d--; } return d; };
        depth = bal(s);
        while (depth > 0 && p < lines.length) { const nl = lines[p++]; if (nl.blank) continue; s += ' ' + nl.text; depth = bal(s); }
        return flow(s, l.n);
      }
      if ((v[0] === '"' && !/"$/.test(v)) || (v[0] === "'" && !/'$/.test(v.slice(1)))) {
        // 여러 줄 따옴표
        let s = v; while (p < lines.length && !(new RegExp(v[0] + '\\s*$').test(s) && s.length > 1)) { const nl = lines[p++]; if (!nl.blank) s += ' ' + nl.text; }
        return scalar(s, l.n);
      }
      return scalar(v, l.n);
    }
    function splitKey(text, ln) {
      // key: value (따옴표 키 포함)
      let key, rest;
      if (text[0] === '"' || text[0] === "'") {
        const q = text[0]; const j = text.indexOf(q, 1);
        key = text.slice(1, j); rest = text.slice(j + 1);
        if (!/^\s*:(\s|$)/.test(rest)) return null;
        rest = rest.replace(/^\s*:/, '');
      } else {
        const m = text.match(/^([^:]+?|[^\s:][^:]*?):(?:\s+(.*)|$)/);
        if (!m) return null;
        key = m[1].trim(); rest = m[2] || '';
        if (key.includes(' ') && /^[\w-]+\s+[\w-]/.test(key) && !/^[\w.\-/]+$/.test(key)) { /* 공백 있는 키도 허용 */ }
      }
      return { key, value: rest.trim() };
    }
    function map(ind) {
      const o = {};
      while (true) {
        const l = cur();
        if (!l || l.ind < ind) break;
        if (l.ind > ind) throw new YamlError(l.n, 'mapping values are not allowed in this context');
        if (l.text.startsWith('- ')) throw new YamlError(l.n, 'did not find expected key');
        const kv = splitKey(l.text, l.n);
        if (!kv) throw new YamlError(l.n, `could not find expected ':'`);
        if (kv.key in o) throw new YamlError(l.n, `mapping key "${kv.key}" already defined at line ${o.__lines ? o.__lines[kv.key] : '?'}`);
        p++;
        o[kv.key] = valueAfter(kv.value, l, ind);
        Object.defineProperty(o, '__lines', { value: Object.assign(o.__lines || {}, { [kv.key]: l.n }), enumerable: false, configurable: true });
      }
      return o;
    }
    function seq(ind) {
      const a = [];
      while (true) {
        const l = cur();
        if (!l || l.ind < ind) break;
        if (l.ind > ind) throw new YamlError(l.n, 'did not find expected \'-\' indicator');
        if (!(l.text.startsWith('- ') || l.text === '-')) break;
        const rest = l.text === '-' ? '' : l.text.slice(2).trim();
        p++;
        if (!rest) { const nx = cur(); a.push(nx && nx.ind > ind ? block(nx.ind) : null); continue; }
        const kv = !/^["'[{]/.test(rest) || /^["'][^"']*["']\s*:/.test(rest) ? splitKey(rest, l.n) : null;
        if (kv && !/^[a-z]+:\/\//i.test(rest) && !/^\S+:\d/.test(rest) && !/^\d/.test(rest)) {
          // "- key: value" → 매핑 항목. 나머지 키들은 key 위치 들여쓰기
          const keyInd = l.ind + (l.raw.slice(l.ind).match(/^-\s+/)[0].length);
          const o = {};
          const fake = { ind: keyInd, n: l.n };
          o[kv.key] = valueAfter(kv.value, fake, keyInd);
          const more = cur();
          if (more && more.ind === keyInd && !more.text.startsWith('- ')) Object.assign(o, map(keyInd));
          else if (more && more.ind === keyInd && more.text.startsWith('- ') && o[kv.key] == null) {}
          a.push(o);
        } else a.push(valueAfter(rest, l, null));
      }
      return a;
    }
    const first = cur();
    if (!first) return null;
    if (first.ind > 0 && !(first.text.startsWith('-'))) {}
    const r = block(first.ind);
    const left = cur();
    if (left) throw new YamlError(left.n, left.ind > first.ind ? 'mapping values are not allowed in this context' : 'did not find expected key');
    return r;
  }

  /** 객체 → YAML 문자열 (compose config · kubectl get -o yaml) */
  function stringify(v, ind) {
    ind = ind || 0;
    const sp = ' '.repeat(ind);
    const sc = x => {
      if (x === null || x === undefined) return 'null';
      if (typeof x === 'boolean' || typeof x === 'number') return String(x);
      const s = String(x);
      if (s === '' || /^[\s]|[\s]$|: |#|^[-?:,[\]{}&*!|>'"%@`]|^(true|false|null|yes|no|on|off)$/i.test(s) || /^[\d.+-]+$/.test(s) || s.includes('\n')) return s.includes('\n') ? '|-\n' + s.split('\n').map(l => sp + '  ' + l).join('\n') : JSON.stringify(s);
      return s;
    };
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      return v.map(x => {
        if (x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length) {
          const inner = stringify(x, ind + 2).split('\n');
          return sp + '- ' + inner[0].trimStart() + (inner.length > 1 ? '\n' + inner.slice(1).join('\n') : '');
        }
        return sp + '- ' + (x && typeof x === 'object' ? stringify(x, ind + 2).trim() : sc(x));
      }).join('\n');
    }
    if (v && typeof v === 'object') {
      const ks = Object.keys(v);
      if (!ks.length) return '{}';
      return ks.map(k => {
        const x = v[k];
        const key = /^[\w./-]+$/.test(k) ? k : JSON.stringify(k);
        if (x && typeof x === 'object' && (Array.isArray(x) ? x.length : Object.keys(x).length)) return `${sp}${key}:\n${stringify(x, Array.isArray(x) ? ind + 2 : ind + 2)}`;
        return `${sp}${key}: ${x && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : sc(x)}`;
      }).join('\n');
    }
    return sp + sc(v);
  }

  window.YAML = { parse, parseAll, stringify, YamlError };
})();
