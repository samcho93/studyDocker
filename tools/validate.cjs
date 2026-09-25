/* ===================================================================
   강의 검증 도구
     node tools/validate.cjs            모든 장 구조 검사 + 미션 자동 풀이
     node tools/validate.cjs ch05       한 장만
     node tools/validate.cjs ch05 -v    자세히 (명령 출력 보기)
     node tools/validate.cjs ch05 --blocks   본문의 ▶ 실행 코드도 차례로 실행해 오류 줄 찾기
   미션 풀이: 장마다 실습 환경을 초기화한 뒤, 미션 순서대로
     files(파일 묶음) 쓰기 → setup 명령 → answer 명령 → check(M) 이 참이 될 때까지 기다림
   =================================================================== */
const fs = require('fs'), path = require('path');
const { load } = require('./harness.cjs');
load('util.js', 'vfs.js', 'shell.js', 'hub.js', 'engine.js', 'apps-db.js', 'apps-code.js', 'apps.js', 'yaml.js', 'docker-cli.js', 'build.js', 'compose.js', 'kube.js', 'host.js', 'missions.js', 'course.js');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const blocks = args.includes('--blocks');
const only = args.filter(a => !a.startsWith('-'));
const WIDGETS = ['files', 'run', 'open', 'mission', 'cmdbuilder', 'lifecycle', 'layers', 'portmap', 'cachesim', 'sizes', 'vmcompare', 'netlab'];

// 강의 파일 불러오기
const lessonFiles = fs.readdirSync(path.join(ROOT, 'lessons')).filter(f => /\.js$/.test(f));
lessonFiles.forEach(f => { try { vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'lessons', f), 'utf8'), { filename: f }); } catch (e) { console.log(`✖ ${f}: 문법 오류 — ${e.message}`); process.exitCode = 1; } });

