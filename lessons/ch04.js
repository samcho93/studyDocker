/* 4장 — 포트와 네트워크 */
Course.lesson({
  id: 'ch04', no: '04',
  icon: '🌐',
  title: '포트와 네트워크',
  subtitle: '내 PC 와 컨테이너가, 그리고 컨테이너끼리 이야기하는 방법',
  level: '기초', time: '100분',
  goals: [
    '-p 호스트포트:컨테이너포트 의 두 숫자가 각각 무엇인지 설명하고, 127.0.0.1 로 제한해 게시할 수 있다',
    'localhost 가 호스트와 컨테이너 안에서 서로 다른 곳을 가리킨다는 것을 이해한다',
    'bridge · host · none 드라이버와 기본 bridge 의 한계(이름으로 못 찾음)를 설명할 수 있다',
    '사용자 정의 네트워크를 만들고 컨테이너 이름(DNS)으로 웹 → DB 통신을 연결할 수 있다',
    '"포트는 열었는데 접속이 안 된다" · "이름을 못 찾는다" 같은 네트워크 장애를 스스로 진단할 수 있다'
  ],
  chips: ['docker ps', 'docker network ls', 'docker port web', 'curl -s localhost:8080', 'ip addr'],

  figs: {
    /* ------------------------------------------------------------ 네트워크 네임스페이스 */
    netns: {
      caption: '컨테이너마다 자기만의 네트워크(네임스페이스)가 있고, veth 케이블로 호스트의 docker0 브리지(가상 스위치)에 꽂혀 있습니다',
      svg: `<svg class="dg" viewBox="0 0 860 380" role="img" aria-label="호스트 안의 docker0 브리지에 veth 로 연결된 두 컨테이너, 각자 lo 와 eth0 을 가짐">
  <rect x="16" y="14" width="828" height="352" rx="18" class="box"/>
  <text x="36" y="42" class="t-lg t-b">🖥️ 호스트 (Ubuntu)</text>
  <rect x="610" y="30" width="216" height="64" rx="10" class="gray"/>
  <text x="718" y="52" class="t-sm t-c t-mono">eth0 192.168.65.3</text>
  <text x="718" y="76" class="t-xs t-c t-mu">바깥 세상(인터넷 · 공유기)과 연결</text>
  <rect x="610" y="104" width="216" height="36" rx="10" class="gray"/>
  <text x="718" y="122" class="t-sm t-c t-mono">lo 127.0.0.1 (호스트 자신)</text>

  <rect x="60" y="170" width="740" height="44" rx="10" class="s-blue"/>
  <text x="430" y="192" class="t-b t-c tw">docker0 브리지 · 172.17.0.1 (가상 스위치 · 공유기 역할)</text>
  <line x1="718" y1="140" x2="718" y2="168" class="ln-blue thick ar-blue"/>
  <text x="730" y="157" class="t-xs t-blue">NAT</text>

  <rect x="80" y="252" width="300" height="100" rx="16" class="green"/>
  <text x="230" y="276" class="t-b t-c t-green">📦 컨테이너 web</text>
  <text x="230" y="304" class="t-sm t-c t-mono">eth0 172.17.0.2</text>
  <text x="230" y="330" class="t-sm t-c t-mono">lo 127.0.0.1 (web 자신)</text>

  <rect x="480" y="252" width="300" height="100" rx="16" class="teal"/>
  <text x="630" y="276" class="t-b t-c t-teal">📦 컨테이너 db</text>
  <text x="630" y="304" class="t-sm t-c t-mono">eth0 172.17.0.3</text>
  <text x="630" y="330" class="t-sm t-c t-mono">lo 127.0.0.1 (db 자신)</text>

  <line x1="230" y1="214" x2="230" y2="250" class="ln-green thick"/>
  <line x1="630" y1="214" x2="630" y2="250" class="ln-teal thick"/>
  <text x="242" y="236" class="t-xs t-mono t-green">veth</text>
  <text x="642" y="236" class="t-xs t-mono t-teal">veth</text>
  <text x="36" y="150" class="t-xs t-mu">🔒 각 컨테이너의 127.0.0.1 은 자기 자신만 가리킵니다</text>
</svg>`
    },

    /* ------------------------------------------------------------ 포트 게시 */
    publish: {
      caption: '-p 8080:80 — 호스트의 8080 번 문으로 들어온 요청을 컨테이너의 80 번 문으로 전달(포워딩)합니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="브라우저가 호스트 8080 으로 요청하면 컨테이너 80 으로 전달되어 nginx 가 응답">
  <rect x="16" y="90" width="150" height="110" rx="14" class="purple"/>
  <text x="91" y="126" class="t-xl t-c">🌐</text>
  <text x="91" y="160" class="t-b t-c t-purple">브라우저</text>
  <text x="91" y="184" class="t-xs t-c t-mono">localhost:8080</text>

  <rect x="210" y="20" width="634" height="264" rx="18" class="box"/>
  <text x="230" y="46" class="t-b">🖥️ 호스트</text>
  <rect x="236" y="112" width="120" height="66" rx="12" class="s-orange"/>
  <text x="296" y="138" class="t-lg t-c t-b tw">:8080</text>
  <text x="296" y="162" class="t-xs t-c tw">호스트 포트</text>
  <line x1="168" y1="145" x2="232" y2="145" class="ln-purple thick ar-purple"/>
  <line x1="168" y1="145" x2="232" y2="145" class="ln-purple moving"/>

  <rect x="430" y="60" width="396" height="208" rx="16" class="green"/>
  <text x="628" y="86" class="t-b t-c t-green">📦 컨테이너 web (172.17.0.2)</text>
  <rect x="456" y="112" width="120" height="66" rx="12" class="s-green"/>
  <text x="516" y="138" class="t-lg t-c t-b tw">:80</text>
  <text x="516" y="162" class="t-xs t-c tw">컨테이너 포트</text>
  <rect x="620" y="108" width="186" height="74" rx="12" class="box"/>
  <text x="713" y="136" class="t-b t-c">nginx</text>
  <text x="713" y="162" class="t-xs t-c t-mu">0.0.0.0:80 에서 대기</text>
  <line x1="358" y1="145" x2="452" y2="145" class="ln-orange thick ar-orange"/>
  <line x1="358" y1="145" x2="452" y2="145" class="ln-orange moving"/>
  <text x="404" y="130" class="t-xs t-c t-orange">전달</text>
  <line x1="578" y1="145" x2="616" y2="145" class="ln-green thick ar-green"/>

  <text x="628" y="222" class="t-sm t-c t-mono">docker run -p <tspan class="t-orange t-b">8080</tspan>:<tspan class="t-green t-b">80</tspan> nginx</text>
  <text x="628" y="248" class="t-xs t-c t-mu">왼쪽 = 호스트(바깥) · 오른쪽 = 컨테이너(안)</text>
</svg>`
    },

    /* ------------------------------------------------------------ 기본 bridge vs 사용자 정의 */
    dns: {
      caption: '기본 bridge 에는 이름표(DNS)가 없고, 사용자 정의 네트워크에는 내장 DNS 서버(127.0.0.11)가 있어서 컨테이너 이름으로 찾을 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="기본 bridge 에서는 ping web 이 실패하고, 사용자 정의 네트워크 app 에서는 DNS 가 web 을 IP 로 바꿔 줌">
  <rect x="16" y="16" width="400" height="308" rx="16" class="gray dash"/>
  <text x="216" y="44" class="t-b t-c">기본 bridge (docker0)</text>
  <rect x="40" y="70" width="150" height="70" rx="14" class="green"/>
  <text x="115" y="98" class="t-b t-c t-green">web</text>
  <text x="115" y="122" class="t-xs t-c t-mono">172.17.0.2</text>
  <rect x="242" y="70" width="150" height="70" rx="14" class="teal"/>
  <text x="317" y="98" class="t-b t-c t-teal">tool</text>
  <text x="317" y="122" class="t-xs t-c t-mono">172.17.0.3</text>
  <line x1="240" y1="105" x2="194" y2="105" class="ln-red dash ar-red"/>
  <text x="216" y="172" class="t-sm t-c t-mono">ping web</text>
  <text x="216" y="198" class="t-sm t-c t-red t-b">❌ bad address 'web'</text>
  <text x="216" y="236" class="t-sm t-c t-mono">ping 172.17.0.2</text>
  <text x="216" y="262" class="t-sm t-c t-green t-b">✅ 됨 (IP 로만 가능)</text>
  <text x="216" y="298" class="t-xs t-c t-mu">IP 는 재시작마다 바뀔 수 있어 불편</text>

  <rect x="444" y="16" width="400" height="308" rx="16" class="blue dash"/>
  <text x="644" y="44" class="t-b t-c t-blue">사용자 정의 네트워크 app</text>
  <rect x="468" y="70" width="150" height="70" rx="14" class="green"/>
  <text x="543" y="98" class="t-b t-c t-green">web</text>
  <text x="543" y="122" class="t-xs t-c t-mono">172.18.0.2</text>
  <rect x="670" y="70" width="150" height="70" rx="14" class="teal"/>
  <text x="745" y="98" class="t-b t-c t-teal">tool</text>
  <text x="745" y="122" class="t-xs t-c t-mono">172.18.0.3</text>
  <rect x="544" y="174" width="200" height="56" rx="12" class="s-blue"/>
  <text x="644" y="196" class="t-sm t-c t-b tw">📒 내장 DNS</text>
  <text x="644" y="216" class="t-xs t-c t-mono tw">127.0.0.11</text>
  <line x1="745" y1="142" x2="700" y2="172" class="ln-blue ar-blue"/>
  <text x="770" y="166" class="t-xs t-blue">"web 어디?"</text>
  <line x1="590" y1="172" x2="560" y2="144" class="ln-blue ar-blue"/>
  <text x="498" y="166" class="t-xs t-blue">172.18.0.2</text>
  <text x="644" y="262" class="t-sm t-c t-mono">ping web</text>
  <text x="644" y="290" class="t-sm t-c t-green t-b">✅ 이름으로 찾기 성공</text>
</svg>`
    },

    /* ------------------------------------------------------------ 격리 */
    isolate: {
      caption: '네트워크는 울타리입니다 — 같은 네트워크끼리만 대화하고, 두 네트워크에 모두 연결된 api 가 다리 역할을 합니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="front 네트워크의 web, back 네트워크의 db, 두 네트워크에 모두 연결된 api">
  <rect x="16" y="40" width="420" height="220" rx="18" class="orange dash"/>
  <text x="36" y="66" class="t-b t-orange">front 네트워크</text>
  <rect x="424" y="40" width="420" height="220" rx="18" class="purple dash"/>
  <text x="824" y="66" class="t-b t-e t-purple">back 네트워크 (--internal)</text>

  <rect x="50" y="110" width="170" height="90" rx="16" class="green"/>
  <text x="135" y="144" class="t-b t-c t-green">🌐 web</text>
  <text x="135" y="172" class="t-xs t-c t-mu">-p 8080:80</text>

  <rect x="345" y="110" width="170" height="90" rx="16" class="teal"/>
  <text x="430" y="144" class="t-b t-c t-teal">⚙️ api</text>
  <text x="430" y="172" class="t-xs t-c t-mu">두 네트워크 모두</text>

  <rect x="640" y="110" width="170" height="90" rx="16" class="blue"/>
  <text x="725" y="144" class="t-b t-c t-blue">🗄️ db</text>
  <text x="725" y="172" class="t-xs t-c t-mu">밖으로 못 나감</text>

  <line x1="222" y1="155" x2="341" y2="155" class="ln-green thick ar-green"/>
  <text x="282" y="144" class="t-xs t-c t-green">✅</text>
  <line x1="517" y1="155" x2="636" y2="155" class="ln-teal thick ar-teal"/>
  <text x="576" y="144" class="t-xs t-c t-teal">✅</text>
  <path d="M135,202 C135,300 725,300 725,204" class="ln-red dash ar-red" fill="none"/>
  <text x="430" y="296" class="t-sm t-c t-red t-b">❌ web → db : 이름도 IP 도 닿지 않음</text>
  <text x="430" y="24" class="t-sm t-c t-mu">바깥 사용자 → web → api → db 순서로만 흐르게 만들기</text>
</svg>`
    },

    /* ------------------------------------------------------------ 흐름: 접속 안 될 때 */
    debugFlow: `<div class="flow">
  <div class="fb blue"><span class="fi">1️⃣</span><b>docker ps</b>실행 중? PORTS 에 0.0.0.0:8080-&gt;80 이 있나?</div>
  <div class="fb teal"><span class="fi">2️⃣</span><b>docker port</b>호스트 ↔ 컨테이너 포트 짝이 맞나?</div>
  <div class="fb orange"><span class="fi">3️⃣</span><b>docker logs</b>앱이 몇 번 포트 · 어느 주소에서 듣나?</div>
  <div class="fb purple"><span class="fi">4️⃣</span><b>docker exec … curl localhost</b>컨테이너 안에서는 되나?</div>
  <div class="fb green"><span class="fi">✅</span><b>원인 확정</b>포트 짝 · 127.0.0.1 바인딩 · 충돌</div>
</div>`
  },

  files: {
    hello: {
      '~/hello/app.py': `from flask import Flask

app = Flask(__name__)

@app.route("/")
def hi():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(port=5000)
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '컨테이너는 자기만의 네트워크를 가진다',
      html: `
<p>3장까지는 컨테이너를 "하나의 작은 컴퓨터"처럼 다뤘습니다. 네트워크도 마찬가지입니다. 컨테이너를 만들면 Docker 는
<b>네트워크 네임스페이스</b>(network namespace, 네트워크 장치 · IP · 포트 번호표를 따로 떼어 주는 리눅스 기능)를 새로 만들어 줍니다.
그래서 컨테이너마다 <b>자기만의 IP 주소, 자기만의 포트 번호, 자기만의 localhost</b> 가 생깁니다.</p>

<div class="box analogy"><div class="box-t">🏢 비유 — 아파트와 호실</div>
호스트는 아파트 건물, 컨테이너는 각 호실입니다. 호실마다 <b>내선 번호</b>(IP 172.17.0.x)가 따로 있고,
호실 안에서 "우리 집"(localhost)이라고 하면 <b>그 호실만</b> 뜻합니다. 101호에서 "우리 집 거실"이라고 말해도 102호 거실을 가리키지 않죠.
건물 관리실(<code>docker0</code> 브리지)이 호실끼리, 그리고 바깥 도로(인터넷)와 연결해 줍니다.</div>

{{fig:netns}}

<p>호스트에서 <code class="cmd">ip addr</code> 를 실행하면 Docker 가 만든 가상 장치가 보입니다. 컨테이너 몇 개를 띄운 뒤 확인해 볼까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web nginx
docker run -d --name web2 nginx
ip addr</code></pre>
<pre class="code out" data-lang="출력"><code>1: lo: &lt;LOOPBACK,UP,LOWER_UP&gt; mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    inet 127.0.0.1/8 scope host lo
2: eth0: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc mq state UP group default qlen 1000
    inet 192.168.65.3/24 brd 192.168.65.255 scope global eth0
3: docker0: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:78:c7:5e:c7 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
4: veth82612e9@if24: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue master docker0 state UP group default
5: veth7fc4c67@if25: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue master docker0 state UP group default</code></pre>

<table class="tbl">
<tr><th>장치</th><th>뜻</th></tr>
<tr><td><code>eth0</code></td><td>호스트의 진짜 네트워크 카드 (바깥과 연결)</td></tr>
<tr><td><code>docker0</code></td><td>Docker 가 만든 <b>가상 스위치</b>. 기본 컨테이너들은 여기에 꽂혀 172.17.0.0/16 대역의 IP 를 받습니다</td></tr>
<tr><td><code>vethXXXX</code></td><td>컨테이너 한 개당 하나씩 생기는 <b>가상 랜선</b>(한쪽 끝은 컨테이너의 eth0, 다른 끝은 docker0)</td></tr>
<tr><td><code>br-XXXX</code></td><td>뒤에서 만들 <b>사용자 정의 네트워크</b>의 가상 스위치 (네트워크마다 하나)</td></tr>
</table>

<p>컨테이너의 IP 는 <code>docker inspect</code> 로 볼 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect -f '{{.NetworkSettings.IPAddress}}' web
docker inspect -f '{{.NetworkSettings.IPAddress}}' web2</code></pre>
<pre class="code out" data-lang="출력"><code>172.17.0.2
172.17.0.3</code></pre>

<h3>localhost 는 "지금 서 있는 곳"</h3>
<p>초보자가 가장 많이 헷갈리는 부분입니다. <code>localhost</code>(= 127.0.0.1)는 <b>명령을 실행한 바로 그 네트워크 공간</b>을 가리킵니다.</p>
<table class="tbl">
<tr><th>어디서 실행?</th><th><code>curl localhost:80</code> 이 가리키는 곳</th></tr>
<tr><td>🖥️ 호스트 터미널</td><td>호스트 자신 — 컨테이너 포트를 <b>게시(-p)</b>해야만 컨테이너에 닿습니다</td></tr>
<tr><td>📦 컨테이너 web 안 (<code>docker exec web …</code>)</td><td>web 컨테이너 자신</td></tr>
<tr><td>📦 컨테이너 db 안</td><td>db 컨테이너 자신 — <b>web 이 아닙니다!</b> web 에 가려면 이름이나 IP 를 써야 합니다</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec web curl -s localhost
curl localhost:80</code></pre>
<p>첫 줄(컨테이너 안)은 nginx 환영 페이지가 나오지만, 두 번째 줄(호스트)은 연결되지 않습니다. 아직 포트를 <b>게시</b>하지 않았기 때문이죠.</p>
<pre class="code out" data-lang="출력"><code>curl: (7) Failed to connect to localhost port 80 after 0 ms: Couldn't connect to server</code></pre>
`
    },

    /* ================================================================ 2 */
    {
      title: '포트 게시 -p — 바깥에서 컨테이너로 들어오는 문',
      html: `
<p>컨테이너는 기본적으로 <b>바깥에서 들어올 수 없는</b> 방에 있습니다. 내 PC 브라우저에서 컨테이너 웹 서버를 보려면
<b>포트 게시</b>(publish, 호스트의 포트 번호 하나를 컨테이너의 포트로 연결)를 해야 합니다.</p>

<div class="box analogy"><div class="box-t">📮 비유 — 대표 전화번호와 내선 번호</div>
회사 대표번호 <b>8080</b> 으로 전화가 오면, 교환원이 <b>내선 80번</b>(웹 담당)으로 돌려 줍니다.
<code>-p 8080:80</code> 은 "대표번호 8080 → 내선 80" 연결 규칙입니다. <b>왼쪽이 바깥(호스트), 오른쪽이 안(컨테이너)</b>. 순서를 꼭 기억하세요.</div>

{{fig:publish}}

<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f web web2
docker run -d --name web -p 8080:80 nginx
docker ps
docker port web</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE   COMMAND                  CREATED                  STATUS                  PORTS                                     NAMES
262ff0fb1472   nginx   "/docker-entrypoint.…"   Less than a second ago   Up Less than a second   0.0.0.0:8080-&gt;80/tcp, [::]:8080-&gt;80/tcp   web

80/tcp -&gt; 0.0.0.0:8080
80/tcp -&gt; [::]:8080</code></pre>
<p><code>0.0.0.0:8080-&gt;80/tcp</code> 는 "호스트의 <b>모든 네트워크 주소</b>(0.0.0.0)의 8080 번으로 오면 컨테이너 80 번으로 보낸다"는 뜻입니다.
<code>[::]</code> 는 같은 규칙의 IPv6 버전입니다. 이제 브라우저로 열어 보세요.</p>
{{widget:open|url=http://localhost:8080/}}

<h3>숫자를 바꿔 가며 감 잡기</h3>
<p>아래 위젯에서 호스트 포트 · 컨테이너 포트 · 앱이 실제로 듣는 포트를 바꿔 보세요. 세 숫자 중 <b>컨테이너 포트와 앱 포트가 어긋나면</b> 접속이 안 됩니다.</p>
{{widget:portmap|host=8080|container=80|app=80}}

<h3>-p 의 여러 모양</h3>
<div class="tbl-wrap"><table class="tbl">
<tr><th>쓰는 법</th><th>뜻</th><th>언제</th></tr>
<tr><td><code>-p 8080:80</code></td><td>모든 주소의 8080 → 컨테이너 80</td><td>가장 흔함</td></tr>
<tr><td><code>-p 127.0.0.1:8081:80</code></td><td><b>내 PC 에서만</b> 접속 가능 (같은 와이파이의 다른 사람은 못 들어옴)</td><td>개발용 DB · 관리 화면</td></tr>
<tr><td><code>-p 8080:80 -p 8443:443</code></td><td>여러 포트 동시에</td><td>HTTP + HTTPS</td></tr>
<tr><td><code>-p 5353:53/udp</code></td><td>UDP 포트 (기본은 TCP)</td><td>DNS 같은 UDP 서비스</td></tr>
<tr><td><code>-P</code> (대문자)</td><td>이미지에 EXPOSE 된 포트를 <b>무작위 호스트 포트</b>(32768 이상)에 게시</td><td>빠른 테스트 · 여러 개 띄울 때</td></tr>
</table></div>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name local -p 127.0.0.1:8081:80 nginx
docker run -d --name rnd -P nginx
docker port local
docker port rnd</code></pre>
<pre class="code out" data-lang="출력"><code>80/tcp -&gt; 127.0.0.1:8081

80/tcp -&gt; 0.0.0.0:32777
80/tcp -&gt; [::]:32777</code></pre>
<p><code>-P</code> 가 고른 번호는 그때그때 다릅니다. 그래서 <code>docker port</code> 로 확인하는 습관이 중요합니다.</p>

<div class="box warn"><div class="box-t">⚠️ EXPOSE 는 "문서"일 뿐</div>
Dockerfile 의 <code>EXPOSE 80</code> 은 "이 이미지는 80 번을 쓴다"는 <b>메모</b>입니다. 그것만으로는 바깥에서 접속되지 않습니다.
실제로 문을 여는 것은 <code>docker run</code> 의 <code>-p</code> 입니다. EXPOSE 가 쓸모 있는 곳은 두 가지 — 사람에게 알려 주기, 그리고 <code>-P</code> 가 게시할 포트 목록.
<code>docker ps</code> 의 PORTS 칸에 <code>80/tcp</code> 만 보이고 화살표(<code>-&gt;</code>)가 없다면 게시되지 않은 것입니다.</div>

<h3>포트 충돌 — 한 번호에 문은 하나</h3>
<p>호스트의 포트 하나는 <b>한 컨테이너(프로그램)만</b> 쓸 수 있습니다. 이미 8080 을 web 이 쓰고 있는데 또 8080 을 달라고 하면?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web3 -p 8080:80 nginx
docker ps -a --filter name=web3</code></pre>
<pre class="code out" data-lang="출력"><code>docker: Error response from daemon: driver failed programming external connectivity on endpoint web3 (0b8a4564…): Bind for 0.0.0.0:8080 failed: port is already allocated.

CONTAINER ID   IMAGE   COMMAND                  CREATED                  STATUS    PORTS   NAMES
07bc14d0f53d   nginx   "/docker-entrypoint.…"   Less than a second ago   Created           web3</code></pre>
<p>위 오류는 <b>일부러 낸 것</b>입니다. 눈여겨볼 점은 컨테이너가 <code>Created</code> 상태로 <b>남아 있다</b>는 것 — 그래서 같은 이름으로 다시 만들려면
먼저 <code>docker rm web3</code> 로 지워야 합니다. 해결은 간단합니다. <b>호스트 포트(왼쪽 숫자)만</b> 다른 번호로 바꾸면 됩니다. 컨테이너 포트(오른쪽)는 그대로 80 입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm web3
docker run -d --name web3 -p 8082:80 nginx
docker ps --format 'table {{.Names}}\\t{{.Ports}}'</code></pre>
<pre class="code out" data-lang="출력"><code>NAMES   PORTS
web3    0.0.0.0:8082-&gt;80/tcp, [::]:8082-&gt;80/tcp
rnd     0.0.0.0:32777-&gt;80/tcp, [::]:32777-&gt;80/tcp
local   127.0.0.1:8081-&gt;80/tcp
web     0.0.0.0:8080-&gt;80/tcp, [::]:8080-&gt;80/tcp</code></pre>
<div class="box tip"><div class="box-t">💡 컨테이너 포트는 겹쳐도 됩니다</div>
web · web3 · rnd 모두 <b>컨테이너 안에서는</b> 똑같이 80 번을 씁니다. 컨테이너마다 네트워크 공간이 따로라서 전혀 문제없습니다.
겹치면 안 되는 것은 <b>호스트 쪽 번호</b>뿐입니다.</div>
`
    },

    /* ================================================================ 3 */
    {
      title: '포트는 열었는데 접속이 안 된다? — 진단 순서',
      html: `
<p>-p 를 붙였는데도 브라우저에 "연결할 수 없음"이 뜨는 경우가 정말 많습니다. 원인은 대부분 세 가지 중 하나입니다.</p>
<div class="cards c3">
  <div class="card orange"><div class="ci">🔢</div><b>포트 짝이 틀림</b><p><code>-p 9090:8080 nginx</code> — nginx 는 80 에서 듣는데 8080 으로 보냄</p></div>
  <div class="card red"><div class="ci">🔒</div><b>앱이 127.0.0.1 에만 바인딩</b><p>앱이 "컨테이너 자기 자신"에게만 문을 열어 둠</p></div>
  <div class="card gray"><div class="ci">💥</div><b>포트 충돌 · 컨테이너 종료</b><p>이미 쓰는 번호, 혹은 컨테이너가 Exited</p></div>
</div>
{{fig:debugFlow}}

<h3>원인 ① 포트 짝이 틀렸을 때</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name wrong -p 9090:8080 nginx
curl localhost:9090</code></pre>
<pre class="code out" data-lang="출력"><code>curl: (56) Recv failure: Connection reset by peer</code></pre>
<p>호스트 9090 → 컨테이너 8080 으로 전달했지만, 컨테이너 안의 nginx 는 <b>80</b> 에서 기다립니다. 8080 에는 아무도 없으니 연결이 끊깁니다.
이미지가 어느 포트를 쓰는지는 Docker Hub 설명이나 <code class="cmd">docker image inspect -f '{{.Config.ExposedPorts}}' nginx</code> 로 확인합니다.</p>

<h3>원인 ② 앱이 127.0.0.1 에만 바인딩했을 때 (가장 헷갈리는 함정)</h3>
<p>프로그램이 포트를 열 때 "<b>어느 주소</b>로 오는 손님을 받을지"도 정합니다(바인딩, bind).</p>
<table class="tbl">
<tr><th>앱이 듣는 주소</th><th>뜻</th><th>-p 로 들어온 요청</th></tr>
<tr><td><code>127.0.0.1:5000</code></td><td>컨테이너 <b>자기 자신</b>이 보낸 요청만 받음</td><td>❌ 거부 (요청은 eth0 172.17.0.x 로 들어오므로)</td></tr>
<tr><td><code>0.0.0.0:5000</code></td><td>컨테이너의 <b>모든 주소</b>로 오는 요청을 받음</td><td>✅ 받음</td></tr>
</table>
<p>Flask 의 <code>app.run()</code> 은 기본값이 <code>127.0.0.1</code> 입니다. 직접 확인해 봅시다. 아래 코드를 <b>📄 파일로 저장</b>한 뒤
폴더를 컨테이너에 연결(<code>-v</code>, 5장에서 자세히 배웁니다)해서 실행합니다.</p>
<pre class="code" data-lang="python" data-file="~/hello/app.py"><code>from flask import Flask

app = Flask(__name__)

@app.route("/")
def hi():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(port=5000)</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name hello -p 5000:5000 -v ~/hello:/app -w /app python:3.12 sh -c "pip install flask &amp;&amp; python app.py"
sleep 3
docker logs --tail 3 hello
curl localhost:5000
docker exec hello curl -s localhost:5000</code></pre>
<pre class="code out" data-lang="출력"><code> * Running on http://127.0.0.1:5000
Press CTRL+C to quit

curl: (56) Recv failure: Connection reset by peer
Hello from Flask!</code></pre>
<p>로그의 <code>Running on http://<b>127.0.0.1</b>:5000</code> 이 결정적 단서입니다. <b>컨테이너 안에서는 되는데(Hello), 호스트에서는 안 되는</b> 전형적인 모습이죠.
📝 파일 탭에서 <code>~/hello/app.py</code> 의 마지막 줄을 <code>app.run(<span class="hl">host="0.0.0.0"</span>, port=5000)</code> 으로 고치거나,
아래 블록을 <b>📄 파일로 저장</b>해 덮어쓴 뒤 컨테이너를 재시작해 보세요. 폴더가 연결되어 있어서 재시작만 하면 고친 코드가 실행됩니다.</p>
<pre class="code" data-lang="python" data-file="~/hello/app.py"><code>from flask import Flask

app = Flask(__name__)

@app.route("/")
def hi():
    return "Hello from Flask!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker restart hello
sleep 3
docker logs --tail 3 hello
curl -s localhost:5000</code></pre>
<p>로그에 <code>Running on http://172.17.0.x:5000</code>(컨테이너 eth0 주소) 줄이 새로 보이고, 호스트에서도 <code>Hello from Flask!</code> 가 나오면 성공입니다.
(이 장의 🎯 미션에도 같은 상황이 나옵니다.)</p>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 프레임워크별 "0.0.0.0" 쓰는 법</div>
<table class="tbl">
<tr><th>도구</th><th>컨테이너용 실행 방법</th></tr>
<tr><td>Flask</td><td><code>app.run(host="0.0.0.0")</code> 또는 <code>flask run --host=0.0.0.0</code></td></tr>
<tr><td>FastAPI(uvicorn)</td><td><code>uvicorn main:app --host 0.0.0.0 --port 8000</code></td></tr>
<tr><td>Django</td><td><code>python manage.py runserver 0.0.0.0:8000</code></td></tr>
<tr><td>Vite · React 개발 서버</td><td><code>vite --host</code></td></tr>
<tr><td>Node(Express)</td><td><code>app.listen(3000)</code> — 기본이 모든 주소라 대부분 괜찮음</td></tr>
</table></div>

<div class="box note"><div class="box-t">📝 -p 127.0.0.1:… 과 헷갈리지 마세요</div>
<code>-p 127.0.0.1:8081:80</code> 은 <b>호스트 쪽</b> 문을 호스트 자신에게만 여는 것(보안 목적, 의도한 것)이고,
앱의 127.0.0.1 바인딩은 <b>컨테이너 안쪽</b> 문이 닫혀 있는 것(대부분 실수)입니다. 둘은 서로 다른 층입니다.</div>
`
    },

    /* ================================================================ 4 */
    {
      title: '네트워크 드라이버 — bridge · host · none',
      html: `
<p>Docker 는 컨테이너를 네트워크에 붙이는 방식을 <b>드라이버</b>(driver)로 고릅니다. 처음 설치하면 세 개의 네트워크가 준비되어 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network ls</code></pre>
<pre class="code out" data-lang="출력"><code>NETWORK ID     NAME     DRIVER   SCOPE
81e7034f4f6d   bridge   bridge   local
e290c310f1e2   host     host     local
2afe962c3b1f   none     null     local</code></pre>

<div class="cards c3">
  <div class="card blue"><div class="ci">🔌</div><b>bridge (기본)</b><p>가상 스위치에 꽂힌 독립 공간. 자기 IP, 자기 포트. 바깥에서 들어오려면 <code>-p</code> 필요</p></div>
  <div class="card orange"><div class="ci">🏠</div><b>host</b><p>호스트의 네트워크를 <b>그대로</b> 같이 씀. 격리 없음. <code>-p</code> 가 필요 없고 무시됨</p></div>
  <div class="card gray"><div class="ci">🚫</div><b>none</b><p>랜선을 뽑은 상태. <code>lo</code>(자기 자신)만 있음. 네트워크가 필요 없는 일괄 작업용</p></div>
</div>

<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>bridge</th><th>host</th><th>none</th></tr>
<tr><td>격리</td><td>✅ 있음</td><td>❌ 없음</td><td>✅ 완전 격리</td></tr>
<tr><td>컨테이너 IP</td><td>172.17.0.x 등</td><td>호스트 IP 그대로</td><td>없음 (127.0.0.1 만)</td></tr>
<tr><td>포트 게시</td><td><code>-p</code> 필요</td><td>필요 없음 (앱 포트 = 호스트 포트)</td><td>불가능</td></tr>
<tr><td>포트 충돌</td><td>컨테이너끼리는 안 남</td><td>호스트 프로그램과 충돌 가능</td><td>—</td></tr>
<tr><td>쓰는 곳</td><td><b>거의 모든 경우</b></td><td>네트워크 성능이 아주 중요할 때 (리눅스 전용)</td><td>보안이 중요한 계산 작업</td></tr>
</table></div>

<h3>none — 랜선 뽑힌 컨테이너</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --network none alpine ip addr</code></pre>
<pre class="code out" data-lang="출력"><code>1: lo: &lt;LOOPBACK,UP,LOWER_UP&gt; mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever</code></pre>
<p><code>eth0</code> 이 아예 없습니다. 바깥과 연결될 방법이 없으니 가장 안전합니다.</p>

<h3>host — 호스트와 네트워크를 공유</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f web
docker run -d --name hostweb --network host nginx
curl -sI localhost:80</code></pre>
<pre class="code out" data-lang="출력"><code>HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 615</code></pre>
<p><code>-p</code> 없이도 호스트 80 번에서 바로 응답합니다. nginx 가 호스트의 네트워크에서 직접 80 번을 연 것이죠.
편리해 보이지만 격리가 사라지고, 같은 포트를 쓰는 컨테이너를 둘 띄울 수 없습니다. 실습이 끝났으니 지워 둡니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f hostweb</code></pre>

<div class="box note"><div class="box-t">📝 Docker Desktop(맥 · 윈도우)에서의 host</div>
Docker Desktop 은 컨테이너를 작은 리눅스 VM 안에서 돌리기 때문에, host 네트워크의 "호스트"는 내 맥 · 윈도우가 아니라 그 VM 입니다.
최신 Docker Desktop 에는 host 네트워킹을 켜는 설정이 따로 있지만, 처음 배울 때는 <b>bridge + -p</b> 를 기본으로 생각하세요.</div>
`
    },

    /* ================================================================ 5 */
    {
      title: '기본 bridge 의 한계와 사용자 정의 네트워크 (내장 DNS)',
      html: `
<p>웹 서버가 데이터베이스에 접속하려면 "db 가 어디 있는지" 알아야 합니다. IP 주소를 외워 쓰면 될까요?
컨테이너 IP 는 다시 만들거나 재시작하면 <b>바뀔 수 있어서</b> 코드에 적어 두면 곤란합니다. 그래서 <b>이름</b>으로 찾고 싶습니다.</p>

<h3>① 기본 bridge 에서는 이름으로 못 찾는다</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name api nginx
docker run --rm alpine ping -c 2 api</code></pre>
<pre class="code out" data-lang="출력"><code>ping: bad address 'api'</code></pre>
<p>의도한 실패입니다. <code>--network</code> 를 주지 않은 컨테이너는 모두 기본 <code>bridge</code>(docker0)에 붙는데,
이 기본 네트워크에는 <b>이름을 IP 로 바꿔 주는 DNS 가 없습니다</b>. IP 로는 닿습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect -f '{{.NetworkSettings.IPAddress}}' api
docker run --rm alpine ping -c 2 172.17.0.2</code></pre>
<pre class="code out" data-lang="출력"><code>PING 172.17.0.2 (172.17.0.2): 56 data bytes
64 bytes from 172.17.0.2: seq=0 ttl=64 time=0.149 ms
64 bytes from 172.17.0.2: seq=1 ttl=64 time=0.140 ms</code></pre>
<p class="muted small">(IP 는 여러분 환경에서 다를 수 있습니다. 첫 줄에 나온 IP 로 바꿔서 실행하세요.)</p>

<h3>② 사용자 정의 네트워크를 만들면 이름으로 찾아진다</h3>
{{fig:dns}}
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create app
docker run -d --name web --network app nginx
docker run --rm --network app alpine ping -c 2 web</code></pre>
<pre class="code out" data-lang="출력"><code>PING web (172.18.0.2): 56 data bytes
64 bytes from 172.18.0.2: seq=0 ttl=64 time=0.100 ms
64 bytes from 172.18.0.2: seq=1 ttl=64 time=0.090 ms

--- web ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss</code></pre>
<p>새 네트워크 <code>app</code> 은 172.18.0.0/16 대역을 받았고, <code>web</code> 이라는 이름이 자동으로 IP 로 바뀌었습니다.
누가 이름을 바꿔 줬을까요? 컨테이너 안의 DNS 설정을 들여다봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --network app alpine cat /etc/resolv.conf
docker run --rm --network app alpine nslookup web</code></pre>
<pre class="code out" data-lang="출력"><code># Generated by Docker Engine.
…
nameserver 127.0.0.11
search .
options ndots:0

Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	web
Address: 172.18.0.2</code></pre>
<p><code>127.0.0.11</code> 은 Docker 가 사용자 정의 네트워크의 컨테이너마다 넣어 주는 <b>내장 DNS 서버</b> 주소입니다.
같은 네트워크의 컨테이너 이름(과 별칭)은 여기서 답해 주고, <code>google.com</code> 같은 바깥 이름은 호스트의 DNS 로 넘겨 줍니다.</p>

<div class="box analogy"><div class="box-t">📒 비유 — 층별 안내 데스크</div>
기본 bridge 는 안내 데스크가 없는 건물이라 "철수 씨 어디 있어요?"라고 물어도 대답이 없고, 호실 번호(IP)를 알아야만 찾아갈 수 있습니다.
사용자 정의 네트워크에는 <b>안내 데스크(127.0.0.11)</b>가 있어서 이름만 대면 호실 번호를 알려 줍니다.</div>

<p>호스트에서 <code class="cmd">ip addr</code> 를 다시 보면 새 가상 스위치 <code>br-6660f05dbdcc</code> 가 생긴 것도 확인할 수 있습니다.</p>
<pre class="code out" data-lang="출력"><code>4: br-6660f05dbdcc: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:4b:50:bb:66 brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.1/16 brd 172.18.255.255 scope global br-6660f05dbdcc</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 실시간 ping 실험실</div>
아래 위젯에서 실행 중인 컨테이너 둘을 골라 ping 해 보세요. <code>api</code>(기본 bridge)와 <code>web</code>(app 네트워크)처럼
<b>서로 다른 네트워크</b>에 있는 컨테이너끼리는 어떻게 되는지도 확인해 보세요.</div>
{{widget:netlab}}

<div class="box tip"><div class="box-t">💡 규칙은 하나 — "컨테이너끼리 대화시키려면 사용자 정의 네트워크"</div>
옛날 자료에 나오는 <code>--link</code> 옵션은 기본 bridge 의 이름 문제를 땜질하던 <b>레거시 기능</b>입니다. 새로 배우는 여러분은 쓰지 마세요.
9장의 Docker Compose 는 이 일을 자동으로 해 줍니다 (프로젝트마다 네트워크를 만들고 서비스 이름으로 찾게 함).</div>
`
    },

    /* ================================================================ 6 */
    {
      title: '네트워크 명령 모음과 웹 → DB 연결하기',
      html: `
<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>하는 일</th></tr>
<tr><td><code>docker network create 이름</code></td><td>네트워크 만들기 (기본 드라이버 bridge). <code>--subnet 10.10.0.0/24</code> 로 대역 지정, <code>--internal</code> 로 바깥 차단</td></tr>
<tr><td><code>docker network ls</code></td><td>목록</td></tr>
<tr><td><code>docker network inspect 이름</code></td><td>대역 · 게이트웨이 · 연결된 컨테이너 보기</td></tr>
<tr><td><code>docker run --network 이름 …</code></td><td>처음부터 그 네트워크에 붙여서 실행</td></tr>
<tr><td><code>docker network connect 네트워크 컨테이너</code></td><td>실행 중인 컨테이너에 랜선 하나 더 꽂기 (여러 네트워크 가능)</td></tr>
<tr><td><code>docker network disconnect 네트워크 컨테이너</code></td><td>랜선 뽑기</td></tr>
<tr><td><code>docker network rm 이름</code></td><td>삭제 (연결된 컨테이너가 없어야 함)</td></tr>
<tr><td><code>docker network prune</code></td><td>안 쓰는 사용자 정의 네트워크 모두 삭제</td></tr>
</table></div>

<h3>웹 → 데이터베이스 연결 실습</h3>
<p>진짜 서비스처럼 PostgreSQL 데이터베이스를 <code>app</code> 네트워크에 띄우고, 다른 컨테이너에서 <b>이름 db</b> 로 접속해 봅시다.
DB 는 바깥에 공개할 필요가 없으니 <code>-p</code> 를 붙이지 않습니다. 같은 네트워크 안에서는 컨테이너 포트(5432)로 바로 닿습니다.</p>
<div class="flow">
  <div class="fb green"><span class="fi">🌐</span><b>psql 클라이언트</b>--network app</div>
  <div class="fb blue"><span class="fi">📒</span><b>DNS 127.0.0.11</b>"db" → 172.18.0.x</div>
  <div class="fb teal"><span class="fi">🗄️</span><b>db:5432</b>PostgreSQL</div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name db --network app -e POSTGRES_PASSWORD=secret postgres:16-alpine
sleep 3
docker run --rm --network app -e PGPASSWORD=secret postgres:16-alpine psql -h db -U postgres -c 'SELECT 1'</code></pre>
<pre class="code out" data-lang="출력"><code> ?column?
----------
        1
(1 row)</code></pre>
<p><code>-h db</code> — 호스트 이름 자리에 <b>컨테이너 이름</b>을 썼습니다. 실제 웹 앱에서도 접속 주소를
<code>postgresql://postgres:secret@db:5432/postgres</code> 처럼 컨테이너 이름으로 씁니다.
<code>localhost:5432</code> 라고 쓰면? 웹 컨테이너 <b>자기 자신</b>의 5432 를 찾게 되어 실패합니다 (1절의 localhost 표).</p>

<h3>실행 중인 컨테이너를 나중에 연결하기</h3>
<p>이미 기본 bridge 에서 돌고 있는 <code>api</code> 를 app 네트워크에도 연결해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network connect app api
docker run --rm --network app alpine ping -c 1 api
docker network inspect -f '{{range .Containers}}{{.Name}} {{end}}' app</code></pre>
<pre class="code out" data-lang="출력"><code>PING api (172.18.0.4): 56 data bytes
64 bytes from 172.18.0.4: seq=0 ttl=64 time=0.103 ms
…
web db api</code></pre>
<p>api 는 이제 <b>두 개의 랜선</b>(bridge, app)을 가집니다. 뽑을 때는 <code>disconnect</code>, 네트워크를 지울 때는 연결된 컨테이너가 없어야 합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network disconnect app api
docker network rm app</code></pre>
<pre class="code out" data-lang="출력"><code>Error response from daemon: error while removing network: network app id 6660f05d… has active endpoints</code></pre>
<p>의도한 오류입니다. web · db 가 아직 연결되어 있어서 지울 수 없습니다. 다음 절에서 계속 쓸 테니 그대로 두세요.</p>
{{widget:open|pane=dash}}
<p class="muted small">📊 대시보드 탭에서 네트워크별로 어떤 컨테이너가 붙어 있는지 한눈에 볼 수 있습니다.</p>
`
    },

    /* ================================================================ 7 */
    {
      title: '네트워크 격리 · internal · 별칭(DNS 라운드 로빈)',
      html: `
<h3>격리 — 다른 네트워크는 서로 보이지 않는다</h3>
<p>네트워크는 대화 상대를 정하는 <b>울타리</b>이기도 합니다. 바깥에 공개되는 웹과, 절대 공개되면 안 되는 DB 를 다른 네트워크에 두면
웹이 해킹당해도 DB 에 바로 닿지 못하게 할 수 있습니다.</p>
{{fig:isolate}}
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create front
docker network create back
docker run -d --name backend --network back nginx
docker run -d --name frontend --network front nginx
docker exec frontend curl -sS -m 2 http://backend</code></pre>
<pre class="code out" data-lang="출력"><code>curl: (6) Could not resolve host: backend</code></pre>
<p>다른 네트워크에 있는 backend 는 이름조차 보이지 않습니다. frontend 에 back 네트워크를 연결하면 그제야 닿습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network connect back frontend
docker exec frontend curl -sI http://backend</code></pre>
<pre class="code out" data-lang="출력"><code>HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 615</code></pre>

<h3>internal 네트워크 — 바깥(인터넷)으로 나가는 길 차단</h3>
<p><code>--internal</code> 로 만든 네트워크는 <b>같은 네트워크끼리만</b> 통신하고 인터넷으로는 나가지 못합니다. 데이터베이스 전용 망에 딱 맞습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create --internal secret
docker run -d --name vault --network secret redis:7-alpine
docker run --rm --network secret redis:7-alpine redis-cli -h vault ping
docker run --rm --network secret alpine ping -c 1 google.com
docker run --rm alpine ping -c 1 google.com</code></pre>
<pre class="code out" data-lang="출력"><code>PONG
ping: bad address 'google.com'
PING google.com (93.184.215.14): 56 data bytes
64 bytes from 93.184.215.14: seq=0 ttl=64 time=16.464 ms</code></pre>
<p>같은 secret 네트워크의 vault 에는 닿지만(PONG), 인터넷은 막혀 있습니다. 마지막 줄처럼 기본 bridge 는 인터넷으로 나갈 수 있습니다.
<code>-p</code> 로 포트를 게시해도 internal 네트워크의 컨테이너는 바깥에서 접속되지 않습니다.</p>

<h3>--network-alias 와 DNS 라운드 로빈</h3>
<p>여러 컨테이너에 <b>같은 별칭</b>을 붙이면 DNS 가 그 이름에 IP 여러 개를 돌려줍니다. 요청이 여러 컨테이너로 나뉘어 가는 아주 단순한 부하 분산입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker network create lb
docker run -d --name w1 --network lb --network-alias search traefik/whoami
docker run -d --name w2 --network lb --network-alias search traefik/whoami
docker run --rm --network lb alpine nslookup search</code></pre>
<pre class="code out" data-lang="출력"><code>Server:		127.0.0.11
Address:	127.0.0.11:53

Non-authoritative answer:
Name:	search
Address: 172.18.0.2
Name:	search
Address: 172.18.0.3</code></pre>
<p><code>traefik/whoami</code> 는 "누가 응답했는지"를 알려 주는 작은 웹 서버입니다. 여러 번 요청해서 Hostname 이 바뀌는지 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --network lb nicolaka/netshoot curl -s http://search
docker run --rm --network lb nicolaka/netshoot curl -s http://search</code></pre>
<pre class="code out" data-lang="출력"><code>Hostname: c384fe5c226e
IP: 172.18.0.3
…
Hostname: 29599532c07b
IP: 172.18.0.2
…</code></pre>
<div class="box warn"><div class="box-t">⚠️ 라운드 로빈의 한계</div>
DNS 라운드 로빈은 "주소 목록을 돌려주는 것"까지만 합니다. 한 컨테이너가 죽어도 알아서 빼 주지 않고, 클라이언트가 주소를 캐시하면 한쪽으로 몰릴 수 있습니다.
진짜 부하 분산은 nginx · Traefik 같은 리버스 프록시(10장)나 쿠버네티스 Service(15장)가 맡습니다.</div>
`
    },

    /* ================================================================ 8 */
    {
      title: '컨테이너에서 호스트로 — host.docker.internal 과 정리',
      html: `
<p>반대 방향도 있습니다. 내 PC(호스트)에서 직접 실행 중인 프로그램(예: 호스트의 DB, 개발 서버)에 컨테이너가 접속해야 할 때,
컨테이너 안에서 <code>localhost</code> 는 컨테이너 자신이므로 쓸 수 없습니다. 이때 쓰는 특별한 이름이 <code>host.docker.internal</code> 입니다.</p>
<table class="tbl">
<tr><th>환경</th><th>host.docker.internal</th></tr>
<tr><td>Docker Desktop (맥 · 윈도우 · 리눅스)</td><td>기본으로 제공됨</td></tr>
<tr><td>리눅스 Docker Engine</td><td>기본은 없음 → <code>--add-host=host.docker.internal:host-gateway</code> 를 붙이면 호스트(게이트웨이) IP 로 연결됨</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --add-host=host.docker.internal:host-gateway alpine ping -c 1 host.docker.internal</code></pre>
<pre class="code out" data-lang="출력"><code>PING host.docker.internal (172.17.0.1): 56 data bytes
64 bytes from 172.17.0.1: seq=0 ttl=64 time=0.043 ms</code></pre>
<p><code>172.17.0.1</code> 은 docker0 브리지, 즉 컨테이너 쪽에서 본 <b>호스트의 주소</b>입니다 (1절 그림).</p>

<h3>한 장 정리 — "누가 누구에게 어떻게?"</h3>
<div class="tbl-wrap"><table class="tbl">
<tr><th>보내는 쪽 → 받는 쪽</th><th>주소</th><th>필요한 것</th></tr>
<tr><td>호스트(브라우저) → 컨테이너</td><td><code>localhost:호스트포트</code></td><td><code>-p 호스트:컨테이너</code> + 앱이 0.0.0.0 에서 듣기</td></tr>
<tr><td>다른 PC → 컨테이너</td><td><code>호스트IP:호스트포트</code></td><td><code>-p</code> (127.0.0.1 로 제한하지 않았을 때) + 방화벽 허용</td></tr>
<tr><td>컨테이너 → 컨테이너</td><td><code>컨테이너이름:컨테이너포트</code></td><td><b>같은 사용자 정의 네트워크</b> (-p 필요 없음)</td></tr>
<tr><td>컨테이너 → 호스트</td><td><code>host.docker.internal:포트</code></td><td>Desktop 은 기본, 리눅스는 <code>--add-host</code></td></tr>
<tr><td>컨테이너 → 인터넷</td><td>그냥 주소</td><td>bridge 기본 허용 (internal · none 은 불가)</td></tr>
</table></div>

<div class="box trend"><div class="box-t">🚀 최신 동향</div>
Docker Engine 은 버전이 올라가며 IPv6, 네트워크별 방화벽 규칙 등 네트워크 기능을 계속 다듬고 있습니다.
하지만 이 장에서 배운 <b>-p 게시 · 사용자 정의 네트워크 · 이름으로 찾기</b> 세 가지는 Compose(9장)와 쿠버네티스(15장)까지 그대로 이어지는 기본기입니다.</div>

<p>실습을 깨끗이 정리하고 싶다면 아래 명령을 실행하세요 (다음 장에 영향 없음).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f $(docker ps -aq)
docker network prune -f
docker network ls</code></pre>
{{widget:mission}}
`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'nginx 를 web 이라는 이름으로 호스트 8080 포트에 게시하기',
      desc: '컨테이너 <code>web</code> 을 nginx 이미지로 백그라운드 실행하고, 호스트 <b>8080</b> → 컨테이너 <b>80</b> 으로 게시하세요. 🌐 브라우저 탭에서 <code>localhost:8080</code> 을 열어 확인!',
      hint: '<code>docker run -d --name web -p 호스트:컨테이너 nginx</code> — 이미 web 이 있다면 <code>docker rm -f web</code> 먼저.',
      answer: ['docker rm -f web', 'docker run -d --name web -p 8080:80 nginx'],
      check: M => M.running('web') && M.port(8080) === M.c('web') && M.c('web').hostConfig.ports.some(p => +p.containerPort === 80)
    },
    {
      id: 'm2',
      title: '내 PC 에서만 접속되게 — 127.0.0.1:8081 로 게시하기',
      desc: '컨테이너 <code>local</code> 을 nginx 로 실행하되, <b>호스트의 127.0.0.1 주소의 8081</b> 포트에만 게시하세요 (같은 와이파이의 다른 사람은 못 들어오게). <code>docker port local</code> 로 확인해 보세요.',
      hint: '<code>-p 127.0.0.1:8081:80</code>',
      answer: ['docker run -d --name local -p 127.0.0.1:8081:80 nginx'],
      check: M => M.running('local') && M.c('local').hostConfig.ports.some(p => p.hostIp === '127.0.0.1' && +p.hostPort === 8081 && +p.containerPort === 80)
    },
    {
      id: 'm3',
      title: '사용자 정의 네트워크 shop 에서 db 를 이름으로 찾기',
      desc: '네트워크 <code>shop</code> 을 만들고, 그 안에 PostgreSQL 컨테이너 <code>db</code> 를 실행하세요 (<code>POSTGRES_PASSWORD</code> 필수). 그다음 같은 네트워크의 임시 컨테이너에서 <code>ping</code> 이나 <code>nslookup</code> 으로 <b>db 라는 이름</b>이 찾아지는지 확인하세요.',
      hint: '<code>docker network create shop</code> → <code>docker run -d --name db --network shop -e POSTGRES_PASSWORD=secret postgres:16-alpine</code> → <code>docker run --rm --network shop alpine ping -c 2 db</code>',
      answer: ['docker network create shop', 'docker run -d --name db --network shop -e POSTGRES_PASSWORD=secret postgres:16-alpine', 'docker run --rm --network shop alpine ping -c 2 db'],
      check: M => !!M.net('shop') && M.running('db') && M.connected('db', 'shop') && M.ran(/(ping|nslookup|dig|psql|pg_isready).*\bdb\b/)
    },
    {
      id: 'm4',
      title: '별칭 search 로 whoami 두 대 묶기 (DNS 라운드 로빈)',
      desc: '네트워크 <code>lb</code> 에 <code>traefik/whoami</code> 컨테이너 <b>두 개</b>(이름 자유)를 띄우고, 둘 다 <code>--network-alias search</code> 를 붙이세요. <code>docker run --rm --network lb alpine nslookup search</code> 로 IP 가 두 개 나오면 성공.',
      hint: '<code>docker network create lb</code> 후 <code>docker run -d --name w1 --network lb --network-alias search traefik/whoami</code> 를 이름만 바꿔 두 번.',
      answer: ['docker network create lb', 'docker run -d --name w1 --network lb --network-alias search traefik/whoami', 'docker run -d --name w2 --network lb --network-alias search traefik/whoami'],
      check: M => M.cs(c => c.state.status === 'running' && c.networks.lb && (c.networks.lb.aliases || []).includes('search')).length >= 2
    },
    {
      id: 'm5',
      title: '인터넷이 차단된 internal 네트워크에 Redis 숨기기',
      desc: '<code>--internal</code> 옵션으로 네트워크 <code>secret</code> 을 만들고, 그 안에 <code>redis:7-alpine</code> 컨테이너 <code>vault</code> 를 실행하세요. 같은 네트워크의 임시 컨테이너에서 <code>redis-cli -h vault ping</code> 이 PONG 을 돌려주는지 확인!',
      hint: '<code>docker network create --internal secret</code> → <code>docker run -d --name vault --network secret redis:7-alpine</code>',
      answer: ['docker network create --internal secret', 'docker run -d --name vault --network secret redis:7-alpine', 'docker run --rm --network secret redis:7-alpine redis-cli -h vault ping'],
      check: M => !!M.net('secret') && M.net('secret').internal && M.running('vault') && M.connected('vault', 'secret')
    },
    {
      id: 'm6', scenario: true,
      title: '🚨 worker 가 cache 를 이름으로 못 찾는다!',
      desc: '⚙️ 상황 만들기를 누르면 Redis 서버 <code>cache</code> 와 작업용 컨테이너 <code>worker</code> 가 실행됩니다. 그런데 <code>docker exec worker redis-cli -h cache ping</code> 이 <code>Name or service not known</code> 으로 실패합니다. 컨테이너를 지우지 말고, worker 가 <b>이름 cache 로</b> Redis 에 닿게 고치세요.',
      setup: ['docker run -d --name cache redis:7-alpine', 'docker run -d --name worker redis:7-alpine sleep infinity'],
      hint: '두 컨테이너가 어느 네트워크에 있나요? <code>docker inspect -f \'{{json .NetworkSettings.Networks}}\' worker</code>. 기본 bridge 에는 DNS 가 없습니다. 새 네트워크를 만들어 <code>docker network connect</code> 로 둘 다 연결하세요.',
      answer: ['docker network create backend', 'docker network connect backend cache', 'docker network connect backend worker', 'docker exec worker redis-cli -h cache ping'],
      check: M => M.running('cache') && M.running('worker') && Object.keys(M.c('worker').networks).some(n => n !== 'bridge' && M.connected('cache', n) && M.net(n) && M.net(n).driver === 'bridge')
    },
    {
      id: 'm7', scenario: true,
      title: '🚨 포트는 열었는데 Flask 앱에 접속이 안 된다!',
      desc: '⚙️ 상황 만들기를 누르면 <code>~/hello/app.py</code> 가 만들어지고, 컨테이너 <code>hello</code> 가 <code>-p 5000:5000</code> 으로 실행됩니다. 하지만 호스트에서 <code>curl localhost:5000</code> 을 하면 연결이 끊깁니다. 원인을 찾아 고쳐서 <code>curl -s localhost:5000</code> 이 <b>Hello from Flask!</b> 를 돌려주게 하세요.',
      files: 'hello',
      setup: ['docker run -d --name hello -p 5000:5000 -v ~/hello:/app -w /app python:3.12 sh -c "pip install flask && python app.py"'],
      hint: '<code>docker logs hello</code> 에서 <code>Running on http://127.0.0.1:5000</code> 을 찾아보세요. 📝 파일 탭에서 <code>app.run(host="0.0.0.0", port=5000)</code> 으로 고친 뒤 <code>docker restart hello</code>.',
      answer: [
        "printf 'from flask import Flask\\n\\napp = Flask(__name__)\\n\\n@app.route(\"/\")\\ndef hi():\\n    return \"Hello from Flask!\"\\n\\nif __name__ == \"__main__\":\\n    app.run(host=\"0.0.0.0\", port=5000)\\n' > ~/hello/app.py",
        'docker restart hello'
      ],
      check: async M => /Hello from Flask/.test(await M.get('http://localhost:5000/'))
    },
    {
      id: 'm8', scenario: true,
      title: '🚨 port is already allocated — 블로그를 함께 띄우기',
      desc: '⚙️ 상황 만들기를 누르면 Apache 웹 서버 <code>blog</code>(httpd:2.4)를 <code>-p 8080:80</code> 으로 실행하려다 <b>포트 충돌</b>로 실패합니다 (m1 의 web 이 8080 을 쓰는 중). <b>web 은 그대로 둔 채</b> blog 를 호스트 <b>8082</b> 포트로 띄우세요.',
      setup: ['docker rm -f web blog', 'docker run -d --name web -p 8080:80 nginx', 'docker run -d --name blog -p 8080:80 httpd:2.4'],
      hint: '실패한 blog 는 <code>Created</code> 상태로 남아 있어 이름이 겹칩니다. <code>docker rm blog</code> 후 <code>-p 8082:80</code> 으로 다시 실행하세요.',
      answer: ['docker rm blog', 'docker run -d --name blog -p 8082:80 httpd:2.4'],
      check: M => M.running('web') && M.port(8080) === M.c('web') && M.running('blog') && M.port(8082) === M.c('blog')
    }
  ],

  videos: [
    { title: 'Docker networking is CRAZY!! (you NEED to learn it)', channel: 'NetworkChuck', url: 'https://www.youtube.com/watch?v=bKFMS5C4CG0', lang: 'en', desc: '7가지 Docker 네트워크 드라이버를 실습으로 보여 주는 인기 영상' },
    { title: '도커 네트워크 강의 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=도커+네트워크', desc: '한국어 도커 네트워크 설명 영상 검색 결과' },
    { title: '도커 포트 포워딩 -p 설명 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=도커+포트+포워딩+-p', desc: '-p 호스트:컨테이너 개념을 다룬 영상 검색 결과' },
    { title: 'Docker bridge network DNS (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+user+defined+bridge+network+dns', desc: '사용자 정의 bridge 와 내장 DNS 를 다룬 영어 영상 검색 결과' }
  ],

  terms: [
    ['네트워크 네임스페이스', '리눅스 커널 기능. 컨테이너마다 네트워크 장치 · IP · 포트 · 라우팅 표를 따로 떼어 준다'],
    ['포트 게시(publish, -p)', '호스트의 포트를 컨테이너의 포트로 연결하는 규칙. -p 호스트포트:컨테이너포트'],
    ['EXPOSE', 'Dockerfile 에서 "이 이미지는 이 포트를 쓴다"고 적어 두는 문서용 지시어. 혼자서는 포트를 열지 않는다 (-P 가 참고)'],
    ['바인딩(bind)', '프로그램이 어느 주소 · 포트로 오는 연결을 받을지 정하는 것. 127.0.0.1 이면 자기 자신만, 0.0.0.0 이면 모든 주소'],
    ['localhost / 127.0.0.1', '"지금 이 네트워크 공간 자신". 호스트와 컨테이너 안에서 서로 다른 곳을 가리킨다'],
    ['docker0', 'Docker 가 호스트에 만드는 기본 가상 스위치(브리지). 기본 bridge 네트워크, 보통 172.17.0.1'],
    ['veth', '컨테이너와 브리지를 잇는 가상 랜선 한 쌍'],
    ['bridge 드라이버', '가상 스위치에 컨테이너를 연결하는 기본 네트워크 방식. 격리 + -p 로 공개'],
    ['host 드라이버', '컨테이너가 호스트의 네트워크를 그대로 공유. 격리 없음, -p 불필요'],
    ['none 드라이버', '네트워크 없음. lo 만 있는 완전 격리'],
    ['사용자 정의 네트워크', 'docker network create 로 만든 네트워크. 내장 DNS 로 컨테이너 이름을 찾을 수 있다'],
    ['내장 DNS (127.0.0.11)', '사용자 정의 네트워크의 컨테이너에게 이름 → IP 를 알려 주는 Docker 의 DNS 서버'],
    ['네트워크 별칭(--network-alias)', '컨테이너에 추가로 붙이는 DNS 이름. 여러 컨테이너가 같은 별칭을 가지면 DNS 라운드 로빈'],
    ['host.docker.internal', '컨테이너 안에서 호스트를 가리키는 특별한 이름. Docker Desktop 은 기본, 리눅스는 --add-host=host.docker.internal:host-gateway']
  ],

  summary: [
    '컨테이너마다 자기만의 네트워크(IP · 포트 · localhost)가 있다. 컨테이너 안의 localhost 는 그 컨테이너 자신이다.',
    '-p 호스트:컨테이너 — 왼쪽은 바깥(호스트), 오른쪽은 안(컨테이너). 호스트 포트만 겹치지 않으면 된다. 127.0.0.1:… 을 앞에 붙이면 내 PC 에서만 접속된다.',
    'EXPOSE 는 문서일 뿐이고, 실제로 문을 여는 것은 -p (또는 -P) 다.',
    '"-p 했는데 안 된다"면 포트 짝, 앱의 127.0.0.1 바인딩(→ 0.0.0.0 으로), 충돌 · 종료 순서로 확인한다.',
    '기본 bridge 에는 DNS 가 없어서 이름으로 못 찾는다. docker network create 로 만든 네트워크에서는 컨테이너 이름으로 통신한다 (내장 DNS 127.0.0.11).',
    '네트워크는 울타리다. 다른 네트워크끼리는 보이지 않고, --internal 은 인터넷도 막는다. connect/disconnect 로 랜선을 꽂고 뺀다.'
  ],

  quiz: [
    { q: '<code>docker run -d -p 3000:80 nginx</code> 로 실행한 nginx 를 내 PC 브라우저에서 보려면 어떤 주소를 열어야 할까요?', options: ['http://localhost:80', 'http://localhost:3000', 'http://172.17.0.1:80', 'http://nginx:3000'], answer: 1, explain: '-p 의 왼쪽(3000)이 호스트 포트입니다. 브라우저는 호스트에서 실행되므로 localhost:3000 으로 접속합니다.' },
    { q: 'Dockerfile 에 <code>EXPOSE 8000</code> 만 있고 <code>docker run</code> 에 -p/-P 가 없을 때 옳은 설명은?', options: ['호스트 8000 번으로 자동 게시된다', '무작위 포트로 자동 게시된다', '게시되지 않는다. EXPOSE 는 문서(메타데이터)일 뿐이다', '컨테이너가 시작되지 않는다'], answer: 2, explain: 'EXPOSE 는 포트를 열지 않습니다. -p 로 직접 게시하거나 -P 를 쓸 때 참고될 뿐입니다.' },
    { q: 'Flask 앱 로그에 <code>Running on http://127.0.0.1:5000</code> 이 찍혔고 <code>-p 5000:5000</code> 으로 실행했는데 호스트에서 접속이 안 됩니다. 알맞은 해결은?', options: ['-p 5000:5000 을 -p 127.0.0.1:5000:5000 으로 바꾼다', '앱이 0.0.0.0 에서 듣도록 host="0.0.0.0" 으로 실행한다', 'EXPOSE 5000 을 추가한다', '--network host 를 쓰면 안 된다'], answer: 1, explain: '앱이 컨테이너 자신(127.0.0.1)에게만 문을 열어 두었기 때문입니다. -p 로 들어온 요청은 eth0 으로 도착하므로 0.0.0.0 으로 바인딩해야 합니다.' },
    { q: '<code>--network</code> 없이 실행한 컨테이너 a, b 에서 <code>docker exec a ping b</code> 가 실패하는 이유는?', options: ['기본 bridge 네트워크에는 컨테이너 이름을 찾아 주는 DNS 가 없기 때문', 'ping 은 컨테이너끼리 쓸 수 없기 때문', '두 컨테이너가 서로 다른 호스트에 있기 때문', '-p 로 포트를 게시하지 않았기 때문'], answer: 0, explain: '기본 bridge 는 IP 로만 통신됩니다. 사용자 정의 네트워크를 만들어 연결하면 내장 DNS(127.0.0.11)가 이름을 IP 로 바꿔 줍니다.' },
    { q: '웹 컨테이너와 DB 컨테이너가 같은 사용자 정의 네트워크 <code>app</code> 에 있습니다. 웹 앱의 DB 접속 주소로 알맞은 것은?', options: ['localhost:5432', 'db:5432 (DB 컨테이너 이름)', '0.0.0.0:5432', 'host.docker.internal:5432 (DB 가 컨테이너일 때)'], answer: 1, explain: '같은 네트워크 안에서는 컨테이너 이름 + 컨테이너 포트로 접속합니다. localhost 는 웹 컨테이너 자신을 가리킵니다.' },
    { q: '<code>docker network create --internal secret</code> 으로 만든 네트워크의 특징은?', options: ['호스트 네트워크를 그대로 공유한다', '같은 네트워크 컨테이너끼리는 통신하지만 인터넷으로는 나가지 못한다', '컨테이너 이름을 찾을 수 없다', '포트 게시가 필수다'], answer: 1, explain: 'internal 네트워크는 바깥으로 가는 길이 없는 내부 전용 망입니다. DB 같은 뒷단 서비스를 숨길 때 씁니다.' },
    { q: '이미 8080 을 쓰는 컨테이너가 있는데 <code>docker run -d --name b -p 8080:80 httpd</code> 를 실행했습니다. 옳은 설명은?', options: ['기존 컨테이너가 자동으로 멈춘다', '"port is already allocated" 오류가 나고, b 는 Created 상태로 남는다', '둘이 8080 을 번갈아 쓴다', '컨테이너 포트 80 이 겹쳐서 오류가 난다'], answer: 1, explain: '호스트 포트 하나는 한 컨테이너만 쓸 수 있습니다. b 는 만들어졌지만 시작되지 못해 Created 로 남으므로 docker rm b 후 다른 호스트 포트로 다시 실행합니다.' }
  ]
});
