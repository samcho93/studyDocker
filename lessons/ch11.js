/* 11장 — 레지스트리와 이미지 배포 */
Course.lesson({
  id: 'ch11', no: '11',
  icon: '📤',
  title: '레지스트리와 이미지 배포',
  subtitle: '내가 만든 이미지를 다른 컴퓨터로 — tag · push · pull, 사설 레지스트리, 태그 전략, save · load, 멀티 플랫폼',
  level: '중급', time: '100분',
  goals: [
    '레지스트리 · 저장소(repository) · 태그 · 다이제스트의 관계를 설명하고 이미지 이름 전체 구조를 해석할 수 있다',
    'docker login · tag · push 로 Docker Hub 에 이미지를 올리고, denied 오류의 원인(로그인 · 네임스페이스)을 찾을 수 있다',
    'registry:2 로 사설 레지스트리를 띄워 push · pull 하고, /v2/_catalog 로 내용을 확인할 수 있다',
    'latest 대신 semver · git sha · 다이제스트를 쓰는 태그 전략을 세울 수 있다',
    'docker save · load 로 오프라인 전달을 하고, 멀티 플랫폼(amd64 · arm64) 이미지가 필요한 이유를 설명할 수 있다'
  ],
  chips: ['docker images', 'docker info', 'curl -s localhost:5000/v2/_catalog', 'docker buildx ls', 'docker logout'],

  figs: {
    /* ------------------------------------------------------------ 레지스트리 · 저장소 · 태그 */
    concepts: {
      caption: '레지스트리(도서관) 안에 저장소(책장)가 있고, 저장소 안에 태그(책 이름표)가 붙은 이미지들이 있습니다. 태그는 바뀔 수 있지만 다이제스트는 내용의 지문이라 바뀌지 않습니다',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="레지스트리 docker.io 안에 저장소 library/nginx 와 student/myapp 이 있고, 각 저장소에 태그 1.27, latest, 1.0, 1.1 이 있으며 태그는 다이제스트를 가리킴">
  <rect x="14" y="14" width="832" height="312" rx="16" class="blue"/>
  <text x="34" y="42" class="t-b t-blue">🏛️ 레지스트리 (registry) — docker.io · ghcr.io · localhost:5000 …</text>
  <rect x="34" y="62" width="390" height="248" rx="12" class="box"/>
  <text x="229" y="88" class="t-b t-c">📚 저장소 library/nginx</text>
  <rect x="54" y="106" width="120" height="34" rx="17" class="yellow"/>
  <text x="114" y="123" class="t-sm t-c t-mono t-b">1.27-alpine</text>
  <rect x="54" y="152" width="120" height="34" rx="17" class="yellow"/>
  <text x="114" y="169" class="t-sm t-c t-mono t-b">alpine</text>
  <rect x="54" y="198" width="120" height="34" rx="17" class="yellow"/>
  <text x="114" y="215" class="t-sm t-c t-mono t-b">latest</text>
  <rect x="236" y="120" width="170" height="44" rx="8" class="purple"/>
  <text x="321" y="137" class="t-xs t-c t-mono">sha256:a6b8…</text>
  <text x="321" y="154" class="t-xs t-c t-mu">alpine 이미지</text>
  <rect x="236" y="196" width="170" height="44" rx="8" class="purple"/>
  <text x="321" y="213" class="t-xs t-c t-mono">sha256:013f…</text>
  <text x="321" y="230" class="t-xs t-c t-mu">debian 이미지</text>
  <line x1="174" y1="123" x2="232" y2="137" class="ln ar"/>
  <line x1="174" y1="169" x2="232" y2="145" class="ln ar"/>
  <line x1="174" y1="215" x2="232" y2="217" class="ln ar"/>
  <text x="229" y="276" class="t-xs t-c t-mu">태그 여러 개가 같은 이미지를 가리킬 수 있음</text>
  <text x="229" y="296" class="t-xs t-c t-mu">library/ = Docker 공식 이미지 네임스페이스</text>
  <rect x="444" y="62" width="384" height="248" rx="12" class="box"/>
  <text x="636" y="88" class="t-b t-c">📚 저장소 student/myapp</text>
  <rect x="464" y="120" width="100" height="34" rx="17" class="yellow"/>
  <text x="514" y="137" class="t-sm t-c t-mono t-b">1.0</text>
  <rect x="464" y="176" width="100" height="34" rx="17" class="yellow"/>
  <text x="514" y="193" class="t-sm t-c t-mono t-b">1.1</text>
  <rect x="636" y="116" width="170" height="44" rx="8" class="purple"/>
  <text x="721" y="133" class="t-xs t-c t-mono">sha256:3f5c…</text>
  <text x="721" y="150" class="t-xs t-c t-mu">v1.0 내용</text>
  <rect x="636" y="172" width="170" height="44" rx="8" class="purple"/>
  <text x="721" y="189" class="t-xs t-c t-mono">sha256:9c1d…</text>
  <text x="721" y="206" class="t-xs t-c t-mu">v1.1 내용</text>
  <line x1="564" y1="137" x2="632" y2="137" class="ln ar"/>
  <line x1="564" y1="193" x2="632" y2="193" class="ln ar"/>
  <text x="636" y="262" class="t-xs t-c t-mu">student = 내 Docker ID (네임스페이스)</text>
  <text x="636" y="282" class="t-xs t-c t-mu">내 네임스페이스에만 push 할 수 있음</text>
</svg>`
    },

    /* ------------------------------------------------------------ 이미지 이름 구조 */
    name: {
      caption: '이미지 이름의 전체 모양 — 생략된 부분은 Docker 가 채웁니다. nginx 는 사실 docker.io/library/nginx:latest 입니다',
      svg: `<svg class="dg" viewBox="0 0 860 260" role="img" aria-label="이미지 이름 docker.io/library/nginx:1.27-alpine@sha256 을 레지스트리, 네임스페이스, 저장소, 태그, 다이제스트로 나눈 그림">
  <text x="430" y="50" class="t-xl t-c t-mono t-b"><tspan class="t-blue">docker.io</tspan>/<tspan class="t-teal">library</tspan>/<tspan class="t-green">nginx</tspan>:<tspan class="t-orange">1.27-alpine</tspan>@<tspan class="t-purple">sha256:a6b8…</tspan></text>
  <rect x="60" y="80" width="140" height="92" rx="10" class="blue"/>
  <text x="130" y="104" class="t-b t-c t-blue">레지스트리</text>
  <text x="130" y="128" class="t-xs t-c">어느 서버?</text>
  <text x="130" y="148" class="t-xs t-c t-mu">생략 → docker.io</text>
  <rect x="214" y="80" width="140" height="92" rx="10" class="teal"/>
  <text x="284" y="104" class="t-b t-c t-teal">네임스페이스</text>
  <text x="284" y="128" class="t-xs t-c">누구의?</text>
  <text x="284" y="148" class="t-xs t-c t-mu">생략 → library</text>
  <rect x="368" y="80" width="140" height="92" rx="10" class="green"/>
  <text x="438" y="104" class="t-b t-c t-green">저장소</text>
  <text x="438" y="128" class="t-xs t-c">무슨 프로그램?</text>
  <text x="438" y="148" class="t-xs t-c t-mu">필수</text>
  <rect x="522" y="80" width="140" height="92" rx="10" class="orange"/>
  <text x="592" y="104" class="t-b t-c t-orange">태그</text>
  <text x="592" y="128" class="t-xs t-c">어느 버전? (바뀜)</text>
  <text x="592" y="148" class="t-xs t-c t-mu">생략 → latest</text>
  <rect x="676" y="80" width="140" height="92" rx="10" class="purple"/>
  <text x="746" y="104" class="t-b t-c t-purple">다이제스트</text>
  <text x="746" y="128" class="t-xs t-c">내용의 지문 (불변)</text>
  <text x="746" y="148" class="t-xs t-c t-mu">선택</text>
  <rect x="60" y="192" width="756" height="52" rx="10" class="box"/>
  <text x="438" y="212" class="t-sm t-c t-mono">nginx  =  docker.io/library/nginx:latest</text>
  <text x="438" y="232" class="t-sm t-c t-mono">localhost:5000/myapp:1.0  →  레지스트리 localhost:5000 · 저장소 myapp · 태그 1.0</text>
</svg>`
    },

    /* ------------------------------------------------------------ 배포 흐름 */
    ship: {
      caption: '이미지 배포의 흐름 — 내 PC 에서 build · tag · push 하면, 서버 · 동료 PC · CI 는 pull 만으로 똑같은 이미지를 받습니다',
      svg: `<svg class="dg" viewBox="0 0 860 280" role="img" aria-label="내 PC에서 docker build, docker tag, docker push 로 레지스트리에 올리고, 서버와 동료 PC 가 docker pull 과 docker run 으로 같은 이미지를 실행">
  <rect x="14" y="30" width="300" height="220" rx="14" class="gray"/>
  <text x="164" y="56" class="t-b t-c">💻 내 PC</text>
  <rect x="34" y="72" width="260" height="36" rx="8" class="box"/>
  <text x="164" y="90" class="t-sm t-c t-mono">docker build -t myapp:1.0 .</text>
  <rect x="34" y="120" width="260" height="36" rx="8" class="box"/>
  <text x="164" y="138" class="t-xs t-c t-mono">docker tag myapp:1.0 student/myapp:1.0</text>
  <rect x="34" y="168" width="260" height="36" rx="8" class="s-blue"/>
  <text x="164" y="186" class="t-sm t-c t-mono tw">docker push student/myapp:1.0</text>
  <text x="164" y="228" class="t-xs t-c t-mu">(먼저 docker login)</text>
  <line x1="314" y1="186" x2="366" y2="150" class="ln-blue thick ar-blue"/>
  <rect x="372" y="90" width="150" height="110" rx="14" class="blue"/>
  <text x="447" y="120" class="t-b t-c t-blue">🏛️ 레지스트리</text>
  <text x="447" y="146" class="t-xs t-c t-mono">docker.io</text>
  <text x="447" y="166" class="t-xs t-c t-mono">student/myapp</text>
  <text x="447" y="184" class="t-xs t-c t-mono">:1.0</text>
  <line x1="522" y1="130" x2="570" y2="90" class="ln-green thick ar-green"/>
  <line x1="522" y1="160" x2="570" y2="200" class="ln-green thick ar-green"/>
  <rect x="576" y="40" width="270" height="96" rx="14" class="green"/>
  <text x="711" y="66" class="t-b t-c t-green">🖥️ 운영 서버</text>
  <text x="711" y="92" class="t-xs t-c t-mono">docker pull student/myapp:1.0</text>
  <text x="711" y="114" class="t-xs t-c t-mono">docker run -d … student/myapp:1.0</text>
  <rect x="576" y="152" width="270" height="96" rx="14" class="green"/>
  <text x="711" y="178" class="t-b t-c t-green">👩‍💻 동료 PC · CI</text>
  <text x="711" y="204" class="t-xs t-c t-mono">docker compose pull</text>
  <text x="711" y="226" class="t-xs t-c t-mu">빌드 없이 같은 이미지</text>
</svg>`
    },

    /* ------------------------------------------------------------ 태그 전략 */
    tags: {
      caption: '같은 이미지에 태그를 여러 개 붙일 수 있습니다. 1.4.2 · git sha 처럼 한 번 붙이면 옮기지 않는 태그(불변)와, latest · 1 처럼 새 버전으로 옮겨 가는 태그(가변)를 구분하세요',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="이미지 v1.4.1 과 v1.4.2 가 있고, 1.4.2, sha-3f2a9c1 태그는 고정, 1.4, 1, latest 태그는 새 이미지로 옮겨감">
  <rect x="40" y="120" width="200" height="80" rx="10" class="gray"/>
  <text x="140" y="148" class="t-b t-c">이미지 (지난주)</text>
  <text x="140" y="172" class="t-xs t-c t-mono">sha256:7c41…</text>
  <rect x="520" y="120" width="200" height="80" rx="10" class="purple"/>
  <text x="620" y="148" class="t-b t-c t-purple">이미지 (오늘)</text>
  <text x="620" y="172" class="t-xs t-c t-mono">sha256:3f5c…</text>
  <rect x="40" y="36" width="96" height="32" rx="16" class="green"/>
  <text x="88" y="52" class="t-xs t-c t-mono t-b">1.4.1</text>
  <rect x="144" y="36" width="130" height="32" rx="16" class="green"/>
  <text x="209" y="52" class="t-xs t-c t-mono t-b">sha-9b07e2d</text>
  <line x1="88" y1="68" x2="110" y2="118" class="ln-green ar-green"/>
  <line x1="209" y1="68" x2="180" y2="118" class="ln-green ar-green"/>
  <rect x="470" y="36" width="96" height="32" rx="16" class="green"/>
  <text x="518" y="52" class="t-xs t-c t-mono t-b">1.4.2</text>
  <rect x="576" y="36" width="130" height="32" rx="16" class="green"/>
  <text x="641" y="52" class="t-xs t-c t-mono t-b">sha-3f2a9c1</text>
  <line x1="518" y1="68" x2="580" y2="118" class="ln-green ar-green"/>
  <line x1="641" y1="68" x2="630" y2="118" class="ln-green ar-green"/>
  <text x="760" y="52" class="t-xs t-green t-b">🔒 불변 태그</text>
  <rect x="470" y="236" width="80" height="32" rx="16" class="orange"/>
  <text x="510" y="252" class="t-xs t-c t-mono t-b">1.4</text>
  <rect x="560" y="236" width="60" height="32" rx="16" class="orange"/>
  <text x="590" y="252" class="t-xs t-c t-mono t-b">1</text>
  <rect x="630" y="236" width="90" height="32" rx="16" class="orange"/>
  <text x="675" y="252" class="t-xs t-c t-mono t-b">latest</text>
  <line x1="510" y1="236" x2="580" y2="202" class="ln-orange ar-orange"/>
  <line x1="590" y1="236" x2="610" y2="202" class="ln-orange ar-orange"/>
  <line x1="675" y1="236" x2="650" y2="202" class="ln-orange ar-orange"/>
  <text x="760" y="252" class="t-xs t-orange t-b">🔁 가변 태그</text>
  <path d="M 250 250 C 330 290, 400 290, 462 256" class="ln-orange dash ar-orange" fill="none"/>
  <text x="340" y="244" class="t-xs t-c t-orange">어제까지는 여기를 가리켰음</text>
  <line x1="240" y1="160" x2="512" y2="160" class="ln dash thin"/>
  <text x="376" y="150" class="t-xs t-c t-mu">새 버전 빌드 · push</text>
</svg>`
    },

    /* ------------------------------------------------------------ 멀티 플랫폼 */
    platform: {
      caption: '멀티 플랫폼 이미지 — 태그 하나(목록 · manifest list) 아래에 CPU 종류별 이미지가 들어 있고, pull 하는 컴퓨터가 자기에게 맞는 것을 고릅니다',
      svg: `<svg class="dg" viewBox="0 0 860 280" role="img" aria-label="태그 student/myapp:1.0 이 manifest list 로 linux/amd64 와 linux/arm64 이미지를 가리키고, 인텔 PC 는 amd64, 맥 M 칩과 라즈베리파이는 arm64 를 받음">
  <rect x="300" y="20" width="260" height="60" rx="12" class="s-blue"/>
  <text x="430" y="44" class="t-b t-c tw t-mono">student/myapp:1.0</text>
  <text x="430" y="66" class="t-xs t-c tw">manifest list (목록)</text>
  <line x1="380" y1="80" x2="250" y2="120" class="ln thick ar"/>
  <line x1="480" y1="80" x2="610" y2="120" class="ln thick ar"/>
  <rect x="140" y="124" width="220" height="60" rx="10" class="purple"/>
  <text x="250" y="148" class="t-b t-c t-purple t-mono">linux/amd64</text>
  <text x="250" y="170" class="t-xs t-c">x86-64 용 레이어</text>
  <rect x="500" y="124" width="220" height="60" rx="10" class="purple"/>
  <text x="610" y="148" class="t-b t-c t-purple t-mono">linux/arm64</text>
  <text x="610" y="170" class="t-xs t-c">ARM 64비트용 레이어</text>
  <line x1="250" y1="184" x2="250" y2="214" class="ln-green thick ar-green"/>
  <line x1="610" y1="184" x2="610" y2="214" class="ln-green thick ar-green"/>
  <rect x="100" y="218" width="300" height="46" rx="10" class="green"/>
  <text x="250" y="246" class="t-sm t-c">💻 인텔 · AMD PC, 대부분의 클라우드 VM</text>
  <rect x="460" y="218" width="300" height="46" rx="10" class="green"/>
  <text x="610" y="246" class="t-sm t-c">🍎 맥 M 칩 · 라즈베리파이 · ARM 서버</text>
</svg>`
    }
  },

  files: {
    myapp: {
      '~/myapp/Dockerfile': `FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html
`,
      '~/myapp/index.html': `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>myapp</title></head>
<body>
  <h1>myapp v1.0 📦</h1>
  <p>레지스트리를 거쳐 배달된 이미지입니다.</p>
</body>
</html>
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '레지스트리 · 저장소 · 태그 — 이미지는 어디에 사는가',
      html: `
<p>지금까지 <code>docker pull nginx</code> 로 이미지를 받아 왔습니다. 그 이미지는 어디에 있었을까요? <b>레지스트리(registry)</b>라는 이미지 보관 서버입니다.
내가 만든 이미지도 레지스트리에 올려(<b>push</b>) 두면 서버 · 동료 · CI 가 받아(<b>pull</b>) 쓸 수 있습니다.</p>
{{fig:concepts}}
<div class="tbl-wrap"><table class="tbl">
<tr><th>용어</th><th>뜻</th><th>예</th></tr>
<tr><td><b>레지스트리</b> (registry)</td><td>이미지를 보관 · 배포하는 서버</td><td>docker.io(Docker Hub) · ghcr.io · localhost:5000</td></tr>
<tr><td><b>저장소</b> (repository)</td><td>같은 프로그램의 여러 버전 이미지 묶음</td><td>library/nginx · student/myapp</td></tr>
<tr><td><b>태그</b> (tag)</td><td>저장소 안에서 버전을 가리키는 <b>이름표</b> (옮길 수 있음)</td><td>1.27-alpine · 1.0 · latest</td></tr>
<tr><td><b>다이제스트</b> (digest)</td><td>이미지 내용으로 계산한 <b>지문</b>(sha256). 내용이 같으면 같고, 1바이트만 달라도 다름</td><td>sha256:a6b806a0…</td></tr>
</table></div>
<div class="box analogy"><div class="box-t">🍳 비유 — 도서관</div>
레지스트리는 <b>도서관</b>, 저장소는 <b>책장</b>(예: "해리 포터" 칸), 태그는 책등에 붙인 <b>이름표</b>("1권", "최신판")입니다.
"최신판" 이름표는 새 책이 나오면 옮겨 붙이지만, 책의 <b>ISBN(다이제스트)</b>은 그 책 내용에만 붙는 번호라 절대 바뀌지 않습니다.
정확히 같은 책을 다시 빌리고 싶다면 이름표가 아니라 ISBN 으로 찾아야겠지요.</div>
<p>지금 가진 이미지의 태그와 다이제스트를 확인해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull nginx:1.27-alpine
docker image inspect --format '{{json .RepoTags}} {{json .RepoDigests}}' nginx:1.27-alpine</code></pre>
<pre class="code out" data-lang="출력"><code>["nginx:1.27-alpine"] ["nginx@sha256:a6b806a0a45efa5a988d46a6967be4267c3439ebf41c29fd831552d98e278451"]</code></pre>
<div class="box note"><div class="box-t">📌 이미지 ID 와 다이제스트는 다릅니다</div>
<code>docker images</code> 의 IMAGE ID 는 <b>내 PC 안에서</b> 이미지를 구별하는 번호이고, 다이제스트는 <b>레지스트리에 올라간 형태(매니페스트)</b>의 지문입니다.
다른 사람과 "같은 이미지"를 확인할 때는 다이제스트를 씁니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: '이미지 이름의 전체 구조 — docker.io/library/nginx:latest',
      html: `
<p>우리가 짧게 쓰는 <code>nginx</code> 는 사실 줄임말입니다. Docker 는 빠진 부분을 규칙대로 채웁니다.</p>
{{fig:name}}
<div class="tbl-wrap"><table class="tbl">
<tr><th>짧게 쓴 이름</th><th>Docker 가 이해하는 전체 이름</th><th>어디서?</th></tr>
<tr><td><code>nginx</code></td><td><code>docker.io/library/nginx:latest</code></td><td>Docker Hub 공식 이미지</td></tr>
<tr><td><code>redis:7-alpine</code></td><td><code>docker.io/library/redis:7-alpine</code></td><td>Docker Hub 공식 이미지</td></tr>
<tr><td><code>traefik/whoami</code></td><td><code>docker.io/traefik/whoami:latest</code></td><td>Docker Hub · traefik 조직</td></tr>
<tr><td><code>student/myapp:1.0</code></td><td><code>docker.io/student/myapp:1.0</code></td><td>Docker Hub · student 사용자</td></tr>
<tr><td><code>ghcr.io/octocat/myapp:1.0</code></td><td>(그대로)</td><td>GitHub Container Registry</td></tr>
<tr><td><code>localhost:5000/myapp:1.0</code></td><td>(그대로)</td><td>내 PC 의 사설 레지스트리</td></tr>
</table></div>
<p>규칙은 간단합니다. <b>첫 부분에 점(.)이나 콜론(:)이 있거나 localhost 이면 레지스트리 주소</b>, 아니면 Docker Hub 입니다.
그래서 <code>docker tag</code> 로 이름을 바꾸는 것만으로 "어느 레지스트리의 어느 저장소로 보낼지"가 정해집니다.</p>
<div class="box warn"><div class="box-t">⚠️ 이름 규칙</div>
저장소 이름은 <b>소문자</b> · 숫자 · <code>. _ -</code> 만 씁니다. <code>MyApp</code> 처럼 대문자를 쓰면
<code>invalid reference format: repository name must be lowercase</code> 오류가 납니다. 태그는 대소문자 · 숫자 · <code>. _ -</code> 로 128자까지 가능합니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker tag nginx:1.27-alpine MyApp:1.0</code></pre>
<pre class="code out" data-lang="출력"><code>Error parsing reference: "MyApp:1.0" is not a valid repository/tag: invalid reference format: repository name must be lowercase</code></pre>
<p>의도한 오류입니다. 소문자로 바꾸면 해결됩니다.</p>`
    },

    /* ================================================================ 3 */
    {
      title: 'Docker Hub 에 올리기 — login · tag · push, 그리고 denied',
      html: `
<p>배포할 작은 이미지를 하나 만듭시다. nginx 에 내 HTML 을 얹은 이미지입니다.</p>
{{widget:files|set=myapp|cd=~/myapp|title=배포 연습용 myapp}}
<div class="two">
<div><pre class="code" data-lang="Dockerfile" data-file="~/myapp/Dockerfile"><code>FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html</code></pre></div>
<div><pre class="code" data-lang="html" data-file="~/myapp/index.html"><code>&lt;!DOCTYPE html&gt;
&lt;html lang="ko"&gt;
&lt;head&gt;&lt;meta charset="utf-8"&gt;&lt;title&gt;myapp&lt;/title&gt;&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;myapp v1.0 📦&lt;/h1&gt;
  &lt;p&gt;레지스트리를 거쳐 배달된 이미지입니다.&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/myapp
docker build -t myapp:1.0 .
docker push myapp:1.0</code></pre>
<pre class="code out" data-lang="출력"><code>The push refers to repository [docker.io/library/myapp]
cc07d20d040a: Preparing
cb07d07a65d2: Preparing
fb9728a91815: Preparing
denied: requested access to the resource is denied</code></pre>
<p>의도한 오류입니다. <code>myapp:1.0</code> 은 <code>docker.io/<b>library</b>/myapp</code> 으로 해석되는데, <code>library</code> 는 Docker 공식 이미지만 쓰는 자리입니다.
게다가 아직 로그인도 안 했지요. Docker Hub 에 올리려면 두 가지가 필요합니다.</p>
<ol class="steps-list">
  <li><b>로그인</b> — <code>docker login</code> 으로 내 Docker ID 를 알려 줍니다.</li>
  <li><b>내 네임스페이스로 태그</b> — <code>docker tag myapp:1.0 <i>내ID</i>/myapp:1.0</code>. 태그는 사본이 아니라 <b>이름표를 하나 더</b> 붙이는 것이라 공간을 차지하지 않습니다.</li>
</ol>
<div class="box warn"><div class="box-t">⚠️ 이 실습 터미널에 진짜 비밀번호를 넣지 마세요</div>
이 시뮬레이터의 <code>docker login</code> 은 <b>아무 이름 · 아무 비밀번호</b>로 로그인됩니다. 실제 Docker Hub 계정 정보는 절대 입력하지 마세요.
아래 예시는 사용자 이름을 <code>student</code> 로 씁니다. 실제 PC 에서는 그 자리에 여러분의 Docker ID 를 쓰고,
비밀번호 대신 Docker Hub 에서 만든 <b>개인 액세스 토큰</b>(Personal Access Token)을 입력하세요.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker login -u student
docker tag myapp:1.0 student/myapp:1.0
docker push student/myapp:1.0</code></pre>
<pre class="code out" data-lang="출력"><code>Password:
WARNING! Your password will be stored unencrypted in /home/student/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credential-stores

Login Succeeded
The push refers to repository [docker.io/student/myapp]
fb9728a91815: Pushed
cb07d07a65d2: Pushed
cc07d20d040a: Pushed
51abee3c58a2: Pushed
1.0: digest: sha256:3f5c79f93b183227f07471d370b937494b82cd0602b6a986a20958183165dc44 size: 2040</code></pre>
<p>레이어별로 올라가고, 마지막 줄에 <b>다이제스트</b>가 나옵니다. 실제 Docker Hub 에서는 nginx 에서 온 바닥 레이어들이 <code>Mounted from library/nginx</code> 로 표시되는데,
레지스트리에 이미 있는 레이어는 다시 올리지 않고 연결만 하기 때문입니다.</p>
{{fig:ship}}
<h4>denied 가 나오는 경우 정리</h4>
<div class="tbl-wrap"><table class="tbl">
<tr><th>상황</th><th>메시지</th><th>해결</th></tr>
<tr><td>로그인 안 함</td><td><code>denied: requested access to the resource is denied</code></td><td><code>docker login</code></td></tr>
<tr><td>네임스페이스 없이 push (<code>myapp:1.0</code>)</td><td>같음 (library 로 해석)</td><td><code>docker tag myapp:1.0 내ID/myapp:1.0</code></td></tr>
<tr><td>남의 네임스페이스 (<code>otherteam/myapp</code>)</td><td>같음</td><td>내 ID 또는 권한 있는 조직 이름으로 태그</td></tr>
<tr><td>태그를 안 붙이고 push (<code>docker push student/myapp:1.0</code>)</td><td><code>An image does not exist locally with the tag</code></td><td>먼저 <code>docker tag</code></td></tr>
<tr><td>없는 이미지를 pull</td><td><code>pull access denied … repository does not exist or may require 'docker login'</code></td><td>이름 오타 · 비공개 저장소면 로그인</td></tr>
</table></div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker info | grep Username
docker logout</code></pre>
<div class="box tip"><div class="box-t">💡 CI 에서는 --password-stdin</div>
<code>docker login -u 이름 -p 비밀번호</code> 는 명령 기록에 비밀번호가 남아 경고가 나옵니다. 자동화에서는
<code>echo "$DOCKERHUB_TOKEN" | docker login -u 이름 --password-stdin</code> 처럼 표준 입력으로 넘깁니다(16장 GitHub Actions).</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'Docker Hub 말고도 — GHCR · ECR 등 여러 레지스트리',
      html: `
<p>레지스트리는 표준 규격(<b>OCI Distribution</b>)을 따르므로 명령은 모두 같습니다. <b>이름 앞의 레지스트리 주소</b>와 <b>로그인 방법</b>만 다릅니다.</p>
<div class="tbl-wrap"><table class="tbl cmp">
<tr><th>레지스트리</th><th>주소 예</th><th>로그인</th><th>어울리는 곳</th></tr>
<tr><td><b>Docker Hub</b></td><td><code>docker.io/내ID/앱</code></td><td>Docker ID + 액세스 토큰</td><td>공개 이미지 · 기본값</td></tr>
<tr><td><b>GitHub Container Registry</b></td><td><code>ghcr.io/계정/앱</code></td><td>GitHub 토큰(packages 권한)</td><td>코드가 GitHub 에 있을 때 · Actions 연동</td></tr>
<tr><td><b>Amazon ECR</b></td><td><code>계정ID.dkr.ecr.리전.amazonaws.com/앱</code></td><td><code>aws ecr get-login-password</code></td><td>AWS 에서 운영</td></tr>
<tr><td><b>Google Artifact Registry</b></td><td><code>리전-docker.pkg.dev/프로젝트/저장소/앱</code></td><td><code>gcloud auth configure-docker</code></td><td>Google Cloud</td></tr>
<tr><td><b>Azure Container Registry</b></td><td><code>이름.azurecr.io/앱</code></td><td><code>az acr login</code></td><td>Azure</td></tr>
<tr><td><b>Harbor · registry:2</b></td><td><code>내서버:포트/앱</code></td><td>직접 운영</td><td>사내망 · 오프라인 · 비용 절감</td></tr>
</table></div>
<p>예를 들어 GHCR 과 ECR 로 올리는 모습은 이렇습니다. (실제 계정이 필요하므로 여기서는 읽기만 하세요.)</p>
<pre class="code" data-lang="bash"><code><span class="cm"># GitHub Container Registry</span>
echo "$GITHUB_TOKEN" | docker login ghcr.io -u octocat --password-stdin
docker tag myapp:1.0 ghcr.io/octocat/myapp:1.0
docker push ghcr.io/octocat/myapp:1.0

<span class="cm"># Amazon ECR (AWS CLI 필요)</span>
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-northeast-2.amazonaws.com
docker tag myapp:1.0 123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0
docker push 123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:1.0</code></pre>
<div class="cards c3">
  <div class="card blue"><div class="ci">🌍</div><b>공개(public)</b><p>누구나 pull. 오픈소스 · 공부용. 비밀 정보가 이미지에 들어가지 않았는지 꼭 확인</p></div>
  <div class="card orange"><div class="ci">🔐</div><b>비공개(private)</b><p>로그인한 권한자만 pull. 회사 앱은 보통 이쪽</p></div>
  <div class="card purple"><div class="ci">🏢</div><b>클라우드 레지스트리</b><p>같은 클라우드의 서버가 빠르게 받고, 권한을 클라우드 계정(IAM)으로 관리</p></div>
</div>
<div class="box note"><div class="box-t">📌 Docker Hub 의 pull 제한</div>
Docker Hub 는 로그인하지 않은 사용자의 pull 횟수를 제한합니다. CI 에서 이미지를 자주 받는다면 로그인해서 받거나,
자주 쓰는 베이스 이미지를 사내 레지스트리 · 클라우드 레지스트리에 복사(미러)해 두는 경우가 많습니다. 정확한 한도는 Docker 공식 문서에서 확인하세요.</div>`
    },

    /* ================================================================ 5 */
    {
      title: '사설 레지스트리 — registry:2 로 내 PC 에 도서관 차리기',
      html: `
<p>레지스트리 서버 자체도 컨테이너 이미지(<code>registry:2</code>, CNCF Distribution)로 제공됩니다. 한 줄이면 내 PC 에 레지스트리가 생깁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d -p 5000:5000 --name registry registry:2
curl -s localhost:5000/v2/_catalog</code></pre>
<pre class="code out" data-lang="출력"><code>…
Status: Downloaded newer image for registry:2
c9b35a366e83f6c44d02ebf9340234e9b2cad0f7285564fc55fc2fb8cce99bed
{"repositories":[]}</code></pre>
<p>이제 이미지 이름 앞에 <code>localhost:5000/</code> 을 붙여 태그하면, push 가 Docker Hub 가 아니라 <b>이 레지스트리</b>로 갑니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/myapp
docker tag myapp:1.0 localhost:5000/myapp:1.0
docker push localhost:5000/myapp:1.0
curl -s localhost:5000/v2/_catalog
curl -s localhost:5000/v2/myapp/tags/list</code></pre>
<pre class="code out" data-lang="출력"><code>The push refers to repository [localhost:5000/myapp]
fb9728a91815: Pushed
cb07d07a65d2: Pushed
cc07d20d040a: Pushed
51abee3c58a2: Pushed
1.0: digest: sha256:3f5c79f93b183227f07471d370b937494b82cd0602b6a986a20958183165dc44 size: 2040
{"repositories":["myapp"]}
{"name":"myapp","tags":["1.0"]}</code></pre>
<p>로그인 없이 올라갔습니다(이 레지스트리에는 인증을 설정하지 않았으니까요). 레지스트리는 <b>HTTP API</b>(<code>/v2/...</code>)로 대화하는 웹 서버라는 것도 curl 로 확인했습니다.
이제 내 PC 의 이미지를 지우고, 레지스트리에서 다시 받아 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rmi localhost:5000/myapp:1.0
docker pull localhost:5000/myapp:1.0
docker run -d --name app -p 8080:80 localhost:5000/myapp:1.0
curl -s localhost:8080</code></pre>
<pre class="code out" data-lang="출력"><code>Untagged: localhost:5000/myapp:1.0
…
1.0: Pulling from localhost:5000/myapp
…
Status: Downloaded newer image for localhost:5000/myapp:1.0
localhost:5000/myapp:1.0
…
&lt;h1&gt;myapp v1.0 📦&lt;/h1&gt;</code></pre>
<p>{{widget:open|url=http://localhost:8080/}} {{widget:open|pane=dash}}</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 동네 택배 보관함</div>
Docker Hub 가 전국 택배 회사라면, registry:2 는 <b>우리 아파트 1층 택배 보관함</b>입니다. 멀리 보내지 않아도 되고 빠르지만,
보관함 관리(용량 · 잠금 · 백업)는 내가 해야 합니다.</div>
<div class="box warn"><div class="box-t">⚠️ 실제로 운영하려면</div>
<ul>
  <li><b>데이터 보존</b>: 이미지는 컨테이너 안 <code>/var/lib/registry</code> 에 쌓입니다. <code>-v registry-data:/var/lib/registry</code> 로 볼륨을 연결하세요.</li>
  <li><b>HTTPS</b>: Docker 는 <code>localhost</code> 가 아닌 레지스트리에는 HTTPS 를 요구합니다. 다른 PC 에서 <code>192.168.0.10:5000</code> 으로 push 하면
  <code>http: server gave HTTP response to HTTPS client</code> 오류가 납니다. 인증서를 달거나(권장), 테스트용이면 daemon.json 의 <code>insecure-registries</code> 에 등록합니다.</li>
  <li><b>인증 · 웹 화면 · 취약점 스캔</b>이 필요하면 <b>Harbor</b> 같은 레지스트리 제품을 씁니다.</li>
</ul></div>`
    },

    /* ================================================================ 6 */
    {
      title: '태그 전략 — latest 금지, semver · git sha · 다이제스트',
      html: `
<p><code>latest</code> 는 "가장 최신"이라는 뜻이 아니라 <b>태그를 안 적었을 때 붙는 기본 이름</b>일 뿐입니다. 누군가 새 이미지를 push 하면 조용히 다른 이미지를 가리키게 됩니다.
어제와 오늘 <code>myapp:latest</code> 의 내용이 다를 수 있으니, 운영 서버에서 "무엇이 돌고 있는지" 알 수 없고 되돌리기도 어렵습니다.</p>
{{fig:tags}}
<div class="tbl-wrap"><table class="tbl">
<tr><th>방식</th><th>예</th><th>장점</th><th>쓰는 곳</th></tr>
<tr><td><b>시맨틱 버전</b> (semver)</td><td><code>1.4.2</code> · <code>1.4</code> · <code>1</code></td><td>사람이 읽기 쉬움. 1.4 는 최신 패치, 1 은 최신 1.x</td><td>릴리스 · 공개 이미지</td></tr>
<tr><td><b>git 커밋 해시</b></td><td><code>sha-3f2a9c1</code></td><td>어떤 코드로 만들었는지 정확히 추적</td><td>CI 가 매 커밋마다 빌드</td></tr>
<tr><td><b>날짜 · 빌드 번호</b></td><td><code>2026.09.26-1</code></td><td>정렬 쉬움</td><td>사내 배포</td></tr>
<tr><td><b>다이제스트 고정</b></td><td><code>@sha256:3f5c…</code></td><td><b>절대 안 바뀜</b> — 가장 확실</td><td>운영 배포 · 보안 민감</td></tr>
<tr><td><code>latest</code></td><td>(기본값)</td><td>편함</td><td><span class="tag red">운영에는 쓰지 않기</span></td></tr>
</table></div>
<p>한 번 빌드한 이미지에 semver 태그 여러 개를 붙여 올려 봅시다. 같은 이미지라 추가 용량은 들지 않습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker tag myapp:1.0 localhost:5000/myapp:1.0.0
docker tag myapp:1.0 localhost:5000/myapp:1
docker push localhost:5000/myapp:1.0.0
docker push localhost:5000/myapp:1
curl -s localhost:5000/v2/myapp/tags/list
docker image inspect --format '{{json .RepoDigests}}' myapp:1.0</code></pre>
<pre class="code out" data-lang="출력"><code>…
{"name":"myapp","tags":["1.0","1.0.0","1"]}
["student/myapp@sha256:3f5c79f93b183227f07471d370b937494b82cd0602b6a986a20958183165dc44","localhost:5000/myapp@sha256:3f5c79f93b183227f07471d370b937494b82cd0602b6a986a20958183165dc44"]</code></pre>
<p>Docker Hub 에 올린 student/myapp 과 localhost:5000/myapp 의 다이제스트가 똑같습니다 — 내용이 같으면 지문도 같으니까요. 세 태그 역시 <b>이름표만 셋, 이미지는 하나</b>입니다. 운영 서버에서 "정확히 이 이미지"를 받으려면 다이제스트로 pull 합니다.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># 태그 대신 다이제스트로 고정해서 받기</span>
docker pull localhost:5000/myapp@sha256:3f5c79f93b183227f07471d370b937494b82cd0602b6a986a20958183165dc44
<span class="cm"># compose.yaml 에서도: 태그는 사람이 읽으라고, 다이제스트는 고정용</span>
<span class="cm">#   image: nginx:1.27-alpine@sha256:a6b806a0a45e…</span></code></pre>
<div class="box note"><div class="box-t">📌 이 실습 환경의 한계</div>
이 시뮬레이터는 <code>이름@sha256:…</code> 형식의 pull 을 지원하지 않아 위 블록은 실행 버튼 없이 두었습니다. 실제 Docker 에서는 그대로 동작합니다.</div>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 불변 태그(immutable tags)</div>
Docker Hub · ECR · Harbor 등은 "한 번 올린 태그는 덮어쓰지 못하게" 하는 <b>불변 태그</b> 설정을 제공합니다(서비스마다 이름 · 방법은 다름).
<code>1.4.2</code> 를 실수로 다른 이미지로 덮어쓰는 사고를 막아 줍니다. CI 는 보통 <b>git sha 태그 + semver 태그</b>를 함께 붙여 push 합니다(16장).</div>`
    },

    /* ================================================================ 7 */
    {
      title: 'docker save · load — 인터넷 없이 이미지 전달하기',
      html: `
<p>보안 때문에 인터넷이 막힌 서버, 레지스트리에 접근할 수 없는 현장 장비… 이럴 때는 이미지를 <b>파일(tar)</b>로 만들어 USB 등으로 옮깁니다.</p>
<div class="flow">
  <div class="fb blue"><span class="fi">💻</span><b>docker save</b>이미지 → tar 파일</div>
  <div class="fb orange"><span class="fi">💾</span><b>USB · scp</b>파일 복사</div>
  <div class="fb green"><span class="fi">🖥️</span><b>docker load</b>tar 파일 → 이미지</div>
</div>
<p>다른 PC 로 옮기는 상황을 흉내 내려고, 저장한 뒤 이미지를 지우고 파일에서 다시 불러와 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull redis:7-alpine
docker save -o ~/redis.tar redis:7-alpine
ls -lh ~
docker rmi redis:7-alpine
docker load -i ~/redis.tar
docker images redis</code></pre>
<pre class="code out" data-lang="출력"><code>…
-rw-r--r-- 1 student student  2647 Sep 26 03:25 redis.tar
Untagged: redis:7-alpine
Untagged: redis@sha256:0d1e4c56757bfd28cbaffcb7c68fbf73fdc073d976270a8587eea30902ae5873
Deleted: sha256:f7ff247ec06cdee8f16862ede53de01740e97f3c0a1818707104a89cb0ca5f88
…
Loaded image: redis:7-alpine
REPOSITORY   TAG        IMAGE ID       CREATED       SIZE
redis        7-alpine   f7ff247ec06c   2 weeks ago   41.2MB</code></pre>
<p>(시뮬레이터의 tar 파일은 크기가 작게 보이지만, 실제로는 이미지 크기만큼 큽니다.) 레이어 · 태그 · 설정이 모두 들어 있어서 받은 쪽에서 <code>docker run</code> 을 바로 할 수 있습니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>대상</th><th>결과</th></tr>
<tr><td><code>docker save</code> / <code>load</code></td><td><b>이미지</b></td><td>레이어 · 태그 · 히스토리 보존. 여러 이미지를 한 파일에: <code>docker save -o all.tar nginx redis</code></td></tr>
<tr><td><code>docker export</code> / <code>import</code></td><td><b>컨테이너</b>의 파일 시스템</td><td>한 층으로 납작해지고 CMD · ENV 등 설정이 사라짐 — 배포용으로는 부적합</td></tr>
</table></div>
<pre class="code" data-lang="bash"><code><span class="cm"># 실제로는 압축해서 옮기면 훨씬 작아집니다</span>
docker save myapp:1.0 | gzip &gt; myapp-1.0.tar.gz
<span class="cm"># 받는 쪽 (load 는 gzip 도 바로 읽음)</span>
docker load -i myapp-1.0.tar.gz</code></pre>
<div class="box tip"><div class="box-t">💡 언제 save/load, 언제 레지스트리?</div>
사람이 가끔 옮기는 일회성 전달이면 save/load 가 간단합니다. 하지만 버전 관리 · 여러 서버 배포 · 필요한 레이어만 받기(중복 제거)는
레지스트리가 훨씬 효율적입니다. 오프라인 현장이라면 그 안에 <b>사설 레지스트리</b>를 두고 save/load 로 "처음 한 번" 채우는 방식도 씁니다.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '멀티 플랫폼 이미지 — amd64 와 arm64 를 한 태그로',
      html: `
<p>이미지 안의 프로그램은 특정 <b>CPU 종류(아키텍처)</b>용으로 컴파일되어 있습니다. 인텔 · AMD PC 는 <code>amd64</code>(x86-64),
맥 M 칩 · 라즈베리파이 · AWS Graviton 같은 ARM 서버는 <code>arm64</code> 입니다. 맥에서 만든 이미지를 인텔 서버에서 돌리면 이런 오류를 만날 수 있습니다.</p>
<pre class="code out" data-lang="출력"><code>exec /usr/local/bin/python: exec format error</code></pre>
<p>공식 이미지(nginx · python …)는 한 태그 아래 여러 아키텍처 이미지를 담은 <b>매니페스트 목록</b>(manifest list, OCI image index)으로 올라가 있어서,
어느 컴퓨터에서 pull 해도 자기에게 맞는 이미지를 받습니다.</p>
{{fig:platform}}
<pre class="code" data-lang="bash" data-run="sh"><code>docker image inspect --format '{{.Os}}/{{.Architecture}}' nginx:1.27-alpine
docker buildx ls</code></pre>
<pre class="code out" data-lang="출력"><code>linux/amd64
NAME/NODE     DRIVER/ENDPOINT   STATUS    BUILDKIT   PLATFORMS
default*      docker
 \\_ default    \\_ default       running   v0.17.3    linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/arm64, linux/riscv64, linux/ppc64le, linux/s390x, linux/386, linux/arm/v7, linux/arm/v6</code></pre>
<p>내 이미지도 여러 플랫폼용으로 만들려면 <b>buildx</b>(BuildKit 기반 빌더)의 <code>--platform</code> 옵션을 씁니다.
다른 아키텍처는 QEMU 에뮬레이션(느림)이나 해당 CPU 의 원격 빌더로 빌드하고, 결과를 매니페스트 목록으로 묶어 <b>레지스트리에 바로 push</b> 합니다.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># 멀티 플랫폼 빌더 준비 (한 번만)</span>
docker buildx create --name multi --use
<span class="cm"># amd64 + arm64 를 한 번에 빌드해서 push</span>
docker buildx build --platform linux/amd64,linux/arm64 -t student/myapp:1.1 --push .
<span class="cm"># 올라간 목록 확인</span>
docker buildx imagetools inspect student/myapp:1.1</code></pre>
<div class="box note"><div class="box-t">📌 왜 --push 를 같이 쓸까?</div>
여러 아키텍처 이미지를 묶은 "목록"은 기본 이미지 저장소(<code>docker images</code>)에 한꺼번에 담을 수 없는 경우가 많아, 보통 빌드하면서 바로 레지스트리로 보냅니다.
(Docker Desktop 의 containerd 이미지 저장소를 켜면 로컬에도 담을 수 있습니다.) 이 시뮬레이터는 멀티 플랫폼 빌드를 지원하지 않으니 위 명령은 실제 PC 에서 해 보세요.</div>
<div class="box trend"><div class="box-t">🚀 13장 예고 — 믿을 수 있는 이미지</div>
레지스트리에서 받은 이미지가 <b>정말 우리가 만든 그 이미지</b>인지, 안에 <b>무엇이 들어 있는지</b>는 어떻게 알까요?
13장에서 이미지 <b>서명</b>(cosign · Docker Content Trust), 구성 요소 목록 <b>SBOM</b>, <code>docker scout</code> 취약점 스캔으로 공급망 보안을 다룹니다.</div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'Docker Hub(흉내)에 내 이미지 올리기',
      desc: '📁 <code>~/myapp</code> 으로 <code>myapp:1.0</code> 을 빌드하고, <b>아무 이름</b>으로 <code>docker login</code> 한 뒤 <code>내이름/myapp:1.0</code> 으로 태그해 push 하세요. ⚠️ 실제 비밀번호는 입력하지 마세요.',
      hint: '<code>docker build -t myapp:1.0 .</code> → <code>docker login -u student</code> → <code>docker tag myapp:1.0 student/myapp:1.0</code> → <code>docker push student/myapp:1.0</code>',
      files: 'myapp',
      answer: ['cd ~/myapp', 'docker build -t myapp:1.0 .', 'docker login -u student', 'docker tag myapp:1.0 student/myapp:1.0', 'docker push student/myapp:1.0'],
      check: M => { const l = M.D.s.login; return !!l && M.pushed(l.user + '/myapp:1.0'); }
    },
    {
      id: 'm2',
      title: '사설 레지스트리 registry:2 실행하기',
      desc: '<code>registry:2</code> 이미지로 <b>registry</b> 라는 이름의 컨테이너를 호스트 <b>5000</b> 포트에 띄우세요. <code>curl -s localhost:5000/v2/_catalog</code> 가 응답하면 성공입니다.',
      hint: '<code>docker run -d -p 5000:5000 --name registry registry:2</code>',
      answer: ['docker run -d -p 5000:5000 --name registry registry:2'],
      check: M => M.running('registry') && !!M.port(5000) && M.port(5000).id === M.c('registry').id
    },
    {
      id: 'm3',
      title: 'localhost:5000 으로 myapp:1.0 push',
      desc: '<code>myapp:1.0</code> 을 사설 레지스트리의 <code>localhost:5000/myapp:1.0</code> 으로 올리세요.',
      hint: '레지스트리 주소를 이름 앞에 붙여 태그: <code>docker tag myapp:1.0 localhost:5000/myapp:1.0</code> → <code>docker push …</code>',
      answer: ['docker tag myapp:1.0 localhost:5000/myapp:1.0', 'docker push localhost:5000/myapp:1.0'],
      check: M => M.pushed('localhost:5000/myapp:1.0')
    },
    {
      id: 'm4',
      title: '지우고 레지스트리에서 다시 받기',
      desc: '내 PC 의 <code>localhost:5000/myapp:1.0</code> 이미지를 지운 다음, 레지스트리에서 <b>pull</b> 로 되돌려 받으세요.',
      hint: '<code>docker rmi localhost:5000/myapp:1.0</code> → <code>docker pull localhost:5000/myapp:1.0</code>',
      answer: ['docker rmi localhost:5000/myapp:1.0', 'docker pull localhost:5000/myapp:1.0'],
      check: M => !!M.image('localhost:5000/myapp:1.0') && M.ran(/docker (image )?(rmi|rm)\b.*localhost:5000\/myapp/) && M.ran(/docker (image )?pull\s+localhost:5000\/myapp:1\.0/)
    },
    {
      id: 'm5',
      title: 'semver 태그 두 개 더 올리기 (1.0.0 · 1)',
      desc: '같은 이미지를 <code>localhost:5000/myapp:1.0.0</code> 과 <code>localhost:5000/myapp:1</code> 로도 push 하세요. <code>curl -s localhost:5000/v2/myapp/tags/list</code> 에 세 태그가 보여야 합니다.',
      hint: '<code>docker tag</code> 로 이름표를 두 개 더 붙이고 각각 <code>docker push</code>',
      answer: ['docker tag myapp:1.0 localhost:5000/myapp:1.0.0', 'docker tag myapp:1.0 localhost:5000/myapp:1', 'docker push localhost:5000/myapp:1.0.0', 'docker push localhost:5000/myapp:1'],
      check: M => M.pushed('localhost:5000/myapp:1.0.0') && M.pushed('localhost:5000/myapp:1')
    },
    {
      id: 'm6',
      title: 'save · load 로 오프라인 전달 흉내 내기',
      desc: '<code>redis:7-alpine</code> 이미지를 <code>~/redis.tar</code> 로 저장하고, 이미지를 지운 뒤 파일에서 다시 불러오세요.',
      hint: '<code>docker pull redis:7-alpine</code> → <code>docker save -o ~/redis.tar redis:7-alpine</code> → <code>docker rmi redis:7-alpine</code> → <code>docker load -i ~/redis.tar</code>',
      answer: ['docker pull redis:7-alpine', 'docker save -o ~/redis.tar redis:7-alpine', 'docker rmi redis:7-alpine', 'docker load -i ~/redis.tar'],
      check: M => !!M.file('~/redis.tar') && !!M.image('redis:7-alpine') && M.ran(/docker (image )?load\b/)
    },
    {
      id: 'm7', scenario: true,
      title: 'push 했더니 denied! — 로그인 · 네임스페이스 확인',
      desc: '⚙️ 상황 만들기를 누르면 로그아웃된 상태에서 팀원이 알려 준 대로 <code>myteam/myapp:2.0</code> 을 push 하다가 <code>denied: requested access to the resource is denied</code> 가 납니다. 여러분은 myteam 조직의 권한이 없습니다. <b>내 네임스페이스</b>로 <code>myapp:2.0</code> 을 올리세요.',
      hint: '① <code>docker login -u 아무이름</code> ② <code>docker tag myapp:1.0 아무이름/myapp:2.0</code> ③ <code>docker push 아무이름/myapp:2.0</code>',
      setup: ['docker logout', 'docker tag myapp:1.0 myteam/myapp:2.0', 'docker push myteam/myapp:2.0'],
      answer: ['docker login -u student', 'docker tag myapp:1.0 student/myapp:2.0', 'docker push student/myapp:2.0'],
      check: M => { const l = M.D.s.login; return !!l && l.user !== 'myteam' && M.pushed(l.user + '/myapp:2.0'); }
    },
    {
      id: 'm8', scenario: true,
      title: 'connection refused — 사설 레지스트리가 꺼져 있다',
      desc: '⚙️ 상황 만들기를 누르면 <code>localhost:5000/myapp:2.0</code> push 가 <code>dial tcp 127.0.0.1:5000: connect: connection refused</code> 로 실패합니다. 원인을 찾아 해결하고 push 를 성공시키세요.',
      hint: '<code>docker ps -a</code> 로 registry 컨테이너 상태를 보세요. <code>docker start registry</code> 후 다시 push',
      setup: ['docker stop registry', 'docker tag myapp:1.0 localhost:5000/myapp:2.0', 'docker push localhost:5000/myapp:2.0'],
      answer: ['docker start registry', 'docker push localhost:5000/myapp:2.0'],
      check: M => M.running('registry') && M.pushed('localhost:5000/myapp:2.0')
    }
  ],

  videos: [
    { title: 'docker push to docker hub tutorial (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+push+docker+hub+tutorial', desc: 'docker login · tag · push 로 Docker Hub 에 이미지를 올리는 영상 검색 결과' },
    { title: '도커 허브 이미지 배포 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%ED%97%88%EB%B8%8C+%EC%9D%B4%EB%AF%B8%EC%A7%80+push', desc: '한국어로 Docker Hub push 과정을 설명하는 영상 검색 결과' },
    { title: 'docker private registry registry:2 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+private+registry+registry%3A2', desc: 'registry:2 로 사설 레지스트리를 만드는 영상 검색 결과' },
    { title: 'docker buildx multi platform (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+buildx+multi+platform+arm64', desc: 'buildx 로 amd64 · arm64 이미지를 함께 만드는 영상 검색 결과' },
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: '전체 입문 강의 — 후반부에 이미지를 비공개 레지스트리에 올리고 서버에서 받는 흐름이 나옵니다' }
  ],

  terms: [
    ['레지스트리 (registry)', '이미지를 보관하고 배포하는 서버. Docker Hub(docker.io) · ghcr.io · ECR · registry:2 등'],
    ['저장소 (repository)', '같은 프로그램의 여러 버전 이미지를 모아 둔 곳. 예: library/nginx, student/myapp'],
    ['네임스페이스 (namespace)', '저장소 이름 앞의 사용자 · 조직 이름. Docker Hub 에서는 내 Docker ID 네임스페이스에만 push 할 수 있음. library 는 공식 이미지용'],
    ['태그 (tag)', '저장소 안에서 특정 이미지를 가리키는 이름표. 옮겨 붙일 수 있고, 생략하면 latest'],
    ['다이제스트 (digest)', '이미지(매니페스트) 내용으로 계산한 sha256 지문. 내용이 같으면 같고 절대 바뀌지 않음. 이름@sha256:… 로 고정 pull'],
    ['docker tag', '이미지에 새 이름(레지스트리/네임스페이스/저장소:태그)을 붙이는 명령. 복사가 아니라 이름표 추가'],
    ['docker push · pull', '레지스트리로 이미지를 올리기 · 받기. 이미 있는 레이어는 건너뜀'],
    ['docker login', '레지스트리에 인증하는 명령. 비밀번호 대신 액세스 토큰, 자동화에서는 --password-stdin 사용'],
    ['denied: requested access to the resource is denied', '로그인하지 않았거나 권한 없는 네임스페이스(library · 남의 계정)에 push 할 때의 오류'],
    ['registry:2', 'CNCF Distribution 프로젝트의 레지스트리 서버 이미지. /v2/_catalog · /v2/저장소/tags/list HTTP API 제공'],
    ['시맨틱 버전 (semver)', 'MAJOR.MINOR.PATCH 버전 규칙. 1.4.2 · 1.4 · 1 태그를 함께 붙여 필요한 수준으로 고정'],
    ['불변 태그 (immutable tag)', '한 번 올린 태그를 덮어쓰지 못하게 하는 레지스트리 설정. 같은 태그가 다른 이미지가 되는 사고를 막음'],
    ['docker save · load', '이미지를 tar 파일로 저장하고 다시 불러오는 명령. 인터넷 없는 곳으로 이미지를 옮길 때 사용'],
    ['멀티 플랫폼 이미지', '한 태그 아래 linux/amd64 · linux/arm64 등 여러 아키텍처 이미지를 담은 매니페스트 목록. docker buildx build --platform 으로 만듦']
  ],

  summary: [
    '레지스트리(서버) > 저장소(프로그램) > 태그(버전 이름표) 구조이며, 다이제스트(sha256)는 내용의 지문이라 바뀌지 않습니다.',
    '이미지 전체 이름은 레지스트리/네임스페이스/저장소:태그. nginx 는 docker.io/library/nginx:latest 의 줄임말입니다.',
    'Docker Hub 에 올리려면 docker login 후 내ID/앱:태그 로 docker tag 하고 push. 로그인 안 함 · library · 남의 네임스페이스면 denied 가 납니다.',
    'docker run -d -p 5000:5000 --name registry registry:2 로 사설 레지스트리를 만들고 localhost:5000/앱:태그 로 push · pull, curl 로 /v2/_catalog 를 확인합니다.',
    '운영에는 latest 대신 semver · git sha 같은 불변 태그를 쓰고, 정확한 고정이 필요하면 다이제스트로 pull 합니다.',
    '인터넷 없는 곳은 docker save · load, 여러 CPU 는 docker buildx build --platform linux/amd64,linux/arm64 --push 로 대응합니다.'
  ],

  quiz: [
    { q: 'docker pull redis 가 실제로 받는 이미지의 전체 이름은?', options: ['redis', 'docker.io/redis', 'docker.io/library/redis:latest', 'hub.docker.com/redis:stable'], answer: 2, explain: '레지스트리를 생략하면 docker.io, 네임스페이스를 생략하면 library(공식 이미지), 태그를 생략하면 latest 가 채워집니다.' },
    { q: '로그인한 상태에서 docker push myapp:1.0 이 denied 로 실패했다. 가장 알맞은 원인은?', options: ['인터넷이 느려서', 'myapp:1.0 은 docker.io/library/myapp 으로 해석되는데 library 는 공식 이미지 전용이라서', '태그에 점(.)이 있어서', 'push 는 항상 root 로만 가능해서'], answer: 1, explain: '네임스페이스 없이 올리면 library 로 해석됩니다. docker tag myapp:1.0 내ID/myapp:1.0 으로 내 네임스페이스를 붙여야 합니다.' },
    { q: 'docker tag myapp:1.0 localhost:5000/myapp:1.0 에 대한 설명으로 옳은 것은?', options: ['이미지를 복사해서 디스크를 두 배로 쓴다', '같은 이미지에 이름표를 하나 더 붙이며, 이 이름으로 push 하면 localhost:5000 레지스트리로 간다', '바로 레지스트리에 업로드한다', 'myapp:1.0 이름은 사라진다'], answer: 1, explain: 'tag 는 이름표 추가일 뿐입니다. 이름 첫 부분(localhost:5000)이 push 할 레지스트리를 정합니다.' },
    { q: '운영 서버 배포에 latest 태그를 피해야 하는 가장 큰 이유는?', options: ['latest 는 항상 가장 오래된 이미지라서', '새 push 로 다른 이미지를 가리킬 수 있어 무엇이 실행 중인지 알 수 없고 되돌리기 어려워서', 'latest 는 pull 이 느려서', 'latest 는 비공개 저장소에서 쓸 수 없어서'], answer: 1, explain: 'latest 는 움직이는 이름표입니다. 1.4.2 · git sha 같은 고정 태그나 다이제스트로 배포해야 재현 · 롤백이 쉽습니다.' },
    { q: '인터넷이 없는 서버로 이미지를 옮기는 알맞은 방법은?', options: ['docker export / import', 'docker save -o app.tar 이미지 → 파일 복사 → docker load -i app.tar', 'docker commit', 'docker cp'], answer: 1, explain: 'save/load 는 레이어 · 태그 · 설정을 모두 보존합니다. export/import 는 컨테이너 파일 시스템만 납작하게 옮겨 CMD · ENV 가 사라집니다.' },
    { q: '맥(M 칩)에서 빌드한 이미지를 인텔 서버에서 실행했더니 exec format error 가 났다. 해결책은?', options: ['서버의 Docker 를 재설치한다', 'docker buildx build --platform linux/amd64,linux/arm64 --push 로 여러 아키텍처용으로 빌드한다', '이미지 태그를 latest 로 바꾼다', 'docker save 로 옮긴다'], answer: 1, explain: 'CPU 아키텍처가 달라서 생긴 문제입니다. buildx 로 amd64 · arm64 를 함께 빌드해 매니페스트 목록으로 올리면 각 서버가 맞는 이미지를 받습니다.' },
    { q: 'registry:2 로 띄운 사설 레지스트리에 어떤 저장소가 있는지 보는 방법은?', options: ['docker search localhost:5000', 'curl -s localhost:5000/v2/_catalog', 'docker images --registry', 'docker compose ls'], answer: 1, explain: '레지스트리는 HTTP API 서버입니다. /v2/_catalog 는 저장소 목록, /v2/저장소/tags/list 는 태그 목록을 돌려줍니다.' }
  ]
});
