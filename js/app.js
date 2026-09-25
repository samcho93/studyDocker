/* ===================================================================
   Docker 강좌 — 앱 (목차 · 강의 · 진도 · 퀴즈 · 실습 연결)
   =================================================================== */
(function () {
  'use strict';
  const { esc, expand, videoCard } = Render;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = U.store;

  const state = { id: 'home', done: store.get('done', {}) };

  /* ------------------------------------------------ 공용 UI --- */
  function toast(msg, ms = 1900) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
  }
  function modal(title, html) { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
  $('#modalClose').onclick = () => { $('#modal').classList.add('hidden'); };
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modalClose').click(); });
  window.App = { toast, modal, store, state };

  /* ------------------------------------------------ 테마 --- */
  (function () {
    let t = store.get('theme', null);
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
  $('#themeBtn').onclick = () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t); store.set('theme', t);
  };

  /* ------------------------------------------------ 목차 --- */
  function missionStat(id) {
    const l = Course.lessons[id];
    if (!l || !l.missions || !l.missions.length) return '';
    const d = (Lab.done[id] || {});
    const n = l.missions.filter(m => d[m.id]).length;
    return n ? `<span class="ni-m${n === l.missions.length ? ' all' : ''}" title="미션 ${n}/${l.missions.length}">${n === l.missions.length ? '🎯' : n + '/' + l.missions.length}</span>` : '';
  }
  function renderNav(filter) {
    const q = (filter || '').trim().toLowerCase();
    const html = Course.parts.map(p => {
      const items = p.items.map(id => {
        const l = Course.info(id); if (!l) return '';
        if (q) {
          const full = Course.lessons[id];
          const hay = (l.title + ' ' + (l.summary || '') + ' ' + (full ? JSON.stringify(full.sections || []) + JSON.stringify(full.terms || []) : '')).toLowerCase();
          if (!hay.includes(q)) return '';
        }
        return `<a class="nav-item${state.id === id ? ' on' : ''}${l.missing ? ' missing' : ''}" href="#${id}" title="${esc(l.summary || '')}">
          <span class="ni-icon">${l.icon || '•'}</span>
          <span class="ni-text"><span class="ni-no">${/^ch/.test(id) ? id.slice(2) : ''}</span>${esc(l.title)}</span>${state.done[id] ? '<span class="ni-done">✓</span>' : missionStat(id)}
        </a>`;
      }).join('');
      return items ? `<div class="nav-part"><div class="nav-part-title">${esc(p.title)}</div>${items}</div>` : '';
    }).join('');
    $('#navTree').innerHTML = html || '<div class="muted small pad">검색 결과가 없습니다.</div>';
    const chs = Course.order().filter(id => /^ch/.test(id));
    const n = chs.filter(id => state.done[id]).length;
    $('#progressText').textContent = `${n} / ${chs.length}`;
    $('#progressBar').style.width = (100 * n / chs.length) + '%';
  }
  $('#navSearch').addEventListener('input', e => renderNav(e.target.value));
  $('#navTree').addEventListener('click', () => { if (innerWidth < 980) document.body.classList.add('nav-collapsed'); });
  $('#navCloseBtn').onclick = () => document.body.classList.add('nav-collapsed');
  $('#navOpenBtn').onclick = () => document.body.classList.remove('nav-collapsed');
  if (innerWidth < 1280 && innerWidth >= 980 && store.get('navCollapsed', null) === null) document.body.classList.add('nav-collapsed');
  if (innerWidth < 980) document.body.classList.add('nav-collapsed');

  function crumb(html) { $('#crumb').innerHTML = html; }

  /* ------------------------------------------------ 처음 화면 --- */
  function homeHtml() {
    const cards = Course.order().filter(id => /^ch/.test(id)).map(id => {
      const l = Course.info(id);
      return `<a class="hcard${state.done[id] ? ' done' : ''}${l.missing ? ' missing' : ''}" href="#${id}">
        <div class="hc-top"><span class="hc-icon">${l.icon}</span><span class="hc-no">CH ${id.slice(2)}</span>${state.done[id] ? '<span class="hc-done">✓ 완료</span>' : ''}</div>
        <div class="hc-title">${esc(l.title)}</div>
        <div class="hc-sum">${esc(l.summary || '')}</div>
      </a>`;
    }).join('');
    return `<div class="home">
      <section class="hero">
        <div class="hero-text">
          <div class="hero-kicker">설치 없이 브라우저에서 바로 실습하는</div>
          <h1>Docker<br><span class="grad">쉽게 배우기</span></h1>
          <p>컨테이너가 무엇인지부터 <b>Dockerfile · 네트워크 · 볼륨 · Compose · 레지스트리 · 보안</b>, 그리고 <b>쿠버네티스</b> 첫걸음까지.
          오른쪽 실습 화면에 <b>진짜처럼 동작하는 가상 Docker</b>가 들어 있어서, 명령을 치면 컨테이너가 뜨고 웹 페이지가 열립니다.</p>
          <div class="hero-btns">
            <a class="btn primary" href="#ch00">📦 0장부터 시작하기</a>
            <a class="btn" href="#lab">🧪 실습실 · 장애 시나리오</a>
            <a class="btn ghost" href="#cheatsheet">📋 치트시트</a>
          </div>
        </div>
        <div class="hero-art">${heroSvg()}</div>
      </section>

      <section class="feature-row">
        <div class="feat"><div class="fi">🖥️</div><b>브라우저 안의 Docker</b><span>run · build · exec · logs · network · volume · compose 가 실제 출력 그대로</span></div>
        <div class="feat"><div class="fi">🌐</div><b>컨테이너 웹 페이지 열기</b><span>-p 로 게시한 포트를 🌐 브라우저 탭에서 바로 확인</span></div>
        <div class="feat"><div class="fi">🎯</div><b>자동 채점 미션</b><span>장마다 실습 과제 · "왜 안 되지?" 장애 상황 해결</span></div>
        <div class="feat"><div class="fi">📊</div><b>한눈에 보는 대시보드</b><span>컨테이너 · 네트워크 · 볼륨 연결 구성을 그림으로</span></div>
      </section>

      <div class="box tip"><div class="box-t">💡 화면 구성</div>
        <b>왼쪽</b> 목차 · <b>가운데</b> 강의 · <b>오른쪽</b> 실습 결과(터미널 · 대시보드 · 브라우저 · 파일 · 미션). 강의 속 코드의 <b>▶ 터미널에서 실행</b> 버튼을 누르면 오른쪽 터미널에서 바로 실행됩니다.
        가운데와 오른쪽 사이 경계선을 끌면 크기를 바꿀 수 있어요. 실습 상태는 브라우저에 저장되어 새로 고침해도 남아 있습니다.</div>

      <h2 class="home-h">📚 강좌 구성</h2>
      <div class="hcards">${cards}</div>

      <h2 class="home-h">🧭 이렇게 공부하세요</h2>
      <ol class="steps-list">
        <li><b>읽기</b> — 그림과 비유로 개념을 이해합니다.</li>
        <li><b>따라 하기</b> — ▶ 버튼으로 명령을 실행하고, 결과를 터미널 · 대시보드 · 브라우저에서 확인합니다.</li>
        <li><b>스스로 하기</b> — 🎯 미션 탭의 과제를 명령을 직접 입력해서 해결합니다 (자동 채점).</li>
        <li><b>문제 해결</b> — 🧪 실습실의 장애 시나리오로 "안 될 때 어떻게 찾는지"를 연습합니다.</li>
        <li><b>확인</b> — 장 끝의 퀴즈와 영상으로 정리합니다.</li>
      </ol>
      <div class="box note"><div class="box-t">ℹ️ 이 실습 환경에 대해</div>
        오른쪽 실습 화면은 교육용으로 Docker 의 동작을 흉내 낸 <b>시뮬레이터</b>입니다. 명령 · 옵션 · 출력은 Docker Engine 27 / Compose v2 를 기준으로 최대한 같게 만들었지만,
        실제 리눅스 커널이나 인터넷에 연결되지는 않습니다. 배운 명령은 실제 PC 의 Docker 에서도 그대로 동작합니다.</div>
    </div>`;
  }
  function heroSvg() {
    return `<svg class="dg hero-svg" viewBox="0 0 360 290" role="img" aria-label="고래 위에 실린 컨테이너 그림">
      <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d63ed"/><stop offset="1" stop-color="#0db7ed"/></linearGradient></defs>
      <path d="M30 175 Q30 250 150 255 Q280 258 318 190 Q334 176 346 178 Q352 160 330 158 Q322 132 300 150 L292 175 Z" fill="url(#hg)"/>
      <circle cx="96" cy="210" r="6" fill="#fff"/>
      <path d="M40 232 Q120 270 250 240" stroke="#fff" stroke-width="3" fill="none" opacity=".35"/>
      <g>${[0, 1, 2, 3].map(i => `<rect x="${58 + i * 52}" y="130" width="46" height="40" rx="5" fill="${['#ff9f43', '#2ecc71', '#a55eea', '#ff6b6b'][i]}"/><path d="M${66 + i * 52} 136 v28 M${76 + i * 52} 136 v28 M${86 + i * 52} 136 v28 M${96 + i * 52} 136 v28" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`).join('')}
      ${[0, 1, 2].map(i => `<rect x="${84 + i * 52}" y="86" width="46" height="40" rx="5" fill="${['#54a0ff', '#feca57', '#1dd1a1'][i]}"><animate attributeName="y" values="86;82;86" dur="${2 + i * 0.4}s" repeatCount="indefinite"/></rect>`).join('')}
      <rect x="136" y="42" width="46" height="40" rx="5" fill="#5f27cd"><animate attributeName="y" values="42;36;42" dur="2.6s" repeatCount="indefinite"/></rect></g>
      <text x="180" y="284" text-anchor="middle" font-size="13" fill="var(--muted)" font-family="var(--mono)">$ docker run -d -p 8080:80 nginx</text>
    </svg>`;
  }

  /* ------------------------------------------------ 강의 --- */
  function lessonHtml(l) {
    const secs = l.sections || [];
    const toc = secs.map((s, i) => `<a href="#${l.id}:s${i + 1}">${i + 1}. ${esc(s.title)}</a>`).join('');
    const quiz = (l.quiz || []).map((q, i) => `
      <div class="quiz" data-answer="${q.answer}">
        <div class="qq"><span class="qn">Q${i + 1}</span> ${q.q}</div>
        <div class="qopts">${q.options.map((o, j) => `<button class="qopt" data-i="${j}"><b>${'①②③④⑤⑥'[j]}</b> ${o}</button>`).join('')}</div>
        <div class="qexp hidden">💡 ${q.explain || ''}</div>
      </div>`).join('');
    const vids = (l.videos || []).map(v => videoCard(v)).join('');
    const terms = (l.terms || []).map(([t, d]) => `<div class="term"><dt>${esc(t)}</dt><dd>${d}</dd></div>`).join('');
    const idx = Course.order().indexOf(l.id);
    const next = Course.info(Course.order()[idx + 1]);
    const ms = l.missions || [];
    return `<article class="lesson">
      <header class="l-head">
        <div class="l-kicker"><span class="l-no">CHAPTER ${esc(l.no || l.id.slice(2))}</span>${l.level ? `<span class="chip">${esc(l.level)}</span>` : ''}${l.time ? `<span class="chip">⏱ ${esc(l.time)}</span>` : ''}${ms.length ? `<span class="chip">🎯 미션 ${ms.length}개</span>` : ''}</div>
        <h1><span class="l-icon">${l.icon || ''}</span>${esc(l.title)}</h1>
        ${l.subtitle ? `<p class="l-sub">${l.subtitle}</p>` : ''}
      </header>
      ${l.goals ? `<div class="goals"><div class="goals-h">🎯 이 장에서 배울 것</div><ol>${l.goals.map(g => `<li>${g}</li>`).join('')}</ol></div>` : ''}
      ${toc ? `<nav class="l-toc">${toc}${ms.length ? `<a href="#${l.id}:missions">🎯 미션</a>` : ''}${quiz ? `<a href="#${l.id}:quiz">✅ 퀴즈</a>` : ''}${vids ? `<a href="#${l.id}:videos">🎬 영상</a>` : ''}</nav>` : ''}
      ${secs.map((s, i) => `<section class="l-sec" id="${l.id}-s${i + 1}"><h2><span class="sn">${i + 1}</span>${esc(s.title)}</h2>${expand(s.html, l)}</section>`).join('')}
      ${ms.length ? `<section class="l-sec" id="${l.id}-missions"><h2><span class="sn">🎯</span>실습 미션</h2><p>아래 과제를 <b>오른쪽 터미널에 직접 명령을 입력해서</b> 해결해 보세요. 조건을 만족하면 자동으로 ✓ 표시가 됩니다.</p>
        <ol class="mlist">${ms.map(m => `<li data-mid="${esc(m.id)}"><b>${m.title}</b>${m.scenario ? ' <span class="tag orange">장애 상황</span>' : ''}${m.desc ? `<div class="muted small">${m.desc}</div>` : ''}</li>`).join('')}</ol>
        <button class="btn primary small" data-act="open-missions">🎯 미션 탭 열기</button></section>` : ''}
      ${l.summary ? `<section class="l-sec"><h2><span class="sn">📌</span>핵심 정리</h2><ul class="summary">${l.summary.map(s => `<li>${s}</li>`).join('')}</ul></section>` : ''}
      ${terms ? `<section class="l-sec"><h2><span class="sn">📖</span>핵심 용어</h2><dl class="terms">${terms}</dl></section>` : ''}
      ${quiz ? `<section class="l-sec" id="${l.id}-quiz"><h2><span class="sn">✅</span>확인 퀴즈</h2><div class="quizzes">${quiz}</div><div class="quiz-score muted" id="quizScore"></div></section>` : ''}
      ${vids ? `<section class="l-sec" id="${l.id}-videos"><h2><span class="sn">🎬</span>유튜브로 더 알아보기</h2><p class="muted">썸네일을 누르면 유튜브가 새 창으로 열리고, <b>▶ 여기서 보기</b>를 누르면 이 페이지에서 재생됩니다.</p><div class="vgrid">${vids}</div></section>` : ''}
      <div class="l-foot">
        <button class="btn ${state.done[l.id] ? '' : 'primary'}" data-act="done">${state.done[l.id] ? '✓ 학습 완료됨 (취소)' : '✓ 이 장 학습 완료'}</button>
        ${next ? `<a class="btn ghost" href="#${Course.order()[idx + 1]}">다음: ${next.icon || ''} ${esc(next.title)} ▶</a>` : ''}
      </div>
    </article>`;
  }
  function markMissionList() {
    const l = Course.lessons[state.id]; if (!l) return;
    const d = Lab.done[state.id] || {};
    $$('.mlist li').forEach(li => li.classList.toggle('done', !!d[li.dataset.mid]));
  }
  App.onMission = key => { if (key === state.id) markMissionList(); renderNav($('#navSearch').value); };

  /* ------------------------------------------------ 부록 페이지 --- */
  function videosHtml() {
    let html = `<article class="lesson"><header class="l-head"><h1><span class="l-icon">🎬</span>추천 영상 모음</h1>
      <p class="l-sub">각 장에 연결된 유튜브 영상을 한곳에 모았습니다.</p></header>
      <input class="nav-search vfilter" type="search" placeholder="영상 검색 (예: compose, 네트워크, kubernetes)">`;
    Course.order().filter(id => /^ch/.test(id)).forEach(id => {
      const l = Course.lessons[id]; if (!l || !l.videos || !l.videos.length) return;
      html += `<section class="l-sec vsec"><h2><span class="sn">${l.icon}</span><a href="#${id}">${esc(l.title)}</a></h2><div class="vgrid">${l.videos.map(v => videoCard(v)).join('')}</div></section>`;
    });
    return html + '</article>';
  }
  function glossaryHtml() {
    const all = [];
    Course.order().forEach(id => { const l = Course.lessons[id]; (l && l.terms || []).forEach(([t, d]) => all.push({ t, d, id, ch: l })); });
    all.sort((a, b) => a.t.localeCompare(b.t, 'ko'));
    return `<article class="lesson"><header class="l-head"><h1><span class="l-icon">📖</span>용어 사전</h1>
      <p class="l-sub">강좌 전체에 나오는 핵심 용어 ${all.length}개를 가나다 · ABC 순으로 모았습니다.</p></header>
      <input class="nav-search gfilter" type="search" placeholder="용어 검색">
      <dl class="terms glossary">${all.map(x => `<div class="term" data-k="${esc((x.t + ' ' + x.d).toLowerCase())}"><dt>${esc(x.t)}</dt><dd>${x.d} <a class="gch" href="#${x.id}">${x.ch.icon} ${x.id.slice(2)}장</a></dd></div>`).join('')}</dl></article>`;
  }
  function specialHtml(id) {
    const l = Course.lessons[id];
    if (l && l.render) return l.render();
    if (l) return lessonHtml(l);
    return '';
  }

  /* ------------------------------------------------ 라우팅 --- */
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'home';
    const [id, sub] = h.split(':');
    const target = Course.info(id) || id === 'home' ? id : 'home';
    const changed = target !== state.id || !$('#content').firstChild;
    state.id = target;
    if (changed) {
      const content = $('#content');
      const l = Course.lessons[target];
      const o = Course.info(target);
      if (target === 'home') { content.innerHTML = homeHtml(); crumb('🏠 처음 화면'); }
      else if (target === 'videos') { content.innerHTML = videosHtml(); crumb('🎬 추천 영상 모음'); }
      else if (target === 'glossary') { content.innerHTML = glossaryHtml(); crumb('📖 용어 사전'); }
      else if (l && (o.special || l.render)) { content.innerHTML = specialHtml(target); crumb(`${o.icon} ${esc(o.title)}`); }
      else if (l) { content.innerHTML = lessonHtml(l); crumb(`<span class="muted">CH ${esc(l.no || target.slice(2))}</span> ${l.icon || ''} ${esc(l.title)}`); }
      else { content.innerHTML = `<article class="lesson"><header class="l-head"><h1><span class="l-icon">${o.icon}</span>${esc(o.title)}</h1><p class="l-sub">${esc(o.summary || '')}</p></header><div class="box note">이 장은 준비 중입니다. 곧 추가됩니다!</div></article>`; crumb(esc(o.title)); }
      Render.decorateCode(content);
      Widgets.mountAll(content);
      content.scrollTop = 0;
      renderNav($('#navSearch').value);
      const order = Course.order(); const i = order.indexOf(target);
      $('#prevBtn').disabled = i <= 0; $('#nextBtn').disabled = i < 0 || i >= order.length - 1;
      document.title = (o && target !== 'home' ? o.title + ' · ' : '') + 'Docker 쉽게 배우기';
      // 실습 화면 연결: 미션 · 빠른 명령
      if (l && l.missions) Lab.setMissions(target, l.missions, `${l.no ? l.no + '장 ' : ''}${l.title}`);
      else if (!(l && l.keepMissions)) Lab.setMissions(null, [], '');
      Lab.setChips(l && l.chips ? l.chips : ['docker ps -a', 'docker images', 'docker network ls', 'docker volume ls', 'help']);
      markMissionList();
      store.set('last', target);
    }
    if (sub) {
      const el = document.getElementById(`${id}-${sub}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    }
  }
  window.addEventListener('hashchange', route);
  $('#prevBtn').onclick = () => { const o = Course.order(); const i = o.indexOf(state.id); if (i > 0) location.hash = o[i - 1]; };
  $('#nextBtn').onclick = () => { const o = Course.order(); const i = o.indexOf(state.id); if (i >= 0 && i < o.length - 1) location.hash = o[i + 1]; };
  App.go = id => { location.hash = id; };

  /* ------------------------------------------------ 본문 안의 동작 --- */
  $('#content').addEventListener('click', e => {
    const t = e.target;
    // 코드 블록 버튼
    const cb = t.closest('.code-acts button');
    if (cb) {
      const pre = cb.parentElement.previousElementSibling;
      const txt = Render.codeText(pre);
      if (cb.classList.contains('copy')) { navigator.clipboard && navigator.clipboard.writeText(txt).then(() => toast('📋 복사했습니다')).catch(() => toast('복사하지 못했습니다')); return; }
      if (cb.classList.contains('save-file')) {
        const f = pre.dataset.file;
        const p = VFS.norm(f.replace(/^~/, VFS.HOME));
        Host.fs.write(p, txt + '\n');
        cb.classList.add('done'); cb.textContent = '✓ 저장됨';
        setTimeout(() => { cb.classList.remove('done'); cb.textContent = '📄 파일로 저장'; }, 1800);
        Lab.openFile(p);
        toast('📄 ' + f + ' 저장 완료');
        return;
      }
      if (cb.classList.contains('run')) {
        const lines = txt.split('\n').map(l => l.replace(/^\$\s?/, ''));
        // 여러 줄 명령을 \ 로 이은 것 합치기
        const joined = []; let buf = '';
        lines.forEach(l => { if (/\\\s*$/.test(l)) buf += l.replace(/\\\s*$/, ' '); else { joined.push(buf + l); buf = ''; } });
        if (buf) joined.push(buf);
        Lab.run(joined);
        return;
      }
    }
    const cmd = t.closest('code.cmd');
    if (cmd) { Lab.run(cmd.textContent.replace(/^\$\s?/, '')); return; }
    const opt = t.closest('.qopt');
    if (opt) {
      const qz = opt.closest('.quiz'); if (qz.classList.contains('answered')) return;
      const ans = +qz.dataset.answer, i = +opt.dataset.i;
      qz.classList.add('answered', i === ans ? 'right' : 'wrong');
      $$('.qopt', qz).forEach(b => { const j = +b.dataset.i; if (j === ans) b.classList.add('correct'); else if (j === i) b.classList.add('chosen'); });
      $('.qexp', qz).classList.remove('hidden');
      const all = $$('.quiz', $('#content')), done = all.filter(q => q.classList.contains('answered')), right = all.filter(q => q.classList.contains('right'));
      const sc = $('#quizScore');
      if (sc) sc.innerHTML = done.length === all.length ? `🏁 ${all.length}문제 중 <b>${right.length}</b>문제 정답! ${right.length === all.length ? '완벽해요 🎉' : '틀린 문제의 해설을 다시 읽어 보세요.'} <button class="btn tiny ghost" data-act="quiz-reset">다시 풀기</button>` : `${done.length} / ${all.length} 문제 풀이`;
      return;
    }
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'done') { state.done[state.id] = !state.done[state.id]; if (!state.done[state.id]) delete state.done[state.id]; store.set('done', state.done); act.outerHTML = `<button class="btn ${state.done[state.id] ? '' : 'primary'}" data-act="done">${state.done[state.id] ? '✓ 학습 완료됨 (취소)' : '✓ 이 장 학습 완료'}</button>`; renderNav($('#navSearch').value); if (state.done[state.id]) toast('🎉 학습 완료! 진도에 기록했어요'); }
      else if (a === 'open-missions') Lab.open('missions');
      else if (a === 'quiz-reset') { $$('.quiz', $('#content')).forEach(q => { q.className = 'quiz'; $$('.qopt', q).forEach(b => b.className = 'qopt'); $('.qexp', q).classList.add('hidden'); }); $('#quizScore').innerHTML = ''; }
      return;
    }
    const emb = t.closest('.vembed');
    if (emb) { openVideo(emb.dataset.yt, emb.closest('.vcard').querySelector('.vtitle').textContent); return; }
  });
  $('#content').addEventListener('input', e => {
    if (e.target.classList.contains('gfilter')) { const q = e.target.value.trim().toLowerCase(); $$('.glossary .term').forEach(d => d.classList.toggle('hidden', q && !d.dataset.k.includes(q))); }
    if (e.target.classList.contains('vfilter')) { const q = e.target.value.trim().toLowerCase(); $$('.vsec .vcard').forEach(d => d.classList.toggle('hidden', q && !d.textContent.toLowerCase().includes(q))); $$('.vsec').forEach(s => s.classList.toggle('hidden', !$$('.vcard:not(.hidden)', s).length)); }
  });
  function openVideo(id, title) {
    modal(title, `<div class="yt-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p class="muted small">재생되지 않으면 <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">유튜브에서 직접 보기 ↗</a></p>`);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) { $('#modalClose').click(); e.stopPropagation(); }
  }, true);

  /* ------------------------------------------------ 시작 --- */
  Lab.init();
  if (!location.hash && store.get('last', null) && store.get('last') !== 'home') { /* 처음 화면 유지 */ }
  route();
})();
