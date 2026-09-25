/* ===================================================================
   docker compose (v2) — compose.yaml 로 여러 컨테이너를 한 번에
   =================================================================== */
(function () {
  'use strict';
  const { norm, base } = VFS;
  const FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];
  const COLORS = ['36', '33', '32', '35', '34', '96', '93', '92', '95'];

  /* ------------------------------------------------ 파일 읽기 · 정규화 --- */
  function loadProject(ctx, o) {
    const dir = ctx.cwd;
    let file = o.file && o.file.length ? norm(o.file[0], dir) : null;
    if (!file) file = FILES.map(f => dir + '/' + f).find(f => Host.fs.stat(f) === 'file');
    if (!file || Host.fs.stat(file) !== 'file') throw new Error(o.file && o.file.length ? `open ${file}: no such file or directory` : 'no configuration file provided: not found');
    const pdir = VFS.parent(file);
    let raw;
    try { raw = YAML.parse(Host.fs.read(file)); }
    catch (e) { throw new Error(`${e.message.replace(/^yaml: /, `yaml: `)}\n(파일: ${base(file)})`); }
    if (!raw || typeof raw !== 'object') throw new Error(`${base(file)}: empty compose file`);
    // .env 파일
    const dotenv = {};
    const envSrc = Host.fs.read(pdir + '/.env');
    if (envSrc) envSrc.split('\n').forEach(l => { const m = l.match(/^\s*([\w.]+)\s*=\s*(.*)$/); if (m) dotenv[m[1]] = m[2].replace(/^["']|["']$/g, ''); });
    const vars = Object.assign({}, dotenv, ctx.env);
    const warnings = [];
    const interp = v => {
      if (typeof v === 'string') return v.replace(/\$\$/g, '\u0001').replace(/\$\{(\w+)(?:(:?[-?])([^}]*))?\}|\$(\w+)/g, (m, a, op, d, b) => {
        const k = a || b; const val = vars[k];
        if (op && op.endsWith('?') && (val == null || (op === ':?' && val === ''))) throw new Error(`required variable ${k} is missing a value: ${d || ''}`);
        if (val == null || (op === ':-' && val === '')) { if (d == null && !op) warnings.push(`WARN[0000] The "${k}" variable is not set. Defaulting to a blank string.`); return d != null ? d : ''; }
        return val;
      }).replace(/\u0001/g, '$');
      if (Array.isArray(v)) return v.map(interp);
      if (v && typeof v === 'object') { const o2 = {}; Object.keys(v).forEach(k => { o2[k] = interp(v[k]); }); return o2; }
      return v;
    };
    const y = interp(raw);
    if (y.version) warnings.push(`WARN[0000] ${file}: the attribute \`version\` is obsolete, it will be ignored, please remove it to avoid potential confusion`);
    if (!y.services || typeof y.services !== 'object') throw new Error(`${base(file)}: services must be a mapping`);
    const name = (o['project-name'] || y.name || base(pdir)).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const known = ['image', 'build', 'command', 'entrypoint', 'environment', 'env_file', 'ports', 'volumes', 'depends_on', 'networks', 'restart', 'healthcheck', 'deploy', 'container_name', 'hostname', 'working_dir', 'user', 'labels', 'profiles', 'mem_limit', 'cpus', 'stdin_open', 'tty', 'read_only', 'expose', 'init', 'tmpfs', 'cap_add', 'cap_drop', 'extra_hosts', 'links', 'logging', 'platform', 'pull_policy', 'secrets', 'configs', 'develop', 'network_mode', 'privileged', 'stop_signal', 'stop_grace_period', 'ulimits', 'dns', 'scale'];
    const services = {};
    Object.keys(y.services).forEach(sn => {
      const s = y.services[sn] || {};
      Object.keys(s).forEach(k => { if (!known.includes(k)) throw new Error(`services.${sn} additional properties '${k}' not allowed`); });
      if (!s.image && !s.build) throw new Error(`service "${sn}" has neither an image nor a build context specified: invalid compose project`);
      const env = [];
      const envFiles = s.env_file ? [].concat(s.env_file) : [];
      envFiles.forEach(f => { const p = norm(typeof f === 'string' ? f : f.path, pdir); const t = Host.fs.read(p); if (t == null) throw new Error(`env file ${p} not found: stat ${p}: no such file or directory`); t.split('\n').forEach(l => { const m = l.match(/^\s*([\w.]+)\s*=\s*(.*)$/); if (m) env.push(`${m[1]}=${m[2].replace(/^["']|["']$/g, '')}`); }); });
      if (Array.isArray(s.environment)) s.environment.forEach(e => env.push(String(e).includes('=') ? String(e) : `${e}=${vars[e] || ''}`));
      else if (s.environment) Object.keys(s.environment).forEach(k => env.push(`${k}=${s.environment[k] == null ? (vars[k] || '') : s.environment[k]}`));
      const ports = [].concat(s.ports || []).map(p => typeof p === 'object' ? { hostIp: p.host_ip || '0.0.0.0', hostPort: String(p.published || ''), containerPort: String(p.target), proto: p.protocol || 'tcp' } : DockerCLI.parsePort(String(p)));
      const vols = [].concat(s.volumes || []).map(v => {
        if (typeof v === 'object') { const t = v.type || 'volume'; return { type: t, source: t === 'bind' ? norm(v.source, pdir) : (v.source ? `${name}_${v.source}` : ''), target: v.target, ro: !!v.read_only, named: v.source }; }
        const parts = String(v).split(':');
        if (parts.length === 1) return { type: 'volume', source: '', target: parts[0] };
        const [src, tgt, mode] = parts;
        const ro = /ro/.test(mode || '');
        if (/^[./~]/.test(src)) return { type: 'bind', source: norm(src, pdir), target: tgt, ro };
        if (!y.volumes || !(src in y.volumes)) throw new Error(`service "${sn}" refers to undefined volume ${src}: invalid compose project`);
        const vd = y.volumes[src] || {};
        return { type: 'volume', source: vd.external ? (vd.name || src) : (vd.name || `${name}_${src}`), target: tgt, ro, named: src };
      });
      let deps = {};
      if (Array.isArray(s.depends_on)) s.depends_on.forEach(d => { deps[d] = { condition: 'service_started' }; });
      else if (s.depends_on) Object.keys(s.depends_on).forEach(d => { deps[d] = Object.assign({ condition: 'service_started' }, s.depends_on[d] || {}); });
      Object.keys(deps).forEach(d => { if (!y.services[d]) throw new Error(`service "${sn}" depends on undefined service "${d}": invalid compose project`); });
      let nets = {};
      if (Array.isArray(s.networks)) s.networks.forEach(n => { nets[n] = {}; });
      else if (s.networks) Object.keys(s.networks).forEach(n => { nets[n] = s.networks[n] || {}; });
      if (!Object.keys(nets).length && !s.network_mode) nets = { default: {} };
      Object.keys(nets).forEach(n => { if (n !== 'default' && !(y.networks && n in y.networks)) throw new Error(`service "${sn}" refers to undefined network ${n}: invalid compose project`); });
      const cmd = s.command == null ? null : Array.isArray(s.command) ? s.command.map(String) : shellSplit(String(s.command));
      const ep = s.entrypoint == null ? null : Array.isArray(s.entrypoint) ? s.entrypoint.map(String) : shellSplit(String(s.entrypoint));
      let hc = null;
      if (s.healthcheck) {
        if (s.healthcheck.disable) hc = 'none';
        else { const t = s.healthcheck.test; hc = { test: Array.isArray(t) ? t.map(String) : ['CMD-SHELL', String(t)], interval: DockerCLI.dur(s.healthcheck.interval) || 30, timeout: DockerCLI.dur(s.healthcheck.timeout) || 30, retries: +(s.healthcheck.retries || 3), startPeriod: DockerCLI.dur(s.healthcheck.start_period) || 0 }; }
      }
      const lim = s.deploy && s.deploy.resources && s.deploy.resources.limits || {};
      const build = s.build ? (typeof s.build === 'string' ? { context: norm(s.build, pdir) } : { context: norm(s.build.context || '.', pdir), dockerfile: s.build.dockerfile, args: s.build.args, target: s.build.target }) : null;
      services[sn] = {
        name: sn, image: s.image || `${name}-${sn}`, build, cmd, entrypoint: ep, env, ports, volumes: vols, deps, nets,
        restart: s.restart || 'no', health: hc, containerName: s.container_name, hostname: s.hostname, workdir: s.working_dir, user: s.user != null ? String(s.user) : null,
        memory: lim.memory ? U.parseSize(lim.memory) : s.mem_limit ? U.parseSize(s.mem_limit) : 0, cpus: lim.cpus ? +lim.cpus : s.cpus ? +s.cpus : 0,
        replicas: (s.deploy && s.deploy.replicas) || s.scale || 1, profiles: s.profiles || [], tty: !!s.tty, stdin: !!s.stdin_open, readonly: !!s.read_only, init: !!s.init,
        labels: s.labels || {}, networkMode: s.network_mode, raw: s, pullPolicy: s.pull_policy, develop: s.develop
      };
      services[sn].hash = U.hash(JSON.stringify(s), 16);
    });
    const networks = {};
    if (Object.values(services).some(s => s.nets.default)) networks.default = { name: `${name}_default` };
    Object.keys(y.networks || {}).forEach(n => { const d = y.networks[n] || {}; networks[n] = { name: d.external ? (d.name || n) : (d.name || `${name}_${n}`), external: !!d.external, internal: !!d.internal, driver: d.driver }; });
    const volumes = {};
    Object.keys(y.volumes || {}).forEach(v => { const d = y.volumes[v] || {}; volumes[v] = { name: d.external ? (d.name || v) : (d.name || `${name}_${v}`), external: !!d.external }; });
    return { name, file, dir: pdir, services, networks, volumes, raw: y, warnings };
  }
  function shellSplit(s) {
    const out = []; let cur = '', q = null, any = false;
    for (const ch of s) {
      if (q) { if (ch === q) q = null; else cur += ch; continue; }
      if (ch === '"' || ch === "'") { q = ch; any = true; continue; }
      if (/\s/.test(ch)) { if (cur || any) out.push(cur); cur = ''; any = false; continue; }
      cur += ch;
    }
    if (cur || any) out.push(cur);
    return out;
  }
  function order(P, names) {
    const out = [], seen = new Set();
    const visit = n => { if (seen.has(n)) return; seen.add(n); Object.keys(P.services[n].deps).forEach(visit); out.push(n); };
    names.forEach(visit);
    return out;
  }
  function projContainers(D, pname, svc) {
    return D.s.containers.filter(c => c.compose && c.compose.project === pname && (!svc || c.compose.service === svc) && !c.compose.oneoff);
  }

  /* ------------------------------------------------ 출력 --- */
  function statusBoard(ctx, title) {
    const rows = [];
    let live = ctx.io.live ? ctx.io.live('') : null;
    const render = () => {
      const done = rows.filter(r => r.done).length;
      return `[+] ${title} ${done}/${rows.length}\n` + rows.map(r => ` ${r.done ? (r.err ? '\x1b[31m✘\x1b[0m' : '\x1b[32m✔\x1b[0m') : '\x1b[36m⠿\x1b[0m'} ${U.pad(r.label, 34)} ${U.pad(r.state, 10)} ${r.t != null ? (r.t / 1000).toFixed(1) + 's' : ''}`).join('\n');
    };
    const upd = () => { if (live) live.update(render()); };
    return {
      add(label, state) { const r = { label, state, t0: Date.now(), done: false }; rows.push(r); upd(); return r; },
      set(r, state, done, err) { r.state = state; if (done) { r.done = true; r.t = Date.now() - r.t0; r.err = !!err; } upd(); },
      end() { if (live) { live.update(render()); live.done(); } else ctx.out(render() + '\n'); }
    };
  }

  /* ------------------------------------------------ up --- */
  async function up(ctx, P, o, only) {
    const D = ctx.D;
    const scale = {}; (o.scale || []).forEach(s => { const [k, v] = s.split('='); scale[k] = +v; });
    let names = Object.keys(P.services).filter(n => !P.services[n].profiles.length || (o.profile || []).some(p => P.services[n].profiles.includes(p)));
    if (only && only.length) { for (const n of only) if (!P.services[n]) { ctx.err(`no such service: ${n}\n`); return 1; } names = order(P, only); }
    const ord = order(P, names);
    // 이미지 준비 (빌드 · 풀)
    for (const n of ord) {
      const s = P.services[n];
      const have = D.findImage(s.image);
      if (s.build && (o.build || !have)) {
        ctx.out(`[+] Building ${n}\n`);
        const bargs = ['-t', s.image];
        if (s.build.dockerfile) bargs.push('-f', norm(s.build.dockerfile, s.build.context));
        if (s.build.target) bargs.push('--target', s.build.target);
        if (s.build.args) (Array.isArray(s.build.args) ? s.build.args : Object.entries(s.build.args).map(([k, v]) => `${k}=${v}`)).forEach(a => bargs.push('--build-arg', a));
        bargs.push(s.build.context);
        const code = await Builder.build(Object.assign({}, ctx, { cwd: s.build.context }), bargs);
        if (code !== 0) { ctx.err(`failed to solve: service "${n}" build failed\n`); return code; }
        ctx.out(` \x1b[32m✔\x1b[0m Service ${n}  Built\n`);
      } else if (!have) {
        const b = statusBoard(ctx, 'Pulling');
        const r = b.add(n, 'Pulling');
        const img = await D.pull(s.image, { out: () => {}, err: () => {}, signal: ctx.io.signal }, { quiet: true });
        if (!img) { b.set(r, 'Error', true, true); b.end(); ctx.err(`Error response from daemon: pull access denied for ${Hub.resolve(s.image).repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied\n`); return 1; }
        b.set(r, 'Pulled', true); b.end();
      }
    }
    const board = statusBoard(ctx, 'Running');
    // 네트워크 · 볼륨
    for (const k of Object.keys(P.networks)) {
      const n = P.networks[k];
      if (n.external) { if (!D.network(n.name)) { board.end(); ctx.err(`network ${n.name} declared as external, but could not be found\n`); return 1; } continue; }
      if (!D.network(n.name)) { const r = board.add(`Network ${n.name}`, 'Creating'); D.createNetwork(n.name, { internal: n.internal, labels: { 'com.docker.compose.project': P.name, 'com.docker.compose.network': k } }); await U.sleep(80); board.set(r, 'Created', true); }
    }
    for (const k of Object.keys(P.volumes)) {
      const v = P.volumes[k];
      if (v.external) { if (!D.volume(v.name)) { board.end(); ctx.err(`external volume "${v.name}" not found\n`); return 1; } continue; }
      if (!D.volume(v.name)) { const r = board.add(`Volume "${v.name}"`, 'Creating'); D.createVolume(v.name, { labels: { 'com.docker.compose.project': P.name, 'com.docker.compose.volume': k } }); await U.sleep(50); board.set(r, 'Created', true); }
    }
    // 컨테이너 만들기 · 시작 (의존 순서)
    const started = {};
    for (const n of ord) {
      const s = P.services[n];
      const want = scale[n] != null ? scale[n] : s.replicas;
      if (s.containerName && want > 1) { board.end(); ctx.err(`WARNING: The "${n}" service is using the custom container name "${s.containerName}". Docker requires each container to have a unique name. Remove the custom name to scale the service\n`); return 1; }
      // 의존 조건 기다리기
      for (const [dep, cond] of Object.entries(s.deps)) {
        const dcs = projContainers(D, P.name, dep);
        if (cond.condition === 'service_healthy') {
          const r = board.add(`Container ${dcs[0] ? dcs[0].name : dep}`, 'Waiting');
          const ok = await waitFor(ctx, () => dcs.every(c => c.health && c.health.status === 'healthy'), () => dcs.some(c => c.health && c.health.status === 'unhealthy' || c.state.status === 'exited'), 60000);
          if (!ok) { board.set(r, 'Error', true, true); board.end(); const why = dcs.some(c => !c.healthcheck) ? `service "${dep}" has no healthcheck configured` : `dependency failed to start: container ${dcs[0] ? dcs[0].name : dep} is unhealthy`; ctx.err(`${why}\n`); return 1; }
          board.set(r, 'Healthy', true);
        } else if (cond.condition === 'service_completed_successfully') {
          const r = board.add(`Container ${dcs[0] ? dcs[0].name : dep}`, 'Waiting');
          const ok = await waitFor(ctx, () => dcs.every(c => c.state.status === 'exited' && c.state.exitCode === 0), () => dcs.some(c => c.state.status === 'exited' && c.state.exitCode !== 0), 60000);
          if (!ok) { board.set(r, 'Error', true, true); board.end(); ctx.err(`service "${dep}" didn't complete successfully: exit ${dcs[0] ? dcs[0].state.exitCode : 1}\n`); return 1; }
          board.set(r, 'Exited', true);
        }
      }
      const cur = projContainers(D, P.name, n).sort((a, b) => a.compose.number - b.compose.number);
      // 설정이 바뀌면 다시 만든다
      for (const c of cur) {
        const img = D.findImage(s.image);
        if (c.compose.hash !== s.hash || (img && c.imageId !== img.id) || o['force-recreate']) {
          const r = board.add(`Container ${c.name}`, 'Recreate');
          await D.remove(c, { force: true });
          const nc = createSvc(D, P, s, c.compose.number);
          try { await D.start(nc); board.set(r, 'Recreated', true); started[nc.id] = nc; }
          catch (e) { board.set(r, 'Error', true, true); board.end(); ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
        }
      }
      const now = projContainers(D, P.name, n).sort((a, b) => a.compose.number - b.compose.number);
      // 개수 맞추기
      for (let i = now.length; i < want; i++) {
        const num = i + 1;
        let c;
        try { c = createSvc(D, P, s, num); } catch (e) { board.end(); ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
        const r = board.add(`Container ${c.name}`, 'Created');
        await U.sleep(60);
        try { await D.start(c); board.set(r, 'Started', true); started[c.id] = c; }
        catch (e) { board.set(r, 'Error', true, true); board.end(); ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
      }
      now.slice(want).forEach(async c => { const r = board.add(`Container ${c.name}`, 'Stopping'); await D.remove(c, { force: true }); board.set(r, 'Removed', true); });
      now.slice(0, want).forEach(c => {
        if (started[c.id]) return;
        if (c.state.status !== 'running') { const r = board.add(`Container ${c.name}`, 'Starting'); D.start(c).then(() => board.set(r, 'Started', true)).catch(e => { board.set(r, 'Error', true, true); ctx.err(e.message + '\n'); }); }
        else board.set(board.add(`Container ${c.name}`, 'Running'), 'Running', true);
      });
    }
    // 고아 컨테이너
    const orphans = projContainers(D, P.name).filter(c => !P.services[c.compose.service]);
    await U.sleep(120);
    board.end();
    if (orphans.length) ctx.err(`WARN[0000] Found orphan containers ([${orphans.map(c => c.name).join(' ')}]) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up.\n`);
    if (o.detach) return 0;
    // 붙어서 로그 보기
    ctx.out('Attaching to ' + ord.map(n => projContainers(D, P.name, n).map(c => c.name).join(', ')).filter(Boolean).join(', ') + '\n');
    return followLogs(ctx, P, ord, { follow: true, since: Date.now() - 60000, attach: true });
  }
  async function waitFor(ctx, ok, fail, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (ok()) return true;
      if (fail && fail()) return false;
      if (!(await U.sleep(150, ctx.io.signal))) return false;
    }
    return false;
  }
  function createSvc(D, P, s, num, oneoff) {
    const name = oneoff ? `${P.name}-${s.name}-run-${U.hex(12)}` : (s.containerName || `${P.name}-${s.name}-${num}`);
    const netKeys = Object.keys(s.nets);
    const first = netKeys[0];
    const mounts = s.volumes.map(v => Object.assign({}, v));
    mounts.forEach(m => { if (m.type === 'bind' && !Host.fs.stat(m.source)) Host.fs.mkdir(m.source); });
    const c = D.create({
      image: s.image, name, cmd: s.cmd, entrypoint: s.entrypoint, env: s.env, ports: oneoff ? [] : s.ports.map(p => Object.assign({}, p)), mounts,
      network: s.networkMode === 'host' ? 'host' : s.networkMode === 'none' ? 'none' : (first ? P.networks[first].name : 'bridge'),
      aliases: [s.name].concat((first && s.nets[first].aliases) || []),
      restart: oneoff ? { name: 'no' } : DockerCLI.restartPolicy(s.restart), memory: s.memory, cpus: s.cpus, rm: !!oneoff, tty: s.tty, interactive: s.stdin,
      workdir: s.workdir, user: s.user, hostname: s.hostname, labels: Object.assign({ 'com.docker.compose.project': P.name, 'com.docker.compose.service': s.name, 'com.docker.compose.container-number': String(num), 'com.docker.compose.project.working_dir': P.dir, 'com.docker.compose.config-hash': s.hash }, Array.isArray(s.labels) ? {} : s.labels),
      health: s.health, readonly: s.readonly, init: s.init,
      compose: { project: P.name, service: s.name, number: num, hash: s.hash, oneoff: !!oneoff, dir: P.dir }
    });
    netKeys.slice(1).forEach(k => D.connect(P.networks[k].name, c, { aliases: [s.name].concat(s.nets[k].aliases || []) }));
    return c;
  }

  async function followLogs(ctx, P, svcs, o) {
    const D = ctx.D;
    const color = {};
    const names = svcs && svcs.length ? svcs : Object.keys(P.services);
    const list = () => D.s.containers.filter(c => c.compose && c.compose.project === P.name && names.includes(c.compose.service) && !c.compose.oneoff);
    const width = Math.max(...list().map(c => c.name.length), 8);
    list().forEach((c, i) => { color[c.name] = COLORS[Object.keys(P.services).indexOf(c.compose.service) % COLORS.length]; });
    const pre = c => o.noPrefix ? '' : `\x1b[${color[c.name] || COLORS[0]}m${U.pad(c.name, width)} |\x1b[0m `;
    const printed = new Set();
    let rows = [];
    list().forEach(c => c.logs.forEach(l => rows.push({ c, l })));
    rows.sort((a, b) => a.l.t - b.l.t);
    if (o.tail != null) { const by = {}; rows = rows.filter(r => { by[r.c.id] = (by[r.c.id] || 0) + 1; return true; }); const cnt = {}; rows = rows.reverse().filter(r => { cnt[r.c.id] = (cnt[r.c.id] || 0) + 1; return cnt[r.c.id] <= +o.tail; }).reverse(); }
    rows.forEach(r => { printed.add(r.l); ctx.out(pre(r.c) + r.l.m + '\n'); });
    if (!o.follow) return 0;
    let exited = new Set();
    return new Promise(res => {
      const offL = D.on('log', (c, e) => { if (c.compose && c.compose.project === P.name && names.includes(c.compose.service) && !printed.has(e)) { if (!color[c.name]) color[c.name] = COLORS[Object.keys(P.services).indexOf(c.compose.service) % COLORS.length]; ctx.out(pre(c) + e.m + '\n'); } });
      const offC = D.on('change', () => {
        list().forEach(c => { if (c.state.status === 'exited' && !exited.has(c.id)) { exited.add(c.id); if (o.attach) ctx.out(`\x1b[${color[c.name] || '0'}m${c.name} exited with code ${c.state.exitCode}\x1b[0m\n`); } });
        if (o.attach && list().length && list().every(c => c.state.status === 'exited' && c.hostConfig.restart.name === 'no')) { offL(); offC(); res(0); }
      });
      if (ctx.io.signal) ctx.io.signal.addEventListener('abort', async () => {
        offL(); offC();
        if (o.attach) {
          ctx.out('\nGracefully stopping... (press Ctrl+C again to force)\n');
          const cs = list();
          const b = statusBoard(ctx, 'Stopping');
          const rs = cs.map(c => b.add(`Container ${c.name}`, 'Stopping'));
          await Promise.all(cs.slice().reverse().map((c, i) => D.stop(c, 10).then(() => b.set(rs[cs.length - 1 - i], 'Stopped', true))));
          b.end();
          ctx.out(`canceled\n`);
        }
        res(130);
      });
    });
  }

  /* ------------------------------------------------ 명령 --- */
  const SPEC = { 'f|file': 'list', 'p|project-name': 'str', 'profile': 'list', 'env-file': 'list', 'project-directory': 'str', 'ansi': 'str', 'progress': 'str' };
  async function cli(ctx, args) {
    const D = ctx.D;
    // 전역 옵션과 하위 명령 분리
    const gl = []; let i = 0;
    while (i < args.length && args[i].startsWith('-')) { gl.push(args[i]); if (['-f', '--file', '-p', '--project-name', '--profile', '--env-file', '--project-directory', '--ansi', '--progress'].includes(args[i])) gl.push(args[++i]); i++; }
    const sub = args[i]; const rest = args.slice(i + 1);
    const go = DockerCLI.parseOpts(gl, SPEC).o;
    if (!sub || sub === '--help' || sub === 'help') {
      ctx.out(`Usage:  docker compose [OPTIONS] COMMAND\n\nDefine and run multi-container applications with Docker\n\nOptions:\n  -f, --file stringArray           Compose configuration files\n  -p, --project-name string        Project name\n      --profile stringArray        Specify a profile to enable\n\nCommands:\n  build       Build or rebuild services\n  config      Parse, resolve and render compose file in canonical format\n  down        Stop and remove containers, networks\n  exec        Execute a command in a running container\n  images      List images used by the created containers\n  kill        Force stop service containers\n  logs        View output from containers\n  ls          List running compose projects\n  pause       Pause services\n  port        Print the public port for a port binding\n  ps          List containers\n  pull        Pull service images\n  restart     Restart service containers\n  rm          Removes stopped service containers\n  run         Run a one-off command on a service\n  start       Start services\n  stop        Stop services\n  top         Display the running processes\n  unpause     Unpause services\n  up          Create and start containers\n  version     Show the Docker Compose version information\n  watch       Watch build context for service and rebuild/refresh containers when files are updated\n`);
      return 0;
    }
    if (sub === 'version') { ctx.out('Docker Compose version v2.31.0\n'); return 0; }
    if (sub === 'ls') {
      const projs = {};
      D.s.containers.filter(c => c.compose).forEach(c => { const p = projs[c.compose.project] = projs[c.compose.project] || { run: 0, ex: 0, dir: c.compose.dir }; if (c.state.status === 'running') p.run++; else p.ex++; });
      const { o } = DockerCLI.parseOpts(rest, { 'a|all': 'bool', 'q|quiet': 'bool', 'format': 'str' });
      const t = [['NAME', 'STATUS', 'CONFIG FILES']];
      Object.entries(projs).forEach(([n, p]) => { if (!p.run && !o.all) return; t.push([n, [p.run ? `running(${p.run})` : '', p.ex ? `exited(${p.ex})` : ''].filter(Boolean).join(', '), p.dir + '/compose.yaml']); });
      ctx.out(U.table(t) + '\n'); return 0;
    }
    let P;
    try { P = loadProject(ctx, go); }
    catch (e) { ctx.err(`${e.message}\n`); return 1; }
    P.warnings.forEach(w => ctx.err(`\x1b[33m${w}\x1b[0m\n`));
    const svcArgs = r => r.filter(x => !x.startsWith('-'));
    switch (sub) {
      case 'config': {
        const { o } = DockerCLI.parseOpts(rest, { 'services': 'bool', 'volumes': 'bool', 'q|quiet': 'bool', 'format': 'str', 'no-interpolate': 'bool' });
        if (o.quiet) return 0;
        if (o.services) { ctx.out(Object.keys(P.services).join('\n') + '\n'); return 0; }
        if (o.volumes) { ctx.out(Object.keys(P.volumes).join('\n') + '\n'); return 0; }
        const norm2 = { name: P.name, services: {} };
        Object.values(P.services).forEach(s => {
          const x = {};
          if (s.build) x.build = { context: s.build.context, dockerfile: s.build.dockerfile || 'Dockerfile' };
          if (s.cmd) x.command = s.cmd;
          if (Object.keys(s.deps).length) x.depends_on = Object.fromEntries(Object.entries(s.deps).map(([k, v]) => [k, { condition: v.condition, required: true }]));
          if (s.env.length) x.environment = Object.fromEntries(s.env.map(e => [e.split('=')[0], e.slice(e.indexOf('=') + 1)]));
          if (s.health && s.health !== 'none') x.healthcheck = { test: s.health.test, interval: s.health.interval + 's', retries: s.health.retries };
          x.image = s.image;
          x.networks = Object.fromEntries(Object.keys(s.nets).map(n => [n, null]));
          if (s.ports.length) x.ports = s.ports.map(p => ({ mode: 'ingress', host_ip: p.hostIp === '0.0.0.0' ? undefined : p.hostIp, target: +p.containerPort, published: p.hostPort, protocol: p.proto })).map(p => { if (!p.host_ip) delete p.host_ip; return p; });
          if (s.restart !== 'no') x.restart = s.restart;
          if (s.volumes.length) x.volumes = s.volumes.map(v => ({ type: v.type, source: v.type === 'volume' ? (v.named || '') : v.source, target: v.target, read_only: v.ro || undefined })).map(v => { if (!v.read_only) delete v.read_only; return v; });
          norm2.services[s.name] = x;
        });
        norm2.networks = Object.fromEntries(Object.entries(P.networks).map(([k, n]) => [k, { name: n.name }]));
        if (Object.keys(P.volumes).length) norm2.volumes = Object.fromEntries(Object.entries(P.volumes).map(([k, v]) => [k, { name: v.name }]));
        ctx.out(YAML.stringify(norm2) + '\n');
        return 0;
      }
      case 'up': {
        let o;
        try { o = DockerCLI.parseOpts(rest, { 'd|detach': 'bool', 'build': 'bool', 'scale': 'list', 'force-recreate': 'bool', 'no-build': 'bool', 'remove-orphans': 'bool', 'wait': 'bool', 'no-deps': 'bool', 'pull': 'str', 'abort-on-container-exit': 'bool', 'watch': 'bool', 'y|yes': 'bool', 'no-start': 'bool', 'V|renew-anon-volumes': 'bool' }); } catch (e) { ctx.err(e.message + '\n'); return 1; }
        o.o.profile = go.profile;
        if (o.o['remove-orphans']) for (const c of projContainers(D, P.name).filter(c => !P.services[c.compose.service])) await D.remove(c, { force: true });
        const r = await up(ctx, P, o.o, o.pos);
        if (r === 0 && o.o.wait) await waitFor(ctx, () => projContainers(D, P.name).every(c => !c.health || c.health.status === 'healthy'), null, 30000);
        return r;
      }
      case 'down': {
        const { o } = DockerCLI.parseOpts(rest, { 'v|volumes': 'bool', 'rmi': 'str', 'remove-orphans': 'bool', 't|timeout': 'str' });
        const cs = projContainers(D, P.name).concat(D.s.containers.filter(c => c.compose && c.compose.project === P.name && c.compose.oneoff));
        const b = statusBoard(ctx, 'Running');
        const rows = cs.map(c => b.add(`Container ${c.name}`, 'Stopping'));
        await Promise.all(cs.map((c, k) => D.stop(c, o.timeout != null ? +o.timeout : 10).then(() => { b.set(rows[k], 'Removing'); return D.remove(c, { force: true }); }).then(() => b.set(rows[k], 'Removed', true))));
        if (o.volumes) for (const k of Object.keys(P.volumes)) { const v = P.volumes[k]; if (v.external || !D.volume(v.name)) continue; const r = b.add(`Volume ${v.name}`, 'Removing'); try { D.removeVolume(v.name); b.set(r, 'Removed', true); } catch (e) { b.set(r, 'Error', true, true); } }
        if (o.volumes) D.s.volumes.filter(v => v.anonymous && !D.s.containers.some(c => c.hostConfig.mounts.some(m => m.source === v.name))).forEach(v => { D.s.volumes = D.s.volumes.filter(x => x !== v); });
        for (const k of Object.keys(P.networks)) { const n = P.networks[k]; if (n.external || !D.network(n.name)) continue; const r = b.add(`Network ${n.name}`, 'Removing'); try { D.removeNetwork(n.name); b.set(r, 'Removed', true); } catch (e) { b.set(r, 'Error', true, true); } }
        if (o.rmi) Object.values(P.services).forEach(s => { if (o.rmi === 'all' || s.build) { try { D.removeImage(s.image, false); b.set(b.add(`Image ${s.image}`, 'Removed'), 'Removed', true); } catch (_) {} } });
        b.end();
        D.changed('compose');
        return 0;
      }
      case 'ps': {
        const { o } = DockerCLI.parseOpts(rest, { 'a|all': 'bool', 'q|quiet': 'bool', 'services': 'bool', 'format': 'str', 'status': 'list' });
        let cs = projContainers(D, P.name).filter(c => o.all || ['running', 'paused', 'restarting'].includes(c.state.status));
        const only = svcArgs(rest); if (only.length) cs = cs.filter(c => only.includes(c.compose.service));
        if (o.quiet) { cs.forEach(c => ctx.out(c.id.slice(0, 12) + '\n')); return 0; }
        if (o.services) { ctx.out(Array.from(new Set(cs.map(c => c.compose.service))).join('\n') + '\n'); return 0; }
        const t = [['NAME', 'IMAGE', 'COMMAND', 'SERVICE', 'CREATED', 'STATUS', 'PORTS']];
        cs.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => t.push([c.name, c.image, DockerCLI.cmdText(c, true), c.compose.service, U.human(Date.now() - c.created) + ' ago', DockerCLI.statusText(D, c), DockerCLI.portsText(c)]));
        ctx.out(U.table(t) + '\n'); return 0;
      }
      case 'logs': {
        const { o, pos } = DockerCLI.parseOpts(rest, { 'f|follow': 'bool', 'n|tail': 'str', 't|timestamps': 'bool', 'no-color': 'bool', 'no-log-prefix': 'bool', 'since': 'str' });
        return followLogs(ctx, P, pos, { follow: o.follow, tail: o.tail, noPrefix: o['no-log-prefix'] });
      }
      case 'exec': {
        let parsed;
        try { parsed = DockerCLI.parseOpts(rest, { 'T|no-TTY': 'bool', 'd|detach': 'bool', 'e|env': 'list', 'u|user': 'str', 'w|workdir': 'str', 'index': 'str', 'i|interactive': 'bool', 't|tty': 'bool', 'privileged': 'bool' }, 1); } catch (e) { ctx.err(e.message + '\n'); return 1; }
        const { o, pos } = parsed;
        const sv = pos[0];
        if (!P.services[sv]) { ctx.err(`service "${sv}" is not running\n`); return 1; }
        const c = projContainers(D, P.name, sv).find(x => x.compose.number === +(o.index || 1)) || projContainers(D, P.name, sv)[0];
        if (!c || c.state.status !== 'running') { ctx.err(`service "${sv}" is not running\n`); return 1; }
        if (pos.length < 2) { ctx.err('"docker compose exec" requires at least 2 arguments.\n'); return 1; }
        return DockerCLI.execIn(ctx, c, pos.slice(1), { interactive: !o['no-TTY'], tty: !o['no-TTY'], env: o.env, user: o.user, workdir: o.workdir, detach: o.detach });
      }
      case 'run': {
        let parsed;
        try { parsed = DockerCLI.parseOpts(rest, { 'rm': 'bool', 'd|detach': 'bool', 'e|env': 'list', 'T|no-TTY': 'bool', 'name': 'str', 'no-deps': 'bool', 'p|publish': 'list', 'service-ports': 'bool', 'u|user': 'str', 'w|workdir': 'str', 'entrypoint': 'str', 'i|interactive': 'bool', 'build': 'bool' }, 1); } catch (e) { ctx.err(e.message + '\n'); return 1; }
        const { o, pos } = parsed;
        const s = P.services[pos[0]];
        if (!s) { ctx.err(`no such service: ${pos[0]}\n`); return 1; }
        if (!o['no-deps'] && Object.keys(s.deps).length) { const r = await up(ctx, P, { detach: true }, Object.keys(s.deps)); if (r) return r; }
        if (!D.findImage(s.image)) { const r = await up(Object.assign({}, ctx, { io: Object.assign({}, ctx.io, { live: null }), out: () => {} }), P, { detach: true, 'no-start': true }, [pos[0]]); }
        for (const k of Object.keys(P.networks)) if (!D.network(P.networks[k].name) && !P.networks[k].external) D.createNetwork(P.networks[k].name);
        const s2 = Object.assign({}, s, { cmd: pos.length > 1 ? pos.slice(1) : s.cmd, env: s.env.concat(o.env), stdin: !o['no-TTY'], tty: !o['no-TTY'] });
        const c = createSvc(D, P, s2, 1, true);
        if (!o.rm) c.hostConfig.autoRemove = false;
        if (o['service-ports']) c.hostConfig.ports = s.ports.map(p => Object.assign({}, p));
        try { await D.start(c); } catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
        if (o.detach) { ctx.out(c.name + '\n'); return 0; }
        return DockerCLI.attachRun(ctx, c, { interactive: !o['no-TTY'], tty: !o['no-TTY'] });
      }
      case 'build': {
        const { o, pos } = DockerCLI.parseOpts(rest, { 'no-cache': 'bool', 'pull': 'bool', 'q|quiet': 'bool', 'build-arg': 'list', 'progress': 'str' });
        const names = pos.length ? pos : Object.keys(P.services).filter(n => P.services[n].build);
        if (!names.length) { ctx.out('(빌드할 서비스가 없습니다: build: 항목이 있는 서비스만 빌드합니다)\n'); return 0; }
        for (const n of names) {
          const s = P.services[n];
          if (!s.build) continue;
          const bargs = ['-t', s.image];
          if (o['no-cache']) bargs.push('--no-cache');
          if (s.build.dockerfile) bargs.push('-f', norm(s.build.dockerfile, s.build.context));
          if (s.build.target) bargs.push('--target', s.build.target);
          bargs.push(s.build.context);
          const r = await Builder.build(Object.assign({}, ctx, { cwd: s.build.context }), bargs);
          if (r) return r;
        }
        return 0;
      }
      case 'pull': {
        const b = statusBoard(ctx, 'Pulling');
        for (const s of Object.values(P.services)) {
          if (s.build && !s.raw.image) { continue; }
          const r = b.add(s.name, 'Pulling');
          const img = await D.pull(s.image, { out: () => {}, err: () => {}, signal: ctx.io.signal }, { quiet: true });
          b.set(r, img ? 'Pulled' : 'Error', true, !img);
        }
        b.end(); return 0;
      }
      case 'stop': case 'start': case 'restart': case 'kill': case 'pause': case 'unpause': case 'rm': {
        const { o, pos } = DockerCLI.parseOpts(rest, { 'f|force': 'bool', 's|stop': 'bool', 'v|volumes': 'bool', 't|timeout': 'str', 's|signal': 'str' });
        let cs = projContainers(D, P.name); if (pos.length) cs = cs.filter(c => pos.includes(c.compose.service));
        if (sub === 'rm') cs = cs.filter(c => c.state.status !== 'running' || o.stop);
        if (!cs.length) { if (sub === 'rm') ctx.out('No stopped containers\n'); return 0; }
        if (sub === 'rm' && !o.force) { const a = ctx.io.readline ? await ctx.io.readline(`Going to remove ${cs.map(c => c.name).join(', ')}\n? Are you sure? (y/N) `) : 'y'; if (!/^y/i.test(a)) return 0; }
        const b = statusBoard(ctx, 'Running');
        const verb = { stop: ['Stopping', 'Stopped'], start: ['Starting', 'Started'], restart: ['Restarting', 'Started'], kill: ['Killing', 'Killed'], pause: ['Pausing', 'Paused'], unpause: ['Unpausing', 'Unpaused'], rm: ['Removing', 'Removed'] }[sub];
        const ord2 = sub === 'stop' || sub === 'rm' ? cs.slice().reverse() : cs;
        for (const c of ord2) {
          const r = b.add(`Container ${c.name}`, verb[0]);
          try {
            if (sub === 'stop') await D.stop(c, o.timeout != null ? +o.timeout : 10);
            else if (sub === 'start') await D.start(c);
            else if (sub === 'restart') await D.restart(c);
            else if (sub === 'kill') D.kill(c, o.signal);
            else if (sub === 'pause') D.pause(c);
            else if (sub === 'unpause') D.unpause(c);
            else if (sub === 'rm') await D.remove(c, { force: true, volumes: o.volumes });
            b.set(r, verb[1], true);
          } catch (e) { b.set(r, 'Error', true, true); }
        }
        b.end(); return 0;
      }
      case 'top': {
        projContainers(D, P.name).filter(c => c.state.status === 'running').forEach(c => { ctx.out(c.name + '\n'); DockerCLI.cmds.top(Object.assign({}, ctx), [c.name]); ctx.out('\n'); });
        return 0;
      }
      case 'images': {
        const t = [['CONTAINER', 'REPOSITORY', 'TAG', 'IMAGE ID', 'SIZE']];
        projContainers(D, P.name).forEach(c => { const img = D.img(c); const [r, tg] = (img && img.repoTags[0] || '<none>:<none>').split(/:(?=[^:]*$)/); t.push([c.name, r, tg, img ? img.id.slice(0, 12) : '', img ? U.size(img.size) : '']); });
        ctx.out(U.table(t) + '\n'); return 0;
      }
      case 'port': {
        const pos = svcArgs(rest);
        const c = projContainers(D, P.name, pos[0])[0];
        if (!c) { ctx.err(`no container found for ${pos[0]}\n`); return 1; }
        const p = c.hostConfig.ports.find(x => x.containerPort === String(pos[1]));
        if (!p) { ctx.err(`no port ${pos[1]}/tcp for container ${c.name}\n`); return 1; }
        ctx.out(`0.0.0.0:${p.hostPort}\n`); return 0;
      }
      case 'watch': {
        ctx.out('watch enabled\n');
        const svcs = Object.values(P.services).filter(s => s.develop && s.develop.watch);
        if (!svcs.length) { ctx.err('none of the selected services is configured for watch, consider setting a \'develop\' section\n'); return 1; }
        ctx.out('(시뮬레이터) 파일 탭에서 소스를 저장하면 sync 규칙에 따라 컨테이너에 반영됩니다. Ctrl+C 로 끝냅니다.\n');
        const off = Host.onWrite((p) => {
          svcs.forEach(s => (s.develop.watch || []).forEach(w => {
            const src = norm(w.path, P.dir);
            if (!p.startsWith(src)) return;
            projContainers(D, P.name, s.name).forEach(async c => {
              if (w.action === 'sync' || w.action === 'sync+restart') { const rel = p.slice(src.length); Apps.fsFor(D, c, 'root').write(norm(w.target + rel), Host.fs.read(p)); ctx.out(`Syncing service "${s.name}" after 1 changes were detected\n`); if (w.action === 'sync+restart') await D.restart(c); }
              if (w.action === 'rebuild') { ctx.out(`Rebuilding service "${s.name}" after changes were detected...\n`); await up(ctx, P, { detach: true, build: true }, [s.name]); }
            });
          }));
        });
        await new Promise(r => ctx.io.signal && ctx.io.signal.addEventListener('abort', r));
        off(); return 0;
      }
      default:
        ctx.err(`unknown docker command: "compose ${sub}"\n`);
        return 1;
    }
  }

  window.Compose = { cli, loadProject };
})();
