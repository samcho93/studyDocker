/* 14장 — 컨테이너의 속: 동작 원리 */
Course.lesson({
  id: 'ch14', no: '14',
  icon: '🔬',
  title: '컨테이너의 속 — 동작 원리',
  subtitle: '컨테이너는 작은 가상 머신이 아니라, 안경을 쓰고 울타리 안에 들어간 "그냥 프로세스"입니다',
  level: '심화', time: '120분',
  goals: [
    '컨테이너가 호스트에서 보면 평범한 프로세스라는 것을 ps aux · docker top 으로 확인할 수 있다',
    '네임스페이스(pid · net · mnt · uts · ipc · user)가 "무엇을 보이게 하는지"를 설명할 수 있다',
    'cgroups 가 메모리 · CPU 를 제한하는 원리를 /sys/fs/cgroup 파일로 확인할 수 있다',
    'overlay 파일 시스템의 lowerdir · upperdir 와 copy-on-write 를 docker diff 로 관찰할 수 있다',
    'docker CLI → dockerd → containerd → shim → runc 로 이어지는 구조와 OCI 표준을 그릴 수 있다'
  ],
  chips: ['ps aux', 'docker top web', 'ip addr', 'ps aux | grep docker-proxy', 'sudo ls /var/lib/docker/volumes'],

  figs: {
    /* ---------------------------------------------------------------- 프로세스 트리 */
    proctree: {
      caption: '호스트에서 본 프로세스 나무 — 컨테이너의 nginx 는 containerd-shim 의 자식일 뿐인 평범한 리눅스 프로세스입니다',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="호스트 프로세스 트리: init, containerd, dockerd, shim, 컨테이너의 nginx">
  <rect x="10" y="10" width="840" height="320" rx="16" class="box"/>
  <text x="30" y="36" class="t-b">🖥️ 호스트 (docker-lab) — 커널은 하나</text>
  <rect x="30" y="54" width="170" height="44" rx="10" class="gray"/>
  <text x="115" y="76" class="t-sm t-c t-mono">PID 1 /sbin/init</text>
  <line x1="115" y1="98" x2="115" y2="120" class="ln"/>
  <line x1="115" y1="120" x2="600" y2="120" class="ln"/>
  <line x1="115" y1="120" x2="115" y2="140" class="ln ar"/>
  <line x1="340" y1="120" x2="340" y2="140" class="ln ar"/>
  <line x1="600" y1="120" x2="600" y2="140" class="ln ar"/>
  <rect x="30" y="144" width="170" height="44" rx="10" class="blue"/>
  <text x="115" y="166" class="t-sm t-c t-mono">889 dockerd</text>
  <rect x="255" y="144" width="170" height="44" rx="10" class="purple"/>
  <text x="340" y="166" class="t-sm t-c t-mono">612 containerd</text>
  <rect x="490" y="144" width="220" height="44" rx="10" class="teal"/>
  <text x="600" y="166" class="t-sm t-c t-mono">containerd-shim-runc-v2</text>
  <text x="115" y="206" class="t-xs t-c t-mu">docker-proxy (포트 게시)</text>
  <line x1="600" y1="188" x2="600" y2="220" class="ln-green ar-green"/>
  <rect x="450" y="224" width="380" height="94" rx="16" class="green"/>
  <rect x="440" y="214" width="400" height="112" rx="20" class="nofill ln-green dash"/>
  <text x="640" y="248" class="t-sm t-c t-b">📦 컨테이너 web (울타리 + 안경)</text>
  <text x="640" y="274" class="t-sm t-c t-mono">호스트 PID 28829 nginx -g daemon off;</text>
  <text x="640" y="300" class="t-xs t-c t-green">컨테이너 안에서는 자기가 PID 1 이라고 봄</text>
  <text x="60" y="260" class="t-sm">🔎 <tspan class="t-b">ps aux</tspan> 로 호스트에서</text>
  <text x="60" y="284" class="t-sm">컨테이너의 nginx 가</text>
  <text x="60" y="308" class="t-sm">그대로 보입니다</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 네임스페이스 */
    namespaces: {
      caption: '네임스페이스 = 프로세스가 쓰는 "안경". 같은 커널 위에 있어도 안경에 따라 보이는 프로세스 · 네트워크 · 파일 · 이름이 다릅니다',
      svg: `<svg class="dg" viewBox="0 0 860 380" role="img" aria-label="pid, net, mnt, uts, ipc, user 여섯 가지 네임스페이스와 두 컨테이너가 보는 세계">
  <rect x="10" y="300" width="840" height="66" rx="14" class="s-gray"/>
  <text x="430" y="326" class="t-c t-b tw">🐧 리눅스 커널 (하나를 모두가 공유)</text>
  <text x="430" y="350" class="t-xs t-c tw">프로세스 표 · 네트워크 스택 · 마운트 표 · 호스트명 · 사용자 번호를 네임스페이스별로 나눠서 보여 줌</text>

  <rect x="10" y="10" width="410" height="278" rx="16" class="green"/>
  <text x="215" y="38" class="t-b t-c t-green">📦 컨테이너 A 의 안경</text>
  <rect x="440" y="10" width="410" height="278" rx="16" class="teal"/>
  <text x="645" y="38" class="t-b t-c t-teal">📦 컨테이너 B 의 안경</text>

  <g>
  <rect x="26" y="54" width="120" height="68" rx="10" class="box"/><text x="86" y="78" class="t-sm t-c t-b t-mono">pid</text><text x="86" y="104" class="t-xs t-c">나만 PID 1</text>
  <rect x="152" y="54" width="120" height="68" rx="10" class="box"/><text x="212" y="78" class="t-sm t-c t-b t-mono">net</text><text x="212" y="104" class="t-xs t-c">172.17.0.2</text>
  <rect x="278" y="54" width="126" height="68" rx="10" class="box"/><text x="341" y="78" class="t-sm t-c t-b t-mono">mnt</text><text x="341" y="104" class="t-xs t-c">nginx 파일들</text>
  <rect x="26" y="134" width="120" height="68" rx="10" class="box"/><text x="86" y="158" class="t-sm t-c t-b t-mono">uts</text><text x="86" y="184" class="t-xs t-c">호스트명 a28f…</text>
  <rect x="152" y="134" width="120" height="68" rx="10" class="box"/><text x="212" y="158" class="t-sm t-c t-b t-mono">ipc</text><text x="212" y="184" class="t-xs t-c">공유 메모리</text>
  <rect x="278" y="134" width="126" height="68" rx="10" class="box"/><text x="341" y="158" class="t-sm t-c t-b t-mono">user</text><text x="341" y="184" class="t-xs t-c">UID 매핑(선택)</text>
  <text x="215" y="230" class="t-sm t-c">ps → nginx 만 보임</text>
  <text x="215" y="256" class="t-sm t-c">ls / → nginx 이미지의 파일</text>
  </g>

  <rect x="456" y="54" width="120" height="68" rx="10" class="box"/><text x="516" y="78" class="t-sm t-c t-b t-mono">pid</text><text x="516" y="104" class="t-xs t-c">나도 PID 1</text>
  <rect x="582" y="54" width="120" height="68" rx="10" class="box"/><text x="642" y="78" class="t-sm t-c t-b t-mono">net</text><text x="642" y="104" class="t-xs t-c">172.17.0.3</text>
  <rect x="708" y="54" width="126" height="68" rx="10" class="box"/><text x="771" y="78" class="t-sm t-c t-b t-mono">mnt</text><text x="771" y="104" class="t-xs t-c">alpine 파일들</text>
  <rect x="456" y="134" width="120" height="68" rx="10" class="box"/><text x="516" y="158" class="t-sm t-c t-b t-mono">uts</text><text x="516" y="184" class="t-xs t-c">호스트명 cda9…</text>
  <rect x="582" y="134" width="120" height="68" rx="10" class="box"/><text x="642" y="158" class="t-sm t-c t-b t-mono">ipc</text><text x="642" y="184" class="t-xs t-c">공유 메모리</text>
  <rect x="708" y="134" width="126" height="68" rx="10" class="box"/><text x="771" y="158" class="t-sm t-c t-b t-mono">user</text><text x="771" y="184" class="t-xs t-c">UID 매핑(선택)</text>
  <text x="645" y="230" class="t-sm t-c">ps → sleep 만 보임</text>
  <text x="645" y="256" class="t-sm t-c">ls / → alpine 이미지의 파일</text>

  <line x1="215" y1="288" x2="215" y2="300" class="ln"/>
  <line x1="645" y1="288" x2="645" y2="300" class="ln"/>
</svg>`
    },

    /* ---------------------------------------------------------------- cgroups */
    cgroups: {
      caption: 'cgroups = 자원 계량기와 차단기. 컨테이너마다 그룹이 만들어지고, docker run -m · --cpus 값이 그룹의 파일(memory.max, cpu.max)에 적힙니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="cgroup 계층과 컨테이너별 memory.max, cpu.max 파일">
  <rect x="300" y="14" width="260" height="50" rx="12" class="gray"/>
  <text x="430" y="44" class="t-sm t-c t-b t-mono">/sys/fs/cgroup (루트)</text>
  <line x1="430" y1="64" x2="430" y2="84" class="ln"/>
  <rect x="290" y="86" width="280" height="44" rx="10" class="blue"/>
  <text x="430" y="113" class="t-sm t-c t-mono">system.slice</text>
  <line x1="430" y1="130" x2="430" y2="146" class="ln"/>
  <line x1="150" y1="146" x2="710" y2="146" class="ln"/>
  <line x1="150" y1="146" x2="150" y2="164" class="ln ar"/>
  <line x1="430" y1="146" x2="430" y2="164" class="ln ar"/>
  <line x1="710" y1="146" x2="710" y2="164" class="ln ar"/>

  <rect x="20" y="168" width="260" height="146" rx="14" class="green"/>
  <text x="150" y="194" class="t-sm t-c t-b">docker-9d49….scope</text>
  <text x="150" y="214" class="t-xs t-c t-mu">컨테이너 limited (-m 128m --cpus 0.5)</text>
  <rect x="36" y="228" width="228" height="30" rx="6" class="box"/>
  <text x="150" y="243" class="t-xs t-c t-mono">memory.max = 134217728</text>
  <rect x="36" y="266" width="228" height="30" rx="6" class="box"/>
  <text x="150" y="281" class="t-xs t-c t-mono">cpu.max = 50000 100000</text>

  <rect x="300" y="168" width="260" height="146" rx="14" class="teal"/>
  <text x="430" y="194" class="t-sm t-c t-b">docker-cda9….scope</text>
  <text x="430" y="214" class="t-xs t-c t-mu">컨테이너 box (제한 없음)</text>
  <rect x="316" y="228" width="228" height="30" rx="6" class="box"/>
  <text x="430" y="243" class="t-xs t-c t-mono">memory.max = max</text>
  <rect x="316" y="266" width="228" height="30" rx="6" class="box"/>
  <text x="430" y="281" class="t-xs t-c t-mono">cpu.max = max 100000</text>

  <rect x="580" y="168" width="260" height="146" rx="14" class="orange"/>
  <text x="710" y="194" class="t-sm t-c t-b">docker.service</text>
  <text x="710" y="214" class="t-xs t-c t-mu">dockerd 자신</text>
  <text x="710" y="250" class="t-xs t-c">한도를 넘으면?</text>
  <text x="710" y="274" class="t-xs t-c">메모리 → OOM Killer (137)</text>
  <text x="710" y="296" class="t-xs t-c">CPU → 잠깐씩 멈춤(스로틀)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- overlay */
    overlay: {
      caption: 'overlay 파일 시스템 — 읽기 전용 이미지 층(lowerdir) 위에 컨테이너 전용 쓰기 층(upperdir)을 겹쳐 하나(merged)처럼 보여 줍니다',
      svg: `<svg class="dg" viewBox="0 0 860 400" role="img" aria-label="lowerdir 이미지 레이어, upperdir 컨테이너 층, merged 보기와 copy-on-write">
  <rect x="20" y="14" width="560" height="56" rx="12" class="s-green"/>
  <text x="300" y="38" class="t-c t-b tw">👀 merged — 컨테이너가 보는 / (합쳐진 모습)</text>
  <text x="300" y="58" class="t-xs t-c tw">index.html · cow.html · nginx.conf … (50x.html 은 안 보임)</text>
  <line x1="300" y1="72" x2="300" y2="92" class="ln-green ar2"/>

  <rect x="20" y="96" width="560" height="68" rx="12" class="orange"/>
  <text x="40" y="122" class="t-b t-orange">✏️ upperdir (컨테이너 쓰기 층)</text>
  <text x="40" y="148" class="t-xs t-mono">A cow.html   ·   D 50x.html(지움 표시, whiteout)   ·   C 수정한 파일 복사본</text>

  <rect x="20" y="180" width="560" height="50" rx="10" class="purple"/>
  <text x="40" y="210" class="t-sm">🔒 레이어 4 — COPY docker-entrypoint.sh …</text>
  <rect x="20" y="236" width="560" height="50" rx="10" class="purple"/>
  <text x="40" y="266" class="t-sm">🔒 레이어 3 — RUN groupadd nginx … (nginx 설치)</text>
  <rect x="20" y="292" width="560" height="50" rx="10" class="purple"/>
  <text x="40" y="322" class="t-sm">🔒 레이어 1 — debian 기본 파일</text>
  <text x="300" y="366" class="t-sm t-c t-purple t-b">lowerdir (이미지 레이어 — 읽기 전용, 여러 컨테이너가 공유)</text>

  <rect x="610" y="96" width="236" height="246" rx="14" class="box"/>
  <text x="728" y="124" class="t-b t-c">🐄 copy-on-write</text>
  <text x="728" y="156" class="t-xs t-c">① 읽기: 아래층에서 그대로</text>
  <text x="728" y="186" class="t-xs t-c">② 수정: 파일을 위층으로</text>
  <text x="728" y="206" class="t-xs t-c">복사한 뒤 복사본을 고침</text>
  <text x="728" y="236" class="t-xs t-c">③ 삭제: 위층에 "지움"</text>
  <text x="728" y="256" class="t-xs t-c">표시만 남김</text>
  <text x="728" y="290" class="t-xs t-c t-mu">컨테이너를 지우면</text>
  <text x="728" y="310" class="t-xs t-c t-mu">upperdir 만 사라짐</text>
  <line x1="582" y1="130" x2="608" y2="160" class="ln-orange dash"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 네트워크 속 */
    netinside: {
      caption: '브리지 네트워크의 속 — 컨테이너마다 veth 한 쌍(가상 랜선)이 docker0 브리지(가상 스위치)에 꽂히고, 포트 게시는 iptables NAT 규칙과 docker-proxy 가 처리합니다',
      svg: `<svg class="dg" viewBox="0 0 860 360" role="img" aria-label="veth pair, docker0 브리지, iptables NAT, docker-proxy 로 이어진 컨테이너 네트워크">
  <rect x="10" y="10" width="840" height="340" rx="16" class="box"/>
  <text x="30" y="36" class="t-b">🖥️ 호스트 네트워크 네임스페이스</text>
  <rect x="30" y="56" width="200" height="60" rx="12" class="blue"/>
  <text x="130" y="80" class="t-sm t-c t-b t-mono">eth0</text>
  <text x="130" y="102" class="t-xs t-c">192.168.65.3 (바깥과 연결)</text>
  <rect x="290" y="56" width="280" height="60" rx="12" class="orange"/>
  <text x="430" y="80" class="t-sm t-c t-b">iptables NAT · docker-proxy</text>
  <text x="430" y="102" class="t-xs t-c t-mono">:8080 → 172.17.0.2:80</text>
  <line x1="232" y1="86" x2="286" y2="86" class="ln-orange ar-orange moving"/>
  <rect x="200" y="160" width="460" height="50" rx="12" class="s-blue"/>
  <text x="430" y="190" class="t-c t-b tw t-mono">docker0 브리지 172.17.0.1 (가상 스위치)</text>
  <line x1="430" y1="118" x2="430" y2="156" class="ln-orange ar-orange"/>
  <line x1="300" y1="212" x2="230" y2="258" class="ln-teal thick"/>
  <line x1="560" y1="212" x2="630" y2="258" class="ln-teal thick"/>
  <text x="200" y="236" class="t-xs t-teal t-mono">veth1c61d30</text>
  <text x="590" y="236" class="t-xs t-teal t-mono">vethb87b70f</text>
  <rect x="60" y="258" width="300" height="80" rx="14" class="green"/>
  <rect x="50" y="248" width="320" height="96" rx="18" class="nofill ln-green dash"/>
  <text x="210" y="284" class="t-sm t-c t-b">📦 web — eth0@if23</text>
  <text x="210" y="310" class="t-xs t-c t-mono">172.17.0.2 · nginx :80</text>
  <rect x="500" y="258" width="300" height="80" rx="14" class="teal"/>
  <rect x="490" y="248" width="320" height="96" rx="18" class="nofill ln-teal dash"/>
  <text x="650" y="284" class="t-sm t-c t-b">📦 box — eth0@if23</text>
  <text x="650" y="310" class="t-xs t-c t-mono">172.17.0.3</text>
  <text x="700" y="80" class="t-xs t-c t-mu">점선 = 컨테이너의</text>
  <text x="700" y="100" class="t-xs t-c t-mu">네트워크 네임스페이스</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 구성 요소 */
    stack: {
      caption: 'docker run 한 줄이 지나가는 길 — CLI 는 요청만 보내고, 실제로 컨테이너를 만드는 것은 containerd 와 runc 입니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="docker CLI, dockerd, containerd, containerd-shim, runc, 컨테이너 프로세스로 이어지는 구조">
  <rect x="10" y="40" width="130" height="90" rx="12" class="gray"/>
  <text x="75" y="72" class="t-lg t-c">⌨️</text>
  <text x="75" y="100" class="t-sm t-c t-b t-mono">docker</text>
  <text x="75" y="118" class="t-xs t-c">CLI (클라이언트)</text>
  <line x1="142" y1="85" x2="170" y2="85" class="ln-blue ar-blue moving"/>
  <text x="156" y="152" class="t-xs t-c t-mu">REST API</text>
  <text x="156" y="168" class="t-xs t-c t-mu">docker.sock</text>
  <rect x="174" y="40" width="140" height="90" rx="12" class="blue"/>
  <text x="244" y="72" class="t-lg t-c">🐳</text>
  <text x="244" y="100" class="t-sm t-c t-b t-mono">dockerd</text>
  <text x="244" y="118" class="t-xs t-c">이미지 · 네트워크 · 볼륨</text>
  <line x1="316" y1="85" x2="344" y2="85" class="ln-purple ar-purple moving"/>
  <text x="330" y="152" class="t-xs t-c t-mu">gRPC</text>
  <rect x="348" y="40" width="140" height="90" rx="12" class="purple"/>
  <text x="418" y="72" class="t-lg t-c">📦</text>
  <text x="418" y="100" class="t-sm t-c t-b t-mono">containerd</text>
  <text x="418" y="118" class="t-xs t-c">컨테이너 생명주기</text>
  <line x1="490" y1="85" x2="518" y2="85" class="ln-teal ar-teal moving"/>
  <rect x="522" y="40" width="150" height="90" rx="12" class="teal"/>
  <text x="597" y="72" class="t-lg t-c">🧷</text>
  <text x="597" y="100" class="t-sm t-c t-b t-mono">shim</text>
  <text x="597" y="118" class="t-xs t-c">컨테이너마다 1개</text>
  <line x1="674" y1="85" x2="702" y2="85" class="ln-orange ar-orange moving"/>
  <rect x="706" y="40" width="164" height="90" rx="12" class="orange"/>
  <text x="788" y="72" class="t-lg t-c">⚙️</text>
  <text x="788" y="100" class="t-sm t-c t-b t-mono">runc</text>
  <text x="788" y="118" class="t-xs t-c">네임스페이스 · cgroup 설정</text>
  <line x1="788" y1="132" x2="788" y2="190" class="ln-green ar-green"/>
  <line x1="597" y1="132" x2="700" y2="200" class="ln-teal dash"/>
  <rect x="560" y="194" width="310" height="80" rx="14" class="green"/>
  <text x="715" y="224" class="t-sm t-c t-b">📦 컨테이너 프로세스 (nginx)</text>
  <text x="715" y="250" class="t-xs t-c">runc 는 시작시키고 빠짐 → shim 이 부모로 남음</text>
  <rect x="10" y="194" width="520" height="80" rx="14" class="box"/>
  <text x="270" y="222" class="t-sm t-c">💡 dockerd 를 재시작해도 shim 덕분에</text>
  <text x="270" y="248" class="t-sm t-c">컨테이너가 계속 살아 있을 수 있음 (live-restore)</text>
  <text x="440" y="24" class="t-b t-c">docker run nginx 가 지나가는 길</text>
</svg>`
    },

    /* ---------------------------------------------------------------- Desktop VM */
    desktopvm: {
      caption: '맥 · 윈도에는 리눅스 커널이 없으므로 Docker Desktop 은 작은 리눅스 VM 을 몰래 띄우고, 컨테이너는 그 VM 안에서 돕니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="리눅스 호스트, 맥, 윈도에서 Docker 가 동작하는 위치 비교">
  <rect x="10" y="14" width="260" height="300" rx="16" class="box"/>
  <text x="140" y="40" class="t-b t-c">🐧 리눅스 PC · 서버</text>
  <rect x="30" y="60" width="220" height="120" rx="12" class="green"/>
  <text x="140" y="90" class="t-sm t-c t-b">📦 📦 📦 컨테이너</text>
  <text x="140" y="120" class="t-xs t-c">dockerd · containerd</text>
  <text x="140" y="146" class="t-xs t-c t-mu">바로 호스트 커널 사용</text>
  <rect x="30" y="196" width="220" height="50" rx="10" class="s-gray"/>
  <text x="140" y="222" class="t-sm t-c t-b tw">리눅스 커널</text>
  <rect x="30" y="256" width="220" height="44" rx="10" class="gray"/>
  <text x="140" y="279" class="t-sm t-c">하드웨어</text>

  <rect x="290" y="14" width="270" height="300" rx="16" class="box"/>
  <text x="425" y="40" class="t-b t-c">🍎 macOS (Docker Desktop)</text>
  <rect x="306" y="56" width="238" height="140" rx="14" class="nofill ln-purple dash"/>
  <text x="425" y="76" class="t-xs t-c t-purple t-b">리눅스 VM (Apple 가상화)</text>
  <rect x="320" y="86" width="210" height="60" rx="10" class="green"/>
  <text x="425" y="112" class="t-sm t-c t-b">📦 📦 컨테이너</text>
  <text x="425" y="132" class="t-xs t-c">dockerd</text>
  <rect x="320" y="152" width="210" height="34" rx="8" class="s-gray"/>
  <text x="425" y="170" class="t-xs t-c tw">리눅스 커널 (linuxkit)</text>
  <rect x="306" y="206" width="238" height="44" rx="10" class="blue"/>
  <text x="425" y="229" class="t-sm t-c">macOS 커널 + docker CLI</text>
  <rect x="306" y="258" width="238" height="44" rx="10" class="gray"/>
  <text x="425" y="281" class="t-sm t-c">하드웨어 (Apple 칩 · 인텔)</text>

  <rect x="580" y="14" width="270" height="300" rx="16" class="box"/>
  <text x="715" y="40" class="t-b t-c">🪟 Windows (Docker Desktop)</text>
  <rect x="596" y="56" width="238" height="140" rx="14" class="nofill ln-teal dash"/>
  <text x="715" y="76" class="t-xs t-c t-teal t-b">WSL2 가벼운 리눅스 VM</text>
  <rect x="610" y="86" width="210" height="60" rx="10" class="green"/>
  <text x="715" y="112" class="t-sm t-c t-b">📦 📦 컨테이너</text>
  <text x="715" y="132" class="t-xs t-c">dockerd</text>
  <rect x="610" y="152" width="210" height="34" rx="8" class="s-gray"/>
  <text x="715" y="170" class="t-xs t-c tw">리눅스 커널 (WSL2)</text>
  <rect x="596" y="206" width="238" height="44" rx="10" class="blue"/>
  <text x="715" y="229" class="t-sm t-c">Windows + docker CLI</text>
  <rect x="596" y="258" width="238" height="44" rx="10" class="gray"/>
  <text x="715" y="281" class="t-sm t-c">하드웨어 · Hyper-V</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '컨테이너는 결국 프로세스다',
      html: `
<p>0장에서 "컨테이너는 가상 머신보다 가볍다"고 배웠습니다. 왜 가벼울까요? 답은 간단합니다.
<b>컨테이너는 따로 운영체제를 띄우는 것이 아니라, 호스트 위에서 도는 평범한 프로세스</b>이기 때문입니다.
다만 특별한 <b>안경(네임스페이스)</b> 을 쓰고, <b>울타리(cgroups)</b> 안에 들어가 있을 뿐이죠.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 공유 오피스의 칸막이 방</div>
한 건물(커널) 안에 칸막이 방(컨테이너)이 여러 개 있습니다. 방 안 사람은 창문에 불투명 필름(네임스페이스)이 붙어 있어 옆방이 안 보이고,
방마다 전기 차단기(cgroups)가 있어 전기를 너무 많이 쓰면 그 방만 차단됩니다. 하지만 <b>건물 관리인(호스트 root)</b> 은 모든 방을 다 볼 수 있습니다.
</div>

<p>정말 그런지 호스트에서 확인해 봅시다. nginx 컨테이너를 띄우고, 호스트의 프로세스 목록을 봅니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web -p 8080:80 nginx
ps aux
docker top web
docker inspect -f '{{.State.Pid}}' web</code></pre>

<pre class="code out" data-lang="출력"><code>USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1  10037  3013 ?        Ssl  03:19   0:00 /sbin/init
root         612  0.0  0.1  32644 10956 ?        Ssl  03:19   0:00 /usr/bin/containerd
root         889  0.0  0.1  42893  5557 ?        Ssl  03:19   0:00 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
root       28809  0.0  0.1  85933  8517 ?        Ssl  03:19   0:00 /usr/bin/containerd-shim-runc-v2 -namespace moby -id a28fc35e5e61… -address /run/containerd/containerd.sock
<span class="hl">root       28829  0.0  0.1  86673  8777 ?        Ssl  03:19   0:00 nginx -g daemon off;</span>
root       28789  0.0  0.1  85193  8257 ?        Ssl  03:19   0:00 /usr/bin/docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port 8080 -container-ip 172.17.0.2 -container-port 80
student     2210  0.0  0.1  91770  4730 ?        Ssl  03:19   0:00 -bash
…
UID        PID     PPID    C   STIME   TTY   TIME       CMD
root       28829   28809   0   03:19   ?     00:00:00   nginx -g daemon off;
message+   28880   28829   0   03:19   ?     00:00:00   nginx: worker process
28829</code></pre>

<p>호스트의 <code>ps aux</code> 에 컨테이너의 <code>nginx -g daemon off;</code> 가 <b>그대로</b> 보입니다. <code>docker top</code> 이 보여 주는 PID 와
<code>docker inspect</code> 의 <code>State.Pid</code> 도 같은 번호(여기서는 28829)입니다. 부모(PPID)는 <code>containerd-shim-runc-v2</code> 네요.</p>

{{fig:proctree}}

<h4>컨테이너 안에서는 내가 PID 1</h4>
<p>이번에는 컨테이너 <b>안</b>에서 봅시다. alpine 컨테이너에 들어가 <code>ps</code> 를 실행하면 호스트의 수많은 프로세스는 하나도 보이지 않고,
<code>sleep 3600</code> 이 <b>PID 1</b> 로 보입니다. (<code>exit</code> 로 빠져나오세요)</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name box alpine sleep 3600
docker exec -it box sh</code></pre>

<pre class="code out" data-lang="출력 (box 안에서 ps)"><code>/ # ps
PID   USER     TIME  COMMAND
    1 root      0:00 sleep 3600
   40 root      0:00 sh
   90 root      0:00 ps
/ # exit</code></pre>

<div class="box note"><div class="box-t">📌 PID 1 이 특별한 이유</div>
리눅스에서 PID 1 은 "모든 프로세스의 조상"이라 특별 대우를 받습니다. 기본 신호 처리가 없어서 <code>SIGTERM</code> 을 직접 처리하지 않는 프로그램은
<code>docker stop</code> 에 반응하지 않고 10초 뒤 강제 종료(137)되기도 하고, 자식 좀비 프로세스를 거두는 일도 PID 1 의 몫입니다.
그래서 <code>docker run --init</code>(작은 init 인 tini 를 PID 1 로)을 쓰기도 합니다.
</div>`
    },

    /* ================================================================ 2 */
    {
      title: '리눅스 네임스페이스 — 무엇을 보여 줄지 정하는 안경',
      html: `
<p><b>네임스페이스(namespace)</b> 는 커널의 자원(프로세스 표, 네트워크, 마운트 목록 …)을 <b>따로따로 보이게</b> 나누는 리눅스 기능입니다.
Docker 는 컨테이너를 만들 때마다 새 네임스페이스 세트를 만들어 프로세스에게 씌웁니다.</p>

{{fig:namespaces}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>네임스페이스</th><th>나누는 것</th><th>컨테이너에서 보이는 모습</th><th>확인 명령</th></tr>
<tr><td><code>pid</code></td><td>프로세스 번호</td><td>내 프로세스만 보이고 내가 PID 1</td><td><code>ps</code></td></tr>
<tr><td><code>net</code></td><td>네트워크 장치 · IP · 포트 · 라우팅</td><td>나만의 eth0 와 IP, 포트 80 을 다른 컨테이너와 겹쳐 써도 됨</td><td><code>ip addr</code></td></tr>
<tr><td><code>mnt</code></td><td>마운트(파일 시스템) 목록</td><td>/ 가 이미지의 파일로 보임</td><td><code>mount</code>, <code>ls /</code></td></tr>
<tr><td><code>uts</code></td><td>호스트 이름</td><td>컨테이너 ID 앞 12자리가 호스트명</td><td><code>hostname</code></td></tr>
<tr><td><code>ipc</code></td><td>공유 메모리 · 메시지 큐</td><td>다른 컨테이너의 공유 메모리에 접근 불가</td><td><code>ipcs</code></td></tr>
<tr><td><code>user</code></td><td>사용자 · 그룹 번호(UID/GID)</td><td>컨테이너 root 를 호스트의 일반 UID 로 매핑 (rootless · userns-remap 에서 사용)</td><td><code>id</code></td></tr>
</table></div>
<p class="muted small">이 밖에 cgroup 트리를 가리는 <code>cgroup</code> 네임스페이스, 시계를 나누는 <code>time</code> 네임스페이스도 있습니다.</p>

<h4>uts · net 네임스페이스 관찰하기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>hostname
docker exec box hostname
docker run --rm --hostname container-a alpine hostname
docker exec box ip addr</code></pre>

<pre class="code out" data-lang="출력"><code>docker-lab
cda986a2eebf
container-a
1: lo: &lt;LOOPBACK,UP,LOWER_UP&gt; mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
22: eth0@if23: &lt;BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN&gt; mtu 1500 qdisc noqueue state UP
    link/ether 02:42:c8:0e:dd:c0 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.3/16 brd 172.17.0.255 scope global eth0
       valid_lft forever preferred_lft forever</code></pre>

<p>호스트 이름은 <code>docker-lab</code> 인데 컨테이너는 자기 ID 를 이름으로 씁니다(uts). <code>--hostname</code> 으로 바꿀 수도 있죠.
컨테이너 안에는 호스트의 <code>docker0</code> 나 <code>eth0</code>(192.168.65.3)가 없고, 자기만의 <code>eth0</code>(172.17.0.3)만 있습니다(net).</p>

<div class="box tip"><div class="box-t">💡 안경을 벗을 수도 있다</div>
<code>--network host</code> 는 net 네임스페이스를 새로 만들지 않고 호스트 것을 그대로 쓰고, <code>--pid host</code> 는 호스트의 프로세스를 모두 보게 합니다.
디버깅 도구 컨테이너에서 가끔 쓰지만, 격리를 일부러 푸는 것이므로 보안상 주의가 필요합니다(13장).
</div>

<div class="box dev"><div class="box-t">👩‍💻 Docker 없이 네임스페이스 체험 (실제 리눅스에서)</div>
리눅스의 <code>unshare</code> 명령으로 Docker 없이도 네임스페이스를 만들 수 있습니다. 컨테이너가 "마법"이 아니라 커널 기능의 조합이라는 것을 느낄 수 있어요.
<pre class="code" data-lang="bash"><code>sudo unshare --pid --fork --mount-proc --uts sh
hostname my-box   # 새 uts 네임스페이스 안에서만 바뀜
ps aux            # 내가 PID 1</code></pre>
</div>`
    },

    /* ================================================================ 3 */
    {
      title: 'cgroups — 자원을 재고 제한하는 울타리',
      html: `
<p>네임스페이스가 "무엇이 보이는가"라면, <b>cgroups(control groups)</b> 는 "얼마나 쓸 수 있는가"입니다.
프로세스 묶음마다 메모리 · CPU · 프로세스 수 · 디스크 I/O 를 <b>재고(계량)</b> 하고 <b>제한(차단)</b> 합니다. <code>docker stats</code> 의 숫자도 cgroups 에서 옵니다.</p>

{{fig:cgroups}}

<p>8장에서 배운 <code>-m</code>, <code>--cpus</code> 가 실제로 어디에 적히는지 컨테이너 안에서 파일로 확인해 봅시다.
cgroup v2 에서는 컨테이너 안의 <code>/sys/fs/cgroup/</code> 에 자기 그룹의 설정 파일이 보입니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name limited -m 128m --cpus 0.5 nginx:alpine
docker exec limited cat /sys/fs/cgroup/memory.max
docker exec limited cat /sys/fs/cgroup/cpu.max
docker exec limited cat /sys/fs/cgroup/memory.current
docker exec box cat /sys/fs/cgroup/memory.max
docker stats --no-stream limited</code></pre>

<pre class="code out" data-lang="출력"><code>134217728
50000 100000
7340032
max
CONTAINER ID   NAME      CPU %   MEM USAGE / LIMIT   MEM %   NET I/O           BLOCK I/O   PIDS
9d498f981d02   limited   0.46%   7.21MiB / 128MiB    5.63%   3.24kB / 1.66kB   0B / 0B     9</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>파일</th><th>값</th><th>뜻</th></tr>
<tr><td><code>memory.max</code></td><td>134217728</td><td>128 × 1024 × 1024 바이트 = 128MiB 까지. 넘으면 OOM Killer 가 프로세스를 죽임 (종료 코드 137)</td></tr>
<tr><td><code>cpu.max</code></td><td>50000 100000</td><td>100,000µs(0.1초)마다 50,000µs 만 CPU 사용 = CPU 0.5개</td></tr>
<tr><td><code>memory.current</code></td><td>7340032</td><td>지금 쓰고 있는 메모리(약 7MiB)</td></tr>
<tr><td><code>memory.max</code> (box)</td><td>max</td><td>제한 없음 — 호스트 메모리를 다 쓸 수도 있음</td></tr>
</table></div>

<div class="box warn"><div class="box-t">⚠️ free · top 은 속는다</div>
컨테이너 안에서 <code>free</code> 나 <code>/proc/meminfo</code> 를 보면 <b>호스트 전체 메모리</b>가 나옵니다(네임스페이스로 가려지지 않는 부분).
그래서 옛날 Java · Node 처럼 "메모리가 8GB 나 있네?" 하고 과하게 쓰다가 OOM 으로 죽는 일이 있었습니다. 진짜 한도는 <code>memory.max</code> 를 보세요.
최신 런타임은 cgroup 한도를 읽어서 스스로 맞춥니다.
</div>

<div class="box analogy"><div class="box-t">🍳 비유 — 방마다 달린 전기 차단기</div>
공유 오피스의 방마다 차단기가 달려 있어, 한 방이 전기난로를 여러 개 켜면 <b>그 방 전기만</b> 내려갑니다(OOM).
CPU 는 차단기보다는 "수도꼭지 조절"에 가까워서, 한도를 넘으면 죽이지 않고 물을 가늘게(스로틀링) 만듭니다.
</div>`
    },

    /* ================================================================ 4 */
    {
      title: '유니온 파일 시스템 — overlay 와 copy-on-write',
      html: `
<p>같은 nginx 이미지로 컨테이너를 100개 띄워도 디스크가 100배로 늘지 않습니다. 비밀은 <b>overlay(OverlayFS)</b> 라는 유니온 파일 시스템입니다.
여러 폴더를 <b>투명 필름처럼 겹쳐서</b> 하나의 폴더로 보이게 하죠.</p>

{{fig:overlay}}

<div class="layers">
<div class="ly green"><b>merged</b><span>컨테이너가 보는 / — 아래 층들을 합친 모습</span><em>보기 전용</em></div>
<div class="ly orange"><b>upperdir</b><span>컨테이너 전용 쓰기 층. 추가 · 수정 · 삭제 기록이 모두 여기에</span><em>컨테이너마다 1개</em></div>
<div class="ly purple"><b>lowerdir</b><span>이미지 레이어들 (읽기 전용) — 같은 이미지를 쓰는 컨테이너가 모두 공유</span><em>docker history 의 층</em></div>
</div>

<p>컨테이너 안에서 <code>mount</code> 를 실행하면 루트(/)가 정말 overlay 로 마운트되어 있는 것이 보입니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker exec box sh -c mount</code></pre>

<pre class="code out" data-lang="출력"><code><span class="hl">overlay on / type overlay</span> (rw,relatime,<span class="hl">lowerdir</span>=/var/lib/docker/overlay2/l/1340D3BF7FD7AF38D31A722B2D,<span class="hl">upperdir</span>=/var/lib/docker/overlay2/cda986a2eebf…/diff,<span class="hl">workdir</span>=/var/lib/docker/overlay2/cda986a2eebf…/work)
proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)
tmpfs on /dev type tmpfs (rw,nosuid,size=65536k,mode=755)</code></pre>

<h4>copy-on-write 관찰하기 — docker diff</h4>
<p>컨테이너에서 파일을 하나 만들고 하나 지운 뒤, <code>docker diff</code> 로 upperdir 에 무엇이 기록되었는지 봅시다.
<code>A</code> 는 추가(Added), <code>C</code> 는 변경(Changed), <code>D</code> 는 삭제(Deleted) 입니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker exec web sh -c 'echo hi > /usr/share/nginx/html/cow.html'
docker exec web rm /usr/share/nginx/html/50x.html
docker diff web</code></pre>

<pre class="code out" data-lang="출력"><code>C /usr
C /usr/share
C /usr/share/nginx
C /usr/share/nginx/html
D /usr/share/nginx/html/50x.html
A /usr/share/nginx/html/cow.html</code></pre>

<p>재미있는 점은 <code>50x.html</code> 을 "지웠지만" 이미지 레이어(lowerdir)에서는 <b>사라지지 않았다</b>는 것입니다. 읽기 전용이니까요.
upperdir 에 "이 파일은 없는 것으로 쳐라"는 표시(<b>whiteout</b>)만 남깁니다. 그래서 새 컨테이너를 만들면 50x.html 은 멀쩡히 다시 있습니다.</p>

<div class="box tip"><div class="box-t">💡 이 원리에서 나오는 실무 규칙</div>
<ul>
<li>Dockerfile 에서 <code>RUN apt-get install</code> 과 <code>RUN rm -rf /var/lib/apt/lists/*</code> 를 <b>다른 줄</b>에 쓰면, 아래 층에 파일이 그대로 남아 이미지가 줄지 않습니다 → 같은 <code>RUN</code> 에서 지우기.</li>
<li>컨테이너 쓰기 층은 컨테이너와 함께 사라지고 느리므로, DB 데이터처럼 중요한 것은 <b>볼륨</b>에 둡니다(5장).</li>
<li>큰 파일을 조금만 고쳐도 파일 <b>전체</b>가 위층으로 복사됩니다 — 컨테이너 안에서 큰 파일을 자주 고치지 마세요.</li>
</ul>
</div>

<p class="muted small">참고: <code>docker info</code> 의 Storage Driver 는 환경에 따라 <code>overlay2</code>(전통적인 드라이버) 또는 <code>overlayfs</code>(containerd 이미지 저장소 사용 시)로 표시됩니다. 둘 다 같은 OverlayFS 원리입니다.</p>`
    },

    /* ================================================================ 5 */
    {
      title: '네트워크의 속 — veth · docker0 · NAT',
      html: `
<p>4장에서 <code>-p 8080:80</code> 을 쓰면 "내 PC 8080 → 컨테이너 80" 으로 연결된다고 배웠습니다. 그 연결은 누가 만들까요?</p>

{{fig:netinside}}

<ol class="steps-list">
<li><b>veth pair</b> — 양 끝이 이어진 <b>가상 랜선</b>. 한쪽 끝은 컨테이너의 net 네임스페이스 안에서 <code>eth0</code> 가 되고, 다른 끝은 호스트에 <code>vethXXXX</code> 로 남습니다.</li>
<li><b>docker0 브리지</b> — 호스트의 <b>가상 스위치</b>. 모든 veth 호스트 쪽 끝이 여기에 꽂혀서 컨테이너끼리 통신합니다. 주소는 172.17.0.1(게이트웨이).</li>
<li><b>iptables NAT</b> — 컨테이너가 인터넷으로 나갈 때 호스트 IP 로 바꿔 주고(MASQUERADE), 들어오는 8080 을 172.17.0.2:80 으로 돌려 줍니다(DNAT).</li>
<li><b>docker-proxy</b> — localhost 로 들어오는 등 NAT 규칙이 못 잡는 경우를 처리하는 작은 중계 프로세스.</li>
</ol>

<pre class="code" data-lang="bash" data-run="sh"><code>ip addr
ps aux | grep docker-proxy</code></pre>

<pre class="code out" data-lang="출력"><code>1: lo: &lt;LOOPBACK,UP,LOWER_UP&gt; mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
2: eth0: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc mq state UP group default qlen 1000
    inet 192.168.65.3/24 brd 192.168.65.255 scope global eth0
3: <span class="hl">docker0</span>: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:78:c7:5e:c7 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
4: <span class="hl">veth1c61d30@if24</span>: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue <span class="hl">master docker0</span> state UP group default
5: vethb87b70f@if25: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue master docker0 state UP group default
6: veth6fa7b08@if26: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue master docker0 state UP group default
root       28789  0.0  0.1  85193  8257 ?        Ssl  03:19   0:00 /usr/bin/docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port 8080 -container-ip 172.17.0.2 -container-port 80</code></pre>

<p>실행 중인 컨테이너 수만큼 <code>veth…</code> 가 있고, 모두 <code>master docker0</code>(docker0 에 꽂힘)입니다.
사용자 정의 네트워크를 만들면 <code>docker0</code> 대신 <code>br-네트워크ID</code> 라는 브리지가 하나 더 생깁니다.</p>

<div class="box note"><div class="box-t">📌 실제 서버에서 NAT 규칙 보기</div>
실제 리눅스 호스트에서는 아래 명령으로 Docker 가 만든 NAT 규칙을 볼 수 있습니다. (이 실습 터미널은 iptables 를 흉내 내지 않습니다)
<pre class="code" data-lang="bash"><code>sudo iptables -t nat -L DOCKER -n
# Chain DOCKER (2 references)
# target  prot opt source     destination
# DNAT    tcp  --  0.0.0.0/0  0.0.0.0/0    tcp dpt:8080 to:172.17.0.2:80</code></pre>
</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'docker run 한 줄이 지나가는 길 — CLI · dockerd · containerd · runc',
      html: `
<p>우리가 입력하는 <code>docker</code> 는 사실 <b>리모컨</b>입니다. 실제 일은 여러 프로그램이 이어달리기로 합니다.</p>

{{fig:stack}}

<div class="flow">
<div class="fb gray"><span class="fi">⌨️</span><b>docker CLI</b>명령을 REST API 요청으로 바꿔 /var/run/docker.sock 으로 전송</div>
<div class="fb blue"><span class="fi">🐳</span><b>dockerd</b>이미지 · 네트워크 · 볼륨 · 빌드 관리, 요청을 containerd 에 전달</div>
<div class="fb purple"><span class="fi">📦</span><b>containerd</b>이미지 풀 · 스냅샷 준비, 컨테이너 생명주기</div>
<div class="fb teal"><span class="fi">🧷</span><b>containerd-shim</b>컨테이너마다 하나, 입출력 · 종료 코드 보관</div>
<div class="fb orange"><span class="fi">⚙️</span><b>runc</b>네임스페이스 · cgroup 을 만들고 프로세스 실행 후 퇴장</div>
</div>

<p>앞에서 본 <code>ps aux</code> 출력에 이 구성 요소가 모두 있었습니다: <code>/usr/bin/dockerd</code>, <code>/usr/bin/containerd</code>, <code>containerd-shim-runc-v2</code>.
각 부품의 버전은 <code>docker version</code> 으로 볼 수 있습니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker version</code></pre>

<pre class="code out" data-lang="출력 (일부)"><code>Client:
 Version:           27.4.0
 API version:       1.47
…
Server: Docker Engine - Community
 Engine:
  Version:          27.4.0
  API version:      1.47 (minimum version 1.24)
 containerd:
  Version:          1.7.24
 runc:
  Version:          1.2.2
 docker-init:
  Version:          0.19.0</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>구성 요소</th><th>한 줄 역할</th><th>비유</th></tr>
<tr><td>docker CLI</td><td>사람의 명령을 API 로</td><td>📱 주문 앱</td></tr>
<tr><td>dockerd</td><td>Docker 의 모든 기능을 가진 관리자</td><td>🏢 본사</td></tr>
<tr><td>containerd</td><td>컨테이너 실행 전문 관리자 (쿠버네티스도 직접 사용)</td><td>🏭 공장장</td></tr>
<tr><td>containerd-shim</td><td>컨테이너 곁을 지키는 보호자</td><td>👷 현장 반장</td></tr>
<tr><td>runc</td><td>커널에 "울타리 치고 안경 씌워 실행해" 요청</td><td>🔧 설치 기사 (설치 후 떠남)</td></tr>
</table></div>

<div class="box dev"><div class="box-t">👩‍💻 이 구조가 주는 이점</div>
① shim 이 컨테이너의 부모로 남기 때문에, 설정(<code>"live-restore": true</code>)에 따라 <b>dockerd 를 업그레이드 · 재시작해도 컨테이너가 계속 돌 수 있습니다.</b>
② 쿠버네티스는 dockerd 없이 <b>containerd 를 바로</b> 사용합니다(15장). Docker 로 만든 이미지가 쿠버네티스에서 그대로 도는 이유죠.
③ runc 자리에 gVisor(runsc) · Kata Containers 같은 더 강하게 격리하는 런타임을 끼울 수도 있습니다.
</div>`
    },

    /* ================================================================ 7 */
    {
      title: 'OCI 표준 — 누구나 같은 규칙으로',
      html: `
<p>Docker 가 인기를 끌자 여러 회사가 각자 컨테이너 형식을 만들 위험이 생겼습니다. 그래서 2015년 Docker 와 여러 기업이 모여
<b>OCI(Open Container Initiative)</b> 를 만들고 컨테이너의 공통 규칙을 정했습니다. 덕분에 "Docker 로 만든 이미지"가 Podman · 쿠버네티스 · 클라우드 어디서나 돕니다.</p>

<div class="cards c3">
<div class="card purple"><div class="ci">🧱</div><b>Image Spec</b><p>이미지의 모양 — 레이어(tar) 묶음 + 설정(JSON) + 목차(manifest). <code>docker build</code> 의 결과물 형식.</p></div>
<div class="card orange"><div class="ci">⚙️</div><b>Runtime Spec</b><p>컨테이너 실행 방법 — 루트 폴더 + <code>config.json</code>(네임스페이스 · cgroup · 마운트). runc 가 대표 구현.</p></div>
<div class="card teal"><div class="ci">🚚</div><b>Distribution Spec</b><p>레지스트리와 주고받는 HTTP API — push · pull 규칙. Docker Hub · GHCR · registry:2 가 모두 따름.</p></div>
</div>

<div class="flow">
<div class="fb blue"><span class="fi">📝</span><b>Dockerfile</b>빌드 도구는 자유 (BuildKit, Buildah, Kaniko)</div>
<div class="fb purple"><span class="fi">🧱</span><b>OCI 이미지</b>Image Spec</div>
<div class="fb teal"><span class="fi">🏪</span><b>레지스트리</b>Distribution Spec</div>
<div class="fb orange"><span class="fi">⚙️</span><b>OCI 런타임</b>Runtime Spec (runc, crun, gVisor)</div>
</div>

<div class="box analogy"><div class="box-t">🍳 비유 — 선적 컨테이너의 국제 규격</div>
실제 바다의 선적 컨테이너도 크기와 고리 위치가 국제 표준이라서, 어느 나라 배 · 트럭 · 크레인이든 옮길 수 있습니다.
OCI 는 소프트웨어 컨테이너의 "국제 규격"입니다.
</div>

<pre class="code" data-lang="bash" data-run="sh"><code>docker history nginx</code></pre>
<p>위 명령이 보여 주는 각 줄이 Image Spec 의 레이어입니다. 레지스트리에서 받을 때(<code>Pulling fs layer</code>) 레이어 단위로 오가는 것이 Distribution Spec 이고요.</p>`
    },

    /* ================================================================ 8 */
    {
      title: '가상 머신 · 컨테이너 · Docker Desktop 의 관계',
      html: `
<p>컨테이너는 <b>호스트의 리눅스 커널</b>을 공유합니다. 그러면 리눅스 커널이 없는 맥이나 윈도에서는 어떻게 리눅스 컨테이너가 돌까요?
답: <b>Docker Desktop 이 보이지 않는 작은 리눅스 VM 을 띄웁니다.</b></p>

{{fig:desktopvm}}

<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>리눅스 서버</th><th>macOS</th><th>Windows</th></tr>
<tr><td>컨테이너가 도는 곳</td><td>호스트 커널 바로 위</td><td>Docker Desktop 의 리눅스 VM</td><td>WSL2 리눅스 VM</td></tr>
<tr><td>dockerd 위치</td><td>호스트</td><td>VM 안</td><td>WSL2 안 (docker-desktop 배포판)</td></tr>
<tr><td>docker CLI 위치</td><td>호스트</td><td>macOS (소켓으로 VM 에 연결)</td><td>Windows 또는 WSL 배포판</td></tr>
<tr><td>호스트에서 <code>ps</code> 로 컨테이너 보임?</td><td>✅ 보임</td><td>❌ VM 안에 있어서 안 보임</td><td>❌ (WSL2 VM 안)</td></tr>
<tr><td>바인드 마운트 속도</td><td>빠름</td><td>파일 공유 계층을 거쳐 상대적으로 느림</td><td>WSL 파일 시스템 안에 두면 빠름</td></tr>
</table></div>

<p>이 실습 터미널의 <code>docker info</code> 에도 힌트가 있습니다. 커널 버전의 <code>linuxkit</code> 은 Docker Desktop VM 이 쓰는 리눅스 배포판 이름입니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker info</code></pre>
<pre class="code out" data-lang="출력 (일부)"><code> Storage Driver: overlayfs
 Cgroup Driver: systemd
 Cgroup Version: 2
 Default Runtime: runc
 Kernel Version: 6.10.14-linuxkit
 Docker Root Dir: /var/lib/docker</code></pre>

{{widget:vmcompare}}

<div class="box note"><div class="box-t">📌 그럼 윈도 컨테이너는?</div>
Windows 에는 윈도 커널을 공유하는 <b>Windows 컨테이너</b>도 따로 있습니다. 하지만 리눅스 컨테이너와 이미지가 호환되지 않고 쓰임이 훨씬 적습니다.
이 강좌의 모든 내용은 리눅스 컨테이너 기준입니다. Apple 칩(arm64) 맥에서는 amd64 이미지를 에뮬레이션으로 돌리기 때문에 느릴 수 있습니다(11장 멀티 플랫폼).
</div>`
    },

    /* ================================================================ 9 */
    {
      title: '볼륨은 실제로 어디에 저장될까?',
      html: `
<p>5장에서 만든 볼륨은 "Docker 가 관리하는 어딘가"에 있다고 했습니다. 그 어딘가는 바로 <b><code>/var/lib/docker/volumes/볼륨이름/_data</code></b> 입니다.
root 만 볼 수 있는 폴더라 <code>sudo</code> 가 필요합니다.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker volume create notes
docker run --rm -v notes:/data alpine sh -c 'echo hello > /data/memo.txt'
sudo ls /var/lib/docker
sudo ls /var/lib/docker/volumes
sudo cat /var/lib/docker/volumes/notes/_data/memo.txt
docker volume inspect notes</code></pre>

<pre class="code out" data-lang="출력"><code>buildkit  containers  image  network  overlay2  volumes
metadata.db  notes
hello
[
    {
        "CreatedAt": "…",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/notes/_data",
        "Name": "notes",
        "Options": null,
        "Scope": "local"
    }
]</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>/var/lib/docker 안의 폴더</th><th>들어 있는 것</th></tr>
<tr><td><code>overlay2/</code></td><td>이미지 레이어(lowerdir)와 컨테이너 쓰기 층(upperdir · diff)</td></tr>
<tr><td><code>image/</code></td><td>이미지 목록 · 레이어 메타데이터</td></tr>
<tr><td><code>containers/</code></td><td>컨테이너 설정 · 로그(<code>*-json.log</code>) · hostname · hosts 파일</td></tr>
<tr><td><code>volumes/</code></td><td>이름 있는 볼륨의 실제 데이터 (<code>_data</code>)</td></tr>
<tr><td><code>network/</code></td><td>네트워크 설정</td></tr>
<tr><td><code>buildkit/</code></td><td>빌드 캐시</td></tr>
</table></div>

<div class="box warn"><div class="box-t">⚠️ 이 폴더는 직접 고치지 마세요</div>
구조를 이해하려고 <b>들여다보는 것</b>은 좋지만, 안의 파일을 손으로 지우거나 옮기면 Docker 의 기록과 어긋나 고장 납니다.
정리는 <code>docker system prune</code>, <code>docker volume rm</code> 처럼 Docker 명령으로 하세요.
맥 · 윈도의 Docker Desktop 이라면 이 폴더는 <b>VM 안</b>에 있어서 탐색기 · Finder 로는 보이지 않습니다.
</div>

<div class="box practice"><div class="box-t">🧪 정리 — 컨테이너를 이루는 네 가지</div>
<b>프로세스</b>(runc 가 실행) + <b>네임스페이스</b>(보이는 세계) + <b>cgroups</b>(쓸 수 있는 양) + <b>overlay 파일 시스템</b>(보이는 파일)
= 우리가 "컨테이너"라고 부르는 것. 여기에 veth · 브리지 네트워크와 볼륨이 붙습니다.
</div>

{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: '호스트에서 컨테이너 프로세스 찾기',
      desc: 'nginx 를 <code>web</code> 이라는 이름으로 8080 포트에 띄운 뒤, 호스트에서 <code>ps aux</code> 로 nginx 프로세스를 찾고 <code>docker top web</code> 으로 같은 PID 인지 비교해 보세요.',
      hint: '<code>docker run -d --name web -p 8080:80 nginx</code> → <code>ps aux | grep nginx</code> → <code>docker top web</code>',
      answer: ['docker run -d --name web -p 8080:80 nginx', 'ps aux | grep nginx', 'docker top web'],
      check: M => M.running('web') && M.ran(/^(sudo\s+)?ps\s+(aux|-ef|-e)/) && M.ran(/docker\s+(container\s+)?top\s+web/)
    },
    {
      id: 'm2',
      title: 'uts 네임스페이스 — 호스트 이름이 다른 컨테이너',
      desc: 'alpine 으로 <code>ns1</code> 이라는 컨테이너를 <code>sleep 3600</code> 으로 띄우되, 호스트 이름을 <code>container-a</code> 로 지정하세요. <code>docker exec ns1 hostname</code> 으로 확인하고 호스트의 <code>hostname</code> 과 비교해 보세요.',
      hint: '<code>docker run -d --name ns1 --hostname container-a alpine sleep 3600</code>',
      answer: ['docker run -d --name ns1 --hostname container-a alpine sleep 3600', 'docker exec ns1 hostname', 'hostname'],
      check: M => { const c = M.c('ns1'); return M.running('ns1') && !!c && c.hostname === 'container-a' && M.ran(/docker\s+exec\s+.*ns1\s+hostname/); }
    },
    {
      id: 'm3',
      title: 'cgroups 한도를 파일로 확인하기',
      desc: '<code>nginx:alpine</code> 으로 <code>limited</code> 컨테이너를 메모리 <b>128MB</b>, CPU <b>0.5개</b>로 제한해 띄우고, 컨테이너 안의 <code>/sys/fs/cgroup/memory.max</code> 를 읽어 보세요.',
      hint: '<code>docker run -d --name limited -m 128m --cpus 0.5 nginx:alpine</code> → <code>docker exec limited cat /sys/fs/cgroup/memory.max</code>',
      answer: ['docker run -d --name limited -m 128m --cpus 0.5 nginx:alpine', 'docker exec limited cat /sys/fs/cgroup/memory.max'],
      check: M => { const c = M.c('limited'); return M.running('limited') && M.memory('limited') === 128 * 1024 * 1024 && !!c && c.hostConfig.cpus === 0.5 && M.ran(/memory\.max/); }
    },
    {
      id: 'm4',
      title: 'copy-on-write 흔적 남기기',
      desc: '<code>web</code> 컨테이너 안에 <code>/usr/share/nginx/html/cow.html</code> 파일을 만들고, <code>docker diff web</code> 으로 쓰기 층(upperdir)에 무엇이 기록됐는지 확인하세요.',
      hint: '<code>docker exec web sh -c \'echo hi &gt; /usr/share/nginx/html/cow.html\'</code> → <code>docker diff web</code>',
      answer: [`docker exec web sh -c 'echo hi > /usr/share/nginx/html/cow.html'`, 'docker diff web'],
      check: M => M.exists('web') && M.cfile('web', '/usr/share/nginx/html/cow.html') != null && M.ran(/docker\s+(container\s+)?diff\s+web/)
    },
    {
      id: 'm5',
      title: 'veth 와 docker-proxy 찾기',
      desc: '8080 포트가 게시된 <code>web</code> 이 실행 중인 상태에서, 호스트의 <code>ip addr</code> 로 <code>docker0</code> 와 <code>veth…</code> 장치를 찾고, <code>ps aux | grep docker-proxy</code> 로 포트를 중계하는 프로세스를 찾아보세요.',
      hint: '<code>ip addr</code> 과 <code>ps aux | grep docker-proxy</code>',
      answer: ['ip addr', 'ps aux | grep docker-proxy'],
      check: M => !!M.port(8080) && M.ran(/^ip\s+(a|addr|address)\b/) && M.ran(/docker-proxy/)
    },
    {
      id: 'm6',
      title: '볼륨의 실제 위치에서 파일 읽기',
      desc: '<code>notes</code> 볼륨을 만들고 alpine 컨테이너로 그 안에 <code>memo.txt</code> 를 쓴 뒤, 호스트의 <code>/var/lib/docker/volumes/notes/_data/</code> 에서 <code>sudo</code> 로 파일을 직접 읽어 보세요.',
      hint: '<code>docker run --rm -v notes:/data alpine sh -c \'echo hello &gt; /data/memo.txt\'</code> → <code>sudo cat /var/lib/docker/volumes/notes/_data/memo.txt</code>',
      answer: ['docker volume create notes', `docker run --rm -v notes:/data alpine sh -c 'echo hello > /data/memo.txt'`, 'sudo cat /var/lib/docker/volumes/notes/_data/memo.txt'],
      check: M => { const v = M.vol('notes'); return !!v && M.D.volFS(v).read('/memo.txt') != null && M.ran(/sudo\s+(ls|cat)\s+.*\/var\/lib\/docker\/volumes/); }
    },
    {
      id: 'm7', scenario: true,
      title: '자꾸 죽는 컨테이너 — cgroup 메모리 한도 찾기',
      desc: '⚙️ 상황 만들기를 누르면 <code>hog</code> 컨테이너가 실행되는데 곧 <code>Exited (137)</code> 이 됩니다. 이 프로그램은 메모리를 64MB 씁니다. <code>docker inspect</code> 로 원인(OOMKilled · Memory)을 찾고, 메모리 한도를 <b>128MB</b> 로 올려 같은 명령으로 다시 실행해 hog 가 계속 돌게 하세요.',
      hint: '<code>docker inspect -f \'{{.State.OOMKilled}} {{.HostConfig.Memory}}\' hog</code> → <code>docker rm hog</code> → <code>docker run -d --name hog -m 128m polinux/stress stress --vm 1 --vm-bytes 64M --vm-hang 0</code>',
      setup: ['docker run -d --name hog -m 32m polinux/stress stress --vm 1 --vm-bytes 64M --vm-hang 0'],
      answer: ['docker rm -f hog', 'docker run -d --name hog -m 128m polinux/stress stress --vm 1 --vm-bytes 64M --vm-hang 0'],
      check: M => M.running('hog') && M.memory('hog') >= 100 * 1024 * 1024
    }
  ],

  videos: [
    { title: 'Containers From Scratch — Liz Rice (GOTO 2018)', channel: 'GOTO Conferences', url: 'https://www.youtube.com/watch?v=8fi7uSYlOdc', lang: 'en', desc: 'Go 코드 몇십 줄로 네임스페이스 · chroot · cgroups 를 써서 컨테이너를 직접 만드는 명강연' },
    { title: 'Cgroups, namespaces, and beyond — Jérôme Petazzoni', channel: 'Docker', url: 'https://www.youtube.com/watch?v=sK5i-N34im8', lang: 'en', desc: '컨테이너를 이루는 커널 기능을 차근차근 설명하는 DockerCon 발표' },
    { title: 'Linux namespaces 설명 (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=linux+namespaces+cgroups+containers+explained', desc: '검색 결과 — 네임스페이스와 cgroups 입문 영상' },
    { title: 'OverlayFS 와 Docker 이미지 레이어 (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=docker+overlayfs+image+layers+explained', desc: '검색 결과 — 유니온 파일 시스템과 copy-on-write' },
    { title: '컨테이너 동작 원리 (한국어 검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=%EC%BB%A8%ED%85%8C%EC%9D%B4%EB%84%88+%EB%8F%99%EC%9E%91+%EC%9B%90%EB%A6%AC+%EB%84%A4%EC%9E%84%EC%8A%A4%ED%8E%98%EC%9D%B4%EC%8A%A4', desc: '검색 결과 — 한국어로 된 네임스페이스 · cgroups 강의' }
  ],

  terms: [
    ['네임스페이스 (namespace)', '프로세스 · 네트워크 · 마운트 · 호스트명 · IPC · 사용자 번호를 따로 보이게 나누는 리눅스 커널 기능. 컨테이너의 "안경".'],
    ['cgroups (control groups)', '프로세스 묶음의 메모리 · CPU · 프로세스 수 · I/O 사용량을 재고 제한하는 커널 기능. 컨테이너의 "울타리".'],
    ['PID 1', '네임스페이스 안에서 첫 번째 프로세스. 신호 처리와 좀비 프로세스 정리를 책임진다. 컨테이너의 메인 프로세스.'],
    ['OverlayFS', '여러 폴더를 겹쳐 하나로 보이게 하는 유니온 파일 시스템. Docker 의 기본 스토리지 방식(overlay2).'],
    ['lowerdir · upperdir', 'overlay 의 아래층(읽기 전용 이미지 레이어)과 위층(컨테이너 전용 쓰기 층).'],
    ['copy-on-write', '파일을 고칠 때에만 위층으로 복사해서 고치는 방식. 읽기만 하면 복사하지 않아 빠르고 공간을 아낀다.'],
    ['whiteout', 'overlay 에서 아래층 파일을 "지운 것으로 표시"하는 특수 파일. docker diff 의 D.'],
    ['veth pair', '양 끝이 연결된 가상 네트워크 장치 한 쌍. 한쪽은 컨테이너의 eth0, 다른 쪽은 호스트 브리지에 꽂힌다.'],
    ['docker0', 'Docker 기본 bridge 네트워크의 가상 스위치(리눅스 브리지). 기본 주소 172.17.0.1.'],
    ['containerd', 'dockerd 아래에서 이미지와 컨테이너 생명주기를 관리하는 런타임 데몬. 쿠버네티스도 직접 사용한다.'],
    ['runc', 'OCI Runtime Spec 의 대표 구현. 네임스페이스 · cgroups 를 설정하고 컨테이너 프로세스를 시작한다.'],
    ['containerd-shim', '컨테이너마다 하나씩 붙어 부모 역할을 하는 작은 프로세스. dockerd 재시작과 컨테이너를 분리한다.'],
    ['OCI', 'Open Container Initiative. 이미지 · 런타임 · 배포(레지스트리) 형식의 공개 표준을 만드는 단체.'],
    ['WSL2', 'Windows 에서 진짜 리눅스 커널을 가벼운 VM 으로 돌리는 기능. Docker Desktop 의 엔진이 여기서 돈다.']
  ],

  summary: [
    '컨테이너는 VM 이 아니라 호스트 커널 위의 평범한 프로세스입니다. 호스트의 ps aux · docker top 에서 그대로 보입니다.',
    '네임스페이스(pid · net · mnt · uts · ipc · user)는 "무엇이 보이는가"를 나눕니다 — 그래서 컨테이너 안에서는 내가 PID 1 이고 IP · 호스트명이 다릅니다.',
    'cgroups 는 "얼마나 쓸 수 있는가"를 정합니다. -m · --cpus 는 /sys/fs/cgroup/memory.max · cpu.max 파일에 적힙니다.',
    'overlay 파일 시스템은 읽기 전용 이미지 층(lowerdir) 위에 컨테이너 쓰기 층(upperdir)을 겹치고, 수정은 copy-on-write 로 처리합니다(docker diff).',
    '포트 게시는 veth pair · docker0 브리지 · iptables NAT · docker-proxy 가 함께 만듭니다.',
    'docker CLI → dockerd → containerd → containerd-shim → runc 순서로 일이 전달되고, 이 형식은 OCI 표준(image · runtime · distribution)으로 정해져 있습니다.',
    '맥 · 윈도의 Docker Desktop 은 리눅스 VM(WSL2) 안에서 컨테이너를 돌리며, 볼륨의 실제 위치는 /var/lib/docker/volumes/이름/_data 입니다.'
  ],

  quiz: [
    {
      q: '호스트에서 ps aux 를 실행했을 때 실행 중인 nginx 컨테이너는 어떻게 보일까요?',
      options: ['전혀 보이지 않는다', 'qemu 같은 가상 머신 프로세스 하나로 보인다', 'nginx 프로세스가 그대로 보인다', 'dockerd 의 스레드로만 보인다'],
      answer: 2,
      explain: '컨테이너는 호스트 커널 위의 프로세스이므로 호스트(리눅스)에서는 nginx 프로세스가 그대로 보입니다. 부모는 containerd-shim 입니다.'
    },
    {
      q: '컨테이너 안에서 hostname 이 호스트와 다르게 보이게 하는 네임스페이스는?',
      options: ['pid', 'uts', 'ipc', 'mnt'],
      answer: 1,
      explain: 'uts 네임스페이스가 호스트 이름(과 도메인 이름)을 분리합니다. --hostname 으로 값을 지정할 수 있습니다.'
    },
    {
      q: 'docker run -m 128m 으로 실행한 컨테이너 안에서 /sys/fs/cgroup/memory.max 를 읽으면?',
      options: ['128', '134217728', 'max', '8029968'],
      answer: 1,
      explain: '128MiB = 128 × 1024 × 1024 = 134217728 바이트가 cgroup 의 memory.max 에 적힙니다. 제한이 없으면 max 입니다.'
    },
    {
      q: '컨테이너에서 이미지에 있던 파일을 삭제했습니다. 실제로 일어나는 일은?',
      options: ['이미지 레이어에서 파일이 지워진다', '같은 이미지를 쓰는 모든 컨테이너에서 파일이 사라진다', 'upperdir 에 삭제 표시(whiteout)만 남고 이미지 레이어는 그대로다', '삭제가 불가능하다'],
      answer: 2,
      explain: '이미지 레이어(lowerdir)는 읽기 전용입니다. 컨테이너의 쓰기 층에 whiteout 이 생겨 그 컨테이너에서만 안 보이게 됩니다.'
    },
    {
      q: 'docker run 을 실행하면 네임스페이스와 cgroup 을 설정하고 프로세스를 실제로 시작하는 저수준 런타임은?',
      options: ['docker CLI', 'dockerd', 'runc', 'docker-proxy'],
      answer: 2,
      explain: 'CLI → dockerd → containerd → shim 을 거쳐 마지막에 runc 가 커널 기능으로 컨테이너 프로세스를 만들고 빠집니다.'
    },
    {
      q: 'OCI 표준에 포함되지 않는 것은?',
      options: ['Image Spec', 'Runtime Spec', 'Distribution Spec', 'Compose Spec'],
      answer: 3,
      explain: 'OCI 는 이미지 · 런타임 · 배포(레지스트리) 세 가지 규격을 정합니다. Compose Specification 은 별도의 프로젝트입니다.'
    },
    {
      q: '맥에서 Docker Desktop 으로 컨테이너를 띄웠는데, macOS 의 ps 에서 nginx 가 보이지 않는 이유는?',
      options: ['맥에서는 컨테이너가 실행되지 않아서', '컨테이너가 Docker Desktop 의 리눅스 VM 안에서 돌기 때문에', 'nginx 가 숨김 프로세스라서', 'ps 명령이 맥에 없어서'],
      answer: 1,
      explain: '리눅스 컨테이너에는 리눅스 커널이 필요하므로 Docker Desktop 은 작은 리눅스 VM 을 띄워 그 안에서 컨테이너를 실행합니다.'
    }
  ]
});
