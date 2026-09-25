/* 12장 — 디버깅과 문제 해결 */
Course.lesson({
  id: 'ch12', no: '12',
  icon: '🩺',
  title: '디버깅과 문제 해결',
  subtitle: '"왜 안 되지?"를 "아, 이거구나!"로 바꾸는 진료 순서',
  level: '중급', time: '120분',
  goals: [
    '상태 → 로그 → 설정 → 안으로 → 네트워크 → 자원 순서로 문제를 좁혀 갈 수 있다',
    'docker ps -a 의 STATUS 와 종료 코드(0 · 1 · 2 · 125 · 126 · 127 · 137 · 139 · 143)로 원인의 방향을 잡을 수 있다',
    'docker logs · inspect(--format) · exec · events · stats · top · diff · port 를 목적에 맞게 골라 쓸 수 있다',
    '포트 충돌 · 이미지 없음 · 환경 변수 누락 · 127.0.0.1 바인딩 · DNS 실패 · 볼륨 권한 · OOM 을 직접 재현하고 고칠 수 있다',
    'docker system df · prune 으로 디스크를 안전하게 정리할 수 있다'
  ],
  chips: ['docker ps -a', 'docker logs --tail 20 web', "docker inspect -f '{{.State.ExitCode}}' web", 'docker events --since 10m --until 0s', 'docker stats --no-stream', 'docker system df'],

  figs: {
    /* ---------------------------------------------------------------- 진료 순서 */
    triage: {
      caption: '문제 해결 6단계 — 병원에서 문진 → 검사 → 정밀 검사 순서로 가듯, 싸고 빠른 확인부터 합니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="상태, 로그, 설정, 안으로 들어가기, 네트워크, 자원 순서의 디버깅 단계">
  <rect x="10" y="40" width="130" height="150" rx="12" class="blue"/>
  <text x="75" y="70" class="t-xl t-c">🔎</text>
  <text x="75" y="104" class="t-b t-c">① 상태</text>
  <text x="75" y="128" class="t-xs t-c">접수 · 체온</text>
  <text x="75" y="160" class="t-xs t-c t-mono">ps -a</text>
  <text x="75" y="176" class="t-xs t-c t-mono">종료 코드</text>
  <rect x="155" y="40" width="130" height="150" rx="12" class="teal"/>
  <text x="220" y="70" class="t-xl t-c">📜</text>
  <text x="220" y="104" class="t-b t-c">② 로그</text>
  <text x="220" y="128" class="t-xs t-c">"어디가 아파요?"</text>
  <text x="220" y="160" class="t-xs t-c t-mono">logs --tail</text>
  <rect x="300" y="40" width="130" height="150" rx="12" class="purple"/>
  <text x="365" y="70" class="t-xl t-c">📋</text>
  <text x="365" y="104" class="t-b t-c">③ 설정</text>
  <text x="365" y="128" class="t-xs t-c">진료 기록 확인</text>
  <text x="365" y="160" class="t-xs t-c t-mono">inspect</text>
  <rect x="445" y="40" width="130" height="150" rx="12" class="green"/>
  <text x="510" y="70" class="t-xl t-c">🚪</text>
  <text x="510" y="104" class="t-b t-c">④ 안으로</text>
  <text x="510" y="128" class="t-xs t-c">직접 청진</text>
  <text x="510" y="160" class="t-xs t-c t-mono">exec · diff</text>
  <rect x="590" y="40" width="130" height="150" rx="12" class="orange"/>
  <text x="655" y="70" class="t-xl t-c">🌐</text>
  <text x="655" y="104" class="t-b t-c">⑤ 네트워크</text>
  <text x="655" y="128" class="t-xs t-c">혈관 검사</text>
  <text x="655" y="160" class="t-xs t-c t-mono">port · netshoot</text>
  <rect x="735" y="40" width="135" height="150" rx="12" class="red"/>
  <text x="802" y="70" class="t-xl t-c">📊</text>
  <text x="802" y="104" class="t-b t-c">⑥ 자원</text>
  <text x="802" y="128" class="t-xs t-c">혈액 · 영상 검사</text>
  <text x="802" y="160" class="t-xs t-c t-mono">stats · df</text>
  <line x1="140" y1="115" x2="153" y2="115" class="ln ar"/><line x1="285" y1="115" x2="298" y2="115" class="ln ar"/>
  <line x1="430" y1="115" x2="443" y2="115" class="ln ar"/><line x1="575" y1="115" x2="588" y2="115" class="ln ar"/>
  <line x1="720" y1="115" x2="733" y2="115" class="ln ar"/>
  <line x1="30" y1="232" x2="850" y2="232" class="ln-blue thick ar-blue"/>
  <text x="30" y="258" class="t-sm t-blue">빠르고 쉬움 · 80% 는 여기서 해결</text>
  <text x="850" y="258" class="t-sm t-e t-mu">느리지만 깊이 봄</text>
  <text x="440" y="284" class="t-xs t-c t-mu">📌 한 번에 하나만 바꾸고, 바꿀 때마다 다시 ① 부터 확인</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 종료 코드 지도 */
    exitmap: {
      caption: '종료 코드 지도 — 125~127 은 "시작도 못 함", 0~2 는 "앱이 스스로 끝남", 128 이상은 "신호로 죽음(128 + 신호 번호)"',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="종료 코드를 세 그룹으로 나눈 지도">
  <rect x="20" y="20" width="260" height="260" rx="14" class="green"/>
  <text x="150" y="48" class="t-b t-c">🏁 앱이 스스로 끝남</text>
  <text x="40" y="86" class="t-lg t-b t-mono">0</text><text x="80" y="86" class="t-sm">정상 종료</text>
  <text x="40" y="126" class="t-lg t-b t-mono">1</text><text x="80" y="126" class="t-sm">앱 오류 (예외 · 설정)</text>
  <text x="40" y="166" class="t-lg t-b t-mono">2</text><text x="80" y="166" class="t-sm">명령 잘못 사용</text>
  <text x="150" y="220" class="t-xs t-c">→ 👉 <tspan class="t-b">docker logs</tspan> 가 답</text>
  <text x="150" y="244" class="t-xs t-c t-mu">앱이 남긴 마지막 말을 읽기</text>
  <rect x="300" y="20" width="260" height="260" rx="14" class="orange"/>
  <text x="430" y="48" class="t-b t-c">🚫 시작도 못 함</text>
  <text x="320" y="86" class="t-lg t-b t-mono">125</text><text x="370" y="86" class="t-sm">docker 명령 · 데몬 실패</text>
  <text x="320" y="126" class="t-lg t-b t-mono">126</text><text x="370" y="126" class="t-sm">실행할 수 없음(권한)</text>
  <text x="320" y="166" class="t-lg t-b t-mono">127</text><text x="370" y="166" class="t-sm">실행 파일 없음</text>
  <text x="430" y="220" class="t-xs t-c">→ 👉 <tspan class="t-b">오류 메시지 · inspect</tspan></text>
  <text x="430" y="244" class="t-xs t-c t-mu">로그는 비어 있는 경우가 많음</text>
  <rect x="580" y="20" width="260" height="260" rx="14" class="red"/>
  <text x="710" y="48" class="t-b t-c">⚡ 신호로 죽음 (128+n)</text>
  <text x="600" y="86" class="t-lg t-b t-mono">130</text><text x="650" y="86" class="t-sm">Ctrl+C (SIGINT 2)</text>
  <text x="600" y="126" class="t-lg t-b t-mono">137</text><text x="650" y="126" class="t-sm">SIGKILL 9 · OOM</text>
  <text x="600" y="166" class="t-lg t-b t-mono">139</text><text x="650" y="166" class="t-sm">SIGSEGV 11 (충돌)</text>
  <text x="600" y="206" class="t-lg t-b t-mono">143</text><text x="650" y="206" class="t-sm">SIGTERM 15 (stop)</text>
  <text x="710" y="244" class="t-xs t-c">→ 👉 <tspan class="t-b">OOMKilled · events</tspan></text>
</svg>`
    },

    /* ---------------------------------------------------------------- netshoot 네임스페이스 공유 */
    netshoot: {
      caption: '--network container:web — 디버깅 컨테이너가 web 의 "네트워크 방"에 같이 들어갑니다. 파일 시스템은 따로라서 web 이미지는 깨끗하게 둔 채 도구만 빌려 씁니다',
      svg: `<svg class="dg" viewBox="0 0 860 320" role="img" aria-label="web 컨테이너와 netshoot 컨테이너가 하나의 네트워크 네임스페이스를 공유하는 그림">
  <rect x="20" y="20" width="820" height="280" rx="14" class="box"/>
  <text x="40" y="46" class="t-b">🖥️ 호스트</text>
  <rect x="60" y="70" width="740" height="90" rx="12" class="orange dash"/>
  <text x="80" y="96" class="t-b">🌐 네트워크 네임스페이스 (web 의 것) — 하나를 같이 씀</text>
  <text x="80" y="124" class="t-sm t-mono">lo 127.0.0.1 · eth0 172.17.0.2 · 열린 포트 :80</text>
  <text x="80" y="146" class="t-xs t-mu">둘 다 localhost:80 으로 nginx 에 닿고, 같은 IP · 같은 소켓 목록을 봅니다</text>
  <rect x="80" y="185" width="320" height="100" rx="12" class="green"/>
  <text x="240" y="211" class="t-b t-c">🐳 web (nginx)</text>
  <text x="240" y="236" class="t-xs t-c">파일 시스템: nginx 이미지</text>
  <text x="240" y="258" class="t-xs t-c t-mu">ping · dig · tcpdump 없음</text>
  <rect x="460" y="185" width="320" height="100" rx="12" class="teal"/>
  <text x="620" y="211" class="t-b t-c">🧰 nicolaka/netshoot</text>
  <text x="620" y="236" class="t-xs t-c">파일 시스템: 네트워크 도구 가득</text>
  <text x="620" y="258" class="t-xs t-c t-mu">curl · dig · ss · tcpdump · iperf …</text>
  <line x1="240" y1="185" x2="240" y2="162" class="ln-green ar-green"/>
  <line x1="620" y1="185" x2="620" y2="162" class="ln-teal ar-teal"/>
  <text x="430" y="238" class="t-sm t-c t-b">=</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 도구 지도 */
    toolbox: {
      caption: '무엇을 보고 싶은가에 따라 고르는 도구 — 컨테이너 한 개를 둘러싼 관찰 창들',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="컨테이너를 가운데 두고 logs, inspect, exec, top, diff, port, stats, events 가 둘러싼 지도">
  <rect x="320" y="120" width="220" height="100" rx="16" class="s-green"/>
  <text x="430" y="160" class="t-lg t-b t-c tw">🐳 web</text>
  <text x="430" y="188" class="t-xs t-c tw">문제가 있는 컨테이너</text>
  <rect x="20" y="20" width="230" height="64" rx="10" class="teal"/>
  <text x="135" y="46" class="t-b t-c t-mono">docker logs</text><text x="135" y="68" class="t-xs t-c">앱이 한 말 (stdout/stderr)</text>
  <rect x="315" y="20" width="230" height="64" rx="10" class="purple"/>
  <text x="430" y="46" class="t-b t-c t-mono">docker inspect</text><text x="430" y="68" class="t-xs t-c">설정 · 상태 전부 (JSON)</text>
  <rect x="610" y="20" width="230" height="64" rx="10" class="blue"/>
  <text x="725" y="46" class="t-b t-c t-mono">docker events</text><text x="725" y="68" class="t-xs t-c">데몬이 본 사건 시간순</text>
  <rect x="20" y="138" width="230" height="64" rx="10" class="green"/>
  <text x="135" y="164" class="t-b t-c t-mono">docker exec</text><text x="135" y="186" class="t-xs t-c">안에서 명령 실행</text>
  <rect x="610" y="138" width="230" height="64" rx="10" class="orange"/>
  <text x="725" y="164" class="t-b t-c t-mono">docker port</text><text x="725" y="186" class="t-xs t-c">호스트 ↔ 컨테이너 포트</text>
  <rect x="20" y="256" width="230" height="64" rx="10" class="yellow"/>
  <text x="135" y="282" class="t-b t-c t-mono">docker top</text><text x="135" y="304" class="t-xs t-c">안에서 도는 프로세스</text>
  <rect x="315" y="256" width="230" height="64" rx="10" class="gray"/>
  <text x="430" y="282" class="t-b t-c t-mono">docker diff</text><text x="430" y="304" class="t-xs t-c">이미지와 달라진 파일</text>
  <rect x="610" y="256" width="230" height="64" rx="10" class="red"/>
  <text x="725" y="282" class="t-b t-c t-mono">docker stats</text><text x="725" y="304" class="t-xs t-c">CPU · 메모리 · PIDS</text>
  <line x1="250" y1="70" x2="330" y2="122" class="ln thin"/><line x1="430" y1="84" x2="430" y2="118" class="ln thin"/>
  <line x1="610" y1="70" x2="530" y2="122" class="ln thin"/><line x1="250" y1="170" x2="318" y2="170" class="ln thin"/>
  <line x1="610" y1="170" x2="542" y2="170" class="ln thin"/><line x1="250" y1="270" x2="330" y2="218" class="ln thin"/>
  <line x1="430" y1="256" x2="430" y2="222" class="ln thin"/><line x1="610" y1="270" x2="530" y2="218" class="ln thin"/>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '문제 해결 순서 — 병원 진료처럼',
      html: `
<p>컨테이너가 안 될 때 초보자가 가장 많이 하는 행동은 "일단 지우고 다시 띄우기"입니다. 운 좋게 되면 원인을 모른 채 넘어가고, 안 되면 같은 일을 반복하죠.
이 장에서는 <b>정해진 순서</b>로 증거를 모아 원인을 좁히는 방법을 배웁니다.</p>

<div class="box analogy"><div class="box-t">🏥 비유 — 병원 진료 순서</div>
배가 아프다고 바로 수술하지 않습니다. <b>접수(상태) → 문진(로그) → 진료 기록(설정) → 청진 · 촉진(안으로) → 혈관 · 영상 검사(네트워크 · 자원)</b> 순으로,
<b>싸고 빠른 검사부터</b> 합니다. 대부분은 문진에서 원인이 나옵니다.</div>

{{fig:triage}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>단계</th><th>질문</th><th>먼저 쳐 볼 명령</th></tr>
<tr><td>① 상태</td><td>떠 있나? 죽었나? 몇 번 코드로?</td><td><code>docker ps -a</code></td></tr>
<tr><td>② 로그</td><td>앱이 마지막에 무슨 말을 했나?</td><td><code>docker logs --tail 50 이름</code></td></tr>
<tr><td>③ 설정</td><td>환경 변수 · 포트 · 마운트 · 네트워크가 내 생각과 같나?</td><td><code>docker inspect 이름</code></td></tr>
<tr><td>④ 안으로</td><td>안에서 보면 파일 · 프로세스 · 설정이 어떤가?</td><td><code>docker exec -it 이름 sh</code></td></tr>
<tr><td>⑤ 네트워크</td><td>포트가 제대로 이어졌나? 이름이 찾아지나?</td><td><code>docker port</code> · <code>curl</code> · <code>nslookup</code></td></tr>
<tr><td>⑥ 자원</td><td>메모리 · CPU · 디스크가 모자라나?</td><td><code>docker stats</code> · <code>docker system df</code></td></tr>
</table></div>

<div class="box tip"><div class="box-t">💡 디버깅의 세 가지 습관</div>
<ol class="steps-list">
<li><b>오류 메시지를 끝까지, 천천히 읽기</b> — Docker 오류는 길지만 마지막 줄 근처에 핵심(<code>port is already allocated</code>, <code>executable file not found</code>)이 있습니다.</li>
<li><b>한 번에 하나만 바꾸기</b> — 포트와 이미지와 환경 변수를 동시에 바꾸면 무엇이 고쳤는지 모릅니다.</li>
<li><b>지우기 전에 증거 남기기</b> — <code>docker rm</code> 하면 로그와 상태도 같이 사라집니다. 먼저 <code>logs</code> · <code>inspect</code> 를 보세요.</li>
</ol></div>

{{fig:toolbox}}
`
    },

    /* ================================================================ 2 */
    {
      title: '① 상태 — docker ps -a 와 종료 코드 읽기',
      html: `
<p><code>docker ps</code> 는 <b>실행 중인 것만</b> 보여 줍니다. 문제가 생긴 컨테이너는 대개 이미 죽어 있으니 <b>항상 <code>-a</code></b> 를 붙이세요.
여러 상황을 한꺼번에 만들어 보겠습니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name ok alpine echo done
docker run -d --name e1 alpine sh -c "exit 1"
docker run -d --name e2 alpine ls /nope
docker run -d --name nf alpine bash
docker run -d --name up nginx
docker ps -a</code></pre>
<pre class="code out" data-lang="출력"><code>docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "bash": executable file not found in $PATH: unknown.

CONTAINER ID   IMAGE    COMMAND                  CREATED                  STATUS                              PORTS    NAMES
09d9696b6275   nginx    "/docker-entrypoint.…"   Less than a second ago   Up Less than a second               80/tcp   up
b8de2476f9f7   alpine   "bash"                   Less than a second ago   Created                                      nf
ae55b5a15697   alpine   "ls /nope"               Less than a second ago   Exited (2) Less than a second ago            e2
aae27e9eb841   alpine   "sh -c exit 1"           Less than a second ago   Exited (1) Less than a second ago            e1
d845ec2fb51a   alpine   "echo done"              Less than a second ago   Exited (0) Less than a second ago            ok</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>STATUS</th><th>뜻</th><th>다음 행동</th></tr>
<tr><td><code>Up 3 minutes</code></td><td>실행 중</td><td>"떠 있는데 안 돼요"면 로그 · 포트 · 네트워크로</td></tr>
<tr><td><code>Up … (unhealthy)</code></td><td>실행 중이지만 헬스체크 실패</td><td><code>inspect</code> 의 <code>State.Health.Log</code></td></tr>
<tr><td><code>Exited (코드) … ago</code></td><td>끝났음</td><td>코드로 방향 잡기 → 로그</td></tr>
<tr><td><code>Restarting (코드)</code></td><td>죽고 되살아나기를 반복(재시작 정책)</td><td>로그 — 매번 같은 오류로 죽고 있음</td></tr>
<tr><td><code>Created</code></td><td>만들어졌지만 <b>시작에 실패</b></td><td>docker run 이 출력한 오류 메시지 · <code>State.Error</code></td></tr>
</table></div>

{{fig:exitmap}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>코드</th><th>뜻</th><th>흔한 원인</th><th>보는 곳</th></tr>
<tr><td><b>0</b></td><td>정상 종료</td><td>할 일을 다 한 명령(echo, 배치 작업). <b>서버인데 0 으로 끝났다면</b> 포그라운드로 안 떠 있는 것(<code>nginx</code> 를 데몬 모드로 실행, <code>service start</code> 후 끝남)</td><td>CMD 확인</td></tr>
<tr><td><b>1</b></td><td>앱의 일반 오류</td><td>예외 발생, 필수 환경 변수 누락, 설정 파일 오류, DB 접속 실패</td><td><code>docker logs</code></td></tr>
<tr><td><b>2</b></td><td>명령을 잘못 사용</td><td>셸 문법 오류, 없는 파일 인자(<code>ls /nope</code>)</td><td><code>docker logs</code></td></tr>
<tr><td><b>125</b></td><td><b>docker run 자체</b>가 실패</td><td>잘못된 옵션, 포트 충돌, 이름 충돌 — 컨테이너 안은 시작도 안 함</td><td>터미널의 오류 메시지</td></tr>
<tr><td><b>126</b></td><td>실행할 수 없음</td><td>실행 권한 없는 스크립트(<code>chmod +x</code> 누락), 디렉터리를 실행</td><td>오류 메시지 · Dockerfile</td></tr>
<tr><td><b>127</b></td><td>실행 파일을 못 찾음</td><td>alpine 에 bash 없음, CMD 오타, 설치 안 한 프로그램, 스크립트 경로 틀림</td><td>오류 메시지 · <code>State.Error</code></td></tr>
<tr><td><b>137</b></td><td>SIGKILL(128+9)</td><td>OOM, <code>docker kill</code>, stop 타임아웃(PID 1 문제)</td><td><code>State.OOMKilled</code> · events</td></tr>
<tr><td><b>139</b></td><td>SIGSEGV(128+11)</td><td>프로그램 충돌(메모리 접근 오류) — 네이티브 라이브러리, CPU 아키텍처 불일치</td><td>로그 · 이미지 플랫폼</td></tr>
<tr><td><b>143</b></td><td>SIGTERM(128+15)</td><td><code>docker stop</code> 으로 정상적으로 멈춤 — 대개 문제 아님</td><td>events 로 누가 멈췄는지</td></tr>
</table></div>

<p>종료 코드만 콕 집어 보려면:</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect -f '{{.State.ExitCode}}' e1
docker inspect -f '{{.State.ExitCode}} {{.State.Error}}' nf
docker ps -a --filter status=exited --format '{{.Names}}: {{.Status}}'</code></pre>
<pre class="code out" data-lang="출력"><code>1
127 failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "bash": executable file not found in $PATH: unknown
e2: Exited (2) Less than a second ago
e1: Exited (1) Less than a second ago
ok: Exited (0) Less than a second ago</code></pre>
<div class="box note"><div class="box-t">📝 -d 없이 실행했을 때는 $? 로</div>
포그라운드로 실행한 <code>docker run</code> 은 컨테이너의 종료 코드를 그대로 돌려줍니다. <code>docker run --rm alpine sh -c "exit 3"</code> 다음 <code>echo $?</code> 를 쳐 보세요 → <code>3</code>.
단, docker run 자체가 실패하면 125(또는 126 · 127)가 나옵니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm alpine sh -c "exit 3"
echo $?
docker rm ok e1 e2 nf
docker rm -f up</code></pre>
`
    },

    /* ================================================================ 3 */
    {
      title: '② 로그 · ③ 설정 — docker logs 와 docker inspect',
      html: `
<h4>docker logs — 앱이 남긴 마지막 말</h4>
<p>컨테이너의 메인 프로세스가 표준 출력(stdout) · 표준 오류(stderr)로 쓴 모든 글이 로그입니다. <b>죽은 컨테이너의 로그도</b> 지우기 전까지 남아 있습니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>옵션</th><th>뜻</th><th>예</th></tr>
<tr><td><code>--tail N</code> · <code>-n N</code></td><td>마지막 N 줄만</td><td><code>docker logs --tail 20 web</code></td></tr>
<tr><td><code>-f</code>, <code>--follow</code></td><td>새로 쌓이는 로그를 계속 보기 (<kbd>Ctrl</kbd>+<kbd>C</kbd> 로 끝)</td><td><code>docker logs -f --tail 10 web</code></td></tr>
<tr><td><code>-t</code>, <code>--timestamps</code></td><td>줄마다 Docker 가 받은 시각</td><td><code>docker logs -t web</code></td></tr>
<tr><td><code>--since</code> · <code>--until</code></td><td>기간 (<code>10m</code>, <code>1h</code>, 날짜)</td><td><code>docker logs --since 10m web</code></td></tr>
</table></div>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name db postgres:16-alpine
docker ps -a --filter name=db
docker logs db</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE                COMMAND                  CREATED        STATUS                    PORTS   NAMES
82b15d270c46   postgres:16-alpine   "docker-entrypoint.s…"   1 second ago   Exited (1) 1 second ago           db

Error: Database is uninitialized and superuser password is not specified.
       You must specify POSTGRES_PASSWORD to a non-empty value for the
       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".
…</code></pre>
<p>종료 코드 1 → 로그 → 원인과 해결책까지 친절하게 적혀 있습니다. 공식 이미지의 오류 메시지는 대부분 이렇게 "무엇을 하라"까지 알려 줍니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web -p 8080:80 nginx
curl -s localhost:8080
docker logs --tail 3 web
docker logs -t --since 5m --tail 1 web</code></pre>
<pre class="code out" data-lang="출력"><code>2026/09/25 18:09:31 [notice] 1#1: start worker process 29
2026/09/25 18:09:31 [notice] 1#1: start worker process 30
172.17.0.1 - - [25/Sep/2026:18:09:31 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.11.0" "-"

2026-09-25T18:09:31.049000000Z 172.17.0.1 - - [25/Sep/2026:18:09:31 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.11.0" "-"</code></pre>
<p>계속 지켜보려면 다음 명령을 실행하고 🌐 브라우저 탭에서 <code>localhost:8080</code> 을 새로 고침해 보세요. 요청마다 줄이 생깁니다. 다 봤으면 <kbd>Ctrl</kbd>+<kbd>C</kbd>.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker logs -f --tail 5 web</code></pre>

<div class="box warn"><div class="box-t">⚠️ 로그가 텅 비어 있다면</div>
<ul>
<li><b>시작도 못 한 경우</b>(Created, 125 · 127) — 로그가 아니라 docker run 이 출력한 오류 메시지를 보세요.</li>
<li><b>앱이 파일에만 로그를 쓰는 경우</b> — <code>docker exec 이름 tail /var/log/앱.log</code> 로 직접 봐야 합니다. 앱이 stdout 으로 쓰도록 바꾸는 것이 근본 해결입니다(8장).</li>
<li><b>파이썬 출력 버퍼링</b> — <code>print</code> 가 바로 안 보이면 <code>ENV PYTHONUNBUFFERED=1</code> 을 설정하세요.</li>
</ul></div>

<h4>docker inspect — 컨테이너의 진료 기록부</h4>
<p><code>docker inspect</code> 는 컨테이너의 <b>모든 설정과 상태</b>를 JSON 으로 보여 줍니다. 수백 줄이라 <code>--format</code>(<code>-f</code>) 에 <b>Go 템플릿</b>을 줘서 필요한 칸만 뽑습니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>알고 싶은 것</th><th>템플릿</th></tr>
<tr><td>상태 · 종료 코드 · 재시작 횟수</td><td><code>'{{.State.Status}} {{.State.ExitCode}} {{.RestartCount}}'</code></td></tr>
<tr><td>OOM 여부 · 시작 실패 이유</td><td><code>'{{.State.OOMKilled}}'</code> · <code>'{{.State.Error}}'</code></td></tr>
<tr><td>헬스체크 기록</td><td><code>'{{json .State.Health}}'</code></td></tr>
<tr><td>환경 변수</td><td><code>'{{json .Config.Env}}'</code> 또는 <code>'{{range .Config.Env}}{{println .}}{{end}}'</code></td></tr>
<tr><td>실제 실행 명령</td><td><code>'{{.Config.Entrypoint}} {{.Config.Cmd}}'</code></td></tr>
<tr><td>포트 게시</td><td><code>'{{json .NetworkSettings.Ports}}'</code></td></tr>
<tr><td>IP 주소 (네트워크별)</td><td><code>'{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'</code></td></tr>
<tr><td>마운트</td><td><code>'{{json .Mounts}}'</code></td></tr>
<tr><td>재시작 정책 · 메모리 제한</td><td><code>'{{.HostConfig.RestartPolicy.Name}} {{.HostConfig.Memory}}'</code></td></tr>
</table></div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect -f '{{.State.Status}} {{.State.ExitCode}} {{.RestartCount}}' web
docker inspect -f '{{json .NetworkSettings.Ports}}' web
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' web
docker inspect -f '{{.Config.Entrypoint}} {{.Config.Cmd}}' web</code></pre>
<pre class="code out" data-lang="출력"><code>running 0 0
{"80/tcp":[{"HostIp":"0.0.0.0","HostPort":"8080"},{"HostIp":"::","HostPort":"8080"}]}
172.17.0.2
[/docker-entrypoint.sh] [nginx -g daemon off;]</code></pre>
<div class="box tip"><div class="box-t">💡 템플릿 요령</div>
<code>{{json .어딘가}}</code> 로 먼저 덩어리를 본 다음, 필요한 칸으로 좁혀 가세요. 템플릿은 작은따옴표로 감싸야 셸이 <code>{{ }}</code> 나 <code>$</code> 를 건드리지 않습니다.
jq 가 있다면 <code>docker inspect web | jq '.[0].State'</code> 도 편합니다.</div>
`
    },

    /* ================================================================ 4 */
    {
      title: '④ 안으로 들어가기 — docker exec 와 디버깅 도구',
      html: `
<p>로그와 설정으로도 모르겠으면 컨테이너 <b>안에 들어가</b> 직접 봅니다. 실행 중인 컨테이너에 셸을 하나 더 띄우는 것이 <code>docker exec</code> 입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec web cat /etc/nginx/conf.d/default.conf
docker exec web ls -l /usr/share/nginx/html
docker exec web env</code></pre>
<pre class="code" data-lang="bash"><code>docker exec -it web bash          # debian 계열 이미지
docker exec -it 이름 sh            # alpine · busybox · 대부분의 이미지</code></pre>

<div class="box warn"><div class="box-t">⚠️ OCI runtime exec failed: exec: "bash": executable file not found</div>
alpine 기반 이미지에는 bash 가 없습니다. <b><code>sh</code></b> 로 들어가세요. distroless 처럼 <b>셸 자체가 없는</b> 이미지도 있습니다(7장) — 그럴 땐 아래 "디버깅 컨테이너"를 씁니다.</div>

<h4>없는 도구는 잠깐 설치하기</h4>
<p>슬림한 이미지에는 ping · curl · ps 같은 도구가 거의 없습니다. 디버깅하는 동안만 설치해 쓰고, 컨테이너를 지우면 같이 사라집니다.</p>
<div class="two">
<div><b>debian · ubuntu 계열</b>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec web sh -c "apt-get update &amp;&amp; apt-get install -y iputils-ping"
docker exec web ping -c 1 google.com</code></pre></div>
<div><b>alpine 계열</b>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name tools2 alpine sleep 3600
docker exec tools2 apk add --no-cache curl
docker exec tools2 curl -s http://example.com</code></pre></div>
</div>
<div class="box note"><div class="box-t">📝 exec 로 고친 것은 임시방편</div>
<code>docker exec</code> 로 설정 파일을 고쳐 문제가 풀렸다면, 그 수정을 <b>Dockerfile · 마운트 · 환경 변수</b>로 옮겨야 합니다. 컨테이너를 다시 만들면 exec 로 한 변경은 사라집니다.
무엇을 바꿨는지는 <code>docker diff</code> 가 알려 줍니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec web touch /tmp/debug.txt
docker diff web</code></pre>
<pre class="code out" data-lang="출력"><code>C /tmp
A /tmp/debug.txt</code></pre>
<p><code>A</code> 추가 · <code>C</code> 변경 · <code>D</code> 삭제. apt-get 으로 설치한 파일들도 여기에 잔뜩 나옵니다.</p>

<h4>디버깅 컨테이너 — nicolaka/netshoot</h4>
<p>운영 중인 이미지에 도구를 설치하는 대신, <b>도구가 가득 든 컨테이너를 옆에 붙이는</b> 방법이 더 깔끔합니다. <code>nicolaka/netshoot</code> 은 curl · dig · nslookup · ss · tcpdump · iperf 등 네트워크 도구 모음 이미지입니다.</p>
{{fig:netshoot}}
<pre class="code" data-lang="bash"><code># web 의 네트워크 네임스페이스에 들어가 붙기 (실제 Docker)
docker run --rm -it --network container:web nicolaka/netshoot
# 안에서:  ss -tlnp   →  web 이 어떤 포트를 듣는지
#          curl -s localhost   →  web 입장에서 자기 자신에게 요청</code></pre>
<p><code>--network container:web</code> 은 "web 과 <b>같은 네트워크 방</b>을 쓰라"는 뜻입니다. 그래서 netshoot 안의 <code>localhost</code> 가 곧 web 의 localhost 이고, web 이 127.0.0.1 에만 열어 둔 포트도 보입니다.
(이 실습 환경은 <code>container:</code> 모드를 흉내 내지 않으므로, 아래처럼 <b>같은 사용자 정의 네트워크</b>에 붙여서 연습합니다.)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create debugnet
docker network connect debugnet web
docker run --rm --network debugnet nicolaka/netshoot nslookup web
docker run --rm --network debugnet nicolaka/netshoot dig +short web
docker run --rm --network debugnet nicolaka/netshoot curl -s web</code></pre>
<pre class="code out" data-lang="출력"><code>Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	web
Address: 172.18.0.2

172.18.0.2
&lt;!DOCTYPE html&gt;
&lt;html&gt;
…</code></pre>
<div class="box trend"><div class="box-t">🚀 최신 동향 — docker debug</div>
Docker Desktop 에는 셸조차 없는 이미지에 디버깅 도구 셸을 붙여 주는 <code>docker debug</code> 명령이 있습니다(구독 플랜에 따라 제공). 쿠버네티스에는 같은 목적의 <code>kubectl debug</code> 가 있습니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f tools2</code></pre>
`
    },

    /* ================================================================ 5 */
    {
      title: '⑤ · ⑥ 관찰 도구 — events · stats · top · port',
      html: `
<h4>docker events — 데몬의 사건 일지</h4>
<p>"누가 이 컨테이너를 멈췄지?", "몇 번이나 재시작했지?" 는 <b>events</b> 가 답합니다. 기본은 실시간으로 계속 보여 주고, <code>--since</code> · <code>--until</code> 로 지난 기록을 볼 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name flaky --restart on-failure:2 alpine sh -c "sleep 1; exit 1"
docker stop web
docker start web
docker events --since 10m --until 0s --filter container=web
docker events --since 10m --until 0s --filter container=flaky</code></pre>
<pre class="code out" data-lang="출력"><code>2026-09-25T18:25:26.263000000+00:00 container create 55a5547a263d107188b012ef281b5875d7f09397219deea61fd897407f7f94e9 (name=web)
2026-09-25T18:25:26.265000000+00:00 container start 55a5547a263d107188b012ef281b5875d7f09397219deea61fd897407f7f94e9 (name=web)
2026-09-25T18:25:26.267000000+00:00 container kill 55a5547a263d107188b012ef281b5875d7f09397219deea61fd897407f7f94e9 (name=web)
2026-09-25T18:25:26.268000000+00:00 container die 55a5547a263d107188b012ef281b5875d7f09397219deea61fd897407f7f94e9 (name=web)
2026-09-25T18:25:26.268000000+00:00 container stop 55a5547a263d107188b012ef281b5875d7f09397219deea61fd897407f7f94e9 (name=web)
2026-09-25T18:25:26.268000000+00:00 container start 55a5547a263d107188b012ef281b5875d7f09397219deea61fd897407f7f94e9 (name=web)

2026-09-25T18:25:26.266000000+00:00 container create 3219ca95732f7ea46efc77f595923b232895dfa737a2065a7faada573881d275 (name=flaky)
2026-09-25T18:25:26.266000000+00:00 container start 3219ca95732f7ea46efc77f595923b232895dfa737a2065a7faada573881d275 (name=flaky)
2026-09-25T18:25:27.267000000+00:00 container die 3219ca95732f7ea46efc77f595923b232895dfa737a2065a7faada573881d275 (name=flaky)
2026-09-25T18:25:27.871000000+00:00 container restart 3219ca95732f7ea46efc77f595923b232895dfa737a2065a7faada573881d275 (name=flaky)
2026-09-25T18:25:28.878000000+00:00 container die 3219ca95732f7ea46efc77f595923b232895dfa737a2065a7faada573881d275 (name=flaky)</code></pre>
<p>(flaky 의 기록은 몇 초 기다렸다가 다시 보면 늘어납니다.)</p>
<ul>
<li><code>die</code> 는 "프로세스가 끝남", <code>kill</code> · <code>stop</code> 이 먼저 있으면 <b>누군가 멈춘 것</b>, <code>restart</code> 가 반복되면 <b>재시작 정책이 살리고 있는 것</b>입니다. OOM 이면 <code>oom</code> 사건도 기록됩니다.</li>
<li>실시간 감시: 아래 명령을 실행해 둔 채 다른 창(또는 📊 대시보드)에서 컨테이너를 만들고 지워 보세요. <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 끝냅니다.</li>
</ul>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f flaky
docker events --filter type=container</code></pre>

<h4>docker stats · top · port</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker stats --no-stream
docker top web
docker port web</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O           BLOCK I/O   PIDS
8b5a6d76e9c2   web    0.23%   6.93MiB / 8GiB      0.08%   3.24kB / 1.66kB   0B / 0B     9

UID        PID    PPID   C   STIME   TTY   TIME       CMD
root       8943   8923   0   03:11   ?     00:00:00   nginx -g daemon off;
message+   8994   8943   0   03:11   ?     00:00:00   nginx: worker process

80/tcp -> 0.0.0.0:8080
80/tcp -> [::]:8080</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>이럴 때</th><th>보는 점</th></tr>
<tr><td><code>docker stats</code></td><td>느려요 · 자꾸 죽어요</td><td>MEM % 가 100% 근처? CPU 가 제한(--cpus)에 붙어 있나? PIDS 가 폭증?</td></tr>
<tr><td><code>docker top</code></td><td>안에서 뭐가 돌고 있지?</td><td>메인 프로세스가 기대한 명령인가, 좀비 · 고아 프로세스는 없나</td></tr>
<tr><td><code>docker port</code></td><td>브라우저로 안 열려요</td><td>게시 포트가 있나, 컨테이너 쪽 포트 번호가 앱이 듣는 포트와 같은가</td></tr>
<tr><td><code>docker diff</code></td><td>누가 파일을 바꿨지?</td><td>예상치 못한 변경, 쓰기 층에 쌓이는 큰 파일(로그 · 캐시)</td></tr>
</table></div>
<p>📊 대시보드 탭은 이 정보들을 한 화면에 모아 보여 줍니다.</p>
{{widget:open|pane=dash}}
`
    },

    /* ================================================================ 6 */
    {
      title: '흔한 오류 20가지 — 원인 → 해결',
      html: `
<p>오류 메시지의 <b>핵심 문구</b>로 찾아보세요. 대부분 이 표 안에 있습니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>#</th><th>오류 메시지 (핵심 문구)</th><th>원인</th><th>해결</th></tr>
<tr><td>1</td><td><code>Cannot connect to the Docker daemon at unix:///var/run/docker.sock</code></td><td>데몬이 꺼져 있음 · Docker Desktop 미실행</td><td><code>sudo systemctl start docker</code>, Desktop 실행</td></tr>
<tr><td>2</td><td><code>permission denied while trying to connect to the Docker daemon socket</code></td><td>현재 사용자가 docker 그룹이 아님</td><td><code>sudo usermod -aG docker $USER</code> 후 다시 로그인 (1장)</td></tr>
<tr><td>3</td><td><code>port is already allocated</code></td><td>그 호스트 포트를 다른 컨테이너가 사용 중</td><td><code>docker ps</code> 로 찾아 멈추거나 다른 호스트 포트 사용</td></tr>
<tr><td>4</td><td><code>address already in use</code></td><td>호스트의 다른 프로그램(로컬 nginx · DB)이 포트 사용</td><td><code>sudo ss -tlnp | grep 8080</code> 로 찾기, 다른 포트</td></tr>
<tr><td>5</td><td><code>Conflict. The container name "/web" is already in use</code></td><td>같은 이름의 컨테이너(멈춘 것 포함)가 있음</td><td><code>docker rm web</code> 또는 다른 이름, 일회용은 <code>--rm</code></td></tr>
<tr><td>6</td><td><code>pull access denied … repository does not exist</code></td><td>이미지 이름 오타, 로그인 필요한 비공개 저장소, 로컬에서 빌드 안 함</td><td>철자 확인, <code>docker login</code>, <code>docker build -t</code></td></tr>
<tr><td>7</td><td><code>manifest for nginx:9.9 not found: manifest unknown</code></td><td>없는 태그</td><td>Docker Hub 에서 태그 목록 확인</td></tr>
<tr><td>8</td><td><code>no matching manifest for linux/arm64</code></td><td>내 CPU(예: Apple Silicon)용 이미지가 없음</td><td>다른 태그, <code>--platform linux/amd64</code>(느림), 멀티 플랫폼 빌드(11장)</td></tr>
<tr><td>9</td><td><code>exec: "bash": executable file not found in $PATH</code></td><td>이미지에 그 프로그램이 없음 (alpine 의 bash)</td><td><code>sh</code> 사용, 필요한 패키지 설치</td></tr>
<tr><td>10</td><td><code>exec ./start.sh: permission denied</code> (126)</td><td>스크립트 실행 권한 없음</td><td>Dockerfile 에 <code>RUN chmod +x start.sh</code> 또는 <code>COPY --chmod=755</code></td></tr>
<tr><td>11</td><td><code>exec ./start.sh: no such file or directory</code> (파일은 있는데)</td><td>윈도 줄바꿈(CRLF)이나 없는 셔뱅(<code>#!/bin/bash</code> 인데 bash 없음)</td><td>LF 로 저장, 셔뱅을 <code>#!/bin/sh</code> 로</td></tr>
<tr><td>12</td><td><code>container … is not running</code></td><td>죽은 컨테이너에 exec</td><td><code>docker ps -a</code> · <code>logs</code> 로 죽은 이유부터</td></tr>
<tr><td>13</td><td><code>Exited (0)</code> — 서버가 바로 꺼짐</td><td>메인 프로세스가 백그라운드로 가버림</td><td>포그라운드로 실행(<code>nginx -g 'daemon off;'</code>)</td></tr>
<tr><td>14</td><td><code>POSTGRES_PASSWORD</code> · <code>MYSQL_ROOT_PASSWORD</code> 관련 오류 (1)</td><td>필수 환경 변수 누락</td><td><code>-e</code> 로 지정 (8장)</td></tr>
<tr><td>15</td><td><code>curl: (56) Recv failure: Connection reset by peer</code></td><td>앱이 컨테이너 안의 <b>127.0.0.1</b> 에만 열려 있음 · -p 의 컨테이너 포트가 틀림</td><td>앱을 <code>0.0.0.0</code> 에 바인딩, 포트 확인</td></tr>
<tr><td>16</td><td><code>curl: (7) Failed to connect … Connection refused</code></td><td>포트 게시(-p) 없음 · 컨테이너가 죽음 · 앱이 아직 준비 안 됨</td><td><code>docker port</code>, <code>ps -a</code>, 잠시 후 재시도</td></tr>
<tr><td>17</td><td><code>ping: bad address 'db'</code> · <code>Name or service not known</code></td><td>기본 bridge 에서는 이름으로 못 찾음 · 다른 네트워크</td><td>사용자 정의 네트워크에 함께 연결 (4장)</td></tr>
<tr><td>18</td><td><code>Permission denied</code> (볼륨 · 마운트에 쓰기)</td><td>non-root 사용자인데 디렉터리 주인이 root</td><td>이미지에서 폴더를 만들고 <code>chown</code>, 호스트 폴더 권한 맞추기</td></tr>
<tr><td>19</td><td><code>Exited (137)</code> · <code>OOMKilled: true</code></td><td>메모리 제한 초과</td><td><code>-m</code> 늘리기, 앱 메모리 설정 · 누수 수정</td></tr>
<tr><td>20</td><td><code>no space left on device</code></td><td>이미지 · 빌드 캐시 · 로그 · 볼륨으로 디스크가 가득</td><td><code>docker system df</code> → <code>prune</code>, 로그 max-size (8장)</td></tr>
</table></div>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 오류 메시지로 검색하기</div>
검색할 때는 컨테이너 ID · 경로 같은 <b>나만의 값은 빼고</b> 핵심 문구만 따옴표로 묶으세요. 예: <code>"port is already allocated" docker</code>.
Docker 의 GitHub 이슈와 Stack Overflow 에 대부분의 사례가 있습니다.</div>
`
    },

    /* ================================================================ 7 */
    {
      title: '장애 사례 ① — 시작이 안 될 때',
      html: `
<p>실제로 자주 만나는 장애를 <b>재현 → 진단 → 해결</b> 순서로 풀어 봅니다. 각 사례를 직접 실행해 보세요.</p>

<h4>사례 1. 포트 충돌 — port is already allocated</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name old -p 8081:80 httpd:2.4
docker run -d --name web2 -p 8081:80 nginx</code></pre>
<pre class="code out" data-lang="출력"><code>docker: Error response from daemon: driver failed programming external connectivity on endpoint web2 (fc31aed7…): Bind for 0.0.0.0:8081 failed: port is already allocated.</code></pre>
<ol class="steps-list">
<li><b>상태</b> — <code>docker ps -a</code> 를 보면 <code>web2</code> 는 <code>Created</code>(시작 실패)로 남아 있습니다.</li>
<li><b>진단</b> — 누가 8081 을 쓰나? <code>docker ps | grep 8081</code> (또는 <code>docker ps --filter publish=8081</code>) → <code>old</code>. 컨테이너가 아니라 호스트 프로그램이면 <code>sudo ss -tlnp | grep 8081</code>.</li>
<li><b>해결</b> — old 를 멈추거나, web2 를 다른 포트로. 실패한 web2 는 이름을 차지하고 있으니 먼저 지웁니다.</li>
</ol>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps | grep 8081
docker rm web2
docker run -d --name web2 -p 8082:80 nginx
docker ps --format 'table {{.Names}}\\t{{.Ports}}'</code></pre>

<h4>사례 2. 이름 충돌 — Conflict. The container name is already in use</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web2 -p 8083:80 nginx</code></pre>
<pre class="code out" data-lang="출력"><code>docker: Error response from daemon: Conflict. The container name "/web2" is already in use by container "a09172dd…". You have to remove (or rename) that container to be able to reuse that name.</code></pre>
<p><b>멈춘 컨테이너도 이름을 차지</b>합니다. 필요 없으면 <code>docker rm -f web2</code>, 남겨야 하면 <code>docker rename web2 web2-old</code>. 실습용 일회성 컨테이너는 처음부터 <code>--rm</code> 을 붙이는 습관이 좋습니다.</p>

<h4>사례 3. 이미지 없음 — pull access denied</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name proxy ngnix:1.27</code></pre>
<pre class="code out" data-lang="출력"><code>Unable to find image 'ngnix:1.27' locally
docker: Error response from daemon: pull access denied for ngnix, repository does not exist or may require 'docker login': denied: requested access to the resource is denied</code></pre>
<p>"access denied" 라는 말에 로그인 문제로 착각하기 쉽지만, Docker Hub 는 <b>없는 저장소</b>에도 같은 메시지를 줍니다(존재 여부를 숨기려고). 순서대로 의심하세요: ① <b>철자</b>(ngnix → nginx) ② 내가 빌드만 하고 이름을 다르게 붙였나(<code>docker images</code>) ③ 비공개 저장소라 <code>docker login</code> 이 필요한가.</p>

<h4>사례 4. 실행 파일 없음 — exec: "bash"</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name tools alpine sleep 3600
docker exec tools bash</code></pre>
<pre class="code out" data-lang="출력"><code>OCI runtime exec failed: exec failed: unable to start container process: exec: "bash": executable file not found in $PATH: unknown</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec tools sh -c "cat /etc/os-release | head -2"
docker exec tools apk add --no-cache bash
docker exec tools bash -c "echo 이제 bash 가 있어요"</code></pre>
<p><code>docker run 이미지 bash</code> 처럼 <b>메인 명령</b>이 없으면 컨테이너는 <code>Created</code> 상태로 남고 종료 코드는 127 입니다.
Dockerfile 의 <code>CMD ["./start.sh"]</code> 경로를 틀렸을 때도 같은 오류가 납니다 — <code>WORKDIR</code> 와 <code>COPY</code> 대상 경로를 확인하세요.</p>

<h4>사례 5. 데이터베이스가 바로 꺼짐 — 환경 변수 누락</h4>
<p>앞 절에서 본 <code>db</code> 컨테이너(Exited (1))를 고칩니다. <b>환경 변수는 만든 뒤에 바꿀 수 없으므로</b> 지우고 다시 만듭니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm db
docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16-alpine</code></pre>
<p>데이터베이스는 초기화에 몇 초가 걸립니다. 잠시 뒤에 로그와 접속을 확인하세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker logs --tail 2 db
docker exec db psql -U postgres -c "SELECT 1"</code></pre>
<pre class="code out" data-lang="출력"><code>2026-09-25 18:25:24.570 UTC [29] LOG:  database system was shut down at 2026-09-25 18:25:24.570 UTC
2026-09-25 18:25:24.570 UTC [1] LOG:  database system is ready to accept connections

 ?column?
----------
        1
(1 row)</code></pre>
<p>접속이 안 되면(<code>connection to server … failed</code>) 로그에 <code>ready to accept connections</code> 가 나올 때까지 조금 더 기다리세요.</p>
<div class="box tip"><div class="box-t">💡 "잠깐 떴다 꺼짐"의 공통 원인</div>
필수 환경 변수 누락 · 설정 파일 문법 오류 · 연결할 DB 가 아직 준비 안 됨 · 데이터 디렉터리 권한. <b>로그 마지막 몇 줄</b>에 거의 항상 답이 있습니다.
재시작 정책이 걸려 있으면 <code>Restarting</code> 이 반복되는데, 이때도 <code>docker logs</code> 는 여러 번의 실행 기록을 이어서 보여 줍니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f old web2 tools db</code></pre>
`
    },

    /* ================================================================ 8 */
    {
      title: '장애 사례 ② — 떠 있는데 안 될 때',
      html: `
<h4>사례 6. 컨테이너는 Up 인데 브라우저가 안 열림 — 127.0.0.1 바인딩</h4>
<p>가장 헷갈리는 장애입니다. 상태도 정상, 로그도 정상, 포트 게시도 했는데 접속이 끊깁니다.</p>
<pre class="code" data-lang="python" data-file="~/local-app/app.py"><code>from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "&lt;h1&gt;Hello from Flask!&lt;/h1&gt;"

if __name__ == "__main__":
    app.run(port=5000)</code></pre>
<pre class="code" data-lang="text" data-file="~/local-app/requirements.txt"><code>flask</code></pre>
<pre class="code" data-lang="Dockerfile" data-file="~/local-app/Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/local-app
docker build -t local-app .
docker run -d --name api -p 5000:5000 local-app
curl localhost:5000
docker ps --filter name=api
docker port api
docker logs api</code></pre>
<pre class="code out" data-lang="출력"><code>curl: (56) Recv failure: Connection reset by peer

CONTAINER ID   IMAGE       COMMAND           CREATED        STATUS        PORTS                                         NAMES
76d5decab011   local-app   "python app.py"   1 second ago   Up 1 second   0.0.0.0:5000->5000/tcp, [::]:5000->5000/tcp   api

5000/tcp -> 0.0.0.0:5000
5000/tcp -> [::]:5000

 * Serving Flask app 'app'
 * Debug mode: off
 * Running on <span class="hl">http://127.0.0.1:5000</span>
Press CTRL+C to quit</code></pre>
<p>① 상태 Up ✔ ② 포트 게시 ✔ ③ 그런데 로그에 <b>Running on http://127.0.0.1:5000</b>. 컨테이너 안의 127.0.0.1 은 <b>컨테이너 자기 자신</b>만 뜻합니다.
Docker 가 호스트에서 받은 요청을 컨테이너의 <b>eth0(172.17.0.x)</b> 으로 넘겨주는데, 앱은 그쪽 문을 안 열어 둔 것이죠. (📮 비유: 우편물은 아파트 정문으로 오는데, 집주인은 "안방 문으로만 받겠다"고 한 상황)</p>
<p>해결은 앱이 <b>모든 인터페이스(0.0.0.0)</b> 에서 듣게 하는 것입니다. 아래 파일로 고쳐 저장하고 다시 빌드하세요.</p>
<pre class="code" data-lang="python" data-file="~/local-app/app.py"><code>from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "&lt;h1&gt;Hello from Flask!&lt;/h1&gt;"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -t local-app .
docker rm -f api
docker run -d --name api -p 5000:5000 local-app
curl -s localhost:5000</code></pre>
<pre class="code out" data-lang="출력"><code>&lt;h1&gt;Hello from Flask!&lt;/h1&gt;</code></pre>
<div class="box note"><div class="box-t">📝 프레임워크별 "0.0.0.0" 설정</div>
Flask <code>app.run(host="0.0.0.0")</code> 또는 <code>flask run --host 0.0.0.0</code> · uvicorn <code>--host 0.0.0.0</code> · Node <code>app.listen(3000)</code>(기본이 모든 주소) ·
Vite 개발 서버 <code>--host</code> · Rails <code>-b 0.0.0.0</code>. 반대로 <code>-p 127.0.0.1:8080:80</code> 은 <b>호스트</b> 쪽을 내 PC 에서만 접속되게 막는 것으로, 서로 다른 이야기입니다.</div>

<h4>사례 7. 이름으로 못 찾음 — ping: bad address</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name cache redis:7-alpine
docker run --rm alpine ping -c 1 cache</code></pre>
<pre class="code out" data-lang="출력"><code>ping: bad address 'cache'</code></pre>
<p><b>기본 bridge 네트워크</b>에서는 컨테이너 이름 DNS 가 동작하지 않습니다(4장). 사용자 정의 네트워크를 만들어 <b>양쪽을 함께</b> 연결합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create appnet
docker network connect appnet cache
docker run --rm --network appnet alpine ping -c 1 cache
docker run --rm --network appnet nicolaka/netshoot nslookup cache</code></pre>
<pre class="code out" data-lang="출력"><code>PING cache (172.19.0.2): 56 data bytes
64 bytes from 172.19.0.2: seq=0 ttl=64 time=0.173 ms
…</code></pre>
<div class="box tip"><div class="box-t">💡 DNS 문제 체크리스트</div>
① 두 컨테이너가 <b>같은 사용자 정의 네트워크</b>에 있나? (<code>docker inspect -f '{{json .NetworkSettings.Networks}}' 이름</code>) ② 이름 철자 · 대소문자 ③ 앱 설정에 <code>localhost</code> 를 적지 않았나? (컨테이너 안의 localhost 는 자기 자신!) ④ Compose 라면 <b>서비스 이름</b>으로 부르기(9장).</div>

<h4>사례 8. 볼륨에 쓰기 실패 — Permission denied</h4>
<pre class="code" data-lang="Dockerfile" data-file="~/perm/Dockerfile"><code>FROM alpine:3.20
RUN adduser -D app
USER app
CMD ["sh", "-c", "echo started &gt;&gt; /logs/app.log &amp;&amp; echo ok &amp;&amp; sleep 3600"]</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/perm
docker build -t permapp .
docker run -d --name logger -v applogs:/logs permapp
docker ps -a --filter name=logger
docker logs logger</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE     COMMAND                  CREATED        STATUS                    PORTS   NAMES
8984de4df131   permapp   "sh -c echo started …"   1 second ago   Exited (1) 1 second ago           logger

sh: /logs/app.log: Permission denied</code></pre>
<p>보안을 위해 <code>USER app</code>(non-root)으로 바꿨더니, 새 볼륨의 <code>/logs</code> 는 <b>root 소유</b>라 쓸 수 없습니다.
새 이름 있는 볼륨은 이미지의 같은 경로에 있던 내용과 <b>소유권을 복사</b>해 오므로, 이미지에서 폴더를 미리 만들고 주인을 바꿔 두면 됩니다.</p>
<pre class="code" data-lang="Dockerfile" data-file="~/perm/Dockerfile"><code>FROM alpine:3.20
RUN adduser -D app &amp;&amp; mkdir /logs &amp;&amp; chown app:app /logs
USER app
CMD ["sh", "-c", "echo started &gt;&gt; /logs/app.log &amp;&amp; echo ok &amp;&amp; sleep 3600"]</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -t permapp .
docker rm -f logger
docker volume rm applogs
docker run -d --name logger -v applogs:/logs permapp
docker exec logger cat /logs/app.log</code></pre>
<pre class="code out" data-lang="출력"><code>started</code></pre>
<div class="box note"><div class="box-t">📝 바인드 마운트라면</div>
호스트 폴더(<code>-v ./data:/data</code>)는 <b>호스트의 권한 그대로</b> 보입니다. 컨테이너 사용자의 UID(예: 1000)와 호스트 폴더 주인 UID 를 맞추거나(<code>-u $(id -u):$(id -g)</code>), 호스트에서 권한을 조정하세요.</div>

<h4>사례 9. 자꾸 죽는 데이터베이스 — OOM</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name mydb -m 256m -e MYSQL_ROOT_PASSWORD=secret mysql:8.4
docker wait mydb
docker inspect -f '{{.State.OOMKilled}} {{.HostConfig.Memory}}' mydb
docker update -m 1g --memory-swap 1g mydb
docker start mydb
docker stats --no-stream mydb</code></pre>
<pre class="code out" data-lang="출력"><code>137
true 268435456
mydb
mydb
CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %    NET I/O         BLOCK I/O   PIDS
e3811af44b54   mydb   0.22%   382MiB / 1GiB       37.31%   2.04kB / 860B   0B / 0B     38</code></pre>
<p>로그에는 시작 메시지 한 줄뿐이고 끝 인사도 없습니다 — <b>말없이 사라지면 OOM</b> 을 의심하세요. <code>docker update</code> 로 컨테이너를 지우지 않고 한도를 올린 뒤 다시 시작했습니다. 한도를 올리기 전에 "정말 그만큼 필요한가, 누수는 아닌가"를 <code>docker stats</code> 로 관찰하는 것도 잊지 마세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f api cache logger mydb
docker network rm appnet</code></pre>
`
    },

    /* ================================================================ 9 */
    {
      title: '디스크 정리 — docker system df 와 prune',
      html: `
<p>Docker 를 몇 달 쓰면 옛 이미지, 끝난 컨테이너, 쓰지 않는 볼륨, 빌드 캐시가 수십 GB 씩 쌓입니다. 디스크가 가득 차면 <code>no space left on device</code> 로 빌드도, DB 쓰기도 실패합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker system df</code></pre>
<pre class="code out" data-lang="출력"><code>TYPE            TOTAL   ACTIVE   SIZE    RECLAIMABLE
Images          3       1        626MB   434MB (69%)
Containers      1       1        0B      0B
Local Volumes   0       0        0B      0B
Build Cache     0       0        0B      0B</code></pre>
<p><b>RECLAIMABLE</b> 은 "지금 아무도 안 쓰니 지워도 되는 양"입니다. 자세히 보려면 <code>docker system df -v</code>.</p>

<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>지우는 것</th><th>위험도</th></tr>
<tr><td><code>docker container prune</code></td><td>멈춘 컨테이너 전부</td><td><span class="tag yellow">중간</span> 로그 · 쓰기 층도 사라짐</td></tr>
<tr><td><code>docker image prune</code></td><td>태그 없는(dangling, &lt;none&gt;) 이미지</td><td><span class="tag green">낮음</span></td></tr>
<tr><td><code>docker image prune -a</code></td><td>컨테이너가 쓰지 않는 <b>모든</b> 이미지</td><td><span class="tag yellow">중간</span> 다시 pull · build 필요</td></tr>
<tr><td><code>docker builder prune</code></td><td>빌드 캐시</td><td><span class="tag green">낮음</span> 다음 빌드가 느려짐</td></tr>
<tr><td><code>docker volume prune</code></td><td>안 쓰는 익명 볼륨 (<code>-a</code> 는 이름 있는 볼륨까지)</td><td><span class="tag red">높음</span> <b>데이터가 사라짐</b></td></tr>
<tr><td><code>docker system prune</code></td><td>멈춘 컨테이너 + 안 쓰는 네트워크 + dangling 이미지 + 빌드 캐시</td><td><span class="tag yellow">중간</span></td></tr>
</table></div>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run --name tmp1 alpine echo 1
docker run --name tmp2 alpine sh -c "exit 3"
docker container prune -f
docker image prune -f
docker system df</code></pre>
<pre class="code out" data-lang="출력"><code>1
Deleted Containers:
3064d8689342ba732d60f078cc8ebcda059bfc81f35a80231cbbebed02248bf2
fc24b0afd89468f0df7f5724d556d4438fb0aed629587e8302c9a31e642c38ac

Total reclaimed space: 2.4kB
Total reclaimed space: 0B</code></pre>

<div class="box warn"><div class="box-t">⚠️ prune 전에 꼭</div>
<ul>
<li><code>-f</code> 는 "정말 지울까요?" 확인을 건너뜁니다. 처음에는 <code>-f</code> 없이 실행해 <b>무엇이 지워지는지</b> 읽어 보세요.</li>
<li><b>볼륨은 따로</b> 다룹니다. <code>docker system prune --volumes</code> · <code>docker volume prune -a</code> 는 데이터베이스 데이터를 날릴 수 있습니다. <code>docker volume ls</code> 로 확인하고 필요한 것은 백업(5장)하세요.</li>
<li>오래된 것만 지우려면 필터: <code>docker image prune -a --filter "until=168h"</code> (7일 이상 된 것)</li>
</ul></div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 디스크 장애 예방</div>
① 로그 드라이버에 <code>max-size</code>(8장) ② CI 서버는 주기적으로 <code>docker builder prune</code> · <code>image prune -a --filter until=…</code> ③ <code>docker system df</code> 를 모니터링 항목에 추가.
디스크가 이미 100% 라면 가장 큰 것부터: 로그 파일(<code>/var/lib/docker/containers/*/*-json.log</code>) → 빌드 캐시 → 안 쓰는 이미지 순으로 봅니다.</div>

{{widget:mission}}
`
    }
  ],

  missions: [
    {
      id: 'm1', scenario: true,
      title: '포트가 이미 사용 중! 두 웹 서버 모두 살리기',
      desc: '⚙️ 상황 만들기를 누르면 httpd 컨테이너 <code>old</code> 가 8080 을 쓰고 있고, nginx 컨테이너 <code>web</code> 은 같은 포트를 쓰려다 <b>시작에 실패</b>합니다. <code>old</code> 는 그대로 두고, <code>web</code> 을 호스트 <b>8081</b> 포트로 띄워 두 서버가 모두 동작하게 하세요.',
      setup: ['docker run -d --name old -p 8080:80 httpd:2.4', 'docker run -d --name web -p 8080:80 nginx'],
      hint: '<code>docker ps -a</code> 를 보면 <code>web</code> 이 <code>Created</code> 로 이름을 차지하고 있습니다. <code>docker rm web</code> → <code>docker run -d --name web -p 8081:80 nginx</code>',
      answer: ['docker rm web', 'docker run -d --name web -p 8081:80 nginx'],
      check: M => M.running('old') && M.running('web') && M.port(8080) === M.c('old') && M.port(8081) === M.c('web')
    },
    {
      id: 'm2', scenario: true,
      title: 'pull access denied — 이미지 이름을 바로잡기',
      desc: '⚙️ 상황 만들기를 누르면 누군가 <code>proxy</code> 컨테이너를 8088 포트에 띄우려다 실패합니다. 오류 메시지를 읽고 원인을 찾아, <code>proxy</code> 라는 이름으로 <b>nginx 1.27</b> 이미지를 8088 포트(컨테이너 80)에 띄우세요.',
      setup: ['docker run -d --name proxy -p 8088:80 ngnix:1.27'],
      hint: '이미지 이름 철자를 보세요: <code>ngnix</code> → <code>nginx</code>. <code>docker run -d --name proxy -p 8088:80 nginx:1.27</code>',
      answer: ['docker run -d --name proxy -p 8088:80 nginx:1.27'],
      check: M => M.running('proxy') && /^nginx:1\.27/.test(M.c('proxy').image) && M.port(8088) === M.c('proxy')
    },
    {
      id: 'm3', scenario: true,
      title: '데이터베이스가 바로 꺼진다',
      desc: '⚙️ 상황 만들기를 누르면 postgres 컨테이너 <code>db</code> 가 만들어지지만 곧바로 <code>Exited (1)</code> 이 됩니다. <code>docker logs db</code> 로 원인을 찾아, 같은 이름 <code>db</code> 로 <b>실행 중</b> 상태가 되게 고치세요.',
      setup: ['docker run -d --name db postgres:16-alpine'],
      hint: '로그에 <code>POSTGRES_PASSWORD</code> 를 지정하라고 나옵니다. 환경 변수는 나중에 바꿀 수 없으니 <code>docker rm db</code> 후 <code>-e POSTGRES_PASSWORD=secret</code> 을 붙여 다시 실행하세요.',
      answer: ['docker rm db', 'docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16-alpine'],
      check: M => M.running('db') && !!M.env('db', 'POSTGRES_PASSWORD')
    },
    {
      id: 'm4', scenario: true,
      title: 'bash 도 curl 도 없는 컨테이너',
      desc: '⚙️ 상황 만들기를 누르면 alpine 컨테이너 <code>tools</code> 가 실행됩니다. <code>docker exec -it tools bash</code> 는 실패하고, 안에서 <code>curl</code> 도 없습니다. 올바른 셸로 들어가거나 exec 로 명령을 실행해 <b>tools 컨테이너에 curl 을 설치</b>하세요.',
      setup: ['docker run -d --name tools alpine sleep 3600'],
      hint: 'alpine 의 패키지 관리자는 <code>apk</code> 입니다. <code>docker exec tools apk add --no-cache curl</code> (또는 <code>docker exec -it tools sh</code> 로 들어가서 설치)',
      answer: ['docker exec tools apk add --no-cache curl'],
      check: M => M.running('tools') && M.D.hasTool(M.c('tools'), 'curl')
    },
    {
      id: 'm5', scenario: true,
      title: 'ping: bad address — 이름으로 찾게 하기',
      desc: '⚙️ 상황 만들기를 누르면 redis 컨테이너 <code>cache</code> 와 alpine 컨테이너 <code>client</code> 가 기본 bridge 네트워크에 뜹니다. <code>docker exec client ping -c 1 cache</code> 가 <code>bad address</code> 로 실패합니다. 컨테이너를 지우지 말고, 두 컨테이너가 <b>이름으로 서로 찾을 수 있게</b> 만드세요.',
      setup: ['docker run -d --name cache redis:7-alpine', 'docker run -d --name client alpine sleep 3600'],
      hint: '사용자 정의 네트워크를 만들고(<code>docker network create appnet</code>) 두 컨테이너를 <code>docker network connect</code> 로 연결하세요.',
      answer: ['docker network create appnet', 'docker network connect appnet cache', 'docker network connect appnet client', 'docker exec client ping -c 1 cache'],
      check: M => M.running('cache') && M.running('client') && Object.keys(M.c('cache').networks).some(n => !['bridge', 'host', 'none'].includes(n) && M.connected('client', n))
    },
    {
      id: 'm6', scenario: true,
      title: '말없이 죽는 MySQL — OOM 해결',
      desc: '⚙️ 상황 만들기를 누르면 <code>mydb</code>(mysql:8.4) 가 메모리 128MB 제한으로 실행되었다가 곧 <code>Exited (137)</code> 이 됩니다. <code>OOMKilled</code> 를 확인하고, 컨테이너를 <b>지우지 않고</b> 메모리 한도를 <b>512MB 이상</b>으로 올려 다시 실행 중으로 만드세요.',
      setup: ['docker run -d --name mydb -m 128m -e MYSQL_ROOT_PASSWORD=secret mysql:8.4', 'docker wait mydb'],
      hint: '<code>docker inspect -f \'{{.State.OOMKilled}}\' mydb</code> → <code>docker update -m 1g --memory-swap 1g mydb</code> → <code>docker start mydb</code>',
      answer: ["docker inspect -f '{{.State.OOMKilled}}' mydb", 'docker update -m 1g --memory-swap 1g mydb', 'docker start mydb'],
      check: M => M.running('mydb') && M.memory('mydb') >= 512 * 1024 * 1024
    },
    {
      id: 'm7', scenario: true,
      title: '이름이 이미 사용 중 — 새 버전으로 교체',
      desc: '⚙️ 상황 만들기를 누르면 멈춰 있는 옛 컨테이너 <code>app</code>(nginx:1.27) 이 있습니다. <code>app</code> 이라는 이름으로 <b>nginx:alpine</b> 컨테이너를 호스트 <b>8090</b> 포트에 새로 띄우세요. (그냥 run 하면 Conflict 오류가 납니다.)',
      setup: ['docker run -d --name app nginx:1.27', 'docker stop app'],
      hint: '멈춘 컨테이너도 이름을 차지합니다. <code>docker rm app</code> → <code>docker run -d --name app -p 8090:80 nginx:alpine</code>',
      answer: ['docker rm app', 'docker run -d --name app -p 8090:80 nginx:alpine'],
      check: M => M.running('app') && M.c('app').image === 'nginx:alpine' && M.port(8090) === M.c('app')
    },
    {
      id: 'm8',
      title: '멈춘 컨테이너 한꺼번에 정리하기',
      desc: '⚙️ 상황 만들기를 누르면 끝난 컨테이너 몇 개와 실행 중인 <code>keep</code> 이 만들어집니다. <b>실행 중인 컨테이너는 그대로 두고</b>, 멈춘(Exited · Created) 컨테이너를 모두 지우세요. 먼저 <code>docker system df</code> 로 정리할 양을 확인해 보세요.',
      setup: ['docker run --name tmp1 alpine echo 1', 'docker run --name tmp2 alpine sh -c "exit 3"', 'docker run -d --name keep nginx'],
      hint: '<code>docker container prune</code> (확인 질문에 y) 또는 <code>docker container prune -f</code>',
      answer: ['docker system df', 'docker container prune -f'],
      check: M => M.running('keep') && M.cs(c => c.state.status !== 'running').length === 0
    }
  ],

  videos: [
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '2시간 46분', desc: 'docker logs · exec 로 컨테이너를 들여다보는 장면을 복습하세요' },
    { title: 'docker 디버깅 트러블슈팅 (검색)', url: 'https://www.youtube.com/results?search_query=docker+%EB%94%94%EB%B2%84%EA%B9%85+%ED%8A%B8%EB%9F%AC%EB%B8%94%EC%8A%88%ED%8C%85', desc: '유튜브 검색 결과 — 한국어 문제 해결 영상' },
    { title: 'docker container exit codes explained (검색)', url: 'https://www.youtube.com/results?search_query=docker+container+exit+codes+137+139+143', desc: '유튜브 검색 결과 — 종료 코드 설명' },
    { title: 'nicolaka netshoot network troubleshooting (검색)', url: 'https://www.youtube.com/results?search_query=netshoot+docker+network+troubleshooting', desc: '유튜브 검색 결과 — netshoot 으로 네트워크 디버깅' },
    { title: 'docker system prune disk space (검색)', url: 'https://www.youtube.com/results?search_query=docker+system+prune+disk+space', desc: '유튜브 검색 결과 — 디스크 정리' }
  ],

  terms: [
    ['종료 코드(exit code)', '프로세스가 끝나며 남기는 숫자. 0 은 성공, 그 밖은 실패. 128 이상은 128 + 신호 번호'],
    ['STATUS', 'docker ps 의 상태 칸. Up · Exited (코드) · Restarting · Created · (healthy/unhealthy)'],
    ['Created 상태', '컨테이너는 만들어졌지만 시작에 실패한 상태. 포트 충돌 · 실행 파일 없음 등에서 남음'],
    ['docker logs', '컨테이너 메인 프로세스의 stdout/stderr 기록. --tail · -f · -t · --since'],
    ['docker inspect', '컨테이너 · 이미지 · 네트워크 · 볼륨의 전체 설정과 상태를 JSON 으로 보여 주는 명령'],
    ['Go 템플릿(--format)', "inspect · ps 등에서 필요한 칸만 뽑는 문법. 예: '{{.State.ExitCode}}', '{{json .Mounts}}'"],
    ['docker exec', '실행 중인 컨테이너 안에서 명령(셸 포함)을 하나 더 실행'],
    ['nicolaka/netshoot', '네트워크 디버깅 도구 모음 이미지. --network container:이름 으로 대상의 네트워크에 붙여 씀'],
    ['docker events', '데몬이 기록한 create · start · die · kill · restart · oom 등의 사건을 시간순으로 보여 줌'],
    ['docker diff', '컨테이너 쓰기 층에서 이미지 대비 추가(A) · 변경(C) · 삭제(D)된 파일 목록'],
    ['0.0.0.0 바인딩', '모든 네트워크 인터페이스에서 연결을 받겠다는 뜻. 컨테이너 앱은 127.0.0.1 이 아니라 0.0.0.0 에서 들어야 -p 가 동작'],
    ['dangling 이미지', '태그가 떨어져 &lt;none&gt; 으로 남은 이미지. 같은 이름으로 다시 빌드하면 생김'],
    ['prune', '안 쓰는 컨테이너 · 이미지 · 네트워크 · 볼륨 · 빌드 캐시를 한꺼번에 지우는 명령 계열']
  ],

  summary: [
    '문제 해결은 상태(ps -a) → 로그(logs) → 설정(inspect) → 안으로(exec) → 네트워크(port · DNS) → 자원(stats · df) 순서로, 싸고 빠른 확인부터 합니다.',
    '종료 코드로 방향을 잡습니다: 0~2 는 앱이 스스로 끝남(로그 보기), 125~127 은 시작도 못 함(오류 메시지), 137 · 139 · 143 은 신호(OOM · 충돌 · stop).',
    'docker logs --tail · -f · -t · --since 로 앱의 말을 듣고, docker inspect -f 템플릿으로 설정 · 상태를 콕 집어 봅니다.',
    '도구가 없는 이미지는 apk · apt-get 으로 잠깐 설치하거나 netshoot 같은 디버깅 컨테이너를 옆에 붙입니다. exec 로 고친 것은 Dockerfile 로 옮겨야 합니다.',
    '"Up 인데 접속이 안 됨"은 127.0.0.1 바인딩 · 포트 번호 불일치, "bad address"는 기본 bridge · 다른 네트워크, "Permission denied"는 non-root 와 볼륨 소유권을 의심합니다.',
    'docker system df 로 쌓인 양을 보고 prune 으로 정리하되, 볼륨 prune 은 데이터가 사라지니 가장 조심합니다.'
  ],

  quiz: [
    {
      q: 'docker ps -a 에서 컨테이너 STATUS 가 "Created" 로 남아 있습니다. 가장 가능성이 높은 것은?',
      options: ['정상적으로 실행 중이다', '시작 단계에서 실패했다 (포트 충돌 · 실행 파일 없음 등)', '헬스체크가 unhealthy 다', 'OOM 으로 죽었다'],
      answer: 1,
      explain: 'Created 는 컨테이너 객체는 만들어졌지만 프로세스 시작에 실패한 상태입니다. docker run 이 출력한 오류 메시지와 State.Error 를 확인하세요.'
    },
    {
      q: '종료 코드 127 의 뜻으로 가장 알맞은 것은?',
      options: ['메모리 부족', '실행할 프로그램을 찾지 못함', '정상 종료', 'docker stop 으로 멈춤'],
      answer: 1,
      explain: '127 은 "command not found" 입니다. alpine 에 bash 가 없거나 CMD 경로가 틀린 경우가 대표적입니다.'
    },
    {
      q: 'Flask 컨테이너가 Up 이고 -p 5000:5000 도 했는데 curl 이 "Connection reset by peer" 입니다. 로그에 "Running on http://127.0.0.1:5000" 이 보입니다. 해결책은?',
      options: ['-p 127.0.0.1:5000:5000 으로 바꾼다', '앱을 host="0.0.0.0" 으로 실행한다', '컨테이너를 --restart always 로 띄운다', '메모리 제한을 늘린다'],
      answer: 1,
      explain: '컨테이너 안의 127.0.0.1 은 컨테이너 자신만 뜻합니다. Docker 가 전달하는 요청은 eth0 으로 들어오므로 앱이 0.0.0.0 에서 들어야 합니다.'
    },
    {
      q: '다음 중 "누가, 언제 이 컨테이너를 멈췄는지" 알아보기에 가장 알맞은 명령은?',
      options: ['docker diff', 'docker events --since 1h --until 0s', 'docker port', 'docker image prune'],
      answer: 1,
      explain: 'docker events 는 kill · stop · die · restart 같은 사건을 시간순으로 기록합니다.'
    },
    {
      q: '기본 bridge 네트워크의 두 컨테이너에서 ping cache 가 "bad address" 로 실패합니다. 알맞은 해결은?',
      options: ['두 컨테이너를 사용자 정의 네트워크에 함께 연결한다', '두 컨테이너에 -p 옵션을 추가한다', 'cache 를 --restart always 로 다시 띄운다', '/etc/hosts 를 호스트에서 수정한다'],
      answer: 0,
      explain: '컨테이너 이름 DNS 는 사용자 정의 네트워크에서만 동작합니다. docker network create 후 connect 하세요.'
    },
    {
      q: '디스크 정리 명령 중 데이터가 사라질 위험이 가장 큰 것은?',
      options: ['docker image prune', 'docker builder prune', 'docker volume prune -a', 'docker system df'],
      answer: 2,
      explain: 'volume prune -a 는 컨테이너가 쓰지 않는 이름 있는 볼륨까지 지웁니다. DB 데이터가 들어 있을 수 있으니 확인 · 백업 후 실행하세요.'
    },
    {
      q: 'docker exec 로 컨테이너 안의 설정 파일을 고쳐 문제가 해결됐습니다. 다음에 할 일은?',
      options: ['아무것도 하지 않는다 — 영원히 유지된다', '같은 수정을 Dockerfile · 마운트 · 환경 변수로 옮긴다', 'docker commit 만 하면 충분하다', '컨테이너를 --rm 으로 다시 띄운다'],
      answer: 1,
      explain: 'exec 로 바꾼 내용은 그 컨테이너의 쓰기 층에만 있어 다시 만들면 사라집니다. 재현 가능한 방법(Dockerfile 등)으로 옮겨야 합니다.'
    }
  ]
});
