/* ===================================================================
   가상 Docker 엔진 (dockerd 흉내)
   이미지 · 컨테이너 · 네트워크 · 볼륨 · 프로세스 · 가상 HTTP 네트워크
   =================================================================== */
(function () {
  'use strict';
  const { FS, LayerFS, norm } = VFS;
  const TS = 0.25;              // 헬스체크 · 재시작 대기 · stop 타임아웃 시간 축소 비율

  const ADJ = ['admiring', 'adoring', 'agitated', 'amazing', 'angry', 'awesome', 'blissful', 'bold', 'brave', 'busy', 'charming', 'clever', 'cool', 'compassionate', 'confident', 'dazzling', 'determined', 'eager', 'ecstatic', 'elegant', 'epic', 'festive', 'focused', 'friendly', 'funny', 'gallant', 'gifted', 'goofy', 'gracious', 'happy', 'hopeful', 'hungry', 'infallible', 'inspiring', 'jolly', 'keen', 'kind', 'laughing', 'loving', 'lucid', 'magical', 'modest', 'musing', 'nice', 'nifty', 'optimistic', 'peaceful', 'pensive', 'practical', 'priceless', 'quirky', 'relaxed', 'romantic', 'serene', 'sharp', 'silly', 'sleepy', 'stoic', 'sweet', 'tender', 'trusting', 'upbeat', 'vibrant', 'vigilant', 'wizardly', 'wonderful', 'youthful', 'zealous'];
  const SCI = ['albattani', 'babbage', 'banach', 'bell', 'bohr', 'curie', 'darwin', 'dijkstra', 'einstein', 'euclid', 'euler', 'fermat', 'feynman', 'galileo', 'gauss', 'goldberg', 'hawking', 'hopper', 'hypatia', 'jang', 'kepler', 'knuth', 'lamport', 'lovelace', 'mayer', 'mccarthy', 'meitner', 'newton', 'nobel', 'noether', 'pascal', 'pasteur', 'planck', 'ritchie', 'shannon', 'shockley', 'tesla', 'thompson', 'torvalds', 'turing', 'volhard', 'wozniak', 'wright', 'yalow'];

  function blank() {
    return {
      images: [], containers: [], volumes: [], networks: [
        { id: U.hash('net:bridge'), name: 'bridge', driver: 'bridge', scope: 'local', subnet: '172.17.0.0/16', gateway: '172.17.0.1', created: Date.now(), internal: false, builtin: true, next: 2 },
        { id: U.hash('net:host'), name: 'host', driver: 'host', scope: 'local', subnet: '', gateway: '', created: Date.now(), builtin: true, next: 0 },
        { id: U.hash('net:none'), name: 'none', driver: 'null', scope: 'local', subnet: '', gateway: '', created: Date.now(), builtin: true, next: 0 }
      ],
      registry: {}, hubPushed: {}, login: null, buildCache: {}, netSeq: 18, events: [], daemon: { running: true }
    };
  }

  class Engine extends U.Emitter {
    constructor() {
      super();
      this.s = blank();
      this.proc = {};   // id → { ctl, listeners:{port:{fn, bind}}, attach, ready }
      this.kube = null;
      this._saveT = null;
    }

    /* ------------------------------------------------ 저장 · 불러오기 --- */
    load() {
      const d = U.store.get('engine', null);
      if (d && d.images) {
        this.s = Object.assign(blank(), d);
        // 실행 중이던 컨테이너는 다시 프로세스를 띄운다 (조용히)
        this.s.containers.forEach(c => {
          if (c.state.status === 'running' || c.state.status === 'restarting' || c.state.status === 'paused') {
            const paused = c.state.status === 'paused';
            c.state.status = 'running'; c.state.restarting = false;
            this._launch(c, { resume: true });
            if (paused) { c.state.status = 'paused'; c.state.paused = true; }
          }
        });
      }
    }
    save() {
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => {
        const copy = Object.assign({}, this.s, { events: this.s.events.slice(-200) });
        copy.containers = copy.containers.map(c => Object.assign({}, c, { logs: c.logs.slice(-400) }));
        U.store.set('engine', copy);
      }, 300);
    }
    changed(what) { this.save(); this.emit('change', what || 'any'); }
    reset() {
      Object.keys(this.proc).forEach(id => { try { this.proc[id].ctl.abort(); } catch (_) {} });
      this.proc = {};
      this.s = blank();
      U.store.del('engine');
      this.changed('reset');
    }
    event(type, action, obj) {
      const e = { t: Date.now(), type, action, id: obj && obj.id, name: obj && (obj.name || (obj.repoTags && obj.repoTags[0])) };
      this.s.events.push(e);
      if (this.s.events.length > 300) this.s.events.splice(0, 100);
      this.emit('event', e);
    }

    /* ------------------------------------------------ 이미지 --- */
    findImage(ref) {
      if (!ref) return null;
      ref = String(ref).replace(/^sha256:/, '');
      const r = Hub.resolve(ref);
      const full = r.repo + ':' + r.tag;
      let img = this.s.images.find(i => i.repoTags.includes(full) || i.repoTags.includes('docker.io/' + full));
      if (img) return img;
      if (/^[0-9a-f]{4,64}$/.test(ref)) {
        const m = this.s.images.filter(i => i.id.startsWith(ref));
        if (m.length === 1) return m[0];
      }
      if (r.digest) return this.s.images.find(i => (i.repoDigests || []).some(d => d.endsWith(r.digest))) || null;
      return null;
    }
    imageName(img) { return img ? (img.repoTags[0] || '<none>:<none>') : '<none>'; }
    usedLayers() { const s = new Set(); this.s.images.forEach(i => i.layers.forEach(l => s.add(l.id))); return s; }

    /** 레지스트리에서 이미지 찾기: Docker Hub(가상) 또는 localhost:5000 등 */
    remoteImage(ref) {
      const r = Hub.resolve(ref);
      const key = r.repo + ':' + r.tag;
      if (/^(localhost|127\.0\.0\.1)(:\d+)?\//.test(r.repo)) {
        const reg = this.registryAt(r.repo.split('/')[0]);
        if (!reg.ok) return { error: reg.error };
        const snap = this.s.registry[key];
        return snap ? { img: JSON.parse(JSON.stringify(snap)) } : { error: `manifest for ${key} not found: manifest unknown: manifest unknown` };
      }
      if (this.s.hubPushed[key]) return { img: JSON.parse(JSON.stringify(this.s.hubPushed[key])) };
      const inf = Hub.info(ref);
      if (!inf) return { error: `pull access denied for ${r.repo}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied` };
      if (inf.missingTag) return { error: `manifest for ${key} not found: manifest unknown: manifest unknown` };
      return { img: Hub.makeImage(ref) };
    }
    registryAt(hostport) {
      const port = +(hostport.split(':')[1] || 80);
      const c = this.hostPortOwner(port);
      if (!c || c.kindCache !== 'registry') return { ok: false, error: `Get "http://${hostport}/v2/": dial tcp 127.0.0.1:${port}: connect: connection refused` };
      return { ok: true, c };
    }

    /** docker pull (진행 표시 포함) */
    async pull(ref, io, opts) {
      opts = opts || {};
      const r = Hub.resolve(ref);
      const key = r.repo + ':' + r.tag;
      const q = opts.quiet;
      if (!q && !opts.implicit) io.out(`${r.tag}: Pulling from ${r.repo.includes('/') ? r.repo : 'library/' + r.repo}\n`);
      if (!q && opts.implicit) io.out(`Unable to find image '${key}' locally\n${r.tag}: Pulling from ${r.repo.includes('/') ? r.repo : 'library/' + r.repo}\n`);
      await U.sleep(250, io.signal);
      const rem = this.remoteImage(ref);
      if (rem.error) {
        if (!q) io.err((opts.implicit ? 'docker: Error response from daemon: ' : 'Error response from daemon: ') + rem.error + '\n');
        return null;
      }
      const img = rem.img;
      const have = this.usedLayers();
      const existing = this.findImage(key);
      if (existing && existing.id === img.id) {
        if (!q) io.out(`Digest: sha256:${(img.repoDigests[0] || '').split(':').pop()}\nStatus: Image is up to date for ${key}\n${r.repo.includes('.') || r.repo.includes(':') ? '' : 'docker.io/'}${r.repo.includes('/') ? '' : 'library/'}${key}\n`);
        return existing;
      }
      const lines = img.layers.map(l => ({ l, id: l.id.slice(0, 12), exists: have.has(l.id) }));
      if (!q && io.progress) {
        // 진행 막대 애니메이션
        const h = io.progress(lines.map(x => `${x.id}: ${x.exists ? 'Already exists' : 'Pulling fs layer'}`));
        for (let step = 1; step <= 6; step++) {
          if (io.signal && io.signal.aborted) return null;
          await U.sleep(opts.fast ? 30 : 120 + Math.min(260, img.size / 3e6), io.signal);
          lines.forEach((x, i) => {
            if (x.exists) return;
            const tot = x.l.size;
            let txt;
            if (step < 4) { const done = tot * step / 3; txt = `${x.id}: Downloading [${bar(step / 3)}]  ${U.size(done)}/${U.size(tot)}`; }
            else if (step < 6) txt = `${x.id}: Extracting [${bar((step - 3) / 2)}]  ${U.size(tot * (step - 3) / 2)}/${U.size(tot)}`;
            else txt = `${x.id}: Pull complete`;
            h.set(i, txt);
          });
        }
        h.done();
      } else if (!q) {
        lines.forEach(x => io.out(`${x.id}: ${x.exists ? 'Already exists' : 'Pull complete'}\n`));
      }
      if (existing) existing.repoTags = existing.repoTags.filter(t => t !== key);
      const same = this.s.images.find(i => i.id === img.id);
      if (same) { if (!same.repoTags.includes(key)) same.repoTags.push(key); }
      else { img.repoTags = [key]; img.pulledAt = Date.now(); this.s.images.push(img); }
      if (existing && !existing.repoTags.length) existing.dangling = true;
      if (!q) io.out(`Digest: sha256:${(img.repoDigests[0] || '').split(':').pop()}\nStatus: Downloaded newer image for ${key}\n${opts.implicit ? '' : (r.repo.includes('/') ? '' : 'docker.io/library/') + key + '\n'}`);
      this.event('image', 'pull', img);
      this.changed('image');
      return same || img;
    }

    tagImage(src, target) {
      const img = this.findImage(src);
      if (!img) throw new Error(`No such image: ${src}`);
      const r = Hub.resolve(target);
      const key = r.repo + ':' + r.tag;
      this.s.images.forEach(i => { if (i !== img) i.repoTags = i.repoTags.filter(t => t !== key); });
      if (!img.repoTags.includes(key)) img.repoTags.push(key);
      img.dangling = false;
      this.event('image', 'tag', img);
      this.changed('image');
      return img;
    }

    /** docker rmi → 출력 줄 배열 */
    removeImage(ref, force) {
      const img = this.findImage(ref);
      if (!img) throw new Error(`No such image: ${ref}`);
      const users = this.s.containers.filter(c => c.imageId === img.id);
      const r = Hub.resolve(ref);
      const key = r.repo + ':' + r.tag;
      const byTag = img.repoTags.includes(key);
      const out = [];
      if (!byTag && img.repoTags.length > 1 && !force) throw new Error(`conflict: unable to delete ${img.id.slice(0, 12)} (must be forced) - image is referenced in multiple repositories`);
      if (byTag && img.repoTags.length > 1) {
        img.repoTags = img.repoTags.filter(t => t !== key);
        out.push(`Untagged: ${key}`);
        this.changed('image');
        return out;
      }
      if (users.length && !force) {
        const running = users.find(c => c.state.status === 'running');
        const who = running || users[0];
        throw new Error(`conflict: unable to ${byTag ? `remove repository reference "${ref}"` : `delete ${img.id.slice(0, 12)}`} (must be forced) - container ${who.id.slice(0, 12)} is using its referenced image ${img.id.slice(0, 12)}`);
      }
      if (users.some(c => c.state.status === 'running') && force && !byTag) throw new Error(`conflict: unable to delete ${img.id.slice(0, 12)} (cannot be forced) - image is being used by running container ${users[0].id.slice(0, 12)}`);
      img.repoTags.forEach(t => out.push(`Untagged: ${t}`));
      (img.repoDigests || []).forEach(d => out.push(`Untagged: ${d}`));
      if (users.length) { img.repoTags = []; img.dangling = true; this.changed('image'); return out; }
      this.s.images = this.s.images.filter(i => i !== img);
      out.push(`Deleted: sha256:${img.id}`);
      const still = this.usedLayers();
      img.layers.slice().reverse().forEach(l => { if (!still.has(l.id)) out.push(`Deleted: sha256:${l.id}`); });
      this.event('image', 'delete', img);
      this.changed('image');
      return out;
    }

    /* ------------------------------------------------ 컨테이너 찾기 --- */
    findContainer(key) {
      if (!key) return null;
      key = String(key).replace(/^\//, '');
      let c = this.s.containers.find(x => x.name === key || x.id === key);
      if (c) return c;
      const m = this.s.containers.filter(x => x.id.startsWith(key));
      return m.length === 1 ? m[0] : null;
    }
    randomName() {
      for (let i = 0; i < 50; i++) {
        const n = ADJ[Math.random() * ADJ.length | 0] + '_' + SCI[Math.random() * SCI.length | 0];
        if (!this.findContainer(n)) return n;
      }
      return 'c_' + U.hex(6);
    }
    hostPortOwner(port, proto) {
      for (const c of this.s.containers) {
        if (c.state.status !== 'running' && c.state.status !== 'paused' && c.state.status !== 'restarting') continue;
        if ((c.hostConfig.ports || []).some(p => +p.hostPort === +port && (p.proto || 'tcp') === (proto || 'tcp'))) return c;
      }
      return null;
    }
    network(key) {
      if (!key) return null;
      return this.s.networks.find(n => n.name === key || n.id === key) || (this.s.networks.filter(n => n.id.startsWith(key)).length === 1 ? this.s.networks.find(n => n.id.startsWith(key)) : null);
    }
    volume(name) { return this.s.volumes.find(v => v.name === name) || null; }

    /* ------------------------------------------------ 볼륨 --- */
    createVolume(name, opts) {
      opts = opts || {};
      name = name || U.hex(64);
      let v = this.volume(name);
      if (v) return v;
      v = { name, driver: opts.driver || 'local', created: Date.now(), mountpoint: `/var/lib/docker/volumes/${name}/_data`, labels: opts.labels || {}, anonymous: !!opts.anonymous, fs: new FS().toJSON() };
      this.s.volumes.push(v);
      this.event('volume', 'create', v);
      this.changed('volume');
      return v;
    }
    removeVolume(name, force) {
      const v = this.volume(name);
      if (!v) throw new Error(`get ${name}: no such volume`);
      const users = this.s.containers.filter(c => (c.hostConfig.mounts || []).some(m => m.type === 'volume' && m.source === name));
      if (users.length) throw new Error(`remove ${name}: volume is in use - [${users.map(c => c.id).join(', ')}]`);
      this.s.volumes = this.s.volumes.filter(x => x !== v);
      this.event('volume', 'destroy', v);
      this.changed('volume');
    }
    volFS(v) {
      if (!v._fs) {
        Object.defineProperty(v, '_fs', { value: new FS(v.fs), enumerable: false, writable: true });
        const self = this;
        const fs = v._fs;
        const w = fs.write.bind(fs), mk = fs.mkdir.bind(fs), rm = fs.rm.bind(fs);
        const sync = () => { v.fs = fs.toJSON(); self.save(); };
        fs.write = (p, c) => { w(p, c); sync(); };
        fs.mkdir = p => { mk(p); sync(); };
        fs.rm = (p, r) => { const x = rm(p, r); sync(); return x; };
      }
      return v._fs;
    }

    /* ------------------------------------------------ 네트워크 --- */
    createNetwork(name, opts) {
      opts = opts || {};
      if (this.network(name) && this.network(name).name === name) throw new Error(`network with name ${name} already exists`);
      const n = this.s.netSeq++;
      const net = { id: U.hex(64), name, driver: opts.driver || 'bridge', scope: 'local', subnet: opts.subnet || `172.${n}.0.0/16`, gateway: `172.${n}.0.1`, created: Date.now(), internal: !!opts.internal, labels: opts.labels || {}, next: 2 };
      if (opts.subnet) { const b = opts.subnet.split('.'); net.gateway = `${b[0]}.${b[1]}.${b[2]}.1`; }
      this.s.networks.push(net);
      this.event('network', 'create', net);
      this.changed('network');
      return net;
    }
    removeNetwork(key) {
      const net = this.network(key);
      if (!net) throw new Error(`network ${key} not found`);
      if (net.builtin) throw new Error(`${net.name} is a pre-defined network and cannot be removed`);
      const users = this.s.containers.filter(c => c.networks[net.name]);
      if (users.length) throw new Error(`error while removing network: network ${net.name} id ${net.id} has active endpoints`);
      this.s.networks = this.s.networks.filter(x => x !== net);
      this.event('network', 'destroy', net);
      this.changed('network');
    }
    allocIp(net) {
      if (!net.subnet) return '';
      const b = net.subnet.split('.');
      const used = new Set(this.s.containers.map(c => c.networks[net.name] && c.networks[net.name].ip).filter(Boolean));
      for (let i = 2; i < 250; i++) { const ip = `${b[0]}.${b[1]}.0.${i}`; if (!used.has(ip)) return ip; }
      return `${b[0]}.${b[1]}.1.${Math.random() * 250 | 0}`;
    }
    connect(netKey, c, opts) {
      const net = this.network(netKey);
      if (!net) throw new Error(`network ${netKey} not found`);
      if (c.networks[net.name]) throw new Error(`endpoint with name ${c.name} already exists in network ${net.name}`);
      if ((net.name === 'host' || net.name === 'none') || c.networks.host || c.networks.none) {
        if (Object.keys(c.networks).length) throw new Error(`container cannot be disconnected from host network or connected to host network`);
      }
      c.networks[net.name] = { ip: '', aliases: (opts && opts.aliases) || [], mac: '02:42:' + U.hex(8).match(/../g).join(':'), id: net.id };
      if (c.state.status === 'running') c.networks[net.name].ip = this.allocIp(net);
      this.event('network', 'connect', net);
      this.changed('network');
    }
    disconnect(netKey, c) {
      const net = this.network(netKey);
      if (!net) throw new Error(`network ${netKey} not found`);
      if (!c.networks[net.name]) throw new Error(`container ${c.id.slice(0, 12)} is not connected to network ${net.name}`);
      delete c.networks[net.name];
      this.event('network', 'disconnect', net);
      this.changed('network');
    }

    /* ------------------------------------------------ 컨테이너 만들기 --- */
    /**
     * o: { image(ref), img(obj), name, cmd[], entrypoint[]|null, env[], ports[{hostIp,hostPort,containerPort,proto}], publishAll,
     *      mounts[{type,source,target,ro}], network, aliases[], restart{name,max}, memory, cpus, rm, tty, interactive,
     *      workdir, user, hostname, labels{}, health{test,interval,timeout,retries,startPeriod}|'none', readonly, init, compose{} }
     */
    create(o) {
      const img = o.img || this.findImage(o.image);
      if (!img) throw new Error(`No such image: ${o.image}`);
      if (o.name) {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(o.name)) throw new Error(`Invalid container name (${o.name}), only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed`);
        const ex = this.findContainer(o.name);
        if (ex && ex.name === o.name) throw new Error(`Conflict. The container name "/${o.name}" is already in use by container "${ex.id}". You have to remove (or rename) that container to be able to reuse that name.`);
      }
      const netName = o.network || 'bridge';
      const net = this.network(netName);
      if (!net && !/^container:/.test(netName)) throw new Error(`network ${netName} not found`);
      const id = U.hex(64);
      const cfg = img.config || {};
      const env = (cfg.Env || []).slice();
      (o.env || []).forEach(e => {
        const k = e.split('=')[0];
        const i = env.findIndex(x => x.split('=')[0] === k);
        if (i >= 0) env[i] = e; else env.push(e);
      });
      const mounts = (o.mounts || []).map(m => Object.assign({}, m));
      // 볼륨 확인 / 익명 볼륨
      mounts.forEach(m => {
        if (m.type === 'volume') {
          if (!m.source) { const v = this.createVolume(null, { anonymous: true }); m.source = v.name; }
          else if (!this.volume(m.source)) this.createVolume(m.source);
        }
      });
      (cfg.Volumes || []).forEach(t => {
        if (!mounts.some(m => m.target === t)) { const v = this.createVolume(null, { anonymous: true }); mounts.push({ type: 'volume', source: v.name, target: t, anonymous: true }); }
      });
      let ports = (o.ports || []).map(p => Object.assign({ hostIp: '0.0.0.0', proto: 'tcp' }, p));
      if (o.publishAll) (cfg.ExposedPorts || []).forEach((ep, i) => { const [cp, pr] = ep.split('/'); if (!ports.some(p => +p.containerPort === +cp)) ports.push({ hostIp: '0.0.0.0', hostPort: String(32768 + this.s.containers.length * 3 + i), containerPort: cp, proto: pr || 'tcp' }); });
      ports.forEach(p => { if (!p.hostPort) p.hostPort = String(32768 + Math.floor(Math.random() * 28000)); });
      const c = {
        id, name: o.name || this.randomName(),
        image: o.image || this.imageName(img), imageId: img.id,
        created: Date.now(),
        cmd: o.cmd && o.cmd.length ? o.cmd : (o.entrypoint ? [] : (cfg.Cmd || [])),
        entrypoint: o.entrypoint != null ? o.entrypoint : (cfg.Entrypoint || null),
        env, workdir: o.workdir || cfg.WorkingDir || '/', user: o.user || cfg.User || '',
        hostname: o.hostname || id.slice(0, 12),
        labels: Object.assign({}, cfg.Labels || {}, o.labels || {}),
        tty: !!o.tty, interactive: !!o.interactive,
        state: { status: 'created', running: false, paused: false, restarting: false, oomKilled: false, dead: false, pid: 0, exitCode: 0, error: '', startedAt: null, finishedAt: null },
        hostConfig: { ports, mounts, restart: o.restart || { name: 'no', max: 0 }, memory: o.memory || 0, cpus: o.cpus || 0, autoRemove: !!o.rm, readonly: !!o.readonly, init: !!o.init, networkMode: netName, capAdd: o.capAdd || [], capDrop: o.capDrop || [], privileged: !!o.privileged, pidsLimit: o.pidsLimit || 0 },
        networks: {},
        health: null,
        healthcheck: o.health === 'none' ? null : (o.health || (cfg.Healthcheck ? Object.assign({}, cfg.Healthcheck) : null)),
        upper: new FS().toJSON(),
        logs: [], restartCount: 0, pkgs: [],
        compose: o.compose || null,
        stopSignal: cfg.StopSignal || 'SIGTERM'
      };
      if (net) c.networks[net.name] = { ip: '', aliases: (o.aliases || []).slice(), mac: '02:42:' + U.hex(8).match(/../g).join(':'), id: net.id };
      if (c.healthcheck) c.health = { status: 'starting', failingStreak: 0, log: [] };
      Object.defineProperty(c, 'kindCache', { value: img.kind, enumerable: false, writable: true });
      this.s.containers.push(c);
      this.event('container', 'create', c);
      this.changed('container');
      return c;
    }
    img(c) { return this.s.images.find(i => i.id === c.imageId) || null; }
    kind(c) { const i = this.img(c); return i ? i.kind : 'shell'; }

    /* ------------------------------------------------ 파일 시스템 --- */
    containerFS(c) {
      const img = this.img(c);
      const lower = img ? (img._fs || Object.defineProperty(img, '_fs', { value: new FS(img.fs), enumerable: false, writable: true })._fs) : new FS();
      if (!c._upper) {
        Object.defineProperty(c, '_upper', { value: new FS(c.upper), enumerable: false, writable: true });
        c._upper._wh = c.upper._wh || [];
      }
      const self = this;
      const mounts = (c.hostConfig.mounts || []).map(m => {
        if (m.type === 'volume') { const v = this.volume(m.source); return v ? { target: m.target, fs: this.volFS(v), root: '/', ro: m.ro } : null; }
        if (m.type === 'bind') return { target: m.target, fs: window.Host ? Host.fs : new FS(), root: m.source, ro: m.ro };
        if (m.type === 'tmpfs') { if (!c._tmp) Object.defineProperty(c, '_tmp', { value: {}, enumerable: false }); c._tmp[m.target] = c._tmp[m.target] || new FS(); return { target: m.target, fs: c._tmp[m.target], root: '/' }; }
        return null;
      }).filter(Boolean);
      const lfs = new LayerFS(lower, c._upper, mounts);
      lfs.readonly = c.hostConfig.readonly;
      // 쓰기 층 변경을 저장
      const up = c._upper;
      ['write', 'mkdir', 'rm'].forEach(k => {
        const orig = lfs[k].bind(lfs);
        lfs[k] = (...a) => { const r = orig(...a); c.upper = Object.assign(up.toJSON(), { _wh: up._wh }); self.save(); return r; };
      });
      return lfs;
    }
    /** 컨테이너 안에서 쓸 수 있는 명령 목록 */
    hasTool(c, name) {
      const img = this.img(c);
      const all = new Set([].concat(img ? img.pkgs : [], c.pkgs || []));
      return all.has('bin:' + name);
    }
    hasPkg(c, p) {
      const img = this.img(c);
      return [].concat(img ? img.pkgs : [], c.pkgs || []).includes(p);
    }
    envOf(c) { const e = {}; c.env.forEach(x => { const i = x.indexOf('='); if (i > 0) e[x.slice(0, i)] = x.slice(i + 1); }); return e; }

    /* ------------------------------------------------ 시작 · 정지 --- */
    /** 시작 (오류는 Error 로 던짐) */
    async start(c, io) {
      if (c.state.status === 'running' || c.state.status === 'paused') return;
      if (c.state.status === 'removing') throw new Error('container is marked for removal and cannot be started');
      const img = this.img(c);
      if (!img) throw new Error(`No such image: ${c.image}`);
      // 포트 충돌
      for (const p of c.hostConfig.ports) {
        const other = this.hostPortOwner(p.hostPort, p.proto);
        if (other && other !== c) {
          c.state.error = `driver failed programming external connectivity on endpoint ${c.name} (${U.hex(64)}): Bind for ${p.hostIp || '0.0.0.0'}:${p.hostPort} failed: port is already allocated`;
          c.state.exitCode = 128;
          this.changed('container');
          throw new Error(c.state.error);
        }
        if (this.kube && this.kube.usesHostPort && this.kube.usesHostPort(+p.hostPort)) {
          throw new Error(`driver failed programming external connectivity on endpoint ${c.name}: Bind for 0.0.0.0:${p.hostPort} failed: port is already allocated`);
        }
      }
      // host 네트워크 포트 충돌은 무시 (단순화)
      if (c.hostConfig.networkMode && /^container:/.test(c.hostConfig.networkMode)) {
        const other = this.findContainer(c.hostConfig.networkMode.slice(10));
        if (!other || other.state.status !== 'running') throw new Error(`cannot join network of a non running container: ${c.hostConfig.networkMode.slice(10)}`);
      }
      // 실행 파일 확인
      const chk = Apps.check(this, c);
      if (chk) {
        c.state.error = chk.msg; c.state.exitCode = chk.code || 127;
        this.changed('container');
        throw new Error(chk.msg);
      }
      Object.keys(c.networks).forEach(n => { const net = this.network(n); if (net && !c.networks[n].ip) c.networks[n].ip = this.allocIp(net); });
      this._launch(c, {});
      this.event('container', 'start', c);
      this.changed('container');
    }

    _launch(c, opts) {
      const ctl = new AbortController();
      const p = this.proc[c.id] = { ctl, listeners: {}, ready: false, startT: Date.now(), mem: 0 };
      c.state.status = 'running'; c.state.running = true; c.state.paused = false; c.state.restarting = false; c.state.oomKilled = false;
      if (!opts.resume) { c.state.startedAt = Date.now(); c.state.exitCode = 0; c.state.error = ''; }
      c.state.pid = 1000 + (Math.random() * 30000 | 0);
      if (c.healthcheck) { c.health = c.health && opts.resume ? c.health : { status: 'starting', failingStreak: 0, log: [] }; this._healthLoop(c, p); }
      const io = {
        out: s => this.log(c, s, 'stdout'),
        err: s => this.log(c, s, 'stderr'),
        signal: ctl.signal
      };
      const run = Apps.run(this, c, io, p, opts).catch(e => { console.error(e); this.log(c, String(e.message || e) + '\n', 'stderr'); return 1; });
      run.then(code => this._exited(c, p, code));
    }

    _exited(c, p, code) {
      if (this.proc[c.id] !== p) return;          // 이미 다른 프로세스로 바뀜
      delete this.proc[c.id];
      if (p.forcedCode != null) code = p.forcedCode;
      c.state.status = 'exited'; c.state.running = false; c.state.paused = false; c.state.pid = 0;
      c.state.exitCode = code == null ? 0 : code;
      c.state.finishedAt = Date.now();
      if (p.oom) c.state.oomKilled = true;
      if (c.health) c.health.status = 'unhealthy';
      if (c.healthcheck) c.health = null;
      Object.keys(c.networks).forEach(n => { c.networks[n].ip = ''; });
      this.event('container', 'die', c);
      if (p.onExit) p.onExit(c.state.exitCode);
      // 재시작 정책
      const rp = c.hostConfig.restart || { name: 'no' };
      const userStop = p.userStop;
      let again = false;
      if (!userStop && this.s.daemon.running) {
        if (rp.name === 'always' || rp.name === 'unless-stopped') again = true;
        if (rp.name === 'on-failure' && c.state.exitCode !== 0 && (!rp.max || c.restartCount < rp.max)) again = true;
      }
      if (c.hostConfig.autoRemove && !again) {
        this.changed('container');
        setTimeout(() => { this._remove(c); }, 50);
        return;
      }
      if (again) {
        c.state.status = 'restarting'; c.state.restarting = true;
        const delay = Math.min(60000, 100 * Math.pow(2, Math.min(c.restartCount, 9)));
        this.changed('container');
        const t = setTimeout(() => {
          if (c.state.status !== 'restarting' || !this.s.containers.includes(c)) return;
          c.restartCount++;
          this.event('container', 'restart', c);
          const chk = Apps.check(this, c);
          if (chk) { c.state.status = 'exited'; c.state.restarting = false; c.state.exitCode = chk.code || 127; this.changed('container'); return; }
          Object.keys(c.networks).forEach(n => { const net = this.network(n); if (net) c.networks[n].ip = this.allocIp(net); });
          this._launch(c, {});
          this.changed('container');
        }, Math.max(600, delay * 10 * TS));
        Object.defineProperty(c, '_rt', { value: t, enumerable: false, configurable: true, writable: true });
        return;
      }
      this.changed('container');
    }

    /** 정지: SIGTERM → (타임아웃) → SIGKILL */
    async stop(c, timeout, opts) {
      opts = opts || {};
      if (c.state.status === 'restarting') { clearTimeout(c._rt); c.state.status = 'exited'; c.state.restarting = false; c.state.finishedAt = Date.now(); if (!opts.daemon) c.manualStop = true; this.changed('container'); return; }
      if (c.state.status !== 'running' && c.state.status !== 'paused') return;
      const p = this.proc[c.id];
      if (!p) { c.state.status = 'exited'; this.changed('container'); return; }
      p.userStop = !opts.daemon;
      if (!opts.daemon) c.manualStop = true;
      const graceful = Apps.graceful(this, c);
      const done = new Promise(res => { p.onExit = res; });
      this.event('container', 'kill', c);
      if (graceful || c.hostConfig.init) {
        p.forcedCode = graceful ? (graceful === true ? 0 : graceful) : 143;
        p.ctl.abort();
      } else {
        // PID 1 인 셸 · 런타임은 SIGTERM 을 무시 → 타임아웃 뒤 강제 종료
        const t = timeout == null ? 10 : timeout;
        if (t > 0) await U.sleep(Math.min(t, 10) * 1000 * TS);
        p.forcedCode = 137;
        p.ctl.abort();
      }
      await done;
      this.event('container', 'stop', c);
    }
    kill(c, signal) {
      if (c.state.status !== 'running' && c.state.status !== 'paused') throw new Error(`cannot kill container: ${c.name}: container ${c.id} is not running`);
      const p = this.proc[c.id];
      const sig = String(signal || 'KILL').replace(/^SIG/, '');
      // PID 1 은 처리기가 없는 신호를 무시한다 (--init 이 없으면)
      if (!/^(KILL|9)$/.test(sig) && !Apps.graceful(this, c) && !c.hostConfig.init) return;
      p.userStop = true; c.manualStop = true;
      p.forcedCode = sig === 'KILL' || sig === '9' ? 137 : sig === 'INT' ? 130 : 143;
      if (Apps.graceful(this, c) && sig !== 'KILL' && sig !== '9') p.forcedCode = 0;
      p.ctl.abort();
    }
    pause(c) {
      if (c.state.status !== 'running') throw new Error(`Container ${c.id} is not running`);
      c.state.status = 'paused'; c.state.paused = true;
      this.event('container', 'pause', c); this.changed('container');
    }
    unpause(c) {
      if (c.state.status !== 'paused') throw new Error(`Container ${c.id} is not paused`);
      c.state.status = 'running'; c.state.paused = false;
      this.event('container', 'unpause', c); this.changed('container');
    }
    async restart(c, timeout) {
      if (c.state.status === 'running' || c.state.status === 'paused' || c.state.status === 'restarting') await this.stop(c, timeout);
      c.manualStop = false;
      await this.start(c);
    }
    async remove(c, opts) {
      opts = opts || {};
      if ((c.state.status === 'running' || c.state.status === 'paused' || c.state.status === 'restarting') && !opts.force) {
        throw new Error(`cannot remove container "/${c.name}": container is ${c.state.status}: stop the container before removing or force remove`);
      }
      if (c.state.status === 'running' || c.state.status === 'paused' || c.state.status === 'restarting') {
        clearTimeout(c._rt);
        const p = this.proc[c.id];
        if (p) { p.userStop = true; p.forcedCode = 137; c.hostConfig.autoRemove = false; c.hostConfig.restart = { name: 'no' }; const d = new Promise(r => { p.onExit = r; }); p.ctl.abort(); await d; }
      }
      this._remove(c, opts.volumes);
    }
    _remove(c, vols) {
      if (!this.s.containers.includes(c)) return;
      this.s.containers = this.s.containers.filter(x => x !== c);
      // 익명 볼륨은 --rm 이나 -v 일 때 지운다
      if (vols || c.hostConfig.autoRemove) (c.hostConfig.mounts || []).forEach(m => { if (m.type === 'volume') { const v = this.volume(m.source); if (v && v.anonymous) this.s.volumes = this.s.volumes.filter(x => x !== v); } });
      this.event('container', 'destroy', c);
      this.changed('container');
    }

    log(c, text, stream) {
      if (!text) return;
      const lines = String(text).split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      const t = Date.now();
      lines.forEach(m => { const e = { t, s: stream || 'stdout', m }; c.logs.push(e); this.emit('log', c, e); });
      if (c.logs.length > 1500) c.logs.splice(0, 500);
      this.save();
    }

    /** 데몬 재시작 (systemctl restart docker) */
    async restartDaemon(io) {
      this.s.daemon.running = false;
      const running = this.s.containers.filter(c => c.state.status === 'running' || c.state.status === 'restarting' || c.state.status === 'paused');
      await Promise.all(running.map(c => this.stop(c, 10, { daemon: true })));
      await U.sleep(500);
      this.s.daemon.running = true;
      for (const c of this.s.containers) {
        const rp = c.hostConfig.restart.name;
        if ((rp === 'always') || (rp === 'unless-stopped' && !c.manualStop) || (rp === 'on-failure' && running.includes(c) && false)) {
          try { await this.start(c); } catch (e) { }
        }
      }
      this.changed('daemon');
    }

    /* ------------------------------------------------ 헬스체크 --- */
    _healthLoop(c, p) {
      const hc = c.healthcheck;
      if (!hc || !hc.test || hc.test[0] === 'NONE') return;
      const interval = (hc.interval || 30) * 1000 * TS, start = (hc.startPeriod || 0) * 1000 * TS;
      const tick = async () => {
        if (this.proc[c.id] !== p || p.ctl.signal.aborted) return;
        if (c.state.status === 'running') {
          const cmd = hc.test[0] === 'CMD-SHELL' ? hc.test.slice(1).join(' ') : hc.test[0] === 'CMD' ? hc.test.slice(1).map(a => /\s/.test(a) ? JSON.stringify(a) : a).join(' ') : hc.test.join(' ');
          const r = await this.execCapture(c, cmd);
          if (this.proc[c.id] !== p) return;
          const ok = r.code === 0;
          c.health.log.push({ start: Date.now(), code: r.code, out: r.out.slice(0, 200) });
          if (c.health.log.length > 5) c.health.log.shift();
          if (ok) { c.health.failingStreak = 0; if (c.health.status !== 'healthy') { c.health.status = 'healthy'; this.event('container', 'health_status: healthy', c); this.changed('health'); } }
          else if (Date.now() - p.startT > start) {
            c.health.failingStreak++;
            if (c.health.failingStreak >= (hc.retries || 3) && c.health.status !== 'unhealthy') { c.health.status = 'unhealthy'; this.event('container', 'health_status: unhealthy', c); this.changed('health'); }
          }
          this.save();
        }
        setTimeout(tick, interval);
      };
      setTimeout(tick, Math.min(interval, 1500));
    }

    /** 컨테이너 안에서 명령 실행 → { code, out } */
    async execCapture(c, cmd, opts) {
      let out = '';
      const io = { out: s => { out += s; }, err: s => { out += s; }, signal: (opts && opts.signal) || null };
      const sh = Apps.shell(this, c, Object.assign({ name: 'sh' }, opts || {}));
      let code;
      try { code = await sh.exec(cmd, io); } catch (e) { code = e instanceof Sh.ExitSignal ? e.code : 1; }
      return { code, out };
    }

    /* ------------------------------------------------ 가상 네트워크 --- */
    ipOf(c) { const n = Object.values(c.networks)[0]; return n ? n.ip : ''; }
    /** from: null(호스트) 또는 컨테이너 → { c } | { host:true } | { error } */
    resolveHost(from, host) {
      host = String(host || '').toLowerCase();
      if (!from) {
        if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]', 'host.docker.internal'].includes(host)) return { host: true };
        // 호스트는 브리지 IP 로 직접 닿을 수 있다 (Linux)
        const byIp = this.s.containers.find(c => c.state.status === 'running' && Object.values(c.networks).some(n => n.ip === host));
        if (byIp) return { c: byIp, direct: true };
        return { error: `Could not resolve host: ${host}`, code: 6 };
      }
      if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) return { c: from, self: true };
      if (from.networks.host) {
        if (host === 'host.docker.internal') return { host: true };
      }
      if (host === 'host.docker.internal') return { host: true };
      if (host === from.hostname || host === from.name && from.networks.bridge) return { c: from, self: true };
      const myNets = Object.keys(from.networks).filter(n => n !== 'none');
      const alive = this.s.containers.filter(c => c.state.status === 'running' || c.state.status === 'paused');
      // IP 로 찾기 (같은 네트워크여야 닿음)
      const ipHit = alive.find(c => Object.entries(c.networks).some(([n, v]) => v.ip === host));
      if (ipHit) {
        const shared = Object.keys(ipHit.networks).some(n => myNets.includes(n));
        return shared ? { c: ipHit } : { unreachable: true, c: ipHit };
      }
      // 이름으로 찾기: 사용자 정의 네트워크에서만 DNS 가 된다
      for (const n of myNets) {
        const net = this.network(n);
        if (!net || net.name === 'bridge' || net.name === 'host') continue;
        const hits = alive.filter(c => c.networks[n] && (c.name === host || c.id.startsWith(host) && host.length >= 12 || c.hostname === host || (c.networks[n].aliases || []).includes(host) || (c.compose && c.compose.service === host)));
        if (hits.length) return { c: hits[Math.random() * hits.length | 0] };
      }
      // 링크(--link) 흉내
      if (from.links && from.links[host]) { const t = this.findContainer(from.links[host]); if (t && t.state.status === 'running') return { c: t }; }
      // 쿠버네티스 서비스
      if (this.kube && this.kube.resolve) { const k = this.kube.resolve(host, from); if (k) return k; }
      return { error: `Could not resolve host: ${host}`, code: 6, nxdomain: true };
    }

    /**
     * 가상 HTTP 요청
     * from: null(호스트 브라우저 · curl) 또는 컨테이너
     * → { status, body, type, headers } 또는 { error, code(curl 종료 코드) }
     */
    async http(from, url, opts) {
      opts = opts || {};
      const m = String(url).match(/^(?:(https?):\/\/)?([^/:?#]+|\[[^\]]+\])(?::(\d+))?([^#]*)/i);
      if (!m) return { error: `URL rejected: Malformed input to a URL function`, code: 3 };
      const scheme = (m[1] || 'http').toLowerCase();
      const host = m[2];
      const port = +(m[3] || (scheme === 'https' ? 443 : 80));
      const path = m[4] || '/';
      if (from && from.networks.none) return { error: `Could not resolve host: ${host}`, code: 6 };
      if (from && this.proc[from.id] == null && from.state.status !== 'running') return { error: 'container not running', code: 7 };
      const r = this.resolveHost(from, host);
      if (r.error) {
        if (!from && /\./.test(host) && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) return this.internet(host, path);
        if (from && /\./.test(host) && !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !this.isInternal(from)) return this.internet(host, path);
        return { error: r.error, code: r.code };
      }
      if (r.kube) return r.kube.http(port, path, opts, from);
      let target, cport = port, via = null;
      if (r.host) {
        // 호스트: 게시된 포트 → 컨테이너
        const kh = this.kube && this.kube.hostHttp && this.kube.hostHttp(port, path, opts);
        if (kh) return kh;
        const hostNet = this.s.containers.find(c => c.state.status === 'running' && c.networks.host && this.proc[c.id] && this.proc[c.id].listeners[port]);
        if (hostNet) { target = hostNet; cport = port; }
        else {
          target = this.hostPortOwner(port);
          if (!target) return { error: `Failed to connect to ${host} port ${port} after 0 ms: Couldn't connect to server`, code: 7, refused: true };
          const map = target.hostConfig.ports.find(p => +p.hostPort === port);
          cport = +map.containerPort; via = 'published';
        }
      } else {
        target = r.c;
        if (r.unreachable) return { error: `Failed to connect to ${host} port ${port} after 3001 ms: Timeout was reached`, code: 28, timeout: true };
      }
      if (target.state.status === 'paused') { await U.sleep(1500); return { error: `Operation timed out after 1500 milliseconds with 0 bytes received`, code: 28, timeout: true }; }
      if (target.state.status !== 'running') {
        return via ? { error: `Failed to connect to ${host} port ${port} after 0 ms: Couldn't connect to server`, code: 7 } : { error: `Failed to connect to ${host} port ${port} after 1 ms: Couldn't connect to server`, code: 7 };
      }
      const p = this.proc[target.id];
      const L = p && p.listeners[cport];
      const external = !r.self;
      if (!L || (L.bind === '127.0.0.1' && external)) {
        if (via) return { error: 'Recv failure: Connection reset by peer', code: 56, reset: true, hint: L ? 'loopback' : 'noport', target, cport };
        return { error: `Failed to connect to ${host} port ${port} after 1 ms: Couldn't connect to server`, code: 7, hint: L ? 'loopback' : 'noport' };
      }
      const req = { method: (opts.method || 'GET').toUpperCase(), path, host, port, headers: opts.headers || {}, body: opts.body || '', from: from ? from : null, fromIp: from ? this.ipOf(from) : (via ? (Object.values(target.networks)[0] || {}).ip.replace(/\.\d+$/, '.1') : '127.0.0.1'), target };
      try {
        const res = await L.fn(req);
        return Object.assign({ status: 200, type: 'text/html', headers: {} }, res);
      } catch (e) {
        console.error(e);
        return { status: 500, body: 'Internal Server Error', type: 'text/plain' };
      }
    }
    isInternal(c) { return Object.keys(c.networks).some(n => { const net = this.network(n); return net && net.internal; }); }
    async internet(host, path) {
      await U.sleep(200);
      const known = { 'example.com': '<!doctype html><html><head><title>Example Domain</title></head><body><div><h1>Example Domain</h1><p>This domain is for use in illustrative examples in documents.</p></div></body></html>', 'google.com': '<HTML><HEAD><TITLE>301 Moved</TITLE></HEAD><BODY><H1>301 Moved</H1>The document has moved <A HREF="http://www.google.com/">here</A>.</BODY></HTML>', 'ifconfig.me': '203.0.113.42', 'api.ipify.org': '203.0.113.42', 'hub.docker.com': '<html><title>Docker Hub</title></html>' };
      const k = Object.keys(known).find(k => host === k || host.endsWith('.' + k));
      if (k) return { status: k === 'google.com' ? 301 : 200, body: known[k], type: /^\d/.test(known[k]) ? 'text/plain' : 'text/html' };
      return { status: 200, body: `<html><body><h1>${U.esc(host)}</h1><p>(가상 인터넷: 외부 사이트 응답을 흉내 낸 페이지입니다)</p></body></html>`, type: 'text/html' };
    }
    /** ping: 도달 여부 → { ok, ip, error } */
    ping(from, host) {
      if (from && from.networks.none) return { error: `ping: bad address '${host}'` };
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && !this.s.containers.some(c => Object.values(c.networks).some(n => n.ip === host))) {
        if (/^(8\.8\.8\.8|1\.1\.1\.1)$/.test(host)) return (from && this.isInternal(from)) ? { error: 'ping: sendto: Network unreachable' } : { ok: true, ip: host, ms: 11 };
      }
      const r = this.resolveHost(from, host);
      if (r.error) {
        if (/\./.test(host) && !(from && this.isInternal(from))) return { ok: true, ip: '93.184.215.14', ms: 18 };
        return { error: `ping: bad address '${host}'`, dns: true };
      }
      if (r.host) return { ok: true, ip: from ? (Object.values(from.networks)[0] || {}).ip.replace(/\.\d+$/, '.1') : '127.0.0.1', ms: 0.05 };
      if (r.self) return { ok: true, ip: '127.0.0.1', ms: 0.03 };
      if (r.kube) return { ok: true, ip: r.ip || '10.96.0.10', ms: 0.1 };
      if (r.unreachable) return { timeout: true, ip: host };
      return { ok: true, ip: (Object.entries(r.c.networks).find(([n]) => !from || from.networks[n]) || [null, { ip: this.ipOf(r.c) }])[1].ip, ms: 0.08 + Math.random() * 0.1, c: r.c };
    }

    /** 통계 (docker stats) */
    stats(c) {
      const p = this.proc[c.id];
      const running = c.state.status === 'running';
      const limit = c.hostConfig.memory || 8 * 1024 ** 3;
      const base = running && p ? (p.mem || Apps.memory(this, c)) : 0;
      const mem = running ? Math.min(limit, base * (0.95 + Math.random() * 0.1)) : 0;
      let cpu = running ? (p && p.cpu != null ? p.cpu : Math.random() * 0.5) : 0;
      if (c.hostConfig.cpus && cpu > c.hostConfig.cpus * 100) cpu = c.hostConfig.cpus * 100 * (0.97 + Math.random() * 0.03);
      if (c.state.status === 'paused') cpu = 0;
      return { cpu, mem, limit, pids: running ? (p && p.pids) || (Apps.pids(this, c)) : 0, netIn: running ? (c.logs.length * 120 + 1200) : 0, netOut: running ? c.logs.length * 80 + 300 : 0, blockIn: 0, blockOut: 0 };
    }

    /* ------------------------------------------------ 정리 --- */
    diskUsage() {
      const imgs = this.s.images;
      const layerSize = {};
      imgs.forEach(i => i.layers.forEach(l => { layerSize[l.id] = l.size; }));
      const total = Object.values(layerSize).reduce((a, b) => a + b, 0);
      const active = imgs.filter(i => this.s.containers.some(c => c.imageId === i.id));
      const activeLayers = new Set(); active.forEach(i => i.layers.forEach(l => activeLayers.add(l.id)));
      const reclaim = Object.keys(layerSize).filter(k => !activeLayers.has(k)).reduce((a, k) => a + layerSize[k], 0);
      const cSize = c => Object.values(c.upper.files || {}).reduce((a, s) => a + s.length, 0) + (c.pkgs.length * 4e6);
      const vSize = v => Object.values((v.fs && v.fs.files) || {}).reduce((a, s) => a + s.length, 0);
      return {
        images: { total: imgs.length, active: active.length, size: total, reclaim },
        containers: { total: this.s.containers.length, active: this.s.containers.filter(c => c.state.status === 'running').length, size: this.s.containers.reduce((a, c) => a + cSize(c), 0), reclaim: this.s.containers.filter(c => c.state.status !== 'running').reduce((a, c) => a + cSize(c), 0) },
        volumes: { total: this.s.volumes.length, active: this.s.volumes.filter(v => this.s.containers.some(c => c.hostConfig.mounts.some(m => m.source === v.name))).length, size: this.s.volumes.reduce((a, v) => a + vSize(v), 0), reclaim: this.s.volumes.filter(v => !this.s.containers.some(c => c.hostConfig.mounts.some(m => m.source === v.name))).reduce((a, v) => a + vSize(v), 0) },
        cache: { total: Object.keys(this.s.buildCache).length, active: 0, size: Object.values(this.s.buildCache).reduce((a, x) => a + (x.size || 0), 0), reclaim: Object.values(this.s.buildCache).reduce((a, x) => a + (x.size || 0), 0) },
        cSize, vSize
      };
    }
  }

  function bar(f) { const n = Math.round(f * 50); return '='.repeat(Math.max(0, n - 1)) + (n < 50 ? '>' : '=') + ' '.repeat(50 - n); }

  window.Engine = Engine;
  window.EngineTS = TS;
})();
