/* 5장 — 데이터 관리: 볼륨과 바인드 마운트 */
Course.lesson({
  id: 'ch05', no: '05',
  icon: '💾',
  title: '데이터 관리 — 볼륨과 바인드 마운트',
  subtitle: '컨테이너는 지워도, 데이터는 지키는 방법',
  level: '기초', time: '100분',
  goals: [
    '컨테이너의 쓰기 층에 저장한 데이터가 컨테이너 삭제와 함께 사라지는 이유를 설명할 수 있다',
    '볼륨 · 바인드 마운트 · tmpfs 의 차이를 알고 상황에 맞게 고를 수 있다',
    'docker volume create/ls/inspect/rm/prune 과 -v · --mount 문법을 쓸 수 있다',
    'PostgreSQL · Redis 데이터를 볼륨에 두어 컨테이너를 다시 만들어도 데이터가 남게 할 수 있다',
    '볼륨을 호스트 폴더로 백업하고 다른 볼륨으로 복원할 수 있다'
  ],
  chips: ['docker volume ls', 'docker ps -a', 'curl -s localhost:8080', 'ls ~/site', 'sudo ls /var/lib/docker/volumes'],

  figs: {
    /* ------------------------------------------------------------ 쓰기 층 */
    writable: {
      caption: '이미지 층은 읽기 전용이고, 컨테이너마다 얇은 쓰기 층이 하나씩 올라갑니다. docker rm 은 이 쓰기 층을 통째로 버립니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="nginx 이미지의 읽기 전용 층 위에 컨테이너 A 와 B 가 각자 쓰기 층을 가짐">
  <rect x="200" y="200" width="460" height="36" rx="8" class="purple"/>
  <text x="430" y="218" class="t-sm t-c t-purple">이미지 층 3 · nginx 설정 (읽기 전용 🔒)</text>
  <rect x="200" y="240" width="460" height="36" rx="8" class="purple"/>
  <text x="430" y="258" class="t-sm t-c t-purple">이미지 층 2 · nginx 프로그램 (읽기 전용 🔒)</text>
  <rect x="200" y="280" width="460" height="36" rx="8" class="purple"/>
  <text x="430" y="298" class="t-sm t-c t-purple">이미지 층 1 · debian 기본 파일 (읽기 전용 🔒)</text>

  <rect x="200" y="120" width="220" height="64" rx="10" class="green"/>
  <text x="310" y="144" class="t-b t-c t-green">✏️ 컨테이너 A 쓰기 층</text>
  <text x="310" y="168" class="t-xs t-c t-mono">+ memo.txt · + /tmp/a.txt</text>
  <rect x="440" y="120" width="220" height="64" rx="10" class="teal"/>
  <text x="550" y="144" class="t-b t-c t-teal">✏️ 컨테이너 B 쓰기 층</text>
  <text x="550" y="168" class="t-xs t-c t-mono">(비어 있음)</text>
  <line x1="310" y1="186" x2="310" y2="198" class="ln-green thick"/>
  <line x1="550" y1="186" x2="550" y2="198" class="ln-teal thick"/>

  <rect x="200" y="22" width="220" height="70" rx="12" class="red dash"/>
  <text x="310" y="48" class="t-sm t-c t-mono t-red">docker rm A</text>
  <text x="310" y="74" class="t-xs t-c t-red">쓰기 층까지 함께 삭제 🗑️</text>
  <line x1="310" y1="94" x2="310" y2="116" class="ln-red dash ar-red"/>

  <text x="30" y="150" class="t-sm t-b">컨테이너마다</text>
  <text x="30" y="172" class="t-sm t-b">따로 (수정 가능)</text>
  <text x="30" y="258" class="t-sm t-b">모든 컨테이너가</text>
  <text x="30" y="280" class="t-sm t-b">함께 씀 (공유)</text>
  <text x="690" y="152" class="t-sm">📉 쓰기가 느리고</text>
  <text x="690" y="176" class="t-sm">🧳 옮길 수 없음</text>
  <text x="690" y="258" class="t-sm t-mu">docker diff 로</text>
  <text x="690" y="280" class="t-sm t-mu">쓰기 층 변화 보기</text>
</svg>`
    },

    /* ------------------------------------------------------------ 세 가지 마운트 */
    mounts: {
      caption: '세 가지 저장 방법 — 볼륨은 Docker 가 관리하는 창고, 바인드 마운트는 내 폴더를 그대로 연결, tmpfs 는 메모리에만',
      svg: `<svg class="dg" viewBox="0 0 860 380" role="img" aria-label="호스트의 Docker 볼륨 영역, 사용자 폴더, 메모리가 각각 컨테이너 안의 경로에 연결됨">
  <rect x="16" y="14" width="828" height="352" rx="18" class="box"/>
  <text x="36" y="42" class="t-lg t-b">🖥️ 호스트</text>

  <rect x="40" y="64" width="240" height="96" rx="14" class="orange"/>
  <text x="160" y="92" class="t-b t-c t-orange">🛢️ 볼륨 (volume)</text>
  <text x="160" y="118" class="t-xs t-c t-mono">/var/lib/docker/volumes/</text>
  <text x="160" y="138" class="t-xs t-c t-mono">pgdata/_data</text>

  <rect x="310" y="64" width="240" height="96" rx="14" class="blue"/>
  <text x="430" y="92" class="t-b t-c t-blue">📁 바인드 마운트 (bind)</text>
  <text x="430" y="118" class="t-xs t-c t-mono">/home/student/site</text>
  <text x="430" y="138" class="t-xs t-c t-mu">내가 고른 아무 폴더</text>

  <rect x="580" y="64" width="240" height="96" rx="14" class="gray"/>
  <text x="700" y="92" class="t-b t-c">⚡ tmpfs</text>
  <text x="700" y="118" class="t-xs t-c">메모리(RAM)</text>
  <text x="700" y="138" class="t-xs t-c t-mu">디스크에 안 남음</text>

  <rect x="40" y="230" width="780" height="120" rx="18" class="green"/>
  <text x="60" y="256" class="t-b t-green">📦 컨테이너</text>
  <rect x="60" y="276" width="200" height="54" rx="10" class="box"/>
  <text x="160" y="303" class="t-sm t-c t-mono">/var/lib/postgresql/data</text>
  <rect x="330" y="276" width="200" height="54" rx="10" class="box"/>
  <text x="430" y="303" class="t-sm t-c t-mono">/usr/share/nginx/html</text>
  <rect x="600" y="276" width="200" height="54" rx="10" class="box"/>
  <text x="700" y="303" class="t-sm t-c t-mono">/cache</text>

  <line x1="160" y1="162" x2="160" y2="272" class="ln-orange thick ar-orange"/>
  <line x1="430" y1="162" x2="430" y2="272" class="ln-blue thick ar-blue"/>
  <line x1="700" y1="162" x2="700" y2="272" class="ln dash ar"/>
  <text x="172" y="200" class="t-xs t-orange">-v pgdata:/var/lib/…</text>
  <text x="442" y="200" class="t-xs t-blue">-v ~/site:/usr/share/…</text>
  <text x="712" y="200" class="t-xs">--tmpfs /cache</text>
</svg>`
    },

    /* ------------------------------------------------------------ DB 데이터 지키기 */
    dbkeep: {
      caption: '컨테이너는 갈아 끼우는 부품, 볼륨은 남는 창고 — 초기화(비밀번호 설정 등)는 볼륨이 비어 있을 때 첫 한 번만 일어납니다',
      svg: `<svg class="dg" viewBox="0 0 860 320" role="img" aria-label="db v1 이 볼륨 pgdata 에 데이터를 쓰고 삭제된 뒤, db v2 가 같은 볼륨을 이어받음">
  <rect x="330" y="200" width="200" height="100" rx="16" class="s-orange"/>
  <text x="430" y="232" class="t-b t-c tw">🛢️ 볼륨 pgdata</text>
  <text x="430" y="258" class="t-xs t-c tw">memo 테이블 · 사용자 비밀번호</text>
  <text x="430" y="280" class="t-xs t-c tw">(계속 남아 있음)</text>

  <rect x="30" y="40" width="230" height="110" rx="16" class="green"/>
  <text x="145" y="68" class="t-b t-c t-green">📦 db (1번째)</text>
  <text x="145" y="96" class="t-xs t-c t-mono">POSTGRES_PASSWORD=secret</text>
  <text x="145" y="122" class="t-xs t-c">빈 볼륨 → 초기화 실행 ✅</text>
  <line x1="145" y1="152" x2="340" y2="222" class="ln-green thick ar-green"/>

  <text x="430" y="60" class="t-sm t-c t-red t-b">docker rm -f db → 다시 run</text>
  <text x="430" y="130" class="t-xl t-c">🗑️</text>
  <line x1="266" y1="95" x2="594" y2="95" class="ln-red dash ar-red"/>

  <rect x="600" y="40" width="230" height="110" rx="16" class="teal"/>
  <text x="715" y="68" class="t-b t-c t-teal">📦 db (2번째)</text>
  <text x="715" y="96" class="t-xs t-c t-mono">POSTGRES_PASSWORD=newpass</text>
  <text x="715" y="122" class="t-xs t-c">데이터 있음 → 초기화 건너뜀 ⏭️</text>
  <line x1="715" y1="152" x2="522" y2="222" class="ln-teal thick ar-teal"/>

  <text x="145" y="250" class="t-sm t-c t-green">memo 에 'hello' 저장</text>
  <text x="715" y="250" class="t-sm t-c t-teal">'hello' 그대로 보임 ✅</text>
  <text x="715" y="276" class="t-sm t-c t-red">비밀번호는 여전히 secret ⚠️</text>
</svg>`
    },

    /* ------------------------------------------------------------ 백업 */
    backup: {
      caption: '볼륨 백업 — 볼륨과 호스트 폴더를 동시에 연결한 임시 컨테이너(--rm)가 파일을 옮겨 주고 사라집니다',
      svg: `<svg class="dg" viewBox="0 0 860 250" role="img" aria-label="볼륨 redisdata 와 호스트 폴더 backup 을 alpine 임시 컨테이너가 연결해 복사">
  <rect x="20" y="70" width="200" height="110" rx="16" class="orange"/>
  <text x="120" y="104" class="t-b t-c t-orange">🛢️ redisdata</text>
  <text x="120" y="132" class="t-xs t-c t-mono">dump.rdb</text>
  <text x="120" y="156" class="t-xs t-c t-mono t-orange">-v redisdata:/data</text>

  <rect x="310" y="40" width="240" height="170" rx="18" class="green dash"/>
  <text x="430" y="68" class="t-b t-c t-green">📦 alpine (--rm)</text>
  <rect x="330" y="88" width="90" height="40" rx="8" class="box"/>
  <text x="375" y="108" class="t-sm t-c t-mono">/data</text>
  <rect x="440" y="88" width="90" height="40" rx="8" class="box"/>
  <text x="485" y="108" class="t-sm t-c t-mono">/backup</text>
  <text x="430" y="158" class="t-sm t-c t-mono">cp -r /data …</text>
  <text x="430" y="184" class="t-xs t-c t-mu">일 끝나면 자동 삭제</text>
  <line x1="420" y1="108" x2="436" y2="108" class="ln-green ar-green"/>

  <rect x="640" y="70" width="200" height="110" rx="16" class="blue"/>
  <text x="740" y="104" class="t-b t-c t-blue">📁 ~/backup</text>
  <text x="740" y="132" class="t-xs t-c t-mono">redisdata/dump.rdb</text>
  <text x="740" y="156" class="t-xs t-c t-mono t-blue">-v ~/backup:/backup</text>

  <line x1="222" y1="125" x2="326" y2="108" class="ln-orange thick ar-orange"/>
  <line x1="534" y1="108" x2="636" y2="125" class="ln-blue thick ar-blue"/>
</svg>`
    },

    vsBox: `<div class="vs">
  <div class="vs-a orange"><b>🛢️ 볼륨</b><ul>
    <li>Docker 가 만들고 관리 (<code>/var/lib/docker/volumes</code>)</li>
    <li>이름으로 부름: <code>-v pgdata:/data</code></li>
    <li>빈 볼륨이면 이미지 속 파일을 먼저 채워 줌</li>
    <li>리눅스 · 맥 · 윈도우 어디서나 빠르고 똑같이 동작</li>
    <li><b>데이터베이스 · 업로드 파일</b>에 추천</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b blue"><b>📁 바인드 마운트</b><ul>
    <li>내가 고른 호스트 폴더를 그대로 연결</li>
    <li>경로로 부름: <code>-v ~/site:/usr/share/nginx/html</code></li>
    <li>컨테이너 경로의 원래 파일은 <b>가려짐</b></li>
    <li>호스트에서 고치면 즉시 반영 (편집기로 수정)</li>
    <li><b>개발 중인 소스 코드 · 설정 파일</b>에 추천</li></ul></div>
</div>`
  },

  files: {
    site: {
      '~/site/index.html': `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>My Docker Site</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>나의 첫 도커 사이트 🐳</h1>
  <p>이 파일은 호스트의 ~/site/index.html 입니다.</p>
  <p>📝 파일 탭에서 고치고 🌐 브라우저에서 새로고침해 보세요.</p>
  <a href="about.html">소개 페이지</a>
</body>
</html>
`,
      '~/site/about.html': `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>About</title><link rel="stylesheet" href="style.css"></head>
<body>
  <h1>소개</h1>
  <p>nginx 컨테이너가 바인드 마운트된 폴더를 그대로 보여 줍니다.</p>
  <a href="index.html">처음으로</a>
</body>
</html>
`,
      '~/site/style.css': `body { font-family: sans-serif; max-width: 640px; margin: 40px auto; line-height: 1.6; }
h1 { color: #1d63ed; }
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '컨테이너를 지우면 데이터도 사라진다 — 쓰기 층',
      html: `
<p>2장에서 이미지는 <b>읽기 전용 층</b>을 쌓은 것이라고 배웠습니다. 그런데 컨테이너 안에서는 파일을 만들고 고칠 수 있죠?
컨테이너를 만들 때 Docker 가 이미지 위에 <b>얇은 쓰기 층</b>(writable layer, 컨테이너 층)을 하나 얹어 주기 때문입니다.
컨테이너가 바꾼 모든 것은 이 층에만 기록됩니다.</p>

{{fig:writable}}

<div class="box analogy"><div class="box-t">🏨 비유 — 호텔 방</div>
이미지는 호텔 방의 기본 인테리어, 컨테이너는 투숙객입니다. 투숙객이 방에 메모를 붙이고 짐을 풀어도(쓰기 층),
<b>체크아웃(docker rm)</b>하면 청소부가 싹 치워 원래 인테리어만 남습니다. 소중한 짐은 <b>호텔 금고나 내 가방(볼륨 · 바인드 마운트)</b>에 넣어야 합니다.</div>

<p>직접 확인해 봅시다. 컨테이너 안에 파일을 만들고, <code>docker diff</code> 로 쓰기 층의 변화를 봅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name box nginx
docker exec box sh -c 'echo hi &gt; /usr/share/nginx/html/memo.txt'
docker exec box touch /tmp/a.txt
docker diff box</code></pre>
<pre class="code out" data-lang="출력"><code>C /tmp
A /tmp/a.txt
C /usr
C /usr/share
C /usr/share/nginx
C /usr/share/nginx/html
A /usr/share/nginx/html/memo.txt</code></pre>
<table class="tbl">
<tr><th>기호</th><th>뜻</th></tr>
<tr><td><code>A</code></td><td>Added — 새로 생긴 파일 · 폴더</td></tr>
<tr><td><code>C</code></td><td>Changed — 내용이 바뀐 폴더 · 파일 (안에 뭔가 생겨도 폴더는 C)</td></tr>
<tr><td><code>D</code></td><td>Deleted — 지워진 것 (이미지 층의 파일은 실제로 지워지지 않고 "지웠다"는 표시만 쓰기 층에 남음)</td></tr>
</table>
<p>이제 컨테이너를 지우고, 같은 이미지로 다시 만들어 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f box
docker run -d --name box nginx
docker exec box cat /usr/share/nginx/html/memo.txt</code></pre>
<pre class="code out" data-lang="출력"><code>cat: /usr/share/nginx/html/memo.txt: No such file or directory</code></pre>
<p>memo.txt 는 사라졌습니다 (의도한 오류). 새 컨테이너는 <b>새 쓰기 층</b>을 받았기 때문입니다.
<code>docker stop</code> / <code>start</code> 로는 쓰기 층이 유지되지만, <code>docker rm</code> 하는 순간 끝입니다.
그리고 이미지를 새 버전으로 바꾸려면 컨테이너를 <b>지우고 다시 만드는 것</b>이 Docker 의 기본 방식입니다. 그러니 데이터는 쓰기 층 밖에 두어야 합니다.</p>

<div class="stats">
  <div class="stat red"><b>rm</b><span>쓰기 층 삭제 = 데이터 삭제</span></div>
  <div class="stat orange"><b>느림</b><span>쓰기 층은 파일 시스템 드라이버를 거쳐 느린 편</span></div>
  <div class="stat purple"><b>갇힘</b><span>다른 컨테이너와 나눠 쓰기 어려움</span></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f box</code></pre>
`
    },

    /* ================================================================ 2 */
    {
      title: '데이터를 밖에 두는 세 가지 방법',
      html: `
<p>Docker 는 컨테이너 안의 특정 경로를 <b>쓰기 층이 아닌 다른 곳</b>에 연결(마운트, mount)하는 세 가지 방법을 줍니다.</p>
{{fig:mounts}}
<div class="cards c3">
  <div class="card orange"><div class="ci">🛢️</div><b>볼륨 (volume)</b><p>Docker 가 관리하는 저장 공간. 이름만 알면 됨. <b>데이터 보관의 기본값</b></p></div>
  <div class="card blue"><div class="ci">📁</div><b>바인드 마운트 (bind mount)</b><p>호스트의 특정 폴더 · 파일을 그대로 연결. <b>개발 중 코드 · 설정 파일</b></p></div>
  <div class="card gray"><div class="ci">⚡</div><b>tmpfs</b><p>메모리에만 저장. 컨테이너가 멈추면 사라짐. <b>임시 · 민감한 파일</b></p></div>
</div>

<h3>-v 와 --mount — 같은 일, 두 가지 문법</h3>
<div class="tbl-wrap"><table class="tbl">
<tr><th>종류</th><th>-v (짧음)</th><th>--mount (길지만 명확)</th></tr>
<tr><td>볼륨</td><td><code>-v pgdata:/var/lib/postgresql/data</code></td><td><code>--mount type=volume,source=pgdata,target=/var/lib/postgresql/data</code></td></tr>
<tr><td>바인드</td><td><code>-v ~/site:/usr/share/nginx/html</code></td><td><code>--mount type=bind,source=$HOME/site,target=/usr/share/nginx/html</code></td></tr>
<tr><td>읽기 전용</td><td><code>-v ~/site:/usr/share/nginx/html:ro</code></td><td><code>…,target=/usr/share/nginx/html,readonly</code></td></tr>
<tr><td>tmpfs</td><td><code>--tmpfs /cache</code></td><td><code>--mount type=tmpfs,target=/cache</code></td></tr>
</table></div>
<div class="box tip"><div class="box-t">💡 -v 가 볼륨과 바인드를 구별하는 법</div>
콜론 왼쪽이 <b>이름</b>(<code>pgdata</code>)이면 볼륨, <b>경로</b>(<code>/</code> · <code>./</code> · <code>~/</code> 로 시작)이면 바인드 마운트입니다.
<code>-v site:/usr/share/nginx/html</code> 처럼 <code>./</code> 를 빼먹으면 "site 라는 이름의 볼륨"이 새로 만들어지는 실수가 흔합니다.
또 하나의 차이 — <code>-v</code> 는 없는 호스트 폴더를 <b>빈 폴더로 만들어 버리고</b>, <code>--mount</code> 는 오류를 내 줍니다. 실무에서 <code>--mount</code> 를 권하는 이유입니다.</div>
`
    },

    /* ================================================================ 3 */
    {
      title: '볼륨 — Docker 가 관리하는 데이터 창고',
      html: `
<p>볼륨은 <code>docker volume</code> 명령으로 다룹니다. 먼저 하나 만들어 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker volume create mydata
docker volume ls
docker volume inspect mydata</code></pre>
<pre class="code out" data-lang="출력"><code>mydata

DRIVER    VOLUME NAME
local     mydata

[
    {
        "CreatedAt": "2026-09-25T18:08:05Z",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
        "Name": "mydata",
        "Options": null,
        "Scope": "local"
    }
]</code></pre>
<p><code>Mountpoint</code> 가 볼륨의 실제 위치입니다. 이제 <b>서로 다른 두 컨테이너</b>가 같은 볼륨을 이어 쓰는지 봅시다.
첫 컨테이너가 파일을 쓰고 사라진(<code>--rm</code>) 뒤, 두 번째 컨테이너가 읽습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm -v mydata:/data alpine sh -c 'echo hello &gt; /data/hello.txt'
docker run --rm -v mydata:/data alpine cat /data/hello.txt
docker run --rm --mount type=volume,source=mydata,target=/data alpine ls -l /data</code></pre>
<pre class="code out" data-lang="출력"><code>hello
total 4
-rw-r--r-- 1 root root     6 Sep 26 03:08 hello.txt</code></pre>
<p>컨테이너는 둘 다 사라졌지만 hello.txt 는 남았습니다. 호스트에서 볼륨 폴더를 직접 들여다볼 수도 있습니다
(root 소유라서 <code>sudo</code> 가 필요합니다).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>sudo ls /var/lib/docker/volumes
sudo cat /var/lib/docker/volumes/mydata/_data/hello.txt</code></pre>
<pre class="code out" data-lang="출력"><code>metadata.db  mydata
hello</code></pre>
<div class="box warn"><div class="box-t">⚠️ 이 폴더를 직접 고치지 마세요</div>
<code>/var/lib/docker</code> 는 Docker 의 내부 작업장입니다. 보는 것은 괜찮지만, 파일을 넣고 빼는 일은 <b>컨테이너를 통해서</b>(아래 백업 절) 하세요.
Docker Desktop(맥 · 윈도우)에서는 이 경로가 내 PC 가 아니라 Docker 가 돌리는 작은 리눅스 VM 안에 있어서 탐색기로는 보이지도 않습니다.</div>

<h3>볼륨 지우기 — rm 과 prune</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name keeper -v mydata:/data nginx
docker volume rm mydata</code></pre>
<pre class="code out" data-lang="출력"><code>Error response from daemon: remove mydata: volume is in use - [6d0f0c2e…]</code></pre>
<p>의도한 오류입니다. 컨테이너가 쓰고 있는 볼륨은 지울 수 없습니다 (멈춘 컨테이너도 마찬가지). 컨테이너를 먼저 지우면 됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f keeper
docker volume rm mydata
docker volume ls</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>하는 일</th></tr>
<tr><td><code>docker volume create 이름</code></td><td>볼륨 만들기 (<code>-v 이름:경로</code> 로 실행하면 없을 때 자동으로도 만들어짐)</td></tr>
<tr><td><code>docker volume ls</code></td><td>목록 · <code>-f dangling=true</code> 로 아무도 안 쓰는 볼륨만</td></tr>
<tr><td><code>docker volume inspect 이름</code></td><td>실제 위치(Mountpoint) · 드라이버 · 라벨</td></tr>
<tr><td><code>docker volume rm 이름</code></td><td>삭제 — <b>되돌릴 수 없습니다</b></td></tr>
<tr><td><code>docker volume prune</code></td><td>안 쓰는 <b>익명</b> 볼륨 삭제. <code>-a</code> 를 붙이면 안 쓰는 <b>이름 있는</b> 볼륨까지 삭제 (조심!)</td></tr>
</table></div>
`
    },

    /* ================================================================ 4 */
    {
      title: '데이터베이스 데이터 지키기 — PostgreSQL · Redis',
      html: `
<p>볼륨이 가장 빛나는 곳은 데이터베이스입니다. 먼저 <b>볼륨 없이</b> PostgreSQL 을 띄우면 어떻게 되는지 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name pg -e POSTGRES_PASSWORD=secret postgres:16-alpine
sleep 3
docker exec pg psql -U postgres -c 'CREATE TABLE memo (id serial PRIMARY KEY, body text)'
docker exec pg psql -U postgres -c "INSERT INTO memo (body) VALUES ('hello')"
docker rm -f pg
docker run -d --name pg -e POSTGRES_PASSWORD=secret postgres:16-alpine
sleep 3
docker exec pg psql -U postgres -c 'SELECT * FROM memo'</code></pre>
<pre class="code out" data-lang="출력"><code>ERROR:  relation "memo" does not exist
LINE 1: SELECT * FROM memo</code></pre>
<p>memo 테이블이 사라졌습니다. 그런데 이상한 점이 있습니다. <code>docker volume ls</code> 를 해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker volume ls
docker image inspect -f '{{json .Config.Volumes}}' postgres:16-alpine</code></pre>
<pre class="code out" data-lang="출력"><code>DRIVER    VOLUME NAME
local     dfe3cf67bb2430e1fe6c4fe62087c94a7bbd6ae153da41fbbe5732069c313d0e
local     52755a289fd502d575facbbfdf38c6392649137886417f6d45000e9b6cd9c071
{"/var/lib/postgresql/data":{}}</code></pre>

<h3>익명 볼륨 — 이미지의 VOLUME 지시어</h3>
<p>postgres 이미지의 Dockerfile 에는 <code>VOLUME /var/lib/postgresql/data</code> 가 들어 있습니다. 그래서 <code>-v</code> 를 안 줘도
Docker 가 <b>긴 무작위 이름의 익명 볼륨</b>(anonymous volume)을 자동으로 만들어 붙입니다. 데이터는 첫 번째 익명 볼륨에 <b>아직 남아 있지만</b>,
새 컨테이너는 <b>또 다른 새 익명 볼륨</b>을 받았기 때문에 보이지 않는 것입니다. 이름이 없으니 다시 찾아 연결하기도 어렵죠.</p>
<div class="box note"><div class="box-t">📝 익명 볼륨 정리</div>
<code>docker rm -v 컨테이너</code> 는 컨테이너와 함께 그 익명 볼륨도 지웁니다 (<code>--rm</code> 으로 실행한 컨테이너도 끝날 때 익명 볼륨을 지움).
주인 잃은 익명 볼륨은 <code class="cmd">docker volume prune -f</code> 로 한 번에 정리합니다. 이름 있는 볼륨은 이것으로 지워지지 않습니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f pg
docker volume prune -f</code></pre>

<h3>이름 있는 볼륨으로 제대로 지키기</h3>
{{fig:dbkeep}}
<pre class="code" data-lang="bash" data-run="sh"><code>docker volume create pgdata
docker run -d --name pg -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16-alpine
sleep 3
docker exec pg psql -U postgres -c 'CREATE TABLE memo (id serial PRIMARY KEY, body text)'
docker exec pg psql -U postgres -c "INSERT INTO memo (body) VALUES ('hello')"
docker rm -f pg
docker run -d --name pg -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16-alpine
sleep 3
docker exec pg psql -U postgres -c 'SELECT * FROM memo'</code></pre>
<pre class="code out" data-lang="출력"><code> id | body
----+-------
  1 | hello
(1 row)</code></pre>
<p>컨테이너를 지웠다 다시 만들었는데도 데이터가 그대로입니다. 이미지 버전을 올릴 때(같은 메이저 버전 안에서)도 이렇게
<b>컨테이너만 바꾸고 볼륨은 그대로</b> 연결합니다.</p>

<h3>함정 — 비밀번호를 바꿨는데 안 바뀐다?</h3>
<p>공식 postgres · mysql 이미지는 <b>데이터 폴더가 비어 있을 때만</b> 초기화(관리자 계정 · 비밀번호 · 첫 DB 만들기)를 합니다.
이미 데이터가 있으면 <code>POSTGRES_PASSWORD</code> 는 <b>무시</b>됩니다. 로그를 보면 알 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f pg
docker run -d --name pg -e POSTGRES_PASSWORD=newpass -v pgdata:/var/lib/postgresql/data postgres:16-alpine
sleep 3
docker logs pg</code></pre>
<pre class="code out" data-lang="출력"><code>
PostgreSQL Database directory appears to contain a database; Skipping initialization

… LOG:  database system is ready to accept connections</code></pre>
<p><code>Skipping initialization</code> — 비밀번호는 여전히 <code>secret</code> 입니다. 다른 컨테이너에서 새 비밀번호로 접속하면 실패합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create dbnet
docker network connect dbnet pg
docker run --rm --network dbnet -e PGPASSWORD=newpass postgres:16-alpine psql -h pg -U postgres -c 'SELECT 1'</code></pre>
<pre class="code out" data-lang="출력"><code>psql: error: connection to server at "pg" (…), port 5432 failed: FATAL:  password authentication failed for user "postgres"</code></pre>
<p>해결 방법은 두 가지입니다.</p>
<ol class="steps-list">
<li><b>데이터를 지켜야 할 때</b> — DB 안에서 비밀번호를 바꿉니다 (운영 환경의 정석).
<pre class="code" data-lang="bash"><code>docker exec pg psql -U postgres -c "ALTER USER postgres PASSWORD 'newpass'"</code></pre></li>
<li><b>개발용이라 버려도 될 때</b> — 컨테이너와 볼륨을 지우고 처음부터 다시 만듭니다. 볼륨이 비었으니 초기화가 다시 실행됩니다.
<pre class="code" data-lang="bash"><code>docker rm -f pg
docker volume rm pgdata
docker run -d --name pg -e POSTGRES_PASSWORD=newpass -v pgdata:/var/lib/postgresql/data postgres:16-alpine</code></pre></li>
</ol>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f pg
docker network rm dbnet</code></pre>

<h3>Redis 데이터도 마찬가지</h3>
<p>Redis 는 메모리 DB 지만 <code>/data</code> 폴더에 스냅숏(<code>dump.rdb</code>)을 저장합니다. 이 폴더를 볼륨으로 연결하면 재생성 후에도 값이 남습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name cache -v redisdata:/data redis:7-alpine
docker exec cache redis-cli SET visits 42
docker exec cache redis-cli SAVE
docker rm -f cache
docker run -d --name cache -v redisdata:/data redis:7-alpine
docker exec cache redis-cli GET visits
docker exec cache ls /data</code></pre>
<pre class="code out" data-lang="출력"><code>OK
OK
cache
…
42
dump.rdb</code></pre>
<p><code>-v redisdata:/data</code> 처럼 <b>미리 create 하지 않은 이름</b>을 써도 Docker 가 볼륨을 자동으로 만들어 줍니다.
Redis 는 정상 종료할 때도 스냅숏을 저장하지만, 여기서는 <code>SAVE</code> 로 바로 저장했습니다.</p>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 이미지마다 데이터 경로를 확인하세요</div>
<table class="tbl">
<tr><th>이미지</th><th>볼륨을 연결할 경로</th></tr>
<tr><td>postgres</td><td><code>/var/lib/postgresql/data</code></td></tr>
<tr><td>mysql · mariadb</td><td><code>/var/lib/mysql</code></td></tr>
<tr><td>mongo</td><td><code>/data/db</code></td></tr>
<tr><td>redis</td><td><code>/data</code></td></tr>
<tr><td>wordpress</td><td><code>/var/www/html</code> (업로드 파일 · 플러그인)</td></tr>
</table>
경로를 한 글자라도 틀리면 볼륨은 붙었는데 데이터는 여전히 쓰기 층에 쌓입니다. Docker Hub 의 이미지 설명(Where to Store Data)을 꼭 확인하세요.</div>
`
    },

    /* ================================================================ 5 */
    {
      title: '바인드 마운트 — 내 폴더를 컨테이너에 그대로',
      html: `
<p>바인드 마운트는 호스트의 폴더를 컨테이너 안 경로에 <b>그대로 비춰</b> 줍니다. 같은 파일을 양쪽에서 보는 것이라 복사가 아닙니다.
호스트에서 파일을 고치면 컨테이너가 <b>즉시</b> 그 내용을 봅니다. 그래서 개발할 때 코드를 고칠 때마다 이미지를 다시 만들 필요가 없습니다.</p>
<div class="box analogy"><div class="box-t">🪟 비유 — 창문</div>
복사(COPY)는 사진을 찍어 보내는 것, 바인드 마운트는 <b>창문을 내는 것</b>입니다. 창밖(호스트)의 화분을 옮기면 창 안(컨테이너)에서도 바로 보입니다.</div>

<h3>실습 — 내 홈페이지를 nginx 로 서비스하기</h3>
<p>아래 버튼으로 <code>~/site</code> 에 작은 웹사이트(index.html · about.html · style.css)를 만듭니다.</p>
{{widget:files|set=site|cd=~/site}}
<pre class="code" data-lang="bash" data-run="sh"><code>ls ~/site
docker run -d --name site -p 8080:80 -v ~/site:/usr/share/nginx/html nginx
curl -s localhost:8080</code></pre>
<pre class="code out" data-lang="출력"><code>about.html  index.html  style.css
…
&lt;body&gt;
  &lt;h1&gt;나의 첫 도커 사이트 🐳&lt;/h1&gt;
  &lt;p&gt;이 파일은 호스트의 ~/site/index.html 입니다.&lt;/p&gt;
…</code></pre>
{{widget:open|url=http://localhost:8080/}}
<div class="box practice"><div class="box-t">🧪 해 보기 — 고치면 바로 반영</div>
<ol class="steps-list">
<li>📝 <b>파일</b> 탭에서 <code>~/site/index.html</code> 을 열고 <code>&lt;h1&gt;</code> 의 글자를 바꾼 뒤 저장합니다.</li>
<li>🌐 <b>브라우저</b> 탭에서 새로고침합니다. 컨테이너를 재시작하지 않아도 바뀐 글자가 보입니다.</li>
<li>터미널에서도 확인: <code class="cmd">echo '&lt;h1&gt;Changed!&lt;/h1&gt;' &gt; ~/site/index.html</code> → <code class="cmd">curl -s localhost:8080</code></li>
</ol></div>
<p>반대 방향도 됩니다. 컨테이너 안에서 만든 파일이 호스트 폴더에 나타납니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec site sh -c 'echo made-in-container &gt; /usr/share/nginx/html/from-container.txt'
ls ~/site</code></pre>
<pre class="code out" data-lang="출력"><code>about.html  from-container.txt  index.html  style.css</code></pre>

<div class="box warn"><div class="box-t">⚠️ 바인드 마운트는 원래 내용을 "가린다"</div>
nginx 이미지의 <code>/usr/share/nginx/html</code> 에는 원래 환영 페이지(index.html)가 있었습니다. 바인드 마운트를 하면 그 자리를 호스트 폴더가 <b>덮어 가립니다</b>.
그래서 호스트 폴더가 비어 있거나 경로를 잘못 쓰면 nginx 는 보여 줄 파일이 없어 <b>403 Forbidden</b> 을 냅니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name typo -p 8082:80 -v ~/sites:/usr/share/nginx/html nginx
curl -s localhost:8082
ls -la ~/sites</code></pre>
<pre class="code out" data-lang="출력"><code>&lt;html&gt;
&lt;head&gt;&lt;title&gt;403 Forbidden&lt;/title&gt;&lt;/head&gt;
…
total 8
drwxr-xr-x 2 student student  4096 Sep 26 03:18 .
drwxr-xr-x 2 student student  4096 Sep 26 03:18 ..</code></pre>
<p><code>~/sites</code>(s 가 하나 더!)는 없던 폴더라서 <code>-v</code> 가 <b>빈 폴더를 새로 만들어</b> 연결했습니다. 의도한 실패입니다.
<code>--mount</code> 를 썼다면 이런 실수를 바로 알려 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --mount type=bind,source=$HOME/nope,target=/x alpine ls /x</code></pre>
<pre class="code out" data-lang="출력"><code>docker: invalid mount config for type "bind": bind source path does not exist: /home/student/nope.</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f typo</code></pre>

<h3>:ro — 읽기 전용으로 연결하기</h3>
<p>웹 서버는 파일을 <b>읽기만</b> 하면 됩니다. 컨테이너가 해킹당하더라도 내 파일을 고치지 못하게 <code>:ro</code>(read-only)를 붙이는 습관을 들이세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name siteRO -p 8081:80 -v ~/site:/usr/share/nginx/html:ro nginx
docker exec siteRO sh -c 'echo x &gt; /usr/share/nginx/html/hack.txt'
docker inspect -f '{{json .Mounts}}' siteRO</code></pre>
<pre class="code out" data-lang="출력"><code>sh: /usr/share/nginx/html/hack.txt: Read-only file system
[{"Type":"bind","Source":"/home/student/site","Destination":"/usr/share/nginx/html","Mode":"ro","RW":false,"Propagation":"rprivate"}]</code></pre>
<p>쓰기가 거부되었습니다 (의도한 오류). <code>"RW":false</code> 로도 확인할 수 있습니다. 볼륨에도 똑같이 <code>-v pgdata:/data:ro</code> 처럼 쓸 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f siteRO</code></pre>
`
    },

    /* ================================================================ 6 */
    {
      title: 'tmpfs 와 docker cp',
      html: `
<h3>tmpfs — 메모리에만 두는 임시 공간</h3>
<p>tmpfs 마운트는 디스크가 아니라 <b>메모리(RAM)</b>에 파일을 둡니다. 컨테이너가 멈추면 내용이 사라지고, 쓰기 층에도 이미지에도 남지 않습니다.
빠른 임시 캐시, 또는 디스크에 남으면 곤란한 민감한 임시 파일에 씁니다. (리눅스 호스트에서만 지원)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name tmp --tmpfs /cache nginx
docker exec tmp sh -c 'echo temp &gt; /cache/a.txt'
docker exec tmp ls /cache
docker inspect -f '{{json .Mounts}}' tmp
docker diff tmp</code></pre>
<pre class="code out" data-lang="출력"><code>a.txt
[{"Type":"tmpfs","Source":"","Destination":"/cache","Mode":"","RW":true,"Propagation":""}]</code></pre>
<p><code>docker diff</code> 에 <code>/cache/a.txt</code> 가 나오지 않는 점에 주목하세요. 쓰기 층이 아닌 메모리에 저장되었기 때문입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f tmp</code></pre>

<h3>docker cp — 컨테이너와 호스트 사이 파일 복사</h3>
<p>마운트를 미리 걸지 않았는데 파일 하나만 꺼내거나 넣고 싶을 때는 <code>docker cp</code> 를 씁니다. 실행 중이든 멈췄든 됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker cp site:/etc/nginx/nginx.conf ~/nginx.conf
head -5 ~/nginx.conf
echo 'hi from host' &gt; ~/note.txt
docker cp ~/note.txt site:/tmp/note.txt
docker exec site cat /tmp/note.txt</code></pre>
<pre class="code out" data-lang="출력"><code>Successfully copied …kB to /home/student/nginx.conf
…
Successfully copied 2.05kB to site:/tmp/note.txt
hi from host</code></pre>
<div class="box tip"><div class="box-t">💡 cp 는 "응급 처치"용</div>
<code>docker cp</code> 로 넣은 파일은 컨테이너의 <b>쓰기 층</b>에 들어갑니다. 즉 컨테이너를 지우면 같이 사라집니다.
로그 파일 꺼내기, 설정 파일 확인 같은 일회성 작업에 쓰고, 계속 필요한 파일은 볼륨 · 바인드 마운트 · 이미지(Dockerfile 의 COPY, 6장)에 넣으세요.</div>
`
    },

    /* ================================================================ 7 */
    {
      title: '볼륨 백업과 복원',
      html: `
<p>볼륨은 Docker 가 관리하니 백업도 <b>컨테이너를 통해서</b> 합니다. 요령은 간단합니다 — 볼륨과 호스트 폴더를 <b>둘 다</b> 연결한 임시 컨테이너를 띄워 복사하게 하는 것입니다.</p>
{{fig:backup}}
<p>실제 서버에서 가장 많이 쓰는 형태는 tar 로 압축하는 것입니다 (참고용).</p>
<pre class="code" data-lang="bash"><code><span class="cm"># 백업: redisdata 볼륨 → ~/backup/redisdata.tar.gz</span>
docker run --rm -v redisdata:/data:ro -v ~/backup:/backup alpine tar czf /backup/redisdata.tar.gz -C /data .
<span class="cm"># 복원: tar.gz → 새 볼륨 restored</span>
docker run --rm -v restored:/data -v ~/backup:/backup alpine tar xzf /backup/redisdata.tar.gz -C /data</code></pre>
<p>원리는 똑같으니 실습 터미널에서는 <code>cp -r</code> 로 해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>mkdir -p ~/backup
docker run --rm -v redisdata:/data:ro -v ~/backup:/backup alpine cp -r /data /backup/redisdata
ls ~/backup/redisdata</code></pre>
<pre class="code out" data-lang="출력"><code>dump.rdb</code></pre>
<p>이제 백업을 <b>새 볼륨</b>으로 복원하고, 그 볼륨으로 Redis 를 띄워 값이 살아 있는지 확인합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker volume create restored
docker run --rm -v restored:/data -v ~/backup:/backup alpine sh -c 'cp -r /backup/redisdata/* /data/'
docker run -d --name cache2 -v restored:/data redis:7-alpine
docker exec cache2 redis-cli GET visits</code></pre>
<pre class="code out" data-lang="출력"><code>restored
42</code></pre>
<div class="box note"><div class="box-t">📝 데이터베이스는 "덤프"가 더 안전</div>
DB 가 돌아가는 중에 파일을 그대로 복사하면 쓰는 도중의 파일이 섞일 수 있습니다. 운영 DB 는 컨테이너를 잠깐 멈춘 뒤 복사하거나,
DB 자체 백업 도구를 씁니다. 예: <code>docker exec pg pg_dump -U postgres postgres &gt; backup.sql</code> ·
<code>docker exec db mysqldump …</code> · Redis 는 <code>SAVE</code> 후 dump.rdb 복사.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f cache2
docker volume ls</code></pre>
`
    },

    /* ================================================================ 8 */
    {
      title: '볼륨 vs 바인드 마운트 — 언제 무엇을?',
      html: `
{{fig:vsBox}}
<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>🛢️ 볼륨</th><th>📁 바인드 마운트</th><th>⚡ tmpfs</th><th>✏️ 쓰기 층</th></tr>
<tr><td>저장 위치</td><td>/var/lib/docker/volumes</td><td>내가 고른 호스트 경로</td><td>메모리</td><td>컨테이너 안</td></tr>
<tr><td>컨테이너 삭제 후</td><td>✅ 남음</td><td>✅ 남음</td><td>❌ 사라짐</td><td>❌ 사라짐</td></tr>
<tr><td>관리 명령</td><td>docker volume …</td><td>일반 파일 명령</td><td>—</td><td>docker diff · cp</td></tr>
<tr><td>호스트에서 편집</td><td>불편 (컨테이너 통해)</td><td>✅ 아주 쉬움</td><td>불가</td><td>불가</td></tr>
<tr><td>이식성</td><td>✅ 경로 신경 X</td><td>호스트 폴더 구조에 의존</td><td>—</td><td>—</td></tr>
<tr><td>성능 (맥 · 윈도우)</td><td>✅ 빠름</td><td>상대적으로 느릴 수 있음</td><td>가장 빠름</td><td>느린 편</td></tr>
<tr><td>대표 용도</td><td>DB · 업로드 · 운영 데이터</td><td>개발 코드 · 설정 파일 주입</td><td>임시 · 민감 파일</td><td>진짜 잠깐 쓰는 것만</td></tr>
</table></div>

<h3>권장 사용 사례</h3>
<div class="cards c3">
  <div class="card orange"><div class="ci">🗄️</div><b>데이터베이스</b><p><code>-v pgdata:/var/lib/postgresql/data</code> — 항상 이름 있는 볼륨</p></div>
  <div class="card blue"><div class="ci">👩‍💻</div><b>개발 중인 코드</b><p><code>-v ./src:/app/src</code> — 고치면 바로 반영 (9장 Compose 에서 많이 씀)</p></div>
  <div class="card teal"><div class="ci">⚙️</div><b>설정 파일 하나</b><p><code>-v ./nginx.conf:/etc/nginx/nginx.conf:ro</code> — 파일 단위 + 읽기 전용</p></div>
  <div class="card purple"><div class="ci">🖼️</div><b>사용자 업로드</b><p>볼륨에 두고 정기 백업</p></div>
  <div class="card gray"><div class="ci">🔑</div><b>임시 토큰 · 캐시</b><p><code>--tmpfs /run/secrets-tmp</code></p></div>
  <div class="card red"><div class="ci">🚫</div><b>하지 말 것</b><p>DB 데이터를 쓰기 층에 두기 · 볼륨 폴더 직접 수정 · <code>volume prune -a</code> 막 쓰기</p></div>
</div>

<div class="box trend"><div class="box-t">🚀 최신 동향</div>
Docker Desktop 은 GUI 의 <b>Volumes</b> 화면에서 볼륨 내용을 탐색하고 내보내기(export)하는 기능을 제공하고,
Compose 의 <code>develop.watch</code> 는 바인드 마운트 대신 변경된 파일을 컨테이너로 동기화하는 방식도 지원합니다.
하지만 바탕에 깔린 개념 — <b>데이터는 컨테이너 밖에</b> — 은 변하지 않습니다.</div>

<p>실습 정리 (볼륨까지 지우므로 데이터가 사라집니다):</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f $(docker ps -aq)
docker volume prune -a -f
docker volume ls</code></pre>
{{widget:mission}}
`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: '볼륨 mydata 를 만들고 hello.txt 남기기',
      desc: '볼륨 <code>mydata</code> 를 만들고, 임시 alpine 컨테이너(<code>--rm</code>)로 볼륨 안에 <code>hello.txt</code>(내용 <b>hello</b>)를 저장하세요. 컨테이너가 사라져도 파일은 볼륨에 남아야 합니다.',
      hint: '<code>docker volume create mydata</code> → <code>docker run --rm -v mydata:/data alpine sh -c \'echo hello &gt; /data/hello.txt\'</code>',
      answer: ['docker volume create mydata', "docker run --rm -v mydata:/data alpine sh -c 'echo hello > /data/hello.txt'"],
      check: M => { const v = M.vol('mydata'); if (!v) return false; const t = M.D.volFS(v).read('/hello.txt'); return !!t && /hello/.test(t); }
    },
    {
      id: 'm2',
      title: '바인드 마운트로 내 웹사이트 띄우기',
      desc: '<code>~/site</code> 폴더를 nginx 의 <code>/usr/share/nginx/html</code> 에 바인드 마운트한 컨테이너 <code>site</code> 를 호스트 <b>8080</b> 포트로 실행하세요. 🌐 브라우저에서 "나의 첫 도커 사이트"가 보이면 성공! (파일이 없으면 본문의 📁 파일 만들기 버튼을 누르세요)',
      files: 'site',
      hint: '<code>docker run -d --name site -p 8080:80 -v ~/site:/usr/share/nginx/html nginx</code>',
      answer: ['docker rm -f site', 'docker run -d --name site -p 8080:80 -v ~/site:/usr/share/nginx/html nginx'],
      check: async M => { const m = M.mount('site', '/usr/share/nginx/html'); return M.running('site') && !!m && m.type === 'bind' && /\/site$/.test(m.source) && /나의 첫 도커 사이트/.test(await M.get('http://localhost:8080/')); }
    },
    {
      id: 'm3',
      title: '읽기 전용(:ro) 사이트 컨테이너 만들기',
      desc: '같은 <code>~/site</code> 폴더를 <b>읽기 전용</b>으로 연결한 nginx 컨테이너 <code>docs</code> 를 호스트 <b>8081</b> 포트로 실행하세요. <code>docker exec docs touch /usr/share/nginx/html/x</code> 가 Read-only 오류를 내야 합니다.',
      hint: '경로 끝에 <code>:ro</code> — <code>-v ~/site:/usr/share/nginx/html:ro</code> (또는 <code>--mount …,readonly</code>)',
      answer: ['docker run -d --name docs -p 8081:80 -v ~/site:/usr/share/nginx/html:ro nginx'],
      check: M => { const m = M.mount('docs', '/usr/share/nginx/html'); return M.running('docs') && !!m && m.type === 'bind' && !!m.ro && M.port(8081) === M.c('docs'); }
    },
    {
      id: 'm4',
      title: 'Redis 값을 볼륨으로 지키기',
      desc: '볼륨 <code>redisdata</code> 를 <code>/data</code> 에 연결한 <code>redis:7-alpine</code> 컨테이너 <code>cache</code> 를 실행하고 <code>SET visits 42</code> 후 저장(<code>SAVE</code>)하세요. 그다음 <b>cache 를 지우고 같은 볼륨으로 다시 만들어</b> <code>GET visits</code> 가 42 인지 확인하세요.',
      hint: '<code>docker run -d --name cache -v redisdata:/data redis:7-alpine</code> → <code>docker exec cache redis-cli SET visits 42</code> → <code>docker exec cache redis-cli SAVE</code> → <code>docker rm -f cache</code> → 같은 run 명령 다시 → <code>docker exec cache redis-cli GET visits</code>',
      answer: ['docker rm -f cache', 'docker run -d --name cache -v redisdata:/data redis:7-alpine', 'docker exec cache redis-cli SET visits 42', 'docker exec cache redis-cli SAVE', 'docker rm -f cache', 'docker run -d --name cache -v redisdata:/data redis:7-alpine', 'docker exec cache redis-cli GET visits'],
      check: M => { const m = M.mount('cache', '/data'); const v = M.vol('redisdata'); return M.running('cache') && !!m && m.type === 'volume' && m.source === 'redisdata' && !!v && !!M.D.volFS(v).read('/dump.rdb') && M.ran(/docker rm/) && M.ran(/redis-cli\s+GET\s+visits/i); }
    },
    {
      id: 'm5',
      title: '볼륨 redisdata 를 ~/backup 으로 백업하기',
      desc: '임시 alpine 컨테이너로 볼륨 <code>redisdata</code> 의 내용을 호스트의 <code>~/backup/redisdata/</code> 폴더로 복사하세요. <code>ls ~/backup/redisdata</code> 에 <code>dump.rdb</code> 가 보여야 합니다.',
      hint: '<code>mkdir -p ~/backup</code> → <code>docker run --rm -v redisdata:/data:ro -v ~/backup:/backup alpine cp -r /data /backup/redisdata</code>',
      answer: ['mkdir -p ~/backup', 'docker run --rm -v redisdata:/data:ro -v ~/backup:/backup alpine cp -r /data /backup/redisdata'],
      check: M => M.file('~/backup/redisdata/dump.rdb') != null
    },
    {
      id: 'm6', scenario: true,
      title: '🚨 컨테이너를 지웠더니 메모 데이터가 사라졌다!',
      desc: '⚙️ 상황 만들기를 누르면 PostgreSQL 컨테이너 <code>notes</code> 가 <b>볼륨 없이</b> 만들어집니다. 팀원이 이미지 업데이트를 하려고 컨테이너를 지웠다 다시 만들 때마다 데이터가 사라진다고 합니다. <code>notes</code> 를 <b>이름 있는 볼륨 <code>notesdata</code></b> 에 데이터를 저장하도록 다시 만들고(비밀번호 <code>secret</code>), <code>memo</code> 테이블에 행을 하나 넣은 뒤, <b>컨테이너를 한 번 더 지웠다 다시 만들어도</b> 행이 남아 있게 하세요.',
      setup: ['docker rm -f notes', 'docker run -d --name notes -e POSTGRES_PASSWORD=secret postgres:16-alpine'],
      hint: 'postgres 데이터 경로는 <code>/var/lib/postgresql/data</code>. <code>docker rm -f notes</code> → <code>docker run -d --name notes -e POSTGRES_PASSWORD=secret -v notesdata:/var/lib/postgresql/data postgres:16-alpine</code> → <code>sleep 3</code> → <code>docker exec notes psql -U postgres -c "CREATE TABLE memo (id serial PRIMARY KEY, body text)"</code> → INSERT → 다시 rm · run 해서 SELECT 로 확인.',
      answer: [
        'docker rm -f notes',
        'docker run -d --name notes -e POSTGRES_PASSWORD=secret -v notesdata:/var/lib/postgresql/data postgres:16-alpine',
        'sleep 3',
        "docker exec notes psql -U postgres -c 'CREATE TABLE memo (id serial PRIMARY KEY, body text)'",
        "docker exec notes psql -U postgres -c \"INSERT INTO memo (body) VALUES ('keep me')\"",
        'docker rm -f notes',
        'docker run -d --name notes -e POSTGRES_PASSWORD=secret -v notesdata:/var/lib/postgresql/data postgres:16-alpine',
        'sleep 3',
        "docker exec notes psql -U postgres -c 'SELECT * FROM memo'"
      ],
      check: M => {
        const m = M.mount('notes', '/var/lib/postgresql/data');
        if (!M.running('notes') || !m || m.type !== 'volume' || m.source !== 'notesdata') return false;
        const raw = M.cfile('notes', '/var/lib/postgresql/data/pgdata.json');
        try { const d = JSON.parse(raw || '{}'); const t = d.dbs && d.dbs.postgres && d.dbs.postgres.tables && d.dbs.postgres.tables.memo; return !!t && t.rows.length > 0 && M.ran(/docker rm/); } catch (e) { return false; }
      }
    },
    {
      id: 'm7', scenario: true,
      title: '🚨 비밀번호를 바꿨는데 접속이 안 된다!',
      desc: '⚙️ 상황 만들기를 누르면 볼륨 <code>authdata</code> 를 쓰는 PostgreSQL 컨테이너 <code>auth</code> 가 처음에 비밀번호 <code>old</code> 로 만들어졌다가, <code>POSTGRES_PASSWORD=new</code> 로 다시 만들어집니다. 그런데 새 비밀번호 <code>new</code> 로는 로그인이 안 됩니다. <b>개발용 DB 라 데이터는 버려도 되는 상황</b>입니다. <code>auth</code> 컨테이너(같은 이름 · 같은 볼륨 이름 <code>authdata</code>)가 비밀번호 <code>new</code> 로 초기화되게 고치세요.',
      setup: ['docker rm -f auth', 'docker run -d --name auth -e POSTGRES_PASSWORD=old -v authdata:/var/lib/postgresql/data postgres:16-alpine', 'sleep 3', 'docker rm -f auth', 'docker run -d --name auth -e POSTGRES_PASSWORD=new -v authdata:/var/lib/postgresql/data postgres:16-alpine'],
      hint: '<code>docker logs auth</code> 에 <code>Skipping initialization</code> 이 보이나요? 초기화는 볼륨이 비었을 때만 합니다. 컨테이너를 지우고 <code>docker volume rm authdata</code> 후 다시 실행하세요.',
      answer: ['docker rm -f auth', 'docker volume rm authdata', 'docker run -d --name auth -e POSTGRES_PASSWORD=new -v authdata:/var/lib/postgresql/data postgres:16-alpine', 'sleep 3'],
      check: M => {
        const m = M.mount('auth', '/var/lib/postgresql/data');
        if (!M.running('auth') || !m || m.type !== 'volume' || m.source !== 'authdata') return false;
        try { const d = JSON.parse(M.cfile('auth', '/var/lib/postgresql/data/pgdata.json') || '{}'); return !!d.users && !!d.users.postgres && d.users.postgres.password === 'new'; } catch (e) { return false; }
      }
    },
    {
      id: 'm8', scenario: true,
      title: '🚨 바인드 마운트했는데 403 Forbidden 이 뜬다!',
      desc: '⚙️ 상황 만들기를 누르면 <code>~/site</code> 사이트 파일이 준비되고, 컨테이너 <code>blog</code> 가 호스트 <b>8082</b> 포트로 실행됩니다. 그런데 <code>curl localhost:8082</code> 가 <b>403 Forbidden</b> 입니다. 원인을 찾아 blog 가 8082 에서 "나의 첫 도커 사이트"를 보여 주게 고치세요.',
      files: 'site',
      setup: ['docker rm -f blog', 'docker run -d --name blog -p 8082:80 -v ~/sites:/usr/share/nginx/html nginx'],
      hint: '<code>docker inspect -f \'{{json .Mounts}}\' blog</code> 로 Source 경로를 보세요. <code>~/sites</code> ≠ <code>~/site</code>. 컨테이너를 지우고 올바른 경로로 다시 실행합니다.',
      answer: ['docker rm -f blog', 'docker run -d --name blog -p 8082:80 -v ~/site:/usr/share/nginx/html nginx'],
      check: async M => M.running('blog') && /나의 첫 도커 사이트/.test(await M.get('http://localhost:8082/'))
    }
  ],

  videos: [
    { title: 'Docker Volumes explained in 6 minutes', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=p2PH_YPCsis', lang: 'en', min: '6분', desc: '볼륨 · 바인드 마운트 · 익명 볼륨의 차이를 짧게 정리' },
    { title: '도커 볼륨 강의 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=도커+볼륨', desc: '한국어 도커 볼륨 설명 영상 검색 결과' },
    { title: '도커 바인드 마운트 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=도커+바인드+마운트', desc: '바인드 마운트 실습 영상 검색 결과' },
    { title: 'Docker volume backup and restore (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+volume+backup+restore', desc: '볼륨 백업 · 복원 방법을 다룬 영어 영상 검색 결과' }
  ],

  terms: [
    ['쓰기 층(writable layer)', '컨테이너마다 이미지 위에 얹히는 얇은 수정 가능 층. docker rm 하면 함께 삭제된다'],
    ['docker diff', '컨테이너 쓰기 층에서 추가(A) · 변경(C) · 삭제(D)된 파일을 보여 주는 명령'],
    ['마운트(mount)', '컨테이너 안의 경로를 쓰기 층이 아닌 다른 저장 공간에 연결하는 것'],
    ['볼륨(volume)', 'Docker 가 만들고 관리하는 이름 있는 저장 공간. 기본 위치 /var/lib/docker/volumes'],
    ['익명 볼륨', '이름 없이(긴 무작위 ID) 만들어진 볼륨. 이미지의 VOLUME 지시어나 -v /경로 로 생긴다'],
    ['VOLUME (Dockerfile)', '이 경로는 볼륨에 둬야 한다고 이미지에 표시하는 지시어. -v 가 없으면 익명 볼륨이 자동 생성된다'],
    ['바인드 마운트(bind mount)', '호스트의 폴더 · 파일을 컨테이너 경로에 그대로 연결하는 것. 원래 내용을 가린다'],
    [':ro (readonly)', '마운트를 읽기 전용으로 연결하는 옵션. 컨테이너가 파일을 고칠 수 없다'],
    ['tmpfs 마운트', '메모리(RAM)에만 저장하는 마운트. 컨테이너가 멈추면 사라진다'],
    ['-v 와 --mount', '같은 마운트를 만드는 두 문법. --mount 는 key=value 로 명확하고, 없는 바인드 경로에 오류를 낸다'],
    ['docker volume prune', '안 쓰는 익명 볼륨 삭제. -a 를 붙이면 안 쓰는 이름 있는 볼륨까지 삭제'],
    ['docker cp', '컨테이너와 호스트 사이에 파일을 복사하는 명령. 넣은 파일은 쓰기 층에 들어간다'],
    ['초기화 스크립트', 'postgres · mysql 이미지가 데이터 폴더가 비어 있을 때만 실행하는 첫 설정 (계정 · 비밀번호 · DB 생성)']
  ],

  summary: [
    '컨테이너가 바꾼 파일은 쓰기 층에만 저장되고, docker rm 과 함께 사라진다. docker diff 로 확인할 수 있다.',
    '데이터는 컨테이너 밖에 둔다 — 볼륨(Docker 관리, DB · 운영 데이터), 바인드 마운트(내 폴더, 개발 코드 · 설정), tmpfs(메모리, 임시).',
    '-v 이름:경로 는 볼륨, -v /경로 · ./경로 · ~/경로 는 바인드 마운트. :ro 로 읽기 전용. --mount 는 더 명확하고 없는 경로에 오류를 낸다.',
    'DB 는 반드시 이름 있는 볼륨에. 이미지의 VOLUME 이 만든 익명 볼륨은 새 컨테이너와 이어지지 않는다.',
    'postgres · mysql 초기화(비밀번호 등)는 볼륨이 비어 있을 때 한 번만 — 나중에 환경 변수를 바꿔도 적용되지 않는다.',
    '볼륨 백업은 볼륨과 호스트 폴더를 함께 연결한 임시 컨테이너(--rm)로 tar · cp 해서 한다.'
  ],

  quiz: [
    { q: '볼륨 없이 실행한 컨테이너 안에 만든 파일은 언제 사라질까요?', options: ['docker stop 할 때', 'docker restart 할 때', 'docker rm 으로 컨테이너를 삭제할 때', '호스트를 재부팅할 때'], answer: 2, explain: '파일은 컨테이너의 쓰기 층에 있어 stop · start · restart 로는 유지되지만, rm 하면 쓰기 층과 함께 삭제됩니다.' },
    { q: '<code>-v site:/usr/share/nginx/html</code> 을 실행했더니 내 ~/site 파일이 보이지 않습니다. 이유는?', options: ['nginx 가 바인드 마운트를 지원하지 않아서', '"site" 가 경로가 아닌 이름이라 새 볼륨 site 가 만들어졌기 때문', ':ro 를 붙이지 않아서', '포트를 게시하지 않아서'], answer: 1, explain: '콜론 왼쪽이 / · ./ · ~/ 로 시작하지 않으면 볼륨 이름으로 해석됩니다. ./site 나 ~/site 로 써야 바인드 마운트입니다.' },
    { q: 'PostgreSQL 데이터를 컨테이너 재생성 후에도 유지하는 가장 알맞은 방법은?', options: ['docker commit 으로 이미지를 만든다', '-v pgdata:/var/lib/postgresql/data 처럼 이름 있는 볼륨을 연결한다', '--tmpfs /var/lib/postgresql/data 를 쓴다', '--restart always 를 붙인다'], answer: 1, explain: 'DB 데이터 경로에 이름 있는 볼륨을 연결하면 컨테이너를 지워도 볼륨이 남고, 새 컨테이너가 같은 볼륨을 이어받습니다.' },
    { q: '볼륨 pgdata 로 postgres 를 쓰다가 <code>POSTGRES_PASSWORD</code> 만 바꿔 다시 실행했는데 새 비밀번호로 로그인이 안 됩니다. 왜일까요?', options: ['환경 변수는 -e 가 아니라 --env 로만 줄 수 있어서', '초기화는 데이터 폴더가 비어 있을 때만 실행되어 기존 비밀번호가 그대로라서', '볼륨은 읽기 전용이라서', 'postgres 는 비밀번호를 지원하지 않아서'], answer: 1, explain: '로그에 "Skipping initialization" 이 찍힙니다. DB 안에서 ALTER USER 로 바꾸거나, 데이터를 버려도 되면 볼륨을 지우고 다시 초기화합니다.' },
    { q: '<code>-v ~/site:/usr/share/nginx/html:ro</code> 의 효과로 옳은 것은?', options: ['호스트에서 ~/site 를 고칠 수 없게 된다', '컨테이너 안에서 그 경로에 쓰기가 거부된다', '컨테이너가 삭제되면 ~/site 도 삭제된다', '파일이 메모리에만 저장된다'], answer: 1, explain: ':ro 는 컨테이너 쪽을 읽기 전용으로 연결합니다. 호스트에서는 계속 자유롭게 편집할 수 있습니다.' },
    { q: '안 쓰는 볼륨을 정리하는 <code>docker volume prune</code> 에 대한 설명으로 옳은 것은?', options: ['실행 중인 컨테이너의 볼륨도 지운다', '기본으로는 안 쓰는 익명 볼륨만 지우고, -a 를 붙이면 안 쓰는 이름 있는 볼륨까지 지운다', '바인드 마운트한 호스트 폴더도 지운다', '지운 볼륨은 휴지통에서 복구할 수 있다'], answer: 1, explain: '최신 Docker 에서 prune 은 기본적으로 익명 볼륨만 대상으로 합니다. -a(--all)는 이름 있는 볼륨까지 지우므로 조심해야 하고, 삭제는 되돌릴 수 없습니다.' }
  ]
});
