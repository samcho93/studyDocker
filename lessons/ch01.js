/* 1장 — Docker 설치와 첫 컨테이너 */
Course.lesson({
  id: 'ch01', no: '01',
  icon: '🐳',
  title: 'Docker 설치와 첫 컨테이너',
  subtitle: '클라이언트 · 데몬 · 레지스트리 — docker 명령 한 줄 뒤에서 일어나는 일',
  level: '입문', time: '80분',
  goals: [
    'Docker CLI · Docker 데몬(dockerd) · 레지스트리의 역할을 구분할 수 있다',
    '내 운영체제에 맞는 설치 방법(Docker Desktop · Docker Engine)을 고르고 설치를 확인할 수 있다',
    '<code>docker version</code> 출력에서 Client 와 Server 를 읽고, 데몬이 꺼졌을 때의 오류를 해결할 수 있다',
    'hello-world 가 실행되는 4단계를 설명할 수 있다',
    'docker 명령의 구조(관리 대상 · 동작 · 옵션 · 인자)를 이해하고 --help 로 찾아볼 수 있다'
  ],
  chips: ['docker version', 'docker info', 'docker run hello-world', 'docker --help', 'sudo systemctl status docker'],

  figs: {
    arch: {
      caption: 'docker 명령(클라이언트)은 요청만 보내고, 실제 일은 Docker 데몬이 합니다. 이미지가 없으면 레지스트리에서 받아 옵니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="Docker 클라이언트, 데몬, 레지스트리 구조">
  <rect x="20" y="40" width="200" height="250" rx="14" class="blue"/>
  <text x="120" y="68" class="t-c t-b t-lg">⌨️ 클라이언트</text>
  <text x="120" y="92" class="t-c t-sm t-mu">Docker CLI</text>
  <rect x="40" y="110" width="160" height="30" rx="6" class="box"/><text x="120" y="126" class="t-c t-xs t-mono">docker run</text>
  <rect x="40" y="148" width="160" height="30" rx="6" class="box"/><text x="120" y="164" class="t-c t-xs t-mono">docker build</text>
  <rect x="40" y="186" width="160" height="30" rx="6" class="box"/><text x="120" y="202" class="t-c t-xs t-mono">docker pull</text>
  <rect x="40" y="224" width="160" height="30" rx="6" class="box"/><text x="120" y="240" class="t-c t-xs t-mono">docker ps</text>

  <line x1="222" y1="165" x2="298" y2="165" class="ln-blue thick ar2 ar-blue"/>
  <text x="260" y="150" class="t-c t-xs t-mu">REST API</text>
  <text x="260" y="186" class="t-c t-xs t-mu t-mono">docker.sock</text>

  <rect x="300" y="20" width="330" height="290" rx="14" class="gray"/>
  <text x="465" y="46" class="t-c t-b t-lg">🖥️ Docker 호스트</text>
  <rect x="320" y="62" width="290" height="44" rx="8" class="s-blue"/><text x="465" y="84" class="t-c t-b tw">Docker 데몬 (dockerd)</text>
  <text x="400" y="130" class="t-c t-b t-sm">🧱 이미지</text>
  <rect x="330" y="142" width="140" height="26" rx="5" class="purple"/><text x="400" y="155" class="t-c t-xs t-mono">nginx:latest</text>
  <rect x="330" y="174" width="140" height="26" rx="5" class="purple"/><text x="400" y="187" class="t-c t-xs t-mono">hello-world</text>
  <rect x="330" y="206" width="140" height="26" rx="5" class="purple"/><text x="400" y="219" class="t-c t-xs t-mono">ubuntu:24.04</text>
  <text x="545" y="130" class="t-c t-b t-sm">📦 컨테이너</text>
  <rect x="485" y="142" width="125" height="26" rx="13" class="green"/><text x="547" y="155" class="t-c t-xs">web (실행 중)</text>
  <rect x="485" y="174" width="125" height="26" rx="13" class="green"/><text x="547" y="187" class="t-c t-xs">db (실행 중)</text>
  <rect x="485" y="206" width="125" height="26" rx="13" class="box"/><text x="547" y="219" class="t-c t-xs t-mu">test (종료)</text>
  <line x1="472" y1="155" x2="483" y2="155" class="ln thin ar"/>
  <text x="465" y="262" class="t-c t-xs t-mu">containerd → runc 가 실제로 컨테이너 실행</text>
  <text x="465" y="282" class="t-c t-xs t-mu">(14장)</text>

  <line x1="632" y1="165" x2="706" y2="165" class="ln-orange thick ar2 ar-orange"/>
  <text x="669" y="150" class="t-c t-xs t-mu">pull / push</text>

  <rect x="708" y="40" width="160" height="250" rx="14" class="orange"/>
  <text x="788" y="68" class="t-c t-b t-lg">☁️ 레지스트리</text>
  <text x="788" y="92" class="t-c t-sm t-mu">Docker Hub 등</text>
  <rect x="726" y="110" width="124" height="28" rx="6" class="box"/><text x="788" y="125" class="t-c t-xs t-mono">nginx</text>
  <rect x="726" y="146" width="124" height="28" rx="6" class="box"/><text x="788" y="161" class="t-c t-xs t-mono">postgres</text>
  <rect x="726" y="182" width="124" height="28" rx="6" class="box"/><text x="788" y="197" class="t-c t-xs t-mono">python</text>
  <rect x="726" y="218" width="124" height="28" rx="6" class="box"/><text x="788" y="233" class="t-c t-xs t-mono">… 수백만 개</text>
</svg>`
    },
    hello: {
      caption: 'docker run hello-world 의 4단계 — hello-world 이미지가 출력하는 메시지에도 이 과정이 그대로 적혀 있습니다',
      svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="hello-world 가 실행되는 네 단계">
  <rect x="20" y="30" width="190" height="220" rx="14" class="blue"/><text x="115" y="60" class="t-c t-xl">①</text>
  <text x="115" y="96" class="t-c t-b">클라이언트 → 데몬</text><text x="115" y="124" class="t-c t-xs">"hello-world 로</text><text x="115" y="142" class="t-c t-xs">컨테이너 실행해 줘"</text>
  <text x="115" y="196" class="t-c t-xs t-mono t-mu">docker run</text><text x="115" y="214" class="t-c t-xs t-mono t-mu">hello-world</text>
  <line x1="212" y1="140" x2="236" y2="140" class="ln ar"/>
  <rect x="238" y="30" width="190" height="220" rx="14" class="orange"/><text x="333" y="60" class="t-c t-xl">②</text>
  <text x="333" y="96" class="t-c t-b">데몬 → 레지스트리</text><text x="333" y="124" class="t-c t-xs">로컬에 이미지가 없네?</text><text x="333" y="142" class="t-c t-xs">Docker Hub 에서 pull</text>
  <text x="333" y="196" class="t-c t-xs t-mono t-mu">Unable to find image</text><text x="333" y="214" class="t-c t-xs t-mono t-mu">Pulling from library/…</text>
  <line x1="430" y1="140" x2="454" y2="140" class="ln ar"/>
  <rect x="456" y="30" width="190" height="220" rx="14" class="green"/><text x="551" y="60" class="t-c t-xl">③</text>
  <text x="551" y="96" class="t-c t-b">데몬이 컨테이너 생성</text><text x="551" y="124" class="t-c t-xs">이미지로 컨테이너를</text><text x="551" y="142" class="t-c t-xs">만들고 /hello 실행</text>
  <text x="551" y="196" class="t-c t-xs t-mono t-mu">create + start</text>
  <line x1="648" y1="140" x2="672" y2="140" class="ln ar"/>
  <rect x="674" y="30" width="190" height="220" rx="14" class="purple"/><text x="769" y="60" class="t-c t-xl">④</text>
  <text x="769" y="96" class="t-c t-b">출력 → 내 터미널</text><text x="769" y="124" class="t-c t-xs">컨테이너 출력을</text><text x="769" y="142" class="t-c t-xs">클라이언트로 전달</text>
  <text x="769" y="196" class="t-c t-xs t-mono t-mu">Hello from Docker!</text><text x="769" y="214" class="t-c t-xs t-mono t-mu">→ 종료 (Exited 0)</text>
</svg>`
    },
    choose: {
      caption: '내 컴퓨터에 맞는 설치 방법',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="운영체제별 Docker 설치 방법">
  <rect x="330" y="14" width="220" height="44" rx="22" class="s-blue"/><text x="440" y="36" class="t-b t-c tw">지금 쓰는 컴퓨터는?</text>
  <line x1="380" y1="58" x2="140" y2="100" class="ln ar"/><line x1="440" y1="58" x2="440" y2="100" class="ln ar"/><line x1="500" y1="58" x2="740" y2="100" class="ln ar"/>
  <rect x="30" y="102" width="220" height="130" rx="12" class="blue"/><text x="140" y="128" class="t-c t-b">🪟 Windows 10/11</text>
  <text x="140" y="156" class="t-c t-sm">WSL2 켜기</text><text x="140" y="178" class="t-c t-sm">→ Docker Desktop 설치</text><text x="140" y="210" class="t-c t-xs t-mu">(가상화 기능 필요)</text>
  <rect x="330" y="102" width="220" height="130" rx="12" class="gray"/><text x="440" y="128" class="t-c t-b">🍎 macOS</text>
  <text x="440" y="156" class="t-c t-sm">Docker Desktop 설치</text><text x="440" y="178" class="t-c t-sm">(Apple 칩 / Intel 선택)</text><text x="440" y="210" class="t-c t-xs t-mu">대안: OrbStack · Colima</text>
  <rect x="630" y="102" width="220" height="130" rx="12" class="orange"/><text x="740" y="128" class="t-c t-b">🐧 Linux (Ubuntu)</text>
  <text x="740" y="156" class="t-c t-sm">Docker Engine 을 apt 로</text><text x="740" y="178" class="t-c t-sm">(공식 저장소 추가)</text><text x="740" y="210" class="t-c t-xs t-mu">서버는 보통 이 방식</text>
</svg>`
    }
  },

  sections: [
    {
      title: 'Docker 는 무엇으로 이루어져 있나',
      html: `
<p>우리가 터미널에 치는 <code>docker</code> 는 사실 <b>클라이언트(client)</b>입니다. 명령을 받아서 뒤에서 항상 돌고 있는
<b>Docker 데몬(daemon, <code>dockerd</code>)</b>에게 "이것 좀 해 줘" 하고 요청을 보낼 뿐이죠. 이미지를 받고 · 컨테이너를 만들고 · 네트워크를 연결하는 실제 일은 데몬이 합니다.</p>
{{fig:arch}}
<div class="cards c3">
  <div class="card blue"><div class="ci">⌨️</div><b>Docker CLI</b><p>우리가 입력하는 <code>docker</code> 명령. 요청을 데몬에게 보냄</p></div>
  <div class="card gray"><div class="ci">⚙️</div><b>Docker 데몬 (dockerd)</b><p>이미지 · 컨테이너 · 네트워크 · 볼륨을 실제로 관리하는 서비스</p></div>
  <div class="card orange"><div class="ci">☁️</div><b>레지스트리</b><p>이미지 창고. 기본값은 <b>Docker Hub</b>(hub.docker.com)</p></div>
</div>
<div class="box analogy"><div class="box-t">🍳 비유 — 식당</div>
손님(CLI)은 주문만 하고, 주방장(데몬)이 요리(컨테이너)를 만듭니다. 재료(이미지)가 없으면 도매 시장(레지스트리)에서 사 옵니다.
주방장이 퇴근(데몬 꺼짐)하면 주문을 아무리 해도 요리가 안 나오겠죠?</div>
<p>이 밖에도 Docker 를 설치하면 함께 따라오는 도구들이 있습니다.</p>
<table class="tbl"><thead><tr><th>구성 요소</th><th>하는 일</th><th>배우는 곳</th></tr></thead><tbody>
<tr><td><b>Docker Engine</b></td><td>데몬 + CLI + containerd. 리눅스 서버에 설치하는 핵심</td><td>이 장</td></tr>
<tr><td><b>Docker Desktop</b></td><td>윈도 · 맥용 앱. 리눅스 VM + Engine + GUI + Compose 를 한 번에</td><td>이 장</td></tr>
<tr><td><b>Docker Compose</b></td><td>여러 컨테이너를 YAML 파일 하나로 관리 (<code>docker compose</code>)</td><td>9 · 10장</td></tr>
<tr><td><b>Buildx (BuildKit)</b></td><td>빠르고 똑똑한 이미지 빌드 엔진 (<code>docker build</code>)</td><td>6 · 7장</td></tr>
<tr><td><b>containerd · runc</b></td><td>데몬 아래에서 실제로 컨테이너를 실행하는 부품</td><td>14장</td></tr>
</tbody></table>`
    },
    {
      title: '내 컴퓨터에 설치하기',
      html: `
<p>이 강좌는 오른쪽 실습 화면으로 설치 없이 따라 할 수 있지만, 배운 것을 내 PC 에서도 해 보려면 Docker 를 설치해야 합니다.</p>
{{fig:choose}}
<h3>🪟 Windows</h3>
<ol class="steps-list">
<li><b>WSL2 설치</b> — 관리자 PowerShell 에서 아래 명령 후 재부팅. (BIOS 에서 가상화(VT-x/AMD-V)가 켜져 있어야 합니다)</li>
</ol>
<pre class="code" data-lang="powershell"><code>wsl --install</code></pre>
<ol class="steps-list" start="2">
<li><b>Docker Desktop 설치</b> — docs.docker.com 의 "Install Docker Desktop on Windows" 에서 설치 파일을 받아 실행하고, "Use WSL 2 based engine" 을 선택합니다.</li>
<li><b>확인</b> — 새 터미널을 열고 <code>docker version</code>, <code>docker run hello-world</code>.</li>
</ol>
<h3>🍎 macOS</h3>
<p>Docker Desktop for Mac 을 받아 설치합니다. <b>Apple 칩(M1~)</b>과 <b>Intel 칩</b>용 설치 파일이 따로 있으니 내 맥에 맞는 것을 고르세요. (Homebrew 사용자는 <code>brew install --cask docker</code>)</p>
<h3>🐧 Linux (Ubuntu 24.04)</h3>
<p>서버에서는 GUI 없는 <b>Docker Engine</b> 을 설치합니다. 공식 문서의 "Install Docker Engine on Ubuntu" 순서를 따르는 것이 가장 안전합니다. 빠르게 해 보려면 편의 스크립트도 있습니다(운영 서버에는 공식 저장소 방식 권장).</p>
<pre class="code" data-lang="bash"><code><span class="cm"># 편의 스크립트 (테스트 · 학습용)</span>
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

<span class="cm"># sudo 없이 docker 쓰기 — docker 그룹에 내 계정 추가 (다시 로그인 필요)</span>
sudo usermod -aG docker $USER

<span class="cm"># 부팅할 때 자동 시작</span>
sudo systemctl enable --now docker</code></pre>
<div class="box warn"><div class="box-t">⚠️ docker 그룹 = root 권한</div>
docker 그룹에 들어간 사용자는 컨테이너로 호스트 파일을 마음대로 다룰 수 있어서 사실상 root 와 같습니다. 믿을 수 있는 계정만 추가하세요. (13장 · rootless 모드)</div>
<div class="box note"><div class="box-t">ℹ️ Docker Desktop 라이선스</div>
Docker Desktop 은 개인 · 교육 · 소규모 기업에는 무료지만, <b>직원 250명 이상 또는 연 매출 1,000만 달러 이상</b> 기업은 유료 구독이 필요합니다.
Docker Engine(리눅스)과 Docker CLI 자체는 오픈 소스(Apache 2.0)입니다. 대안: Rancher Desktop · Podman Desktop · OrbStack(맥) · Colima(맥).</div>`
    },
    {
      title: 'docker version — 클라이언트와 서버',
      html: `
<p>설치가 끝나면 가장 먼저 <code>docker version</code> 을 실행합니다. 출력이 <b>Client</b> 와 <b>Server</b> 두 부분으로 나뉘는 것에 주목하세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker version</code></pre>
<pre class="code out" data-lang="출력"><code>Client:
 Version:           27.4.0
 API version:       1.47
 …
 Context:           default

Server: Docker Engine - Community (브라우저 시뮬레이터)
 Engine:
  Version:          27.4.0
  API version:      1.47 (minimum version 1.24)
 containerd:
  Version:          1.7.24
 runc:
  Version:          1.2.2</code></pre>
<p><b>Client</b> 는 CLI, <b>Server</b> 는 데몬입니다. 데몬이 꺼져 있으면 Server 부분 대신 오류가 나옵니다. 실습 환경에서 일부러 데몬을 꺼 볼까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>sudo systemctl stop docker
docker ps</code></pre>
<pre class="code out" data-lang="출력"><code>Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?</code></pre>
<p>이 오류는 초보자가 가장 많이 만나는 오류 중 하나입니다. 주방장이 퇴근했으니 다시 불러와야죠.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>sudo systemctl start docker
sudo systemctl status docker
docker ps</code></pre>
<div class="box tip"><div class="box-t">💡 운영체제별로 데몬 켜는 법</div>
리눅스: <code>sudo systemctl start docker</code> · 윈도/맥: <b>Docker Desktop 앱을 실행</b>(고래 아이콘이 멈춰 있으면 준비 완료).<br>
<code>permission denied while trying to connect to the Docker daemon socket</code> 이 나오면 데몬은 켜져 있지만 <b>권한</b>이 없는 것 → <code>sudo</code> 를 붙이거나 docker 그룹에 추가하고 다시 로그인.</div>
<p><code>docker info</code> 는 데몬의 상태를 더 자세히 보여 줍니다 — 컨테이너 · 이미지 개수, 스토리지 드라이버, 커널 버전, CPU · 메모리 등.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker info</code></pre>`
    },
    {
      title: 'hello-world 가 실행되는 4단계',
      html: `
<p>0장에서 실행해 본 <code>docker run hello-world</code> 의 출력을 자세히 읽어 보면, Docker 가 한 일이 그대로 적혀 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run hello-world</code></pre>
{{fig:hello}}
<pre class="code out" data-lang="출력"><code>To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.</code></pre>
<table class="tbl"><thead><tr><th>단계</th><th>출력에서 찾기</th><th>뜻</th></tr></thead><tbody>
<tr><td>① 요청</td><td>(보이지 않음)</td><td>CLI 가 <code>/var/run/docker.sock</code> 으로 데몬에게 요청</td></tr>
<tr><td>② 내려받기</td><td><code>Unable to find image … locally</code> · <code>Pull complete</code></td><td>로컬에 없어서 Docker Hub 에서 pull</td></tr>
<tr><td>③ 생성 · 실행</td><td>(보이지 않음)</td><td>컨테이너를 만들고 이미지에 적힌 명령 <code>/hello</code> 실행</td></tr>
<tr><td>④ 출력 전달</td><td><code>Hello from Docker!</code></td><td>컨테이너 출력이 내 터미널로. 프로그램이 끝나면 컨테이너도 종료</td></tr>
</tbody></table>
<p>두 번째로 실행하면 ②단계가 없습니다. 이미 이미지가 있으니까요. 컨테이너는 실행할 때마다 새로 만들어지므로 <code>docker ps -a</code> 로 보면 계속 늘어납니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run hello-world
docker ps -a
docker images</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol><li>위 명령을 실행하고 <code>docker ps -a</code> 의 STATUS 칸이 <b>Exited (0)</b> 인 것을 확인하세요. 0 은 "정상 종료"라는 뜻입니다.</li>
<li>NAMES 칸의 이상한 이름(예: <code>priceless_lovelace</code>)은 <code>--name</code> 을 안 주면 Docker 가 <b>형용사_과학자</b> 로 지어 주는 이름입니다.</li></ol></div>`
    },
    {
      title: 'docker 명령의 구조',
      html: `
<p>docker 명령은 대부분 이런 모양입니다.</p>
<div class="flow">
  <div class="fb gray"><b>docker</b>CLI</div>
  <div class="fb blue"><b>container</b>관리 대상<br><span class="muted">(생략 가능)</span></div>
  <div class="fb green"><b>run</b>동작</div>
  <div class="fb orange"><b>-d --name web -p 8080:80</b>옵션</div>
  <div class="fb purple"><b>nginx</b>인자 (이미지)</div>
</div>
<p>Docker 는 처음에 <code>docker ps</code>, <code>docker rmi</code> 처럼 짧은 명령만 있었는데, 명령이 많아지면서 <b>관리 대상별로 묶은 명령</b>(management commands)이 생겼습니다.
두 방식 모두 똑같이 동작하니 편한 것을 쓰면 됩니다.</p>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>관리 대상</th><th>새 형식</th><th>옛 형식 (짧은 별명)</th></tr></thead><tbody>
<tr><td>컨테이너 목록</td><td><code class="cmd">docker container ls</code></td><td><code class="cmd">docker ps</code></td></tr>
<tr><td>이미지 목록</td><td><code class="cmd">docker image ls</code></td><td><code class="cmd">docker images</code></td></tr>
<tr><td>이미지 삭제</td><td><code>docker image rm 이미지</code></td><td><code>docker rmi 이미지</code></td></tr>
<tr><td>컨테이너 삭제</td><td><code>docker container rm 이름</code></td><td><code>docker rm 이름</code></td></tr>
<tr><td>네트워크 · 볼륨</td><td><code class="cmd">docker network ls</code> · <code class="cmd">docker volume ls</code></td><td>(새 형식만)</td></tr>
</tbody></table></div>
<p>모르는 명령은 <code>--help</code> 로 찾아봅니다. 옵션은 한 글자(<code>-d</code>)와 긴 이름(<code>--detach</code>) 두 가지가 있고, 한 글자 옵션은 <code>-it</code> 처럼 붙여 쓸 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker --help
docker run --help</code></pre>
<div class="box tip"><div class="box-t">💡 자동 완성</div>실습 터미널에서도 <kbd>Tab</kbd> 을 누르면 명령 · 컨테이너 이름 · 이미지 이름이 자동 완성됩니다. <kbd>↑</kbd> 로 이전 명령을 다시 불러올 수 있어요.</div>`
    },
    {
      title: '조금 더 해 보기 — 우분투 안으로, 웹 서버 켜고 끄기',
      html: `
<p>hello-world 는 메시지만 찍고 끝나지만, 컨테이너 안에 <b>들어가서</b> 명령을 칠 수도 있습니다. <code>-it</code> 는 "키보드 입력을 연결하고(-i) 터미널처럼 보여 줘(-t)" 라는 뜻입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -it ubuntu bash</code></pre>
<p>프롬프트가 <code>root@abc123…:/#</code> 로 바뀌면 컨테이너 안입니다. 아래 명령을 차례로 쳐 보세요. 호스트와는 다른 세상이라는 것을 느낄 수 있습니다.</p>
<pre class="code" data-lang="bash"><code>cat /etc/os-release     <span class="cm"># 우분투 24.04</span>
hostname                <span class="cm"># 컨테이너 ID</span>
ls /
exit                    <span class="cm"># 나가면 컨테이너도 종료</span></code></pre>
<div class="box note"><div class="box-t">ℹ️ exit 하면 왜 컨테이너가 끝날까?</div>
<code>docker run -it ubuntu bash</code> 에서 컨테이너의 <b>주인공 프로그램(메인 프로세스)</b>은 bash 입니다. bash 가 끝나면 컨테이너도 끝납니다.
컨테이너를 끄지 않고 빠져나오려면 <kbd>Ctrl</kbd>+<kbd>P</kbd> 다음 <kbd>Ctrl</kbd>+<kbd>Q</kbd> 를 누릅니다(분리, detach). 3장에서 자세히 배웁니다.</div>
<p>이번에는 계속 도는 프로그램인 웹 서버를 <b>백그라운드(-d)</b>로 켜고, 목록을 보고, 끄고, 지워 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name hello-nginx nginx
docker ps
docker stop hello-nginx
docker ps -a
docker rm hello-nginx</code></pre>
{{widget:open|pane=dash|label=📊 대시보드에서 상태 보기}}`
    },
    {
      title: '설치할 때 자주 만나는 문제',
      html: `
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead><tbody>
<tr><td><code>Cannot connect to the Docker daemon … Is the docker daemon running?</code></td><td>데몬이 꺼짐</td><td>리눅스 <code>sudo systemctl start docker</code> · 윈도/맥은 Docker Desktop 실행</td></tr>
<tr><td><code>permission denied … /var/run/docker.sock</code></td><td>docker 그룹이 아님</td><td><code>sudo usermod -aG docker $USER</code> 후 다시 로그인 (또는 sudo)</td></tr>
<tr><td><code>docker: command not found</code></td><td>설치 안 됨 · PATH 문제</td><td>설치 확인, 새 터미널 열기</td></tr>
<tr><td>Docker Desktop: "WSL 2 installation is incomplete"</td><td>WSL2 미설치</td><td><code>wsl --install</code> 후 재부팅, <code>wsl --update</code></td></tr>
<tr><td>"Virtualization support not detected"</td><td>BIOS 가상화 꺼짐</td><td>BIOS/UEFI 에서 Intel VT-x / AMD-V (SVM) 켜기</td></tr>
<tr><td><code>no matching manifest for linux/arm64</code> (맥 M 칩)</td><td>그 이미지에 ARM 버전이 없음</td><td>다른 태그/이미지 사용 또는 <code>--platform linux/amd64</code> (에뮬레이션, 느림)</td></tr>
<tr><td>회사 네트워크에서 pull 이 안 됨</td><td>프록시 · 방화벽</td><td>Docker Desktop 설정 → Proxies, 또는 데몬 프록시 설정</td></tr>
</tbody></table></div>
<div class="box practice"><div class="box-t">🧪 스스로 해 보기</div>오른쪽 <b>🎯 미션</b> 탭에 이 장의 미션이 있습니다. 특히 "데몬이 멈췄다!" 미션은 <b>⚙️ 상황 만들기</b> 버튼으로 문제 상황을 만든 뒤 직접 해결해 보세요.</div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1', title: '클라이언트와 서버 버전 확인',
      desc: '<code>docker version</code> 을 실행해 Client 와 Server 버전을 확인하세요.',
      hint: '<code>docker version</code>',
      answer: ['docker version'],
      check: M => M.ran(/^\s*docker\s+version\b/)
    },
    {
      id: 'm2', scenario: true, title: '데몬이 멈췄다! 다시 살리기',
      desc: '⚙️ <b>상황 만들기</b>를 누르면 Docker 데몬이 멈춥니다. <code>docker ps</code> 가 <i>Cannot connect to the Docker daemon</i> 오류를 내는 것을 확인한 뒤, 데몬을 다시 켜서 <code>docker ps</code> 가 동작하게 하세요.',
      setup: ['sudo systemctl stop docker', 'docker ps'],
      hint: '리눅스에서 서비스를 켜는 명령은 <code>sudo systemctl start 서비스이름</code> 입니다.',
      answer: ['sudo systemctl start docker', 'docker ps'],
      check: M => M.D.s.daemon.running && M.ran(/systemctl\s+(start|restart)\s+docker/)
    },
    {
      id: 'm3', title: '우분투 컨테이너에게 물어보기',
      desc: '<code>ubuntu</code> 이미지로 컨테이너를 실행하면서 <code>cat /etc/os-release</code> 를 실행해 우분투 버전을 확인하세요. 끝나면 자동으로 지워지게(<code>--rm</code>) 해 보세요.',
      hint: '<code>docker run --rm 이미지 명령</code>',
      answer: ['docker run --rm ubuntu cat /etc/os-release'],
      check: M => M.ran(/docker\s+(container\s+)?run\b.*--rm\b.*\bubuntu\b.*os-release/) && !M.cs(c => /ubuntu/.test(c.image) && /os-release/.test((c.cmd || []).join(' '))).length
    },
    {
      id: 'm4', title: '이름 붙인 웹 서버 켜기',
      desc: '<code>nginx</code> 이미지로 <b>hello-nginx</b> 라는 이름의 컨테이너를 백그라운드로 실행하세요.',
      hint: '<code>docker run -d --name 이름 이미지</code>',
      answer: ['docker run -d --name hello-nginx nginx'],
      check: M => M.running('hello-nginx')
    },
    {
      id: 'm5', title: '웹 서버 끄기',
      desc: '실행 중인 <b>hello-nginx</b> 를 정지하세요. (지우지는 말고 <b>Exited</b> 상태로)',
      hint: '<code>docker stop 이름</code>',
      answer: ['docker stop hello-nginx'],
      check: M => M.status('hello-nginx') === 'exited'
    },
    {
      id: 'm6', title: '새 형식 명령으로 목록 보기',
      desc: '<code>docker ps -a</code> 와 같은 일을 하는 <b>관리 명령 형식</b>(docker container …)으로 모든 컨테이너 목록을 출력하세요.',
      hint: '<code>docker container ls</code> 에 "모두(all)" 옵션',
      answer: ['docker container ls -a'],
      check: M => M.ran(/docker\s+container\s+(ls|list|ps)\b.*(-a|--all)\b/)
    }
  ],

  videos: [
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: '설치 · 아키텍처 · 기본 명령 (앞부분)' },
    { title: 'Docker in 100 Seconds', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=Gjnup-PuquQ', lang: 'en', min: '2분', desc: '전체 그림 복습' },
    { title: 'Docker Desktop 설치 (검색)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=Docker+Desktop+%EC%84%A4%EC%B9%98+WSL2', desc: '윈도 WSL2 + Docker Desktop 설치 영상 검색 결과' },
    { title: 'Install Docker Engine on Ubuntu (검색)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=install+docker+engine+ubuntu+24.04', desc: '우분투 서버 설치 영상 검색 결과' }
  ],

  terms: [
    ['Docker CLI', '우리가 입력하는 docker 명령(클라이언트). 요청을 데몬에게 보냄'],
    ['Docker 데몬(dockerd)', '백그라운드에서 이미지 · 컨테이너 · 네트워크 · 볼륨을 실제로 관리하는 서비스'],
    ['docker.sock', 'CLI 와 데몬이 이야기하는 통로(유닉스 소켓) <code>/var/run/docker.sock</code>'],
    ['Docker Engine', '데몬 + CLI + containerd 묶음. 리눅스 서버에 설치'],
    ['Docker Desktop', '윈도 · 맥용 앱 (리눅스 VM + Engine + GUI + Compose)'],
    ['WSL2', '윈도에서 진짜 리눅스 커널을 돌리는 기능. Docker Desktop 의 기반'],
    ['Docker Hub', 'Docker 의 기본 레지스트리 (hub.docker.com)'],
    ['pull', '레지스트리에서 이미지를 내려받기'],
    ['관리 명령(management command)', '<code>docker container ls</code> 처럼 관리 대상별로 묶은 명령 형식'],
    ['docker 그룹', '이 그룹 사용자는 sudo 없이 docker 사용 가능 (root 와 같은 권한이므로 주의)']
  ],

  summary: [
    '<code>docker</code> 명령은 <b>클라이언트</b>일 뿐, 실제 일은 <b>Docker 데몬(dockerd)</b>이 하고 이미지는 <b>레지스트리</b>에서 온다',
    '윈도 · 맥은 <b>Docker Desktop</b>(안에 리눅스 VM), 리눅스 서버는 <b>Docker Engine</b> 을 설치',
    '<code>docker version</code> 의 Server 부분이 안 나오고 <i>Cannot connect to the Docker daemon</i> 이면 데몬을 켠다',
    'hello-world 4단계: 요청 → (없으면) pull → 컨테이너 생성 · 실행 → 출력 전달',
    '명령 구조: <code>docker [대상] 동작 [옵션] [인자]</code>, 모르면 <code>--help</code>'
  ],

  quiz: [
    { q: '<code>docker run</code> 을 실행했을 때 실제로 컨테이너를 만들고 실행하는 것은?', options: ['Docker CLI', 'Docker 데몬(dockerd)', 'Docker Hub', '웹 브라우저'], answer: 1, explain: 'CLI 는 요청만 보내고 데몬이 이미지 · 컨테이너를 실제로 다룹니다.' },
    { q: '"Cannot connect to the Docker daemon at unix:///var/run/docker.sock" 오류가 났다. 가장 먼저 할 일은?', options: ['이미지를 다시 받는다', '데몬(서비스)이 켜져 있는지 확인하고 켠다', '컴퓨터를 포맷한다', '컨테이너 이름을 바꾼다'], answer: 1, explain: '리눅스는 sudo systemctl start docker, 윈도/맥은 Docker Desktop 을 실행합니다.' },
    { q: '<code>docker version</code> 출력에 Client 와 Server 가 따로 있는 이유는?', options: ['버전이 두 개라서 둘 중 하나를 고르라는 뜻', 'CLI(클라이언트)와 데몬(서버)이 서로 다른 프로그램이라서', '서버 컴퓨터에서만 docker 를 쓸 수 있어서', '인터넷 연결 상태를 보여 주려고'], answer: 1, explain: '클라이언트-서버 구조라서 각각의 버전이 따로 표시되고, 원격 데몬에도 연결할 수 있습니다.' },
    { q: 'hello-world 를 <b>두 번째</b> 실행할 때 생략되는 단계는?', options: ['데몬에게 요청', '레지스트리에서 이미지 pull', '컨테이너 생성', '출력 전달'], answer: 1, explain: '이미지가 이미 로컬에 있으므로 내려받지 않습니다. 컨테이너는 매번 새로 만들어집니다.' },
    { q: '<code>docker ps</code> 와 같은 일을 하는 관리 명령 형식은?', options: ['docker image ls', 'docker container ls', 'docker network ls', 'docker ps ls'], answer: 1, explain: 'docker container ls (= docker container ps = docker ps)' },
    { q: '리눅스에서 sudo 없이 docker 를 쓰려고 docker 그룹에 사용자를 추가할 때 주의할 점은?', options: ['아무 위험이 없다', 'docker 그룹 사용자는 사실상 root 와 같은 권한을 갖는다', '그룹에 추가하면 컨테이너를 만들 수 없다', '윈도에서만 필요하다'], answer: 1, explain: '컨테이너로 호스트 파일 시스템을 마운트할 수 있어서 root 권한과 다름없습니다.' }
  ]
});
