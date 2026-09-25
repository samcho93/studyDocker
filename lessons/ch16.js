/* 16장 — 개발 워크플로와 생태계 */
Course.lesson({
  id: 'ch16', no: '16',
  icon: '🛠️',
  title: '개발 워크플로와 생태계',
  subtitle: '코드 한 줄을 고치고 운영에 나가기까지 — 컨테이너로 이어지는 개발 · 테스트 · 배포 · 관측의 흐름',
  level: '실전', time: '120분',
  goals: [
    '바인드 마운트와 compose watch 로 "고치면 바로 반영되는" 개발 루프를 만들 수 있다',
    'Dev Container(devcontainer.json)와 GitHub Actions 워크플로 파일의 구조를 읽고 작성할 수 있다',
    '일회용 컨테이너로 테스트용 DB 를 띄우고 Testcontainers 의 개념을 설명할 수 있다',
    '같은 이미지를 태그로 dev → staging → prod 에 승격하는 배포 흐름을 설명할 수 있다',
    'Podman · nerdctl · Buildah 등 대안 도구와 Prometheus + Grafana 모니터링, 다음 공부 로드맵을 안다'
  ],
  chips: ['docker ps', 'docker compose up -d', 'curl -s localhost:5000', 'docker compose ps', 'open http://localhost:9090'],

  figs: {
    /* ---------------------------------------------------------------- 개발 루프 */
    loop: {
      caption: '개발 루프 — 이 원을 한 바퀴 도는 시간이 짧을수록 개발이 즐거워집니다. 바인드 마운트는 "빌드" 단계를 건너뛰게 해 줍니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="코드 수정, 빌드, 실행, 테스트로 도는 개발 루프와 바인드 마운트 지름길">
  <rect x="330" y="14" width="200" height="70" rx="14" class="blue"/>
  <text x="430" y="42" class="t-lg t-c">✏️</text>
  <text x="430" y="70" class="t-sm t-c t-b">① 코드 수정</text>
  <rect x="620" y="130" width="200" height="70" rx="14" class="purple"/>
  <text x="720" y="158" class="t-lg t-c">🏗️</text>
  <text x="720" y="186" class="t-sm t-c t-b">② 빌드 (docker build)</text>
  <rect x="330" y="246" width="200" height="70" rx="14" class="green"/>
  <text x="430" y="274" class="t-lg t-c">🏃</text>
  <text x="430" y="302" class="t-sm t-c t-b">③ 실행 (docker run)</text>
  <rect x="40" y="130" width="200" height="70" rx="14" class="orange"/>
  <text x="140" y="158" class="t-lg t-c">🧪</text>
  <text x="140" y="186" class="t-sm t-c t-b">④ 테스트 (curl · 브라우저)</text>
  <path d="M532,50 Q690,60 715,126" class="ln-blue thick ar-blue"/>
  <path d="M715,202 Q690,280 534,282" class="ln-purple thick ar-purple"/>
  <path d="M328,282 Q170,280 145,204" class="ln-green thick ar-green"/>
  <path d="M145,128 Q170,60 326,50" class="ln-orange thick ar-orange"/>
  <path d="M430,86 L430,242" class="ln-teal thick dash ar-teal moving"/>
  <rect x="446" y="140" width="150" height="50" rx="10" class="teal"/>
  <text x="521" y="160" class="t-xs t-c t-b">⚡ 바인드 마운트</text>
  <text x="521" y="178" class="t-xs t-c">빌드 없이 바로 반영</text>
</svg>`
    },

    /* ---------------------------------------------------------------- Dev Container */
    devcontainer: {
      caption: 'Dev Container — 편집기 화면은 내 PC 에, 언어 · 도구 · 확장은 컨테이너 안에. 팀원 모두가 똑같은 개발 환경을 파일 하나로 공유합니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="VS Code 가 devcontainer.json 을 읽어 개발 컨테이너를 만들고 소스를 마운트하는 구조">
  <rect x="10" y="14" width="300" height="272" rx="16" class="box"/>
  <text x="160" y="42" class="t-b t-c">💻 내 PC</text>
  <rect x="30" y="60" width="260" height="70" rx="12" class="blue"/>
  <text x="160" y="88" class="t-sm t-c t-b">VS Code (화면 · 키보드)</text>
  <text x="160" y="112" class="t-xs t-c">"Reopen in Container"</text>
  <rect x="30" y="150" width="260" height="116" rx="12" class="orange"/>
  <text x="160" y="176" class="t-sm t-c t-b">📁 프로젝트 폴더</text>
  <text x="160" y="202" class="t-xs t-c t-mono">.devcontainer/</text>
  <text x="160" y="222" class="t-xs t-c t-mono">  devcontainer.json</text>
  <text x="160" y="246" class="t-xs t-c t-mono">app.py · requirements.txt</text>
  <line x1="312" y1="95" x2="470" y2="95" class="ln-blue thick ar2"/>
  <text x="391" y="84" class="t-xs t-c t-blue">원격 연결</text>
  <line x1="292" y1="210" x2="470" y2="210" class="ln-orange thick ar-orange moving"/>
  <text x="381" y="200" class="t-xs t-c t-orange">바인드 마운트</text>
  <rect x="474" y="14" width="376" height="272" rx="16" class="green"/>
  <rect x="464" y="6" width="396" height="288" rx="20" class="nofill ln-green dash"/>
  <text x="662" y="42" class="t-b t-c t-green">📦 개발 컨테이너</text>
  <rect x="494" y="60" width="336" height="70" rx="12" class="box"/>
  <text x="662" y="88" class="t-sm t-c t-b">VS Code Server + 확장</text>
  <text x="662" y="112" class="t-xs t-c">파이썬 확장 · 린터 · 디버거</text>
  <rect x="494" y="150" width="160" height="116" rx="12" class="box"/>
  <text x="574" y="180" class="t-sm t-c t-b">🐍 Python 3.12</text>
  <text x="574" y="206" class="t-xs t-c">pip · git</text>
  <text x="574" y="230" class="t-xs t-c t-mono">/workspaces/…</text>
  <rect x="670" y="150" width="160" height="116" rx="12" class="box"/>
  <text x="750" y="180" class="t-sm t-c t-b">🔌 포트 5000</text>
  <text x="750" y="206" class="t-xs t-c">forwardPorts 로</text>
  <text x="750" y="230" class="t-xs t-c">내 PC 에 전달</text>
</svg>`
    },

    /* ---------------------------------------------------------------- CI/CD */
    cicd: {
      caption: 'CI/CD 파이프라인 — git push 한 번이면 로봇(GitHub Actions)이 빌드 · 테스트 · 스캔 · 푸시까지 대신 해 줍니다',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="git push 부터 checkout, buildx, login, build-push, 레지스트리, 배포까지의 흐름">
  <rect x="10" y="70" width="110" height="80" rx="12" class="gray"/>
  <text x="65" y="102" class="t-lg t-c">👩‍💻</text>
  <text x="65" y="134" class="t-sm t-c t-b">git push</text>
  <line x1="122" y1="110" x2="146" y2="110" class="ln ar"/>
  <rect x="150" y="30" width="520" height="160" rx="16" class="nofill ln-blue dash"/>
  <text x="410" y="52" class="t-sm t-c t-b t-blue">⚙️ GitHub Actions 러너 (ubuntu-latest)</text>
  <rect x="166" y="70" width="112" height="80" rx="10" class="blue"/>
  <text x="222" y="100" class="t-xs t-c t-b">① checkout</text>
  <text x="222" y="122" class="t-xs t-c">코드 받기</text>
  <line x1="280" y1="110" x2="292" y2="110" class="ln-blue ar-blue"/>
  <rect x="294" y="70" width="112" height="80" rx="10" class="blue"/>
  <text x="350" y="100" class="t-xs t-c t-b">② buildx</text>
  <text x="350" y="122" class="t-xs t-c">빌더 준비</text>
  <line x1="408" y1="110" x2="420" y2="110" class="ln-blue ar-blue"/>
  <rect x="422" y="70" width="112" height="80" rx="10" class="blue"/>
  <text x="478" y="100" class="t-xs t-c t-b">③ login</text>
  <text x="478" y="122" class="t-xs t-c">secrets 로 로그인</text>
  <line x1="536" y1="110" x2="548" y2="110" class="ln-blue ar-blue"/>
  <rect x="550" y="70" width="108" height="80" rx="10" class="purple"/>
  <text x="604" y="100" class="t-xs t-c t-b">④ build-push</text>
  <text x="604" y="122" class="t-xs t-c">빌드 → 푸시</text>
  <line x1="672" y1="110" x2="696" y2="110" class="ln-purple ar-purple moving"/>
  <rect x="700" y="70" width="170" height="80" rx="12" class="teal"/>
  <text x="785" y="102" class="t-lg t-c">🏪</text>
  <text x="785" y="134" class="t-sm t-c t-b">레지스트리</text>
  <rect x="166" y="206" width="492" height="36" rx="8" class="red"/>
  <text x="412" y="224" class="t-xs t-c">🧪 테스트 · 🐞 docker scout 스캔을 사이에 끼워 실패하면 푸시하지 않기</text>
  <line x1="785" y1="152" x2="785" y2="200" class="ln-green ar-green"/>
  <text x="785" y="222" class="t-xs t-c t-green t-b">🚀 서버 · 쿠버네티스에 배포</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 승격 */
    promote: {
      caption: '"한 번 빌드해서 여러 번 배포" — 환경마다 다시 빌드하지 않고, 검증된 같은 이미지(같은 다이제스트)에 태그만 붙여 승격합니다',
      svg: `<svg class="dg" viewBox="0 0 860 280" role="img" aria-label="하나의 이미지를 dev, staging, prod 환경으로 승격하는 흐름">
  <rect x="20" y="90" width="170" height="100" rx="14" class="purple"/>
  <text x="105" y="118" class="t-sm t-c t-b">🧱 이미지 1개</text>
  <text x="105" y="144" class="t-xs t-c t-mono">myapp:3f2a9c1</text>
  <text x="105" y="166" class="t-xs t-c t-mono">sha256:ab12…</text>
  <line x1="192" y1="140" x2="236" y2="140" class="ln-purple thick ar-purple"/>
  <rect x="240" y="30" width="170" height="220" rx="14" class="blue"/>
  <text x="325" y="58" class="t-b t-c t-blue">🧪 dev</text>
  <text x="325" y="90" class="t-xs t-c t-mono">:3f2a9c1</text>
  <text x="325" y="112" class="t-xs t-c t-mono">:dev</text>
  <text x="325" y="150" class="t-xs t-c">커밋마다 자동 배포</text>
  <text x="325" y="172" class="t-xs t-c">개발자 확인</text>
  <line x1="412" y1="140" x2="446" y2="140" class="ln-orange thick ar-orange"/>
  <text x="429" y="128" class="t-xs t-c t-orange">통과</text>
  <rect x="450" y="30" width="170" height="220" rx="14" class="orange"/>
  <text x="535" y="58" class="t-b t-c t-orange">🎭 staging</text>
  <text x="535" y="90" class="t-xs t-c t-mono">:1.4.0-rc1</text>
  <text x="535" y="112" class="t-xs t-c t-mono">:staging</text>
  <text x="535" y="150" class="t-xs t-c">운영과 같은 환경</text>
  <text x="535" y="172" class="t-xs t-c">통합 테스트 · QA</text>
  <line x1="622" y1="140" x2="656" y2="140" class="ln-green thick ar-green"/>
  <text x="639" y="128" class="t-xs t-c t-green">승인</text>
  <rect x="660" y="30" width="180" height="220" rx="14" class="green"/>
  <text x="750" y="58" class="t-b t-c t-green">🚀 prod</text>
  <text x="750" y="90" class="t-xs t-c t-mono">:1.4.0</text>
  <text x="750" y="112" class="t-xs t-c t-mono">:1.4 · :1</text>
  <text x="750" y="150" class="t-xs t-c">실제 사용자</text>
  <text x="750" y="172" class="t-xs t-c">문제 시 이전 태그로</text>
  <text x="750" y="194" class="t-xs t-c">롤백</text>
  <text x="430" y="272" class="t-xs t-c t-mu">설정(DB 주소 · 비밀번호)은 이미지가 아니라 환경 변수 · secrets 로 환경마다 다르게</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 모니터링 */
    monitoring: {
      caption: 'Prometheus 가 주기적으로 지표를 긁어 오고(scrape), Grafana 가 그것을 대시보드로 그립니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="앱과 exporter 에서 Prometheus 가 지표를 수집하고 Grafana 가 시각화하는 구조">
  <rect x="10" y="14" width="840" height="272" rx="16" class="nofill ln dash"/>
  <text x="30" y="38" class="t-sm t-b">🔗 compose 네트워크 monitoring_default</text>
  <rect x="30" y="60" width="200" height="80" rx="12" class="green"/>
  <text x="130" y="90" class="t-sm t-c t-b">📦 내 앱</text>
  <text x="130" y="116" class="t-xs t-c t-mono">/metrics</text>
  <rect x="30" y="170" width="200" height="80" rx="12" class="teal"/>
  <text x="130" y="200" class="t-sm t-c t-b">📊 cAdvisor · exporter</text>
  <text x="130" y="226" class="t-xs t-c">컨테이너 CPU · 메모리</text>
  <rect x="320" y="100" width="220" height="110" rx="14" class="orange"/>
  <text x="430" y="132" class="t-lg t-c">🔥</text>
  <text x="430" y="164" class="t-sm t-c t-b">Prometheus :9090</text>
  <text x="430" y="188" class="t-xs t-c">시계열 DB · 15초마다 수집</text>
  <line x1="316" y1="130" x2="234" y2="100" class="ln-orange ar-orange moving"/>
  <line x1="316" y1="180" x2="234" y2="210" class="ln-orange ar-orange moving"/>
  <text x="275" y="150" class="t-xs t-c t-orange">scrape</text>
  <rect x="630" y="100" width="200" height="110" rx="14" class="purple"/>
  <text x="730" y="132" class="t-lg t-c">📈</text>
  <text x="730" y="164" class="t-sm t-c t-b">Grafana :3000</text>
  <text x="730" y="188" class="t-xs t-c">대시보드 · 알림</text>
  <line x1="626" y1="155" x2="544" y2="155" class="ln-purple ar-purple"/>
  <text x="585" y="144" class="t-xs t-c t-purple">질의</text>
  <text x="730" y="250" class="t-xs t-c t-mu">👀 브라우저로 localhost:3000</text>
</svg>`
    }
  },

  files: {
    devloop: {
      '~/devloop/app.py': `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, dev loop! v1'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
`,
      '~/devloop/requirements.txt': `flask
`,
      '~/devloop/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
`,
      '~/devloop/.dockerignore': `.git
.env
__pycache__
`
    },
    monitoring: {
      '~/monitoring/compose.yaml': `services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prom-data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin123
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prom-data:
  grafana-data:
`,
      '~/monitoring/prometheus.yml': `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
`
    },
    cibroken: {
      '~/ci-app/app.py': `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'CI OK'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
`,
      '~/ci-app/requirements.txt': `flask
`,
      '~/ci-app/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
`,
      '~/ci-app/.dockerignore': `.git
*.txt
.env
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '개발 루프 — 고치고, 돌리고, 확인하고',
      html: `
<p>지금까지는 이미지를 "만들고 실행하는" 법을 배웠습니다. 실제 개발에서는 이 과정을 하루에도 수백 번 반복합니다.
<b>코드 수정 → 빌드 → 실행 → 테스트</b> 한 바퀴를 <b>개발 루프(inner loop)</b> 라고 하고, 이 바퀴가 빠를수록 생산성이 올라갑니다.</p>

{{fig:loop}}

<p>코드를 한 글자 고칠 때마다 <code>docker build</code> 를 다시 하면 느립니다. 그래서 개발할 때는 소스 폴더를 컨테이너에
<b>바인드 마운트</b>(5장)해서 "내 PC 의 파일 = 컨테이너의 파일"로 만듭니다. 먼저 실습 파일을 준비하세요.</p>

{{widget:files|set=devloop|cd=~/devloop|title=개발 루프 예제 만들기}}

<div class="two"><div>
<pre class="code" data-lang="Dockerfile" data-file="~/devloop/Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]</code></pre>
<pre class="code" data-lang="text" data-file="~/devloop/requirements.txt"><code>flask</code></pre>
</div><div>
<pre class="code" data-lang="python" data-file="~/devloop/app.py"><code>from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, dev loop! v1'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)</code></pre>
</div></div>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/devloop
docker build -t devloop:dev .
docker run -d --name dev -p 5000:5000 -v "$PWD":/app devloop:dev
curl -s localhost:5000</code></pre>

<pre class="code out" data-lang="출력"><code>Hello, dev loop! v1</code></pre>

<p>이제 이미지를 다시 빌드하지 <b>않고</b> 코드만 고쳐 봅시다. 아래 블록의 <b>📄 파일로 저장</b>을 누르면 app.py 가 v2 로 바뀝니다.</p>

<pre class="code" data-lang="python" data-file="~/devloop/app.py"><code>from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, dev loop! v2'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)</code></pre>

<pre class="code" data-lang="bash" data-run="sh"><code>docker restart dev
curl -s localhost:5000</code></pre>

<pre class="code out" data-lang="출력"><code>dev
Hello, dev loop! v2</code></pre>

<div class="box tip"><div class="box-t">💡 재시작도 귀찮다면</div>
Flask 의 <code>debug=True</code>, Node 의 <code>nodemon</code>, <code>uvicorn --reload</code> 처럼 파일 변경을 감지해 스스로 다시 시작하는 개발 서버를 쓰면
저장만 해도 반영됩니다. 이 실습 터미널에서는 <code>docker restart</code> 로 확실하게 확인하세요.
</div>

<h4>Compose 로 개발 환경 묶기 — compose watch</h4>
<p>Compose 에는 파일이 바뀌면 컨테이너에 자동으로 복사(sync)하거나 다시 빌드(rebuild)하는 <code>develop.watch</code> 기능이 있습니다.
바인드 마운트와 달리 운영용 이미지 구조를 그대로 유지하면서 빠른 루프를 얻을 수 있습니다.</p>

<pre class="code" data-lang="yaml" data-file="~/devloop/compose.yaml"><code>services:
  web:
    build: .
    ports:
      - "5000:5000"
    develop:
      watch:
        - action: sync          # 소스가 바뀌면 컨테이너로 복사
          path: .
          target: /app
        - action: rebuild       # 의존성이 바뀌면 이미지 다시 빌드
          path: requirements.txt</code></pre>

<p>아래 블록의 마지막 줄 <code>docker compose watch</code> 는 끝나지 않는 명령입니다. 확인한 뒤 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f dev
cd ~/devloop
docker compose up -d --build
docker compose watch</code></pre>

<div class="box dev"><div class="box-t">👩‍💻 inner loop 와 outer loop</div>
내 PC 에서 도는 빠른 루프가 <b>inner loop</b>, git push 이후 CI 가 빌드 · 테스트 · 배포하는 느린 루프가 <b>outer loop</b> 입니다.
inner loop 는 바인드 마운트 · watch 로 빠르게, outer loop 는 CI/CD 로 자동으로 — 이 장의 나머지가 outer loop 이야기입니다.
</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'Dev Containers — 개발 환경 자체를 컨테이너로',
      html: `
<p>새 팀원이 오면 "파이썬 몇 버전 깔고, 이 패키지 깔고, 확장 깔고…" 하며 하루를 쓰곤 합니다.
<b>Dev Container</b> 는 개발 환경 전체(언어 · 도구 · 편집기 확장 · 포트 설정)를 <code>.devcontainer/devcontainer.json</code> 파일 하나로 정의해,
누구나 <b>똑같은 환경</b>에서 개발하게 해 주는 공개 규격(containers.dev)입니다. VS Code, JetBrains IDE, GitHub Codespaces 가 지원합니다.</p>

{{fig:devcontainer}}

<pre class="code" data-lang="json" data-file="~/devloop/.devcontainer/devcontainer.json"><code>{
  "name": "devloop (Python)",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",
  "forwardPorts": [5000],
  "postCreateCommand": "pip install -r requirements.txt",
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python"]
    }
  }
}</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>항목</th><th>뜻</th></tr>
<tr><td><code>image</code></td><td>개발 컨테이너로 쓸 이미지. 직접 Dockerfile 을 쓰려면 <code>"build": { "dockerfile": "Dockerfile" }</code>, Compose 를 쓰려면 <code>"dockerComposeFile"</code></td></tr>
<tr><td><code>forwardPorts</code></td><td>컨테이너의 포트를 내 PC 로 전달 (브라우저로 localhost:5000)</td></tr>
<tr><td><code>postCreateCommand</code></td><td>컨테이너를 처음 만든 뒤 한 번 실행할 명령 (의존성 설치 등)</td></tr>
<tr><td><code>customizations.vscode.extensions</code></td><td>컨테이너 안에 자동으로 설치할 VS Code 확장</td></tr>
<tr><td><code>features</code></td><td>"Docker CLI 추가", "Node 추가" 같은 도구 꾸러미를 한 줄로 덧붙이기</td></tr>
</table></div>

<ol class="steps-list">
<li>VS Code 에 <b>Dev Containers</b> 확장을 설치합니다 (Docker 가 실행 중이어야 함).</li>
<li>프로젝트 폴더를 열면 "Reopen in Container" 알림이 뜹니다. 누르면 이미지를 받아 개발 컨테이너를 만듭니다.</li>
<li>터미널 · 디버거 · 확장이 모두 컨테이너 안에서 돕니다. 소스 코드는 내 PC 폴더가 마운트되어 있어 그대로 남습니다.</li>
</ol>

<div class="box note"><div class="box-t">📌 JSON 속 주석</div>
devcontainer.json 은 주석(<code>//</code>)을 허용하는 JSONC 형식입니다. 위 예제는 어느 도구에서도 읽히도록 주석 없이 썼습니다.
</div>`
    },

    /* ================================================================ 3 */
    {
      title: 'CI/CD — GitHub Actions 로 이미지 자동 빌드 · 푸시',
      html: `
<p><b>CI(Continuous Integration, 지속적 통합)</b> 는 코드를 올릴 때마다 자동으로 빌드 · 테스트하는 것,
<b>CD(Continuous Delivery/Deployment, 지속적 배포)</b> 는 통과한 결과물을 자동으로 배포 가능한 상태로 만드는 것입니다.
컨테이너 세상에서 CI 의 결과물은 곧 <b>레지스트리에 올라간 이미지</b>입니다.</p>

{{fig:cicd}}

<p>GitHub 저장소에 <code>.github/workflows/</code> 폴더를 만들고 YAML 파일을 넣으면, push 할 때마다 GitHub 의 서버(러너)가 그 내용을 실행합니다.
Docker 가 공식으로 제공하는 액션 세 개를 조합하는 것이 표준 패턴입니다.</p>

<pre class="code" data-lang="yaml" data-file="~/devloop/.github/workflows/docker.yml"><code>name: docker-image

on:
  push:
    branches: ["main"]
    tags: ["v*"]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 코드 가져오기
        uses: actions/checkout@v4

      - name: Buildx(BuildKit) 준비
        uses: docker/setup-buildx-action@v3

      - name: Docker Hub 로그인
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          username: \${{ vars.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}

      - name: 빌드하고 푸시
        uses: docker/build-push-action@v6
        with:
          context: .
          push: \${{ github.event_name != 'pull_request' }}
          tags: |
            \${{ vars.DOCKERHUB_USERNAME }}/devloop:latest
            \${{ vars.DOCKERHUB_USERNAME }}/devloop:\${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max</code></pre>

<div class="tbl-wrap"><table class="tbl">
<tr><th>부분</th><th>뜻</th></tr>
<tr><td><code>on:</code></td><td>언제 실행할지 — main 브랜치 push, <code>v</code> 로 시작하는 태그, PR</td></tr>
<tr><td><code>docker/setup-buildx-action</code></td><td>BuildKit 빌더 준비 (캐시 · 멀티 플랫폼 빌드 가능)</td></tr>
<tr><td><code>docker/login-action</code></td><td>레지스트리 로그인. 비밀번호 대신 <b>액세스 토큰</b>을 저장소 Settings → Secrets 에 넣고 <code>secrets.이름</code> 으로 참조</td></tr>
<tr><td><code>docker/build-push-action</code></td><td><code>docker buildx build --push</code> 와 같은 일. PR 에서는 빌드만 하고 푸시하지 않음</td></tr>
<tr><td><code>github.sha</code></td><td>커밋 해시 — 어떤 코드로 만든 이미지인지 태그로 추적</td></tr>
<tr><td><code>cache-from/to: type=gha</code></td><td>GitHub Actions 캐시에 레이어 캐시를 저장해 다음 빌드를 빠르게</td></tr>
</table></div>

<div class="box warn"><div class="box-t">⚠️ 비밀번호를 YAML 에 쓰지 마세요</div>
워크플로 파일은 저장소에 그대로 공개됩니다. 토큰은 반드시 GitHub 의 <b>Secrets</b> 에 저장하고 <code>\${{ secrets.… }}</code> 로만 참조하세요(13장).
액션 버전(<code>@v4</code>, <code>@v6</code>)은 각 액션 저장소에서 최신을 확인하고, 보안을 더 챙기려면 커밋 해시로 고정합니다.
</div>

<div class="box dev"><div class="box-t">👩‍💻 파이프라인에 넣으면 좋은 것들</div>
<code>docker/metadata-action</code> 으로 태그 · 라벨 자동 생성, 테스트 단계, <code>docker/scout-action</code> 으로 CVE 스캔(실패 시 중단),
<code>platforms: linux/amd64,linux/arm64</code> 로 멀티 플랫폼 빌드, <code>provenance</code> · <code>sbom</code> 첨부(13장). GitLab CI · Jenkins 도 같은 흐름입니다.
</div>`
    },

    /* ================================================================ 4 */
    {
      title: '테스트용 컨테이너 — 일회용 DB 와 Testcontainers',
      html: `
<p>테스트를 하려면 진짜 데이터베이스가 필요할 때가 많습니다. 공용 개발 DB 를 같이 쓰면 서로의 데이터가 섞이고, 가짜(mock) DB 는 실제와 달라 버그를 놓칩니다.
컨테이너라면 <b>테스트할 때만 깨끗한 DB 를 띄웠다가 버리면</b> 됩니다.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 일회용 실험 접시</div>
실험할 때마다 새 접시를 꺼내 쓰고 버리면, 지난 실험의 찌꺼기가 결과를 망칠 일이 없습니다. <code>--rm</code> 컨테이너가 바로 일회용 접시입니다.
</div>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --rm --name testdb -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16-alpine
sleep 3
docker exec testdb psql -U postgres -c 'SELECT 1'
docker stop testdb
sleep 1
docker ps -a --filter name=testdb</code></pre>

<pre class="code out" data-lang="출력"><code> ?column?
----------
        1
(1 row)

testdb
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES</code></pre>

<p><code>--rm</code> 덕분에 멈추는 순간 컨테이너가 사라집니다. 볼륨도 붙이지 않았으니 데이터도 깨끗이 없어지죠. 다음 테스트는 다시 새 DB 로 시작합니다.</p>

<h4>Testcontainers — 테스트 코드가 컨테이너를 직접 띄운다</h4>
<p><b>Testcontainers</b> 는 Java · Python · Go · Node · .NET 등에서 쓰는 라이브러리로, 테스트 코드 안에서 "postgres 컨테이너 하나 줘" 하면
Docker 로 띄우고, 접속 주소를 알려 주고, 테스트가 끝나면 알아서 지워 줍니다. 포트 충돌을 피하려고 <b>무작위 호스트 포트</b>를 씁니다.</p>

<pre class="code" data-lang="python" data-file="~/devloop/test_db.py"><code>from testcontainers.postgres import PostgresContainer
import sqlalchemy


def test_select_one():
    # with 블록이 시작될 때 컨테이너 실행, 끝나면 자동 삭제
    with PostgresContainer("postgres:16-alpine") as pg:
        engine = sqlalchemy.create_engine(pg.get_connection_url())
        with engine.connect() as conn:
            assert conn.execute(sqlalchemy.text("SELECT 1")).scalar() == 1</code></pre>

<div class="vs">
<div class="vs-a orange"><b>공용 개발 DB</b><ul><li>데이터가 섞이고 순서에 따라 결과가 바뀜</li><li>동시에 테스트하면 충돌</li></ul></div>
<div class="vs-mid">VS</div>
<div class="vs-b green"><b>일회용 컨테이너 DB</b><ul><li>매번 깨끗한 상태에서 시작</li><li>CI 에서도 똑같이 동작 (러너에 Docker 가 있음)</li></ul></div>
</div>`
    },

    /* ================================================================ 5 */
    {
      title: '이미지 태그와 배포 흐름 — dev → staging → prod',
      html: `
<p>운영 환경에 나가기 전에 보통 <b>dev(개발)</b> → <b>staging(운영과 똑같은 리허설 무대)</b> → <b>prod(실제 운영)</b> 을 거칩니다.
핵심 원칙은 <b>"한 번 빌드해서 여러 번 배포(build once, deploy many)"</b> 입니다. staging 에서 검증한 바로 그 이미지를 prod 에 올려야,
"테스트한 것과 운영하는 것이 다르다"는 사고가 없습니다.</p>

{{fig:promote}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>태그 방식</th><th>예</th><th>쓰임</th></tr>
<tr><td>커밋 해시</td><td><code>myapp:3f2a9c1</code></td><td>어떤 코드로 만들었는지 정확히 추적. CI 가 자동으로 붙임</td></tr>
<tr><td>유의적 버전(SemVer)</td><td><code>myapp:1.4.0</code>, <code>:1.4</code>, <code>:1</code></td><td>사람이 읽는 릴리스 버전. git 태그 <code>v1.4.0</code> 과 맞춤</td></tr>
<tr><td>환경 이름</td><td><code>myapp:staging</code>, <code>:prod</code></td><td>"지금 staging 에 뭐가 떠 있나" 표시용 (움직이는 태그)</td></tr>
<tr><td>latest</td><td><code>myapp:latest</code></td><td>편하지만 무엇인지 모호 — 운영 배포에는 쓰지 않기</td></tr>
</table></div>

<p>11장에서 배운 사설 레지스트리로 승격을 흉내 내 봅시다. (5000 포트는 개발 서버가 쓰고 있으니 레지스트리는 5001 에 띄웁니다)</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name registry -p 5001:5000 registry:2
docker tag devloop:dev localhost:5001/devloop:1.0.0
docker tag devloop:dev localhost:5001/devloop:staging
docker push localhost:5001/devloop:1.0.0
docker push localhost:5001/devloop:staging
curl -s localhost:5001/v2/devloop/tags/list</code></pre>

<p>두 태그는 이름만 다를 뿐 같은 이미지(같은 다이제스트)를 가리킵니다. 검증이 끝나면 같은 이미지에 <code>prod</code> 태그를 하나 더 붙여 푸시하는 것이 "승격"입니다.
문제가 생기면 prod 를 이전 버전 태그로 되돌리는 것이 "롤백"이고요.</p>

<div class="box tip"><div class="box-t">💡 환경마다 달라야 하는 것은 이미지 밖에</div>
DB 주소 · 비밀번호 · 로그 수준처럼 환경마다 다른 값은 이미지에 굽지 말고 <b>환경 변수 · secrets · 설정 파일</b>로 넣습니다(8장, 13장).
그래야 같은 이미지를 어느 환경에나 올릴 수 있습니다. 이것이 유명한 <b>Twelve-Factor App</b> 의 "설정은 환경에" 원칙입니다.
</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'Docker 만 있는 것은 아니다 — 대안 도구와 Docker Desktop',
      html: `
<p>14장에서 본 것처럼 컨테이너는 OCI 표준 위에 서 있어서, Docker 가 아닌 도구도 같은 이미지를 만들고 돌릴 수 있습니다.
회사나 환경에 따라 다른 도구를 만나도 당황하지 않도록 이름과 쓰임을 알아 둡시다.</p>

<div class="tbl-wrap"><table class="tbl">
<tr><th>도구</th><th>무엇인가</th><th>언제 만나나</th></tr>
<tr><td>🦭 <b>Podman</b></td><td>데몬 없이 rootless 가 기본인 Docker 호환 CLI. <code>podman run</code> 이 <code>docker run</code> 과 거의 같고, Pod 개념 지원</td><td>RHEL · Fedora 계열, 보안이 엄격한 곳</td></tr>
<tr><td>📦 <b>containerd + nerdctl</b></td><td>Docker 아래에 있던 containerd 를 직접 쓰는 Docker 호환 CLI</td><td>쿠버네티스 노드, 가벼운 환경</td></tr>
<tr><td>🏗️ <b>Buildah</b></td><td>데몬 없이 OCI 이미지를 빌드하는 도구 (Dockerfile 또는 스크립트)</td><td>Podman 과 짝, CI 에서 rootless 빌드</td></tr>
<tr><td>☸️ <b>Kaniko</b></td><td>쿠버네티스 파드 안에서 Docker 데몬 없이 Dockerfile 을 빌드</td><td>쿠버네티스 기반 CI (docker.sock 을 쓰지 않기 위해)</td></tr>
<tr><td>🍎 <b>Colima</b></td><td>맥에서 가벼운 리눅스 VM 으로 Docker(또는 containerd) 엔진을 제공하는 오픈소스</td><td>Docker Desktop 대신 맥에서</td></tr>
<tr><td>🐮 <b>Rancher Desktop</b></td><td>데스크톱용 컨테이너 + 쿠버네티스(k3s) 환경. dockerd · containerd 선택 가능</td><td>로컬 쿠버네티스 실습</td></tr>
<tr><td>🚀 <b>OrbStack</b></td><td>맥 전용의 빠르고 가벼운 Docker · 리눅스 VM 앱 (상용, 개인 무료)</td><td>맥에서 빠른 로컬 개발</td></tr>
</table></div>

<pre class="code" data-lang="bash"><code># Podman 은 명령이 거의 같아서 이렇게 바꿔 쓰기도 합니다 (실제 환경 예시)
podman run -d --name web -p 8080:80 docker.io/library/nginx
alias docker=podman</code></pre>

<h4>Docker Desktop 의 부가 기능</h4>
<div class="cards c3">
<div class="card blue"><div class="ci">🧩</div><b>Extensions</b><p>Desktop 화면 안에 로그 탐색 · 디스크 정리 · 보안 스캔 같은 확장을 설치 (Marketplace).</p></div>
<div class="card red"><div class="ci">🐞</div><b>Docker Scout</b><p>이미지 목록에서 바로 CVE 와 추천 기반 이미지 확인 (13장의 CLI 와 같은 데이터).</p></div>
<div class="card green"><div class="ci">✨</div><b>docker init</b><p>프로젝트를 분석해 Dockerfile · compose.yaml · .dockerignore 초안을 만들어 주는 명령.</p></div>
</div>

<div class="box note"><div class="box-t">📌 라이선스 확인</div>
Docker Desktop 은 개인 · 교육 · 소규모 기업은 무료지만, 일정 규모 이상의 회사는 유료 구독이 필요합니다. 리눅스 서버의 <b>Docker Engine</b> 은 오픈소스로 무료입니다.
회사에서 쓸 때는 조건을 확인하세요.
</div>`
    },

    /* ================================================================ 7 */
    {
      title: '모니터링 — Prometheus + Grafana 를 Compose 로',
      html: `
<p>운영 중인 서비스는 "지금 괜찮은가?"를 계속 지켜봐야 합니다. <code>docker stats</code> 는 한 서버에서 지금 이 순간만 보여 주므로,
실무에서는 지표를 <b>모아서 저장하고 그래프로 보는</b> 도구를 씁니다. 가장 유명한 짝이 <b>Prometheus</b>(수집 · 저장)와 <b>Grafana</b>(시각화)입니다.</p>

{{fig:monitoring}}

{{widget:files|set=monitoring|cd=~/monitoring|title=모니터링 스택 파일 만들기}}

<pre class="code" data-lang="yaml" data-file="~/monitoring/compose.yaml"><code>services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prom-data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin123
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prom-data:
  grafana-data:</code></pre>

<pre class="code" data-lang="yaml" data-file="~/monitoring/prometheus.yml"><code>global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]</code></pre>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/monitoring
docker compose up -d
docker compose ps
sleep 3
curl -s localhost:9090</code></pre>

{{widget:open|url=http://localhost:9090/|label=🌐 Prometheus 열기 (localhost:9090)}} {{widget:open|url=http://localhost:3000/|label=🌐 Grafana 열기 (localhost:3000)}}

<ol class="steps-list">
<li><b>Prometheus</b>(localhost:9090) 검색창에 <code>up</code> 을 넣고 Execute — 수집 대상이 살아 있으면 1 이 나옵니다.</li>
<li><b>Grafana</b>(localhost:3000)에 admin / admin123 으로 로그인합니다.</li>
<li>Connections → Data sources → Prometheus 추가, 주소는 <code>http://prometheus:9090</code> (같은 Compose 네트워크라 <b>서비스 이름</b>으로 접속).</li>
<li>대시보드를 만들거나, 공개된 대시보드를 ID 로 가져옵니다(Import).</li>
</ol>

<div class="box tip"><div class="box-t">💡 컨테이너 지표까지 보려면</div>
컨테이너별 CPU · 메모리를 수집하려면 <b>cAdvisor</b>(<code>gcr.io/cadvisor/cadvisor</code>)나 <b>node-exporter</b> 를 서비스로 추가하고
prometheus.yml 의 <code>targets</code> 에 넣습니다. 로그는 Loki, 추적은 Tempo · Jaeger 를 붙이면 "관측성(observability)" 3종 세트가 됩니다.
</div>

<h4>Portainer — 컨테이너 관리 웹 UI</h4>
<p><b>Portainer</b> 는 컨테이너 · 이미지 · 볼륨 · 스택을 웹 화면에서 관리하는 도구입니다. Docker 를 조종해야 하므로 <code>docker.sock</code> 을 마운트합니다.
13장에서 배운 대로 이것은 <b>호스트 root 권한을 주는 것</b>이므로, 믿을 수 있는 공식 이미지만 쓰고 외부에 함부로 열지 마세요.</p>

<pre class="code" data-lang="bash"><code>docker volume create portainer_data
docker run -d --name portainer -p 9443:9443 --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce</code></pre>`
    },

    /* ================================================================ 8 */
    {
      title: '다음 공부 로드맵',
      html: `
<p>여기까지 온 여러분은 컨테이너를 만들고, 묶고, 배포하고, 지키고, 속까지 들여다봤습니다. 다음 걸음은 무엇이 좋을까요?</p>

<ol class="timeline">
<li class="blue"><span class="tl-y">1단계</span><b>쿠버네티스 깊이 파기</b><p>15장의 Pod · Deployment · Service 다음으로 Ingress, ConfigMap · Secret, PersistentVolume, Helm 차트, HPA(자동 확장). 로컬에서 kind · minikube 로 연습.</p></li>
<li class="teal"><span class="tl-y">2단계</span><b>클라우드 컨테이너 서비스</b><p>쿠버네티스 없이 컨테이너만 올리면 되는 서비스부터: AWS <b>ECS</b>(Fargate), Google <b>Cloud Run</b>, Azure <b>Container Apps(ACA)</b>. 관리형 쿠버네티스는 EKS · GKE · AKS.</p></li>
<li class="purple"><span class="tl-y">3단계</span><b>관측성 (Observability)</b><p>지표(Prometheus) · 로그(Loki, ELK) · 추적(OpenTelemetry, Jaeger). "왜 느린가"를 데이터로 답하기.</p></li>
<li class="orange"><span class="tl-y">4단계</span><b>자동화 · 인프라 코드</b><p>GitHub Actions 심화, Terraform 으로 클라우드 자원 코드화, Argo CD 같은 GitOps 도구.</p></li>
<li class="red"><span class="tl-y">5단계</span><b>보안 · 공급망</b><p>이미지 서명 · SBOM 을 파이프라인에 넣기, 정책 엔진(OPA, Kyverno), 런타임 보안(Falco).</p></li>
</ol>

<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>Cloud Run</th><th>ECS (Fargate)</th><th>Container Apps</th><th>쿠버네티스(EKS · GKE · AKS)</th></tr>
<tr><td>제공</td><td>Google Cloud</td><td>AWS</td><td>Azure</td><td>모든 클라우드</td></tr>
<tr><td>필요한 것</td><td>이미지 하나</td><td>이미지 + 작업 정의</td><td>이미지 하나</td><td>이미지 + YAML 여러 개</td></tr>
<tr><td>0 으로 축소</td><td>✅</td><td>△ (설정 필요)</td><td>✅</td><td>△ (추가 도구)</td></tr>
<tr><td>난이도</td><td>😀 쉬움</td><td>🙂 보통</td><td>😀 쉬움</td><td>😓 어려움 · 자유도 최고</td></tr>
</table></div>

<div class="box trend"><div class="box-t">🚀 최신 동향</div>
AI · 머신러닝 모델도 컨테이너로 배포하는 것이 표준이 되었고(GPU 컨테이너, 모델 서빙 이미지), WebAssembly(Wasm)를 컨테이너처럼 돌리는 실험,
개발 환경을 통째로 클라우드에 두는 Codespaces · 원격 개발 환경도 늘고 있습니다. 모두 이 강좌에서 배운 이미지 · 레지스트리 · 격리 개념 위에 있습니다.
</div>`
    },

    /* ================================================================ 9 */
    {
      title: '전체 복습 프로젝트 — 나만의 서비스를 끝까지',
      html: `
<p>배운 것을 한 프로젝트로 엮어 보면 오래 기억에 남습니다. 아래 과제를 차례로 해 보세요. 괄호는 복습할 장입니다.</p>

<div class="box practice"><div class="box-t">🧪 프로젝트 — "방문자 카운터 서비스"</div>
<ol class="steps-list">
<li><b>앱 만들기</b> — Flask(또는 Express) 앱이 Redis 로 방문 횟수를 세어 보여 준다 (6장, 10장).</li>
<li><b>좋은 Dockerfile</b> — slim 기반 멀티 스테이지, 캐시 순서, <code>USER</code>, <code>HEALTHCHECK</code>, <code>.dockerignore</code> (7장, 13장).</li>
<li><b>Compose 로 묶기</b> — web + redis + nginx 리버스 프록시, 볼륨으로 Redis 데이터 보존, 사용자 정의 네트워크 (5장, 9장, 10장).</li>
<li><b>설정 · 자원</b> — 비밀번호는 .env · secrets, 메모리 제한 · 재시작 정책 · 헬스체크 (8장, 13장).</li>
<li><b>개발 루프</b> — compose watch 또는 바인드 마운트, devcontainer.json 추가 (16장).</li>
<li><b>CI/CD</b> — GitHub Actions 로 빌드 · scout 스캔 · GHCR 푸시, 커밋 해시 태그 (11장, 13장, 16장).</li>
<li><b>관측</b> — Prometheus + Grafana 를 붙여 컨테이너 지표 보기 (16장).</li>
<li><b>확장</b> — 같은 이미지를 kind/minikube 의 Deployment 로 올리고 replicas 3 으로 늘리기 (15장).</li>
<li><b>일부러 고장 내기</b> — 포트 충돌, OOM, 이름 DNS 실패를 재현하고 로그 · inspect 로 원인 찾기 (12장).</li>
</ol>
</div>

<div class="stats">
<div class="stat blue"><b>16장</b><span>여기까지 온 여러분</span></div>
<div class="stat green"><b>1개</b><span>어디서나 도는 이미지</span></div>
<div class="stat purple"><b>∞</b><span>앞으로 만들 서비스</span></div>
</div>

<p>마지막으로, 오른쪽 🎯 미션에서 이 장의 흐름을 직접 따라가 보세요. 수고하셨습니다! 🐳</p>

{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: '바인드 마운트로 개발 컨테이너 띄우기',
      desc: '📁 파일 준비(<code>~/devloop</code>)를 한 뒤 이미지를 <code>devloop:dev</code> 로 빌드하고, 소스 폴더를 <code>/app</code> 에 <b>바인드 마운트</b>해서 <code>dev</code> 라는 이름으로 5000 포트에 실행하세요. <code>curl -s localhost:5000</code> 에 Hello 가 나오면 성공입니다.',
      hint: '<code>cd ~/devloop</code> → <code>docker build -t devloop:dev .</code> → <code>docker run -d --name dev -p 5000:5000 -v "$PWD":/app devloop:dev</code>',
      files: 'devloop',
      answer: ['cd ~/devloop', 'docker build -t devloop:dev .', 'docker run -d --name dev -p 5000:5000 -v "$PWD":/app devloop:dev'],
      check: async M => { const m = M.mount('dev', '/app'); return M.running('dev') && !!m && m.type === 'bind' && /Hello/.test(await M.get('http://localhost:5000/')); }
    },
    {
      id: 'm2', scenario: true,
      title: '코드를 고쳤는데 반영이 안 된다!',
      desc: '⚙️ 상황 만들기를 누르면 <code>dev</code> 컨테이너가 <b>바인드 마운트 없이</b> 다시 만들어집니다. 이제 <code>~/devloop/app.py</code> 의 <code>v1</code> 을 <code>v2</code> 로 고쳐 저장해도 <code>curl -s localhost:5000</code> 은 계속 v1 입니다.<br>이미지를 다시 빌드하지 말고, 소스 폴더를 마운트해서 <code>dev</code> 를 다시 만들어 v2 가 나오게 하세요.',
      hint: '<code>docker inspect -f \'{{.Mounts}}\' dev</code> 로 마운트가 비어 있는 것을 확인 → <code>docker rm -f dev</code> → <code>docker run -d --name dev -p 5000:5000 -v "$PWD":/app devloop:dev</code> (~/devloop 에서)',
      files: 'devloop',
      setup: ['docker rm -f dev', 'docker build -t devloop:dev ~/devloop', 'docker run -d --name dev -p 5000:5000 devloop:dev'],
      answer: [
        'cd ~/devloop',
        `printf "from flask import Flask\\n\\napp = Flask(__name__)\\n\\n@app.route('/')\\ndef hello():\\n    return 'Hello, dev loop! v2'\\n\\nif __name__ == '__main__':\\n    app.run(host='0.0.0.0', port=5000, debug=True)\\n" > app.py`,
        'docker rm -f dev',
        'docker run -d --name dev -p 5000:5000 -v "$PWD":/app devloop:dev'
      ],
      check: async M => { const m = M.mount('dev', '/app'); return M.running('dev') && !!m && m.type === 'bind' && /v2/.test(await M.get('http://localhost:5000/')); }
    },
    {
      id: 'm3',
      title: '테스트용 일회용 PostgreSQL 띄우기',
      desc: '<code>testdb</code> 라는 이름으로 <code>postgres:16-alpine</code> 을 띄우세요. 조건: 멈추면 <b>자동 삭제</b>(<code>--rm</code>), 비밀번호 <code>POSTGRES_PASSWORD=test</code>, 호스트 5432 포트 게시. 준비되면 <code>SELECT 1</code> 을 실행해 보세요.',
      hint: '<code>docker run -d --rm --name testdb -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16-alpine</code>',
      answer: ['docker run -d --rm --name testdb -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16-alpine'],
      check: M => { const c = M.c('testdb'); return M.running('testdb') && !!c && !!c.hostConfig.autoRemove && M.env('testdb', 'POSTGRES_PASSWORD') === 'test' && M.port(5432) === c; }
    },
    {
      id: 'm4',
      title: 'devcontainer.json 작성하기',
      desc: '<code>~/devloop/.devcontainer/devcontainer.json</code> 파일을 만드세요. 조건: 올바른 JSON, <code>image</code>(또는 <code>build</code>) 항목이 있고, <code>forwardPorts</code> 에 <code>5000</code> 이 들어 있어야 합니다. 본문의 예제를 📄 파일로 저장해도 됩니다.',
      hint: '본문 "Dev Containers" 절의 devcontainer.json 블록에서 📄 파일로 저장 → 파일 탭에서 확인',
      answer: [
        'mkdir -p ~/devloop/.devcontainer',
        `printf '{\\n  "name": "devloop (Python)",\\n  "image": "mcr.microsoft.com/devcontainers/python:3.12",\\n  "forwardPorts": [5000],\\n  "postCreateCommand": "pip install -r requirements.txt"\\n}\\n' > ~/devloop/.devcontainer/devcontainer.json`
      ],
      check: M => {
        const s = M.file('~/devloop/.devcontainer/devcontainer.json'); if (!s) return false;
        try { const j = JSON.parse(s.replace(/^\s*\/\/.*$/gm, '')); return !!(j.image || j.build || j.dockerComposeFile) && Array.isArray(j.forwardPorts) && j.forwardPorts.map(String).includes('5000'); } catch (e) { return false; }
      }
    },
    {
      id: 'm5',
      title: 'GitHub Actions 워크플로 파일 만들기',
      desc: '<code>~/devloop/.github/workflows/docker.yml</code> 에 이미지를 빌드 · 푸시하는 워크플로를 작성하세요. <code>on:</code> 트리거와 <code>docker/setup-buildx-action</code>, <code>docker/login-action</code>, <code>docker/build-push-action</code> 세 액션이 모두 들어 있어야 합니다.',
      hint: '본문 "CI/CD" 절의 docker.yml 블록을 📄 파일로 저장하면 됩니다.',
      answer: [
        'mkdir -p ~/devloop/.github/workflows',
        'printf \'name: docker-image\\non:\\n  push:\\n    branches: ["main"]\\njobs:\\n  build:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - uses: actions/checkout@v4\\n      - uses: docker/setup-buildx-action@v3\\n      - uses: docker/login-action@v3\\n        with:\\n          username: ${{ vars.DOCKERHUB_USERNAME }}\\n          password: ${{ secrets.DOCKERHUB_TOKEN }}\\n      - uses: docker/build-push-action@v6\\n        with:\\n          push: true\\n          tags: ${{ vars.DOCKERHUB_USERNAME }}/devloop:latest\\n\' > ~/devloop/.github/workflows/docker.yml'
      ],
      check: M => { const s = M.file('~/devloop/.github/workflows/docker.yml') || ''; return /^on:/m.test(s) && /jobs:/.test(s) && /docker\/setup-buildx-action/.test(s) && /docker\/login-action/.test(s) && /docker\/build-push-action/.test(s); }
    },
    {
      id: 'm6',
      title: 'Prometheus + Grafana 모니터링 스택 올리기',
      desc: '📁 파일 준비(<code>~/monitoring</code>) 후 Compose 로 모니터링 스택을 올리세요. <code>localhost:9090</code> 에서 Prometheus 화면이 보여야 합니다. 🌐 브라우저 탭에서 <code>localhost:3000</code>(Grafana)도 열어 보세요.',
      hint: '<code>cd ~/monitoring</code> → <code>docker compose up -d</code> → <code>docker compose ps</code>',
      files: 'monitoring',
      answer: ['cd ~/monitoring', 'docker compose up -d'],
      // 참고: 시뮬레이터의 grafana/grafana 이미지가 시작에 실패하는 문제가 있어 grafana 는 "만들어졌는지"만 확인합니다.
      check: async M => { const p = M.svc('monitoring', 'prometheus'); return p.length > 0 && p[0].state.status === 'running' && M.svc('monitoring', 'grafana').length > 0 && /Prometheus/.test(await M.get('http://localhost:9090/')); }
    },
    {
      id: 'm7',
      title: '같은 이미지를 버전 태그로 레지스트리에 올리기',
      desc: '사설 레지스트리를 <b>5001</b> 포트에 <code>registry</code> 라는 이름으로 띄우고, m1 에서 만든 <code>devloop:dev</code> 이미지를 <code>localhost:5001/devloop:1.0.0</code> 으로 태그해 푸시하세요.',
      hint: '<code>docker run -d --name registry -p 5001:5000 registry:2</code> → <code>docker tag devloop:dev localhost:5001/devloop:1.0.0</code> → <code>docker push localhost:5001/devloop:1.0.0</code>',
      answer: ['docker run -d --name registry -p 5001:5000 registry:2', 'docker tag devloop:dev localhost:5001/devloop:1.0.0', 'docker push localhost:5001/devloop:1.0.0'],
      check: M => M.pushed('localhost:5001/devloop:1.0.0')
    },
    {
      id: 'm8', scenario: true,
      title: 'CI 빌드가 COPY 에서 실패한다',
      desc: '📁 파일 준비(<code>~/ci-app</code>)를 하고 <code>docker build -t ci-app:test .</code> 를 실행하면 <code>"/requirements.txt": not found</code> 로 실패합니다. 파일은 분명히 있는데요! 원인을 찾아 고치고 <code>ci-app:test</code> 이미지를 빌드하세요.',
      hint: '<code>cat ~/ci-app/.dockerignore</code> — <code>*.txt</code> 규칙이 requirements.txt 까지 빼 버립니다. 그 줄을 지우고 다시 빌드하세요.',
      files: 'cibroken',
      answer: ['cd ~/ci-app', 'docker build -t ci-app:test .', `printf '.git\\n.env\\n' > .dockerignore`, 'docker build -t ci-app:test .'],
      check: M => !!M.image('ci-app:test') && !/^\*\.txt\s*$/m.test(M.file('~/ci-app/.dockerignore') || '')
    }
  ],

  videos: [
    { title: 'GitHub Actions Tutorial — Basic Concepts and CI/CD Pipeline with Docker', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=R8_veQiYBjI', lang: 'en', desc: 'GitHub Actions 의 기본 개념과 Docker 이미지 빌드 파이프라인' },
    { title: 'Docker Tutorial for Beginners', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', desc: '개발 워크플로 속 Docker 를 처음부터 끝까지 정리하는 긴 강의' },
    { title: 'VS Code Dev Containers (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=vscode+dev+containers+tutorial', desc: '검색 결과 — devcontainer.json 과 Reopen in Container 사용법' },
    { title: 'Testcontainers 소개 (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=testcontainers+introduction', desc: '검색 결과 — 테스트 코드에서 일회용 컨테이너 쓰기' },
    { title: 'Prometheus + Grafana with Docker Compose (검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=prometheus+grafana+docker+compose', desc: '검색 결과 — 모니터링 스택 구성하기' },
    { title: '도커 CI/CD 깃허브 액션 (한국어 검색)', channel: 'YouTube', url: 'https://www.youtube.com/results?search_query=%EA%B9%83%ED%97%88%EB%B8%8C+%EC%95%A1%EC%85%98+%EB%8F%84%EC%BB%A4+CI%2FCD', desc: '검색 결과 — 한국어로 된 GitHub Actions + Docker 강의' }
  ],

  terms: [
    ['개발 루프 (inner loop)', '코드 수정 → 빌드 → 실행 → 테스트를 개발자 PC 에서 반복하는 과정. 짧을수록 생산성이 높다.'],
    ['compose watch', 'compose.yaml 의 develop.watch 규칙에 따라 파일 변경을 컨테이너에 자동 동기화하거나 다시 빌드하는 기능.'],
    ['Dev Container', '.devcontainer/devcontainer.json 으로 개발 환경(언어 · 도구 · 확장)을 컨테이너로 정의하는 공개 규격.'],
    ['CI / CD', '지속적 통합 / 지속적 배포. 코드가 올라올 때마다 자동으로 빌드 · 테스트하고 배포 가능한 결과물을 만드는 것.'],
    ['GitHub Actions', 'GitHub 저장소의 .github/workflows/*.yml 을 읽어 push · PR 등 이벤트마다 작업을 실행하는 CI/CD 서비스.'],
    ['build-push-action', 'Docker 공식 GitHub 액션. BuildKit 으로 이미지를 빌드하고 레지스트리에 푸시한다.'],
    ['Testcontainers', '테스트 코드에서 DB · 메시지 큐 등을 일회용 컨테이너로 띄우고 끝나면 지워 주는 라이브러리.'],
    ['승격 (promotion)', '검증된 같은 이미지에 새 태그를 붙여 dev → staging → prod 로 올리는 배포 방식.'],
    ['Podman', '데몬 없이 rootless 로 동작하는 Docker 호환 컨테이너 도구.'],
    ['Kaniko', '쿠버네티스 파드 안에서 Docker 데몬 없이 Dockerfile 을 빌드하는 도구.'],
    ['Prometheus', '대상에서 지표를 주기적으로 수집(scrape)해 시계열로 저장하고 질의(PromQL)하는 모니터링 시스템.'],
    ['Grafana', 'Prometheus 등 여러 데이터 소스의 지표 · 로그를 대시보드로 시각화하는 도구.'],
    ['Portainer', 'Docker · 쿠버네티스 자원을 웹 화면에서 관리하는 도구. docker.sock 접근이 필요하다.'],
    ['관측성 (observability)', '지표(metrics) · 로그(logs) · 추적(traces)으로 시스템 내부 상태를 밖에서 이해할 수 있는 정도.']
  ],

  summary: [
    '개발할 때는 바인드 마운트나 compose watch 로 빌드 없이 코드 변경을 반영해 개발 루프를 짧게 만듭니다.',
    'Dev Container 는 devcontainer.json 하나로 팀 전체가 똑같은 개발 환경을 쓰게 해 줍니다.',
    'GitHub Actions 에서는 setup-buildx-action · login-action · build-push-action 으로 push 할 때마다 이미지를 빌드 · 푸시하고, 토큰은 Secrets 에 둡니다.',
    '테스트용 DB 는 docker run --rm 이나 Testcontainers 로 매번 깨끗하게 띄웠다가 버립니다.',
    '"한 번 빌드해서 여러 번 배포" — 같은 이미지에 커밋 해시 · 버전 태그를 붙여 dev → staging → prod 로 승격하고, 설정은 환경 변수로 넣습니다.',
    'Podman · nerdctl · Buildah · Kaniko · Colima · Rancher Desktop · OrbStack 도 OCI 표준 위에서 같은 이미지를 다룹니다.',
    'Prometheus + Grafana 로 지표를 모아 보고, 다음 단계로 쿠버네티스 · 클라우드 컨테이너 서비스 · 관측성을 공부합니다.'
  ],

  quiz: [
    {
      q: '코드를 고칠 때마다 이미지를 다시 빌드하지 않고 컨테이너에 바로 반영하려면 개발 중에 무엇을 쓰면 좋을까요?',
      options: ['docker commit', '소스 폴더 바인드 마운트', 'docker save', '--read-only'],
      answer: 1,
      explain: '바인드 마운트(-v "$PWD":/app)로 내 PC 의 소스 폴더를 컨테이너에 연결하면, 파일을 저장하는 즉시 컨테이너에서도 바뀐 내용이 보입니다.'
    },
    {
      q: 'Dev Container 설정 파일의 위치로 올바른 것은?',
      options: ['compose.yaml', '.devcontainer/devcontainer.json', '.github/workflows/dev.yml', 'Dockerfile.dev'],
      answer: 1,
      explain: 'VS Code 등은 프로젝트의 .devcontainer/devcontainer.json 을 읽어 개발 컨테이너를 만듭니다.'
    },
    {
      q: 'GitHub Actions 워크플로에서 Docker Hub 토큰을 다루는 올바른 방법은?',
      options: ['YAML 에 토큰을 직접 적는다', '저장소 Secrets 에 저장하고 secrets.이름 으로 참조한다', 'Dockerfile 의 ENV 로 넣는다', '커밋 메시지에 적는다'],
      answer: 1,
      explain: '워크플로 파일은 공개되므로 토큰은 Secrets 에 넣고 ${{ secrets.DOCKERHUB_TOKEN }} 처럼 참조합니다.'
    },
    {
      q: '"Build once, deploy many" 원칙에 맞는 배포 방식은?',
      options: ['환경마다 Dockerfile 을 따로 두고 따로 빌드한다', 'staging 에서 검증한 같은 이미지에 태그를 붙여 prod 에 배포한다', 'prod 서버에서 직접 docker build 한다', '항상 latest 태그만 쓴다'],
      answer: 1,
      explain: '같은 이미지(같은 다이제스트)를 승격해야 테스트한 것과 운영하는 것이 정확히 같아집니다. 환경 차이는 설정으로 둡니다.'
    },
    {
      q: '테스트를 위해 "쓰고 나면 자동으로 사라지는" DB 컨테이너를 띄우는 옵션은?',
      options: ['--restart always', '--rm', '-v dbdata:/var/lib/postgresql/data', '--read-only'],
      answer: 1,
      explain: '--rm 을 붙이면 컨테이너가 멈출 때 자동으로 삭제되어 매번 깨끗한 상태로 테스트할 수 있습니다.'
    },
    {
      q: '쿠버네티스 파드 안에서 Docker 데몬 없이 Dockerfile 을 빌드할 때 주로 쓰는 도구는?',
      options: ['Kaniko', 'Grafana', 'Portainer', 'Colima'],
      answer: 0,
      explain: 'Kaniko 는 docker.sock 없이 컨테이너 안에서 이미지를 빌드하도록 만들어진 도구입니다.'
    },
    {
      q: 'Prometheus 와 Grafana 의 역할을 바르게 짝지은 것은?',
      options: ['Prometheus: 시각화 / Grafana: 수집', 'Prometheus: 지표 수집 · 저장 / Grafana: 대시보드 시각화', '둘 다 로그 저장소', '둘 다 컨테이너 런타임'],
      answer: 1,
      explain: 'Prometheus 가 대상에서 지표를 긁어 와 저장하고, Grafana 가 그 데이터를 질의해 그래프로 보여 줍니다.'
    }
  ]
});
