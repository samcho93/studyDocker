# 강의 콘텐츠 작성 가이드 (Docker 쉽게 배우기)

강의 한 장 = `lessons/chNN.js` 파일 하나. 파일은 `Course.lesson({...})` 를 한 번만 호출합니다.
빌드 도구 없이 `<script>` 로 바로 읽히므로 **순수 JavaScript(ES2020)** 로, import/export 없이 씁니다.
HTML 은 템플릿 문자열(백틱)로 씁니다. 백틱 안에서 `` ` `` 나 `${` 를 글자로 쓰려면 `` \` `` · `\${` 로 이스케이프합니다
(Dockerfile 의 `${VAR}`, compose 의 `${PORT:-8080}`, JS 템플릿 리터럴 등 **반드시 `\${`**).

검증: `node tools/validate.cjs ch05` (본문 코드까지 실행: `node tools/validate.cjs ch05 --blocks`, 자세히: `-v`)
시뮬레이터 직접 실험: `node tools/sim.cjs "docker run -d -p 8080:80 nginx" "curl -s localhost:8080"`

## 0. 이 강좌의 특징 — 화면 3단 + 진짜처럼 동작하는 가상 Docker

- **왼쪽** 목차 · **가운데** 강의(이 파일) · **오른쪽** 실습 화면(🖥️ 터미널 · 📊 대시보드 · 🌐 브라우저 · 📝 파일 · 🎯 미션).
- 오른쪽 터미널은 브라우저 안의 **가상 Docker 엔진**입니다 (Docker Engine 27 / Compose v2 / kubectl 1.31 흉내).
  `docker run/ps/logs/exec/build/network/volume/compose/push/scout/...`, `curl`, `kubectl`, `minikube` 가 실제와 같은 출력으로 동작합니다.
- 컨테이너 안에서 nginx · httpd · redis · postgres · mysql · mongo · wordpress · adminer · registry · whoami 가 실제처럼 동작하고,
  학생이 작성한 **Python(Flask/FastAPI) · Node(Express) · Go** 앱 코드도 흉내 실행됩니다 (라우트 · 환경 변수 · Redis · SQL · 포트 바인딩).
- 🌐 브라우저 탭에서 `http://localhost:게시포트` 를 열면 컨테이너가 돌려준 HTML 이 보입니다.
- **장애 상황이 실제처럼 재현됩니다**: 포트 충돌, 이름 충돌, 기본 bridge 에서 이름 DNS 실패, 127.0.0.1 바인딩으로 연결 거부,
  POSTGRES_PASSWORD 누락으로 종료, OOM(137), 재시작 정책, 헬스체크, 이미지 없음, bash 없음(alpine), 모듈 없음(ModuleNotFoundError),
  COPY 파일 없음, .dockerignore 에 빠진 파일, 권한 없음(USER), 볼륨 없어서 데이터 사라짐 등.

따라서 각 장은 **개념 설명 → 그림 → ▶ 실행으로 따라 하기 → 결과 해석(대시보드 · 브라우저) → 🎯 미션** 흐름으로 씁니다.

## 1. 대상 독자와 문체

- **Docker 를 처음 배우는 사람** (리눅스 명령을 조금 아는 대학생 · 개발 입문자 · 고등학생).
- 전문 용어는 처음 나올 때 풀어 씁니다. 예: `이미지(image, 컨테이너를 만드는 읽기 전용 틀 — 붕어빵 틀)`
- 존댓말 설명체(`~합니다`, `~해 볼까요?`). 문단은 짧게(2~4문장).
- **글만 길게 쓰지 않습니다.** 절마다 그림(SVG) · 도표 블록 · 표 · 비유 상자 · 위젯 · 실행 코드 중 최소 1개. 한 장에 SVG 그림 3개 이상.
- 일상 비유(🍞 붕어빵 틀과 붕어빵, 🚢 선적 컨테이너, 🏢 아파트와 단독주택, 📮 우편함 주소 …)로 감을 잡은 뒤 정확히 설명.
- 기준: **Docker Engine 27.x, Docker Compose v2 (`docker compose`, 하이픈 없음), compose.yaml 에 `version:` 쓰지 않음**, Ubuntu 24.04 호스트.
  확실하지 않은 사실(날짜 · 버전 · 수치)은 쓰지 않습니다. 명령 · 옵션 이름은 docs.docker.com 과 **똑같이**.

## 2. Course.lesson 구조

```js
Course.lesson({
  id: 'ch04', no: '04',
  icon: '🌐',
  title: '포트와 네트워크',
  subtitle: '컨테이너끼리, 그리고 내 PC 와 컨테이너가 이야기하는 방법',
  level: '기초', time: '90분',
  goals: ['-p 옵션의 호스트 포트와 컨테이너 포트를 구분할 수 있다', '...'],   // 3~5개
  chips: ['docker ps', 'docker network ls', 'curl -s localhost:8080'],         // 터미널 아래 빠른 명령 (3~6개)
  figs: {                                                                     // 재사용 그림
    portmap: { svg: `<svg class="dg" viewBox="0 0 800 300">...</svg>`, caption: '설명' },
    flow: `<div class="flow">...</div>`
  },
  files: {                                                                    // 실습 파일 묶음 ({{widget:files|set=이름}} 과 미션 files 에서 사용)
    flask: { '~/flask-app/app.py': `...`, '~/flask-app/requirements.txt': 'flask\n' }
  },
  sections: [ { title: '포트 게시란?', html: `<p>...</p>{{fig:portmap}}` } ], // 6~9개
  missions: [ /* 아래 5절 */ ],                                               // 4~8개
  videos: [ { title: '...', channel: '...', url: 'https://www.youtube.com/watch?v=...', lang: 'ko', min: '12분', desc: '한 줄' } ], // 3~6개
  terms: [['포트 게시(publish)', '...'], ...],                                 // 8~14개
  summary: ['...'],                                                           // 4~7개
  quiz: [ { q: '...?', options: ['..','..','..','..'], answer: 2, explain: '해설' } ]   // 5~7개
});
```

치환 표기: `{{fig:이름}}` · `{{fig:이름|nocap}}` · `{{widget:종류|옵션=값|옵션2=값}}` (옵션 값에 `|` `}` 는 못 씀)

## 3. 본문 블록

| 블록 | 쓰는 법 |
|---|---|
| 상자 | `<div class="box tip"><div class="box-t">💡 팁</div>...</div>` — `tip` `note` `warn` `trend`(🚀 최신 동향) `analogy`(🍳 비유) `practice`(🧪 해 보기) `dev`(👩‍💻 실무 관점) |
| 표 | `<table class="tbl">…</table>` · 비교표 `class="tbl cmp"` (넓으면 `<div class="tbl-wrap">` 로 감싸기) |
| 흐름도 | `<div class="flow"><div class="fb blue"><span class="fi">📝</span><b>Dockerfile</b>설명</div>…</div>` · 세로 `flow v` |
| 층 구조 | `<div class="layers"><div class="ly blue"><b>앱</b><span>설명</span><em>보조</em></div>…</div>` |
| 카드 | `<div class="cards c3"><div class="card orange"><div class="ci">🐳</div><b>제목</b><p>설명</p></div>…</div>` |
| 연대표 | `<ol class="timeline"><li class="purple"><span class="tl-y">2013</span><b>Docker 공개</b><p>…</p></li></ol>` |
| 대결 | `<div class="vs"><div class="vs-a blue"><b>볼륨</b><ul>…</ul></div><div class="vs-mid">VS</div><div class="vs-b orange"><b>바인드 마운트</b>…</div></div>` |
| 숫자 타일 | `<div class="stats"><div class="stat blue"><b>5MB</b><span>alpine 크기</span></div></div>` |
| 단계 | `<ol class="steps-list"><li><b>빌드</b> — …</li></ol>` |
| 2단 | `<div class="two"><div>…</div><div>…</div></div>` |
| 태그 · 키 | `<span class="tag green">권장</span>` · `<kbd>Ctrl</kbd>` |

색: `blue teal orange purple red green yellow gray`

### 코드 블록 — 실행 · 파일 저장 버튼이 붙습니다

```html
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name web -p 8080:80 nginx
docker ps</code></pre>
```
- `data-run="sh"` → **▶ 터미널에서 실행** 버튼. 오른쪽 터미널에서 **한 줄씩 차례로** 실행합니다 (앞 줄이 끝나야 다음 줄).
  **`$` 프롬프트를 붙이지 말고 한 줄에 명령 하나.** 끝나지 않는 명령(`docker logs -f`, `-d` 없는 서버 실행, `docker stats`, `kubectl get -w`)은
  블록의 **마지막 줄**에만 두고, 본문에 "Ctrl+C 로 멈추세요" 라고 알려 줍니다.
- 실제 PC 에서만 되는 명령(설치 명령 `curl -fsSL https://get.docker.com | sh`, `apt install docker-ce` 등)은 `data-run` 없이 씁니다 (📋 복사 버튼만).
- **파일 만들기**: 터미널에서 heredoc(`cat <<EOF`)은 지원하지 않습니다. 대신 파일 내용 블록에 `data-file` 을 붙이면 **📄 파일로 저장** 버튼이 생깁니다.
  ```html
  <pre class="code" data-lang="Dockerfile" data-file="~/myapp/Dockerfile"><code>FROM python:3.12-slim
  WORKDIR /app
  ...</code></pre>
  ```
  경로는 반드시 `~/` 로 시작. 한 장에서 쓰는 파일이 여러 개면 `files` 묶음 + `{{widget:files|set=이름|cd=~/myapp}}` 가 편합니다.
- `<` `>` `&` 는 `&lt;` `&gt;` `&amp;`. 강조: `<span class="hl">…</span>`, 주석: `<span class="cm"># …</span>` (data-run 블록 안에서는 span 금지)
- 실행 결과 예시: `<pre class="code out" data-lang="출력"><code>…</code></pre>` (버튼 없음). **출력 예시는 시뮬레이터로 실제 실행해서 복사**하세요.
- 본문 속 짧은 명령: `<code class="cmd">docker ps -a</code>` → 누르면 터미널에서 실행.

## 4. 그림(SVG)

- `<svg class="dg" viewBox="0 0 W H" role="img" aria-label="설명">`. 가로 700~880, 세로 180~420. `width/height` 속성 금지.
- 색은 클래스로(다크 모드 자동): 도형 `box` `blue` `teal` `orange` `purple` `red` `green` `yellow` `gray` · 진한 채움 `s-blue`(글자 `tw`) ·
  선 `ln` `ln-blue` … + `thick` `thin` `dash` · 화살표 `ar` `ar-blue` `ar-green` … · 움직임 `moving` `blink` `pulse` ·
  글자 `t-sm t-xs t-lg t-xl t-b t-mu t-mono t-c(가운데) t-e(오른쪽 정렬) t-blue t-red t-green …`. 글자 y 는 글자 가운데 좌표.
- 한글 글자 폭 약 15px(15px 기준), t-sm 13px, t-xs 11.5px. **글자가 상자를 넘치지 않게** 계산하세요. `&` 는 `&amp;`.
- Docker 그림 관례: 호스트 = 큰 회색/파랑 상자, 컨테이너 = 초록/청록 둥근 상자, 이미지 = 보라(층 쌓기), 볼륨 = 주황 원통 느낌, 네트워크 = 점선 테두리.

## 5. 미션 (🎯 자동 채점) — 이 강좌의 핵심

```js
missions: [
  {
    id: 'm1',
    title: 'nginx 를 web 이라는 이름으로 8080 포트에 띄우기',
    desc: '브라우저 탭에서 <code>localhost:8080</code> 을 열어 Welcome 페이지를 확인하세요.',   // HTML
    hint: '<code>docker run -d --name ... -p 호스트:컨테이너 이미지</code>',                    // HTML
    answer: ['docker run -d --name web -p 8080:80 nginx'],        // 정답 명령 (검증 도구가 실제 실행)
    check: M => M.running('web') && M.port(8080) === M.c('web')   // true 가 되면 통과 (Promise 가능)
  },
  {
    id: 'm5', scenario: true,                                     // "장애 상황" 표시
    title: '데이터베이스가 바로 꺼진다! 원인을 찾아 고치기',
    desc: '⚙️ 상황 만들기를 누르면 postgres 컨테이너 db 가 만들어지는데 곧바로 Exited 가 됩니다. 로그를 보고 고쳐서 db 를 실행 상태로 만드세요.',
    setup: ['docker run -d --name db postgres:16-alpine'],       // 상황 만들기 버튼 (검증 도구도 실행)
    hint: '<code>docker logs db</code> 로 이유를 보세요. 환경 변수가 필요합니다.',
    answer: ['docker rm db', 'docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16-alpine'],
    files: 'flask',                                               // (선택) 풀기 전에 쓸 파일 묶음 이름
    check: M => M.running('db') && !!M.env('db', 'POSTGRES_PASSWORD')
  }
]
```

- 미션 4~8개. **쉬운 따라 하기 → 응용 → 장애 상황(scenario) 1~3개** 순서. 앞 미션의 결과를 뒤 미션이 이어 써도 됩니다(순서대로 채점).
- `answer` 는 반드시 넣습니다. **`node tools/validate.cjs chNN` 이 answer 를 실제로 실행해서 check 가 참이 되는지 확인**합니다.
- check 는 "무엇을 했는가"보다 "**결과 상태**"를 봅니다 (다른 올바른 방법으로 풀어도 통과되도록).
  명령 자체를 봐야 할 때만 `M.ran(/docker logs/)` 사용.
- 대화형(-it) 명령은 검증 도구에서 실행되지 않으므로, answer 에는 `docker exec web cat /etc/os-release` 처럼 **비대화형**으로 씁니다.

### M 도우미 (js/missions.js)

| 함수 | 뜻 |
|---|---|
| `M.c(name)` | 컨테이너 객체 (`.state.status` `.state.exitCode` `.state.oomKilled` `.hostConfig.ports/mounts/restart/memory` `.networks` `.image` `.env` `.labels` `.health`) |
| `M.running(n)` · `M.exists(n)` · `M.status(n)` · `M.exitCode(n)` | 상태 |
| `M.cs(fn)` | 조건 맞는 컨테이너 배열 · `M.runningFrom('nginx')` 그 이미지로 실행 중인 컨테이너가 있나 |
| `M.image(ref)` | 이미지 (`.size` `.layers` `.config.Cmd/Entrypoint/User/ExposedPorts/Healthcheck/Env` `.repoTags` `.built` `.os`) |
| `M.vol(n)` · `M.net(n)` · `M.connected(c, net)` | 볼륨 · 네트워크 |
| `M.port(8080)` | 그 호스트 포트를 게시한 실행 중 컨테이너 |
| `M.mount(c, '/data')` | 마운트 `{type:'volume'|'bind'|'tmpfs', source, target, ro}` |
| `M.env(c, 'KEY')` · `M.health(c)` · `M.restart(c)` · `M.memory(c)` | 설정 |
| `M.file('~/a/b.txt')` · `M.cfile(c, '/etc/x')` | 호스트 · 컨테이너 파일 내용 |
| `await M.get('http://localhost:8080/')` | HTTP 응답 본문 (실패 시 '') |
| `M.logs(c)` | 로그 전체 문자열 |
| `M.ran(/regex/)` | 그런 명령을 실행한 적 있나 |
| `M.svc('proj','web')` · `M.project('proj')` | compose 컨테이너 |
| `M.pushed('localhost:5000/app:1.0')` | 레지스트리에 올렸나 |
| `M.kube()` · `M.deploy(n)` · `M.ksvc(n)` · `M.pods(fn)` | 쿠버네티스 (15장) |

## 6. 위젯 — `{{widget:종류|옵션=값}}`

| 종류 | 내용 | 옵션 |
|---|---|---|
| `files` | 실습 파일 묶음 만들기 버튼 | `set=묶음이름` `cd=~/폴더` `title=` |
| `run` | 큰 실행 버튼 | `cmd=명령1;;명령2` `label=` |
| `open` | 실습 탭 열기 버튼 | `pane=dash|browser|files|missions|term` 또는 `url=http://localhost:8080/` |
| `mission` | "미션 탭 열기" 상자 | |
| `cmdbuilder` | docker run 명령 만들기 폼 | `image=` `name=` `port=` |
| `lifecycle` | 컨테이너 상태 전이도 + 버튼 (실시간) | `name=demo` |
| `layers` | 내 이미지의 레이어 쌓임 보기 (실시간) | `pull=nginx` |
| `portmap` | -p 호스트:컨테이너 그림 | `host=8080` `container=80` `app=80` |
| `cachesim` | 레이어 캐시 순서 실험 | |
| `sizes` | 이미지 크기 비교 막대 | `list=nginx,nginx:alpine` `title=` `local=myapp,myapp:slim` |
| `vmcompare` | VM vs 컨테이너 개수 · 메모리 비교 | |
| `netlab` | 실행 중 컨테이너 둘 골라 ping (실시간) | |

## 7. 시뮬레이터가 아는 것 (예제는 이 범위 안에서)

**이미지**(Docker Hub 흉내): hello-world, alpine(3.20/3.19/3.18), busybox, ubuntu(24.04/22.04/20.04), debian(bookworm/-slim),
nginx(latest/1.27/alpine/1.21/1.19), httpd(2.4/alpine), redis(7/alpine), postgres(17/16/16-alpine), mysql(8.4/8.0), mariadb, mongo,
python(3.12/3.12-slim/3.12-alpine/3.13/3.11), node(22/22-alpine/22-slim/20/20-alpine), golang(1.23/-alpine), eclipse-temurin(21-jdk/21-jre/21-jre-alpine),
wordpress, adminer, registry(2), traefik/whoami, docker/getting-started, nicolaka/netshoot, curlimages/curl, polinux/stress,
prom/prometheus, grafana/grafana, portainer/portainer-ce, gcr.io/distroless/static-debian12, scratch.
없는 이미지는 "pull access denied" 가 납니다 (그것도 실습 소재).

**컨테이너 안 명령**: ls cat echo env mkdir rm cp mv touch head tail grep wc sort find ps top free df mount hostname id whoami date uname sleep
ping curl wget nslookup dig ip ss nc apt-get apk pip npm go mvn python node redis-cli psql pg_isready mysql mysqladmin mongosh nginx(-t, -s reload) kill stress vi/nano(창).
도구 유무는 이미지마다 다릅니다: alpine 에는 bash · curl 이 없음(`apk add`), debian/ubuntu 에는 ping · curl · ps 가 없음(`apt-get update && apt-get install -y`),
nginx 이미지에는 curl 이 있음, python:3.12(풀) 에는 curl · git 있음 · slim 에는 없음.

**앱 코드 흉내**: Flask(`@app.route`, `app.run(host=, port=)`, 기본 127.0.0.1:5000), FastAPI + uvicorn, `python -m http.server`, gunicorn,
Express(`app.get`, `res.send/json`, `app.listen`), `http.createServer`, Go(`http.HandleFunc`, `fmt.Fprintf(w, "...")`, `ListenAndServe(":8080")` → `go build` 필요),
Spring Boot jar(`mvn package` 후 `java -jar`). `os.environ.get`, `process.env`, `socket.gethostname()`, `redis.Redis(host=...).incr()`, `psycopg2.connect(...)` + `cursor.execute`.
pip/npm 으로 설치하지 않은 모듈을 import 하면 실제처럼 ModuleNotFoundError / Cannot find module.

**호스트 명령**: docker, kubectl, minikube, curl, wget, ping, ps aux(컨테이너가 호스트 프로세스로 보임), ip addr(docker0 · br-), nano/code(📝 파일 탭),
open URL(🌐 브라우저 탭), `sudo systemctl restart docker`(재시작 정책 실험), `sudo ls /var/lib/docker/volumes`(볼륨 실제 위치), tree, watch.

## 8. 체크리스트

- [ ] `node tools/validate.cjs chNN` → 구조 경고 0 · 미션 모두 ✔
- [ ] `node tools/validate.cjs chNN --blocks` → ✖ 줄이 없거나, 있으면 **의도한 오류**(장애 재현)인지 본문에 설명
- [ ] 코드 블록의 명령을 실제 Docker 에서도 그대로 쓸 수 있는가 (시뮬레이터 전용 명령 금지)
- [ ] `${` 이스케이프 (`\${`)
- [ ] 영상: 실제로 존재하는 유튜브 영상만. 확실하지 않으면 검색 링크 `https://www.youtube.com/results?search_query=docker+volume+tutorial` (lang/min 생략, desc 에 "검색 결과")
