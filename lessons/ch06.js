/* 6장 — Dockerfile 로 이미지 만들기 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ 실습 파일 (한 곳에서 관리) */
  const F = {
    /* 첫 이미지 */
    '~/hello-web/Dockerfile': `FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html
`,
    '~/hello-web/index.html': `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>내 첫 이미지</title></head>
<body>
  <h1>안녕하세요! 내가 만든 첫 이미지입니다 🐳</h1>
  <p>nginx 이미지 위에 이 파일 하나를 COPY 했을 뿐이에요.</p>
</body>
</html>
`,

    /* 빌드 컨텍스트 · .dockerignore */
    '~/ctx-demo/Dockerfile': `FROM alpine:3.20
WORKDIR /app
COPY . .
CMD ["ls", "-a", "/app"]
`,
    '~/ctx-demo/app.txt': `이미지에 꼭 들어가야 하는 파일
`,
    '~/ctx-demo/secret.env': `DB_PASSWORD=super-secret-1234
`,
    '~/ctx-demo/debug.log': `2026-01-01 12:00:00 DEBUG 아주 긴 로그 ...
`,

    /* Flask */
    '~/flask-app/app.py': `import os
import socket
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    name = os.environ.get("NAME", "Docker")
    return f"<h1>Hello, {name}!</h1><p>container: {socket.gethostname()}</p>"

@app.route("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`,
    '~/flask-app/requirements.txt': `flask==3.0.3
`,
    '~/flask-app/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
`,
    '~/flask-app/.dockerignore': `__pycache__/
*.pyc
.venv/
.git/
.env
`,

    /* Node Express */
    '~/node-app/package.json': `{
  "name": "node-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "express": "^4.21.1"
  }
}
`,
    '~/node-app/server.js': `const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(\`<h1>Hello from Express!</h1><p>container: \${os.hostname()}</p>\`);
});

app.get('/api/time', (req, res) => {
  res.json({ now: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server listening on port \${PORT}\`);
});
`,
    '~/node-app/Dockerfile': `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
`,
    '~/node-app/.dockerignore': `node_modules
npm-debug.log
.git
`,

    /* 장애 1: COPY 파일 없음 */
    '~/bug-copy/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirments.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
`,
    '~/bug-copy/requirements.txt': `flask
`,
    '~/bug-copy/app.py': `from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>COPY 오류를 고쳤습니다!</h1>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`,

    /* 장애 2: pip install 을 빼먹음 */
    '~/bug-module/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY . .
CMD ["python", "app.py"]
`,
    '~/bug-module/requirements.txt': `flask
`,
    '~/bug-module/app.py': `from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>모듈 문제 해결!</h1>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`,

    /* 장애 3: 127.0.0.1 바인딩 */
    '~/bug-bind/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
`,
    '~/bug-bind/requirements.txt': `flask
`,
    '~/bug-bind/app.py': `from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>Hello, 0.0.0.0!</h1>"

if __name__ == "__main__":
    app.run()
`,

    /* 장애 4 · 5: 명령 오타 · 패키지 이름 오타 */
    '~/bug-typo/Dockerfile': `FROM python:3.12-slim
WORKDR /app
COPY . .
`,
    '~/bug-pip/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
`,
    '~/bug-pip/requirements.txt': `flsk
`
  };

  const pick = (...prefixes) => Object.fromEntries(Object.entries(F).filter(([k]) => prefixes.some(p => k.startsWith(p))));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /** 파일 내용 블록 (📄 파일로 저장 버튼) */
  const fb = (path, lang) => `<pre class="code" data-lang="${lang || 'text'}" data-file="${path}"><code>${esc(F[path].replace(/\n$/, ''))}</code></pre>`;

  Course.lesson({
    id: 'ch06', no: '06',
    icon: '📝',
    title: 'Dockerfile 로 이미지 만들기',
    subtitle: '남이 만든 이미지를 쓰는 사람에서, 내 앱을 이미지로 포장하는 사람으로',
    level: '기초', time: '120분',
    goals: [
      'Dockerfile 이 "이미지를 만드는 레시피"라는 것을 이해하고 FROM · RUN · COPY · WORKDIR · ENV · EXPOSE · CMD 를 쓸 수 있다',
      'docker build -t 이름:태그 . 의 마지막 점(빌드 컨텍스트)과 .dockerignore 의 역할을 설명할 수 있다',
      'BuildKit 출력을 읽고 레이어 캐시(CACHED)가 깨지는 지점을 찾아 명령 순서를 개선할 수 있다',
      'Python Flask · Node Express 앱을 이미지로 만들어 실행하고 브라우저로 확인할 수 있다',
      '흔한 빌드 · 실행 오류(COPY 실패, 명령 오타, 모듈 없음, 127.0.0.1 바인딩)를 스스로 고칠 수 있다'
    ],
    chips: ['docker images', 'docker build -t hello-web:1.0 .', 'docker history hello-web:1.0', 'docker ps -a', 'curl -s localhost:5000', 'ls -a'],

    files: {
      hello: pick('~/hello-web/'),
      ctx: pick('~/ctx-demo/'),
      flask: pick('~/flask-app/'),
      node: pick('~/node-app/'),
      bugs: pick('~/bug-'),
      bugcopy: pick('~/bug-copy/'),
      bugmod: pick('~/bug-module/'),
      bugbind: pick('~/bug-bind/')
    },

    figs: {
      /* ---------------------------------------------------------- 레시피 → 틀 → 붕어빵 */
      recipe: {
        caption: 'Dockerfile(레시피)을 docker build 로 구우면 이미지(붕어빵 틀)가 되고, docker run 할 때마다 컨테이너(붕어빵)가 하나씩 나옵니다',
        svg: `<svg class="dg" viewBox="0 0 860 270" role="img" aria-label="Dockerfile 을 빌드해서 이미지를 만들고, 이미지를 실행해서 컨테이너를 여러 개 만드는 흐름">
  <rect x="20" y="60" width="190" height="150" rx="12" class="yellow"/>
  <text x="115" y="88" class="t-c t-b">📝 Dockerfile</text>
  <text x="115" y="108" class="t-c t-xs t-mu">레시피 (글자로 된 설명서)</text>
  <text x="38" y="136" class="t-xs t-mono">FROM python:3.12-slim</text>
  <text x="38" y="156" class="t-xs t-mono">COPY . .</text>
  <text x="38" y="176" class="t-xs t-mono">RUN pip install ...</text>
  <text x="38" y="196" class="t-xs t-mono">CMD ["python","app.py"]</text>

  <line x1="212" y1="135" x2="318" y2="135" class="ln-blue thick ar-blue moving"/>
  <text x="265" y="120" class="t-c t-sm t-mono t-b t-blue">docker build</text>
  <text x="265" y="156" class="t-c t-xs t-mu">한 줄씩 실행</text>

  <rect x="320" y="50" width="200" height="170" rx="12" class="purple"/>
  <text x="420" y="78" class="t-c t-b">📦 이미지</text>
  <text x="420" y="98" class="t-c t-xs t-mu">붕어빵 틀 (읽기 전용)</text>
  <rect x="345" y="112" width="150" height="20" rx="4" class="box"/><text x="420" y="126" class="t-c t-xs t-mono">COPY . .</text>
  <rect x="345" y="136" width="150" height="20" rx="4" class="box"/><text x="420" y="150" class="t-c t-xs t-mono">RUN pip install</text>
  <rect x="345" y="160" width="150" height="20" rx="4" class="box"/><text x="420" y="174" class="t-c t-xs t-mono">WORKDIR /app</text>
  <rect x="345" y="184" width="150" height="20" rx="4" class="gray"/><text x="420" y="198" class="t-c t-xs t-mono">python:3.12-slim</text>

  <line x1="522" y1="135" x2="628" y2="135" class="ln-green thick ar-green moving"/>
  <text x="575" y="120" class="t-c t-sm t-mono t-b t-green">docker run</text>
  <text x="575" y="156" class="t-c t-xs t-mu">여러 번 가능</text>

  <rect x="630" y="30" width="210" height="58" rx="14" class="green"/>
  <text x="735" y="55" class="t-c t-b">🐟 컨테이너 1</text><text x="735" y="75" class="t-c t-xs t-mu">실행 중인 붕어빵</text>
  <rect x="630" y="106" width="210" height="58" rx="14" class="green"/>
  <text x="735" y="131" class="t-c t-b">🐟 컨테이너 2</text><text x="735" y="151" class="t-c t-xs t-mu">같은 틀, 다른 붕어빵</text>
  <rect x="630" y="182" width="210" height="58" rx="14" class="teal"/>
  <text x="735" y="207" class="t-c t-b">🐟 컨테이너 3</text><text x="735" y="227" class="t-c t-xs t-mu">서로 독립적</text>
  <text x="430" y="258" class="t-c t-xs t-mu">레시피는 git 으로 관리 · 이미지는 레지스트리로 공유 · 컨테이너는 언제든 버리고 새로 만듦</text>
</svg>`
      },

      /* ---------------------------------------------------------- 명령 → 레이어 */
      layers: {
        caption: 'Dockerfile 의 RUN · COPY · ADD 는 새 레이어(파일 변화)를 만들고, WORKDIR · ENV · EXPOSE · CMD 는 설정(메타데이터)만 바꿉니다',
        svg: `<svg class="dg" viewBox="0 0 860 350" role="img" aria-label="Dockerfile 명령 한 줄 한 줄이 이미지 레이어로 쌓이는 모습">
  <rect x="20" y="20" width="330" height="310" rx="12" class="yellow"/>
  <text x="185" y="46" class="t-c t-b">📝 Dockerfile</text>
  <text x="40" y="84" class="t-sm t-mono">FROM python:3.12-slim</text>
  <text x="40" y="124" class="t-sm t-mono">WORKDIR /app</text>
  <text x="40" y="164" class="t-sm t-mono">COPY requirements.txt .</text>
  <text x="40" y="204" class="t-sm t-mono">RUN pip install -r ...</text>
  <text x="40" y="244" class="t-sm t-mono">COPY . .</text>
  <text x="40" y="284" class="t-sm t-mono">EXPOSE 5000 · CMD [...]</text>

  <line x1="330" y1="80" x2="470" y2="298" class="ln thin dash ar"/>
  <line x1="330" y1="120" x2="470" y2="250" class="ln thin dash ar"/>
  <line x1="330" y1="160" x2="470" y2="210" class="ln thin dash ar"/>
  <line x1="330" y1="200" x2="470" y2="170" class="ln thin dash ar"/>
  <line x1="330" y1="240" x2="470" y2="130" class="ln thin dash ar"/>
  <line x1="330" y1="280" x2="470" y2="68" class="ln thin dash ar"/>

  <rect x="472" y="50" width="250" height="36" rx="6" class="box"/>
  <text x="597" y="73" class="t-c t-sm">⚙️ 설정: 포트 · 시작 명령 (0B)</text>
  <rect x="472" y="112" width="250" height="36" rx="6" class="purple"/>
  <text x="597" y="135" class="t-c t-sm">내 소스 코드 (수백 B)</text>
  <rect x="472" y="152" width="250" height="36" rx="6" class="purple"/>
  <text x="597" y="175" class="t-c t-sm">설치된 flask (약 14MB)</text>
  <rect x="472" y="192" width="250" height="36" rx="6" class="purple"/>
  <text x="597" y="215" class="t-c t-sm">requirements.txt (80B)</text>
  <rect x="472" y="232" width="250" height="36" rx="6" class="purple"/>
  <text x="597" y="255" class="t-c t-sm">빈 폴더 /app (0B)</text>
  <rect x="472" y="272" width="250" height="52" rx="6" class="gray"/>
  <text x="597" y="294" class="t-c t-sm t-b">베이스 이미지 레이어들</text>
  <text x="597" y="313" class="t-c t-xs t-mu">python:3.12-slim (약 125MB)</text>

  <text x="745" y="120" class="t-sm t-b">⬆ 위로</text>
  <text x="745" y="140" class="t-xs t-mu">나중에 실행한</text>
  <text x="745" y="158" class="t-xs t-mu">명령일수록 위</text>
  <text x="745" y="270" class="t-sm t-b">🧱 바닥</text>
  <text x="745" y="290" class="t-xs t-mu">FROM 이 고른</text>
  <text x="745" y="308" class="t-xs t-mu">출발점</text>
</svg>`
      },

      /* ---------------------------------------------------------- 빌드 컨텍스트 */
      context: {
        caption: 'docker build 의 마지막 점(.)은 "이 폴더를 통째로 빌더에게 보내라"는 뜻입니다. .dockerignore 에 적은 파일은 보내지 않습니다',
        svg: `<svg class="dg" viewBox="0 0 860 310" role="img" aria-label="빌드 컨텍스트 폴더가 BuildKit 빌더로 전송되고, dockerignore 에 적힌 파일은 빠지는 모습">
  <rect x="20" y="20" width="290" height="270" rx="12" class="blue"/>
  <text x="165" y="46" class="t-c t-b">🖥️ 내 PC · ~/flask-app/</text>
  <text x="165" y="66" class="t-c t-xs t-mu">docker build -t flask-app:1.0 <tspan class="t-b t-red">.</tspan></text>
  <rect x="40" y="82" width="250" height="26" rx="5" class="box"/><text x="54" y="100" class="t-sm t-mono">📄 Dockerfile</text>
  <rect x="40" y="112" width="250" height="26" rx="5" class="box"/><text x="54" y="130" class="t-sm t-mono">📄 app.py</text>
  <rect x="40" y="142" width="250" height="26" rx="5" class="box"/><text x="54" y="160" class="t-sm t-mono">📄 requirements.txt</text>
  <rect x="40" y="172" width="250" height="26" rx="5" class="red"/><text x="54" y="190" class="t-sm t-mono">🚫 .env (비밀번호)</text>
  <rect x="40" y="202" width="250" height="26" rx="5" class="red"/><text x="54" y="220" class="t-sm t-mono">🚫 .venv/ (수백 MB)</text>
  <rect x="40" y="232" width="250" height="26" rx="5" class="red"/><text x="54" y="250" class="t-sm t-mono">🚫 .git/</text>
  <text x="165" y="278" class="t-c t-xs t-red">빨간 파일 = .dockerignore 에 적힌 것</text>

  <line x1="312" y1="140" x2="508" y2="140" class="ln-blue thick ar-blue moving"/>
  <text x="410" y="124" class="t-c t-sm t-b">빌드 컨텍스트 전송</text>
  <text x="410" y="162" class="t-c t-xs t-mu">transferring context: 368B</text>
  <line x1="312" y1="200" x2="400" y2="200" class="ln-red thick"/>
  <text x="410" y="205" class="t-sm t-red t-b">✖ 안 보냄</text>

  <rect x="510" y="20" width="330" height="270" rx="12" class="teal"/>
  <text x="675" y="46" class="t-c t-b">🏗️ BuildKit 빌더</text>
  <text x="675" y="66" class="t-c t-xs t-mu">(Docker 엔진 안의 이미지 공장)</text>
  <rect x="530" y="82" width="290" height="80" rx="8" class="box"/>
  <text x="546" y="104" class="t-sm t-b">받은 컨텍스트</text>
  <text x="546" y="126" class="t-xs t-mono">Dockerfile  app.py</text>
  <text x="546" y="146" class="t-xs t-mono">requirements.txt</text>
  <rect x="530" y="176" width="290" height="96" rx="8" class="box"/>
  <text x="546" y="198" class="t-sm t-b">COPY 가 볼 수 있는 곳 = 여기뿐</text>
  <text x="546" y="220" class="t-xs t-mono">COPY app.py .          ✔</text>
  <text x="546" y="240" class="t-xs t-mono">COPY .env .            ✖ not found</text>
  <text x="546" y="260" class="t-xs t-mono">COPY ../other.txt .    ✖ 바깥은 불가</text>
</svg>`
      },

      /* ---------------------------------------------------------- 127.0.0.1 vs 0.0.0.0 */
      bind: {
        caption: '컨테이너 안의 127.0.0.1 은 "컨테이너 자기 자신"입니다. 포트 게시로 들어온 요청은 eth0 으로 오므로 앱이 0.0.0.0 에서 기다려야 받을 수 있습니다',
        svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="앱이 127.0.0.1 에 바인딩되면 포트 게시로 들어온 요청을 받지 못하고, 0.0.0.0 에 바인딩되면 받는 모습">
  <rect x="20" y="40" width="180" height="250" rx="12" class="blue"/>
  <text x="110" y="66" class="t-c t-b">🖥️ 내 PC</text>
  <rect x="36" y="90" width="148" height="44" rx="8" class="box"/>
  <text x="110" y="110" class="t-c t-xs t-mono">curl localhost:5000</text>
  <text x="110" y="126" class="t-c t-xs t-mu">(브라우저도 같음)</text>
  <rect x="36" y="200" width="148" height="44" rx="8" class="box"/>
  <text x="110" y="220" class="t-c t-xs t-mono">curl localhost:5001</text>
  <text x="110" y="236" class="t-c t-xs t-mu">-p 5001:5000</text>

  <rect x="300" y="20" width="540" height="130" rx="14" class="red"/>
  <text x="570" y="44" class="t-c t-b">📦 컨테이너 A — app.run()  (기본값 127.0.0.1)</text>
  <rect x="320" y="62" width="150" height="70" rx="8" class="box"/>
  <text x="395" y="88" class="t-c t-sm t-b">eth0</text><text x="395" y="110" class="t-c t-xs t-mono">172.17.0.2:5000</text>
  <rect x="620" y="62" width="200" height="70" rx="8" class="box"/>
  <text x="720" y="88" class="t-c t-sm t-b">lo (자기 자신)</text><text x="720" y="110" class="t-c t-xs t-mono">127.0.0.1:5000 ← 앱</text>
  <line x1="186" y1="112" x2="318" y2="98" class="ln-red thick ar-red"/>
  <line x1="472" y1="97" x2="545" y2="97" class="ln-red thick"/>
  <text x="560" y="102" class="t-sm t-red t-b">✖</text>
  <text x="545" y="126" class="t-c t-xs t-red">아무도 안 듣는 문</text>
  <text x="256" y="92" class="t-c t-xs t-red t-b">✖ 연결 끊김</text>

  <rect x="300" y="180" width="540" height="130" rx="14" class="green"/>
  <text x="570" y="204" class="t-c t-b">📦 컨테이너 B — app.run(host="0.0.0.0")</text>
  <rect x="320" y="222" width="500" height="70" rx="8" class="box"/>
  <text x="570" y="248" class="t-c t-sm t-b">0.0.0.0:5000 ← 앱 (모든 네트워크 카드에서 대기)</text>
  <text x="570" y="272" class="t-c t-xs t-mono">eth0 172.17.0.3 ✔   ·   lo 127.0.0.1 ✔</text>
  <line x1="186" y1="222" x2="318" y2="250" class="ln-green thick ar-green moving"/>
  <text x="250" y="210" class="t-c t-xs t-green t-b">Hello! ✔</text>
</svg>`
      },

      /* ---------------------------------------------------------- 명령 순서와 캐시 */
      cacheorder: `<div class="vs"><div class="vs-a red"><b>😵 순서 A — 코드를 먼저 통째로 복사</b>
<pre class="code" data-lang="Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY . .                       <span class="cm"># app.py 가 바뀌면 여기서 캐시 깨짐</span>
RUN pip install -r requirements.txt   <span class="cm"># 매번 다시 설치 😭</span>
CMD ["python", "app.py"]</code></pre></div>
<div class="vs-mid">VS</div>
<div class="vs-b green"><b>😎 순서 B — 잘 안 바뀌는 것 먼저</b>
<pre class="code" data-lang="Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .        <span class="cm"># 목록이 그대로면 CACHED</span>
RUN pip install -r requirements.txt   <span class="cm"># CACHED ⚡</span>
COPY . .                       <span class="cm"># 코드만 다시 복사</span>
CMD ["python", "app.py"]</code></pre></div></div>`
    },

    sections: [
      /* ================================================================ 1 */
      {
        title: '왜 이미지를 직접 만들까? — 레시피와 붕어빵 틀',
        html: `
<p>지금까지는 <code>nginx</code> · <code>redis</code> · <code>postgres</code> 처럼 <b>남이 만든 이미지</b>를 내려받아 실행했습니다.
하지만 여러분이 만든 웹 앱이나 API 서버를 컨테이너로 돌리려면, 그 앱이 들어 있는 <b>나만의 이미지</b>가 필요합니다.</p>
<p>그 이미지를 만드는 설명서가 바로 <b>Dockerfile</b>(도커파일)입니다. 이름 그대로 "Docker 용 파일"이고, 확장자 없이 <code>Dockerfile</code> 이라는 이름으로 프로젝트 폴더에 둡니다.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 붕어빵 가게 차리기</div>
<ul>
<li><b>Dockerfile = 레시피</b> : "밀가루 반죽을 준비하고(FROM), 팥을 넣고(COPY), 3분 굽는다(RUN)" 처럼 <b>순서대로 적은 글</b></li>
<li><b>docker build = 틀 만들기</b> : 레시피대로 한 번 구워서 <b>붕어빵 틀(이미지)</b>을 완성</li>
<li><b>docker run = 붕어빵 굽기</b> : 틀 하나로 붕어빵(컨테이너)을 몇 개든 똑같이 찍어 냄</li>
</ul>
레시피만 있으면 다른 가게(다른 PC · 서버)에서도 <b>똑같은 틀</b>을 다시 만들 수 있다는 것이 핵심입니다.</div>

{{fig:recipe}}

<table class="tbl cmp">
<tr><th></th><th>남이 만든 이미지 (nginx, redis …)</th><th>내가 만든 이미지 (Dockerfile)</th></tr>
<tr><td><b>들어 있는 것</b></td><td>범용 프로그램</td><td><b>내 코드</b> + 내 앱에 필요한 라이브러리 + 실행 방법</td></tr>
<tr><td><b>설정 방법</b></td><td>환경 변수 · 볼륨으로 바꿈</td><td>필요한 것을 <b>처음부터 넣어 둠</b></td></tr>
<tr><td><b>배포</b></td><td>docker pull</td><td>docker build → push → 서버에서 pull</td></tr>
<tr><td><b>재현성</b></td><td>태그만 같으면 같음</td><td>Dockerfile 을 git 에 두면 <b>누구나 같은 이미지</b>를 다시 만듦</td></tr>
</table>

<div class="box note"><div class="box-t">📌 "내 PC 에선 되는데요…" 를 끝내는 방법</div>
Python 버전, 설치한 패키지, 환경 변수, 시작 명령을 전부 Dockerfile 에 적어 두면, 팀원 · 테스트 서버 · 운영 서버가 모두 <b>같은 이미지</b>로 실행합니다.
"README 를 보고 따라 설치하세요" 대신 <code>docker build</code> 한 줄이면 끝납니다.</div>`
      },

      /* ================================================================ 2 */
      {
        title: '첫 Dockerfile — nginx 위에 내 index.html 올리기',
        html: `
<p>가장 간단한 이미지부터 만들어 봅시다. nginx 웹 서버 이미지를 출발점으로 삼고, 기본 환영 페이지를 <b>내 HTML 파일로 바꿔치기</b>만 합니다.
파일 두 개가 필요합니다. 아래 <b>📄 파일로 저장</b> 버튼을 누르거나, 한 번에 만드는 버튼을 쓰세요.</p>

{{widget:files|set=hello|cd=~/hello-web|title=첫 이미지 실습 파일 (~/hello-web)}}

${fb('~/hello-web/Dockerfile', 'Dockerfile')}
${fb('~/hello-web/index.html', 'html')}

<table class="tbl">
<tr><th>줄</th><th>뜻</th></tr>
<tr><td><code>FROM nginx:1.27-alpine</code></td><td>출발점(베이스 이미지). nginx 1.27 이 들어 있는 작은 alpine 판을 가져와 그 위에 쌓습니다.</td></tr>
<tr><td><code>COPY index.html /usr/share/nginx/html/index.html</code></td><td>내 PC 의 <code>index.html</code> 을 이미지 안의 nginx 문서 폴더에 복사합니다. (<code>COPY 원본 목적지</code>)</td></tr>
</table>

<p>이제 빌드합니다. <code>-t</code> 는 이미지에 <b>이름:태그</b>를 붙이는 옵션이고, 마지막 <b>점(.)</b>은 "지금 폴더의 파일을 재료로 쓰라"는 뜻입니다 (4절에서 자세히).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/hello-web
docker build -t hello-web:1.0 .
docker images</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Building 2.4s (7/7) FINISHED
 => [internal] load build definition from Dockerfile                              0.0s
 => => transferring dockerfile: 72B                                               0.0s
 => [internal] load metadata for docker.io/library/nginx:1.27-alpine              1.2s
 => [internal] load .dockerignore                                                 0.0s
 => => transferring context: 2B                                                   0.0s
 => [1/2] FROM docker.io/library/nginx:1.27-alpine@sha256:a6b806a0a45efa5a988…    1.1s
 => => sha256:51abee3c58a2841e9b418ead80480d2fc925875e81115d1c4b98c72f4bcc52f…    0.2s
 => => extracting sha256:cb07d07a65d2e0eea03c0fea5035fe0a5b33b38efdddde3c803e…    0.4s
 => [internal] load build context                                                 0.0s
 => => transferring context: 267B                                                 0.0s
 => [2/2] COPY index.html /usr/share/nginx/html/index.html                        0.1s
 => exporting to image                                                            0.1s
 => => exporting layers                                                           0.1s
 => => writing image sha256:b05563ea90cdfc3a89d27e665708f0a030491ea0f1f137c24…    0.0s
 => => naming to docker.io/library/hello-web:1.0                                  0.0s

REPOSITORY   TAG           IMAGE ID       CREATED                  SIZE
hello-web    1.0           b05563ea90cd   Less than a second ago   47.9MB
nginx        1.27-alpine   b1570118075b   3 weeks ago              47.9MB</code></pre>

<p><code>hello-web:1.0</code> 이미지가 생겼습니다! 베이스인 nginx 와 크기가 거의 같은 것은, 우리가 더한 것이 <b>HTML 파일 하나(수백 바이트)</b>뿐이기 때문입니다.
이제 평소처럼 실행해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name hello -p 8080:80 hello-web:1.0
curl -s localhost:8080</code></pre>
<pre class="code out" data-lang="출력"><code>ada9d068624c27b25bd05b160db5f9158eec236da29a4f4ffa2b582875fadbb7
&lt;!DOCTYPE html&gt;
&lt;html lang="ko"&gt;
...
  &lt;h1&gt;안녕하세요! 내가 만든 첫 이미지입니다 🐳&lt;/h1&gt;
...</code></pre>
{{widget:open|url=http://localhost:8080/|label=🌐 브라우저에서 localhost:8080 열기}}

<div class="box tip"><div class="box-t">💡 이름:태그 짓는 규칙</div>
<ul>
<li>이름은 <b>소문자</b>만 됩니다. <code>docker build -t Hello .</code> → <code>ERROR: invalid tag "Hello": repository name must be lowercase</code></li>
<li>태그를 빼면 <code>latest</code> 가 붙습니다. 연습 땐 괜찮지만, 실무에선 <code>1.0</code>, <code>1.0.1</code> 처럼 <b>버전을 꼭</b> 붙이세요 (11장).</li>
<li><code>-t</code> 를 아예 안 주면 이름 없는 <code>&lt;none&gt;</code> 이미지가 생깁니다. 나중에 <code>docker image prune</code> 으로 청소하세요.</li>
</ul></div>`
      },

      /* ================================================================ 3 */
      {
        title: 'Dockerfile 명령 한눈에 — FROM · RUN · COPY · ADD · WORKDIR · ENV · EXPOSE · CMD',
        html: `
<p>Dockerfile 은 <b>위에서 아래로 한 줄씩</b> 실행됩니다. 각 줄은 <code>명령 인자</code> 모양이고, 명령은 대문자로 쓰는 것이 관례입니다(소문자도 되지만 읽기 힘듭니다).
<code>#</code> 으로 시작하는 줄은 주석입니다.</p>

<div class="tbl-wrap"><table class="tbl">
<tr><th>명령</th><th>하는 일</th><th>예</th><th>레이어?</th></tr>
<tr><td><code>FROM</code></td><td>출발점이 될 <b>베이스 이미지</b>. 항상 맨 처음</td><td><code>FROM python:3.12-slim</code></td><td>베이스</td></tr>
<tr><td><code>WORKDIR</code></td><td>이후 명령의 <b>작업 폴더</b> (없으면 만들어 줌). <code>cd</code> 와 비슷</td><td><code>WORKDIR /app</code></td><td>빈 폴더</td></tr>
<tr><td><code>COPY</code></td><td>빌드 컨텍스트(내 PC 폴더)의 파일을 이미지 안으로 <b>복사</b></td><td><code>COPY app.py .</code></td><td><span class="tag purple">새 레이어</span></td></tr>
<tr><td><code>ADD</code></td><td>COPY + α (tar 자동 풀기, URL 내려받기)</td><td><code>ADD site.tar.gz /srv/</code></td><td><span class="tag purple">새 레이어</span></td></tr>
<tr><td><code>RUN</code></td><td>빌드하는 동안 <b>명령 실행</b> (패키지 설치 등). 결과 파일이 이미지에 남음</td><td><code>RUN pip install flask</code></td><td><span class="tag purple">새 레이어</span></td></tr>
<tr><td><code>ENV</code></td><td>환경 변수 기본값 (빌드 중에도, 컨테이너에서도 보임)</td><td><code>ENV APP_ENV=production</code></td><td>설정만</td></tr>
<tr><td><code>EXPOSE</code></td><td>"이 앱은 이 포트를 씁니다" 라는 <b>안내 문서</b>. 실제로 열지는 않음</td><td><code>EXPOSE 5000</code></td><td>설정만</td></tr>
<tr><td><code>CMD</code></td><td>컨테이너가 시작할 때 실행할 <b>기본 명령</b> (여러 개 쓰면 마지막 것만)</td><td><code>CMD ["python", "app.py"]</code></td><td>설정만</td></tr>
</table></div>

{{fig:layers}}

<div class="vs"><div class="vs-a purple"><b>RUN — 빌드할 때 한 번</b><ul><li>이미지를 <b>만드는 중</b>에 실행</li><li>결과(설치된 파일)가 이미지에 저장됨</li><li>예: <code>RUN apt-get install</code>, <code>RUN pip install</code></li></ul></div>
<div class="vs-mid">VS</div>
<div class="vs-b green"><b>CMD — 컨테이너를 켤 때마다</b><ul><li>이미지를 <b>실행할 때</b> 시작되는 프로그램</li><li>이미지에는 "이걸 실행하라"는 설정만 저장</li><li>예: <code>CMD ["python", "app.py"]</code></li></ul></div></div>

<div class="box warn"><div class="box-t">⚠️ COPY 와 ADD, 무엇을 쓸까?</div>
공식 문서의 권장은 <b>기본은 COPY</b> 입니다. ADD 는 압축 파일을 <b>자동으로 풀거나</b> URL 에서 내려받는 등 "알아서 해 주는" 기능이 있어서, 의도치 않은 결과가 나오기 쉽습니다.
tar 파일을 풀어서 넣어야 할 때처럼 그 기능이 꼭 필요할 때만 ADD 를 쓰세요.</div>

<div class="box tip"><div class="box-t">💡 EXPOSE 는 문서일 뿐</div>
<code>EXPOSE 5000</code> 을 써도 포트가 저절로 열리지 않습니다. 실행할 때 <code>-p 5000:5000</code> 을 줘야 내 PC 에서 접속할 수 있어요.
그래도 쓰는 이유는 이미지를 받는 사람에게 "이 앱은 5000번에서 기다립니다" 라고 알려 주기 위해서입니다 (<code>docker inspect</code> · <code>docker ps</code> · <code>-P</code> 옵션이 이 정보를 씀).</div>

<div class="box note"><div class="box-t">📌 CMD 는 JSON 배열(exec 형식)로</div>
<code>CMD ["python", "app.py"]</code> 처럼 <b>큰따옴표 + 대괄호</b>로 쓰는 것이 권장 형식입니다. <code>CMD python app.py</code> 처럼 써도 동작하지만 <code>/bin/sh -c</code> 를 거쳐 실행돼서 종료 신호 처리 등에 차이가 생깁니다.
자세한 차이와 ENTRYPOINT 는 <a href="#ch07">7장</a>에서 다룹니다.</div>`
      },

      /* ================================================================ 4 */
      {
        title: 'docker build 해부 — 마지막 점(.), 빌드 컨텍스트, .dockerignore, BuildKit 출력',
        html: `
<p><code>docker build -t 이름:태그 .</code> 에서 가장 많이 잊어버리는 것이 <b>마지막 점</b>입니다. 점을 빼면 이런 오류가 납니다.</p>
<pre class="code out" data-lang="출력"><code>$ docker build -t hello-web:1.0
ERROR: "docker buildx build" requires exactly 1 argument.
See 'docker buildx build --help'.

Usage:  docker buildx build [OPTIONS] PATH | URL | -</code></pre>
<p>이 점은 <b>빌드 컨텍스트</b>(build context) — "이 폴더 안의 파일을 빌더에게 재료로 보내라"는 경로입니다. Docker 는 이 폴더를 통째로 <b>BuildKit 빌더</b>에게 보내고,
Dockerfile 의 <code>COPY</code> 는 <b>이 재료 안에서만</b> 파일을 찾을 수 있습니다.</p>

{{fig:context}}

<table class="tbl">
<tr><th>명령</th><th>뜻</th></tr>
<tr><td><code>docker build -t app .</code></td><td>현재 폴더가 컨텍스트, 그 안의 <code>Dockerfile</code> 사용</td></tr>
<tr><td><code>docker build -t app ~/flask-app</code></td><td>다른 폴더를 컨텍스트로 (그 폴더의 Dockerfile 사용)</td></tr>
<tr><td><code>docker build -t app -f Dockerfile.dev .</code></td><td>컨텍스트는 현재 폴더, Dockerfile 은 다른 이름의 파일</td></tr>
</table>

<h4>.dockerignore — 보내지 말아야 할 것</h4>
<p>컨텍스트에는 <b>비밀번호 파일, 로그, 수백 MB 짜리 가상 환경 폴더</b>까지 딸려 가기 쉽습니다. 그러면 빌드가 느려지고, <code>COPY . .</code> 때문에 비밀이 이미지에 박제됩니다.
프로젝트 폴더에 <code>.dockerignore</code> 파일을 만들어 제외할 것을 적으세요 (<code>.gitignore</code> 와 비슷한 문법).</p>

{{widget:files|set=ctx|cd=~/ctx-demo|title=빌드 컨텍스트 실습 파일 (~/ctx-demo)}}
${fb('~/ctx-demo/Dockerfile', 'Dockerfile')}
<div class="two"><div>
${fb('~/ctx-demo/app.txt')}
${fb('~/ctx-demo/debug.log')}
</div><div>
${fb('~/ctx-demo/secret.env')}
</div></div>
<p>먼저 <code>.dockerignore</code> <b>없이</b> 빌드해서, 이미지 안에 무엇이 들어갔는지 봅시다. 이 이미지의 CMD 는 <code>ls -a /app</code> 이라 실행하면 바로 목록을 보여 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ctx-demo
ls -a
docker build -q -t ctx-demo:bad .
docker run --rm ctx-demo:bad</code></pre>
<pre class="code out" data-lang="출력"><code>.  ..  Dockerfile  app.txt  debug.log  secret.env
sha256:9da4b8c0ba8574844c2e3ac0d239bd44cdcf987f641da69f8b4442619bb7f869
.  ..  Dockerfile  app.txt  debug.log  secret.env</code></pre>
<p>😱 <code>secret.env</code> 가 이미지 안에 들어갔습니다. 이미지를 레지스트리에 올리면 누구나 비밀번호를 꺼내 볼 수 있어요. <code>.dockerignore</code> 를 만듭니다.</p>
<pre class="code" data-lang="dockerignore" data-file="~/ctx-demo/.dockerignore"><code># 빌드 컨텍스트에서 뺄 것
secret.env
*.log
.git</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -t ctx-demo:good .
docker run --rm ctx-demo:good</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Building 0.5s (8/8) FINISHED
 => [internal] load build definition from Dockerfile                              0.0s
 => => transferring dockerfile: 64B                                               0.0s
 => [internal] load metadata for docker.io/library/alpine:3.20                    1.3s
 => [internal] load .dockerignore                                                 0.0s
 => => transferring context: 38B                                                  0.0s
 => CACHED [1/3] FROM docker.io/library/alpine:3.20@sha256:6d6e4c52bcba13a401…    0.0s
 => CACHED [2/3] WORKDIR /app                                                     0.0s
 => [internal] load build context                                                 0.0s
 => => transferring context: 120B                                                 0.0s
 => [3/3] COPY . .                                                                0.1s
 => exporting to image                                                            0.1s
 ...
.  ..  .dockerignore  Dockerfile  app.txt</code></pre>
<p>이번에는 <code>secret.env</code> 와 <code>debug.log</code> 가 빠졌습니다. 보안 사고 하나를 막았어요.</p>

<div class="box warn"><div class="box-t">⚠️ .dockerignore 에 적은 파일은 COPY 도 못 합니다</div>
컨텍스트에서 빠진 파일은 빌더 입장에서 <b>없는 파일</b>입니다. <code>COPY secret.env .</code> 이라고 써도 <code>"/secret.env": not found</code> 오류가 납니다.
"파일은 분명히 있는데 not found?" 라면 가장 먼저 .dockerignore 를 의심하세요.</div>

<h4>BuildKit 출력 읽는 법</h4>
<p>Docker 23 버전부터 기본 빌더는 <b>BuildKit</b> 입니다. 출력의 각 줄은 이런 뜻입니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>출력 줄</th><th>뜻</th></tr>
<tr><td><code>[+] Building 2.4s (7/7) FINISHED</code></td><td>전체 걸린 시간 · (끝난 단계/전체 단계) · 결과</td></tr>
<tr><td><code>[internal] load build definition from Dockerfile</code></td><td>Dockerfile 읽기</td></tr>
<tr><td><code>[internal] load metadata for docker.io/library/…</code></td><td>베이스 이미지 정보 확인 (레지스트리에 물어봄)</td></tr>
<tr><td><code>[internal] load .dockerignore</code></td><td>.dockerignore 읽기</td></tr>
<tr><td><code>[internal] load build context</code> · <code>transferring context: 124B</code></td><td>컨텍스트 전송 — <b>이 숫자가 수백 MB 면 .dockerignore 가 필요하다는 신호</b></td></tr>
<tr><td><code>[2/3] WORKDIR /app</code></td><td>Dockerfile 의 단계 번호 (현재/전체) + 명령</td></tr>
<tr><td><code>CACHED [2/3] …</code></td><td>이전 빌드 결과를 <b>재사용</b>해서 건너뜀 ⚡</td></tr>
<tr><td><code>ERROR [3/4] …</code></td><td>이 단계에서 실패. 아래에 원인과 <code>Dockerfile:3</code> 처럼 줄 번호가 나옴</td></tr>
<tr><td><code>naming to docker.io/library/ctx-demo:good</code></td><td>완성된 이미지에 이름 붙이기</td></tr>
</table></div>
<div class="box tip"><div class="box-t">💡 자세한 로그가 보고 싶다면</div>
<code>docker build --progress=plain -t app .</code> 으로 하면 줄이 접히지 않고 RUN 명령의 출력이 전부 보입니다. 빌드가 왜 실패했는지 찾을 때 유용합니다.
반대로 <code>-q</code> 는 이미지 ID 만 출력합니다.</div>`
      },

      /* ================================================================ 5 */
      {
        title: '레이어 캐시 — CACHED 의 비밀과 명령 순서',
        html: `
<p>같은 이미지를 두 번 빌드하면 두 번째는 순식간에 끝납니다. 앞 절에서 본 <code>CACHED</code> 표시 덕분인데요, 규칙은 간단합니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 중간 저장이 있는 요리</div>
레시피의 각 단계가 끝날 때마다 "여기까지 만든 반죽"을 냉장고에 넣어 둡니다. 다음에 같은 레시피로 요리할 때,
<b>재료와 단계가 똑같으면</b> 냉장고에서 꺼내 쓰고(CACHED), <b>한 단계라도 달라지면 그 단계부터 끝까지</b> 새로 요리합니다.</div>

<ol class="steps-list">
<li><b>명령 글자</b>가 같고 <b>바로 앞 단계까지</b>가 모두 캐시였으면 → 이 단계도 캐시 후보</li>
<li><code>COPY</code> · <code>ADD</code> 는 복사할 <b>파일 내용</b>까지 비교 → 파일이 한 글자라도 바뀌면 캐시 깨짐</li>
<li>한 번 캐시가 깨지면 → <b>그 아래 단계는 전부 다시 실행</b></li>
</ol>

<p>그래서 <b>명령 순서</b>가 중요합니다. 자주 바뀌는 소스 코드는 아래로, 잘 안 바뀌는 의존성 설치는 위로 둡니다.</p>
{{fig:cacheorder}}
{{widget:cachesim}}

<h4>실제로 확인하기 — Flask 앱으로</h4>
<p>6절에서 자세히 볼 Flask 앱을 미리 만들어 캐시를 체험해 봅시다. 파일 네 개를 만들고 빌드합니다.</p>
{{widget:files|set=flask|cd=~/flask-app|title=Flask 앱 실습 파일 (~/flask-app)}}
${fb('~/flask-app/app.py', 'python')}
<div class="two"><div>
${fb('~/flask-app/requirements.txt')}
${fb('~/flask-app/Dockerfile', 'Dockerfile')}
</div><div>
${fb('~/flask-app/.dockerignore', 'dockerignore')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/flask-app
docker build -t flask-app:1.0 .</code></pre>
<p>이제 <code>app.py</code> 의 인사말만 조금 바꿔 봅시다. 아래 블록의 <b>📄 파일로 저장</b>을 누르면 app.py 가 수정본으로 바뀝니다 (📝 파일 탭에서 직접 고쳐도 됩니다).</p>
<pre class="code" data-lang="python" data-file="~/flask-app/app.py"><code>import os
import socket
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    name = os.environ.get("NAME", "Docker")
    return f"&lt;h1&gt;Hi, {name}! (v1.1)&lt;/h1&gt;&lt;p&gt;container: {socket.gethostname()}&lt;/p&gt;"

@app.route("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -t flask-app:1.1 .</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Building 0.5s (10/10) FINISHED
 => [internal] load build definition from Dockerfile                              0.0s
 => => transferring dockerfile: 156B                                              0.0s
 => [internal] load metadata for docker.io/library/python:3.12-slim               1.1s
 => [internal] load .dockerignore                                                 0.0s
 => => transferring context: 37B                                                  0.0s
 => CACHED [1/5] FROM docker.io/library/python:3.12-slim@sha256:03cd885a54ed5…    0.0s
 => CACHED [2/5] WORKDIR /app                                                     0.0s
 => [internal] load build context                                                 0.0s
 => => transferring context: 565B                                                 0.0s
 => <span class="hl">CACHED [3/5] COPY requirements.txt .</span>                                          0.0s
 => <span class="hl">CACHED [4/5] RUN pip install --no-cache-dir -r requirements.txt</span>               0.0s
 => [5/5] COPY . .                                                                0.1s
 => exporting to image                                                            0.1s
 ...</code></pre>
<p><code>app.py</code> 가 바뀌었으니 <code>[5/5] COPY . .</code> 만 다시 실행되고, 오래 걸리는 <code>pip install</code> 은 <b>CACHED</b> 입니다.
실제 프로젝트에서는 의존성 설치가 몇 분씩 걸리기도 하니, 이 순서 하나로 하루에 수십 분을 아낄 수 있습니다.</p>

<h4>docker history — 레이어 들여다보기</h4>
<p>이미지가 어떤 명령으로 쌓였는지, 각 레이어가 얼마나 큰지 보여 줍니다. 위가 가장 나중 단계입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker history flask-app:1.1</code></pre>
<pre class="code out" data-lang="출력"><code>IMAGE          CREATED        CREATED BY                                      SIZE     COMMENT
a6d3e2e6b9d3   1 second ago   CMD ["python","app.py"]                         0B       buildkit.dockerfile.v0
&lt;missing&gt;      1 second ago   EXPOSE map[5000/tcp:{}]                         0B       buildkit.dockerfile.v0
&lt;missing&gt;      1 second ago   COPY . . # buildkit                             565B     buildkit.dockerfile.v0
&lt;missing&gt;      1 second ago   RUN /bin/sh -c pip install --no-cache-dir -r…   13.9MB   buildkit.dockerfile.v0
&lt;missing&gt;      1 second ago   COPY requirements.txt . # buildkit              80B      buildkit.dockerfile.v0
&lt;missing&gt;      1 second ago   WORKDIR /app # buildkit                         0B       buildkit.dockerfile.v0
&lt;missing&gt;      3 weeks ago    CMD ["python3"]                                 0B
&lt;missing&gt;      3 weeks ago    ENV LANG=C.UTF-8                                0B
...
&lt;missing&gt;      3 weeks ago    /bin/sh -c #(nop) ADD file:839c1de212e6 in /    28.2MB</code></pre>
<p>아래쪽 줄들은 <code>python:3.12-slim</code> 을 만든 사람이 쌓은 레이어, 위쪽 6줄이 우리가 쌓은 레이어입니다.
<code>&lt;missing&gt;</code> 은 오류가 아니라 "중간 단계에 따로 이름(ID)이 없다"는 뜻입니다.</p>
{{widget:layers}}
<div class="box tip"><div class="box-t">💡 캐시를 무시하고 처음부터</div>
<code>docker build --no-cache -t app .</code> — 캐시 때문에 최신 패키지가 안 받아질 때, 또는 빌드가 정말 처음부터 되는지 확인할 때 씁니다.</div>`
      },

      /* ================================================================ 6 */
      {
        title: 'Python Flask 앱 이미지 만들기 — host="0.0.0.0" 이 중요한 이유',
        html: `
<p>앞 절에서 만든 Flask 앱을 한 줄씩 뜯어봅시다. 실무에서 가장 흔한 "파이썬 웹 앱 이미지"의 기본형입니다.</p>
<div class="two"><div>
<pre class="code" data-lang="requirements.txt"><code>flask==3.0.3</code></pre>
<p class="small">필요한 파이썬 패키지 목록. <code>==</code> 로 버전을 고정하면 언제 빌드해도 같은 버전이 설치됩니다.</p>
</div><div>
<pre class="code" data-lang="python"><code>if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)</code></pre>
<p class="small"><code>host="0.0.0.0"</code> — 이 한 줄이 이 절의 주인공입니다 (아래에서 설명).</p>
</div></div>

<div class="tbl-wrap"><table class="tbl">
<tr><th>Dockerfile 줄</th><th>이유</th></tr>
<tr><td><code>FROM python:3.12-slim</code></td><td>파이썬이 이미 설치된 공식 이미지. <code>slim</code> 은 불필요한 도구를 뺀 작은 판 (약 125MB, 풀 버전은 1GB 넘음)</td></tr>
<tr><td><code>WORKDIR /app</code></td><td>앱을 둘 폴더. 이후 <code>.</code> 은 모두 <code>/app</code> 을 뜻함</td></tr>
<tr><td><code>COPY requirements.txt .</code></td><td>의존성 목록<b>만</b> 먼저 복사 → 캐시 최적화 (5절)</td></tr>
<tr><td><code>RUN pip install --no-cache-dir -r requirements.txt</code></td><td>flask 설치. <code>--no-cache-dir</code> 은 pip 다운로드 캐시를 이미지에 남기지 않아 크기를 줄임</td></tr>
<tr><td><code>COPY . .</code></td><td>나머지 소스 전부 (.dockerignore 에 적은 것 제외)</td></tr>
<tr><td><code>EXPOSE 5000</code></td><td>문서: 5000번에서 기다림</td></tr>
<tr><td><code>CMD ["python", "app.py"]</code></td><td>컨테이너 시작 시 실행</td></tr>
</table></div>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name flask -p 5000:5000 flask-app:1.0
docker logs flask
curl -s localhost:5000
curl -s localhost:5000/health</code></pre>
<pre class="code out" data-lang="출력"><code>e547468c723894a73201142da033e1d6c93c4b65750c2d7efbebe1644510b763
 * Serving Flask app 'app'
 * Debug mode: off
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://172.17.0.2:5000
Press CTRL+C to quit
&lt;h1&gt;Hello, Docker!&lt;/h1&gt;&lt;p&gt;container: e547468c7238&lt;/p&gt;
{"status":"ok"}</code></pre>
<p><code>container:</code> 뒤에 찍힌 값이 컨테이너 ID 앞 12자리와 같죠? 컨테이너의 호스트 이름이 곧 컨테이너 ID 이기 때문입니다.
환경 변수로 인사말을 바꿔 보세요. 이미지를 다시 만들 필요가 없습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name flask2 -p 5001:5000 -e NAME=학생 flask-app:1.0
curl -s localhost:5001</code></pre>
{{widget:open|url=http://localhost:5000/|label=🌐 브라우저에서 localhost:5000 열기}}

<h4>⚠️ 가장 흔한 함정 — app.run() 의 기본값 127.0.0.1</h4>
<p>Flask 의 <code>app.run()</code> 은 아무것도 안 주면 <code>127.0.0.1</code>(localhost)에서만 기다립니다. 내 PC 에서 개발할 때는 문제없지만 컨테이너 안에서는 치명적입니다.</p>
{{fig:bind}}
<p>포트 게시(<code>-p</code>)로 들어온 요청은 컨테이너의 <b>eth0</b>(예: 172.17.0.2)으로 도착합니다. 그런데 앱은 <b>컨테이너 자기 자신(127.0.0.1)</b>만 쳐다보고 있으니 아무도 받지 않습니다.
그래서 컨테이너 안의 서버는 반드시 <code>host="0.0.0.0"</code>(모든 네트워크 카드)으로 띄워야 합니다.</p>
<table class="tbl">
<tr><th>프레임워크</th><th>컨테이너에서 쓰는 모양</th></tr>
<tr><td>Flask</td><td><code>app.run(host="0.0.0.0", port=5000)</code> 또는 <code>flask run --host=0.0.0.0</code></td></tr>
<tr><td>FastAPI (uvicorn)</td><td><code>uvicorn main:app --host 0.0.0.0 --port 8000</code></td></tr>
<tr><td>gunicorn</td><td><code>gunicorn -b 0.0.0.0:8000 app:app</code></td></tr>
<tr><td>Express</td><td><code>app.listen(3000)</code> — 기본이 모든 주소라 OK</td></tr>
</table>
<p>이 상황은 8절과 🎯 미션에서 직접 재현하고 고쳐 봅니다.</p>`
      },

      /* ================================================================ 7 */
      {
        title: 'Node Express 앱 이미지 만들기 — package.json 과 npm install',
        html: `
<p>Node.js 앱도 구조가 거의 같습니다. 파이썬의 <code>requirements.txt</code> 자리를 <code>package.json</code> 이, <code>pip install</code> 자리를 <code>npm install</code> 이 차지합니다.</p>
{{widget:files|set=node|cd=~/node-app|title=Express 앱 실습 파일 (~/node-app)}}
<div class="two"><div>
${fb('~/node-app/package.json', 'json')}
</div><div>
${fb('~/node-app/.dockerignore', 'dockerignore')}
</div></div>
${fb('~/node-app/server.js', 'javascript')}
${fb('~/node-app/Dockerfile', 'Dockerfile')}

<table class="tbl cmp">
<tr><th></th><th>Python</th><th>Node.js</th></tr>
<tr><td>베이스</td><td><code>python:3.12-slim</code></td><td><code>node:22-alpine</code></td></tr>
<tr><td>의존성 목록</td><td><code>requirements.txt</code></td><td><code>package.json</code> (+ <code>package-lock.json</code>)</td></tr>
<tr><td>목록 먼저 복사</td><td><code>COPY requirements.txt .</code></td><td><code>COPY package*.json ./</code> <span class="muted small">(lock 파일까지 한 번에)</span></td></tr>
<tr><td>설치</td><td><code>RUN pip install -r …</code></td><td><code>RUN npm install</code> <span class="muted small">(lock 파일이 있으면 <code>npm ci</code> 가 더 정확)</span></td></tr>
<tr><td>빼야 할 폴더</td><td><code>.venv/</code> <code>__pycache__/</code></td><td><code>node_modules</code></td></tr>
<tr><td>시작</td><td><code>CMD ["python", "app.py"]</code></td><td><code>CMD ["node", "server.js"]</code></td></tr>
</table>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/node-app
docker build -t node-app:1.0 .
docker run -d --name node -p 3000:3000 node-app:1.0
curl -s localhost:3000
curl -s localhost:3000/api/time
docker images node-app</code></pre>
<pre class="code out" data-lang="출력"><code> ...
 => [3/5] COPY package*.json ./                                                   0.1s
 => [4/5] RUN npm install                                                         0.1s
 => [5/5] COPY . .                                                                0.1s
 ...
&lt;h1&gt;Hello from Express!&lt;/h1&gt;&lt;p&gt;container: ef0bf6b1b834&lt;/p&gt;
{"now":"2026-09-25T18:07:28.752Z"}
REPOSITORY   TAG   IMAGE ID       CREATED                  SIZE
node-app     1.0   5ac91c6c72a0   Less than a second ago   171MB</code></pre>

<div class="box warn"><div class="box-t">⚠️ node_modules 를 왜 빼나요?</div>
<ul>
<li>내 PC 의 <code>node_modules</code> 는 <b>내 운영체제용</b>으로 설치된 것입니다. 윈도우 · 맥에서 설치한 네이티브 모듈은 리눅스 컨테이너에서 깨질 수 있어요.</li>
<li>수백 MB 라서 빌드 컨텍스트 전송이 느려지고, <code>COPY . .</code> 가 컨테이너 안에서 새로 설치한 것을 <b>덮어써</b> 버립니다.</li>
<li>그래서 <code>.dockerignore</code> 에 <code>node_modules</code> 를 적고, 이미지 안에서 <code>npm install</code> 로 새로 설치하는 것이 정석입니다.</li>
</ul></div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 운영용이라면</div>
<code>package-lock.json</code> 을 함께 커밋하고 <code>RUN npm ci --omit=dev</code> 를 쓰면 lock 파일과 <b>정확히 같은 버전</b>만, 개발용 패키지는 빼고 설치합니다.
<code>ENV NODE_ENV=production</code> 도 함께 넣는 경우가 많습니다. 이미지를 더 작고 안전하게 만드는 방법은 <a href="#ch07">7장</a>에서 이어집니다.</div>`
      },

      /* ================================================================ 8 */
      {
        title: '흔한 빌드 · 실행 오류 5가지와 해결법',
        html: `
<p>Dockerfile 을 쓰다 보면 누구나 만나는 오류들입니다. 오류 메시지를 <b>읽는 법</b>만 알면 대부분 1분 안에 고칩니다.
아래 버튼으로 일부러 고장 낸 프로젝트 5개를 만들어 직접 겪어 봅시다.</p>
{{widget:files|set=bugs|cd=~|title=고장 난 프로젝트 5개 (~/bug-*)}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>증상 (메시지)</th><th>원인</th><th>해결</th></tr>
<tr><td><code>"/requirments.txt": not found</code></td><td>COPY 할 파일 이름 오타 · 컨텍스트 밖 · .dockerignore 에 걸림</td><td>파일 이름 · 빌드 폴더(마지막 점) · .dockerignore 확인</td></tr>
<tr><td><code>unknown instruction: WORKDR</code></td><td>Dockerfile 명령 오타</td><td><code>did you mean workdir?</code> 제안대로 수정</td></tr>
<tr><td><code>No matching distribution found for flsk</code></td><td>pip 패키지 이름 오타 · 없는 버전</td><td>requirements.txt 수정</td></tr>
<tr><td>빌드는 성공 → 실행하자마자 Exited (1)<br><code>ModuleNotFoundError: No module named 'flask'</code></td><td><code>RUN pip install</code> 을 빼먹음</td><td>Dockerfile 에 설치 단계 추가 후 다시 빌드</td></tr>
<tr><td>컨테이너는 Up 인데 <code>curl: (56) Recv failure: Connection reset by peer</code></td><td>앱이 127.0.0.1 에서만 대기</td><td><code>host="0.0.0.0"</code> 으로 수정 후 다시 빌드</td></tr>
</table></div>

<h4>① COPY failed — 파일을 못 찾음</h4>
${fb('~/bug-copy/Dockerfile', 'Dockerfile')}
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/bug-copy
docker build -t bug-copy .</code></pre>
<pre class="code out" data-lang="출력"><code> => ERROR [3/5] COPY requirments.txt .                                            0.0s
Dockerfile:3
--------------------
  3 | >>> COPY requirments.txt .
--------------------
ERROR: failed to solve: failed to compute cache key: failed to calculate checksum of ref bc0c47b7-d0d6-4f07::9f8951fa73e57fcc6d42768ad: "/requirments.txt": not found</code></pre>
<p><b>읽는 법</b>: <code>Dockerfile:3</code> → 3번째 줄, <code>"/requirments.txt": not found</code> → 컨텍스트에 그 파일이 없음. <code>ls</code> 로 확인하면 실제 이름은 <code>requirements.txt</code> 입니다 (e 가 빠짐).</p>

<h4>② 명령 오타 — unknown instruction</h4>
${fb('~/bug-typo/Dockerfile', 'Dockerfile')}
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/bug-typo
docker build -t bug-typo .</code></pre>
<pre class="code out" data-lang="출력"><code>Dockerfile:2
--------------------
  2 | >>> WORKDR /app
--------------------
ERROR: failed to solve: dockerfile parse error on line 2: unknown instruction: WORKDR (did you mean workdir?)</code></pre>

<h4>③ pip 패키지 이름 오타 — RUN 이 실패</h4>
<div class="two"><div>
${fb('~/bug-pip/Dockerfile', 'Dockerfile')}
</div><div>
${fb('~/bug-pip/requirements.txt')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/bug-pip
docker build -t bug-pip .</code></pre>
<pre class="code out" data-lang="출력"><code> => ERROR [4/4] RUN pip install --no-cache-dir -r requirements.txt                 0.6s
------
 > [4/4] RUN pip install --no-cache-dir -r requirements.txt:
0.244 Collecting flsk
0.247 ERROR: Could not find a version that satisfies the requirement flsk (from versions: none)
0.511 ERROR: No matching distribution found for flsk
------
ERROR: failed to solve: process "/bin/sh -c pip install --no-cache-dir -r requirements.txt" did not complete successfully: exit code: 1</code></pre>
<p>RUN 이 실패하면 그 명령의 <b>출력 마지막 몇 줄</b>이 <code>------</code> 사이에 나옵니다. <code>exit code: 1</code> 은 "명령이 실패했다"는 뜻이고, 진짜 원인은 그 위(<code>flsk</code> 라는 패키지 없음)에 있습니다.</p>

<h4>④ ModuleNotFoundError — 빌드는 되는데 실행하면 죽음</h4>
<div class="two"><div>
${fb('~/bug-module/Dockerfile', 'Dockerfile')}
${fb('~/bug-module/requirements.txt')}
</div><div>
${fb('~/bug-module/app.py', 'python')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/bug-module
docker build -q -t bug-module .
docker run --name bugmod-test bug-module
docker ps -a --filter name=bugmod-test</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:579ecf7c4cff89e0cb36d39ab10e5a9c6b80b6c39f5c6f83a9e8b4b2638bf486
Traceback (most recent call last):
  File "/app/app.py", line 1, in &lt;module&gt;
    from flask import Flask
ModuleNotFoundError: No module named 'flask'
CONTAINER ID   IMAGE        COMMAND           CREATED                  STATUS                              PORTS   NAMES
5b7ed86dd795   bug-module   "python app.py"   Less than a second ago   Exited (1) Less than a second ago           bugmod-test</code></pre>
<p><code>requirements.txt</code> 를 COPY 하긴 했지만 <b>설치(RUN pip install)를 안 했습니다</b>. Dockerfile 은 빌드 때 실수를 알려 주지 않으니, 실행 후 <code>docker logs</code> 로 확인하는 습관이 중요합니다.</p>

<h4>⑤ 127.0.0.1 바인딩 — 떠 있는데 접속이 안 됨</h4>
<div class="two"><div>
${fb('~/bug-bind/app.py', 'python')}
<p class="small">마지막 줄 <code>app.run()</code> — host 를 안 줬으니 기본값 <b>127.0.0.1</b> 입니다.</p>
</div><div>
${fb('~/bug-bind/Dockerfile', 'Dockerfile')}
${fb('~/bug-bind/requirements.txt')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/bug-bind
docker build -q -t bug-bind .
docker run -d --name bind-test -p 5009:5000 bug-bind
docker logs bind-test
curl localhost:5009</code></pre>
<pre class="code out" data-lang="출력"><code> * Serving Flask app 'app'
 * Debug mode: off
 * Running on http://127.0.0.1:5000
Press CTRL+C to quit
curl: (56) Recv failure: Connection reset by peer</code></pre>
<p>로그에 <code>Running on http://127.0.0.1:5000</code> 한 줄뿐이죠? 정상일 때는 <code>Running on all addresses (0.0.0.0)</code> 이 나옵니다. 이 차이가 단서입니다.</p>

<div class="box practice"><div class="box-t">🧪 해 보기 — 문제 해결 순서</div>
<ol>
<li><b>빌드 실패</b>면 → <code>ERROR [n/m]</code> 줄과 <code>Dockerfile:줄번호</code> 를 먼저 본다</li>
<li><b>실행 직후 Exited</b> 면 → <code>docker logs 이름</code> 으로 Traceback 을 본다</li>
<li><b>Up 인데 접속 불가</b>면 → 포트(-p) 와 바인딩 주소(0.0.0.0)를 본다</li>
</ol>
①④⑤ 는 🎯 미션에서 직접 고쳐 봅니다. 📝 파일 탭에서 파일을 고친 뒤 <b>다시 빌드</b>해야 반영된다는 점을 잊지 마세요!</div>`
      },

      /* ================================================================ 9 */
      {
        title: 'docker commit 은 왜 비추천인가?',
        html: `
<p>Dockerfile 말고도 이미지를 만드는 방법이 하나 더 있습니다. 컨테이너 안에서 손으로 이것저것 고친 뒤, 그 상태를 통째로 사진 찍듯 이미지로 저장하는 <code>docker commit</code> 입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name handmade nginx:1.27-alpine
docker exec handmade sh -c "echo '&lt;h1&gt;손으로 고친 페이지&lt;/h1&gt;' &gt; /usr/share/nginx/html/index.html"
docker diff handmade
docker commit handmade my-web:commit</code></pre>
<pre class="code out" data-lang="출력"><code>C /usr
C /usr/share
C /usr/share/nginx
C /usr/share/nginx/html
C /usr/share/nginx/html/index.html
sha256:e41940e04d3ab48708cb74269a1f9cea733f300714a2991ca63d901fc0cdb448</code></pre>
<p>잘 되긴 합니다. 그런데 한 달 뒤에 "이 이미지는 어떻게 만들었지?" 라고 물으면 아무도 대답할 수 없습니다.</p>

<div class="vs"><div class="vs-a red"><b>📸 docker commit</b><ul>
<li>무엇을 했는지 <b>기록이 없음</b> (history 에 "(commit)" 한 줄)</li>
<li>똑같이 다시 만들 수 없음 → 재현성 ✖</li>
<li>실수로 남긴 임시 파일 · 로그 · 비밀번호까지 <b>통째로 저장</b></li>
<li>코드 리뷰 · git 관리 · CI 자동 빌드 불가</li>
<li>베이스 이미지 보안 업데이트 때 처음부터 손으로 다시…</li>
</ul></div>
<div class="vs-mid">VS</div>
<div class="vs-b green"><b>📝 Dockerfile</b><ul>
<li>모든 단계가 <b>글로 남음</b></li>
<li><code>docker build</code> 한 줄로 누구나 같은 이미지</li>
<li>.dockerignore 로 필요한 파일만</li>
<li>git 으로 변경 이력 · 리뷰 · CI/CD</li>
<li>FROM 태그만 바꾸고 다시 빌드하면 업데이트 끝</li>
</ul></div></div>

<div class="box tip"><div class="box-t">💡 commit 을 써도 되는 순간</div>
장애가 난 컨테이너의 상태를 <b>조사용으로 보관</b>해 둘 때 정도입니다. 배포할 이미지는 언제나 Dockerfile 로 만드세요.
같은 결과를 Dockerfile 로 쓰면 이렇게 두 줄입니다 — 2절에서 이미 해 봤죠!</div>
<pre class="code" data-lang="Dockerfile"><code>FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html</code></pre>

{{widget:mission}}`
      }
    ],

    missions: [
      {
        id: 'm1',
        title: '첫 이미지 hello-web:1.0 을 만들어 8080 포트로 띄우기',
        desc: '2절의 <b>📁 파일 만들기</b>로 <code>~/hello-web</code> 을 준비한 뒤, 이미지를 빌드하고 <code>hello</code> 라는 이름으로 <code>-p 8080:80</code> 실행하세요. 🌐 브라우저에서 <code>localhost:8080</code> 에 내 페이지가 보이면 성공!',
        hint: '<code>cd ~/hello-web</code> → <code>docker build -t hello-web:1.0 .</code> (마지막 점!) → <code>docker run -d --name hello -p 8080:80 hello-web:1.0</code>',
        files: 'hello',
        answer: ['cd ~/hello-web', 'docker build -t hello-web:1.0 .', 'docker run -d --name hello -p 8080:80 hello-web:1.0'],
        check: async M => { const i = M.image('hello-web:1.0'); return !!i && !!i.built && (await M.get('http://localhost:8080/')).includes('내가 만든 첫 이미지'); }
      },
      {
        id: 'm2',
        title: 'Flask 앱 이미지 flask-app:1.0 을 빌드해 5000 포트로 실행하기',
        desc: '5절의 <b>📁 파일 만들기</b>로 <code>~/flask-app</code> 을 준비하세요. 이미지 <code>flask-app:1.0</code> 을 만들고 <code>flask</code> 라는 이름으로 <code>-p 5000:5000</code> 실행해서 <code>curl -s localhost:5000</code> 에 Hello 가 나오게 하세요.',
        hint: '<code>docker build -t flask-app:1.0 .</code> 을 <code>~/flask-app</code> 에서 → <code>docker run -d --name flask -p 5000:5000 flask-app:1.0</code>',
        files: 'flask',
        answer: ['cd ~/flask-app', 'docker build -t flask-app:1.0 .', 'docker run -d --name flask -p 5000:5000 flask-app:1.0'],
        check: async M => { const i = M.image('flask-app:1.0'); return !!i && i.built && M.running('flask') && /Hello|Hi/.test(await M.get('http://localhost:5000/')); }
      },
      {
        id: 'm3',
        title: 'Express 앱 이미지 node-app:1.0 을 3000 포트로 실행하기',
        desc: '7절의 <b>📁 파일 만들기</b>로 <code>~/node-app</code> 을 준비하고, 이미지 <code>node-app:1.0</code> 을 빌드해 <code>-p 3000:3000</code> 으로 실행하세요. <code>localhost:3000/api/time</code> 이 JSON 을 돌려주면 성공입니다.',
        hint: '<code>cd ~/node-app</code> → <code>docker build -t node-app:1.0 .</code> → <code>docker run -d --name node -p 3000:3000 node-app:1.0</code>',
        files: 'node',
        answer: ['cd ~/node-app', 'docker build -t node-app:1.0 .', 'docker run -d --name node -p 3000:3000 node-app:1.0'],
        check: async M => { const i = M.image('node-app:1.0'); return !!i && i.built && (await M.get('http://localhost:3000/api/time')).includes('"now"'); }
      },
      {
        id: 'm4',
        title: '.dockerignore 로 비밀 파일을 이미지에서 빼기',
        desc: '4절의 <code>~/ctx-demo</code> 폴더에서 <code>secret.env</code> 가 <b>이미지 안에 들어가지 않도록</b> <code>.dockerignore</code> 를 만들고 이미지 <code>ctx-demo:safe</code> 를 빌드하세요. (<code>app.txt</code> 는 들어가야 합니다) <code>docker run --rm ctx-demo:safe</code> 로 목록을 확인해 보세요.',
        hint: '📝 파일 탭에서 <code>~/ctx-demo/.dockerignore</code> 를 만들고 <code>secret.env</code> 한 줄을 적으세요. 터미널이라면 <code>echo "secret.env" &gt; .dockerignore</code>. 그다음 <code>docker build -t ctx-demo:safe .</code>',
        files: 'ctx',
        answer: ['cd ~/ctx-demo', 'echo "secret.env" > .dockerignore', 'docker build -t ctx-demo:safe .', 'docker run --rm ctx-demo:safe'],
        check: M => { const i = M.image('ctx-demo:safe'); if (!i || !i.built) return false; const fs = new VFS.FS(i.fs); return fs.read('/app/app.txt') != null && fs.read('/app/secret.env') == null; }
      },
      {
        id: 'm5', scenario: true,
        title: 'COPY 가 파일을 못 찾는다! bug-copy 빌드 고치기',
        desc: '8절의 <b>📁 고장 난 프로젝트</b> 버튼으로 <code>~/bug-copy</code> 를 만든 뒤 ⚙️ 상황 만들기를 누르면 빌드가 <code>not found</code> 로 실패합니다. Dockerfile 을 고쳐서 이미지 <code>bug-copy</code> 를 빌드하고, <code>bugcopy</code> 라는 이름으로 <code>-p 5002:5000</code> 실행하세요.',
        setup: ['cd ~/bug-copy', 'docker build -t bug-copy .'],
        hint: '오류 줄 <code>Dockerfile:3</code> 을 보세요. <code>ls</code> 로 실제 파일 이름과 비교! 📝 파일 탭에서 <code>requirments.txt</code> → <code>requirements.txt</code> 로 고치고 다시 빌드합니다.',
        files: 'bugcopy',
        answer: ['cd ~/bug-copy', 'echo "FROM python:3.12-slim" > Dockerfile', 'echo "WORKDIR /app" >> Dockerfile', 'echo "COPY requirements.txt ." >> Dockerfile', 'echo "RUN pip install --no-cache-dir -r requirements.txt" >> Dockerfile', 'echo "COPY . ." >> Dockerfile', `echo 'CMD ["python", "app.py"]' >> Dockerfile`, 'docker build -t bug-copy .', 'docker run -d --name bugcopy -p 5002:5000 bug-copy'],
        check: async M => !!M.image('bug-copy') && (await M.get('http://localhost:5002/')).includes('COPY 오류를 고쳤습니다')
      },
      {
        id: 'm6', scenario: true,
        title: 'ModuleNotFoundError — 실행하자마자 죽는 컨테이너 살리기',
        desc: '8절의 <code>~/bug-module</code> 로 ⚙️ 상황 만들기를 누르면 <code>bugmod</code> 컨테이너가 곧바로 <b>Exited (1)</b> 이 됩니다. 로그로 원인을 찾고 Dockerfile 을 고쳐 다시 빌드한 뒤, 같은 이름 <code>bugmod</code> · <code>-p 5003:5000</code> 으로 실행 상태를 만드세요.',
        setup: ['cd ~/bug-module', 'docker build -t bug-module .', 'docker run -d --name bugmod -p 5003:5000 bug-module'],
        hint: '<code>docker logs bugmod</code> → <code>No module named \'flask\'</code>. Dockerfile 에 <code>COPY requirements.txt .</code> + <code>RUN pip install --no-cache-dir -r requirements.txt</code> 를 <code>COPY . .</code> 앞에 넣고 다시 빌드 → <code>docker rm bugmod</code> → 다시 run.',
        files: 'bugmod',
        answer: ['cd ~/bug-module', 'docker logs bugmod', 'echo "FROM python:3.12-slim" > Dockerfile', 'echo "WORKDIR /app" >> Dockerfile', 'echo "COPY requirements.txt ." >> Dockerfile', 'echo "RUN pip install --no-cache-dir -r requirements.txt" >> Dockerfile', 'echo "COPY . ." >> Dockerfile', `echo 'CMD ["python", "app.py"]' >> Dockerfile`, 'docker build -t bug-module .', 'docker rm -f bugmod', 'docker run -d --name bugmod -p 5003:5000 bug-module'],
        check: async M => M.running('bugmod') && (await M.get('http://localhost:5003/')).includes('모듈 문제 해결')
      },
      {
        id: 'm7', scenario: true,
        title: '컨테이너는 Up 인데 접속이 안 된다 — 127.0.0.1 바인딩 고치기',
        desc: '8절의 <code>~/bug-bind</code> 로 ⚙️ 상황 만들기를 누르면 <code>bindapp</code> 컨테이너가 <code>-p 5004:5000</code> 으로 실행되지만 <code>curl localhost:5004</code> 는 실패합니다. app.py 를 고쳐 다시 빌드하고, 같은 이름 · 같은 포트로 다시 실행해서 <code>Hello, 0.0.0.0!</code> 이 보이게 하세요.',
        setup: ['cd ~/bug-bind', 'docker build -t bug-bind .', 'docker run -d --name bindapp -p 5004:5000 bug-bind'],
        hint: '<code>docker logs bindapp</code> 에 <code>Running on http://127.0.0.1:5000</code> 만 있나요? 📝 파일 탭에서 <code>app.run()</code> → <code>app.run(host="0.0.0.0", port=5000)</code> 으로 고치고 → <code>docker build -t bug-bind .</code> → <code>docker rm -f bindapp</code> → 다시 run.',
        files: 'bugbind',
        answer: ['cd ~/bug-bind', 'docker logs bindapp', 'echo "from flask import Flask" > app.py', 'echo "app = Flask(__name__)" >> app.py', 'echo \'@app.route("/")\' >> app.py', 'echo "def index():" >> app.py', 'echo \'    return "<h1>Hello, 0.0.0.0!</h1>"\' >> app.py', 'echo \'if __name__ == "__main__":\' >> app.py', 'echo \'    app.run(host="0.0.0.0", port=5000)\' >> app.py', 'docker build -t bug-bind .', 'docker rm -f bindapp', 'docker run -d --name bindapp -p 5004:5000 bug-bind'],
        check: async M => M.running('bindapp') && (await M.get('http://localhost:5004/')).includes('Hello, 0.0.0.0!')
      }
    ],

    videos: [
      { title: 'Learn Docker in 7 Easy Steps - Full Beginner\'s Tutorial', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=gAkwW2tuIqE', lang: 'en', min: '11분', desc: 'Dockerfile 작성 → build → run 까지 빠르게 훑어보는 입문 영상' },
      { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: '긴 강좌 중 "Dockerfile - Build your own Docker Image" 부분이 이 장과 같은 내용' },
      { title: 'Dockerfile 작성법 (검색)', url: 'https://www.youtube.com/results?search_query=Dockerfile+%EC%9E%91%EC%84%B1%EB%B2%95', desc: '한국어 Dockerfile 입문 영상 검색 결과' },
      { title: 'Docker build cache 와 레이어 (검색)', url: 'https://www.youtube.com/results?search_query=docker+build+cache+layers+explained', desc: '레이어 캐시 원리를 설명하는 영상 검색 결과' },
      { title: 'Flask 앱 Docker 로 배포하기 (검색)', url: 'https://www.youtube.com/results?search_query=flask+docker+tutorial', desc: 'Python Flask 앱을 이미지로 만드는 예제 영상 검색 결과' }
    ],

    terms: [
      ['Dockerfile', '이미지를 만드는 순서를 적은 텍스트 파일(레시피). 한 줄에 명령 하나, 위에서 아래로 실행'],
      ['docker build', 'Dockerfile 과 빌드 컨텍스트로 이미지를 만드는 명령. -t 이름:태그 로 이름을 붙임'],
      ['빌드 컨텍스트(build context)', 'docker build 마지막 인자(보통 .)가 가리키는 폴더. 빌더에게 통째로 보내지며 COPY 는 이 안의 파일만 쓸 수 있음'],
      ['.dockerignore', '빌드 컨텍스트에서 뺄 파일 · 폴더 목록. 비밀 파일 · node_modules · .git · 로그 등을 적음'],
      ['베이스 이미지', 'FROM 으로 고르는 출발점 이미지. 예: python:3.12-slim, node:22-alpine, nginx:1.27-alpine'],
      ['레이어(layer)', 'RUN · COPY · ADD 한 번이 만드는 파일 변화 묶음. 읽기 전용이고 이미지끼리 공유됨'],
      ['레이어 캐시(CACHED)', '명령과 입력 파일이 이전 빌드와 같으면 결과를 재사용하는 것. 한 단계가 바뀌면 그 아래는 모두 다시 실행'],
      ['BuildKit', 'Docker 의 기본 이미지 빌더. [+] Building … 형태로 단계별 진행 · 캐시 · 오류를 보여 줌'],
      ['RUN vs CMD', 'RUN 은 빌드할 때 실행해 결과를 이미지에 저장, CMD 는 컨테이너가 시작할 때 실행할 기본 명령'],
      ['EXPOSE', '앱이 쓰는 포트를 알려 주는 문서용 설정. 실제 포트 게시는 docker run -p 로 함'],
      ['WORKDIR', '이후 명령의 작업 폴더를 정함. 없으면 만들어 줌'],
      ['0.0.0.0 바인딩', '모든 네트워크 카드에서 연결을 받겠다는 뜻. 컨테이너 안 서버는 127.0.0.1 이 아니라 0.0.0.0 으로 띄워야 포트 게시가 동작'],
      ['docker history', '이미지의 레이어를 만든 명령과 크기를 위(최신)에서 아래(베이스)로 보여 주는 명령'],
      ['docker commit', '실행 중 컨테이너 상태를 이미지로 저장하는 명령. 재현성이 없어 배포용으로는 비추천']
    ],

    summary: [
      '<b>Dockerfile = 레시피, 이미지 = 붕어빵 틀, 컨테이너 = 붕어빵.</b> <code>docker build -t 이름:태그 .</code> 로 굽고 <code>docker run</code> 으로 찍어 낸다.',
      '핵심 명령: <code>FROM</code>(출발점) · <code>WORKDIR</code>(폴더) · <code>COPY</code>(파일 복사, ADD 보다 권장) · <code>RUN</code>(빌드 때 실행) · <code>ENV</code> · <code>EXPOSE</code>(문서) · <code>CMD</code>(시작 명령).',
      '마지막 <b>점(.)은 빌드 컨텍스트</b>. COPY 는 그 안의 파일만 볼 수 있고, <code>.dockerignore</code> 로 비밀 · 대용량 파일을 뺀다.',
      '<b>레이어 캐시</b>: 한 단계가 바뀌면 그 아래는 전부 다시 실행 → 의존성 목록 COPY + 설치를 먼저, <code>COPY . .</code> 는 나중에.',
      'Python 은 <code>requirements.txt</code> + <code>pip install --no-cache-dir</code>, Node 는 <code>package*.json</code> + <code>npm install</code>, 그리고 <b>서버는 0.0.0.0 으로</b> 띄운다.',
      '오류 읽기: 빌드 실패는 <code>ERROR [n/m]</code> 과 <code>Dockerfile:줄</code>, 실행 직후 종료는 <code>docker logs</code>, 접속 불가는 포트와 바인딩 주소.',
      '<code>docker commit</code> 은 기록이 남지 않아 재현할 수 없다 → 배포 이미지는 항상 Dockerfile 로.'
    ],

    quiz: [
      { q: '<code>docker build -t myapp:1.0 .</code> 에서 마지막 점(.)의 뜻은?', options: ['현재 폴더의 모든 이미지를 뜻한다', '빌드 컨텍스트 — 빌더에게 보낼 재료 폴더 경로', '태그를 latest 로 붙이라는 뜻', 'Dockerfile 의 첫 줄을 뜻한다'], answer: 1, explain: '마지막 인자는 빌드 컨텍스트 경로입니다. 이 폴더가 빌더로 전송되고, COPY 는 이 안의 파일만 쓸 수 있습니다. 빠뜨리면 "requires exactly 1 argument" 오류가 납니다.' },
      { q: '다음 중 컨테이너가 <b>시작될 때</b> 실행되는 명령을 정하는 것은?', options: ['RUN', 'COPY', 'CMD', 'FROM'], answer: 2, explain: 'RUN 은 이미지를 만드는 중(빌드 때)에 실행되고, CMD 는 컨테이너를 실행할 때 시작되는 기본 명령입니다.' },
      { q: 'app.py 를 한 줄 고치고 다시 빌드했더니 매번 <code>pip install</code> 이 처음부터 다시 실행된다. 가장 알맞은 해결은?', options: ['--no-cache 옵션을 붙인다', 'COPY requirements.txt + RUN pip install 을 COPY . . 보다 먼저 둔다', 'RUN 을 CMD 로 바꾼다', '베이스 이미지를 python:3.12 로 바꾼다'], answer: 1, explain: 'COPY . . 에서 app.py 변화로 캐시가 깨지면 그 아래 단계가 모두 다시 실행됩니다. 잘 바뀌지 않는 의존성 설치를 위로 올리면 CACHED 로 건너뜁니다.' },
      { q: 'Flask 컨테이너가 Up 상태이고 -p 5000:5000 도 줬는데 <code>curl localhost:5000</code> 이 <code>Connection reset by peer</code> 로 실패한다. 로그에는 <code>Running on http://127.0.0.1:5000</code> 만 있다. 원인은?', options: ['EXPOSE 5000 을 안 써서', '앱이 컨테이너 자신(127.0.0.1)에서만 기다려서', 'pip install 을 안 해서', '이미지 이름이 대문자라서'], answer: 1, explain: '포트 게시로 들어온 요청은 컨테이너의 eth0 으로 도착하므로, 앱은 app.run(host="0.0.0.0") 처럼 모든 주소에서 기다려야 합니다. EXPOSE 는 문서일 뿐입니다.' },
      { q: '<code>.dockerignore</code> 에 대한 설명으로 <b>틀린</b> 것은?', options: ['빌드 컨텍스트 전송량을 줄여 빌드를 빠르게 한다', '비밀 파일이 COPY . . 로 이미지에 들어가는 것을 막는다', '.dockerignore 에 적은 파일도 COPY 로 이름을 직접 쓰면 복사된다', 'node_modules 같은 큰 폴더를 적는 것이 일반적이다'], answer: 2, explain: '.dockerignore 에 걸린 파일은 빌더 입장에서 아예 없는 파일이라, 이름을 직접 써도 "not found" 오류가 납니다.' },
      { q: '빌드는 성공했는데 컨테이너가 바로 Exited (1) 이 되고 로그에 <code>ModuleNotFoundError: No module named \'flask\'</code> 가 있다. 가장 가능성 높은 원인은?', options: ['Dockerfile 에 RUN pip install 단계가 없다', '포트가 이미 사용 중이다', 'EXPOSE 가 잘못됐다', 'CMD 를 JSON 배열로 썼다'], answer: 0, explain: 'requirements.txt 를 복사만 하고 설치하지 않으면 이미지 안에 flask 가 없습니다. RUN pip install -r requirements.txt 를 추가하고 다시 빌드하세요.' },
      { q: '<code>docker commit</code> 으로 배포 이미지를 만드는 것을 권하지 않는 가장 큰 이유는?', options: ['commit 은 이미지 크기를 두 배로 만든다', '어떻게 만들었는지 기록이 없어 똑같이 다시 만들 수 없다', 'commit 한 이미지는 push 할 수 없다', 'commit 은 Docker 27 에서 없어졌다'], answer: 1, explain: 'commit 은 컨테이너 상태를 사진 찍듯 저장할 뿐, 과정이 남지 않습니다. Dockerfile 은 git 으로 관리 · 리뷰 · 자동 빌드가 가능하고 누구나 같은 이미지를 재현합니다.' }
    ]
  });
})();
