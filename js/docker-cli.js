/* ===================================================================
   docker 명령줄 (CLI) — 실제 docker 와 같은 옵션 · 출력 모양
   =================================================================== */
(function () {
  'use strict';
  const { size, human, table } = U;

  /* ------------------------------------------------ 옵션 해석 --- */
  /**
   * spec: { 'd|detach': 'bool', 'p|publish': 'list', 'name': 'str' ... }
   * stopAtPositional: 첫 위치 인자(이미지)부터는 옵션으로 보지 않음 (run/exec)
   */
  function parseOpts(args, spec, stopAt) {
    const map = {};
    Object.keys(spec).forEach(k => k.split('|').forEach(n => { map[n] = { key: k.split('|').pop(), type: spec[k] }; }));
    const o = {}, pos = [];
    Object.keys(spec).forEach(k => { const key = k.split('|').pop(); if (spec[k] === 'list') o[key] = []; });
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (stopAt && pos.length >= stopAt) { pos.push(a); continue; }
      if (a === '--') { pos.push(...args.slice(i + 1)); break; }
      if (/^--[\w-]+/.test(a)) {
        let [name, val] = a.slice(2).split(/=(.*)/s);
        const s = map[name];
        if (!s) throw new Error(`unknown flag: --${name}`);
        if (s.type === 'bool') { o[s.key] = val == null ? true : val !== 'false'; continue; }
        if (val == null) { val = args[++i]; if (val == null) throw new Error(`flag needs an argument: --${name}`); }
        if (s.type === 'list') o[s.key].push(val); else o[s.key] = val;
        continue;
      }
      if (/^-[A-Za-z]/.test(a) && !/^-\d/.test(a)) {
        const chars = a.slice(1);
        for (let j = 0; j < chars.length; j++) {
          const s = map[chars[j]];
          if (!s) throw new Error(`unknown shorthand flag: '${chars[j]}' in ${a}`);
          if (s.type === 'bool') { o[s.key] = true; continue; }
          let val = chars.slice(j + 1);
          if (val.startsWith('=')) val = val.slice(1);
          if (!val) { val = args[++i]; if (val == null) throw new Error(`flag needs an argument: '${chars[j]}' in ${a}`); }
          if (s.type === 'list') o[s.key].push(val); else o[s.key] = val;
          break;
        }
        continue;
      }
      pos.push(a);
    }
    return { o, pos };
  }

  const RUN_SPEC = {
    'd|detach': 'bool', 'i|interactive': 'bool', 't|tty': 'bool', 'rm': 'bool', 'name': 'str',
    'p|publish': 'list', 'P|publish-all': 'bool', 'e|env': 'list', 'env-file': 'list', 'v|volume': 'list', 'mount': 'list',
    'net|network': 'str', 'network-alias': 'list', 'restart': 'str', 'm|memory': 'str', 'cpus': 'str', 'w|workdir': 'str',
    'u|user': 'str', 'h|hostname': 'str', 'l|label': 'list', 'entrypoint': 'str', 'health-cmd': 'str', 'health-interval': 'str',
    'health-retries': 'str', 'health-timeout': 'str', 'health-start-period': 'str', 'no-healthcheck': 'bool', 'read-only': 'bool', 'init': 'bool',
    'tmpfs': 'list', 'link': 'list', 'cap-add': 'list', 'cap-drop': 'list', 'privileged': 'bool', 'platform': 'str', 'pull': 'str',
    'pids-limit': 'str', 'memory-swap': 'str', 'expose': 'list', 'add-host': 'list', 'dns': 'list', 'q|quiet': 'bool', 'security-opt': 'list', 'ulimit': 'list', 'stop-timeout': 'str', 'log-driver': 'str', 'log-opt': 'list', 'gpus': 'str', 'device': 'list', 'ipc': 'str', 'pid': 'str', 'sig-proxy': 'bool', 'a|attach': 'list'
  };

  function dur(s) { if (s == null) return null; const m = String(s).match(/^([\d.]+)(ms|s|m|h)?$/); if (!m) return null; return +m[1] * ({ ms: 0.001, s: 1, m: 60, h: 3600 }[m[2] || 's']); }
  function parsePort(spec) {
    // [ip:][hostPort:]containerPort[/proto]
    let proto = 'tcp';
    let s = spec;
    const sl = s.indexOf('/'); if (sl >= 0) { proto = s.slice(sl + 1); s = s.slice(0, sl); }
    const parts = s.split(':');
    let hostIp = '0.0.0.0', hostPort = '', containerPort;
    if (parts.length === 1) containerPort = parts[0];
    else if (parts.length === 2) { hostPort = parts[0]; containerPort = parts[1]; }
    else { hostIp = parts[0]; hostPort = parts[1]; containerPort = parts[2]; }
    if (!/^\d+(-\d+)?$/.test(containerPort) || (hostPort && !/^\d+$/.test(hostPort))) throw new Error(`invalid containerPort: ${spec}`);
    return { hostIp, hostPort, containerPort, proto };
  }
  function parseVolume(spec, cwd) {
    // name:/path[:ro] · /host:/path · ./rel:/path · /path(익명)
    const parts = spec.split(':');
    // 윈도 경로 흉내 방지: 단순화
    if (parts.length === 1) return { type: 'volume', source: '', target: parts[0] };
    const [src, target, mode] = parts;
    if (!target || !target.startsWith('/')) throw new Error(`invalid volume specification: '${spec}'`);
    const ro = /(^|,)ro(,|$)/.test(mode || '');
    if (src.startsWith('/') || src.startsWith('.') || src.startsWith('~')) return { type: 'bind', source: VFS.norm(src, cwd), target, ro };
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(src)) throw new Error(`create ${src}: "${src}" includes invalid characters for a local volume name, only "[a-zA-Z0-9][a-zA-Z0-9_.-]" are allowed. If you intended to pass a host directory, use absolute path`);
    return { type: 'volume', source: src, target, ro };
  }
  function parseMount(spec, cwd) {
    const o = {}; spec.split(',').forEach(kv => { const [k, v] = kv.split('='); o[k.trim()] = v == null ? true : v; });
    const type = o.type || 'volume';
    const target = o.target || o.destination || o.dst;
    const src = o.source || o.src || '';
    const ro = !!(o.readonly || o.ro);
    if (!target) throw new Error('invalid argument "' + spec + '" for "--mount" flag: target is required');
    if (type === 'bind') return { type, source: VFS.norm(src, cwd), target, ro };
    return { type, source: src, target, ro };
  }
  function restartPolicy(s) {
    if (!s) return { name: 'no', max: 0 };
    const [name, max] = s.split(':');
    if (!['no', 'always', 'unless-stopped', 'on-failure'].includes(name)) throw new Error(`invalid restart policy: ${s}`);
    return { name, max: max ? +max : 0 };
  }

  /** 옵션 → engine.create 인자 */
  function createArgs(D, o, pos, ctx) {
    const imgRef = pos[0];
    const cmd = pos.slice(1);
    const env = [];
    o['env-file'].forEach(f => {
      const s = Host.fs.read(VFS.norm(f, ctx.cwd));
      if (s == null) throw new Error(`open ${f}: no such file or directory`);
      s.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).forEach(l => env.push(l.includes('=') ? l : `${l}=${ctx.env[l] || ''}`));
    });
    o.env.forEach(e => env.push(e.includes('=') ? e : `${e}=${ctx.env[e] != null ? ctx.env[e] : ''}`));
    const mounts = o.volume.map(v => parseVolume(v, ctx.cwd)).concat(o.mount.map(m => parseMount(m, ctx.cwd)), o.tmpfs.map(t => ({ type: 'tmpfs', source: '', target: t.split(':')[0] })));
    for (const m of mounts) {
      if (m.type === 'bind' && !Host.fs.stat(m.source)) {
        if (o.mount.length && mounts.indexOf(m) >= o.volume.length) throw new Error(`invalid mount config for type "bind": bind source path does not exist: ${m.source}`);
        Host.fs.mkdir(m.source);   // -v 는 없으면 디렉터리를 만든다
      }
    }
    let health = null;
    if (o['no-healthcheck']) health = 'none';
    else if (o['health-cmd']) health = { test: ['CMD-SHELL', o['health-cmd']], interval: dur(o['health-interval']) || 30, timeout: dur(o['health-timeout']) || 30, retries: +(o['health-retries'] || 3), startPeriod: dur(o['health-start-period']) || 0 };
    const mem = o.memory ? U.parseSize(o.memory) : 0;
    if (o.memory && (isNaN(mem) || mem < 6 * 1024 * 1024)) throw new Error(isNaN(mem) ? `invalid argument "${o.memory}" for "-m, --memory" flag: invalid size: '${o.memory}'` : 'Minimum memory limit allowed is 6MB');
    const links = {};
    o.link.forEach(l => { const [n, al] = l.split(':'); links[al || n] = n; });
    const labels = {}; o.label.forEach(l => { const [k, v] = l.split('='); labels[k] = v || ''; });
    const net = o.network || 'bridge';
    return {
      image: imgRef, name: o.name, cmd: cmd.length ? cmd : null,
      entrypoint: o.entrypoint != null ? (o.entrypoint ? [o.entrypoint] : []) : null,
      env, ports: o.publish.map(parsePort), publishAll: o['publish-all'], mounts, network: net, aliases: o['network-alias'],
      restart: restartPolicy(o.restart), memory: mem, cpus: o.cpus ? +o.cpus : 0, rm: o.rm, tty: o.tty, interactive: o.interactive,
      workdir: o.workdir, user: o.user, hostname: o.hostname, labels, health, readonly: o['read-only'], init: o.init,
      capAdd: o['cap-add'], capDrop: o['cap-drop'], privileged: o.privileged, pidsLimit: o['pids-limit'] ? +o['pids-limit'] : 0, links
    };
  }

  /* ------------------------------------------------ 표시 도우미 --- */
  function statusText(D, c) {
    const s = c.state;
    if (s.status === 'running') {
      let t = 'Up ' + human(Date.now() - s.startedAt);
      if (c.health) t += c.health.status === 'starting' ? ' (health: starting)' : ` (${c.health.status})`;
      return t;
    }
    if (s.status === 'paused') return 'Up ' + human(Date.now() - s.startedAt) + ' (Paused)';
    if (s.status === 'restarting') return `Restarting (${s.exitCode}) ${human(Date.now() - (s.finishedAt || Date.now()))} ago`;
    if (s.status === 'exited') return `Exited (${s.exitCode}) ${human(Date.now() - (s.finishedAt || Date.now()))} ago`;
    if (s.status === 'created') return 'Created';
    if (s.status === 'dead') return 'Dead';
    return s.status;
  }
  function portsText(c, full) {
    const out = [];
    const running = ['running', 'paused', 'restarting'].includes(c.state.status);
    if (running || full) (c.hostConfig.ports || []).forEach(p => {
      if (p.hostIp === '0.0.0.0') { out.push(`0.0.0.0:${p.hostPort}->${p.containerPort}/${p.proto}`); out.push(`[::]:${p.hostPort}->${p.containerPort}/${p.proto}`); }
      else out.push(`${p.hostIp}:${p.hostPort}->${p.containerPort}/${p.proto}`);
    });
    const D = window.Docker && Docker.engine;
    const img = D && D.img(c);
    if (running) ((img && img.config.ExposedPorts) || []).forEach(ep => { if (!(c.hostConfig.ports || []).some(p => p.containerPort + '/' + p.proto === ep)) out.push(ep); });
    return out.join(', ');
  }
  function cmdText(c, trunc) {
    const a = (c.entrypoint || []).concat(c.cmd || []);
    const s = a.join(' ');
    const q = '"' + (trunc && s.length > 20 ? s.slice(0, 19) + '…' : s) + '"';
    return q;
  }
  function imageShort(D, c) { return c.image; }
  function repoTag(t) { const i = t.lastIndexOf(':'); return [t.slice(0, i), t.slice(i + 1)]; }

  /* go 템플릿 (--format) 아주 조금 */
  function goTpl(tpl, data) {
    tpl = tpl.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
    const toks = tpl.split(/(\{\{.*?\}\})/s);
    let out = '';
    const get = (path, ctx) => {
      path = path.trim();
      if (path === '.') return ctx;
      if (/^\.\w/.test(path) || path === '.') { let v = ctx; path.slice(1).split('.').forEach(k => { v = v == null ? undefined : v[k]; }); return v; }
      if (/^"(.*)"$/.test(path)) return path.slice(1, -1);
      return undefined;
    };
    const fmt = v => v === undefined ? '<no value>' : v === null ? '<nil>' : typeof v === 'object' ? (Array.isArray(v) ? '[' + v.map(fmt).join(' ') + ']' : 'map[' + Object.keys(v).map(k => k + ':' + fmt(v[k])).join(' ') + ']') : String(v);
    const run = (i, ctx, stopAtEnd) => {
      let s = '';
      while (i < toks.length) {
        const t = toks[i];
        const m = t.match(/^\{\{-?\s*(.*?)\s*-?\}\}$/s);
        if (!m) { s += t; i++; continue; }
        const a = m[1];
        if (a === 'end') return { s, i: i + 1 };
        if (/^range\s/.test(a)) {
          const coll = get(a.slice(6), ctx);
          let inner = { i: i + 1 };
          const items = coll == null ? [] : Array.isArray(coll) ? coll : Object.values(coll);
          if (!items.length) { inner = run(i + 1, {}, true); } // 건너뛰기
          items.forEach(it => { inner = run(i + 1, it, true); s += inner.s; });
          i = inner.i; continue;
        }
        if (/^json\s/.test(a)) { s += JSON.stringify(get(a.slice(5), ctx)); i++; continue; }
        if (/^index\s/.test(a)) { const mm = a.match(/^index\s+(\S+)\s+"([^"]*)"/); const v = mm ? (get(mm[1], ctx) || {})[mm[2]] : undefined; s += fmt(v); i++; continue; }
        if (/^println/.test(a)) { s += fmt(get(a.slice(8) || '.', ctx)) + '\n'; i++; continue; }
        if (/^(upper|lower)\s/.test(a)) { const v = fmt(get(a.split(/\s+/)[1], ctx)); s += a.startsWith('upper') ? v.toUpperCase() : v.toLowerCase(); i++; continue; }
        if (a === 'table') { i++; continue; }
        s += fmt(get(a, ctx)); i++;
      }
      return { s, i };
    };
    out = run(0, data).s;
    return out;
  }

  /* ------------------------------------------------ inspect 모양 --- */
  function inspectContainer(D, c) {
    const img = D.img(c);
    const ports = {};
    const exposed = {};
    ((img && img.config.ExposedPorts) || []).forEach(p => { exposed[p] = {}; });
    (c.hostConfig.ports || []).forEach(p => { const k = p.containerPort + '/' + p.proto; exposed[k] = {}; if (c.state.status === 'running') (ports[k] = ports[k] || []).push({ HostIp: p.hostIp, HostPort: p.hostPort }, ...(p.hostIp === '0.0.0.0' ? [{ HostIp: '::', HostPort: p.hostPort }] : [])); });
    Object.keys(exposed).forEach(k => { if (!(k in ports)) ports[k] = null; });
    const nets = {};
    Object.entries(c.networks).forEach(([n, v]) => {
      const net = D.network(n);
      nets[n] = { IPAMConfig: null, Links: null, Aliases: (v.aliases || []).length ? v.aliases : null, MacAddress: c.state.status === 'running' ? v.mac : '', DriverOpts: null, NetworkID: net ? net.id : '', EndpointID: c.state.status === 'running' ? U.hash(c.id + n) : '', Gateway: c.state.status === 'running' && net ? net.gateway : '', IPAddress: v.ip || '', IPPrefixLen: v.ip ? 16 : 0, DNSNames: n === 'bridge' || !v.ip ? null : [c.name, c.id.slice(0, 12)].concat(v.aliases || []) };
    });
    const bridge = c.networks.bridge;
    const argv = (c.entrypoint || []).concat(c.cmd || []);
    const mounts = (c.hostConfig.mounts || []).map(m => m.type === 'volume' ? { Type: 'volume', Name: m.source, Source: `/var/lib/docker/volumes/${m.source}/_data`, Destination: m.target, Driver: 'local', Mode: m.ro ? 'ro' : 'z', RW: !m.ro, Propagation: '' } : m.type === 'bind' ? { Type: 'bind', Source: m.source, Destination: m.target, Mode: m.ro ? 'ro' : '', RW: !m.ro, Propagation: 'rprivate' } : { Type: 'tmpfs', Source: '', Destination: m.target, Mode: '', RW: true, Propagation: '' });
    const o = {
      Id: c.id, Created: U.iso(c.created), Path: argv[0] || '', Args: argv.slice(1),
      State: { Status: c.state.status, Running: c.state.status === 'running' || c.state.status === 'paused', Paused: c.state.status === 'paused', Restarting: c.state.status === 'restarting', OOMKilled: !!c.state.oomKilled, Dead: false, Pid: c.state.pid, ExitCode: c.state.exitCode, Error: c.state.error || '', StartedAt: c.state.startedAt ? U.iso(c.state.startedAt) : '0001-01-01T00:00:00Z', FinishedAt: c.state.finishedAt ? U.iso(c.state.finishedAt) : '0001-01-01T00:00:00Z' },
      Image: 'sha256:' + c.imageId, ResolvConfPath: `/var/lib/docker/containers/${c.id}/resolv.conf`, HostnamePath: `/var/lib/docker/containers/${c.id}/hostname`, HostsPath: `/var/lib/docker/containers/${c.id}/hosts`, LogPath: `/var/lib/docker/containers/${c.id}/${c.id}-json.log`,
      Name: '/' + c.name, RestartCount: c.restartCount, Driver: 'overlayfs', Platform: 'linux',
      HostConfig: { Binds: (c.hostConfig.mounts || []).filter(m => m.type !== 'tmpfs' && !m.anonymous && !m.fromMount).map(m => `${m.source}:${m.target}${m.ro ? ':ro' : ''}`), NetworkMode: c.hostConfig.networkMode, PortBindings: Object.fromEntries((c.hostConfig.ports || []).map(p => [p.containerPort + '/' + p.proto, [{ HostIp: p.hostIp === '0.0.0.0' ? '' : p.hostIp, HostPort: p.hostPort }]])), RestartPolicy: { Name: c.hostConfig.restart.name, MaximumRetryCount: c.hostConfig.restart.max || 0 }, AutoRemove: c.hostConfig.autoRemove, Memory: c.hostConfig.memory, NanoCpus: Math.round((c.hostConfig.cpus || 0) * 1e9), ReadonlyRootfs: c.hostConfig.readonly, Privileged: c.hostConfig.privileged, CapAdd: c.hostConfig.capAdd.length ? c.hostConfig.capAdd : null, CapDrop: c.hostConfig.capDrop.length ? c.hostConfig.capDrop : null, Init: c.hostConfig.init || null, PidsLimit: c.hostConfig.pidsLimit || null },
      Mounts: mounts,
      Config: { Hostname: c.hostname, Domainname: '', User: c.user, AttachStdin: c.interactive, AttachStdout: true, AttachStderr: true, ExposedPorts: Object.keys(exposed).length ? exposed : undefined, Tty: c.tty, OpenStdin: c.interactive, StdinOnce: c.interactive, Env: c.env, Cmd: c.cmd && c.cmd.length ? c.cmd : null, Healthcheck: c.healthcheck ? { Test: c.healthcheck.test, Interval: (c.healthcheck.interval || 30) * 1e9, Retries: c.healthcheck.retries || 3 } : undefined, Image: c.image, Volumes: null, WorkingDir: c.workdir === '/' ? '' : c.workdir, Entrypoint: c.entrypoint, OnBuild: null, Labels: c.labels },
      NetworkSettings: { Bridge: '', SandboxID: c.state.status === 'running' ? U.hash('sb' + c.id) : '', SandboxKey: c.state.status === 'running' ? `/var/run/docker/netns/${U.hash('ns' + c.id, 12)}` : '', Ports: ports, Gateway: bridge && bridge.ip ? '172.17.0.1' : '', IPAddress: bridge && bridge.ip ? bridge.ip : '', IPPrefixLen: bridge && bridge.ip ? 16 : 0, MacAddress: bridge && bridge.ip ? bridge.mac : '', Networks: nets }
    };
    if (c.health) o.State.Health = { Status: c.health.status, FailingStreak: c.health.failingStreak, Log: (c.health.log || []).map(l => ({ Start: U.iso(l.start), End: U.iso(l.start + 30), ExitCode: l.code, Output: l.out })) };
    return o;
  }
  function inspectImage(D, img) {
    const cfg = img.config;
    return {
      Id: 'sha256:' + img.id, RepoTags: img.repoTags, RepoDigests: img.repoDigests || [], Parent: '', Comment: img.built ? 'buildkit.dockerfile.v0' : '', Created: U.iso(img.created), DockerVersion: '', Author: '',
      Config: { Hostname: '', Domainname: '', User: cfg.User || '', AttachStdin: false, AttachStdout: false, AttachStderr: false, ExposedPorts: cfg.ExposedPorts ? Object.fromEntries(cfg.ExposedPorts.map(p => [p, {}])) : undefined, Tty: false, OpenStdin: false, StdinOnce: false, Env: cfg.Env || [], Cmd: cfg.Cmd || null, Healthcheck: cfg.Healthcheck ? { Test: cfg.Healthcheck.test, Interval: (cfg.Healthcheck.interval || 30) * 1e9, Retries: cfg.Healthcheck.retries } : undefined, Image: '', Volumes: cfg.Volumes ? Object.fromEntries(cfg.Volumes.map(v => [v, {}])) : null, WorkingDir: cfg.WorkingDir || '', Entrypoint: cfg.Entrypoint || null, OnBuild: null, Labels: cfg.Labels || null, StopSignal: cfg.StopSignal },
      Architecture: img.arch || 'amd64', Os: 'linux', Size: Math.round(img.size),
      GraphDriver: { Data: null, Name: 'overlayfs' },
      RootFS: { Type: 'layers', Layers: img.layers.map(l => 'sha256:' + l.id) },
      Metadata: { LastTagTime: U.iso(img.pulledAt || img.created) }
    };
  }
  function inspectNetwork(D, net) {
    const cs = {};
    D.s.containers.forEach(c => { const v = c.networks[net.name]; if (v && c.state.status === 'running') cs[c.id] = { Name: c.name, EndpointID: U.hash(c.id + net.name), MacAddress: v.mac, IPv4Address: v.ip + '/16', IPv6Address: '' }; });
    return { Name: net.name, Id: net.id, Created: U.iso(net.created), Scope: 'local', Driver: net.driver, EnableIPv4: true, EnableIPv6: false, IPAM: { Driver: 'default', Options: null, Config: net.subnet ? [{ Subnet: net.subnet, Gateway: net.gateway }] : [] }, Internal: !!net.internal, Attachable: false, Ingress: false, ConfigFrom: { Network: '' }, ConfigOnly: false, Containers: cs, Options: net.name === 'bridge' ? { 'com.docker.network.bridge.default_bridge': 'true', 'com.docker.network.bridge.enable_icc': 'true', 'com.docker.network.bridge.name': 'docker0' } : {}, Labels: net.labels || {} };
  }
  function inspectVolume(D, v) { return { CreatedAt: U.iso(v.created).replace(/\.\d+Z$/, 'Z'), Driver: v.driver, Labels: Object.keys(v.labels || {}).length ? v.labels : null, Mountpoint: v.mountpoint, Name: v.name, Options: null, Scope: 'local' }; }
  function pj(o) { return JSON.stringify(o, null, 4); }

  /* ================================================================ 명령 구현 */
  const cmds = {};
  const E = msg => new Error(msg);

  cmds.version = async (ctx) => {
    ctx.out(`Client:
 Version:           27.4.0
 API version:       1.47
 Go version:        go1.22.10
 Git commit:        bde2b89
 Built:             Sat Dec  7 10:35:43 2024
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community (브라우저 시뮬레이터)
 Engine:
  Version:          27.4.0
  API version:      1.47 (minimum version 1.24)
  Go version:       go1.22.10
  OS/Arch:          linux/amd64
 containerd:
  Version:          1.7.24
 runc:
  Version:          1.2.2
 docker-init:
  Version:          0.19.0
`);
  };
  cmds.info = async (ctx) => {
    const D = ctx.D;
    const cs = D.s.containers;
    ctx.out(`Client: Docker Engine - Community
 Version:    27.4.0
 Context:    default
 Plugins:
  buildx: Docker Buildx (Docker Inc.)
    Version:  v0.19.2
  compose: Docker Compose (Docker Inc.)
    Version:  v2.31.0

Server:
 Containers: ${cs.length}
  Running: ${cs.filter(c => c.state.status === 'running').length}
  Paused: ${cs.filter(c => c.state.status === 'paused').length}
  Stopped: ${cs.filter(c => !['running', 'paused'].includes(c.state.status)).length}
 Images: ${D.s.images.length}
 Server Version: 27.4.0
 Storage Driver: overlayfs
 Logging Driver: json-file
 Cgroup Driver: systemd
 Cgroup Version: 2
 Plugins:
  Volume: local
  Network: bridge host ipvlan macvlan null overlay
 Swarm: inactive
 Runtimes: io.containerd.runc.v2 runc
 Default Runtime: runc
 Init Binary: docker-init
 Kernel Version: 6.10.14-linuxkit
 Operating System: Ubuntu 24.04.1 LTS (studyDocker 가상 머신)
 OSType: linux
 Architecture: x86_64
 CPUs: 8
 Total Memory: 7.657GiB
 Docker Root Dir: /var/lib/docker
 Registry: https://index.docker.io/v1/
 ${D.s.login ? `Username: ${D.s.login.user}\n ` : ''}Live Restore Enabled: false
`);
  };

  /* ---------- run / create ---------- */
  async function ensureImage(ctx, ref, pullPolicy) {
    const D = ctx.D;
    let img = D.findImage(ref);
    if (pullPolicy === 'always' || (!img && pullPolicy !== 'never')) {
      const got = await D.pull(ref, ctx.io, { implicit: !img });
      if (!got) return null;
      img = got;
    }
    if (!img) { ctx.err(`docker: Error response from daemon: No such image: ${Hub.resolve(ref).full}\n`); return null; }
    return img;
  }

  cmds.create = async (ctx, args) => {
    const { o, pos } = parseOpts(args, RUN_SPEC, 1);
    if (!pos.length) throw E('"docker create" requires at least 1 argument.\nSee \'docker create --help\'.\n\nUsage:  docker create [OPTIONS] IMAGE [COMMAND] [ARG...]\n\nCreate a new container');
    const img = await ensureImage(ctx, pos[0], o.pull);
    if (!img) return 125;
    const a = createArgs(ctx.D, o, pos, ctx);
    a.img = img; a.image = pos[0];
    const c = ctx.D.create(a);
    ctx.out(c.id + '\n');
    return 0;
  };

  cmds.run = async (ctx, args) => {
    const D = ctx.D;
    let parsed;
    try { parsed = parseOpts(args, RUN_SPEC, 1); }
    catch (e) { ctx.err(`${e.message}\nSee 'docker run --help'.\n`); return 125; }
    const { o, pos } = parsed;
    if (!pos.length) { ctx.err(`"docker run" requires at least 1 argument.\nSee 'docker run --help'.\n\nUsage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]\n\nCreate and run a new container from an image\n`); return 125; }
    if (/[A-Z]/.test(pos[0].split('/').pop().split(':')[0])) { ctx.err(`docker: invalid reference format: repository name (library/${pos[0]}) must be lowercase.\nSee 'docker run --help'.\n`); return 125; }
    if (o.detach && o.rm && false) {}
    const img = await ensureImage(ctx, pos[0], o.pull);
    if (!img) { ctx.err("See 'docker run --help'.\n"); return 125; }
    let a;
    try { a = createArgs(D, o, pos, ctx); } catch (e) { ctx.err(`docker: ${e.message}.\nSee 'docker run --help'.\n`); return 125; }
    a.img = img; a.image = pos[0];
    let c;
    try { c = D.create(a); } catch (e) { ctx.err(`docker: Error response from daemon: ${e.message}.\nSee 'docker run --help'.\n`); return 125; }
    try { await D.start(c); }
    catch (e) {
      ctx.err(`docker: Error response from daemon: ${e.message}.\n${/port is already allocated/.test(e.message) ? '' : ''}`);
      if (/executable file not found|no such file or directory|is a directory/.test(e.message)) ctx.err(`ERRO[0000] error waiting for container: context canceled\n`);
      if (c.hostConfig.autoRemove) D._remove(c);
      return /executable file not found|no such file/.test(e.message) ? 127 : 125;
    }
    if (o.detach) { ctx.out(c.id + '\n'); return 0; }
    return attachRun(ctx, c, o);
  };

  /** 포그라운드 실행: 로그를 보여 주거나 (-it) 셸에 붙는다 */
  async function attachRun(ctx, c, o) {
    const D = ctx.D;
    const p0 = D.proc[c.id];
    // -it 대화형
    if (o.interactive && p0) {
      for (let i = 0; i < 20 && !p0.tty && D.proc[c.id] === p0; i++) await U.sleep(25);
      if (p0.tty) {
        if (!ctx.io.session) { ctx.err('the input device is not a TTY\n'); await D.stop(c, 0); return 1; }
        if (p0.tty.kind !== 'shell') {
          const sh = Apps.shell(D, c, {});
          const f = Apps.CMDS[p0.tty.kind === 'node' ? 'node' : 'python'];
          await f({ args: [], sh, io: ctx.io, out: ctx.out, err: ctx.err, stdin: null });
          p0.tty.end(0); await U.sleep(60);
          return c.state.exitCode;
        }
        const exitP = new Promise(r => { const off = D.on('change', () => { if (D.proc[c.id] !== p0) { off(); r(); } }); if (D.proc[c.id] !== p0) r(); });
        await ctx.io.session(ttySession(D, c, p0), { detachable: true, until: exitP });
        if (D.proc[c.id] === p0) return 0;      // 분리(detach) 됨
        await U.sleep(60);
        return c.state.exitCode;
      }
    }
    // 로그 따라가기
    const shown = new Set();
    c.logs.forEach(l => { shown.add(l); (l.s === 'stderr' ? ctx.err : ctx.out)(l.m + '\n'); });
    let done;
    const finished = new Promise(r => { done = r; });
    const offLog = D.on('log', (cc, e) => { if (cc === c && !shown.has(e)) (e.s === 'stderr' ? ctx.err : ctx.out)(e.m + '\n'); });
    const check = () => { if (!['running', 'paused'].includes(c.state.status) || !D.s.containers.includes(c) && c.state.status !== 'running') done(); };
    const offCh = D.on('change', check);
    check();
    const onAbort = async () => {
      // Ctrl+C → 컨테이너에 신호 전달 (sig-proxy)
      if (c.state.status === 'running') { ctx.out('^C'); await D.stop(c, 10); }
      done();
    };
    if (ctx.io.signal) ctx.io.signal.addEventListener('abort', onAbort);
    await finished;
    offLog(); offCh();
    if (ctx.io.signal) ctx.io.signal.removeEventListener('abort', onAbort);
    await U.sleep(80);
    if (c.state.status === 'restarting') return c.state.exitCode;
    return c.state.exitCode;
  }

  /** 컨테이너 메인 셸에 붙는 세션 */
  function ttySession(D, c, p) {
    const t = p.tty;
    if (t.kind === 'shell') {
      return {
        prompt: () => t.sh.prompt,
        shell: t.sh,
        input: async (line, io) => {
          if (D.proc[c.id] !== p) return false;
          try { await t.sh.exec(line, io); }
          catch (e) { if (e instanceof Sh.ExitSignal) { io.out('exit\n'); t.end(e.code); return false; } throw e; }
          return D.proc[c.id] === p;
        },
        onCtrlD: () => { t.end(0); }
      };
    }
    return null;
  }

  /* ---------- start / stop / restart / kill / pause ---------- */
  cmds.start = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'a|attach': 'bool', 'i|interactive': 'bool' });
    if (!pos.length) { ctx.err('"docker start" requires at least 1 argument.\n'); return 1; }
    let code = 0;
    for (const k of pos) {
      const c = ctx.D.findContainer(k);
      if (!c) { ctx.err(`Error response from daemon: No such container: ${k}\n`); code = 1; continue; }
      try { await ctx.D.start(c); c.manualStop = false; }
      catch (e) { ctx.err(`Error response from daemon: ${e.message}\nError: failed to start containers: ${k}\n`); code = 1; continue; }
      if (o.attach || o.interactive) return attachRun(ctx, c, { interactive: o.interactive, tty: c.tty });
      ctx.out(k + '\n');
    }
    return code;
  };
  async function each(ctx, args, name, fn, spec) {
    const { o, pos } = parseOpts(args, spec || {});
    if (!pos.length) { ctx.err(`"docker ${name}" requires at least 1 argument.\nSee 'docker ${name} --help'.\n`); return 1; }
    let code = 0;
    for (const k of pos) {
      const c = ctx.D.findContainer(k);
      if (!c) { ctx.err(`Error response from daemon: No such container: ${k}\n`); code = 1; continue; }
      try { const r = await fn(c, o); if (r !== false) ctx.out(k + '\n'); }
      catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); code = 1; }
    }
    return code;
  }
  cmds.stop = (ctx, args) => each(ctx, args, 'stop', (c, o) => ctx.D.stop(c, o.time != null ? +o.time : (o.timeout != null ? +o.timeout : null)), { 't|time': 'str', 'timeout': 'str', 's|signal': 'str' });
  cmds.restart = (ctx, args) => each(ctx, args, 'restart', (c, o) => ctx.D.restart(c, o.time != null ? +o.time : null), { 't|time': 'str' });
  cmds.kill = (ctx, args) => each(ctx, args, 'kill', (c, o) => ctx.D.kill(c, o.signal), { 's|signal': 'str' });
  cmds.pause = (ctx, args) => each(ctx, args, 'pause', c => ctx.D.pause(c));
  cmds.unpause = (ctx, args) => each(ctx, args, 'unpause', c => ctx.D.unpause(c));
  cmds.wait = (ctx, args) => each(ctx, args, 'wait', async c => {
    if (['running', 'paused', 'restarting'].includes(c.state.status)) await new Promise(r => { const off = ctx.D.on('change', () => { if (c.state.status === 'exited' || !ctx.D.s.containers.includes(c)) { off(); r(); } }); if (ctx.io.signal) ctx.io.signal.addEventListener('abort', () => { off(); r(); }); });
    ctx.out(c.state.exitCode + '\n'); return false;
  });
  cmds.rm = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'f|force': 'bool', 'v|volumes': 'bool', 'l|link': 'bool' });
    if (!pos.length) { ctx.err('"docker rm" requires at least 1 argument.\nSee \'docker rm --help\'.\n\nUsage:  docker rm [OPTIONS] CONTAINER [CONTAINER...]\n\nRemove one or more containers\n'); return 1; }
    let code = 0;
    for (const k of pos) {
      const c = ctx.D.findContainer(k);
      if (!c) { if (!o.force) { ctx.err(`Error response from daemon: No such container: ${k}\n`); code = 1; } continue; }
      try { await ctx.D.remove(c, { force: o.force, volumes: o.volumes }); ctx.out(k + '\n'); }
      catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); code = 1; }
    }
    return code;
  };
  cmds.rename = async (ctx, args) => {
    const c = ctx.D.findContainer(args[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${args[0]}\n`); return 1; }
    const ex = ctx.D.findContainer(args[1]);
    if (ex && ex.name === args[1]) { ctx.err(`Error response from daemon: Error when allocating new name: Conflict. The container name "/${args[1]}" is already in use by container "${ex.id}". You have to remove (or rename) that container to be able to reuse that name.\n`); return 1; }
    c.name = args[1]; ctx.D.event('container', 'rename', c); ctx.D.changed('container'); return 0;
  };
  cmds.update = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'restart': 'str', 'm|memory': 'str', 'cpus': 'str', 'memory-swap': 'str' });
    let code = 0;
    for (const k of pos) {
      const c = ctx.D.findContainer(k);
      if (!c) { ctx.err(`Error response from daemon: No such container: ${k}\n`); code = 1; continue; }
      if (o.restart) c.hostConfig.restart = restartPolicy(o.restart);
      if (o.memory) c.hostConfig.memory = U.parseSize(o.memory);
      if (o.cpus) c.hostConfig.cpus = +o.cpus;
      ctx.D.changed('container'); ctx.out(k + '\n');
    }
    return code;
  };

  /* ---------- ps ---------- */
  cmds.ps = async (ctx, args) => {
    const { o } = parseOpts(args, { 'a|all': 'bool', 'q|quiet': 'bool', 'f|filter': 'list', 'format': 'str', 'no-trunc': 'bool', 'l|latest': 'bool', 'n|last': 'str', 's|size': 'bool' });
    let list = ctx.D.s.containers.slice().reverse();
    if (!o.all) list = list.filter(c => ['running', 'paused', 'restarting'].includes(c.state.status));
    o.filter.forEach(f => {
      const [k, v] = f.split('=');
      if (k === 'status') list = list.filter(c => c.state.status === v);
      else if (k === 'name') list = list.filter(c => c.name.includes(v));
      else if (k === 'ancestor') { const img = ctx.D.findImage(v); list = list.filter(c => c.image === v || (img && c.imageId === img.id)); }
      else if (k === 'label') { const [lk, lv] = v.split('='); list = list.filter(c => lk in c.labels && (lv == null || c.labels[lk] === lv)); }
      else if (k === 'exited') list = list.filter(c => c.state.status === 'exited' && c.state.exitCode === +v);
      else if (k === 'network') list = list.filter(c => c.networks[v]);
      else if (k === 'volume') list = list.filter(c => c.hostConfig.mounts.some(m => m.source === v || m.target === v));
      else if (k === 'health') list = list.filter(c => c.health && c.health.status === v);
      else if (k === 'id') list = list.filter(c => c.id.startsWith(v));
    });
    if (o.latest) list = list.slice(0, 1);
    if (o.last) list = list.slice(0, +o.last);
    if (o.quiet) { list.forEach(c => ctx.out((o['no-trunc'] ? c.id : c.id.slice(0, 12)) + '\n')); return 0; }
    const fields = c => ({ ID: o['no-trunc'] ? c.id : c.id.slice(0, 12), Image: imageShort(ctx.D, c), Command: o['no-trunc'] ? cmdText(c) : cmdText(c, true), CreatedAt: new Date(c.created).toISOString().replace('T', ' ').slice(0, 19) + ' +0000 UTC', RunningFor: human(Date.now() - c.created) + ' ago', Status: statusText(ctx.D, c), State: c.state.status, Ports: portsText(c), Names: c.name, Size: '0B', Labels: Object.entries(c.labels).map(([k, v]) => `${k}=${v}`).join(','), Networks: Object.keys(c.networks).join(','), Mounts: c.hostConfig.mounts.map(m => m.source).join(',') });
    if (o.format) {
      const f = o.format;
      if (f === 'json' || f === '{{json .}}') { list.forEach(c => ctx.out(JSON.stringify(fields(c)) + '\n')); return 0; }
      const isTable = /^table\b/.test(f);
      const tpl = f.replace(/^table\s*/, '');
      const lines = list.map(c => goTpl(tpl, fields(c)));
      if (isTable) {
        const head = goTpl(tpl, { ID: 'CONTAINER ID', Image: 'IMAGE', Command: 'COMMAND', CreatedAt: 'CREATED AT', RunningFor: 'CREATED', Status: 'STATUS', State: 'STATE', Ports: 'PORTS', Names: 'NAMES', Size: 'SIZE', Labels: 'LABELS', Networks: 'NETWORKS', Mounts: 'MOUNTS' });
        const rows = [head].concat(lines).map(l => l.split('\t'));
        ctx.out(table(rows) + '\n');
      } else lines.forEach(l => ctx.out(l + '\n'));
      return 0;
    }
    const rows = [['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES']];
    list.forEach(c => { const f = fields(c); rows.push([f.ID, f.Image, f.Command, f.RunningFor, f.Status, f.Ports, f.Names]); });
    ctx.out(table(rows) + '\n');
    return 0;
  };

  /* ---------- logs ---------- */
  cmds.logs = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'f|follow': 'bool', 't|timestamps': 'bool', 'n|tail': 'str', 'since': 'str', 'until': 'str', 'details': 'bool' });
    if (pos.length !== 1) { ctx.err('"docker logs" requires exactly 1 argument.\nSee \'docker logs --help\'.\n'); return 1; }
    const c = ctx.D.findContainer(pos[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${pos[0]}\n`); return 1; }
    const line = l => (l.s === 'stderr' ? ctx.err : ctx.out)((o.timestamps ? U.iso(l.t) + ' ' : '') + l.m + '\n');
    let logs = c.logs;
    if (o.since) { const s = dur(o.since); if (s != null) logs = logs.filter(l => l.t >= Date.now() - s * 1000); }
    if (o.tail != null && o.tail !== 'all') logs = logs.slice(Math.max(0, logs.length - +o.tail));
    logs.forEach(line);
    if (!o.follow) return 0;
    if (!['running', 'paused', 'restarting'].includes(c.state.status)) return 0;
    await new Promise(res => {
      const offL = ctx.D.on('log', (cc, e) => { if (cc === c) line(e); });
      const offC = ctx.D.on('change', () => { if (c.state.status === 'exited' && c.hostConfig.restart.name === 'no' || !ctx.D.s.containers.includes(c)) { offL(); offC(); res(); } });
      if (ctx.io.signal) ctx.io.signal.addEventListener('abort', () => { offL(); offC(); res(); });
    });
    return 0;
  };

  /* ---------- exec ---------- */
  cmds.exec = async (ctx, args) => {
    let parsed;
    try { parsed = parseOpts(args, { 'd|detach': 'bool', 'i|interactive': 'bool', 't|tty': 'bool', 'e|env': 'list', 'u|user': 'str', 'w|workdir': 'str', 'privileged': 'bool', 'env-file': 'list' }, 1); }
    catch (e) { ctx.err(`${e.message}\nSee 'docker exec --help'.\n`); return 125; }
    const { o, pos } = parsed;
    if (pos.length < 2) { ctx.err(`"docker exec" requires at least 2 arguments.\nSee 'docker exec --help'.\n\nUsage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]\n\nExecute a command in a running container\n`); return 1; }
    const D = ctx.D;
    const c = D.findContainer(pos[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${pos[0]}\n`); return 1; }
    if (c.state.status === 'paused') { ctx.err(`Error response from daemon: container ${c.id} is paused, unpause the container before exec\n`); return 1; }
    if (c.state.status !== 'running') { ctx.err(`Error response from daemon: container ${c.id} is not running\n`); return 1; }
    const argv = pos.slice(1);
    return execIn(ctx, c, argv, o);
  };
  async function execIn(ctx, c, argv, o) {
    const D = ctx.D;
    if (!Apps.exists(D, c, argv[0])) {
      ctx.err(`OCI runtime exec failed: exec failed: unable to start container process: exec: "${argv[0]}": ${argv[0].includes('/') ? `stat ${argv[0]}: no such file or directory` : 'executable file not found in $PATH'}: unknown\n`);
      return 127;
    }
    const env = {}; (o.env || []).forEach(e => { const i = e.indexOf('='); if (i > 0) env[e.slice(0, i)] = e.slice(i + 1); });
    const shName = ['bash', 'zsh'].includes(VFS.base(argv[0])) ? 'bash' : 'sh';
    const p = D.proc[c.id];
    const execs = [argv.join(' ')];
    const sh = Apps.shell(D, c, { name: shName, env, user: o.user ? (o.user === '0' ? 'root' : o.user) : undefined, workdir: o.workdir, execs });
    sh.interactive = !!o.interactive;
    const isShell = ['sh', 'bash', 'ash', 'zsh', 'dash'].includes(VFS.base(argv[0]));
    const running = () => D.proc[c.id] === p && c.state.status === 'running';
    if (isShell && argv.length === 1) {
      if (!o.interactive) return 0;
      if (!ctx.io.session) { ctx.err('the input device is not a TTY\n'); return 1; }
      const until = new Promise(r => { const off = D.on('change', () => { if (!running()) { off(); r(); } }); });
      let code = 0;
      await ctx.io.session({
        prompt: () => sh.prompt, shell: sh,
        input: async (line, io) => {
          if (!running()) return false;
          try { await sh.exec(line, io); } catch (e) { if (e instanceof Sh.ExitSignal) { io.out('exit\n'); code = e.code; return false; } throw e; }
          return running();
        }
      }, { until });
      return code;
    }
    if (o.detach) { sh.call(argv, { out: () => {}, err: () => {}, signal: null }, null); return 0; }
    const io = Object.assign({}, ctx.io, { session: o.interactive ? ctx.io.session : null, readline: o.interactive ? ctx.io.readline : null });
    try {
      if (isShell) return await sh.call(argv, io, null);
      return await sh.call(argv, io, null);
    } catch (e) { if (e instanceof Sh.ExitSignal) return e.code; throw e; }
  }
  cmds.attach = async (ctx, args) => {
    const c = ctx.D.findContainer(args.filter(a => !a.startsWith('-'))[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${args[0]}\n`); return 1; }
    if (c.state.status !== 'running') { ctx.err('You cannot attach to a stopped container, start it first\n'); return 1; }
    return attachRun(ctx, c, { interactive: c.interactive, tty: c.tty });
  };

  /* ---------- inspect ---------- */
  cmds.inspect = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'f|format': 'str', 'type': 'str', 's|size': 'bool' });
    const D = ctx.D;
    const outs = []; let code = 0;
    for (const k of pos) {
      let obj = null;
      const t = o.type;
      if ((!t || t === 'container') && D.findContainer(k)) obj = inspectContainer(D, D.findContainer(k));
      else if ((!t || t === 'image') && D.findImage(k)) obj = inspectImage(D, D.findImage(k));
      else if ((!t || t === 'network') && D.network(k)) obj = inspectNetwork(D, D.network(k));
      else if ((!t || t === 'volume') && D.volume(k)) obj = inspectVolume(D, D.volume(k));
      if (!obj) { ctx.err(`Error: No such object: ${k}\n`); code = 1; continue; }
      outs.push(obj);
    }
    if (o.format) outs.forEach(x => ctx.out(goTpl(o.format, x) + '\n'));
    else if (outs.length) ctx.out(pj(outs) + '\n');
    else if (!pos.length) { ctx.err('"docker inspect" requires at least 1 argument.\n'); return 1; }
    else ctx.out('[]\n');
    return code;
  };

  cmds.top = async (ctx, args) => {
    const c = ctx.D.findContainer(args[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${args[0]}\n`); return 1; }
    if (c.state.status !== 'running') { ctx.err(`Error response from daemon: container ${c.id} is not running\n`); return 1; }
    const { argv } = Apps.mainOf(ctx.D, c);
    const rows = [['UID', 'PID', 'PPID', 'C', 'STIME', 'TTY', 'TIME', 'CMD'], [c.user || 'root', c.state.pid, c.state.pid - 20, 0, new Date(c.state.startedAt).toTimeString().slice(0, 5), '?', '00:00:00', argv.join(' ')]];
    if (ctx.D.kind(c) === 'nginx') rows.push(['message+', c.state.pid + 51, c.state.pid, 0, new Date(c.state.startedAt).toTimeString().slice(0, 5), '?', '00:00:00', 'nginx: worker process']);
    ctx.out(table(rows) + '\n');
    return 0;
  };
  cmds.port = async (ctx, args) => {
    const c = ctx.D.findContainer(args[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${args[0]}\n`); return 1; }
    let ps = c.hostConfig.ports;
    if (args[1]) ps = ps.filter(p => p.containerPort === args[1].split('/')[0]);
    if (c.state.status !== 'running') ps = [];
    if (args[1] && !ps.length) { ctx.err(`Error: No public port '${args[1]}${args[1].includes('/') ? '' : '/tcp'}' published for ${args[0]}\n`); return 1; }
    ps.forEach(p => { if (p.hostIp === '0.0.0.0') ctx.out(`${args[1] ? '' : p.containerPort + '/' + p.proto + ' -> '}0.0.0.0:${p.hostPort}\n${args[1] ? '' : p.containerPort + '/' + p.proto + ' -> '}[::]:${p.hostPort}\n`); else ctx.out(`${args[1] ? '' : p.containerPort + '/' + p.proto + ' -> '}${p.hostIp}:${p.hostPort}\n`); });
    return 0;
  };
  cmds.diff = async (ctx, args) => {
    const c = ctx.D.findContainer(args[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${args[0]}\n`); return 1; }
    ctx.D.containerFS(c).diff().forEach(([k, p]) => ctx.out(`${k} ${p}\n`));
    return 0;
  };
  cmds.stats = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'a|all': 'bool', 'no-stream': 'bool', 'format': 'str', 'no-trunc': 'bool' });
    const D = ctx.D;
    const render = () => {
      let list = pos.length ? pos.map(k => D.findContainer(k)).filter(Boolean) : D.s.containers.filter(c => o.all || c.state.status === 'running');
      const rows = [['CONTAINER ID', 'NAME', 'CPU %', 'MEM USAGE / LIMIT', 'MEM %', 'NET I/O', 'BLOCK I/O', 'PIDS']];
      list.forEach(c => { const s = D.stats(c); rows.push([c.id.slice(0, 12), c.name, s.cpu.toFixed(2) + '%', `${U.size(s.mem, false)} / ${U.size(s.limit, false)}`, (100 * s.mem / s.limit).toFixed(2) + '%', `${U.size(s.netIn)} / ${U.size(s.netOut)}`, `${U.size(s.blockIn)} / ${U.size(s.blockOut)}`, s.pids]); });
      if (o.format) { const tpl = o.format.replace(/^table\s*/, ''); return list.map(c => { const s = D.stats(c); return goTpl(tpl, { Container: c.id.slice(0, 12), Name: c.name, ID: c.id.slice(0, 12), CPUPerc: s.cpu.toFixed(2) + '%', MemUsage: `${U.size(s.mem, false)} / ${U.size(s.limit, false)}`, MemPerc: (100 * s.mem / s.limit).toFixed(2) + '%', NetIO: `${U.size(s.netIn)} / ${U.size(s.netOut)}`, BlockIO: '0B / 0B', PIDs: s.pids }); }).join('\n'); }
      return table(rows);
    };
    for (const k of pos) if (!D.findContainer(k)) { ctx.err(`Error response from daemon: No such container: ${k}\n`); return 1; }
    if (o['no-stream'] || !ctx.io.live) { ctx.out(render() + '\n'); return 0; }
    const live = ctx.io.live(render());
    while (!(ctx.io.signal && ctx.io.signal.aborted)) {
      if (!(await U.sleep(1000, ctx.io.signal))) break;
      live.update(render());
    }
    live.done();
    return 0;
  };
  cmds.cp = async (ctx, args) => {
    const pos = args.filter(a => !a.startsWith('-'));
    if (pos.length !== 2) { ctx.err('"docker cp" requires exactly 2 arguments.\n'); return 1; }
    const D = ctx.D;
    const split = s => { const m = s.match(/^([a-zA-Z0-9][\w.-]*):(.*)$/); return m && !s.startsWith('/') && !s.startsWith('.') ? { c: m[1], p: m[2] } : null; };
    const src = split(pos[0]), dst = split(pos[1]);
    if (!src === !dst) { ctx.err('must specify at least one container source\n'); return 1; }
    const sfs = src ? D.findContainer(src.c) : null, dfs = dst ? D.findContainer(dst.c) : null;
    if (src && !sfs) { ctx.err(`Error response from daemon: No such container: ${src.c}\n`); return 1; }
    if (dst && !dfs) { ctx.err(`Error response from daemon: No such container: ${dst.c}\n`); return 1; }
    const from = src ? Apps.fsFor(D, sfs, 'root') : Host.fs, to = dst ? Apps.fsFor(D, dfs, 'root') : Host.fs;
    const sp = VFS.norm(src ? src.p : pos[0], src ? '/' : ctx.cwd);
    const dp0 = VFS.norm(dst ? dst.p : pos[1], dst ? (dfs.workdir || '/') : ctx.cwd);
    const st = from.stat(sp);
    if (!st) { ctx.err(src ? `Error response from daemon: Could not find the file ${src.p} in container ${src.c}\n` : `lstat ${sp}: no such file or directory\n`); return 1; }
    let bytes = 0;
    if (st === 'file') {
      const dp = to.stat(dp0) === 'dir' ? dp0 + '/' + VFS.base(sp) : dp0;
      if (!to.stat(VFS.parent(dp))) { ctx.err(`Error response from daemon: Could not find the file ${VFS.parent(dp)} in container\n`); return 1; }
      const data = from.read(sp); bytes = data.length; to.write(dp, data);
    } else {
      const dp = to.stat(dp0) === 'dir' ? dp0 + '/' + VFS.base(sp) : dp0;
      const all = from.walk(sp); to.mkdir(dp);
      Object.keys(all).forEach(k => { to.write(dp + '/' + k, all[k]); bytes += all[k].length; });
    }
    ctx.out(`Successfully copied ${U.size(Math.max(bytes, 512) + 1536)} to ${dst ? dst.c + ':' + dp0 : dp0}\n`);
    if (dfs) D.changed('container');
    if (window.Lab) Lab.refreshFiles();
    return 0;
  };
  cmds.commit = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'c|change': 'list', 'm|message': 'str', 'a|author': 'str', 'p|pause': 'bool' });
    const D = ctx.D;
    const c = D.findContainer(pos[0]);
    if (!c) { ctx.err(`Error response from daemon: No such container: ${pos[0]}\n`); return 1; }
    const base = D.img(c);
    const fs = base._fs ? base._fs.clone() : new VFS.FS(base.fs);
    const up = D.containerFS(c);
    Object.entries(c.upper.files || {}).forEach(([p, v]) => fs.write(p, v));
    (c.upper.dirs || []).forEach(d => { try { fs.mkdir(d); } catch (_) {} });
    (c.upper._wh || []).forEach(w => fs.rm(w, true));
    const addSize = Object.values(c.upper.files || {}).reduce((a, s) => a + s.length, 0) + (c.pkgs.length * 4.2e6);
    const cfg = JSON.parse(JSON.stringify(base.config));
    cfg.Env = c.env.slice();
    if (c.cmd && c.cmd.length) cfg.Cmd = c.cmd;
    o.change.forEach(ch => { const m = ch.match(/^(\w+)\s+(.*)$/); if (!m) return; const k = m[1].toUpperCase(); let v = m[2]; try { v = JSON.parse(v); } catch (_) { v = ['/bin/sh', '-c', v]; } if (k === 'CMD') cfg.Cmd = v; if (k === 'ENTRYPOINT') cfg.Entrypoint = v; if (k === 'ENV') cfg.Env.push(m[2].replace(/\s+/, '=')); if (k === 'EXPOSE') cfg.ExposedPorts = (cfg.ExposedPorts || []).concat(m[2].includes('/') ? m[2] : m[2] + '/tcp'); if (k === 'WORKDIR') cfg.WorkingDir = m[2]; });
    const id = U.hex(64);
    const img = { id, repoTags: [], repoDigests: [], created: Date.now(), size: base.size + addSize, os: base.os, osName: base.osName, kind: base.kind, layers: base.layers.concat([{ id: U.hash('commit' + id), size: addSize, created_by: o.message || '(commit)', created: Date.now() }]), history: (base.history || []).concat([]), config: cfg, fs: fs.toJSON(), pkgs: Array.from(new Set(base.pkgs.concat(c.pkgs))), arch: 'amd64', owned: base.owned };
    D.s.images.push(img);
    if (pos[1]) D.tagImage(id, pos[1]);
    ctx.out(`sha256:${id}\n`);
    D.changed('image');
    return 0;
  };

  /* ---------- 이미지 ---------- */
  cmds.images = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'a|all': 'bool', 'q|quiet': 'bool', 'f|filter': 'list', 'format': 'str', 'no-trunc': 'bool', 'digests': 'bool', 'tree': 'bool' });
    const D = ctx.D;
    let rows = [];
    D.s.images.slice().sort((a, b) => (b.pulledAt || b.created) - (a.pulledAt || a.created)).forEach(img => {
      const tags = img.repoTags.length ? img.repoTags : ['<none>:<none>'];
      tags.forEach(t => { const [r, tg] = repoTag(t); rows.push({ img, repo: r, tag: tg }); });
    });
    if (pos[0]) { const want = Hub.resolve(pos[0]); rows = rows.filter(r => r.repo === want.repo && (pos[0].includes(':') ? r.tag === want.tag : true)); }
    o.filter.forEach(f => { const [k, v] = f.split('='); if (k === 'dangling') rows = rows.filter(r => (r.repo === '<none>') === (v === 'true')); if (k === 'reference') rows = rows.filter(r => new RegExp('^' + v.replace(/\*/g, '.*') + '$').test(r.repo + ':' + r.tag) || new RegExp('^' + v.replace(/\*/g, '.*') + '$').test(r.repo)); if (k === 'before' || k === 'since') {} });
    if (o.quiet) { Array.from(new Set(rows.map(r => r.img.id))).forEach(id => ctx.out((o['no-trunc'] ? 'sha256:' + id : id.slice(0, 12)) + '\n')); return 0; }
    if (o.format) { const tpl = o.format.replace(/^table\s*/, ''); rows.forEach(r => ctx.out(goTpl(tpl, { Repository: r.repo, Tag: r.tag, ID: r.img.id.slice(0, 12), CreatedSince: human(Date.now() - r.img.created) + ' ago', CreatedAt: new Date(r.img.created).toISOString(), Size: size(r.img.size) }) + '\n')); return 0; }
    const t = [['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE']];
    rows.forEach(r => t.push([r.repo, r.tag, o['no-trunc'] ? 'sha256:' + r.img.id : r.img.id.slice(0, 12), human(Date.now() - r.img.created) + ' ago', size(r.img.size)]));
    ctx.out(table(t) + '\n');
    return 0;
  };
  cmds.pull = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'q|quiet': 'bool', 'a|all-tags': 'bool', 'platform': 'str' });
    if (!pos.length) { ctx.err('"docker pull" requires exactly 1 argument.\nSee \'docker pull --help\'.\n\nUsage:  docker pull [OPTIONS] NAME[:TAG|@DIGEST]\n\nDownload an image from a registry\n'); return 1; }
    if (/[A-Z]/.test(pos[0])) { ctx.err(`invalid reference format: repository name (library/${pos[0]}) must be lowercase\n`); return 1; }
    if (!pos[0].includes(':') && !pos[0].includes('@')) ctx.out('Using default tag: latest\n');
    const img = await ctx.D.pull(pos[0], ctx.io, { quiet: o.quiet });
    if (o.quiet && img) ctx.out(`docker.io/library/${Hub.resolve(pos[0]).full}\n`);
    return img ? 0 : 1;
  };
  cmds.rmi = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'f|force': 'bool', 'no-prune': 'bool' });
    if (!pos.length) { ctx.err('"docker rmi" requires at least 1 argument.\n'); return 1; }
    let code = 0;
    for (const k of pos) {
      try { ctx.D.removeImage(k, o.force).forEach(l => ctx.out(l + '\n')); }
      catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); code = 1; }
    }
    return code;
  };
  cmds.tag = async (ctx, args) => {
    if (args.length !== 2) { ctx.err('"docker tag" requires exactly 2 arguments.\nSee \'docker tag --help\'.\n\nUsage:  docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]\n'); return 1; }
    if (/[A-Z]/.test(args[1])) { ctx.err(`Error parsing reference: "${args[1]}" is not a valid repository/tag: invalid reference format: repository name must be lowercase\n`); return 1; }
    try { ctx.D.tagImage(args[0], args[1]); } catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
    return 0;
  };
  cmds.history = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'no-trunc': 'bool', 'H|human': 'bool', 'q|quiet': 'bool', 'format': 'str' });
    const img = ctx.D.findImage(pos[0]);
    if (!img) { ctx.err(`Error response from daemon: No such image: ${pos[0]}\n`); return 1; }
    const entries = [];
    // 오래된 것부터 쌓고 뒤집기
    img.layers.forEach(l => entries.push({ id: '<missing>', created: l.created || img.created, by: l.created_by, size: l.size, comment: l.comment || (img.built && l.built ? 'buildkit.dockerfile.v0' : '') }));
    (img.history || []).forEach(h => entries.push({ id: '<missing>', created: h.created || img.created, by: h.created_by, size: 0, comment: h.comment || '' }));
    if (img.built && img.stepOrder) { entries.length = 0; img.layers.filter(l => !l.built).forEach(l => entries.push({ id: '<missing>', created: l.created || img.created, by: l.created_by, size: l.size, comment: '' })); (img.baseHistory || []).forEach(h => entries.push({ id: '<missing>', created: h.created || img.created, by: h.created_by, size: 0, comment: '' })); img.stepOrder.forEach(s => entries.push({ id: '<missing>', created: s.created, by: s.by, size: s.size, comment: s.comment })); }
    entries.reverse();
    if (entries.length) entries[0].id = img.id.slice(0, 12);
    const t = [['IMAGE', 'CREATED', 'CREATED BY', 'SIZE', 'COMMENT']];
    entries.forEach(e => t.push([e.id, human(Date.now() - e.created) + ' ago', o['no-trunc'] ? e.by : (e.by.length > 45 ? e.by.slice(0, 44) + '…' : e.by), size(e.size), e.comment]));
    ctx.out(table(t) + '\n');
    return 0;
  };
  cmds.search = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'limit': 'str', 'f|filter': 'list', 'no-trunc': 'bool', 'format': 'str' });
    let r = Hub.search(pos[0] || '');
    if (o.filter.some(f => f === 'is-official=true')) r = r.filter(x => x.official);
    r = r.slice(0, +(o.limit || 25));
    const t = [['NAME', 'DESCRIPTION', 'STARS', 'OFFICIAL']];
    r.forEach(x => t.push([x.name, o['no-trunc'] ? x.desc : (x.desc.length > 45 ? x.desc.slice(0, 44) + '…' : x.desc), x.stars, x.official ? '[OK]' : '']));
    ctx.out(table(t) + '\n');
    return 0;
  };
  cmds.login = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'u|username': 'str', 'p|password': 'str', 'password-stdin': 'bool' });
    const server = pos[0] || 'docker.io';
    if (/^(localhost|127\.0\.0\.1)/.test(server)) { const r = ctx.D.registryAt(server); if (!r.ok) { ctx.err(`Error response from daemon: ${r.error}\n`); return 1; } ctx.out('Login Succeeded\n'); return 0; }
    let user = o.username;
    if (!user) {
      if (!ctx.io.readline) { ctx.err('Error: Cannot perform an interactive login from a non TTY device\n'); return 1; }
      ctx.out(`\nLog in with your Docker ID or email address to push and pull images from Docker Hub. If you don't have a Docker ID, head over to https://hub.docker.com/ to create one.\n(시뮬레이터: 실제 계정 정보를 넣지 마세요. 아무 이름이나 입력하면 됩니다)\n\n`);
      user = (await ctx.io.readline('Username: ')).trim();
    }
    let pw = o.password;
    if (o['password-stdin']) pw = (ctx.stdin || '').trim();
    if (pw == null && ctx.io.readline) pw = await ctx.io.readline('Password: ', { secret: true });
    if (!user || !pw) { ctx.err('Error: Non-null Username Required\n'); return 1; }
    if (o.password) ctx.err('WARNING! Using --password via the CLI is insecure. Use --password-stdin.\n');
    ctx.D.s.login = { user: user.toLowerCase(), server };
    ctx.D.changed('login');
    ctx.out(`\nWARNING! Your password will be stored unencrypted in /home/student/.docker/config.json.\nConfigure a credential helper to remove this warning. See\nhttps://docs.docker.com/engine/reference/commandline/login/#credential-stores\n\nLogin Succeeded\n`);
    return 0;
  };
  cmds.logout = async (ctx) => { ctx.D.s.login = null; ctx.D.changed('login'); ctx.out('Removing login credentials for https://index.docker.io/v1/\n'); return 0; };
  cmds.push = async (ctx, args) => {
    const pos = args.filter(a => !a.startsWith('-'));
    const D = ctx.D;
    const ref = pos[0];
    if (!ref) { ctx.err('"docker push" requires exactly 1 argument.\n'); return 1; }
    const r = Hub.resolve(ref);
    const key = r.repo + ':' + r.tag;
    const img = D.findImage(key);
    if (!img) { ctx.err(`An image does not exist locally with the tag: ${r.repo}\n`); return 1; }
    const regHost = /^[\w.-]+(:\d+)?\//.test(r.repo) && /[.:]|localhost/.test(r.repo.split('/')[0]) ? r.repo.split('/')[0] : null;
    ctx.out(`The push refers to repository [${regHost ? r.repo : 'docker.io/' + (r.repo.includes('/') ? r.repo : 'library/' + r.repo)}]\n`);
    if (regHost) {
      const reg = D.registryAt(regHost);
      if (!reg.ok) { ctx.err(`${reg.error}\n`); return 1; }
    } else {
      const ns = r.repo.includes('/') ? r.repo.split('/')[0] : null;
      if (!D.s.login || !ns || ns !== D.s.login.user) {
        const lines = img.layers.slice(-3).map(l => `${l.id.slice(0, 12)}: Preparing`);
        lines.forEach(l => ctx.out(l + '\n'));
        ctx.err(`denied: requested access to the resource is denied\n`);
        return 1;
      }
    }
    const h = ctx.io.progress ? ctx.io.progress(img.layers.slice().reverse().map(l => `${l.id.slice(0, 12)}: Preparing`)) : null;
    const layers = img.layers.slice().reverse();
    for (let step = 0; step < 3; step++) {
      await U.sleep(180, ctx.io.signal);
      layers.forEach((l, i) => { const base = !img.built || !l.built; const txt = step === 0 ? 'Waiting' : step === 1 ? (base && !regHost ? 'Mounted from library/' + ((img.baseRepo || 'alpine').split(':')[0]) : `Pushing [${'='.repeat(25)}>${' '.repeat(24)}]  ${U.size(l.size / 2)}/${U.size(l.size)}`) : (base && !regHost ? 'Mounted from library/' + ((img.baseRepo || 'alpine').split(':')[0]) : 'Pushed'); if (h) h.set(i, `${l.id.slice(0, 12)}: ${txt}`); });
    }
    if (h) h.done(); else layers.forEach(l => ctx.out(`${l.id.slice(0, 12)}: Pushed\n`));
    const dg = U.hash('push' + img.id);
    ctx.out(`${r.tag}: digest: sha256:${dg} size: ${1200 + layers.length * 210}\n`);
    const snap = JSON.parse(JSON.stringify(img)); snap.repoTags = [key];
    if (regHost) D.s.registry[key] = snap; else D.s.hubPushed[key] = snap;
    img.repoDigests = Array.from(new Set((img.repoDigests || []).concat([r.repo + '@sha256:' + dg])));
    D.event('image', 'push', img);
    D.changed('registry');
    return 0;
  };
  cmds.save = async (ctx, args) => {
    const { o, pos } = parseOpts(args, { 'o|output': 'str' });
    const imgs = pos.map(k => ctx.D.findImage(k));
    if (imgs.some(x => !x)) { ctx.err(`Error response from daemon: reference does not exist\n`); return 1; }
    if (!o.output) { ctx.err('cowardly refusing to save to a terminal. Use the -o flag or redirect\n'); return 1; }
    Host.fs.write(VFS.norm(o.output, ctx.cwd), 'DOCKER-SAVE ' + JSON.stringify(imgs.map(i => Object.assign({}, i, { refs: pos }))));
    if (window.Lab) Lab.refreshFiles();
    return 0;
  };
  cmds.load = async (ctx, args) => {
    const { o } = parseOpts(args, { 'i|input': 'str', 'q|quiet': 'bool' });
    const s = o.input ? Host.fs.read(VFS.norm(o.input, ctx.cwd)) : ctx.stdin;
    if (!s || !s.startsWith('DOCKER-SAVE ')) { ctx.err('open: no such file or directory\n'); return 1; }
    const list = JSON.parse(s.slice(12));
    list.forEach(img => {
      const ex = ctx.D.s.images.find(i => i.id === img.id);
      delete img.refs;
      if (!ex) ctx.D.s.images.push(img);
      img.repoTags.forEach(t => ctx.out(`Loaded image: ${t}\n`));
    });
    ctx.D.changed('image');
    return 0;
  };

  /* ---------- 네트워크 ---------- */
  cmds.network = async (ctx, args) => {
    const D = ctx.D;
    const sub = args[0], rest = args.slice(1);
    if (sub === 'ls' || sub === 'list') {
      const { o } = parseOpts(rest, { 'q|quiet': 'bool', 'f|filter': 'list', 'format': 'str', 'no-trunc': 'bool' });
      let nets = D.s.networks.slice();
      o.filter.forEach(f => { const [k, v] = f.split('='); if (k === 'name') nets = nets.filter(n => n.name.includes(v)); if (k === 'driver') nets = nets.filter(n => n.driver === v); });
      if (o.quiet) { nets.forEach(n => ctx.out(n.id.slice(0, 12) + '\n')); return 0; }
      const t = [['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE']];
      nets.forEach(n => t.push([n.id.slice(0, 12), n.name, n.driver, n.scope]));
      ctx.out(table(t) + '\n'); return 0;
    }
    if (sub === 'create') {
      const { o, pos } = parseOpts(rest, { 'd|driver': 'str', 'subnet': 'str', 'gateway': 'str', 'internal': 'bool', 'attachable': 'bool', 'label': 'list', 'ip-range': 'str', 'ipv6': 'bool', 'o|opt': 'list' });
      if (!pos[0]) { ctx.err('"docker network create" requires exactly 1 argument.\n'); return 1; }
      if (o.driver && !['bridge', 'overlay', 'macvlan', 'ipvlan'].includes(o.driver)) { ctx.err(`Error response from daemon: plugin "${o.driver}" not found\n`); return 1; }
      if (o.driver === 'overlay') { ctx.err('Error response from daemon: This node is not a swarm manager. Use "docker swarm init" or "docker swarm join" to connect this node to swarm and try again.\n'); return 1; }
      try { const n = D.createNetwork(pos[0], { driver: o.driver, subnet: o.subnet, internal: o.internal }); ctx.out(n.id + '\n'); } catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
      return 0;
    }
    if (sub === 'rm' || sub === 'remove') {
      let code = 0;
      rest.filter(a => !a.startsWith('-')).forEach(k => { try { D.removeNetwork(k); ctx.out(k + '\n'); } catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); code = 1; } });
      return code;
    }
    if (sub === 'inspect') {
      const { o, pos } = parseOpts(rest, { 'f|format': 'str', 'v|verbose': 'bool' });
      const outs = []; let code = 0;
      pos.forEach(k => { const n = D.network(k); if (!n) { ctx.err(`Error response from daemon: network ${k} not found\n`); code = 1; } else outs.push(inspectNetwork(D, n)); });
      if (o.format) outs.forEach(x => ctx.out(goTpl(o.format, x) + '\n')); else if (outs.length) ctx.out(pj(outs) + '\n');
      return code;
    }
    if (sub === 'connect' || sub === 'disconnect') {
      const { o, pos } = parseOpts(rest, { 'alias': 'list', 'ip': 'str', 'f|force': 'bool' });
      const c = D.findContainer(pos[1]);
      if (!D.network(pos[0])) { ctx.err(`Error response from daemon: network ${pos[0]} not found\n`); return 1; }
      if (!c) { ctx.err(`Error response from daemon: No such container: ${pos[1]}\n`); return 1; }
      try { sub === 'connect' ? D.connect(pos[0], c, { aliases: o.alias }) : D.disconnect(pos[0], c); } catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); return 1; }
      return 0;
    }
    if (sub === 'prune') {
      const { o } = parseOpts(rest, { 'f|force': 'bool', 'filter': 'list' });
      if (!o.force) { const a = ctx.io.readline ? await ctx.io.readline('WARNING! This will remove all custom networks not used by at least one container.\nAre you sure you want to continue? [y/N] ') : 'y'; if (!/^y/i.test(a)) return 0; }
      const del = D.s.networks.filter(n => !n.builtin && !D.s.containers.some(c => c.networks[n.name]));
      del.forEach(n => D.removeNetwork(n.name));
      if (del.length) ctx.out('Deleted Networks:\n' + del.map(n => n.name).join('\n') + '\n');
      return 0;
    }
    ctx.out(`Usage:  docker network COMMAND\n\nManage networks\n\nCommands:\n  connect     Connect a container to a network\n  create      Create a network\n  disconnect  Disconnect a container from a network\n  inspect     Display detailed information on one or more networks\n  ls          List networks\n  prune       Remove all unused networks\n  rm          Remove one or more networks\n`);
    return sub ? 1 : 0;
  };

  /* ---------- 볼륨 ---------- */
  cmds.volume = async (ctx, args) => {
    const D = ctx.D;
    const sub = args[0], rest = args.slice(1);
    if (sub === 'ls' || sub === 'list') {
      const { o } = parseOpts(rest, { 'q|quiet': 'bool', 'f|filter': 'list', 'format': 'str' });
      let vs = D.s.volumes.slice();
      o.filter.forEach(f => { const [k, v] = f.split('='); if (k === 'dangling') vs = vs.filter(x => !D.s.containers.some(c => c.hostConfig.mounts.some(m => m.source === x.name)) === (v === 'true')); if (k === 'name') vs = vs.filter(x => x.name.includes(v)); });
      if (o.quiet) { vs.forEach(v => ctx.out(v.name + '\n')); return 0; }
      const t = [['DRIVER', 'VOLUME NAME']]; vs.forEach(v => t.push([v.driver, v.name]));
      ctx.out(table(t, 4) + '\n'); return 0;
    }
    if (sub === 'create') {
      const { o, pos } = parseOpts(rest, { 'd|driver': 'str', 'label': 'list', 'o|opt': 'list', 'name': 'str' });
      const v = D.createVolume(pos[0] || o.name || null, { driver: o.driver });
      ctx.out(v.name + '\n'); return 0;
    }
    if (sub === 'rm' || sub === 'remove') {
      let code = 0;
      rest.filter(a => !a.startsWith('-')).forEach(k => { try { D.removeVolume(k); ctx.out(k + '\n'); } catch (e) { ctx.err(`Error response from daemon: ${e.message}\n`); code = 1; } });
      return code;
    }
    if (sub === 'inspect') {
      const { o, pos } = parseOpts(rest, { 'f|format': 'str' });
      const outs = []; let code = 0;
      pos.forEach(k => { const v = D.volume(k); if (!v) { ctx.err(`Error response from daemon: get ${k}: no such volume\n`); code = 1; } else outs.push(inspectVolume(D, v)); });
      if (o.format) outs.forEach(x => ctx.out(goTpl(o.format, x) + '\n')); else if (outs.length) ctx.out(pj(outs) + '\n');
      return code;
    }
    if (sub === 'prune') {
      const { o } = parseOpts(rest, { 'f|force': 'bool', 'a|all': 'bool', 'filter': 'list' });
      if (!o.force) { const a = ctx.io.readline ? await ctx.io.readline(`WARNING! This will remove ${o.all ? 'all local volumes not used by at least one container' : 'anonymous local volumes not used by at least one container'}.\nAre you sure you want to continue? [y/N] `) : 'y'; if (!/^y/i.test(a)) return 0; }
      const del = D.s.volumes.filter(v => (o.all || v.anonymous) && !D.s.containers.some(c => c.hostConfig.mounts.some(m => m.source === v.name)));
      let bytes = 0;
      del.forEach(v => { bytes += Object.values(v.fs.files || {}).reduce((a, s) => a + s.length, 0); D.s.volumes = D.s.volumes.filter(x => x !== v); });
      D.changed('volume');
      ctx.out((del.length ? 'Deleted Volumes:\n' + del.map(v => v.name).join('\n') + '\n\n' : '') + `Total reclaimed space: ${size(bytes)}\n`);
      return 0;
    }
    ctx.out(`Usage:  docker volume COMMAND\n\nManage volumes\n\nCommands:\n  create      Create a volume\n  inspect     Display detailed information on one or more volumes\n  ls          List volumes\n  prune       Remove unused local volumes\n  rm          Remove one or more volumes\n`);
    return sub ? 1 : 0;
  };

  /* ---------- 정리 · 시스템 ---------- */
  async function confirm(ctx, text) { if (!ctx.io.readline) return true; const a = await ctx.io.readline(text + '\nAre you sure you want to continue? [y/N] '); return /^y/i.test(a.trim()); }
  async function pruneContainers(ctx) {
    const D = ctx.D;
    const del = D.s.containers.filter(c => ['exited', 'created', 'dead'].includes(c.state.status));
    for (const c of del) await D.remove(c, {});
    return del;
  }
  function pruneImages(D, all) {
    const used = new Set(D.s.containers.map(c => c.imageId));
    const del = D.s.images.filter(i => !used.has(i.id) && (all || !i.repoTags.length));
    let bytes = 0;
    const deleted = [];
    del.forEach(i => { bytes += i.size; D.s.images = D.s.images.filter(x => x !== i); i.repoTags.forEach(t => deleted.push('untagged: ' + t)); deleted.push('deleted: sha256:' + i.id); });
    D.changed('image');
    return { deleted, bytes };
  }
  cmds.container = async (ctx, args) => {
    const sub = args[0];
    const map = { ls: 'ps', list: 'ps', ps: 'ps', run: 'run', create: 'create', start: 'start', stop: 'stop', restart: 'restart', rm: 'rm', remove: 'rm', kill: 'kill', logs: 'logs', exec: 'exec', inspect: 'inspect', top: 'top', port: 'port', stats: 'stats', cp: 'cp', diff: 'diff', commit: 'commit', pause: 'pause', unpause: 'unpause', rename: 'rename', update: 'update', wait: 'wait', attach: 'attach' };
    if (sub === 'prune') {
      const { o } = parseOpts(args.slice(1), { 'f|force': 'bool', 'filter': 'list' });
      if (!o.force && !(await confirm(ctx, 'WARNING! This will remove all stopped containers.'))) return 0;
      const del = await pruneContainers(ctx);
      ctx.out((del.length ? 'Deleted Containers:\n' + del.map(c => c.id).join('\n') + '\n\n' : '') + `Total reclaimed space: ${size(del.length * 1200)}\n`);
      return 0;
    }
    if (map[sub]) return cmds[map[sub]](ctx, args.slice(1));
    ctx.out('Usage:  docker container COMMAND\n\nManage containers\n'); return sub ? 1 : 0;
  };
  cmds.image = async (ctx, args) => {
    const sub = args[0];
    const map = { ls: 'images', list: 'images', pull: 'pull', push: 'push', rm: 'rmi', remove: 'rmi', tag: 'tag', history: 'history', save: 'save', load: 'load', build: 'build' };
    if (sub === 'inspect') return cmds.inspect(ctx, ['--type', 'image'].concat(args.slice(1)));
    if (sub === 'prune') {
      const { o } = parseOpts(args.slice(1), { 'f|force': 'bool', 'a|all': 'bool', 'filter': 'list' });
      if (!o.force && !(await confirm(ctx, o.all ? 'WARNING! This will remove all images without at least one container associated to them.' : 'WARNING! This will remove all dangling images.'))) return 0;
      const r = pruneImages(ctx.D, o.all);
      ctx.out((r.deleted.length ? 'Deleted Images:\n' + r.deleted.join('\n') + '\n\n' : '') + `Total reclaimed space: ${size(r.bytes)}\n`);
      return 0;
    }
    if (map[sub]) return cmds[map[sub]](ctx, args.slice(1));
    ctx.out('Usage:  docker image COMMAND\n\nManage images\n'); return sub ? 1 : 0;
  };
  cmds.system = async (ctx, args) => {
    const D = ctx.D;
    const sub = args[0];
    if (sub === 'df') {
      const u = D.diskUsage();
      const { o } = parseOpts(args.slice(1), { 'v|verbose': 'bool', 'format': 'str' });
      const pct = (a, b) => b ? ` (${Math.round(100 * a / b)}%)` : '';
      ctx.out(table([['TYPE', 'TOTAL', 'ACTIVE', 'SIZE', 'RECLAIMABLE'],
        ['Images', u.images.total, u.images.active, size(u.images.size), size(u.images.reclaim) + pct(u.images.reclaim, u.images.size)],
        ['Containers', u.containers.total, u.containers.active, size(u.containers.size), size(u.containers.reclaim) + pct(u.containers.reclaim, u.containers.size)],
        ['Local Volumes', u.volumes.total, u.volumes.active, size(u.volumes.size), size(u.volumes.reclaim) + pct(u.volumes.reclaim, u.volumes.size)],
        ['Build Cache', u.cache.total, u.cache.active, size(u.cache.size), size(u.cache.reclaim)]]) + '\n');
      if (o.verbose) {
        ctx.out('\nImages space usage:\n\n' + table([['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE', 'SHARED SIZE', 'UNIQUE SIZE', 'CONTAINERS']].concat(D.s.images.map(i => { const [r, t] = repoTag(i.repoTags[0] || '<none>:<none>'); return [r, t, i.id.slice(0, 12), human(Date.now() - i.created) + ' ago', size(i.size), size(i.layers[0] ? i.layers[0].size : 0), size(i.size - (i.layers[0] ? i.layers[0].size : 0)), D.s.containers.filter(c => c.imageId === i.id).length]; }))) + '\n');
        ctx.out('\nLocal Volumes space usage:\n\n' + table([['VOLUME NAME', 'LINKS', 'SIZE']].concat(D.s.volumes.map(v => [v.name, D.s.containers.filter(c => c.hostConfig.mounts.some(m => m.source === v.name)).length, size(u.vSize(v))]))) + '\n');
      }
      return 0;
    }
    if (sub === 'prune') {
      const { o } = parseOpts(args.slice(1), { 'f|force': 'bool', 'a|all': 'bool', 'volumes': 'bool', 'filter': 'list' });
      const warn = `WARNING! This will remove:\n  - all stopped containers\n  - all networks not used by at least one container\n${o.volumes ? '  - all anonymous volumes not used by at least one container\n' : ''}  - ${o.all ? 'all images without at least one container associated to them' : 'all dangling images'}\n  - ${o.all ? 'all build cache' : 'unused build cache'}\n`;
      if (!o.force && !(await confirm(ctx, warn))) return 0;
      const dc = await pruneContainers(ctx);
      const dn = D.s.networks.filter(n => !n.builtin && !D.s.containers.some(c => c.networks[n.name]));
      dn.forEach(n => D.removeNetwork(n.name));
      let vbytes = 0; const dv = [];
      if (o.volumes) D.s.volumes.filter(v => v.anonymous && !D.s.containers.some(c => c.hostConfig.mounts.some(m => m.source === v.name))).forEach(v => { dv.push(v); D.s.volumes = D.s.volumes.filter(x => x !== v); });
      const ri = pruneImages(D, o.all);
      const cache = Object.values(D.s.buildCache).reduce((a, x) => a + (x.size || 0), 0);
      D.s.buildCache = {};
      D.changed('prune');
      let s = '';
      if (dc.length) s += 'Deleted Containers:\n' + dc.map(c => c.id).join('\n') + '\n\n';
      if (dn.length) s += 'Deleted Networks:\n' + dn.map(n => n.name).join('\n') + '\n\n';
      if (dv.length) s += 'Deleted Volumes:\n' + dv.map(v => v.name).join('\n') + '\n\n';
      if (ri.deleted.length) s += 'Deleted Images:\n' + ri.deleted.join('\n') + '\n\n';
      if (cache) s += 'Deleted build cache objects:\n' + U.hex(25) + '\n' + U.hex(25) + '\n\n';
      ctx.out(s + `Total reclaimed space: ${size(ri.bytes + cache + vbytes)}\n`);
      return 0;
    }
    if (sub === 'info') return cmds.info(ctx, []);
    if (sub === 'events') return cmds.events(ctx, args.slice(1));
    ctx.out('Usage:  docker system COMMAND\n\nManage Docker\n\nCommands:\n  df          Show docker disk usage\n  events      Get real time events from the server\n  info        Display system-wide information\n  prune       Remove unused data\n'); return sub ? 1 : 0;
  };
  cmds.events = async (ctx, args) => {
    const { o } = parseOpts(args, { 'since': 'str', 'until': 'str', 'f|filter': 'list', 'format': 'str' });
    const fmt = e => `${new Date(e.t).toISOString().replace('Z', '000000+00:00').replace(/\.(\d{3})000000/, '.$1000000')} ${e.type} ${e.action} ${e.id ? (e.type === 'container' || e.type === 'image' ? e.id : e.id.slice(0, 12)) : ''}${e.name ? ` (name=${e.name})` : ''}`;
    const ok = e => o.filter.every(f => { const [k, v] = f.split('='); return k === 'type' ? e.type === v : k === 'event' ? e.action === v : k === 'container' ? e.name === v : true; });
    if (o.since) { const s = dur(o.since); ctx.D.s.events.filter(e => e.t >= Date.now() - (s || 600) * 1000).filter(ok).forEach(e => ctx.out(fmt(e) + '\n')); }
    if (o.until) return 0;
    await new Promise(res => {
      const off = ctx.D.on('event', e => { if (ok(e)) ctx.out(fmt(e) + '\n'); });
      if (ctx.io.signal) ctx.io.signal.addEventListener('abort', () => { off(); res(); });
    });
    return 0;
  };

  /* ---------- 보안 · 기타 ---------- */
  cmds.scout = async (ctx, args) => {
    const sub = args[0]; const ref = args.filter(a => !a.startsWith('-'))[1];
    const D = ctx.D;
    const img = ref ? D.findImage(ref) : null;
    if (!['quickview', 'cves', 'recommendations', 'version'].includes(sub)) { ctx.out('Usage:  docker scout COMMAND\n\nCommand line tool for Docker Scout\n\nCommands:\n  cves             Display CVEs identified in a software artifact\n  quickview        Quick overview of an image\n  recommendations  Display available base image updates and remediation recommendations\n'); return sub ? 1 : 0; }
    if (sub === 'version') { ctx.out('version: v1.15.1 (go1.23.3 - linux/amd64)\n'); return 0; }
    if (!img) { ctx.err(`    ✗ image not found: ${ref || '(이미지 이름을 적어 주세요)'}\n`); return 1; }
    const key = img.baseRepo || img.repoTags[0] || '';
    const b = CVE_OF(img, key);
    await U.sleep(400, ctx.io.signal);
    ctx.out(`    ✓ Image stored for indexing\n    ✓ Indexed ${120 + (img.pkgs || []).length * 7} packages\n    ✓ Provenance obtained from attestation\n\n`);
    if (sub === 'quickview') {
      ctx.out(`  i Quickview\n\n  Target               │  ${U.pad(img.repoTags[0] || img.id.slice(0, 12), 22)} │  ${b.C}C  ${String(b.H).padStart(2)}H  ${String(b.M).padStart(2)}M  ${String(b.L).padStart(3)}L\n    digest             │  ${img.id.slice(0, 12)}              │\n  Base image           │  ${U.pad(b.base, 22)} │  ${b.C}C  ${String(b.H).padStart(2)}H  ${String(b.M).padStart(2)}M  ${String(b.L).padStart(3)}L\n  Updated base image   │  ${U.pad(b.newer, 22)} │  0C   0H   ${Math.min(2, b.M)}M   ${Math.min(10, b.L)}L\n                       │                         │  ${b.C ? '-' + b.C : '0'}   ${b.H ? '-' + b.H : '0'}  ${b.M > 2 ? '-' + (b.M - 2) : '0'}  ${b.L > 10 ? '-' + (b.L - 10) : '0'}\n\nWhat's next:\n    View vulnerabilities → docker scout cves ${ref}\n    View base image update recommendations → docker scout recommendations ${ref}\n`);
    } else if (sub === 'cves') {
      ctx.out(`## Overview\n\n                    │   Analyzed Image\n────────────────────┼──────────────────────────────\n  Target            │  ${img.repoTags[0] || img.id.slice(0, 12)}\n    vulnerabilities │    ${b.C}C    ${b.H}H    ${b.M}M    ${b.L}L\n\n## Packages and Vulnerabilities\n\n`);
      const sample = [['openssl 3.0.11-1~deb12u1', 'CVE-2024-5535', 'CRITICAL', '3.0.14-1~deb12u1'], ['zlib 1:1.2.13.dfsg-1', 'CVE-2023-45853', 'CRITICAL', 'not fixed'], ['curl 7.88.1-10+deb12u5', 'CVE-2024-2398', 'HIGH', '7.88.1-10+deb12u6'], ['glibc 2.36-9+deb12u3', 'CVE-2024-2961', 'HIGH', '2.36-9+deb12u7'], ['libxml2 2.9.14+dfsg-1.3', 'CVE-2024-25062', 'MEDIUM', '2.9.14+dfsg-1.3~deb12u1']];
      let shown = 0;
      sample.forEach(s => { const sev = s[2][0]; if ((sev === 'C' && b.C) || (sev === 'H' && b.H) || (sev === 'M' && b.M)) { ctx.out(`   ${sev === 'C' ? b.C : sev === 'H' ? b.H : b.M}C ${s[0]}\n\n    ✗ ${s[2]} ${s[1]}\n      Fixed version : ${s[3]}\n\n`); shown++; } });
      if (!shown) ctx.out('  No vulnerable package detected\n\n');
      ctx.out(`${b.C + b.H + b.M + b.L} vulnerabilities found in ${Math.max(1, shown * 3)} packages\n  CRITICAL  ${b.C}\n  HIGH      ${b.H}\n  MEDIUM    ${b.M}\n  LOW       ${b.L}\n`);
    } else {
      ctx.out(`  Recommended fixes for image ${img.repoTags[0]}\n\n  Base image is  ${b.base}\n\n  ↑ Update base image\n  The base image is also available under the supported tag(s) ${b.newer}. If you want to display recommendations specifically for this tag, please re-run the command using this tag.\n\n  Tag                 │ Details                    │ Pushed  │ Vulnerabilities\n  ${U.pad(b.newer, 20)}│ Benefits:                  │ 2 days  │   0C   0H   ${Math.min(2, b.M)}M   ${Math.min(10, b.L)}L\n                      │ • Same OS detected         │         │\n                      │ • Image is smaller         │         │\n`);
    }
    return 0;
  };
  function CVE_OF(img, key) {
    const k = Object.keys(Hub.CVES).find(x => key === x || (img.baseRepo || '') === x);
    let b = k ? Hub.CVES[k] : null;
    const os = img.os;
    if (!b) b = os === 'alpine' || os === 'busybox' ? { C: 0, H: 0, M: 1, L: 0 } : os === 'distroless' || os === 'scratch' ? { C: 0, H: 0, M: 0, L: 0 } : os === 'debian-slim' ? { C: 0, H: 1, M: 4, L: 22 } : { C: 1, H: 5, M: 12, L: 104 };
    const repo = (key.split(':')[0] || 'image');
    return Object.assign({ base: (img.baseRepo || repo + ':latest'), newer: (repo === 'nginx' ? 'nginx:1.27-alpine' : repo === 'python' ? 'python:3.12-slim' : repo === 'node' ? 'node:22-alpine' : repo + ':latest') }, b);
  }
  cmds.context = async (ctx, args) => { if (args[0] === 'ls') { ctx.out(table([['NAME', 'DESCRIPTION', 'DOCKER ENDPOINT', 'ERROR'], ['default *', 'Current DOCKER_HOST based configuration', 'unix:///var/run/docker.sock', '']]) + '\n'); return 0; } ctx.out('Usage:  docker context COMMAND\n'); return 0; };
  cmds.buildx = async (ctx, args) => {
    if (args[0] === 'ls') { ctx.out(table([['NAME/NODE', 'DRIVER/ENDPOINT', 'STATUS', 'BUILDKIT', 'PLATFORMS'], ['default*', 'docker', '', '', ''], [' \\_ default', ' \\_ default', 'running', 'v0.17.3', 'linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/arm64, linux/riscv64, linux/ppc64le, linux/s390x, linux/386, linux/arm/v7, linux/arm/v6']]) + '\n'); return 0; }
    if (args[0] === 'build') return cmds.build(ctx, args.slice(1));
    if (args[0] === 'version') { ctx.out('github.com/docker/buildx v0.19.2 1fc5647\n'); return 0; }
    if (args[0] === 'create') { ctx.out((args.find(a => a.startsWith('--name=')) || '--name=builder').slice(7) + '\n'); return 0; }
    if (args[0] === 'use' || args[0] === 'inspect') return 0;
    ctx.out('Usage:  docker buildx [OPTIONS] COMMAND\n\nExtended build capabilities with BuildKit\n'); return 0;
  };
  cmds.init = async (ctx) => {
    ctx.out(`\nWelcome to the Docker Init CLI!\n\nThis utility will walk you through creating the following files with sensible defaults for your project:\n  - .dockerignore\n  - Dockerfile\n  - compose.yaml\n  - README.Docker.md\n\n`);
    const fs = Host.fs;
    const has = f => fs.stat(VFS.norm(f, ctx.cwd)) === 'file';
    const lang = has('requirements.txt') || has('app.py') ? 'python' : has('package.json') ? 'node' : has('go.mod') ? 'go' : null;
    if (!lang) { ctx.out('? What application platform does your project use?  Other\n\n(시뮬레이터) app.py / requirements.txt 또는 package.json 이 있는 폴더에서 실행해 보세요.\n'); return 0; }
    const files = {
      python: { Dockerfile: `# syntax=docker/dockerfile:1\n\nARG PYTHON_VERSION=3.12\nFROM python:\${PYTHON_VERSION}-slim AS base\n\nENV PYTHONDONTWRITEBYTECODE=1\nENV PYTHONUNBUFFERED=1\n\nWORKDIR /app\n\nARG UID=10001\nRUN adduser --disabled-password --gecos "" --home "/nonexistent" --shell "/sbin/nologin" --no-create-home --uid "\${UID}" appuser\n\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\nUSER appuser\n\nCOPY . .\n\nEXPOSE 8000\n\nCMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]\n`, 'compose.yaml': 'services:\n  server:\n    build:\n      context: .\n    ports:\n      - 8000:8000\n' },
      node: { Dockerfile: `# syntax=docker/dockerfile:1\n\nARG NODE_VERSION=22\nFROM node:\${NODE_VERSION}-alpine\n\nENV NODE_ENV=production\n\nWORKDIR /usr/src/app\n\nCOPY package*.json ./\nRUN npm ci --omit=dev\n\nUSER node\n\nCOPY . .\n\nEXPOSE 3000\n\nCMD ["node", "server.js"]\n`, 'compose.yaml': 'services:\n  server:\n    build:\n      context: .\n    environment:\n      NODE_ENV: production\n    ports:\n      - 3000:3000\n' },
      go: { Dockerfile: `# syntax=docker/dockerfile:1\n\nFROM golang:1.23-alpine AS build\nWORKDIR /src\nCOPY . .\nRUN go build -o /bin/server .\n\nFROM alpine:3.20 AS final\nCOPY --from=build /bin/server /bin/\nEXPOSE 8080\nENTRYPOINT [ "/bin/server" ]\n`, 'compose.yaml': 'services:\n  server:\n    build:\n      context: .\n    ports:\n      - 8080:8080\n' }
    }[lang];
    ctx.out(`? What application platform does your project use? ${lang === 'python' ? 'Python' : lang === 'node' ? 'Node' : 'Go'} (detected)\n\n`);
    Object.entries(files).forEach(([f, s]) => fs.write(VFS.norm(f, ctx.cwd), s));
    fs.write(VFS.norm('.dockerignore', ctx.cwd), '**/.git\n**/node_modules\n**/__pycache__\n**/.venv\n**/.env\n**/compose.y*ml\n**/Dockerfile*\nREADME.md\n');
    ctx.out(`✔ Created → .dockerignore\n✔ Created → Dockerfile\n✔ Created → compose.yaml\n\n→ Your Docker files are ready!\n  Take a moment to review them and tailor them to your application.\n\n  When you're ready, start your application by running: docker compose up --build\n`);
    if (window.Lab) Lab.refreshFiles();
    return 0;
  };
  cmds.swarm = async (ctx, args) => { ctx.out('(시뮬레이터) Docker Swarm 은 이 실습 환경에서 지원하지 않습니다. 오케스트레이션은 15장 쿠버네티스(kubectl) 실습을 이용하세요.\n'); return 1; };

  /* ================================================================ 진입점 */
  const TOP = `
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Authenticate to a registry
  logout      Log out from a registry
  search      Search Docker Hub for images
  version     Show the Docker version information
  info        Display system-wide information

Management Commands:
  builder     Manage builds
  buildx*     Docker Buildx
  compose*    Docker Compose
  container   Manage containers
  context     Manage contexts
  image       Manage images
  init*       Creates Docker-related starter files for your project
  network     Manage networks
  scout*      Docker Scout
  system      Manage Docker
  volume      Manage volumes

Commands:
  attach      Attach local standard input, output, and error streams to a running container
  commit      Create a new image from a container's changes
  cp          Copy files/folders between a container and the local filesystem
  create      Create a new container
  diff        Inspect changes to files or directories on a container's filesystem
  events      Get real time events from the server
  history     Show the history of an image
  inspect     Return low-level information on Docker objects
  kill        Kill one or more running containers
  load        Load an image from a tar archive or STDIN
  logs        Fetch the logs of a container
  pause       Pause all processes within one or more containers
  port        List port mappings or a specific mapping for the container
  rename      Rename a container
  restart     Restart one or more containers
  rm          Remove one or more containers
  rmi         Remove one or more images
  save        Save one or more images to a tar archive (streamed to STDOUT by default)
  start       Start one or more stopped containers
  stats       Display a live stream of container(s) resource usage statistics
  stop        Stop one or more running containers
  tag         Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE
  top         Display the running processes of a container
  unpause     Unpause all processes within one or more containers
  update      Update configuration of one or more containers
  wait        Block until one or more containers stop, then print their exit codes

Run 'docker COMMAND --help' for more information on a command.
`;
  const HELP = {
    run: 'Usage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]\n\nCreate and run a new container from an image\n\nAliases:\n  docker container run, docker run\n\nOptions:\n  -d, --detach              Run container in background and print container ID\n  -e, --env list            Set environment variables\n      --env-file list       Read in a file of environment variables\n  -i, --interactive         Keep STDIN open even if not attached\n  -m, --memory bytes        Memory limit\n      --cpus decimal        Number of CPUs\n      --name string         Assign a name to the container\n      --network network     Connect a container to a network\n  -p, --publish list        Publish a container\'s port(s) to the host\n  -P, --publish-all         Publish all exposed ports to random ports\n      --restart string      Restart policy to apply when a container exits (default "no")\n      --rm                  Automatically remove the container and its associated anonymous volumes when it exits\n  -t, --tty                 Allocate a pseudo-TTY\n  -u, --user string         Username or UID (format: "<name|uid>[:<group|gid>]")\n  -v, --volume list         Bind mount a volume\n      --mount mount         Attach a filesystem mount to the container\n  -w, --workdir string      Working directory inside the container\n      --health-cmd string   Command to run to check health\n      --read-only           Mount the container\'s root filesystem as read only\n      --entrypoint string   Overwrite the default ENTRYPOINT of the image\n',
    ps: 'Usage:  docker ps [OPTIONS]\n\nList containers\n\nOptions:\n  -a, --all             Show all containers (default shows just running)\n  -f, --filter filter   Filter output based on conditions provided\n      --format string   Format output using a custom template\n  -n, --last int        Show n last created containers (includes all states)\n  -l, --latest          Show the latest created container (includes all states)\n      --no-trunc        Don\'t truncate output\n  -q, --quiet           Only display container IDs\n',
    build: 'Usage:  docker buildx build [OPTIONS] PATH | URL | -\n\nStart a build\n\nOptions:\n      --build-arg stringArray   Set build-time variables\n  -f, --file string             Name of the Dockerfile (default: "PATH/Dockerfile")\n      --no-cache                Do not use cache when building the image\n      --platform stringArray    Set target platform for build\n      --progress string         Set type of progress output ("auto", "plain", "tty")\n  -t, --tag stringArray         Name and optionally a tag (format: "name:tag")\n      --target string           Set the target build stage to build\n',
    exec: 'Usage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]\n\nExecute a command in a running container\n\nOptions:\n  -d, --detach               Detached mode: run command in the background\n  -e, --env list             Set environment variables\n  -i, --interactive          Keep STDIN open even if not attached\n  -t, --tty                  Allocate a pseudo-TTY\n  -u, --user string          Username or UID (format: "<name|uid>[:<group|gid>]")\n  -w, --workdir string       Working directory inside the container\n',
    logs: 'Usage:  docker logs [OPTIONS] CONTAINER\n\nFetch the logs of a container\n\nOptions:\n  -f, --follow         Follow log output\n      --since string   Show logs since timestamp or relative (e.g. 42m for 42 minutes)\n  -n, --tail string    Number of lines to show from the end of the logs (default "all")\n  -t, --timestamps     Show timestamps\n'
  };

  async function docker(ctx) {
    const args = ctx.args.slice();
    // 전역 옵션
    while (args[0] && /^(-D|--debug|-l|--log-level|-H|--host|--context|-c)$/.test(args[0])) args.splice(0, /^(-D|--debug)$/.test(args[0]) ? 1 : 2);
    const sub = args.shift();
    if (!sub || sub === '--help' || sub === '-h' || sub === 'help') { ctx.out(TOP); return 0; }
    if (sub === '-v' || sub === '--version') { ctx.out('Docker version 27.4.0, build bde2b89\n'); return 0; }
    if (args.includes('--help') || args.includes('-h') && !['run', 'exec', 'create'].includes(sub)) { ctx.out((HELP[sub] || `Usage:  docker ${sub} [OPTIONS]\n\n(도움말 요약) 이 강좌의 해당 장 또는 docs.docker.com 을 참고하세요.\n`) + '\n'); return 0; }
    const D = ctx.D;
    if (!D.s.daemon.running) { ctx.err('Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\n'); return 1; }
    const alias = { ls: null, 'builder': null };
    let fn = cmds[sub];
    if (sub === 'build') fn = (c, a) => Builder.build(c, a);
    if (sub === 'builder') fn = async (c, a) => { if (a[0] === 'prune') { const { o } = parseOpts(a.slice(1), { 'f|force': 'bool', 'a|all': 'bool' }); if (!o.force && !(await confirm(c, 'WARNING! This will remove all dangling build cache.'))) return 0; const n = Object.values(D.s.buildCache).reduce((x, y) => x + (y.size || 0), 0); D.s.buildCache = {}; D.changed('cache'); c.out(`Total:\t${size(n)}\n`); return 0; } if (a[0] === 'build') return Builder.build(c, a.slice(1)); c.out('Usage:  docker builder COMMAND\n'); return 0; };
    if (sub === 'compose') fn = (c, a) => Compose.cli(c, a);
    if (!fn) {
      ctx.err(`docker: unknown command: docker ${sub}\n\nRun 'docker --help' for more information\n`);
      const g = U.closest(sub, Object.keys(cmds).concat(['build', 'compose']));
      if (g) ctx.err(`\n(힌트) 혹시 docker ${g} 를 입력하려던 건가요?\n`);
      return 1;
    }
    try {
      return await fn(Object.assign({}, ctx, { sub }), args);
    } catch (e) {
      if (e instanceof Sh.ExitSignal) throw e;
      if (/^unknown (shorthand )?flag|^flag needs/.test(e.message)) { ctx.err(`${e.message}\nSee 'docker ${sub} --help'.\n`); return 125; }
      console.error(e);
      ctx.err(`Error response from daemon: ${e.message}\n`);
      return 1;
    }
  }

  window.DockerCLI = { docker, cmds, parseOpts, parsePort, parseVolume, restartPolicy, statusText, portsText, cmdText, inspectContainer, goTpl, dur, execIn, attachRun, confirm, ensureImage };
})();
