/* ===================================================================
   컨테이너 안의 프로그램들
   - 메인 프로세스 실행 (nginx, redis, postgres, mysql, python, node, sh …)
   - 컨테이너 셸 명령 (ps, curl, ping, apt-get, redis-cli, psql …)
   - 대화형 세션 (docker run -it / docker exec -it)
   =================================================================== */
(function () {
  'use strict';
  const { norm, parent, base } = VFS;
  const WRAP = ['docker-entrypoint.sh', 'entrypoint.sh', '/docker-entrypoint.sh', '/entrypoint.sh', '/usr/local/bin/docker-entrypoint.sh', 'docker-php-entrypoint', 'tini', '/sbin/tini', '/usr/bin/tini', 'dumb-init', '/usr/bin/dumb-init', '/run.sh'];
  const SHELLS = ['sh', 'bash', 'ash', 'zsh', 'dash'];
  const MB = 1024 * 1024;
  const MEM = { nginx: 7 * MB, httpd: 26 * MB, redis: 4 * MB, postgres: 38 * MB, mysql: 390 * MB, mariadb: 95 * MB, mongo: 165 * MB, wordpress: 98 * MB, python: 34 * MB, node: 48 * MB, whoami: 3 * MB, registry: 12 * MB, shell: 0.8 * MB, java: 230 * MB, go: 7 * MB, web: 70 * MB, adminer: 20 * MB, hello: 0.2 * MB, stress: 1 * MB };

  function argvOf(c) { return (c.entrypoint || []).concat(c.cmd || []); }
  function strip(argv) {
    let a = argv.slice();
    while (a.length && WRAP.includes(a[0])) { a.shift(); if (a[0] === '--') a.shift(); }
    return a;
  }
  function exeName(a) { return base(a[0] || ''); }

  /** 실제로 무엇을 실행하는지 (래퍼 · 셸 형식 풀기) */
  function mainOf(engine, c) {
    const argv = strip(argvOf(c));
    return { argv, exe: exeName(argv) };
  }

  /* ------------------------------------------------ 실행 파일 확인 --- */
  const APP_EXES = { nginx: 'nginx', 'httpd-foreground': 'httpd', httpd: 'httpd', 'redis-server': 'redis', postgres: 'postgres', mysqld: 'mysql', mariadbd: 'mysql', mongod: 'mongo', 'apache2-foreground': 'wordpress', hello: 'hello', whoami: 'whoami', prometheus: 'web', portainer: 'web', 'grafana-server': 'web', 'config.yml': 'registry', registry: 'registry' };
  function exists(engine, c, name, fs) {
    const b = base(name);
    if (!name) return false;
    const img = engine.img(c);
    const osk = img ? img.os : 'debian';
    if (osk === 'scratch' || osk === 'distroless') {
      if (name.startsWith('/') || name.startsWith('./')) return !!(fs || engine.containerFS(c)).stat(norm(name, c.workdir));
      return !!(fs || engine.containerFS(c)).stat('/' + name) || !!(fs || engine.containerFS(c)).stat(norm(name, c.workdir));
    }
    if (name.includes('/')) {
      const f = fs || engine.containerFS(c);
      const p = norm(name, c.workdir);
      if (f.stat(p) === 'file') return true;
      // /bin/sh 같은 표준 위치
      if (/^\/(usr\/)?(local\/)?s?bin\//.test(p)) return exists(engine, c, b, fs);
      return false;
    }
    if (APP_EXES[b] && (img && (img.kind === APP_EXES[b] || (b === 'nginx' && engine.hasTool(c, 'nginx')) || (APP_EXES[b] === 'web' && img.kind === 'web')))) return true;
    if (b === 'php' && img && img.kind === 'adminer') return true;
    if (SHELLS.includes(b)) return engine.hasTool(c, b) || (b === 'sh' && osk !== 'scratch');
    if (Sh.core[b] && !['python', 'node'].includes(b)) return true;
    if (['flask'].includes(b)) return engine.hasPkg(c, 'py:flask');
    if (['gunicorn', 'uvicorn'].includes(b)) return engine.hasPkg(c, 'py:' + b);
    if (b === 'stress') return engine.hasTool(c, 'stress');
    if (engine.hasTool(c, b)) return true;
    if (['python', 'python3'].includes(b)) return engine.hasTool(c, 'python3') || engine.hasTool(c, 'python');
    if (CMDS[b] && CMDS[b].always) return true;
    // PATH 에서 찾기 (/usr/local/bin 등에 복사된 파일)
    const f = fs || engine.containerFS(c);
    return ['/usr/local/bin/', '/usr/bin/', '/bin/', '/usr/local/sbin/'].some(d => f.stat(d + b) === 'file');
  }
  function check(engine, c) {
    const { argv } = mainOf(engine, c);
    if (!argv.length) return { msg: 'failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: no command specified: unknown', code: 127 };
    const name = argv[0];
    if (!exists(engine, c, name)) {
      const f = engine.containerFS(c);
      if (name.includes('/') && f.stat(norm(name, c.workdir)) === 'dir') return { msg: `failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${name}": is a directory: unknown`, code: 126 };
      return { msg: `failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${name}": ${name.includes('/') ? 'stat ' + name + ': no such file or directory' : 'executable file not found in $PATH'}: unknown`, code: 127 };
    }
    // USER 가 passwd 에 있는지
    const u = (c.user || '').split(':')[0];
    if (u && !/^\d+$/.test(u) && u !== 'root') {
      const pw = engine.containerFS(c).read('/etc/passwd') || '';
      if (!pw.split('\n').some(l => l.split(':')[0] === u)) return { msg: `failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: unable to find user ${u}: no matching entries in passwd file: unknown`, code: 126 };
    }
    return null;
  }
  function graceful(engine, c) {
    const { exe } = mainOf(engine, c);
    if (['nginx', 'httpd-foreground', 'httpd', 'redis-server', 'postgres', 'mysqld', 'mariadbd', 'mongod', 'apache2-foreground', 'php', 'whoami', 'prometheus', 'portainer', 'config.yml', 'registry'].includes(exe)) return true;
    if (exe === 'hello') return true;
    // Go 바이너리 · 자바는 SIGTERM 을 처리한다
    const f = engine.containerFS(c);
    const { argv } = mainOf(engine, c);
    if (argv[0] && Code.goMeta(f.read(norm(argv[0], c.workdir)))) return 143;
    if (exe === 'java') return 143;
    if (exe === 'gunicorn' || exe === 'uvicorn') return true;
    return false;
  }
  function memory(engine, c) {
    const k = engine.kind(c);
    const { exe } = mainOf(engine, c);
    if (exe === 'mariadbd') return MEM.mariadb;
    if (['python', 'python3', 'flask', 'gunicorn', 'uvicorn'].includes(exe)) return MEM.python;
    if (['node', 'npm'].includes(exe)) return MEM.node;
    if (exe === 'java') return MEM.java;
    if (SHELLS.includes(exe) || exe === 'sleep') return MEM.shell;
    return MEM[k] || 2 * MB;
  }
  function pids(engine, c) {
    const k = engine.kind(c);
    return { nginx: 9, httpd: 82, redis: 6, postgres: 7, mysql: 38, mongo: 33, wordpress: 11, java: 38 }[k] || 1;
  }

  /* ------------------------------------------------ 가상 파일 (/etc/hosts, /proc …) --- */
  function fsFor(engine, c, user) {
    const lfs = engine.containerFS(c);
    const virt = () => {
      const ips = Object.entries(c.networks).filter(([, n]) => n.ip);
      const userNet = Object.keys(c.networks).some(n => !['bridge', 'host', 'none'].includes(n));
      const mem = c.hostConfig.memory;
      const { argv } = mainOf(engine, c);
      return {
        '/etc/hosts': `127.0.0.1\tlocalhost\n::1\tlocalhost ip6-localhost ip6-loopback\nfe00::0\tip6-localnet\nff00::0\tip6-mcastprefix\nff02::1\tip6-allnodes\nff02::2\tip6-allrouters\n${ips.map(([, n]) => `${n.ip}\t${c.hostname}`).join('\n')}\n`,
        '/etc/resolv.conf': userNet ? '# Generated by Docker Engine.\n# This file can be edited; Docker Engine will not make further changes once it\n# has been modified.\n\nnameserver 127.0.0.11\nsearch .\noptions ndots:0\n\n# Based on host file: \'/etc/resolv.conf\' (internal resolver)\n# ExtServers: [host(192.168.65.7)]\n# Overrides: []\n# Option ndots from: internal\n' : '# Generated by Docker Engine.\n# This file can be edited; Docker Engine will not make further changes once it\n# has been modified.\n\nnameserver 192.168.65.7\n\n# Based on host file: \'/etc/resolv.conf\' (legacy)\n# Overrides: []\n',
        '/etc/hostname': c.hostname + '\n',
        '/proc/1/cmdline': argv.join('\0') + '\0',
        '/proc/1/environ': c.env.join('\0') + '\0',
        '/proc/self/cgroup': '0::/\n',
        '/proc/1/cgroup': '0::/\n',
        '/proc/version': 'Linux version 6.10.14-linuxkit (root@buildkitsandbox) (gcc (Alpine 13.2.1_git20240309) 13.2.1 20240309, GNU ld (GNU Binutils) 2.42) #1 SMP PREEMPT_DYNAMIC Fri Nov 29 17:24:06 UTC 2024\n',
        '/proc/meminfo': `MemTotal:        8029968 kB\nMemFree:         5210044 kB\nMemAvailable:    6802112 kB\n`,
        '/proc/cpuinfo': Array.from({ length: 8 }, (_, i) => `processor\t: ${i}\nmodel name\t: Virtual CPU\n`).join('\n'),
        '/sys/fs/cgroup/memory.max': mem ? mem + '\n' : 'max\n',
        '/sys/fs/cgroup/cpu.max': c.hostConfig.cpus ? `${Math.round(c.hostConfig.cpus * 100000)} 100000\n` : 'max 100000\n',
        '/sys/fs/cgroup/pids.max': c.hostConfig.pidsLimit ? c.hostConfig.pidsLimit + '\n' : 'max\n',
        '/sys/fs/cgroup/memory.current': Math.round(memory(engine, c)) + '\n'
      };
    };
    const VD = ['/proc', '/proc/1', '/proc/self', '/sys', '/sys/fs', '/sys/fs/cgroup'];
    const uid = user && user !== 'root' && user !== '0';
    const writable = p => {
      if (!uid) return true;
      if (/^\/(tmp|var\/tmp|dev\/shm)(\/|$)/.test(p)) return true;
      if (p.startsWith('/home/')) return true;
      const img = engine.img(c);
      const owned = (img && img.owned) || [];
      if (owned.some(o => p === o || p.startsWith(o + '/'))) return true;
      if ((c.hostConfig.mounts || []).some(m => (p === m.target || p.startsWith(m.target + '/')) && m.type !== 'bind' && m.userOwned)) return true;
      if ((c.hostConfig.mounts || []).some(m => (p === m.target || p.startsWith(m.target + '/')) && m.type === 'bind')) return true;
      return false;
    };
    return {
      stat: p => { p = norm(p); const v = virt(); if (p in v) return 'file'; if (VD.includes(p) || p === '/dev') return 'dir'; return lfs.stat(p); },
      read: p => { p = norm(p); const v = virt(); if (p in v) return v[p]; return lfs.read(p); },
      write: (p, s) => { p = norm(p); if (/^\/(proc|sys)\//.test(p)) throw new Error('Read-only file system'); if (!writable(p)) throw new Error('Permission denied'); lfs.write(p, s); },
      mkdir: p => { p = norm(p); if (!writable(p)) throw new Error('Permission denied'); lfs.mkdir(p); },
      rm: (p, r) => { p = norm(p); if (!writable(p)) throw new Error('Permission denied'); return lfs.rm(p, r); },
      ls: p => { p = norm(p); if (p === '/proc') return ['1', 'cpuinfo', 'meminfo', 'self', 'version']; if (p === '/proc/1' || p === '/proc/self') return ['cgroup', 'cmdline', 'environ']; if (p === '/sys') return ['fs']; if (p === '/sys/fs') return ['cgroup']; if (p === '/sys/fs/cgroup') return ['cpu.max', 'memory.current', 'memory.max', 'pids.max']; const r = lfs.ls(p); if (p === '/') ['dev', 'proc', 'sys'].forEach(x => { if (!r.includes(x)) r.push(x); }); return r.sort(); },
      walk: p => lfs.walk(p),
      raw: lfs
    };
  }

  /* ------------------------------------------------ 네트워크 도우미 --- */
  function tcp(engine, from, host, port) {
    const r = engine.resolveHost(from, host);
    if (r.error) return { error: 'ENOTFOUND', dns: true };
    if (r.host) { const c = engine.hostPortOwner(port); if (!c) return { error: 'ECONNREFUSED' }; const map = c.hostConfig.ports.find(p => +p.hostPort === +port); return tcpTo(engine, c, +map.containerPort, false); }
    if (r.unreachable) return { error: 'ETIMEDOUT' };
    if (r.kube) return r.kube.tcp ? r.kube.tcp(port) : { error: 'ECONNREFUSED' };
    return tcpTo(engine, r.c, port, !r.self);
  }
  function tcpTo(engine, c, port, external) {
    if (c.state.status !== 'running') return { error: 'ECONNREFUSED' };
    const p = engine.proc[c.id];
    const L = p && p.listeners[port];
    if (!L || (L.bind === '127.0.0.1' && external)) return { error: 'ECONNREFUSED', c };
    return { c, L, ip: engine.ipOf(c) };
  }

  /** 앱 코드가 쓰는 연결 (Redis · SQL) */
  function bridge(engine, c) {
    return {
      redisPing(conf) { const t = tcp(engine, c, conf.host, conf.port); return !t.error && t.L.proto === 'redis'; },
      async redis(conf, meth, a, ctx) {
        const t = tcp(engine, c, conf.host, conf.port);
        if (t.error || t.L.proto !== 'redis') {
          const msg = t.dns ? `Error -2 connecting to ${conf.host}:${conf.port}. Name or service not known.` : `Error 111 connecting to ${conf.host}:${conf.port}. Connection refused.`;
          if (ctx.lang === 'js') throw new Code.PyError('Error', `connect ECONNREFUSED ${conf.host}:${conf.port}`);
          throw new Code.PyError('redis.exceptions.ConnectionError', msg);
        }
        if (t.L.pass && !conf.password) throw new Code.PyError(ctx.lang === 'js' ? 'Error' : 'redis.exceptions.AuthenticationError', 'NOAUTH Authentication required.');
        const f = engine.containerFS(t.c);
        const out = DB.redisCmd(f, [meth.toUpperCase()].concat(a.map(String)));
        if (/^\(integer\) (-?\d+)/.test(out)) return +out.match(/-?\d+/)[0];
        if (out === '(nil)') return null;
        if (/^".*"$/.test(out)) return out.slice(1, -1);
        if (/^\(error\)/.test(out)) throw new Code.PyError('redis.exceptions.ResponseError', out.replace('(error) ', ''));
        return out;
      },
      async sqlConnect(conn, ctx) {
        const r = sqlTarget(engine, c, conn);
        if (r.error) throw new Code.PyError(conn.flavor === 'mysql' ? 'pymysql.err.OperationalError' : 'psycopg2.OperationalError', r.error);
        return true;
      },
      async sql(conn, sql, ctx) {
        const r = sqlTarget(engine, c, conn);
        if (r.error) throw new Code.PyError(conn.flavor === 'mysql' ? 'pymysql.err.OperationalError' : 'psycopg2.OperationalError', r.error);
        const res = DB.sqlExec(r.ctx, sql);
        if (res.dirty) DB.sqlSave(r.fs, r.flavor, r.ctx.d);
        if (res.error) throw new Code.PyError(conn.flavor === 'mysql' ? 'pymysql.err.ProgrammingError' : 'psycopg2.errors.UndefinedTable', res.error.replace(/^ERROR:\s*/, ''));
        return res;
      }
    };
  }
  /** SQL 서버 찾아 인증까지 */
  function sqlTarget(engine, from, conn) {
    const t = tcp(engine, from, conn.host, conn.port);
    const pg = conn.flavor !== 'mysql';
    if (t.error) {
      if (t.dns) return { error: pg ? `could not translate host name "${conn.host}" to address: Name or service not known` : `(2003, "Can't connect to MySQL server on '${conn.host}' ([Errno -2] Name or service not known)")` };
      return { error: pg ? `connection to server at "${conn.host}" (${t.c ? engine.ipOf(t.c) : conn.host}), port ${conn.port} failed: Connection refused\n\tIs the server running on that host and accepting TCP/IP connections?` : `(2003, "Can't connect to MySQL server on '${conn.host}' ([Errno 111] Connection refused)")` };
    }
    const flavor = t.L.proto === 'mysql' ? 'mysql' : t.L.proto === 'pg' ? 'postgres' : null;
    if (!flavor) return { error: pg ? `connection to server at "${conn.host}", port ${conn.port} failed: received invalid response to SSL negotiation` : `(2013, 'Lost connection to MySQL server during query')` };
    const fs = engine.containerFS(t.c);
    const d = DB.sqlLoad(fs, flavor);
    if (!d) return { error: 'the database system is starting up' };
    const u = d.users[conn.user];
    if (!u || (u.password !== (conn.password || '') && !(d.trust))) return { error: pg ? `connection to server at "${conn.host}" (${t.ip}), port ${conn.port} failed: FATAL:  password authentication failed for user "${conn.user}"` : `(1045, "Access denied for user '${conn.user}'@'${engine.ipOf(from) || 'localhost'}' (using password: ${conn.password ? 'YES' : 'NO'})")` };
    const db = (conn.db || (pg ? conn.user : '')).toLowerCase();
    if (db && !d.dbs[db]) return { error: pg ? `connection to server at "${conn.host}" (${t.ip}), port ${conn.port} failed: FATAL:  database "${db}" does not exist` : `(1049, "Unknown database '${db}'")` };
    return { fs, flavor, ctx: { d, db, flavor, user: conn.user } };
  }

  /* ================================================================ 메인 프로세스 실행 */
  async function run(engine, c, io, p, opts) {
    const img = engine.img(c);
    const { argv, exe } = mainOf(engine, c);
    const env = engine.envOf(c);
    const fs = fsFor(engine, c, c.user);
    const signal = io.signal;
    const sleep = ms => U.sleep(ms, signal);
    const forever = () => new Promise(res => { if (signal.aborted) return res(); signal.addEventListener('abort', () => res()); });
    const listen = (port, fn, bind, proto) => { p.listeners[port] = { fn, bind: bind || '0.0.0.0', proto: proto || 'http' }; engine.changed('listen'); };
    const resume = opts && opts.resume;
    const out = resume ? () => {} : io.out, err = resume ? () => {} : io.err;
    const ts = () => new Date().toISOString();
    p.mem = memory(engine, c);
    const rt = { engine, c, argv, exe, env, fs, io, out, err, signal, sleep, forever, listen, p, img, resume, ts };

    // 메모리 제한 → OOM
    const lim = c.hostConfig.memory;
    if (lim && p.mem > lim) {
      await sleep(exe === 'mysqld' ? 1500 : 600);
      if (signal.aborted) return 0;
      p.oom = true;
      if (exe === 'mysqld') err(`${ts()} 0 [System] [MY-015015] [Server] MySQL Server - start.\n`);
      return 137;
    }
    // 이미지 종류별 준비 (환경 변수 확인 등)
    if (exe === 'hello') return hello(rt);
    if (exe === 'nginx' && argv.includes('-g')) return Servers.nginx(rt);
    if (exe === 'nginx') return cmdOnce(rt);
    if (exe === 'httpd-foreground' || (exe === 'httpd' && img.kind === 'httpd')) return Servers.httpd(rt);
    if (exe === 'redis-server') return Servers.redis(rt);
    if (exe === 'postgres') return Servers.postgres(rt);
    if (exe === 'mysqld' || exe === 'mariadbd') return Servers.mysql(rt);
    if (exe === 'mongod') return Servers.mongo(rt);
    if (exe === 'apache2-foreground') return img.kind === 'wordpress' ? Servers.wordpress(rt) : Servers.httpd(rt);
    if (exe === 'php' && img.kind === 'adminer') return Servers.adminer(rt);
    if (exe === 'config.yml' || exe === 'registry') return Servers.registry(rt);
    if (exe === 'whoami') return Servers.whoami(rt);
    if (img.kind === 'web' && ['prometheus', 'portainer', 'grafana-server'].includes(exe) || (img.kind === 'web' && !argv.length)) return Servers.web(rt);
    if (exe === 'stress') return stress(rt);
    // 앱 실행
    const app = await appRun(rt);
    if (app != null) return app;
    // 셸
    if (SHELLS.includes(exe)) {
      const script = argv[1] === '-c' ? argv[2] : null;
      if (script != null) return shRun(rt, script, argv.slice(3));
      if (argv[1] && !argv[1].startsWith('-')) { const src = fs.read(norm(argv[1], c.workdir)); if (src != null) return shRun(rt, src.replace(/^#!.*\n/, ''), argv.slice(2)); err(`${exe}: 0: cannot open ${argv[1]}: No such file\n`); return 2; }
      if (c.interactive) return ttyShell(rt, exe);
      return 0;   // 입력(stdin)이 없으면 셸은 바로 끝난다
    }
    if (['python', 'python3'].includes(exe) && argv.length === 1 || exe === 'node' && argv.length === 1 || exe === 'jshell') {
      if (c.interactive) return ttyRepl(rt, exe);
      return 0;
    }
    return cmdOnce(rt);
  }

  function hello(rt) {
    rt.out(`
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/

`);
    return 0;
  }

  async function shRun(rt, script, extra) {
    const sh = shell(rt.engine, rt.c, { name: rt.exe === 'bash' ? 'bash' : 'sh', args: extra });
    const io = { out: rt.io.out, err: rt.io.err, signal: rt.signal };
    try { return await sh.exec(script, io); } catch (e) { if (e instanceof Sh.ExitSignal) return e.code; throw e; }
  }
  async function cmdOnce(rt) {
    const sh = shell(rt.engine, rt.c, { name: 'sh' });
    const io = { out: rt.io.out, err: rt.io.err, signal: rt.signal };
    try {
      if (rt.argv[0].includes('/') && rt.fs.stat(norm(rt.argv[0], rt.c.workdir)) === 'file') {
        const src = rt.fs.read(norm(rt.argv[0], rt.c.workdir));
        if (/^#!/.test(src) || /\.sh$/.test(rt.argv[0])) return await sh.exec(src.replace(/^#!.*\n/, ''), io);
      }
      return await sh.call(rt.argv, io, null);
    } catch (e) { if (e instanceof Sh.ExitSignal) return e.code; throw e; }
  }

  /** docker run -it ubuntu → 터미널이 붙을 때까지 대기하는 셸 */
  function ttyShell(rt, exe) {
    const sh = shell(rt.engine, rt.c, { name: exe === 'bash' || exe === 'zsh' ? 'bash' : 'sh' });
    return new Promise(res => {
      rt.p.tty = { sh, kind: 'shell', end: code => res(code) };
      rt.signal.addEventListener('abort', () => res(0));
    });
  }
  function ttyRepl(rt, exe) {
    return new Promise(res => {
      rt.p.tty = { kind: exe, end: code => res(code) };
      rt.signal.addEventListener('abort', () => res(0));
    });
  }

  async function stress(rt) {
    const a = rt.argv;
    const get = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
    if (a.includes('--help') || a.length === 1) { rt.out("`stress' imposes certain types of compute stress on your system\n\nUsage: stress [OPTION [ARG]] ...\n -?, --help         show this help statement\n     --version      show version statement\n -v, --verbose      be verbose\n -t, --timeout N    timeout after N seconds\n -c, --cpu N        spawn N workers spinning on sqrt()\n -m, --vm N         spawn N workers spinning on malloc()/free()\n     --vm-bytes B   malloc B bytes per vm worker (default is 256MB)\n\nExample: stress --cpu 8 --io 4 --vm 2 --vm-bytes 128M --timeout 10s\n"); return 1; }
    const vm = +(get('--vm') || get('-m') || 0), cpu = +(get('--cpu') || get('-c') || 0);
    const bytes = U.parseSize(get('--vm-bytes') || '256M');
    const to = parseFloat(get('--timeout') || get('-t') || '0');
    rt.out(`stress: info: [1] dispatching hogs: ${cpu} cpu, 0 io, ${vm} vm, 0 hdd\n`);
    rt.p.mem = 1 * MB + vm * bytes;
    rt.p.cpu = cpu * 100;
    rt.p.pids = 1 + vm + cpu;
    rt.engine.changed('stats');
    const lim = rt.c.hostConfig.memory;
    if (lim && rt.p.mem > lim) {
      await rt.sleep(800);
      rt.p.oom = true;
      rt.err(`stress: FAIL: [1] (415) <-- worker 7 got signal 9\nstress: WARN: [1] (417) now reaping child worker processes\nstress: FAIL: [1] (451) failed run completed in 1s\n`);
      return 137;
    }
    if (to) { if (!(await rt.sleep(to * 1000))) return 0; rt.out(`stress: info: [1] successful run completed in ${to}s\n`); return 0; }
    await rt.forever();
    return 0;
  }

  /** python / node / flask / gunicorn / go 바이너리 / java */
  async function appRun(rt) {
    const { argv, exe, fs, c } = rt;
    const pk = new Set([].concat(rt.img.pkgs || [], c.pkgs || []));
    const host = c.hostname;
    const ip = rt.engine.ipOf(c);
    const base = {
      out: rt.io.out, err: rt.io.err, env: rt.env, host, ip, signal: rt.signal, sleep: rt.sleep, forever: rt.forever,
      listen: (port, fn, bind) => rt.listen(port, fn, bind), fs, cwd: c.workdir, pkgs: pk, bridge: bridge(rt.engine, c)
    };
    const readApp = f => { const p = norm(f, c.workdir); const s = fs.read(p); return { p, s }; };
    // Go 바이너리 등 (파일 경로 실행)
    if (argv[0] && (argv[0].includes('/') || fs.stat(norm(argv[0], c.workdir)) === 'file')) {
      const { s } = readApp(argv[0]);
      const g = Code.goMeta(s);
      if (g) {
        g.prints.forEach(x => rt.io.out(x.endsWith('\n') ? x : x + '\n'));
        g.logs.forEach(x => rt.io.err(new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/') + ' ' + x + '\n'));
        if (g.port) {
          rt.listen(g.port, req => { const r = g.routes.find(x => x.path === req.path.split('?')[0]) || g.routes.find(x => x.path === '/'); return r ? { status: 200, body: r.text, type: 'text/plain; charset=utf-8' } : { status: 404, body: '404 page not found\n', type: 'text/plain' }; });
          await rt.forever(); return 2;
        }
        return 0;
      }
    }
    if (['python', 'python3'].includes(exe) && argv.length > 1) {
      if (argv[1] === '--version' || argv[1] === '-V') { rt.io.out('Python 3.12.7\n'); return 0; }
      if (argv[1] === '-m' && argv[2] === 'http.server') {
        const port = +(argv[3] || 8000);
        const bindIdx = argv.indexOf('--bind');
        rt.io.err(`Serving HTTP on 0.0.0.0 port ${port} (http://0.0.0.0:${port}/) ...\n`);
        rt.listen(port, req => staticServe(rt, c.workdir, req, 'python'), bindIdx > 0 && argv[bindIdx + 1] === '127.0.0.1' ? '127.0.0.1' : '0.0.0.0');
        await rt.forever(); return 0;
      }
      if (argv[1] === '-c') { const prog = new Code.PyProgram(argv[2] || '', Object.assign({}, base, { file: '<string>' })); return prog.run(); }
      if (argv[1] === '-m' && argv[2] === 'flask') return flaskRun(rt, argv.slice(3), base);
      if (argv[1] === '-m' && argv[2] === 'uvicorn') return uvicornRun(rt, argv.slice(3), base);
      const f = argv.find((a, i) => i > 0 && !a.startsWith('-'));
      const { p, s } = readApp(f);
      if (s == null) { rt.io.err(`python3: can't open file '${p}': [Errno 2] No such file or directory\n`); return 2; }
      const prog = new Code.PyProgram(s, Object.assign({}, base, { file: p }));
      return prog.run();
    }
    if (exe === 'flask') return flaskRun(rt, argv.slice(1), base);
    if (exe === 'uvicorn') return uvicornRun(rt, argv.slice(1), base);
    if (exe === 'gunicorn') {
      const bi = argv.findIndex(a => a === '-b' || a === '--bind');
      const bindArg = bi > 0 ? argv[bi + 1] : (argv.find(a => a.startsWith('--bind=')) || '').slice(7) || '127.0.0.1:8000';
      const target = argv.slice(1).filter((a, i, arr) => !a.startsWith('-') && arr[i - 1] !== '-b' && arr[i - 1] !== '--bind' && arr[i - 1] !== '-w' && arr[i - 1] !== '--workers').pop() || 'app:app';
      const { p, s } = readApp(target.split(':')[0].replace(/\./g, '/') + '.py');
      if (s == null) { rt.io.err(`ModuleNotFoundError: No module named '${target.split(':')[0]}'\n`); return 3; }
      const prog = new Code.PyProgram(s, Object.assign({}, base, { file: p }));
      prog.globals.__name__ = target.split(':')[0];
      const code = await moduleThenServe(prog, bindArg.split(':')[0] || '127.0.0.1', +(bindArg.split(':')[1] || 8000), 'gunicorn');
      return code;
    }
    if (exe === 'node' && argv.length > 1) {
      if (argv[1] === '-v' || argv[1] === '--version') { rt.io.out('v22.11.0\n'); return 0; }
      if (argv[1] === '-e') { const prog = new Code.NodeProgram(argv[2] || '', Object.assign({}, base, { file: '[eval]' })); return prog.run(); }
      const f = argv.find((a, i) => i > 0 && !a.startsWith('-'));
      let { p, s } = readApp(f);
      if (s == null && !/\.m?js$/.test(f)) ({ p, s } = readApp(f + '.js'));
      if (s == null) { rt.io.err(`node:internal/modules/cjs/loader:1228\n  throw err;\n  ^\n\nError: Cannot find module '${p}'\n    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)\n    at Module._load (node:internal/modules/cjs/loader:1051:27) {\n  code: 'MODULE_NOT_FOUND',\n  requireStack: []\n}\n\nNode.js v22.11.0\n`); return 1; }
      const prog = new Code.NodeProgram(s, Object.assign({}, base, { file: p }));
      return prog.run();
    }
    if (exe === 'npm' && (argv[1] === 'start' || argv[1] === 'run')) {
      const pj = fs.read(norm('package.json', c.workdir));
      if (pj == null) { rt.io.err(`npm error code ENOENT\nnpm error syscall open\nnpm error path ${norm('package.json', c.workdir)}\nnpm error errno -2\nnpm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '${norm('package.json', c.workdir)}'\n`); return 254; }
      let scripts = {}; try { scripts = JSON.parse(pj).scripts || {}; } catch (_) {}
      const name = argv[1] === 'start' ? 'start' : argv[2];
      const cmd = scripts[name] || (name === 'start' ? 'node server.js' : null);
      if (!cmd) { rt.io.err(`npm error Missing script: "${name}"\n`); return 1; }
      let pkgName = 'app'; try { pkgName = JSON.parse(pj).name || 'app'; } catch (_) {}
      rt.io.out(`\n> ${pkgName}@1.0.0 ${name}\n> ${cmd}\n\n`);
      const parts = cmd.split(/\s+/);
      const sub = Object.assign({}, rt, { argv: parts, exe: base_(parts[0]) });
      const r = await appRun(sub);
      return r == null ? shRun(rt, cmd, []) : r;
    }
    if (exe === 'java' && argv.includes('-jar')) {
      const jar = argv[argv.indexOf('-jar') + 1];
      const { p, s } = readApp(jar);
      if (s == null) { rt.io.err(`Error: Unable to access jarfile ${jar}\n`); return 1; }
      let meta = {}; try { meta = JSON.parse(s.replace(/^PK JAR /, '')); } catch (_) {}
      rt.io.out(`\n  .   ____          _            __ _ _\n /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\\n( ( )\\___ | '_ | '_| | '_ \\/ _\` | \\ \\ \\ \\\n \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )\n  '  |____| .__|_| |_|_| |_\\__, | / / / /\n =========|_|==============|___/=/_/_/_/\n\n :: Spring Boot ::                (v3.3.5)\n\n`);
      await rt.sleep(1200);
      const port = +(rt.env.SERVER_PORT || meta.port || 8080);
      rt.io.out(`${new Date().toISOString()}  INFO 1 --- [demo] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port ${port} (http) with context path '/'\n${new Date().toISOString()}  INFO 1 --- [demo] [           main] com.example.demo.DemoApplication         : Started DemoApplication in 2.1 seconds (process running for 2.6)\n`);
      rt.listen(port, req => { const r = (meta.routes || []).find(x => x.path === req.path.split('?')[0]); return r ? { status: 200, body: r.text, type: 'text/plain;charset=UTF-8' } : (req.path === '/' && !(meta.routes || []).length ? { status: 200, body: 'Hello from Spring Boot!', type: 'text/plain' } : { status: 404, body: '{"timestamp":"' + new Date().toISOString() + '","status":404,"error":"Not Found","path":"' + req.path + '"}', type: 'application/json' }); });
      await rt.forever(); return 143;
    }
    return null;
  }
  function base_(p) { return base(p); }
  async function flaskRun(rt, a, b) {
    let host = '127.0.0.1', port = 5000, appName = rt.env.FLASK_APP || null;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === 'run') continue;
      if (a[i] === '--host' || a[i] === '-h') host = a[++i];
      else if (a[i].startsWith('--host=')) host = a[i].slice(7);
      else if (a[i] === '--port' || a[i] === '-p') port = +a[++i];
      else if (a[i].startsWith('--port=')) port = +a[i].slice(7);
      else if (a[i] === '--app') appName = a[++i];
    }
    if (rt.env.FLASK_RUN_HOST) host = rt.env.FLASK_RUN_HOST;
    if (rt.env.FLASK_RUN_PORT) port = +rt.env.FLASK_RUN_PORT;
    const cands = appName ? [appName.split(':')[0].replace(/\.py$/, '') + '.py'] : ['app.py', 'wsgi.py'];
    let file = null, src = null;
    for (const f of cands) { const p = norm(f, rt.c.workdir); const s = rt.fs.read(p); if (s != null) { file = p; src = s; break; } }
    if (src == null) { rt.io.err(`Usage: flask run [OPTIONS]\nTry 'flask run --help' for help.\n\nError: Could not locate a Flask application. Use the 'flask --app' option, 'FLASK_APP' environment variable, or a 'wsgi.py' or 'app.py' file in the current directory.\n`); return 2; }
    const prog = new Code.PyProgram(src, Object.assign({}, b, { file }));
    prog.globals.__name__ = 'app';
    return moduleThenServe(prog, host, port, 'flask');
  }
  async function uvicornRun(rt, a, b) {
    let host = '127.0.0.1', port = 8000, target = 'main:app';
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '--host') host = a[++i]; else if (a[i] === '--port') port = +a[++i]; else if (!a[i].startsWith('-')) target = a[i];
    }
    const file = norm(target.split(':')[0].replace(/\./g, '/') + '.py', rt.c.workdir);
    const src = rt.fs.read(file);
    if (src == null) { rt.io.err(`ERROR:    Error loading ASGI app. Could not import module "${target.split(':')[0]}".\n`); return 1; }
    const prog = new Code.PyProgram(src, Object.assign({}, b, { file }));
    prog.globals.__name__ = target.split(':')[0];
    return moduleThenServe(prog, host, port, 'uvicorn');
  }
  async function moduleThenServe(prog, host, port, how) {
    const missing = prog.checkImports();
    if (missing) return prog.run();
    try { await prog.exec(prog.blocks, prog.globals); }
    catch (e) { if (e instanceof Code.PyError) { prog.rt.err(prog.tb(e, e.line)); return 1; } throw e; }
    await prog.serve(host, port, how);
    return 0;
  }

  /** 정적 파일 서버 (nginx · httpd · python http.server 공용) */
  function staticServe(rt, root, req, style) {
    const fs = VFS.LayerFS ? fsFor(rt.engine, rt.c, 'root') : rt.fs;
    let path = decodeURIComponent(req.path.split('?')[0]);
    let p = norm(root + '/' + path);
    let st = fs.stat(p);
    if (st === 'dir') {
      if (!path.endsWith('/') && style !== 'python') return { status: 301, body: `<html>\r\n<head><title>301 Moved Permanently</title></head>\r\n<body>\r\n<center><h1>301 Moved Permanently</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n`, type: 'text/html', headers: { Location: path + '/' } };
      const idx = ['index.html', 'index.htm'].map(f => norm(p + '/' + f)).find(f => fs.stat(f) === 'file');
      if (idx) { p = idx; st = 'file'; }
      else if (style === 'python') {
        const items = fs.ls(p).map(n => `<li><a href="${n}${fs.stat(p + '/' + n) === 'dir' ? '/' : ''}">${n}${fs.stat(p + '/' + n) === 'dir' ? '/' : ''}</a></li>`).join('\n');
        return { status: 200, body: `<!DOCTYPE HTML>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Directory listing for ${path}</title>\n</head>\n<body>\n<h1>Directory listing for ${path}</h1>\n<hr>\n<ul>\n${items}\n</ul>\n<hr>\n</body>\n</html>\n`, type: 'text/html; charset=utf-8' };
      } else return { status: 403, body: style === 'httpd' ? '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>\n' : `<html>\r\n<head><title>403 Forbidden</title></head>\r\n<body>\r\n<center><h1>403 Forbidden</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n`, type: 'text/html' };
    }
    if (st !== 'file') {
      if (style === 'httpd') return { status: 404, body: `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>404 Not Found</title>\n</head><body>\n<h1>Not Found</h1>\n<p>The requested URL was not found on this server.</p>\n</body></html>\n`, type: 'text/html' };
      if (style === 'python') return { status: 404, body: `<!DOCTYPE HTML>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error response</title>\n</head>\n<body>\n<h1>Error response</h1>\n<p>Error code: 404</p>\n<p>Message: File not found.</p>\n</body>\n</html>\n`, type: 'text/html' };
      return { status: 404, body: `<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n`, type: 'text/html' };
    }
    const ext = (p.match(/\.(\w+)$/) || [])[1] || '';
    const types = { html: 'text/html', htm: 'text/html', css: 'text/css', js: 'application/javascript', json: 'application/json', txt: 'text/plain', svg: 'image/svg+xml', md: 'text/plain', png: 'image/png' };
    return { status: 200, body: fs.read(p), type: types[ext] || 'application/octet-stream' };
  }

  /* ================================================================ 서버들 */
  const Servers = {
    async nginx(rt) {
      const { err, out, fs } = rt;
      const t = () => new Date().toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/');
      out('/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration\n/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/\n/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh\n10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf\n10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf\n/docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh\n/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh\n/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh\n/docker-entrypoint.sh: Configuration complete; ready for start up\n');
      const conf = nginxConf(rt.fs);
      if (conf.error) { err(`${t()} [emerg] 1#1: ${conf.error}\nnginx: [emerg] ${conf.error}\n`); return 1; }
      err(`${t()} [notice] 1#1: using the "epoll" event method\n${t()} [notice] 1#1: nginx/1.27.2\n${t()} [notice] 1#1: built by gcc 12.2.0 (Debian 12.2.0-14)\n${t()} [notice] 1#1: OS: Linux 6.10.14-linuxkit\n${t()} [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576\n${t()} [notice] 1#1: start worker processes\n${t()} [notice] 1#1: start worker process 29\n${t()} [notice] 1#1: start worker process 30\n`);
      conf.servers.forEach(sv => {
        rt.listen(sv.port, async req => {
          const res = await nginxHandle(rt, sv, req);
          const d = new Date(); const ds = `${String(d.getUTCDate()).padStart(2, '0')}/${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}/${d.getUTCFullYear()}:${d.toISOString().slice(11, 19)} +0000`;
          rt.io.out(`${req.fromIp} - - [${ds}] "${req.method} ${req.path} HTTP/1.1" ${res.status} ${String(res.body || '').length} "-" "${req.headers['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0'}" "-"\n`);
          return res;
        });
      });
      rt.p.reload = () => { const c2 = nginxConf(rt.fs); if (c2.error) return c2.error; rt.p.listeners = {}; c2.servers.forEach(sv => rt.listen(sv.port, req => nginxHandle(rt, sv, req))); err(`${t()} [notice] 1#1: signal 1 (SIGHUP) received from 40, reconfiguring\n${t()} [notice] 1#1: reconfiguring\n`); return null; };
      await rt.forever();
      err(`${t()} [notice] 1#1: signal 3 (SIGQUIT) received, shutting down\n${t()} [notice] 29#29: gracefully shutting down\n${t()} [notice] 1#1: exit\n`);
      return 0;
    },
    async httpd(rt) {
      const d = () => new Date().toUTCString().replace(/,/, '').replace(/ GMT/, '.000000 ' + new Date().getUTCFullYear()).split(' ').slice(0, 4).join(' ');
      rt.err(`AH00558: httpd: Could not reliably determine the server's fully qualified domain name, using ${rt.engine.ipOf(rt.c) || '172.17.0.2'}. Set the 'ServerName' directive globally to suppress this message\n`.repeat(2));
      rt.err(`[${d()}] [mpm_event:notice] [pid 1:tid 1] AH00489: Apache/2.4.62 (Unix) configured -- resuming normal operations\n[${d()}] [core:notice] [pid 1:tid 1] AH00094: Command line: 'httpd -D FOREGROUND'\n`);
      rt.listen(80, req => { const r = staticServe(rt, '/usr/local/apache2/htdocs', req, 'httpd'); rt.io.out(`${req.fromIp} - - [${new Date().toUTCString()}] "${req.method} ${req.path} HTTP/1.1" ${r.status} ${String(r.body).length}\n`); return r; });
      await rt.forever();
      rt.err(`[${d()}] [mpm_event:notice] [pid 1:tid 1] AH00491: caught SIGTERM, shutting down\n`);
      return 0;
    },
    async redis(rt) {
      const pass = (rt.argv.indexOf('--requirepass') >= 0) ? rt.argv[rt.argv.indexOf('--requirepass') + 1] : null;
      const d = () => { const x = new Date(); return `1:M ${String(x.getUTCDate()).padStart(2, '0')} ${x.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${x.getUTCFullYear()} ${x.toISOString().slice(11, 23)}`; };
      const has = rt.fs.read(REDIS_DUMP) != null;
      rt.out(`1:C ${d().slice(4)} * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo\n1:C ${d().slice(4)} * Redis version=7.4.1, bits=64, commit=00000000, modified=0, pid=1, just started\n1:C ${d().slice(4)} # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf\n${d()} * monotonic clock: POSIX clock_gettime\n${d()} * Running mode=standalone, port=6379.\n${d()} * Server initialized\n${has ? `${d()} * Loading RDB produced by version 7.4.1\n${d()} * Done loading RDB, keys loaded: ${Object.keys(DB.redisDB(rt.fs).kv).length}, keys expired: 0.\n${d()} * DB loaded from disk: 0.000 seconds\n` : ''}${d()} * Ready to accept connections tcp\n`);
      if (!rt.fs.stat('/data')) try { rt.fs.mkdir('/data'); } catch (_) {}
      rt.listen(6379, null, '0.0.0.0', 'redis');
      rt.p.listeners[6379].pass = pass;
      await rt.forever();
      rt.out(`${d()} # User requested shutdown...\n${d()} * Saving the final RDB snapshot before exiting.\n${d()} * DB saved on disk\n${d()} # Redis is now ready to exit, bye bye...\n`);
      return 0;
    },
    async postgres(rt) {
      const { env, fs, out, err } = rt;
      const PGD = '/var/lib/postgresql/data';
      const d = () => new Date().toISOString().replace('T', ' ').slice(0, 23) + ' UTC';
      let data = DB.sqlLoad(fs, 'postgres');
      if (!data) {
        if (!env.POSTGRES_PASSWORD && env.POSTGRES_HOST_AUTH_METHOD !== 'trust') {
          err(`Error: Database is uninitialized and superuser password is not specified.\n       You must specify POSTGRES_PASSWORD to a non-empty value for the\n       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".\n\n       You may also use "POSTGRES_HOST_AUTH_METHOD=trust" to allow all\n       connections without a password. This is *not* recommended.\n\n       See PostgreSQL documentation about "trust":\n       https://www.postgresql.org/docs/current/auth-trust.html\n`);
          return 1;
        }
        const user = env.POSTGRES_USER || 'postgres';
        const db = (env.POSTGRES_DB || user).toLowerCase();
        out(`The files belonging to this database system will be owned by user "postgres".\nThis user must also own the server process.\n\nThe database cluster will be initialized with locale "en_US.utf8".\nThe default database encoding has accordingly been set to "UTF8".\nThe default text search configuration will be set to "english".\n\nData page checksums are disabled.\n\nfixing permissions on existing directory ${PGD} ... ok\ncreating subdirectories ... ok\nselecting dynamic shared memory implementation ... posix\nselecting default "max_connections" ... 100\nselecting default "shared_buffers" ... 128MB\nselecting default time zone ... Etc/UTC\ncreating configuration files ... ok\nrunning bootstrap script ... ok\n`);
        if (!(await rt.sleep(900))) return 0;
        out(`performing post-bootstrap initialization ... ok\nsyncing data to disk ... ok\n\n\nSuccess. You can now start the database server using:\n\n    pg_ctl -D ${PGD} -l logfile start\n\ninitdb: warning: enabling "trust" authentication for local connections\ninitdb: hint: You can change this by editing pg_hba.conf or using the option -A, or --auth-local and --auth-host, the next time you run initdb.\nwaiting for server to start.... done\nserver started\n${db !== 'postgres' ? 'CREATE DATABASE\n' : ''}\n\n/usr/local/bin/docker-entrypoint.sh: ignoring /docker-entrypoint-initdb.d/*\n\nwaiting for server to shut down.... done\nserver stopped\n\nPostgreSQL init process complete; ready for start up.\n\n`);
        data = { users: { [user]: { password: env.POSTGRES_PASSWORD || '' } }, dbs: { postgres: { tables: {} }, template1: { tables: {} } }, trust: env.POSTGRES_HOST_AUTH_METHOD === 'trust', created: Date.now() };
        data.dbs[db] = data.dbs[db] || { tables: {} };
        // 초기화 스크립트
        const initDir = '/docker-entrypoint-initdb.d';
        if (fs.stat(initDir) === 'dir') fs.ls(initDir).filter(f => /\.sql$/.test(f)).forEach(f => {
          out(`/usr/local/bin/docker-entrypoint.sh: running ${initDir}/${f}\n`);
          const ctx = { d: data, db, flavor: 'postgres' };
          DB.splitSql(fs.read(initDir + '/' + f) || '').forEach(s => { const r = DB.sqlExec(ctx, s); out((r.msg || (r.error ? r.error : 'SELECT')) + '\n'); });
        });
        try { DB.sqlSave(fs, 'postgres', data); } catch (e) { err(`initdb: error: could not change permissions of directory "${PGD}": Operation not permitted\n`); return 1; }
        fs.write(PGD + '/PG_VERSION', '17\n');
      } else {
        out(`\nPostgreSQL Database directory appears to contain a database; Skipping initialization\n\n`);
      }
      if (!(await rt.sleep(400))) return 0;
      out(`${d()} [1] LOG:  starting PostgreSQL 17.2 (Debian 17.2-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit\n${d()} [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432\n${d()} [1] LOG:  listening on IPv6 address "::", port 5432\n${d()} [1] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"\n${d()} [29] LOG:  database system was shut down at ${d()}\n${d()} [1] LOG:  database system is ready to accept connections\n`);
      rt.listen(5432, null, '0.0.0.0', 'pg');
      await rt.forever();
      out(`${d()} [1] LOG:  received fast shutdown request\n${d()} [1] LOG:  aborting any active transactions\n${d()} [1] LOG:  database system is shut down\n`);
      return 0;
    },
    async mysql(rt) {
      const { env, fs, out, err } = rt;
      const d = () => new Date().toISOString().replace(/Z$/, '000Z');
      const maria = rt.exe === 'mariadbd';
      const P = maria ? 'MARIADB_' : 'MYSQL_';
      const g = k => env[P + k] != null ? env[P + k] : env['MYSQL_' + k];
      let data = DB.sqlLoad(fs, 'mysql');
      out(`${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: Entrypoint script for MySQL Server 8.4.3-1.el9 started.\n`);
      if (!data) {
        if (!g('ROOT_PASSWORD') && !g('ALLOW_EMPTY_PASSWORD') && !g('RANDOM_ROOT_PASSWORD') && !env.MARIADB_ROOT_PASSWORD) {
          err(`${d().replace('T', ' ').slice(0, 19)}+00:00 [ERROR] [Entrypoint]: Database is uninitialized and password option is not specified\n    You need to specify one of the following as an environment variable:\n    - ${P}ROOT_PASSWORD\n    - ${P}ALLOW_EMPTY_PASSWORD\n    - ${P}RANDOM_ROOT_PASSWORD\n`);
          return 1;
        }
        out(`${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: Initializing database files\n${d()} 0 [System] [MY-015017] [Server] MySQL Server Initialization - start.\n`);
        if (!(await rt.sleep(2500))) return 0;
        const root = g('RANDOM_ROOT_PASSWORD') ? U.hex(16) : (g('ROOT_PASSWORD') || '');
        if (g('RANDOM_ROOT_PASSWORD')) out(`${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: GENERATED ROOT PASSWORD: ${root}\n`);
        data = { users: { root: { password: root } }, dbs: { information_schema: { tables: {} }, mysql: { tables: {} }, performance_schema: { tables: {} }, sys: { tables: {} } }, created: Date.now() };
        if (g('DATABASE')) { data.dbs[g('DATABASE').toLowerCase()] = { tables: {} }; out(`${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: Creating database ${g('DATABASE')}\n`); }
        if (g('USER') && g('PASSWORD')) { data.users[g('USER')] = { password: g('PASSWORD') }; out(`${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: Creating user ${g('USER')}\n`); }
        const initDir = '/docker-entrypoint-initdb.d';
        if (fs.stat(initDir) === 'dir') fs.ls(initDir).filter(f => /\.sql$/.test(f)).forEach(f => {
          out(`${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running ${initDir}/${f}\n`);
          const ctx = { d: data, db: (g('DATABASE') || '').toLowerCase(), flavor: 'mysql' };
          DB.splitSql(fs.read(initDir + '/' + f) || '').forEach(s => DB.sqlExec(ctx, s));
        });
        DB.sqlSave(fs, 'mysql', data);
        out(`${d()} 0 [System] [MY-015018] [Server] MySQL Server Initialization - end.\n${d().replace('T', ' ').slice(0, 19)}+00:00 [Note] [Entrypoint]: MySQL init process done. Ready for start up.\n\n`);
      } else {
        if (!(await rt.sleep(600))) return 0;
      }
      if (!(await rt.sleep(900))) return 0;
      out(`${d()} 0 [System] [MY-010116] [Server] /usr/sbin/mysqld (mysqld 8.4.3) starting as process 1\n${d()} 1 [System] [MY-013576] [InnoDB] InnoDB initialization has started.\n${d()} 1 [System] [MY-013577] [InnoDB] InnoDB initialization has ended.\n${d()} 0 [System] [MY-011323] [Server] X Plugin ready for connections. Bind-address: '::' port: 33060, socket: /var/run/mysqld/mysqlx.sock\n${d()} 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Version: '8.4.3'  socket: '/var/run/mysqld/mysqld.sock'  port: 3306  MySQL Community Server - GPL.\n`);
      rt.listen(3306, null, '0.0.0.0', 'mysql');
      await rt.forever();
      out(`${d()} 0 [System] [MY-013172] [Server] Received SHUTDOWN from user <via user signal>. Shutting down mysqld (Version: 8.4.3).\n${d()} 0 [System] [MY-010910] [Server] /usr/sbin/mysqld: Shutdown complete (mysqld 8.4.3)  MySQL Community Server - GPL.\n`);
      return 0;
    },
    async mongo(rt) {
      const j = (msg, attr) => JSON.stringify({ t: { $date: new Date().toISOString() }, s: 'I', c: 'NETWORK', id: 23016, ctx: 'listener', msg, attr: attr || {} }) + '\n';
      rt.out(j('Waiting for connections', { port: 27017, ssl: 'off' }));
      if (!rt.fs.stat('/data/db')) try { rt.fs.mkdir('/data/db'); } catch (_) {}
      rt.listen(27017, null, '0.0.0.0', 'mongo');
      await rt.forever();
      return 0;
    },
    async wordpress(rt) {
      const { env } = rt;
      rt.err(`WordPress not found in /var/www/html - copying now...\nComplete! WordPress has been successfully copied to /var/www/html\nNo 'wp-config.php' found in /var/www/html, but 'WORDPRESS_...' variables supplied; copying 'wp-config-docker.php' (${Object.keys(env).filter(k => k.startsWith('WORDPRESS_')).join(' ') || 'none'})\n`);
      rt.err(`AH00558: apache2: Could not reliably determine the server's fully qualified domain name, using ${rt.engine.ipOf(rt.c)}. Set the 'ServerName' directive globally to suppress this message\n[${new Date().toUTCString()}] [mpm_prefork:notice] [pid 1] AH00163: Apache/2.4.62 (Debian) PHP/8.2.26 configured -- resuming normal operations\n`);
      rt.listen(80, req => {
        const hp = (env.WORDPRESS_DB_HOST || 'mysql').split(':');
        const conn = { flavor: 'mysql', host: hp[0], port: +(hp[1] || 3306), user: env.WORDPRESS_DB_USER || 'root', password: env.WORDPRESS_DB_PASSWORD || '', db: env.WORDPRESS_DB_NAME || 'wordpress' };
        const r = sqlTarget(rt.engine, rt.c, conn);
        rt.io.out(`${req.fromIp} - - [${new Date().toUTCString()}] "${req.method} ${req.path} HTTP/1.1" ${r.error ? 500 : 302} 0 "-" "Mozilla/5.0"\n`);
        if (r.error) return { status: 500, type: 'text/html', body: `<!DOCTYPE html><html lang="en-US"><head><meta charset="UTF-8"><title>Database Error</title><style>body{background:#f1f1f1;font-family:-apple-system,"Segoe UI",sans-serif}#box{background:#fff;max-width:700px;margin:50px auto;padding:1em 2em;box-shadow:0 1px 1px rgba(0,0,0,.04);border:1px solid #c3c4c7}</style></head><body><div id="box"><h1>Error establishing a database connection</h1><p style="color:#646970;font-size:13px">(시뮬레이터 힌트) ${U.esc(r.error)}</p></div></body></html>` };
        const d = r.ctx.d.dbs[conn.db.toLowerCase()];
        const installed = d && d.tables.wp_options;
        if (req.path.startsWith('/wp-admin/install.php') && req.method === 'POST' || req.path.includes('install=1')) {
          d.tables.wp_options = { cols: [{ name: 'option_name' }, { name: 'option_value' }], rows: [['blogname', '나의 도커 블로그']], seq: 1 };
          d.tables.wp_posts = { cols: [{ name: 'id' }, { name: 'post_title' }], rows: [[1, 'Hello world!']], seq: 1 };
          DB.sqlSave(r.fs, 'mysql', r.ctx.d);
        }
        const now = d && d.tables.wp_options;
        if (!now) return { status: 200, type: 'text/html', body: WP_INSTALL };
        const title = (now.rows.find(x => x[0] === 'blogname') || [])[1] || 'My Blog';
        const posts = (d.tables.wp_posts || { rows: [] }).rows;
        return { status: 200, type: 'text/html', body: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${U.esc(title)}</title><style>body{font-family:Georgia,serif;margin:0;background:#fff;color:#111}header{padding:28px 40px;border-bottom:1px solid #eee}h1{margin:0;font-size:28px}main{max-width:680px;margin:30px auto;padding:0 20px}article{border-bottom:1px solid #eee;padding:18px 0}small{color:#777}</style></head><body><header><h1>${U.esc(title)}</h1><small>Just another WordPress site</small></header><main>${posts.map(p => `<article><h2>${U.esc(p[1])}</h2><p>Welcome to WordPress. This is your first post. Edit or delete it, then start writing!</p><small>데이터는 MySQL 컨테이너(${U.esc(conn.host)})의 ${U.esc(conn.db)} 데이터베이스에 저장되어 있습니다.</small></article>`).join('')}</main></body></html>` };
      });
      await rt.forever();
      return 0;
    },
    async adminer(rt) {
      rt.err(`[${new Date().toUTCString()}] PHP 8.3.14 Development Server (http://[::]:8080) started\n`);
      rt.listen(8080, req => ({ status: 200, type: 'text/html', body: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Login - Adminer</title><style>body{font-family:Verdana,Arial,sans-serif;font-size:90%;margin:0}#menu{position:absolute;top:0;left:0;width:17em;padding:.8em 1em;background:#eee;height:100%}#content{margin-left:19em;padding:.8em}h1{font-size:150%;font-weight:normal;background:#eee;padding:.4em 1em;margin:0}table{border-collapse:collapse;margin:1em 0}th,td{border:1px solid #999;padding:.2em .4em;text-align:left}input,select{font-size:100%}</style></head><body><div id="menu"><h1><a href="#">Adminer</a> <span style="font-size:60%">4.8.1</span></h1></div><div id="content"><h2>Login</h2><table><tr><th>System<td><select><option>MySQL<option>PostgreSQL<option>SQLite</select><tr><th>Server<td><input value="db" size="20"><tr><th>Username<td><input value="root"><tr><th>Password<td><input type="password"><tr><th>Database<td><input></table><p><input type="submit" value="Login"></p><p style="color:#777">(시뮬레이터: Server 칸에는 localhost 가 아니라 DB 컨테이너 이름을 적습니다)</p></div></body></html>` }));
      await rt.forever();
      return 0;
    },
    async registry(rt) {
      const l = (m) => `time="${new Date().toISOString()}" level=info msg="${m}" go.version=go1.20.8 instance.id=${U.hex(8)}-${U.hex(4)} service=registry version=2.8.3\n`;
      rt.err(l('redis not configured') + l('Starting upload purge in 20m0s') + l('using inmemory blob descriptor cache') + l('listening on [::]:5000'));
      rt.listen(5000, req => {
        const eng = rt.engine;
        if (req.path === '/v2/' || req.path === '/v2') return { status: 200, body: '{}', type: 'application/json' };
        if (req.path.startsWith('/v2/_catalog')) {
          const repos = Array.from(new Set(Object.keys(eng.s.registry).map(k => k.replace(/^[^/]+\//, '').replace(/:[^:]+$/, ''))));
          return { status: 200, body: JSON.stringify({ repositories: repos }) + '\n', type: 'application/json' };
        }
        const m = req.path.match(/^\/v2\/(.+)\/tags\/list/);
        if (m) { const tags = Object.keys(eng.s.registry).filter(k => k.replace(/^[^/]+\//, '').replace(/:[^:]+$/, '') === m[1]).map(k => k.split(':').pop()); return tags.length ? { status: 200, body: JSON.stringify({ name: m[1], tags }) + '\n', type: 'application/json' } : { status: 404, body: '{"errors":[{"code":"NAME_UNKNOWN","message":"repository name not known to registry","detail":{"name":"' + m[1] + '"}}]}\n', type: 'application/json' }; }
        return { status: 404, body: '404 page not found\n', type: 'text/plain' };
      });
      await rt.forever();
      return 0;
    },
    async whoami(rt) {
      rt.err(`${new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/')} Starting up on port 80\n`);
      rt.listen(80, req => {
        const c = rt.c;
        const ips = ['127.0.0.1', '::1'].concat(Object.values(c.networks).map(n => n.ip).filter(Boolean));
        return { status: 200, type: 'text/plain; charset=utf-8', body: `Hostname: ${c.hostname}\n${ips.map(i => 'IP: ' + i).join('\n')}\nRemoteAddr: ${req.fromIp}:${40000 + (Math.random() * 20000 | 0)}\nGET ${req.path} HTTP/1.1\nHost: ${req.host}${req.port !== 80 ? ':' + req.port : ''}\nUser-Agent: ${req.from ? 'curl/8.11.0' : 'Mozilla/5.0'}\nAccept: */*\n` };
      });
      await rt.forever();
      return 0;
    },
    async web(rt) {
      const w = rt.img.web || { port: 80, title: 'Web', page: '' };
      rt.err(`ts=${new Date().toISOString()} level=INFO msg="Starting ${w.title}"\nts=${new Date().toISOString()} level=INFO msg="Server is ready to receive web requests." port=${w.port}\n`);
      await rt.sleep(500);
      rt.listen(w.port, req => ({ status: 200, type: 'text/html', body: WEB_PAGES[w.page] ? WEB_PAGES[w.page](rt) : `<h1>${w.title}</h1>` }));
      await rt.forever();
      return 0;
    }
  };
  const REDIS_DUMP = '/data/dump.rdb';
  const WP_INSTALL = `<!DOCTYPE html><html lang="en-US"><head><meta charset="utf-8"><title>WordPress &rsaquo; Installation</title><style>body{background:#f0f0f1;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#3c434a}#logo{text-align:center;margin:40px 0 10px;font-size:40px}.box{background:#fff;max-width:620px;margin:0 auto;padding:1em 2em 2em;box-shadow:0 1px 3px rgba(0,0,0,.13)}label{display:block;font-weight:600;margin-top:12px}input{width:100%;padding:6px;margin-top:4px;border:1px solid #8c8f94;border-radius:4px}a.button{display:inline-block;margin-top:18px;background:#2271b1;color:#fff;padding:8px 16px;border-radius:3px;text-decoration:none}</style></head><body><div id="logo">Ⓦ</div><div class="box"><h1>Welcome</h1><p>Welcome to the famous five-minute WordPress installation process! Just fill in the information below and you’ll be on your way to using the most extendable and powerful personal publishing platform in the world.</p><label>Site Title<input value="나의 도커 블로그"></label><label>Username<input value="admin"></label><a class="button" href="/?install=1">Install WordPress</a><p style="color:#777;font-size:12px">(시뮬레이터: 버튼을 누르면 MySQL 컨테이너에 테이블이 만들어집니다)</p></div></body></html>`;
  const WEB_PAGES = {
    prometheus: rt => `<!doctype html><html><head><title>Prometheus Time Series Collection and Processing Server</title><style>body{font-family:system-ui;margin:0}nav{background:#e6522c;color:#fff;padding:10px 18px;font-weight:700}main{padding:18px}input{width:70%;padding:8px}table{border-collapse:collapse;margin-top:14px}td,th{border:1px solid #ddd;padding:6px 10px}</style></head><body><nav>🔥 Prometheus &nbsp; Query · Alerts · Status</nav><main><input value="up"> <button>Execute</button><table><tr><th>Metric</th><th>Value</th></tr><tr><td>up{instance="localhost:9090", job="prometheus"}</td><td>1</td></tr></table></main></body></html>`,
    grafana: rt => `<!doctype html><html><head><title>Grafana</title><style>body{background:#111217;color:#ccccdc;font-family:Inter,system-ui;display:grid;place-items:center;height:100vh;margin:0}.box{background:#181b1f;padding:32px 40px;border-radius:6px;width:340px}input{width:100%;padding:8px;margin:6px 0 14px;background:#111217;border:1px solid #34373c;color:#fff}button{width:100%;padding:10px;background:#3d71d9;color:#fff;border:0;border-radius:3px}</style></head><body><div class="box"><h2>Welcome to Grafana</h2><label>Email or username</label><input value="admin"><label>Password</label><input type="password" value="admin"><button>Log in</button></div></body></html>`,
    portainer: rt => `<!doctype html><html><head><title>Portainer</title><style>body{font-family:system-ui;background:#f6f7fb;display:grid;place-items:center;height:100vh;margin:0}.box{background:#fff;padding:30px 40px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.08);width:380px}h2{color:#13bef9}input{width:100%;padding:8px;margin:6px 0 12px}</style></head><body><div class="box"><h2>portainer.io</h2><p>New Portainer installation — create the administrator user</p><input value="admin"><input type="password" placeholder="Password"><p style="font-size:12px;color:#888">(시뮬레이터: 실제 Portainer 는 /var/run/docker.sock 을 마운트해야 컨테이너를 관리할 수 있습니다)</p></div></body></html>`
  };

  /* nginx 설정 읽기: listen · root · proxy_pass */
  function nginxConf(fs) {
    const files = ['/etc/nginx/conf.d'].reduce((acc, d) => acc.concat((fs.stat(d) === 'dir' ? fs.ls(d) : []).filter(f => /\.conf$/.test(f)).map(f => d + '/' + f)), []);
    const main = fs.read('/etc/nginx/nginx.conf') || '';
    const texts = files.map(f => fs.read(f) || '');
    if (!/include\s+\/etc\/nginx\/conf\.d\/\*\.conf/.test(main)) texts.length = 0;
    texts.push(main);
    const servers = [];
    for (const t of texts) {
      if ((t.match(/\{/g) || []).length !== (t.match(/\}/g) || []).length) return { error: `unexpected end of file, expecting "}" in /etc/nginx/conf.d/default.conf` };
      const re = /server\s*\{/g; let m;
      while ((m = re.exec(t))) {
        const st = t.indexOf('{', m.index); let d = 0, e = st;
        for (; e < t.length; e++) { if (t[e] === '{') d++; if (t[e] === '}') { d--; if (!d) break; } }
        const body = t.slice(st + 1, e);
        const port = +((body.match(/listen\s+(?:\[::\]:)?(\d+)/) || [])[1] || 80);
        const root = (body.match(/root\s+([^;]+);/) || [])[1] || '/usr/share/nginx/html';
        const locs = [];
        body.replace(/location\s+(=\s*)?([^\s{]+)\s*\{([^}]*)\}/g, (_, eq, path, lb) => {
          locs.push({ path, exact: !!eq, root: ((lb.match(/root\s+([^;]+);/) || [])[1] || '').trim() || null, proxy: ((lb.match(/proxy_pass\s+([^;]+);/) || [])[1] || '').trim() || null, ret: (lb.match(/return\s+(\d+)\s*(?:"([^"]*)"|'([^']*)'|([^;]*))?;/) || null) });
        });
        if (!servers.some(s => s.port === port)) servers.push({ port, root: root.trim(), locs });
      }
    }
    if (!servers.length) servers.push({ port: 80, root: '/usr/share/nginx/html', locs: [] });
    return { servers };
  }
  async function nginxHandle(rt, sv, req) {
    const path = req.path.split('?')[0];
    const loc = sv.locs.filter(l => l.exact ? path === l.path : path.startsWith(l.path)).sort((a, b) => b.path.length - a.path.length)[0];
    if (loc && loc.ret) return { status: +loc.ret[1], body: (loc.ret[2] || loc.ret[3] || loc.ret[4] || '').trim(), type: 'text/plain' };
    if (loc && loc.proxy) {
      let target = loc.proxy.replace(/\/$/, '');
      const up = target.match(/^https?:\/\/([^/:]+)/);
      const rest = /^https?:\/\/[^/]+\/./.test(loc.proxy) ? path.slice(loc.path.length) : path;
      const url = target + (rest.startsWith('/') ? rest : '/' + rest) + (req.path.includes('?') ? '?' + req.path.split('?')[1] : '');
      const r = await rt.engine.http(rt.c, url, { method: req.method, headers: { 'User-Agent': 'nginx-proxy' } });
      if (r.error) {
        const t = new Date().toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/');
        rt.io.err(`${t} [error] 29#29: *1 ${/resolve/.test(r.error) ? `${up ? up[1] : '?'} could not be resolved (3: Host not found)` : 'connect() failed (111: Connection refused) while connecting to upstream'}, client: ${req.fromIp}, server: localhost, request: "${req.method} ${req.path} HTTP/1.1", upstream: "${url}", host: "localhost"\n`);
        return { status: 502, body: `<html>\r\n<head><title>502 Bad Gateway</title></head>\r\n<body>\r\n<center><h1>502 Bad Gateway</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n`, type: 'text/html' };
      }
      return r;
    }
    return staticServe(rt, (loc && loc.root) || sv.root, req, 'nginx');
  }

  /* ================================================================ 컨테이너 셸 */
  const CMDS = {};
  function need(tool, fn, opts) { fn.tool = tool; if (opts) Object.assign(fn, opts); return fn; }

  CMDS.ps = need('ps', c => {
    const { eng, ct } = c.sh;
    const { argv } = mainOf(eng, ct);
    const alp = /alpine|busybox/.test((eng.img(ct) || {}).os || '');
    const main = eng.kind(ct) === 'nginx' ? 'nginx: master process ' + argv.join(' ') : argv.join(' ');
    const rows = [[1, ct.user || 'root', main]];
    if (eng.kind(ct) === 'nginx') rows.push([29, 'nginx', 'nginx: worker process'], [30, 'nginx', 'nginx: worker process']);
    if (eng.kind(ct) === 'postgres') ['checkpointer', 'background writer', 'walwriter', 'autovacuum launcher', 'logical replication launcher'].forEach((n, i) => rows.push([27 + i, 'postgres', 'postgres: ' + n]));
    (c.sh.execs || []).forEach((x, i) => rows.push([40 + i * 7, c.sh.user, x]));
    rows.push([90 + (Math.random() * 20 | 0), c.sh.user, 'ps ' + c.args.join(' ')]);
    if (alp) { c.out('PID   USER     TIME  COMMAND\n' + rows.map(r => `${String(r[0]).padStart(5)} ${U.pad(r[1], 8)}  0:00 ${r[2]}`).join('\n') + '\n'); return; }
    if (c.args.some(a => /a|e|x/.test(a))) c.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' + rows.map(r => `${U.pad(r[1], 8)} ${String(r[0]).padStart(7)}  0.0  0.1  11404  7424 ?        Ss   ${new Date().toTimeString().slice(0, 5)}   0:00 ${r[2]}`).join('\n') + '\n');
    else c.out('    PID TTY          TIME CMD\n' + rows.slice(-2).map(r => `${String(r[0]).padStart(7)} pts/0    00:00:00 ${r[2].split(' ')[0]}`).join('\n') + '\n');
  });
  CMDS.top = need('top', c => { const s = c.sh.eng.stats(c.sh.ct); c.out(`Mem: ${U.size(s.mem, false)} used\nCPU:  ${s.cpu.toFixed(1)}% usr\nLoad average: 0.05 0.03 0.01 1/200 42\n  PID  PPID USER     STAT   VSZ %VSZ CPU %CPU COMMAND\n    1     0 root     S     1.6m   0%   0   0% ${mainOf(c.sh.eng, c.sh.ct).argv.join(' ')}\n`); });
  CMDS.free = need('free', c => { const lim = c.sh.ct.hostConfig.memory; c.out(`              total        used        free      shared  buff/cache   available\nMem:        8029968     1520312     5210044       10960     1299612     6509656\nSwap:       1048572           0     1048572\n`); if (lim) c.out(`(참고: free 는 호스트 전체 메모리를 보여 줍니다. 컨테이너 제한은 /sys/fs/cgroup/memory.max = ${lim})\n`); });
  CMDS.df = c => { c.out(`Filesystem      Size  Used Avail Use% Mounted on\noverlay          59G   12G   44G  22% /\ntmpfs            64M     0   64M   0% /dev\nshm              64M     0   64M   0% /dev/shm\n${(c.sh.ct.hostConfig.mounts || []).map(m => `/dev/vda1        59G   12G   44G  22% ${m.target}`).join('\n')}\n`.replace(/\n\n$/, '\n')); };
  CMDS.mount = c => { c.out(`overlay on / type overlay (rw,relatime,lowerdir=/var/lib/docker/overlay2/l/${U.hex(26).toUpperCase()},upperdir=/var/lib/docker/overlay2/${c.sh.ct.id}/diff,workdir=/var/lib/docker/overlay2/${c.sh.ct.id}/work)\nproc on /proc type proc (rw,nosuid,nodev,noexec,relatime)\ntmpfs on /dev type tmpfs (rw,nosuid,size=65536k,mode=755)\n${(c.sh.ct.hostConfig.mounts || []).map(m => `${m.type === 'bind' ? '/run/host_mark' + m.source : '/dev/vda1'} on ${m.target} type ${m.type === 'tmpfs' ? 'tmpfs' : 'ext4'} (${m.ro ? 'ro' : 'rw'},relatime)`).join('\n')}\n`); };
  CMDS.uptime = c => { const p = c.sh.eng.proc[c.sh.ct.id]; const m = p ? Math.round((Date.now() - p.startT) / 60000) : 0; c.out(` ${new Date().toTimeString().slice(0, 8)} up ${m} min,  0 users,  load average: 0.05, 0.03, 0.01\n`); };
  CMDS.kill = c => { const pid = c.args.filter(a => !a.startsWith('-')).pop(); if (pid === '1') { c.sh.eng.kill(c.sh.ct, c.args.includes('-9') ? 'KILL' : 'TERM'); return 0; } c.err(`kill: (${pid}) - No such process\n`); return 1; };
  CMDS.chmod = c => 0;
  CMDS.chown = c => { if (c.sh.user !== 'root') { c.err(`chown: changing ownership of '${c.args[c.args.length - 1]}': Operation not permitted\n`); return 1; } return 0; };
  CMDS.su = c => { c.err('su: must be run from a terminal\n'); return 1; };
  CMDS.sudo = c => { c.err(`${c.sh.name}: sudo: ${c.sh.name === 'bash' ? 'command not found' : 'not found'}\n`); return 127; };
  CMDS.systemctl = c => { c.err('System has not been booted with systemd as init system (PID 1). Can\'t operate.\nFailed to connect to bus: Host is down\n'); return 1; };
  CMDS.cat_os = null;

  // 네트워크 도구
  CMDS.ping = need('ping', async c => {
    const a = c.args; let n = null;
    const ci = a.indexOf('-c'); if (ci >= 0) n = +a[ci + 1];
    const host = a.filter((x, i) => !x.startsWith('-') && a[i - 1] !== '-c' && a[i - 1] !== '-W' && a[i - 1] !== '-w').pop();
    if (!host) { c.err('BusyBox v1.36.1 (2024-06-10 07:11:47 UTC) multi-call binary.\n\nUsage: ping [OPTIONS] HOST\n'); return 1; }
    const r = c.sh.eng.ping(c.sh.ct, host);
    if (r.error) { c.err((r.dns ? `ping: bad address '${host}'` : r.error) + '\n'); return 1; }
    c.out(`PING ${host} (${r.ip}): 56 data bytes\n`);
    const count = n || (c.io.bg || c.io.piped ? 4 : 1e9);
    let i = 0, got = 0;
    for (; i < count; i++) {
      if (c.io.signal && c.io.signal.aborted) break;
      if (!r.timeout) { c.out(`64 bytes from ${r.ip}: seq=${i} ttl=64 time=${(r.ms * (0.8 + Math.random() * 0.4)).toFixed(3)} ms\n`); got++; }
      if (i < count - 1 && !(await U.sleep(r.timeout ? 1000 : 700, c.io.signal))) { i++; break; }
    }
    c.out(`\n--- ${host} ping statistics ---\n${i} packets transmitted, ${got} packets received, ${i ? Math.round(100 * (i - got) / i) : 0}% packet loss\n${got ? `round-trip min/avg/max = ${(r.ms * 0.8).toFixed(3)}/${r.ms.toFixed(3)}/${(r.ms * 1.2).toFixed(3)} ms\n` : ''}`);
    return got ? 0 : 1;
  });
  async function httpCmd(c, style) {
    const a = c.args;
    let url = null, method = null, data = null, out = null, silent = false, head = false, inc = false, fail = false, showErr = false, quietW = false, spider = false, maxTime = null;
    const headers = {};
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x === '-X' || x === '--request') method = a[++i];
      else if (x === '-d' || x === '--data' || x === '--data-raw') { data = a[++i]; method = method || 'POST'; }
      else if (x === '-H' || x === '--header') { const h = a[++i] || ''; const k = h.split(':')[0]; headers[k] = h.slice(k.length + 1).trim(); }
      else if (x === '-o' || x === '-O' && style === 'wget') out = a[++i];
      else if (x === '-O' && style === 'curl') out = '__remote';
      else if (x === '--max-time' || x === '-m' || x === '-T' || x === '--timeout') maxTime = a[++i];
      else if (/^-[a-zA-Z]+$/.test(x)) { if (x.includes('s') && style === 'curl') silent = true; if (x.includes('S')) showErr = true; if (x.includes('I')) head = true; if (x.includes('i')) inc = true; if (x.includes('f')) fail = true; if (x.includes('q')) quietW = true; if (x === '-qO-' || x === '-O-') out = '-'; if (x.includes('L')) {} if (x.includes('v') && style === 'curl') inc = true; }
      else if (x === '--spider') spider = true;
      else if (x === '--fail') fail = true;
      else if (x === '--silent') silent = true;
      else if (x === '-qO-') { quietW = true; out = '-'; }
      else if (!x.startsWith('-')) url = x;
    }
    if (!url) { c.err(style === 'curl' ? "curl: try 'curl --help' or 'curl --manual' for more information\n" : 'wget: missing URL\n'); return 2; }
    const from = c.sh.ct || null;
    if (!headers['User-Agent']) headers['User-Agent'] = style === 'curl' ? 'curl/8.11.0' : 'Wget';
    const r = await c.sh.eng.http(from, url, { method: method || (head ? 'HEAD' : 'GET'), headers, body: data });
    if (r.error) {
      if (style === 'curl') { if (!silent || showErr) c.err(`curl: (${r.code}) ${r.error}\n`); return r.code || 7; }
      const host = (url.match(/\/\/([^/:]+)/) || [])[1] || url;
      c.err(r.code === 6 ? `wget: bad address '${host}'\n` : r.reset ? `wget: error getting response: Connection reset by peer\n` : `Connecting to ${host.replace(/:.*/, '')}${url.match(/:(\d+)/) ? ':' + url.match(/:(\d+)/g).pop().slice(1) : ''} (${host})\nwget: can't connect to remote host (${host}): Connection refused\n`);
      return r.code === 6 ? 1 : 4;
    }
    const st = r.status;
    const reason = { 200: 'OK', 201: 'Created', 301: 'Moved Permanently', 302: 'Found', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' }[st] || '';
    const hdr = `HTTP/1.1 ${st} ${reason}\nServer: ${r.server || 'simulated'}\nDate: ${new Date().toUTCString()}\nContent-Type: ${r.type}\nContent-Length: ${new Blob([r.body || '']).size}\nConnection: keep-alive\n${Object.entries(r.headers || {}).map(([k, v]) => `${k}: ${v}\n`).join('')}\n`;
    if (style === 'curl') {
      if (fail && st >= 400) { if (!silent || showErr) c.err(`curl: (22) The requested URL returned error: ${st}\n`); return 22; }
      if (head) { c.out(hdr); return 0; }
      const body = (inc ? hdr : '') + (r.body || '');
      if (out && out !== '-') { const p = c.sh.abs(out === '__remote' ? (url.split('/').pop() || 'index.html') : out); try { c.sh.fs.write(p, r.body || ''); } catch (e) { c.err(`curl: (23) Failure writing output to destination\n`); return 23; } if (!silent) c.err(`  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n100  ${String((r.body || '').length).padStart(4)}  100  ${String((r.body || '').length).padStart(4)}    0     0   152k      0 --:--:-- --:--:-- --:--:--  152k\n`); return 0; }
      c.out(body);
      return 0;
    }
    // wget
    if (spider) { if (!quietW) c.err(`Connecting to ${url}\nremote file exists\n`); return st >= 400 ? 8 : 0; }
    if (st >= 400) { c.err(`${quietW ? '' : `Connecting to ${url}\n`}wget: server returned error: HTTP/1.1 ${st} ${reason}\n`); return 8; }
    if (out === '-') { c.out(r.body || ''); return 0; }
    const fname = out || (url.replace(/\?.*/, '').split('/').pop() || 'index.html');
    try { c.sh.fs.write(c.sh.abs(fname), r.body || ''); } catch (e) { c.err(`wget: can't open '${fname}': ${e.message}\n`); return 1; }
    if (!quietW) c.err(`Connecting to ${url.replace(/^https?:\/\//, '').split('/')[0]}\nsaving to '${fname}'\n${fname}            100% |********************************|   ${(r.body || '').length}  0:00:00 ETA\n'${fname}' saved\n`);
    return 0;
  }
  CMDS.curl = need('curl', c => httpCmd(c, 'curl'));
  CMDS.wget = need('wget', c => httpCmd(c, 'wget'));
  function dnsAnswer(c, name) {
    const eng = c.sh.eng, ct = c.sh.ct;
    const userNet = Object.keys(ct.networks).some(n => !['bridge', 'host', 'none'].includes(n));
    const r = eng.resolveHost(ct, name);
    const ips = [];
    if (r.c && !r.self) {
      // 같은 이름(서비스)의 모든 컨테이너 → DNS 라운드 로빈
      const alive = eng.s.containers.filter(x => x.state.status === 'running' && Object.keys(x.networks).some(n => ct.networks[n] && !['bridge'].includes(n)) && (x.name === name || (x.compose && x.compose.service === name) || Object.values(x.networks).some(nn => (nn.aliases || []).includes(name))));
      (alive.length ? alive : [r.c]).forEach(x => { const shared = Object.entries(x.networks).find(([n]) => ct.networks[n]); ips.push(shared ? shared[1].ip : eng.ipOf(x)); });
    } else if (r.kube) ips.push(r.ip || '10.96.0.10');
    else if (r.host) ips.push('192.168.65.254');
    else if (!r.error) ips.push('127.0.0.1');
    return { server: userNet ? '127.0.0.11' : '192.168.65.7', ips, ext: r.error && /\./.test(name) };
  }
  CMDS.nslookup = need('nslookup', c => {
    const name = c.args.filter(a => !a.startsWith('-'))[0];
    if (!name) { c.err('Usage: nslookup HOST [DNS_SERVER]\n'); return 1; }
    const a = dnsAnswer(c, name);
    c.out(`Server:\t\t${a.server}\nAddress:\t${a.server}:53\n\n`);
    if (a.ext) { c.out(`Non-authoritative answer:\nName:\t${name}\nAddress: 93.184.215.14\n\n`); return 0; }
    if (!a.ips.length) { c.out(`** server can't find ${name}: NXDOMAIN\n\n`); return 1; }
    c.out(`Non-authoritative answer:\n${a.ips.map(ip => `Name:\t${name}\nAddress: ${ip}`).join('\n')}\n\n`);
  });
  CMDS.dig = need('dig', c => {
    const name = c.args.filter(a => !a.startsWith('-') && !a.startsWith('+'))[0] || '.';
    const a = dnsAnswer(c, name); const short = c.args.includes('+short');
    if (short) { c.out(a.ips.concat(a.ext ? ['93.184.215.14'] : []).join('\n') + (a.ips.length || a.ext ? '\n' : '')); return 0; }
    c.out(`\n; <<>> DiG 9.18.27 <<>> ${name}\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ${a.ips.length || a.ext ? 'NOERROR' : 'NXDOMAIN'}, id: ${Math.random() * 60000 | 0}\n\n;; ANSWER SECTION:\n${a.ips.map(ip => `${name}.\t\t600\tIN\tA\t${ip}`).join('\n')}\n\n;; SERVER: ${a.server}#53(${a.server}) (UDP)\n`);
  });
  CMDS.getent = c => { if (c.args[0] !== 'hosts') return 1; const a = dnsAnswer(c, c.args[1] || ''); if (!a.ips.length) return 2; c.out(a.ips.map(ip => `${ip}       ${c.args[1]}`).join('\n') + '\n'); };
  CMDS.host = need('dig', c => { const a = dnsAnswer(c, c.args[0] || ''); if (!a.ips.length) { c.out(`Host ${c.args[0]} not found: 3(NXDOMAIN)\n`); return 1; } a.ips.forEach(ip => c.out(`${c.args[0]} has address ${ip}\n`)); });
  function ipAddr(c) {
    let i = 1;
    c.out(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever\n`);
    Object.entries(c.sh.ct.networks).forEach(([n, v], k) => {
      if (!v.ip) return;
      const net = c.sh.eng.network(n);
      const bits = net && net.subnet ? net.subnet.split('/')[1] : '16';
      c.out(`${++i + 20}: eth${k}@if${i + 21}: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP\n    link/ether ${v.mac} brd ff:ff:ff:ff:ff:ff\n    inet ${v.ip}/${bits} brd ${v.ip.replace(/\.\d+$/, '.255')} scope global eth${k}\n       valid_lft forever preferred_lft forever\n`);
    });
  }
  CMDS.ip = need('ip', c => { if (/^(a|addr|address)$/.test(c.args[0] || '')) return ipAddr(c); if (/^(r|route)$/.test(c.args[0] || '')) { const n = Object.values(c.sh.ct.networks)[0]; if (n && n.ip) c.out(`default via ${n.ip.replace(/\.\d+$/, '.1')} dev eth0\n${n.ip.replace(/\.\d+$/, '.0')}/16 dev eth0 scope link  src ${n.ip}\n`); return 0; } c.err('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\n'); return 1; });
  CMDS.ifconfig = need('ip', c => ipAddr(c));
  CMDS.hostname = c => { if (c.args[0] === '-i' || c.args[0] === '-I') { c.out(Object.values(c.sh.ct.networks).map(n => n.ip).filter(Boolean).join(' ') + '\n'); return; } c.out(c.sh.host + '\n'); };
  CMDS.ss = need('ss', c => { const p = c.sh.eng.proc[c.sh.ct.id]; c.out('Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port\n' + Object.entries((p && p.listeners) || {}).map(([port, L]) => `tcp   LISTEN 0      511          ${L.bind}:${port}        0.0.0.0:*`).join('\n') + '\n'); });
  CMDS.netstat = need('netstat', c => { const p = c.sh.eng.proc[c.sh.ct.id]; c.out('Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State\n' + Object.entries((p && p.listeners) || {}).map(([port, L]) => `tcp        0      0 ${U.pad(L.bind + ':' + port, 23)} 0.0.0.0:*               LISTEN`).join('\n') + '\n'); });
  CMDS.nc = need('nc', c => { const a = c.args.filter(x => !x.startsWith('-')); const t = tcp(c.sh.eng, c.sh.ct, a[0], +a[1]); if (t.error) { c.err(`nc: ${a[0]} (${a[0]}:${a[1]}): Connection refused\n`); return 1; } if (c.args.some(x => x.includes('z'))) c.out(`${a[0]} (${t.ip}:${a[1]}) open\n`); return 0; });

  // 패키지 관리자
  const APT_KNOWN = ['curl', 'wget', 'iputils-ping', 'ping', 'vim', 'nano', 'procps', 'net-tools', 'dnsutils', 'iproute2', 'git', 'python3', 'python3-pip', 'htop', 'jq', 'less', 'ca-certificates', 'gcc', 'build-essential', 'netcat-openbsd', 'gnupg', 'unzip', 'tree', 'postgresql-client', 'default-mysql-client', 'redis-tools', 'stress', 'libpq-dev', 'openssh-client', 'tzdata', 'locales', 'fortune', 'cowsay', 'figlet', 'nodejs', 'npm', 'iputils-tracepath', 'telnet', 'sqlite3', 'make', 'cron'];
  const PKG_TOOLS = { 'iputils-ping': ['ping'], procps: ['ps', 'top', 'free'], 'net-tools': ['ifconfig', 'netstat'], dnsutils: ['dig', 'nslookup'], 'bind-tools': ['dig', 'nslookup'], iproute2: ['ip', 'ss'], vim: ['vi', 'vim'], nano: ['nano'], curl: ['curl'], wget: ['wget'], git: ['git'], python3: ['python3', 'python'], 'python3-pip': ['pip', 'pip3'], py3_pip: ['pip'], htop: ['htop'], jq: ['jq'], 'postgresql-client': ['psql', 'pg_isready'], 'default-mysql-client': ['mysql', 'mysqladmin'], 'mysql-client': ['mysql', 'mysqladmin'], 'redis-tools': ['redis-cli'], redis: ['redis-cli'], stress: ['stress'], 'stress-ng': ['stress-ng'], 'netcat-openbsd': ['nc'], 'netcat-openbsd ': ['nc'], bash: ['bash'], tree: ['tree'], nodejs: ['node'], npm: ['npm'], cowsay: ['cowsay'], figlet: ['figlet'], fortune: ['fortune'], 'build-essential': ['gcc', 'make'], gcc: ['gcc'], make: ['make'], sqlite3: ['sqlite3'], telnet: ['telnet'], tzdata: [], 'ca-certificates': [], openjdk: ['java'] };
  const APK_KNOWN = APT_KNOWN.concat(['bash', 'bind-tools', 'busybox-extras', 'py3-pip', 'postgresql-client', 'mysql-client', 'redis', 'stress-ng', 'shadow', 'tini', 'openjdk17', 'go']);
  function installPkgs(c, names, pm) {
    const ct = c.sh.ct || null;
    const target = c.sh.pkgTarget || (ct ? ct.pkgs : null);
    if (!target) return;
    names.forEach(n => {
      const tools = PKG_TOOLS[n] || (pm === 'apk' && n === 'py3-pip' ? ['pip'] : pm === 'apk' && /^openjdk/.test(n) ? ['java', 'javac'] : n === 'go' ? ['go'] : [n]);
      tools.forEach(t => { if (!target.includes('bin:' + t)) target.push('bin:' + t); });
      if (!target.includes('pkg:' + n)) target.push('pkg:' + n);
    });
    if (c.sh.onPkg) c.sh.onPkg(); else if (ct) c.sh.eng.changed('container');
  }
  CMDS['apt-get'] = need('apt-get', async c => {
    const a = c.args.filter(x => !x.startsWith('-'));
    const sub = a[0];
    if (c.sh.user !== 'root') { c.err('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n'); return 100; }
    if (c.sh.offline) { c.err(`Err:1 http://deb.debian.org/debian bookworm InRelease\n  Temporary failure resolving 'deb.debian.org'\nW: Failed to fetch http://deb.debian.org/debian/dists/bookworm/InRelease  Temporary failure resolving 'deb.debian.org'\n`); return sub === 'update' ? 0 : 100; }
    const os = c.sh.osId || 'debian';
    const mirror = os === 'ubuntu' ? 'http://archive.ubuntu.com/ubuntu noble' : 'http://deb.debian.org/debian bookworm';
    if (sub === 'update') {
      c.out(`Get:1 ${mirror} InRelease [151 kB]\nGet:2 ${mirror}-updates InRelease [55.4 kB]\nGet:3 ${mirror.replace('deb.debian.org/debian', 'deb.debian.org/debian-security')}-security InRelease [48.0 kB]\n`);
      await U.sleep(c.sh.fast ? 30 : 500, c.io.signal);
      c.out(`Get:4 ${mirror}/main amd64 Packages [8792 kB]\nFetched 9047 kB in 1s (7921 kB/s)\nReading package lists... Done\n`);
      c.sh.aptUpdated = true;
      if (c.sh.ct) c.sh.ct.aptUpdated = true;
      return 0;
    }
    if (sub === 'install') {
      const names = a.slice(1);
      if (!c.sh.aptUpdated && !(c.sh.ct && c.sh.ct.aptUpdated)) { c.out('Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n'); c.err(`E: Unable to locate package ${names[0]}\n`); return 100; }
      const bad = names.find(n => !APT_KNOWN.includes(n.replace(/=.*/, '')) && !/^lib|^python3-/.test(n));
      c.out('Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n');
      if (bad) { c.err(`E: Unable to locate package ${bad}\n`); return 100; }
      if (!c.args.includes('-y') && !c.args.includes('--yes') && !c.sh.interactive) { c.out(`The following NEW packages will be installed:\n  ${names.join(' ')}\nDo you want to continue? [Y/n] Abort.\n`); return 1; }
      c.out(`The following NEW packages will be installed:\n  ${names.join(' ')}\n0 upgraded, ${names.length} newly installed, 0 to remove and 0 not upgraded.\nNeed to get ${(names.length * 0.4 + 0.3).toFixed(1)} MB of archives.\n`);
      await U.sleep(c.sh.fast ? 30 : 700, c.io.signal);
      names.forEach((n, i) => c.out(`Get:${i + 1} ${mirror}/main amd64 ${n} amd64 [${(300 + i * 57)} kB]\n`));
      names.forEach(n => c.out(`Selecting previously unselected package ${n}.\nUnpacking ${n} ...\nSetting up ${n} ...\n`));
      installPkgs(c, names.map(n => n.replace(/=.*/, '')), 'apt');
      return 0;
    }
    if (sub === 'remove' || sub === 'purge' || sub === 'clean' || sub === 'autoremove') { c.out('Reading package lists... Done\n'); return 0; }
    if (sub === 'upgrade') { c.out('Reading package lists... Done\nCalculating upgrade... Done\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n'); return 0; }
    c.err(`E: Invalid operation ${sub || ''}\n`); return 100;
  });
  CMDS.apt = need('apt', c => CMDS['apt-get'](c));
  CMDS.apk = need('apk', async c => {
    const a = c.args.filter(x => !x.startsWith('-'));
    if (c.sh.user !== 'root') { c.err('ERROR: Unable to lock database: Permission denied\nERROR: Failed to open apk database: Permission denied\n'); return 99; }
    if (a[0] === 'update') { c.out('fetch https://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86_64/APKINDEX.tar.gz\nfetch https://dl-cdn.alpinelinux.org/alpine/v3.20/community/x86_64/APKINDEX.tar.gz\nv3.20.3-190-g0a1f6b1b3e0 [https://dl-cdn.alpinelinux.org/alpine/v3.20/main]\nOK: 24164 distinct packages available\n'); return 0; }
    if (a[0] === 'add') {
      const names = a.slice(1);
      const bad = names.find(n => !APK_KNOWN.includes(n));
      if (!c.args.includes('--no-cache')) c.out('fetch https://dl-cdn.alpinelinux.org/alpine/v3.20/main/x86_64/APKINDEX.tar.gz\nfetch https://dl-cdn.alpinelinux.org/alpine/v3.20/community/x86_64/APKINDEX.tar.gz\n');
      if (bad) { c.err(`ERROR: unable to select packages:\n  ${bad} (no such package):\n    required by: world[${bad}]\n`); return 1; }
      await U.sleep(c.sh.fast ? 30 : 400, c.io.signal);
      names.forEach((n, i) => c.out(`(${i + 1}/${names.length}) Installing ${n} (${['8.11.0-r2', '5.2.26-r0', '1.36.1-r29'][i % 3]})\n`));
      c.out(`Executing busybox-1.36.1-r29.trigger\nOK: ${12 + names.length * 3} MiB in ${20 + names.length} packages\n`);
      installPkgs(c, names, 'apk');
      return 0;
    }
    if (a[0] === 'del') { c.out('OK: 12 MiB in 20 packages\n'); return 0; }
    c.out('apk-tools 2.14.4, compiled for x86_64.\n'); return 0;
  });
  CMDS.pip = need('pip', async c => {
    const a = c.args;
    if (a[0] === '--version' || a[0] === '-V') { c.out('pip 24.2 from /usr/local/lib/python3.12/site-packages/pip (python 3.12)\n'); return 0; }
    if (a[0] === 'list' || a[0] === 'freeze') { const pk = [].concat((c.sh.eng && c.sh.ct && (c.sh.eng.img(c.sh.ct) || {}).pkgs) || [], (c.sh.ct && c.sh.ct.pkgs) || [], c.sh.pkgTarget || []).filter(x => x.startsWith('py:')); c.out((a[0] === 'list' ? 'Package    Version\n---------- -------\npip        24.2\n' : '') + Array.from(new Set(pk)).map(x => a[0] === 'list' ? U.pad(x.slice(3), 10) + ' 1.0.0' : x.slice(3) + '==1.0.0').join('\n') + '\n'); return 0; }
    if (a[0] !== 'install') { c.err(`ERROR: unknown command "${a[0] || ''}"\n`); return 1; }
    let specs = [];
    for (let i = 1; i < a.length; i++) {
      if (a[i] === '-r' || a[i] === '--requirement') { const f = c.sh.fs.read(c.sh.abs(a[++i])); if (f == null) { c.err(`ERROR: Could not open requirements file: [Errno 2] No such file or directory: '${a[i]}'\n`); return 1; } specs = specs.concat(f.split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean)); }
      else if (!a[i].startsWith('-')) specs.push(a[i]);
    }
    if (c.sh.offline) { c.err(`WARNING: Retrying (Retry(total=4, connect=None, read=None, redirect=None, status=None)) after connection broken by 'NewConnectionError: Failed to establish a new connection: [Errno -3] Temporary failure in name resolution'\nERROR: Could not find a version that satisfies the requirement ${specs[0]} (from versions: none)\n`); return 1; }
    const bad = specs.find(s => /^(flsk|flaks|reddis|fask)$/i.test(s.split(/[=<>]/)[0]));
    if (bad) { c.out(`Collecting ${bad}\n`); c.err(`ERROR: Could not find a version that satisfies the requirement ${bad} (from versions: none)\nERROR: No matching distribution found for ${bad}\n`); return 1; }
    for (const s of specs) { c.out(`Collecting ${s}\n  Downloading ${s.split(/[=<>]/)[0].toLowerCase()}-${(s.match(/==([\d.]+)/) || [0, '3.1.0'])[1]}-py3-none-any.whl (${(100 + s.length * 17)} kB)\n`); await U.sleep(c.sh.fast ? 10 : 120, c.io.signal); }
    const names = specs.reduce((acc, s) => acc.concat(Code.pipNames(s)), []);
    c.out(`Installing collected packages: ${specs.map(s => s.split(/[=<>]/)[0]).join(', ')}\nSuccessfully installed ${specs.map(s => s.split(/[=<>]/)[0] + '-' + ((s.match(/==([\d.]+)/) || [0, '3.1.0'])[1])).join(' ')}\n`);
    if (c.sh.user === 'root' && !c.sh.building) c.err(`WARNING: Running pip as the 'root' user can result in broken permissions and conflicting behaviour with the system package manager, possibly rendering your system unusable. It is recommended to use a virtual environment instead: https://pip.pypa.io/warnings/venv. Use the --root-user-action option if you know what you are doing and want to suppress this warning.\n`);
    const target = c.sh.pkgTarget || (c.sh.ct && c.sh.ct.pkgs);
    if (target) names.forEach(n => { if (!target.includes('py:' + n)) target.push('py:' + n); });
    if (specs.some(s => /^(flask|gunicorn|uvicorn)/i.test(s)) && target) specs.forEach(s => { const b = s.split(/[=<>\[]/)[0].toLowerCase(); if (['flask', 'gunicorn', 'uvicorn'].includes(b) && !target.includes('bin:' + b)) target.push('bin:' + b); });
    if (c.sh.onPkg) c.sh.onPkg(); else if (c.sh.ct) c.sh.eng.changed('container');
    return 0;
  });
  CMDS.pip3 = CMDS.pip;
  CMDS.npm = need('npm', async c => {
    const a = c.args;
    if (a[0] === '-v' || a[0] === '--version') { c.out('10.9.0\n'); return 0; }
    if (a[0] === 'install' || a[0] === 'i' || a[0] === 'ci') {
      const pjPath = c.sh.abs('package.json');
      const pj = c.sh.fs.read(pjPath);
      let deps = a.slice(1).filter(x => !x.startsWith('-'));
      if (!deps.length) {
        if (pj == null) { c.err(`npm error code ENOENT\nnpm error syscall open\nnpm error path ${pjPath}\nnpm error errno -2\nnpm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '${pjPath}'\n`); return 254; }
        let o = {}; try { o = JSON.parse(pj); } catch (e) { c.err(`npm error code EJSONPARSE\nnpm error JSON.parse Invalid package.json: ${e.message}\n`); return 1; }
        deps = Object.keys(Object.assign({}, o.dependencies, a[0] === 'ci' && c.args.includes('--omit=dev') ? {} : o.devDependencies || {}));
        if (a[0] === 'ci' && c.sh.fs.read(c.sh.abs('package-lock.json')) == null) { c.err('npm error code EUSAGE\nnpm error\nnpm error The `npm ci` command can only install with an existing package-lock.json or\nnpm error npm-shrinkwrap.json with lockfileVersion >= 1.\n'); return 1; }
      }
      if (c.sh.offline) { c.err('npm error code EAI_AGAIN\nnpm error syscall getaddrinfo\nnpm error errno EAI_AGAIN\nnpm error request to https://registry.npmjs.org/express failed, reason: getaddrinfo EAI_AGAIN registry.npmjs.org\n'); return 1; }
      await U.sleep(c.sh.fast ? 30 : 600, c.io.signal);
      const n = deps.length ? deps.length * 23 + 40 : 1;
      c.out(`\nadded ${n} packages, and audited ${n + 1} packages in ${(1 + deps.length * 0.6).toFixed(0)}s\n\n${Math.max(1, deps.length * 4)} packages are looking for funding\n  run \`npm fund\` for details\n\nfound 0 vulnerabilities\n`);
      const target = c.sh.pkgTarget || (c.sh.ct && c.sh.ct.pkgs);
      if (target) deps.forEach(d => { const nm = d.replace(/@[^@/]*$/, '') || d; if (!target.includes('npm:' + nm)) target.push('npm:' + nm); });
      try { c.sh.fs.mkdir(c.sh.abs('node_modules')); c.sh.fs.write(c.sh.abs('node_modules/.package-lock.json'), '{"name":"app","lockfileVersion":3}'); } catch (_) {}
      if (!c.sh.fs.read(c.sh.abs('package-lock.json')) && pj) try { c.sh.fs.write(c.sh.abs('package-lock.json'), JSON.stringify({ name: 'app', lockfileVersion: 3, packages: {} }, null, 2)); } catch (_) {}
      if (c.sh.onPkg) c.sh.onPkg(); else if (c.sh.ct) c.sh.eng.changed('container');
      return 0;
    }
    if (a[0] === 'run' && a[1] === 'build') { c.out(`\n> app@1.0.0 build\n> vite build\n\nvite v5.4.11 building for production...\n✓ 32 modules transformed.\ndist/index.html                  0.46 kB │ gzip:  0.30 kB\ndist/assets/index-${U.hex(8)}.js   143.36 kB │ gzip: 46.10 kB\n✓ built in 1.21s\n`); try { c.sh.fs.mkdir(c.sh.abs('dist')); c.sh.fs.write(c.sh.abs('dist/index.html'), (c.sh.fs.read(c.sh.abs('index.html')) || '<!doctype html><html><body><div id="app">React/Vite 앱 (빌드 결과)</div></body></html>')); } catch (_) {} return 0; }
    if (a[0] === 'init') { c.sh.fs.write(c.sh.abs('package.json'), JSON.stringify({ name: 'app', version: '1.0.0', main: 'index.js', scripts: { start: 'node index.js' } }, null, 2) + '\n'); c.out('Wrote to package.json\n'); return 0; }
    c.err(`Unknown command: "${a[0] || ''}"\n`); return 1;
  });
  CMDS.go = need('go', async c => {
    if (c.args[0] === 'version') { c.out('go version go1.23.3 linux/amd64\n'); return 0; }
    if (c.args[0] === 'mod') { if (c.args[1] === 'download' || c.args[1] === 'tidy') { await U.sleep(c.sh.fast ? 10 : 300, c.io.signal); c.out(c.args[1] === 'tidy' ? '' : ''); return 0; } if (c.args[1] === 'init') { c.sh.fs.write(c.sh.abs('go.mod'), `module ${c.args[2] || 'app'}\n\ngo 1.23\n`); c.err(`go: creating new go.mod: module ${c.args[2] || 'app'}\n`); return 0; } }
    if (c.args[0] === 'build') {
      const oi = c.args.indexOf('-o'); const outName = oi >= 0 ? c.args[oi + 1] : 'app';
      const srcF = c.args.filter((x, i) => !x.startsWith('-') && i > 0 && c.args[i - 1] !== '-o' && x !== 'build').pop() || '.';
      const files = c.sh.fs.stat(c.sh.abs(srcF)) === 'dir' ? Object.entries(c.sh.fs.walk(c.sh.abs(srcF))).filter(([k]) => /\.go$/.test(k)).map(([, v]) => v) : [c.sh.fs.read(c.sh.abs(srcF))].filter(x => x != null);
      if (!files.length) { c.err(`no Go files in ${c.sh.abs(srcF)}\n`); return 1; }
      const src = files.join('\n');
      if (!/package main/.test(src)) { c.err('go: cannot build: no main package\n'); return 1; }
      await U.sleep(c.sh.fast ? 30 : 900, c.io.signal);
      c.sh.fs.write(c.sh.abs(outName), Code.goCompile(src));
      return 0;
    }
    if (c.args[0] === 'run') { const f = c.sh.fs.read(c.sh.abs(c.args[1] || 'main.go')); if (f == null) { c.err(`stat ${c.args[1]}: no such file or directory\n`); return 1; } const g = Code.goMeta(Code.goCompile(f)); g.prints.forEach(x => c.out(x.endsWith('\n') ? x : x + '\n')); return 0; }
    c.out('Go is a tool for managing Go source code.\n'); return 2;
  });
  CMDS.mvn = need('mvn', async c => {
    c.out('[INFO] Scanning for projects...\n[INFO] \n[INFO] --------------------------< com.example:demo >---------------------------\n[INFO] Building demo 0.0.1-SNAPSHOT\n');
    await U.sleep(c.sh.fast ? 30 : 900, c.io.signal);
    if (c.args.includes('package') || c.args.includes('install')) {
      const routes = [];
      const all = c.sh.fs.walk(c.sh.abs('src'));
      Object.values(all).forEach(s => { s.replace(/@GetMapping\(\s*"([^"]+)"\s*\)[\s\S]*?return\s+"([^"]*)"/g, (_, p, t) => routes.push({ path: p, text: t })); });
      try { c.sh.fs.mkdir(c.sh.abs('target')); } catch (_) {}
      c.sh.fs.write(c.sh.abs('target/demo-0.0.1-SNAPSHOT.jar'), 'PK JAR ' + JSON.stringify({ routes, port: 8080 }));
      c.out('[INFO] Building jar: ' + c.sh.abs('target/demo-0.0.1-SNAPSHOT.jar') + '\n');
    }
    c.out('[INFO] ------------------------------------------------------------------------\n[INFO] BUILD SUCCESS\n[INFO] ------------------------------------------------------------------------\n');
    return 0;
  }, { always: false });
  CMDS.java = need('java', c => { if (c.args[0] === '-version' || c.args[0] === '--version') { c.err('openjdk version "21.0.5" 2024-10-15 LTS\nOpenJDK Runtime Environment Temurin-21.0.5+11 (build 21.0.5+11-LTS)\nOpenJDK 64-Bit Server VM Temurin-21.0.5+11 (build 21.0.5+11-LTS, mixed mode, sharing)\n'); return 0; } c.err('Usage: java [options] <mainclass> [args...]\n'); return 1; });
  CMDS.git = need('git', c => { if (c.args[0] === '--version') { c.out('git version 2.39.5\n'); return 0; } if (c.args[0] === 'clone') { c.out(`Cloning into '${(c.args[1] || '').split('/').pop().replace(/\.git$/, '')}'...\n`); return 0; } c.out('usage: git [--version] [--help] <command> [<args>]\n'); return 1; });
  CMDS.gcc = need('gcc', c => { if (c.args.includes('--version')) { c.out('gcc (Debian 12.2.0-14) 12.2.0\n'); return 0; } const oi = c.args.indexOf('-o'); if (oi >= 0) c.sh.fs.write(c.sh.abs(c.args[oi + 1]), '\x7fELF (binary)'); return 0; });
  CMDS.make = need('make', c => { c.out("make: *** No targets specified and no makefile found.  Stop.\n"); return 2; });
  CMDS.jq = need('jq', c => { try { const o = JSON.parse(c.stdin || 'null'); const q = c.args.filter(a => !a.startsWith('-'))[0] || '.'; let v = o; q.replace(/^\./, '').split('.').filter(Boolean).forEach(k => { v = v == null ? null : v[k.replace(/\[\]$/, '')]; }); c.out((c.args.includes('-r') && typeof v === 'string' ? v : JSON.stringify(v, null, 2)) + '\n'); } catch (e) { c.err('jq: error (at <stdin>:1): Cannot parse input\n'); return 5; } });
  CMDS.cowsay = need('cowsay', c => { const t = c.args.join(' ') || (c.stdin || '').trim() || 'Moo'; c.out(` ${'_'.repeat(t.length + 2)}\n< ${t} >\n ${'-'.repeat(t.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||\n`); });
  CMDS.figlet = need('figlet', c => { c.out(`  ${(c.args.join(' ') || 'Docker').split('').join(' ')}\n  ${'='.repeat((c.args.join(' ') || 'Docker').length * 2)}\n`); });
  CMDS.fortune = need('fortune', c => { const f = ['Build once, run anywhere.', 'It works on my machine. — 그래서 컨테이너가 생겼습니다.', 'Cattle, not pets.', 'Containers are processes, not tiny VMs.']; c.out(f[Math.random() * f.length | 0] + '\n'); });
  CMDS.vi = need('vi', c => editCmd(c));
  CMDS.vim = need('vim', c => editCmd(c));
  CMDS.nano = need('nano', c => editCmd(c));
  async function editCmd(c) {
    const f = c.args.filter(a => !a.startsWith('-'))[0];
    if (!f) { c.err('파일 이름을 적어 주세요. 예: vi index.html\n'); return 1; }
    if (!c.io.edit) { c.err('이 환경에서는 편집기를 열 수 없습니다. echo "..." > 파일 을 사용하세요.\n'); return 1; }
    const p = c.sh.abs(f);
    const r = await c.io.edit(p, c.sh.fs.read(p) || '', { title: (c.sh.ct ? c.sh.ct.name + ':' : '') + p });
    if (r != null) { try { c.sh.fs.write(p, r); } catch (e) { c.err(`"${f}" E212: Can't open file for writing: ${e.message}\n`); return 1; } }
    return 0;
  }
  CMDS.find = c => {
    const start = c.args[0] && !c.args[0].startsWith('-') ? c.args[0] : '.';
    const ni = c.args.indexOf('-name'); const pat = ni >= 0 ? c.args[ni + 1] : null;
    const re = pat ? new RegExp('^' + pat.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
    const ti = c.args.indexOf('-type'); const type = ti >= 0 ? c.args[ti + 1] : null;
    const root = c.sh.abs(start);
    const out = [];
    const walk = (p, rel) => {
      const st = c.sh.fs.stat(p);
      if (!st) return;
      if ((!re || re.test(base(p))) && (!type || (type === 'f' ? st === 'file' : st === 'dir'))) out.push(rel);
      if (st === 'dir' && out.length < 500 && !/^\/(proc|sys)$/.test(p)) c.sh.fs.ls(p).forEach(n => walk((p === '/' ? '' : p) + '/' + n, (rel === '/' ? '' : rel) + '/' + n));
    };
    walk(root, start);
    c.out(out.join('\n') + (out.length ? '\n' : ''));
  };
  CMDS.stat = c => { const p = c.sh.abs(c.args[0] || ''); const s = c.sh.fs.stat(p); if (!s) { c.err(`stat: cannot statx '${c.args[0]}': No such file or directory\n`); return 1; } c.out(`  File: ${c.args[0]}\n  Size: ${(c.sh.fs.read(p) || '').length}\t\tBlocks: 8          IO Block: 4096   ${s === 'dir' ? 'directory' : 'regular file'}\nAccess: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)\n`); };
  CMDS.stress = need('stress', async c => { c.out('stress: info: [7] dispatching hogs\n'); await U.sleep(1000, c.io.signal); return 0; });
  CMDS['stress-ng'] = need('stress-ng', async c => { c.out('stress-ng: info:  [7] dispatching hogs\n'); await U.sleep(1000, c.io.signal); return 0; });

  // 데이터베이스 클라이언트
  CMDS['redis-cli'] = need('redis-cli', async c => {
    let host = '127.0.0.1', port = 6379; const rest = []; let pass = null;
    for (let i = 0; i < c.args.length; i++) { const x = c.args[i]; if (x === '-h') host = c.args[++i]; else if (x === '-p') port = +c.args[++i]; else if (x === '-a') pass = c.args[++i]; else if (x === '--no-auth-warning') {} else rest.push(x); }
    const t = tcp(c.sh.eng, c.sh.ct, host, port);
    if (t.error || t.L.proto !== 'redis') { const m = t.dns ? `Could not connect to Redis at ${host}:${port}: Name or service not known` : `Could not connect to Redis at ${host}:${port}: Connection refused`; if (rest.length) { c.err(m + '\n'); return 1; } c.err(m + '\nnot connected> \n'); return 1; }
    const f = c.sh.eng.containerFS(t.c);
    if (rest.length) { const r = DB.redisCmd(f, rest); c.out(r.replace(/^"(.*)"$/s, '$1').replace(/^\(integer\) /, '') + '\n'); return 0; }
    if (!c.io.session) { c.err('redis-cli: 대화형 모드는 터미널에서 -it 로 실행하세요 (docker exec -it … redis-cli)\n'); return 1; }
    return c.io.session({ prompt: () => `${host === '127.0.0.1' || host === 'localhost' ? '127.0.0.1' : host}:${port}> `, input: async (line, io) => { const argv = Sh.tokenize(line).filter(x => x.w).map(x => x.w.map(s => s.v).join('')); if (!argv.length) return true; if (/^(quit|exit)$/i.test(argv[0])) return false; io.out(DB.redisCmd(f, argv) + '\n'); return true; } });
  });
  CMDS['pg_isready'] = need('psql', c => {
    const hi = c.args.indexOf('-h'); const host = hi >= 0 ? c.args[hi + 1] : 'localhost';
    const t = tcp(c.sh.eng, c.sh.ct, host, 5432);
    const ok = !t.error && t.L.proto === 'pg';
    c.out(`${host === 'localhost' ? '/var/run/postgresql' : host}:5432 - ${ok ? 'accepting connections' : 'no response'}\n`);
    return ok ? 0 : 2;
  });
  CMDS.psql = need('psql', async c => {
    let host = 'localhost', user = null, db = null, cmd = null, pw = null;
    const a = c.args;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x === '-h' || x === '--host') host = a[++i]; else if (x.startsWith('--host=')) host = x.slice(7);
      else if (x === '-U' || x === '--username') user = a[++i]; else if (x.startsWith('-U') && x.length > 2) user = x.slice(2);
      else if (x === '-d' || x === '--dbname') db = a[++i];
      else if (x === '-c' || x === '--command') cmd = a[++i];
      else if (/^postgres(ql)?:\/\//.test(x)) { const m = x.match(/^postgres(?:ql)?:\/\/([^:@]+)(?::([^@]*))?@([^:/]+)(?::\d+)?\/?(\w*)/); if (m) { user = m[1]; pw = m[2]; host = m[3]; db = m[4] || null; } }
      else if (!x.startsWith('-')) db = db || x;
    }
    const env = c.sh.env;
    user = user || env.PGUSER || (c.sh.ct && c.sh.eng.envOf(c.sh.ct).POSTGRES_USER) || 'postgres';
    if (user === 'root' && !a.includes('-U')) user = 'root';
    pw = pw != null ? pw : env.PGPASSWORD || '';
    const local = host === 'localhost' || host === '127.0.0.1';
    const t = tcp(c.sh.eng, c.sh.ct, host, 5432);
    if (t.error || t.L.proto !== 'pg') {
      c.err(local ? `psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: No such file or directory\n\tIs the server running locally and accepting connections on that socket?\n` : t.dns ? `psql: error: could not translate host name "${host}" to address: Name or service not known\n` : `psql: error: connection to server at "${host}" (${t.c ? c.sh.eng.ipOf(t.c) : host}), port 5432 failed: Connection refused\n\tIs the server running on that host and accepting TCP/IP connections?\n`);
      return 2;
    }
    const f = c.sh.eng.containerFS(t.c);
    const d = DB.sqlLoad(f, 'postgres');
    if (!d) { c.err('psql: error: the database system is starting up\n'); return 2; }
    if (!d.users[user]) { c.err(`psql: error: connection to server ${local ? 'on socket "/var/run/postgresql/.s.PGSQL.5432"' : `at "${host}" (${c.sh.eng.ipOf(t.c)}), port 5432`} failed: FATAL:  role "${user}" does not exist\n`); return 2; }
    if (!local && !d.trust && d.users[user].password !== pw) {
      if (!pw && c.io.readline) { pw = await c.io.readline(`Password for user ${user}: `, { secret: true }); }
      if (d.users[user].password !== pw) { c.err(`psql: error: connection to server at "${host}" (${c.sh.eng.ipOf(t.c)}), port 5432 failed: FATAL:  password authentication failed for user "${user}"\n`); return 2; }
    }
    const ctx = { d, db: (db || user).toLowerCase(), flavor: 'postgres', user };
    if (!d.dbs[ctx.db]) { c.err(`psql: error: connection to server ${local ? 'on socket "/var/run/postgresql/.s.PGSQL.5432"' : `at "${host}"`} failed: FATAL:  database "${ctx.db}" does not exist\n`); return 2; }
    const runSql = (line, io) => {
      const s = line.trim();
      if (s === '\\l' || s === '\\list') { io.out(DB.fmtPsql({ cols: ['Name', 'Owner', 'Encoding'], rows: Object.keys(d.dbs).sort().map(n => [n, user, 'UTF8']) }).replace(/^/, '                                   List of databases\n')); return; }
      if (s === '\\dt') { const t2 = Object.keys(d.dbs[ctx.db].tables); if (!t2.length) { io.out('Did not find any relations.\n'); return; } io.out('         List of relations\n' + DB.fmtPsql({ cols: ['Schema', 'Name', 'Type', 'Owner'], rows: t2.sort().map(n => ['public', n, 'table', user]) })); return; }
      if (/^\\d\s+\w+/.test(s)) { const tn = s.split(/\s+/)[1]; const tb = d.dbs[ctx.db].tables[tn]; if (!tb) { io.out(`Did not find any relation named "${tn}".\n`); return; } io.out(`                Table "public.${tn}"\n` + DB.fmtPsql({ cols: ['Column', 'Type'], rows: tb.cols.map(x => [x.name, x.type]) }).replace(/\(\d+ rows?\)\n$/, '')); return; }
      if (/^\\c\s+\w+/.test(s) || /^\\connect\s+\w+/.test(s)) { const n = s.split(/\s+/)[1].toLowerCase(); if (!d.dbs[n]) { io.err(`connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  database "${n}" does not exist\nPrevious connection kept\n`); return; } ctx.db = n; io.out(`You are now connected to database "${n}" as user "${user}".\n`); return; }
      if (s === '\\du') { io.out('                             List of roles\n' + DB.fmtPsql({ cols: ['Role name', 'Attributes'], rows: Object.keys(d.users).map(u => [u, 'Superuser, Create role, Create DB']) })); return; }
      if (s === '\\conninfo') { io.out(`You are connected to database "${ctx.db}" as user "${user}" ${local ? 'via socket in "/var/run/postgresql" at port "5432"' : `on host "${host}" at port "5432"`}.\n`); return; }
      if (/^\\/.test(s)) { io.out(`invalid command ${s.split(' ')[0]}\nTry \\? for help.\n`); return; }
      DB.splitSql(s).forEach(q => { const r = DB.sqlExec(ctx, q); if (r.dirty) DB.sqlSave(f, 'postgres', d); const txt = DB.fmtPsql(r); (r.error ? io.err : io.out)(txt.endsWith('\n') ? txt : txt + '\n'); });
    };
    if (cmd) { runSql(cmd, c.io); return 0; }
    if (c.stdin) { DB.splitSql(c.stdin).forEach(q => runSql(q + ';', c.io)); return 0; }
    if (!c.io.session) { c.err('psql: 대화형 모드는 터미널에서 -it 로 실행하세요\n'); return 1; }
    c.out(`psql (17.2 (Debian 17.2-1.pgdg120+1))\nType "help" for help.\n\n`);
    let buf = '';
    return c.io.session({
      prompt: () => `${ctx.db}${buf ? '-' : '='}# `,
      input: async (line, io) => {
        const s = line.trim();
        if (/^\\q$|^exit$|^quit$/.test(s)) return false;
        if (s === 'help') { io.out('You are using psql, the command-line interface to PostgreSQL.\nType:  \\copyright for distribution terms\n       \\h for help with SQL commands\n       \\? for help with psql commands\n       \\g or terminate with semicolon to execute query\n       \\q to quit\n'); return true; }
        if (s.startsWith('\\')) { runSql(s, io); return true; }
        buf += (buf ? ' ' : '') + s;
        if (!/;\s*$/.test(buf)) return true;
        const q = buf; buf = '';
        runSql(q, io);
        return true;
      }
    });
  });
  CMDS.mysql = need('mysql', async c => {
    let host = 'localhost', user = 'root', pw = null, db = null, cmd = null, askPw = false;
    const a = c.args;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x === '-h') host = a[++i]; else if (x.startsWith('-h') && x.length > 2) host = x.slice(2); else if (x.startsWith('--host=')) host = x.slice(7);
      else if (x === '-u') user = a[++i]; else if (x.startsWith('-u') && x.length > 2) user = x.slice(2); else if (x.startsWith('--user=')) user = x.slice(7);
      else if (x === '-p') askPw = true; else if (x.startsWith('-p') && x.length > 2) pw = x.slice(2); else if (x.startsWith('--password=')) pw = x.slice(11);
      else if (x === '-e' || x === '--execute') cmd = a[++i];
      else if (x === '-P' || x === '--port') i++;
      else if (!x.startsWith('-')) db = x;
    }
    if (askPw) { if (c.io.readline) pw = await c.io.readline('Enter password: ', { secret: true }); else pw = ''; }
    const t = tcp(c.sh.eng, c.sh.ct, host, 3306);
    if (t.error || t.L.proto !== 'mysql') {
      c.err(host === 'localhost' ? `ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)\n` : t.dns ? `ERROR 2005 (HY000): Unknown MySQL server host '${host}' (-2)\n` : `ERROR 2003 (HY000): Can't connect to MySQL server on '${host}:3306' (111)\n`);
      return 1;
    }
    const f = c.sh.eng.containerFS(t.c);
    const d = DB.sqlLoad(f, 'mysql');
    if (!d || !d.users[user] || d.users[user].password !== (pw || '')) { c.err(`ERROR 1045 (28000): Access denied for user '${user}'@'${host === 'localhost' ? 'localhost' : c.sh.eng.ipOf(c.sh.ct)}' (using password: ${pw ? 'YES' : 'NO'})\n`); return 1; }
    const ctx = { d, db: db ? db.toLowerCase() : null, flavor: 'mysql', user };
    if (ctx.db && !d.dbs[ctx.db]) { c.err(`ERROR 1049 (42000): Unknown database '${ctx.db}'\n`); return 1; }
    const runSql = (s, io) => DB.splitSql(s).forEach(q => { const r = DB.sqlExec(ctx, q); if (r.dirty) DB.sqlSave(f, 'mysql', d); const txt = DB.fmtMysql(r); (r.error ? io.err : io.out)(txt.endsWith('\n') ? txt : txt + '\n'); });
    if (cmd) { runSql(cmd, c.io); return 0; }
    if (c.stdin) { runSql(c.stdin, c.io); return 0; }
    if (!c.io.session) { c.err('mysql: 대화형 모드는 터미널에서 -it 로 실행하세요\n'); return 1; }
    c.out(`Welcome to the MySQL monitor.  Commands end with ; or \\g.\nYour MySQL connection id is 8\nServer version: 8.4.3 MySQL Community Server - GPL\n\nCopyright (c) 2000, 2024, Oracle and/or its affiliates.\n\nType 'help;' or '\\h' for help. Type '\\c' to clear the current input statement.\n\n`);
    let buf = '';
    return c.io.session({
      prompt: () => buf ? '    -> ' : 'mysql> ',
      input: async (line, io) => {
        const s = line.trim();
        if (/^(exit|quit|\\q);?$/i.test(s)) { io.out('Bye\n'); return false; }
        if (!buf && /^use\s+\w+;?$/i.test(s)) { runSql(s.replace(/;$/, ''), io); return true; }
        buf += (buf ? ' ' : '') + s;
        if (!/;\s*$|\\G\s*$/.test(buf)) return true;
        const q = buf; buf = ''; runSql(q, io); return true;
      }
    });
  });
  CMDS.mariadb = CMDS.mysql;
  CMDS.mysqladmin = need('mysql', c => {
    const hi = c.args.findIndex(x => x === '-h' || x.startsWith('-h'));
    const host = hi >= 0 ? (c.args[hi].length > 2 ? c.args[hi].slice(2) : c.args[hi + 1]) : 'localhost';
    const t = tcp(c.sh.eng, c.sh.ct, host, 3306);
    if (t.error || t.L.proto !== 'mysql') { c.err(`mysqladmin: connect to server at '${host}' failed\nerror: 'Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock' (2)'\nCheck that mysqld is running and that the socket: '/var/run/mysqld/mysqld.sock' exists!\n`); return 1; }
    if (c.args.includes('ping')) c.out('mysqld is alive\n');
    return 0;
  });
  CMDS.mongosh = need('mongosh', async c => {
    const hostArg = c.args.find(a => /^mongodb:\/\//.test(a)); let host = 'localhost';
    if (hostArg) host = (hostArg.match(/@([^:/]+)|\/\/([^:/@]+)/) || [])[1] || RegExp.$2 || 'localhost';
    const hi = c.args.indexOf('--host'); if (hi >= 0) host = c.args[hi + 1];
    const t = tcp(c.sh.eng, c.sh.ct, host, 27017);
    if (t.error || t.L.proto !== 'mongo') { c.err(`MongoNetworkError: connect ECONNREFUSED ${host}:27017\n`); return 1; }
    const f = c.sh.eng.containerFS(t.c);
    const ctx = { db: 'test' };
    const ei = c.args.indexOf('--eval');
    if (ei >= 0) { const r = DB.mongoCmd(f, ctx, c.args[ei + 1] || ''); if (r != null) c.out(r + '\n'); return 0; }
    if (!c.io.session) { c.err('mongosh: 대화형 모드는 -it 로 실행하세요\n'); return 1; }
    c.out(`Current Mongosh Log ID:\t${U.hex(24)}\nConnecting to:\t\tmongodb://${host}:27017/?directConnection=true\nUsing MongoDB:\t\t8.0.3\nUsing Mongosh:\t\t2.3.3\n\n`);
    return c.io.session({ prompt: () => `${ctx.db}> `, input: async (line, io) => { const r = DB.mongoCmd(f, ctx, line); if (r === null) return false; if (r) io.out(r + '\n'); return true; } });
  });
  CMDS.nginx = need('nginx', c => {
    const a = c.args;
    if (a.includes('-v')) { c.err('nginx version: nginx/1.27.2\n'); return 0; }
    if (a.includes('-t') || a.includes('-T')) { const r = nginxConf(c.sh.fs); if (r.error) { c.err(`nginx: [emerg] ${r.error}\nnginx: configuration file /etc/nginx/nginx.conf test failed\n`); return 1; } c.err('nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n'); return 0; }
    const si = a.indexOf('-s');
    if (si >= 0 && a[si + 1] === 'reload') { const p = c.sh.eng.proc[c.sh.ct.id]; if (!p || !p.reload) { c.err('nginx: [error] invalid PID number "" in "/run/nginx.pid"\n'); return 1; } const e = p.reload(); if (e) { c.err(`nginx: [emerg] ${e}\n`); return 1; } c.err(`${new Date().toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/')} [notice] 40#40: signal process started\n`); return 0; }
    if (si >= 0 && (a[si + 1] === 'stop' || a[si + 1] === 'quit')) { c.sh.eng.stop(c.sh.ct, 0); return 0; }
    c.err('nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)\n'); return 1;
  });
  CMDS.python = need('python3', async c => runInterp(c, 'python'));
  CMDS.python3 = CMDS.python;
  CMDS.node = need('node', async c => runInterp(c, 'node'));
  async function runInterp(c, which) {
    const ct = c.sh.ct;
    const pk = new Set([].concat((c.sh.eng.img(ct) || {}).pkgs || [], ct.pkgs || []));
    const rtb = { out: c.out, err: c.err, env: c.sh.env, host: ct.hostname, ip: c.sh.eng.ipOf(ct), signal: c.io.signal, sleep: ms => U.sleep(ms, c.io.signal), forever: () => new Promise(r => c.io.signal && c.io.signal.addEventListener('abort', r)), listen: (port, fn, bind) => { const p = c.sh.eng.proc[ct.id]; if (p) { p.listeners[port] = { fn, bind: bind || '0.0.0.0', proto: 'http' }; c.sh.eng.changed('listen'); } }, fs: c.sh.fs, cwd: c.sh.cwd, pkgs: pk, bridge: bridge(c.sh.eng, ct) };
    const a = c.args;
    if (!a.length) {
      if (!c.io.session) return 0;
      return repl(c, which);
    }
    if (a[0] === '--version' || a[0] === '-V' || a[0] === '-v') { c.out(which === 'python' ? 'Python 3.12.7\n' : 'v22.11.0\n'); return 0; }
    if (which === 'python' && a[0] === '-c') return new Code.PyProgram(a[1] || '', Object.assign({}, rtb, { file: '<string>' })).run();
    if (which === 'node' && a[0] === '-e') return new Code.NodeProgram(a[1] || '', Object.assign({}, rtb, { file: '[eval]' })).run();
    if (which === 'python' && a[0] === '-m' && a[1] === 'pip') return CMDS.pip(Object.assign({}, c, { args: a.slice(2) }));
    const f = c.sh.abs(a[0]); const s = c.sh.fs.read(f);
    if (s == null) { c.err(which === 'python' ? `python3: can't open file '${f}': [Errno 2] No such file or directory\n` : `Error: Cannot find module '${f}'\n`); return which === 'python' ? 2 : 1; }
    const P = which === 'python' ? Code.PyProgram : Code.NodeProgram;
    return new P(s, Object.assign({}, rtb, { file: f })).run();
  }
  function repl(c, which) {
    const ct = c.sh.ct;
    if (which === 'python') c.out('Python 3.12.7 (main, Nov 12 2024, 02:15:48) [GCC 12.2.0] on linux\nType "help", "copyright", "credits" or "license" for more information.\n');
    else c.out('Welcome to Node.js v22.11.0.\nType ".help" for more information.\n');
    const prog = which === 'python' ? new Code.PyProgram('', { out: c.out, err: c.err, env: c.sh.env, host: ct ? ct.hostname : 'localhost', pkgs: new Set(), bridge: {} }) : null;
    const vars = {};
    return c.io.session({
      prompt: () => which === 'python' ? '>>> ' : '> ',
      input: async (line, io) => {
        const s = line.trim();
        if (/^(exit\(\)|quit\(\)|\.exit)$/.test(s)) return false;
        if (!s) return true;
        try {
          if (which === 'python') {
            prog.rt.out = io.out; prog.rt.err = io.err;
            if (/^(print\(|import |from |\w+\s*=|for |while |if |def )/.test(s)) { await prog.exec(Array.isArray(s) ? s : [{ text: s, kids: [] }], prog.globals); }
            else { const v = await prog.evalIn(s, prog.globals); if (v !== undefined && v !== null) io.out(Code.pyRepr(v) + '\n'); }
          } else {
            const np = new Code.NodeProgram(s, { out: io.out, err: io.err, env: c.sh.env, host: ct ? ct.hostname : 'localhost', pkgs: new Set(), bridge: {} });
            np.vars = vars; np.ctx.vars = vars;
            if (/^(console\.|const |let |var )/.test(s)) { await np.stmt(s, vars, null); if (/^(const|let|var) /.test(s)) io.out('undefined\n'); }
            else { const v = await Code.evalExpr(s, np.ctx); io.out((typeof v === 'string' ? `'${v}'` : JSON.stringify(v)) + '\n'); }
          }
        } catch (e) { io.err(which === 'python' ? `Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\n${e.type || 'Error'}: ${e.message}\n` : `Uncaught ${e.type || 'Error'}: ${e.message}\n`); }
        return true;
      }
    });
  }

  /** 셸 안에서 sh · bash 를 부를 때 (sh -c "..." · 스크립트 · 대화형) */
  function subShell(n) {
    return async c => {
      const sub = c.sh.fork({ name: n === 'bash' || n === 'zsh' ? 'bash' : 'sh' });
      const a = c.args.filter(x => x !== '-e' && x !== '-x' && x !== '-l' && x !== '-i');
      const run = async src => { try { return await sub.exec(src, c.io); } catch (e) { if (e instanceof Sh.ExitSignal) return e.code; throw e; } };
      if (a[0] === '-c') { sub.args = a.slice(2); return run(a[1] || ''); }
      if (a[0] && !a[0].startsWith('-')) {
        const src = c.sh.fs.read(c.sh.abs(a[0]));
        if (src == null) { c.err(`${n}: ${a[0]}: No such file or directory\n`); return 127; }
        sub.args = a.slice(1); return run(src.replace(/^#!.*\n/, ''));
      }
      if (c.stdin) return run(c.stdin);
      if (!c.io.session) return 0;
      let code = 0;
      await c.io.session({
        prompt: () => sub.prompt, shell: sub,
        input: async (line, io) => { try { await sub.exec(line, io); } catch (e) { if (e instanceof Sh.ExitSignal) { io.out('exit\n'); code = e.code; return false; } throw e; } return true; }
      });
      return code;
    };
  }

  /** 컨테이너용 셸 만들기 */
  function shell(engine, c, opts) {
    opts = opts || {};
    const img = engine.img(c);
    const osk = img ? img.os : 'debian';
    const o = Hub.OS[osk] || Hub.OS.debian;
    const env = engine.envOf(c);
    if (opts.env) Object.assign(env, opts.env);
    const user = opts.user || (c.user ? (/^\d+$/.test(c.user) ? (c.user === '0' ? 'root' : 'uid' + c.user) : c.user.split(':')[0]) : 'root');
    env.HOME = env.HOME || (user === 'root' ? '/root' : '/home/' + user);
    env.HOSTNAME = c.hostname;
    const fs = fsFor(engine, c, user);
    const cmds = {};
    Object.keys(Sh.core).forEach(k => { cmds[k] = Sh.core[k]; });
    Object.keys(CMDS).forEach(k => {
      const fn = CMDS[k]; if (!fn) return;
      if (fn.tool && !engine.hasTool(c, fn.tool) && !(k === 'hostname')) return;
      cmds[k] = fn;
    });
    if (engine.hasTool(c, 'python3') || engine.hasTool(c, 'python')) { cmds.python = CMDS.python; cmds.python3 = CMDS.python; }
    if (engine.hasTool(c, 'pip') || engine.hasTool(c, 'pip3')) { cmds.pip = CMDS.pip; cmds.pip3 = CMDS.pip; }
    ['hostname', 'df', 'mount', 'uptime', 'kill', 'chmod', 'chown', 'su', 'sudo', 'find', 'stat', 'getent', 'systemctl'].forEach(k => { cmds[k] = CMDS[k]; });
    if (engine.hasTool(c, 'python3') && engine.hasPkg(c, 'py:flask')) cmds.flask = async cc => { cc.err('(시뮬레이터) flask 는 컨테이너의 메인 명령(CMD)으로 실행하세요.\n'); return 1; };
    // 셸이 없는 이미지 (scratch · distroless)
    const noShell = !o.sh.length && !(img && img.pkgs.includes('bin:sh'));
    if (noShell) { Object.keys(cmds).forEach(k => delete cmds[k]); }
    const name = opts.name || 'sh';
    const sh = new Sh.Shell({ fs, cmds, user, host: c.hostname, name: name === 'bash' ? 'bash' : 'sh', env, cwd: opts.workdir || c.workdir || '/' });
    if (sh.fs.stat(sh.cwd) !== 'dir') sh.cwd = '/';
    // apt-get · apk 로 새로 설치한 도구는 바로 쓸 수 있게
    if (!noShell) sh.resolveCmd = n => {
      const fn = CMDS[n];
      if (fn && (!fn.tool || engine.hasTool(c, fn.tool))) return fn;
      if ((n === 'python' || n === 'python3') && (engine.hasTool(c, 'python3') || engine.hasTool(c, 'python'))) return CMDS.python;
      if ((n === 'pip' || n === 'pip3') && (engine.hasTool(c, 'pip') || engine.hasTool(c, 'pip3'))) return CMDS.pip;
      if (SHELLS.includes(n) && engine.hasTool(c, n)) return subShell(n);
      return null;
    };
    SHELLS.forEach(n => { if (!noShell && (engine.hasTool(c, n) || n === 'sh')) cmds[n] = subShell(n); });
    sh.eng = engine; sh.ct = c; sh.osId = o.id; sh.offline = engine.isInternal(c) || !!c.networks.none;
    sh.execs = opts.execs || [];
    sh.args = opts.args || [];
    if (osk === 'alpine' || osk === 'busybox') sh.promptFn = s => `${s.cwd === s.env.HOME ? '~' : s.cwd} ${s.user === 'root' ? '#' : '$'} `;
    else if (name === 'bash') sh.promptFn = s => `${s.user}@${s.host}:${s.cwd === s.env.HOME ? '~' : s.cwd}${s.user === 'root' ? '#' : '$'} `;
    else sh.promptFn = s => `${s.user === 'root' ? '#' : '$'} `;
    return sh;
  }

  window.Apps = { run, check, graceful, memory, pids, shell, mainOf, exists, fsFor, tcp, sqlTarget, CMDS, staticServe, nginxConf };
})();
