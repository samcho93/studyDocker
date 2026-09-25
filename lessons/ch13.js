/* 13장 — 보안과 모범 사례 */
Course.lesson({
  id: 'ch13', no: '13',
  icon: '🔒',
  title: '보안과 모범 사례',
  subtitle: '"돌아가기만 하면 끝"이 아니라, 뚫려도 피해가 작은 컨테이너 만들기',
  level: '중급', time: '120분',
  goals: [
    '컨테이너 보안을 이미지 · 빌드 · 실행 · 호스트 · 공급망의 다섯 층으로 나누어 설명할 수 있다',
    'USER 와 -u 옵션으로 컨테이너를 root 가 아닌 사용자로 실행하고 id 로 확인할 수 있다',
    'docker scout 로 이미지 취약점을 찾고 더 안전한 기반 이미지로 바꿀 수 있다',
    '비밀번호가 이미지에 구워지면 docker history · inspect 로 드러난다는 것을 재현하고, 런타임 주입으로 고칠 수 있다',
    '--read-only · --cap-drop · no-new-privileges · 자원 제한으로 실행 환경을 단단하게 만들 수 있다'
  ],
  chips: ['docker run --rm alpine id', 'docker run --rm -u 1000:1000 alpine id', 'docker scout quickview nginx:1.19', 'docker history leaky-app', 'docker ps'],

  figs: {
    /* ---------------------------------------------------------------- 보안의 다섯 층 */
    layers5: {
      caption: '컨테이너 보안의 다섯 층 — 한 겹만 믿지 않고 여러 겹을 겹쳐 막는 것을 "심층 방어"라고 합니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="이미지, 빌드, 실행, 호스트, 공급망 다섯 층의 보안 요소">
  <text x="430" y="26" class="t-lg t-c t-b">컨테이너 보안, 다섯 군데를 지킨다</text>
  <rect x="14" y="48" width="158" height="200" rx="14" class="purple"/>
  <text x="93" y="80" class="t-xl t-c">🧱</text>
  <text x="93" y="114" class="t-b t-c t-purple">① 이미지</text>
  <text x="93" y="142" class="t-xs t-c">작은 기반 이미지</text>
  <text x="93" y="162" class="t-xs t-c">취약점 스캔</text>
  <text x="93" y="182" class="t-xs t-c">최신 패치 유지</text>
  <text x="93" y="222" class="t-xs t-c t-mu">slim · distroless</text>

  <rect x="184" y="48" width="158" height="200" rx="14" class="blue"/>
  <text x="263" y="80" class="t-xl t-c">📝</text>
  <text x="263" y="114" class="t-b t-c t-blue">② 빌드</text>
  <text x="263" y="142" class="t-xs t-c">USER 로 일반 사용자</text>
  <text x="263" y="162" class="t-xs t-c">비밀번호 굽지 않기</text>
  <text x="263" y="182" class="t-xs t-c">.dockerignore</text>
  <text x="263" y="222" class="t-xs t-c t-mu">Dockerfile · BuildKit</text>

  <rect x="354" y="48" width="158" height="200" rx="14" class="green"/>
  <text x="433" y="80" class="t-xl t-c">🏃</text>
  <text x="433" y="114" class="t-b t-c t-green">③ 실행</text>
  <text x="433" y="142" class="t-xs t-c">--read-only</text>
  <text x="433" y="162" class="t-xs t-c">--cap-drop ALL</text>
  <text x="433" y="182" class="t-xs t-c">메모리 · PID 제한</text>
  <text x="433" y="222" class="t-xs t-c t-mu">docker run 옵션</text>

  <rect x="524" y="48" width="158" height="200" rx="14" class="orange"/>
  <text x="603" y="80" class="t-xl t-c">🖥️</text>
  <text x="603" y="114" class="t-b t-c t-orange">④ 호스트</text>
  <text x="603" y="142" class="t-xs t-c">커널 · 엔진 업데이트</text>
  <text x="603" y="162" class="t-xs t-c">docker 그룹 = root</text>
  <text x="603" y="182" class="t-xs t-c">rootless 모드</text>
  <text x="603" y="222" class="t-xs t-c t-mu">리눅스 서버 자체</text>

  <rect x="694" y="48" width="152" height="200" rx="14" class="teal"/>
  <text x="770" y="80" class="t-xl t-c">🔗</text>
  <text x="770" y="114" class="t-b t-c t-teal">⑤ 공급망</text>
  <text x="770" y="142" class="t-xs t-c">믿을 만한 출처</text>
  <text x="770" y="162" class="t-xs t-c">다이제스트 고정</text>
  <text x="770" y="182" class="t-xs t-c">SBOM · 서명</text>
  <text x="770" y="222" class="t-xs t-c t-mu">cosign · Scout</text>

  <rect x="14" y="266" width="832" height="48" rx="12" class="s-gray"/>
  <text x="430" y="290" class="t-c t-b tw">🛡️ 심층 방어 (Defense in Depth) — 한 층이 뚫려도 다음 층이 막아 준다</text>
</svg>`
    },

    /* ---------------------------------------------------------------- root 의 위험 */
    rootrisk: {
      caption: '컨테이너 안의 root 는 (user namespace 를 쓰지 않는 한) 호스트의 root 와 같은 UID 0 입니다. 탈출 버그가 생기면 피해 크기가 완전히 달라집니다',
      svg: `<svg class="dg" viewBox="0 0 860 320" role="img" aria-label="root 로 실행한 컨테이너와 일반 사용자로 실행한 컨테이너가 탈출했을 때의 피해 비교">
  <rect x="14" y="14" width="410" height="292" rx="16" class="red"/>
  <text x="219" y="42" class="t-b t-c t-red">😱 root(UID 0) 로 실행</text>
  <rect x="44" y="62" width="350" height="92" rx="14" class="box"/>
  <text x="219" y="88" class="t-sm t-c t-b">컨테이너</text>
  <text x="219" y="114" class="t-sm t-c t-mono">uid=0(root)</text>
  <text x="219" y="138" class="t-xs t-c t-mu">apt-get · 파일 쓰기 · 무엇이든 가능</text>
  <line x1="219" y1="156" x2="219" y2="204" class="ln-red thick ar-red"/>
  <text x="232" y="184" class="t-xs t-red">커널 버그로 탈출!</text>
  <rect x="44" y="208" width="350" height="82" rx="14" class="s-red"/>
  <text x="219" y="236" class="t-c t-b tw">호스트에서도 root</text>
  <text x="219" y="262" class="t-xs t-c tw">모든 컨테이너 · 파일 · 비밀번호가 위험</text>

  <rect x="436" y="14" width="410" height="292" rx="16" class="green"/>
  <text x="641" y="42" class="t-b t-c t-green">😌 일반 사용자(UID 1000) 로 실행</text>
  <rect x="466" y="62" width="350" height="92" rx="14" class="box"/>
  <text x="641" y="88" class="t-sm t-c t-b">컨테이너</text>
  <text x="641" y="114" class="t-sm t-c t-mono">uid=1000(appuser)</text>
  <text x="641" y="138" class="t-xs t-c t-mu">자기 폴더에만 쓰기 가능</text>
  <line x1="641" y1="156" x2="641" y2="204" class="ln-green thick ar-green"/>
  <text x="654" y="184" class="t-xs t-green">탈출해도…</text>
  <rect x="466" y="208" width="350" height="82" rx="14" class="s-green"/>
  <text x="641" y="236" class="t-c t-b tw">호스트에서 힘없는 사용자</text>
  <text x="641" y="262" class="t-xs t-c tw">시스템 파일 · 다른 컨테이너 못 건드림</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 비밀이 새는 길 */
    secretleak: {
      caption: 'Dockerfile 에 적은 비밀번호는 이미지 레이어와 설정에 영원히 남아, 이미지를 받는 모든 사람에게 전달됩니다. 비밀은 실행할 때 밖에서 넣어야 합니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="Dockerfile 의 ENV 비밀번호가 이미지와 레지스트리를 거쳐 새는 경로와 안전한 런타임 주입 경로">
  <text x="20" y="28" class="t-b t-red">❌ 나쁜 길 — 이미지에 굽기</text>
  <rect x="20" y="44" width="170" height="80" rx="12" class="blue"/>
  <text x="105" y="70" class="t-sm t-c t-b">Dockerfile</text>
  <text x="105" y="96" class="t-xs t-c t-mono">ENV DB_PASSWORD=…</text>
  <line x1="192" y1="84" x2="236" y2="84" class="ln-red thick ar-red"/>
  <rect x="240" y="44" width="170" height="80" rx="12" class="purple"/>
  <text x="325" y="70" class="t-sm t-c t-b">이미지</text>
  <text x="325" y="96" class="t-xs t-c">레이어 · Config.Env</text>
  <line x1="412" y1="84" x2="456" y2="84" class="ln-red thick ar-red"/>
  <rect x="460" y="44" width="170" height="80" rx="12" class="teal"/>
  <text x="545" y="70" class="t-sm t-c t-b">레지스트리</text>
  <text x="545" y="96" class="t-xs t-c">docker push</text>
  <line x1="632" y1="84" x2="676" y2="84" class="ln-red thick ar-red"/>
  <rect x="680" y="44" width="164" height="80" rx="12" class="s-red"/>
  <text x="762" y="70" class="t-sm t-c t-b tw">받는 누구나</text>
  <text x="762" y="96" class="t-xs t-c tw t-mono">docker history</text>

  <line x1="20" y1="150" x2="844" y2="150" class="ln dash thin"/>

  <text x="20" y="182" class="t-b t-green">✅ 좋은 길 — 실행할 때 밖에서 넣기</text>
  <rect x="20" y="198" width="170" height="80" rx="12" class="blue"/>
  <text x="105" y="224" class="t-sm t-c t-b">Dockerfile</text>
  <text x="105" y="250" class="t-xs t-c">비밀 없음</text>
  <line x1="192" y1="238" x2="236" y2="238" class="ln-green thick ar-green"/>
  <rect x="240" y="198" width="170" height="80" rx="12" class="purple"/>
  <text x="325" y="224" class="t-sm t-c t-b">이미지</text>
  <text x="325" y="250" class="t-xs t-c">누가 봐도 안전</text>
  <line x1="412" y1="238" x2="456" y2="238" class="ln-green thick ar-green"/>
  <rect x="460" y="198" width="384" height="80" rx="12" class="s-green"/>
  <text x="652" y="224" class="t-sm t-c t-b tw">실행 중인 컨테이너에만</text>
  <text x="652" y="250" class="t-xs t-c tw">--env-file .env · secrets 파일(/run/secrets)</text>
  <rect x="560" y="290" width="186" height="30" rx="8" class="orange"/>
  <text x="653" y="305" class="t-xs t-c">🔑 .env 는 git · 이미지 밖에</text>
  <line x1="653" y1="290" x2="653" y2="280" class="ln-orange"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 실행 강화 */
    harden: {
      caption: 'docker run 옵션 몇 개로 컨테이너 둘레에 방패를 두릅니다 — 앱은 그대로 돌아가고, 공격자가 할 수 있는 일은 확 줄어듭니다',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="read-only, cap-drop, no-new-privileges, 사용자, 자원 제한, docker.sock 금지로 둘러싼 컨테이너">
  <rect x="300" y="110" width="260" height="120" rx="18" class="green"/>
  <text x="430" y="150" class="t-xl t-c">📦</text>
  <text x="430" y="186" class="t-b t-c t-green">내 앱 컨테이너</text>
  <text x="430" y="210" class="t-xs t-c t-mu">하는 일은 그대로</text>
  <rect x="290" y="100" width="280" height="140" rx="24" class="nofill ln-blue dash"/>

  <rect x="20" y="20" width="240" height="64" rx="12" class="blue"/>
  <text x="140" y="44" class="t-sm t-c t-b t-mono">--read-only</text>
  <text x="140" y="66" class="t-xs t-c">파일 시스템 변조 차단</text>
  <line x1="260" y1="70" x2="300" y2="112" class="ln-blue ar-blue"/>

  <rect x="310" y="20" width="240" height="64" rx="12" class="purple"/>
  <text x="430" y="44" class="t-sm t-c t-b t-mono">--cap-drop ALL</text>
  <text x="430" y="66" class="t-xs t-c">root 특권(capability) 빼기</text>
  <line x1="430" y1="84" x2="430" y2="104" class="ln-purple ar-purple"/>

  <rect x="600" y="20" width="240" height="64" rx="12" class="teal"/>
  <text x="720" y="44" class="t-sm t-c t-b t-mono">no-new-privileges</text>
  <text x="720" y="66" class="t-xs t-c">setuid 로 권한 상승 금지</text>
  <line x1="600" y1="70" x2="560" y2="112" class="ln-teal ar-teal"/>

  <rect x="20" y="256" width="240" height="64" rx="12" class="orange"/>
  <text x="140" y="280" class="t-sm t-c t-b t-mono">-u 1000:1000</text>
  <text x="140" y="302" class="t-xs t-c">root 아닌 사용자</text>
  <line x1="260" y1="270" x2="300" y2="228" class="ln-orange ar-orange"/>

  <rect x="310" y="256" width="240" height="64" rx="12" class="yellow"/>
  <text x="430" y="280" class="t-sm t-c t-b t-mono">-m 256m --pids-limit</text>
  <text x="430" y="302" class="t-xs t-c">자원 폭주(DoS) 막기</text>
  <line x1="430" y1="256" x2="430" y2="236" class="ln-orange ar-orange"/>

  <rect x="600" y="256" width="240" height="64" rx="12" class="red"/>
  <text x="720" y="280" class="t-sm t-c t-b">🚫 docker.sock · --privileged</text>
  <text x="720" y="302" class="t-xs t-c">호스트 열쇠 건네지 않기</text>
  <line x1="600" y1="270" x2="560" y2="228" class="ln-red ar-red"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 공급망 */
    supply: {
      caption: '소프트웨어 공급망 — 소스에서 실행까지 각 단계에 "무엇이 들었나(SBOM)"와 "누가 만들었나(서명)"를 붙여 검증합니다',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="소스, 빌드, SBOM과 서명, 레지스트리, 검증, 실행으로 이어지는 공급망">
  <rect x="10" y="60" width="120" height="84" rx="12" class="gray"/>
  <text x="70" y="92" class="t-lg t-c">📂</text>
  <text x="70" y="124" class="t-sm t-c t-b">소스 코드</text>
  <line x1="132" y1="102" x2="156" y2="102" class="ln ar"/>
  <rect x="160" y="60" width="120" height="84" rx="12" class="blue"/>
  <text x="220" y="92" class="t-lg t-c">🏗️</text>
  <text x="220" y="124" class="t-sm t-c t-b">빌드</text>
  <line x1="282" y1="102" x2="306" y2="102" class="ln ar"/>
  <rect x="310" y="44" width="140" height="116" rx="12" class="purple"/>
  <text x="380" y="72" class="t-sm t-c t-b">📋 SBOM</text>
  <text x="380" y="94" class="t-xs t-c">부품 목록</text>
  <text x="380" y="124" class="t-sm t-c t-b">✍️ 서명</text>
  <text x="380" y="146" class="t-xs t-c">cosign · DCT</text>
  <line x1="452" y1="102" x2="476" y2="102" class="ln ar"/>
  <rect x="480" y="60" width="120" height="84" rx="12" class="teal"/>
  <text x="540" y="92" class="t-lg t-c">🏪</text>
  <text x="540" y="124" class="t-sm t-c t-b">레지스트리</text>
  <line x1="602" y1="102" x2="626" y2="102" class="ln ar"/>
  <rect x="630" y="60" width="110" height="84" rx="12" class="orange"/>
  <text x="685" y="92" class="t-lg t-c">🔍</text>
  <text x="685" y="124" class="t-sm t-c t-b">검증</text>
  <line x1="742" y1="102" x2="766" y2="102" class="ln-green ar-green"/>
  <rect x="770" y="60" width="100" height="84" rx="12" class="green"/>
  <text x="820" y="92" class="t-lg t-c">🚀</text>
  <text x="820" y="124" class="t-sm t-c t-b">실행</text>
  <rect x="480" y="176" width="260" height="56" rx="10" class="red"/>
  <text x="610" y="198" class="t-xs t-c t-b">🐞 docker scout 로 CVE 스캔</text>
  <text x="610" y="218" class="t-xs t-c">새 취약점은 계속 발견된다 → 주기적 재스캔</text>
  <line x1="540" y1="144" x2="560" y2="174" class="ln-red dash"/>
  <line x1="685" y1="144" x2="665" y2="174" class="ln-red dash"/>
  <text x="70" y="176" class="t-xs t-c t-mu">커밋 서명</text>
  <text x="220" y="176" class="t-xs t-c t-mu">CI 에서 자동</text>
  <text x="820" y="176" class="t-xs t-c t-mu">@sha256 고정</text>
</svg>`
    }
  },

  files: {
    leaky: {
      '~/leaky/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
ENV DB_PASSWORD=SuperSecret123
COPY . .
CMD ["python", "app.py"]
`,
      '~/leaky/app.py': `import os

pw = os.environ.get('DB_PASSWORD', '')
print('DB 비밀번호 길이:', len(pw))
`,
      '~/leaky/.env': `DB_PASSWORD=SuperSecret123
`
    },
    safe: {
      '~/safe-app/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY . .
CMD ["id"]
`,
      '~/safe-app/app.py': `print('hello from safe-app')
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '컨테이너 보안, 어디부터 지켜야 할까?',
      html: `
<p>지금까지는 "일단 돌아가게" 만드는 데 집중했습니다. 하지만 인터넷에 공개된 서비스는 하루에도 수없이 공격 시도를 받습니다.
보안의 목표는 "절대 뚫리지 않기"가 아니라 <b>뚫려도 피해가 작게</b> 만드는 것입니다.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 아파트 보안</div>
아파트는 정문 경비실 하나만 믿지 않습니다. 공동 현관 비밀번호, 집 현관 도어락, 금고, CCTV 가 <b>겹겹이</b> 있죠.
컨테이너도 마찬가지로 <b>이미지(건축 자재) · 빌드(시공) · 실행(입주 규칙) · 호스트(건물 자체) · 공급망(자재 납품처)</b> 을 각각 지킵니다.
</div>

{{fig:layers5}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>층</th><th>무엇이 위험한가</th><th>이 장에서 배우는 대책</th></tr>
<tr><td>🧱 이미지</td><td>오래된 패키지의 알려진 취약점(CVE), 필요 없는 도구(셸 · 컴파일러)</td><td>최소 이미지, <code>docker scout</code></td></tr>
<tr><td>📝 빌드</td><td>root 로 실행, 이미지에 비밀번호 · 키 포함</td><td><code>USER</code>, <code>.dockerignore</code>, BuildKit secret</td></tr>
<tr><td>🏃 실행</td><td>파일 변조, 권한 상승, 자원 독점</td><td><code>--read-only</code>, <code>--cap-drop</code>, <code>-m</code>, <code>--pids-limit</code></td></tr>
<tr><td>🖥️ 호스트</td><td>docker.sock 노출, <code>--privileged</code>, 오래된 커널</td><td>소켓 마운트 금지, rootless 모드</td></tr>
<tr><td>🔗 공급망</td><td>가짜 · 변조된 이미지, 태그가 몰래 바뀜</td><td>공식 이미지, 다이제스트 고정, SBOM · 서명</td></tr>
</table></div>

<div class="stats">
<div class="stat red"><b>UID 0</b><span>컨테이너 기본 사용자 = root</span></div>
<div class="stat orange"><b>수백 개</b><span>오래된 이미지의 CVE 수</span></div>
<div class="stat green"><b>옵션 5개</b><span>로 실행 환경 강화</span></div>
</div>

<div class="box note"><div class="box-t">📌 컨테이너는 VM 만큼 격리되지 않습니다</div>
컨테이너는 호스트와 <b>커널을 함께 씁니다</b>(14장에서 자세히). 그래서 커널 버그 하나로 컨테이너 밖으로 "탈출"하는 사고가 실제로 있었습니다.
격리가 약한 만큼, 컨테이너 안에서 가진 권한을 최소로 줄이는 것이 핵심입니다.
</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'root 로 실행하지 않기 — USER 와 -u',
      html: `
<p>아무 설정 없이 컨테이너를 실행하면 안에서는 <b>root(UID 0)</b> 입니다. 직접 확인해 볼까요?
<code>id</code> 는 "나는 누구인가(사용자 번호 · 그룹)"를 보여 주는 리눅스 명령입니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm alpine id
docker run --rm -u 1000:1000 alpine id</code></pre>

<pre class="code out" data-lang="출력"><code>uid=0(root) gid=0(root) groups=0(root)
uid=1000(1000) gid=1000(1000) groups=1000(1000)</code></pre>

<p><code>-u 사용자:그룹</code>(<code>--user</code>) 을 붙이면 지정한 UID 로 실행됩니다. 이름이 아닌 숫자를 쓰면 이미지 안에 그 사용자가 없어도 됩니다.</p>

{{fig:rootrisk}}

<h4>root 가 아니면 무엇이 달라지나 — 실패를 재현해 보기</h4>
<p>일반 사용자는 시스템 폴더에 쓸 수 없고, 패키지도 설치할 수 없습니다. 공격자가 들어와도 마찬가지로 할 수 있는 일이 적습니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm -u 1000:1000 ubuntu apt-get update
docker run --rm -u 1000:1000 nginx:alpine touch /etc/test</code></pre>

<pre class="code out" data-lang="출력"><code>E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)
E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?
touch: cannot touch '/etc/test': Permission denied</code></pre>

<div class="box tip"><div class="box-t">💡 이 오류는 "좋은 신호"입니다</div>
위 두 명령이 실패하는 것이 정상입니다. 운영 중인 컨테이너 안에서 <code>apt-get</code> 이 된다면, 침입자도 똑같이 도구를 설치할 수 있다는 뜻이니까요.
도구가 필요하면 <b>Dockerfile 에서 빌드할 때</b> 설치하고, 실행은 일반 사용자로 합니다.
</div>

<h4>Dockerfile 에 USER 넣기</h4>
<p>매번 <code>-u</code> 를 붙이는 대신, 이미지 자체에 "이 사용자로 실행"을 적어 두는 것이 모범 사례입니다.
설치는 root 로 먼저 하고, 마지막에 <code>USER</code> 로 바꿉니다.</p>

<pre class="code" data-lang="Dockerfile" data-file="~/safe-app/Dockerfile"><code>FROM python:3.12-slim
<span class="cm"># ① 일반 사용자 만들기 (root 권한이 필요한 작업은 이 위에서)</span>
RUN useradd --create-home appuser
WORKDIR /app
COPY . .
<span class="cm"># ② 이제부터 appuser 로 실행</span>
USER appuser
CMD ["id"]</code></pre>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/safe-app
docker build -t safe-app .
docker run --rm safe-app
docker inspect -f '{{.Config.User}}' safe-app</code></pre>

<pre class="code out" data-lang="출력"><code>uid=1000(appuser) gid=1000(appuser) groups=1000(appuser)
appuser</code></pre>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 디버깅할 때만 잠깐 root</div>
운영 컨테이너에 문제가 생겨 도구를 설치해야 한다면, 컨테이너를 root 로 다시 만들지 말고
<code>docker exec -u root 컨테이너 명령</code> 으로 <b>그 순간만</b> root 로 들어갑니다. 메인 프로세스는 여전히 일반 사용자로 돕니다.
<br>Compose 에서는 서비스에 <code>user: "1000:1000"</code> 을 적습니다. 공식 이미지 중 postgres · redis 처럼 스스로 일반 사용자로 바꿔 실행하는 이미지도 많습니다.
</div>

<div class="box warn"><div class="box-t">⚠️ 볼륨 권한과 함께 생각하기</div>
일반 사용자로 바꾸면 볼륨이나 바인드 마운트 폴더에 쓰기 권한이 없어 <code>Permission denied</code> 가 날 수 있습니다.
Dockerfile 에서 <code>RUN mkdir /data &amp;&amp; chown appuser /data</code> 처럼 쓸 폴더의 주인을 미리 바꿔 두세요.
</div>`
    },

    /* ================================================================ 3 */
    {
      title: '최소 이미지 — 없는 것은 공격할 수 없다',
      html: `
<p>이미지에 들어 있는 모든 프로그램은 잠재적인 공격 도구이자 취약점 후보입니다. 이렇게 공격받을 수 있는 면적을 <b>공격 표면(attack surface)</b> 이라고 합니다.
필요한 것만 담은 작은 이미지는 빠르고, 동시에 안전합니다.</p>

{{widget:sizes|list=python:3.12,python:3.12-slim,python:3.12-alpine,gcr.io/distroless/static-debian12|title=같은 목적, 다른 크기 — 작을수록 공격 표면도 작다}}

<div class="cards c3">
<div class="card blue"><div class="ci">🥖</div><b>slim</b><p>데비안에서 문서 · 컴파일러 등을 뺀 버전. 호환성이 좋아 가장 무난한 선택.</p></div>
<div class="card teal"><div class="ci">🏔️</div><b>alpine</b><p>5MB 대의 초소형 리눅스. musl libc 라 일부 라이브러리와 호환 문제가 있을 수 있음.</p></div>
<div class="card purple"><div class="ci">👻</div><b>distroless</b><p>셸 · 패키지 관리자조차 없는 이미지. 앱 실행에 필요한 파일만 들어 있음.</p></div>
</div>

<p>distroless 에는 정말 셸이 없을까요? 실행해 보면 <code>sh</code> 를 찾지 못해 실패합니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm gcr.io/distroless/static-debian12 sh</code></pre>

<pre class="code out" data-lang="출력"><code>docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "sh": executable file not found in $PATH: unknown.</code></pre>

<p>이 오류가 바로 distroless 의 장점입니다. 침입자가 앱의 빈틈으로 들어와도 <b>셸 명령을 실행할 방법이 없습니다.</b>
대신 우리도 <code>docker exec -it … sh</code> 로 들어가 디버깅할 수 없다는 단점이 있습니다.</p>

<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>일반(예: python:3.12)</th><th>slim</th><th>alpine</th><th>distroless</th></tr>
<tr><td>셸</td><td>bash</td><td>bash</td><td>sh(busybox)</td><td>❌ 없음</td></tr>
<tr><td>패키지 관리자</td><td>apt</td><td>apt</td><td>apk</td><td>❌ 없음</td></tr>
<tr><td>디버깅 편의</td><td>😀 최고</td><td>🙂 좋음</td><td>🙂 좋음</td><td>😓 어려움</td></tr>
<tr><td>공격 표면</td><td>큼</td><td>중간</td><td>작음</td><td>가장 작음</td></tr>
<tr><td>잘 맞는 곳</td><td>개발 · 빌드 단계</td><td>대부분의 운영</td><td>작은 서비스</td><td>Go 같은 정적 바이너리</td></tr>
</table></div>

<div class="box tip"><div class="box-t">💡 멀티 스테이지와 함께 쓰기 (7장 복습)</div>
빌드 단계에서는 컴파일러가 든 큰 이미지를 쓰고, 마지막 실행 단계만 slim · distroless 로 옮기면
"빌드는 편하게, 실행은 작고 안전하게" 두 마리 토끼를 잡습니다.
</div>`
    },

    /* ================================================================ 4 */
    {
      title: '취약점 스캔 — docker scout',
      html: `
<p>이미지 속 패키지(openssl, glibc, curl …)에는 시간이 지나며 보안 구멍이 발견됩니다. 발견된 취약점에는
<b>CVE(Common Vulnerabilities and Exposures)</b> 라는 번호가 붙고, 심각도는 <span class="tag red">CRITICAL</span> <span class="tag orange">HIGH</span> <span class="tag yellow">MEDIUM</span> <span class="tag gray">LOW</span> 로 나뉩니다.
<b>Docker Scout</b> 는 이미지의 패키지 목록을 CVE 데이터베이스와 비교해 알려 주는 도구입니다.</p>

<div class="flow">
<div class="fb purple"><span class="fi">🧱</span><b>이미지</b>패키지 목록 추출</div>
<div class="fb blue"><span class="fi">📋</span><b>SBOM</b>무엇이 몇 버전?</div>
<div class="fb red"><span class="fi">🐞</span><b>CVE 비교</b>알려진 취약점 대조</div>
<div class="fb green"><span class="fi">💊</span><b>추천</b>더 안전한 기반 이미지</div>
</div>

<h4>오래된 nginx 와 최신 nginx 비교</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull nginx:1.19
docker pull nginx:1.27-alpine
docker scout quickview nginx:1.19
docker scout quickview nginx:1.27-alpine</code></pre>

<pre class="code out" data-lang="출력"><code>  i Quickview

  Target               │  nginx:1.19             │  6C  31H  58M  120L
    digest             │  648818853946              │
  Base image           │  nginx:latest           │  6C  31H  58M  120L
  Updated base image   │  nginx:1.27-alpine      │  0C   0H   2M   10L
                       │                         │  -6   -31  -56  -110
…
  Target               │  nginx:1.27-alpine      │  0C   0H   1M    0L</code></pre>

<p><code>6C 31H 58M 120L</code> 은 CRITICAL 6개, HIGH 31개, MEDIUM 58개, LOW 120개라는 뜻입니다. 기반 이미지만 바꿔도 거의 다 사라지네요!
(시뮬레이터의 숫자는 흉내이고, 실제 숫자는 스캔하는 날마다 달라집니다.)</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker scout cves nginx:1.19
docker scout recommendations nginx:1.19</code></pre>

<pre class="code out" data-lang="출력"><code>## Overview

                    │   Analyzed Image
────────────────────┼──────────────────────────────
  Target            │  nginx:1.19
    vulnerabilities │    6C    31H    58M    120L

## Packages and Vulnerabilities
…
    ✗ CRITICAL CVE-2024-5535
      Fixed version : 3.0.14-1~deb12u1
…
215 vulnerabilities found in 15 packages
  CRITICAL  6
  HIGH      31
  MEDIUM    58
  LOW       120</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>하는 일</th></tr>
<tr><td><code>docker scout quickview 이미지</code></td><td>심각도별 개수 요약 + 기반 이미지 업데이트 효과</td></tr>
<tr><td><code>docker scout cves 이미지</code></td><td>패키지별 CVE 번호와 "고쳐진 버전(Fixed version)"</td></tr>
<tr><td><code>docker scout recommendations 이미지</code></td><td>바꾸면 좋은 기반 이미지 태그 추천</td></tr>
</table></div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 스캔은 한 번이 아니라 계속</div>
오늘 깨끗한 이미지도 내일 새 CVE 가 발표되면 취약해집니다. 그래서 ① CI 에서 빌드할 때마다 스캔하고(16장),
② 코드 변경이 없어도 <b>주기적으로 다시 빌드</b>해 기반 이미지의 보안 패치를 받습니다.
Scout 말고도 <b>Trivy</b>, <b>Grype</b> 같은 오픈소스 스캐너가 널리 쓰입니다.
</div>

<div class="box note"><div class="box-t">📌 CVE 가 0 이 아니어도 괜찮을 때</div>
모든 CVE 가 내 앱에 영향을 주지는 않습니다. "Fixed version: not fixed"(아직 고친 버전이 없음)인 LOW 항목까지 0 으로 만들려 애쓰기보다,
<b>CRITICAL · HIGH 부터</b>, 그리고 <b>실제로 쓰는 패키지부터</b> 처리하는 것이 현실적인 우선순위입니다.
</div>`
    },

    /* ================================================================ 5 */
    {
      title: '비밀 정보 다루기 — 이미지에 비밀번호를 굽지 마세요',
      html: `
<p>가장 흔한 실수는 Dockerfile 에 <code>ENV DB_PASSWORD=...</code> 를 적거나, <code>.env</code> 파일을 <code>COPY . .</code> 로 이미지에 함께 넣는 것입니다.
이미지는 레이어와 설정을 모두 들고 다니므로, 이미지를 받은 <b>누구나</b> 비밀번호를 꺼내 볼 수 있습니다. 직접 재현해 봅시다.</p>

{{widget:files|set=leaky|cd=~/leaky|title=비밀번호가 새는 예제 만들기}}

<pre class="code" data-lang="Dockerfile" data-file="~/leaky/Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
ENV DB_PASSWORD=SuperSecret123
COPY . .
CMD ["python", "app.py"]</code></pre>

<pre class="code" data-lang="python" data-file="~/leaky/app.py"><code>import os

pw = os.environ.get('DB_PASSWORD', '')
print('DB 비밀번호 길이:', len(pw))</code></pre>

<pre class="code" data-lang="env" data-file="~/leaky/.env"><code>DB_PASSWORD=SuperSecret123</code></pre>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/leaky
docker build -t leaky-app .
docker history leaky-app
docker inspect -f '{{.Config.Env}}' leaky-app
docker run --rm leaky-app ls -a /app
docker run --rm leaky-app cat /app/.env</code></pre>

<pre class="code out" data-lang="출력"><code>IMAGE          CREATED                  CREATED BY                                      SIZE     COMMENT
…              Less than a second ago   CMD ["python","app.py"]                         0B       buildkit.dockerfile.v0
&lt;missing&gt;      Less than a second ago   COPY . . # buildkit                             207B     buildkit.dockerfile.v0
&lt;missing&gt;      Less than a second ago   <span class="hl">ENV DB_PASSWORD=SuperSecret123</span>                  0B       buildkit.dockerfile.v0
…
[PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin PYTHON_VERSION=3.12.7 LANG=C.UTF-8 <span class="hl">DB_PASSWORD=SuperSecret123</span>]
.  ..  <span class="hl">.env</span>  Dockerfile  app.py
DB_PASSWORD=SuperSecret123</code></pre>

<p>세 군데로 샜습니다! ① <code>docker history</code> 의 ENV 줄 ② <code>docker inspect</code> 의 Config.Env ③ 이미지 안에 복사된 <code>.env</code> 파일.
레지스트리에 푸시했다면 이미 전 세계에 공개된 것과 같습니다.</p>

{{fig:secretleak}}

<h4>고치는 방법 — 비밀은 실행할 때 밖에서</h4>
<ol class="steps-list">
<li><b>Dockerfile 에서 ENV 비밀번호 줄을 지웁니다.</b> (기본값이 필요하면 비밀이 아닌 값만)</li>
<li><b><code>.dockerignore</code> 에 <code>.env</code> 를 넣어</b> 빌드 컨텍스트에서 빼냅니다. <code>.git</code> 도 함께 빼 두세요.</li>
<li><b>실행할 때 <code>--env-file</code> 이나 <code>-e</code> 로 넣습니다.</b> 비밀은 실행 중인 컨테이너에만 존재합니다.</li>
</ol>

<pre class="code" data-lang="Dockerfile" data-file="~/leaky/Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY . .
CMD ["python", "app.py"]</code></pre>

<pre class="code" data-lang="dockerignore" data-file="~/leaky/.dockerignore"><code>.env
.git</code></pre>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/leaky
docker build --no-cache -t leaky-app .
docker inspect -f '{{.Config.Env}}' leaky-app
docker run --rm leaky-app ls -a /app
docker run --rm --env-file .env leaky-app</code></pre>

<p><code>--no-cache</code> 는 예전 빌드 캐시를 쓰지 않고 처음부터 다시 빌드하는 옵션입니다. 비밀을 정리한 뒤에는 캐시 없이 깨끗하게 빌드해 두면 마음이 놓입니다.</p>

<pre class="code out" data-lang="출력"><code>[PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin PYTHON_VERSION=3.12.7 LANG=C.UTF-8]
.  ..  .dockerignore  Dockerfile  app.py
DB 비밀번호 길이: 14</code></pre>

<div class="box warn"><div class="box-t">⚠️ 한 번 샌 비밀번호는 "바꾸는 것"이 정답</div>
이미지를 다시 빌드해도 <b>예전 이미지</b>(지금은 <code>&lt;none&gt;</code> 태그)와 이미 푸시한 레지스트리 사본에는 비밀번호가 그대로 남습니다.
git 커밋에 들어간 경우도 마찬가지입니다. 새어 나간 비밀번호 · 토큰은 <b>즉시 폐기하고 새로 발급</b>하세요.
</div>

<h4>-e 도 완벽하지는 않다 — secrets 파일</h4>
<p><code>-e</code> 로 넣은 값도 <code>docker inspect 컨테이너</code> 를 실행할 수 있는 사람에게는 보입니다.
더 안전한 방법은 비밀을 <b>파일로 마운트</b>하고 앱이 파일에서 읽게 하는 것입니다. Compose 의 <code>secrets</code> 가 바로 그 기능으로,
비밀이 컨테이너 안 <code>/run/secrets/이름</code> 에 파일로 나타납니다. postgres · mysql 같은 공식 이미지는 <code>_FILE</code> 로 끝나는 환경 변수를 지원합니다.</p>

<pre class="code" data-lang="yaml" data-file="~/secrets-demo/compose.yaml"><code>services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./db_password.txt</code></pre>

<p>빌드 도중에만 필요한 비밀(사설 패키지 저장소 토큰 등)은 <b>BuildKit 의 secret 마운트</b>를 씁니다.
비밀 파일이 그 <code>RUN</code> 한 줄 동안만 <code>/run/secrets/</code> 에 나타나고 <b>어떤 레이어에도 남지 않습니다.</b></p>

<pre class="code" data-lang="Dockerfile"><code># syntax=docker/dockerfile:1
FROM python:3.12-slim
RUN --mount=type=secret,id=pip_token \
    PIP_INDEX_URL="https://token:$(cat /run/secrets/pip_token)@pypi.example.com/simple" \
    pip install my-private-package</code></pre>
<pre class="code" data-lang="bash"><code>docker build --secret id=pip_token,src=./pip_token.txt -t myapp .</code></pre>

<div class="box note"><div class="box-t">📌 시뮬레이터 안내</div>
위 Compose <code>secrets</code> 예제와 <code>--mount=type=secret</code> 빌드는 실제 Docker 에서 쓰는 형식입니다.
이 실습 터미널은 secrets 파일 마운트를 흉내 내지 않으므로, 개념과 형식만 익혀 두세요.
</div>`
    },

    /* ================================================================ 6 */
    {
      title: '실행 옵션으로 단단하게 — read-only · capabilities · 자원 제한',
      html: `
<p>이미지를 잘 만들었다면, 이제 <code>docker run</code> 옵션으로 컨테이너 둘레에 방패를 두릅니다. 대부분의 웹 앱은 이 옵션을 켜도 문제없이 돌아갑니다.</p>

{{fig:harden}}

<h4>① --read-only : 루트 파일 시스템을 읽기 전용으로</h4>
<p>침입자가 가장 먼저 하는 일은 악성 파일을 내려받거나 설정을 바꾸는 것입니다. 파일 시스템을 읽기 전용으로 만들면 이것이 막힙니다.
앱이 꼭 써야 하는 임시 폴더만 <code>--tmpfs</code>(메모리 위의 임시 폴더)로 열어 줍니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name ro-web --read-only --tmpfs /tmp --tmpfs /var/cache/nginx --tmpfs /var/run nginx:alpine
docker exec ro-web touch /hello
docker exec ro-web touch /tmp/ok
docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' ro-web</code></pre>

<pre class="code out" data-lang="출력"><code>touch: cannot touch '/hello': Read-only file system
true</code></pre>

<div class="box tip"><div class="box-t">💡 nginx 에 tmpfs 가 세 개나 필요한 이유</div>
실제 nginx 는 시작할 때 <code>/var/cache/nginx</code> 에 임시 폴더를 만들고 <code>/var/run/nginx.pid</code> 를 씁니다.
읽기 전용으로만 실행하면 <code>Read-only file system</code> 오류로 바로 종료되므로, 쓰기가 필요한 곳을 로그 · 문서에서 찾아 tmpfs 나 볼륨으로 열어 줍니다.
</div>

<h4>② --cap-drop ALL : root 의 특권을 쪼개서 빼기</h4>
<p>리눅스는 root 의 힘을 <b>capability</b> 라는 40여 개 조각(네트워크 설정 <code>NET_ADMIN</code>, 1024 미만 포트 열기 <code>NET_BIND_SERVICE</code>, 파일 주인 바꾸기 <code>CHOWN</code> …)으로 나눕니다.
Docker 는 기본으로 일부만 주는데, <b>전부 빼고 꼭 필요한 것만 다시 넣는</b> 것이 안전합니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --cap-drop ALL --cap-add NET_BIND_SERVICE nginx:alpine nginx -t</code></pre>

<h4>③ --security-opt no-new-privileges : 권한 상승 금지</h4>
<p>setuid 프로그램(예: <code>sudo</code>, <code>su</code>)을 이용해 실행 중에 더 높은 권한을 얻는 것을 막습니다. 켜서 손해 볼 일이 거의 없는 옵션입니다.</p>

<h4>④ 자원 제한도 보안입니다</h4>
<p>공격자가 CPU 를 채굴에 쓰거나, 프로세스를 무한히 복제하는 <b>포크 폭탄(fork bomb)</b> 으로 서버 전체를 멈추게 할 수 있습니다.
8장에서 배운 <code>-m</code>, <code>--cpus</code> 와 함께 <code>--pids-limit</code>(프로세스 수 상한)을 걸면 한 컨테이너의 폭주가 이웃에게 번지지 않습니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name hardened --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true -m 256m --pids-limit 100 -u 1000:1000 alpine sleep 3600
docker exec hardened id
docker exec hardened cat /sys/fs/cgroup/pids.max
docker inspect -f '{{.HostConfig.CapDrop}} {{.HostConfig.ReadonlyRootfs}} {{.Config.User}}' hardened</code></pre>

<pre class="code out" data-lang="출력"><code>uid=1000(1000) gid=1000(1000) groups=1000(1000)
100
[ALL] true 1000:1000</code></pre>

<p>Compose 에서는 같은 설정을 이렇게 씁니다.</p>
<pre class="code" data-lang="yaml" data-file="~/hardened/compose.yaml"><code>services:
  app:
    image: alpine
    command: sleep 3600
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    mem_limit: 256m
    pids_limit: 100</code></pre>

<h4>⑤ 절대 조심 — --privileged 와 docker.sock</h4>
<div class="vs">
<div class="vs-a red"><b>--privileged</b><ul><li>모든 capability + 호스트 장치 접근</li><li>격리를 거의 다 꺼 버리는 옵션</li><li>"안 되니까 일단 붙여 보자" 금지</li></ul></div>
<div class="vs-mid">＋</div>
<div class="vs-b red"><b>-v /var/run/docker.sock:…</b><ul><li>컨테이너가 Docker 엔진을 조종</li><li>호스트를 마운트한 새 컨테이너를 만들 수 있음</li><li>= <b>호스트 root 열쇠</b>를 건네는 것</li></ul></div>
</div>

<div class="box warn"><div class="box-t">⚠️ docker 그룹 = root</div>
같은 이유로 <b>docker 그룹에 속한 사용자는 사실상 호스트 root</b> 입니다.
<code>docker run -v /:/host …</code> 한 줄이면 호스트 전체 파일을 읽고 쓸 수 있으니까요. 서버의 docker 그룹에는 믿을 수 있는 사람만 넣으세요.
Portainer · CI 러너처럼 소켓이 꼭 필요한 도구는 출처를 확인하고, 가능하면 읽기 전용 프록시나 rootless 를 검토합니다.
</div>`
    },

    /* ================================================================ 7 */
    {
      title: '믿을 수 있는 이미지와 공급망 보안',
      html: `
<p>내가 만든 코드가 아무리 안전해도, <code>FROM</code> 에 적은 기반 이미지가 오염되어 있다면 소용없습니다.
재료를 어디서, 어떤 상태로 받아 오는지 관리하는 것을 <b>공급망 보안(supply chain security)</b> 이라고 합니다.</p>

{{fig:supply}}

<h4>① 출처가 분명한 이미지 고르기</h4>
<div class="cards c3">
<div class="card blue"><div class="ci">🏅</div><b>Docker Official Image</b><p>Docker 가 관리 · 검토하는 공식 이미지 (nginx, python, postgres …).</p></div>
<div class="card green"><div class="ci">✅</div><b>Verified Publisher</b><p>검증된 회사가 직접 올리는 이미지 (예: 클라우드 · DB 회사).</p></div>
<div class="card orange"><div class="ci">🌱</div><b>Sponsored OSS</b><p>Docker 가 후원하는 오픈소스 프로젝트 이미지.</p></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker search --filter is-official=true python</code></pre>
<p>이름이 비슷한 가짜 이미지(<code>pyth0n</code>, <code>nginx-official-latest</code> …)나 몇 년째 업데이트가 없는 개인 이미지는 피하세요.</p>

<h4>② 태그 대신 다이제스트로 고정하기</h4>
<p>태그(<code>nginx:1.27-alpine</code>)는 <b>움직이는 이름표</b>라서 같은 태그가 나중에 다른 내용을 가리킬 수 있습니다.
<b>다이제스트(<code>@sha256:…</code>)</b> 는 내용 자체의 지문이라 절대 바뀌지 않습니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker pull nginx:1.27-alpine
docker inspect -f '{{.RepoDigests}}' nginx:1.27-alpine</code></pre>
<pre class="code out" data-lang="출력"><code>[nginx@sha256:a6b806a0a45efa5a988d46a6967be4267c3439ebf41c29fd831552d98e278451]</code></pre>

<pre class="code" data-lang="Dockerfile"><code># 사람이 읽기 좋은 태그 + 절대 안 바뀌는 다이제스트를 함께
FROM nginx:1.27-alpine@sha256:a6b806a0a45efa5a988d46a6967be4267c3439ebf41c29fd831552d98e278451</code></pre>

<div class="box dev"><div class="box-t">👩‍💻 고정하면 업데이트는 어떻게?</div>
다이제스트로 고정하면 보안 패치도 자동으로 들어오지 않습니다. 그래서 실무에서는 Dependabot · Renovate 같은 봇이
"새 다이제스트가 나왔어요" 하고 PR 을 올려 주게 하고, CI 에서 스캔 · 테스트를 통과하면 합칩니다.
</div>

<h4>③ SBOM 과 서명</h4>
<div class="tbl-wrap"><table class="tbl">
<tr><th>개념</th><th>뜻</th><th>대표 도구</th></tr>
<tr><td><b>SBOM</b><br>(Software Bill of Materials)</td><td>이미지에 든 모든 패키지와 버전의 "성분표". 새 CVE 가 나오면 영향받는 이미지를 바로 찾을 수 있음</td><td><code>docker buildx build --sbom=true</code>, Syft, Scout</td></tr>
<tr><td><b>Provenance</b>(출처 증명)</td><td>어떤 소스 · 어떤 빌드 환경에서 만들어졌는지의 기록</td><td><code>--provenance=true</code>, SLSA</td></tr>
<tr><td><b>이미지 서명</b></td><td>"이 이미지는 정말 우리가 만들었고 변조되지 않았다"는 전자 서명</td><td>Sigstore <b>cosign</b>, Notation</td></tr>
<tr><td><b>Docker Content Trust</b></td><td>서명된 이미지만 pull · run 하도록 강제하는 Docker 기능</td><td><code>DOCKER_CONTENT_TRUST=1</code></td></tr>
</table></div>

<pre class="code" data-lang="bash"><code># (실제 환경 예시) 서명 · 검증
cosign sign registry.example.com/myapp@sha256:…
cosign verify --key cosign.pub registry.example.com/myapp:1.0

# 서명된 이미지만 받기
export DOCKER_CONTENT_TRUST=1
docker pull nginx:1.27-alpine</code></pre>`
    },

    /* ================================================================ 8 */
    {
      title: 'rootless 모드 · Podman 과 보안 체크리스트',
      html: `
<p>지금까지는 "컨테이너 안에서 root 를 쓰지 말자"였습니다. 한 걸음 더 나아가 <b>Docker 엔진 자체를 root 없이</b> 돌리는 방법도 있습니다.</p>

<div class="cards c3">
<div class="card teal"><div class="ci">🙋</div><b>Rootless Docker</b><p>dockerd 를 일반 사용자 권한으로 실행. 컨테이너가 탈출해도 그 사용자 권한뿐. <code>dockerd-rootless-setuptool.sh install</code></p></div>
<div class="card purple"><div class="ci">🦭</div><b>Podman</b><p>데몬 없이 rootless 가 기본인 Docker 호환 도구. <code>podman run</code> 이 <code>docker run</code> 과 거의 같음 (16장).</p></div>
<div class="card blue"><div class="ci">🗺️</div><b>User namespace remap</b><p>컨테이너의 UID 0 을 호스트의 힘없는 UID(예: 100000)로 바꿔 매핑하는 dockerd 설정 <code>userns-remap</code>.</p></div>
</div>

<div class="box note"><div class="box-t">📌 rootless 의 제약</div>
rootless 에서는 1024 미만 포트를 바로 열 수 없고, 일부 네트워크 · 스토리지 기능이 제한되거나 느릴 수 있습니다.
보안이 특히 중요한 공용 서버나 CI 환경에서 먼저 검토해 보세요.
</div>

<h4>✅ 컨테이너 보안 체크리스트</h4>
<div class="tbl-wrap"><table class="tbl">
<tr><th>#</th><th>점검 항목</th><th>확인 방법</th></tr>
<tr><td>1</td><td>공식 · Verified 이미지를 쓰고, 버전 태그(가능하면 다이제스트)로 고정했다</td><td><code>FROM</code> 줄 확인 (<code>latest</code> 금지)</td></tr>
<tr><td>2</td><td>slim · alpine · distroless 같은 최소 이미지를 쓴다</td><td><code>docker images</code> 크기</td></tr>
<tr><td>3</td><td>CRITICAL · HIGH 취약점이 없다</td><td><code>docker scout quickview</code></td></tr>
<tr><td>4</td><td>Dockerfile 에 <code>USER</code> 가 있고 root 로 실행되지 않는다</td><td><code>docker run --rm 이미지 id</code></td></tr>
<tr><td>5</td><td>이미지 안에 비밀번호 · 키 · .env 가 없다</td><td><code>docker history</code>, <code>docker inspect</code></td></tr>
<tr><td>6</td><td><code>.dockerignore</code> 에 .env · .git 이 있다</td><td>파일 확인</td></tr>
<tr><td>7</td><td>가능하면 <code>--read-only</code> + 필요한 곳만 tmpfs</td><td><code>ReadonlyRootfs</code></td></tr>
<tr><td>8</td><td><code>--cap-drop ALL</code>, <code>no-new-privileges</code></td><td><code>HostConfig.CapDrop</code></td></tr>
<tr><td>9</td><td>메모리 · CPU · PID 제한이 있다</td><td><code>docker stats</code></td></tr>
<tr><td>10</td><td><code>--privileged</code> · docker.sock 마운트가 없다</td><td><code>docker inspect</code></td></tr>
<tr><td>11</td><td>필요한 포트만 게시하고, DB 는 외부에 열지 않았다</td><td><code>docker ps</code> PORTS</td></tr>
<tr><td>12</td><td>기반 이미지를 주기적으로 다시 빌드 · 스캔한다</td><td>CI 일정</td></tr>
</table></div>

<div class="box trend"><div class="box-t">🚀 최신 동향</div>
Docker 는 보안 패치를 빠르게 반영하고 CVE 를 최소화한 <b>Docker Hardened Images</b> 를, Google 은 distroless 를, Chainguard 는 매일 다시 빌드하는 최소 이미지를 제공하는 등
"처음부터 안전한 기반 이미지"를 쓰는 흐름이 커지고 있습니다. 서명 · SBOM 을 기본으로 붙이는 레지스트리도 늘고 있습니다.
</div>

{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'alpine 컨테이너 nr 을 UID 1000 으로 실행하기',
      desc: '<code>nr</code> 이라는 이름으로 alpine 컨테이너를 백그라운드(<code>sleep 3600</code>)로 실행하되, root 가 아닌 <b>UID 1000 · GID 1000</b> 으로 실행하세요. <code>docker exec nr id</code> 로 확인해 보세요.',
      hint: '<code>docker run -d --name nr -u 1000:1000 alpine sleep 3600</code>',
      answer: ['docker run -d --name nr -u 1000:1000 alpine sleep 3600', 'docker exec nr id'],
      check: M => { const c = M.c('nr'); const u = (c && c.user) || ''; return M.running('nr') && !!u && !/^(root|0)(:|$)/.test(u); }
    },
    {
      id: 'm2',
      title: 'Dockerfile 에 USER 를 넣어 safe-app 이미지 만들기',
      desc: '📁 파일 준비(<code>~/safe-app</code>)의 Dockerfile 은 root 로 실행됩니다. <code>useradd</code> 로 사용자를 만들고 <code>USER</code> 로 바꾼 뒤 <code>safe-app</code> 이라는 이름으로 빌드하세요. <code>docker run --rm safe-app</code> 의 결과가 uid=0 이 아니어야 합니다.',
      hint: '<code>RUN useradd --create-home appuser</code> 와 <code>USER appuser</code> 두 줄을 넣고 <code>docker build -t safe-app .</code>',
      files: 'safe',
      answer: [
        'cd ~/safe-app',
        `printf 'FROM python:3.12-slim\\nRUN useradd --create-home appuser\\nWORKDIR /app\\nCOPY . .\\nUSER appuser\\nCMD ["id"]\\n' > Dockerfile`,
        'docker build -t safe-app .',
        'docker run --rm safe-app'
      ],
      check: M => { const img = M.image('safe-app'); const u = img && img.config && img.config.User; return !!u && !/^(root|0)(:|$)/.test(u); }
    },
    {
      id: 'm3',
      title: '읽기 전용 파일 시스템으로 nginx 실행하기',
      desc: '<code>ro-web</code> 이라는 이름으로 <code>nginx:alpine</code> 을 <b>--read-only</b> 로 실행하세요. nginx 가 써야 하는 <code>/tmp</code>, <code>/var/cache/nginx</code>, <code>/var/run</code> 은 tmpfs 로 열어 줍니다.',
      hint: '<code>docker run -d --name ro-web --read-only --tmpfs /tmp --tmpfs /var/cache/nginx --tmpfs /var/run nginx:alpine</code>',
      answer: ['docker run -d --name ro-web --read-only --tmpfs /tmp --tmpfs /var/cache/nginx --tmpfs /var/run nginx:alpine'],
      check: M => { const c = M.c('ro-web'); const t = M.mount('ro-web', '/tmp'); return M.running('ro-web') && !!c.hostConfig.readonly && !!t && t.type === 'tmpfs'; }
    },
    {
      id: 'm4',
      title: '오래된 nginx 와 최신 nginx 의 취약점 비교하기',
      desc: '<code>nginx:1.19</code> 와 <code>nginx:1.27-alpine</code> 을 받아서 각각 <code>docker scout</code>(quickview 또는 cves)로 스캔해 보세요. CRITICAL 개수가 어떻게 다른가요?',
      hint: '<code>docker pull nginx:1.19</code> → <code>docker scout quickview nginx:1.19</code>, 같은 방법으로 <code>nginx:1.27-alpine</code>',
      answer: ['docker pull nginx:1.19', 'docker pull nginx:1.27-alpine', 'docker scout quickview nginx:1.19', 'docker scout quickview nginx:1.27-alpine'],
      check: M => M.ran(/docker scout (quickview|cves|recommendations)\s+nginx:1\.19/) && M.ran(/docker scout (quickview|cves|recommendations)\s+nginx:1\.27-alpine/)
    },
    {
      id: 'm5', scenario: true,
      title: '이미지에 비밀번호가 새고 있다! 고쳐서 다시 빌드하기',
      desc: '⚙️ 상황 만들기를 누르면 <code>~/leaky</code> 의 Dockerfile 로 <code>leaky-app</code> 이미지가 빌드됩니다. <code>docker history leaky-app</code> 에 비밀번호가 보이고, 이미지 안에 <code>.env</code> 까지 들어 있습니다.<br>① Dockerfile 에서 ENV 비밀번호 줄을 지우고 ② <code>.dockerignore</code> 에 <code>.env</code> 를 넣어 ③ <code>leaky-app</code> 으로 다시 빌드한 뒤 ④ <code>--env-file .env</code> 로 비밀번호를 넣어 <code>leaky</code> 라는 이름의 컨테이너로 실행하세요.',
      hint: '파일 탭에서 <code>~/leaky/Dockerfile</code> 의 <code>ENV</code> 줄 삭제, <code>~/leaky/.dockerignore</code> 에 <code>.env</code> 한 줄. 그다음 <code>cd ~/leaky</code> → <code>docker build --no-cache -t leaky-app .</code> → <code>docker run --name leaky --env-file .env leaky-app</code>',
      files: 'leaky',
      setup: ['docker build -t leaky-app ~/leaky'],
      answer: [
        'cd ~/leaky',
        `printf 'FROM python:3.12-slim\\nWORKDIR /app\\nCOPY . .\\nCMD ["python", "app.py"]\\n' > Dockerfile`,
        `printf '.env\\n.git\\n' > .dockerignore`,
        'docker build --no-cache -t leaky-app .',
        'docker run --name leaky --env-file .env leaky-app'
      ],
      check: M => {
        const img = M.image('leaky-app'); const c = M.c('leaky');
        if (!img || !c) return false;
        const clean = !JSON.stringify(img.history || []).includes('SuperSecret');
        return clean && c.imageId === img.id && !!M.env('leaky', 'DB_PASSWORD') && M.cfile('leaky', '/app/.env') == null;
      }
    },
    {
      id: 'm6',
      title: '방패 다섯 겹 — hardened 컨테이너 만들기',
      desc: '<code>hardened</code> 라는 이름으로 alpine(<code>sleep 3600</code>)을 실행하되 다음을 모두 적용하세요: 읽기 전용 루트 + <code>/tmp</code> tmpfs, <code>--cap-drop ALL</code>, <code>no-new-privileges</code>, 메모리 256MB, PID 100개 제한, UID 1000:1000.',
      hint: '<code>docker run -d --name hardened --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true -m 256m --pids-limit 100 -u 1000:1000 alpine sleep 3600</code>',
      answer: ['docker run -d --name hardened --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true -m 256m --pids-limit 100 -u 1000:1000 alpine sleep 3600'],
      check: M => {
        const c = M.c('hardened'); if (!c || !M.running('hardened')) return false;
        const h = c.hostConfig; const u = c.user || '';
        return !!h.readonly && (h.capDrop || []).some(x => /^all$/i.test(x)) && h.memory > 0 && h.memory <= 256 * 1024 * 1024 && h.pidsLimit > 0 && !!u && !/^(root|0)(:|$)/.test(u);
      }
    },
    {
      id: 'm7', scenario: true,
      title: 'non-root 컨테이너에서 도구 설치가 안 된다',
      desc: '⚙️ 상황 만들기를 누르면 UID 1000 으로 도는 ubuntu 컨테이너 <code>tools</code> 가 만들어집니다. 디버깅하려고 <code>docker exec tools apt-get update</code> 를 하면 권한 오류가 납니다.<br>컨테이너를 root 로 다시 만들지 <b>말고</b>, 디버깅하는 순간에만 root 로 들어가 <code>curl</code> 을 설치하세요. (tools 는 계속 UID 1000 으로 실행 중이어야 합니다)',
      hint: '<code>docker exec -u root tools apt-get update</code> → <code>docker exec -u root tools apt-get install -y curl</code>',
      setup: ['docker run -d --name tools -u 1000:1000 ubuntu sleep 3600'],
      answer: ['docker exec -u root tools apt-get update', 'docker exec -u root tools apt-get install -y curl'],
      check: M => { const c = M.c('tools'); return M.running('tools') && !!c && c.user === '1000:1000' && M.D.hasTool(c, 'curl'); }
    }
  ],

  videos: [
    { title: 'Docker 보안 모범 사례 (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=docker+security+best+practices', desc: '검색 결과 — 컨테이너 보안 전반을 다룬 영상 모음' },
    { title: 'Docker Scout 로 이미지 취약점 찾기 (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=docker+scout+tutorial', desc: '검색 결과 — docker scout quickview · cves 사용법' },
    { title: 'Dockerfile non-root user (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=dockerfile+non+root+user', desc: '검색 결과 — USER 지시어와 권한 문제 해결' },
    { title: '도커 보안 (한국어 검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EB%B3%B4%EC%95%88', desc: '검색 결과 — 한국어로 된 도커 보안 강의' },
    { title: 'Sigstore cosign 이미지 서명 (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=sigstore+cosign+container+signing', desc: '검색 결과 — 공급망 보안과 이미지 서명' }
  ],

  terms: [
    ['공격 표면 (attack surface)', '공격자가 노릴 수 있는 모든 지점의 넓이. 이미지에 든 프로그램 · 열린 포트 · 권한이 많을수록 넓어진다.'],
    ['심층 방어 (defense in depth)', '한 가지 방어만 믿지 않고 여러 층의 방어를 겹쳐, 한 층이 뚫려도 피해를 줄이는 원칙.'],
    ['UID 0', '리눅스에서 root 사용자의 번호. 컨테이너 안의 root 도 기본적으로 호스트의 UID 0 과 같다.'],
    ['USER', 'Dockerfile 에서 이후 명령과 컨테이너 실행 사용자를 바꾸는 지시어. 실행 시 -u 로 덮어쓸 수 있다.'],
    ['distroless', '셸 · 패키지 관리자 없이 앱 실행에 필요한 파일만 담은 최소 이미지 (gcr.io/distroless/…).'],
    ['CVE', 'Common Vulnerabilities and Exposures. 공개된 보안 취약점에 붙이는 고유 번호 (예: CVE-2024-5535).'],
    ['Docker Scout', '이미지의 패키지를 분석해 CVE 와 개선된 기반 이미지를 알려 주는 Docker 의 도구 (docker scout …).'],
    ['capability', 'root 의 특권을 기능별로 쪼갠 단위 (NET_ADMIN, CHOWN, NET_BIND_SERVICE …). --cap-drop / --cap-add 로 조절.'],
    ['--read-only', '컨테이너의 루트 파일 시스템을 읽기 전용으로 마운트하는 옵션. 쓰기가 필요한 곳은 tmpfs · 볼륨으로.'],
    ['no-new-privileges', 'setuid 등으로 실행 중에 권한이 올라가는 것을 막는 보안 옵션 (--security-opt).'],
    ['secrets', '비밀번호 · 키를 이미지나 환경 변수가 아닌 파일(/run/secrets/…)로 컨테이너에 전달하는 방법.'],
    ['다이제스트 (digest)', '이미지 내용의 sha256 지문. 태그와 달리 절대 바뀌지 않아 버전 고정에 쓴다.'],
    ['SBOM', 'Software Bill of Materials. 이미지에 든 소프트웨어 부품과 버전의 목록(성분표).'],
    ['rootless 모드', 'Docker 데몬과 컨테이너를 root 권한 없이 일반 사용자로 실행하는 방식.']
  ],

  summary: [
    '컨테이너 보안은 이미지 · 빌드 · 실행 · 호스트 · 공급망 다섯 층을 겹쳐 지키는 심층 방어입니다.',
    '컨테이너 기본 사용자는 root(UID 0)입니다. Dockerfile 에 USER 를 넣거나 -u 1000:1000 으로 실행하고 id 로 확인하세요.',
    '작은 이미지(slim · alpine · distroless)는 공격 표면이 작고, docker scout 로 CVE 를 찾아 기반 이미지를 최신으로 바꿉니다.',
    'ENV 나 COPY 로 이미지에 넣은 비밀번호는 docker history · inspect 로 누구나 봅니다. .dockerignore + 런타임 --env-file · secrets 로 넣으세요.',
    '--read-only(+tmpfs), --cap-drop ALL, no-new-privileges, -m · --pids-limit 으로 실행 환경을 단단하게 만듭니다.',
    '--privileged 와 /var/run/docker.sock 마운트는 호스트 root 열쇠를 넘기는 것과 같습니다.',
    '공식 · Verified 이미지를 다이제스트로 고정하고, SBOM · 서명(cosign, Content Trust)으로 공급망을 검증합니다.'
  ],

  quiz: [
    {
      q: '아무 옵션 없이 docker run --rm alpine id 를 실행하면 어떤 결과가 나올까요?',
      options: ['uid=1000(user)', 'uid=0(root)', 'uid=65534(nobody)', '권한 오류로 실행되지 않는다'],
      answer: 1,
      explain: '컨테이너는 기본적으로 root(UID 0)로 실행됩니다. 그래서 USER 나 -u 로 일반 사용자를 지정하는 것이 모범 사례입니다.'
    },
    {
      q: 'Dockerfile 에 ENV DB_PASSWORD=abc 를 적고 빌드했습니다. 이 비밀번호를 볼 수 있는 방법이 아닌 것은?',
      options: ['docker history 이미지', 'docker inspect 이미지', '이미지로 만든 컨테이너에서 env 실행', 'docker scout quickview 이미지'],
      answer: 3,
      explain: 'ENV 값은 이미지 설정(Config.Env)과 history 에 남고, 컨테이너 환경 변수로도 보입니다. scout quickview 는 취약점 개수 요약을 보여 줍니다.'
    },
    {
      q: '.env 파일이 COPY . . 로 이미지에 들어가는 것을 막는 가장 적절한 방법은?',
      options: ['.env 파일 이름을 바꾼다', '.dockerignore 에 .env 를 적는다', 'COPY 대신 ADD 를 쓴다', '--no-cache 로 빌드한다'],
      answer: 1,
      explain: '.dockerignore 에 적힌 파일은 빌드 컨텍스트에서 빠지므로 COPY . . 로도 이미지에 들어가지 않습니다.'
    },
    {
      q: '다음 중 "호스트 root 권한을 사실상 넘겨주는" 위험한 설정은?',
      options: ['--read-only', '--cap-drop ALL', '-v /var/run/docker.sock:/var/run/docker.sock', '--pids-limit 100'],
      answer: 2,
      explain: 'docker.sock 을 가진 컨테이너는 Docker 엔진을 조종해 호스트 전체를 마운트한 새 컨테이너를 만들 수 있으므로 호스트 root 와 같습니다.'
    },
    {
      q: 'nginx 를 --read-only 로 실행했더니 바로 종료됩니다. 가장 알맞은 해결책은?',
      options: ['--privileged 를 붙인다', '쓰기가 필요한 /var/cache/nginx 등을 --tmpfs 로 열어 준다', '-u root 를 붙인다', '--read-only 대신 -m 을 쓴다'],
      answer: 1,
      explain: '읽기 전용 루트를 유지하면서, 앱이 꼭 써야 하는 경로만 tmpfs 나 볼륨으로 쓰기 가능하게 열어 주는 것이 정석입니다.'
    },
    {
      q: 'FROM nginx:1.27-alpine@sha256:… 처럼 다이제스트를 붙이는 이유는?',
      options: ['이미지 크기를 줄이려고', '빌드 속도를 높이려고', '태그가 다른 내용으로 바뀌어도 항상 같은 이미지를 쓰려고', '취약점이 자동으로 고쳐지게 하려고'],
      answer: 2,
      explain: '태그는 옮겨 붙일 수 있는 이름표지만, 다이제스트는 내용의 지문이라 바뀌지 않습니다. 대신 업데이트는 직접(또는 봇으로) 해야 합니다.'
    },
    {
      q: 'docker scout 결과가 "6C 31H 58M 120L" 입니다. 가장 먼저 할 일로 알맞은 것은?',
      options: ['LOW 120개부터 하나씩 고친다', 'recommendations 로 더 새로운 기반 이미지를 확인해 바꾼다', '스캔 결과를 무시하고 배포한다', '--privileged 로 실행한다'],
      answer: 1,
      explain: '대부분의 CVE 는 기반 이미지를 최신(또는 더 작은) 태그로 바꾸는 것만으로 사라집니다. CRITICAL · HIGH 부터 처리하세요.'
    }
  ]
});
