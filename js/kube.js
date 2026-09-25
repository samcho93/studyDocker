/* ===================================================================
   작은 쿠버네티스 흉내 — minikube · kubectl
   Pod · ReplicaSet · Deployment · Service · ConfigMap · Secret
   파드의 컨테이너는 가상 Docker 엔진 위에서 실제로 실행된다 (docker ps 에는 숨김)
   =================================================================== */
(function () {
  'use strict';
  const { table, human } = U;
  let D = null;
  const NET = 'kube-pods';

  const K = {
    s: null,
    init(engine) {
      D = engine;
      D.kube = K;
      this.s = U.store.get('kube', null) || blank();
      setInterval(() => { try { this.reconcile(); } catch (e) { console.error(e); } }, 400);
    },
    reset() { this.s = blank(); this.save(); },
    save() { clearTimeout(this._t); this._t = setTimeout(() => U.store.set('kube', this.s), 300); },
    running() { return this.s.cluster === 'Running'; },
    ev(kind, name, reason, msg, type) {
      this.s.events.push({ t: Date.now(), kind, name, reason, msg, type: type || 'Normal' });
      if (this.s.events.length > 200) this.s.events.splice(0, 60);
    }
  };
  function blank() { return { cluster: null, deploys: {}, rss: {}, pods: {}, svcs: {}, cms: {}, secrets: {}, events: [], forwards: [], ipSeq: 2, svcSeq: 10, nodePortSeq: 30000 }; }
  const rnd = n => { const a = 'bcdfghjklmnpqrstvwxz2456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.random() * a.length | 0]; return s; };
  const age = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? s + 's' : s < 3600 ? Math.floor(s / 60) + 'm' + (s % 60 && s < 600 ? (s % 60) + 's' : '') : Math.floor(s / 3600) + 'h'; };
  const match = (labels, sel) => Object.keys(sel || {}).length > 0 && Object.keys(sel).every(k => labels && labels[k] === sel[k]);

  /* ------------------------------------------------ 파드 --- */
  function podContainer(p) { return p.cid ? D.s.containers.find(c => c.id === p.cid) : null; }
  function makePod(name, spec, labels, owner) {
    const s = K.s;
    const ip = `10.244.0.${s.ipSeq++ % 250 + 2}`;
    const p = { name, labels: Object.assign({}, labels), owner: owner || null, spec: JSON.parse(JSON.stringify(spec)), phase: 'Pending', status: 'Pending', created: Date.now(), ip, restarts: 0, cid: null, next: Date.now() + 300, backoff: 0, ready: false, node: 'minikube' };
    s.pods[name] = p;
    K.ev('Pod', name, 'Scheduled', `Successfully assigned default/${name} to minikube`);
    return p;
  }
  function envOf(c0) {
    const env = [];
    (c0.env || []).forEach(e => {
      if (e.value != null) env.push(`${e.name}=${e.value}`);
      else if (e.valueFrom && e.valueFrom.configMapKeyRef) { const cm = K.s.cms[e.valueFrom.configMapKeyRef.name]; env.push(`${e.name}=${cm ? cm.data[e.valueFrom.configMapKeyRef.key] || '' : ''}`); }
      else if (e.valueFrom && e.valueFrom.secretKeyRef) { const sc = K.s.secrets[e.valueFrom.secretKeyRef.name]; env.push(`${e.name}=${sc ? sc.data[e.valueFrom.secretKeyRef.key] || '' : ''}`); }
    });
    (c0.envFrom || []).forEach(f => { const src = f.configMapRef ? K.s.cms[f.configMapRef.name] : f.secretRef ? K.s.secrets[f.secretRef.name] : null; if (src) Object.keys(src.data).forEach(k => env.push(`${k}=${src.data[k]}`)); });
    return env;
  }
  function stepPod(p) {
    if (p.deleting) return;
    const now = Date.now();
    const c0 = p.spec.containers[0];
    const c = podContainer(p);
    if (p.phase === 'Pending' && now >= p.next) {
      if (!D.findImage(c0.image)) {
        if (!p.pulling) {
          p.pulling = true; p.status = 'ContainerCreating';
          K.ev('Pod', p.name, 'Pulling', `Pulling image "${c0.image}"`);
          const rem = D.remoteImage(c0.image);
          if (rem.error) { setTimeout(() => { p.pulling = false; p.status = 'ErrImagePull'; p.next = Date.now() + 1500; K.ev('Pod', p.name, 'Failed', `Failed to pull image "${c0.image}": ${rem.error}`, 'Warning'); K.ev('Pod', p.name, 'Failed', 'Error: ErrImagePull', 'Warning'); setTimeout(() => { if (p.status === 'ErrImagePull') { p.status = 'ImagePullBackOff'; K.ev('Pod', p.name, 'BackOff', `Back-off pulling image "${c0.image}"`, 'Normal'); } }, 1200); }, 700); return; }
          D.pull(c0.image, { out() {}, err() {} }, { quiet: true, fast: true }).then(() => { p.pulling = false; K.ev('Pod', p.name, 'Pulled', `Successfully pulled image "${c0.image}" in 1.2s`); });
        } else if (p.status === 'ImagePullBackOff' && now >= p.next) { p.pulling = false; p.next = now + 4000; }
        return;
      }
      p.status = 'ContainerCreating';
      if (!D.network(NET)) D.createNetwork(NET, { subnet: '10.244.0.0/16' });
      const img = D.findImage(c0.image);
      const nc = D.create({ img, image: c0.image, name: `k8s_${c0.name}_${p.name}_default_${U.hex(8)}`, cmd: c0.args || null, entrypoint: c0.command || null, env: envOf(c0), network: NET, labels: { 'io.kubernetes.pod.name': p.name, 'io.kubernetes.container.name': c0.name }, memory: c0.resources && c0.resources.limits && c0.resources.limits.memory ? U.parseSize(String(c0.resources.limits.memory).replace(/i$/, '')) : 0, hostname: p.name, kube: true });
      nc.kube = { pod: p.name };
      p.cid = nc.id;
      K.ev('Pod', p.name, 'Created', `Created container ${c0.name}`);
      D.start(nc).then(() => {
        // 파드 IP 를 고정 값으로
        if (nc.networks[NET]) nc.networks[NET].ip = p.ip;
        p.phase = 'Running'; p.status = 'Running'; p.started = Date.now(); p.ready = true;
        K.ev('Pod', p.name, 'Started', `Started container ${c0.name}`);
        K.save(); D.changed('kube');
      }).catch(e => { p.status = 'CreateContainerError'; K.ev('Pod', p.name, 'Failed', e.message, 'Warning'); });
      return;
    }
    if (p.phase === 'Running' && c && c.state.status === 'exited' && !p.waitRestart) {
      const pol = p.spec.restartPolicy || 'Always';
      p.ready = false;
      if (pol === 'Never' || (pol === 'OnFailure' && c.state.exitCode === 0)) { p.phase = c.state.exitCode === 0 ? 'Succeeded' : 'Failed'; p.status = c.state.exitCode === 0 ? 'Completed' : 'Error'; K.save(); return; }
      p.restarts++;
      p.status = c.state.oomKilled ? 'OOMKilled' : c.state.exitCode === 0 ? 'Completed' : 'Error';
      const delay = Math.min(20000, 1000 * Math.pow(2, Math.min(p.restarts - 1, 5)));
      p.waitRestart = true;
      K.ev('Pod', p.name, 'BackOff', 'Back-off restarting failed container ' + p.spec.containers[0].name + ' in pod ' + p.name, 'Warning');
      setTimeout(() => { if (p.restarts >= 2 && !p.deleting) p.status = 'CrashLoopBackOff'; }, 400);
      setTimeout(() => { if (p.deleting || !K.s.pods[p.name]) return; p.waitRestart = false; D.start(c).then(() => { if (c.networks[NET]) c.networks[NET].ip = p.ip; p.status = 'Running'; p.ready = true; K.save(); D.changed('kube'); }).catch(() => {}); }, delay);
      K.save();
    }
  }
  async function deletePod(p, graceful) {
    if (!p || p.deleting) return;
    p.deleting = true; p.status = 'Terminating'; p.ready = false;
    D.changed('kube');
    const c = podContainer(p);
    if (c) { await D.remove(c, { force: true }); }
    delete K.s.pods[p.name];
    K.ev('Pod', p.name, 'Killing', `Stopping container ${p.spec.containers[0].name}`);
    K.save(); D.changed('kube');
  }

  /* ------------------------------------------------ 컨트롤러 --- */
  function tplHash(tpl) { return U.hash(JSON.stringify(tpl), 10).replace(/[^a-z0-9]/g, 'x'); }
  function ensureRS(d) {
    const h = tplHash(d.spec.template);
    const name = `${d.name}-${h}`;
    let rs = K.s.rss[name];
    if (!rs) {
      rs = K.s.rss[name] = { name, owner: d.name, hash: h, template: JSON.parse(JSON.stringify(d.spec.template)), replicas: 0, created: Date.now(), revision: (d.revision = (d.revision || 0) + 1) };
      K.ev('Deployment', d.name, 'ScalingReplicaSet', `Scaled up replica set ${name} to 1`);
    }
    return rs;
  }
  K.reconcile = function () {
    const s = this.s;
    if (!s || s.cluster !== 'Running') return;
    let changed = false;
    // 디플로이먼트 → 레플리카셋 (롤링 업데이트)
    Object.values(s.deploys).forEach(d => {
      const cur = ensureRS(d);
      const old = Object.values(s.rss).filter(r => r.owner === d.name && r !== cur);
      const want = d.spec.replicas;
      const podsOf = r => Object.values(s.pods).filter(p => p.owner === r.name && !p.deleting);
      const readyOf = r => podsOf(r).filter(p => p.ready).length;
      const oldTotal = old.reduce((a, r) => a + r.replicas, 0);
      if (!old.some(r => r.replicas > 0)) { if (cur.replicas !== want) { cur.replicas = want; changed = true; } }
      else {
        // 새 것을 하나씩 올리고, 준비되면 옛 것을 하나씩 내린다 (maxSurge 1, maxUnavailable 0)
        if (cur.replicas + oldTotal < want + 1 && cur.replicas < want) { cur.replicas++; changed = true; K.ev('Deployment', d.name, 'ScalingReplicaSet', `Scaled up replica set ${cur.name} to ${cur.replicas}`); }
        else if (readyOf(cur) >= cur.replicas && cur.replicas + oldTotal > want) { const r = old.find(x => x.replicas > 0); r.replicas--; changed = true; K.ev('Deployment', d.name, 'ScalingReplicaSet', `Scaled down replica set ${r.name} to ${r.replicas} from ${r.replicas + 1}`); }
      }
      d.status = { replicas: podsOf(cur).length + old.reduce((a, r) => a + podsOf(r).length, 0), ready: readyOf(cur) + old.reduce((a, r) => a + readyOf(r), 0), updated: podsOf(cur).length, available: readyOf(cur) + old.reduce((a, r) => a + readyOf(r), 0) };
    });
    // 레플리카셋 → 파드
    Object.values(s.rss).forEach(r => {
      if (!s.deploys[r.owner]) { Object.values(s.pods).filter(p => p.owner === r.name).forEach(p => deletePod(p)); delete s.rss[r.name]; changed = true; return; }
      const pods = Object.values(s.pods).filter(p => p.owner === r.name && !p.deleting);
      if (pods.length < r.replicas) { for (let i = pods.length; i < r.replicas; i++) { const n = `${r.name}-${rnd(5)}`; makePod(n, r.template.spec, r.template.metadata.labels, r.name); K.ev('ReplicaSet', r.name, 'SuccessfulCreate', `Created pod: ${n}`); } changed = true; }
      if (pods.length > r.replicas) { pods.sort((a, b) => (a.ready ? 1 : 0) - (b.ready ? 1 : 0) || b.created - a.created).slice(0, pods.length - r.replicas).forEach(p => { K.ev('ReplicaSet', r.name, 'SuccessfulDelete', `Deleted pod: ${p.name}`); deletePod(p); }); changed = true; }
    });
    Object.values(s.pods).forEach(p => stepPod(p));
    if (changed) { this.save(); D.changed('kube'); }
    else if (Object.values(s.pods).some(p => p.status !== 'Running' || !p.ready)) D.emit('change', 'kube');
  };

  /* ------------------------------------------------ 서비스 · 네트워크 --- */
  function endpoints(svc) { return Object.values(K.s.pods).filter(p => p.ready && !p.deleting && match(p.labels, svc.selector)); }
  async function svcHttp(svc, port, path, opts, from) {
    const sp = svc.ports.find(x => +x.port === +port) || (svc.ports.length === 1 && !port ? svc.ports[0] : null);
    if (!sp) return { error: `Failed to connect to ${svc.name} port ${port} after 1 ms: Couldn't connect to server`, code: 7 };
    const eps = endpoints(svc);
    if (!eps.length) return { error: `Failed to connect to ${svc.name} port ${port} after 1 ms: Couldn't connect to server`, code: 7 };
    const p = eps[Math.random() * eps.length | 0];
    return D.http(from || null, `http://${p.ip}:${sp.targetPort || sp.port}${path}`, opts);
  }
  K.resolve = function (host, from) {
    if (!this.running()) return null;
    if (from && !from.kube) return null;
    const name = String(host).replace(/\.default(\.svc(\.cluster\.local)?)?$/, '');
    const svc = this.s.svcs[name];
    if (!svc) return null;
    return { kube: { http: (port, path, opts, f) => svcHttp(svc, port, path, opts, f), tcp: port => { const eps = endpoints(svc); if (!eps.length) return { error: 'ECONNREFUSED' }; const c = podContainer(eps[0]); return Apps.tcp(D, from, eps[0].ip, (svc.ports.find(x => +x.port === +port) || {}).targetPort || port); } }, ip: svc.clusterIP };
  };
  K.hostHttp = function (port, path, opts) {
    if (!this.s || !this.running()) return null;
    const fw = this.s.forwards.find(f => f.hostPort === port && f.active);
    if (fw) {
      if (fw.svc) { const svc = this.s.svcs[fw.svc]; if (!svc) return null; return svcHttp(svc, fw.port, path, opts); }
      const p = this.s.pods[fw.pod]; if (!p || !p.ready) return Promise.resolve({ error: 'Recv failure: Connection reset by peer', code: 56 });
      return D.http(null, `http://${p.ip}:${fw.port}${path}`, opts);
    }
    const svc = Object.values(this.s.svcs).find(x => (x.type === 'NodePort' || x.type === 'LoadBalancer') && x.ports.some(pp => +pp.nodePort === +port));
    if (svc) { const sp = svc.ports.find(pp => +pp.nodePort === +port); return svcHttp(svc, sp.port, path, opts); }
    const lb = Object.values(this.s.svcs).find(x => x.type === 'LoadBalancer' && x.tunnel && x.ports.some(pp => +pp.port === +port));
    if (lb) return svcHttp(lb, port, path, opts);
    return null;
  };
  K.usesHostPort = function (port) { return !!(this.s && this.running() && (this.s.forwards.some(f => f.active && f.hostPort === port) || Object.values(this.s.svcs).some(x => x.ports.some(pp => +pp.nodePort === port)))); };
  K.hostPorts = function () {
    if (!this.s || !this.running()) return [];
    const out = [];
    Object.values(this.s.svcs).forEach(x => { if (x.type !== 'ClusterIP') x.ports.forEach(pp => { if (pp.nodePort) out.push({ port: pp.nodePort, label: 'svc/' + x.name + ' NodePort' }); }); });
    this.s.forwards.filter(f => f.active).forEach(f => out.push({ port: f.hostPort, label: 'port-forward ' + (f.svc ? 'svc/' + f.svc : f.pod) }));
    return out;
  };
  K.hostPills = function () { return this.hostPorts().map(x => `<span class="port-pill" data-open="http://localhost:${x.port}/">:${x.port} → ☸ ${U.esc(x.label)}</span>`).join(''); };
  K.dashHtml = function () {
    if (!this.s || !this.s.cluster) return '';
    const esc = U.esc;
    const pods = Object.values(this.s.pods);
    let h = `<h3>☸️ 쿠버네티스 (minikube) <span class="n">${this.s.cluster}</span></h3>`;
    if (this.s.cluster !== 'Running') return h + '<div class="empty">클러스터가 멈춰 있습니다. <code>minikube start</code></div>';
    const deps = Object.values(this.s.deploys);
    h += `<div class="topo">`;
    Object.values(this.s.svcs).forEach(sv => { h += `<div class="topo-host" style="margin-bottom:6px"><b>🔀 svc/${esc(sv.name)}</b><span class="muted-s">${sv.type} · ${sv.clusterIP}${sv.ports.map(p => ` · ${p.port}${p.nodePort ? ':' + p.nodePort : ''}→${p.targetPort}`).join('')}</span><span class="muted-s">→ 파드 ${endpoints(sv).length}개</span></div>`; });
    h += `<div class="nets">`;
    deps.forEach(d => {
      const ps = pods.filter(p => p.owner && this.s.rss[p.owner] && this.s.rss[p.owner].owner === d.name);
      h += `<div class="netbox user"><div class="nh"><span>🚀 deploy/${esc(d.name)}</span><code>${(d.status || {}).ready || 0}/${d.spec.replicas}</code></div>${ps.map(p => `<div class="cchip"><span class="dot ${p.ready ? 'running' : /Err|BackOff|Crash|Error/.test(p.status) ? 'exited' : 'created'}"></span><span class="nm">${esc(p.name.replace(d.name + '-', '…'))}</span><span class="muted-s">${esc(p.status)}${p.restarts ? ' ↻' + p.restarts : ''}</span><span class="ip">${p.ip}</span></div>`).join('')}</div>`;
    });
    const lone = pods.filter(p => !p.owner);
    if (lone.length) h += `<div class="netbox"><div class="nh"><span>📦 단독 파드</span></div>${lone.map(p => `<div class="cchip"><span class="dot ${p.ready ? 'running' : 'created'}"></span><span class="nm">${esc(p.name)}</span><span class="muted-s">${esc(p.status)}</span><span class="ip">${p.ip}</span></div>`).join('')}</div>`;
    h += `</div></div>`;
    return h;
  };

  /* ------------------------------------------------ 매니페스트 적용 --- */
  function applyObj(o, out) {
    const kind = o.kind, md = o.metadata || {}, name = md.name;
    if (!kind || !name) throw new Error('error validating data: [apiVersion not set, kind not set]; if you choose to ignore these errors, turn validation off with --validate=false');
    const s = K.s;
    const k = kind.toLowerCase();
    if (kind === 'Deployment') {
      const spec = o.spec || {};
      if (!spec.selector || !spec.selector.matchLabels) throw new Error(`The Deployment "${name}" is invalid: spec.selector: Required value`);
      if (!spec.template || !match((spec.template.metadata || {}).labels, spec.selector.matchLabels)) throw new Error(`The Deployment "${name}" is invalid: spec.template.metadata.labels: Invalid value: ... \`selector\` does not match template \`labels\``);
      const ex = s.deploys[name];
      const d = { name, labels: md.labels || {}, spec: { replicas: spec.replicas == null ? 1 : +spec.replicas, selector: spec.selector.matchLabels, template: spec.template }, created: ex ? ex.created : Date.now(), revision: ex ? ex.revision : 0 };
      const same = ex && JSON.stringify(ex.spec) === JSON.stringify(d.spec);
      s.deploys[name] = Object.assign(ex || {}, d);
      out(`deployment.apps/${name} ${ex ? (same ? 'unchanged' : 'configured') : 'created'}\n`);
    } else if (kind === 'Service') {
      const spec = o.spec || {};
      const ex = s.svcs[name];
      const type = spec.type || 'ClusterIP';
      const ports = (spec.ports || []).map(p => ({ name: p.name, port: +p.port, targetPort: +(p.targetPort || p.port), protocol: p.protocol || 'TCP', nodePort: type !== 'ClusterIP' ? +(p.nodePort || (ex && (ex.ports.find(x => x.port === +p.port) || {}).nodePort) || nextNodePort()) : undefined }));
      s.svcs[name] = { name, type, selector: spec.selector || {}, ports, clusterIP: ex ? ex.clusterIP : `10.96.${s.svcSeq++ % 250}.${Math.random() * 250 | 0}`, created: ex ? ex.created : Date.now(), labels: md.labels || {} };
      out(`service/${name} ${ex ? 'configured' : 'created'}\n`);
    } else if (kind === 'Pod') {
      if (s.pods[name]) { out(`pod/${name} unchanged\n`); return; }
      makePod(name, o.spec, md.labels || {}, null);
      out(`pod/${name} created\n`);
    } else if (kind === 'ConfigMap' || kind === 'Secret') {
      const store = kind === 'ConfigMap' ? s.cms : s.secrets;
      const data = Object.assign({}, o.data || {}, o.stringData || {});
      if (kind === 'Secret' && o.data) Object.keys(o.data).forEach(key => { try { data[key] = atob(o.data[key]); } catch (_) {} });
      const ex = store[name];
      store[name] = { name, data, created: ex ? ex.created : Date.now() };
      out(`${k}/${name} ${ex ? 'configured' : 'created'}\n`);
    } else if (kind === 'Namespace') out(`namespace/${name} created\n`);
    else throw new Error(`resource mapping not found for name: "${name}" namespace: "" from "": no matches for kind "${kind}" in version "${o.apiVersion}"\nensure CRDs are installed first`);
    K.save(); D.changed('kube');
  }
  function nextNodePort() { const used = new Set(); Object.values(K.s.svcs).forEach(x => x.ports.forEach(p => used.add(p.nodePort))); let n = 30000 + (Math.random() * 2700 | 0); while (used.has(n)) n++; return n; }

  /* ------------------------------------------------ minikube --- */
  K.minikube = async function (c) {
    const sub = c.args[0];
    const s = this.s;
    if (sub === 'start') {
      if (s.cluster === 'Running') { c.out('😄  minikube v1.34.0 on Ubuntu 24.04\n✨  Using the docker driver based on existing profile\n👍  Starting "minikube" primary control-plane node in "minikube" cluster\n🏃  Updating the running docker "minikube" container ...\n🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default\n'); return 0; }
      const steps = ['😄  minikube v1.34.0 on Ubuntu 24.04', '✨  Automatically selected the docker driver', '📌  Using Docker driver with root privileges', '👍  Starting "minikube" primary control-plane node in "minikube" cluster', '🚜  Pulling base image v0.0.45 ...', '🔥  Creating docker container (CPUs=2, Memory=3900MB) ...', '🐳  Preparing Kubernetes v1.31.0 on Docker 27.2.0 ...', '    ▪ Generating certificates and keys ...', '    ▪ Booting up control plane ...', '    ▪ Configuring RBAC rules ...', '🔗  Configuring bridge CNI (Container Networking Interface) ...', '🔎  Verifying Kubernetes components...', '    ▪ Using image gcr.io/k8s-minikube/storage-provisioner:v5', '🌟  Enabled addons: storage-provisioner, default-storageclass', '🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default'];
      for (const l of steps) { c.out(l + '\n'); if (!(await U.sleep(180, c.io.signal))) return 130; }
      s.cluster = 'Running'; s.startedAt = Date.now();
      this.save(); D.changed('kube');
      return 0;
    }
    if (sub === 'status') { c.out(s.cluster ? `minikube\ntype: Control Plane\nhost: ${s.cluster}\nkubelet: ${s.cluster}\napiserver: ${s.cluster}\nkubeconfig: Configured\n\n` : '🤷  Profile "minikube" not found. Run "minikube profile list" to view all profiles.\n👉  To start a cluster, run: "minikube start"\n'); return s.cluster === 'Running' ? 0 : 7; }
    if (sub === 'stop') { if (!s.cluster) { c.out('🤷  Profile "minikube" not found.\n'); return 0; } c.out('✋  Stopping node "minikube"  ...\n🛑  Powering off "minikube" via SSH ...\n🛑  1 node stopped.\n'); for (const p of Object.values(s.pods)) { const k = podContainer(p); if (k) await D.stop(k, 0); p.ready = false; p.status = 'Unknown'; } s.cluster = 'Stopped'; this.save(); D.changed('kube'); return 0; }
    if (sub === 'delete') { c.out('🔥  Deleting "minikube" in docker ...\n🔥  Removing /home/student/.minikube/machines/minikube ...\n💀  Removed all traces of the "minikube" cluster.\n'); for (const p of Object.values(s.pods)) await deletePod(p); this.s = blank(); this.save(); D.changed('kube'); return 0; }
    if (sub === 'ip') { if (s.cluster !== 'Running') { c.err('❌  Exiting due to GUEST_STATUS: state: unknown state "minikube"\n'); return 1; } c.out('192.168.49.2\n'); return 0; }
    if (sub === 'service') {
      const name = c.args.filter(a => !a.startsWith('-'))[1];
      const svc = s.svcs[name];
      if (!svc) { c.err(`❌  Exiting due to SVC_NOT_FOUND: Service '${name}' was not found in 'default' namespace.\n`); return 1; }
      if (svc.type === 'ClusterIP') { c.err(`😿  service default/${name} has no node port\n`); return 1; }
      const url = `http://localhost:${svc.ports[0].nodePort}`;
      if (c.args.includes('--url')) { c.out(url + '\n'); return 0; }
      c.out(`|-----------|------|-------------|---------------------------|\n| NAMESPACE | NAME | TARGET PORT |            URL            |\n|-----------|------|-------------|---------------------------|\n| default   | ${name} | ${svc.ports[0].port} | ${url} |\n|-----------|------|-------------|---------------------------|\n🎉  Opening service default/${name} in default browser...\n`);
      if (window.Lab) Lab.openBrowser(url + '/');
      return 0;
    }
    if (sub === 'tunnel') { Object.values(s.svcs).filter(x => x.type === 'LoadBalancer').forEach(x => { x.tunnel = true; x.externalIP = '127.0.0.1'; }); c.out('✅  Tunnel successfully started\n\n📌  NOTE: Please do not close this terminal as this process must stay alive for the tunnel to be accessible ...\n'); D.changed('kube'); await new Promise(r => c.io.signal && c.io.signal.addEventListener('abort', r)); Object.values(s.svcs).forEach(x => { x.tunnel = false; x.externalIP = null; }); D.changed('kube'); return 0; }
    if (sub === 'dashboard') { c.out('🤔  Verifying dashboard health ...\n(시뮬레이터) 오른쪽 📊 대시보드 탭 아래쪽에서 클러스터 상태를 볼 수 있습니다.\n'); if (window.Lab) Lab.open('dash'); return 0; }
    if (sub === 'addons') { c.out('|-----------------------------|----------|--------------|\n|         ADDON NAME          | PROFILE  |    STATUS    |\n|-----------------------------|----------|--------------|\n| dashboard                   | minikube | disabled     |\n| default-storageclass        | minikube | enabled ✅   |\n| ingress                     | minikube | disabled     |\n| metrics-server              | minikube | disabled     |\n| storage-provisioner         | minikube | enabled ✅   |\n|-----------------------------|----------|--------------|\n'); return 0; }
    if (sub === 'version') { c.out('minikube version: v1.34.0\n'); return 0; }
    c.out('minikube provisions and manages local Kubernetes clusters optimized for development workflows.\n\nBasic Commands:\n  start          Starts a local Kubernetes cluster\n  status         Gets the status of a local Kubernetes cluster\n  stop           Stops a running local Kubernetes cluster\n  delete         Deletes a local Kubernetes cluster\n  dashboard      Access the Kubernetes dashboard running within the minikube cluster\n  service        Returns a URL to connect to a service\n  ip             Retrieves the IP address of the specified node\n');
    return sub ? 1 : 0;
  };
  K.kind = async function (c) { c.out('(시뮬레이터) 이 실습에서는 minikube 로 클러스터를 만듭니다: minikube start\n'); return 0; };
  K.helm = async function (c) { if (c.args[0] === 'version') { c.out('version.BuildInfo{Version:"v3.16.2"}\n'); return 0; } c.out('(시뮬레이터) Helm 은 16장에서 소개만 합니다. 차트 설치 대신 kubectl apply -f 로 매니페스트를 적용해 보세요.\n'); return 0; };

  /* ------------------------------------------------ kubectl --- */
  const KIND = { po: 'pods', pod: 'pods', pods: 'pods', deploy: 'deployments', deployment: 'deployments', deployments: 'deployments', svc: 'services', service: 'services', services: 'services', rs: 'replicasets', replicaset: 'replicasets', replicasets: 'replicasets', no: 'nodes', node: 'nodes', nodes: 'nodes', ns: 'namespaces', namespace: 'namespaces', namespaces: 'namespaces', cm: 'configmaps', configmap: 'configmaps', configmaps: 'configmaps', secret: 'secrets', secrets: 'secrets', ev: 'events', event: 'events', events: 'events', all: 'all', ep: 'endpoints', endpoints: 'endpoints' };
  function podRow(p, wide) {
    const r = [p.name, `${p.ready ? 1 : 0}/1`, p.status, p.restarts + (p.restarts ? ` (${age(p.started || p.created)} ago)` : ''), age(p.created)];
    if (wide) r.push(p.ip, 'minikube', '<none>', '<none>');
    return r;
  }
  function svcRow(x) { return [x.name, x.type, x.clusterIP, x.type === 'LoadBalancer' ? (x.externalIP || '<pending>') : '<none>', x.ports.map(p => `${p.port}${p.nodePort ? ':' + p.nodePort : ''}/TCP`).join(','), age(x.created)]; }
  function depRow(d) { const st = d.status || {}; return [d.name, `${st.ready || 0}/${d.spec.replicas}`, st.updated || 0, st.available || 0, age(d.created)]; }
  function manifest(kind, obj) {
    if (kind === 'pods') return { apiVersion: 'v1', kind: 'Pod', metadata: { name: obj.name, namespace: 'default', labels: obj.labels }, spec: obj.spec, status: { phase: obj.phase, podIP: obj.ip, hostIP: '192.168.49.2' } };
    if (kind === 'deployments') return { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: obj.name, namespace: 'default', labels: obj.labels }, spec: { replicas: obj.spec.replicas, selector: { matchLabels: obj.spec.selector }, template: obj.spec.template }, status: obj.status };
    if (kind === 'services') return { apiVersion: 'v1', kind: 'Service', metadata: { name: obj.name, namespace: 'default' }, spec: { type: obj.type, clusterIP: obj.clusterIP, selector: obj.selector, ports: obj.ports } };
    if (kind === 'configmaps') return { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: obj.name }, data: obj.data };
    if (kind === 'secrets') return { apiVersion: 'v1', kind: 'Secret', metadata: { name: obj.name }, type: 'Opaque', data: Object.fromEntries(Object.entries(obj.data).map(([k, v]) => [k, btoa(unescape(encodeURIComponent(v)))])) };
    return obj;
  }
  function parseK(args, spec) { return DockerCLI.parseOpts(args, spec); }

  K.kubectl = async function (c) {
    const s = this.s;
    const args = c.args.slice();
    const sub = args.shift();
    const out = c.out, err = c.err;
    if (!sub || sub === 'help' || sub === '--help') { out('kubectl controls the Kubernetes cluster manager.\n\nBasic Commands (Beginner):\n  create          Create a resource from a file or from stdin\n  expose          Take a replication controller, service, deployment or pod and expose it as a new Kubernetes service\n  run             Run a particular image on the cluster\n  set             Set specific features on objects\n\nBasic Commands (Intermediate):\n  get             Display one or many resources\n  delete          Delete resources by file names, stdin, resources and names, or by resources and label selector\n\nDeploy Commands:\n  rollout         Manage the rollout of a resource\n  scale           Set a new size for a deployment, replica set, or replication controller\n\nTroubleshooting and Debugging Commands:\n  describe        Show details of a specific resource or group of resources\n  logs            Print the logs for a container in a pod\n  exec            Execute a command in a container\n  port-forward    Forward one or more local ports to a pod\n\nAdvanced Commands:\n  apply           Apply a configuration to a resource by file name or stdin\n'); return 0; }
    if (sub === 'version') { out(`Client Version: v1.31.0\nKustomize Version: v5.4.2\n${this.running() ? 'Server Version: v1.31.0\n' : ''}`); if (!this.running()) { err('The connection to the server localhost:8080 was refused - did you specify the right host or port?\n'); return 1; } return 0; }
    if (sub === 'config') { if (args[0] === 'current-context') { if (!s.cluster) { err('error: current-context is not set\n'); return 1; } out('minikube\n'); return 0; } if (args[0] === 'get-contexts') { out(table([['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE'], s.cluster ? ['*', 'minikube', 'minikube', 'minikube', 'default'] : []].filter(r => r.length)) + '\n'); return 0; } out('Modify kubeconfig files\n'); return 0; }
    if (!this.running()) { err(s.cluster === 'Stopped' ? 'The connection to the server 192.168.49.2:8443 was refused - did you specify the right host or port?\n' : 'E1107 10:00:00.000000    4210 memcache.go:265] couldn\'t get current server API group list: Get "http://localhost:8080/api?timeout=32s": dial tcp 127.0.0.1:8080: connect: connection refused\nThe connection to the server localhost:8080 was refused - did you specify the right host or port?\n\n(힌트) 먼저 클러스터를 시작하세요: minikube start\n'); return 1; }
    try {
      switch (sub) {
        case 'cluster-info': out('\x1b[32mKubernetes control plane\x1b[0m is running at \x1b[33mhttps://192.168.49.2:8443\x1b[0m\n\x1b[32mCoreDNS\x1b[0m is running at \x1b[33mhttps://192.168.49.2:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\x1b[0m\n\nTo further debug and diagnose cluster problems, use \'kubectl cluster-info dump\'.\n'); return 0;
        case 'get': return await get(c, args);
        case 'describe': return describe(c, args);
        case 'create': {
          if (args[0] === 'deployment' || args[0] === 'deploy') {
            const { o, pos } = parseK(args.slice(1), { 'image': 'list', 'replicas': 'str', 'port': 'str', 'r': 'str' });
            const name = pos[0];
            if (!o.image.length) { err('error: required flag(s) "image" not set\n'); return 1; }
            if (s.deploys[name]) { err(`error: failed to create deployment: deployments.apps "${name}" already exists\n`); return 1; }
            const cname = (o.image[0].split('/').pop().split(':')[0]).replace(/[^a-z0-9-]/g, '-');
            applyObj({ kind: 'Deployment', metadata: { name, labels: { app: name } }, spec: { replicas: +(o.replicas || 1), selector: { matchLabels: { app: name } }, template: { metadata: { labels: { app: name } }, spec: { containers: [{ name: cname, image: o.image[0], ports: o.port ? [{ containerPort: +o.port }] : undefined }] } } } }, () => {});
            out(`deployment.apps/${name} created\n`); return 0;
          }
          if (args[0] === 'configmap' || args[0] === 'cm') {
            const { o, pos } = parseK(args.slice(1), { 'from-literal': 'list', 'from-file': 'list' });
            const data = {}; o['from-literal'].forEach(kv => { const i = kv.indexOf('='); data[kv.slice(0, i)] = kv.slice(i + 1); });
            o['from-file'].forEach(f => { const p = VFS.norm(f, c.sh.cwd); data[VFS.base(p)] = Host.fs.read(p) || ''; });
            s.cms[pos[0]] = { name: pos[0], data, created: Date.now() }; this.save(); out(`configmap/${pos[0]} created\n`); return 0;
          }
          if (args[0] === 'secret') {
            const { o, pos } = parseK(args.slice(1), { 'from-literal': 'list' });
            const data = {}; o['from-literal'].forEach(kv => { const i = kv.indexOf('='); data[kv.slice(0, i)] = kv.slice(i + 1); });
            s.secrets[pos[1]] = { name: pos[1], data, created: Date.now() }; this.save(); out(`secret/${pos[1]} created\n`); return 0;
          }
          if (args[0] === '-f' || args[0] === '--filename') return apply(c, args, true);
          if (args[0] === 'namespace' || args[0] === 'ns') { out(`namespace/${args[1]} created\n`); return 0; }
          err(`error: Unexpected args: [${args.join(' ')}]\n`); return 1;
        }
        case 'apply': return apply(c, args, false);
        case 'run': {
          const { o, pos } = parseK(args, { 'image': 'str', 'restart': 'str', 'rm': 'bool', 'i|stdin': 'bool', 't|tty': 'bool', 'port': 'str', 'env': 'list', 'command': 'bool', 'labels': 'str', 'l': 'str' });
          const name = pos[0];
          if (!o.image) { err('error: required flag(s) "image" not set\n'); return 1; }
          if (s.pods[name]) { err(`Error from server (AlreadyExists): pods "${name}" already exists\n`); return 1; }
          const extra = pos.slice(1);
          makePod(name, { restartPolicy: o.restart || 'Always', containers: [{ name, image: o.image, args: extra.length ? extra : undefined, env: o.env.map(e => ({ name: e.split('=')[0], value: e.split('=').slice(1).join('=') })) }] }, { run: name }, null);
          this.save(); D.changed('kube');
          out(`pod/${name} created\n`); return 0;
        }
        case 'expose': {
          const { o, pos } = parseK(args, { 'port': 'str', 'target-port': 'str', 'type': 'str', 'name': 'str', 'selector': 'str' });
          let [kind, name] = pos[0].includes('/') ? pos[0].split('/') : [pos[0], pos[1]];
          kind = KIND[kind] || kind;
          let sel;
          if (kind === 'deployments') { const d = s.deploys[name]; if (!d) { err(`Error from server (NotFound): deployments.apps "${name}" not found\n`); return 1; } sel = d.spec.selector; }
          else if (kind === 'pods') { const p = s.pods[name]; if (!p) { err(`Error from server (NotFound): pods "${name}" not found\n`); return 1; } sel = p.labels; }
          else { err(`error: cannot expose a ${kind}\n`); return 1; }
          if (!o.port) { const d = s.deploys[name]; const cp = d && d.spec.template.spec.containers[0].ports && d.spec.template.spec.containers[0].ports[0]; if (!cp) { err('error: couldn\'t find port via --port flag or introspection\nSee \'kubectl expose -h\' for help and examples\n'); return 1; } o.port = String(cp.containerPort); }
          const sn = o.name || name;
          if (s.svcs[sn]) { err(`Error from server (AlreadyExists): services "${sn}" already exists\n`); return 1; }
          applyObj({ kind: 'Service', metadata: { name: sn }, spec: { type: o.type || 'ClusterIP', selector: sel, ports: [{ port: +o.port, targetPort: +(o['target-port'] || o.port) }] } }, () => {});
          out(`service/${sn} exposed\n`); return 0;
        }
        case 'scale': {
          const { o, pos } = parseK(args, { 'replicas': 'str' });
          const [kind, name] = pos[0].includes('/') ? pos[0].split('/') : [pos[0], pos[1]];
          const d = s.deploys[name];
          if (!d || KIND[kind] !== 'deployments') { err(`Error from server (NotFound): deployments.apps "${name}" not found\n`); return 1; }
          d.spec.replicas = +o.replicas; this.save(); D.changed('kube');
          out(`deployment.apps/${name} scaled\n`); return 0;
        }
        case 'set': {
          if (args[0] !== 'image') { err('error: unknown command\n'); return 1; }
          const [kind, name] = args[1].includes('/') ? args[1].split('/') : [args[1], args[2]];
          const d = s.deploys[name];
          if (!d) { err(`Error from server (NotFound): deployments.apps "${name}" not found\n`); return 1; }
          const pairs = args.slice(args[1].includes('/') ? 2 : 3);
          pairs.forEach(pr => { const [cn, img] = pr.split('='); const cc = d.spec.template.spec.containers.find(x => x.name === cn || cn === '*'); if (!cc) throw new Error(`unable to find container named "${cn}"`); cc.image = img; });
          d.changeCause = `kubectl set image ${args.slice(1).join(' ')}`;
          this.save(); D.changed('kube');
          out(`deployment.apps/${name} image updated\n`); return 0;
        }
        case 'rollout': {
          const act = args[0];
          const [kind, name] = (args[1] || '').includes('/') ? args[1].split('/') : [args[1], args[2]];
          const d = s.deploys[name];
          if (!d) { err(`Error from server (NotFound): deployments.apps "${name}" not found\n`); return 1; }
          if (act === 'status') {
            let last = '';
            while (true) {
              const st = d.status || {};
              const old = Object.values(s.rss).filter(r => r.owner === name && r.hash !== tplHash(d.spec.template) && r.replicas > 0).length;
              const msg = old ? `Waiting for deployment "${name}" rollout to finish: ${st.updated || 0} out of ${d.spec.replicas} new replicas have been updated...` : (st.available || 0) < d.spec.replicas ? `Waiting for deployment "${name}" rollout to finish: ${st.available || 0} of ${d.spec.replicas} updated replicas are available...` : null;
              if (!msg) { out(`deployment "${name}" successfully rolled out\n`); return 0; }
              if (msg !== last) { out(msg + '\n'); last = msg; }
              if (!(await U.sleep(400, c.io.signal))) return 130;
            }
          }
          if (act === 'history') {
            const rss = Object.values(s.rss).filter(r => r.owner === name).sort((a, b) => a.revision - b.revision);
            out(`deployment.apps/${name} \n` + table([['REVISION', 'CHANGE-CAUSE']].concat(rss.map(r => [r.revision, r.cause || '<none>']))) + '\n'); return 0;
          }
          if (act === 'undo') {
            const rss = Object.values(s.rss).filter(r => r.owner === name).sort((a, b) => b.revision - a.revision);
            const cur = rss.find(r => r.hash === tplHash(d.spec.template));
            const prev = rss.find(r => r !== cur);
            if (!prev) { err(`error: no rollout history found for deployment "${name}"\n`); return 1; }
            d.spec.template = JSON.parse(JSON.stringify(prev.template));
            prev.revision = Math.max(...rss.map(r => r.revision)) + 1;
            this.save(); D.changed('kube');
            out(`deployment.apps/${name} rolled back\n`); return 0;
          }
          if (act === 'restart') { d.spec.template.metadata.annotations = { 'kubectl.kubernetes.io/restartedAt': new Date().toISOString() }; this.save(); out(`deployment.apps/${name} restarted\n`); return 0; }
          err(`error: unknown command "${act}"\n`); return 1;
        }
        case 'delete': {
          const { o, pos } = parseK(args, { 'f|filename': 'list', 'all': 'bool', 'l|selector': 'str', 'grace-period': 'str', 'force': 'bool', 'now': 'bool' });
          if (o.filename.length) {
            for (const f of o.filename) {
              const src = Host.fs.read(VFS.norm(f, c.sh.cwd));
              if (src == null) { err(`error: the path "${f}" does not exist\n`); return 1; }
              for (const obj of YAML.parseAll(src)) { const kind = KIND[obj.kind.toLowerCase()] || obj.kind.toLowerCase() + 's'; await delOne(c, kind, obj.metadata.name); }
            }
            return 0;
          }
          let targets = [];
          pos.forEach(p => { if (p.includes('/')) targets.push(p.split('/')); });
          if (!targets.length) { const kind = KIND[pos[0]]; if (!kind) { err(`error: the server doesn't have a resource type "${pos[0]}"\n`); return 1; } const names = o.all ? Object.keys(coll(kind)) : o.selector ? Object.values(coll(kind)).filter(x => match(x.labels, Object.fromEntries(o.selector.split(',').map(kv => kv.split('='))))).map(x => x.name) : pos.slice(1); targets = names.map(n => [pos[0], n]); if (!names.length && o.all) { out('No resources found\n'); return 0; } }
          let code = 0;
          for (const [k, n] of targets) code = (await delOne(c, KIND[k] || k, n)) || code;
          return code;
        }
        case 'logs': {
          const { o, pos } = parseK(args, { 'f|follow': 'bool', 'tail': 'str', 'c|container': 'str', 'p|previous': 'bool', 'l|selector': 'str', 'timestamps': 'bool' });
          let name = pos[0] || '';
          let p = s.pods[name];
          if (!p && name.startsWith('deploy')) { const dn = name.split('/')[1]; p = Object.values(s.pods).find(x => x.owner && s.rss[x.owner] && s.rss[x.owner].owner === dn); if (p) out(`Found ${Object.values(s.pods).filter(x => x.owner && s.rss[x.owner] && s.rss[x.owner].owner === dn).length} pods, using pod/${p.name}\n`); }
          if (!p && name.startsWith('pod/')) p = s.pods[name.slice(4)];
          if (!p) { err(`error: error from server (NotFound): pods "${name}" not found in namespace "default"\n`); return 1; }
          const ct = podContainer(p);
          if (!ct) { err(`Error from server (BadRequest): container "${p.spec.containers[0].name}" in pod "${p.name}" is waiting to start: ${p.status === 'ImagePullBackOff' || p.status === 'ErrImagePull' ? 'trying and failing to pull image' : 'ContainerCreating'}\n`); return 1; }
          let logs = ct.logs; if (o.tail) logs = logs.slice(-(+o.tail));
          logs.forEach(l => out(l.m + '\n'));
          if (!o.follow) return 0;
          await new Promise(res => { const off = D.on('log', (cc, e) => { if (cc === ct) out(e.m + '\n'); }); c.io.signal && c.io.signal.addEventListener('abort', () => { off(); res(); }); });
          return 0;
        }
        case 'exec': {
          const dd = args.indexOf('--');
          const before = dd >= 0 ? args.slice(0, dd) : args.slice(0, 1);
          const cmd = dd >= 0 ? args.slice(dd + 1) : args.slice(1);
          const { o, pos } = parseK(before, { 'i|stdin': 'bool', 't|tty': 'bool', 'c|container': 'str' });
          let pn = pos[0];
          if (pn && pn.startsWith('deploy/')) { const dn = pn.split('/')[1]; const pp = Object.values(s.pods).find(x => x.ready && x.owner && s.rss[x.owner] && s.rss[x.owner].owner === dn); pn = pp && pp.name; }
          const p = s.pods[String(pn).replace(/^pod\//, '')];
          if (!p) { err(`Error from server (NotFound): pods "${pos[0]}" not found\n`); return 1; }
          const ct = podContainer(p);
          if (!ct || ct.state.status !== 'running') { err(`error: unable to upgrade connection: container not found ("${p.spec.containers[0].name}")\n`); return 1; }
          if (!cmd.length) { err('error: you must specify at least one command for the container\n'); return 1; }
          return DockerCLI.execIn(Object.assign({}, c, { D }), ct, cmd, { interactive: o.stdin, tty: o.tty });
        }
        case 'port-forward': {
          const { pos } = parseK(args, { 'address': 'str' });
          const target = pos[0];
          const [hp, cp] = String(pos[1] || '').split(':');
          const hostPort = +hp, port = +(cp || hp);
          const f = { hostPort, port, active: true };
          if (target.startsWith('svc/') || target.startsWith('service/')) { const n = target.split('/')[1]; if (!s.svcs[n]) { err(`Error from server (NotFound): services "${n}" not found\n`); return 1; } f.svc = n; }
          else { const n = target.replace(/^pods?\//, ''); const p = s.pods[n] || (target.startsWith('deploy') ? Object.values(s.pods).find(x => x.ready && x.owner && s.rss[x.owner] && s.rss[x.owner].owner === target.split('/')[1]) : null); if (!p) { err(`Error from server (NotFound): pods "${n}" not found\n`); return 1; } f.pod = p.name; }
          if (D.hostPortOwner(hostPort)) { err(`Unable to listen on port ${hostPort}: Listeners failed to create with the following errors: [unable to create listener: Error listen tcp4 127.0.0.1:${hostPort}: bind: address already in use]\nerror: unable to listen on any of the requested ports: [{${hostPort} ${port}}]\n`); return 1; }
          s.forwards.push(f); D.changed('kube');
          out(`Forwarding from 127.0.0.1:${hostPort} -> ${port}\nForwarding from [::1]:${hostPort} -> ${port}\n`);
          await new Promise(r => c.io.signal && c.io.signal.addEventListener('abort', r));
          f.active = false; s.forwards = s.forwards.filter(x => x !== f); D.changed('kube');
          return 0;
        }
        case 'top': err('error: Metrics API not available\n(힌트) minikube addons enable metrics-server 가 필요합니다 (이 실습에서는 지원하지 않음)\n'); return 1;
        case 'explain': out(`KIND:       ${args[0] || 'Pod'}\nVERSION:    v1\n\nDESCRIPTION:\n    (시뮬레이터) 공식 문서 https://kubernetes.io/docs/reference/ 를 참고하세요.\n`); return 0;
        case 'api-resources': out(table([['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'], ['configmaps', 'cm', 'v1', 'true', 'ConfigMap'], ['namespaces', 'ns', 'v1', 'false', 'Namespace'], ['nodes', 'no', 'v1', 'false', 'Node'], ['pods', 'po', 'v1', 'true', 'Pod'], ['secrets', '', 'v1', 'true', 'Secret'], ['services', 'svc', 'v1', 'true', 'Service'], ['deployments', 'deploy', 'apps/v1', 'true', 'Deployment'], ['replicasets', 'rs', 'apps/v1', 'true', 'ReplicaSet']]) + '\n'); return 0;
        default: err(`error: unknown command "${sub}" for "kubectl"\n`); return 1;
      }
    } catch (e) { err(`error: ${e.message}\n`); return 1; }
  };
  function coll(kind) { const s = K.s; return { pods: s.pods, deployments: s.deploys, services: s.svcs, replicasets: s.rss, configmaps: s.cms, secrets: s.secrets }[kind] || {}; }
  async function delOne(c, kind, name) {
    const s = K.s;
    const col = coll(kind);
    if (!col[name]) { c.err(`Error from server (NotFound): ${kind}${kind === 'deployments' || kind === 'replicasets' ? '.apps' : ''} "${name}" not found\n`); return 1; }
    const label = { pods: 'pod', deployments: 'deployment.apps', services: 'service', replicasets: 'replicaset.apps', configmaps: 'configmap', secrets: 'secret' }[kind];
    c.out(`${label} "${name}" deleted\n`);
    if (kind === 'pods') await deletePod(s.pods[name]);
    else if (kind === 'deployments') { delete s.deploys[name]; Object.values(s.rss).filter(r => r.owner === name).forEach(r => { r.replicas = 0; }); }
    else delete col[name];
    K.save(); D.changed('kube');
    return 0;
  }
  async function apply(c, args, createOnly) {
    const { o } = parseK(args, { 'f|filename': 'list', 'R|recursive': 'bool', 'dry-run': 'str' });
    if (!o.filename.length) { c.err('error: must specify one of -f and -k\n'); return 1; }
    let code = 0;
    for (const f of o.filename) {
      const p = VFS.norm(f, c.sh.cwd);
      let files = [];
      if (Host.fs.stat(p) === 'dir') files = Object.keys(Host.fs.walk(p)).filter(x => /\.ya?ml$/.test(x)).map(x => p + '/' + x);
      else if (Host.fs.stat(p) === 'file') files = [p];
      else { c.err(`error: the path "${f}" does not exist\n`); return 1; }
      for (const file of files) {
        let docs;
        try { docs = YAML.parseAll(Host.fs.read(file)); } catch (e) { c.err(`error: error parsing ${VFS.base(file)}: error converting YAML to JSON: ${e.message}\n`); code = 1; continue; }
        for (const d of docs) {
          if (createOnly && coll(KIND[String(d.kind).toLowerCase()] || '')[d.metadata && d.metadata.name]) { c.err(`Error from server (AlreadyExists): error when creating "${f}": ${String(d.kind).toLowerCase()}s "${d.metadata.name}" already exists\n`); code = 1; continue; }
          try { applyObj(d, t => c.out(createOnly ? t.replace(/ (created|configured|unchanged)\n$/, ' created\n') : t)); } catch (e) { c.err(`Error from server (Invalid): error when ${createOnly ? 'creating' : 'applying'} "${f}": ${e.message}\n`); code = 1; }
        }
      }
    }
    return code;
  }
  async function get(c, args) {
    const s = K.s;
    const { o, pos } = parseK(args, { 'o|output': 'str', 'w|watch': 'bool', 'l|selector': 'str', 'show-labels': 'bool', 'n|namespace': 'str', 'A|all-namespaces': 'bool' });
    const kinds = (pos[0] || '').split(',').map(k => KIND[k.split('/')[0]] || k);
    let only = pos.slice(1);
    if ((pos[0] || '').includes('/')) only = [pos[0].split('/')[1]];
    if (!pos[0]) { c.err('You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n'); return 1; }
    const sel = o.selector ? Object.fromEntries(o.selector.split(',').map(kv => kv.split('='))) : null;
    const pick = list => list.filter(x => (!only.length || only.includes(x.name)) && (!sel || match(x.labels, sel)));
    const wide = o.output === 'wide';
    if (o.namespace === 'kube-system' || (o['all-namespaces'] && kinds[0] === 'pods')) {
      const sys = [['coredns-6f6b679f8f-x8m2k', '1/1', 'Running', '0', age(s.startedAt)], ['etcd-minikube', '1/1', 'Running', '0', age(s.startedAt)], ['kube-apiserver-minikube', '1/1', 'Running', '0', age(s.startedAt)], ['kube-controller-manager-minikube', '1/1', 'Running', '0', age(s.startedAt)], ['kube-proxy-7rxlq', '1/1', 'Running', '0', age(s.startedAt)], ['kube-scheduler-minikube', '1/1', 'Running', '0', age(s.startedAt)], ['storage-provisioner', '1/1', 'Running', '0', age(s.startedAt)]];
      if (o.namespace === 'kube-system') { c.out(table([['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']].concat(sys)) + '\n'); return 0; }
      c.out(table([['NAMESPACE', 'NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']].concat(pick(Object.values(s.pods)).map(p => ['default'].concat(podRow(p))), sys.map(r => ['kube-system'].concat(r)))) + '\n'); return 0;
    }
    if (o.output === 'yaml' || o.output === 'json') {
      const items = [];
      kinds.forEach(k => pick(Object.values(coll(k))).forEach(x => items.push(manifest(k, x))));
      if (only.length && !items.length) { c.err(`Error from server (NotFound): ${kinds[0]} "${only[0]}" not found\n`); return 1; }
      const obj = items.length === 1 && only.length ? items[0] : { apiVersion: 'v1', kind: 'List', items };
      c.out((o.output === 'yaml' ? YAML.stringify(obj) : JSON.stringify(obj, null, 4)) + '\n');
      return 0;
    }
    const render = () => {
      let txt = '';
      const blocks = [];
      const want = kinds[0] === 'all' ? ['pods', 'services', 'deployments', 'replicasets'] : kinds;
      want.forEach(k => {
        const pre = kinds[0] === 'all' || kinds.length > 1 ? { pods: 'pod/', services: 'service/', deployments: 'deployment.apps/', replicasets: 'replicaset.apps/' }[k] || '' : '';
        let rows = null;
        if (k === 'pods') { const l = pick(Object.values(s.pods)); if (l.length) rows = [['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'].concat(wide ? ['IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] : []).concat(o['show-labels'] ? ['LABELS'] : [])].concat(l.map(p => { const r = podRow(p, wide); r[0] = pre + r[0]; if (o['show-labels']) r.push(Object.entries(p.labels).map(([a, b]) => `${a}=${b}`).join(',') || '<none>'); return r; })); }
        if (k === 'services') { const l = pick(Object.values(s.svcs)); const kube = !only.length && !sel ? [{ name: 'kubernetes', type: 'ClusterIP', clusterIP: '10.96.0.1', ports: [{ port: 443 }], created: s.startedAt }] : []; const all = kube.concat(l); if (all.length) rows = [['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'].concat(wide ? ['SELECTOR'] : [])].concat(all.map(x => { const r = svcRow(x); r[0] = pre + r[0]; if (wide) r.push(Object.entries(x.selector || {}).map(([a, b]) => `${a}=${b}`).join(',') || '<none>'); return r; })); }
        if (k === 'deployments') { const l = pick(Object.values(s.deploys)); if (l.length) rows = [['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'].concat(wide ? ['CONTAINERS', 'IMAGES', 'SELECTOR'] : [])].concat(l.map(d => { const r = depRow(d); r[0] = pre + r[0]; if (wide) { const cs = d.spec.template.spec.containers; r.push(cs.map(x => x.name).join(','), cs.map(x => x.image).join(','), Object.entries(d.spec.selector).map(([a, b]) => `${a}=${b}`).join(',')); } return r; })); }
        if (k === 'replicasets') { const l = pick(Object.values(s.rss)); if (l.length) rows = [['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE']].concat(l.map(r => { const ps = Object.values(s.pods).filter(p => p.owner === r.name && !p.deleting); return [pre + r.name, r.replicas, ps.length, ps.filter(p => p.ready).length, age(r.created)]; })); }
        if (k === 'nodes') rows = [['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'].concat(wide ? ['INTERNAL-IP', 'OS-IMAGE', 'CONTAINER-RUNTIME'] : []), ['minikube', 'Ready', 'control-plane', age(s.startedAt), 'v1.31.0'].concat(wide ? ['192.168.49.2', 'Ubuntu 22.04.4 LTS', 'docker://27.2.0'] : [])];
        if (k === 'namespaces') rows = [['NAME', 'STATUS', 'AGE'], ['default', 'Active', age(s.startedAt)], ['kube-node-lease', 'Active', age(s.startedAt)], ['kube-public', 'Active', age(s.startedAt)], ['kube-system', 'Active', age(s.startedAt)]];
        if (k === 'configmaps') { const l = pick(Object.values(s.cms)); rows = [['NAME', 'DATA', 'AGE'], ['kube-root-ca.crt', 1, age(s.startedAt)]].concat(l.map(x => [x.name, Object.keys(x.data).length, age(x.created)])); }
        if (k === 'secrets') { const l = pick(Object.values(s.secrets)); if (l.length) rows = [['NAME', 'TYPE', 'DATA', 'AGE']].concat(l.map(x => [x.name, 'Opaque', Object.keys(x.data).length, age(x.created)])); }
        if (k === 'events') { const l = s.events.slice(-40); if (l.length) rows = [['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']].concat(l.map(e => [age(e.t), e.type, e.reason, `${e.kind.toLowerCase()}/${e.name}`, e.msg])); }
        if (k === 'endpoints') { const l = pick(Object.values(s.svcs)); rows = [['NAME', 'ENDPOINTS', 'AGE']].concat(l.map(x => [x.name, endpoints(x).map(p => `${p.ip}:${x.ports[0].targetPort}`).join(',') || '<none>', age(x.created)])); }
        if (!rows && !['pods', 'services', 'deployments', 'replicasets', 'nodes', 'namespaces', 'configmaps', 'secrets', 'events', 'endpoints'].includes(k)) throw new Error(`the server doesn't have a resource type "${k}"`);
        if (rows) blocks.push(table(rows));
      });
      if (!blocks.length) { if (only.length) return null; return 'No resources found in default namespace.'; }
      txt = blocks.join('\n\n');
      return txt;
    };
    const first = render();
    if (first === null) { c.err(`Error from server (NotFound): ${kinds[0]} "${only[0]}" not found\n`); return 1; }
    if (!o.watch) { c.out(first + '\n'); return 0; }
    // -w: 바뀔 때마다 줄 추가
    c.out(first + '\n');
    let last = first;
    const lines0 = new Set(first.split('\n'));
    while (await U.sleep(500, c.io.signal)) {
      const cur = render() || '';
      if (cur !== last) { cur.split('\n').slice(1).forEach(l => { if (!lines0.has(l)) { c.out(l + '\n'); lines0.add(l); } }); last = cur; }
    }
    return 0;
  }
  function describe(c, args) {
    const s = K.s;
    let [kind, name] = args[0] && args[0].includes('/') ? args[0].split('/') : [args[0], args[1]];
    kind = KIND[kind] || kind;
    const evs = n => s.events.filter(e => e.name === n || (e.kind === 'ReplicaSet' && n && e.name.startsWith(n))).slice(-12);
    const evt = n => { const l = evs(n); return l.length ? 'Events:\n' + table([['  Type', 'Reason', 'Age', 'From', 'Message'], ['  ----', '------', '----', '----', '-------']].concat(l.map(e => ['  ' + e.type, e.reason, age(e.t), e.kind === 'Pod' ? (e.reason === 'Scheduled' ? 'default-scheduler' : 'kubelet') : e.kind === 'Deployment' ? 'deployment-controller' : 'replicaset-controller', e.msg]))) : 'Events:  <none>'; };
    if (kind === 'pods') {
      const list = name ? [s.pods[name]].filter(Boolean) : Object.values(s.pods);
      if (!list.length) { c.err(`Error from server (NotFound): pods "${name}" not found\n`); return 1; }
      list.forEach(p => {
        const c0 = p.spec.containers[0]; const ct = podContainer(p);
        const stateTxt = p.ready ? `Running\n      Started:      ${new Date(p.started || p.created).toUTCString()}` : /BackOff|ErrImage|Crash/.test(p.status) ? `Waiting\n      Reason:       ${p.status}` : p.status === 'Completed' ? 'Terminated\n      Reason:       Completed\n      Exit Code:    0' : `Waiting\n      Reason:       ${p.status}`;
        c.out(`Name:             ${p.name}\nNamespace:        default\nPriority:         0\nService Account:  default\nNode:             minikube/192.168.49.2\nStart Time:       ${new Date(p.created).toUTCString()}\nLabels:           ${Object.entries(p.labels).map(([a, b]) => `${a}=${b}`).join('\n                  ') || '<none>'}\nStatus:           ${p.phase}\nIP:               ${p.ip}\nControlled By:    ${p.owner ? 'ReplicaSet/' + p.owner : '<none>'}\nContainers:\n  ${c0.name}:\n    Image:          ${c0.image}\n    Port:           ${c0.ports ? c0.ports[0].containerPort + '/TCP' : '<none>'}\n    State:          ${stateTxt}\n${ct && ct.state.exitCode && !p.ready ? `    Last State:     Terminated\n      Reason:       ${ct.state.oomKilled ? 'OOMKilled' : 'Error'}\n      Exit Code:    ${ct.state.exitCode}\n` : ''}    Ready:          ${p.ready ? 'True' : 'False'}\n    Restart Count:  ${p.restarts}\n    Environment:    ${(c0.env || []).map(e => `${e.name}: ${e.value != null ? e.value : '(from ref)'}`).join('\n                    ') || '<none>'}\nConditions:\n  Type              Status\n  Initialized       True\n  Ready             ${p.ready ? 'True' : 'False'}\n  PodScheduled      True\n${evt(p.name)}\n\n`);
      });
      return 0;
    }
    if (kind === 'deployments') {
      const d = s.deploys[name]; if (!d) { c.err(`Error from server (NotFound): deployments.apps "${name}" not found\n`); return 1; }
      const st = d.status || {};
      const c0 = d.spec.template.spec.containers[0];
      c.out(`Name:                   ${d.name}\nNamespace:              default\nCreationTimestamp:      ${new Date(d.created).toUTCString()}\nLabels:                 ${Object.entries(d.labels || {}).map(([a, b]) => `${a}=${b}`).join(',') || '<none>'}\nSelector:               ${Object.entries(d.spec.selector).map(([a, b]) => `${a}=${b}`).join(',')}\nReplicas:               ${d.spec.replicas} desired | ${st.updated || 0} updated | ${st.replicas || 0} total | ${st.available || 0} available | ${Math.max(0, (st.replicas || 0) - (st.available || 0))} unavailable\nStrategyType:           RollingUpdate\nRollingUpdateStrategy:  25% max unavailable, 25% max surge\nPod Template:\n  Labels:  ${Object.entries(d.spec.template.metadata.labels).map(([a, b]) => `${a}=${b}`).join(',')}\n  Containers:\n   ${c0.name}:\n    Image:        ${c0.image}\n    Port:         ${c0.ports ? c0.ports[0].containerPort + '/TCP' : '<none>'}\nNewReplicaSet:   ${d.name}-${tplHash(d.spec.template)} (${st.updated || 0}/${d.spec.replicas} replicas created)\n${evt(d.name)}\n`);
      return 0;
    }
    if (kind === 'services') {
      const x = s.svcs[name]; if (!x) { c.err(`Error from server (NotFound): services "${name}" not found\n`); return 1; }
      c.out(`Name:                     ${x.name}\nNamespace:                default\nSelector:                 ${Object.entries(x.selector).map(([a, b]) => `${a}=${b}`).join(',')}\nType:                     ${x.type}\nIP:                       ${x.clusterIP}\n${x.ports.map(p => `Port:                     <unset>  ${p.port}/TCP\nTargetPort:               ${p.targetPort}/TCP\n${p.nodePort ? `NodePort:                 <unset>  ${p.nodePort}/TCP\n` : ''}`).join('')}Endpoints:                ${endpoints(x).map(p => `${p.ip}:${x.ports[0].targetPort}`).join(',') || '<none>'}\nSession Affinity:         None\nEvents:                   <none>\n`);
      return 0;
    }
    if (kind === 'nodes') { c.out(`Name:               minikube\nRoles:              control-plane\nConditions:\n  Ready   True\nAddresses:\n  InternalIP:  192.168.49.2\n  Hostname:    minikube\nCapacity:\n  cpu:     2\n  memory:  3900Mi\n  pods:    110\nNon-terminated Pods:          (${Object.keys(s.pods).length + 7} in total)\n`); return 0; }
    c.err(`error: the server doesn't have a resource type "${args[0]}"\n`); return 1;
  }

  window.Kube = K;
})();
