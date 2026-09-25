/* ===================================================================
   가상 호스트 (Docker 가 설치된 Ubuntu) — 파일 시스템 · 셸 명령
   =================================================================== */
(function () {
  'use strict';
  const { FS, norm, base, parent } = VFS;
  const HOME = VFS.HOME;

  const README = `studyDocker 실습 머신에 오신 것을 환영합니다! 🐳

이 터미널은 브라우저 안에서 동작하는 가상 리눅스 + Docker 엔진입니다.
실제 docker 명령과 같은 모양으로 동작하니 마음껏 실험해 보세요.

  docker run hello-world        첫 컨테이너 실행
  docker ps -a                  컨테이너 목록
  help                          쓸 수 있는 명령 보기

오른쪽 위 탭:
  📊 대시보드  컨테이너 · 이미지 · 네트워크 · 볼륨을 그림으로
  🌐 브라우저  http://localhost:포트 로 컨테이너 웹 페이지 열기
  📝 파일      Dockerfile · compose.yaml · 소스 코드 편집
  🎯 미션      지금 장의 실습 과제 (자동 채점)
`;

  const listeners = [];
  const Host = {
    fs: null,
    onWrite(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    load() {
      const d = U.store.get('hostfs', null);
      const fs = new FS(d || undefined);
      if (!d) {
        fs.mkdir(HOME);
        fs.write(HOME + '/README.txt', README);
        fs.mkdir(HOME + '/projects');
        fs.write('/etc/hostname', 'docker-lab\n');
        fs.write('/etc/os-release', 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nID=ubuntu\n');
        fs.write('/etc/hosts', '127.0.0.1\tlocalhost\n127.0.1.1\tdocker-lab\n');
        ['/tmp', '/var/log', '/usr/bin', '/opt'].forEach(p => fs.mkdir(p));
      }
      // 저장 · 알림
      const w = fs.write.bind(fs), mk = fs.mkdir.bind(fs), rm = fs.rm.bind(fs);
      let t = null;
      const save = () => { clearTimeout(t); t = setTimeout(() => U.store.set('hostfs', fs.toJSON()), 250); };
      fs.write = (p, c) => { w(p, c); save(); listeners.slice().forEach(f => { try { f(norm(p)); } catch (e) { console.error(e); } }); };
      fs.mkdir = p => { mk(p); save(); listeners.slice().forEach(f => { try { f(norm(p)); } catch (e) {} }); };
      fs.rm = (p, r) => { const x = rm(p, r); save(); listeners.slice().forEach(f => { try { f(norm(p)); } catch (e) {} }); return x; };
      this.fs = fs;
      return fs;
    },
    reset() { U.store.del('hostfs'); this.fs = null; return this.load(); },
    /** 여러 파일 한 번에 쓰기 { '~/app/app.py': '...' } */
    writeFiles(files) {
      Object.keys(files).forEach(k => {
        const p = norm(k.replace(/^~/, HOME));
        if (k.endsWith('/')) this.fs.mkdir(p); else this.fs.write(p, files[k]);
      });
    }
  };

  /* ------------------------------------------------ /var/lib/docker 보기 --- */
  function hostView(sh) {
    const fs = Host.fs;
    const D = window.Docker && Docker.engine;
    const VOL = '/var/lib/docker/volumes';
    const need = () => { if (!sh.sudo) throw Object.assign(new Error('Permission denied'), { perm: true }); };
    const vol = p => {
      const m = p.match(/^\/var\/lib\/docker\/volumes\/([^/]+)(?:\/_data(\/.*)?)?$/);
      if (!m || !D) return null;
      const v = D.volume(m[1]); if (!v) return { none: true };
      return { v, rest: m[2] || '/', root: !/\/_data/.test(p) };
    };
    return {
      stat(p) {
        p = norm(p);
        if (p === '/var/lib/docker' || p === VOL) return 'dir';
        if (p.startsWith(VOL + '/')) { const r = vol(p); if (!r || r.none) return p === VOL + '/metadata.db' ? 'file' : null; if (r.root) return 'dir'; return D.volFS(r.v).stat(r.rest); }
        return fs.stat(p);
      },
      read(p) {
        p = norm(p);
        if (p.startsWith(VOL + '/')) { need(); if (p === VOL + '/metadata.db') return '(bolt db)'; const r = vol(p); if (!r || r.none || r.root) return null; return D.volFS(r.v).read(r.rest); }
        return fs.read(p);
      },
      ls(p) {
        p = norm(p);
        if (p === '/var/lib') return Array.from(new Set(fs.ls(p).concat(['docker'])));
        if (p === '/var/lib/docker') { need(); return ['buildkit', 'containers', 'image', 'network', 'overlay2', 'volumes']; }
        if (p === VOL) { need(); return D ? D.s.volumes.map(v => v.name).concat(['metadata.db']).sort() : []; }
        if (p.startsWith(VOL + '/')) { need(); const r = vol(p); if (!r || r.none) return []; if (r.root) return ['_data']; return D.volFS(r.v).ls(r.rest); }
        if (p === '/var') return Array.from(new Set(fs.ls(p).concat(['lib'])));
        return fs.ls(p);
      },
      write(p, c) { p = norm(p); if (p.startsWith('/var/lib/docker')) { need(); const r = vol(p); if (r && r.v && !r.root) return D.volFS(r.v).write(r.rest, c); throw new Error('Permission denied'); } if (!p.startsWith(HOME) && !p.startsWith('/tmp') && !sh.sudo) throw new Error('Permission denied'); return fs.write(p, c); },
      mkdir(p) { p = norm(p); if (!p.startsWith(HOME) && !p.startsWith('/tmp') && !sh.sudo) throw new Error('Permission denied'); return fs.mkdir(p); },
      rm(p, r) { p = norm(p); if (!p.startsWith(HOME) && !p.startsWith('/tmp') && !sh.sudo) throw new Error('Permission denied'); return fs.rm(p, r); },
      walk: p => fs.walk(p), dirsUnder: p => fs.dirsUnder(p)
    };
  }

  /* ------------------------------------------------ 호스트 명령 --- */
  const HC = {};
  HC.docker = async c => {
    const D = Docker.engine;
    return DockerCLI.docker({ args: c.args, io: c.io, out: c.out, err: c.err, D, cwd: c.sh.cwd, env: c.sh.env, stdin: c.stdin, sh: c.sh });
  };
  HC['docker-compose'] = c => { c.err("Command 'docker-compose' not found, but can be installed with:\nsudo apt install docker-compose\n\n(힌트) 요즘은 하이픈 없이 docker compose (Compose V2 플러그인)를 씁니다.\n"); return 127; };
  HC.kubectl = c => window.Kube ? Kube.kubectl(c) : 127;
  HC.minikube = c => window.Kube ? Kube.minikube(c) : 127;
  HC.kind = c => window.Kube ? Kube.kind(c) : 127;
  HC.helm = c => window.Kube ? Kube.helm(c) : 127;
  HC.curl = c => Apps.CMDS.curl(c);
  HC.wget = c => Apps.CMDS.wget(c);
  HC.ping = c => Apps.CMDS.ping(c);
  HC.nslookup = c => { const n = c.args[0]; const D = Docker.engine; const r = D.resolveHost(null, n); c.out(`Server:\t\t127.0.0.53\nAddress:\t127.0.0.53#53\n\n`); if (r.error && !/\./.test(n)) { c.out(`** server can't find ${n}: NXDOMAIN\n\n`); c.err('(힌트) 컨테이너 이름은 호스트에서 DNS 로 찾을 수 없습니다. 컨테이너 이름 DNS 는 같은 사용자 정의 네트워크 안의 컨테이너끼리만 됩니다.\n'); return 1; } c.out(`Non-authoritative answer:\nName:\t${n}\nAddress: ${r.host ? '127.0.0.1' : '93.184.215.14'}\n\n`); };
  HC.jq = c => Apps.CMDS.jq(c);
  HC.find = c => Apps.CMDS.find(c);
  HC.stat = c => Apps.CMDS.stat(c);
  HC.git = c => { if (c.args[0] === '--version') { c.out('git version 2.43.0\n'); return 0; } if (c.args[0] === 'clone') { c.out(`Cloning into '${(c.args[1] || '').split('/').pop().replace(/\.git$/, '')}'...\n(시뮬레이터) 외부 저장소는 가져오지 않습니다.\n`); return 0; } if (c.args[0] === 'init') { c.sh.fs.mkdir(c.sh.abs('.git')); c.out(`Initialized empty Git repository in ${c.sh.abs('.git')}/\n`); return 0; } c.out('usage: git [-v | --version] [-h | --help] <command> [<args>]\n'); return 1; };
  HC.python3 = c => { if (/^-?-?[vV]/.test(c.args[0] || '')) { c.out('Python 3.12.3\n'); return 0; } c.err('(시뮬레이터) 호스트에서는 파이썬을 직접 실행하지 않습니다. 컨테이너 안에서 실행해 보세요:\n  docker run --rm -v "$PWD":/app -w /app python:3.12-slim python app.py\n'); return 1; };
  HC.python = HC.python3;
  HC.node = c => { if (/^-?-?v/.test(c.args[0] || '')) { c.err("Command 'node' not found, but can be installed with:\nsudo apt install nodejs\n\n(힌트) 설치하지 않고 컨테이너로 실행할 수 있습니다: docker run --rm node:22-alpine node -v\n"); return 127; } c.err("Command 'node' not found, but can be installed with:\nsudo apt install nodejs\n\n(힌트) docker run --rm -v \"$PWD\":/app -w /app node:22-alpine node app.js\n"); return 127; };
  HC.npm = c => { c.err("Command 'npm' not found, but can be installed with:\nsudo apt install npm\n\n(힌트) docker run --rm -v \"$PWD\":/app -w /app node:22-alpine npm install\n"); return 127; };
  HC.java = c => { c.err("Command 'java' not found, but can be installed with:\nsudo apt install openjdk-21-jre-headless\n\n(힌트) docker run --rm eclipse-temurin:21-jre java -version\n"); return 127; };
  HC.go = c => { c.err("Command 'go' not found, but can be installed with:\nsudo snap install go\n\n(힌트) docker run --rm golang:1.23-alpine go version\n"); return 127; };
  HC.redis_cli = null;
  HC.ps = c => {
    const D = Docker.engine;
    const full = c.args.some(a => /a|e|x/.test(a));
    const rows = [['root', 1, '/sbin/init'], ['root', 612, '/usr/bin/containerd'], ['root', 889, '/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock']];
    D.s.containers.filter(x => x.state.status === 'running' || x.state.status === 'paused').forEach(x => {
      rows.push(['root', x.state.pid - 20, `/usr/bin/containerd-shim-runc-v2 -namespace moby -id ${x.id.slice(0, 64)} -address /run/containerd/containerd.sock`]);
      const { argv } = Apps.mainOf(D, x);
      rows.push([x.user && x.user !== 'root' ? x.user : (D.kind(x) === 'postgres' ? '999' : D.kind(x) === 'redis' ? '999' : 'root'), x.state.pid, argv.join(' ')]);
      if ((x.hostConfig.ports || []).length) x.hostConfig.ports.forEach(p => rows.push(['root', x.state.pid - 40, `/usr/bin/docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port ${p.hostPort} -container-ip ${D.ipOf(x)} -container-port ${p.containerPort}`]));
    });
    rows.push(['student', 2210, '-bash'], ['student', 4000 + (Math.random() * 999 | 0), 'ps ' + c.args.join(' ')]);
    if (!full) { c.out('    PID TTY          TIME CMD\n   2210 pts/0    00:00:00 bash\n' + `${String(rows[rows.length - 1][1]).padStart(7)} pts/0    00:00:00 ps\n`); return 0; }
    c.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' + rows.map(r => `${U.pad(r[0], 8)} ${String(r[1]).padStart(7)}  0.0  0.1 ${String(10000 + (r[1] * 37) % 90000).padStart(6)} ${String(3000 + (r[1] * 13) % 9000).padStart(5)} ?        Ssl  ${new Date().toTimeString().slice(0, 5)}   0:00 ${r[2]}`).join('\n') + '\n');
    return 0;
  };
  HC.top = c => HC.ps(Object.assign({}, c, { args: ['aux'] }));
  HC.ip = c => {
    const D = Docker.engine;
    if (!/^(a|addr|address)$/.test(c.args[0] || '')) { c.err('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\n'); return 1; }
    let n = 1;
    c.out(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000\n    inet 192.168.65.3/24 brd 192.168.65.255 scope global eth0\n`);
    n = 2;
    D.s.networks.filter(x => x.driver === 'bridge').forEach(x => {
      const ifn = x.name === 'bridge' ? 'docker0' : 'br-' + x.id.slice(0, 12);
      const up = D.s.containers.some(k => k.networks[x.name] && k.state.status === 'running');
      c.out(`${++n}: ${ifn}: <${up ? 'BROADCAST,MULTICAST,UP,LOWER_UP' : 'NO-CARRIER,BROADCAST,MULTICAST,UP'}> mtu 1500 qdisc noqueue state ${up ? 'UP' : 'DOWN'} group default\n    link/ether 02:42:${U.hash(x.id, 8).match(/../g).join(':')} brd ff:ff:ff:ff:ff:ff\n    inet ${x.gateway}/16 brd ${x.gateway.replace(/\.\d+\.\d+$/, '.255.255')} scope global ${ifn}\n`);
    });
    D.s.containers.filter(k => k.state.status === 'running').forEach(k => Object.keys(k.networks).forEach(nn => { const x = D.network(nn); if (!x || x.driver !== 'bridge') return; c.out(`${++n}: veth${U.hash(k.id + nn, 7)}@if${n + 20}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master ${x.name === 'bridge' ? 'docker0' : 'br-' + x.id.slice(0, 12)} state UP group default\n`); }));
    return 0;
  };
  HC.ifconfig = c => HC.ip(Object.assign({}, c, { args: ['addr'] }));
  HC.hostname = c => { if (c.args[0] === '-I' || c.args[0] === '-i') { c.out('192.168.65.3 172.17.0.1\n'); return 0; } c.out('docker-lab\n'); };
  HC.free = c => { c.out('               total        used        free      shared  buff/cache   available\nMem:         8029968     1520312     5210044       10960     1299612     6509656\nSwap:        1048572           0     1048572\n'); };
  HC.df = c => { c.out('Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        59G   12G   44G  22% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm\n'); };
  HC.uname = Sh.core.uname;
  HC.sudo = async c => {
    if (!c.args.length) { c.err('usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command\n'); return 1; }
    const args = c.args.filter(a => a !== '-E');
    if (args[0] === 'su' || args[0] === '-i' || args[0] === '-s') { c.err('(시뮬레이터) root 셸은 지원하지 않습니다. 명령 앞에 sudo 를 붙이세요.\n'); return 1; }
    const prev = c.sh.sudo; c.sh.sudo = true;
    try { return await c.sh.call(args, c.io, c.stdin); } finally { c.sh.sudo = prev; }
  };
  HC.systemctl = async c => {
    const [act, svc] = c.args.filter(a => !a.startsWith('-'));
    if (!/docker/.test(svc || '')) { if (act === 'status') { c.out(`● ${svc}.service\n     Loaded: loaded\n     Active: active (running)\n`); return 0; } c.err(`Failed to ${act} ${svc}.service: Unit ${svc}.service not found.\n`); return 5; }
    if (!c.sh.sudo && act !== 'status' && act !== 'is-active') { c.err('==== AUTHENTICATING FOR org.freedesktop.systemd1.manage-units ====\nAuthentication is required to restart \'docker.service\'.\n(힌트) sudo systemctl ' + act + ' docker\n'); return 1; }
    const D = Docker.engine;
    if (act === 'restart') { c.out('(Docker 데몬을 다시 시작합니다… 실행 중인 컨테이너가 모두 멈췄다가 재시작 정책에 따라 다시 켜집니다)\n'); await D.restartDaemon(c.io); c.out('docker.service restarted\n'); return 0; }
    if (act === 'stop') { for (const x of D.s.containers.filter(k => k.state.status === 'running')) await D.stop(x, 10, { daemon: true }); D.s.daemon.running = false; D.changed('daemon'); return 0; }
    if (act === 'start') { D.s.daemon.running = true; for (const x of D.s.containers) { const rp = x.hostConfig.restart.name; if (rp === 'always' || (rp === 'unless-stopped' && !x.manualStop)) { try { await D.start(x); } catch (_) {} } } D.changed('daemon'); return 0; }
    if (act === 'status' || act === 'is-active') { const on = D.s.daemon.running; if (act === 'is-active') { c.out((on ? 'active' : 'inactive') + '\n'); return on ? 0 : 3; } c.out(`● docker.service - Docker Application Container Engine\n     Loaded: loaded (/usr/lib/systemd/system/docker.service; enabled; preset: enabled)\n     Active: ${on ? '\x1b[1;32mactive (running)\x1b[0m' : 'inactive (dead)'} since ${new Date().toUTCString()}\n       Docs: https://docs.docker.com\n   Main PID: 889 (dockerd)\n      Tasks: 18\n     Memory: 84.2M\n     CGroup: /system.slice/docker.service\n             └─889 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock\n`); return on ? 0 : 3; }
    if (act === 'enable') { c.out('Synchronizing state of docker.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.\n'); return 0; }
    c.err(`Unknown command verb ${act}.\n`); return 1;
  };
  HC.service = c => HC.systemctl(Object.assign({}, c, { args: [c.args[1], c.args[0]] }));
  HC.apt = c => { if (!c.sh.sudo) { c.err('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n'); return 100; } c.out('(시뮬레이터) 호스트에는 필요한 도구가 이미 준비되어 있습니다. 새 프로그램은 컨테이너로 실행해 보세요!\n'); return 0; };
  HC['apt-get'] = HC.apt;
  HC.id = c => { c.out(c.sh.sudo ? 'uid=0(root) gid=0(root) groups=0(root)\n' : 'uid=1000(student) gid=1000(student) groups=1000(student),27(sudo),988(docker)\n'); };
  HC.groups = c => { c.out('student sudo docker\n'); };
  HC.whoami = c => { c.out(c.sh.sudo ? 'root\n' : 'student\n'); };
  async function edit(c) {
    const f = c.args.filter(a => !a.startsWith('-'))[0];
    if (!f) { c.err(`사용법: ${c.argv[0]} 파일이름\n`); return 1; }
    const p = c.sh.abs(f);
    if (!c.io.edit) { c.err('편집기를 열 수 없습니다.\n'); return 1; }
    if (c.sh.fs.stat(p) === 'dir') { c.err(`"${f}" is a directory\n`); return 1; }
    const r = await c.io.edit(p, Host.fs.read(p) || '', { host: true });
    if (r != null) Host.fs.write(p, r);
    return 0;
  }
  HC.nano = edit; HC.vi = edit; HC.vim = edit; HC.code = edit; HC.edit = edit; HC.gedit = edit;
  HC.open = c => { const u = c.args[0] || ''; if (window.Lab) Lab.openBrowser(/^https?:/.test(u) ? u : 'http://' + u); return 0; };
  HC['xdg-open'] = HC.open;
  HC.mkfile = null;
  HC.help = c => {
    c.out(`\x1b[1m이 실습 터미널에서 쓸 수 있는 명령\x1b[0m

 \x1b[36mdocker\x1b[0m …           run · ps · images · build · exec · logs · network · volume · compose …
 \x1b[36mkubectl\x1b[0m · minikube   쿠버네티스 실습 (15장)
 \x1b[36mcurl\x1b[0m · wget      http://localhost:포트 로 컨테이너에 요청 보내기
 \x1b[36mnano\x1b[0m · code 파일  📝 파일 탭에서 편집기 열기
 \x1b[36mopen\x1b[0m URL         🌐 브라우저 탭에서 열기
 ls · cd · cat · mkdir · rm · cp · mv · echo · tree · grep · head · tail · wc · env · ps · ip addr
 sudo systemctl restart docker   Docker 데몬 재시작 (재시작 정책 실험)

 \x1b[2m단축키: ↑↓ 이전 명령 · Tab 자동 완성 · Ctrl+C 중지 · Ctrl+L 화면 지우기 · Ctrl+P Ctrl+Q 컨테이너에서 빠져나오기(분리)\x1b[0m
`);
  };
  HC.clear = Sh.core.clear;
  HC['reset-lab'] = async c => { if (window.Lab) { await Lab.resetAll(true); } return 0; };
  HC.exit = c => { c.out('(이 터미널은 닫을 수 없습니다. 새 탭은 오른쪽 위 + 버튼)\n'); return 0; };
  HC.logout = HC.exit;
  HC.watch = async c => {
    let n = 2; const a = c.args.slice();
    if (a[0] === '-n') { n = +a[1]; a.splice(0, 2); }
    if (!c.io.live) return c.sh.exec(a.join(' '), c.io);
    const run = async () => { let buf = ''; await c.sh.exec(a.join(' '), Object.assign({}, c.io, { out: t => { buf += t; }, err: t => { buf += t; }, live: null })); return `Every ${n.toFixed(1)}s: ${a.join(' ')}\n\n${buf}`; };
    const live = c.io.live(await run());
    while (await U.sleep(n * 1000, c.io.signal)) live.update(await run());
    live.done(); return 0;
  };
  HC.dockerd = c => { c.err('(시뮬레이터) dockerd 는 이미 실행 중입니다. 재시작: sudo systemctl restart docker\n'); return 1; };
  HC.cowsay = c => Apps.CMDS.cowsay(c);

  function makeShell() {
    const cmds = Object.assign({}, Sh.core);
    Object.keys(HC).forEach(k => { if (HC[k]) cmds[k] = HC[k]; });
    const sh = new Sh.Shell({ fs: null, cmds, user: 'student', host: 'docker-lab', name: 'bash', env: { HOME, USER: 'student', LANG: 'ko_KR.UTF-8', TERM: 'xterm-256color', SHELL: '/bin/bash', PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin' }, cwd: HOME });
    sh.fs = hostView(sh);
    sh.eng = Docker.engine; sh.ct = null;
    sh.promptFn = s => `\x1b[1;32m${s.sudo ? 'root' : 'student'}@docker-lab\x1b[0m:\x1b[1;34m${s.cwd === HOME ? '~' : s.cwd.startsWith(HOME + '/') ? '~' + s.cwd.slice(HOME.length) : s.cwd}\x1b[0m$ `;
    sh.notFound = (argv, io) => {
      const g = U.closest(argv[0], Object.keys(cmds));
      io.err(`${argv[0]}: command not found${g ? `\n(혹시 ${g} ?)` : ''}\n`);
      return 127;
    };
    return sh;
  }

  window.Host = Host;
  window.HostShell = { make: makeShell, HC };
})();
