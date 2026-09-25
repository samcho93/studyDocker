/* 2장 — 이미지 다루기 */
Course.lesson({
  id: 'ch02', no: '02',
  icon: '🧱',
  title: '이미지 다루기',
  subtitle: '컨테이너의 "붕어빵 틀"을 내려받고, 들여다보고, 이름 붙이고, 치우는 법',
  level: '입문', time: '90분',
  goals: [
    'docker pull · images · rmi 로 이미지를 내려받고 목록을 보고 지울 수 있다',
    '이미지 이름을 레지스트리 / 저장소 : 태그 @ 다이제스트 로 나누어 읽고, latest 의 함정을 설명할 수 있다',
    '레이어가 무엇이고 왜 "Already exists" 가 뜨는지(레이어 공유) 설명할 수 있다',
    'history · inspect 로 이미지의 속을 들여다보고, tag 로 별명을 붙일 수 있다',
    '댕글링 이미지를 찾아 prune 으로 정리하고, 공식 이미지 · 태그 고정 · alpine/slim 기준으로 좋은 이미지를 고를 수 있다'
  ],
  chips: ['docker images', 'docker pull nginx:alpine', 'docker history nginx:alpine', 'docker images -f dangling=true', 'docker system df'],

  figs: {
    /* ------------------------------------------------------------ 레지스트리 → 내 PC → 컨테이너 */
    registryFlow: {
      caption: '이미지는 레지스트리(Docker Hub)에서 내 PC 로 내려받아(pull) 보관하고, 그 이미지로 컨테이너를 여러 개 찍어 냅니다(run)',
      svg: `<svg class="dg" viewBox="0 0 860 310" role="img" aria-label="Docker Hub 에서 pull 한 이미지가 내 PC 에 저장되고 run 으로 컨테이너가 만들어지는 흐름">
  <rect x="20" y="30" width="230" height="250" rx="18" class="blue dash"/>
  <text x="135" y="62" class="t-lg t-c t-blue">☁️ Docker Hub</text>
  <text x="135" y="86" class="t-xs t-c t-mu">레지스트리 (이미지 창고)</text>
  <rect x="45" y="104" width="180" height="34" rx="8" class="purple"/><text x="135" y="121" class="t-sm t-c t-mono">nginx</text>
  <rect x="45" y="146" width="180" height="34" rx="8" class="purple"/><text x="135" y="163" class="t-sm t-c t-mono">python</text>
  <rect x="45" y="188" width="180" height="34" rx="8" class="purple"/><text x="135" y="205" class="t-sm t-c t-mono">redis</text>
  <text x="135" y="250" class="t-xs t-c t-mu">… 수많은 저장소</text>

  <line x1="255" y1="155" x2="330" y2="155" class="ln-purple thick ar-purple"/>
  <line x1="255" y1="155" x2="330" y2="155" class="ln-purple moving"/>
  <text x="292" y="140" class="t-sm t-c t-mono t-purple t-b">pull</text>

  <rect x="335" y="30" width="505" height="250" rx="18" class="gray"/>
  <text x="587" y="58" class="t-lg t-c">💻 내 PC (Docker 호스트)</text>
  <rect x="355" y="80" width="190" height="180" rx="12" class="box"/>
  <text x="450" y="102" class="t-sm t-c t-b">이미지 저장소</text>
  <rect x="380" y="118" width="140" height="22" rx="4" class="purple"/>
  <rect x="380" y="144" width="140" height="22" rx="4" class="purple"/>
  <rect x="380" y="170" width="140" height="22" rx="4" class="purple"/>
  <text x="450" y="206" class="t-sm t-c t-mono">nginx:latest</text>
  <text x="450" y="228" class="t-xs t-c t-mu">읽기 전용 · 층층이</text>
  <text x="450" y="246" class="t-xs t-c t-mu">docker images 로 보기</text>

  <line x1="548" y1="170" x2="610" y2="120" class="ln-green ar-green"/>
  <line x1="548" y1="170" x2="610" y2="170" class="ln-green ar-green"/>
  <line x1="548" y1="170" x2="610" y2="220" class="ln-green ar-green"/>
  <text x="578" y="152" class="t-xs t-c t-mono t-green">run</text>

  <rect x="615" y="100" width="200" height="40" rx="20" class="green"/><text x="715" y="120" class="t-sm t-c">📦 컨테이너 web1</text>
  <rect x="615" y="150" width="200" height="40" rx="20" class="green"/><text x="715" y="170" class="t-sm t-c">📦 컨테이너 web2</text>
  <rect x="615" y="200" width="200" height="40" rx="20" class="green"/><text x="715" y="220" class="t-sm t-c">📦 컨테이너 web3</text>
  <text x="715" y="262" class="t-xs t-c t-mu">틀 하나로 붕어빵 여러 개</text>
</svg>`
    },

    /* ------------------------------------------------------------ 이미지 이름 해부 */
    nameAnatomy: {
      caption: '이미지 이름의 다섯 조각 — 대부분 생략되어 있어서 "nginx" 한 단어가 사실은 docker.io/library/nginx:latest 입니다',
      svg: `<svg class="dg" viewBox="0 0 860 250" role="img" aria-label="이미지 이름을 레지스트리, 사용자, 저장소, 태그, 다이제스트로 나눈 그림">
  <text x="430" y="30" class="t-b t-c">docker.io/library/nginx:1.27-alpine@sha256:0e39…</text>
  <rect x="20" y="55" width="140" height="50" rx="10" class="blue"/><text x="90" y="80" class="t-c t-mono t-b">docker.io</text>
  <text x="170" y="80" class="t-lg t-c t-mu">/</text>
  <rect x="180" y="55" width="120" height="50" rx="10" class="teal"/><text x="240" y="80" class="t-c t-mono t-b">library</text>
  <text x="310" y="80" class="t-lg t-c t-mu">/</text>
  <rect x="320" y="55" width="110" height="50" rx="10" class="purple"/><text x="375" y="80" class="t-c t-mono t-b">nginx</text>
  <text x="440" y="80" class="t-lg t-c t-mu">:</text>
  <rect x="450" y="55" width="150" height="50" rx="10" class="orange"/><text x="525" y="80" class="t-c t-mono t-b">1.27-alpine</text>
  <text x="610" y="80" class="t-lg t-c t-mu">@</text>
  <rect x="620" y="55" width="220" height="50" rx="10" class="gray dash"/><text x="730" y="80" class="t-c t-mono t-b">sha256:0e39…</text>

  <text x="90" y="128" class="t-sm t-c t-b t-blue">레지스트리</text>
  <text x="90" y="150" class="t-xs t-c">어느 창고?</text>
  <text x="90" y="170" class="t-xs t-c t-mu">생략 → docker.io</text>

  <text x="240" y="128" class="t-sm t-c t-b t-teal">사용자 · 조직</text>
  <text x="240" y="150" class="t-xs t-c">누가 올렸나?</text>
  <text x="240" y="170" class="t-xs t-c t-mu">공식 → library</text>

  <text x="375" y="128" class="t-sm t-c t-b t-purple">저장소</text>
  <text x="375" y="150" class="t-xs t-c">무슨 소프트웨어?</text>
  <text x="375" y="170" class="t-xs t-c t-mu">생략 불가</text>

  <text x="525" y="128" class="t-sm t-c t-b t-orange">태그</text>
  <text x="525" y="150" class="t-xs t-c">어느 버전 · 변형?</text>
  <text x="525" y="170" class="t-xs t-c t-mu">생략 → latest</text>

  <text x="730" y="128" class="t-sm t-c t-b">다이제스트</text>
  <text x="730" y="150" class="t-xs t-c">내용의 지문 (선택)</text>
  <text x="730" y="170" class="t-xs t-c t-mu">바뀌지 않는 고정 주소</text>

  <rect x="20" y="192" width="820" height="44" rx="10" class="yellow"/>
  <text x="430" y="214" class="t-sm t-c"><tspan class="t-mono t-b">nginx</tspan> = <tspan class="t-mono">docker.io/library/nginx:latest</tspan>  ·  <tspan class="t-mono t-b">grafana/grafana</tspan> = <tspan class="t-mono">docker.io/grafana/grafana:latest</tspan></text>
</svg>`
    },

    /* ------------------------------------------------------------ 태그 vs 다이제스트 */
    tagVsDigest: {
      caption: '태그는 옮겨 붙일 수 있는 포스트잇, 다이제스트는 내용에서 계산한 지문입니다 — 새 버전이 나오면 latest 포스트잇이 새 이미지로 옮겨 갑니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="latest 태그가 옛 이미지에서 새 이미지로 옮겨 가고, 다이제스트는 각 이미지에 고정된 모습">
  <text x="215" y="28" class="t-b t-c">지난달</text>
  <text x="645" y="28" class="t-b t-c">오늘 (새 버전 공개)</text>
  <line x1="430" y1="15" x2="430" y2="290" class="ln dash thin"/>

  <rect x="120" y="130" width="190" height="110" rx="12" class="purple"/>
  <text x="215" y="160" class="t-c t-b">이미지 A</text>
  <text x="215" y="185" class="t-xs t-c t-mono">nginx 1.26</text>
  <text x="215" y="215" class="t-xs t-c t-mono t-mu">sha256:aaa1…</text>
  <rect x="130" y="60" width="90" height="36" rx="4" class="s-yellow"/><text x="175" y="78" class="t-sm t-c t-mono t-b">latest</text>
  <rect x="226" y="60" width="74" height="36" rx="4" class="yellow"/><text x="263" y="78" class="t-sm t-c t-mono">1.26</text>
  <line x1="175" y1="96" x2="175" y2="128" class="ln ar"/>
  <line x1="263" y1="96" x2="263" y2="128" class="ln ar"/>

  <rect x="470" y="130" width="160" height="110" rx="12" class="purple"/>
  <text x="550" y="160" class="t-c t-b">이미지 A</text>
  <text x="550" y="185" class="t-xs t-c t-mono">nginx 1.26</text>
  <text x="550" y="215" class="t-xs t-c t-mono t-mu">sha256:aaa1…</text>
  <rect x="513" y="60" width="74" height="36" rx="4" class="yellow"/><text x="550" y="78" class="t-sm t-c t-mono">1.26</text>
  <line x1="550" y1="96" x2="550" y2="128" class="ln ar"/>

  <rect x="660" y="130" width="170" height="110" rx="12" class="green"/>
  <text x="745" y="160" class="t-c t-b">이미지 B</text>
  <text x="745" y="185" class="t-xs t-c t-mono">nginx 1.27</text>
  <text x="745" y="215" class="t-xs t-c t-mono t-mu">sha256:bbb2…</text>
  <rect x="665" y="60" width="80" height="36" rx="4" class="s-yellow"/><text x="705" y="78" class="t-sm t-c t-mono t-b">latest</text>
  <rect x="752" y="60" width="74" height="36" rx="4" class="yellow"/><text x="789" y="78" class="t-sm t-c t-mono">1.27</text>
  <line x1="705" y1="96" x2="705" y2="128" class="ln ar"/>
  <line x1="789" y1="96" x2="789" y2="128" class="ln ar"/>
  <path d="M175,56 C300,10 560,10 690,56" class="ln-orange dash ar-orange" fill="none"/>
  <text x="430" y="52" class="t-xs t-c t-orange t-b">latest 가 옮겨 감!</text>

  <text x="430" y="272" class="t-sm t-c">같은 <tspan class="t-mono t-b">nginx:latest</tspan> 라도 언제 pull 했느냐에 따라 <tspan class="t-b t-red">다른 이미지</tspan> · 다이제스트는 항상 같은 내용</text>
</svg>`
    },

    /* ------------------------------------------------------------ 레이어 공유 */
    layerShare: {
      caption: '세 이미지가 맨 아래 alpine 레이어(51abee3c58a2)를 함께 씁니다 — 디스크에는 한 번만 저장되고, 이미 있으면 pull 할 때 "Already exists" 로 건너뜁니다',
      svg: `<svg class="dg" viewBox="0 0 860 340" role="img" aria-label="alpine, nginx:alpine, redis:alpine 세 이미지가 아래 레이어를 공유하는 그림">
  <text x="130" y="28" class="t-b t-c t-mono">alpine</text>
  <text x="430" y="28" class="t-b t-c t-mono">nginx:alpine</text>
  <text x="730" y="28" class="t-b t-c t-mono">redis:alpine</text>

  <rect x="340" y="50" width="180" height="40" rx="6" class="purple"/><text x="430" y="70" class="t-xs t-c">d8282c1fd32e · 설정 파일</text>
  <rect x="340" y="96" width="180" height="56" rx="6" class="purple"/><text x="430" y="124" class="t-xs t-c">d7282a8c34f6 · nginx 설치</text>

  <rect x="640" y="50" width="180" height="40" rx="6" class="orange"/><text x="730" y="70" class="t-xs t-c">d8969a02090e · 설정</text>
  <rect x="640" y="96" width="180" height="56" rx="6" class="orange"/><text x="730" y="124" class="t-xs t-c">d9969b95a745 · redis 설치</text>

  <rect x="40" y="170" width="780" height="54" rx="8" class="s-teal"/>
  <text x="430" y="192" class="t-b t-c tw">51abee3c58a2 · alpine 기본 파일 시스템 (7.8MB)</text>
  <text x="430" y="212" class="t-xs t-c tw">세 이미지가 함께 쓰는 한 장의 레이어</text>
  <rect x="40" y="96" width="180" height="56" rx="6" class="gray dash"/>
  <text x="130" y="124" class="t-xs t-c t-mu">(위에 쌓인 것 없음)</text>

  <line x1="130" y1="224" x2="130" y2="262" class="ln-teal ar-teal"/>
  <line x1="430" y1="224" x2="430" y2="262" class="ln-teal ar-teal"/>
  <line x1="730" y1="224" x2="730" y2="262" class="ln-teal ar-teal"/>
  <rect x="40" y="266" width="780" height="60" rx="12" class="gray"/>
  <text x="430" y="290" class="t-sm t-c t-b">💾 디스크 (/var/lib/docker)</text>
  <text x="430" y="312" class="t-xs t-c">공유 레이어는 딱 한 번 저장 → 7.8MB × 3 이 아니라 7.8MB × 1</text>
</svg>`
    },

    /* ------------------------------------------------------------ 댕글링 이미지 */
    dangling: {
      caption: '태그가 새 이미지로 옮겨 가면 옛 이미지는 이름표 없는 <b>댕글링 이미지(&lt;none&gt;:&lt;none&gt;)</b> 가 되어 자리만 차지합니다',
      svg: `<svg class="dg" viewBox="0 0 860 260" role="img" aria-label="태그가 옮겨 간 뒤 이름 없는 댕글링 이미지가 남는 모습">
  <rect x="30" y="30" width="360" height="200" rx="16" class="box"/>
  <text x="210" y="56" class="t-b t-c">① 처음</text>
  <rect x="120" y="80" width="180" height="36" rx="4" class="s-yellow"/><text x="210" y="98" class="t-sm t-c t-mono t-b">nginx:latest</text>
  <line x1="210" y1="116" x2="210" y2="146" class="ln ar"/>
  <rect x="110" y="150" width="200" height="56" rx="10" class="purple"/>
  <text x="210" y="172" class="t-sm t-c t-mono">df66cb378c02</text>
  <text x="210" y="193" class="t-xs t-c t-mu">192MB</text>

  <line x1="400" y1="130" x2="460" y2="130" class="ln thick ar"/>
  <text x="430" y="115" class="t-xs t-c t-mono">새 latest</text>

  <rect x="470" y="30" width="360" height="200" rx="16" class="box"/>
  <text x="650" y="56" class="t-b t-c">② 새 버전을 latest 로 받은 뒤</text>
  <rect x="490" y="150" width="150" height="56" rx="10" class="gray dash"/>
  <text x="565" y="172" class="t-sm t-c t-mono">df66cb378c02</text>
  <text x="565" y="193" class="t-xs t-c t-red t-b">&lt;none&gt;:&lt;none&gt;</text>
  <rect x="665" y="80" width="150" height="36" rx="4" class="s-yellow"/><text x="740" y="98" class="t-sm t-c t-mono t-b">nginx:latest</text>
  <line x1="740" y1="116" x2="740" y2="146" class="ln ar"/>
  <rect x="660" y="150" width="160" height="56" rx="10" class="green"/>
  <text x="740" y="172" class="t-sm t-c t-mono">6685dd14720b</text>
  <text x="740" y="193" class="t-xs t-c t-mu">192MB</text>
  <text x="565" y="222" class="t-xs t-c t-mu">이름표 잃은 옛 이미지 🥲</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '이미지 다시 보기 — 붕어빵 틀은 어디서 올까?',
      html: `
<p>0장에서 <b>이미지(image)</b> 는 컨테이너를 찍어 내는 <b>읽기 전용 틀</b>이라고 배웠습니다. 이번 장은 이 틀을 제대로 다루는 법을 배웁니다.
내려받고(pull), 목록을 보고(images), 속을 들여다보고(history · inspect), 별명을 붙이고(tag), 필요 없으면 치웁니다(rmi · prune).</p>
<div class="box analogy"><div class="box-t">🍞 비유 — 붕어빵 틀 가게</div>
<b>Docker Hub</b> 는 전국의 붕어빵 틀을 모아 둔 <b>틀 도매 창고</b>, <code>docker pull</code> 은 창고에서 틀을 <b>내 가게로 가져오는 것</b>,
<code>docker run</code> 은 그 틀로 <b>붕어빵(컨테이너)을 굽는 것</b>입니다. 틀 하나로 붕어빵은 몇 개든 구울 수 있고, 붕어빵을 먹어도(컨테이너를 지워도) 틀은 그대로 남습니다.</div>
{{fig:registryFlow}}
<p>오른쪽 터미널에서 직접 해 봅시다. 처음에는 이미지가 하나도 없습니다. <code>nginx</code>(웹 서버) 이미지를 내려받고 목록을 확인해 볼까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker images
docker pull nginx
docker images</code></pre>
<pre class="code out" data-lang="출력"><code>Using default tag: latest
latest: Pulling from library/nginx
14b84caa6336: Pull complete
6696de048d86: Pull complete
6796df972bbd: Pull complete
6896e12ac9f5: Pull complete
Digest: sha256:013f8def55bcaf694118152dc70e63ab9b8ecce0456ab420420e925400d3fbba
Status: Downloaded newer image for nginx:latest
docker.io/library/nginx:latest

REPOSITORY   TAG      IMAGE ID       CREATED      SIZE
nginx        latest   df66cb378c02   7 days ago   192MB</code></pre>
<p>출력 한 줄 한 줄에 이번 장의 주제가 다 들어 있습니다. 앞으로 하나씩 풀어 보겠습니다.</p>
<table class="tbl">
<tr><th>출력</th><th>뜻</th><th>배울 곳</th></tr>
<tr><td><code>Using default tag: latest</code></td><td>태그를 안 적어서 <b>latest</b> 를 골랐다</td><td>2절</td></tr>
<tr><td><code>14b84caa6336: Pull complete</code></td><td>이미지를 이루는 <b>레이어</b> 한 장을 받았다</td><td>4절</td></tr>
<tr><td><code>Digest: sha256:…</code></td><td>받은 이미지의 <b>지문(다이제스트)</b></td><td>3절</td></tr>
<tr><td><code>docker.io/library/nginx:latest</code></td><td>생략 없이 쓴 <b>전체 이름</b></td><td>2절</td></tr>
<tr><td><code>IMAGE ID df66cb378c02</code></td><td>내 PC 안에서 이미지를 가리키는 <b>ID</b></td><td>3절</td></tr>
</table>
<div class="box tip"><div class="box-t">💡 명령 이름이 두 가지?</div>
<code>docker images</code> 와 <code>docker image ls</code>, <code>docker rmi</code> 와 <code>docker image rm</code> 은 <b>같은 명령</b>입니다.
옛날 이름(짧은 것)과 새 이름(<code>docker image …</code> 로 묶인 것)이 모두 동작합니다. 이 강좌는 둘 다 섞어 씁니다.</div>
<p>참고로 <code>docker run</code> 은 이미지가 없으면 <b>알아서 pull 부터</b> 합니다 (<code>Unable to find image 'nginx:latest' locally</code> 가 그 신호). 그래도 pull 을 따로 할 줄 알아야
"미리 받아 두기", "새 버전으로 갱신하기" 같은 일을 할 수 있습니다.</p>`
    },

    /* ================================================================ 2 */
    {
      title: '이미지 이름 읽기 — 이름:태그 와 latest 의 함정',
      html: `
<p>이미지 이름은 생각보다 긴 주소를 줄여 쓴 것입니다. 우편 주소가 "나라 · 도시 · 건물 · 호수"로 되어 있듯, 이미지 이름도 조각으로 나뉩니다.</p>
{{fig:nameAnatomy}}
<table class="tbl">
<tr><th>이렇게 쓰면</th><th>실제로는</th><th>설명</th></tr>
<tr><td><code>nginx</code></td><td><code>docker.io/library/nginx:latest</code></td><td>공식 이미지, 태그 생략</td></tr>
<tr><td><code>nginx:1.27</code></td><td><code>docker.io/library/nginx:1.27</code></td><td>버전 태그 지정</td></tr>
<tr><td><code>nginx:alpine</code></td><td><code>docker.io/library/nginx:alpine</code></td><td>alpine 기반 작은 변형</td></tr>
<tr><td><code>grafana/grafana</code></td><td><code>docker.io/grafana/grafana:latest</code></td><td>조직(grafana)이 올린 이미지</td></tr>
<tr><td><code>gcr.io/distroless/static-debian12</code></td><td>(그대로)</td><td>Docker Hub 가 아닌 구글 레지스트리</td></tr>
</table>
<p><b>태그(tag)</b> 는 같은 저장소 안의 "버전 · 변형" 이름입니다. 한 저장소에 태그가 수십 개씩 있고, 태그 이름은 보통 이런 규칙을 따릅니다.</p>
<div class="cards c3">
<div class="card blue"><div class="ci">🔢</div><b>버전</b><p><code>1.27</code> · <code>1.27.2</code> · <code>3.12</code><br>숫자가 자세할수록 더 고정됨</p></div>
<div class="card teal"><div class="ci">🪶</div><b>변형(베이스)</b><p><code>alpine</code> · <code>slim</code> · <code>bookworm</code><br>무엇을 바탕으로 만들었나</p></div>
<div class="card orange"><div class="ci">🧩</div><b>조합</b><p><code>3.12-slim</code> · <code>22-alpine</code><br>버전 + 변형</p></div>
</div>
<p>버전을 같이 받아 보고 목록을 비교해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull nginx:1.27
docker pull nginx:alpine
docker images nginx</code></pre>
<pre class="code out" data-lang="출력"><code>REPOSITORY   TAG      IMAGE ID       CREATED       SIZE
nginx        alpine   56d8051fda93   5 days ago    47.9MB
nginx        1.27     6685dd14720b   2 weeks ago   192MB
nginx        latest   df66cb378c02   7 days ago    192MB</code></pre>
<div class="box warn"><div class="box-t">⚠️ latest 의 함정</div>
<ul>
<li><b>latest 는 "최신"이라는 보장이 아닙니다.</b> 그저 태그를 안 적었을 때 쓰는 <b>기본 이름</b>일 뿐이고, 무엇을 가리킬지는 이미지를 올린 사람이 정합니다.</li>
<li><b>시간이 지나면 바뀝니다.</b> 오늘 받은 <code>nginx:latest</code> 와 석 달 뒤 받은 <code>nginx:latest</code> 는 다른 버전일 수 있습니다. "어제까진 됐는데 새 서버에선 안 돼요"의 단골 원인입니다.</li>
<li><b>이미 받아 둔 latest 는 저절로 갱신되지 않습니다.</b> 내 PC 의 latest 는 내가 pull 한 그 시점의 것이고, 새로 받으려면 다시 <code>docker pull</code> 해야 합니다.</li>
</ul>
그래서 실무에서는 <code>nginx:1.27</code> · <code>python:3.12-slim</code> 처럼 <b>태그를 적어서 고정</b>합니다 (8절).</div>
<div class="box note"><div class="box-t">📝 없는 이름 · 없는 태그</div>
오타가 나면 이렇게 실패합니다. 오류 메시지를 읽는 연습도 해 두세요.
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull ngnix
docker pull nginx:9.9</code></pre>
<pre class="code out" data-lang="출력"><code>Error response from daemon: pull access denied for ngnix, repository does not exist or may require 'docker login': denied: requested access to the resource is denied
Error response from daemon: manifest for nginx:9.9 not found: manifest unknown: manifest unknown</code></pre>
<code>pull access denied … repository does not exist</code> = <b>저장소 이름</b>이 틀림(또는 비공개), <code>manifest … not found</code> = 저장소는 있는데 <b>그 태그가 없음</b>.</div>`
    },

    /* ================================================================ 3 */
    {
      title: '다이제스트와 이미지 ID — 바뀌지 않는 지문',
      html: `
<p>태그는 사람이 붙이는 <b>포스트잇</b>이라 떼었다 다른 곳에 붙일 수 있습니다. 반면 <b>다이제스트(digest)</b> 는 이미지 내용 전체를 SHA-256 으로 계산한
<b>지문</b>입니다. 내용이 한 글자만 달라도 지문이 달라지므로, 다이제스트로 가리키면 <b>언제 어디서 받아도 똑같은 이미지</b>가 옵니다.</p>
{{fig:tagVsDigest}}
<div class="vs">
<div class="vs-a orange"><b>🏷️ 태그 (nginx:1.27)</b><ul><li>사람이 읽기 쉬움</li><li>다른 이미지로 <b>옮겨 갈 수 있음</b></li><li>일상적인 사용 · 문서</li></ul></div>
<div class="vs-mid">VS</div>
<div class="vs-b purple"><b>🔏 다이제스트 (sha256:…)</b><ul><li>길고 읽기 어려움</li><li>내용이 같으면 <b>항상 같은 값</b></li><li>배포 재현성 · 보안이 중요할 때</li></ul></div>
</div>
<p>내 PC 에 있는 이미지의 다이제스트와 ID 를 확인해 봅시다. <code>--format</code> 은 inspect 결과에서 원하는 칸만 뽑는 옵션입니다 (5절).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker image inspect --format '{{.RepoDigests}}' nginx
docker image inspect --format '{{.Id}}' nginx</code></pre>
<pre class="code out" data-lang="출력"><code>[nginx@sha256:013f8def55bcaf694118152dc70e63ab9b8ecce0456ab420420e925400d3fbba]
sha256:df66cb378c02cb29c15594054fab514d1fc54acc9b96bb561919e01480bc8f7e</code></pre>
<p>다이제스트로 내려받으려면 <code>@</code> 뒤에 붙입니다. (아래 값은 예시입니다. 여러분 화면에 나온 다이제스트를 복사해서 쓰세요.)</p>
<pre class="code" data-lang="bash"><code>docker pull nginx@sha256:여기에_여러분의_다이제스트
docker pull nginx:1.27@sha256:여기에_여러분의_다이제스트   <span class="cm"># 태그는 읽기용, 실제로는 다이제스트가 우선</span></code></pre>
<table class="tbl">
<tr><th></th><th>이미지 ID</th><th>다이제스트 (RepoDigest)</th></tr>
<tr><td>무엇의 지문?</td><td>이미지 <b>설정(config)</b> 의 해시</td><td>레지스트리에 올라간 <b>매니페스트</b>의 해시</td></tr>
<tr><td>어디서 보나?</td><td><code>docker images</code> 의 IMAGE ID (앞 12자리)</td><td>pull 출력의 <code>Digest:</code> · inspect 의 RepoDigests</td></tr>
<tr><td>언제 쓰나?</td><td>내 PC 안에서 이미지 지정 (<code>docker rmi df66cb378c02</code>)</td><td>다른 PC · 서버에서 똑같은 이미지 받기</td></tr>
</table>
<div class="box tip"><div class="box-t">💡 ID 는 앞부분만 적어도 됩니다</div>
이미지 ID · 컨테이너 ID 는 64자리지만, <b>겹치지 않을 만큼 앞부분</b>만 적어도 알아듣습니다. <code>docker rmi df66</code> 처럼요. 보통은 목록에 나오는 12자리를 복사해 씁니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: '레이어 — 이미지는 투명 필름을 겹친 것',
      html: `
<p>pull 할 때 여러 줄이 따로따로 내려받아지는 것을 보셨지요? 이미지는 파일 덩어리 하나가 아니라 <b>레이어(layer)</b> 여러 장을 겹친 것입니다.
각 레이어는 "이전 층에서 바뀐 파일"만 담고 있고, 모두 <b>읽기 전용</b>입니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 투명 필름 겹치기</div>
OHP 투명 필름을 떠올려 보세요. 맨 아래 필름엔 <b>기본 운영체제 파일</b>, 그 위엔 <b>nginx 프로그램</b>, 그 위엔 <b>설정 파일</b>이 그려져 있고,
위에서 내려다보면 한 장의 그림(완성된 파일 시스템)으로 보입니다. 맨 아래 필름이 같다면 여러 그림이 <b>그 필름 한 장을 같이 쓸 수 있습니다</b>.</div>
{{fig:layerShare}}
<p>직접 확인해 봅시다. <code>alpine</code>(아주 작은 리눅스)을 먼저 받고, alpine 을 바탕으로 만든 <code>redis:alpine</code> 을 받아 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull alpine
docker pull redis:alpine</code></pre>
<pre class="code out" data-lang="출력"><code>latest: Pulling from library/alpine
51abee3c58a2: Pull complete
...
alpine: Pulling from library/redis
51abee3c58a2: Already exists      <span class="cm">← 이미 있는 레이어! 내려받지 않음</span>
d9969b95a745: Pull complete
d8969a02090e: Pull complete</code></pre>
<p>(2절에서 <code>nginx:alpine</code> 을 받았다면 <code>alpine</code> 을 받을 때부터 벌써 Already exists 가 뜹니다. 같은 alpine 레이어를 쓰니까요!)</p>
<p><b>"Already exists"</b> 는 "그 레이어는 이미 내 PC 에 있으니 건너뛴다"는 뜻입니다. 레이어 공유 덕분에 다음 세 가지 이득이 생깁니다.</p>
<div class="stats">
<div class="stat teal"><b>⬇ 빠른 pull</b><span>이미 있는 층은 건너뜀</span></div>
<div class="stat blue"><b>💾 적은 디스크</b><span>공유 층은 한 번만 저장</span></div>
<div class="stat purple"><b>⚡ 빠른 빌드</b><span>6장 캐시의 바탕</span></div>
</div>
<p>아래 위젯에서 내 PC 에 있는 이미지를 골라 레이어가 어떻게 쌓였는지 보세요. 다른 이미지와 공유하는 레이어에는 <span class="tag teal">공유</span> 표시가 붙습니다.</p>
{{widget:layers|pull=nginx:alpine}}
<h4>docker history — 레이어가 만들어진 순서</h4>
<p><code>docker history</code> 는 이미지의 각 층이 <b>어떤 명령으로 만들어졌는지</b>를 위에서부터(최근 것부터) 보여 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull nginx:alpine
docker history nginx:alpine</code></pre>
<pre class="code out" data-lang="출력"><code>IMAGE          CREATED      CREATED BY                                      SIZE     COMMENT
56d8051fda93   5 days ago   CMD ["nginx","-g","daemon off;"]                0B
&lt;missing&gt;      5 days ago   ENTRYPOINT ["/docker-entrypoint.sh"]            0B
&lt;missing&gt;      5 days ago   STOPSIGNAL SIGQUIT                              0B
&lt;missing&gt;      5 days ago   EXPOSE map[80/tcp:{}]                           0B
&lt;missing&gt;      5 days ago   ENV NGINX_VERSION=1.27.2                        0B
&lt;missing&gt;      5 days ago   RUN /bin/sh -c COPY docker-entrypoint.sh / #…   4.01MB
&lt;missing&gt;      5 days ago   RUN /bin/sh -c set -x &amp;&amp; groupadd --system n…   36.1MB
&lt;missing&gt;      5 days ago   /bin/sh -c #(nop) ADD file:7d538ddedf62 in /    7.8MB</code></pre>
<ul>
<li><b>맨 아래</b> 7.8MB 가 alpine 기본 파일 시스템, 그 위에 nginx 설치(36.1MB) · 스크립트 복사가 쌓였습니다.</li>
<li><code>CMD</code> · <code>EXPOSE</code> · <code>ENV</code> 처럼 <b>0B</b> 인 줄은 파일이 아니라 <b>설정(메타데이터)</b> 만 바꾼 단계입니다.</li>
<li><code>&lt;missing&gt;</code> 은 오류가 아닙니다. 다른 곳에서 빌드되어 내려받은 이미지라 중간 단계의 ID 가 내 PC 에 없다는 뜻입니다.</li>
</ul>
<div class="box note"><div class="box-t">📝 컨테이너는 맨 위에 "쓰기 층"을 하나 더</div>
이미지 레이어는 읽기 전용이라 컨테이너가 파일을 바꾸면 어떻게 될까요? 컨테이너를 만들 때 맨 위에 <b>얇은 쓰기 층</b>이 한 장 더 생기고, 변경은 거기에만 기록됩니다.
그래서 컨테이너 100개가 같은 이미지를 써도 이미지는 한 벌이면 됩니다. (자세한 원리는 5장 · 14장)</div>`
    },

    /* ================================================================ 5 */
    {
      title: 'inspect — 이미지의 설명서 읽기',
      html: `
<p><code>docker image inspect</code> 는 이미지의 모든 정보를 JSON 으로 보여 줍니다. 처음엔 길어 보이지만, 몇 칸만 알면 충분합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker image inspect alpine</code></pre>
<pre class="code out" data-lang="출력 (일부)"><code>[
    {
        "Id": "sha256:ec987e229b1d28c0571cfee0e15e5602e1419d0f80b3921372916e12dd5bfca8",
        "RepoTags": [ "alpine:latest" ],
        "RepoDigests": [ "alpine@sha256:f1b81e9a67d26980c21aa0214e25c26173f4265b6d84a503fe9877ef56489add" ],
        "Config": {
            "Env": [ "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" ],
            "Cmd": [ "/bin/sh" ],
            "Entrypoint": null,
            ...
        },
        "Architecture": "amd64",
        "Os": "linux",
        "Size": 7800000,
        "RootFS": { "Type": "layers", "Layers": [ "sha256:51abee3c58a2…" ] }
    }
]</code></pre>
<table class="tbl">
<tr><th>칸</th><th>뜻</th><th>이럴 때 봅니다</th></tr>
<tr><td><code>Config.Cmd</code> · <code>Config.Entrypoint</code></td><td>컨테이너가 시작할 때 실행하는 명령</td><td>"이 이미지는 run 하면 뭘 하지?"</td></tr>
<tr><td><code>Config.Env</code></td><td>미리 정해진 환경 변수</td><td>버전 · PATH 확인</td></tr>
<tr><td><code>Config.ExposedPorts</code></td><td>앱이 쓰는 포트(안내용)</td><td>-p 로 무엇을 연결할지 (4장)</td></tr>
<tr><td><code>Architecture</code> · <code>Os</code></td><td>CPU 종류 · 운영체제</td><td>맥(arm64) · 서버(amd64) 호환 문제</td></tr>
<tr><td><code>RootFS.Layers</code></td><td>레이어 목록</td><td>공유 레이어 확인</td></tr>
</table>
<h4>--format 으로 필요한 칸만 뽑기</h4>
<p>JSON 을 다 읽을 필요 없이 <code>--format</code>(짧게 <code>-f</code>) 에 <b>Go 템플릿</b> <code>{{.칸이름}}</code> 을 적으면 그 값만 나옵니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker image inspect --format '{{json .Config.Cmd}}' nginx
docker image inspect --format '{{json .Config.ExposedPorts}}' nginx
docker image inspect --format '{{json .Config.Env}}' nginx
docker image inspect -f '{{.Architecture}} {{.Os}}' nginx</code></pre>
<pre class="code out" data-lang="출력"><code>["nginx","-g","daemon off;"]
{"80/tcp":{}}
["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","NGINX_VERSION=1.27.2"]
amd64 linux</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<code>python:3.12-slim</code> 을 받아서 기본 명령(Cmd)이 무엇인지, 환경 변수에 파이썬 버전이 적혀 있는지 inspect 로 찾아보세요.
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull python:3.12-slim
docker image inspect --format '{{json .Config.Cmd}}' python:3.12-slim
docker image inspect --format '{{json .Config.Env}}' python:3.12-slim</code></pre></div>
<div class="box tip"><div class="box-t">💡 목록도 골라 보기</div>
<code>docker images</code> 에도 <code>--format</code> 이 있습니다. <code class="cmd">docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}'</code> 처럼 원하는 칸만 뽑을 수 있고,
<code class="cmd">docker images -q</code> 는 ID 만 출력합니다 (다른 명령에 넘길 때 편리).</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'tag 로 별명 붙이기 · rmi 로 지우기',
      html: `
<p><code>docker tag 원래이름 새이름</code> 은 이미지에 <b>포스트잇을 하나 더 붙이는</b> 명령입니다. 이미지를 복사하지 않으므로 순식간에 끝나고 디스크도 늘지 않습니다.
내 이미지를 레지스트리에 올릴 때(11장) 이름을 바꾸는 데 꼭 필요합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker tag nginx:alpine mysite:v1
docker images</code></pre>
<pre class="code out" data-lang="출력"><code>REPOSITORY   TAG      IMAGE ID       CREATED      SIZE
nginx        alpine   56d8051fda93   5 days ago   47.9MB
mysite       v1       56d8051fda93   5 days ago   47.9MB    <span class="cm">← 같은 IMAGE ID!</span>
...</code></pre>
<p>두 줄의 <b>IMAGE ID 가 같다</b>는 점을 보세요. 이미지는 하나, 이름표만 둘입니다. 그래서 SIZE 합계만 보고 "디스크를 두 배 쓰네?" 하고 오해하면 안 됩니다.</p>
<h4>rmi — 이름표 떼기와 진짜 삭제</h4>
<p><code>docker rmi</code>(= <code>docker image rm</code>) 는 이렇게 동작합니다.</p>
<div class="flow">
<div class="fb orange"><span class="fi">🏷️</span><b>이름표 떼기</b>Untagged: mysite:v1</div>
<div class="fb yellow"><span class="fi">🤔</span><b>이름표가 남았나?</b>남았으면 여기서 끝 (이미지는 그대로)</div>
<div class="fb red"><span class="fi">🗑️</span><b>없으면 삭제</b>Deleted: sha256:… (레이어도, 공유 중이 아니면)</div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rmi mysite:v1
docker images nginx</code></pre>
<pre class="code out" data-lang="출력"><code>Untagged: mysite:v1

REPOSITORY   TAG      IMAGE ID       CREATED       SIZE
nginx        alpine   56d8051fda93   5 days ago    47.9MB
...</code></pre>
<p><code>mysite:v1</code> 은 이름표만 떨어지고 <code>nginx:alpine</code> 은 멀쩡합니다. 이름표가 하나뿐인 이미지를 지우면 진짜로 삭제됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull busybox
docker rmi busybox</code></pre>
<pre class="code out" data-lang="출력"><code>Untagged: busybox:latest
Untagged: busybox@sha256:1c4f49ad98a07117ceeb85c11914e12f5637dc30d2801a74615d23694e44a691
Deleted: sha256:3824adc5339189d739c406ef67b034434fb169786de66b0c50e637b2a5f985f4
Deleted: sha256:15db9127c3b35049e1ee6e85e493fcef3605b8446c91e3be9f9c425102b519c9</code></pre>
<h4>"사용 중이라 못 지워요" — 컨테이너가 붙잡고 있을 때</h4>
<p>이미지로 만든 컨테이너가 남아 있으면(실행 중이든 멈췄든) 그 이미지는 지울 수 없습니다. 붕어빵이 아직 진열대에 있는데 틀을 버릴 수는 없는 셈입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web1 nginx:1.27
docker rmi nginx:1.27</code></pre>
<pre class="code out" data-lang="출력"><code>Error response from daemon: conflict: unable to remove repository reference "nginx:1.27" (must be forced) - container 5588a0dcc676 is using its referenced image 6685dd14720b</code></pre>
<p>올바른 순서는 <b>컨테이너를 먼저 지우고 → 이미지를 지우는 것</b>입니다 (<code>docker rm -f</code> 는 3장에서 자세히).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f web1
docker rmi nginx:1.27</code></pre>
<div class="box warn"><div class="box-t">⚠️ rmi -f 는 조심</div>
<code>docker rmi -f</code> 로 억지로 지우면 컨테이너가 쓰는 이미지는 실제로 삭제되지 않고 <b>이름표만 떨어진 채</b> 남습니다. 바로 다음 절의 "댕글링 이미지"가 되어 버리지요.
에러가 나면 <b>-f 부터 붙이지 말고</b> 무엇이 붙잡고 있는지 먼저 확인하세요 (<code class="cmd">docker ps -a</code>).</div>`
    },

    /* ================================================================ 7 */
    {
      title: '댕글링 이미지와 prune — 창고 청소',
      html: `
<p>이미지를 이것저것 받다 보면 <code>&lt;none&gt;:&lt;none&gt;</code> 이라는 이름 없는 이미지가 생깁니다. 이것을 <b>댕글링(dangling, 매달린) 이미지</b>라고 합니다.
주로 <b>같은 태그로 새 이미지가 들어와서 옛 이미지가 이름표를 뺏겼을 때</b> 생깁니다 (새로 pull 하거나, 6장에서 같은 이름으로 다시 빌드할 때).</p>
{{fig:dangling}}
<p>실습 환경에서 이 상황을 만들어 봅시다. 원래는 시간이 지나 <code>nginx:latest</code> 가 새 버전을 가리키게 된 뒤 다시 pull 하면 생기는 일인데,
여기서는 <code>docker tag</code> 로 latest 이름표를 1.27 이미지로 옮겨서 흉내 냅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker pull nginx
docker pull nginx:1.27
docker tag nginx:1.27 nginx:latest
docker images</code></pre>
<pre class="code out" data-lang="출력"><code>REPOSITORY   TAG      IMAGE ID       CREATED       SIZE
nginx        1.27     6685dd14720b   2 weeks ago   192MB
nginx        latest   6685dd14720b   2 weeks ago   192MB
&lt;none&gt;       &lt;none&gt;   df66cb378c02   7 days ago    192MB     <span class="cm">← 댕글링!</span>
...</code></pre>
<p>댕글링 이미지만 골라 보고, 한 번에 치워 봅시다. <code>docker image prune</code> 은 확인을 묻는데, <code>y</code> 를 누르면 지웁니다 (<code>-f</code> 를 붙이면 묻지 않음).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker images -f dangling=true
docker image prune -f
docker images</code></pre>
<pre class="code out" data-lang="출력"><code>REPOSITORY   TAG      IMAGE ID       CREATED      SIZE
&lt;none&gt;       &lt;none&gt;   df66cb378c02   7 days ago   192MB

Deleted Images:
deleted: sha256:df66cb378c02cb29c15594054fab514d1fc54acc9b96bb561919e01480bc8f7e

Total reclaimed space: 192MB</code></pre>
<table class="tbl">
<tr><th>명령</th><th>지우는 것</th><th>위험도</th></tr>
<tr><td><code>docker image prune</code></td><td>댕글링 이미지(&lt;none&gt;)만</td><td><span class="tag green">안전</span></td></tr>
<tr><td><code>docker image prune -a</code></td><td><b>컨테이너가 쓰지 않는 모든 이미지</b> (이름 있는 것도!)</td><td><span class="tag orange">주의</span> 다시 pull 해야 함</td></tr>
<tr><td><code>docker system prune</code></td><td>멈춘 컨테이너 + 안 쓰는 네트워크 + 댕글링 이미지 + 빌드 캐시</td><td><span class="tag orange">주의</span></td></tr>
</table>
<p>디스크를 얼마나 쓰고 있는지는 <code>docker system df</code> 로 봅니다. RECLAIMABLE 이 "지워도 되는(치울 수 있는) 양"입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker system df</code></pre>
<pre class="code out" data-lang="출력 (예)"><code>TYPE            TOTAL   ACTIVE   SIZE    RECLAIMABLE
Images          1       1        192MB   0B (0%)
Containers      1       1        0B      0B
Local Volumes   0       0        0B      0B
Build Cache     0       0        0B      0B</code></pre>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
개발용 PC 는 몇 달만 지나도 이미지가 수십 GB 쌓입니다. "디스크가 꽉 찼어요"의 단골 범인이 Docker 입니다.
가끔 <code>docker system df</code> 로 확인하고 <code>docker image prune</code> 으로 청소하는 습관을 들이세요. 다만 서버에서 <code>-a</code> 를 붙일 때는
"지금 안 도는 컨테이너의 이미지도 사라진다"는 점을 꼭 기억하세요.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '좋은 이미지 고르기 — 공식 · 태그 고정 · 크기',
      html: `
<p>Docker Hub 에는 누구나 이미지를 올릴 수 있습니다. 편리한 만큼 <b>아무 이미지나 받으면 위험</b>할 수 있지요 (오래된 취약점, 심지어 악성 코드).
좋은 이미지를 고르는 기준을 정리해 봅시다.</p>
<h4>① 찾기 — docker search 와 Docker Hub 웹사이트</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker search nginx
docker search --filter is-official=true python</code></pre>
<pre class="code out" data-lang="출력"><code>NAME    DESCRIPTION                STARS   OFFICIAL
nginx   Official build of Nginx.   20600   [OK]

NAME     DESCRIPTION                                     STARS   OFFICIAL
python   Python is an interpreted, interactive, objec…   9800    [OK]</code></pre>
<p>실제 Docker 에서는 검색 결과가 수십 줄 나옵니다. 설명 · 태그 목록 · 사용법은 <b>hub.docker.com</b> 웹사이트에서 보는 편이 훨씬 편합니다.</p>
<h4>② 믿을 수 있는 출처</h4>
<div class="cards c3">
<div class="card green"><div class="ci">🏅</div><b>Docker Official Image</b><p><code>nginx</code> · <code>python</code> 처럼 사용자 이름이 없는 것. Docker 가 관리 · 보안 업데이트</p></div>
<div class="card blue"><div class="ci">✔️</div><b>Verified Publisher</b><p><code>grafana/grafana</code> 처럼 회사가 직접 올리고 Docker 가 확인한 것</p></div>
<div class="card red"><div class="ci">❓</div><b>개인 이미지</b><p><code>someone/nginx-cool</code> — 받기 전에 Dockerfile · 업데이트 날짜 · 다운로드 수 확인</p></div>
</div>
<h4>③ 태그 고정</h4>
<table class="tbl cmp">
<tr><th>쓰는 방법</th><th>예</th><th>평가</th></tr>
<tr><td>태그 생략</td><td><code>python</code></td><td><span class="tag red">피하기</span> 언제 무엇이 올지 모름</td></tr>
<tr><td>주 버전</td><td><code>python:3.12-slim</code></td><td><span class="tag green">권장</span> 보안 패치는 받고 큰 변화는 막음</td></tr>
<tr><td>정확한 버전</td><td><code>nginx:1.27.2</code></td><td><span class="tag blue">엄격</span> 완전히 같은 버전</td></tr>
<tr><td>다이제스트</td><td><code>nginx@sha256:…</code></td><td><span class="tag purple">최고 재현성</span> 운영 배포 · 보안 감사</td></tr>
</table>
<h4>④ 크기 — alpine 과 slim</h4>
<p>같은 소프트웨어도 <b>무엇을 바탕으로 만들었느냐</b>에 따라 크기가 몇 배씩 다릅니다. 아래 위젯의 "⬇ 모두 pull" 을 눌러 직접 비교해 보세요.</p>
{{widget:sizes|list=nginx,nginx:alpine,python:3.12,python:3.12-slim,python:3.12-alpine|title=같은 소프트웨어, 다른 크기}}
<div class="tbl-wrap">
<table class="tbl">
<tr><th>변형</th><th>바탕</th><th>장점</th><th>주의할 점</th></tr>
<tr><td><b>(기본)</b> <code>python:3.12</code></td><td>Debian + 빌드 도구 잔뜩</td><td>뭐든 다 있음(gcc · git · curl)</td><td>크다 (실습 환경 기준 약 1GB)</td></tr>
<tr><td><b>slim</b> <code>python:3.12-slim</code></td><td>Debian 최소 구성</td><td>작고 호환성 좋음 — <b>무난한 첫 선택</b></td><td>curl · gcc 등은 직접 설치</td></tr>
<tr><td><b>alpine</b> <code>python:3.12-alpine</code></td><td>Alpine Linux (musl libc)</td><td>아주 작음</td><td>bash 없음 · 일부 파이썬 패키지 설치가 까다로움</td></tr>
</table>
</div>
<div class="box tip"><div class="box-t">💡 좋은 이미지 고르기 체크리스트</div>
<ol class="steps-list">
<li><b>공식 이미지</b>나 Verified Publisher 인가?</li>
<li><b>태그를 적었나?</b> (latest 금지 · 최소한 주 버전)</li>
<li><b>필요한 만큼만 큰가?</b> 처음엔 slim, 익숙해지면 alpine 이나 distroless(7장)</li>
<li><b>최근에 업데이트</b>되었나? (Docker Hub 의 Last pushed)</li>
<li>내 PC 와 <b>CPU 종류(amd64 · arm64)</b> 가 맞나? (<code>docker image inspect -f '{{.Architecture}}'</code>)</li>
</ol></div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'nginx:alpine 이미지 내려받기',
      desc: '태그를 적어서 <code>nginx</code> 의 alpine 변형을 내려받고, <code>docker images</code> 로 크기를 확인하세요.',
      hint: '<code>docker pull 이름:태그</code>',
      answer: ['docker pull nginx:alpine'],
      check: M => !!M.image('nginx:alpine')
    },
    {
      id: 'm2',
      title: '파이썬 3.12 slim 이미지 받기',
      desc: '태그를 고정하는 연습입니다. 파이썬 <b>3.12</b> 버전의 <b>slim</b> 변형을 내려받으세요.',
      hint: '태그는 <code>버전-변형</code> 모양입니다. <code>docker pull python:…</code>',
      answer: ['docker pull python:3.12-slim'],
      check: M => !!M.image('python:3.12-slim')
    },
    {
      id: 'm3',
      title: 'nginx:alpine 에 mysite:v1 이라는 별명 붙이기',
      desc: '<code>nginx:alpine</code> 이미지에 <code>mysite:v1</code> 이라는 이름표를 하나 더 붙이세요. <code>docker images</code> 에서 두 줄의 IMAGE ID 가 같은지 확인해 보세요.',
      hint: '<code>docker tag 원래이름 새이름</code>',
      answer: ['docker tag nginx:alpine mysite:v1'],
      check: M => { const a = M.image('mysite:v1'), b = M.image('nginx:alpine'); return !!a && !!b && a.id === b.id; }
    },
    {
      id: 'm4',
      title: 'nginx:alpine 의 레이어 역사 보기',
      desc: '<code>docker history</code> 로 <code>nginx:alpine</code> 이 어떤 단계로 쌓였는지 보세요. 맨 아래 레이어의 크기는 얼마인가요?',
      hint: '<code>docker history 이미지이름</code> (또는 <code>docker image history</code>)',
      answer: ['docker history nginx:alpine'],
      check: M => M.ran(/docker (image )?history\s+(\S+\s+)*(nginx:alpine|mysite:v1|56d8)/)
    },
    {
      id: 'm5',
      title: 'alpine 레이어를 공유하는 이미지 하나 더 받기',
      desc: '<code>nginx:alpine</code> 의 맨 아래 레이어를 함께 쓰는 <b>다른 이미지</b>를 하나 내려받으세요 (예: <code>redis:alpine</code>, <code>alpine</code>, <code>python:3.12-alpine</code>). pull 출력에서 <b>Already exists</b> 줄을 찾아보세요.',
      hint: 'alpine 을 바탕으로 만든 이미지는 이름(태그)에 alpine 이 들어갑니다.',
      answer: ['docker pull redis:alpine'],
      check: M => { const n = M.image('nginx:alpine'); if (!n) return false; const base = n.layers[0].id; return M.images().some(i => i.id !== n.id && i.layers.some(l => l.id === base)); }
    },
    {
      id: 'm6',
      title: 'mysite:v1 이름표만 떼기 (nginx:alpine 은 남기기)',
      desc: '<code>mysite:v1</code> 을 지우되, 같은 이미지를 가리키는 <code>nginx:alpine</code> 은 그대로 남아 있어야 합니다. 출력에 <code>Untagged</code> 만 나오고 <code>Deleted</code> 가 없는지 보세요.',
      hint: '<code>docker rmi 이름:태그</code> — ID 로 지우면 이름표가 여러 개라 곤란합니다.',
      answer: ['docker rmi mysite:v1'],
      check: M => !M.image('mysite:v1') && !!M.image('nginx:alpine')
    },
    {
      id: 'm7', scenario: true,
      title: '이름 없는 이미지가 자리를 차지한다! 정리하기',
      desc: '⚙️ 상황 만들기를 누르면 <code>nginx:latest</code> 이름표가 새 이미지로 옮겨 가서 <code>&lt;none&gt;:&lt;none&gt;</code> 이미지가 생깁니다. 이름 있는 이미지(<code>nginx:latest</code> · <code>nginx:1.27</code>)는 남기고 <b>댕글링 이미지만</b> 모두 지우세요.',
      setup: ['docker pull nginx', 'docker pull nginx:1.27', 'docker tag nginx:1.27 nginx:latest'],
      hint: '<code>docker images -f dangling=true</code> 로 찾고, 댕글링만 지우는 prune 명령을 쓰세요. <code>-a</code> 를 붙이면 이름 있는 이미지까지 지워질 수 있습니다!',
      answer: ['docker image prune -f'],
      check: M => M.images().every(i => i.repoTags.length > 0) && !!M.image('nginx:latest') && !!M.image('nginx:1.27')
    },
    {
      id: 'm8', scenario: true,
      title: '이미지가 안 지워진다! httpd:2.4 깨끗이 없애기',
      desc: '⚙️ 상황 만들기를 누르면 <code>httpd:2.4</code> 로 만든 컨테이너 <code>oldweb</code> 이 돌고 있습니다. 이제 필요 없으니 <b>컨테이너와 httpd:2.4 이미지를 모두</b> 지우세요. 단, 이름 없는 이미지(&lt;none&gt;)가 남으면 안 됩니다.',
      setup: ['docker pull httpd:2.4', 'docker run -d --name oldweb httpd:2.4'],
      hint: '<code>docker rmi httpd:2.4</code> 의 오류를 읽어 보세요. 무엇이 이미지를 붙잡고 있나요? <code>rmi -f</code> 로 억지로 지우면 &lt;none&gt; 이 남습니다.',
      answer: ['docker rm -f oldweb', 'docker rmi httpd:2.4'],
      check: M => !M.exists('oldweb') && !M.images().some(i => i.repoTags.some(t => /^httpd:/.test(t))) && M.images().every(i => i.repoTags.length > 0)
    }
  ],

  videos: [
    { title: 'Docker in 100 Seconds', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=Gjnup-PuquQ', lang: 'en', min: '2분', desc: '이미지 · 컨테이너 · Dockerfile 관계를 2분 만에 훑어보기' },
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: '이미지 · 레이어 · 레지스트리 부분을 골라 보세요' },
    { title: 'Docker Tutorial for Beginners - A Full DevOps Course', channel: 'freeCodeCamp.org', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', lang: 'en', min: '2시간', desc: '명령어 실습 위주의 입문 강좌 (이미지 명령 부분)' },
    { title: '도커 이미지 레이어 설명 (검색)', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EC%9D%B4%EB%AF%B8%EC%A7%80+%EB%A0%88%EC%9D%B4%EC%96%B4', desc: '유튜브 검색 결과 — 한국어로 레이어 · 공유 원리를 설명하는 영상들' },
    { title: 'docker image tag vs digest (검색)', url: 'https://www.youtube.com/results?search_query=docker+image+tag+vs+digest', desc: '유튜브 검색 결과 — 태그와 다이제스트, latest 를 피해야 하는 이유' },
    { title: 'alpine vs slim docker image (검색)', url: 'https://www.youtube.com/results?search_query=docker+alpine+vs+slim+image', desc: '유튜브 검색 결과 — 베이스 이미지 크기 비교와 선택 기준' }
  ],

  terms: [
    ['이미지(image)', '컨테이너를 만드는 읽기 전용 틀. 여러 레이어와 설정(Cmd · Env 등)으로 이루어짐'],
    ['레지스트리(registry)', '이미지를 보관하고 나눠 주는 서버. 기본은 Docker Hub(docker.io)'],
    ['저장소(repository)', '같은 소프트웨어의 여러 버전 이미지를 모아 둔 곳. 예: nginx, python'],
    ['태그(tag)', '저장소 안의 버전 · 변형 이름표. 생략하면 latest. 다른 이미지로 옮겨 붙을 수 있음'],
    ['latest', '태그를 생략했을 때 쓰는 기본 태그. "최신"이라는 보장은 없음'],
    ['다이제스트(digest)', '이미지 매니페스트 내용으로 계산한 sha256 지문. 내용이 같으면 항상 같은 값'],
    ['이미지 ID', '내 PC 안에서 이미지를 가리키는 sha256 값 (목록에는 앞 12자리)'],
    ['레이어(layer)', '이미지를 이루는 읽기 전용 파일 변경 묶음. 같은 레이어는 여러 이미지가 공유'],
    ['Already exists', 'pull 할 때 그 레이어가 이미 내 PC 에 있어서 내려받지 않고 건너뛰었다는 표시'],
    ['댕글링 이미지(dangling)', '태그를 잃어 <none>:<none> 으로 표시되는 이미지. docker image prune 으로 정리'],
    ['prune', '안 쓰는 것을 한 번에 치우는 명령 (image · container · system prune)'],
    ['공식 이미지(Docker Official Image)', 'Docker 가 관리하는 검증된 이미지. 사용자 이름 없이 nginx, python 처럼 씀'],
    ['alpine · slim', '작은 베이스 이미지 변형. alpine 은 Alpine Linux 기반, slim 은 Debian 최소 구성']
  ],

  summary: [
    '<code>docker pull 이름:태그</code> 로 받고, <code>docker images</code> 로 보고, <code>docker rmi</code> 로 지운다. run 은 이미지가 없으면 알아서 pull 한다.',
    '<code>nginx</code> = <code>docker.io/library/nginx:latest</code>. <b>latest 는 최신 보장이 아니고 시간이 지나면 바뀌므로</b> 태그를 적어서 고정한다.',
    '태그는 옮겨 붙는 포스트잇, <b>다이제스트(sha256)</b> 는 바뀌지 않는 지문 — 완전히 같은 이미지가 필요하면 <code>이름@sha256:…</code>.',
    '이미지는 읽기 전용 <b>레이어</b>를 겹친 것이고, 같은 레이어는 공유되어 "Already exists" 로 건너뛴다. <code>docker history</code> 로 층을 본다.',
    '<code>docker image inspect --format</code> 으로 Cmd · Env · ExposedPorts · Architecture 를 뽑아 본다.',
    '<code>docker tag</code> 는 이름표만 추가(ID 동일). rmi 는 이름표를 떼고, 이름표가 없어지면 삭제. 컨테이너가 쓰는 이미지는 컨테이너부터 지운다.',
    '&lt;none&gt; 댕글링 이미지는 <code>docker image prune</code> 으로. 좋은 이미지 = 공식 · 태그 고정 · slim/alpine 으로 알맞은 크기.'
  ],

  quiz: [
    {
      q: '<code>docker pull redis</code> 를 실행했을 때 실제로 내려받는 이미지의 전체 이름은?',
      options: ['redis', 'docker.io/redis/redis:newest', 'docker.io/library/redis:latest', 'hub.docker.com/redis:stable'],
      answer: 2,
      explain: '레지스트리를 생략하면 docker.io, 공식 이미지의 사용자 자리는 library, 태그를 생략하면 latest 가 붙습니다.'
    },
    {
      q: '<code>latest</code> 태그에 대한 설명으로 <b>옳은</b> 것은?',
      options: ['항상 가장 최신 버전을 가리킨다고 Docker 가 보장한다', '한 번 받아 두면 새 버전이 나올 때 자동으로 갱신된다', '태그를 생략했을 때 쓰는 기본 이름일 뿐이며, 가리키는 이미지가 시간에 따라 바뀔 수 있다', 'latest 는 공식 이미지에만 있다'],
      answer: 2,
      explain: 'latest 는 기본 태그 이름일 뿐이고 무엇을 가리킬지는 올린 사람이 정합니다. 내 PC 의 latest 는 다시 pull 하기 전까지 그대로입니다.'
    },
    {
      q: 'pull 출력에 <code>51abee3c58a2: Already exists</code> 가 나왔습니다. 무슨 뜻인가요?',
      options: ['같은 이름의 이미지가 이미 있어서 pull 이 실패했다', '그 레이어가 다른 이미지 때문에 이미 내 PC 에 있어서 내려받지 않았다', '레지스트리에 같은 레이어가 두 개 있다', '이미지를 덮어썼다'],
      answer: 1,
      explain: '레이어는 여러 이미지가 공유합니다. 이미 가지고 있는 레이어는 다시 받지 않고 건너뜁니다.'
    },
    {
      q: '<code>docker tag nginx:alpine mysite:v1</code> 뒤 <code>docker images</code> 에서 두 줄의 IMAGE ID 는?',
      options: ['같다 — 이름표만 하나 더 붙은 같은 이미지다', '다르다 — 이미지가 복사되었다', 'mysite:v1 은 ID 가 없다', '다르다 — 태그마다 새 레이어가 생긴다'],
      answer: 0,
      explain: 'docker tag 는 이미지를 복사하지 않고 이름표(참조)만 추가합니다. 그래서 순식간에 끝나고 디스크도 늘지 않습니다.'
    },
    {
      q: '<code>docker images</code> 에 <code>&lt;none&gt;   &lt;none&gt;   df66cb378c02</code> 가 보입니다. 이 이미지만 안전하게 지우는 명령은?',
      options: ['docker image prune -a', 'docker system prune -a', 'docker image prune', 'docker rmi -f $(docker images -q)'],
      answer: 2,
      explain: 'docker image prune 은 댕글링(이름 없는) 이미지만 지웁니다. -a 를 붙이면 컨테이너가 쓰지 않는 이름 있는 이미지까지 모두 지웁니다.'
    },
    {
      q: '<code>docker rmi nginx:1.27</code> 이 "container … is using its referenced image" 오류로 실패했습니다. 가장 알맞은 해결 순서는?',
      options: ['docker rmi -f nginx:1.27 로 강제 삭제', '그 이미지를 쓰는 컨테이너를 docker rm 으로 지운 뒤 docker rmi', 'docker pull nginx:1.27 로 다시 받기', 'Docker 를 재시작'],
      answer: 1,
      explain: '컨테이너가 이미지를 붙잡고 있으므로 컨테이너부터 지웁니다. -f 로 억지로 지우면 이름표만 떨어진 댕글링 이미지가 남습니다.'
    },
    {
      q: '운영 서버에 배포할 파이썬 앱의 베이스 이미지로 가장 무난한 선택은?',
      options: ['python', 'python:latest', 'python:3.12-slim', 'someone/python-best'],
      answer: 2,
      explain: '공식 이미지 + 주 버전 고정 + slim(작고 호환성 좋음)이 무난한 첫 선택입니다. 태그 생략(latest)과 출처가 불분명한 개인 이미지는 피합니다.'
    }
  ]
});