const strip = s => s.replace(/\x1b\[[\d;]*m/g, '');
let D, sh, cmdLog;
function fresh() {
  global.Docker = { engine: new Engine() };
  D = Docker.engine;
  U.store.del('hostfs'); U.store.del('kube');
  Host.reset();
  Kube.s = null; Kube.init(D);
  sh = HostShell.make();
  cmdLog = [];
}
async function run(line, timeout) {
  let text = '';
  const ac = new AbortController();
  const io = {
    out: s => { text += s; }, err: s => { text += s; }, signal: ac.signal,
    readline: async p => { text += p; return 'y'; },
    session: async s => { text += '(대화형 세션: 검증 도구에서는 바로 종료)\n'; return 0; }
  };
  cmdLog.push({ t: Date.now(), c: line });
  const t = setTimeout(() => ac.abort(), timeout || 15000);
  try { await sh.exec(line, io); } catch (e) { text += '[예외] ' + e.message + '\n'; }
  clearTimeout(t);
  return strip(text);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function htmlCodeBlocks(html) {
  const out = [];
  const re = /<pre class="code"([^>]*)><code>([\s\S]*?)<\/code><\/pre>/g; let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const txt = m[2].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    out.push({ run: /data-run="sh"/.test(attrs), file: (attrs.match(/data-file="([^"]+)"/) || [])[1], txt });
  }
  return out;
}

(async () => {
  const ids = Course.order().filter(id => Course.lessons[id] && (!only.length || only.includes(id)));
  let fails = 0, passes = 0, warns = 0;
  for (const id of ids) {
    const l = Course.lessons[id];
    const problems = [];
    // --- 구조 검사
    if (!l.special && !l.render) {
      if (!l.title) problems.push('title 없음');
      if (!l.sections || l.sections.length < 4) problems.push(`절이 ${l.sections ? l.sections.length : 0}개 (4개 이상 권장)`);
      (l.quiz || []).forEach((q, i) => { if (!(q.answer >= 0 && q.answer < q.options.length)) problems.push(`퀴즈 ${i + 1} 정답 번호 오류`); });
      if (!l.quiz || l.quiz.length < 4) problems.push('퀴즈 4개 미만');
      if (!l.terms || l.terms.length < 6) problems.push('용어 6개 미만');
      if (!l.summary || l.summary.length < 3) problems.push('핵심 정리 3개 미만');
      (l.videos || []).forEach(v => { if (!/youtube\.com|youtu\.be/.test(v.url)) problems.push('영상 주소가 유튜브가 아님: ' + v.url); });
    }
    const allHtml = (l.sections || []).map(s => s.html).join('\n');
    (allHtml.match(/\{\{fig:([\w-]+)/g) || []).forEach(x => { const n = x.slice(6); if (!l.figs || !l.figs[n]) problems.push('없는 그림: ' + n); });
    (allHtml.match(/\{\{widget:([\w-]+)/g) || []).forEach(x => { const n = x.slice(9); if (!WIDGETS.includes(n)) problems.push('없는 위젯: ' + n); });
    (allHtml.match(/\{\{widget:files\|set=([\w-]+)/g) || []).forEach(x => { const n = x.split('=')[1]; if (!l.files || !l.files[n]) problems.push('없는 파일 묶음: ' + n); });
    htmlCodeBlocks(allHtml).forEach(b => { if (b.file && !/^~\//.test(b.file)) problems.push('data-file 은 ~/ 로 시작해야 함: ' + b.file); if (b.run && /<<\s*['"]?EOF/.test(b.txt)) problems.push('heredoc(<<EOF) 은 터미널에서 지원하지 않음 → data-file 블록 사용'); });
    // 짝 안 맞는 태그 대충 검사
    ['section', 'div', 'table', 'pre', 'ul', 'ol'].forEach(t => { const o = (allHtml.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length, c = (allHtml.match(new RegExp('</' + t + '>', 'g')) || []).length; if (o !== c) problems.push(`<${t}> 여는 태그 ${o}개 / 닫는 태그 ${c}개`); });
    console.log(`\n${problems.length ? '⚠' : '✔'} ${id} ${l.title || ''}`);
    problems.forEach(p => { console.log('   - ' + p); warns++; });

    // --- 본문 코드 실행
    if (blocks) {
      fresh();
      for (const b of htmlCodeBlocks(allHtml)) {
        if (b.file) Host.fs.write(VFS.norm(b.file.replace(/^~/, VFS.HOME)), b.txt + '\n');
        if (!b.run) continue;
        const lines = b.txt.split('\n'); const joined = []; let buf = '';
        lines.forEach(x => { if (/\\\s*$/.test(x)) buf += x.replace(/\\\s*$/, ' '); else { joined.push(buf + x); buf = ''; } });
        for (const line of joined.filter(x => x.trim() && !x.trim().startsWith('#'))) {
          const o = await run(line.replace(/^\$\s?/, ''), 8000);
          const bad = /command not found|unknown flag|unknown shorthand|unknown command|\[예외\]|not a docker command|TypeError|ReferenceError/.test(o);
          if (bad || verbose) console.log(`   ${bad ? '✖' : '·'} $ ${line}\n${o.split('\n').slice(0, bad ? 8 : 4).map(x => '       ' + x).join('\n')}`);
          if (bad) warns++;
        }
      }
    }

    // --- 미션 자동 풀이
    const ms = l.missions || [];
    if (!ms.length) continue;
    fresh();
    for (const m of ms) {
      if (m.files) { const set = l.files && l.files[m.files]; if (!set) { console.log(`   ✖ [${m.id}] 파일 묶음 없음: ${m.files}`); fails++; continue; } Host.writeFiles(set); }
      let outText = '';
      for (const c of [].concat(m.setup || [])) outText += `$ ${c}\n` + await run(c);
      if (!m.answer) { console.log(`   ⚠ [${m.id}] ${strip(m.title)} — answer 없음 (자동 풀이 생략)`); warns++; continue; }
      for (const c of [].concat(m.answer)) outText += `$ ${c}\n` + await run(c);
      const M = MissionHelpers(D, () => cmdLog);
      let ok = false;
      for (let i = 0; i < 40 && !ok; i++) { try { ok = !!(await m.check(M)); } catch (e) { ok = false; if (i === 39) outText += '[check 예외] ' + e.message + '\n'; } if (!ok) await sleep(200); }
      if (ok) passes++; else fails++;
      console.log(`   ${ok ? '✔' : '✖'} [${m.id}] ${strip(m.title).replace(/<[^>]+>/g, '')}`);
      if (!ok || verbose) console.log(outText.split('\n').slice(-25).map(x => '       ' + x).join('\n'));
    }
  }
  console.log(`\n미션 통과 ${passes} · 실패 ${fails} · 경고 ${warns}`);
  process.exit(fails ? 1 : 0);
})();
