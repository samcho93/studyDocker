/* 7장 — Dockerfile 심화: 작고 안전한 이미지 */
(function () {
  'use strict';

  const GO_MAIN = `package main

import (
\t"fmt"
\t"log"
\t"net/http"
)

func main() {
\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
\t\tfmt.Fprintln(w, "Hello from Go!")
\t})
\tlog.Println("listening on :8080")
\tlog.Fatal(http.ListenAndServe(":8080", nil))
}
`;
  const SAFE_APP = `from flask import Flask

# 시작할 때 /app 에 파일을 하나 씁니다 (쓰기 권한 확인용)
with open("/app/started.txt", "w") as f:
    f.write("ok")

app = Flask(__name__)

@app.route("/")
def index():
    return "<h1>안전한 Flask 이미지 🔒</h1>"

@app.route("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`;

  /* ------------------------------------------------------------------ 실습 파일 */
  const F = {
    /* CMD · ENTRYPOINT */
    '~/entry-demo/Dockerfile.cmd': `FROM alpine:3.20
CMD ["echo", "안녕하세요"]
`,
    '~/entry-demo/Dockerfile.ep': `FROM alpine:3.20
ENTRYPOINT ["echo", "안녕,"]
CMD ["세상"]
`,
    '~/entry-demo/Dockerfile.ping': `FROM alpine:3.20
ENTRYPOINT ["ping", "-c", "3"]
CMD ["localhost"]
`,
    '~/entry-demo/Dockerfile.shell': `FROM alpine:3.20
ENV NAME=도커
CMD echo "hello $NAME"
`,
    '~/entry-demo/Dockerfile.exec': `FROM alpine:3.20
ENV NAME=도커
CMD ["echo", "hello $NAME"]
`,

    /* Go 멀티 스테이지 */
    '~/goapp/main.go': GO_MAIN,
    '~/goapp/go.mod': `module goapp

go 1.23
`,
    '~/goapp/Dockerfile.fat': `FROM golang:1.23
WORKDIR /src
COPY . .
RUN go build -o /app .
EXPOSE 8080
CMD ["/app"]
`,
    '~/goapp/Dockerfile': `# ---- 1단계: 빌드 (컴파일러가 든 큰 이미지) ----
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app .

# ---- 2단계: 실행 (결과물만 담는 작은 이미지) ----
FROM alpine:3.20
RUN adduser -D -u 10001 app
COPY --from=build /out/app /usr/local/bin/app
USER app
EXPOSE 8080
CMD ["/usr/local/bin/app"]
`,
    '~/goapp/Dockerfile.distroless': `FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app .

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/app /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
`,

    /* Vite → nginx */
    '~/vite-web/package.json': `{
  "name": "vite-web",
  "version": "1.0.0",
  "scripts": { "build": "vite build" },
  "devDependencies": { "vite": "^5.4.11" }
}
`,
    '~/vite-web/index.html': `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>Vite 정적 사이트</title></head>
<body><h1>Vite 로 빌드한 정적 사이트 ⚡</h1></body>
</html>
`,
    '~/vite-web/.dockerignore': `node_modules
dist
.git
`,
    '~/vite-web/Dockerfile': `# 1단계: node 로 빌드 → dist/ 폴더 생성
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2단계: 결과 HTML · JS 만 nginx 로
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
`,

    /* 크기 줄이기 */
    '~/slim-demo/Dockerfile.bad': `FROM ubuntu:24.04
RUN apt-get update && apt-get install -y curl python3
`,
    '~/slim-demo/Dockerfile.good': `FROM ubuntu:24.04
RUN apt-get update \\
    && apt-get install -y --no-install-recommends curl python3 \\
    && rm -rf /var/lib/apt/lists/*
`,

    /* ARG · ENV */
    '~/arg-demo/Dockerfile': `FROM alpine:3.20
ARG APP_VERSION=1.0.0
ENV APP_VERSION=\${APP_VERSION}
LABEL org.opencontainers.image.title="arg-demo"
CMD ["sh", "-c", "echo version=$APP_VERSION"]
`,

    /* non-root 완성본 */
    '~/safe-flask/app.py': SAFE_APP,
    '~/safe-flask/requirements.txt': `flask==3.0.3
`,
    '~/safe-flask/.dockerignore': `__pycache__/
*.pyc
.venv/
.git/
.env
`,
    '~/safe-flask/Dockerfile': `# syntax=docker/dockerfile:1
FROM python:3.12-slim

LABEL org.opencontainers.image.title="safe-flask" \\
      org.opencontainers.image.version="1.0.0" \\
      org.opencontainers.image.source="https://github.com/example/safe-flask"

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

RUN useradd --create-home appuser
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1
CMD ["python", "app.py"]
`,

    /* 장애: non-root 권한 */
    '~/bug-perm/app.py': SAFE_APP,
    '~/bug-perm/requirements.txt': `flask==3.0.3
`,
    '~/bug-perm/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home appuser
USER appuser
EXPOSE 5000
CMD ["python", "app.py"]
`,

    /* 장애: COPY --from 경로 */
    '~/bug-stage/main.go': GO_MAIN,
    '~/bug-stage/go.mod': `module goapp

go 1.23
`,
    '~/bug-stage/Dockerfile': `FROM golang:1.23-alpine AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app .

FROM alpine:3.20
COPY --from=build /out/server /usr/local/bin/server
EXPOSE 8080
CMD ["/usr/local/bin/server"]
`,

    /* docker init */
    '~/init-demo/package.json': `{
  "name": "init-demo",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": { "express": "^4.21.1" }
}
`
  };

  const pick = (...prefixes) => Object.fromEntries(Object.entries(F).filter(([k]) => prefixes.some(p => k.startsWith(p))));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fb = (path, lang) => `<pre class="code" data-lang="${lang || 'text'}" data-file="${path}"><code>${esc(F[path].replace(/\n$/, ''))}</code></pre>`;

  Course.lesson({
    id: 'ch07', no: '07',
    icon: '🏗️',
    title: 'Dockerfile 심화 — 작고 안전한 이미지',
    subtitle: '1GB 짜리 이미지를 15MB 로, root 로 돌던 앱을 일반 사용자로',
    level: '중급', time: '120분',
    goals: [
      'CMD 와 ENTRYPOINT 의 차이, exec 형식과 shell 형식의 차이를 설명하고 docker run 인자가 무엇을 바꾸는지 예측할 수 있다',
      '멀티 스테이지 빌드로 빌드 도구와 실행 환경을 분리해 Go · 프런트엔드 이미지를 수십 배 작게 만들 수 있다',
      'slim · alpine · distroless 베이스 선택, RUN 합치기, 캐시 정리로 이미지 크기를 줄일 수 있다',
      'USER 로 non-root 실행을 설정하고 Permission denied 를 COPY --chown 으로 해결할 수 있다',
      'ARG · ENV · LABEL · HEALTHCHECK 를 알맞게 쓰고, 좋은 Dockerfile 체크리스트로 스스로 점검할 수 있다'
    ],
    chips: ['docker images', 'docker history goapp:slim', 'docker inspect -f "{{.Config.User}}" safe-flask:1.0', 'docker ps', 'curl -s localhost:8080'],

    files: {
      entry: pick('~/entry-demo/'),
      goapp: pick('~/goapp/'),
      vite: pick('~/vite-web/'),
      slim: pick('~/slim-demo/'),
      arg: pick('~/arg-demo/'),
      safe: pick('~/safe-flask/'),
      bugperm: pick('~/bug-perm/'),
      bugstage: pick('~/bug-stage/'),
      bugs: pick('~/bug-')
    },

    figs: {
      /* ---------------------------------------------------------- ENTRYPOINT + CMD */
      entrycmd: {
        caption: '최종 실행 명령 = ENTRYPOINT + CMD. docker run 뒤에 붙인 인자는 CMD 자리만 바꾸고, ENTRYPOINT 는 --entrypoint 로만 바꿀 수 있습니다',
        svg: `<svg class="dg" viewBox="0 0 860 310" role="img" aria-label="ENTRYPOINT 와 CMD 가 합쳐져 최종 실행 명령이 되고, docker run 인자가 CMD 를 대체하는 모습">
  <text x="20" y="30" class="t-b">이미지 pinger 의 설정</text>
  <rect x="20" y="44" width="260" height="46" rx="8" class="purple"/>
  <text x="150" y="64" class="t-c t-xs t-mu">ENTRYPOINT (고정 부분)</text>
  <text x="150" y="82" class="t-c t-sm t-mono t-b">["ping", "-c", "3"]</text>
  <text x="298" y="74" class="t-lg t-b">+</text>
  <rect x="320" y="44" width="200" height="46" rx="8" class="orange"/>
  <text x="420" y="64" class="t-c t-xs t-mu">CMD (기본 인자)</text>
  <text x="420" y="82" class="t-c t-sm t-mono t-b">["localhost"]</text>

  <rect x="20" y="118" width="820" height="50" rx="10" class="box"/>
  <text x="36" y="140" class="t-sm t-mono">$ docker run pinger</text>
  <text x="36" y="158" class="t-xs t-mu">인자 없음 → CMD 그대로</text>
  <line x1="400" y1="143" x2="470" y2="143" class="ln ar"/>
  <text x="490" y="148" class="t-sm t-mono"><tspan class="t-purple t-b">ping -c 3</tspan> <tspan class="t-orange t-b">localhost</tspan></text>

  <rect x="20" y="180" width="820" height="50" rx="10" class="box"/>
  <text x="36" y="202" class="t-sm t-mono">$ docker run pinger 8.8.8.8</text>
  <text x="36" y="220" class="t-xs t-mu">인자가 CMD 자리를 대체</text>
  <line x1="400" y1="205" x2="470" y2="205" class="ln ar"/>
  <text x="490" y="210" class="t-sm t-mono"><tspan class="t-purple t-b">ping -c 3</tspan> <tspan class="t-green t-b">8.8.8.8</tspan></text>

  <rect x="20" y="242" width="820" height="50" rx="10" class="box"/>
  <text x="36" y="264" class="t-sm t-mono">$ docker run --entrypoint ls pinger /</text>
  <text x="36" y="282" class="t-xs t-mu">ENTRYPOINT 까지 교체 (CMD 도 버려짐)</text>
  <line x1="400" y1="267" x2="470" y2="267" class="ln ar"/>
  <text x="490" y="272" class="t-sm t-mono"><tspan class="t-red t-b">ls</tspan> <tspan class="t-green t-b">/</tspan></text>

  <text x="600" y="30" class="t-xs t-mu">보라 = ENTRYPOINT · 주황 = CMD</text>
  <text x="600" y="48" class="t-xs t-mu">초록 = docker run 에서 준 인자</text>
</svg>`
      },

      /* ---------------------------------------------------------- 멀티 스테이지 */
      multistage: {
        caption: '멀티 스테이지 빌드: 공장(1단계)에서 만든 완제품만 COPY --from 으로 트럭(2단계)에 싣고, 공장 설비는 버립니다',
        svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="빌드 스테이지에서 컴파일한 바이너리만 COPY --from 으로 실행 스테이지에 복사하는 멀티 스테이지 빌드 그림">
  <rect x="20" y="20" width="370" height="290" rx="14" class="orange"/>
  <text x="205" y="46" class="t-c t-b">🏭 1단계: build</text>
  <text x="205" y="66" class="t-c t-xs t-mono">FROM golang:1.23-alpine AS build</text>
  <rect x="44" y="84" width="322" height="30" rx="6" class="box"/><text x="60" y="104" class="t-sm">🧰 Go 컴파일러 · 표준 라이브러리</text>
  <rect x="44" y="120" width="322" height="30" rx="6" class="box"/><text x="60" y="140" class="t-sm">📦 모듈 캐시 · 빌드 캐시</text>
  <rect x="44" y="156" width="322" height="30" rx="6" class="box"/><text x="60" y="176" class="t-sm">📄 소스 코드 main.go · go.mod</text>
  <rect x="44" y="192" width="322" height="30" rx="6" class="box"/><text x="60" y="212" class="t-sm">🔧 apk 도구 · 셸 · git …</text>
  <rect x="44" y="236" width="322" height="40" rx="8" class="s-blue"/><text x="205" y="261" class="t-c t-sm t-b tw">⚙️ /out/app (완성된 실행 파일 7.9MB)</text>
  <text x="205" y="298" class="t-c t-xs t-mu">이 스테이지는 최종 이미지에 들어가지 않음 (253MB+)</text>

  <path d="M368 256 C 450 256, 450 200, 520 200" class="ln-blue thick ar-blue moving" fill="none"/>
  <text x="455" y="236" class="t-c t-xs t-mono t-b t-blue">COPY --from=build</text>
  <text x="455" y="286" class="t-c t-xs t-mu">실행 파일 하나만!</text>

  <rect x="522" y="60" width="318" height="210" rx="14" class="green"/>
  <text x="681" y="86" class="t-c t-b">🚚 2단계: 최종 이미지</text>
  <text x="681" y="106" class="t-c t-xs t-mono">FROM alpine:3.20</text>
  <rect x="546" y="126" width="270" height="36" rx="6" class="gray"/><text x="681" y="149" class="t-c t-sm">alpine 기본 파일 (7.8MB)</text>
  <rect x="546" y="170" width="270" height="36" rx="6" class="s-blue"/><text x="681" y="193" class="t-c t-sm t-b tw">/usr/local/bin/app (7.9MB)</text>
  <text x="681" y="236" class="t-c t-b t-green">합계 15.7MB</text>
  <text x="681" y="256" class="t-c t-xs t-mu">한 단계로 만들면 1.03GB</text>
</svg>`
      },

      /* ---------------------------------------------------------- root vs non-root */
      nonroot: {
        caption: 'USER 로 일반 사용자를 지정하면 앱이 뚫려도 피해가 줄어듭니다. 대신 쓰기가 필요한 폴더는 COPY --chown 등으로 소유자를 맞춰야 합니다',
        svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="root 로 실행되는 컨테이너와 appuser 로 실행되는 컨테이너의 권한 차이, 그리고 Permission denied 와 chown 해결">
  <rect x="20" y="20" width="260" height="260" rx="14" class="red"/>
  <text x="150" y="46" class="t-c t-b">😈 USER 없음 = root</text>
  <rect x="40" y="64" width="220" height="34" rx="6" class="box"/><text x="150" y="86" class="t-c t-sm t-mono">uid=0(root)</text>
  <text x="44" y="124" class="t-sm">✔ 모든 파일 쓰기 가능</text>
  <text x="44" y="148" class="t-sm">✔ 패키지 설치 가능</text>
  <text x="44" y="172" class="t-sm t-red t-b">⚠ 앱이 해킹되면</text>
  <text x="44" y="194" class="t-sm t-red">공격자도 root 권한</text>
  <text x="44" y="218" class="t-sm t-red">마운트한 호스트 폴더도</text>
  <text x="44" y="240" class="t-sm t-red">root 로 망가뜨릴 수 있음</text>

  <rect x="300" y="20" width="260" height="260" rx="14" class="yellow"/>
  <text x="430" y="46" class="t-c t-b">🙂 USER appuser</text>
  <rect x="320" y="64" width="220" height="34" rx="6" class="box"/><text x="430" y="86" class="t-c t-sm t-mono">uid=1000(appuser)</text>
  <rect x="320" y="112" width="220" height="56" rx="6" class="box"/>
  <text x="430" y="134" class="t-c t-xs t-mono">/app (소유자 root)</text>
  <text x="430" y="156" class="t-c t-xs t-mono t-red t-b">✖ Permission denied</text>
  <text x="320" y="196" class="t-xs t-mu">COPY . . 로 넣은 파일은</text>
  <text x="320" y="214" class="t-xs t-mu">기본적으로 root 소유라서</text>
  <text x="320" y="232" class="t-xs t-mu">appuser 가 쓸 수 없음</text>

  <line x1="562" y1="150" x2="598" y2="150" class="ln-green thick ar-green"/>

  <rect x="600" y="20" width="240" height="260" rx="14" class="green"/>
  <text x="720" y="46" class="t-c t-b">😎 USER + --chown</text>
  <rect x="616" y="64" width="208" height="34" rx="6" class="box"/><text x="720" y="86" class="t-c t-xs t-mono">COPY --chown=appuser:appuser</text>
  <rect x="616" y="112" width="208" height="56" rx="6" class="box"/>
  <text x="720" y="134" class="t-c t-xs t-mono">/app (소유자 appuser)</text>
  <text x="720" y="156" class="t-c t-xs t-mono t-green t-b">✔ started.txt 쓰기 OK</text>
  <text x="616" y="196" class="t-xs t-mu">앱은 자기 폴더만 쓰고</text>
  <text x="616" y="214" class="t-xs t-mu">시스템 파일 · 패키지는</text>
  <text x="616" y="232" class="t-xs t-mu">건드릴 수 없음 = 안전</text>
</svg>`
      },

      /* ---------------------------------------------------------- ARG vs ENV */
      argenv: {
        caption: 'ARG 는 빌드하는 동안만 존재하는 변수, ENV 는 이미지에 저장되어 컨테이너 실행 때도 보이는 변수입니다',
        svg: `<svg class="dg" viewBox="0 0 860 230" role="img" aria-label="ARG 는 빌드 시점에만, ENV 는 빌드와 실행 시점 모두에서 보이는 것을 나타낸 시간 막대">
  <rect x="160" y="20" width="330" height="36" rx="8" class="orange"/>
  <text x="325" y="43" class="t-c t-b">🏗️ docker build (빌드 시점)</text>
  <rect x="510" y="20" width="330" height="36" rx="8" class="green"/>
  <text x="675" y="43" class="t-c t-b">▶ docker run (실행 시점)</text>

  <text x="20" y="98" class="t-b t-mono">ARG</text>
  <text x="20" y="116" class="t-xs t-mu">--build-arg 로 바꿈</text>
  <rect x="160" y="82" width="330" height="30" rx="15" class="s-blue"/>
  <text x="325" y="102" class="t-c t-sm tw t-b">RUN · ENV 에서 \${APP_VERSION} 사용 가능</text>
  <text x="675" y="102" class="t-c t-sm t-red t-b">✖ 컨테이너에선 사라짐</text>

  <text x="20" y="160" class="t-b t-mono">ENV</text>
  <text x="20" y="178" class="t-xs t-mu">-e 로 덮어쓸 수 있음</text>
  <rect x="160" y="144" width="680" height="30" rx="15" class="s-blue"/>
  <text x="500" y="164" class="t-c t-sm tw t-b">빌드 중에도, 컨테이너 안(os.environ · process.env)에서도 보임</text>

  <text x="430" y="214" class="t-c t-xs t-mu">⚠ 둘 다 docker history · inspect 에 값이 남으므로 비밀번호 · 토큰은 넣지 않습니다</text>
</svg>`
      }
    },

    sections: [
      /* ================================================================ 1 */
      {
        title: 'CMD vs ENTRYPOINT — 컨테이너가 "무엇을" 실행할까',
        html: `
<p>6장에서는 <code>CMD ["python", "app.py"]</code> 로 시작 명령을 정했습니다. 그런데 공식 이미지들의 Dockerfile 을 보면 <code>ENTRYPOINT</code> 라는 비슷한 명령도 자주 나옵니다.
둘 다 "컨테이너가 시작될 때 실행할 것"을 정하지만 역할이 다릅니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 자판기</div>
<b>ENTRYPOINT</b> 는 자판기 자체(항상 "음료를 뽑는다"), <b>CMD</b> 는 아무 버튼도 안 눌렀을 때의 <b>기본 선택</b>(콜라)입니다.
손님이 버튼을 누르면(<code>docker run 이미지 사이다</code>) 기본 선택만 바뀌고, 자판기가 붕어빵 기계로 바뀌지는 않습니다.</div>

{{widget:files|set=entry|cd=~/entry-demo|title=CMD · ENTRYPOINT 실험 파일 (~/entry-demo)}}
<div class="two"><div>
${fb('~/entry-demo/Dockerfile.cmd', 'Dockerfile')}
</div><div>
${fb('~/entry-demo/Dockerfile.ep', 'Dockerfile')}
</div></div>

<h4>① CMD 만 있을 때 — run 인자가 CMD 를 통째로 대체</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/entry-demo
docker build -q -f Dockerfile.cmd -t say:cmd .
docker run --rm say:cmd
docker run --rm say:cmd echo 바꿔치기
docker run --rm say:cmd ls /</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:972a535d4d55aaebf311c132f4c51286628849624c089e8401166a4694599d14
안녕하세요
바꿔치기
bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var</code></pre>
<p>CMD 는 "기본값"일 뿐이라, 이미지 이름 뒤에 뭔가 적으면 <b>CMD 전체가 버려지고</b> 그 명령이 실행됩니다. 그래서 <code>docker run -it python:3.12 bash</code> 같은 일이 가능했던 거죠.</p>

<h4>② ENTRYPOINT + CMD — run 인자는 CMD 자리만</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -q -f Dockerfile.ep -t say:ep .
docker run --rm say:ep
docker run --rm say:ep 도커
docker run --rm --entrypoint ls say:ep /</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:02f01cc4ab6fff62159ec99457aec7d43c2258a5c5b1e46f347dc1a5d920d639
안녕, 세상
안녕, 도커
bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var</code></pre>

{{fig:entrycmd}}

<p>이 조합은 "특정 프로그램 전용 이미지"를 만들 때 딱입니다. <code>ping</code> 전용 이미지를 만들어 봅시다.</p>
${fb('~/entry-demo/Dockerfile.ping', 'Dockerfile')}
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -q -f Dockerfile.ping -t pinger .
docker run --rm pinger
docker run --rm pinger 8.8.8.8</code></pre>
<pre class="code out" data-lang="출력"><code>PING localhost (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: seq=0 ttl=64 time=0.035 ms
64 bytes from 127.0.0.1: seq=1 ttl=64 time=0.033 ms
64 bytes from 127.0.0.1: seq=2 ttl=64 time=0.034 ms

--- localhost ping statistics ---
3 packets transmitted, 3 packets received, 0% packet loss
round-trip min/avg/max = 0.024/0.030/0.036 ms
PING 8.8.8.8 (8.8.8.8): 56 data bytes
64 bytes from 8.8.8.8: seq=0 ttl=64 time=11.659 ms
...</code></pre>

<h4>③ exec 형식 vs shell 형식</h4>
<div class="two"><div>
${fb('~/entry-demo/Dockerfile.shell', 'Dockerfile')}
</div><div>
${fb('~/entry-demo/Dockerfile.exec', 'Dockerfile')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -q -f Dockerfile.shell -t say:shell .
docker build -q -f Dockerfile.exec -t say:exec .
docker run --rm say:shell
docker run --rm say:exec</code></pre>
<pre class="code out" data-lang="출력"><code>hello 도커
hello $NAME</code></pre>
<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>exec 형식 <code>["a", "b"]</code> <span class="tag green">권장</span></th><th>shell 형식 <code>a b</code></th></tr>
<tr><td>실제 실행</td><td>프로그램을 <b>바로</b> 실행</td><td><code>/bin/sh -c "a b"</code> 로 셸을 거쳐 실행</td></tr>
<tr><td><code>$변수</code> 치환</td><td>✖ 안 됨 (글자 그대로)</td><td>✔ 셸이 바꿔 줌</td></tr>
<tr><td>PID 1 · 종료 신호</td><td>앱이 PID 1 → <code>docker stop</code> 의 SIGTERM 을 <b>직접 받아</b> 깔끔하게 종료</td><td>셸이 PID 1 → 앱이 신호를 못 받아 10초 기다린 뒤 강제 종료되기 쉬움</td></tr>
<tr><td>셸 없는 이미지</td><td>✔ distroless · scratch 에서도 동작</td><td>✖ <code>/bin/sh</code> 가 없으면 실패</td></tr>
<tr><td>ENTRYPOINT 에 쓰면</td><td>CMD · run 인자가 뒤에 붙음</td><td>CMD · run 인자가 <b>무시됨</b></td></tr>
</table></div>
<div class="box tip"><div class="box-t">💡 변수가 꼭 필요하면</div>
exec 형식으로 셸을 명시하세요: <code>CMD ["sh", "-c", "echo hello $NAME"]</code>. 이렇게 하면 의도가 분명히 보입니다.
JSON 배열은 <b>큰따옴표</b>만 됩니다. <code>['echo', 'hi']</code> 처럼 작은따옴표를 쓰면 JSON 이 아니어서 shell 형식으로 취급돼요.</div>

<table class="tbl">
<tr><th>상황</th><th>추천</th></tr>
<tr><td>일반 웹 앱 (Flask, Express …)</td><td><code>CMD ["python", "app.py"]</code> — 디버깅 때 쉽게 바꿀 수 있음</td></tr>
<tr><td>도구 하나를 감싼 이미지 (ping, curl, 변환기 …)</td><td><code>ENTRYPOINT ["도구"]</code> + <code>CMD ["기본 인자"]</code></td></tr>
<tr><td>시작 전에 준비 작업이 필요 (DB 마이그레이션 등)</td><td><code>ENTRYPOINT ["docker-entrypoint.sh"]</code> + <code>CMD [...]</code> — nginx · postgres 공식 이미지 방식</td></tr>
</table>`
      },

      /* ================================================================ 2 */
      {
        title: '멀티 스테이지 빌드 — 공장과 트럭을 분리하기 (Go)',
        html: `
<p>Go · Java · C · 프런트엔드(React/Vite)처럼 <b>컴파일(빌드)</b>이 필요한 언어는, 빌드할 때만 필요한 도구가 엄청 큽니다.
Go 컴파일러가 든 <code>golang:1.23</code> 이미지는 800MB 가 넘는데, 완성된 프로그램은 10MB 도 안 됩니다. 컴파일러까지 이미지에 싣고 다닐 이유가 없죠.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 가구 공장과 배송 트럭</div>
가구는 공장(톱 · 드릴 · 페인트가 가득)에서 만들지만, 손님 집에 보낼 때는 <b>완성된 가구만</b> 트럭에 싣습니다. 공장 설비를 트럭에 같이 싣는 사람은 없어요.
멀티 스테이지 빌드는 Dockerfile 안에 <b>FROM 을 여러 번</b> 써서 공장(빌드 스테이지)과 트럭(최종 스테이지)을 나누는 방법입니다.</div>

{{widget:files|set=goapp|cd=~/goapp|title=Go 웹 서버 실습 파일 (~/goapp)}}
<div class="two"><div>
${fb('~/goapp/main.go', 'go')}
${fb('~/goapp/go.mod', 'text')}
</div><div>
<p class="small"><b>먼저 나쁜 예</b> — 빌드한 이미지 그대로 실행</p>
${fb('~/goapp/Dockerfile.fat', 'Dockerfile')}
</div></div>
${fb('~/goapp/Dockerfile', 'Dockerfile')}
<table class="tbl">
<tr><th>줄</th><th>뜻</th></tr>
<tr><td><code>FROM golang:1.23-alpine <b>AS build</b></code></td><td>첫 스테이지에 <code>build</code> 라는 이름을 붙임</td></tr>
<tr><td><code>RUN CGO_ENABLED=0 go build -o /out/app .</code></td><td>C 라이브러리에 의존하지 않는 <b>정적 실행 파일</b>로 컴파일 (alpine · scratch 에서도 돌아가게)</td></tr>
<tr><td><code>FROM alpine:3.20</code></td><td>두 번째 FROM = 새 스테이지. 여기서부터가 <b>최종 이미지</b></td></tr>
<tr><td><code>COPY <b>--from=build</b> /out/app /usr/local/bin/app</code></td><td>내 PC 가 아니라 <b>build 스테이지</b>에서 파일을 가져옴</td></tr>
</table>

<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/goapp
docker build -q -f Dockerfile.fat -t goapp:fat .
docker build -t goapp:slim .
docker images goapp</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:8db05e53a825eb5950e8c2524513575481d386ff4aab2767e3fa40962b6c6086
[+] Building 1.3s (15/15) FINISHED
 => [internal] load build definition from Dockerfile                              0.0s
 => [internal] load metadata for docker.io/library/golang:1.23-alpine             1.0s
 => [internal] load metadata for docker.io/library/alpine:3.20                    1.5s
 => [build 1/6] FROM docker.io/library/golang:1.23-alpine@sha256:27b965962acd…    4.4s
 => [build 2/6] WORKDIR /src                                                      0.1s
 => [build 3/6] COPY go.mod ./                                                    0.1s
 => [build 4/6] RUN go mod download                                               0.1s
 => [build 5/6] COPY . .                                                          0.1s
 => [build 6/6] RUN CGO_ENABLED=0 go build -o /out/app .                          0.1s
 => CACHED [stage-1 1/3] FROM docker.io/library/alpine:3.20@sha256:6d6e4c52bc…    0.0s
 => [stage-1 2/3] RUN adduser -D -u 10001 app                                     0.1s
 => [stage-1 3/3] COPY --from=build /out/app /usr/local/bin/app                   0.1s
 => exporting to image                                                            0.1s
 ...
REPOSITORY   TAG    IMAGE ID       CREATED         SIZE
goapp        slim   d57c114ceefe   1 second ago    15.7MB
goapp        fat    8db05e53a825   2 seconds ago   1.03GB</code></pre>
<p><b>1.03GB → 15.7MB</b>, 약 65배 작아졌습니다! BuildKit 출력에서 단계 이름이 <code>[build n/6]</code> 과 <code>[stage-1 n/3]</code> 으로 나뉜 것도 보세요.
이름을 안 붙인 두 번째 스테이지는 <code>stage-1</code>(0부터 센 번호)로 표시됩니다.</p>

{{fig:multistage}}

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name go-slim -p 8080:8080 goapp:slim
curl -s localhost:8080
docker logs go-slim
docker history goapp:slim</code></pre>
<pre class="code out" data-lang="출력"><code>Hello from Go!
2026/09/25 18:27:16 listening on :8080
IMAGE          CREATED         CREATED BY                                      SIZE    COMMENT
d57c114ceefe   2 seconds ago   CMD ["/usr/local/bin/app"]                      0B      buildkit.dockerfile.v0
&lt;missing&gt;      2 seconds ago   EXPOSE map[8080/tcp:{}]                         0B      buildkit.dockerfile.v0
&lt;missing&gt;      2 seconds ago   USER app                                        0B      buildkit.dockerfile.v0
&lt;missing&gt;      2 seconds ago   COPY --from=build /out/app /usr/local/bin/ap…   7.9MB   buildkit.dockerfile.v0
&lt;missing&gt;      2 seconds ago   RUN /bin/sh -c adduser -D -u 10001 app # bu…    10kB    buildkit.dockerfile.v0
&lt;missing&gt;      2 weeks ago     CMD ["/bin/sh"]                                 0B
&lt;missing&gt;      2 weeks ago     /bin/sh -c #(nop) ADD file:7d538ddedf62 in /    7.8MB</code></pre>
<p>history 에 <b>golang 이미지의 흔적이 전혀 없습니다</b>. 최종 이미지는 오직 마지막 스테이지의 레이어로만 이루어집니다.</p>
<div class="box tip"><div class="box-t">💡 --target 으로 중간 스테이지만 빌드</div>
<code>docker build --target build -t goapp:builder .</code> 처럼 하면 <code>build</code> 스테이지까지만 만들어 멈춥니다. 테스트 전용 스테이지를 두고 CI 에서 돌릴 때 자주 씁니다.</div>`
      },

      /* ================================================================ 3 */
      {
        title: '더 작게 — distroless · scratch, 그리고 프런트엔드(Vite → nginx)',
        html: `
<p>alpine 도 작지만 셸 · 패키지 관리자 등 "앱에는 필요 없는 것"이 여전히 들어 있습니다. 더 줄이려면 두 가지 선택지가 있습니다.</p>
<div class="cards c2">
<div class="card purple"><div class="ci">🧊</div><b>gcr.io/distroless/static-debian12</b><p>구글이 만든 "OS 배포판 없는" 이미지(약 2MB). 인증서 · 시간대 파일 · <code>nonroot</code> 사용자만 있고 <b>셸도 패키지 관리자도 없음</b>.</p></div>
<div class="card gray"><div class="ci">⬜</div><b>scratch</b><p>완전히 빈 이미지(0B). 정적 바이너리 하나만 넣을 때. HTTPS 인증서 · 사용자 정보도 직접 넣어야 함.</p></div>
</div>
${fb('~/goapp/Dockerfile.distroless', 'Dockerfile')}
<pre class="code" data-lang="bash" data-run="sh"><code>docker build -q -f Dockerfile.distroless -t goapp:distroless .
docker run -d --name go-dl -p 8081:8080 goapp:distroless
curl -s localhost:8081
docker exec go-dl sh
docker images goapp</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:709dc17b7ca18307ecb1ff900353e7226b41f2aea1e15f9c388a4d0af669ce9e
1314436493fa390515d2a61585055d1969c9b2305017f8d172976f09832c1fc4
Hello from Go!
OCI runtime exec failed: exec failed: unable to start container process: exec: "sh": executable file not found in $PATH: unknown
REPOSITORY   TAG          IMAGE ID       CREATED          SIZE
goapp        distroless   709dc17b7ca1   1 second ago     9.89MB
goapp        slim         d57c114ceefe   5 seconds ago    15.7MB
goapp        fat          8db05e53a825   6 seconds ago    1.03GB</code></pre>
<p>셸이 없어서 <code>docker exec … sh</code> 가 실패합니다. <b>불편하지만 그만큼 안전</b>합니다 — 공격자가 들어와도 쓸 도구가 없으니까요.
같은 이유로 distroless · scratch 스테이지에서는 <code>RUN</code> 도 쓸 수 없습니다 (<code>exit code: 127</code>). 필요한 건 전부 앞 스테이지에서 만들어 COPY --from 으로 가져옵니다.</p>

{{widget:sizes|list=golang:1.23,golang:1.23-alpine,alpine:3.20,gcr.io/distroless/static-debian12|local=goapp:fat,goapp:slim,goapp:distroless|title=Go 베이스 · 결과 이미지}}

<h4>프런트엔드도 멀티 스테이지로 — npm run build → nginx</h4>
<p>React · Vue · Vite 프로젝트는 빌드하면 <b>HTML · JS · CSS 파일(dist/)</b>만 남습니다. 운영에 필요한 건 그 정적 파일과 웹 서버뿐이라, node 와 node_modules 는 공장에 두고 옵니다.</p>
{{widget:files|set=vite|cd=~/vite-web|title=Vite 정적 사이트 실습 파일 (~/vite-web)}}
<div class="two"><div>
${fb('~/vite-web/package.json', 'json')}
${fb('~/vite-web/index.html', 'html')}
${fb('~/vite-web/.dockerignore', 'dockerignore')}
</div><div>
${fb('~/vite-web/Dockerfile', 'Dockerfile')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/vite-web
docker build -t web:1.0 .
docker run -d --name web -p 8088:80 web:1.0
curl -s localhost:8088
docker images web</code></pre>
<pre class="code out" data-lang="출력"><code> ...
 => [build 4/6] RUN npm install                                                   0.1s
 => [build 5/6] COPY . .                                                          0.1s
 => [build 6/6] RUN npm run build                                                 0.1s
 => [stage-1 1/2] FROM docker.io/library/nginx:1.27-alpine@sha256:a6b806a0a45…    0.9s
 => [stage-1 2/2] COPY --from=build /app/dist /usr/share/nginx/html               0.1s
 ...
&lt;!doctype html&gt;
&lt;html lang="ko"&gt;
&lt;head&gt;&lt;meta charset="utf-8"&gt;&lt;title&gt;Vite 정적 사이트&lt;/title&gt;&lt;/head&gt;
&lt;body&gt;&lt;h1&gt;Vite 로 빌드한 정적 사이트 ⚡&lt;/h1&gt;&lt;/body&gt;
&lt;/html&gt;
REPOSITORY   TAG   IMAGE ID       CREATED        SIZE
web          1.0   c3032f163bbc   1 second ago   47.9MB</code></pre>
<p>node 로 빌드와 서빙을 한 이미지에서 다 하면 250MB 가 넘지만, 멀티 스테이지로 nginx 에 결과만 옮기면 <b>nginx 이미지 크기 그대로(약 48MB)</b>입니다.</p>
{{widget:open|url=http://localhost:8088/|label=🌐 localhost:8088 열기}}`
      },

      /* ================================================================ 4 */
      {
        title: '이미지 크기 줄이기 — 베이스 고르기 · RUN 합치기 · 캐시 지우기',
        html: `
<p>이미지가 작으면 <b>pull · push 가 빠르고</b>, 디스크를 덜 쓰고, 안에 든 프로그램이 적어 <b>보안 취약점도 적습니다</b>. 가장 효과가 큰 순서대로 봅시다.</p>

<h4>① 베이스 이미지 고르기 — 가장 큰 효과</h4>
<div class="stats">
<div class="stat red"><b>1.02GB</b><span>python:3.12</span></div>
<div class="stat orange"><b>125MB</b><span>python:3.12-slim</span></div>
<div class="stat green"><b>52.6MB</b><span>python:3.12-alpine</span></div>
<div class="stat red"><b>1.12GB</b><span>node:22</span></div>
<div class="stat green"><b>159MB</b><span>node:22-alpine</span></div>
</div>
{{widget:sizes|list=python:3.12,python:3.12-slim,python:3.12-alpine,node:22,node:22-slim,node:22-alpine|title=언어별 베이스 이미지}}
<table class="tbl">
<tr><th>꼬리표</th><th>뜻</th><th>언제</th></tr>
<tr><td>(없음) <code>python:3.12</code></td><td>Debian + 컴파일러 · git · curl 등 도구 잔뜩</td><td>C 확장 패키지를 빌드해야 할 때 (멀티 스테이지의 1단계로)</td></tr>
<tr><td><code>-slim</code></td><td>Debian 에서 도구를 뺀 판</td><td><b>대부분의 파이썬 · 노드 앱의 기본 선택</b></td></tr>
<tr><td><code>-alpine</code></td><td>musl libc 기반 초소형 리눅스</td><td>아주 작게. 단, 일부 파이썬 패키지는 설치가 느리거나 까다로움</td></tr>
<tr><td>distroless · scratch</td><td>셸도 없음</td><td>Go · Rust 같은 정적 바이너리</td></tr>
</table>

<h4>② RUN 합치기 + 패키지 캐시 정리</h4>
<p>레이어는 <b>한번 쌓이면 뒤에서 지워도 크기가 줄지 않습니다</b>(아래 레이어에 그대로 남음). 그래서 "설치 → 정리"를 <b>같은 RUN 안에서</b> 해야 합니다.</p>
{{widget:files|set=slim|cd=~/slim-demo|title=apt 크기 비교 파일 (~/slim-demo)}}
<div class="two"><div>
${fb('~/slim-demo/Dockerfile.bad', 'Dockerfile')}
</div><div>
${fb('~/slim-demo/Dockerfile.good', 'Dockerfile')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/slim-demo
docker build -q -f Dockerfile.bad -t tools:bad .
docker build -q -f Dockerfile.good -t tools:good .
docker images tools</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:d877a56526645c37833def60872197d8edc790d6799f7190cec43b367675a8f8
sha256:d379157f4cdbc2c15467c4f78d713daff766851de6cef99d42e932d999d20491
REPOSITORY   TAG    IMAGE ID       CREATED        SIZE
tools        good   d379157f4cdb   1 second ago   126MB
tools        bad    d877a5652664   1 second ago   186MB</code></pre>
<table class="tbl">
<tr><th>기법</th><th>줄어드는 것</th></tr>
<tr><td><code>apt-get update &amp;&amp; apt-get install …</code> 를 <b>한 RUN</b> 에</td><td>update 만 캐시돼서 옛 목록으로 설치되는 문제 방지 + 레이어 수 감소</td></tr>
<tr><td><code>--no-install-recommends</code></td><td>"추천" 패키지까지 딸려 오는 것 방지</td></tr>
<tr><td><code>&amp;&amp; rm -rf /var/lib/apt/lists/*</code></td><td>apt 패키지 목록(수십 MB) — 같은 RUN 에서 지워야 효과</td></tr>
<tr><td><code>apk add <b>--no-cache</b> curl</code></td><td>alpine 의 패키지 목록 캐시 (<code>apk update</code> 도 필요 없음)</td></tr>
<tr><td><code>pip install <b>--no-cache-dir</b></code></td><td>pip 다운로드 캐시</td></tr>
<tr><td><code>npm ci --omit=dev</code> + <code>npm cache clean --force</code></td><td>개발용 패키지 · npm 캐시</td></tr>
</table>

<div class="vs"><div class="vs-a red"><b>😵 레이어마다 따로</b>
<pre class="code" data-lang="Dockerfile"><code>RUN apt-get update
RUN apt-get install -y curl
RUN rm -rf /var/lib/apt/lists/*   <span class="cm"># 이미 늦음!</span></code></pre></div>
<div class="vs-mid">VS</div><div class="vs-b green"><b>😎 한 번에</b>
<pre class="code" data-lang="Dockerfile"><code>RUN apt-get update \\
    &amp;&amp; apt-get install -y --no-install-recommends curl \\
    &amp;&amp; rm -rf /var/lib/apt/lists/*</code></pre></div></div>

<h4>③ .dockerignore 로 쓰레기 막기</h4>
<p>6장에서 본 것처럼 <code>node_modules</code> · <code>.venv</code> · <code>.git</code> · 로그 · 빌드 결과물(<code>dist</code>)을 컨텍스트에서 빼면, <code>COPY . .</code> 레이어가 수백 MB 씩 불어나는 사고를 막을 수 있습니다.</p>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 크기 확인 습관</div>
빌드 후 <code>docker images</code> 로 크기를, <code>docker history 이미지</code> 로 <b>어느 레이어가 큰지</b> 봅니다. 수십 MB 짜리 COPY 레이어가 보이면 .dockerignore 를,
RUN 레이어가 크면 캐시 정리를 의심하세요. 레이어를 탐색하는 <code>dive</code> 같은 도구도 많이 씁니다.</div>`
      },

      /* ================================================================ 5 */
      {
        title: 'non-root 로 실행하기 — USER 와 Permission denied',
        html: `
<p>USER 를 따로 정하지 않으면 컨테이너 안의 앱은 <b>root</b>(관리자)로 실행됩니다. 컨테이너가 격리되어 있긴 하지만, 앱에 보안 구멍이 생기면 공격자가 컨테이너 안에서 무엇이든 할 수 있고,
마운트한 호스트 폴더나 커널 취약점을 통해 피해가 번질 수 있습니다. 그래서 운영 이미지는 <b>일반 사용자</b>로 실행하는 것이 기본입니다.</p>
{{fig:nonroot}}

<table class="tbl">
<tr><th>베이스</th><th>사용자 만들기</th></tr>
<tr><td>Debian/Ubuntu (<code>python:3.12-slim</code> 등)</td><td><code>RUN useradd --create-home appuser</code></td></tr>
<tr><td>Alpine</td><td><code>RUN adduser -D appuser</code> <span class="muted small">(-D: 비밀번호 없이)</span></td></tr>
<tr><td>node 공식 이미지</td><td>이미 <code>node</code> 사용자가 있음 → <code>USER node</code></td></tr>
<tr><td>distroless</td><td>이미 <code>nonroot</code> 사용자가 있음 → <code>USER nonroot:nonroot</code></td></tr>
</table>

<h4>일부러 Permission denied 만들기</h4>
<p>아래 앱은 시작할 때 <code>/app/started.txt</code> 를 씁니다. 사용자는 바꿨지만 파일 소유자는 신경 쓰지 않은 Dockerfile 로 빌드해 봅시다.</p>
{{widget:files|set=bugs|cd=~/bug-perm|title=권한 · 스테이지 장애 실습 파일 (~/bug-perm, ~/bug-stage)}}
<div class="two"><div>
${fb('~/bug-perm/app.py', 'python')}
${fb('~/bug-perm/requirements.txt')}
</div><div>
${fb('~/bug-perm/Dockerfile', 'Dockerfile')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/bug-perm
docker build -q -t perm-test .
docker run -d --name perm-test -p 5006:5000 perm-test
docker ps -a --filter name=perm-test
docker logs perm-test</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:9ce912819bca8f53665cb1663260cfced66b5b929af6c082c8293b43557de295
52bc6a2e9c0708054196ad0575d8737cdc70152ebe16f75fc0017dfcf5e55a7e
CONTAINER ID   IMAGE       COMMAND           CREATED        STATUS                    PORTS   NAMES
52bc6a2e9c07   perm-test   "python app.py"   1 second ago   Exited (1) 1 second ago           perm-test
Traceback (most recent call last):
  File "/app/app.py", line 4, in &lt;module&gt;
PermissionError: [Errno 13] Permission denied: '/app/started.txt'</code></pre>
<p><code>COPY . .</code> 로 넣은 파일과 <code>/app</code> 폴더는 <b>root 소유</b>입니다. appuser 는 읽을 수는 있어도 쓸 수는 없어요. 해결책은 두 가지입니다.</p>
<ol class="steps-list">
<li><b>COPY --chown</b> — 복사하면서 소유자를 바로 지정 (레이어가 늘지 않아 권장). 사용자는 COPY <b>전에</b> 만들어 둬야 합니다.
<pre class="code" data-lang="Dockerfile"><code>RUN useradd --create-home appuser
COPY --chown=appuser:appuser . .
USER appuser</code></pre></li>
<li><b>쓰기가 필요한 폴더만</b> 소유자 변경 — 코드는 root 소유(수정 불가)로 두고 데이터 폴더만 열어 줌. 더 안전합니다.
<pre class="code" data-lang="Dockerfile"><code>RUN useradd appuser &amp;&amp; mkdir -p /app/data &amp;&amp; chown appuser:appuser /app/data</code></pre></li>
</ol>
<div class="box warn"><div class="box-t">⚠️ USER 뒤에서는 root 작업을 못 합니다</div>
<code>USER appuser</code> 아래에서 <code>RUN apt-get install</code> 을 하면 <code>Permission denied</code> / <code>are you root?</code> 오류가 납니다.
패키지 설치 · chown 같은 관리 작업은 모두 USER <b>위에서</b> 끝내고, USER 는 CMD 바로 앞쪽에 두세요.</div>
<p>실행 중인 컨테이너의 사용자는 이렇게 확인합니다.</p>
<pre class="code" data-lang="bash"><code>docker exec 컨테이너 id
docker inspect -f "{{.Config.User}}" 이미지</code></pre>
<p>이 장애는 🎯 미션에서 직접 고쳐 봅니다. 완성된 모범 답안은 8절의 <code>safe-flask</code> 입니다.</p>`
      },

      /* ================================================================ 6 */
      {
        title: 'ARG vs ENV · LABEL · HEALTHCHECK',
        html: `
{{fig:argenv}}
<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>ARG</th><th>ENV</th></tr>
<tr><td>살아 있는 때</td><td><b>빌드하는 동안만</b></td><td>빌드 중 + <b>컨테이너 실행 중</b></td></tr>
<tr><td>값 바꾸기</td><td><code>docker build --build-arg KEY=값</code></td><td><code>docker run -e KEY=값</code></td></tr>
<tr><td>대표 용도</td><td>베이스 버전 · 앱 버전 번호를 빌드 때 주입</td><td>앱 설정 기본값 (<code>PORT</code>, <code>NODE_ENV</code>, <code>PYTHONUNBUFFERED</code>)</td></tr>
<tr><td>FROM 앞에 쓰기</td><td>✔ <code>ARG PY=3.12</code> → <code>FROM python:\${PY}-slim</code></td><td>✖</td></tr>
<tr><td>비밀번호</td><td colspan="2">✖ 둘 다 <code>docker history</code> · <code>inspect</code> 로 보입니다. 비밀은 BuildKit secret(<code>--secret</code>) 이나 실행 시 주입 (13장)</td></tr>
</table></div>

{{widget:files|set=arg|cd=~/arg-demo|title=ARG 실습 파일 (~/arg-demo)}}
${fb('~/arg-demo/Dockerfile', 'Dockerfile')}
<p>ARG 의 값을 ENV 에 옮겨 담으면 빌드 때 받은 값을 컨테이너에서도 쓸 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/arg-demo
docker build -q -t ver:default .
docker run --rm ver:default
docker build -q --no-cache --build-arg APP_VERSION=2.0.0 -t ver:2.0.0 .
docker run --rm ver:2.0.0</code></pre>
<pre class="code out" data-lang="출력"><code>sha256:03a3686a77ac9db246405f27f2f4c7e55300429616336bd04782af8b1f2d4fad
version=1.0.0
sha256:557b670607a27b5881727d6633bfaa36c1d30ba6f21289165cc8b659640aabb7
version=2.0.0</code></pre>
<p class="muted small">※ 이 실습 환경에서는 같은 Dockerfile 을 ARG 값만 바꿔 다시 빌드할 때 <code>--no-cache</code> 를 붙여 주세요. 실제 Docker 는 ARG 값이 바뀌면 그 값을 쓰는 단계부터 알아서 다시 빌드합니다.</p>

<h4>LABEL — 이미지에 붙이는 이름표</h4>
<p>LABEL 은 이미지에 <b>키=값 메타데이터</b>를 붙입니다. 누가 만들었는지, 버전, 소스 저장소 주소 등을 적어 두면 레지스트리 · 보안 스캐너 · 운영 도구가 읽어 갑니다.
키 이름은 OCI 표준(<code>org.opencontainers.image.*</code>)을 따르는 것이 좋습니다.</p>
<table class="tbl">
<tr><th>OCI 라벨 키</th><th>뜻</th></tr>
<tr><td><code>org.opencontainers.image.title</code></td><td>이미지 이름</td></tr>
<tr><td><code>org.opencontainers.image.version</code></td><td>앱 버전</td></tr>
<tr><td><code>org.opencontainers.image.source</code></td><td>소스 코드 저장소 URL (GHCR 은 이걸로 저장소와 연결)</td></tr>
<tr><td><code>org.opencontainers.image.authors</code></td><td>만든 사람 · 연락처</td></tr>
<tr><td><code>org.opencontainers.image.description</code></td><td>설명</td></tr>
</table>

<h4>HEALTHCHECK — "살아 있다"와 "일할 수 있다"는 다르다</h4>
<p>컨테이너 상태가 <code>Up</code> 이어도 앱이 멈춰 있거나 DB 연결이 끊겨 응답을 못 할 수 있습니다. HEALTHCHECK 는 Docker 가 <b>주기적으로 명령을 실행</b>해 결과가 0 이면 <code>healthy</code>, 연속으로 실패하면 <code>unhealthy</code> 로 표시하게 합니다.</p>
<pre class="code" data-lang="Dockerfile"><code>HEALTHCHECK --interval=10s --timeout=3s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1</code></pre>
<table class="tbl">
<tr><th>옵션</th><th>뜻</th><th>기본값</th></tr>
<tr><td><code>--interval</code></td><td>검사 간격</td><td>30s</td></tr>
<tr><td><code>--timeout</code></td><td>한 번 검사의 제한 시간</td><td>30s</td></tr>
<tr><td><code>--retries</code></td><td>몇 번 연속 실패하면 unhealthy</td><td>3</td></tr>
<tr><td><code>--start-period</code></td><td>시작 직후 준비 시간 (이때 실패는 안 셈)</td><td>0s</td></tr>
</table>
<div class="box warn"><div class="box-t">⚠️ 검사 명령이 이미지 안에 있어야 합니다</div>
<code>python:3.12-slim</code> 에는 <b>curl 이 없습니다</b>. <code>CMD curl -f http://localhost:5000/health</code> 로 쓰면 curl 을 못 찾아서 영원히 unhealthy 가 됩니다.
그래서 위 예시는 이미지에 이미 있는 <b>python</b> 으로 검사했어요. alpine 이면 <code>wget -q -O- …</code> 을 쓸 수 있습니다.</div>
<p>HEALTHCHECK 결과는 <code>docker ps</code> 의 STATUS 에 <code>(healthy)</code> 로 보이고, Compose 의 <code>depends_on: condition: service_healthy</code> 가 이 값을 씁니다 (10장).</p>`
      },

      /* ================================================================ 7 */
      {
        title: '태그 전략 미리보기와 docker init',
        html: `
<p>이미지 이름 뒤의 태그는 <b>버전 라벨</b>입니다. 같은 이미지에 태그를 여러 개 붙일 수 있고(<code>docker tag</code>), 이미지 ID 는 그대로입니다.</p>
<table class="tbl">
<tr><th>태그 모양</th><th>예</th><th>특징</th></tr>
<tr><td>정확한 버전</td><td><code>myapp:1.4.2</code></td><td>절대 바뀌지 않게 약속 → <b>운영 배포는 이것으로</b></td></tr>
<tr><td>부분 버전</td><td><code>myapp:1.4</code>, <code>myapp:1</code></td><td>새 패치가 나오면 따라 움직임 (공식 이미지 방식)</td></tr>
<tr><td>git 커밋</td><td><code>myapp:3f9c2ab</code></td><td>어떤 코드로 만든 이미지인지 정확히 추적 (CI 에서 자주 사용)</td></tr>
<tr><td>latest</td><td><code>myapp:latest</code></td><td>태그를 안 주면 붙는 기본값. "최신"이라는 보장이 <b>없음</b> → 운영에서는 피하기</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>docker tag goapp:slim goapp:1.0.0
docker tag goapp:slim goapp:1.0
docker images goapp</code></pre>
<pre class="code out" data-lang="출력"><code>REPOSITORY   TAG          IMAGE ID       CREATED          SIZE
goapp        distroless   709dc17b7ca1   5 seconds ago   9.89MB
goapp        slim         d57c114ceefe   6 seconds ago   15.7MB
goapp        1.0.0        d57c114ceefe   6 seconds ago   15.7MB
goapp        1.0          d57c114ceefe   6 seconds ago   15.7MB
goapp        fat          8db05e53a825   7 seconds ago   1.03GB</code></pre>
<p>IMAGE ID 가 같은 줄은 <b>같은 이미지</b>입니다. 태그는 이름표일 뿐이라 디스크를 더 쓰지 않아요. 레지스트리에 올리는 방법과 버전 관리 전략은 <a href="#ch11">11장</a>에서 자세히 다룹니다.</p>

<h4>docker init — Dockerfile 초안을 자동으로</h4>
<p>Docker Desktop 4.18 이후에는 <code>docker init</code> 명령이 프로젝트를 보고 <b>Dockerfile · .dockerignore · compose.yaml</b> 초안을 만들어 줍니다.
실제로는 언어 · 버전 · 포트 · 시작 명령을 하나씩 물어보는 대화형 명령이고, 이 실습 환경에서는 감지한 값으로 바로 만듭니다.</p>
${fb('~/init-demo/package.json', 'json')}
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/init-demo
docker init
ls -a
cat Dockerfile</code></pre>
<pre class="code out" data-lang="출력"><code>Welcome to the Docker Init CLI!
...
? What application platform does your project use? Node (detected)

✔ Created → .dockerignore
✔ Created → Dockerfile
✔ Created → compose.yaml

→ Your Docker files are ready!
.  ..  .dockerignore  Dockerfile  compose.yaml  package.json
# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:\${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

USER node

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]</code></pre>
<p>만들어진 Dockerfile 에 이 장에서 배운 것이 거의 다 들어 있습니다 — <b>ARG 로 버전</b>, <b>alpine 베이스</b>, <b>package*.json 먼저 복사</b>, <b>npm ci --omit=dev</b>, <b>USER node</b>(non-root), <b>exec 형식 CMD</b>.
초안은 출발점일 뿐이니, 무엇을 왜 넣었는지 읽고 내 프로젝트에 맞게 고치세요.</p>
<div class="box warn"><div class="box-t">⚠️ 이미 Dockerfile 이 있는 폴더에서는 조심</div>
docker init 은 같은 이름의 파일을 새로 만듭니다. 기존 Dockerfile 이 있는 프로젝트에서 실험하려면 git 에 커밋해 두거나 빈 폴더에서 해 보세요.</div>`
      },

      /* ================================================================ 8 */
      {
        title: '좋은 Dockerfile 체크리스트 — 모범 답안 safe-flask',
        html: `
<p>이 장에서 배운 것을 전부 모은 Flask 앱 Dockerfile 입니다. 한 줄 한 줄 "왜"를 떠올리며 읽어 보세요.</p>
{{widget:files|set=safe|cd=~/safe-flask|title=모범 답안 실습 파일 (~/safe-flask)}}
${fb('~/safe-flask/Dockerfile', 'Dockerfile')}
<div class="two"><div>
${fb('~/safe-flask/app.py', 'python')}
</div><div>
${fb('~/safe-flask/requirements.txt')}
${fb('~/safe-flask/.dockerignore', 'dockerignore')}
</div></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/safe-flask
docker build -t safe-flask:1.0 .
docker run -d --name safe -p 5000:5000 safe-flask:1.0
curl -s localhost:5000
docker exec safe whoami
docker inspect -f "{{json .Config.Labels}}" safe-flask:1.0
docker ps --filter name=safe</code></pre>
<pre class="code out" data-lang="출력"><code> ...
 => [2/6] RUN useradd --create-home appuser                                       0.1s
 => [3/6] WORKDIR /app                                                            0.1s
 => [4/6] COPY requirements.txt .                                                 0.1s
 => [5/6] RUN pip install --no-cache-dir -r requirements.txt                      0.1s
 => [6/6] COPY --chown=appuser:appuser . .                                        0.1s
 ...
&lt;h1&gt;안전한 Flask 이미지 🔒&lt;/h1&gt;
appuser
{"org.opencontainers.image.title":"safe-flask","org.opencontainers.image.version":"1.0.0","org.opencontainers.image.source":"https://github.com/example/safe-flask"}
CONTAINER ID   IMAGE            COMMAND           CREATED                  STATUS                                     PORTS                                         NAMES
cc414f7e0dd3   safe-flask:1.0   "python app.py"   Less than a second ago   Up Less than a second (health: starting)   0.0.0.0:5000->5000/tcp, [::]:5000->5000/tcp   safe</code></pre>
<p>처음 몇 초는 <code>(health: starting)</code> 입니다. 첫 검사가 성공하면 바뀝니다 — <code class="cmd">docker ps --filter name=safe</code> 를 다시 눌러 보세요.</p>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE            COMMAND           CREATED         STATUS                   PORTS                                         NAMES
cc414f7e0dd3   safe-flask:1.0   "python app.py"   3 seconds ago   Up 3 seconds (healthy)   0.0.0.0:5000->5000/tcp, [::]:5000->5000/tcp   safe</code></pre>

<h4>✅ 좋은 Dockerfile 체크리스트</h4>
<div class="tbl-wrap"><table class="tbl">
<tr><th>#</th><th>점검 항목</th><th>이 장의 어디</th></tr>
<tr><td>1</td><td>베이스 이미지 태그를 <b>구체적으로</b> (<code>python:3.12-slim</code>, <code>latest</code> 금지) · 가능한 한 작은 판</td><td>4절</td></tr>
<tr><td>2</td><td>컴파일 · 빌드가 필요하면 <b>멀티 스테이지</b>로 도구와 결과를 분리</td><td>2 · 3절</td></tr>
<tr><td>3</td><td>의존성 목록을 먼저 COPY → 설치 → 소스는 나중 (<b>캐시 순서</b>)</td><td>6장 5절</td></tr>
<tr><td>4</td><td>설치와 정리를 <b>같은 RUN</b> 에 (<code>rm -rf /var/lib/apt/lists/*</code>, <code>--no-cache-dir</code>, <code>--no-cache</code>)</td><td>4절</td></tr>
<tr><td>5</td><td><code>.dockerignore</code> 로 <code>.git</code> · <code>.env</code> · <code>node_modules</code> · <code>.venv</code> 제외</td><td>6장 4절</td></tr>
<tr><td>6</td><td><b>USER</b> 로 non-root 실행, 쓰기 필요한 곳만 <code>--chown</code></td><td>5절</td></tr>
<tr><td>7</td><td>CMD · ENTRYPOINT 는 <b>exec 형식</b> (<code>["…", "…"]</code>)</td><td>1절</td></tr>
<tr><td>8</td><td>서버는 <b>0.0.0.0</b> 에 바인딩, <code>EXPOSE</code> 로 포트 문서화</td><td>6장 6절</td></tr>
<tr><td>9</td><td><b>HEALTHCHECK</b> — 이미지 안에 있는 도구로</td><td>6절</td></tr>
<tr><td>10</td><td><b>LABEL</b> 로 버전 · 소스 주소, 비밀번호는 ARG · ENV 에 넣지 않기</td><td>6절</td></tr>
</table></div>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>
<ul>
<li>첫 줄의 <code># syntax=docker/dockerfile:1</code> 은 "최신 안정판 Dockerfile 문법을 쓰겠다"는 선언입니다. <code>RUN --mount=type=cache</code> 처럼 BuildKit 전용 기능을 쓸 때 특히 권장됩니다.</li>
<li><code>docker build --check</code> 는 빌드하지 않고 Dockerfile 의 흔한 실수(명령 대소문자 섞임, JSON 형식이 아닌 CMD 등)를 경고로 알려 줍니다.</li>
<li><code>docker scout</code> 로 이미지 속 패키지의 알려진 취약점(CVE)을 확인할 수 있습니다 — 13장에서 다룹니다.</li>
</ul></div>
{{widget:mission}}`
      }
    ],

    missions: [
      {
        id: 'm1',
        title: 'ENTRYPOINT + CMD 이미지로 인사말 바꾸기',
        desc: '1절의 <code>~/entry-demo/Dockerfile.ep</code> 로 이미지 <code>say:ep</code> 를 만들고, 컨테이너 이름 <code>greet</code> 로 실행하면서 <b>인자 하나</b>를 줘서 로그에 <code>안녕, 도커</code> 가 찍히게 하세요.',
        hint: '<code>docker build -f Dockerfile.ep -t say:ep .</code> → <code>docker run --name greet say:ep 도커</code> (run 인자는 CMD 자리만 바꿉니다)',
        files: 'entry',
        answer: ['cd ~/entry-demo', 'docker build -f Dockerfile.ep -t say:ep .', 'docker run --name greet say:ep 도커'],
        check: M => { const i = M.image('say:ep'); return !!i && JSON.stringify(i.config.Entrypoint || []).includes('echo') && M.logs('greet').includes('안녕, 도커'); }
      },
      {
        id: 'm2',
        title: '멀티 스테이지로 20MB 미만 Go 이미지 goapp:slim 만들기',
        desc: '2절의 <code>~/goapp/Dockerfile</code>(멀티 스테이지)로 <code>goapp:slim</code> 을 빌드하고 <code>-p 8080:8080</code> 으로 실행하세요. 이미지 크기가 <b>20MB 미만</b>이고 <code>localhost:8080</code> 이 <code>Hello from Go!</code> 를 돌려주면 성공.',
        hint: '<code>cd ~/goapp</code> → <code>docker build -t goapp:slim .</code> → <code>docker run -d --name go-slim -p 8080:8080 goapp:slim</code>',
        files: 'goapp',
        answer: ['cd ~/goapp', 'docker build -t goapp:slim .', 'docker run -d --name go-slim -p 8080:8080 goapp:slim'],
        check: async M => { const i = M.image('goapp:slim'); return !!i && i.built && i.size < 20e6 && (await M.get('http://localhost:8080/')).includes('Hello from Go'); }
      },
      {
        id: 'm3',
        title: 'distroless 로 10MB 남짓, nonroot 로 도는 Go 이미지',
        desc: '<code>~/goapp/Dockerfile.distroless</code> 로 <code>goapp:distroless</code> 를 빌드해 <code>-p 8081:8080</code> 으로 실행하세요. 이미지가 <b>12MB 미만</b>이고 USER 가 root 가 아니어야 합니다.',
        hint: '<code>docker build -f Dockerfile.distroless -t goapp:distroless .</code> → <code>docker run -d --name go-dl -p 8081:8080 goapp:distroless</code>',
        files: 'goapp',
        answer: ['cd ~/goapp', 'docker build -f Dockerfile.distroless -t goapp:distroless .', 'docker run -d --name go-dl -p 8081:8080 goapp:distroless'],
        check: async M => { const i = M.image('goapp:distroless'); return !!i && i.size < 12e6 && !!i.config.User && !/^(root|0)(:|$)/.test(i.config.User) && (await M.get('http://localhost:8081/')).includes('Hello from Go'); }
      },
      {
        id: 'm4',
        title: 'Vite 사이트를 멀티 스테이지로 nginx 이미지 web:1.0 에 담기',
        desc: '3절의 <code>~/vite-web</code> 을 빌드해 <code>web:1.0</code> 을 만들고 <code>-p 8088:80</code> 으로 실행하세요. 이미지가 <b>60MB 미만</b>(node 가 들어 있지 않음)이고 페이지에 "Vite" 가 보이면 성공.',
        hint: '<code>cd ~/vite-web</code> → <code>docker build -t web:1.0 .</code> → <code>docker run -d --name web -p 8088:80 web:1.0</code>',
        files: 'vite',
        answer: ['cd ~/vite-web', 'docker build -t web:1.0 .', 'docker run -d --name web -p 8088:80 web:1.0'],
        check: async M => { const i = M.image('web:1.0'); return !!i && i.built && i.size < 60e6 && (await M.get('http://localhost:8088/')).includes('Vite'); }
      },
      {
        id: 'm5',
        title: 'apt 캐시 정리로 이미지 50MB 이상 줄이기',
        desc: '4절의 <code>~/slim-demo</code> 에서 <code>tools:bad</code> 와 <code>tools:good</code> 을 둘 다 빌드하세요. <code>tools:good</code> 이 <code>tools:bad</code> 보다 <b>50MB 이상 작으면</b> 성공입니다. <code>docker history</code> 로 어느 레이어가 다른지도 비교해 보세요.',
        hint: '<code>docker build -f Dockerfile.bad -t tools:bad .</code> · <code>docker build -f Dockerfile.good -t tools:good .</code> → <code>docker images tools</code>',
        files: 'slim',
        answer: ['cd ~/slim-demo', 'docker build -f Dockerfile.bad -t tools:bad .', 'docker build -f Dockerfile.good -t tools:good .', 'docker images tools'],
        check: M => { const b = M.image('tools:bad'), g = M.image('tools:good'); return !!b && !!g && b.size - g.size >= 50e6; }
      },
      {
        id: 'm6',
        title: '모범 답안 safe-flask:1.0 — non-root + healthy 상태로 실행',
        desc: '8절의 <code>~/safe-flask</code> 로 <code>safe-flask:1.0</code> 을 빌드하고 <code>safe</code> 라는 이름 · <code>-p 5000:5000</code> 으로 실행하세요. USER 가 root 가 아니고, <code>docker ps</code> 에 <b>(healthy)</b> 가 보이면 성공!',
        hint: '<code>cd ~/safe-flask</code> → <code>docker build -t safe-flask:1.0 .</code> → <code>docker run -d --name safe -p 5000:5000 safe-flask:1.0</code> → 잠시 후 <code>docker ps</code>',
        files: 'safe',
        answer: ['cd ~/safe-flask', 'docker build -t safe-flask:1.0 .', 'docker run -d --name safe -p 5000:5000 safe-flask:1.0'],
        check: async M => { const i = M.image('safe-flask:1.0'); return !!i && !!i.config.User && i.config.User !== 'root' && !!i.config.Healthcheck && M.health('safe') === 'healthy' && (await M.get('http://localhost:5000/')).includes('안전한'); }
      },
      {
        id: 'm7', scenario: true,
        title: 'non-root 로 바꿨더니 PermissionError! 권한 고치기',
        desc: '5절의 <b>📁 장애 실습 파일</b>로 <code>~/bug-perm</code> 을 만든 뒤 ⚙️ 상황 만들기를 누르면 <code>perm</code> 컨테이너가 곧바로 Exited (1) 이 됩니다. <b>USER appuser 는 유지한 채</b> Dockerfile 을 고쳐 다시 빌드하고, 같은 이름 <code>perm</code> · <code>-p 5005:5000</code> 으로 실행 상태를 만드세요.',
        setup: ['cd ~/bug-perm', 'docker build -t bug-perm .', 'docker run -d --name perm -p 5005:5000 bug-perm'],
        hint: '<code>docker logs perm</code> → <code>Permission denied: \'/app/started.txt\'</code>. <code>RUN useradd …</code> 를 COPY 위로 올리고 <code>COPY --chown=appuser:appuser . .</code> 으로 바꾸세요. → 다시 빌드 → <code>docker rm -f perm</code> → 다시 run.',
        files: 'bugperm',
        answer: ['cd ~/bug-perm', 'docker logs perm', 'echo "FROM python:3.12-slim" > Dockerfile', 'echo "RUN useradd --create-home appuser" >> Dockerfile', 'echo "WORKDIR /app" >> Dockerfile', 'echo "COPY requirements.txt ." >> Dockerfile', 'echo "RUN pip install --no-cache-dir -r requirements.txt" >> Dockerfile', 'echo "COPY --chown=appuser:appuser . ." >> Dockerfile', 'echo "USER appuser" >> Dockerfile', 'echo "EXPOSE 5000" >> Dockerfile', `echo 'CMD ["python", "app.py"]' >> Dockerfile`, 'docker build -t bug-perm .', 'docker rm -f perm', 'docker run -d --name perm -p 5005:5000 bug-perm'],
        check: async M => { const i = M.image('bug-perm'); return !!i && !!i.config.User && i.config.User !== 'root' && M.running('perm') && (await M.get('http://localhost:5005/')).includes('안전한'); }
      },
      {
        id: 'm8', scenario: true,
        title: 'COPY --from 이 "not found" — 스테이지 사이 경로 맞추기',
        desc: '<code>~/bug-stage</code> 에서 ⚙️ 상황 만들기를 누르면 멀티 스테이지 빌드가 <code>"/out/server": not found</code> 로 실패합니다. 1단계가 실제로 만드는 파일 경로에 맞게 고쳐 이미지 <code>goapp:fixed</code> 를 만들고 <code>-p 8082:8080</code> 으로 실행하세요.',
        setup: ['cd ~/bug-stage', 'docker build -t goapp:fixed .'],
        hint: '1단계의 <code>go build -o /out/app</code> 을 보세요. 만든 파일은 <code>/out/app</code> 입니다. COPY --from 의 원본 경로와 CMD 경로를 맞춰 고치세요.',
        files: 'bugstage',
        answer: ['cd ~/bug-stage', 'echo "FROM golang:1.23-alpine AS build" > Dockerfile', 'echo "WORKDIR /src" >> Dockerfile', 'echo "COPY . ." >> Dockerfile', 'echo "RUN CGO_ENABLED=0 go build -o /out/app ." >> Dockerfile', 'echo "FROM alpine:3.20" >> Dockerfile', 'echo "COPY --from=build /out/app /usr/local/bin/app" >> Dockerfile', 'echo "EXPOSE 8080" >> Dockerfile', `echo 'CMD ["/usr/local/bin/app"]' >> Dockerfile`, 'docker build -t goapp:fixed .', 'docker run -d --name go-fixed -p 8082:8080 goapp:fixed'],
        check: async M => { const i = M.image('goapp:fixed'); return !!i && i.size < 20e6 && (await M.get('http://localhost:8082/')).includes('Hello from Go'); }
      }
    ],

    videos: [
      { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '3시간', desc: 'Dockerfile 작성 · 이미지 빌드 · 레지스트리까지 한 번에 정리하는 긴 강좌' },
      { title: 'Docker multi-stage build (검색)', url: 'https://www.youtube.com/results?search_query=docker+multi+stage+build+tutorial', desc: '멀티 스테이지 빌드 설명 영상 검색 결과' },
      { title: 'Dockerfile ENTRYPOINT vs CMD (검색)', url: 'https://www.youtube.com/results?search_query=dockerfile+entrypoint+vs+cmd', desc: 'CMD · ENTRYPOINT · exec/shell 형식 비교 영상 검색 결과' },
      { title: 'Dockerfile best practices (검색)', url: 'https://www.youtube.com/results?search_query=dockerfile+best+practices+smaller+images', desc: '이미지 크기 줄이기 · non-root 등 모범 사례 영상 검색 결과' },
      { title: '도커 이미지 최적화 (검색)', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EC%9D%B4%EB%AF%B8%EC%A7%80+%EC%B5%9C%EC%A0%81%ED%99%94', desc: '한국어 이미지 경량화 · 멀티 스테이지 영상 검색 결과' }
    ],

    terms: [
      ['ENTRYPOINT', '컨테이너가 항상 실행할 고정 명령. docker run 인자는 그 뒤에 붙고, 바꾸려면 --entrypoint 가 필요'],
      ['CMD', '컨테이너 시작 시 기본 명령(또는 ENTRYPOINT 의 기본 인자). docker run 뒤에 인자를 주면 통째로 대체됨'],
      ['exec 형식', 'CMD ["python", "app.py"] 처럼 JSON 배열로 쓰는 형식. 셸을 거치지 않아 앱이 PID 1 이 되고 종료 신호를 직접 받음 (권장)'],
      ['shell 형식', 'CMD python app.py 처럼 쓰는 형식. /bin/sh -c 로 실행되어 $변수 치환은 되지만 신호 처리에 불리'],
      ['멀티 스테이지 빌드', 'FROM 을 여러 번 써서 빌드 스테이지와 실행 스테이지를 나누고, COPY --from 으로 결과물만 옮기는 방법'],
      ['COPY --from', '다른 스테이지(또는 다른 이미지)에서 파일을 복사하는 COPY 옵션'],
      ['distroless', '셸 · 패키지 관리자 없이 앱 실행에 필요한 최소 파일만 담은 구글의 베이스 이미지 (gcr.io/distroless/…)'],
      ['scratch', '아무것도 없는 빈 베이스 이미지. 정적 바이너리 하나만 넣을 때 사용'],
      ['slim · alpine', 'slim 은 도구를 뺀 Debian 판, alpine 은 musl libc 기반 초소형 리눅스 판 베이스 이미지'],
      ['non-root', '컨테이너 앱을 root 가 아닌 일반 사용자로 실행하는 것. Dockerfile 의 USER 로 지정'],
      ['COPY --chown', '복사하면서 파일 소유자를 지정하는 옵션. non-root 사용자가 써야 하는 파일에 사용'],
      ['ARG', '빌드하는 동안만 존재하는 변수. docker build --build-arg 로 값 전달'],
      ['LABEL (OCI 라벨)', '이미지에 붙이는 키=값 메타데이터. org.opencontainers.image.version · source 등 표준 키 사용'],
      ['HEALTHCHECK', 'Docker 가 주기적으로 실행해 컨테이너가 정상인지(healthy/unhealthy) 판단하는 명령']
    ],

    summary: [
      '<b>ENTRYPOINT = 고정 명령, CMD = 기본 인자.</b> <code>docker run 이미지 인자</code> 는 CMD 만 바꾸고, ENTRYPOINT 는 <code>--entrypoint</code> 로만 바뀐다. 둘 다 <b>exec 형식</b> <code>["…"]</code> 으로.',
      '<b>멀티 스테이지 빌드</b>: <code>FROM … AS build</code> 에서 만들고 <code>COPY --from=build</code> 로 결과만 옮긴다. Go 이미지 1.03GB → 15.7MB, Vite 사이트 → nginx 48MB.',
      '크기 줄이기 순서: <b>베이스 선택</b>(slim · alpine · distroless) → <b>설치와 정리를 한 RUN 에</b>(<code>rm -rf /var/lib/apt/lists/*</code>, <code>--no-cache-dir</code>, <code>apk --no-cache</code>) → <b>.dockerignore</b>.',
      '<b>USER</b> 로 non-root 실행. root 소유 파일에 쓰려다 <code>Permission denied</code> 가 나면 <code>COPY --chown=사용자:그룹</code> 이나 필요한 폴더만 chown.',
      '<b>ARG</b> 는 빌드 때만(<code>--build-arg</code>), <b>ENV</b> 는 실행 때도. 비밀은 둘 다 넣지 않는다. <b>LABEL</b> 은 OCI 키로 버전 · 소스 표시.',
      '<b>HEALTHCHECK</b> 는 이미지 안에 있는 도구로 — slim 에는 curl 이 없다. 결과는 <code>docker ps</code> 의 (healthy).',
      '운영 배포는 <code>1.4.2</code> 같은 <b>정확한 태그</b>로, <code>docker init</code> 초안도 체크리스트로 점검하자.'
    ],

    quiz: [
      { q: '<code>ENTRYPOINT ["ping", "-c", "3"]</code> 와 <code>CMD ["localhost"]</code> 가 있는 이미지 pinger 를 <code>docker run pinger 8.8.8.8</code> 로 실행하면 실제로 실행되는 명령은?', options: ['ping -c 3 localhost', 'ping -c 3 8.8.8.8', '8.8.8.8', 'ping -c 3 localhost 8.8.8.8'], answer: 1, explain: 'docker run 뒤의 인자는 CMD 자리만 대체합니다. ENTRYPOINT 는 그대로 남아 ping -c 3 8.8.8.8 이 됩니다.' },
      { q: '<code>ENV NAME=도커</code> 아래에 <code>CMD ["echo", "hello $NAME"]</code> 라고 썼더니 <code>hello $NAME</code> 이 그대로 출력됐다. 이유는?', options: ['ENV 는 빌드 때만 존재해서', 'exec 형식은 셸을 거치지 않아 $변수를 치환하지 않아서', 'echo 가 alpine 에 없어서', 'CMD 는 한 번만 쓸 수 있어서'], answer: 1, explain: 'exec 형식은 프로그램을 바로 실행하므로 셸의 변수 치환이 없습니다. 필요하면 CMD ["sh", "-c", "echo hello $NAME"] 처럼 셸을 명시합니다.' },
      { q: '멀티 스테이지 빌드에서 최종 이미지에 들어가는 것은?', options: ['모든 스테이지의 레이어', '마지막 스테이지의 레이어뿐 (COPY --from 으로 가져온 파일 포함)', '첫 번째 스테이지의 레이어뿐', '빌드 캐시 전체'], answer: 1, explain: '최종 이미지는 마지막(또는 --target 으로 고른) 스테이지로만 만들어집니다. 앞 스테이지는 결과물을 만들어 주는 공장일 뿐입니다.' },
      { q: '이미지 크기를 줄이는 방법으로 <b>효과가 없는</b> 것은?', options: ['apt-get install 과 rm -rf /var/lib/apt/lists/* 를 같은 RUN 에 쓰기', 'python:3.12 대신 python:3.12-slim 사용', '설치한 RUN 과 별도의 RUN 에서 캐시 폴더를 지우기', 'pip install --no-cache-dir 사용'], answer: 2, explain: '레이어는 한번 쌓이면 뒤 레이어에서 지워도 아래 레이어에 남아 크기가 줄지 않습니다. 설치와 정리는 반드시 같은 RUN 에서 해야 합니다.' },
      { q: '<code>USER appuser</code> 로 바꾼 뒤 앱이 <code>PermissionError: [Errno 13] Permission denied: \'/app/started.txt\'</code> 로 죽는다. 가장 알맞은 해결은?', options: ['USER 줄을 지운다', 'docker run --user root 로 실행한다', '사용자를 먼저 만들고 COPY --chown=appuser:appuser . . 로 복사한다', 'EXPOSE 를 추가한다'], answer: 2, explain: 'COPY 로 넣은 파일은 기본적으로 root 소유라 appuser 가 쓸 수 없습니다. non-root 를 유지하면서 필요한 파일의 소유자를 바꾸는 것이 정답입니다.' },
      { q: 'ARG 와 ENV 에 대한 설명으로 옳은 것은?', options: ['ARG 는 컨테이너 실행 중에도 os.environ 으로 읽을 수 있다', 'ENV 값은 docker build --build-arg 로만 바꿀 수 있다', 'ARG 는 빌드 중에만 존재하고, ENV 는 이미지에 저장되어 실행 중에도 보인다', '비밀번호는 ARG 에 넣으면 이미지에 남지 않아 안전하다'], answer: 2, explain: 'ARG 는 빌드 시점 변수, ENV 는 실행 시점까지 남는 환경 변수입니다. 둘 다 history · inspect 로 값이 보일 수 있어 비밀 정보에는 쓰지 않습니다.' },
      { q: '<code>python:3.12-slim</code> 이미지에 <code>HEALTHCHECK CMD curl -f http://localhost:5000/health || exit 1</code> 을 넣었더니 앱은 정상인데 계속 unhealthy 다. 원인은?', options: ['HEALTHCHECK 는 exec 형식만 된다', 'slim 이미지에 curl 이 없어서 검사 명령 자체가 실패한다', '--interval 을 안 줘서', '포트 5000 을 EXPOSE 하지 않아서'], answer: 1, explain: '검사 명령은 컨테이너 안에서 실행됩니다. slim 에는 curl 이 없으니 python 같은 이미 있는 도구로 검사하거나 curl 을 설치해야 합니다.' }
    ]
  });
})();
