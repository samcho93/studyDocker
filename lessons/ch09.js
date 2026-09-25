/* 9장 — Docker Compose 기초 */
Course.lesson({
  id: 'ch09', no: '09',
  icon: '🧩',
  title: 'Docker Compose 기초',
  subtitle: 'docker run 여러 줄 대신 compose.yaml 한 파일 — 여러 컨테이너를 악보처럼 적어 두고 한 번에 연주하기',
  level: '중급', time: '100분',
  goals: [
    '여러 줄의 docker 명령과 compose.yaml 한 파일의 차이를 설명하고, Compose V2(docker compose) 를 쓸 수 있다',
    'compose.yaml 의 services · networks · volumes 구조와 image · build · ports · environment · volumes · depends_on · restart 키를 읽고 쓸 수 있다',
    '프로젝트 이름 · 컨테이너 이름(폴더명-서비스-번호) · 기본 네트워크(프로젝트_default) · 서비스 이름 DNS 규칙을 설명할 수 있다',
    'up -d · ps · logs -f · exec · stop · start · down · down -v 로 프로젝트 전체를 다룰 수 있다',
    '.env 파일과 ${VAR:-기본값} 변수 치환을 쓰고, docker compose config 로 최종 설정을 검증할 수 있다'
  ],
  chips: ['docker compose ps', 'docker compose logs', 'docker compose config', 'docker compose ls', 'docker network ls', 'curl -s localhost:8080'],

  figs: {
    /* ------------------------------------------------------------ 명령 여러 줄 vs compose.yaml */
    why: {
      caption: '같은 결과를 만드는 두 방법 — 명령을 순서대로 손으로 치는 대신, 원하는 모습을 compose.yaml 에 적어 두고 docker compose up 한 번으로 만듭니다',
      svg: `<svg class="dg" viewBox="0 0 860 350" role="img" aria-label="docker network create, volume create, docker run 두 번을 손으로 치는 방법과 compose.yaml 한 파일로 docker compose up 하는 방법 비교">
  <rect x="16" y="16" width="410" height="318" rx="14" class="red"/>
  <text x="221" y="44" class="t-b t-c t-red">😵 명령 여러 줄 (순서 · 옵션 기억)</text>
  <rect x="34" y="62" width="374" height="190" rx="8" class="box"/>
  <text x="46" y="84" class="t-xs t-mono">$ docker network create app-net</text>
  <text x="46" y="106" class="t-xs t-mono">$ docker volume create cache-data</text>
  <text x="46" y="128" class="t-xs t-mono">$ docker run -d --name cache \\</text>
  <text x="46" y="148" class="t-xs t-mono">    --network app-net \\</text>
  <text x="46" y="168" class="t-xs t-mono">    -v cache-data:/data redis:7-alpine</text>
  <text x="46" y="190" class="t-xs t-mono">$ docker run -d --name web \\</text>
  <text x="46" y="210" class="t-xs t-mono">    --network app-net -p 8000:80 \\</text>
  <text x="46" y="230" class="t-xs t-mono">    nginx:1.27-alpine</text>
  <text x="221" y="276" class="t-sm t-c">순서가 틀리면 실패 · 옵션 하나 빠지면 다른 결과</text>
  <text x="221" y="298" class="t-sm t-c">지울 때도 stop · rm · network rm · volume rm …</text>
  <text x="221" y="320" class="t-xs t-c t-mu">"어제 뭐라고 쳤더라?" — 기록이 남지 않음</text>

  <line x1="434" y1="175" x2="470" y2="175" class="ln thick ar"/>

  <rect x="478" y="16" width="366" height="318" rx="14" class="green"/>
  <text x="661" y="44" class="t-b t-c t-green">😎 compose.yaml 한 파일</text>
  <rect x="496" y="62" width="330" height="190" rx="8" class="box"/>
  <text x="508" y="84" class="t-xs t-mono t-b">services:</text>
  <text x="508" y="104" class="t-xs t-mono">  web:</text>
  <text x="508" y="122" class="t-xs t-mono">    image: nginx:1.27-alpine</text>
  <text x="508" y="140" class="t-xs t-mono">    ports: ["8000:80"]</text>
  <text x="508" y="158" class="t-xs t-mono">  cache:</text>
  <text x="508" y="176" class="t-xs t-mono">    image: redis:7-alpine</text>
  <text x="508" y="194" class="t-xs t-mono">    volumes: ["cache-data:/data"]</text>
  <text x="508" y="214" class="t-xs t-mono t-b">volumes:</text>
  <text x="508" y="232" class="t-xs t-mono">  cache-data:</text>
  <rect x="496" y="262" width="330" height="30" rx="6" class="s-green"/>
  <text x="661" y="277" class="t-sm t-c t-mono t-b tw">$ docker compose up -d</text>
  <text x="661" y="316" class="t-xs t-c t-mu">네트워크는 자동 · 지울 땐 docker compose down</text>
</svg>`
    },

    /* ------------------------------------------------------------ compose.yaml 해부 */
    anatomy: {
      caption: 'compose.yaml 의 뼈대 — 맨 위 단계(최상위 키)는 services · networks · volumes. 그 아래 서비스마다 "컨테이너를 어떻게 만들지"를 적습니다',
      svg: `<svg class="dg" viewBox="0 0 860 400" role="img" aria-label="compose.yaml 최상위 키 services, networks, volumes 와 서비스 안의 image, build, ports, environment, volumes, depends_on, restart 설명">
  <rect x="16" y="16" width="420" height="368" rx="14" class="box"/>
  <text x="34" y="44" class="t-sm t-mono t-mu"># compose.yaml</text>
  <rect x="28" y="56" width="396" height="236" rx="8" class="blue"/>
  <text x="40" y="78" class="t-sm t-mono t-b t-blue">services:</text>
  <text x="56" y="102" class="t-sm t-mono t-b">  web:</text>
  <text x="76" y="124" class="t-xs t-mono">    image: nginx:1.27-alpine</text>
  <text x="76" y="144" class="t-xs t-mono">    ports:</text>
  <text x="76" y="162" class="t-xs t-mono">      - "8000:80"</text>
  <text x="76" y="182" class="t-xs t-mono">    environment:</text>
  <text x="76" y="200" class="t-xs t-mono">      TZ: Asia/Seoul</text>
  <text x="76" y="220" class="t-xs t-mono">    depends_on: [cache]</text>
  <text x="76" y="240" class="t-xs t-mono">    restart: unless-stopped</text>
  <text x="56" y="264" class="t-sm t-mono t-b">  cache:</text>
  <text x="76" y="284" class="t-xs t-mono">    image: redis:7-alpine …</text>
  <rect x="28" y="302" width="396" height="34" rx="8" class="purple"/>
  <text x="40" y="319" class="t-sm t-mono t-b t-purple">networks:<tspan class="t-xs t-mu" font-weight="normal">  (생략하면 default 자동)</tspan></text>
  <rect x="28" y="342" width="396" height="34" rx="8" class="orange"/>
  <text x="40" y="359" class="t-sm t-mono t-b t-orange">volumes:<tspan class="t-xs t-mu" font-weight="normal">  cache-data: (이름 있는 볼륨 선언)</tspan></text>

  <rect x="456" y="16" width="388" height="368" rx="14" class="teal"/>
  <text x="650" y="44" class="t-b t-c t-teal">서비스 = 컨테이너 설계도</text>
  <text x="474" y="78" class="t-xs t-mono t-b">image</text><text x="580" y="78" class="t-xs">어떤 이미지로 (docker run 이미지)</text>
  <text x="474" y="108" class="t-xs t-mono t-b">build</text><text x="580" y="108" class="t-xs">Dockerfile 로 직접 빌드 (10장)</text>
  <text x="474" y="138" class="t-xs t-mono t-b">ports</text><text x="580" y="138" class="t-xs">-p 호스트:컨테이너</text>
  <text x="474" y="168" class="t-xs t-mono t-b">environment</text><text x="580" y="168" class="t-xs">-e 환경 변수</text>
  <text x="474" y="198" class="t-xs t-mono t-b">volumes</text><text x="580" y="198" class="t-xs">-v 볼륨 · 바인드 마운트</text>
  <text x="474" y="228" class="t-xs t-mono t-b">depends_on</text><text x="580" y="228" class="t-xs">먼저 시작할 서비스 (순서만!)</text>
  <text x="474" y="258" class="t-xs t-mono t-b">restart</text><text x="580" y="258" class="t-xs">--restart 재시작 정책</text>
  <line x1="474" y1="280" x2="826" y2="280" class="ln thin dash"/>
  <text x="650" y="306" class="t-sm t-c">들여쓰기 = 소속 관계</text>
  <text x="650" y="330" class="t-xs t-c t-mu">스페이스 2칸씩 · 탭 문자 금지</text>
  <text x="650" y="354" class="t-xs t-c t-mu">- 로 시작하는 줄 = 목록(배열)의 한 항목</text>
</svg>`
    },

    /* ------------------------------------------------------------ 이름 규칙 */
    naming: {
      caption: '프로젝트 이름은 폴더 이름에서 나옵니다. 컨테이너 · 네트워크 · 볼륨 이름이 모두 프로젝트 이름으로 시작하므로 다른 프로젝트와 섞이지 않습니다',
      svg: `<svg class="dg" viewBox="0 0 860 280" role="img" aria-label="폴더 webcache 가 프로젝트 이름이 되고 컨테이너 webcache-web-1, webcache-cache-1, 네트워크 webcache_default, 볼륨 webcache_cache-data 가 만들어짐">
  <rect x="20" y="96" width="180" height="84" rx="10" class="yellow"/>
  <text x="110" y="126" class="t-b t-c">📁 ~/webcache/</text>
  <text x="110" y="152" class="t-xs t-c t-mono">compose.yaml</text>
  <line x1="200" y1="138" x2="252" y2="138" class="ln thick ar"/>
  <rect x="258" y="106" width="150" height="64" rx="10" class="s-blue"/>
  <text x="333" y="130" class="t-xs t-c tw">프로젝트 이름</text>
  <text x="333" y="152" class="t-b t-c t-mono tw">webcache</text>
  <line x1="408" y1="138" x2="450" y2="50" class="ln ar"/>
  <line x1="408" y1="138" x2="450" y2="112" class="ln ar"/>
  <line x1="408" y1="138" x2="450" y2="174" class="ln ar"/>
  <line x1="408" y1="138" x2="450" y2="236" class="ln ar"/>
  <rect x="456" y="26" width="386" height="48" rx="24" class="green"/>
  <text x="474" y="50" class="t-sm t-mono t-b t-green">webcache-web-1</text>
  <text x="824" y="50" class="t-xs t-e t-mu">컨테이너 = 프로젝트-서비스-번호</text>
  <rect x="456" y="88" width="386" height="48" rx="24" class="green"/>
  <text x="474" y="112" class="t-sm t-mono t-b t-green">webcache-cache-1</text>
  <text x="824" y="112" class="t-xs t-e t-mu">번호는 --scale 로 늘어남</text>
  <rect x="456" y="150" width="386" height="48" rx="8" class="purple" stroke-dasharray="6 4"/>
  <text x="474" y="174" class="t-sm t-mono t-b t-purple">webcache_default</text>
  <text x="824" y="174" class="t-xs t-e t-mu">네트워크 = 프로젝트_default</text>
  <rect x="456" y="212" width="386" height="48" rx="8" class="orange"/>
  <text x="474" y="236" class="t-sm t-mono t-b t-orange">webcache_cache-data</text>
  <text x="824" y="236" class="t-xs t-e t-mu">볼륨 = 프로젝트_볼륨키</text>
</svg>`
    },

    /* ------------------------------------------------------------ 기본 네트워크와 DNS */
    dns: {
      caption: 'Compose 는 프로젝트마다 네트워크를 하나 만들고 모든 서비스를 연결합니다. 그 안에서는 서비스 이름(cache)이 곧 주소입니다 — Docker 내장 DNS(127.0.0.11)가 IP 로 바꿔 줍니다',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="호스트 안 webcache_default 네트워크에 web과 cache 컨테이너가 있고, web이 cache 라는 이름을 내장 DNS로 IP로 바꿔 접속, 호스트 8000 포트는 web의 80으로 연결">
  <rect x="14" y="14" width="832" height="312" rx="16" class="gray"/>
  <text x="34" y="40" class="t-b">🖥️ 호스트 (내 PC)</text>
  <rect x="34" y="120" width="120" height="60" rx="10" class="box"/>
  <text x="94" y="144" class="t-sm t-c">🌐 브라우저</text>
  <text x="94" y="166" class="t-xs t-c t-mono">localhost:8000</text>
  <line x1="154" y1="150" x2="238" y2="150" class="ln-blue thick ar-blue"/>
  <text x="196" y="138" class="t-xs t-c t-blue">8000→80</text>
  <rect x="222" y="56" width="604" height="252" rx="14" class="purple" stroke-dasharray="8 5"/>
  <text x="240" y="80" class="t-sm t-b t-purple">네트워크 webcache_default (자동 생성 · bridge)</text>
  <rect x="244" y="110" width="200" height="84" rx="16" class="green"/>
  <text x="344" y="136" class="t-b t-c t-green">web</text>
  <text x="344" y="158" class="t-xs t-c t-mono">webcache-web-1</text>
  <text x="344" y="178" class="t-xs t-c t-mono t-mu">172.19.0.3</text>
  <rect x="604" y="110" width="200" height="84" rx="16" class="teal"/>
  <text x="704" y="136" class="t-b t-c t-teal">cache</text>
  <text x="704" y="158" class="t-xs t-c t-mono">webcache-cache-1</text>
  <text x="704" y="178" class="t-xs t-c t-mono t-mu">172.19.0.2 : 6379</text>
  <line x1="444" y1="152" x2="600" y2="152" class="ln-green thick ar-green moving"/>
  <text x="522" y="142" class="t-xs t-c t-green t-mono">ping cache</text>
  <rect x="404" y="222" width="240" height="68" rx="10" class="yellow"/>
  <text x="524" y="246" class="t-sm t-c t-b">📒 내장 DNS 127.0.0.11</text>
  <text x="524" y="270" class="t-xs t-c t-mono">cache → 172.19.0.2</text>
  <line x1="364" y1="194" x2="420" y2="226" class="ln dash ar"/>
  <text x="300" y="250" class="t-xs t-c t-mu">"cache 가 누구?"</text>
  <text x="300" y="268" class="t-xs t-c t-mu">IP 는 바뀌어도 이름은 그대로</text>
</svg>`
    },

    /* ------------------------------------------------------------ 명령과 상태 */
    life: {
      caption: 'Compose 명령과 상태 — stop 은 컨테이너를 멈추기만, down 은 컨테이너 · 네트워크까지 지우고, down -v 는 볼륨(데이터)까지 지웁니다',
      svg: `<svg class="dg" viewBox="0 0 860 270" role="img" aria-label="없음에서 up으로 실행 중, stop으로 정지, start로 다시 실행, down으로 컨테이너와 네트워크 삭제, down -v로 볼륨까지 삭제">
  <rect x="20" y="96" width="150" height="70" rx="12" class="gray"/>
  <text x="95" y="124" class="t-b t-c">(아무것도 없음)</text>
  <text x="95" y="148" class="t-xs t-c t-mu">compose.yaml 만</text>
  <rect x="330" y="96" width="170" height="70" rx="35" class="s-green"/>
  <text x="415" y="124" class="t-b t-c tw">실행 중</text>
  <text x="415" y="148" class="t-xs t-c tw">Up</text>
  <rect x="664" y="96" width="170" height="70" rx="35" class="yellow"/>
  <text x="749" y="124" class="t-b t-c">정지</text>
  <text x="749" y="148" class="t-xs t-c t-mu">Exited (컨테이너는 남음)</text>
  <line x1="170" y1="116" x2="326" y2="116" class="ln-green thick ar-green"/>
  <text x="248" y="106" class="t-sm t-c t-mono t-green t-b">up -d</text>
  <line x1="500" y1="116" x2="660" y2="116" class="ln thick ar"/>
  <text x="580" y="106" class="t-sm t-c t-mono t-b">stop</text>
  <line x1="660" y1="148" x2="504" y2="148" class="ln-green thick ar-green"/>
  <text x="582" y="170" class="t-sm t-c t-mono t-green t-b">start</text>
  <path d="M415 166 C 415 230, 95 230, 95 170" class="ln-red thick ar-red" fill="none"/>
  <text x="255" y="222" class="t-sm t-c t-mono t-red t-b">down</text>
  <text x="255" y="244" class="t-xs t-c t-mu">컨테이너 · 네트워크 삭제 (볼륨은 남음)</text>
  <path d="M749 96 C 749 30, 95 30, 95 92" class="ln-red dash ar-red" fill="none"/>
  <text x="420" y="36" class="t-sm t-c t-mono t-red t-b">down -v</text>
  <text x="420" y="58" class="t-xs t-c t-mu">이름 있는 볼륨까지 삭제 → 데이터도 사라짐!</text>
</svg>`
    }
  },

  files: {
    hello: {
      '~/hello-compose/compose.yaml': `services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped
`,
      '~/hello-compose/html/index.html': `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>Hello Compose</title></head>
<body>
  <h1>Hello Compose! 🧩</h1>
  <p>compose.yaml 한 파일로 띄운 nginx 입니다.</p>
</body>
</html>
`
    },
    webcache: {
      '~/webcache/compose.yaml': `services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "\${WEB_PORT:-8000}:80"
    environment:
      TZ: Asia/Seoul
    depends_on:
      - cache
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    volumes:
      - cache-data:/data
    restart: unless-stopped

volumes:
  cache-data:
`
    },
    broken: {
      '~/broken-yaml/compose.yaml': `services:
  web:
    image: nginx:1.27-alpine
     ports:
      - "8090:80"
`
    },
    blog: {
      '~/blog/compose.yaml': `services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "\${BLOG_PORT:-8080}:80"
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '왜 Compose 인가? — 명령 여러 줄 vs 파일 한 장',
      html: `
<p>지금까지는 컨테이너를 하나씩 <code>docker run</code> 으로 띄웠습니다. 그런데 실제 서비스는 <b>웹 서버 + 데이터베이스 + 캐시</b>처럼
컨테이너 여러 개가 함께 움직입니다. 네트워크를 만들고, 볼륨을 만들고, 컨테이너마다 긴 옵션을 붙여 순서대로 실행해야 하지요.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># 웹 + 캐시 두 개만 띄워도 이만큼…</span>
docker network create app-net
docker volume create cache-data
docker run -d --name cache --network app-net -v cache-data:/data redis:7-alpine
docker run -d --name web --network app-net -p 8000:80 nginx:1.27-alpine
<span class="cm"># 지울 때도…</span>
docker rm -f web cache
docker network rm app-net</code></pre>
<p><b>Docker Compose</b> 는 이 과정을 <code>compose.yaml</code> 이라는 파일 하나에 "<b>이런 모습이면 좋겠다</b>"라고 적어 두고,
<code>docker compose up</code> 한 번으로 그 모습을 만들어 주는 도구입니다.</p>
{{fig:why}}
<div class="box analogy"><div class="box-t">🍳 비유 — 오케스트라 악보</div>
연주자(컨테이너)에게 한 명씩 "바이올린 먼저, 그다음 첼로, 템포는…" 하고 말로 지시하면 매번 조금씩 다르게 연주됩니다.
<b>악보(compose.yaml)</b>를 나눠 주면 누가 언제 무엇을 연주할지 종이에 적혀 있으니, 지휘자가 손만 들면(<code>up</code>) 언제나 같은 곡이 나옵니다.
악보는 복사해서 친구에게 줄 수도 있지요 — compose.yaml 을 Git 에 올리면 팀원 모두가 똑같은 환경을 띄웁니다.</div>
<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>docker run 여러 줄</th><th>docker compose</th></tr>
<tr><td>설정 기록</td><td>내 기억 · 메모장</td><td><span class="tag green">compose.yaml 파일</span> (Git 으로 관리)</td></tr>
<tr><td>네트워크</td><td>직접 만들고 --network 연결</td><td>프로젝트마다 <b>자동 생성</b> · 자동 연결</td></tr>
<tr><td>시작 순서</td><td>내가 순서대로 입력</td><td><code>depends_on</code> 으로 적어 둠</td></tr>
<tr><td>한꺼번에 보기</td><td>docker ps 에서 골라 보기</td><td><code>docker compose ps</code> · <code>logs</code> 는 이 프로젝트만</td></tr>
<tr><td>정리</td><td>rm · network rm · volume rm …</td><td><code>docker compose down</code> 한 줄</td></tr>
</table></div>
<div class="box note"><div class="box-t">📌 Compose 는 "선언형"</div>
<code>docker run</code> 은 "이렇게 <b>해라</b>"(명령형)이고, compose.yaml 은 "이런 <b>상태</b>여야 한다"(선언형)입니다.
그래서 <code>up</code> 을 두 번 실행해도 컨테이너가 두 배가 되지 않고, 설정이 바뀐 서비스만 다시 만듭니다. 15장의 쿠버네티스도 같은 생각입니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'Compose V2 — docker compose (하이픈 없음)',
      html: `
<p>Compose 는 처음에 파이썬으로 만든 별도 프로그램 <code>docker-compose</code>(하이픈 있음, <b>V1</b>)였습니다.
지금은 Go 로 다시 만들어 Docker CLI 의 플러그인이 된 <b>V2</b> 를 씁니다. 명령도 <code>docker compose</code>(띄어쓰기)로 바뀌었고, V1 은 지원이 끝났습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker compose version</code></pre>
<pre class="code out" data-lang="출력"><code>Docker Compose version v2.31.0</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th></th><th>V1 (옛날)</th><th>V2 (지금)</th></tr>
<tr><td>명령</td><td><code>docker-compose up</code></td><td><code>docker compose up</code></td></tr>
<tr><td>파일 이름</td><td>docker-compose.yml</td><td><b>compose.yaml</b> (권장) · compose.yml · docker-compose.yaml/yml 도 읽음</td></tr>
<tr><td><code>version: "3.8"</code></td><td>필요했음</td><td><span class="tag red">쓰지 않음</span> — 적으면 경고만 나오고 무시</td></tr>
<tr><td>컨테이너 이름</td><td>폴더_서비스_1 (밑줄)</td><td>폴더<b>-</b>서비스<b>-</b>1 (하이픈)</td></tr>
<tr><td>설치</td><td>따로 설치</td><td>Docker Desktop · docker-compose-plugin 에 포함</td></tr>
</table></div>
<p>인터넷의 오래된 예제에는 맨 위에 <code>version: "3.8"</code> 이 있는 경우가 많습니다. V2 에서 그대로 쓰면 이런 경고가 나옵니다.</p>
<pre class="code out" data-lang="출력"><code>WARN[0000] /home/student/old/docker-compose.yml: the attribute \`version\` is obsolete, it will be ignored, please remove it to avoid potential confusion</code></pre>
<div class="box tip"><div class="box-t">💡 팁 — 파일 이름</div>
폴더 안에 <code>compose.yaml</code> 이 있으면 <code>-f</code> 옵션 없이 <code>docker compose up</code> 만으로 읽습니다.
다른 이름을 쓰려면 <code>docker compose -f my-stack.yaml up -d</code> 처럼 지정합니다.</div>
<div class="box trend"><div class="box-t">🚀 최신 동향 — Compose Specification</div>
compose.yaml 의 문법은 이제 Docker 만의 것이 아니라 <b>Compose Specification</b> 이라는 공개 규격입니다.
그래서 버전 번호(<code>version:</code>) 없이 하나의 최신 규격을 따르고, Podman 같은 다른 도구도 같은 파일을 읽을 수 있습니다.</div>`
    },

    /* ================================================================ 3 */
    {
      title: 'compose.yaml 구조 읽기 — services · networks · volumes',
      html: `
<p>compose.yaml 은 <b>YAML</b>(야믈, 사람이 읽기 쉬운 설정 파일 형식)로 씁니다. 규칙은 세 가지만 기억하세요.</p>
<ol class="steps-list">
  <li><b>키: 값</b> — 콜론 뒤에 스페이스 한 칸. <code>image: nginx:1.27-alpine</code></li>
  <li><b>들여쓰기 = 소속</b> — 스페이스 2칸씩 들여 써서 "누구 밑에 있는지" 나타냅니다. <span class="tag red">탭 문자 금지</span></li>
  <li><b>- 는 목록</b> — 같은 들여쓰기의 <code>- 항목</code> 들이 하나의 배열입니다. 포트 · 볼륨처럼 여러 개 적는 곳에 씁니다.</li>
</ol>
{{fig:anatomy}}
<p>최상위(들여쓰기 0칸) 키는 보통 세 개입니다.</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">🧩</div><b>services</b><p>실행할 컨테이너 종류. 서비스 하나 = 컨테이너 설계도 하나 (<code>--scale</code> 로 여러 개도 가능)</p></div>
  <div class="card purple"><div class="ci">🕸️</div><b>networks</b><p>생략하면 <code>default</code> 네트워크 하나를 자동으로 만들어 모두 연결. 나누고 싶을 때만 적습니다</p></div>
  <div class="card orange"><div class="ci">💾</div><b>volumes</b><p>서비스에서 쓰는 <b>이름 있는 볼륨</b>을 여기에 선언해야 합니다 (선언 안 하면 오류)</p></div>
</div>
<p>서비스 안에서 가장 많이 쓰는 키와 <code>docker run</code> 옵션의 대응입니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>compose 키</th><th>docker run 옵션</th><th>예</th></tr>
<tr><td><code>image</code></td><td>마지막 인자(이미지)</td><td><code>image: redis:7-alpine</code></td></tr>
<tr><td><code>build</code></td><td><code>docker build</code> 후 실행</td><td><code>build: .</code> (Dockerfile 이 있는 폴더 · 10장)</td></tr>
<tr><td><code>ports</code></td><td><code>-p</code></td><td><code>- "8080:80"</code> (따옴표 권장)</td></tr>
<tr><td><code>environment</code></td><td><code>-e</code></td><td><code>TZ: Asia/Seoul</code> 또는 <code>- TZ=Asia/Seoul</code></td></tr>
<tr><td><code>volumes</code></td><td><code>-v</code></td><td><code>- cache-data:/data</code> · <code>- ./html:/usr/share/nginx/html:ro</code></td></tr>
<tr><td><code>depends_on</code></td><td>(없음 · 실행 순서)</td><td><code>- cache</code></td></tr>
<tr><td><code>restart</code></td><td><code>--restart</code></td><td><code>restart: unless-stopped</code></td></tr>
<tr><td><code>command</code></td><td>이미지 뒤의 명령</td><td><code>command: ["redis-server", "--appendonly", "yes"]</code></td></tr>
<tr><td><code>container_name</code></td><td><code>--name</code></td><td>되도록 쓰지 않기 (아래 참고)</td></tr>
</table></div>
<div class="box warn"><div class="box-t">⚠️ 주의 — ports 는 따옴표로</div>
YAML 은 <code>22:22</code> 처럼 콜론이 들어간 작은 숫자를 60진법 숫자로 읽어 버리는 옛 규칙이 있습니다.
포트는 <code>- "8080:80"</code> 처럼 <b>항상 따옴표</b>로 감싸는 습관을 들이세요.</div>
<div class="box note"><div class="box-t">📌 볼륨 두 종류 구분법</div>
<code>volumes:</code> 항목의 왼쪽이 <code>./</code> · <code>/</code> · <code>~</code> 로 시작하면 <b>바인드 마운트</b>(내 폴더 연결),
그냥 이름(<code>cache-data</code>)이면 <b>이름 있는 볼륨</b>입니다. 이름 있는 볼륨은 최상위 <code>volumes:</code> 에도 적어야 합니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: '첫 예제 — nginx + 정적 파일 바인드 마운트',
      html: `
<p>폴더 하나 = 프로젝트 하나입니다. <code>~/hello-compose</code> 폴더에 compose.yaml 과 HTML 파일을 만들어 봅시다.
아래 버튼으로 한 번에 만들거나, 각 코드 블록의 <b>📄 파일로 저장</b>을 누르세요.</p>
{{widget:files|set=hello|cd=~/hello-compose|title=첫 Compose 프로젝트 파일}}
<pre class="code" data-lang="yaml" data-file="~/hello-compose/compose.yaml"><code>services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped</code></pre>
<pre class="code" data-lang="html" data-file="~/hello-compose/html/index.html"><code>&lt;!DOCTYPE html&gt;
&lt;html lang="ko"&gt;
&lt;head&gt;&lt;meta charset="utf-8"&gt;&lt;title&gt;Hello Compose&lt;/title&gt;&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;Hello Compose! 🧩&lt;/h1&gt;
  &lt;p&gt;compose.yaml 한 파일로 띄운 nginx 입니다.&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
<p><code>./html</code> 은 <b>compose.yaml 이 있는 폴더 기준</b> 상대 경로입니다. <code>:ro</code> 는 읽기 전용(read-only)이라 컨테이너가 내 파일을 고칠 수 없습니다.
이제 폴더로 들어가 실행합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/hello-compose
docker compose up -d
docker compose ps
curl -s localhost:8080</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Pulling 1/1
 ✔ web                                Pulled     0.3s
[+] Running 2/2
 ✔ Network hello-compose_default      Created    0.1s
 ✔ Container hello-compose-web-1      Started    0.1s

NAME                  IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
hello-compose-web-1   nginx:1.27-alpine   "/docker-entrypoint.…"   web       Less than a second ago   Up Less than a second   0.0.0.0:8080-&gt;80/tcp, [::]:8080-&gt;80/tcp

&lt;!DOCTYPE html&gt;
&lt;html lang="ko"&gt;
…
  &lt;h1&gt;Hello Compose! 🧩&lt;/h1&gt;</code></pre>
<p>{{widget:open|url=http://localhost:8080/}} {{widget:open|pane=dash}}</p>
<p>출력을 잘 보면 우리가 만들라고 하지 않은 <b>네트워크 <code>hello-compose_default</code></b> 가 생겼고,
컨테이너 이름은 <b><code>hello-compose-web-1</code></b> 입니다. 이 이름 규칙이 Compose 를 이해하는 열쇠입니다.</p>
{{fig:naming}}
<ul>
  <li><b>프로젝트 이름</b> = compose.yaml 이 있는 <b>폴더 이름</b> (소문자로 바뀜). <code>-p 이름</code> 옵션이나 파일 맨 위 <code>name: 이름</code> 으로 바꿀 수 있습니다.</li>
  <li><b>컨테이너</b> = <code>프로젝트-서비스-번호</code> · <b>네트워크</b> = <code>프로젝트_default</code> · <b>볼륨</b> = <code>프로젝트_볼륨이름</code></li>
</ul>
<div class="box practice"><div class="box-t">🧪 해 보기 — 바인드 마운트는 바로 반영</div>
📝 파일 탭에서 <code>~/hello-compose/html/index.html</code> 의 제목을 고치고 저장한 뒤, 브라우저 탭을 새로 고쳐 보세요.
이미지를 다시 만들거나 컨테이너를 재시작하지 않아도 바로 바뀝니다. 컨테이너가 내 폴더를 그대로 보고 있기 때문입니다.
<pre class="code" data-lang="bash" data-run="sh"><code>docker compose exec web ls /usr/share/nginx/html
docker compose exec web touch /usr/share/nginx/html/new.txt</code></pre>
두 번째 명령은 <code>Read-only file system</code> 오류가 납니다 — <code>:ro</code> 가 제 역할을 하는 것입니다.</div>
<div class="box warn"><div class="box-t">⚠️ container_name 은 되도록 쓰지 마세요</div>
<code>container_name: web</code> 을 적으면 이름이 고정되어 편해 보이지만, 같은 compose.yaml 을 다른 폴더에서 또 띄우거나
<code>--scale</code> 로 여러 개 만들 때 <b>이름 충돌</b>이 납니다. Compose 안에서는 컨테이너 이름 대신 <b>서비스 이름</b>으로 부르면 됩니다.</div>`
    },

    /* ================================================================ 5 */
    {
      title: '프로젝트 다루기 — up · ps · logs · exec · stop · start · down',
      html: `
<p>Compose 명령은 <b>현재 폴더의 프로젝트</b>에만 작용합니다. <code>docker compose logs</code> 는 이 프로젝트의 로그만, <code>down</code> 은 이 프로젝트만 지웁니다.
다른 폴더의 프로젝트는 건드리지 않으니 안심하세요.</p>
{{fig:life}}
<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>하는 일</th><th>docker 명령으로 치면</th></tr>
<tr><td><code>docker compose up -d</code></td><td>없으면 만들고, 바뀌었으면 다시 만들고, 모두 백그라운드 실행</td><td>network create + run -d …</td></tr>
<tr><td><code>docker compose up</code></td><td>실행 후 모든 서비스 로그를 화면에 붙어서 보여 줌 (Ctrl+C 로 전체 정지)</td><td>run + logs -f</td></tr>
<tr><td><code>docker compose ps</code></td><td>이 프로젝트 컨테이너 목록 (<code>-a</code> 정지된 것도)</td><td>ps --filter</td></tr>
<tr><td><code>docker compose logs -f 서비스</code></td><td>로그 보기 · 따라가기 (서비스 생략하면 전체, 색으로 구분)</td><td>logs -f</td></tr>
<tr><td><code>docker compose exec 서비스 명령</code></td><td>실행 중인 서비스 컨테이너 안에서 명령</td><td>exec -it</td></tr>
<tr><td><code>docker compose stop</code> / <code>start</code> / <code>restart</code></td><td>멈추기 / 다시 켜기 / 재시작 (컨테이너는 남아 있음)</td><td>stop / start</td></tr>
<tr><td><code>docker compose down</code></td><td>컨테이너 + 네트워크 삭제 (<b>볼륨 · 이미지는 남김</b>)</td><td>rm -f + network rm</td></tr>
<tr><td><code>docker compose down -v</code></td><td>이름 있는 볼륨까지 삭제 — <span class="tag red">데이터 삭제</span></td><td>+ volume rm</td></tr>
<tr><td><code>docker compose ls</code></td><td>이 PC 에서 실행 중인 Compose 프로젝트 목록</td><td>—</td></tr>
</table></div>
<p>첫 예제로 차례대로 해 봅시다. <code>exec</code> 는 <code>docker exec</code> 와 달리 <b>컨테이너 이름이 아니라 서비스 이름</b>을 씁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/hello-compose
docker compose exec web nginx -v
docker compose stop
docker compose ps -a
docker compose start
docker compose ls</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 1/1
 ✔ Container hello-compose-web-1      Stopped    0.0s
NAME                  IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                              PORTS
hello-compose-web-1   nginx:1.27-alpine   "/docker-entrypoint.…"   web       Less than a second ago   Exited (0) Less than a second ago
[+] Running 1/1
 ✔ Container hello-compose-web-1      Started    0.0s
NAME            STATUS       CONFIG FILES
hello-compose   running(1)   /home/student/hello-compose/compose.yaml</code></pre>
<p>로그는 <code>-f</code> 로 따라갈 수 있습니다. 끝나지 않는 명령이니 다 봤으면 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추세요 (컨테이너는 계속 실행됩니다).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/hello-compose
curl -s localhost:8080
docker compose logs -f web</code></pre>
<pre class="code out" data-lang="출력"><code>hello-compose-web-1 | /docker-entrypoint.sh: Configuration complete; ready for start up
hello-compose-web-1 | 2026/09/25 18:07:32 [notice] 1#1: nginx/1.27.2
…
hello-compose-web-1 | 172.18.0.1 - - [25/Sep/2026:18:07:32 +0000] "GET / HTTP/1.1" 200 24 "-" "curl/8.11.0" "-"</code></pre>
<div class="box tip"><div class="box-t">💡 up -d 를 두 번 하면?</div>
설정이 그대로면 <code>Running</code> 이라고만 하고 아무것도 새로 만들지 않습니다. compose.yaml 을 고친 뒤 <code>up -d</code> 를 다시 하면
<b>바뀐 서비스만</b> <code>Recreated</code> 됩니다. "파일을 고쳤으면 up -d" — 이것이 Compose 의 기본 리듬입니다.</div>
<div class="box warn"><div class="box-t">⚠️ down 과 down -v 는 전혀 다릅니다</div>
<code>down</code> 은 가구(컨테이너)만 치우고 금고(볼륨)는 남깁니다. <code>down -v</code> 는 금고까지 버립니다.
데이터베이스가 있는 프로젝트에서 <code>-v</code> 를 습관처럼 붙이면 데이터가 사라집니다. "처음부터 깨끗하게" 하고 싶을 때만 쓰세요.</div>`
    },

    /* ================================================================ 6 */
    {
      title: '둘째 예제 — web + redis, 서비스 이름이 곧 주소',
      html: `
<p>이번에는 서비스 두 개입니다. 웹(nginx)과 캐시(redis)를 띄우고, redis 데이터는 이름 있는 볼륨에 보관합니다.</p>
{{widget:files|set=webcache|cd=~/webcache|title=web + redis 프로젝트 파일}}
<pre class="code" data-lang="yaml" data-file="~/webcache/compose.yaml"><code>services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "\${WEB_PORT:-8000}:80"     <span class="cm"># 변수 치환 — 7절에서 설명</span>
    environment:
      TZ: Asia/Seoul
    depends_on:
      - cache                       <span class="cm"># cache 를 먼저 시작</span>
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    volumes:
      - cache-data:/data            <span class="cm"># 이름 있는 볼륨</span>
    restart: unless-stopped

volumes:
  cache-data:                       <span class="cm"># 여기서 선언해야 함</span></code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/webcache
docker compose up -d
docker compose ps</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Pulling 1/1
 ✔ cache                              Pulled     0.3s
[+] Running 4/4
 ✔ Network webcache_default           Created    0.1s
 ✔ Volume "webcache_cache-data"       Created    0.1s
 ✔ Container webcache-cache-1         Started    0.1s
 ✔ Container webcache-web-1           Started    0.1s
NAME               IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
webcache-cache-1   redis:7-alpine      "docker-entrypoint.s…"   cache     Less than a second ago   Up Less than a second   6379/tcp
webcache-web-1     nginx:1.27-alpine   "/docker-entrypoint.…"   web       Less than a second ago   Up Less than a second   0.0.0.0:8000-&gt;80/tcp, [::]:8000-&gt;80/tcp</code></pre>
<p><code>depends_on</code> 덕분에 cache 가 먼저 <code>Started</code> 되었습니다. redis 에는 <code>ports</code> 가 없으니 내 PC 에서는 접속할 수 없고,
<b>같은 프로젝트 네트워크 안의 컨테이너끼리만</b> 이야기할 수 있습니다 — 데이터베이스 · 캐시는 보통 이렇게 숨겨 둡니다.</p>
{{fig:dns}}
<p>4장에서 배운 "사용자 정의 네트워크에서는 컨테이너 이름으로 DNS 가 된다"가 Compose 에서는 <b>자동</b>입니다.
게다가 컨테이너 이름(<code>webcache-cache-1</code>)이 아니라 <b>서비스 이름(<code>cache</code>)</b>으로 찾을 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/webcache
docker compose exec web ping -c 2 cache
docker compose exec web nslookup cache
docker compose exec web printenv TZ</code></pre>
<pre class="code out" data-lang="출력"><code>PING cache (172.19.0.2): 56 data bytes
64 bytes from 172.19.0.2: seq=0 ttl=64 time=0.150 ms
64 bytes from 172.19.0.2: seq=1 ttl=64 time=0.149 ms
…
Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	cache
Address: 172.19.0.2

Asia/Seoul</code></pre>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 앱 설정에는 서비스 이름을</div>
앱 코드의 접속 주소는 <code>redis://cache:6379</code> · <code>postgres://db:5432</code> 처럼 <b>서비스 이름</b>으로 적습니다.
컨테이너 안에서 <code>localhost</code> 는 "<b>그 컨테이너 자기 자신</b>"이라서 옆 컨테이너의 DB 로 가지 않습니다. 10장에서 이 실수를 직접 재현해 봅니다.</div>
<h4>볼륨 덕분에 down 해도 데이터가 남는다</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/webcache
docker compose exec cache redis-cli incr visits
docker compose exec cache redis-cli incr visits
docker compose down
docker compose up -d
docker compose exec cache redis-cli get visits</code></pre>
<pre class="code out" data-lang="출력"><code>1
2
[+] Running 3/3
 ✔ Container webcache-cache-1         Removed    0.0s
 ✔ Container webcache-web-1           Removed    0.0s
 ✔ Network webcache_default           Removed    0.0s
[+] Running 3/3
 ✔ Network webcache_default           Created    0.1s
 ✔ Container webcache-cache-1         Started    0.1s
 ✔ Container webcache-web-1           Started    0.1s
2</code></pre>
<p>컨테이너와 네트워크는 지워졌다가 새로 만들어졌지만 <b>볼륨은 그대로</b>라서 <code>visits</code> 가 2 로 남아 있습니다.
<code>down -v</code> 를 하면 볼륨도 지워져 <code>(nil)</code> 이 나옵니다.</p>
<div class="box warn"><div class="box-t">⚠️ depends_on 은 "순서"만 보장합니다</div>
<code>depends_on: [cache]</code> 는 cache 컨테이너를 <b>먼저 시작</b>할 뿐, redis 가 <b>접속을 받을 준비가 끝날 때까지 기다리지는 않습니다</b>.
데이터베이스처럼 준비에 몇 초 걸리는 서비스는 헬스체크와 <code>condition: service_healthy</code> 가 필요합니다 — 10장의 핵심 주제입니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '.env 와 변수 치환, docker compose config 로 검증',
      html: `
<p>같은 compose.yaml 을 PC 마다 조금씩 다르게 쓰고 싶을 때가 있습니다. 포트가 이미 쓰이고 있거나, 비밀번호를 파일에 직접 적고 싶지 않을 때지요.
compose.yaml 안의 <code>\${변수}</code> 는 실행할 때 값으로 바뀝니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>문법</th><th>뜻</th></tr>
<tr><td><code>\${WEB_PORT}</code></td><td>변수 값. 없으면 빈 문자열 + 경고</td></tr>
<tr><td><code>\${WEB_PORT:-8000}</code></td><td>없거나 비어 있으면 <b>기본값 8000</b></td></tr>
<tr><td><code>\${DB_PASSWORD:?비밀번호를 정하세요}</code></td><td>없으면 <b>오류로 멈춤</b> (필수 값)</td></tr>
<tr><td><code>$$</code></td><td>치환하지 말고 글자 $ 그대로</td></tr>
</table></div>
<p>값은 어디서 올까요? 우선순위는 <b>① 셸 환경 변수 → ② compose.yaml 옆의 <code>.env</code> 파일 → ③ <code>:-</code> 뒤 기본값</b> 입니다.</p>
<div class="flow">
  <div class="fb blue"><span class="fi">🐚</span><b>셸 변수</b>WEB_PORT=9000 docker compose …</div>
  <div class="fb teal"><span class="fi">📄</span><b>.env 파일</b>WEB_PORT=8082</div>
  <div class="fb gray"><span class="fi">🔢</span><b>기본값</b>\${WEB_PORT:-8000}</div>
  <div class="fb green"><span class="fi">✅</span><b>최종 설정</b>docker compose config 로 확인</div>
</div>
<div class="box analogy"><div class="box-t">🍳 비유 — 이사 짐 목록</div>
compose.yaml 은 "책상 1, 의자 1, 책장 (색깔: <b>\${색:-흰색}</b>)" 처럼 적은 <b>이사 짐 목록</b>입니다.
집마다 붙이는 메모(<code>.env</code>)에 "색=검정"이라고 적어 두면 목록은 그대로 두고도 집마다 다른 가구가 옵니다.
짐을 싣기 전에 "최종 목록"을 뽑아 확인하는 것이 <code>docker compose config</code> 입니다.</div>
<p><code>.env</code> 파일을 만들고, 치환 결과를 <code>config</code> 로 확인한 다음 적용해 봅시다.</p>
<pre class="code" data-lang="ini" data-file="~/webcache/.env"><code>WEB_PORT=8082</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/webcache
cat .env
docker compose config
docker compose up -d
docker compose ps web</code></pre>
<pre class="code out" data-lang="출력"><code>WEB_PORT=8082
name: webcache
services:
  web:
    depends_on:
      cache:
        condition: service_started
        required: true
    environment:
      TZ: Asia/Seoul
    image: nginx:1.27-alpine
    networks:
      default: null
    ports:
      - mode: ingress
        target: 80
        published: "8082"
        protocol: tcp
    restart: unless-stopped
  cache:
    …
[+] Running 2/2
 ✔ Container webcache-cache-1         Running    0.0s
 ✔ Container webcache-web-1           Recreated  0.0s
NAME             IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
webcache-web-1   nginx:1.27-alpine   "/docker-entrypoint.…"   web       Less than a second ago   Up Less than a second   0.0.0.0:8082-&gt;80/tcp, [::]:8082-&gt;80/tcp</code></pre>
<p><code>config</code> 는 변수 치환 · 기본값 · 짧은 문법을 모두 풀어 쓴 <b>최종 설정</b>을 보여 줍니다
(<code>depends_on</code> 이 <code>condition: service_started</code> 로 펼쳐진 것도 보이지요). 포트만 바뀐 web 만 <code>Recreated</code> 되었습니다.
셸 변수가 .env 보다 우선하는 것도 확인해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/webcache
docker compose config | grep published
WEB_PORT=9000 docker compose config | grep published
docker compose config -q</code></pre>
<pre class="code out" data-lang="출력"><code>        published: "8082"
        published: "9000"</code></pre>
<p><code>-q</code> 는 아무것도 출력하지 않고 <b>문법이 맞는지만</b> 검사합니다. 조용하면 합격입니다. 틀리면 이런 오류가 납니다.</p>
<div class="two">
<div><pre class="code" data-lang="yaml"><code>services:
  web:
    image: nginx:1.27-alpine
     ports:            <span class="cm"># ← 한 칸 더 들여씀</span>
      - "8090:80"</code></pre>
<pre class="code out" data-lang="출력"><code>yaml: line 4: mapping values are not allowed in this context</code></pre></div>
<div><pre class="code" data-lang="yaml"><code>services:
  cache:
    image: redis:7-alpine
    volumes:
      - cache-data:/data
<span class="cm"># 최상위 volumes: 선언을 빠뜨림</span></code></pre>
<pre class="code out" data-lang="출력"><code>service "cache" refers to undefined volume cache-data: invalid compose project</code></pre></div>
</div>
<div class="box warn"><div class="box-t">⚠️ .env 는 Git 에 올리지 마세요</div>
<code>.env</code> 에는 비밀번호 같은 값이 들어가기 쉽습니다. <code>.gitignore</code> 에 <code>.env</code> 를 넣고,
어떤 변수가 필요한지는 값 없이 적은 <code>.env.example</code> 파일로 공유하는 것이 관례입니다. (컨테이너 <b>안</b>으로 변수를 넣는 <code>env_file:</code> 키와는 다른 기능입니다.)</div>`
    },

    /* ================================================================ 8 */
    {
      title: '흔한 실수와 문제 해결 순서',
      html: `
<p>Compose 가 안 될 때는 대부분 아래 다섯 가지 중 하나입니다. 문제가 생기면 <b>config → ps -a → logs</b> 순서로 보세요.</p>
<ol class="steps-list">
  <li><b>docker compose config</b> — 파일 문법 · 변수 치환이 맞는지 (YAML 오류는 여기서 잡힘)</li>
  <li><b>docker compose ps -a</b> — 어떤 서비스가 <code>Exited</code> · <code>Created</code>(시작 실패) 상태인지</li>
  <li><b>docker compose logs 서비스</b> — 그 서비스가 왜 멈췄는지</li>
</ol>
<div class="tbl-wrap"><table class="tbl">
<tr><th>증상</th><th>원인</th><th>해결</th></tr>
<tr><td><code>no configuration file provided: not found</code></td><td>compose.yaml 이 없는 폴더에서 실행</td><td><code>cd</code> 로 프로젝트 폴더로 이동 · 또는 <code>-f</code></td></tr>
<tr><td><code>yaml: line N: …</code></td><td>들여쓰기 · 콜론 뒤 공백 · 탭 문자</td><td>N 번째 줄 근처 들여쓰기를 스페이스로 맞추기</td></tr>
<tr><td><code>port is already allocated</code></td><td>다른 컨테이너(다른 프로젝트)가 그 호스트 포트 사용 중</td><td>포트를 <code>\${PORT:-…}</code> 로 바꿀 수 있게 하고 .env 로 변경 · 또는 기존 것 정리</td></tr>
<tr><td><code>refers to undefined volume</code></td><td>최상위 <code>volumes:</code> 에 선언 안 함</td><td>맨 아래 <code>volumes:</code> 에 이름 추가</td></tr>
<tr><td><code>the attribute version is obsolete</code></td><td>옛날 예제의 <code>version:</code></td><td>그 줄 삭제 (경고일 뿐)</td></tr>
<tr><td>다른 서비스에 접속 안 됨</td><td>주소에 <code>localhost</code> · 컨테이너 이름 오타</td><td><b>서비스 이름</b>으로 접속</td></tr>
</table></div>
<p>포트 충돌을 직접 만들어 봅시다. <code>hello-compose</code> 가 이미 8080 을 쓰고 있는데, 다른 프로젝트도 8080 을 쓰려고 합니다.</p>
<pre class="code" data-lang="yaml" data-file="~/blog/compose.yaml"><code>services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "\${BLOG_PORT:-8080}:80"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/hello-compose
docker compose up -d
cd ~/blog
docker compose up -d
docker compose ps -a</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 2/2
 ✔ Network blog_default               Created    0.1s
 ✘ Container blog-web-1               Error      0.1s
Error response from daemon: driver failed programming external connectivity on endpoint blog-web-1 (af948f2d…): Bind for 0.0.0.0:8080 failed: port is already allocated
NAME         IMAGE               COMMAND                  SERVICE   CREATED                  STATUS    PORTS
blog-web-1   nginx:1.27-alpine   "/docker-entrypoint.…"   web       Less than a second ago   Created</code></pre>
<p>의도한 오류입니다. 컨테이너는 만들어졌지만(<code>Created</code>) 포트를 잡지 못해 시작하지 못했습니다.
compose.yaml 을 고치지 않고 <code>.env</code> 에 <code>BLOG_PORT=8081</code> 을 적은 뒤 <code>docker compose up -d</code> 하면 해결됩니다 — 🎯 미션에서 직접 해 보세요.</p>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 이 장의 파일 정리</div>
실습이 끝나면 폴더마다 <code>docker compose down</code> 으로 정리하세요. 어디서 무엇이 돌고 있는지 모르겠으면 <code>docker compose ls</code> 가 폴더 경로까지 알려 줍니다.</div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: '첫 Compose 프로젝트 띄우기 (hello-compose)',
      desc: '📁 파일 묶음 <code>~/hello-compose</code> 로 이동해 compose 로 nginx 를 백그라운드 실행하세요. 브라우저 탭에서 <code>localhost:8080</code> 에 <b>Hello Compose!</b> 가 보이면 통과입니다.',
      hint: '<code>cd ~/hello-compose</code> 후 <code>docker compose up -d</code>',
      files: 'hello',
      answer: ['cd ~/hello-compose', 'docker compose up -d'],
      check: async M => M.svc('hello-compose', 'web').some(c => c.state.status === 'running') && (await M.get('http://localhost:8080/')).includes('Hello Compose')
    },
    {
      id: 'm2',
      title: 'web + redis 프로젝트 띄우기 (webcache)',
      desc: '<code>~/webcache</code> 의 compose.yaml 로 web · cache 두 서비스를 실행하세요. 기본 네트워크 <code>webcache_default</code> 와 볼륨 <code>webcache_cache-data</code> 가 자동으로 생겨야 합니다.',
      hint: '폴더 이름이 프로젝트 이름입니다. <code>cd ~/webcache &amp;&amp; docker compose up -d</code>',
      files: 'webcache',
      answer: ['cd ~/webcache', 'docker compose up -d'],
      check: M => M.svc('webcache', 'web').some(c => c.state.status === 'running') && M.svc('webcache', 'cache').some(c => c.state.status === 'running') && !!M.net('webcache_default') && !!M.vol('webcache_cache-data')
    },
    {
      id: 'm3',
      title: '.env 로 web 포트를 8082 로 바꾸기',
      desc: 'compose.yaml 은 고치지 말고, <code>~/webcache/.env</code> 파일에 <code>WEB_PORT=8082</code> 를 적어 web 이 <b>호스트 8082</b> 로 게시되게 하세요.',
      hint: '<code>echo WEB_PORT=8082 &gt; .env</code> → <code>docker compose config</code> 로 확인 → <code>docker compose up -d</code>',
      answer: ['cd ~/webcache', 'echo WEB_PORT=8082 > .env', 'docker compose up -d'],
      check: M => { const c = M.port(8082); return !!c && !!c.compose && c.compose.project === 'webcache' && c.compose.service === 'web'; }
    },
    {
      id: 'm4',
      title: '서비스 이름으로 옆 컨테이너 찾기',
      desc: 'webcache 프로젝트의 <b>web</b> 컨테이너 안에서 <code>cache</code> 라는 이름으로 ping 을 보내 응답을 확인하세요.',
      hint: '<code>docker compose exec web ping -c 2 cache</code>',
      answer: ['cd ~/webcache', 'docker compose exec web ping -c 2 cache'],
      check: M => M.ran(/(docker compose exec|docker exec).*\bping\b.*\bcache\b/)
    },
    {
      id: 'm5',
      title: 'webcache 를 볼륨까지 깨끗하게 정리하기',
      desc: 'webcache 프로젝트의 컨테이너 · 네트워크 · <b>볼륨</b>까지 한 번에 지우세요.',
      hint: '<code>down</code> 만 하면 볼륨이 남습니다. 볼륨까지 지우는 옵션은?',
      answer: ['cd ~/webcache', 'docker compose down -v'],
      check: M => M.project('webcache').length === 0 && !M.net('webcache_default') && !M.vol('webcache_cache-data')
    },
    {
      id: 'm6', scenario: true,
      title: 'YAML 들여쓰기 오류 고치기',
      desc: '⚙️ 상황 만들기를 누르면 <code>~/broken-yaml</code> 에서 <code>docker compose up -d</code> 가 <code>yaml: line 4: mapping values are not allowed</code> 오류로 실패합니다. compose.yaml 을 고쳐서 web 을 <b>8090</b> 포트로 실행하세요.',
      hint: '📝 파일 탭에서 4번째 줄 <code>ports:</code> 의 들여쓰기를 <code>image:</code> 와 똑같이(스페이스 4칸) 맞추세요. <code>docker compose config -q</code> 가 조용하면 문법 통과.',
      files: 'broken',
      setup: ['cd ~/broken-yaml && docker compose up -d'],
      answer: ['cd ~/broken-yaml', `printf 'services:\\n  web:\\n    image: nginx:1.27-alpine\\n    ports:\\n      - "8090:80"\\n' > compose.yaml`, 'docker compose up -d'],
      check: M => M.svc('broken-yaml', 'web').some(c => c.state.status === 'running') && !!M.port(8090)
    },
    {
      id: 'm7', scenario: true,
      title: '두 프로젝트가 같은 포트를 원한다! (port is already allocated)',
      desc: '⚙️ 상황 만들기를 누르면 hello-compose 가 8080 을 쓰는 상태에서 <code>~/blog</code> 프로젝트가 같은 8080 으로 시작하려다 실패합니다. <b>두 프로젝트 모두 실행</b>되도록 고치세요. (blog 의 compose.yaml 은 <code>\${BLOG_PORT:-8080}</code> 을 씁니다)',
      hint: 'compose.yaml 은 그대로 두고 <code>~/blog/.env</code> 에 <code>BLOG_PORT=8081</code> → <code>docker compose up -d</code>',
      files: 'blog',
      setup: ['cd ~/hello-compose && docker compose up -d', 'cd ~/blog && docker compose up -d'],
      answer: ['cd ~/blog', 'echo BLOG_PORT=8081 > .env', 'docker compose up -d'],
      check: M => M.svc('blog', 'web').some(c => c.state.status === 'running') && M.svc('hello-compose', 'web').some(c => c.state.status === 'running')
    }
  ],

  videos: [
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: 'Docker 전체 입문 강의 — 후반부에 Docker Compose 로 여러 컨테이너를 띄우는 부분이 있습니다' },
    { title: 'Docker Compose will BLOW your MIND!! (a tutorial)', channel: 'NetworkChuck', url: 'https://www.youtube.com/watch?v=DM65_JyGxCo', lang: 'en', min: '16분', desc: 'docker run 명령을 compose 파일로 옮기는 과정을 경쾌하게 보여 줍니다' },
    { title: '도커 컴포즈 강의 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EC%BB%B4%ED%8F%AC%EC%A6%88+%EA%B0%95%EC%9D%98', desc: '한국어 Docker Compose 강의 검색 결과 — 최근 영상(Compose V2, docker compose)을 고르세요' },
    { title: 'docker compose tutorial (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+compose+tutorial', desc: '영어 Compose 튜토리얼 검색 결과 — docker-compose(V1) 대신 docker compose 를 쓰는 영상을 추천' }
  ],

  terms: [
    ['Docker Compose', '여러 컨테이너로 된 애플리케이션을 compose.yaml 한 파일로 정의하고 한 번에 실행 · 정리하는 도구. 지금은 Docker CLI 플러그인(V2)으로 docker compose 명령을 씁니다'],
    ['compose.yaml', 'Compose 설정 파일의 권장 이름. services · networks · volumes 를 최상위 키로 가집니다. version: 키는 쓰지 않습니다'],
    ['서비스(service)', '같은 설정으로 만드는 컨테이너의 설계도. 보통 컨테이너 하나지만 --scale 로 여러 개가 될 수 있습니다'],
    ['프로젝트(project)', '한 compose.yaml 로 만든 컨테이너 · 네트워크 · 볼륨 묶음. 이름은 기본적으로 폴더 이름이며 -p 나 name: 으로 바꿉니다'],
    ['프로젝트_default 네트워크', 'Compose 가 프로젝트마다 자동으로 만드는 bridge 네트워크. 모든 서비스가 연결되어 서비스 이름으로 서로를 찾습니다'],
    ['서비스 이름 DNS', '같은 네트워크 안에서 서비스 이름(cache, db …)을 Docker 내장 DNS(127.0.0.11)가 컨테이너 IP 로 바꿔 주는 기능'],
    ['depends_on', '서비스 시작 순서를 정하는 키. 기본값은 "먼저 시작"만 보장하고 준비 완료까지 기다리지는 않습니다(service_started)'],
    ['이름 있는 볼륨', 'volumes: 에 이름으로 적은 볼륨. 최상위 volumes: 에 선언해야 하고 실제 이름은 프로젝트_볼륨이름. down -v 로만 지워집니다'],
    ['.env 파일', 'compose.yaml 옆에 두는 변수 파일. compose.yaml 안의 ${VAR} 치환에 쓰이며 셸 환경 변수가 더 우선합니다'],
    ['변수 치환', 'compose.yaml 의 ${VAR} · ${VAR:-기본값} · ${VAR:?오류} 를 실행 시점에 값으로 바꾸는 기능'],
    ['docker compose config', '변수 치환과 기본값을 모두 적용한 최종 설정을 출력하는 명령. -q 는 문법 검사만 합니다'],
    ['docker compose down', '프로젝트의 컨테이너와 네트워크를 삭제. -v 를 붙이면 이름 있는 볼륨(데이터)까지 삭제'],
    ['YAML', '들여쓰기로 구조를 나타내는 설정 파일 형식. 스페이스로 들여 쓰고(탭 금지), - 로 목록을, 키: 값 으로 매핑을 적습니다']
  ],

  summary: [
    'Compose 는 여러 컨테이너의 설정을 compose.yaml 한 파일에 선언하고 docker compose up -d 한 번으로 만드는 도구입니다. 명령은 하이픈 없는 docker compose(V2), version: 키는 쓰지 않습니다.',
    'compose.yaml 최상위 키는 services · networks · volumes. 서비스 안의 image · ports · environment · volumes · restart 는 docker run 의 옵션과 1:1 로 대응합니다.',
    '프로젝트 이름 = 폴더 이름. 컨테이너는 프로젝트-서비스-번호, 네트워크는 프로젝트_default, 볼륨은 프로젝트_이름으로 만들어집니다.',
    '같은 프로젝트의 서비스끼리는 자동으로 같은 네트워크에 연결되어 서비스 이름(cache, db)으로 접속합니다. 컨테이너 안의 localhost 는 자기 자신입니다.',
    'up -d(만들기 · 갱신) · ps · logs -f · exec 서비스 · stop/start · down(컨테이너 · 네트워크 삭제) · down -v(볼륨까지 삭제)를 구분해서 씁니다.',
    '${VAR:-기본값} 과 .env 로 환경마다 값을 바꾸고, docker compose config 로 최종 설정을 확인 · 검증합니다. depends_on 은 순서만 보장합니다.'
  ],

  quiz: [
    { q: 'Docker Compose V2 에 대한 설명으로 옳은 것은?', options: ['명령은 docker-compose up 처럼 하이픈을 써야 한다', 'compose.yaml 맨 위에 version: "3.8" 을 꼭 적어야 한다', '명령은 docker compose 이고, version: 키는 쓸모없어 경고 후 무시된다', 'Compose 파일 이름은 반드시 docker-compose.yml 이어야 한다'], answer: 2, explain: 'V2 는 Docker CLI 플러그인이라 docker compose 로 씁니다. version: 은 obsolete 경고와 함께 무시되고, 권장 파일 이름은 compose.yaml 입니다.' },
    { q: '~/shop 폴더의 compose.yaml 에 서비스 api 가 있다. docker compose up -d 후 만들어지는 컨테이너와 네트워크 이름은?', options: ['api / bridge', 'shop-api-1 / shop_default', 'shop_api_1 / default', 'api-1 / shop-network'], answer: 1, explain: '프로젝트 이름은 폴더 이름(shop). 컨테이너는 프로젝트-서비스-번호(shop-api-1), 네트워크는 프로젝트_default(shop_default) 입니다.' },
    { q: '같은 compose 프로젝트의 app 서비스가 redis 서비스(서비스 이름 cache)에 접속하려면 호스트 주소를 무엇으로 적어야 할까?', options: ['localhost', '127.0.0.1', 'cache', '호스트 PC 의 IP'], answer: 2, explain: '프로젝트 기본 네트워크에서는 서비스 이름이 DNS 이름입니다. 컨테이너 안의 localhost 는 app 컨테이너 자기 자신을 가리킵니다.' },
    { q: 'docker compose down 과 docker compose down -v 의 차이는?', options: ['차이가 없다', 'down 은 컨테이너만 멈추고, down -v 는 삭제한다', 'down 은 컨테이너 · 네트워크를 지우고 볼륨은 남기며, down -v 는 이름 있는 볼륨까지 지운다', 'down -v 는 자세한 로그(verbose)를 보여 준다'], answer: 2, explain: 'down 은 데이터(볼륨)를 남겨 두므로 다시 up 하면 데이터가 살아 있습니다. -v 는 볼륨을 지워 데이터도 사라집니다.' },
    { q: 'compose.yaml 에 "${WEB_PORT:-8000}:80" 이 있고, .env 에 WEB_PORT=8082 가 있으며, 셸에서 WEB_PORT=9000 docker compose up -d 로 실행했다. 게시되는 호스트 포트는?', options: ['8000', '8082', '9000', '80'], answer: 2, explain: '우선순위는 셸 환경 변수 → .env → 기본값입니다. docker compose config 로 최종 값을 확인할 수 있습니다.' },
    { q: 'depends_on: [db] 에 대한 설명으로 옳은 것은?', options: ['db 가 접속을 받을 준비가 될 때까지 기다린 뒤 시작한다', 'db 컨테이너를 먼저 시작하는 순서만 보장한다', 'db 가 없으면 자동으로 이미지를 만든다', 'db 와 다른 네트워크에 연결한다'], answer: 1, explain: '짧은 형식의 depends_on 은 condition: service_started 로, 순서만 보장합니다. 준비 완료를 기다리려면 헬스체크 + condition: service_healthy 가 필요합니다(10장).' },
    { q: 'compose.yaml 이 올바른지(문법 · 변수 치환) 컨테이너를 만들지 않고 확인하는 명령은?', options: ['docker compose ps', 'docker compose config', 'docker compose ls', 'docker compose logs'], answer: 1, explain: 'docker compose config 는 최종 설정을 출력하고, 오류가 있으면 알려 줍니다. -q 를 붙이면 검사만 합니다.' }
  ]
});
