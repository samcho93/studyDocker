/* ===================================================================
   작은 셸 (bash / sh 흉내)
   - 따옴표, $VAR, ${VAR}, $(명령), ; && || | > >> < 2>&1 &, while/for/if
   - 호스트 터미널과 컨테이너 안의 셸이 함께 쓴다 (명령 목록만 다름)
   =================================================================== */
(function () {
  'use strict';
  const { norm, parent, base } = VFS;

  class ExitSignal { constructor(code) { this.code = code; } }

  /* ------------------------------------------------ 토큰 나누기 --- */
  function tokenize(src) {
    const toks = [];
    let i = 0;
    const n = src.length;
    const isOp = c => ';&|<>()\n'.includes(c);
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '\\' && src[i + 1] === '\n') { i += 2; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '\n') { toks.push({ op: ';', nl: true }); i++; continue; }
      // 연산자
      const three = src.substr(i, 4);
      if (three === '2>&1') { toks.push({ op: '2>&1' }); i += 4; continue; }
      const two = src.substr(i, 2);
      if (['&&', '||', '>>', '2>', '&>'].includes(two)) {
        if (two === '2>' && src[i + 2] === '>') { toks.push({ op: '2>>' }); i += 3; continue; }
        toks.push({ op: two }); i += 2; continue;
      }
      if (/\d/.test(c) && src[i + 1] === '>' && (i === 0 || /\s/.test(src[i - 1]))) {
        // 1> 같은 것
        if (c === '1') { toks.push({ op: src[i + 2] === '>' ? '>>' : '>' }); i += src[i + 2] === '>' ? 3 : 2; continue; }
      }
      if (isOp(c)) { toks.push({ op: c }); i++; continue; }
      // 단어
      const segs = [];
      let raw = '', quoted = false;
      const lit = (v, q) => { if (!v) return; const last = segs[segs.length - 1]; if (last && last.t === 'lit' && last.q === q) last.v += v; else segs.push({ t: 'lit', v, q }); };
      while (i < n && !/[ \t\r\n]/.test(src[i]) && !isOp(src[i])) {
        const ch = src[i];
        if (ch === "'") {
          quoted = true;
          const j = src.indexOf("'", i + 1);
          const v = j < 0 ? src.slice(i + 1) : src.slice(i + 1, j);
          raw += src.slice(i, j < 0 ? n : j + 1);
          lit(v, true); segs[segs.length - 1] && (segs[segs.length - 1].sq = true);
          i = j < 0 ? n : j + 1;
          if (!v) segs.push({ t: 'lit', v: '', q: true });
          continue;
        }
        if (ch === '"') {
          quoted = true;
          let j = i + 1, buf = '';
          const start = segs.length;
          while (j < n && src[j] !== '"') {
            if (src[j] === '\\' && '"\\$`'.includes(src[j + 1])) { buf += src[j + 1]; j += 2; continue; }
            if (src[j] === '$') {
              const r = readDollar(src, j);
              if (r) { lit(buf, true); buf = ''; segs.push(Object.assign(r.seg, { q: true })); j = r.end; continue; }
            }
            buf += src[j]; j++;
          }
          lit(buf, true);
          if (segs.length === start) segs.push({ t: 'lit', v: '', q: true });
          raw += src.slice(i, j + 1);
          i = j + 1;
          continue;
        }
        if (ch === '\\') { lit(src[i + 1] || '', true); raw += src.substr(i, 2); i += 2; continue; }
        if (ch === '$') {
          const r = readDollar(src, i);
          if (r) { segs.push(Object.assign(r.seg, { q: false })); raw += src.slice(i, r.end); i = r.end; continue; }
        }
        lit(ch, false); raw += ch; i++;
      }
      toks.push({ w: segs, raw, quoted });
    }
    return toks;
  }
  function readDollar(src, i) {
    const nx = src[i + 1];
    if (nx === '(') {
      let d = 0, j = i + 1;
      for (; j < src.length; j++) {
        if (src[j] === '(') d++;
        else if (src[j] === ')') { d--; if (!d) break; }
      }
      return { seg: { t: 'sub', v: src.slice(i + 2, j) }, end: j + 1 };
    }
    if (nx === '{') {
      const j = src.indexOf('}', i);
      const inner = src.slice(i + 2, j);
      const m = inner.match(/^(\w+)(?::?-(.*))?$/);
      return { seg: { t: 'var', v: m ? m[1] : inner, def: m ? m[2] : undefined }, end: j + 1 };
    }
    const m = src.slice(i + 1).match(/^(\w+|\?|\$|#|@|\*)/);
    if (m) return { seg: { t: 'var', v: m[1] }, end: i + 1 + m[1].length };
    return null;
  }

  /* ------------------------------------------------ 구문 분석 --- */
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p];
    const kw = (t, k) => t && t.w && !t.quoted && t.raw === k;
    const isEnd = (stop) => { const t = peek(); return !t || (t.op === ')' ) || (stop && t.w && !t.quoted && stop.includes(t.raw)); };

    function list(stop) {
      const items = [];
      while (true) {
        while (peek() && peek().op === ';') p++;
        if (isEnd(stop)) break;
        const node = andor(stop);
        let op = ';';
        if (peek() && (peek().op === ';' || peek().op === '&')) { op = peek().op; p++; }
        items.push({ node, op });
      }
      return { type: 'list', items };
    }
    function andor(stop) {
      const first = pipeline(stop);
      const rest = [];
      while (peek() && (peek().op === '&&' || peek().op === '||')) {
        const op = peek().op; p++;
        while (peek() && peek().op === ';' && peek().nl) p++;
        rest.push({ op, node: pipeline(stop) });
      }
      return { type: 'andor', first, rest };
    }
    function pipeline(stop) {
      const cmds = [command(stop)];
      while (peek() && peek().op === '|') { p++; cmds.push(command(stop)); }
      return { type: 'pipe', cmds };
    }
    function expect(k) { const t = peek(); if (kw(t, k)) { p++; return; } throw new SyntaxError(`syntax error: '${k}' 가 필요합니다`); }
    function command(stop) {
      const t = peek();
      if (kw(t, 'while') || kw(t, 'until')) {
        p++;
        const cond = list(['do']); expect('do');
        const body = list(['done']); expect('done');
        return { type: 'while', until: t.raw === 'until', cond, body };
      }
      if (kw(t, 'for')) {
        p++;
        const v = peek().raw; p++;
        const words = [];
        if (kw(peek(), 'in')) { p++; while (peek() && peek().w && !kw(peek(), 'do')) { words.push(peek().w); p++; } }
        while (peek() && peek().op === ';') p++;
        expect('do');
        const body = list(['done']); expect('done');
        return { type: 'for', v, words, body };
      }
      if (kw(t, 'if')) {
        p++;
        const cond = list(['then']); expect('then');
        const then = list(['else', 'elif', 'fi']);
        let els = null;
        if (kw(peek(), 'else')) { p++; els = list(['fi']); }
        expect('fi');
        return { type: 'if', cond, then, els };
      }
      if (t && t.op === '(') { p++; const body = list(); if (peek() && peek().op === ')') p++; return { type: 'sub', body }; }
      const words = [], redirs = [], assigns = [];
      while (peek()) {
        const q = peek();
        if (q.op) {
          if (['>', '>>', '<', '2>', '2>>', '&>'].includes(q.op)) {
            p++; const tg = peek(); if (!tg || !tg.w) throw new SyntaxError('syntax error near unexpected token `newline\'');
            redirs.push({ op: q.op, target: tg.w }); p++; continue;
          }
          if (q.op === '2>&1') { redirs.push({ op: '2>&1' }); p++; continue; }
          break;
        }
        if (stop && !words.length && !q.quoted && stop.includes(q.raw)) break;
        if (!words.length && /^[A-Za-z_]\w*=/.test(q.raw)) {
          const eq = q.raw.indexOf('=');
          // 첫 조각에서 이름= 부분 떼기
          const segs = JSON.parse(JSON.stringify(q.w));
          let cut = eq + 1;
          while (cut > 0 && segs.length) {
            const s = segs[0];
            if (s.t !== 'lit') break;
            if (s.v.length <= cut) { cut -= s.v.length; segs.shift(); } else { s.v = s.v.slice(cut); cut = 0; }
          }
          assigns.push({ name: q.raw.slice(0, eq), w: segs.length ? segs : [{ t: 'lit', v: '', q: true }] });
          p++; continue;
        }
        words.push(q.w); p++;
      }
      return { type: 'cmd', words, redirs, assigns };
    }
    const ast = list();
    if (p < toks.length) throw new SyntaxError(`syntax error near unexpected token \`${toks[p].op || toks[p].raw}'`);
    return ast;
  }

  /* ------------------------------------------------ 글롭 --- */
  function globToRe(g) { return new RegExp('^' + g.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]') + '$'); }

  /* ------------------------------------------------ 셸 --- */
  class Shell {
    /**
     * opts: { fs, cwd, env, cmds, user, host, name, onClear, onEdit }
     */
    constructor(opts) {
      Object.assign(this, { user: 'root', host: 'localhost', cmds: {}, name: 'sh' }, opts);
      this.env = Object.assign({ PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', HOME: this.user === 'root' ? '/root' : '/home/' + this.user }, opts.env || {});
      this.cwd = this.cwd || this.env.HOME || '/';
      this.last = 0;
      this.history = [];
      this.jobs = [];
    }
    get prompt() {
      if (this.promptFn) return this.promptFn(this);
      const home = this.env.HOME;
      const d = this.cwd === home ? '~' : this.cwd.startsWith(home + '/') ? '~' + this.cwd.slice(home.length) : this.cwd;
      if (this.name === 'bash') return `${this.user}@${this.host}:${d}${this.user === 'root' ? '#' : '$'} `;
      return `${this.cwd === '/' ? '/' : this.cwd.startsWith(home) ? d : this.cwd} # `;
    }
    abs(p) { return norm(p, this.cwd); }

    /** 명령줄 한 줄 실행 → 종료 코드 */
    async exec(src, io) {
      let ast;
      try { ast = parse(src); }
      catch (e) { io.err(`${this.name}: ${e.message}\n`); this.last = 2; return 2; }
      try { this.last = await this.runList(ast, io); }
      catch (e) {
        if (e instanceof ExitSignal) throw e;
        io.err(`${this.name}: ${e.message || e}\n`); this.last = 1;
      }
      return this.last;
    }

    async runList(node, io) {
      let code = 0;
      for (const it of node.items) {
        if (io.signal && io.signal.aborted) return 130;
        if (it.op === '&') {
          const n = this.jobs.length + 1;
          const job = { n, cmd: '(백그라운드)', done: false };
          this.jobs.push(job);
          io.out(`[${n}] ${1000 + Math.floor(Math.random() * 9000)}\n`);
          const bio = Object.assign({}, io, { bg: true });
          this.runAndOr(it.node, bio).then(() => { job.done = true; }).catch(() => { job.done = true; });
          code = 0;
        } else code = await this.runAndOr(it.node, io);
        this.last = code;
      }
      return code;
    }
    async runAndOr(node, io) {
      let code = await this.runPipe(node.first, io);
      for (const r of node.rest) {
        if (r.op === '&&' && code !== 0) continue;
        if (r.op === '||' && code === 0) continue;
        code = await this.runPipe(r.node, io);
      }
      return code;
    }
    async runPipe(node, io) {
      if (node.cmds.length === 1) return this.runCmd(node.cmds[0], io, null);
      let input = null, code = 0;
      for (let i = 0; i < node.cmds.length; i++) {
        const last = i === node.cmds.length - 1;
        if (last) { code = await this.runCmd(node.cmds[i], io, input); }
        else {
          let buf = '';
          const cio = Object.assign({}, io, { out: s => { buf += s; }, piped: true });
          code = await this.runCmd(node.cmds[i], cio, input);
          input = buf;
        }
      }
      return code;
    }

    async expandWord(w, io) {
      // 결과: 문자열 배열 (따옴표 없는 변수는 공백으로 나뉨)
      let words = [''], anyQuoted = false, glob = false;
      for (const s of w) {
        if (s.q) anyQuoted = true;
        let v;
        if (s.t === 'lit') { v = s.v; if (!s.q && /[*?]/.test(v)) glob = true; words[words.length - 1] += v; continue; }
        if (s.t === 'var') {
          if (s.v === '?') v = String(this.last);
          else if (s.v === '$') v = '1';
          else if (s.v === '#') v = String((this.args || []).length);
          else if (s.v === '@' || s.v === '*') v = (this.args || []).join(' ');
          else if (/^\d$/.test(s.v)) v = s.v === '0' ? this.name : (this.args || [])[+s.v - 1] || '';
          else v = this.env[s.v];
          if ((v == null || v === '') && s.def !== undefined) v = s.def;
          if (v == null) v = '';
        } else if (s.t === 'sub') {
          let buf = '';
          const sio = Object.assign({}, io, { out: t => { buf += t; } });
          try { await this.exec(s.v, sio); } catch (e) { if (!(e instanceof ExitSignal)) throw e; }
          v = buf.replace(/\n+$/, '');
        }
        if (s.q) words[words.length - 1] += v;
        else {
          const parts = v.split(/\s+/);
          if (v.trim() === '') { continue; }
          if (/^\s/.test(v) && words[words.length - 1] !== '') words.push('');
          const ps = parts.filter((x, i) => x !== '' || (i > 0 && i < parts.length - 1));
          ps.forEach((x, i) => { if (i > 0) words.push(''); words[words.length - 1] += x; });
          if (/\s$/.test(v)) words.push('');
        }
      }
      words = words.filter((x, i) => x !== '' || anyQuoted && i === 0);
      if (glob && !anyQuoted) {
        const out = [];
        words.forEach(x => {
          if (!/[*?]/.test(x)) return out.push(x);
          const dir = x.includes('/') ? x.replace(/\/[^/]*$/, '') || '/' : '.';
          const pat = x.includes('/') ? x.slice(x.lastIndexOf('/') + 1) : x;
          const re = globToRe(pat);
          const names = (this.fs.stat(this.abs(dir)) === 'dir' ? this.fs.ls(this.abs(dir)) : []).filter(nm => re.test(nm) && (!nm.startsWith('.') || pat.startsWith('.')));
          if (!names.length) out.push(x);
          else names.forEach(nm => out.push(x.includes('/') ? (dir === '/' ? '' : dir) + '/' + nm : nm));
        });
        return out;
      }
      return words;
    }
    async expandWords(ws, io) {
      const out = [];
      for (const w of ws) (await this.expandWord(w, io)).forEach(x => out.push(x));
      return out;
    }

    async runCmd(node, io, stdin) {
      if (node.type === 'while') {
        let code = 0, guard = 0;
        while (true) {
          if (io.signal && io.signal.aborted) return 130;
          const c = await this.runList(node.cond, io);
          if (node.until ? c === 0 : c !== 0) break;
          code = await this.runList(node.body, io);
          if (++guard > 100000) break;
          if (guard % 50 === 0) await U.sleep(0);
        }
        return code;
      }
      if (node.type === 'for') {
        const items = await this.expandWords(node.words, io);
        let code = 0;
        for (const it of items) {
          if (io.signal && io.signal.aborted) return 130;
          this.env[node.v] = it;
          code = await this.runList(node.body, io);
        }
        return code;
      }
      if (node.type === 'if') {
        const c = await this.runList(node.cond, io);
        if (c === 0) return this.runList(node.then, io);
        return node.els ? this.runList(node.els, io) : 0;
      }
      if (node.type === 'sub') return this.runList(node.body, io);

      const argv = await this.expandWords(node.words, io);
      const vals = [];
      for (const a of node.assigns) vals.push([a.name, (await this.expandWord(a.w, io)).join(' ')]);
      if (!argv.length) { vals.forEach(([k, v]) => { this.env[k] = v; }); return 0; }

      // 출력 방향 바꾸기
      let out = io.out, err = io.err, input = stdin;
      const writes = [];
      for (const r of node.redirs) {
        if (r.op === '2>&1') { err = t => out(t); continue; }
        const target = (await this.expandWord(r.target, io)).join(' ');
        const p = this.abs(target);
        if (r.op === '<') {
          const c = this.fs.read(p);
          if (c == null) { io.err(`${this.name}: ${target}: No such file or directory\n`); return 1; }
          input = c; continue;
        }
        if (target === '/dev/null') { if (r.op === '2>' || r.op === '2>>') err = () => {}; else if (r.op === '&>') { out = () => {}; err = () => {}; } else out = () => {}; continue; }
        const append = r.op === '>>' || r.op === '2>>';
        const w = { p, buf: '', append };
        writes.push(w);
        const fn = t => { w.buf += t; };
        if (r.op === '2>' || r.op === '2>>') err = fn; else if (r.op === '&>') { out = fn; err = fn; } else out = fn;
      }
      const cio = Object.assign({}, io, { out, err, piped: io.piped || writes.length > 0 });
      let code;
      const saved = {};
      vals.forEach(([k, v]) => { saved[k] = this.env[k]; this.env[k] = v; });
      try { code = await this.call(argv, cio, input); }
      finally { vals.forEach(([k]) => { if (saved[k] === undefined) delete this.env[k]; else this.env[k] = saved[k]; }); }
      for (const w of writes) {
        try {
          if (this.fs.stat(parent(w.p)) !== 'dir') { io.err(`${this.name}: ${w.p}: No such file or directory\n`); return 1; }
          this.fs.write(w.p, (w.append ? (this.fs.read(w.p) || '') : '') + w.buf);
        } catch (e) { io.err(`${this.name}: ${w.p}: ${e.message}\n`); return 1; }
      }
      return code;
    }

    async call(argv, io, stdin) {
      const name = argv[0];
      let fn = this.cmds[name] || this.cmds[base(name)] && name.includes('/') && this.cmds[base(name)];
      if (!fn && this.resolveCmd) { fn = this.resolveCmd(base(name)); if (fn) this.cmds[base(name)] = fn; }
      if (!fn) {
        if (name.includes('/') && this.fs.stat(this.abs(name)) === 'file') {
          const src = this.fs.read(this.abs(name));
          if (/^#!.*sh/.test(src) || !/^#!/.test(src)) {
            const sub = this.fork({ args: argv.slice(1) });
            try { return await sub.exec(src.replace(/^#!.*\n/, ''), io); } catch (e) { if (e instanceof ExitSignal) return e.code; throw e; }
          }
        }
        if (this.notFound) return this.notFound(argv, io, stdin);
        io.err(this.name === 'bash' ? `bash: ${name}: command not found\n` : `${this.name}: ${name}: not found\n`);
        return 127;
      }
      const ctx = { args: argv.slice(1), argv, io, sh: this, stdin, out: io.out, err: io.err };
      try {
        const r = await fn(ctx);
        return r == null ? 0 : r;
      } catch (e) {
        if (e instanceof ExitSignal) throw e;
        console.error(e);
        io.err(`${name}: ${e.message || e}\n`);
        return 1;
      }
    }
    fork(extra) {
      const s = new Shell(Object.assign({}, this, { env: Object.assign({}, this.env) }, extra || {}));
      s.cwd = this.cwd; s.cmds = this.cmds; s.fs = this.fs;
      return s;
    }
  }

  /* ------------------------------------------------ 기본 명령 (coreutils) --- */
  function flags(args, known) {
    // -la 같은 짧은 옵션을 풀어 준다
    const f = {}, rest = [];
    args.forEach(a => {
      if (/^-[A-Za-z]+$/.test(a)) a.slice(1).split('').forEach(c => { f[c] = true; });
      else if (/^--[\w-]+$/.test(a)) f[a.slice(2)] = true;
      else rest.push(a);
    });
    return { f, rest };
  }

  function lsLong(sh, p, name, st) {
    const isDir = st === 'dir';
    const content = isDir ? '' : sh.fs.read(p) || '';
    const size = isDir ? 4096 : new Blob([content]).size;
    const mode = isDir ? 'drwxr-xr-x' : /\.sh$/.test(name) || /^\/usr\/(local\/)?bin|^\/bin/.test(p) ? '-rwxr-xr-x' : '-rw-r--r--';
    const d = new Date();
    const mon = d.toLocaleString('en', { month: 'short' });
    const own = sh.user === 'root' || !p.startsWith('/home') ? 'root root' : `${sh.user} ${sh.user}`;
    return `${mode} ${isDir ? 2 : 1} ${own} ${String(size).padStart(5)} ${mon} ${String(d.getDate()).padStart(2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${name}${isDir ? '/' : ''}`;
  }

  const core = {
    echo(c) {
      let a = c.args, nl = true, e = false;
      while (a[0] && /^-[neE]+$/.test(a[0])) { if (a[0].includes('n')) nl = false; if (a[0].includes('e')) e = true; a = a.slice(1); }
      let s = a.join(' ');
      if (e || c.sh.name !== 'bash') s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      c.out(s + (nl ? '\n' : ''));
    },
    printf(c) {
      let fmt = c.args[0] || '', i = 1;
      let s = fmt.replace(/%[sd]/g, () => c.args[i++] || '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      c.out(s);
    },
    true() { return 0; },
    false() { return 1; },
    ':'() { return 0; },
    pwd(c) { c.out(c.sh.cwd + '\n'); },
    cd(c) {
      const t = c.args[0] || c.sh.env.HOME;
      const p = t === '-' ? (c.sh.oldpwd || c.sh.cwd) : c.sh.abs(t);
      const st = c.sh.fs.stat(p);
      if (!st) { c.err(`${c.sh.name}: cd: ${t}: No such file or directory\n`); return 1; }
      if (st !== 'dir') { c.err(`${c.sh.name}: cd: ${t}: Not a directory\n`); return 1; }
      c.sh.oldpwd = c.sh.cwd; c.sh.cwd = p; c.sh.env.PWD = p;
    },
    ls(c) {
      const { f, rest } = flags(c.args);
      const targets = rest.length ? rest : ['.'];
      let code = 0;
      // 파일 인자는 한 줄에 모아서
      const fileArgs = targets.filter(t => c.sh.fs.stat(c.sh.abs(t)) === 'file');
      if (fileArgs.length > 1 && !f.l) { c.out(fileArgs.join(c.io.piped ? '\n' : '  ') + '\n'); targets.splice(0, targets.length, ...targets.filter(t => !fileArgs.includes(t))); if (!targets.length) return 0; }
      targets.forEach((t, ti) => {
        const p = c.sh.abs(t);
        const st = c.sh.fs.stat(p);
        if (!st) { c.err(`ls: cannot access '${t}': No such file or directory\n`); code = 2; return; }
        if (targets.length > 1 && st === 'dir') c.out((ti ? '\n' : '') + t + ':\n');
        let names = st === 'dir' ? c.sh.fs.ls(p) : [t];
        if (!f.a && !f.A) names = names.filter(n => !n.startsWith('.'));
        if (f.a) names = ['.', '..'].concat(names);
        if (f.l) {
          if (st === 'dir') c.out(`total ${names.length * 4}\n`);
          names.forEach(n => {
            const fp = st === 'dir' ? (n === '.' ? p : n === '..' ? parent(p) : (p === '/' ? '' : p) + '/' + n) : p;
            c.out(lsLong(c.sh, fp, n, c.sh.fs.stat(fp)).replace(/\/$/, '') + '\n');
          });
        } else if (names.length) {
          const deco = names.map(n => {
            const fp = st === 'dir' ? (p === '/' ? '' : p) + '/' + n : p;
            const s = c.sh.fs.stat(fp);
            return c.io.piped ? n : s === 'dir' && n !== '.' && n !== '..' ? `\x1b[1;34m${n}\x1b[0m` : /\.sh$/.test(n) ? `\x1b[1;32m${n}\x1b[0m` : n;
          });
          c.out(c.io.piped ? deco.join('\n') + '\n' : deco.join('  ') + '\n');
        }
      });
      return code;
    },
    cat(c) {
      if (!c.args.length) { if (c.stdin != null) c.out(c.stdin); return 0; }
      let code = 0;
      c.args.filter(a => a !== '-n').forEach(a => {
        const p = c.sh.abs(a);
        const st = c.sh.fs.stat(p);
        if (st === 'dir') { c.err(`cat: ${a}: Is a directory\n`); code = 1; return; }
        const s = c.sh.fs.read(p);
        if (s == null) { c.err(`cat: ${a}: No such file or directory\n`); code = 1; return; }
        c.out(s.length && !s.endsWith('\n') ? s + '\n' : s);
      });
      return code;
    },
    mkdir(c) {
      const { f, rest } = flags(c.args);
      let code = 0;
      rest.forEach(a => {
        const p = c.sh.abs(a);
        if (c.sh.fs.stat(p)) { if (!f.p) { c.err(`mkdir: cannot create directory '${a}': File exists\n`); code = 1; } return; }
        if (!f.p && c.sh.fs.stat(parent(p)) !== 'dir') { c.err(`mkdir: cannot create directory '${a}': No such file or directory\n`); code = 1; return; }
        try { c.sh.fs.mkdir(p); } catch (e) { c.err(`mkdir: cannot create directory '${a}': ${e.message}\n`); code = 1; }
      });
      return code;
    },
    touch(c) {
      let code = 0;
      c.args.forEach(a => {
        const p = c.sh.abs(a);
        if (c.sh.fs.stat(p)) return;
        if (c.sh.fs.stat(parent(p)) !== 'dir') { c.err(`touch: cannot touch '${a}': No such file or directory\n`); code = 1; return; }
        try { c.sh.fs.write(p, ''); } catch (e) { c.err(`touch: cannot touch '${a}': ${e.message}\n`); code = 1; }
      });
      return code;
    },
    rm(c) {
      const { f, rest } = flags(c.args);
      let code = 0;
      rest.forEach(a => {
        const p = c.sh.abs(a);
        const st = c.sh.fs.stat(p);
        if (!st) { if (!f.f) { c.err(`rm: cannot remove '${a}': No such file or directory\n`); code = 1; } return; }
        if (st === 'dir' && !f.r && !f.R) { c.err(`rm: cannot remove '${a}': Is a directory\n`); code = 1; return; }
        try { c.sh.fs.rm(p, true); } catch (e) { c.err(`rm: cannot remove '${a}': ${e.message}\n`); code = 1; }
      });
      return code;
    },
    rmdir(c) { c.args.forEach(a => { try { c.sh.fs.rm(c.sh.abs(a), false); } catch (e) { c.err(`rmdir: failed to remove '${a}': ${e.message}\n`); } }); },
    cp(c) {
      const { f, rest } = flags(c.args);
      if (rest.length < 2) { c.err('cp: missing file operand\n'); return 1; }
      const dst = c.sh.abs(rest[rest.length - 1]);
      for (const a of rest.slice(0, -1)) {
        const src = c.sh.abs(a); const st = c.sh.fs.stat(src);
        if (!st) { c.err(`cp: cannot stat '${a}': No such file or directory\n`); return 1; }
        const target = c.sh.fs.stat(dst) === 'dir' ? (dst === '/' ? '' : dst) + '/' + base(src) : dst;
        if (st === 'dir') {
          if (!f.r && !f.R && !f.a) { c.err(`cp: -r not specified; omitting directory '${a}'\n`); return 1; }
          c.sh.fs.mkdir(target);
          const all = c.sh.fs.walk(src);
          Object.keys(all).forEach(k => c.sh.fs.write(target + '/' + k, all[k]));
        } else c.sh.fs.write(target, c.sh.fs.read(src));
      }
    },
    mv(c) {
      const rest = c.args.filter(a => !a.startsWith('-'));
      if (rest.length < 2) { c.err('mv: missing file operand\n'); return 1; }
      const dst = c.sh.abs(rest[1]); const src = c.sh.abs(rest[0]);
      const st = c.sh.fs.stat(src);
      if (!st) { c.err(`mv: cannot stat '${rest[0]}': No such file or directory\n`); return 1; }
      const target = c.sh.fs.stat(dst) === 'dir' ? (dst === '/' ? '' : dst) + '/' + base(src) : dst;
      if (st === 'dir') { const all = c.sh.fs.walk(src); c.sh.fs.mkdir(target); Object.keys(all).forEach(k => c.sh.fs.write(target + '/' + k, all[k])); }
      else c.sh.fs.write(target, c.sh.fs.read(src));
      c.sh.fs.rm(src, true);
    },
    head(c) { return headTail(c, true); },
    tail(c) { return headTail(c, false); },
    wc(c) {
      const s = c.args.filter(a => !a.startsWith('-')).length ? c.sh.fs.read(c.sh.abs(c.args.filter(a => !a.startsWith('-'))[0])) || '' : c.stdin || '';
      const lines = (s.match(/\n/g) || []).length;
      if (c.args.includes('-l')) c.out(lines + '\n');
      else if (c.args.includes('-w')) c.out(s.split(/\s+/).filter(Boolean).length + '\n');
      else c.out(`${lines} ${s.split(/\s+/).filter(Boolean).length} ${s.length}\n`);
    },
    grep(c) {
      const { f, rest } = flags(c.args.filter(a => a !== '--color=auto'));
      const pat = rest[0];
      if (pat == null) { c.err('Usage: grep [OPTION]... PATTERNS [FILE]...\n'); return 2; }
      let src = c.stdin || '';
      if (rest[1]) { src = c.sh.fs.read(c.sh.abs(rest[1])); if (src == null) { c.err(`grep: ${rest[1]}: No such file or directory\n`); return 2; } }
      let re;
      try { re = new RegExp(f.F ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : pat.replace(/\\\|/g, '|'), f.i ? 'i' : ''); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f.i ? 'i' : ''); }
      const lines = src.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
      const hit = lines.filter(l => f.v ? !re.test(l) : re.test(l));
      if (f.c) { c.out(hit.length + '\n'); return hit.length ? 0 : 1; }
      if (!f.q) hit.forEach(l => c.out((c.io.piped || f.v ? l : l.replace(re, m => `\x1b[1;31m${m}\x1b[0m`)) + '\n'));
      return hit.length ? 0 : 1;
    },
    sort(c) { const s = (c.stdin || '').split('\n').filter(Boolean).sort(); if (c.args.includes('-r')) s.reverse(); c.out(s.join('\n') + (s.length ? '\n' : '')); },
    uniq(c) { const s = (c.stdin || '').split('\n').filter(Boolean).filter((x, i, a) => a[i - 1] !== x); c.out(s.join('\n') + (s.length ? '\n' : '')); },
    tee(c) { const s = c.stdin || ''; c.args.filter(a => !a.startsWith('-')).forEach(a => c.sh.fs.write(c.sh.abs(a), (c.args.includes('-a') ? c.sh.fs.read(c.sh.abs(a)) || '' : '') + s)); c.out(s); },
    seq(c) { const [a, b] = c.args.length > 1 ? [+c.args[0], +c.args[1]] : [1, +c.args[0]]; for (let i = a; i <= b && i - a < 10000; i++) c.out(i + '\n'); },
    env(c) {
      if (c.args.length) {
        const env = {}, rest = [];
        c.args.forEach(a => { if (!rest.length && /^\w+=/.test(a)) { const i = a.indexOf('='); env[a.slice(0, i)] = a.slice(i + 1); } else rest.push(a); });
        if (rest.length) { const sub = c.sh.fork(); Object.assign(sub.env, env); return sub.call(rest, c.io, c.stdin); }
      }
      Object.keys(c.sh.env).forEach(k => c.out(`${k}=${c.sh.env[k]}\n`));
    },
    printenv(c) {
      if (c.args[0]) { if (c.sh.env[c.args[0]] == null) return 1; c.out(c.sh.env[c.args[0]] + '\n'); return 0; }
      return core.env(Object.assign({}, c, { args: [] }));
    },
    export(c) {
      c.args.forEach(a => { const i = a.indexOf('='); if (i > 0) c.sh.env[a.slice(0, i)] = a.slice(i + 1); });
    },
    unset(c) { c.args.forEach(a => delete c.sh.env[a]); },
    whoami(c) { c.out(c.sh.user + '\n'); },
    id(c) { c.out(c.sh.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)\n' : `uid=${c.sh.uid || 1000}(${c.sh.user}) gid=${c.sh.uid || 1000}(${c.sh.user}) groups=${c.sh.uid || 1000}(${c.sh.user})\n`); },
    hostname(c) { c.out(c.sh.host + '\n'); },
    date(c) { c.out(new Date().toUTCString().replace('GMT', 'UTC') + '\n'); },
    async sleep(c) {
      const s = parseFloat(c.args[0] || '0') * (/m$/.test(c.args[0]) ? 60 : /h$/.test(c.args[0]) ? 3600 : 1);
      if (c.args[0] === 'infinity') { await new Promise(r => { if (c.io.signal) c.io.signal.addEventListener('abort', r); }); return 130; }
      const ok = await U.sleep(s * 1000, c.io.signal);
      return ok ? 0 : 130;
    },
    exit(c) { throw new ExitSignal(c.args[0] != null ? (+c.args[0] || 0) & 255 : c.sh.last); },
    clear(c) { if (c.io.clear) c.io.clear(); },
    history(c) { c.sh.history.forEach((h, i) => c.out(`${String(i + 1).padStart(5)}  ${h}\n`)); },
    basename(c) { c.out(base(c.args[0] || '') + '\n'); },
    dirname(c) { c.out(parent(c.args[0] || '.') + '\n'); },
    test(c) { return testExpr(c, c.args); },
    '['(c) { const a = c.args.slice(); if (a[a.length - 1] === ']') a.pop(); return testExpr(c, a); },
    type(c) { c.args.forEach(a => c.out(c.sh.cmds[a] ? `${a} is /usr/bin/${a}\n` : `${c.sh.name}: type: ${a}: not found\n`)); },
    which(c) { let code = 0; c.args.forEach(a => { if (c.sh.cmds[a] && !['cd', 'export', 'exit', 'history'].includes(a)) c.out(`/usr/bin/${a}\n`); else code = 1; }); return code; },
    tree(c) {
      const root = c.sh.abs(c.args.find(a => !a.startsWith('-')) || '.');
      if (c.sh.fs.stat(root) !== 'dir') { c.err(`${c.args[0]} [error opening dir]\n`); return 2; }
      let nd = 0, nf = 0;
      c.out((c.args.find(a => !a.startsWith('-')) || '.') + '\n');
      const rec = (p, pre) => {
        const names = c.sh.fs.ls(p).filter(n => !n.startsWith('.') || c.args.includes('-a'));
        names.forEach((n, i) => {
          const last = i === names.length - 1;
          const fp = (p === '/' ? '' : p) + '/' + n;
          const isD = c.sh.fs.stat(fp) === 'dir';
          c.out(pre + (last ? '└── ' : '├── ') + (isD && !c.io.piped ? `\x1b[1;34m${n}\x1b[0m` : n) + '\n');
          if (isD) { nd++; rec(fp, pre + (last ? '    ' : '│   ')); } else nf++;
        });
      };
      rec(root, '');
      c.out(`\n${nd} director${nd === 1 ? 'y' : 'ies'}, ${nf} file${nf === 1 ? '' : 's'}\n`);
    },
    jobs(c) { c.sh.jobs.forEach(j => c.out(`[${j.n}]${j.done ? '  Done   ' : '+ Running'}                 ${j.cmd}\n`)); },
    uname(c) {
      const k = c.sh.kernel || 'Linux';
      if (c.args.includes('-a')) c.out(`Linux ${c.sh.host} 6.10.14-linuxkit #1 SMP ${new Date().toDateString()} x86_64 GNU/Linux\n`);
      else if (c.args.includes('-r')) c.out('6.10.14-linuxkit\n');
      else if (c.args.includes('-m')) c.out('x86_64\n');
      else c.out(k + '\n');
    },
    source(c) {
      const p = c.sh.abs(c.args[0] || ''); const s = c.sh.fs.read(p);
      if (s == null) { c.err(`${c.sh.name}: ${c.args[0]}: No such file or directory\n`); return 1; }
      return c.sh.exec(s, c.io);
    }
  };
  core['.'] = core.source;

  function headTail(c, head) {
    let n = 10; const files = [];
    for (let i = 0; i < c.args.length; i++) {
      const a = c.args[i];
      if (a === '-n') n = +c.args[++i];
      else if (/^-\d+$/.test(a)) n = +a.slice(1);
      else if (/^-n\d+$/.test(a)) n = +a.slice(2);
      else if (a === '-f') {}
      else files.push(a);
    }
    let s = files.length ? c.sh.fs.read(c.sh.abs(files[0])) : c.stdin || '';
    if (s == null) { c.err(`${head ? 'head' : 'tail'}: cannot open '${files[0]}' for reading: No such file or directory\n`); return 1; }
    const lines = s.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
    const pick = head ? lines.slice(0, n) : lines.slice(Math.max(0, lines.length - n));
    c.out(pick.join('\n') + (pick.length ? '\n' : ''));
  }
  function testExpr(c, a) {
    if (a[0] === '!') return testExpr(c, a.slice(1)) ? 0 : 1;
    if (a.length === 2) {
      const p = c.sh.abs(a[1]);
      if (a[0] === '-f') return c.sh.fs.stat(p) === 'file' ? 0 : 1;
      if (a[0] === '-d') return c.sh.fs.stat(p) === 'dir' ? 0 : 1;
      if (a[0] === '-e') return c.sh.fs.stat(p) ? 0 : 1;
      if (a[0] === '-z') return a[1] === '' ? 0 : 1;
      if (a[0] === '-n') return a[1] !== '' ? 0 : 1;
    }
    if (a.length === 3) {
      const [x, op, y] = a;
      const r = { '=': x === y, '==': x === y, '!=': x !== y, '-eq': +x === +y, '-ne': +x !== +y, '-lt': +x < +y, '-le': +x <= +y, '-gt': +x > +y, '-ge': +x >= +y }[op];
      return r ? 0 : 1;
    }
    if (a.length === 1) return a[0] !== '' ? 0 : 1;
    return 1;
  }

  window.Sh = { Shell, ExitSignal, tokenize, parse, core, flags };
})();
