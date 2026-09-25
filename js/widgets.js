/* ===================================================================
   강의 속 위젯 — {{widget:종류|옵션=값}}
   files · run · open · cmdbuilder · lifecycle · layers · portmap · cachesim · sizes · netlab · vmcompare
   =================================================================== */
(function () {
  'use strict';
  const esc = U.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = () => Docker.engine;
  const W = {};
  const alive = new Set();   // 엔진 변화에 반응하는 위젯

  function mountAll(root) {
    alive.clear();
    $$('.widget', root).forEach(el => {
      const type = el.dataset.w;
      let o = {}; try { o = JSON.parse(el.dataset.o || '{}'); } catch (_) {}
      const fn = W[type];
      if (!fn) { el.innerHTML = `<div class="fig-missing">⚠ 위젯 "${esc(type)}" 없음</div>`; return; }
      try { fn(el, o, currentLesson()); } catch (e) { console.error(e); el.innerHTML = `<div class="fig-missing">⚠ 위젯 오류: ${esc(e.message)}</div>`; }
    });
  }
  function currentLesson() { return Course.lessons[App.state.id] || null; }
  function react(el, fn) { const rec = { el, fn }; alive.add(rec); fn(); }
  let rt = null;
  function tick() { clearTimeout(rt); rt = setTimeout(() => alive.forEach(r => { if (document.body.contains(r.el)) { try { r.fn(); } catch (e) { console.error(e); } } else alive.delete(r); }), 150); }
  setTimeout(() => { if (window.Docker) Docker.engine.on('change', tick); }, 0);

  /* ---------------------------------------------------------------- 실습 파일 준비 */
  W.files = (el, o, l) => {
    const set = (l && l.files && l.files[o.set]) || {};
    const names = Object.keys(set);
    el.innerHTML = `<div class="lab-card files-widget"><h4>📁 ${esc(o.title || '실습 파일 준비')}</h4>
      <p class="muted small" style="margin:0">아래 파일들을 홈 폴더에 만듭니다. 이미 있으면 덮어씁니다.</p>
      <ul>${names.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      <button class="btn primary small">📁 파일 만들기${o.cd ? ` + ${esc(o.cd)} 로 이동` : ''}</button> <button class="btn small ghost" data-open>📝 파일 탭 열기</button></div>`;
    $('.btn.primary', el).onclick = () => {
      Host.writeFiles(set);
      App.toast(`📁 파일 ${names.length}개를 만들었습니다`);
      const first = names.find(n => !n.endsWith('/'));
      if (o.cd) Lab.run(`cd ${o.cd}`);
      if (first) Lab.openFile(VFS.norm(first.replace(/^~/, VFS.HOME)));
      if (o.cd) setTimeout(() => Lab.show('term'), 400);
    };
    $('[data-open]', el).onclick = () => Lab.open('files');
  };

  /* ---------------------------------------------------------------- 버튼 몇 개 */
  W.run = (el, o) => {
    const cmds = String(o.cmd || '').split(';;').map(s => s.trim()).filter(Boolean);
    el.innerHTML = `<div class="code-acts" style="justify-content:flex-start;margin:8px 0"><button class="run">▶ ${esc(o.label || cmds.join(' → '))}</button></div>`;
    $('button', el).onclick = () => Lab.run(cmds);
  };
  W.open = (el, o) => {
    const label = { dash: '📊 대시보드 보기', browser: '🌐 브라우저 열기', files: '📝 파일 탭 열기', missions: '🎯 미션 보기', term: '🖥️ 터미널 보기' }[o.pane] || '열기';
    el.innerHTML = `<button class="btn small">${esc(o.label || label)}</button>`;
    $('button', el).onclick = () => { if (o.url) Lab.openBrowser(o.url); else Lab.open(o.pane); };
  };
  W.mission = (el) => {
    const l = currentLesson(); const n = l && l.missions ? l.missions.length : 0;
    el.innerHTML = `<div class="box practice"><div class="box-t">🎯 스스로 해 보기</div>이 장의 실습 미션 ${n}개가 오른쪽 <b>🎯 미션</b> 탭에 있습니다. 명령을 직접 입력해서 해결하면 자동으로 채점됩니다. <button class="btn tiny primary">미션 탭 열기</button></div>`;
    $('button', el).onclick = () => Lab.open('missions');
  };

  /* ---------------------------------------------------------------- docker run 명령 만들기 */
  W.cmdbuilder = (el, o) => {
    const img = o.image || 'nginx';
    el.innerHTML = `<div class="lab-card"><h4>🧰 docker run 명령 만들기</h4>
      <div class="w-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
        <label>이미지 <input class="w-in" data-k="image" value="${esc(img)}"></label>
        <label>이름 (--name) <input class="w-in" data-k="name" value="${esc(o.name || 'web')}"></label>
        <label>포트 (-p 호스트:컨테이너) <input class="w-in" data-k="port" value="${esc(o.port || '8080:80')}"></label>
        <label>환경 변수 (-e) <input class="w-in" data-k="env" placeholder="KEY=value" value=""></label>
        <label>볼륨 (-v) <input class="w-in" data-k="vol" placeholder="data:/data" value=""></label>
        <label>네트워크 (--network) <input class="w-in" data-k="net" placeholder="(기본 bridge)" value=""></label>
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0">
        <label><input type="checkbox" data-k="d" checked> -d 백그라운드</label>
        <label><input type="checkbox" data-k="rm"> --rm 끝나면 삭제</label>
        <label><input type="checkbox" data-k="it"> -it 대화형</label>
        <label>재시작 <select data-k="restart"><option value="">no</option><option>always</option><option>unless-stopped</option><option>on-failure</option></select></label>
      </div>
      <pre class="code" data-lang="bash"><code class="gen"></code></pre>
      <div class="code-acts" style="margin-top:-8px"><button class="run">▶ 터미널에서 실행</button></div>
      <div class="muted small expl"></div></div>`;
    const gen = () => {
      const v = k => { const i = $(`[data-k="${k}"]`, el); return i.type === 'checkbox' ? i.checked : i.value.trim(); };
      const parts = ['docker run'];
      const ex = [];
      if (v('d')) { parts.push('-d'); ex.push('<code>-d</code> 백그라운드로 실행하고 ID 만 출력'); }
      if (v('it')) { parts.push('-it'); ex.push('<code>-it</code> 키보드 입력 + 터미널 연결'); }
      if (v('rm')) { parts.push('--rm'); ex.push('<code>--rm</code> 컨테이너가 끝나면 자동 삭제'); }
      if (v('name')) { parts.push('--name ' + v('name')); ex.push(`<code>--name</code> 이름을 ${esc(v('name'))}(으)로`); }
      if (v('port')) { parts.push('-p ' + v('port')); const [h, c] = v('port').split(':'); ex.push(`<code>-p</code> 내 PC ${esc(h)}번 포트 → 컨테이너 ${esc(c || h)}번 포트`); }
      if (v('env')) { parts.push('-e ' + v('env')); ex.push('<code>-e</code> 환경 변수 전달'); }
      if (v('vol')) { parts.push('-v ' + v('vol')); ex.push('<code>-v</code> 볼륨 연결 (데이터 보존)'); }
      if (v('net')) { parts.push('--network ' + v('net')); ex.push('<code>--network</code> 네트워크 지정'); }
      if (v('restart')) { parts.push('--restart ' + v('restart')); ex.push('<code>--restart</code> 재시작 정책'); }
      parts.push(v('image') || 'nginx');
      $('.gen', el).textContent = parts.join(' ');
      $('.expl', el).innerHTML = ex.join(' · ');
    };
    $$('input,select', el).forEach(i => i.addEventListener('input', gen));
    $('.run', el).onclick = () => Lab.run($('.gen', el).textContent);
    gen();
  };

  /* ---------------------------------------------------------------- 컨테이너 상태 기계 */
  W.lifecycle = (el, o) => {
    const name = o.name || 'demo';
    el.innerHTML = `<div class="lab-card"><h4>🔄 컨테이너 생명주기 — 직접 눌러 보기</h4>
      <p class="muted small" style="margin:0 0 6px">버튼을 누르면 오른쪽 터미널에서 실제 명령이 실행되고, 컨테이너 <code>${esc(name)}</code> 의 현재 상태가 아래 그림에 표시됩니다.</p>
      <svg class="dg" viewBox="0 0 760 250" role="img" aria-label="컨테이너 상태 전이도">
        <g class="st-n" data-s="none"><rect x="10" y="95" width="110" height="50" rx="25" class="box"/><text x="65" y="120" class="t-c t-sm t-b">(없음)</text></g>
        <g class="st-n" data-s="created"><rect x="170" y="95" width="120" height="50" rx="12" class="yellow"/><text x="230" y="115" class="t-c t-b">Created</text><text x="230" y="133" class="t-c t-xs t-mu">만들어짐</text></g>
        <g class="st-n" data-s="running"><rect x="350" y="95" width="120" height="50" rx="12" class="green"/><text x="410" y="115" class="t-c t-b">Running</text><text x="410" y="133" class="t-c t-xs t-mu">실행 중</text></g>
        <g class="st-n" data-s="paused"><rect x="350" y="10" width="120" height="46" rx="12" class="purple"/><text x="410" y="30" class="t-c t-b">Paused</text><text x="410" y="46" class="t-c t-xs t-mu">일시 정지</text></g>
        <g class="st-n" data-s="exited"><rect x="540" y="95" width="120" height="50" rx="12" class="red"/><text x="600" y="115" class="t-c t-b">Exited</text><text x="600" y="133" class="t-c t-xs t-mu">종료됨</text></g>
        <g class="st-n" data-s="removed"><rect x="540" y="195" width="120" height="46" rx="23" class="gray"/><text x="600" y="222" class="t-c t-sm t-b">삭제됨</text></g>
        <line x1="120" y1="120" x2="168" y2="120" class="ln ar"/><text x="144" y="112" class="t-c t-xs t-mono">create</text>
        <line x1="290" y1="120" x2="348" y2="120" class="ln ar"/><text x="319" y="112" class="t-c t-xs t-mono">start</text>
        <line x1="470" y1="112" x2="538" y2="112" class="ln ar"/><text x="505" y="104" class="t-c t-xs t-mono">stop</text>
        <path d="M540 132 Q505 160 470 132" class="ln ar" fill="none"/><text x="505" y="168" class="t-c t-xs t-mono">start</text>
        <line x1="395" y1="95" x2="395" y2="58" class="ln ar"/><text x="372" y="80" class="t-e t-xs t-mono">pause</text>
        <line x1="425" y1="58" x2="425" y2="95" class="ln ar"/><text x="430" y="80" class="t-xs t-mono">unpause</text>
        <line x1="600" y1="145" x2="600" y2="193" class="ln ar"/><text x="606" y="172" class="t-xs t-mono">rm</text>
        <path d="M65 145 Q65 210 350 150" class="ln dash ar" fill="none"/><text x="160" y="200" class="t-xs t-mono t-mu">docker run = create + start</text>
      </svg>
      <div class="w-btns" style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn small" data-c="docker create --name ${esc(name)} nginx">create</button>
        <button class="btn small" data-c="docker start ${esc(name)}">start</button>
        <button class="btn small" data-c="docker pause ${esc(name)}">pause</button>
        <button class="btn small" data-c="docker unpause ${esc(name)}">unpause</button>
        <button class="btn small" data-c="docker stop ${esc(name)}">stop</button>
        <button class="btn small" data-c="docker kill ${esc(name)}">kill</button>
        <button class="btn small" data-c="docker rm ${esc(name)}">rm</button>
        <button class="btn small primary" data-c="docker run -d --name ${esc(name)} nginx">run (한 번에)</button>
      </div>
      <div class="muted small cur" style="margin-top:8px"></div></div>`;
    $$('[data-c]', el).forEach(b => b.onclick = () => Lab.run(b.dataset.c));
    react(el, () => {
      const c = D().findContainer(name);
      const s = !c ? 'none' : c.state.status === 'restarting' ? 'running' : c.state.status;
      $$('.st-n', el).forEach(g => { g.style.opacity = g.dataset.s === s ? 1 : .35; g.style.filter = g.dataset.s === s ? 'drop-shadow(0 0 6px rgba(29,99,237,.6))' : ''; });
      $('.cur', el).innerHTML = c ? `현재 상태: <b>${esc(c.state.status)}</b> · ${esc(DockerCLI.statusText(D(), c))}${c.state.status === 'exited' ? ` · 종료 코드 <b>${c.state.exitCode}</b>` : ''}` : `컨테이너 <code>${esc(name)}</code> 가 아직 없습니다.`;
    });
  };

  /* ---------------------------------------------------------------- 이미지 레이어 보기 */
  W.layers = (el, o) => {
    el.innerHTML = `<div class="lab-card"><h4>🧅 이미지 레이어 들여다보기</h4>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select class="w-in isel" style="min-width:220px"></select><span class="muted small">내 PC(실습 환경)에 있는 이미지 목록입니다. 없으면 <code class="cmd">docker pull ${esc(o.pull || 'nginx')}</code></span></div>
      <div class="lstack" style="margin-top:10px"></div></div>`;
    const sel = $('.isel', el);
    let cur = o.image || '';
    sel.onchange = () => { cur = sel.value; draw(); };
    const draw = () => {
      const imgs = D().s.images;
      sel.innerHTML = imgs.length ? imgs.map(i => `<option value="${esc(i.id)}"${(cur === i.id || i.repoTags.includes(cur)) ? ' selected' : ''}>${esc(i.repoTags[0] || i.id.slice(0, 12))} · ${U.size(i.size)}</option>`).join('') : '<option>(이미지 없음)</option>';
      const img = imgs.find(i => i.id === sel.value) || imgs[0];
      if (!img) { $('.lstack', el).innerHTML = '<div class="empty">이미지를 먼저 내려받으세요.</div>'; return; }
      const max = Math.max(...img.layers.map(l => l.size), 1);
      const shared = new Map(); imgs.forEach(i => i.layers.forEach(l => shared.set(l.id, (shared.get(l.id) || 0) + 1)));
      const ls = img.layers.slice().reverse();
      $('.lstack', el).innerHTML = `<div class="muted small" style="margin-bottom:6px">위가 가장 나중에 쌓인 레이어입니다. 레이어는 <b>읽기 전용</b>이고, 컨테이너를 만들면 맨 위에 얇은 <b>쓰기 층</b>이 하나 더 생깁니다.</div>
        <div style="border:2px dashed var(--c-green);border-radius:8px;padding:6px 10px;margin-bottom:4px;font-size:13px">✏️ (컨테이너 쓰기 층 — 컨테이너마다 따로)</div>` +
        ls.map(l => `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:var(--card2);border:1px solid var(--line);margin-bottom:4px;font-size:12.5px">
          <code style="flex:none">${l.id.slice(0, 12)}</code>
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.created_by)}">${esc(l.created_by.replace(/^\/bin\/sh -c (#\(nop\) )?/, '').replace(/ # buildkit$/, ''))}</span>
          <span style="flex:none;width:90px;height:8px;background:var(--line);border-radius:4px;overflow:hidden"><span style="display:block;height:100%;width:${Math.max(3, 100 * l.size / max)}%;background:var(--accent)"></span></span>
          <b style="flex:none;width:64px;text-align:right">${U.size(l.size)}</b>${shared.get(l.id) > 1 ? `<span class="tag teal" title="다른 이미지와 공유하는 레이어">공유 ×${shared.get(l.id)}</span>` : ''}</div>`).join('') +
        `<div class="muted small">합계 <b>${U.size(img.size)}</b> · 레이어 ${img.layers.length}개 · 설정: CMD <code>${esc(JSON.stringify(img.config.Cmd || null))}</code>${img.config.Entrypoint ? ` · ENTRYPOINT <code>${esc(JSON.stringify(img.config.Entrypoint))}</code>` : ''}</div>`;
    };
    react(el, draw);
  };

  /* ---------------------------------------------------------------- 포트 연결 그림 */
  W.portmap = (el, o) => {
    el.innerHTML = `<div class="lab-card"><h4>🔌 포트 게시 (-p) 이해하기</h4>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <label>호스트 포트 <input class="w-in hp" type="number" value="${esc(o.host || 8080)}" style="width:90px"></label>
        <label>컨테이너 포트 <input class="w-in cp" type="number" value="${esc(o.container || 80)}" style="width:90px"></label>
        <label>앱이 듣는 포트 <input class="w-in ap" type="number" value="${esc(o.app || 80)}" style="width:90px"></label>
      </div>
      <svg class="dg pm" viewBox="0 0 720 200" role="img" aria-label="포트 연결 그림"></svg>
      <div class="pm-res"></div></div>`;
    const draw = () => {
      const h = +$('.hp', el).value, c = +$('.cp', el).value, a = +$('.ap', el).value;
      const ok = c === a;
      $('.pm', el).innerHTML = `
        <rect x="10" y="20" width="230" height="160" rx="14" class="blue"/><text x="125" y="44" class="t-c t-b">🖥️ 내 PC (호스트)</text>
        <rect x="40" y="70" width="170" height="40" rx="8" class="box"/><text x="125" y="95" class="t-c t-sm t-mono">브라우저 → localhost:${h}</text>
        <rect x="380" y="20" width="330" height="160" rx="14" class="teal"/><text x="545" y="44" class="t-c t-b">📦 컨테이너 (자기만의 네트워크)</text>
        <rect x="420" y="70" width="250" height="40" rx="8" class="box"/><text x="545" y="95" class="t-c t-sm t-mono">웹 서버가 ${a}번 포트에서 대기</text>
        <circle cx="240" cy="90" r="16" class="s-blue"/><text x="240" y="95" class="t-c t-xs tw t-b">${h}</text>
        <circle cx="380" cy="90" r="16" class="${ok ? 's-green' : 's-red'}" style="fill:${ok ? 'var(--c-green)' : 'var(--c-red)'}"/><text x="380" y="95" class="t-c t-xs tw t-b">${c}</text>
        <line x1="256" y1="90" x2="362" y2="90" class="${ok ? 'ln-green' : 'ln-red'} thick ar${ok ? '-green' : '-red'} moving"/>
        <text x="310" y="130" class="t-c t-sm t-mono t-b">-p ${h}:${c}</text>
        <text x="310" y="150" class="t-c t-xs t-mu">호스트:컨테이너</text>`;
      $('.pm-res', el).innerHTML = ok ? `✅ <code>http://localhost:${h}</code> 로 접속하면 컨테이너의 ${a}번 포트 앱에 닿습니다.` : `❌ 컨테이너 ${c}번 포트에는 아무 앱도 없습니다 (앱은 ${a}번에서 대기). 브라우저에는 <b>ERR_CONNECTION_RESET / Empty reply</b> 가 나옵니다. <code>-p ${h}:${a}</code> 로 고쳐야 해요.`;
    };
    $$('input', el).forEach(i => i.addEventListener('input', draw));
    draw();
  };

  /* ---------------------------------------------------------------- 빌드 캐시 모의 실험 */
  W.cachesim = (el, o) => {
    const orders = {
      bad: ['FROM python:3.12-slim', 'WORKDIR /app', 'COPY . .', 'RUN pip install -r requirements.txt', 'CMD ["python", "app.py"]'],
      good: ['FROM python:3.12-slim', 'WORKDIR /app', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY . .', 'CMD ["python", "app.py"]']
    };
    el.innerHTML = `<div class="lab-card"><h4>⚡ 레이어 캐시 실험 — 순서가 빌드 속도를 바꾼다</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <button class="btn small on" data-o="bad">😵 순서 A (COPY . . 먼저)</button>
        <button class="btn small" data-o="good">😎 순서 B (requirements 먼저)</button>
        <span class="spacer"></span>
        <button class="btn small primary" data-e="app">✏️ app.py 수정 후 다시 빌드</button>
        <button class="btn small" data-e="req">📦 requirements.txt 수정 후 다시 빌드</button>
      </div>
      <div class="cs-steps"></div><div class="muted small cs-sum" style="margin-top:6px"></div></div>`;
    let ord = 'bad';
    const T = { FROM: 0, WORKDIR: 0.1, COPY: 0.2, RUN: 18, CMD: 0 };
    const draw = changed => {
      const steps = orders[ord];
      let broken = false, total = 0;
      $('.cs-steps', el).innerHTML = steps.map((s, i) => {
        const ins = s.split(' ')[0];
        const touches = changed && ins === 'COPY' && (s.includes('. .') || (changed === 'req' && s.includes('requirements')));
        if (touches) broken = true;
        const cached = changed && !broken;
        const t = cached ? 0 : T[ins];
        if (changed) total += t;
        return `<div style="display:flex;gap:10px;align-items:center;padding:6px 10px;margin:3px 0;border-radius:8px;font:12.5px var(--mono);background:${!changed ? 'var(--card2)' : cached ? 'var(--ok-soft)' : 'var(--c-orange-soft)'};border:1px solid var(--line)"><span style="width:44px">${i + 1}/${steps.length}</span><span style="flex:1">${esc(s)}</span><b>${!changed ? '' : cached ? 'CACHED' : '다시 실행 ' + t + 's'}</b></div>`;
      }).join('');
      $('.cs-sum', el).innerHTML = changed ? `총 빌드 시간 약 <b>${total.toFixed(1)}초</b> — ${ord === 'bad' && changed === 'app' ? '소스만 바꿨는데도 <b>pip install 을 다시</b> 합니다. COPY . . 아래는 캐시가 모두 깨지기 때문이에요.' : ord === 'good' && changed === 'app' ? '의존성 설치 레이어가 <b>CACHED</b>! 자주 바뀌는 파일을 나중에 복사한 덕분입니다.' : 'requirements.txt 가 바뀌면 의존성 설치는 다시 해야 합니다. (정상)'}` : '버튼을 눌러 파일을 수정했을 때 어떤 단계가 다시 실행되는지 보세요. 실제로는 오른쪽 터미널에서 <code>docker build</code> 를 두 번 해 보면 CACHED 표시를 볼 수 있습니다.';
    };
    $$('[data-o]', el).forEach(b => b.onclick = () => { ord = b.dataset.o; $$('[data-o]', el).forEach(x => x.classList.toggle('on', x === b)); $$('[data-o]', el).forEach(x => x.classList.toggle('primary', x === b)); draw(); });
    $$('[data-e]', el).forEach(b => b.onclick = () => draw(b.dataset.e));
    draw();
  };

  /* ---------------------------------------------------------------- 이미지 크기 비교 */
  W.sizes = (el, o) => {
    const list = (o.list || 'python:3.12,python:3.12-slim,python:3.12-alpine').split(',');
    el.innerHTML = `<div class="lab-card"><h4>📏 이미지 크기 비교 ${o.title ? '— ' + esc(o.title) : ''}</h4><div class="sz"></div><div class="muted small" style="margin-top:6px">회색 막대는 Docker Hub 기준 크기, 파란 막대는 내 실습 환경에 내려받은 이미지입니다. <button class="btn tiny pullall">⬇ 모두 pull</button></div></div>`;
    $('.pullall', el).onclick = () => Lab.run(list.map(r => `docker pull ${r}`));
    react(el, () => {
      const rows = list.map(r => { const inf = Hub.info(r); const local = D().findImage(r); return { r, size: local ? local.size : inf && inf.size || 0, local: !!local }; });
      const extra = (o.local ? o.local.split(',') : []).map(r => { const local = D().findImage(r); return local ? { r, size: local.size, local: true } : null; }).filter(Boolean);
      const all = rows.concat(extra);
      const max = Math.max(...all.map(x => x.size), 1);
      $('.sz', el).innerHTML = all.map(x => `<div style="display:flex;align-items:center;gap:8px;margin:5px 0;font-size:13px"><code style="width:190px;flex:none">${esc(x.r)}</code><span style="flex:1;height:14px;background:var(--card2);border-radius:7px;overflow:hidden"><span style="display:block;height:100%;width:${Math.max(1.5, 100 * x.size / max)}%;background:${x.local ? 'var(--accent)' : 'var(--muted)'};opacity:${x.local ? 1 : .5}"></span></span><b style="width:70px;text-align:right">${U.size(x.size)}</b></div>`).join('');
    });
  };

  /* ---------------------------------------------------------------- 가상 머신 vs 컨테이너 */
  W.vmcompare = (el) => {
    el.innerHTML = `<div class="lab-card"><h4>🏢 가상 머신 vs 📦 컨테이너 — 몇 개까지 띄울 수 있을까?</h4>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><label>앱 개수 <input type="range" min="1" max="12" value="3" class="n"></label><b class="nv">3</b>
      <span class="muted small">PC 메모리 16GB 기준 · 가상 머신 1대 ≈ OS 2GB + 앱 · 컨테이너 1개 ≈ 앱만 (OS 커널 공유)</span></div>
      <div class="vmc" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px"></div></div>`;
    const draw = () => {
      const n = +$('.n', el).value; $('.nv', el).textContent = n;
      const vmMem = n * 2.4, ctMem = n * 0.15 + 0.3;
      const vmBoot = 40, ctBoot = 0.5;
      const cell = (title, per, mem, boot, color, osEach) => `<div style="border:1px solid var(--line);border-radius:12px;padding:10px"><b>${title}</b>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0;min-height:70px">${Array.from({ length: n }, () => `<div style="width:44px;border-radius:6px;overflow:hidden;border:1px solid var(--line);font-size:10px;text-align:center"><div style="background:${color};color:#fff;padding:2px">앱</div>${osEach ? '<div style="background:var(--c-gray-soft);padding:2px">OS</div>' : ''}</div>`).join('')}</div>
        <div style="background:var(--c-gray-soft);border-radius:6px;padding:3px 6px;font-size:11px;text-align:center;margin-bottom:6px">${osEach ? '하이퍼바이저 + 호스트 OS' : 'Docker 엔진 + 호스트 OS 커널 (공유)'}</div>
        <div style="font-size:13px">메모리 약 <b style="color:${mem > 16 ? 'var(--c-red)' : 'inherit'}">${mem.toFixed(1)}GB</b>${mem > 16 ? ' ⚠ 16GB 초과!' : ''}<br>시작 시간 약 <b>${boot < 1 ? '1초 미만' : boot + '초'}</b></div></div>`;
      $('.vmc', el).innerHTML = cell('🏢 가상 머신', 1, vmMem, vmBoot, 'var(--c-orange)', true) + cell('📦 컨테이너', 1, ctMem, ctBoot, 'var(--accent)', false);
    };
    $('.n', el).addEventListener('input', draw); draw();
  };

  /* ---------------------------------------------------------------- 네트워크 실험 판 */
  W.netlab = (el, o) => {
    el.innerHTML = `<div class="lab-card"><h4>🌐 네트워크 실험 판</h4><p class="muted small" style="margin:0 0 6px">현재 실습 환경의 네트워크와 컨테이너입니다. 컨테이너 두 개를 골라 <b>ping</b> 을 보내 보세요.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select class="w-in a"></select> → <select class="w-in b"></select> <button class="btn small primary go">📡 ping (이름으로)</button> <button class="btn small goip">📡 ping (IP 로)</button></div>
      <div class="nl-out muted small" style="margin-top:8px"></div></div>`;
    react(el, () => {
      const cs = D().s.containers.filter(c => c.state.status === 'running');
      const opts = cs.map(c => `<option>${esc(c.name)}</option>`).join('') || '<option value="">(실행 중인 컨테이너 없음)</option>';
      const a = $('.a', el), b = $('.b', el); const av = a.value, bv = b.value;
      a.innerHTML = opts; b.innerHTML = opts; if (av) a.value = av; if (bv) b.value = bv; else if (cs[1]) b.value = cs[1].name;
      const ca = D().findContainer(a.value), cb = D().findContainer(b.value);
      if (ca && cb) {
        const shared = Object.keys(ca.networks).filter(n => cb.networks[n]);
        $('.nl-out', el).innerHTML = shared.length ? `공유하는 네트워크: <b>${shared.map(esc).join(', ')}</b> ${shared.every(n => n === 'bridge') ? '— 기본 bridge 라서 <b>이름으로는 못 찾고</b> IP 로만 닿습니다.' : '— 사용자 정의 네트워크라서 <b>이름으로 찾을 수 있습니다</b> (내장 DNS 127.0.0.11).'}` : '같은 네트워크에 있지 않아서 서로 닿지 않습니다.';
      }
    });
    $('.go', el).onclick = () => { const a = $('.a', el).value, b = $('.b', el).value; if (a && b) Lab.run(`docker exec ${a} ping -c 2 ${b}`); };
    $('.goip', el).onclick = () => { const a = $('.a', el).value, b = D().findContainer($('.b', el).value); if (a && b) Lab.run(`docker exec ${a} ping -c 2 ${D().ipOf(b)}`); };
  };

  window.Widgets = { mountAll, W };
})();
