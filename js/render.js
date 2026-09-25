/* ===================================================================
   공용 렌더링 — 그림 · 위젯 자리 · 영상 카드 · 코드 블록 버튼
   =================================================================== */
(function () {
  'use strict';
  const esc = U.esc;

  function ytId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function ytList(url) { const m = String(url || '').match(/[?&]list=([\w-]+)/); return m ? m[1] : null; }

  function figure(lesson, name, opts) {
    const f = lesson && lesson.figs && lesson.figs[name];
    if (!f) return `<div class="fig-missing">⚠ 그림 "${esc(name)}" 없음</div>`;
    const body = typeof f === 'string' ? f : (f.svg || f.html || '');
    const cap = typeof f === 'string' ? '' : (f.caption || '');
    return `<figure class="fig${f.wide ? ' wide' : ''}" data-fig="${esc(name)}">${body}${cap && !(opts && opts.nocap) ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  }

  /** {{fig:name}} · {{fig:name|nocap}} · {{widget:type|k=v}} */
  function expand(html, lesson) {
    return String(html || '')
      .replace(/\{\{fig:([\w-]+)(\|nocap)?\}\}/g, (_, n, nc) => figure(lesson, n, { nocap: !!nc }))
      .replace(/\{\{widget:([\w-]+)((?:\|[^}|]*)*)\}\}/g, (_, type, rest) => {
        const o = {};
        rest.split('|').filter(Boolean).forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); else o[kv.trim()] = true; });
        return `<div class="widget" data-w="${esc(type)}" data-o="${esc(JSON.stringify(o))}"></div>`;
      });
  }

  function videoCard(v) {
    const id = ytId(v.url), list = ytList(v.url);
    const search = /results\?search_query=/.test(v.url || '');
    const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
    const lang = v.lang === 'en' ? '<span class="vbadge en">영어</span>' : v.lang === 'ko' ? '<span class="vbadge ko">한국어</span>' : '';
    const kind = search ? '<span class="vbadge search">🔎 검색</span>' : list && !id ? '<span class="vbadge list">▤ 재생목록</span>' : '';
    return `<div class="vcard${search ? ' is-search' : ''}">
      <a class="vthumb" href="${esc(v.url)}" target="_blank" rel="noopener" title="유튜브에서 보기">
        ${thumb ? `<img loading="lazy" src="${thumb}" alt="">` : `<div class="vph">${search ? '🔎' : '▶'}</div>`}
        ${v.min ? `<span class="vmin">${esc(v.min)}</span>` : ''}<span class="vplay">▶</span>
      </a>
      <div class="vbody">
        <a class="vtitle" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>
        <div class="vmeta">${v.channel ? `<span>📺 ${esc(v.channel)}</span>` : ''}${lang}${kind}</div>
        ${v.desc ? `<div class="vdesc">${v.desc}</div>` : ''}
        ${id ? `<button class="btn tiny ghost vembed" data-yt="${id}">▶ 여기서 보기</button>` : ''}
      </div>
    </div>`;
  }

  /** 코드 블록에 ▶ 실행 · 📋 복사 · 📄 파일로 저장 버튼 붙이기 */
  function decorateCode(root) {
    root.querySelectorAll('pre.code').forEach(pre => {
      if (pre.dataset.decorated) return;
      pre.dataset.decorated = '1';
      const run = pre.dataset.run, file = pre.dataset.file;
      if (file) pre.classList.add('file-code');
      if (pre.classList.contains('out')) return;
      const acts = document.createElement('div');
      acts.className = 'code-acts';
      let h = '';
      if (file) h += `<button class="save-file" title="오른쪽 📝 파일 탭에 ${esc(file)} 로 저장합니다">📄 파일로 저장</button>`;
      if (run === 'sh') h += `<button class="run" title="오른쪽 터미널에서 한 줄씩 실행합니다">▶ 터미널에서 실행</button>`;
      h += `<button class="copy" title="클립보드에 복사">📋 복사</button>`;
      acts.innerHTML = h;
      pre.after(acts);
    });
  }
  function codeText(pre) {
    const c = pre.querySelector('code') || pre;
    return c.textContent.replace(/\n$/, '');
  }

  window.Render = { esc, ytId, ytList, figure, expand, videoCard, decorateCode, codeText };
})();
