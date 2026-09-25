/* ===================================================================
   오른쪽 실습 화면 — 터미널 · 대시보드 · 브라우저 · 파일 · 미션
   =================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = U.esc;
  const HOME = VFS.HOME;

  window.Docker = { engine: new Engine() };
  const D = Docker.engine;

  const Lab = {
    terms: [], active: null, pane: 'term',
    cmdLog: U.store.get('cmdlog', []),
    missions: [], missionKey: null, done: U.store.get('missions', {}),

    init() {
      Host.load();
      D.load();
      if (window.Kube) Kube.init(D);
      // 탭
      $$('.lab-tab').forEach(b => b.onclick = () => this.show(b.dataset.pane));
      $('#labClose').onclick = () => this.toggle(false);
      $('#labToggle').onclick = () => this.toggle(document.body.classList.contains('lab-closed'));
      $('#labWide').onclick = () => { document.body.classList.toggle('lab-wide'); U.store.set('labWide', document.body.classList.contains('lab-wide')); };
      $('#labReset').onclick = () => this.resetAll(false);
      if (U.store.get('labWide', false)) document.body.classList.add('lab-wide');
      if (U.store.get('labClosed', false) || innerWidth < 980) document.body.classList.add('lab-closed');
      const w = U.store.get('labW', null); if (w && innerWidth >= 980) document.documentElement.style.setProperty('--lab-w', w + 'px');
      this.splitter();
      this.initTerm();
      this.initDash();
      this.initBrowser();
      this.initFiles();
      this.initMissions();
      D.on('change', () => { this.dirty(); });
      Host.onWrite(() => { this.filesDirty = true; if (this.pane === 'files') this.renderTree(); this.checkSoon(); });
      setInterval(() => { if (this.pane === 'dash' && !document.hidden) this.renderDash(); }, 2500);
    },
    toggle(open) {
      document.body.classList.toggle('lab-closed', !open);
      U.store.set('labClosed', !open);
      if (open && this.active) setTimeout(() => this.active.focus(), 50);
    },
    open(pane) { this.toggle(true); if (pane) this.show(pane); },
    show(p) {
      this.pane = p;
      $$('.lab-tab').forEach(b => b.classList.toggle('on', b.dataset.pane === p));
      $$('.pane').forEach(x => x.classList.toggle('on', x.dataset.pane === p));
      if (p === 'dash') this.renderDash();
      if (p === 'files') this.renderTree();
      if (p === 'missions') this.renderMissions();
      if (p === 'browser') this.renderQuick();
      if (p === 'term' && this.active) setTimeout(() => this.active.focus(), 30);
    },
    flash(p) { const b = $(`.lab-tab[data-pane="${p}"]`); if (!b || this.pane === p) return; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); },
    splitter() {
      const sp = $('#splitter'), lab = $('#lab');
      let x0 = 0, w0 = 0;
      const move = e => { const w = Math.max(340, Math.min(innerWidth * 0.75, w0 + (x0 - e.clientX))); document.documentElement.style.setProperty('--lab-w', w + 'px'); };
      const up = () => { sp.classList.remove('drag'); document.body.style.userSelect = ''; removeEventListener('pointermove', move); removeEventListener('pointerup', up); U.store.set('labW', lab.offsetWidth); $$('.pane iframe').forEach(f => f.style.pointerEvents = ''); };
      sp.addEventListener('pointerdown', e => { x0 = e.clientX; w0 = lab.offsetWidth; sp.classList.add('drag'); document.body.style.userSelect = 'none'; $$('.pane iframe').forEach(f => f.style.pointerEvents = 'none'); addEventListener('pointermove', move); addEventListener('pointerup', up); });
      sp.addEventListener('dblclick', () => { document.documentElement.style.removeProperty('--lab-w'); U.store.del('labW'); });
    },
    dirty() {
      clearTimeout(this._dt);
      this._dt = setTimeout(() => {
        if (this.pane === 'dash') this.renderDash();
        if (this.pane === 'browser') this.renderQuick();
        this.checkSoon();
      }, 120);
    },

    /* ================================================================ 터미널 */
    initTerm() {
      const p = $('#paneTerm');
      p.innerHTML = `<div class="term-tabs"><span id="termTabs"></span><button class="tbtn" id="termAdd" title="새 터미널">＋</button><span class="spacer"></span><button class="tbtn" id="termClear" title="화면 지우기 (Ctrl+L)">지우기</button><button class="tbtn" id="termStop" title="실행 중인 명령 멈추기 (Ctrl+C)">■ Ctrl+C</button></div><div class="terms" id="terms"></div><div class="term-bar" id="termBar"></div>`;
      $('#termAdd').onclick = () => this.addTerm(true);
      $('#termClear').onclick = () => { if (this.active) { this.active.clear(); this.active.focus(); } };
      $('#termStop').onclick = () => { if (this.active) { this.active.interrupt(); this.active.focus(); } };
      const t = this.addTerm(false);
      t.write(`\x1b[1;36m🐳 studyDocker 실습 터미널\x1b[0m — 브라우저 안에서 동작하는 가상 Docker 입니다. \x1b[2m(help: 명령 목록)\x1b[0m\n`);
      const running = D.s.containers.filter(c => c.state.status === 'running').length;
      if (D.s.images.length) t.write(`\x1b[2m이전 실습 상태를 불러왔습니다: 이미지 ${D.s.images.length}개 · 컨테이너 ${D.s.containers.length}개 (실행 중 ${running}개). 처음부터 하려면 ↺ 초기화\x1b[0m\n`);
      this.setChips(['docker version', 'docker ps -a', 'docker images', 'help']);
    },
    addTerm(focus) {
      const t = new Terminal($('#terms'), { onBusy: () => this.renderTermTabs(), onState: () => {} });
      this.terms.push(t);
      this.activate(t);
      if (focus) setTimeout(() => t.focus(), 30);
      return t;
    },
    activate(t) {
      this.active = t;
      this.terms.forEach(x => x.el.classList.toggle('on', x === t));
      this.renderTermTabs();
    },
    renderTermTabs() {
      const box = $('#termTabs');
      box.innerHTML = this.terms.map((t, i) => `<button class="term-tab${t === this.active ? ' on' : ''}${t.running ? ' running' : ''}" data-i="${i}"><span class="busy"></span>터미널 ${i + 1}${this.terms.length > 1 ? ' <span class="x" data-x="' + i + '">✕</span>' : ''}</button>`).join('');
      $$('.term-tab', box).forEach(b => b.onclick = e => {
        const i = +b.dataset.i;
        if (e.target.dataset.x != null) { const t = this.terms[i]; if (t.ctl) t.ctl.abort(); t.el.remove(); this.terms.splice(i, 1); this.activate(this.terms[Math.max(0, i - 1)]); return; }
        this.activate(this.terms[i]); this.terms[i].focus();
      });
    },
    setChips(list) {
      const bar = $('#termBar');
      if (!list || !list.length) { bar.style.display = 'none'; return; }
      bar.style.display = '';
      bar.innerHTML = `<span class="lbl">빠른 명령</span>` + list.map(c => `<button class="chip-cmd" data-cmd="${esc(c)}">${esc(c)}</button>`).join('');
      $$('.chip-cmd', bar).forEach(b => b.onclick = () => this.run(b.dataset.cmd));
    },
    /** 명령 실행 (강의의 ▶ 버튼 · 대시보드 버튼) */
    run(cmds, opts) {
      opts = opts || {};
      this.open('term');
      let t = this.active;
      if (opts.newTerm || (t.running && !t.sessions.length && opts.parallel)) t = this.addTerm(false);
      else if (t.running && !t.sessions.length) {
        // 오래 도는 명령(logs -f 등)이 있으면 새 탭에서
        const idle = this.terms.find(x => !x.running);
        t = idle || this.addTerm(false);
        this.activate(t);
      }
      setTimeout(() => t.focus(), 30);
      return t.run(cmds);
    },
    recordCommand(cmd) {
      this.cmdLog.push({ t: Date.now(), c: cmd });
      if (this.cmdLog.length > 500) this.cmdLog.splice(0, 100);
      U.store.set('cmdlog', this.cmdLog);
    },
    afterCommand() { this.checkSoon(); if (this.filesDirty) { this.filesDirty = false; this.renderTree(); } },

    /* ================================================================ 대시보드 */
    initDash() {
      $('#paneDash').innerHTML = `<div class="dash" id="dash"></div>`;
      $('#dash').addEventListener('click', e => {
        const b = e.target.closest('[data-run]');
        if (b) { this.run(b.dataset.run); return; }
        const pp = e.target.closest('[data-open]');
        if (pp) { this.openBrowser(pp.dataset.open); return; }
        const vf = e.target.closest('[data-vol]');
        if (vf) { this.showVolume(vf.dataset.vol); return; }
      });
    },
    renderDash() {
      const box = $('#dash'); if (!box) return;
      const cs = D.s.containers.filter(c => !c.kube);
      const st = c => c.health && c.state.status === 'running' ? c.health.status === 'healthy' ? 'healthy' : c.health.status === 'unhealthy' ? 'unhealthy' : 'running' : c.state.status;
      const run = cs.filter(c => c.state.status === 'running').length;
      const imgSize = (() => { const L = {}; D.s.images.forEach(i => i.layers.forEach(l => { L[l.id] = l.size; })); return Object.values(L).reduce((a, b) => a + b, 0); })();
      let h = `<div class="stats" style="margin:0 0 12px">
        <div class="stat green"><b>${run}</b><span>실행 중</span></div>
        <div class="stat blue"><b>${cs.length}</b><span>컨테이너</span></div>
        <div class="stat purple"><b>${D.s.images.length}</b><span>이미지 · ${U.size(imgSize)}</span></div>
        <div class="stat orange"><b>${D.s.volumes.length}</b><span>볼륨</span></div>
        <div class="stat teal"><b>${D.s.networks.length}</b><span>네트워크</span></div></div>`;
      // 구성도
      const pub = [];
      cs.forEach(c => { if (c.state.status === 'running') (c.hostConfig.ports || []).forEach(p => pub.push({ c, p })); });
      h += `<h3>🗺️ 연결 구성도</h3><div class="topo"><div class="topo-host"><b>🖥️ 호스트 (localhost)</b>${pub.length ? pub.map(x => `<span class="port-pill" data-open="http://localhost:${x.p.hostPort}/" title="브라우저로 열기">:${x.p.hostPort} → ${esc(x.c.name)}:${x.p.containerPort}</span>`).join('') : '<span class="muted-s">게시된 포트 없음 (-p 로 연결)</span>'}${this.kubeHostPills()}</div><div class="nets">`;
      const nets = D.s.networks.filter(n => n.name !== 'kube-pods').sort((a, b) => (a.builtin ? 1 : 0) - (b.builtin ? 1 : 0));
      nets.forEach(n => {
        const members = cs.filter(c => c.networks[n.name]);
        if (n.builtin && n.name !== 'bridge' && !members.length) return;
        h += `<div class="netbox ${n.builtin ? n.name : 'user'}"><div class="nh"><span>🌐 ${esc(n.name)}${n.builtin ? '' : ' <span class="tag teal" style="font-size:10px">사용자 정의 · DNS</span>'}${n.internal ? ' <span class="tag gray" style="font-size:10px">internal</span>' : ''}</span><code>${esc(n.subnet || n.driver)}</code></div>`;
        h += members.length ? members.map(c => `<div class="cchip" data-run="docker inspect ${esc(c.name)}" title="${esc(c.image)} · 눌러서 inspect"><span class="dot ${st(c)}"></span><span class="nm">${esc(c.name)}</span><span class="muted-s">${esc(c.image)}</span><span class="ip">${esc(c.networks[n.name].ip || '-')}</span></div>`).join('') : `<div class="muted-s" style="padding:4px 2px">연결된 컨테이너 없음</div>`;
        h += `</div>`;
      });
      h += `</div><div class="dash-legend">● 초록 실행 중 · ● 빨강 종료 · ● 노랑 생성됨/일시정지 · 같은 <b>사용자 정의 네트워크</b> 안에서는 컨테이너 이름으로 서로 찾을 수 있습니다.</div></div>`;
      // 컨테이너 표
      h += `<h3>📦 컨테이너 <span class="n">${cs.length}</span></h3>`;
      if (!cs.length) h += `<div class="empty">컨테이너가 없습니다. <code>docker run hello-world</code> 로 시작해 보세요.</div>`;
      else {
        h += `<table class="ctable"><thead><tr><th>이름</th><th>이미지</th><th>상태</th><th>포트</th><th></th></tr></thead><tbody>`;
        cs.slice().reverse().forEach(c => {
          const s = c.state.status;
          const act = s === 'running' ? `<button data-run="docker stop ${esc(c.name)}" title="정지">■</button><button data-run="docker restart ${esc(c.name)}" title="재시작">⟳</button><button data-run="docker exec -it ${esc(c.name)} sh" title="컨테이너 안으로 들어가기">&gt;_</button>` : s === 'paused' ? `<button data-run="docker unpause ${esc(c.name)}">▶</button>` : `<button data-run="docker start ${esc(c.name)}" title="시작">▶</button>`;
          h += `<tr><td><b>${esc(c.name)}</b><div class="muted-s"><code>${c.id.slice(0, 12)}</code>${c.compose ? ` · compose: ${esc(c.compose.project)}` : ''}</div></td><td>${esc(c.image)}</td><td><span class="st"><span class="dot ${st(c)}"></span>${esc(DockerCLI.statusText(D, c))}</span>${c.state.oomKilled ? ' <span class="tag red">OOM</span>' : ''}</td><td>${(c.hostConfig.ports || []).map(p => `<span class="port-pill" data-open="http://localhost:${p.hostPort}/">${p.hostPort}:${p.containerPort}</span>`).join(' ')}</td><td class="acts">${act}<button data-run="docker logs --tail 30 ${esc(c.name)}" title="로그">📜</button><button data-run="docker rm -f ${esc(c.name)}" title="삭제">🗑</button></td></tr>`;
        });
        h += `</tbody></table>`;
      }
      // 이미지
      h += `<h3>🧱 이미지 <span class="n">${D.s.images.length}</span></h3>`;
      if (!D.s.images.length) h += `<div class="empty">내려받은 이미지가 없습니다. <code>docker pull nginx</code></div>`;
      else {
        h += `<table class="ctable"><thead><tr><th>이름:태그</th><th>ID</th><th>크기</th><th>사용 중</th><th></th></tr></thead><tbody>`;
        D.s.images.slice().reverse().forEach(i => {
          const users = cs.filter(c => c.imageId === i.id).length;
          const nm = i.repoTags[0] || '<none>:<none>';
          h += `<tr><td><b>${esc(nm)}</b>${i.repoTags.length > 1 ? `<div class="muted-s">${i.repoTags.slice(1).map(esc).join(', ')}</div>` : ''}${i.built ? ' <span class="tag blue">빌드</span>' : ''}</td><td><code>${i.id.slice(0, 12)}</code></td><td>${U.size(i.size)}</td><td>${users ? users + '개' : '<span class="muted-s">-</span>'}</td><td class="acts"><button data-run="docker history ${esc(i.repoTags[0] || i.id.slice(0, 12))}" title="레이어 보기">🧅</button><button data-run="docker rmi ${esc(i.repoTags[0] || i.id.slice(0, 12))}" title="삭제">🗑</button></td></tr>`;
        });
        h += `</tbody></table>`;
      }
      // 볼륨
      h += `<h3>💾 볼륨 <span class="n">${D.s.volumes.length}</span></h3>`;
      if (!D.s.volumes.length) h += `<div class="empty">볼륨이 없습니다. <code>docker volume create mydata</code></div>`;
      else {
        h += `<table class="ctable"><thead><tr><th>이름</th><th>연결된 컨테이너</th><th>파일</th><th></th></tr></thead><tbody>`;
        D.s.volumes.forEach(v => {
          const users = cs.filter(c => c.hostConfig.mounts.some(m => m.type === 'volume' && m.source === v.name));
          const nf = Object.keys((v.fs && v.fs.files) || {}).length;
          h += `<tr><td><b>${esc(v.name.length > 24 ? v.name.slice(0, 12) + '…' : v.name)}</b>${v.anonymous ? ' <span class="tag gray">익명</span>' : ''}</td><td>${users.map(c => `${esc(c.name)} <span class="muted-s">→ ${esc(c.hostConfig.mounts.find(m => m.source === v.name).target)}</span>`).join('<br>') || '<span class="muted-s">없음</span>'}</td><td><button class="btn tiny ghost" data-vol="${esc(v.name)}">📂 ${nf}개</button></td><td class="acts"><button data-run="docker volume rm ${esc(v.name)}" title="삭제">🗑</button></td></tr>`;
        });
        h += `</tbody></table>`;
      }
      if (window.Kube && Kube.dashHtml) h += Kube.dashHtml();
      box.innerHTML = h;
    },
    kubeHostPills() { return window.Kube && Kube.hostPills ? Kube.hostPills() : ''; },
    showVolume(name) {
      const v = D.volume(name); if (!v) return;
      const files = (v.fs && v.fs.files) || {};
      const list = Object.keys(files).sort();
      App.modal(`💾 볼륨 ${name}`, `<p class="muted small">호스트 위치: <code>${esc(v.mountpoint)}</code> — 컨테이너가 지워져도 이 안의 파일은 남습니다.</p>${list.length ? `<table class="ctable"><tr><th>경로</th><th>크기</th></tr>${list.map(f => `<tr><td><code>${esc(f)}</code></td><td>${U.size(files[f].length)}</td></tr>`).join('')}</table>` : '<div class="empty">비어 있습니다.</div>'}`);
    },

    /* ================================================================ 브라우저 */
    initBrowser() {
      $('#paneBrowser').innerHTML = `<div class="bro-bar"><button class="icon-btn" id="broBack" title="뒤로">←</button><button class="icon-btn" id="broReload" title="새로 고침">⟳</button><input id="broUrl" value="http://localhost:8080/" spellcheck="false" aria-label="주소"><button class="btn small primary" id="broGo">이동</button></div>
        <div class="bro-quick" id="broQuick"></div><div class="bro-frame"><iframe id="broFrame" sandbox="allow-same-origin" title="가상 브라우저"></iframe></div><div class="bro-status" id="broStatus">주소창에 http://localhost:포트 를 입력하세요.</div>`;
      this.bhist = [];
      $('#broGo').onclick = () => this.navigate($('#broUrl').value);
      $('#broUrl').addEventListener('keydown', e => { if (e.key === 'Enter') this.navigate($('#broUrl').value); });
      $('#broReload').onclick = () => this.navigate($('#broUrl').value, true);
      $('#broBack').onclick = () => { if (this.bhist.length > 1) { this.bhist.pop(); this.navigate(this.bhist.pop()); } };
      $('#broQuick').addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) this.navigate(b.dataset.open); });
      $('#broFrame').addEventListener('load', () => {
        try {
          const doc = $('#broFrame').contentDocument;
          doc.addEventListener('click', ev => {
            const a = ev.target.closest('a[href]'); if (!a) return;
            ev.preventDefault();
            const href = a.getAttribute('href');
            if (/^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(href)) { window.open(href, '_blank', 'noopener'); return; }
            this.navigate(new URL(href, this.curUrl || 'http://localhost/').href);
          });
          doc.addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target; const q = new URLSearchParams(new FormData(f)).toString(); this.navigate(new URL((f.getAttribute('action') || '') + '?' + q, this.curUrl).href); });
        } catch (_) {}
      });
    },
    renderQuick() {
      const q = $('#broQuick'); if (!q) return;
      const pub = [];
      D.s.containers.forEach(c => { if (c.state.status === 'running') (c.hostConfig.ports || []).forEach(p => pub.push({ c, p })); });
      const kp = window.Kube && Kube.hostPorts ? Kube.hostPorts() : [];
      q.innerHTML = `<span class="muted-s">열린 포트:</span>` + (pub.length || kp.length ? pub.map(x => `<span class="port-pill" data-open="http://localhost:${x.p.hostPort}/">localhost:${x.p.hostPort} <span class="muted-s">(${esc(x.c.name)})</span></span>`).join('') + kp.map(x => `<span class="port-pill" data-open="http://localhost:${x.port}/">localhost:${x.port} <span class="muted-s">(${esc(x.label)})</span></span>`).join('') : ' <span class="muted-s">없음 — docker run -p 8080:80 … 으로 포트를 게시하세요</span>');
    },
    openBrowser(url) { this.open('browser'); this.navigate(url); },
    async navigate(url, reload) {
      url = String(url || '').trim();
      if (!url) return;
      if (!/^\w+:\/\//.test(url)) url = 'http://' + url;
      this.curUrl = url;
      $('#broUrl').value = url;
      this.bhist.push(url);
      $('#broStatus').textContent = `요청 중… GET ${url}`;
      const t0 = performance.now();
      const r = await D.http(null, url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36' } });
      const ms = Math.round(performance.now() - t0);
      const fr = $('#broFrame');
      if (r.error) {
        const host = (url.match(/\/\/([^/]+)/) || [])[1] || url;
        const code = r.code === 6 ? 'DNS_PROBE_FINISHED_NXDOMAIN' : r.reset ? 'ERR_CONNECTION_RESET' : r.timeout ? 'ERR_CONNECTION_TIMED_OUT' : 'ERR_CONNECTION_REFUSED';
        const hint = r.code === 6 ? `호스트 이름 <b>${esc(host)}</b> 을(를) 찾을 수 없습니다. 컨테이너 이름은 호스트(내 PC)의 브라우저에서 쓸 수 없어요. <b>localhost:게시한포트</b> 로 접속하세요.`
          : r.reset ? (r.hint === 'loopback' ? `포트는 게시되어 있지만 컨테이너 안의 앱이 <b>127.0.0.1(localhost)</b> 에서만 듣고 있습니다. 앱이 <b>0.0.0.0</b> 에서 듣도록 설정하세요. (예: <code>flask run --host=0.0.0.0</code>)` : `포트 ${esc(String(r.cport || ''))} 는 게시되어 있지만 컨테이너 안에서 그 포트를 듣는 프로그램이 없습니다. <code>-p 호스트포트:컨테이너포트</code> 의 <b>오른쪽 번호</b>가 앱이 실제로 쓰는 포트인지 확인하세요.`)
          : r.timeout ? '응답이 없습니다. 컨테이너가 일시 정지(pause)되었거나 다른 네트워크에 있습니다.'
          : `이 주소의 포트를 게시(-p)한 <b>실행 중인</b> 컨테이너가 없습니다. <code>docker ps</code> 로 PORTS 칸을 확인하세요.`;
        fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI',system-ui,sans-serif;color:#202124;padding:48px 40px;max-width:600px}h1{font-size:22px;font-weight:500;margin:18px 0 10px}p{color:#5f6368;line-height:1.6;font-size:14px}code{background:#f1f3f4;padding:1px 5px;border-radius:4px}.c{font-size:12px;color:#5f6368;margin-top:22px}.i{font-size:46px}</style></head><body><div class="i">😵</div><h1>사이트에 연결할 수 없음</h1><p><b>${esc(host)}</b>에서 ${r.reset ? '연결을 재설정했습니다' : r.code === 6 ? '서버 IP 주소를 찾을 수 없습니다' : '연결을 거부했습니다'}.</p><p>💡 ${hint}</p><div class="c">${code}</div></body></html>`;
        $('#broStatus').textContent = `✖ ${code} · ${ms}ms`;
        return;
      }
      let body = String(r.body == null ? '' : r.body);
      const html = /html/.test(r.type) || /^\s*</.test(body) && !/json|plain/.test(r.type);
      if (!html) body = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;font:13px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-word;color:#222}</style></head><body>${esc(/json/.test(r.type) ? (() => { try { return JSON.stringify(JSON.parse(body), null, 2); } catch (_) { return body; } })() : body)}</body></html>`;
      else if (!/<meta charset/i.test(body)) body = '<meta charset="utf-8">' + body;
      fr.srcdoc = body;
      $('#broStatus').textContent = `✔ ${r.status} · ${r.type} · ${U.size(new Blob([r.body || '']).size)} · ${ms}ms`;
    },

    /* ================================================================ 파일 */
    initFiles() {
      $('#paneFiles').innerHTML = `<div class="files"><div class="ftree" id="ftree"></div><div class="feditor" id="feditor"><div class="fempty">왼쪽에서 파일을 고르거나 <b>＋ 파일</b> 로 새로 만드세요.<br><span class="muted small">강의의 <b>📄 파일로 저장</b> 버튼을 누르면 예제 파일이 여기에 만들어집니다.</span></div></div></div>`;
      this.openDirs = new Set(U.store.get('openDirs', [HOME]));
      this.curFile = null;
      $('#ftree').addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (b) { this.fileAct(b.dataset.act); return; }
        const it = e.target.closest('.fi'); if (!it) return;
        const p = it.dataset.p;
        if (it.classList.contains('dir')) { if (this.openDirs.has(p)) this.openDirs.delete(p); else this.openDirs.add(p); U.store.set('openDirs', Array.from(this.openDirs)); this.selDir = p; this.renderTree(); }
        else this.openFile(p);
      });
    },
    renderTree() {
      const box = $('#ftree'); if (!box) return;
      const fs = Host.fs;
      const rows = [];
      const rec = (p, depth) => {
        fs.ls(p).filter(n => n !== '.git').forEach(n => {
          const fp = p + '/' + n;
          const d = fs.stat(fp) === 'dir';
          rows.push(`<div class="fi${d ? ' dir' : ''}${this.curFile === fp ? ' on' : ''}" data-p="${esc(fp)}" style="padding-left:${6 + depth * 14}px" title="${esc(fp)}"><span class="ic">${d ? (this.openDirs.has(fp) ? '📂' : '📁') : fileIcon(n)}</span>${esc(n)}</div>`);
          if (d && this.openDirs.has(fp)) rec(fp, depth + 1);
        });
      };
      rec(HOME, 0);
      box.innerHTML = `<div class="fhead"><button class="btn tiny" data-act="newfile">＋ 파일</button><button class="btn tiny" data-act="newdir">＋ 폴더</button></div><div class="fi dir" data-p="${HOME}"><span class="ic">🏠</span>~ (student)</div>` + rows.join('');
    },
    fileAct(a) {
      const base = this.selDir || (this.curFile ? VFS.parent(this.curFile) : HOME);
      if (a === 'newfile' || a === 'newdir') {
        const n = prompt(a === 'newfile' ? `새 파일 이름 (위치: ${base.replace(HOME, '~')})\n예: app.py, Dockerfile, myapp/index.html` : `새 폴더 이름 (위치: ${base.replace(HOME, '~')})`);
        if (!n) return;
        const p = VFS.norm(n, base);
        if (!p.startsWith(HOME)) { App.toast('홈 폴더(~) 안에만 만들 수 있어요'); return; }
        if (a === 'newdir') { Host.fs.mkdir(p); this.openDirs.add(p); this.renderTree(); return; }
        if (!Host.fs.stat(p)) Host.fs.write(p, '');
        this.openDirs.add(VFS.parent(p));
        this.openFile(p);
      }
    },
    openFile(p) {
      this.open('files');
      const fs = Host.fs;
      const s = fs.read(p);
      if (s == null) return;
      let dir = VFS.parent(p);
      while (dir.startsWith(HOME)) { this.openDirs.add(dir); dir = VFS.parent(dir); }
      this.curFile = p;
      const name = VFS.base(p);
      const quick = /^Dockerfile/i.test(name) ? `<button class="btn tiny" data-q="build">▶ docker build</button>` : /^(compose|docker-compose)\.ya?ml$/.test(name) ? `<button class="btn tiny" data-q="up">▶ compose up</button>` : /\.ya?ml$/.test(name) && /kind:/.test(s) ? `<button class="btn tiny" data-q="kapply">▶ kubectl apply</button>` : '';
      $('#feditor').innerHTML = `<div class="fbar"><span class="fpath">${esc(p.replace(HOME, '~'))} <span class="dirty" id="fdirty"></span></span>${quick}<button class="btn tiny" data-q="cd" title="터미널에서 이 폴더로 이동">⌨ cd</button><button class="btn tiny primary" data-q="save">💾 저장 <span class="muted-s" style="color:inherit;opacity:.7">Ctrl+S</span></button><button class="btn tiny ghost" data-q="del" title="파일 삭제">🗑</button></div><div class="fedit"><div class="gut" id="fgut"></div><textarea id="ftext" spellcheck="false" wrap="off"></textarea></div>`;
      const ta = $('#ftext'), gut = $('#fgut');
      ta.value = s;
      const lines = () => { gut.textContent = Array.from({ length: ta.value.split('\n').length }, (_, i) => i + 1).join('\n'); };
      lines();
      ta.addEventListener('input', () => { lines(); $('#fdirty').textContent = ta.value !== (Host.fs.read(p) || '') ? '● 저장 안 됨' : ''; });
      ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
      ta.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
        if (e.key === 'Tab') { e.preventDefault(); const a = ta.selectionStart; ta.setRangeText('  ', a, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
      });
      const save = () => { Host.fs.write(p, ta.value); $('#fdirty').textContent = ''; App.toast('💾 저장했습니다: ' + p.replace(HOME, '~')); this.checkSoon(); };
      $$('#feditor [data-q]').forEach(b => b.onclick = () => {
        const q = b.dataset.q; const d = VFS.parent(p).replace(HOME, '~');
        if (q === 'save') save();
        if (q === 'cd') this.run(`cd ${d}`);
        if (q === 'build') { save(); this.run([`cd ${d}`, `docker build -t ${(VFS.base(VFS.parent(p)) || 'myapp').toLowerCase().replace(/[^a-z0-9_.-]/g, '')} .`]); }
        if (q === 'up') { save(); this.run([`cd ${d}`, 'docker compose up -d']); }
        if (q === 'kapply') { save(); this.run([`cd ${d}`, `kubectl apply -f ${name}`]); }
        if (q === 'del') { if (confirm(`${p.replace(HOME, '~')} 을(를) 지울까요?`)) { Host.fs.rm(p, true); this.curFile = null; $('#feditor').innerHTML = '<div class="fempty">파일을 지웠습니다.</div>'; this.renderTree(); } }
      });
      this.renderTree();
      setTimeout(() => ta.focus(), 30);
    },
    refreshFiles() { this.filesDirty = true; if (this.pane === 'files') this.renderTree(); },
    /** 터미널의 nano · vi → 편집 (호스트 파일은 파일 탭, 컨테이너 파일은 창) */
    editFile(path, content, o) {
      if (o.host) {
        if (Host.fs.read(path) == null) Host.fs.write(path, content || '');
        this.openFile(path);
        return Promise.resolve(null).then(v => { App.toast('📝 파일 탭에서 편집하고 저장(Ctrl+S)하세요'); return v; });
      }
      return new Promise(res => {
        App.modal(`📝 ${o.title || path}`, `<p class="muted small">컨테이너 안의 파일입니다. 저장하면 컨테이너의 쓰기 층(또는 마운트된 볼륨)에 기록됩니다.</p><textarea id="cedit" spellcheck="false" style="width:100%;height:320px;font:13px/1.5 var(--mono);background:var(--term-bg);color:#e6edf3;border-radius:8px;padding:10px;border:1px solid var(--line)"></textarea><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn" id="ceditNo">취소</button><button class="btn primary" id="ceditOk">💾 저장하고 닫기</button></div>`);
        $('#cedit').value = content;
        let done = false;
        const fin = v => { if (done) return; done = true; $('#modal').classList.add('hidden'); res(v); if (this.active) this.active.focus(); };
        $('#ceditOk').onclick = () => fin($('#cedit').value);
        $('#ceditNo').onclick = () => fin(null);
        $('#modalClose').addEventListener('click', () => fin(null), { once: true });
        setTimeout(() => $('#cedit').focus(), 30);
      });
    },

    /* ================================================================ 미션 */
    initMissions() { $('#paneMissions').innerHTML = `<div class="missions" id="missions"></div>`; this.renderMissions(); },
    setMissions(key, list, title) {
      this.missionKey = key;
      this.missions = list || [];
      this.missionTitle = title || '';
      this.renderMissions();
      this.checkSoon();
    },
    M() {
      const find = n => D.findContainer(n);
      const M = {
        D, Host,
        c: find,
        exists: n => !!find(n),
        running: n => { const c = find(n); return !!c && c.state.status === 'running'; },
        status: n => { const c = find(n); return c ? c.state.status : null; },
        cs: f => D.s.containers.filter(f || (() => true)),
        image: r => D.findImage(r),
        images: () => D.s.images,
        vol: n => D.volume(n),
        net: n => D.network(n),
        port: p => { const c = D.hostPortOwner(p); return c && c.state.status === 'running' ? c : null; },
        connected: (n, net) => { const c = find(n); return !!c && !!c.networks[net]; },
        mount: (n, target) => { const c = find(n); return c ? c.hostConfig.mounts.find(m => m.target === target) || null : null; },
        env: (n, k) => { const c = find(n); return c ? D.envOf(c)[k] : undefined; },
        health: n => { const c = find(n); return c && c.health ? c.health.status : null; },
        file: p => Host.fs.read(VFS.norm(p.replace(/^~/, HOME))),
        cfile: (n, p) => { const c = find(n); return c ? Apps.fsFor(D, c, 'root').read(p) : null; },
        ran: re => this.cmdLog.some(x => re.test(x.c)),
        ranSince: (re, t) => this.cmdLog.some(x => x.t >= t && re.test(x.c)),
        get: async url => { const r = await D.http(null, url); return r.error ? '' : String(r.body || ''); },
        kube: window.Kube ? Kube : null,
        logs: n => { const c = find(n); return c ? c.logs.map(l => l.m).join('\n') : ''; }
      };
      return M;
    },
    checkSoon() { clearTimeout(this._ct); this._ct = setTimeout(() => this.check(), 250); },
    async check() {
      const key = this.missionKey; if (!key) return;
      const done = this.done[key] = this.done[key] || {};
      const M = this.M();
      let newly = [];
      for (const m of this.missions) {
        if (done[m.id]) continue;
        let ok = false;
        try { ok = await Promise.resolve(m.check(M)); } catch (e) { ok = false; }
        if (ok) { done[m.id] = Date.now(); newly.push(m); }
      }
      if (newly.length) {
        U.store.set('missions', this.done);
        newly.forEach(m => App.toast(`🎯 미션 완료: ${m.title}`, 2600));
        this.flash('missions');
        this.renderMissions(newly.map(m => m.id));
        if (window.App && App.onMission) App.onMission(key);
      }
      this.badge();
    },
    badge() {
      const b = $('#missionBadge'); if (!b) return;
      const n = this.missions.length;
      const d = n ? this.missions.filter(m => (this.done[this.missionKey] || {})[m.id]).length : 0;
      b.textContent = n ? `${d}/${n}` : '';
      b.classList.toggle('done', n > 0 && d === n);
    },
    renderMissions(just) {
      const box = $('#missions'); if (!box) return;
      this.badge();
      const list = this.missions;
      if (!list.length) { box.innerHTML = `<div class="empty">이 페이지에는 미션이 없습니다. 각 장을 열면 그 장의 실습 미션이 여기에 나타납니다.<br><br>🧪 여러 가지 상황을 연습하려면 목차의 <a href="#lab">실습실 · 장애 대응 시나리오</a> 를 열어 보세요.</div>`; return; }
      const done = this.done[this.missionKey] || {};
      const n = list.filter(m => done[m.id]).length;
      box.innerHTML = `<div class="m-head"><h3>🎯 ${esc(this.missionTitle || '미션')}</h3><div class="m-prog"><div style="width:${100 * n / list.length}%"></div></div><b>${n}/${list.length}</b></div>
        <p class="muted small" style="margin:0 0 8px">터미널에서 명령을 실행하면 <b>자동으로 채점</b>됩니다. 막히면 💡 힌트를 열어 보세요.</p>` +
        list.map((m, i) => `<div class="mission${done[m.id] ? ' done' : ''}${just && just.includes(m.id) ? ' just' : ''}" data-id="${esc(m.id)}">
          <div class="mt"><span class="mc">${done[m.id] ? '✓' : ''}</span><span>${i + 1}. ${m.title}${m.scenario ? '<span class="tag-sc">장애 상황</span>' : ''}</span></div>
          ${m.desc ? `<div class="md">${m.desc}</div>` : ''}
          <div class="mx">${m.setup ? `<button class="btn tiny" data-setup="${i}">⚙️ 상황 만들기</button>` : ''}${m.hint ? `<button class="btn tiny ghost" data-hint="${i}">💡 힌트</button>` : ''}${m.answer ? `<button class="btn tiny ghost" data-ans="${i}">🔑 정답 명령</button>` : ''}</div>
          <div class="hint hidden" id="mh${i}">${m.hint || ''}</div>
          ${m.answer ? `<div class="hint hidden" id="ma${i}"><pre class="code" style="margin:0;font-size:12.5px">${esc(Array.isArray(m.answer) ? m.answer.join('\n') : m.answer)}</pre><div style="text-align:right;margin-top:6px"><button class="btn tiny" data-runans="${i}">▶ 터미널에서 실행</button></div></div>` : ''}
        </div>`).join('') +
        `<div style="margin-top:14px;display:flex;gap:8px"><button class="btn tiny ghost" id="mReset">↺ 이 미션 기록 지우기</button></div>`;
      $$('[data-hint]', box).forEach(b => b.onclick = () => $('#mh' + b.dataset.hint).classList.toggle('hidden'));
      $$('[data-ans]', box).forEach(b => b.onclick = () => $('#ma' + b.dataset.ans).classList.toggle('hidden'));
      $$('[data-runans]', box).forEach(b => b.onclick = () => { const m = list[+b.dataset.runans]; this.run(Array.isArray(m.answer) ? m.answer : String(m.answer).split('\n')); });
      $$('[data-setup]', box).forEach(b => b.onclick = async () => { const m = list[+b.dataset.setup]; App.toast('⚙️ 실습 상황을 만드는 중…'); await this.run(m.setup); App.toast('상황이 준비되었습니다. 문제를 찾아 해결해 보세요!'); });
      const r = $('#mReset'); if (r) r.onclick = () => { delete this.done[this.missionKey]; U.store.set('missions', this.done); this.renderMissions(); this.checkSoon(); };
    },

    /* ================================================================ 초기화 */
    async resetAll(silent) {
      if (!silent && !confirm('실습 환경을 처음 상태로 되돌릴까요?\n\n· 모든 컨테이너 · 이미지 · 볼륨 · 네트워크 삭제\n· 홈 폴더(~) 파일 삭제\n· (학습 진도와 미션 기록은 남습니다)')) return;
      D.reset();
      if (window.Kube) Kube.reset();
      Host.reset();
      this.cmdLog = []; U.store.set('cmdlog', []);
      this.terms.forEach(t => { if (t.ctl) t.ctl.abort(); t.el.remove(); });
      this.terms = [];
      const t = this.addTerm(true);
      t.write('\x1b[1;36m↺ 실습 환경을 초기화했습니다.\x1b[0m\n');
      this.curFile = null;
      this.initFiles(); this.renderTree();
      this.renderDash(); this.renderQuick();
      this.checkSoon();
    }
  };
  function fileIcon(n) {
    if (/^Dockerfile|\.dockerfile$/i.test(n)) return '🐳';
    if (/compose\.ya?ml$/.test(n)) return '🧩';
    if (/\.ya?ml$/.test(n)) return '⚙️';
    if (/\.py$/.test(n)) return '🐍';
    if (/\.(js|mjs|ts)$/.test(n)) return '🟨';
    if (/\.go$/.test(n)) return '🐹';
    if (/\.java$/.test(n)) return '☕';
    if (/\.html?$/.test(n)) return '🌐';
    if (/\.css$/.test(n)) return '🎨';
    if (/\.(json)$/.test(n)) return '🔧';
    if (/\.(sql)$/.test(n)) return '🗄️';
    if (/\.(md|txt)$/.test(n)) return '📄';
    if (/^\.env|\.dockerignore$/.test(n)) return '🔒';
    if (/\.sh$/.test(n)) return '📜';
    return '📄';
  }

  window.Lab = Lab;
})();
