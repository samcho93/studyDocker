/* ===================================================================
   docker build — Dockerfile 해석 · 레이어 캐시 · 멀티 스테이지 (BuildKit 출력 모양)
   =================================================================== */
(function () {
  'use strict';
  const { norm, parent, base, FS } = VFS;
  const MB = 1e6;
  const INSTR = ['FROM', 'RUN', 'CMD', 'LABEL', 'MAINTAINER', 'EXPOSE', 'ENV', 'ADD', 'COPY', 'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD', 'STOPSIGNAL', 'HEALTHCHECK', 'SHELL'];

  /** Dockerfile → 명령 목록 */
  function parseDockerfile(src) {
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    const out = [];
    let buf = '', start = 0, escape = '\\';
    for (let i = 0; i < lines.length; i++) {
      let l = lines[i];
      const dir = l.match(/^#\s*escape\s*=\s*(.)/); if (dir && !out.length) escape = dir[1];
      if (!buf && /^\s*#/.test(l)) continue;
      if (buf && /^\s*#/.test(l)) continue;
      if (!buf && !l.trim()) continue;
      if (!buf) start = i + 1;
      if (l.trimEnd().endsWith(escape)) { buf += l.trimEnd().slice(0, -1) + ' '; continue; }
      buf += l;
      const m = buf.trim().match(/^(\w+)\s*(.*)$/s);
      if (m) out.push({ ins: m[1].toUpperCase(), rawIns: m[1], args: m[2].trim(), line: start, text: buf.trim().replace(/\s+/g, ' ') });
      buf = '';
    }
    if (buf.trim()) { const m = buf.trim().match(/^(\w+)\s*(.*)$/s); if (m) out.push({ ins: m[1].toUpperCase(), rawIns: m[1], args: m[2].trim(), line: start, text: buf.trim() }); }
    return out;
  }
  function jsonArr(s) { if (!/^\s*\[/.test(s)) return null; try { const a = JSON.parse(s); return Array.isArray(a) ? a.map(String) : null; } catch (_) { return 'bad'; } }
  function subst(s, vars) {
    return String(s).replace(/\$\{(\w+)(?::?-([^}]*))?\}|\$(\w+)/g, (m, a, d, b) => { const k = a || b; const v = vars[k]; return v != null && v !== '' ? v : d != null ? d : ''; });
  }
  function splitArgs(s) {
    const out = []; let cur = '', q = null;
    for (const ch of s) {
      if (q) { if (ch === q) q = null; else cur += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (/\s/.test(ch)) { if (cur) out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function kvPairs(s) {
    // ENV a=1 b="x y"  또는 ENV a 1
    const out = [];
    if (!/^[\w.-]+=/.test(s)) { const m = s.match(/^(\S+)\s+(.*)$/); if (m) out.push([m[1], m[2].replace(/^"(.*)"$/, '$1')]); else out.push([s, '']); return out; }
    splitArgs(s).forEach(t => { const i = t.indexOf('='); if (i > 0) out.push([t.slice(0, i), t.slice(i + 1)]); });
    return out;
  }
  function globRe(p) { return new RegExp('^' + p.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '(.*/)?') + '(/.*)?$'); }

  /** 빌드 컨텍스트 (.dockerignore 적용) */
  function contextFiles(root) {
    const all = Host.fs.walk(root);
    const ign = (Host.fs.read(root + '/.dockerignore') || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const rules = ign.map(r => ({ neg: r.startsWith('!'), re: globRe(r.replace(/^!/, '').replace(/^\/|\/$/g, '')) }));
    const out = {}; let ignored = 0;
    Object.keys(all).forEach(f => {
      let skip = false;
      rules.forEach(r => { if (r.re.test(f)) skip = !r.neg; });
      if (skip) ignored++; else out[f] = all[f];
    });
    return { files: out, ignored, dirs: Host.fs.dirsUnder(root) };
  }

  /** 패키지 크기 추정 (레이어 크기용) */
  function pkgSize(p) {
    if (p.startsWith('py:')) return ({ flask: 4.2, werkzeug: 1, jinja2: 0.7, numpy: 58, pandas: 72, django: 28, fastapi: 0.5, uvicorn: 1.5, gunicorn: 0.9, redis: 1.1, psycopg2: 9.5, requests: 0.4, sqlalchemy: 12, pydantic: 6, starlette: 0.4 }[p.slice(3)] || 1.5) * MB;
    if (p.startsWith('npm:')) return ({ express: 2.2, react: 0.4, 'react-dom': 5.5, typescript: 23, vite: 11, redis: 1.4, pg: 0.9, mysql2: 3, nodemon: 2.5, jest: 32, dotenv: 0.1 }[p.slice(4)] || 1.5) * MB * 3;
    if (p.startsWith('bin:')) return ({ curl: 6, wget: 4, ping: 0.6, vim: 38, vi: 0, git: 44, gcc: 110, make: 1, python3: 38, python: 0, pip: 12, nodejs: 72, node: 0, bash: 1.4, procps: 1.5, ps: 0, jq: 1, 'redis-cli': 2, psql: 9, mysql: 18, htop: 1, nano: 2, java: 150, stress: 0.2 }[p.slice(4)] != null ? { curl: 6, wget: 4, ping: 0.6, vim: 38, vi: 0, git: 44, gcc: 110, make: 1, python3: 38, python: 0, pip: 12, nodejs: 72, node: 0, bash: 1.4, procps: 1.5, ps: 0, jq: 1, 'redis-cli': 2, psql: 9, mysql: 18, htop: 1, nano: 2, java: 150, stress: 0.2 }[p.slice(4)] : 2) * MB;
    return 0;
  }

  /* ================================================================ 빌드 */
  async function build(ctx, args) {
    const D = ctx.D;
    let parsed;
    try {
      parsed = DockerCLI.parseOpts(args, { 't|tag': 'list', 'f|file': 'str', 'no-cache': 'bool', 'build-arg': 'list', 'target': 'str', 'progress': 'str', 'platform': 'str', 'q|quiet': 'bool', 'pull': 'bool', 'load': 'bool', 'push': 'bool', 'label': 'list', 'network': 'str', 'rm': 'bool', 'secret': 'list', 'cache-from': 'list', 'cache-to': 'list', 'builder': 'str', 'o|output': 'str' });
    } catch (e) { ctx.err(`ERROR: ${e.message}\n`); return 1; }
    const { o, pos } = parsed;
    if (pos.length !== 1) { ctx.err(`ERROR: "docker buildx build" requires exactly 1 argument.\nSee 'docker buildx build --help'.\n\nUsage:  docker buildx build [OPTIONS] PATH | URL | -\n\nStart a build\n`); return 1; }
    for (const t of o.tag) if (/[A-Z]/.test(t) || /\s/.test(t)) { ctx.err(`ERROR: invalid tag "${t}": repository name must be lowercase\n`); return 1; }
    const root = norm(pos[0], ctx.cwd);
    if (Host.fs.stat(root) !== 'dir') { ctx.err(`ERROR: unable to prepare context: path "${pos[0]}" not found\n`); return 1; }
    const dfPath = o.file ? norm(o.file, ctx.cwd) : root + '/Dockerfile';
    const dfSrc = Host.fs.read(dfPath) != null ? Host.fs.read(dfPath) : (!o.file ? Host.fs.read(root + '/dockerfile') : null);
    const plain = o.progress === 'plain';
    const quiet = o.quiet;
    const t0 = Date.now();
    const lines = [];     // 진행 표시 줄
    const out = quiet ? { set() {}, add() {}, done() {} } : progressView(ctx, plain);
    out.header('[+] Building 0.0s (0/0)');
    if (dfSrc == null) {
      out.add(' => [internal] load build definition from ' + (o.file ? base(o.file) : 'Dockerfile'), '0.0s');
      out.add(' => => transferring dockerfile: 2B', '0.0s');
      out.done('ERROR');
      ctx.err(`ERROR: failed to solve: failed to read dockerfile: open ${o.file ? base(o.file) : 'Dockerfile'}: no such file or directory\n`);
      return 1;
    }
    const steps = parseDockerfile(dfSrc);
    // 문법 확인
    for (const s of steps) {
      if (!INSTR.includes(s.ins)) {
        out.add(' => [internal] load build definition from Dockerfile', '0.0s');
        out.done('ERROR');
        ctx.err(`Dockerfile:${s.line}\n--------------------\n  ${s.line} | >>> ${s.text}\n--------------------\nERROR: failed to solve: dockerfile parse error on line ${s.line}: unknown instruction: ${s.rawIns}${U.closest(s.ins, INSTR) ? ` (did you mean ${U.closest(s.ins, INSTR).toLowerCase()}?)` : ''}\n`);
        return 1;
      }
    }
    if (!steps.some(s => s.ins === 'FROM')) { ctx.err('ERROR: failed to solve: dockerfile parse error on line 1: no build stage in current context\n'); return 1; }
    out.add(' => [internal] load build definition from ' + base(dfPath), '0.0s');
    out.add(` => => transferring dockerfile: ${U.size(dfSrc.length)}`, '0.0s');

    // 스테이지 나누기
    const globalArgs = {};
    o['build-arg'].forEach(a => { const i = a.indexOf('='); if (i > 0) globalArgs[a.slice(0, i)] = a.slice(i + 1); else globalArgs[a] = ctx.env[a] || ''; });
    const preArgs = {};
    ctx.buildArgs = globalArgs;
    const stages = [];
    steps.forEach(s => {
      if (s.ins === 'FROM') { stages.push({ from: s, steps: [], idx: stages.length }); return; }
      if (!stages.length) { if (s.ins === 'ARG') kvPairs(s.args).forEach(([k, v]) => { preArgs[k] = globalArgs[k] != null ? globalArgs[k] : v; }); return; }
      stages[stages.length - 1].steps.push(s);
    });
    stages.forEach(st => {
      const parts = splitArgs(subst(st.from.args, preArgs)).filter(x => !x.startsWith('--'));
      st.image = parts[0];
      st.name = parts[1] && /^as$/i.test(parts[1]) ? parts[2] : null;
      st.platform = (st.from.args.match(/--platform=(\S+)/) || [])[1];
    });
    // 대상 스테이지와 필요한 스테이지 (BuildKit 은 쓰지 않는 스테이지를 건너뜀)
    let targetIdx = stages.length - 1;
    if (o.target) { targetIdx = stages.findIndex(s => s.name === o.target); if (targetIdx < 0) { ctx.err(`ERROR: failed to solve: target stage "${o.target}" could not be found\n`); return 1; } }
    const needed = new Set();
    const need = i => {
      if (needed.has(i)) return; needed.add(i);
      const st = stages[i];
      const dep = stages.findIndex((x, j) => j < i && x.name && x.name === st.image);
      if (dep >= 0) need(dep);
      st.steps.forEach(s => { const m = s.args.match(/--from=(\S+)/); if (m) { const k = stages.findIndex(x => x.name === m[1] || String(x.idx) === m[1]); if (k >= 0) need(k); } });
    };
    need(targetIdx);

    // 메타데이터 · 베이스 이미지
    const baseImgs = {};
    for (const i of Array.from(needed).sort((a, b) => a - b)) {
      const st = stages[i];
      if (st.image === 'scratch' || stages.some((x, j) => j < i && x.name === st.image)) continue;
      const ref = Hub.resolve(st.image);
      const label = `docker.io/${ref.repo.includes('/') ? ref.repo : 'library/' + ref.repo}:${ref.tag}`;
      out.add(` => [internal] load metadata for ${label}`, '…');
      await U.sleep(250, ctx.io.signal);
      let img = D.findImage(st.image);
      if (!img || o.pull) {
        const rem = D.remoteImage(st.image);
        if (rem.error) {
          out.set(` => ERROR [internal] load metadata for ${label}`, '0.9s');
          out.done('ERROR');
          ctx.err(`------\n > [internal] load metadata for ${label}:\n------\nDockerfile:${st.from.line}\n--------------------\n  ${st.from.line} | >>> ${st.from.text}\n--------------------\nERROR: failed to solve: ${st.image}: failed to resolve source metadata for ${label}: ${/not found/.test(rem.error) ? `${label}: not found` : 'pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed'}\n`);
          return 1;
        }
        img = rem.img;
      }
      baseImgs[i] = img;
      out.set(` => [internal] load metadata for ${label}`, '1.' + (Math.random() * 9 | 0) + 's');
    }
    out.add(' => [internal] load .dockerignore', '0.0s');
    const ctxF = contextFiles(root);
    out.add(` => => transferring context: ${U.size(Math.max(2, (Host.fs.read(root + '/.dockerignore') || '').length))}`, '0.0s');

    // 단계 번호 매기기
    const stageLabel = i => stages[i].name || (stages.length > 1 ? `stage-${i}` : '');
    let totalSteps = 0;
    Array.from(needed).forEach(i => { totalSteps += 1 + stages[i].steps.filter(s => ['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(s.ins)).length; });
    const results = {};
    let ctxLoaded = false;
    const cache = D.s.buildCache;
    let failed = null;

    for (const i of Array.from(needed).sort((a, b) => a - b)) {
      const st = stages[i];
      const lab = stageLabel(i);
      const numbered = st.steps.filter(s => ['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(s.ins));
      const N = numbered.length + 1;
      let k = 1;
      const tag = () => `[${lab ? lab + ' ' : ''}${k}/${N}]`;
      // 시작 상태
      let S;
      const prevStage = stages.findIndex((x, j) => j < i && x.name === st.image);
      if (prevStage >= 0) {
        const r = results[prevStage];
        S = { fs: new FS(JSON.parse(JSON.stringify(r.fs.toJSON()))), cfg: JSON.parse(JSON.stringify(r.cfg)), pkgs: r.pkgs.slice(), layers: r.layers.slice(), history: r.history.slice(), key: r.key, os: r.os, kind: r.kind, baseRepo: r.baseRepo, owned: r.owned.slice(), users: r.users.slice() };
        out.add(` => ${tag()} FROM ${st.name ? '' : ''}${st.image}`, '0.0s');
      } else if (st.image === 'scratch') {
        S = { fs: new FS(), cfg: { Env: [] }, pkgs: [], layers: [], history: [], key: U.hash('scratch'), os: 'scratch', kind: 'none', baseRepo: 'scratch', owned: [], users: ['root'] };
        out.add(` => ${tag()} FROM scratch`, '0.0s');
      } else {
        const bi = baseImgs[i];
        const ref = Hub.resolve(st.image);
        S = { fs: new FS(JSON.parse(JSON.stringify(bi.fs))), cfg: JSON.parse(JSON.stringify(bi.config)), pkgs: (bi.pkgs || []).slice(), layers: bi.layers.slice(), history: (bi.history || []).slice(), key: U.hash('from:' + bi.id), os: bi.os, kind: bi.kind, baseRepo: ref.repo + ':' + ref.tag, owned: (bi.owned || []).slice(), users: ['root'] };
        const have = D.findImage(st.image) && D.findImage(st.image).id === bi.id;
        const label = `docker.io/${ref.repo.includes('/') ? ref.repo : 'library/' + ref.repo}:${ref.tag}@sha256:${(bi.repoDigests[0] || U.hash(bi.id)).split(':').pop().slice(0, 64)}`;
        if (!have) {
          out.add(` => ${tag()} FROM ${label}`, '…');
          for (const l of bi.layers) { out.add(` => => sha256:${l.id.slice(0, 64)} ${U.size(l.size)} / ${U.size(l.size)}`, (l.size / 40e6).toFixed(1) + 's'); await U.sleep(Math.min(500, 80 + l.size / 2e6), ctx.io.signal); }
          out.add(` => => extracting sha256:${bi.layers[bi.layers.length - 1].id.slice(0, 64)}`, '0.4s');
          // 빌드에 쓴 베이스 이미지는 로컬에도 남는다
          if (!D.findImage(st.image)) { const cp = JSON.parse(JSON.stringify(bi)); cp.repoTags = [ref.repo + ':' + ref.tag]; cp.pulledAt = Date.now(); D.s.images.push(cp); }
        } else out.add(` => CACHED ${tag()} FROM ${label}`, '0.0s');
      }
      S.args = Object.assign({}, preArgs);
      if (S.cfg.Env) S.cfg.Env.forEach(e => { const j = e.indexOf('='); S.args[e.slice(0, j)] = e.slice(j + 1); });
      if (S.cfg.User) S.user = S.cfg.User;
      S.newLayers = [];
      S.steps = [];
      for (const s of st.steps) {
        if (ctx.io.signal && ctx.io.signal.aborted) { out.done('CANCELED'); ctx.err('ERROR: failed to solve: Canceled: context canceled\n'); return 130; }
        const ins = s.ins;
        const argsRaw = s.args;
        const vars = S.args;
        if (['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins)) k++;
        const stepText = `${ins} ${argsRaw}`.replace(/\s+/g, ' ');
        // 캐시 키
        let contentKey = '';
        if (ins === 'COPY' || ins === 'ADD') {
          const fromM = argsRaw.match(/--from=(\S+)/);
          if (!fromM) {
            const srcs = splitArgs(subst(argsRaw.replace(/--\w+=\S+/g, ''), vars)).slice(0, -1);
            contentKey = srcs.map(sp => Object.keys(ctxF.files).filter(f => matchSrc(sp, f)).map(f => f + ':' + U.hash(ctxF.files[f], 12)).join(',')).join('|');
          } else { const r = results[stages.findIndex(x => x.name === fromM[1] || String(x.idx) === fromM[1])]; contentKey = r ? r.key : fromM[1]; }
        }
        const key = U.hash(S.key + '|' + stepText + '|' + (ins === 'RUN' || ins === 'COPY' || ins === 'ADD' ? JSON.stringify(Object.entries(vars).filter(([kk]) => argsRaw.includes(kk))) : '') + '|' + contentKey + '|' + (S.cfg.WorkingDir || '') + '|' + (S.user || ''));
        const cached = !o['no-cache'] && cache[key];
        const display = ` => ${cached && ['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins) ? 'CACHED ' : ''}${['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins) ? tag() + ' ' : ''}${stepText.length > 90 ? stepText.slice(0, 89) + '…' : stepText}`;
        if ((ins === 'COPY' || ins === 'ADD') && !/--from=/.test(argsRaw) && !ctxLoaded) {
          ctxLoaded = true;
          const bytes = Object.values(ctxF.files).reduce((a, x) => a + x.length, 0);
          out.add(' => [internal] load build context', '0.0s');
          out.add(` => => transferring context: ${U.size(Math.max(bytes, 32))}`, '0.0s');
        }
        if (cached) {
          applyCached(S, cached);
          S.key = key;
          if (['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins)) out.add(display, '0.0s');
          continue;
        }
        const before = snapshot(S);
        const t1 = Date.now();
        let r = { ok: true, size: 0 };
        if (['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins)) out.add(display, '…');
        try {
          r = await runStep(ctx, D, S, s, vars, ctxF, root, results, stages, plain ? out : null) || r;
        } catch (e) {
          r = { ok: false, error: e.message };
        }
        if (!r.ok) {
          out.set(display.replace(' => ', ' => ERROR '), ((Date.now() - t1) / 1000).toFixed(1) + 's');
          if (r.log) out.log(r.log);
          out.done('ERROR');
          const rl = r.log ? '------\n > ' + tag() + ' ' + stepText + ':\n' + r.log.split('\n').filter(Boolean).slice(-6).map(l => (/^\d/.test(l) ? '' : '0.' + (Math.random() * 900 | 100) + ' ') + l).join('\n') + '\n------\n' : '';
          ctx.err(`${rl}Dockerfile:${s.line}\n--------------------\n  ${s.line} | >>> ${s.text}\n--------------------\nERROR: failed to solve: ${r.error}\n`);
          return 1;
        }
        S.key = key;
        const delta = diffState(before, S);
        cache[key] = Object.assign(delta, { size: r.size || 0, t: Date.now() });
        if (['RUN', 'COPY', 'ADD', 'WORKDIR'].includes(ins)) out.set(display, ((Date.now() - t1) / 1000 + 0.1).toFixed(1) + 's');
      }
      results[i] = S;
    }
    const F = results[targetIdx];
    // 이미지 내보내기
    out.add(' => exporting to image', '…');
    await U.sleep(200, ctx.io.signal);
    out.add(' => => exporting layers', '0.1s');
    const id = U.hash('img:' + F.key + JSON.stringify(F.cfg) + o.tag.join(','));
    out.add(` => => writing image sha256:${id}`, '0.0s');
    o.tag.forEach(t => { const r = Hub.resolve(t); out.add(` => => naming to docker.io/${r.repo.includes('/') ? r.repo : 'library/' + r.repo}:${r.tag}`, '0.0s'); });
    out.header(`[+] Building ${((Date.now() - t0) / 1000).toFixed(1)}s (${out.count()}/${out.count()}) FINISHED`);
    out.done('FINISHED');
    const labels = Object.assign({}, F.cfg.Labels || {}); o.label.forEach(l => { const [kk, vv] = l.split('='); labels[kk] = vv || ''; });
    F.cfg.Labels = Object.keys(labels).length ? labels : undefined;
    const sizeTotal = F.layers.reduce((a, l) => a + l.size, 0);
    let img = D.s.images.find(x => x.id === id);
    if (!img) {
      img = { id, repoTags: [], repoDigests: [], created: Date.now(), size: sizeTotal, os: F.os, osName: (Hub.OS[F.os] || {}).name, kind: F.kind === 'none' ? 'shell' : F.kind, layers: F.layers, history: F.history, config: F.cfg, fs: F.fs.toJSON(), pkgs: Array.from(new Set(F.pkgs)), arch: (o.platform || '').includes('arm64') ? 'arm64' : 'amd64', built: true, baseRepo: F.baseRepo, owned: F.owned, users: F.users, stepOrder: F.stepOrder };
      D.s.images.push(img);
    } else img.created = Date.now();
    if (o.tag.length) o.tag.forEach(t => D.tagImage(id, t));
    else { img.dangling = true; }
    D.s.images.forEach(x => { if (x !== img && !x.repoTags.length) x.dangling = true; });
    D.event('image', 'build', img);
    D.changed('image');
    if (quiet) ctx.out(`sha256:${id}\n`);
    if (!quiet && !o.tag.length) ctx.out(`\n(참고) -t 로 이름을 붙이지 않아 <none> 이미지가 만들어졌습니다. docker images 로 확인해 보세요.\n`);
    if (o.platform && o.platform.includes(',')) ctx.out(`\n(시뮬레이터) 여러 플랫폼(${o.platform}) 이미지는 보통 --push 와 함께 레지스트리에 올립니다.\n`);
    if (window.Lab) Lab.refreshFiles();
    return 0;
  }

  function matchSrc(sp, f) {
    sp = sp.replace(/^\.\/?/, '').replace(/\/$/, '');
    if (sp === '' || sp === '.') return true;
    if (/[*?]/.test(sp)) return globRe(sp).test(f);
    return f === sp || f.startsWith(sp + '/');
  }
  function snapshot(S) { return { files: Object.assign({}, S.fs.files), dirs: new Set(S.fs.dirs), cfg: JSON.stringify(S.cfg), pkgs: S.pkgs.slice(), layersN: S.layers.length, historyN: S.history.length, owned: S.owned.slice(), users: S.users.slice(), args: Object.assign({}, S.args), user: S.user, stepsN: (S.stepOrder || []).length }; }
  function diffState(b, S) {
    const files = {}, del = [];
    Object.keys(S.fs.files).forEach(f => { if (b.files[f] !== S.fs.files[f]) files[f] = S.fs.files[f]; });
    Object.keys(b.files).forEach(f => { if (!(f in S.fs.files)) del.push(f); });
    const dirs = Array.from(S.fs.dirs).filter(d => !b.dirs.has(d));
    return { files, del, dirs, cfg: S.cfg, pkgs: S.pkgs.filter(p => !b.pkgs.includes(p)), layers: S.layers.slice(b.layersN), history: S.history.slice(b.historyN), owned: S.owned.filter(x => !b.owned.includes(x)), users: S.users.filter(x => !b.users.includes(x)), args: S.args, user: S.user, steps: (S.stepOrder || []).slice(b.stepsN) };
  }
  function applyCached(S, d) {
    Object.entries(d.files || {}).forEach(([f, v]) => S.fs.write(f, v));
    (d.dirs || []).forEach(x => { try { S.fs.mkdir(x); } catch (_) {} });
    (d.del || []).forEach(f => S.fs.rm(f, true));
    S.cfg = JSON.parse(JSON.stringify(d.cfg));
    (d.pkgs || []).forEach(p => { if (!S.pkgs.includes(p)) S.pkgs.push(p); });
    S.layers = S.layers.concat(d.layers || []);
    S.history = S.history.concat(d.history || []);
    (d.owned || []).forEach(x => S.owned.push(x));
    (d.users || []).forEach(x => S.users.push(x));
    S.args = Object.assign({}, d.args);
    S.user = d.user;
    S.stepOrder = (S.stepOrder || []).concat(d.steps || []);
  }

  /** 한 단계 실행 */
  async function runStep(ctx, D, S, s, vars, ctxF, root, results, stages, plainOut) {
    const ins = s.ins;
    let a = s.args;
    const wd = () => S.cfg.WorkingDir || '/';
    const record = (by, size, empty) => { S.stepOrder = S.stepOrder || []; S.stepOrder.push({ by, size: size || 0, created: Date.now(), comment: 'buildkit.dockerfile.v0' }); };
    const addLayer = (by, size) => { S.layers.push({ id: U.hash('layer:' + S.key + by + size), size, created_by: by + ' # buildkit', created: Date.now(), comment: 'buildkit.dockerfile.v0', built: true }); record(by + ' # buildkit', size); };
    const meta = by => { S.history.push({ created_by: by, size: 0, empty: true, comment: 'buildkit.dockerfile.v0', created: Date.now() }); record(by, 0, true); };
    switch (ins) {
      case 'ARG': kvPairs(a).forEach(([k, v]) => { const gv = (ctx.buildArgs || {})[k]; vars[k] = gv != null ? gv : (vars[k] != null && !v ? vars[k] : v); }); meta(`ARG ${a}`); return;
      case 'ENV': {
        S.cfg.Env = S.cfg.Env || [];
        kvPairs(a).forEach(([k, v]) => { v = subst(v, vars); vars[k] = v; const i = S.cfg.Env.findIndex(e => e.split('=')[0] === k); if (i >= 0) S.cfg.Env[i] = `${k}=${v}`; else S.cfg.Env.push(`${k}=${v}`); });
        meta(`ENV ${subst(a, vars)}`); return;
      }
      case 'LABEL': S.cfg.Labels = S.cfg.Labels || {}; kvPairs(a).forEach(([k, v]) => { S.cfg.Labels[k.replace(/^"|"$/g, '')] = v; }); meta(`LABEL ${a}`); return;
      case 'MAINTAINER': meta(`MAINTAINER ${a}`); return;
      case 'EXPOSE': S.cfg.ExposedPorts = Array.from(new Set((S.cfg.ExposedPorts || []).concat(splitArgs(subst(a, vars)).map(p => p.includes('/') ? p : p + '/tcp')))); meta(`EXPOSE map[${S.cfg.ExposedPorts.map(p => p + ':{}').join(' ')}]`); return;
      case 'VOLUME': { const j = jsonArr(a); S.cfg.Volumes = Array.from(new Set((S.cfg.Volumes || []).concat(j && j !== 'bad' ? j : splitArgs(a)))); meta(`VOLUME [${S.cfg.Volumes.join(' ')}]`); return; }
      case 'USER': {
        const u = subst(a, vars).trim();
        S.cfg.User = u; S.user = u;
        meta(`USER ${u}`); return;
      }
      case 'STOPSIGNAL': S.cfg.StopSignal = a; meta(`STOPSIGNAL ${a}`); return;
      case 'SHELL': meta(`SHELL ${a}`); return;
      case 'ONBUILD': meta(`ONBUILD ${a}`); return;
      case 'WORKDIR': {
        const p = norm(subst(a, vars), wd());
        if (!S.fs.stat(p)) S.fs.mkdir(p);
        S.cfg.WorkingDir = p;
        addLayer(`WORKDIR ${p}`, 0);
        return;
      }
      case 'CMD': case 'ENTRYPOINT': {
        const j = jsonArr(a);
        if (j === 'bad') { /* JSON 이 틀리면 셸 형식으로 취급 (실제와 같음) */ }
        const v = j && j !== 'bad' ? j : ['/bin/sh', '-c', a];
        if (ins === 'CMD') S.cfg.Cmd = v; else { S.cfg.Entrypoint = v; if (!j || j === 'bad') S.cfg.Cmd = null; }
        meta(`${ins} ${JSON.stringify(v)}`);
        return;
      }
      case 'HEALTHCHECK': {
        if (/^NONE$/i.test(a.trim())) { S.cfg.Healthcheck = { test: ['NONE'] }; meta('HEALTHCHECK NONE'); return; }
        const opts = {}; let rest = a;
        rest = rest.replace(/--(\w[\w-]*)=(\S+)\s*/g, (_, k, v) => { opts[k] = v; return ''; }).trim();
        const cm = rest.replace(/^CMD\s+/i, '');
        const j = jsonArr(cm);
        S.cfg.Healthcheck = { test: j && j !== 'bad' ? ['CMD'].concat(j) : ['CMD-SHELL', cm], interval: DockerCLI.dur(opts.interval) || 30, timeout: DockerCLI.dur(opts.timeout) || 30, retries: +(opts.retries || 3), startPeriod: DockerCLI.dur(opts['start-period']) || 0 };
        meta(`HEALTHCHECK &{${JSON.stringify(S.cfg.Healthcheck.test)} "${opts.interval || '30s'}"}`);
        return;
      }
      case 'COPY': case 'ADD': {
        const flags = {}; a = a.replace(/--(\w[\w-]*)(?:=(\S+))?\s*/g, (_, k, v) => { flags[k] = v == null ? true : v; return ''; }).trim();
        const j = jsonArr(a);
        const parts = (j && j !== 'bad' ? j : splitArgs(a)).map(x => subst(x, vars));
        if (parts.length < 2) return { ok: false, error: `dockerfile parse error on line ${s.line}: ${ins} requires at least two arguments, but only one was provided. Destination could not be determined` };
        const dest0 = parts.pop();
        const dest = norm(dest0, wd());
        const destIsDir = dest0.endsWith('/') || dest0 === '.' || parts.length > 1 || S.fs.stat(dest) === 'dir';
        let bytes = 0;
        if (flags.from) {
          const si = stages.findIndex(x => x.name === flags.from || String(x.idx) === flags.from);
          let srcFS;
          if (si >= 0 && results[si]) srcFS = results[si].fs;
          else {
            const img = D.findImage(flags.from) || (D.remoteImage(flags.from).img);
            if (!img) return { ok: false, error: `failed to resolve source metadata for docker.io/library/${flags.from}: pull access denied` };
            srcFS = new FS(img.fs);
          }
          for (const sp of parts) {
            const p = norm(sp, '/');
            const st = srcFS.stat(p);
            if (!st) return { ok: false, error: `failed to compute cache key: failed to calculate checksum of ref ${U.hex(8)}::${U.hex(25)}: "${p}": not found` };
            if (st === 'file') { const target = destIsDir ? dest + '/' + base(p) : dest; S.fs.write(target, srcFS.read(p)); bytes += (srcFS.read(p) || '').length; }
            else { const all = srcFS.walk(p); if (!S.fs.stat(dest)) S.fs.mkdir(dest); Object.keys(all).forEach(f => { S.fs.write(dest + '/' + f, all[f]); bytes += all[f].length; }); }
          }
          // 다른 스테이지에서 가져온 바이너리 · 결과물 크기
          bytes = Math.max(bytes, 1024);
          const goBin = Object.values(S.fs.walk(dest)).some(v => Code.goMeta(v)) || (S.fs.stat(dest) === 'file' && Code.goMeta(S.fs.read(dest)));
          if (goBin) bytes = 7.9 * MB;
          if (Object.keys(S.fs.walk(dest)).some(f => /\.jar$/.test(f)) || /\.jar$/.test(dest)) bytes = 21 * MB;
          if (Object.keys(S.fs.walk(dest)).some(f => /node_modules/.test(f))) bytes += 18 * MB;
        } else {
          for (const sp of parts) {
            if (/^https?:\/\//.test(sp) && ins === 'ADD') { const target = destIsDir ? dest + '/' + sp.split('/').pop() : dest; S.fs.write(target, '(downloaded) ' + sp); bytes += 5000; continue; }
            const clean = sp.replace(/^\.\/?/, '').replace(/\/$/, '');
            const matched = Object.keys(ctxF.files).filter(f => matchSrc(sp, f));
            const isDir = clean === '' || clean === '.' || ctxF.dirs.some(d => d === clean) || matched.some(f => f.startsWith(clean + '/'));
            if (!matched.length && !(isDir && ctxF.dirs.includes(clean))) {
              const ignoredHit = Host.fs.stat(norm(clean, root));
              return { ok: false, error: `failed to compute cache key: failed to calculate checksum of ref ${U.hex(8)}-${U.hex(4)}-${U.hex(4)}::${U.hex(25)}: "/${clean}": not found${ignoredHit ? '\n\n(힌트) 파일은 있지만 .dockerignore 에 의해 빌드 컨텍스트에서 빠졌습니다.' : ''}` };
            }
            if (!isDir && matched.length === 1 && matched[0] === clean) {
              const target = destIsDir ? dest + '/' + base(clean) : dest;
              if (ins === 'ADD' && /\.(tar|tar\.gz|tgz)$/.test(clean)) { S.fs.mkdir(dest); S.fs.write(dest + '/(extracted from ' + base(clean) + ')', ''); }
              else S.fs.write(target, ctxF.files[clean]);
              bytes += ctxF.files[clean].length;
            } else {
              if (!S.fs.stat(dest)) S.fs.mkdir(dest);
              matched.forEach(f => {
                const rel = clean && clean !== '.' && !/[*?]/.test(clean) ? f.slice(clean.length + 1) : (/[*?]/.test(clean) ? base(f) : f);
                S.fs.write(dest + '/' + rel, ctxF.files[f]); bytes += ctxF.files[f].length;
              });
              if (clean === '' || clean === '.') ctxF.dirs.forEach(d => { if (!Object.keys(ctxF.files).some(f => f.startsWith(d + '/')) && !S.fs.stat(dest + '/' + d)) { try { S.fs.mkdir(dest + '/' + d); } catch (_) {} } });
            }
          }
          // node_modules 를 통째로 복사하면 커진다
          if (Object.keys(ctxF.files).some(f => f.startsWith('node_modules/')) && parts.some(p => p === '.' || p === './')) bytes += 45 * MB;
        }
        if (flags.chown) { S.owned.push(dest); }
        addLayer(`${ins} ${flags.from ? '--from=' + flags.from + ' ' : ''}${flags.chown ? '--chown=' + flags.chown + ' ' : ''}${parts.join(' ')} ${dest0}`, Math.max(bytes, 80));
        return { ok: true, size: bytes };
      }
      case 'RUN': {
        const j = jsonArr(a);
        const script = subst(j && j !== 'bad' ? j.join(' ') : a.replace(/--mount=\S+\s*/g, ''), Object.assign({}, vars));
        const user = S.user || 'root';
        const sh = buildShell(D, S, user, vars);
        let log = '';
        const io = { out: t => { log += t; if (plainOut) plainOut.log(t); }, err: t => { log += t; if (plainOut) plainOut.log(t); }, signal: ctx.io.signal };
        const pk0 = S.pkgs.slice();
        const f0 = Object.values(S.fs.files).reduce((x, v) => x + v.length, 0);
        const bin = S.os === 'scratch' || S.os === 'distroless';
        if (bin) return { ok: false, error: `process "/bin/sh -c ${script}" did not complete successfully: exit code: 127\n(힌트) ${S.os} 이미지에는 셸(/bin/sh)이 없어서 RUN 을 쓸 수 없습니다. 멀티 스테이지로 다른 이미지에서 만든 결과만 COPY --from 으로 가져오세요.` };
        let code;
        try { code = await sh.exec(script, io); } catch (e) { code = e instanceof Sh.ExitSignal ? e.code : 1; if (!(e instanceof Sh.ExitSignal)) log += e.message + '\n'; }
        if (code !== 0) return { ok: false, log, error: `process "/bin/sh -c ${script}" did not complete successfully: exit code: ${code}` };
        // 크기 계산
        const newPk = S.pkgs.filter(p => !pk0.includes(p));
        let size = newPk.reduce((x, p) => x + pkgSize(p), 0);
        const f1 = Object.values(S.fs.files).reduce((x, v) => x + v.length, 0);
        size += Math.max(0, f1 - f0);
        if (/apt-get update|apt update/.test(script)) size += /rm -rf \/var\/lib\/apt\/lists/.test(script) ? 0.2 * MB : 46 * MB;
        if (/apt-get install|apt install/.test(script)) size += (/--no-install-recommends/.test(script) ? 4 : 18) * MB * Math.max(1, newPk.filter(p => p.startsWith('pkg:')).length / 2);
        if (/apk add/.test(script) && !/--no-cache/.test(script)) size += 2.6 * MB;
        if (/pip3? install/.test(script) && !/--no-cache-dir/.test(script)) size += newPk.filter(p => p.startsWith('py:')).length * 1.8 * MB;
        if (/npm (install|ci)/.test(script)) size += newPk.filter(p => p.startsWith('npm:')).length * 2 * MB + 3 * MB;
        if (/go build/.test(script)) size += 190 * MB;   // 빌드 캐시 · 도구
        if (/mvn .*package/.test(script)) size += 160 * MB;
        if (/npm run build/.test(script)) size += 1 * MB;
        if (/useradd|adduser|groupadd|addgroup/.test(script)) size += 0.01 * MB;
        addLayer(`RUN /bin/sh -c ${script}`, Math.round(size));
        return { ok: true, size, log };
      }
    }
  }

  /** 빌드 중 RUN 을 실행할 셸 */
  function buildShell(D, S, user, vars) {
    const env = {};
    (S.cfg.Env || []).forEach(e => { const i = e.indexOf('='); env[e.slice(0, i)] = e.slice(i + 1); });
    Object.assign(env, vars);
    env.HOME = user === 'root' ? '/root' : '/home/' + user;
    const cmds = Object.assign({}, Sh.core);
    const pk = new Set(S.pkgs);
    Object.keys(Apps.CMDS).forEach(k => { const fn = Apps.CMDS[k]; if (!fn) return; if (fn.tool && !S.pkgs.includes('bin:' + fn.tool)) return; cmds[k] = fn; });
    ['find', 'stat', 'chmod', 'chown', 'getent'].forEach(k => { cmds[k] = Apps.CMDS[k]; });
    if (S.pkgs.includes('bin:python3') || S.pkgs.includes('bin:python')) { cmds.python = Apps.CMDS.python; cmds.python3 = Apps.CMDS.python; }
    if (S.pkgs.includes('bin:pip')) { cmds.pip = Apps.CMDS.pip; cmds.pip3 = Apps.CMDS.pip; }
    const userAdd = c => {
      const name = c.args.filter(x => !x.startsWith('-')).pop();
      if (!name) return 1;
      if (/-S/.test(c.args.join(' ')) && c.argv[0] === 'addgroup') { S.users.push('group:' + name); return 0; }
      if (S.users.includes(name)) { c.err(`${c.argv[0]}: user '${name}' already exists\n`); return 9; }
      S.users.push(name);
      const pw = c.sh.fs.read('/etc/passwd') || '';
      c.sh.fs.write('/etc/passwd', pw + `${name}:x:${1000 + S.users.length}:${1000 + S.users.length}::/home/${name}:/bin/sh\n`);
      if (!/--no-create-home|-M\b|-H\b/.test(c.args.join(' '))) try { c.sh.fs.mkdir('/home/' + name); } catch (_) {}
      return 0;
    };
    cmds.useradd = userAdd; cmds.adduser = userAdd; cmds.groupadd = () => 0; cmds.addgroup = userAdd;
    cmds.chown = c => { if (user !== 'root') { c.err(`chown: changing ownership of '${c.args[c.args.length - 1]}': Operation not permitted\n`); return 1; } const t = c.args.filter(x => !x.startsWith('-')); if (t.length >= 2) t.slice(1).forEach(p => S.owned.push(c.sh.abs(p))); return 0; };
    const fs = {
      stat: p => S.fs.stat(p), read: p => S.fs.read(p), ls: p => S.fs.ls(p), walk: p => S.fs.walk(p),
      write: (p, v) => { p = norm(p); if (user !== 'root' && !writableBy(S, p)) throw new Error('Permission denied'); S.fs.write(p, v); },
      mkdir: p => { p = norm(p); if (user !== 'root' && !writableBy(S, p)) throw new Error('Permission denied'); S.fs.mkdir(p); },
      rm: (p, r) => { p = norm(p); if (user !== 'root' && !writableBy(S, p)) throw new Error('Permission denied'); return S.fs.rm(p, r); }
    };
    const sh = new Sh.Shell({ fs, cmds, user, host: 'buildkitsandbox', name: 'sh', env, cwd: S.cfg.WorkingDir || '/' });
    sh.eng = D; sh.ct = null; sh.building = true; sh.fast = true;
    sh.osId = (Hub.OS[S.os] || {}).id;
    sh.pkgTarget = S.pkgs;
    sh.onPkg = () => {};
    // npm/pip 가 이미지 도구 목록을 보도록
    return sh;
  }
  function writableBy(S, p) {
    if (/^\/(tmp|var\/tmp)(\/|$)/.test(p) || p.startsWith('/home/')) return true;
    return S.owned.some(o => p === o || p.startsWith(o + '/'));
  }

  /** BuildKit 모양 진행 표시 */
  function progressView(ctx, plain) {
    const rows = [];
    let header = '';
    let live = null;
    const render = () => [header].concat(rows.map(r => r.time ? U.pad(r.text.length > 78 ? r.text.slice(0, 77) + '…' : r.text, 80) + ' ' + r.time.padStart(5) : r.text)).join('\n');
    if (ctx.io.live && !plain) live = ctx.io.live(render());
    const upd = () => { if (live) live.update(render()); };
    let n = 0;
    return {
      header(h) { header = h; upd(); },
      add(text, time) { rows.push({ text, time }); if (/=> \[|=> CACHED|=> exporting|=> ERROR/.test(text) && !/=> =>/.test(text)) n++; if (!live) ctx.out(`#${rows.length} ${text.replace(/^ => /, '')}${time && time !== '…' ? ' ' + time : ''}\n`); upd(); },
      set(text, time) { const r = rows[rows.length - 1]; if (r) { r.text = text; r.time = time; } if (!live) ctx.out(`#${rows.length} ${/ERROR/.test(text) ? 'ERROR' : 'DONE ' + time}\n`); upd(); },
      log(t) { if (!live) t.split('\n').filter(Boolean).forEach(l => ctx.out(`#${rows.length} ${(Math.random() * 3).toFixed(3)} ${l}\n`)); },
      count() { return n; },
      done(state) { if (state !== 'FINISHED' && header.startsWith('[+] Building')) header = header.replace(/\(.*\)/, `(${n}/${n + (state === 'ERROR' ? 0 : 0)})`) + (state === 'ERROR' ? ' FINISHED' : ''); if (live) { live.update(render()); live.done(); } }
    };
  }

  window.Builder = { build, parseDockerfile };
})();
