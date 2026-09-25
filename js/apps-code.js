/* ===================================================================
   코드 실행 흉내 — 학생이 만든 Python(Flask/FastAPI) · Node(Express) · Go 앱
   실제 인터프리터가 아니라 "교육용 예제에 나오는 모양"을 이해하는 작은 해석기
   - import 한 패키지가 이미지에 설치되어 있는지 확인 (없으면 ModuleNotFoundError)
   - print / console.log, 환경 변수, 소켓 호스트 이름, Redis INCR, SQL 조회
   - 라우트(@app.route, app.get) → 가상 HTTP 서버
   =================================================================== */
(function () {
  'use strict';

  const PY_STD = new Set('os sys time json socket random math datetime platform http urllib logging re pathlib subprocess threading signal collections typing uuid hashlib base64 string itertools functools shutil tempfile argparse csv sqlite3 asyncio dataclasses enum io traceback copy pprint statistics decimal fractions secrets zoneinfo'.split(' '));
  const PIP_ALIAS = { 'psycopg2-binary': 'psycopg2', 'python-dotenv': 'dotenv', 'pymysql': 'pymysql', 'mysql-connector-python': 'mysql', 'scikit-learn': 'sklearn', 'pyyaml': 'yaml', 'pillow': 'PIL', 'beautifulsoup4': 'bs4', 'opencv-python': 'cv2', 'opencv-python-headless': 'cv2', 'uvicorn[standard]': 'uvicorn', 'fastapi[standard]': 'fastapi' };
  const PIP_DEPS = { flask: ['werkzeug', 'jinja2', 'click', 'itsdangerous', 'markupsafe', 'blinker'], fastapi: ['starlette', 'pydantic'], requests: ['urllib3', 'idna', 'certifi', 'charset_normalizer'] };
  const NODE_CORE = new Set('fs path http https os url util events crypto child_process stream process net dns zlib readline querystring cluster assert buffer timers'.split(' '));

  class PyError extends Error { constructor(type, msg) { super(msg); this.type = type; } }

  /* ------------------------------------------------ 문자열 쪼개기 도구 --- */
  function splitTop(s, sep) {
    // 괄호 · 따옴표 밖의 구분자로 나누기
    const out = []; let cur = '', d = 0, q = null;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { cur += ch; if (ch === '\\') { cur += s[++i] || ''; continue; } if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { q = ch; cur += ch; continue; }
      if ('([{'.includes(ch)) d++;
      if (')]}'.includes(ch)) d--;
      if (!d && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
  function matchParen(s, i) {
    // s[i] 가 여는 괄호일 때 닫는 위치
    const open = s[i], close = { '(': ')', '[': ']', '{': '}' }[open];
    let d = 0, q = null;
    for (let j = i; j < s.length; j++) {
      const ch = s[j];
      if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; }
      if (ch === open) d++;
      else if (ch === close) { d--; if (!d) return j; }
    }
    return -1;
  }
  function args(s) { return s.trim() ? splitTop(s, ',').map(x => x.trim()) : []; }
  function kwargs(list) { const kw = {}, pos = []; list.forEach(a => { const m = a.match(/^(\w+)\s*=\s*([\s\S]+)$/); if (m && !/^[\w.]+\s*==/.test(a)) kw[m[1]] = m[2]; else pos.push(a); }); return { kw, pos }; }
  function unq(s) { s = String(s || '').trim(); return /^(['"`]).*\1$/s.test(s) ? s.slice(1, -1) : s; }

  function pyRepr(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True'; if (v === false) return 'False';
    if (typeof v === 'string') return "'" + v + "'";
    if (Array.isArray(v)) return v.tuple ? '(' + v.map(pyRepr).join(', ') + (v.length === 1 ? ',' : '') + ')' : '[' + v.map(pyRepr).join(', ') + ']';
    if (typeof v === 'object') return '{' + Object.keys(v).map(k => pyRepr(k) + ': ' + pyRepr(v[k])).join(', ') + '}';
    return String(v);
  }
  function pyStr(v) { return typeof v === 'string' ? v : pyRepr(v); }
  function jsStr(v) { return typeof v === 'string' ? v : v === undefined ? 'undefined' : typeof v === 'object' ? JSON.stringify(v) : String(v); }

  /* ------------------------------------------------ 식 계산 (Python · JS 공용) --- */
  /**
   * ctx: { lang:'py'|'js', vars, env(환경 변수), host(호스트 이름), fns(사용자 함수), app(엔진 정보: engine, c), req }
   */
  async function evalExpr(src, ctx) {
    let s = String(src == null ? '' : src).trim().replace(/;$/, '').trim();
    if (!s) return undefined;
    if (/^await\s+/.test(s)) s = s.replace(/^await\s+/, '');
    // 괄호로 감싼 식
    if (s[0] === '(' && matchParen(s, 0) === s.length - 1) {
      const inner = s.slice(1, -1);
      const parts = args(inner);
      if (parts.length > 1 && ctx.lang === 'py') { const t = []; for (const p of parts) t.push(await evalExpr(p, ctx)); t.tuple = true; return t; }
      return evalExpr(inner, ctx);
    }
    // 삼항 (JS) — 간단히
    // 논리 연산
    const orParts = splitTop(s, ctx.lang === 'py' ? ' or ' : '||');
    if (orParts.length > 1) { for (const p of orParts) { const v = await evalExpr(p, ctx); if (v) return v; } return evalExpr(orParts[orParts.length - 1], ctx); }
    if (ctx.lang === 'js') { const nq = splitTop(s, '??'); if (nq.length > 1) { for (const p of nq) { const v = await evalExpr(p, ctx); if (v != null) return v; } return undefined; } }
    const andParts = splitTop(s, ctx.lang === 'py' ? ' and ' : '&&');
    if (andParts.length > 1) { let v; for (const p of andParts) { v = await evalExpr(p, ctx); if (!v) return v; } return v; }
    if (ctx.lang === 'py' && /^not\s+/.test(s)) return !(await evalExpr(s.slice(4), ctx));
    if (ctx.lang === 'js' && /^!/.test(s) && !/^!=/.test(s)) return !(await evalExpr(s.slice(1), ctx));
    // 비교
    for (const op of ['===', '!==', '==', '!=', '>=', '<=', ' is not ', ' is ', ' in ', '>', '<']) {
      const ps = splitTop(s, op);
      if (ps.length === 2 && ps[0].trim() && ps[1].trim()) {
        const a = await evalExpr(ps[0], ctx), b = await evalExpr(ps[1], ctx);
        switch (op) {
          case '===': case '==': case ' is ': return a === b || (a == b && typeof a !== 'object');
          case '!==': case '!=': case ' is not ': return !(a === b || (a == b && typeof a !== 'object'));
          case '>=': return a >= b; case '<=': return a <= b; case '>': return a > b; case '<': return a < b;
          case ' in ': return Array.isArray(b) ? b.includes(a) : typeof b === 'string' ? b.includes(a) : b && typeof b === 'object' ? a in b : false;
        }
      }
    }
    // 더하기 · 빼기
    const plus = splitTop(s, '+').filter((x, i, arr) => !(x.trim() === '' && i < arr.length - 1));
    if (plus.length > 1 && !/^[+-]?\d/.test(s.trim()) || plus.length > 2) {
      const vals = []; for (const p of plus) vals.push(await evalExpr(p, ctx));
      if (vals.every(v => typeof v === 'number')) return vals.reduce((a, b) => a + b, 0);
      if (ctx.lang === 'py' && vals.some(v => typeof v === 'number') && vals.some(v => typeof v === 'string')) throw new PyError('TypeError', 'can only concatenate str (not "int") to str');
      return vals.map(v => ctx.lang === 'py' ? pyStr(v) : jsStr(v)).join('');
    }
    const minus = splitTop(s, ' - ');
    if (minus.length > 1) { let v = await evalExpr(minus[0], ctx); for (const p of minus.slice(1)) v -= await evalExpr(p, ctx); return v; }
    const mul = splitTop(s, ' * ');
    if (mul.length > 1) { let v = await evalExpr(mul[0], ctx); for (const p of mul.slice(1)) { const b = await evalExpr(p, ctx); v = typeof v === 'string' ? v.repeat(b) : v * b; } return v; }
    const div = splitTop(s, ' / ');
    if (div.length > 1) { let v = await evalExpr(div[0], ctx); for (const p of div.slice(1)) v /= await evalExpr(p, ctx); return v; }
    // 리터럴
    if (/^-?\d+(\.\d+)?$/.test(s)) return +s;
    if (/^(True|true)$/.test(s)) return true;
    if (/^(False|false)$/.test(s)) return false;
    if (/^(None|null|undefined)$/.test(s)) return null;
    if (/^[rbu]?(['"])(?:\\.|(?!\1).)*\1$/s.test(s) || /^[rbu]?("""|''')[\s\S]*\1$/.test(s)) {
      const q3 = s.match(/^[rbu]?("""|''')/);
      let body = q3 ? s.replace(/^[rbu]?("""|''')/, '').slice(0, -3) : s.replace(/^[rbu]?/, '').slice(1, -1);
      return unescape(body);
    }
    if (/^f(['"])(?:\\.|(?!\1).)*\1$/s.test(s) || /^f("""|''')[\s\S]*\1$/.test(s)) {
      const q3 = s.match(/^f("""|''')/);
      const body = q3 ? s.slice(4, -3) : s.slice(2, -1);
      return interpolate(unescape(body), /\{([^{}]+)\}/g, ctx);
    }
    if (s[0] === '`' && s[s.length - 1] === '`') return interpolate(s.slice(1, -1), /\$\{([^{}]+)\}/g, ctx);
    if (s[0] === '{' && matchParen(s, 0) === s.length - 1) {
      const obj = {};
      for (const ent of args(s.slice(1, -1))) {
        if (!ent) continue;
        const kv = splitTop(ent, ':');
        if (kv.length < 2) { const k = ent.trim(); obj[k] = await evalExpr(k, ctx); continue; }
        const k = unq(kv[0].trim()); obj[k] = await evalExpr(kv.slice(1).join(':'), ctx);
      }
      return obj;
    }
    if (s[0] === '[' && matchParen(s, 0) === s.length - 1) { const out = []; for (const a of args(s.slice(1, -1))) out.push(await evalExpr(a, ctx)); return out; }

    // 호출 · 속성
    const env = ctx.env || {};
    let m;
    if ((m = s.match(/^os\.environ\.get\((.+)\)$/)) || (m = s.match(/^os\.getenv\((.+)\)$/))) {
      const a = args(m[1]); const k = await evalExpr(a[0], ctx);
      return env[k] != null ? env[k] : a[1] != null ? evalExpr(a[1], ctx) : null;
    }
    if ((m = s.match(/^os\.environ\[(.+)\]$/))) { const k = await evalExpr(m[1], ctx); if (env[k] == null) throw new PyError('KeyError', `'${k}'`); return env[k]; }
    if ((m = s.match(/^process\.env\.(\w+)$/)) || (m = s.match(/^process\.env\[['"](\w+)['"]\]$/))) return env[m[1]] != null ? env[m[1]] : undefined;
    if (/^(socket\.gethostname|platform\.node|os\.hostname|os\.uname\(\)\.nodename|require\(['"]os['"]\)\.hostname)\(\)$/.test(s) || s === 'os.uname().nodename') return ctx.host;
    if (/^(datetime\.(datetime\.)?now\(\)(\.isoformat\(\))?|new Date\(\)(\.toISOString\(\))?|Date\(\)|time\.ctime\(\))$/.test(s)) return new Date().toISOString();
    if (/^(time\.time\(\)|Date\.now\(\))$/.test(s)) return Date.now() / (ctx.lang === 'py' ? 1000 : 1);
    if (/^(random\.random\(\)|Math\.random\(\))$/.test(s)) return Math.random();
    if ((m = s.match(/^random\.randint\((.+)\)$/))) { const [a, b] = args(m[1]); const x = await evalExpr(a, ctx), y = await evalExpr(b, ctx); return x + Math.floor(Math.random() * (y - x + 1)); }
    if ((m = s.match(/^(str|String)\((.*)\)$/))) { const v = await evalExpr(m[2], ctx); return ctx.lang === 'py' ? pyStr(v) : jsStr(v); }
    if ((m = s.match(/^(int|Number|parseInt|float|parseFloat)\((.*)\)$/))) { const v = await evalExpr(args(m[2])[0], ctx); const n = Number(v); if (isNaN(n) && ctx.lang === 'py') throw new PyError('ValueError', `invalid literal for int() with base 10: '${v}'`); return /int/i.test(m[1]) ? Math.trunc(n) : n; }
    if ((m = s.match(/^len\((.*)\)$/))) { const v = await evalExpr(m[1], ctx); return v ? (v.length != null ? v.length : Object.keys(v).length) : 0; }
    if ((m = s.match(/^(json\.dumps|JSON\.stringify|jsonify)\((.*)\)$/s))) { const a = args(m[2]); const v = a.length > 1 && m[1] === 'jsonify' ? await evalExpr('{' + a.map(x => x.replace(/^(\w+)\s*=/, '"$1":')).join(',') + '}', ctx) : await evalExpr(a[0], ctx); return m[1] === 'jsonify' ? { __json: v } : JSON.stringify(v); }
    if ((m = s.match(/^request\.args\.get\((.+)\)$/))) { const a = args(m[1]); const k = await evalExpr(a[0], ctx); const q = (ctx.req && ctx.req.query) || {}; return q[k] != null ? q[k] : a[1] ? evalExpr(a[1], ctx) : null; }
    if ((m = s.match(/^req\.(query|params)\.(\w+)$/))) { const q = (ctx.req && ctx.req[m[1]]) || {}; return q[m[2]]; }
    if ((m = s.match(/^(.+)\.(decode|strip|trim)\((.*)\)$/))) return String(await evalExpr(m[1], ctx)).trim();
    if ((m = s.match(/^(.+)\.(upper|toUpperCase)\(\)$/))) return String(await evalExpr(m[1], ctx)).toUpperCase();
    if ((m = s.match(/^(.+)\.(lower|toLowerCase)\(\)$/))) return String(await evalExpr(m[1], ctx)).toLowerCase();
    if ((m = s.match(/^['"](.*)['"]\.join\((.+)\)$/))) { const v = await evalExpr(m[2], ctx); return (v || []).map(pyStr).join(m[1]); }
    if ((m = s.match(/^range\((.+)\)$/))) { const a = []; for (const x of args(m[1])) a.push(await evalExpr(x, ctx)); const [st, en] = a.length > 1 ? a : [0, a[0]]; return Array.from({ length: Math.max(0, en - st) }, (_, i) => st + i); }
    // 객체 메서드: redis · DB 커서
    if ((m = s.match(/^([\w.]+)\.(\w+)\(([\s\S]*)\)$/))) {
      const objName = m[1], meth = m[2];
      const obj = lookup(objName, ctx);
      if (obj && obj.__redis) {
        const a = []; for (const x of args(m[3])) a.push(await evalExpr(x, ctx));
        return ctx.app.redis(obj.__redis, meth, a, ctx);
      }
      if (obj && obj.__pgconn && meth === 'cursor') return { __cursor: obj.__pgconn, last: null };
      if (obj && obj.__pgconn && (meth === 'commit' || meth === 'close')) return null;
      if (obj && obj.__cursor) {
        if (meth === 'execute') { const sql = await evalExpr(args(m[3])[0], ctx); obj.last = await ctx.app.sql(obj.__cursor, sql, ctx); return null; }
        if (meth === 'fetchall') { const r = obj.last || { rows: [] }; const rows = (r.rows || []).map(x => { const t = x.slice(); t.tuple = true; return t; }); return rows; }
        if (meth === 'fetchone') { const r = obj.last || { rows: [] }; const t = (r.rows || [])[0]; if (!t) return null; const x = t.slice(); x.tuple = true; return x; }
        if (meth === 'close') return null;
      }
      if (obj && obj.__mysqlpool && (meth === 'query' || meth === 'execute')) { const sql = await evalExpr(args(m[3])[0], ctx); const r = await ctx.app.sql(obj.__mysqlpool, sql, ctx); return r.rows ? r.rows.map(row => Object.fromEntries(r.cols.map((c, i) => [c, row[i]]))) : r; }
      if (obj && obj.__pgpool && meth === 'query') { const sql = await evalExpr(args(m[3])[0], ctx); const r = await ctx.app.sql(obj.__pgpool, sql, ctx); return { rows: r.rows ? r.rows.map(row => Object.fromEntries(r.cols.map((c, i) => [c, row[i]]))) : [] }; }
      if (typeof obj === 'string' && meth === 'format') { const a = []; for (const x of args(m[3])) a.push(await evalExpr(x, ctx)); let i = 0; return obj.replace(/\{(\d*)\}/g, (_, n) => pyStr(a[n === '' ? i++ : +n])); }
    }
    // 사용자 함수
    if ((m = s.match(/^(\w+)\(([\s\S]*)\)$/)) && ctx.fns && ctx.fns[m[1]]) {
      const a = []; for (const x of args(m[2])) a.push(await evalExpr(x, ctx));
      return ctx.callFn(m[1], a);
    }
    // 변수 · 속성
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(s)) {
      const v = lookup(s, ctx);
      if (v === undefined && ctx.lang === 'py' && !s.includes('.')) throw new PyError('NameError', `name '${s}' is not defined`);
      return v;
    }
    if ((m = s.match(/^([\w.]+)\[(.+)\]$/))) { const o = lookup(m[1], ctx); const k = await evalExpr(m[2], ctx); return o ? o[k] : undefined; }
    return s;
  }
  function lookup(name, ctx) {
    const parts = name.split('.');
    let v = ctx.vars && parts[0] in ctx.vars ? ctx.vars[parts[0]] : (ctx.globals && parts[0] in ctx.globals ? ctx.globals[parts[0]] : undefined);
    for (const p of parts.slice(1)) { if (v == null) return undefined; v = v[p]; }
    return v;
  }
  function unescape(s) { return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(['"\\])/g, '$1'); }
  async function interpolate(body, re, ctx) {
    const parts = []; let last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(body))) {
      parts.push(body.slice(last, m.index));
      let e = m[1]; let spec = '';
      if (ctx.lang === 'py') { const sp = splitTop(e, ':'); if (sp.length > 1 && !/^\s*\{/.test(e)) { e = sp[0]; spec = sp.slice(1).join(':'); } e = e.replace(/!r$/, ''); if (e.endsWith('=')) { e = e.slice(0, -1); parts.push(e + '='); } }
      let v = await evalExpr(e, ctx);
      if (spec && /\.\d+f/.test(spec) && typeof v === 'number') v = v.toFixed(+spec.match(/\.(\d+)f/)[1]);
      parts.push(ctx.lang === 'py' ? pyStr(v) : jsStr(v));
      last = m.index + m[0].length;
    }
    parts.push(body.slice(last));
    return parts.join('');
  }

  /* ================================================================ Python 해석기 */
  /** 줄 → 블록 트리 { text, indent, kids } */
  function pyBlocks(src) {
    const raw = src.replace(/\r/g, '').split('\n');
    const lines = [];
    for (let i = 0; i < raw.length; i++) {
      let l = raw[i];
      if (!l.trim() || /^\s*#/.test(l)) continue;
      // 여러 줄에 걸친 괄호 · 삼중 따옴표 합치기
      let depth = 0, tq = (l.match(/"""|'''/g) || []).length % 2;
      const count = t => { let d = 0, q = null; for (let k = 0; k < t.length; k++) { const ch = t[k]; if (q) { if (ch === '\\') { k++; continue; } if (ch === q) q = null; continue; } if (ch === '#') break; if (ch === '"' || ch === "'") { if (t.substr(k, 3) === ch.repeat(3)) { k += 2; continue; } q = ch; continue; } if ('([{'.includes(ch)) d++; if (')]}'.includes(ch)) d--; } return d; };
      depth = count(l);
      while ((depth > 0 || tq) && i + 1 < raw.length) { i++; l += '\n' + raw[i]; if ((raw[i].match(/"""|'''/g) || []).length % 2) tq = !tq; depth += count(raw[i]); }
      const indent = l.match(/^\s*/)[0].replace(/\t/g, '    ').length;
      lines.push({ text: l.trim().replace(/\s+#[^'"]*$/, ''), indent, kids: [] });
    }
    const root = { indent: -1, kids: [] };
    const stack = [root];
    lines.forEach(ln => {
      while (stack.length > 1 && stack[stack.length - 1].indent >= ln.indent) stack.pop();
      stack[stack.length - 1].kids.push(ln);
      stack.push(ln);
    });
    return root.kids;
  }

  class Flow { constructor(kind, value) { this.kind = kind; this.value = value; } }

  /**
   * Python 프로그램
   * rt: { out(s), err(s), env, host, signal, engine, c, file, pkgs(Set), fs, listen(port, handler, bind), sleep }
   */
  class PyProgram {
    constructor(src, rt) {
      this.src = src; this.rt = rt;
      this.globals = { __name__: '__main__' };
      this.fns = {};
      this.routes = [];
      this.app = null;
      this.blocks = pyBlocks(src);
      this.ctx = {
        lang: 'py', env: rt.env, host: rt.host, globals: this.globals, vars: this.globals, fns: this.fns,
        callFn: (n, a) => this.call(n, a), app: rt.bridge
      };
    }
    checkImports() {
      const mods = new Set();
      this.src.replace(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.,\s]+))/gm, (_, a, b) => { (a ? [a] : b.split(',')).forEach(x => mods.add(x.trim().split(/\s+as\s+/)[0].split('.')[0])); });
      for (const m of mods) {
        if (!m || PY_STD.has(m)) continue;
        if (!this.rt.pkgs.has('py:' + m.toLowerCase())) return m;
      }
      return null;
    }
    tb(e, line) {
      const f = this.rt.file || 'app.py';
      return `Traceback (most recent call last):\n  File "${f}", line ${line || 1}, in <module>\n${e.type}: ${e.message}\n`;
    }
    async run() {
      const missing = this.checkImports();
      if (missing) {
        const ln = this.src.split('\n').findIndex(l => new RegExp('^\\s*(from|import)\\s+' + missing + '\\b').test(l)) + 1;
        this.rt.err(`Traceback (most recent call last):\n  File "${this.rt.file}", line ${ln}, in <module>\n    ${this.src.split('\n')[ln - 1].trim()}\nModuleNotFoundError: No module named '${missing}'\n`);
        return 1;
      }
      try {
        const r = await this.exec(this.blocks, this.globals);
        if (r instanceof Flow && r.kind === 'exit') return r.value;
      } catch (e) {
        if (e instanceof PyError) {
          const ln = e.line || 1;
          this.rt.err(this.tb(e, ln));
          return 1;
        }
        if (e && e.exitCode != null) return e.exitCode;
        throw e;
      }
      if (this.serving) return this.serving;
      return 0;
    }
    lineOf(b) { const i = this.src.indexOf(b.text.split('\n')[0]); return i < 0 ? 1 : this.src.slice(0, i).split('\n').length; }
    async call(name, argv) {
      const f = this.fns[name];
      if (!f) throw new PyError('NameError', `name '${name}' is not defined`);
      const scope = Object.create(null);
      Object.assign(scope, this.globals);
      f.params.forEach((p, i) => { const [n, d] = p.split('='); scope[n.trim().replace(/:.*/, '')] = argv[i] !== undefined ? argv[i] : d != null ? this.evalIn(d, scope) : undefined; });
      const r = await this.exec(f.body, scope);
      return r instanceof Flow && r.kind === 'return' ? r.value : null;
    }
    evalIn(expr, scope) { return evalExpr(expr, Object.assign({}, this.ctx, { vars: scope, req: this.req })); }

    async exec(blocks, scope) {
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (this.rt.signal && this.rt.signal.aborted) return new Flow('exit', 0);
        const t = b.text;
        let m;
        try {
          if (/^(import|from)\s/.test(t)) {
            // import redis → 표시만
            continue;
          }
          if (t === 'pass' || /^global\s/.test(t) || /^@/.test(t) && !/^@app\./.test(t)) continue;
          if ((m = t.match(/^@(?:app|router|bp)\.(route|get|post|put|delete)\((.*)\)$/s))) {
            const a = args(m[2]); const path = unq(a[0]);
            const methods = m[1] === 'route' ? ((a.find(x => /^methods\s*=/.test(x)) || '').match(/[A-Z]+/g) || ['GET']) : [m[1].toUpperCase()];
            const def = blocks[i + 1];
            if (def && /^(async\s+)?def\s/.test(def.text)) this.routes.push({ path, methods, fn: def.text.match(/def\s+(\w+)/)[1] });
            continue;
          }
          if ((m = t.match(/^(?:async\s+)?def\s+(\w+)\s*\((.*)\)\s*(->.*)?:$/s))) {
            this.fns[m[1]] = { params: args(m[2]).filter(x => x && x !== 'self'), body: b.kids };
            continue;
          }
          if ((m = t.match(/^class\s+(\w+)/))) continue;
          if ((m = t.match(/^if\s+(.+):$/s))) {
            // if / elif / else 사슬
            const chain = [{ cond: m[1], body: b.kids }];
            while (blocks[i + 1] && /^(elif\s.+|else):$/s.test(blocks[i + 1].text)) {
              i++;
              const mm = blocks[i].text.match(/^elif\s+(.+):$/s);
              chain.push({ cond: mm ? mm[1] : null, body: blocks[i].kids });
            }
            for (const br of chain) {
              if (br.cond == null || (/__name__\s*==\s*['"]__main__['"]/.test(br.cond) ? true : await this.evalIn(br.cond, scope))) {
                const r = await this.exec(br.body, scope); if (r) return r; break;
              }
            }
            continue;
          }
          if ((m = t.match(/^while\s+(.+):$/s))) {
            let n = 0;
            while (m[1] === 'True' || m[1] === '1' || await this.evalIn(m[1], scope)) {
              if (this.rt.signal && this.rt.signal.aborted) return new Flow('exit', 0);
              const r = await this.exec(b.kids, scope);
              if (r && r.kind === 'break') break;
              if (r && r.kind !== 'continue') return r;
              if (++n % 20 === 0) await this.rt.sleep(5);
              if (n > 200000) break;
            }
            continue;
          }
          if ((m = t.match(/^for\s+(\w+(?:\s*,\s*\w+)?)\s+in\s+(.+):$/s))) {
            const it = await this.evalIn(m[2], scope);
            const list = Array.isArray(it) ? it : typeof it === 'string' ? it.split('') : it && typeof it === 'object' ? Object.keys(it) : [];
            for (const x of list) {
              if (this.rt.signal && this.rt.signal.aborted) return new Flow('exit', 0);
              const names = m[1].split(',').map(s => s.trim());
              if (names.length > 1 && Array.isArray(x)) names.forEach((n, k) => { scope[n] = x[k]; }); else scope[names[0]] = x;
              const r = await this.exec(b.kids, scope);
              if (r && r.kind === 'break') break;
              if (r && r.kind !== 'continue') return r;
            }
            continue;
          }
          if (t === 'try:') {
            const handlers = [];
            let fin = null;
            while (blocks[i + 1] && /^(except\b.*|finally|else):$/.test(blocks[i + 1].text)) { i++; if (blocks[i].text === 'finally:') fin = blocks[i].kids; else handlers.push(blocks[i]); }
            try {
              const r = await this.exec(b.kids, scope); if (r) return r;
            } catch (e) {
              if (!(e instanceof PyError)) throw e;
              const h = handlers.find(hh => /^except/.test(hh.text));
              if (!h) throw e;
              const as = h.text.match(/as\s+(\w+)\s*:$/); if (as) scope[as[1]] = e;
              const r = await this.exec(h.kids, scope); if (r) return r;
            } finally {
              if (fin) await this.exec(fin, scope);
            }
            continue;
          }
          if ((m = t.match(/^with\s+open\((.+?)\)\s+as\s+(\w+)\s*:$/s))) {
            const a = args(m[1]); const path = await this.evalIn(a[0], scope); const mode = a[1] ? await this.evalIn(a[1], scope) : 'r';
            const fh = this.fileHandle(path, mode);
            scope[m[2]] = fh;
            const r = await this.exec(b.kids, scope); if (r) return r;
            continue;
          }
          if (t === 'break') return new Flow('break');
          if (t === 'continue') return new Flow('continue');
          if ((m = t.match(/^return\b\s*(.*)$/s))) return new Flow('return', m[1] ? await this.evalRet(m[1], scope) : null);
          if ((m = t.match(/^raise\s*(.*)$/s))) {
            if (!m[1]) throw new PyError('RuntimeError', 'No active exception to reraise');
            const v = scope[m[1].trim()];
            if (v instanceof PyError) throw v;
            const mm = m[1].match(/^([\w.]+)\((.*)\)$/s);
            throw Object.assign(new PyError(mm ? mm[1].split('.').pop() : m[1], mm ? pyStr(await this.evalIn(mm[2] || "''", scope)) : ''), { line: this.lineOf(b) });
          }
          if ((m = t.match(/^(sys\.exit|exit|quit|os\._exit)\((.*)\)$/))) { return new Flow('exit', m[2] ? +(await this.evalIn(m[2], scope)) || 0 : 0); }
          if ((m = t.match(/^print\((.*)\)$/s))) {
            const a = kwargs(args(m[1]));
            const vals = []; for (const x of a.pos) vals.push(pyStr(await this.evalIn(x, scope)));
            const sep = a.kw.sep ? await this.evalIn(a.kw.sep, scope) : ' ';
            const end = a.kw.end ? await this.evalIn(a.kw.end, scope) : '\n';
            const text = vals.join(sep) + end;
            if (a.kw.file && /stderr/.test(a.kw.file)) this.rt.err(text); else this.rt.out(text);
            continue;
          }
          if ((m = t.match(/^time\.sleep\((.+)\)$/)) || (m = t.match(/^(?:await\s+)?asyncio\.sleep\((.+)\)$/))) {
            const sec = +(await this.evalIn(m[1], scope)) || 0;
            const ok = await this.rt.sleep(sec * 1000);
            if (!ok) return new Flow('exit', 0);
            continue;
          }
          if ((m = t.match(/^(\w+)\s*=\s*input\((.*)\)$/))) { throw Object.assign(new PyError('EOFError', 'EOF when reading a line'), { line: this.lineOf(b) }); }
          if ((m = t.match(/^(\w+)\.write\((.+)\)$/s)) && scope[m[1]] && scope[m[1]].__file) { scope[m[1]].write(pyStr(await this.evalIn(m[2], scope))); continue; }
          if ((m = t.match(/^(\w+)\s*=\s*(Flask|FastAPI)\((.*)\)$/))) { this.app = { kind: m[2].toLowerCase(), name: m[1] }; scope[m[1]] = { __app: true }; continue; }
          if ((m = t.match(/^(\w+)\s*=\s*redis\.(?:Redis|StrictRedis)\((.*)\)$/s))) { const kw = kwargs(args(m[2])).kw; scope[m[1]] = { __redis: { host: kw.host ? await this.evalIn(kw.host, scope) : 'localhost', port: kw.port ? +(await this.evalIn(kw.port, scope)) : 6379 } }; continue; }
          if ((m = t.match(/^(\w+)\s*=\s*redis\.from_url\((.*)\)$/s))) { const u = String(await this.evalIn(args(m[2])[0], scope)); const mm = u.match(/redis:\/\/([^:/]+)(?::(\d+))?/) || []; scope[m[1]] = { __redis: { host: mm[1] || 'localhost', port: +(mm[2] || 6379) } }; continue; }
          if ((m = t.match(/^(\w+)\s*=\s*(?:psycopg2|psycopg|pymysql|mysql\.connector)\.connect\((.*)\)$/s))) {
            const kw = kwargs(args(m[2])).kw; const o = {};
            for (const k of Object.keys(kw)) o[k] = await this.evalIn(kw[k], scope);
            const flavor = /pymysql|mysql/.test(t) ? 'mysql' : 'postgres';
            const conn = { flavor, host: o.host || 'localhost', user: o.user || (flavor === 'mysql' ? 'root' : 'postgres'), password: o.password || o.passwd || '', db: o.dbname || o.database || o.db || '', port: +(o.port || (flavor === 'mysql' ? 3306 : 5432)) };
            await this.rt.bridge.sqlConnect(conn, this.ctx);
            scope[m[1]] = { __pgconn: conn };
            continue;
          }
          if ((m = t.match(/^(\w+)\.run\((.*)\)$/s)) && scope[m[1]] && scope[m[1]].__app) {
            const kw = kwargs(args(m[2])).kw;
            const host = kw.host ? await this.evalIn(kw.host, scope) : '127.0.0.1';
            const port = kw.port ? +(await this.evalIn(kw.port, scope)) : 5000;
            await this.serve(host, port, 'flask');
            return new Flow('exit', this.serving || 0);
          }
          if ((m = t.match(/^uvicorn\.run\((.*)\)$/s))) {
            const kw = kwargs(args(m[1])).kw;
            await this.serve(kw.host ? await this.evalIn(kw.host, scope) : '127.0.0.1', kw.port ? +(await this.evalIn(kw.port, scope)) : 8000, 'uvicorn');
            return new Flow('exit', 0);
          }
          // 대입
          if ((m = t.match(/^([\w.]+)\s*([+\-*/]?=)\s*([\s\S]+)$/)) && !/^[\w.]+\s*==/.test(t)) {
            let v = await this.evalIn(m[3], scope);
            const cur = scope[m[1]];
            if (m[2] === '+=') v = cur + v; else if (m[2] === '-=') v = cur - v; else if (m[2] === '*=') v = cur * v; else if (m[2] === '/=') v = cur / v;
            if (m[1].includes('.')) { const [o, k] = [m[1].slice(0, m[1].lastIndexOf('.')), m[1].split('.').pop()]; const obj = lookup(o, { vars: scope }); if (obj) obj[k] = v; }
            else scope[m[1]] = v;
            continue;
          }
          if ((m = t.match(/^(\w+)\s*,\s*(\w+)\s*=\s*(.+)$/))) { const v = await this.evalIn(m[3], scope); scope[m[1]] = v && v[0]; scope[m[2]] = v && v[1]; continue; }
          // 그 밖의 식 (함수 호출 등)
          await this.evalIn(t, scope);
        } catch (e) {
          if (e instanceof PyError && !e.line) e.line = this.lineOf(b);
          throw e;
        }
      }
      return null;
    }
    async evalRet(expr, scope) {
      const parts = args(expr);
      if (parts.length === 2 && /^\d{3}$/.test(parts[1].trim())) return { __resp: await this.evalIn(parts[0], scope), status: +parts[1] };
      return this.evalIn(expr, scope);
    }
    fileHandle(path, mode) {
      const fs = this.rt.fs; const p = VFS.norm(path, this.rt.cwd || '/');
      if (/r/.test(mode) && !/[wa+]/.test(mode)) {
        const c = fs.read(p); if (c == null) throw new PyError('FileNotFoundError', `[Errno 2] No such file or directory: '${path}'`);
        return { __file: true, read: () => c, content: c };
      }
      if (/w/.test(mode)) { try { fs.write(p, ''); } catch (e) { throw new PyError(/Read-only/.test(e.message) ? 'OSError' : 'PermissionError', /Read-only/.test(e.message) ? `[Errno 30] Read-only file system: '${path}'` : `[Errno 13] Permission denied: '${path}'`); } }
      if (fs.stat(VFS.parent(p)) !== 'dir') throw new PyError('FileNotFoundError', `[Errno 2] No such file or directory: '${path}'`);
      return { __file: true, write: s => { try { fs.write(p, (fs.read(p) || '') + s); } catch (e) { throw new PyError('PermissionError', `[Errno 13] Permission denied: '${path}'`); } } };
    }

    /** 웹 서버로 동작 */
    async serve(host, port, how) {
      const rt = this.rt;
      const bind = /^(0\.0\.0\.0|::|\[::\])$/.test(host) ? '0.0.0.0' : '127.0.0.1';
      const ip = rt.ip || '172.17.0.2';
      if (how === 'flask') {
        rt.err(` * Serving Flask app '${(rt.file || 'app').replace(/\.py$/, '').split('/').pop()}'\n * Debug mode: off\n`);
        rt.err(`\x1b[31m\x1b[1mWARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.\x1b[0m\n`);
        rt.err(bind === '0.0.0.0' ? ` * Running on all addresses (0.0.0.0)\n * Running on http://127.0.0.1:${port}\n * Running on http://${ip}:${port}\n` : ` * Running on http://127.0.0.1:${port}\n`);
        rt.err(`\x1b[33mPress CTRL+C to quit\x1b[0m\n`);
      } else if (how === 'gunicorn') {
        const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + ' +0000';
        rt.err(`[${ts()}] [1] [INFO] Starting gunicorn 23.0.0\n[${ts()}] [1] [INFO] Listening at: http://${host}:${port} (1)\n[${ts()}] [1] [INFO] Using worker: sync\n[${ts()}] [7] [INFO] Booting worker with pid: 7\n`);
      } else {
        rt.err(`INFO:     Started server process [1]\nINFO:     Waiting for application startup.\nINFO:     Application startup complete.\nINFO:     Uvicorn running on http://${host}:${port} (Press CTRL+C to quit)\n`);
      }
      rt.listen(port, req => this.handle(req, how), bind);
      this.serving = 0;
      await rt.forever();
    }
    async handle(req, how) {
      const [path, qs] = req.path.split('?');
      const query = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
      let route = null, params = {};
      for (const r of this.routes) {
        const names = [];
        const re = new RegExp('^' + r.path.replace(/<(?:\w+:)?(\w+)>|\{(\w+)\}/g, (_, a, b) => { names.push(a || b); return '([^/]+)'; }) + '/?$');
        const m = path.match(re);
        if (m && r.methods.includes(req.method)) { route = r; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); }); break; }
      }
      const logLine = st => {
        const d = new Date(); const ds = d.toUTCString().slice(5, 25).replace(/ (\d{4}) /, '/$1:').replace(/ /g, '/');
        if (how === 'flask') this.rt.err(`${req.fromIp} - - [${ds}] "${req.method} ${req.path} HTTP/1.1" ${st} -\n`);
        else if (how !== 'gunicorn') this.rt.out(`INFO:     ${req.fromIp}:${40000 + (Math.random() * 20000 | 0)} - "${req.method} ${req.path} HTTP/1.1" ${st} ${st === 200 ? 'OK' : st === 404 ? 'Not Found' : 'Internal Server Error'}\n`);
      };
      if (!route) {
        logLine(404);
        return how === 'flask' ? { status: 404, body: '<!doctype html>\n<html lang=en>\n<title>404 Not Found</title>\n<h1>Not Found</h1>\n<p>The requested URL was not found on the server. If you entered the URL manually please check your spelling and try again.</p>\n', type: 'text/html' } : { status: 404, body: '{"detail":"Not Found"}', type: 'application/json' };
      }
      this.req = { query, params };
      const scope = Object.assign(Object.create(null), this.globals, params, { request: { args: query, method: req.method } });
      try {
        const f = this.fns[route.fn];
        const r = await this.exec(f.body, scope);
        let v = r instanceof Flow ? r.value : null;
        let status = 200;
        if (v && v.__resp !== undefined) { status = v.status; v = v.__resp; }
        logLine(status);
        if (v && v.__json !== undefined) return { status, body: JSON.stringify(v.__json) + '\n', type: 'application/json' };
        if (v && typeof v === 'object') return { status, body: JSON.stringify(v) + (how === 'flask' ? '\n' : ''), type: 'application/json' };
        return { status, body: pyStr(v == null ? '' : v), type: 'text/html; charset=utf-8' };
      } catch (e) {
        if (!(e instanceof PyError)) throw e;
        logLine(500);
        this.rt.err(`[${new Date().toISOString().replace('T', ' ').slice(0, 19)},000] ERROR in app: Exception on ${path} [${req.method}]\nTraceback (most recent call last):\n  File "/usr/local/lib/python3.12/site-packages/flask/app.py", line 1511, in wsgi_app\n    response = self.full_dispatch_request()\n  File "${this.rt.file}", line ${e.line || 1}, in ${route.fn}\n${e.type}: ${e.message}\n`);
        return how === 'flask' ? { status: 500, body: '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title>\n<h1>Internal Server Error</h1>\n<p>The server encountered an internal error and was unable to complete your request. Either the server is overloaded or there is an error in the application.</p>\n', type: 'text/html' } : { status: 500, body: 'Internal Server Error', type: 'text/plain' };
      }
    }
  }

  /* ================================================================ Node.js 해석기 (패턴 기반) */
  function jsStatements(src) {
    // 최상위 문장 나누기 (중괄호 · 괄호 · 문자열 고려)
    const out = []; let cur = '', d = 0, q = null;
    const s = src.replace(/\r/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { cur += ch; if (ch === '\\') { cur += s[++i] || ''; continue; } if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { q = ch; cur += ch; continue; }
      if ('([{'.includes(ch)) d++;
      if (')]}'.includes(ch)) d--;
      if (!d && (ch === ';' || ch === '\n')) {
        // 다음 줄이 . 으로 이어지면 계속
        const rest = s.slice(i + 1).trimStart();
        if (ch === '\n' && (/^[.?:]/.test(rest) || /[=+\-,(&|]$/.test(cur.trim()))) { cur += ch; continue; }
        if (cur.trim()) out.push(cur.trim()); cur = ''; continue;
      }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function jsFnBody(s) {
    // "(req, res) => { ... }" 또는 "function (req, res) { ... }" 또는 "(req,res) => res.send(..)"
    const arrow = s.indexOf('=>');
    const brace = s.indexOf('{', arrow >= 0 ? arrow : s.indexOf(')'));
    if (arrow >= 0) {
      const after = s.slice(arrow + 2).trim();
      if (after[0] !== '{') return [after];
      const st = s.indexOf('{', arrow); return jsStatements(s.slice(st + 1, matchParen(s, st)));
    }
    if (brace >= 0) return jsStatements(s.slice(brace + 1, matchParen(s, brace)));
    return [];
  }

  class NodeProgram {
    constructor(src, rt) {
      this.src = src; this.rt = rt;
      this.vars = {}; this.routes = []; this.intervals = [];
      this.ctx = { lang: 'js', env: rt.env, host: rt.host, vars: this.vars, app: rt.bridge };
    }
    checkRequires() {
      const mods = new Set();
      this.src.replace(/require\(\s*['"]([^'"]+)['"]\s*\)/g, (_, m) => mods.add(m));
      this.src.replace(/^\s*import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/gm, (_, m) => mods.add(m));
      for (let m of mods) {
        if (m.startsWith('.') || m.startsWith('/') || m.startsWith('node:')) continue;
        m = m.startsWith('@') ? m.split('/').slice(0, 2).join('/') : m.split('/')[0];
        if (NODE_CORE.has(m)) continue;
        if (!this.rt.pkgs.has('npm:' + m)) return m;
      }
      return null;
    }
    async run() {
      const missing = this.checkRequires();
      if (missing) {
        this.rt.err(`node:internal/modules/cjs/loader:1228\n  throw err;\n  ^\n\nError: Cannot find module '${missing}'\nRequire stack:\n- ${this.rt.file}\n    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)\n    at Module._load (node:internal/modules/cjs/loader:1051:27) {\n  code: 'MODULE_NOT_FOUND',\n  requireStack: [ '${this.rt.file}' ]\n}\n\nNode.js v22.11.0\n`);
        return 1;
      }
      try {
        for (const st of jsStatements(this.src)) {
          if (this.rt.signal && this.rt.signal.aborted) return 0;
          const r = await this.stmt(st, this.vars, null);
          if (r && r.exit != null) return r.exit;
        }
      } catch (e) {
        if (e instanceof PyError) { this.rt.err(`${this.rt.file}:1\n${e.type}: ${e.message}\n    at Object.<anonymous> (${this.rt.file}:1:1)\n\nNode.js v22.11.0\n`); return 1; }
        throw e;
      }
      if (this.listening || this.intervals.length) { await this.rt.forever(); return 0; }
      return 0;
    }
    async ev(expr, scope, extra) { return evalExpr(expr, Object.assign({}, this.ctx, { vars: scope }, extra || {})); }
    async stmt(st, scope, res) {
      let m;
      st = st.trim().replace(/;$/, '');
      if (!st || /^['"]use strict['"]$/.test(st)) return;
      if ((m = st.match(/^(?:const|let|var)\s+\{?\s*([\w\s,]+?)\s*\}?\s*=\s*require\(['"]([^'"]+)['"]\)(.*)$/s))) {
        const mod = m[2];
        m[1].split(',').map(x => x.trim()).forEach(n => { scope[n] = { __mod: mod }; });
        if (/\(\)$/.test(m[3].trim()) || /^express$/.test(mod) && /\(\)/.test(m[3])) scope[m[1].trim()] = { __app: true };
        return;
      }
      if (/^import\s/.test(st)) { const mm = st.match(/^import\s+(\w+)/); if (mm) scope[mm[1]] = { __mod: true }; return; }
      if ((m = st.match(/^(?:const|let|var)\s+(\w+)\s*=\s*express\(\)$/))) { scope[m[1]] = { __app: true }; this.appName = m[1]; return; }
      if ((m = st.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:redis\.)?createClient\((.*)\)$/s))) {
        let host = 'localhost', port = 6379;
        const o = m[2].trim() ? await this.ev(m[2], scope) : {};
        const url = o && (o.url || (o.socket && `redis://${o.socket.host}:${o.socket.port || 6379}`));
        if (url) { const mm = String(url).match(/redis:\/\/([^:/]+)(?::(\d+))?/); if (mm) { host = mm[1]; port = +(mm[2] || 6379); } }
        scope[m[1]] = { __redis: { host, port } }; return;
      }
      if ((m = st.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:new\s+)?(?:Pool|pg\.Pool|mysql\.createPool|mysql\.createConnection)\((.*)\)$/s))) {
        const o = await this.ev(m[2] || '{}', scope) || {};
        const flavor = /mysql/.test(st) ? 'mysql' : 'postgres';
        const conn = { flavor, host: o.host || 'localhost', user: o.user || (flavor === 'mysql' ? 'root' : 'postgres'), password: o.password || '', db: o.database || '', port: +(o.port || (flavor === 'mysql' ? 3306 : 5432)) };
        scope[m[1]] = flavor === 'mysql' ? { __mysqlpool: conn } : { __pgpool: conn }; return;
      }
      if ((m = st.match(/^(?:await\s+)?(\w+)\.connect\(\)/))) {
        const o = scope[m[1]];
        if (o && o.__redis) { const r = await this.rt.bridge.redisPing(o.__redis); if (!r) { this.rt.err(`Error: connect ECONNREFUSED ${o.__redis.host}:${o.__redis.port}\n`); } }
        return;
      }
      if ((m = st.match(/^(\w+)\.(get|post|put|delete|use)\(\s*(['"`])([^'"`]*)\3\s*,\s*([\s\S]+)\)$/)) && scope[m[1]] && scope[m[1]].__app) {
        this.routes.push({ method: m[2].toUpperCase(), path: m[4], body: jsFnBody(m[5]), params: (m[5].match(/\(?\s*(\w+)\s*,\s*(\w+)/) || [null, 'req', 'res']).slice(1) });
        return;
      }
      if ((m = st.match(/^(\w+)\.use\(express\.static\((.+)\)\)$/))) { this.staticDir = VFS.norm(unq(await this.ev(m[2], scope) || 'public'), this.rt.cwd); return; }
      if ((m = st.match(/^(?:const\s+\w+\s*=\s*)?(\w+)\.listen\(([\s\S]*)\)$/)) && scope[m[1]] && scope[m[1]].__app || (m = st.match(/^http\.createServer\(([\s\S]+)\)\.listen\(([\s\S]*)\)$/))) {
        const isHttp = /^http\.createServer/.test(st);
        if (isHttp) this.routes.push({ method: '*', path: '*', body: jsFnBody(m[1]), params: (m[1].match(/\(?\s*(\w+)\s*,\s*(\w+)/) || [null, 'req', 'res']).slice(1) });
        const a = args(m[2]);
        const port = +(await this.ev(a[0], scope)) || 3000;
        let host = '0.0.0.0';
        if (a[1] && /^['"`]/.test(a[1])) host = await this.ev(a[1], scope);
        const cb = a.find(x => /=>|function/.test(x));
        this.listening = true;
        this.rt.listen(port, req => this.handle(req), /^(127\.0\.0\.1|localhost)$/.test(host) ? '127.0.0.1' : '0.0.0.0');
        if (cb) for (const s2 of jsFnBody(cb)) await this.stmt(s2, Object.assign({}, scope, { PORT: scope.PORT, port }), null);
        return;
      }
      if ((m = st.match(/^setInterval\(([\s\S]+),\s*(\d+)\s*\)$/))) {
        const body = jsFnBody(m[1]); const ms = +m[2];
        this.intervals.push(true);
        (async () => { while (!(this.rt.signal && this.rt.signal.aborted)) { if (!(await this.rt.sleep(Math.max(200, ms)))) break; for (const s2 of body) await this.stmt(s2, scope, null); } })();
        return;
      }
      if ((m = st.match(/^setTimeout\(([\s\S]+),\s*(\d+)\s*\)$/))) { await this.rt.sleep(+m[2]); for (const s2 of jsFnBody(m[1])) { const r = await this.stmt(s2, scope, null); if (r) return r; } return; }
      if ((m = st.match(/^console\.(log|info|warn|error)\(([\s\S]*)\)$/))) {
        const vals = []; for (const x of args(m[2])) vals.push(jsStr(await this.ev(x, scope)));
        (m[1] === 'error' || m[1] === 'warn' ? this.rt.err : this.rt.out)(vals.join(' ') + '\n'); return;
      }
      if ((m = st.match(/^process\.exit\((.*)\)$/))) return { exit: +(await this.ev(m[1] || '0', scope)) || 0 };
      if ((m = st.match(/^throw\s+new\s+(\w+)\((.*)\)$/))) throw new PyError(m[1], jsStr(await this.ev(m[2], scope)));
      if ((m = st.match(/^return\s+(.*)$/s))) { const r = await this.stmt(m[1], scope, res); return r || { ret: true }; }
      if ((m = st.match(/^(?:return\s+)?(\w+)(\.status\((\d+)\))?\.(send|json|end|write)\(([\s\S]*)\)$/)) && res && m[1] === res.name) {
        if (m[3]) res.status = +m[3];
        const v = m[5].trim() ? await this.ev(m[5], scope, { req: res.req }) : '';
        if (m[4] === 'json') { res.type = 'application/json; charset=utf-8'; res.body += JSON.stringify(v); }
        else { if (typeof v === 'object' && v !== null) { res.type = 'application/json; charset=utf-8'; res.body += JSON.stringify(v); } else res.body += jsStr(v); }
        if (m[4] !== 'write') res.done = true;
        return { ret: true };
      }
      if ((m = st.match(/^(\w+)\.(?:writeHead|status)\((\d+)/)) && res && m[1] === res.name) { res.status = +m[2]; return; }
      if ((m = st.match(/^(?:const|let|var)\s+(\w+)\s*=\s*([\s\S]+)$/))) { scope[m[1]] = await this.ev(m[2], scope, res ? { req: res.req } : null); return; }
      if ((m = st.match(/^(\w+)\s*(\+\+|--|[+\-]?=)\s*([\s\S]*)$/))) {
        if (m[2] === '++') scope[m[1]]++; else if (m[2] === '--') scope[m[1]]--;
        else { const v = await this.ev(m[3], scope); scope[m[1]] = m[2] === '+=' ? scope[m[1]] + v : m[2] === '-=' ? scope[m[1]] - v : v; }
        return;
      }
      if ((m = st.match(/^try\s*\{([\s\S]*)\}\s*catch\s*(?:\((\w+)\))?\s*\{([\s\S]*)\}$/))) {
        try { for (const s2 of jsStatements(m[1])) { const r = await this.stmt(s2, scope, res); if (r) return r; } }
        catch (e) { if (!(e instanceof PyError)) throw e; if (m[2]) scope[m[2]] = { message: e.message }; for (const s2 of jsStatements(m[3])) { const r = await this.stmt(s2, scope, res); if (r) return r; } }
        return;
      }
      if ((m = st.match(/^if\s*\((.+?)\)\s*\{([\s\S]*?)\}(?:\s*else\s*\{([\s\S]*)\})?$/))) {
        const c = await this.ev(m[1], scope, res ? { req: res.req } : null);
        const body = c ? m[2] : m[3] || '';
        for (const s2 of jsStatements(body)) { const r = await this.stmt(s2, scope, res); if (r) return r; }
        return;
      }
      // 기타 식
      if (/^(async\s+)?function\s/.test(st) || /^(module\.)?exports/.test(st)) return;
      await this.ev(st, scope, res ? { req: res.req } : null);
    }
    async handle(req) {
      const [path, qs] = req.path.split('?');
      const query = {}; (qs || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
      if (this.staticDir) {
        const f = this.rt.fs.read(VFS.norm(this.staticDir + (path === '/' ? '/index.html' : path)));
        if (f != null) return { status: 200, body: f, type: /\.css$/.test(path) ? 'text/css' : /\.js$/.test(path) ? 'application/javascript' : 'text/html; charset=UTF-8' };
      }
      for (const r of this.routes) {
        const names = [];
        const re = r.path === '*' ? /.*/ : new RegExp('^' + r.path.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '/?$');
        const m = path.match(re);
        if (!m || (r.method !== '*' && r.method !== req.method)) continue;
        const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
        const res = { name: r.params[1] || 'res', status: 200, body: '', type: 'text/html; charset=utf-8', req: { query, params, method: req.method, url: req.path } };
        const scope = Object.assign({}, this.vars, { [r.params[0] || 'req']: { query, params, method: req.method, url: req.path } });
        try {
          for (const st of r.body) { const x = await this.stmt(st, scope, res); if (x || res.done) break; }
        } catch (e) {
          if (!(e instanceof PyError)) throw e;
          this.rt.err(`${e.type}: ${e.message}\n    at ${this.rt.file}\n`);
          return { status: 500, body: `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Error</title></head>\n<body><pre>${U.esc(e.type + ': ' + e.message)}</pre></body>\n</html>\n`, type: 'text/html' };
        }
        return { status: res.status, body: res.body, type: res.type };
      }
      return { status: 404, body: `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot ${req.method} ${path}</pre>\n</body>\n</html>\n`, type: 'text/html; charset=utf-8' };
    }
  }

  /* ================================================================ Go 빌드 결과 */
  function goCompile(src) {
    // main.go → 바이너리 설명 (포트 · 응답 · 출력)
    const port = (src.match(/ListenAndServe\(\s*"[^"]*:(\d+)"/) || src.match(/ListenAndServe\(\s*":(\d+)"/) || [])[1];
    const routes = [];
    src.replace(/HandleFunc\(\s*"([^"]+)"\s*,\s*func\s*\(\s*w\s+http\.ResponseWriter[^)]*\)\s*\{([\s\S]*?)\n\s*\}\)/g, (_, p, body) => {
      const f = body.match(/Fprint(?:f|ln)?\(\s*w\s*,\s*("(?:\\.|[^"])*"|`[^`]*`)/);
      routes.push({ path: p, text: f ? JSON.parse(f[1].startsWith('`') ? JSON.stringify(f[1].slice(1, -1)) : f[1]).replace(/%s|%v|%d/g, '?') : '' });
    });
    const prints = []; src.replace(/fmt\.Print(?:ln|f)?\(\s*("(?:\\.|[^"])*")/g, (_, s) => { try { prints.push(JSON.parse(s).replace(/%s|%v|%d/g, '?')); } catch (_) {} });
    const logs = []; src.replace(/log\.Print(?:ln|f)?\(\s*("(?:\\.|[^"])*")/g, (_, s) => { try { logs.push(JSON.parse(s).replace(/%s|%v|%d/g, port || '?')); } catch (_) {} });
    return '\x7fELF GO-BINARY ' + JSON.stringify({ port: port ? +port : null, routes, prints, logs });
  }
  function goMeta(content) { const m = String(content || '').match(/^\x7fELF GO-BINARY (.*)$/s); if (!m) return null; try { return JSON.parse(m[1]); } catch (_) { return null; } }

  /** pip install 이름 → import 이름 */
  function pipNames(spec) {
    const name = spec.replace(/\[.*\]/, '').split(/[=<>~!;\s]/)[0].trim().toLowerCase();
    if (!name) return [];
    const imp = PIP_ALIAS[spec.toLowerCase()] || PIP_ALIAS[name] || name.replace(/-/g, '_');
    return [imp.toLowerCase()].concat(PIP_DEPS[imp] || []);
  }

  window.Code = { PyProgram, NodeProgram, PyError, evalExpr, goCompile, goMeta, pipNames, pyRepr, splitTop, args, unq };
})();
