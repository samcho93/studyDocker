/* 3장 — 컨테이너 생명주기 */
Course.lesson({
  id: 'ch03', no: '03',
  icon: '🔄',
  title: '컨테이너 생명주기',
  subtitle: '만들고, 켜고, 들여다보고, 멈추고, 지우기 — 컨테이너의 한살이',
  level: '입문', time: '100분',
  goals: [
    'docker run 의 -d · -it · --name · --rm 옵션을 목적에 맞게 골라 쓸 수 있다',
    'created · running · paused · exited 상태와 그 사이를 오가는 명령(start · stop · kill · pause · rm)을 설명할 수 있다',
    '"메인 프로세스가 끝나면 컨테이너도 끝난다"는 원리로 docker run ubuntu 가 바로 끝나는 이유를 말할 수 있다',
    'ps · logs · exec · attach 로 컨테이너 상태와 속을 확인할 수 있다',
    '종료 코드 0 · 1 · 127 · 137 · 143 을 읽고 원인을 짐작할 수 있다'
  ],
  chips: ['docker ps -a', 'docker logs --tail 5 web', 'docker exec web ls /', 'docker stats --no-stream', 'docker container prune -f'],

  figs: {
    /* ------------------------------------------------------------ 상태 전이도 */
    states: {
      caption: '컨테이너의 네 가지 상태와 그 사이를 오가는 명령 — docker run 은 create 와 start 를 한 번에 합니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="created, running, paused, exited 상태와 명령으로 이루어진 상태 전이도">
  <rect x="20" y="135" width="120" height="56" rx="28" class="gray"/>
  <text x="80" y="158" class="t-c t-b">이미지</text><text x="80" y="177" class="t-xs t-c t-mu">(틀)</text>

  <rect x="200" y="130" width="140" height="66" rx="14" class="yellow"/>
  <text x="270" y="156" class="t-c t-b">Created</text><text x="270" y="178" class="t-xs t-c t-mu">만들어만 둠</text>

  <rect x="430" y="130" width="140" height="66" rx="14" class="green"/>
  <text x="500" y="156" class="t-c t-b">Running</text><text x="500" y="178" class="t-xs t-c t-mu">실행 중 (Up)</text>

  <rect x="430" y="18" width="140" height="56" rx="14" class="purple"/>
  <text x="500" y="40" class="t-c t-b">Paused</text><text x="500" y="60" class="t-xs t-c t-mu">얼음! (Paused)</text>

  <rect x="680" y="130" width="160" height="66" rx="14" class="red"/>
  <text x="760" y="156" class="t-c t-b">Exited</text><text x="760" y="178" class="t-xs t-c t-mu">종료됨 (코드 남음)</text>

  <rect x="680" y="250" width="160" height="56" rx="28" class="box dash"/>
  <text x="760" y="278" class="t-c t-b t-mu">🗑️ 삭제됨</text>

  <line x1="140" y1="163" x2="197" y2="163" class="ln ar"/><text x="169" y="152" class="t-xs t-c t-mono">create</text>
  <line x1="340" y1="163" x2="427" y2="163" class="ln-green ar-green"/><text x="384" y="152" class="t-xs t-c t-mono t-green">start</text>
  <line x1="570" y1="152" x2="677" y2="152" class="ln-red ar-red"/><text x="624" y="142" class="t-xs t-c t-mono t-red">stop · kill</text>
  <path d="M680,185 Q625,225 572,185" class="ln-green ar-green" fill="none"/><text x="626" y="228" class="t-xs t-c t-mono t-green">start · restart</text>
  <line x1="485" y1="128" x2="485" y2="77" class="ln-purple ar-purple"/><text x="478" y="104" class="t-xs t-e t-mono t-purple">pause</text>
  <line x1="515" y1="77" x2="515" y2="128" class="ln-purple ar-purple"/><text x="522" y="104" class="t-xs t-mono t-purple">unpause</text>
  <line x1="760" y1="196" x2="760" y2="247" class="ln ar"/><text x="768" y="224" class="t-xs t-mono">rm</text>
  <path d="M500,196 Q520,285 677,280" class="ln dash ar" fill="none"/><text x="560" y="292" class="t-xs t-c t-mono">rm -f</text>
  <path d="M270,196 Q300,300 677,290" class="ln thin dash" fill="none"/>
  <path d="M80,191 Q80,240 250,240 L430,240" class="ln-blue dash" fill="none"/>
  <path d="M430,240 Q470,240 480,200" class="ln-blue dash ar-blue" fill="none"/>
  <text x="250" y="258" class="t-xs t-c t-mono t-blue t-b">docker run = (pull) + create + start</text>
  <text x="760" y="110" class="t-xs t-c t-mu">메인 프로세스가 끝나도 여기로</text>
</svg>`
    },

    /* ------------------------------------------------------------ 메인 프로세스 */
    pid1: {
      caption: '컨테이너의 수명 = 메인 프로세스(PID 1)의 수명. 할 일이 끝난 프로세스는 곧바로 종료되고, 컨테이너도 따라서 Exited 가 됩니다',
      svg: `<svg class="dg" viewBox="0 0 860 280" role="img" aria-label="ubuntu 의 bash 는 바로 끝나고 nginx 는 계속 실행되는 타임라인">
  <line x1="170" y1="250" x2="840" y2="250" class="ln thin ar"/>
  <text x="840" y="268" class="t-xs t-e t-mu">시간 →</text>

  <text x="20" y="60" class="t-sm t-b t-mono">docker run</text>
  <text x="20" y="80" class="t-sm t-b t-mono">ubuntu</text>
  <rect x="170" y="45" width="36" height="40" rx="6" class="s-green"/>
  <text x="188" y="65" class="t-xs t-c tw t-b">bash</text>
  <line x1="206" y1="65" x2="260" y2="65" class="ln-red ar-red"/>
  <rect x="265" y="45" width="140" height="40" rx="8" class="red"/>
  <text x="335" y="65" class="t-sm t-c">Exited (0)</text>
  <text x="420" y="58" class="t-xs">입력할 터미널(-it)이 없으니 bash 가</text>
  <text x="420" y="76" class="t-xs">"할 일 없네" 하고 즉시 끝남 → 컨테이너도 끝</text>

  <text x="20" y="140" class="t-sm t-b t-mono">docker run -d</text>
  <text x="20" y="160" class="t-sm t-b t-mono">nginx</text>
  <rect x="170" y="125" width="560" height="40" rx="8" class="s-green"/>
  <text x="450" y="145" class="t-sm t-c tw">nginx -g 'daemon off;' — 요청을 기다리며 계속 실행 (Up)</text>
  <line x1="170" y1="145" x2="730" y2="145" class="ln-green moving"/>
  <line x1="740" y1="110" x2="740" y2="180" class="ln-red dash"/>
  <text x="745" y="125" class="t-xs t-red t-mono">docker stop</text>
  <rect x="750" y="132" width="90" height="28" rx="6" class="red"/><text x="795" y="146" class="t-xs t-c">Exited (0)</text>

  <text x="20" y="215" class="t-sm t-b t-mono">docker run -d</text>
  <text x="20" y="233" class="t-sm t-b t-mono">ubuntu sleep infinity</text>
  <rect x="200" y="200" width="620" height="36" rx="8" class="teal"/>
  <text x="510" y="218" class="t-sm t-c">sleep 이 끝나지 않으므로 컨테이너도 계속 Up</text>
</svg>`
    },

    /* ------------------------------------------------------------ exec vs attach */
    execAttach: {
      caption: 'attach 는 이미 돌고 있는 메인 프로세스(PID 1)의 화면에 접속하고, exec 는 컨테이너 안에 새 프로세스를 하나 더 띄웁니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="attach 는 PID 1 에 연결되고 exec 는 새 프로세스를 만드는 그림">
  <rect x="300" y="20" width="540" height="260" rx="20" class="green"/>
  <text x="570" y="48" class="t-lg t-c">📦 컨테이너 web</text>

  <rect x="340" y="75" width="220" height="70" rx="12" class="box"/>
  <text x="450" y="100" class="t-b t-c t-mono">PID 1 · nginx</text>
  <text x="450" y="124" class="t-xs t-c t-mu">메인 프로세스 (끝나면 컨테이너 종료)</text>

  <rect x="340" y="180" width="220" height="70" rx="12" class="s-teal"/>
  <text x="450" y="205" class="t-b t-c t-mono tw">PID 7 · sh</text>
  <text x="450" y="229" class="t-xs t-c tw">exec 로 새로 띄운 프로세스</text>

  <rect x="600" y="75" width="210" height="175" rx="12" class="box dash"/>
  <text x="705" y="100" class="t-sm t-c t-b">같은 파일 시스템</text>
  <text x="705" y="125" class="t-xs t-c t-mono">/etc/nginx</text>
  <text x="705" y="145" class="t-xs t-c t-mono">/usr/share/nginx/html</text>
  <text x="705" y="165" class="t-xs t-c t-mono">/var/log …</text>
  <text x="705" y="200" class="t-xs t-c">같은 네트워크 · 환경</text>
  <text x="705" y="222" class="t-xs t-c t-mu">(둘 다 이 안에서 동작)</text>

  <rect x="20" y="75" width="220" height="70" rx="12" class="blue"/>
  <text x="130" y="100" class="t-sm t-c t-b t-mono">docker attach web</text>
  <text x="130" y="124" class="t-xs t-c">PID 1 의 입출력에 접속</text>
  <line x1="240" y1="110" x2="337" y2="110" class="ln-blue thick ar-blue"/>

  <rect x="20" y="180" width="220" height="70" rx="12" class="teal"/>
  <text x="130" y="205" class="t-sm t-c t-b t-mono">docker exec -it web sh</text>
  <text x="130" y="229" class="t-xs t-c">새 셸 프로세스를 추가</text>
  <line x1="240" y1="215" x2="337" y2="215" class="ln-teal thick ar-teal"/>

  <text x="130" y="282" class="t-xs t-c t-red">attach 중 Ctrl+C → PID 1 이 멈출 수 있음!</text>
  <text x="130" y="165" class="t-xs t-c t-mu">빠져나오기: Ctrl+P, Ctrl+Q</text>
</svg>`
    },

    /* ------------------------------------------------------------ stop vs kill */
    stopKill: {
      caption: 'docker stop 은 먼저 정중하게(SIGTERM) 부탁하고 10초 기다린 뒤 강제로(SIGKILL) 끄고, docker kill 은 바로 강제로 끕니다',
      svg: `<svg class="dg" viewBox="0 0 860 250" role="img" aria-label="docker stop 의 SIGTERM, 10초 대기, SIGKILL 과 docker kill 의 즉시 SIGKILL 비교">
  <text x="20" y="45" class="t-b t-mono">docker stop</text>
  <rect x="150" y="25" width="150" height="40" rx="8" class="s-orange"/>
  <text x="225" y="45" class="t-sm t-c tw t-b">① SIGTERM</text>
  <rect x="310" y="25" width="300" height="40" rx="8" class="yellow"/>
  <text x="460" y="45" class="t-sm t-c">② 정리할 시간 (기본 10초, -t 로 조절)</text>
  <rect x="620" y="25" width="220" height="40" rx="8" class="s-red"/>
  <text x="730" y="45" class="t-sm t-c tw t-b">③ 그래도 안 끝나면 SIGKILL</text>
  <text x="225" y="88" class="t-xs t-c">"이제 정리하고 끝내 줘"</text>
  <text x="460" y="88" class="t-xs t-c">앱이 저장 · 연결 종료 후 스스로 끝나면 OK (보통 0 · 143)</text>
  <text x="730" y="88" class="t-xs t-c t-red">강제 종료 → 137</text>

  <line x1="20" y1="118" x2="840" y2="118" class="ln thin dash"/>

  <text x="20" y="160" class="t-b t-mono">docker kill</text>
  <rect x="150" y="140" width="220" height="40" rx="8" class="s-red"/>
  <text x="260" y="160" class="t-sm t-c tw t-b">SIGKILL (즉시)</text>
  <text x="390" y="160" class="t-sm">정리할 틈 없이 바로 끝 → 종료 코드 <tspan class="t-b t-red">137</tspan></text>

  <rect x="20" y="198" width="820" height="40" rx="10" class="blue"/>
  <text x="430" y="218" class="t-sm t-c">💡 평소에는 stop · 응답이 없을 때만 kill — 전원 버튼 길게 누르기와 비슷합니다</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '컨테이너의 한살이 — 네 가지 상태',
      html: `
<p>2장에서 이미지(틀)를 다뤘다면, 이번 장은 그 틀로 찍어 낸 <b>컨테이너(붕어빵)</b> 를 다룹니다. 컨테이너는 한 번 만들어지면
<b>실행 중 → 멈춤 → 다시 실행 → 삭제</b> 처럼 여러 상태를 오갑니다. 이 흐름을 <b>생명주기(lifecycle)</b> 라고 합니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 노트북 한 대</div>
<b>Created</b> 는 포장만 뜯은 새 노트북, <b>Running</b> 은 켜져서 일하는 중, <b>Paused</b> 는 "얼음!" 하고 화면이 멈춘 상태,
<b>Exited</b> 는 전원을 끈 상태입니다. 전원을 꺼도 하드디스크의 파일은 남아 있어서 다시 켤 수 있지요. <b>삭제</b>는 노트북을 버리는 것 — 그때 파일도 같이 사라집니다.</div>
{{fig:states}}
<table class="tbl">
<tr><th>상태</th><th>docker ps 의 STATUS</th><th>뜻</th></tr>
<tr><td><span class="tag yellow">created</span></td><td><code>Created</code></td><td>만들어졌지만 한 번도 시작 안 함 (<code>docker create</code>)</td></tr>
<tr><td><span class="tag green">running</span></td><td><code>Up 3 minutes</code></td><td>메인 프로세스가 실행 중</td></tr>
<tr><td><span class="tag purple">paused</span></td><td><code>Up 3 minutes (Paused)</code></td><td>프로세스가 얼어 있음 (메모리엔 그대로)</td></tr>
<tr><td><span class="tag red">exited</span></td><td><code>Exited (0) 5 seconds ago</code></td><td>메인 프로세스가 끝남. 괄호 안 숫자가 <b>종료 코드</b></td></tr>
</table>
<p>아래 위젯의 버튼을 눌러 보세요. 오른쪽 터미널에서 진짜 명령이 실행되고, 컨테이너 <code>demo</code> 의 현재 상태가 그림에 불이 들어옵니다.
<b>create → start → pause → unpause → stop → start → kill → rm</b> 순서로 눌러 보면 한 바퀴를 다 돌 수 있습니다.</p>
{{widget:lifecycle|name=demo}}
<div class="box note"><div class="box-t">📝 Exited 는 "지워진 것"이 아닙니다</div>
멈춘 컨테이너도 <code>docker ps -a</code> 에 남아 있고, 쓰기 층의 파일 · 로그 · 설정이 그대로 있어서 <code>docker start</code> 로 다시 켤 수 있습니다.
정말 없애려면 <code>docker rm</code> 을 해야 합니다. 그래서 치우지 않으면 멈춘 컨테이너가 계속 쌓입니다 (9절).</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'docker run 해부 — -d · -it · --name · --rm',
      html: `
<p><code>docker run</code> 은 사실 여러 단계를 한 번에 해 주는 명령입니다.</p>
<div class="flow">
<div class="fb gray"><span class="fi">⬇️</span><b>(pull)</b>이미지가 없으면 내려받기</div>
<div class="fb yellow"><span class="fi">🧱</span><b>create</b>컨테이너 만들기 (쓰기 층 · 설정)</div>
<div class="fb green"><span class="fi">▶️</span><b>start</b>메인 프로세스 실행</div>
<div class="fb blue"><span class="fi">🖥️</span><b>(attach)</b>-d 가 없으면 화면 연결</div>
</div>
<p>가장 단순한 형태부터 해 봅시다. 명령을 하나 실행하고 끝나는 컨테이너입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --name hello alpine echo 안녕하세요
docker ps -a</code></pre>
<pre class="code out" data-lang="출력"><code>안녕하세요
CONTAINER ID   IMAGE    COMMAND              CREATED                  STATUS                              PORTS   NAMES
fb22046c7294   alpine   "echo 안녕하세요"    Less than a second ago   Exited (0) Less than a second ago           hello</code></pre>
<p><code>echo</code> 가 글자를 찍고 끝났으므로 컨테이너도 곧바로 <b>Exited (0)</b> 이 되었습니다. 이 원리는 3절에서 자세히 봅니다.</p>
<h4>자주 쓰는 네 가지 옵션</h4>
<table class="tbl">
<tr><th>옵션</th><th>뜻</th><th>언제</th></tr>
<tr><td><code>-d</code> (--detach)</td><td>백그라운드로 실행하고 ID 만 출력, 터미널은 바로 돌려받음</td><td>웹 서버 · DB 처럼 <b>계속 도는</b> 것</td></tr>
<tr><td><code>-it</code> (-i + -t)</td><td>-i: 키보드 입력 연결 · -t: 터미널(TTY) 흉내</td><td>셸에 들어가 <b>직접 명령을 칠 때</b></td></tr>
<tr><td><code>--name 이름</code></td><td>컨테이너에 이름 붙이기 (없으면 <code>cool_thompson</code> 같은 무작위 이름)</td><td>거의 항상 — 이름으로 다루기 편함</td></tr>
<tr><td><code>--rm</code></td><td>컨테이너가 끝나면 <b>자동으로 삭제</b></td><td>한 번 쓰고 버리는 작업 · 실험</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web nginx
docker run --rm alpine echo 한 번 쓰고 버려요
docker ps -a</code></pre>
<pre class="code out" data-lang="출력"><code>cd9182c99ede652f726bcf9c30e51ca3b5f6a413d894a8dbeb019f97caed3893     <span class="cm">← -d: ID 만 찍고 바로 돌아옴</span>
한 번 쓰고 버려요
CONTAINER ID   IMAGE    COMMAND                  CREATED                  STATUS                              PORTS    NAMES
cd9182c99ede   nginx    "/docker-entrypoint.…"   Less than a second ago   Up Less than a second               80/tcp   web
fb22046c7294   alpine   "echo 안녕하세요"        Less than a second ago   Exited (0) Less than a second ago            hello</code></pre>
<p><code>--rm</code> 으로 실행한 컨테이너는 끝나자마자 지워져서 목록에 없습니다. 이제 대화형으로 들어가 봅시다.
<code>-it</code> 로 alpine 의 셸(<code>sh</code>)에 들어가 명령을 몇 개 쳐 보고, <code>exit</code> 로 나오세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -it --rm alpine sh</code></pre>
<pre class="code out" data-lang="터미널"><code>/ # cat /etc/os-release
NAME="Alpine Linux"
...
/ # ls
bin    dev    etc    home   lib    media  mnt    opt    proc   root   run    sbin   srv    sys    tmp    usr    var
/ # exit</code></pre>
<div class="box warn"><div class="box-t">⚠️ 옵션은 이미지 이름 앞에!</div>
<code>docker run [옵션] 이미지 [명령]</code> 순서입니다. <code>docker run nginx -d</code> 처럼 이미지 뒤에 적으면 <code>-d</code> 는 docker 옵션이 아니라
<b>컨테이너 안에서 실행할 명령의 인자</b>로 넘어가 버립니다.</div>
<p>아래 위젯으로 옵션을 켰다 껐다 하며 명령이 어떻게 바뀌는지 보고, ▶ 로 바로 실행해 보세요.</p>
{{widget:cmdbuilder|image=nginx|name=web2|port=8081:80}}`
    },

    /* ================================================================ 3 */
    {
      title: '메인 프로세스가 끝나면 컨테이너도 끝난다',
      html: `
<p>Docker 를 처음 배우는 사람이 가장 많이 당황하는 장면이 있습니다. 우분투 컨테이너를 띄웠는데 <b>아무 일도 없이 바로 꺼지는</b> 것이지요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run ubuntu
docker ps
docker ps -a</code></pre>
<pre class="code out" data-lang="출력"><code>Unable to find image 'ubuntu:latest' locally
latest: Pulling from library/ubuntu
efd4ff1cfad6: Pull complete
Digest: sha256:77f32f565f2c6a227937a09ddb89d175d753e912e4e14284f9a540c0e7fb2570
Status: Downloaded newer image for ubuntu:latest

CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES      <span class="cm">← 실행 중인 것 없음</span>

CONTAINER ID   IMAGE    COMMAND       CREATED                  STATUS                              PORTS   NAMES
72418ad994c0   ubuntu   "/bin/bash"   Less than a second ago   Exited (0) Less than a second ago           cool_thompson</code></pre>
<p>고장이 아닙니다. 컨테이너는 가상 머신처럼 "켜 두는 컴퓨터"가 아니라 <b>프로세스 하나를 격리해서 실행하는 것</b>입니다.
그 프로세스(<b>메인 프로세스, 컨테이너 안에서 PID 1</b>)가 끝나면 컨테이너도 끝납니다.</p>
{{fig:pid1}}
<ul>
<li>ubuntu 이미지의 기본 명령은 <code>/bin/bash</code> 입니다 (COMMAND 칸).</li>
<li>bash 는 명령을 입력받는 프로그램인데, <code>-it</code> 없이 실행하면 <b>입력이 연결되지 않아</b> 읽을 것이 없으니 곧바로 끝납니다.</li>
<li>nginx 는 요청을 기다리며 <b>스스로 끝나지 않는</b> 프로그램이라 계속 <code>Up</code> 입니다.</li>
</ul>
<div class="box tip"><div class="box-t">💡 컨테이너를 살려 두는 방법 세 가지</div>
<ol class="steps-list">
<li><b>대화형으로 쓰기</b> — <code>docker run -it ubuntu</code> : 내가 입력하는 동안 bash 가 살아 있음. <code>exit</code> 하면 끝.</li>
<li><b>끝나지 않는 명령 주기</b> — <code>docker run -d ubuntu sleep infinity</code> : 실습용으로 컨테이너를 켜 두고 exec 로 들어갈 때.</li>
<li><b>원래 계속 도는 프로그램 실행</b> — 웹 서버 · DB 처럼. 실무에서는 이것이 정답입니다.</li>
</ol></div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name box ubuntu sleep infinity
docker ps</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE    COMMAND                  CREATED                  STATUS                  PORTS    NAMES
cc3a74669af1   ubuntu   "sleep infinity"         Less than a second ago   Up Less than a second            box
cd9182c99ede   nginx    "/docker-entrypoint.…"   Less than a second ago   Up Less than a second   80/tcp   web</code></pre>
<div class="box warn"><div class="box-t">⚠️ 비슷한 실수: 서버를 백그라운드로 돌려 버리기</div>
컨테이너 안에서 서버를 "데몬 모드"로 띄우면(스스로 백그라운드로 숨으면) 메인 프로세스는 할 일이 끝났다고 보고 종료되고, 컨테이너도 함께 꺼집니다.
그래서 nginx 이미지는 <code>nginx -g 'daemon off;'</code> 로 <b>앞에서(foreground)</b> 실행하도록 되어 있습니다. 6장에서 직접 이미지를 만들 때 꼭 기억하세요.</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'docker ps — 지금 무엇이 돌고 있나',
      html: `
<p><code>docker ps</code> 는 <b>실행 중인</b> 컨테이너만, <code>docker ps -a</code> 는 <b>멈춘 것까지 모두</b> 보여 줍니다. ("ps" 는 리눅스의 프로세스 목록 명령에서 따온 이름입니다.)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps
docker ps -a</code></pre>
<table class="tbl">
<tr><th>칸</th><th>뜻</th></tr>
<tr><td>CONTAINER ID</td><td>컨테이너 ID 앞 12자리 (이름 대신 써도 됨)</td></tr>
<tr><td>IMAGE</td><td>어떤 이미지로 만들었나</td></tr>
<tr><td>COMMAND</td><td>메인 프로세스로 실행한 명령</td></tr>
<tr><td>STATUS</td><td><code>Up …</code> 실행 중 · <code>Exited (코드) …</code> 종료 · <code>Created</code> · <code>(Paused)</code></td></tr>
<tr><td>PORTS</td><td>포트 정보 (4장에서 <code>0.0.0.0:8080-&gt;80/tcp</code> 처럼 바뀜)</td></tr>
<tr><td>NAMES</td><td>컨테이너 이름</td></tr>
</table>
<h4>원하는 것만 골라 보기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps -a --filter status=exited
docker ps -q
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker ps -l</code></pre>
<table class="tbl">
<tr><th>옵션</th><th>하는 일</th></tr>
<tr><td><code>--filter status=exited</code></td><td>상태로 거르기 (<code>created</code> · <code>running</code> · <code>paused</code> · <code>exited</code>)</td></tr>
<tr><td><code>-q</code></td><td>ID 만 출력 — 다른 명령에 넘길 때 (<code>docker stop \$(docker ps -q)</code>)</td></tr>
<tr><td><code>--format</code></td><td>원하는 칸만. <code>table</code> 을 앞에 붙이면 제목 줄도 나옴</td></tr>
<tr><td><code>-l</code> (--latest)</td><td>가장 최근에 만든 컨테이너 하나</td></tr>
</table>
<div class="box tip"><div class="box-t">💡 📊 대시보드 탭</div>
오른쪽 실습 화면의 <b>📊 대시보드</b> 탭에서도 컨테이너 상태를 한눈에 볼 수 있습니다. 명령을 칠 때마다 대시보드가 어떻게 바뀌는지 같이 보세요.
{{widget:open|pane=dash}}</div>`
    },

    /* ================================================================ 5 */
    {
      title: 'docker logs — 컨테이너가 한 말 듣기',
      html: `
<p><code>-d</code> 로 띄운 컨테이너는 화면에 아무것도 안 보여 줍니다. 그렇다고 말을 안 하는 게 아니라, 메인 프로세스가 <b>표준 출력(stdout) · 표준 에러(stderr)</b> 로
찍은 글을 Docker 가 모두 받아 적어 둡니다. 그 기록을 보는 명령이 <code>docker logs</code> 입니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 블랙박스</div>
컨테이너마다 블랙박스가 달려 있어서, 앱이 한 말이 모두 녹화됩니다. 컨테이너가 꺼진 뒤에도(Exited) 블랙박스 영상은 남아 있어서 <b>"왜 죽었는지"</b> 를 확인할 수 있습니다.
블랙박스는 컨테이너를 <code>rm</code> 할 때 같이 사라집니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker logs web
docker logs --tail 3 web</code></pre>
<pre class="code out" data-lang="출력 (--tail 3)"><code>2026/09/25 18:06:17 [notice] 1#1: start worker processes
2026/09/25 18:06:17 [notice] 1#1: start worker process 29
2026/09/25 18:06:17 [notice] 1#1: start worker process 30</code></pre>
<p>1초마다 시각을 찍는 컨테이너를 만들어 로그가 쌓이는 모습을 보겠습니다. <code>-f</code>(follow)는 새 로그를 <b>실시간으로 계속</b> 보여 주므로,
다 봤으면 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추세요. (컨테이너는 멈추지 않고 로그 보기만 멈춥니다.)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name clock alpine sh -c "while true; do date; sleep 1; done"
docker logs -t --tail 2 clock
docker logs -f clock</code></pre>
<pre class="code out" data-lang="출력"><code>2026-09-25T18:06:58.233000000Z Fri, 25 Sep 2026 18:06:58 UTC
2026-09-25T18:06:59.241000000Z Fri, 25 Sep 2026 18:06:59 UTC
Fri, 25 Sep 2026 18:06:57 UTC
Fri, 25 Sep 2026 18:06:58 UTC
Fri, 25 Sep 2026 18:06:59 UTC
^C</code></pre>
<table class="tbl">
<tr><th>옵션</th><th>하는 일</th></tr>
<tr><td><code>-f</code> (--follow)</td><td>계속 따라가며 보기 (<kbd>Ctrl</kbd>+<kbd>C</kbd> 로 끝)</td></tr>
<tr><td><code>--tail N</code></td><td>마지막 N 줄만</td></tr>
<tr><td><code>-t</code> (--timestamps)</td><td>줄마다 Docker 가 받은 시각 붙이기</td></tr>
<tr><td><code>--since 10m</code></td><td>최근 10분 것만 (<code>1h</code>, 날짜도 가능)</td></tr>
</table>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
컨테이너 안의 앱은 로그를 <b>파일이 아니라 표준 출력으로</b> 찍는 것이 원칙입니다. 그래야 <code>docker logs</code> 로 보이고, 로그 수집 도구가 한꺼번에 모을 수 있습니다.
문제가 생기면 무조건 <code>docker logs --tail 50 이름</code> 부터 보는 습관을 들이세요 (12장).</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'exec 와 attach — 컨테이너 안으로 들어가기',
      html: `
<p>실행 중인 컨테이너 안에서 명령을 실행하려면 <code>docker exec</code> 를 씁니다. 메인 프로세스는 그대로 두고 <b>새 프로세스를 하나 더</b> 띄우는 것입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec web ls /usr/share/nginx/html
docker exec web cat /etc/os-release
docker exec -w /etc web pwd</code></pre>
<pre class="code out" data-lang="출력"><code>50x.html  index.html
PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"
...
/etc</code></pre>
<p>여러 명령을 이어서 치고 싶으면 <code>-it</code> 로 셸을 엽니다. nginx 이미지에는 <code>bash</code> 도 있지만, 어느 이미지에나 거의 있는 <code>sh</code> 가 안전합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec -it web sh</code></pre>
<pre class="code out" data-lang="터미널"><code># hostname
377a0832f0a6              <span class="cm">← 호스트 이름 = 컨테이너 ID</span>
# ls /
bin  boot  dev  docker-entrypoint.sh  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
# exit</code></pre>
<p>exec 로 연 셸에서 <code>exit</code> 해도 <b>컨테이너는 계속 돕니다</b>. 끝난 건 exec 로 띄운 sh 뿐이고 메인 프로세스(nginx)는 멀쩡하니까요.</p>
{{fig:execAttach}}
<h4>attach 와 detach (Ctrl+P, Ctrl+Q)</h4>
<p><code>docker attach</code> 는 새 프로세스를 만들지 않고, <b>이미 돌고 있는 메인 프로세스의 화면</b>에 내 터미널을 연결합니다.
<code>-dit</code> 로 셸 컨테이너를 백그라운드에 띄워 두고 붙었다 떨어져 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -dit --name shell alpine
docker attach shell</code></pre>
<p>붙은 상태에서 <code>echo inside</code> 를 쳐 보세요. 그다음 <b>빠져나오는 방법이 두 가지</b>라는 점이 중요합니다.</p>
<div class="vs">
<div class="vs-a red"><b>exit (또는 Ctrl+D)</b><ul><li>메인 프로세스(sh) 자체가 끝남</li><li>→ 컨테이너 <b>Exited</b></li></ul></div>
<div class="vs-mid">VS</div>
<div class="vs-b green"><b><kbd>Ctrl</kbd>+<kbd>P</kbd> 다음 <kbd>Ctrl</kbd>+<kbd>Q</kbd></b><ul><li>연결만 끊음(detach)</li><li>→ 컨테이너는 계속 <b>Up</b></li></ul></div>
</div>
<table class="tbl cmp">
<tr><th></th><th>docker exec -it 이름 sh</th><th>docker attach 이름</th></tr>
<tr><td>무엇에 연결?</td><td>새로 띄운 셸 프로세스</td><td>메인 프로세스(PID 1)</td></tr>
<tr><td>exit 하면</td><td>셸만 끝, 컨테이너는 그대로</td><td>메인 프로세스가 끝나면 <b>컨테이너도 종료</b></td></tr>
<tr><td>주로 쓰는 곳</td><td><span class="tag green">거의 항상 이것</span> 디버깅 · 확인</td><td>메인 프로세스가 셸 · 대화형 프로그램일 때</td></tr>
</table>
<div class="box warn"><div class="box-t">⚠️ bash 가 없어요!</div>
<code>docker exec -it 이름 bash</code> 가 <code>executable file not found</code> 로 실패하면 그 이미지에 bash 가 없는 것입니다 (alpine 계열이 대표적). <code>sh</code> 로 바꿔 보세요.
마찬가지로 debian 계열 이미지에는 <code>ps</code> · <code>ping</code> 같은 도구가 없는 경우가 많습니다 — 이미지를 작게 만들려고 빼 둔 것입니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: 'stop · start · restart · kill · pause',
      html: `
<p>이제 컨테이너를 끄고 켜 봅시다. 명령 이름이 직관적이라 금방 익숙해집니다.</p>
<table class="tbl">
<tr><th>명령</th><th>하는 일</th><th>상태 변화</th></tr>
<tr><td><code>docker stop 이름</code></td><td>정중하게 끄기 (SIGTERM → 10초 뒤 SIGKILL)</td><td>running → exited</td></tr>
<tr><td><code>docker start 이름</code></td><td>멈춘 컨테이너 다시 켜기 (같은 설정 · 같은 쓰기 층)</td><td>exited/created → running</td></tr>
<tr><td><code>docker restart 이름</code></td><td>stop + start</td><td>running → running</td></tr>
<tr><td><code>docker kill 이름</code></td><td>강제로 즉시 끄기 (SIGKILL)</td><td>running → exited (137)</td></tr>
<tr><td><code>docker pause 이름</code></td><td>프로세스를 얼리기 (CPU 사용 0, 메모리는 유지)</td><td>running → paused</td></tr>
<tr><td><code>docker unpause 이름</code></td><td>얼린 것 풀기</td><td>paused → running</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>docker stop web
docker ps -a --filter name=web
docker start web
docker pause web
docker ps --filter name=web
docker unpause web</code></pre>
<pre class="code out" data-lang="출력 (일부)"><code>web
CONTAINER ID   IMAGE   COMMAND                  CREATED         STATUS                     PORTS   NAMES
cd9182c99ede   nginx   "/docker-entrypoint.…"   2 minutes ago   Exited (0) 1 second ago            web
...
CONTAINER ID   IMAGE   COMMAND                  CREATED         STATUS                           PORTS    NAMES
cd9182c99ede   nginx   "/docker-entrypoint.…"   2 minutes ago   Up Less than a second (Paused)   80/tcp   web</code></pre>
{{fig:stopKill}}
<p>nginx 는 신호를 받으면 스스로 정리하고 끝나서 <code>Exited (0)</code> 이 됩니다. 로그 끝에 그 흔적이 남아 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker stop web
docker logs --tail 3 web
docker start web</code></pre>
<pre class="code out" data-lang="출력"><code>2026/09/25 18:08:20 [notice] 1#1: signal 3 (SIGQUIT) received, shutting down
2026/09/25 18:08:20 [notice] 29#29: gracefully shutting down
2026/09/25 18:08:20 [notice] 1#1: exit</code></pre>
<div class="box note"><div class="box-t">📝 신호가 SIGTERM 이 아니라 SIGQUIT?</div>
nginx 이미지는 설정(<code>STOPSIGNAL SIGQUIT</code>, 2장 history 에서 봤지요?)으로 stop 할 때 보낼 신호를 SIGQUIT 으로 바꿔 두었습니다.
nginx 에게는 SIGQUIT 이 "하던 요청은 마저 처리하고 끝내"라는 뜻이기 때문입니다. 이렇게 이미지마다 가장 알맞은 "정중한 끄기" 신호를 정할 수 있습니다.</div>
<div class="box tip"><div class="box-t">💡 stop 이 10초씩 걸린다면?</div>
<code>docker stop</code> 이 매번 딱 10초 걸린다면 앱이 SIGTERM 을 무시하고 있어서 결국 SIGKILL 로 끝나는 것입니다 (종료 코드 137).
특히 메인 프로세스(PID 1)는 신호 처리 코드가 없으면 SIGTERM 을 무시합니다. <code>docker run --init</code> 으로 작은 init 프로세스를 앞에 두거나, 앱에서 SIGTERM 을 처리하게 만들면 해결됩니다.
기다리는 시간은 <code>docker stop -t 3 이름</code> 처럼 바꿀 수 있습니다.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '종료 코드 읽기 — 0 · 1 · 127 · 137 · 143',
      html: `
<p>컨테이너가 끝나면 <code>Exited (숫자)</code> 가 남습니다. 이 <b>종료 코드(exit code)</b> 는 메인 프로세스가 남긴 "마지막 한마디"입니다.
0 은 "잘 끝났어요", 그 밖의 숫자는 "문제가 있었어요"이고, 숫자를 보면 원인을 짐작할 수 있습니다.</p>
<div class="tbl-wrap">
<table class="tbl">
<tr><th>코드</th><th>뜻</th><th>흔한 원인</th><th>다음에 할 일</th></tr>
<tr><td><span class="tag green">0</span></td><td>정상 종료</td><td>할 일을 다 끝냄 (echo, 배치 작업) · stop 에 깔끔하게 응답</td><td>—</td></tr>
<tr><td><span class="tag orange">1</span></td><td>앱이 오류로 종료</td><td>설정 누락 · 예외 발생 · 파일 없음</td><td><code>docker logs</code></td></tr>
<tr><td><span class="tag orange">127</span></td><td>명령을 찾을 수 없음</td><td>명령 오타 · 이미지에 그 프로그램이 없음</td><td>명령 이름 · 이미지 확인</td></tr>
<tr><td><span class="tag red">137</span></td><td>SIGKILL 로 강제 종료 (128+9)</td><td><code>docker kill</code> · stop 10초 초과 · <b>메모리 초과(OOM)</b></td><td><code>inspect</code> 로 OOMKilled 확인 (8장)</td></tr>
<tr><td><span class="tag blue">143</span></td><td>SIGTERM 으로 종료 (128+15)</td><td><code>docker stop</code> 에 순순히 끝남</td><td>보통 정상적인 정지</td></tr>
</table>
</div>
<div class="box tip"><div class="box-t">💡 128 + 신호 번호</div>
128 보다 큰 코드는 "신호를 맞고 죽었다"는 뜻이고, 128 을 빼면 신호 번호가 나옵니다. SIGKILL 은 9번 → 137, SIGTERM 은 15번 → 143.</div>
<p>다섯 가지를 모두 직접 만들어 봅시다. (<code>hard</code> · <code>graceful</code> 은 끄는 데 몇 초 걸릴 수 있습니다.)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --name ok alpine echo 잘 끝남
docker run --name fail alpine sh -c 'exit 1'
docker run --name notfound alpine sh -c nosuchcmd
docker run -d --name hard alpine sleep 300
docker kill hard
docker run -d --init --name graceful alpine sleep 300
docker stop graceful
docker ps -a --format 'table {{.Names}}\t{{.Status}}'</code></pre>
<pre class="code out" data-lang="출력 (마지막 명령)"><code>NAMES      STATUS
graceful   Exited (143) Less than a second ago
hard       Exited (137) Less than a second ago
notfound   Exited (127) Less than a second ago
fail       Exited (1) Less than a second ago
ok         Exited (0) Less than a second ago
...</code></pre>
<p>종료 코드만 딱 뽑으려면 <code>inspect --format</code> 을 씁니다. <code>docker inspect</code> 는 컨테이너의 모든 정보(상태 · 설정 · 네트워크)를 JSON 으로 보여 주는 명령입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect --format '{{.State.Status}} {{.State.ExitCode}}' fail
docker inspect --format '{{.State.ExitCode}} OOM={{.State.OOMKilled}}' hard
docker inspect --format '{{.Config.Image}} {{json .Config.Cmd}}' web</code></pre>
<pre class="code out" data-lang="출력"><code>exited 1
137 OOM=false
nginx ["nginx","-g","daemon off;"]</code></pre>
<div class="box note"><div class="box-t">📝 docker run 자체의 종료 코드</div>
<code>-d</code> 없이 실행한 <code>docker run</code> 은 컨테이너의 종료 코드를 그대로 돌려줍니다. 그래서 셸 스크립트에서 <code>\$?</code> 로 성공 여부를 확인할 수 있습니다.
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm alpine sh -c 'exit 3'
echo $?</code></pre>
또, 명령 이름 자체가 틀리면(<code>docker run alpine nosuchcmd</code>) 컨테이너는 시작조차 못 하고 <code>Created</code> 상태로 남으며 <code>executable file not found in $PATH</code> 오류가 납니다.
위 예제처럼 <code>sh -c</code> 로 감싸면 셸이 "not found" 를 알리고 127 로 끝납니다.</div>`
    },

    /* ================================================================ 9 */
    {
      title: '정리하기 · 살펴보기 — rm, prune, stats, top',
      html: `
<h4>rm — 컨테이너 지우기</h4>
<p>멈춘 컨테이너는 <code>docker rm</code> 으로 지웁니다. 실행 중인 컨테이너는 지워지지 않으므로 먼저 stop 하거나, <code>-f</code> 로 강제(kill + rm)합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm ok
docker rm clock
docker rm -f clock</code></pre>
<pre class="code out" data-lang="출력"><code>ok
Error response from daemon: cannot remove container "/clock": container is running: stop the container before removing or force remove
clock</code></pre>
<p>두 번째 줄의 오류는 일부러 보여 드린 것입니다. 실행 중(clock 은 계속 시각을 찍는 중)이라 거절되었고, <code>-f</code> 로 지웠습니다.</p>
<h4>container prune — 멈춘 컨테이너 한꺼번에 치우기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps -a
docker container prune -f
docker ps -a</code></pre>
<pre class="code out" data-lang="출력 (prune)"><code>Deleted Containers:
3036045858bdfb6e03f65843a89f3a26737ef5638d37c6b52b0cc39b2dde1d81
e65989e64613be9cb5b2bcb70b458c19e2c2773cb685da5efd07715768546476
...

Total reclaimed space: 6kB</code></pre>
<p><code>docker container prune</code> 은 <b>실행 중이 아닌(exited · created) 컨테이너를 모두</b> 지웁니다. 실행 중인 <code>web</code> · <code>box</code> 는 그대로 남습니다.
<code>-f</code> 없이 실행하면 <code>Are you sure you want to continue? [y/N]</code> 하고 한 번 물어봅니다.</p>
<div class="box warn"><div class="box-t">⚠️ 지우면 쓰기 층도 사라집니다</div>
컨테이너를 지우면 그 안에서 만든 파일 · 로그도 함께 사라집니다. 데이터베이스 파일처럼 남겨야 하는 것은 <b>볼륨</b>에 두어야 합니다 (5장).
그래서 "컨테이너는 언제 지워도 괜찮게" 쓰는 것이 Docker 다운 방식입니다.</div>
<h4>stats · top — 맛보기</h4>
<p><code>docker top</code> 은 컨테이너 안의 프로세스 목록, <code>docker stats</code> 는 CPU · 메모리 사용량을 보여 줍니다 (자세한 건 8장 · 12장).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker top web
docker stats --no-stream</code></pre>
<pre class="code out" data-lang="출력"><code>UID        PID    PPID   C   STIME   TTY   TIME       CMD
root       2047   2027   0   03:18   ?     00:00:00   nginx -g daemon off;
message+   2098   2047   0   03:18   ?     00:00:00   nginx: worker process

CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O           BLOCK I/O   PIDS
cc3a74669af1   box    0.47%   814KiB / 8GiB       0.01%   1.2kB / 300B      0B / 0B     1
cd9182c99ede   web    0.49%   7.14MiB / 8GiB      0.09%   5.64kB / 3.26kB   0B / 0B     9</code></pre>
<p><code>--no-stream</code> 없이 실행하면 작업 관리자처럼 <b>계속 갱신</b>됩니다. 다 봤으면 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker stats</code></pre>
<div class="box practice"><div class="box-t">🧪 한 장 요약 — 명령 지도</div>
<div class="cards c3">
<div class="card green"><div class="ci">▶️</div><b>만들고 켜기</b><p><code>run</code> · <code>create</code> · <code>start</code> · <code>restart</code></p></div>
<div class="card blue"><div class="ci">🔍</div><b>살펴보기</b><p><code>ps</code> · <code>logs</code> · <code>exec</code> · <code>inspect</code> · <code>top</code> · <code>stats</code></p></div>
<div class="card red"><div class="ci">⏹️</div><b>끄고 치우기</b><p><code>stop</code> · <code>kill</code> · <code>pause</code> · <code>rm</code> · <code>container prune</code></p></div>
</div></div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'nginx 를 web 이라는 이름으로 백그라운드 실행',
      desc: '<code>nginx</code> 이미지로 이름이 <code>web</code> 인 컨테이너를 <b>백그라운드</b>로 실행하고, <code>docker ps</code> 로 Up 인지 확인하세요.',
      hint: '<code>docker run -d --name 이름 이미지</code>. 이미 web 이 있다는 Conflict 오류가 나면 <code>docker rm -f web</code> 후 다시.',
      answer: ['docker run -d --name web nginx'],
      check: M => M.running('web') && /^nginx/.test(M.c('web').image)
    },
    {
      id: 'm2',
      title: 'web 의 마지막 로그 5줄만 보기',
      desc: '<code>docker logs</code> 에 옵션을 붙여 <code>web</code> 의 <b>마지막 5줄</b>만 보세요. nginx 가 worker 프로세스를 몇 개 띄웠나요?',
      hint: '<code>docker logs --tail 숫자 이름</code>',
      answer: ['docker logs --tail 5 web'],
      check: M => M.ran(/docker (container )?logs\b(?=.*\bweb\b)(?=.*(--tail|-n)[\s=]+5\b)/)
    },
    {
      id: 'm3',
      title: 'exec 로 web 안에 hi.html 만들기',
      desc: '<code>docker exec</code> 로 <code>web</code> 컨테이너 안의 <code>/usr/share/nginx/html/hi.html</code> 파일에 <code>hello</code> 라는 글자를 써 넣으세요. (<code>-it</code> 로 셸에 들어가서 해도 됩니다.)',
      hint: '리다이렉션(&gt;)은 셸 기능이라 <code>docker exec web sh -c "echo hello &gt; 경로"</code> 처럼 sh -c 로 감싸야 합니다.',
      answer: ['docker exec web sh -c "echo hello > /usr/share/nginx/html/hi.html"'],
      check: M => /hello/.test(M.cfile('web', '/usr/share/nginx/html/hi.html') || '')
    },
    {
      id: 'm4',
      title: 'web 을 얼렸다가(pause) 다시 풀기(unpause)',
      desc: '<code>web</code> 을 일시 정지하고 <code>docker ps</code> 에서 <code>(Paused)</code> 를 확인한 뒤, 다시 실행 상태로 되돌리세요.',
      hint: '<code>docker pause 이름</code> → <code>docker ps</code> → <code>docker unpause 이름</code>',
      answer: ['docker pause web', 'docker ps', 'docker unpause web'],
      check: M => M.ran(/docker (container )?pause\s+web/) && M.ran(/docker (container )?unpause\s+web/) && M.running('web')
    },
    {
      id: 'm5',
      title: '끝나면 저절로 사라지는 once 컨테이너',
      desc: '<code>alpine</code> 이미지로 이름이 <code>once</code> 인 컨테이너를 만들어 <code>echo 한 번만</code> 을 실행하되, 끝나면 <b>자동으로 삭제</b>되게 하세요. 실행 뒤 <code>docker ps -a</code> 에 once 가 없어야 합니다.',
      hint: '<code>docker run --rm --name once alpine echo …</code>',
      answer: ['docker run --rm --name once alpine echo 한 번만'],
      check: M => M.ran(/docker (container )?run\s.*--rm/) && M.ran(/docker (container )?run\s.*--name[\s=]once\b/) && !M.exists('once')
    },
    {
      id: 'm6', scenario: true,
      title: 'box 가 켜자마자 꺼진다! 계속 살아 있게 고치기',
      desc: '⚙️ 상황 만들기를 누르면 <code>ubuntu</code> 로 만든 컨테이너 <code>box</code> 가 <code>-d</code> 로 실행되는데 곧바로 <code>Exited (0)</code> 이 됩니다. 나중에 exec 로 들어가 쓸 수 있도록 <b>ubuntu 이미지로 된 box 가 계속 실행 중</b>이게 만드세요.',
      setup: ['docker run -d --name box ubuntu'],
      hint: '<code>docker ps -a</code> 의 COMMAND 를 보세요. 메인 프로세스(bash)가 할 일이 없어 끝났습니다. 기존 box 를 지우고, 끝나지 않는 명령(<code>sleep infinity</code>)을 주거나 <code>-dit</code> 로 실행하세요.',
      answer: ['docker rm box', 'docker run -d --name box ubuntu sleep infinity'],
      check: M => M.running('box') && /^ubuntu/.test(M.c('box').image)
    },
    {
      id: 'm7', scenario: true,
      title: '멈춘 컨테이너가 잔뜩! 실행 중인 것만 남기고 청소',
      desc: '⚙️ 상황 만들기를 누르면 종료되었거나(Exited) 만들어만 둔(Created) 컨테이너 <code>t1</code> · <code>t2</code> · <code>t3</code> 이 생깁니다. <code>web</code> 과 <code>box</code> 는 계속 실행 중이어야 하고, <b>실행 중이 아닌 컨테이너는 하나도 남지 않게</b> 정리하세요.',
      setup: ['docker run --name t1 alpine echo 1', 'docker run --name t2 alpine sh -c "exit 3"', 'docker create --name t3 nginx'],
      hint: '하나씩 <code>docker rm</code> 해도 되지만, 멈춘 컨테이너를 한 번에 지우는 prune 명령이 있습니다. <code>docker ps -a</code> 로 결과를 확인하세요.',
      answer: ['docker container prune -f'],
      check: M => M.cs(c => c.state.status !== 'running').length === 0 && M.running('web') && M.running('box')
    }
  ],

  videos: [
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: 'run · ps · logs · exec · stop 등 기본 명령 실습 부분을 골라 보세요' },
    { title: 'Docker Tutorial for Beginners - A Full DevOps Course', channel: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', lang: 'en', min: '2시간', desc: '컨테이너 명령과 -it · -d · attach 를 차근차근 보여 주는 입문 강좌' },
    { title: 'Docker in 100 Seconds', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=Gjnup-PuquQ', lang: 'en', min: '2분', desc: '컨테이너가 무엇인지 빠르게 복습' },
    { title: '도커 컨테이너 명령어 (검색)', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EC%BB%A8%ED%85%8C%EC%9D%B4%EB%84%88+%EB%AA%85%EB%A0%B9%EC%96%B4', desc: '유튜브 검색 결과 — 한국어로 run · exec · logs 를 설명하는 영상들' },
    { title: 'docker container lifecycle (검색)', url: 'https://www.youtube.com/results?search_query=docker+container+lifecycle', desc: '유튜브 검색 결과 — created · running · paused · exited 상태 전이' },
    { title: 'docker exit code 137 143 (검색)', url: 'https://www.youtube.com/results?search_query=docker+exit+code+137+143', desc: '유튜브 검색 결과 — 종료 코드와 SIGTERM · SIGKILL' }
  ],

  terms: [
    ['생명주기(lifecycle)', '컨테이너가 만들어지고(created) 실행되고(running) 멈추고(exited) 삭제되기까지의 상태 흐름'],
    ['메인 프로세스(PID 1)', '컨테이너를 시작할 때 실행하는 프로세스. 이것이 끝나면 컨테이너도 종료됨'],
    ['-d (detach)', '컨테이너를 백그라운드로 실행하고 터미널을 바로 돌려받는 옵션'],
    ['-it', '-i(입력 연결) + -t(가상 터미널). 셸처럼 대화형으로 쓸 때'],
    ['--rm', '컨테이너가 끝나면 자동으로 삭제하는 옵션'],
    ['docker exec', '실행 중인 컨테이너 안에서 새 프로세스(명령)를 실행'],
    ['attach · detach', '메인 프로세스의 입출력에 연결 · 연결 끊기. 끊기는 Ctrl+P, Ctrl+Q'],
    ['표준 출력(stdout)', '프로그램이 글을 찍는 기본 통로. docker logs 는 이것을 모아 보여 줌'],
    ['SIGTERM', '"정리하고 끝내 줘" 신호(15번). docker stop 이 먼저 보냄'],
    ['SIGKILL', '즉시 강제 종료 신호(9번). docker kill · stop 시간 초과 시'],
    ['종료 코드(exit code)', '프로세스가 끝날 때 남기는 숫자. 0 정상, 1 오류, 127 명령 없음, 137 SIGKILL, 143 SIGTERM'],
    ['paused', 'docker pause 로 프로세스를 얼린 상태. 메모리는 유지, CPU 는 쓰지 않음'],
    ['container prune', '실행 중이 아닌 컨테이너를 한꺼번에 지우는 명령']
  ],

  summary: [
    '컨테이너 상태: <b>created → running ⇄ paused, running → exited → (start) running, exited → rm</b>. docker run = (pull) + create + start.',
    '<code>-d</code> 백그라운드 · <code>-it</code> 대화형 · <code>--name</code> 이름 · <code>--rm</code> 끝나면 삭제. 옵션은 <b>이미지 이름 앞</b>에.',
    '<b>메인 프로세스(PID 1)가 끝나면 컨테이너도 끝난다</b> — 그래서 <code>docker run ubuntu</code> 는 바로 Exited (0).',
    '<code>ps -a</code> 로 멈춘 것까지 보고, <code>logs --tail · -f</code> 로 앱이 한 말을, <code>exec -it 이름 sh</code> 로 안을 들여다본다. attach 에서 빠져나올 땐 Ctrl+P, Ctrl+Q.',
    '<code>stop</code> 은 SIGTERM → 10초 → SIGKILL, <code>kill</code> 은 즉시 SIGKILL. pause/unpause 로 얼렸다 풀기.',
    '종료 코드: <b>0</b> 정상 · <b>1</b> 앱 오류 · <b>127</b> 명령 없음 · <b>137</b> SIGKILL(OOM 포함) · <b>143</b> SIGTERM. <code>inspect --format \'{{.State.ExitCode}}\'</code>.',
    '<code>rm</code>(실행 중이면 <code>-f</code>), <code>container prune</code> 으로 정리. 지우면 쓰기 층의 파일도 사라진다.'
  ],

  quiz: [
    {
      q: '<code>docker run ubuntu</code> 를 실행했더니 컨테이너가 바로 <code>Exited (0)</code> 이 되었습니다. 이유는?',
      options: ['ubuntu 이미지가 고장 나서', '메인 프로세스인 bash 가 입력이 연결되지 않아 곧바로 끝났기 때문에', '포트를 게시하지 않아서', 'ubuntu 는 Docker 에서 실행할 수 없어서'],
      answer: 1,
      explain: '컨테이너의 수명은 메인 프로세스의 수명입니다. -it 없이 실행한 bash 는 읽을 입력이 없어 곧바로 정상 종료(0)합니다.'
    },
    {
      q: '웹 서버를 백그라운드로 띄우고 터미널을 바로 돌려받으려면 어떤 옵션을 쓰나요?',
      options: ['-it', '--rm', '-d', '-a'],
      answer: 2,
      explain: '-d(detach)는 컨테이너를 백그라운드로 실행하고 컨테이너 ID 만 출력합니다.'
    },
    {
      q: '<code>docker exec -it web sh</code> 로 들어갔다가 <code>exit</code> 했습니다. web 컨테이너는?',
      options: ['계속 실행 중이다', 'Exited 가 된다', '삭제된다', 'Paused 가 된다'],
      answer: 0,
      explain: 'exec 는 새 프로세스(sh)를 띄운 것이라 exit 하면 그 sh 만 끝납니다. 메인 프로세스는 그대로입니다.'
    },
    {
      q: '<code>docker attach</code> 로 붙은 컨테이너를 <b>종료시키지 않고</b> 빠져나오는 키는?',
      options: ['Ctrl+C', 'exit 입력', 'Ctrl+P 다음 Ctrl+Q', 'Ctrl+Z'],
      answer: 2,
      explain: 'Ctrl+P, Ctrl+Q 는 연결만 끊는(detach) 키입니다. exit 나 Ctrl+C 는 메인 프로세스를 끝내 컨테이너가 종료될 수 있습니다.'
    },
    {
      q: '<code>docker ps -a</code> 에 <code>Exited (137)</code> 이 보입니다. 가능한 원인이 <b>아닌</b> 것은?',
      options: ['docker kill 로 강제 종료했다', 'docker stop 후 10초 안에 끝나지 않아 SIGKILL 을 맞았다', '메모리 제한을 넘어 OOM 으로 죽었다', '명령 이름을 잘못 적어 찾을 수 없었다'],
      answer: 3,
      explain: '137 = 128 + 9(SIGKILL). 명령을 찾을 수 없는 경우는 127 입니다.'
    },
    {
      q: '실행 중인 컨테이너 <code>web</code> 에 <code>docker rm web</code> 을 하면?',
      options: ['바로 삭제된다', '"container is running" 오류로 거절된다 — stop 후 rm 하거나 rm -f', '자동으로 재시작된다', '이미지까지 삭제된다'],
      answer: 1,
      explain: '실행 중인 컨테이너는 rm 이 거절됩니다. docker stop 후 rm 하거나, docker rm -f 로 강제로 지웁니다.'
    },
    {
      q: '실행 중인 컨테이너는 두고, 멈춘 컨테이너만 한꺼번에 지우는 명령은?',
      options: ['docker rm -f $(docker ps -aq)', 'docker container prune', 'docker image prune', 'docker stop $(docker ps -q)'],
      answer: 1,
      explain: 'docker container prune 은 exited · created 상태의 컨테이너만 지웁니다. 첫 번째 보기는 실행 중인 것까지 모두 지웁니다.'
    }
  ]
});
