/* 0장 — 컨테이너란 무엇인가? */
Course.lesson({
  id: 'ch00', no: '00',
  icon: '📦',
  title: '컨테이너란 무엇인가?',
  subtitle: '"제 컴퓨터에서는 되는데요?" — 이 말을 없애기 위해 컨테이너가 태어났습니다',
  level: '입문', time: '60분',
  goals: [
    '"내 컴퓨터에서는 되는데 서버에서는 안 되는" 문제가 왜 생기는지 설명할 수 있다',
    '가상 머신과 컨테이너의 구조 차이(커널 공유)를 그림으로 설명할 수 있다',
    '이미지와 컨테이너의 관계를 붕어빵 틀과 붕어빵으로 비유할 수 있다',
    'Docker 가 해 주는 일(Build · Ship · Run)과 컨테이너 생태계의 큰 흐름을 말할 수 있다',
    '오른쪽 실습 화면에서 첫 컨테이너를 실행하고 결과를 확인할 수 있다'
  ],
  chips: ['docker version', 'docker run hello-world', 'docker ps -a', 'docker images'],

  figs: {
    works: {
      caption: '같은 코드라도 실행 환경(언어 버전 · 라이브러리 · 설정)이 다르면 결과가 달라집니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="개발자 PC 와 서버의 환경 차이">
  <rect x="20" y="20" width="360" height="260" rx="16" class="green"/>
  <text x="200" y="48" class="t-b t-c t-lg">👩‍💻 개발자 PC</text>
  <rect x="50" y="70" width="300" height="42" rx="8" class="box"/><text x="200" y="91" class="t-c t-mono t-sm">app.py (내 코드)</text>
  <rect x="50" y="122" width="300" height="42" rx="8" class="box"/><text x="200" y="143" class="t-c t-mono t-sm">Python 3.12 · Flask 3.0</text>
  <rect x="50" y="174" width="300" height="42" rx="8" class="box"/><text x="200" y="195" class="t-c t-mono t-sm">Windows 11 · 설정 파일 A</text>
  <text x="200" y="252" class="t-c t-b t-green">✅ 잘 돌아감!</text>
  <line x1="390" y1="150" x2="470" y2="150" class="ln thick ar moving"/>
  <text x="430" y="135" class="t-c t-xs t-mu">코드만 복사</text>
  <rect x="480" y="20" width="360" height="260" rx="16" class="red"/>
  <text x="660" y="48" class="t-b t-c t-lg">🖥️ 운영 서버</text>
  <rect x="510" y="70" width="300" height="42" rx="8" class="box"/><text x="660" y="91" class="t-c t-mono t-sm">app.py (같은 코드)</text>
  <rect x="510" y="122" width="300" height="42" rx="8" class="box"/><text x="660" y="143" class="t-c t-mono t-sm t-red">Python 3.8 · Flask 없음</text>
  <rect x="510" y="174" width="300" height="42" rx="8" class="box"/><text x="660" y="195" class="t-c t-mono t-sm t-red">Linux · 설정 파일 B</text>
  <text x="660" y="252" class="t-c t-b t-red">❌ ModuleNotFoundError</text>
</svg>`
    },
    ship: {
      caption: '선적 컨테이너: 안에 무엇이 들었든 규격이 같아서 배 · 기차 · 트럭 어디에나 그대로 실립니다',
      svg: `<svg class="dg" viewBox="0 0 860 250" role="img" aria-label="표준 선적 컨테이너가 배, 기차, 트럭으로 옮겨지는 그림">
  <rect x="330" y="20" width="200" height="90" rx="6" class="orange"/>
  <text x="430" y="50" class="t-c t-b">📦 표준 컨테이너</text>
  <text x="430" y="74" class="t-c t-xs">안: 🍌 · 🚗 부품 · 👕 · 📺</text>
  <text x="430" y="94" class="t-c t-xs t-mu">밖: 크기 · 고리 · 문 규격 동일</text>
  <line x1="360" y1="112" x2="140" y2="160" class="ln ar"/>
  <line x1="430" y1="112" x2="430" y2="160" class="ln ar"/>
  <line x1="500" y1="112" x2="720" y2="160" class="ln ar"/>
  <rect x="50" y="162" width="180" height="70" rx="12" class="blue"/><text x="140" y="192" class="t-c t-xl">🚢</text><text x="140" y="220" class="t-c t-sm t-b">배</text>
  <rect x="340" y="162" width="180" height="70" rx="12" class="teal"/><text x="430" y="192" class="t-c t-xl">🚆</text><text x="430" y="220" class="t-c t-sm t-b">기차</text>
  <rect x="630" y="162" width="180" height="70" rx="12" class="purple"/><text x="720" y="192" class="t-c t-xl">🚚</text><text x="720" y="220" class="t-c t-sm t-b">트럭</text>
</svg>`
    },
    vm: {
      caption: '가상 머신은 운영체제(OS)를 통째로 여러 개 띄우고, 컨테이너는 호스트의 커널 하나를 함께 씁니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="가상 머신과 컨테이너의 층 구조 비교">
  <text x="215" y="24" class="t-c t-b t-lg">🏢 가상 머신 (VM)</text>
  <text x="665" y="24" class="t-c t-b t-lg">📦 컨테이너</text>
  <rect x="20" y="40" width="120" height="44" rx="8" class="orange"/><text x="80" y="62" class="t-c t-b">앱 A</text>
  <rect x="155" y="40" width="120" height="44" rx="8" class="orange"/><text x="215" y="62" class="t-c t-b">앱 B</text>
  <rect x="290" y="40" width="120" height="44" rx="8" class="orange"/><text x="350" y="62" class="t-c t-b">앱 C</text>
  <rect x="20" y="90" width="120" height="36" rx="8" class="yellow"/><text x="80" y="108" class="t-c t-xs">라이브러리</text>
  <rect x="155" y="90" width="120" height="36" rx="8" class="yellow"/><text x="215" y="108" class="t-c t-xs">라이브러리</text>
  <rect x="290" y="90" width="120" height="36" rx="8" class="yellow"/><text x="350" y="108" class="t-c t-xs">라이브러리</text>
  <rect x="20" y="132" width="120" height="58" rx="8" class="red"/><text x="80" y="155" class="t-c t-sm t-b">게스트 OS</text><text x="80" y="175" class="t-c t-xs">(커널 포함 수 GB)</text>
  <rect x="155" y="132" width="120" height="58" rx="8" class="red"/><text x="215" y="155" class="t-c t-sm t-b">게스트 OS</text><text x="215" y="175" class="t-c t-xs">(커널 포함 수 GB)</text>
  <rect x="290" y="132" width="120" height="58" rx="8" class="red"/><text x="350" y="155" class="t-c t-sm t-b">게스트 OS</text><text x="350" y="175" class="t-c t-xs">(커널 포함 수 GB)</text>
  <rect x="20" y="200" width="390" height="46" rx="8" class="purple"/><text x="215" y="223" class="t-c t-b">하이퍼바이저 (VirtualBox · Hyper-V · KVM)</text>
  <rect x="20" y="254" width="390" height="46" rx="8" class="gray"/><text x="215" y="277" class="t-c t-b">호스트 운영체제</text>
  <rect x="20" y="308" width="390" height="46" rx="8" class="box"/><text x="215" y="331" class="t-c t-b">🖥️ 하드웨어 (CPU · 메모리 · 디스크)</text>

  <line x1="440" y1="40" x2="440" y2="354" class="ln dash thin"/>

  <rect x="470" y="96" width="120" height="44" rx="8" class="teal"/><text x="530" y="118" class="t-c t-b">앱 A</text>
  <rect x="605" y="96" width="120" height="44" rx="8" class="teal"/><text x="665" y="118" class="t-c t-b">앱 B</text>
  <rect x="740" y="96" width="120" height="44" rx="8" class="teal"/><text x="800" y="118" class="t-c t-b">앱 C</text>
  <rect x="470" y="146" width="120" height="44" rx="8" class="yellow"/><text x="530" y="168" class="t-c t-xs">라이브러리</text>
  <rect x="605" y="146" width="120" height="44" rx="8" class="yellow"/><text x="665" y="168" class="t-c t-xs">라이브러리</text>
  <rect x="740" y="146" width="120" height="44" rx="8" class="yellow"/><text x="800" y="168" class="t-c t-xs">라이브러리</text>
  <rect x="470" y="200" width="390" height="46" rx="8" class="blue"/><text x="665" y="223" class="t-c t-b">🐳 컨테이너 엔진 (Docker)</text>
  <rect x="470" y="254" width="390" height="46" rx="8" class="gray"/><text x="665" y="271" class="t-c t-b">호스트 운영체제</text><text x="665" y="290" class="t-c t-xs t-blue t-b">리눅스 커널 1개를 모든 컨테이너가 공유</text>
  <rect x="470" y="308" width="390" height="46" rx="8" class="box"/><text x="665" y="331" class="t-c t-b">🖥️ 하드웨어</text>
</svg>`
    },
    mold: {
      caption: '이미지 하나(틀)로 컨테이너(붕어빵)를 몇 개든 찍어 낼 수 있습니다. 컨테이너끼리는 서로 영향을 주지 않습니다',
      svg: `<svg class="dg" viewBox="0 0 860 290" role="img" aria-label="이미지 하나에서 컨테이너 세 개가 만들어지는 그림">
  <rect x="30" y="70" width="230" height="150" rx="14" class="purple"/>
  <text x="145" y="98" class="t-c t-b t-lg">🧱 이미지</text>
  <text x="145" y="124" class="t-c t-sm">nginx:1.27</text>
  <rect x="60" y="140" width="170" height="20" rx="4" class="box"/><text x="145" y="151" class="t-c t-xs">설정 · 명령</text>
  <rect x="60" y="164" width="170" height="20" rx="4" class="box"/><text x="145" y="175" class="t-c t-xs">nginx 프로그램</text>
  <rect x="60" y="188" width="170" height="20" rx="4" class="box"/><text x="145" y="199" class="t-c t-xs">Debian 기본 파일</text>
  <text x="145" y="246" class="t-c t-xs t-mu">읽기 전용 · 🍞 붕어빵 틀</text>
  <line x1="265" y1="120" x2="520" y2="55" class="ln-blue ar-blue"/>
  <line x1="265" y1="145" x2="520" y2="145" class="ln-blue ar-blue"/>
  <line x1="265" y1="170" x2="520" y2="235" class="ln-blue ar-blue"/>
  <text x="390" y="130" class="t-c t-sm t-mono t-blue">docker run</text>
  <rect x="525" y="25" width="300" height="60" rx="12" class="green"/><text x="675" y="50" class="t-c t-b">📦 컨테이너 web1</text><text x="675" y="71" class="t-c t-xs">실행 중 · 포트 8080 · 자기만의 파일 변경</text>
  <rect x="525" y="115" width="300" height="60" rx="12" class="green"/><text x="675" y="140" class="t-c t-b">📦 컨테이너 web2</text><text x="675" y="161" class="t-c t-xs">실행 중 · 포트 8081</text>
  <rect x="525" y="205" width="300" height="60" rx="12" class="gray"/><text x="675" y="230" class="t-c t-b">📦 컨테이너 test</text><text x="675" y="251" class="t-c t-xs">종료됨 (Exited)</text>
</svg>`
    },
    bsr: {
      caption: 'Docker 의 세 단계 — 만들고(Build), 보내고(Ship), 실행한다(Run)',
      html: `<div class="flow">
  <div class="fb blue"><span class="fi">📝</span><b>Dockerfile</b>만드는 방법(레시피)을 적은 글</div>
  <div class="fb purple"><span class="fi">🧱</span><b>Build → 이미지</b><code>docker build</code></div>
  <div class="fb orange"><span class="fi">☁️</span><b>Ship → 레지스트리</b><code>docker push / pull</code><br>Docker Hub 등</div>
  <div class="fb green"><span class="fi">📦</span><b>Run → 컨테이너</b><code>docker run</code><br>어느 컴퓨터에서든</div>
</div>`
    }
  },

  sections: [
    {
      title: '"제 컴퓨터에서는 되는데요?"',
      html: `
<p>개발자가 만든 프로그램을 다른 컴퓨터(동료 PC · 테스트 서버 · 운영 서버)에 옮기면 갑자기 안 되는 일이 아주 흔합니다.
코드는 똑같은데 왜 그럴까요? 프로그램은 코드만으로 돌아가지 않기 때문입니다.
<b>언어 버전, 라이브러리, 운영체제, 설정 파일, 환경 변수</b> 같은 <b>실행 환경</b>이 함께 맞아야 합니다.</p>
{{fig:works}}
<div class="box analogy"><div class="box-t">🍳 비유 — 요리 레시피만 보내면?</div>
친구에게 김치찌개 레시피만 보냈더니 "우리 집엔 고춧가루가 없고, 냄비도 작아" 라며 맛이 다르게 나옵니다.
<b>재료와 도구까지 통째로 담은 밀키트</b>를 보내면 누구 집에서 끓여도 같은 맛이 나겠죠. 컨테이너가 바로 그 밀키트입니다.</div>
<p>예전에는 이 문제를 "설치 문서"로 해결하려 했습니다. <i>"파이썬 3.12 를 설치하고, 이 라이브러리를 이 버전으로 깔고…"</i>
하지만 사람마다 PC 가 달라서 문서대로 해도 실패하기 일쑤였죠. <b>컨테이너(container)</b>는 프로그램과 그 실행 환경을
<b>하나의 꾸러미</b>로 묶어서, 어디서 실행해도 똑같이 동작하게 만듭니다.</p>
<table class="tbl">
<thead><tr><th>예전 방식</th><th>컨테이너 방식</th></tr></thead>
<tbody>
<tr><td>서버마다 파이썬 · DB 를 직접 설치</td><td>필요한 것이 다 들어 있는 이미지를 받아 실행</td></tr>
<tr><td>설치 문서 20줄을 따라 하다 실패</td><td><code>docker run</code> 한 줄</td></tr>
<tr><td>프로젝트 A 는 파이썬 3.8, B 는 3.12 → 충돌</td><td>프로젝트마다 다른 컨테이너 → 충돌 없음</td></tr>
<tr><td>지우려면 여기저기 흩어진 파일 정리</td><td>컨테이너 삭제 한 번으로 깨끗</td></tr>
</tbody></table>`
    },
    {
      title: '선적 컨테이너에서 이름을 빌려 왔어요',
      html: `
<p>'컨테이너'라는 이름은 항구의 <b>선적 컨테이너</b>에서 왔습니다. 1950년대 표준 규격 컨테이너가 등장하기 전에는
바나나 · 자동차 부품 · 옷을 부두 노동자가 하나하나 옮겨 실었습니다. 짐마다 모양이 달라서 느리고 비쌌죠.
규격이 같은 철제 상자에 담기 시작하자 <b>안에 무엇이 들었든 크레인 · 배 · 기차 · 트럭이 똑같은 방법으로</b> 옮길 수 있게 되었습니다.</p>
{{fig:ship}}
<p>소프트웨어 컨테이너도 같습니다. 안에 든 것이 파이썬 웹 서버든, 데이터베이스든, 자바 프로그램이든
밖에서 보면 모두 <b>같은 방법</b>으로 다룹니다.</p>
<div class="stats">
  <div class="stat blue"><b>docker run</b><span>무엇이든 같은 명령으로 실행</span></div>
  <div class="stat green"><b>docker stop</b><span>무엇이든 같은 명령으로 정지</span></div>
  <div class="stat orange"><b>docker logs</b><span>무엇이든 같은 방법으로 로그 보기</span></div>
</div>
<div class="box tip"><div class="box-t">💡 핵심</div>운영하는 사람은 "이 앱은 어떻게 설치하지?"를 고민할 필요가 없습니다. 이미지 이름만 알면 됩니다.</div>`
    },
    {
      title: '가상 머신 vs 컨테이너',
      html: `
<p>"환경을 통째로 옮긴다"는 생각은 <b>가상 머신(VM, Virtual Machine)</b>으로도 할 수 있습니다.
VirtualBox 로 윈도 안에 우분투를 띄워 본 적이 있다면 그게 가상 머신입니다. 그런데 가상 머신은 <b>운영체제 전체</b>를 또 하나 띄우기 때문에 무겁습니다.</p>
{{fig:vm}}
<p>컨테이너는 운영체제의 핵심인 <b>커널(kernel)</b>을 새로 띄우지 않고 호스트의 커널을 함께 씁니다.
대신 리눅스 커널의 기능(네임스페이스 · cgroups — 14장에서 자세히)으로 <b>"자기만 있는 것처럼" 격리</b>합니다.
그래서 컨테이너는 사실 <b>격리된 프로세스</b>일 뿐이고, 1초도 안 걸려 켜지고 메모리도 적게 씁니다.</p>
<div class="tbl-wrap"><table class="tbl cmp">
<thead><tr><th></th><th>🏢 가상 머신</th><th>📦 컨테이너</th></tr></thead>
<tbody>
<tr><td>격리 단위</td><td>운영체제 전체 (커널 포함)</td><td>프로세스 (커널 공유)</td></tr>
<tr><td>크기</td><td>수 GB</td><td>수 MB ~ 수백 MB</td></tr>
<tr><td>시작 시간</td><td>수십 초 ~ 분</td><td>1초 미만 ~ 수 초</td></tr>
<tr><td>한 PC 에 띄울 수 있는 수</td><td>몇 개</td><td>수십 ~ 수백 개</td></tr>
<tr><td>격리 강도</td><td>강함 (다른 OS 도 가능)</td><td>상대적으로 약함 (같은 커널)</td></tr>
<tr><td>잘 맞는 일</td><td>다른 OS 실행, 강한 보안 경계</td><td>앱 배포, 개발 환경, 마이크로서비스</td></tr>
</tbody></table></div>
{{widget:vmcompare}}
<div class="box note"><div class="box-t">ℹ️ 윈도 · 맥에서는?</div>
컨테이너는 리눅스 커널 기능이라서, 윈도 · 맥용 <b>Docker Desktop</b> 은 안쪽에 작은 리눅스 가상 머신(윈도는 WSL2)을 하나 띄우고 그 위에서 컨테이너를 돌립니다.
가상 머신 1개 + 그 안의 컨테이너 여러 개 구조라서 여전히 가볍습니다.</div>`
    },
    {
      title: '이미지와 컨테이너 — 붕어빵 틀과 붕어빵',
      html: `
<p>Docker 를 배울 때 가장 먼저 구분해야 할 두 단어가 <b>이미지(image)</b>와 <b>컨테이너(container)</b>입니다.</p>
<div class="vs">
  <div class="vs-a purple"><b>🧱 이미지</b><ul>
    <li>컨테이너를 만드는 <b>읽기 전용 틀</b></li>
    <li>프로그램 + 라이브러리 + 기본 파일 + 실행 명령</li>
    <li>여러 <b>레이어</b>가 쌓인 구조 (2장)</li>
    <li>예: <code>nginx:1.27</code>, <code>python:3.12-slim</code></li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b green"><b>📦 컨테이너</b><ul>
    <li>이미지로 만든 <b>실행 중인 인스턴스</b></li>
    <li>이미지 위에 자기만의 <b>쓰기 층</b>이 얹힘</li>
    <li>만들고 · 켜고 · 끄고 · 지울 수 있음 (3장)</li>
    <li>예: <code>web</code>, <code>db</code>, <code>vibrant_turing</code></li></ul></div>
</div>
{{fig:mold}}
<div class="box dev"><div class="box-t">👩‍💻 프로그래머라면</div>이미지는 <b>클래스</b>, 컨테이너는 <b>객체(인스턴스)</b>와 비슷합니다. <code>new Nginx()</code> 를 여러 번 하면 객체가 여러 개 생기듯 <code>docker run nginx</code> 를 여러 번 하면 컨테이너가 여러 개 생깁니다.</div>
<p>직접 확인해 봅시다. 아래 버튼을 누르면 오른쪽 터미널에서 명령이 실행됩니다. 처음에는 이미지가 없어서 <b>내려받고(pull)</b>, 그 이미지로 컨테이너를 만들어 실행합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run hello-world</code></pre>
<pre class="code out" data-lang="출력"><code>Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
…
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.
…</code></pre>
<p>이제 이미지와 컨테이너가 각각 하나씩 생겼습니다. 두 목록을 비교해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker images
docker ps -a</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol><li><code class="cmd">docker run hello-world</code> 를 한 번 더 실행해 보세요. 이번에는 내려받지 않고 바로 실행됩니다 — 이미지는 이미 있으니까요.</li>
<li><code class="cmd">docker ps -a</code> 로 보면 컨테이너는 <b>2개</b>가 되었습니다. 틀(이미지)은 하나, 붕어빵(컨테이너)은 둘!</li>
<li>오른쪽 위 <b>📊 대시보드</b> 탭에서 컨테이너와 이미지를 그림으로 확인해 보세요.</li></ol></div>`
    },
    {
      title: 'Docker 가 해 주는 일 — Build · Ship · Run',
      html: `
<p><b>Docker</b>는 컨테이너를 쉽게 만들고 · 나누고 · 실행하게 해 주는 도구 모음입니다. Docker 의 구호가 바로 <b>"Build, Ship, and Run Any App, Anywhere"</b> 입니다.</p>
{{fig:bsr}}
<ol class="steps-list">
<li><b>Build (만들기)</b> — <code>Dockerfile</code> 이라는 레시피 파일에 "어떤 OS 에서 시작해서, 무엇을 설치하고, 무슨 파일을 넣고, 무엇을 실행할지" 적고 이미지를 만듭니다. (6 · 7장)</li>
<li><b>Ship (보내기)</b> — 이미지를 <b>레지스트리</b>(Docker Hub 같은 이미지 저장소)에 올리면, 다른 사람 · 서버가 내려받을 수 있습니다. (11장)</li>
<li><b>Run (실행)</b> — 이미지만 있으면 개발자 노트북 · 사내 서버 · 클라우드 어디서든 똑같이 실행됩니다. (3 · 4 · 5장)</li>
</ol>
<p>이 강좌에서 이 세 단계를 모두 직접 해 봅니다. 맛보기로, 이미 누군가 만들어 Docker Hub 에 올려 둔 <b>nginx 웹 서버</b> 이미지를 받아 실행해 볼까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name first-web -p 8080:80 nginx
docker ps</code></pre>
<p>설치 과정 없이 웹 서버가 떴습니다. 오른쪽 <b>🌐 브라우저</b> 탭에서 <code>http://localhost:8080</code> 을 열어 보세요.
(<code>-d</code>, <code>-p</code> 같은 옵션은 3장 · 4장에서 자세히 배웁니다.)</p>
{{widget:open|url=http://localhost:8080/|label=🌐 localhost:8080 열어 보기}}
<div class="box tip"><div class="box-t">💡 컨테이너가 쓰이는 곳</div>
<div class="cards c3">
  <div class="card blue"><div class="ci">🧑‍💻</div><b>개발 환경</b><p>DB · 캐시를 설치 없이 <code>docker run</code> 으로. 팀원 모두 같은 환경</p></div>
  <div class="card green"><div class="ci">🚀</div><b>배포</b><p>이미지 하나를 테스트 · 운영 서버에 똑같이</p></div>
  <div class="card purple"><div class="ci">☸️</div><b>클라우드 · 쿠버네티스</b><p>수백 개 컨테이너를 자동으로 관리 (15장)</p></div>
</div></div>`
    },
    {
      title: '컨테이너의 역사와 생태계',
      html: `
<p>컨테이너 기술은 Docker 가 처음 만든 것이 아닙니다. 프로세스를 격리하려는 시도는 오래전부터 있었고, Docker 는 그것을 <b>누구나 쓰기 쉽게</b> 만들었습니다.</p>
<ol class="timeline">
  <li class="gray"><span class="tl-y">1979</span><b>chroot</b><p>유닉스에서 프로세스가 보는 루트 디렉터리를 바꾸는 기능 — 파일 시스템 격리의 시작</p></li>
  <li class="gray"><span class="tl-y">2000</span><b>FreeBSD Jails</b><p>파일 · 프로세스 · 네트워크를 격리하는 "감옥"</p></li>
  <li class="blue"><span class="tl-y">2008</span><b>LXC (Linux Containers)</b><p>리눅스 커널의 cgroups · 네임스페이스를 묶어 쓰는 컨테이너</p></li>
  <li class="blue"><span class="tl-y">2013</span><b>Docker 공개</b><p>이미지 · Dockerfile · 레지스트리로 "쉽게 만들고 나누는" 경험을 제공 → 폭발적 인기</p></li>
  <li class="purple"><span class="tl-y">2014</span><b>Kubernetes 발표</b><p>구글이 컨테이너 오케스트레이션 도구를 오픈 소스로 공개</p></li>
  <li class="purple"><span class="tl-y">2015</span><b>OCI 설립</b><p>이미지 · 런타임 형식을 표준으로 — Docker 이미지를 다른 도구에서도 쓸 수 있게</p></li>
  <li class="orange"><span class="tl-y">2017</span><b>containerd · Moby</b><p>Docker 의 핵심 부품을 분리해 CNCF 에 기부</p></li>
  <li class="green"><span class="tl-y">2022</span><b>Kubernetes 1.24</b><p>dockershim 제거 — 쿠버네티스는 containerd 등을 직접 사용 (Docker 로 만든 이미지는 그대로 사용 가능)</p></li>
</ol>
<div class="box trend"><div class="box-t">🚀 오늘날의 컨테이너 생태계</div>
<b>Docker</b>(개발자 도구의 표준), <b>containerd · CRI-O</b>(런타임), <b>Podman</b>(데몬 없는 대안), <b>Kubernetes</b>(오케스트레이션),
<b>Docker Hub · GHCR · ECR</b>(레지스트리), 클라우드의 컨테이너 서비스(AWS ECS · Google Cloud Run · Azure Container Apps) 등.
이 모두가 <b>OCI 표준 이미지</b>를 공유하기 때문에, 이 강좌에서 만든 이미지는 어디서든 돌아갑니다.</div>`
    },
    {
      title: '이 강좌의 실습 환경 둘러보기',
      html: `
<p>오른쪽 실습 화면에는 브라우저 안에서 동작하는 <b>가상 Docker</b>가 들어 있습니다. 설치 없이 바로 실습할 수 있고, 명령 · 출력은 실제 Docker 와 최대한 같게 만들었습니다.</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">🖥️</div><b>터미널</b><p>명령 입력 · ↑↓ 이전 명령 · <kbd>Tab</kbd> 자동 완성 · <kbd>Ctrl</kbd>+<kbd>C</kbd> 중지 · ＋ 새 탭</p></div>
  <div class="card green"><div class="ci">📊</div><b>대시보드</b><p>컨테이너 · 이미지 · 볼륨 · 네트워크와 연결 구성도를 그림으로</p></div>
  <div class="card orange"><div class="ci">🌐</div><b>브라우저</b><p><code>http://localhost:포트</code> 로 컨테이너가 보여 주는 웹 페이지 확인</p></div>
  <div class="card purple"><div class="ci">📝</div><b>파일</b><p>Dockerfile · compose.yaml · 소스 코드 편집 (<kbd>Ctrl</kbd>+<kbd>S</kbd> 저장)</p></div>
  <div class="card red"><div class="ci">🎯</div><b>미션</b><p>장마다 실습 과제 — 명령을 실행하면 자동 채점</p></div>
  <div class="card teal"><div class="ci">↺</div><b>초기화</b><p>꼬였을 땐 오른쪽 위 ↺ 로 처음 상태로</p></div>
</div>
<p>터미널에 직접 입력해 보세요. 먼저 Docker 가 잘 동작하는지 버전부터 확인합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker version
docker info</code></pre>
<p>작은 리눅스(alpine) 컨테이너 안에서 명령 하나를 실행하고 바로 지우는 것도 해 볼까요? <code>--rm</code> 은 끝나면 컨테이너를 자동으로 지우는 옵션입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm alpine echo "안녕, 컨테이너!"
docker run --rm alpine cat /etc/os-release</code></pre>
<div class="box warn"><div class="box-t">⚠️ 알아 두세요</div>
이 실습 환경은 교육용 <b>시뮬레이터</b>입니다. 실제 인터넷 · 리눅스 커널에 연결되지 않으며, 강좌에 나오는 이미지 · 명령 위주로 동작합니다.
배운 명령은 실제 PC 에 Docker 를 설치하면(1장) 그대로 쓸 수 있습니다.</div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1', title: '첫 컨테이너 실행하기',
      desc: '<code>hello-world</code> 이미지로 컨테이너를 실행해 "Hello from Docker!" 메시지를 확인하세요.',
      hint: '<code>docker run 이미지이름</code>',
      answer: ['docker run hello-world'],
      check: M => M.cs(c => /hello-world/.test(c.image) && c.state.status === 'exited' && c.state.exitCode === 0).length > 0
    },
    {
      id: 'm2', title: 'Docker 버전 확인하기',
      desc: '클라이언트와 서버(엔진) 버전을 한 번에 보여 주는 명령을 실행하세요.',
      hint: '<code>docker version</code>',
      answer: ['docker version'],
      check: M => M.ran(/^\s*docker\s+(version|--version|-v|info)\b/)
    },
    {
      id: 'm3', title: '틀 하나, 붕어빵 둘',
      desc: '<code>hello-world</code> 로 만든 컨테이너가 <b>2개 이상</b> 있게 만드세요. 이미지는 여전히 하나뿐인지 <code>docker images</code> 로도 확인해 보세요.',
      hint: '같은 <code>docker run hello-world</code> 를 한 번 더!',
      answer: ['docker run hello-world', 'docker run hello-world'],
      check: M => M.cs(c => /hello-world/.test(c.image)).length >= 2 && M.images().filter(i => i.repoTags.some(t => /^hello-world:/.test(t))).length === 1
    },
    {
      id: 'm4', title: 'alpine 컨테이너에서 명령 실행하기',
      desc: '<code>alpine</code> 이미지로 컨테이너를 실행하면서, 안에서 <code>cat /etc/os-release</code> 를 실행해 어떤 리눅스인지 확인하세요.',
      hint: '<code>docker run --rm alpine 명령</code> — 이미지 이름 뒤에 실행할 명령을 적습니다.',
      answer: ['docker run --rm alpine cat /etc/os-release'],
      check: M => M.ran(/docker\s+(container\s+)?run\b.*\balpine\b.*\bcat\b.*os-release/)
    },
    {
      id: 'm5', title: '웹 서버를 띄우고 브라우저로 보기',
      desc: '<code>nginx</code> 컨테이너를 백그라운드로 띄워 호스트의 <b>8080</b> 포트로 접속되게 하세요. 🌐 브라우저 탭에서 Welcome 페이지를 확인하세요.',
      hint: '<code>docker run -d -p 8080:80 nginx</code>',
      answer: ['docker run -d --name first-web -p 8080:80 nginx'],
      check: async M => !!M.port(8080) && /Welcome to nginx/.test(await M.get('http://localhost:8080/'))
    }
  ],

  videos: [
    { title: 'Docker in 100 Seconds', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=Gjnup-PuquQ', lang: 'en', min: '2분', desc: '컨테이너 · 이미지 · Dockerfile 을 100초에 훑어보기' },
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: '입문 전체 과정 — 이 강좌와 함께 보면 좋습니다' },
    { title: '도커 컨테이너 개념 (검색)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EC%BB%A8%ED%85%8C%EC%9D%B4%EB%84%88+%EA%B0%9C%EB%85%90', desc: '한국어 설명 영상 검색 결과' },
    { title: '가상 머신 vs 컨테이너 (검색)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=virtual+machine+vs+container', desc: 'VM 과 컨테이너 비교 영상 검색 결과' }
  ],

  terms: [
    ['컨테이너(container)', '프로그램과 실행 환경을 묶어 격리해서 실행하는 단위. 사실은 커널을 공유하는 <b>격리된 프로세스</b>'],
    ['이미지(image)', '컨테이너를 만드는 읽기 전용 틀. 프로그램 · 라이브러리 · 기본 파일 · 실행 명령이 레이어로 쌓여 있음'],
    ['Docker', '컨테이너를 만들고(Build) · 나누고(Ship) · 실행(Run)하게 해 주는 도구 모음과 회사 이름'],
    ['가상 머신(VM)', '하이퍼바이저 위에 운영체제 전체를 따로 띄우는 방식. 무겁지만 격리가 강함'],
    ['커널(kernel)', '운영체제의 핵심. 하드웨어 · 프로세스 · 메모리를 관리. 컨테이너들은 호스트의 커널을 공유'],
    ['호스트(host)', '컨테이너를 실행하는 실제 컴퓨터(또는 VM). 실습 화면의 docker-lab 이 호스트'],
    ['레지스트리(registry)', '이미지를 올리고 내려받는 저장소. 대표적으로 Docker Hub'],
    ['Dockerfile', '이미지를 만드는 방법을 적은 텍스트 파일(레시피)'],
    ['OCI', 'Open Container Initiative. 이미지 · 런타임 형식 표준을 정하는 단체'],
    ['Docker Desktop', '윈도 · 맥에서 Docker 를 쓰게 해 주는 앱. 안쪽에 작은 리눅스 VM 을 띄움']
  ],

  summary: [
    '프로그램은 코드뿐 아니라 <b>실행 환경</b>까지 맞아야 돌아간다 — 컨테이너는 둘을 한 꾸러미로 묶는다',
    '가상 머신은 OS 를 통째로 띄우고, 컨테이너는 <b>호스트 커널을 공유</b>하는 격리된 프로세스라서 가볍고 빠르다',
    '<b>이미지</b>는 읽기 전용 틀(붕어빵 틀), <b>컨테이너</b>는 이미지로 만든 실행 인스턴스(붕어빵)',
    'Docker 의 세 단계: Dockerfile → <b>Build</b>(이미지) → <b>Ship</b>(레지스트리) → <b>Run</b>(컨테이너)',
    'OCI 표준 덕분에 Docker 로 만든 이미지는 쿠버네티스 · 클라우드 등 어디서든 실행된다'
  ],

  quiz: [
    { q: '"제 컴퓨터에서는 되는데 서버에서는 안 돼요" 문제의 가장 큰 원인은?', options: ['코드에 오타가 있어서', '실행 환경(언어 버전 · 라이브러리 · 설정)이 달라서', '서버의 CPU 가 느려서', '인터넷이 끊겨서'], answer: 1, explain: '같은 코드라도 실행 환경이 다르면 결과가 달라집니다. 컨테이너는 환경까지 함께 묶어서 이 문제를 없앱니다.' },
    { q: '가상 머신과 비교한 컨테이너의 특징으로 옳은 것은?', options: ['컨테이너마다 커널을 따로 가진다', '호스트의 커널을 공유해서 가볍고 빨리 시작된다', '다른 종류의 OS 커널을 자유롭게 띄울 수 있다', '반드시 하이퍼바이저가 필요하다'], answer: 1, explain: '컨테이너는 호스트 커널을 공유하는 격리된 프로세스입니다. 그래서 수 MB 크기, 1초 미만 시작이 가능합니다.' },
    { q: '이미지와 컨테이너의 관계를 가장 잘 나타낸 것은?', options: ['이미지 = 붕어빵, 컨테이너 = 붕어빵 틀', '이미지 하나로는 컨테이너를 하나만 만들 수 있다', '이미지 = 읽기 전용 틀, 컨테이너 = 그 틀로 만든 실행 인스턴스', '컨테이너를 지우면 이미지도 지워진다'], answer: 2, explain: '이미지 하나로 컨테이너를 여러 개 만들 수 있고, 컨테이너를 지워도 이미지는 남습니다.' },
    { q: '<code>docker run hello-world</code> 를 처음 실행했을 때 일어나는 일의 순서로 옳은 것은?', options: ['컨테이너 실행 → 이미지 내려받기', '로컬에 이미지가 없음 → 레지스트리에서 내려받기(pull) → 컨테이너 만들고 실행', '이미지를 직접 빌드 → 실행', '아무 일도 일어나지 않는다'], answer: 1, explain: '"Unable to find image locally" 가 나오고 Docker Hub 에서 pull 한 뒤 컨테이너를 만들어 실행합니다.' },
    { q: '이미지를 만드는 방법을 적는 레시피 파일의 이름은?', options: ['compose.yaml', 'Dockerfile', 'package.json', 'image.txt'], answer: 1, explain: 'Dockerfile 에 적힌 순서대로 docker build 가 이미지를 만듭니다. (6장)' },
    { q: '윈도 · 맥의 Docker Desktop 에 대한 설명으로 옳은 것은?', options: ['윈도 커널로 리눅스 컨테이너를 직접 실행한다', '안쪽에 작은 리눅스 VM(윈도는 WSL2)을 띄워 그 위에서 컨테이너를 실행한다', '컨테이너 대신 가상 머신만 실행한다', '맥에서는 Docker 를 쓸 수 없다'], answer: 1, explain: '리눅스 컨테이너는 리눅스 커널이 필요해서 Docker Desktop 은 가벼운 리눅스 VM 을 하나 사용합니다.' }
  ]
});
