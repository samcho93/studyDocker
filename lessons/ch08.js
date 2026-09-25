/* 8장 — 설정 · 자원 · 재시작 */
Course.lesson({
  id: 'ch08', no: '08',
  icon: '⚙️',
  title: '설정 · 자원 · 재시작',
  subtitle: '같은 이미지를 환경마다 다르게, 넘치지 않게, 쓰러지면 다시 일어나게',
  level: '중급', time: '120분',
  goals: [
    '환경 변수(-e, --env-file, 이미지 ENV)로 이미지를 다시 빌드하지 않고 설정을 바꿀 수 있다',
    '비밀번호 같은 비밀 정보를 이미지에 넣으면 안 되는 이유를 docker history 로 보여 줄 수 있다',
    '-m/--memory, --cpus, --pids-limit 로 자원을 제한하고 docker stats 로 확인하며, OOM(137)을 재현 · 진단할 수 있다',
    '재시작 정책 no · on-failure · always · unless-stopped 의 차이를 데몬 재시작 실험으로 설명할 수 있다',
    '헬스체크 상태(starting · healthy · unhealthy)와 --init · PID 1 문제(종료 코드 0 · 137 · 143)를 이해한다'
  ],
  chips: ['docker stats --no-stream', 'docker ps -a', "docker inspect --format '{{json .State.Health}}' hweb", 'docker exec env1 env', 'sudo systemctl restart docker'],

  figs: {
    /* ---------------------------------------------------------------- 설정이 들어오는 길 */
    envflow: {
      caption: '환경 변수가 컨테이너에 들어오는 세 갈래 — 아래로 갈수록 우선순위가 높습니다. 앱은 최종 결과만 읽습니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="이미지 ENV 기본값, --env-file, -e 옵션이 합쳐져 컨테이너 환경 변수가 되고 앱이 읽는 흐름">
  <rect x="20" y="30" width="250" height="70" rx="10" class="purple"/>
  <text x="145" y="56" class="t-b t-c">① 이미지의 ENV</text>
  <text x="145" y="80" class="t-xs t-c t-mono">ENV COLOR=teal (기본값)</text>
  <rect x="20" y="130" width="250" height="70" rx="10" class="orange"/>
  <text x="145" y="156" class="t-b t-c">② --env-file .env</text>
  <text x="145" y="180" class="t-xs t-c t-mono">COLOR=orange (파일 묶음)</text>
  <rect x="20" y="230" width="250" height="70" rx="10" class="red"/>
  <text x="145" y="256" class="t-b t-c">③ -e KEY=값</text>
  <text x="145" y="280" class="t-xs t-c t-mono">-e COLOR=blue (최우선)</text>
  <line x1="272" y1="65" x2="376" y2="150" class="ln-purple ar-purple"/>
  <line x1="272" y1="165" x2="376" y2="165" class="ln-orange ar-orange"/>
  <line x1="272" y1="265" x2="376" y2="180" class="ln-red ar-red thick"/>
  <text x="318" y="96" class="t-xs t-c t-mu">덮어쓰기 ↓</text>
  <rect x="380" y="110" width="200" height="110" rx="14" class="green"/>
  <text x="480" y="136" class="t-b t-c">🐳 컨테이너 환경</text>
  <text x="480" y="164" class="t-sm t-c t-mono">COLOR=blue</text>
  <text x="480" y="188" class="t-xs t-c t-mu">겹치면 나중 것이 이김</text>
  <text x="480" y="206" class="t-xs t-c t-mu">(ENV → 파일 → -e)</text>
  <line x1="582" y1="165" x2="646" y2="165" class="ln-green ar-green thick moving"/>
  <rect x="650" y="90" width="190" height="150" rx="12" class="blue"/>
  <text x="745" y="116" class="t-b t-c">앱 코드</text>
  <text x="745" y="146" class="t-xs t-c t-mono">os.environ.get(</text>
  <text x="745" y="164" class="t-xs t-c t-mono">"COLOR", "gray")</text>
  <text x="745" y="192" class="t-xs t-c t-mono">process.env.COLOR</text>
  <text x="745" y="222" class="t-xs t-c t-mu">이미지는 그대로!</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 메모리 제한과 OOM */
    memlimit: {
      caption: 'cgroup 메모리 울타리 — 제한(-m)을 넘으면 커널의 OOM Killer 가 컨테이너 프로세스를 SIGKILL(9)로 끝냅니다 → 종료 코드 137',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="호스트 메모리 안에 컨테이너별 메모리 제한 울타리가 있고 제한을 넘으면 OOM Killer 가 동작">
  <rect x="20" y="20" width="820" height="260" rx="14" class="box"/>
  <text x="40" y="46" class="t-b">🖥️ 호스트 메모리 8GiB</text>
  <text x="820" y="46" class="t-xs t-e t-mu">제한이 없으면 컨테이너는 호스트 메모리를 다 쓸 수 있음</text>
  <rect x="40" y="70" width="240" height="190" rx="10" class="green"/>
  <text x="160" y="94" class="t-b t-c">web (-m 256m)</text>
  <rect x="70" y="110" width="180" height="120" rx="6" class="box"/>
  <rect x="70" y="200" width="180" height="30" rx="4" class="s-green"/>
  <text x="160" y="220" class="t-xs t-c tw">7MiB 사용</text>
  <text x="160" y="250" class="t-xs t-c">✔ 여유 있음</text>
  <rect x="310" y="70" width="240" height="190" rx="10" class="yellow"/>
  <text x="430" y="94" class="t-b t-c">mem (-m 128m)</text>
  <rect x="340" y="110" width="180" height="120" rx="6" class="box"/>
  <rect x="340" y="136" width="180" height="94" rx="4" class="s-orange"/>
  <text x="430" y="188" class="t-xs t-c tw">100MiB (78%)</text>
  <text x="430" y="250" class="t-xs t-c">⚠ 거의 꽉 참</text>
  <rect x="580" y="70" width="240" height="190" rx="10" class="red"/>
  <text x="700" y="94" class="t-b t-c">oom (-m 64m)</text>
  <rect x="610" y="110" width="180" height="120" rx="6" class="box dash"/>
  <rect x="610" y="104" width="180" height="126" rx="4" class="s-red"/>
  <text x="700" y="160" class="t-sm t-c tw">128MiB 요청!</text>
  <text x="700" y="184" class="t-xs t-c tw">울타리 넘침</text>
  <text x="700" y="250" class="t-xs t-c t-b t-red blink">💀 OOM Killed → 137</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 재시작 정책 표 */
    restart: {
      caption: '재시작 정책별로 "이럴 때 다시 켜지나?" — always 와 unless-stopped 의 차이는 오직 "내가 멈춘 뒤 데몬이 재시작될 때" 하나입니다',
      svg: `<svg class="dg" viewBox="0 0 860 320" role="img" aria-label="no, on-failure, always, unless-stopped 정책별 재시작 여부 표">
  <rect x="20" y="20" width="820" height="50" rx="8" class="gray"/>
  <text x="120" y="45" class="t-b t-c">상황 ↓ / 정책 →</text>
  <text x="325" y="45" class="t-b t-c t-mono">no</text>
  <text x="465" y="45" class="t-b t-c t-mono">on-failure</text>
  <text x="615" y="45" class="t-b t-c t-mono">always</text>
  <text x="765" y="45" class="t-b t-c t-mono">unless-stopped</text>
  <text x="40" y="100" class="t-sm">앱이 오류로 종료 (코드 ≠ 0)</text>
  <text x="325" y="100" class="t-lg t-c t-red">✖</text><text x="465" y="100" class="t-lg t-c t-green">✔</text><text x="615" y="100" class="t-lg t-c t-green">✔</text><text x="765" y="100" class="t-lg t-c t-green">✔</text>
  <text x="40" y="150" class="t-sm">앱이 정상 종료 (코드 0)</text>
  <text x="325" y="150" class="t-lg t-c t-red">✖</text><text x="465" y="150" class="t-lg t-c t-red">✖</text><text x="615" y="150" class="t-lg t-c t-green">✔</text><text x="765" y="150" class="t-lg t-c t-green">✔</text>
  <text x="40" y="200" class="t-sm">내가 docker stop 으로 멈춤</text>
  <text x="325" y="200" class="t-lg t-c t-red">✖</text><text x="465" y="200" class="t-lg t-c t-red">✖</text><text x="615" y="200" class="t-lg t-c t-red">✖</text><text x="765" y="200" class="t-lg t-c t-red">✖</text>
  <text x="40" y="250" class="t-sm">데몬 재시작 · 서버 재부팅</text>
  <text x="325" y="250" class="t-lg t-c t-red">✖</text><text x="465" y="250" class="t-sm t-c t-mu">보장 안 됨</text><text x="615" y="250" class="t-lg t-c t-green">✔</text><text x="765" y="250" class="t-lg t-c t-green">✔</text>
  <text x="40" y="296" class="t-sm">└ 단, 멈춰 둔 뒤 데몬 재시작</text>
  <text x="325" y="296" class="t-lg t-c t-red">✖</text><text x="465" y="296" class="t-lg t-c t-red">✖</text><text x="615" y="296" class="t-lg t-c t-green">✔ 켜짐</text><text x="765" y="296" class="t-lg t-c t-red">✖ 그대로</text>
  <line x1="30" y1="122" x2="830" y2="122" class="ln thin"/><line x1="30" y1="172" x2="830" y2="172" class="ln thin"/>
  <line x1="30" y1="222" x2="830" y2="222" class="ln thin"/><line x1="30" y1="272" x2="830" y2="272" class="ln thin dash"/>
  <rect x="540" y="276" width="296" height="40" rx="8" class="yellow dash" fill="none"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 헬스체크 상태 */
    health: {
      caption: '헬스체크 상태 변화 — 처음엔 starting, 검사가 한 번 성공하면 healthy, 연속 retries 번 실패하면 unhealthy. 다시 성공하면 healthy 로 돌아옵니다',
      svg: `<svg class="dg" viewBox="0 0 860 280" role="img" aria-label="starting 에서 healthy 와 unhealthy 로 바뀌는 헬스체크 상태도">
  <rect x="30" y="100" width="180" height="80" rx="40" class="yellow"/>
  <text x="120" y="134" class="t-b t-c">⏳ starting</text>
  <text x="120" y="158" class="t-xs t-c">컨테이너 막 시작</text>
  <rect x="340" y="30" width="200" height="80" rx="40" class="green"/>
  <text x="440" y="64" class="t-b t-c">💚 healthy</text>
  <text x="440" y="88" class="t-xs t-c">검사 명령 exit 0</text>
  <rect x="340" y="170" width="200" height="80" rx="40" class="red"/>
  <text x="440" y="204" class="t-b t-c">🤒 unhealthy</text>
  <text x="440" y="228" class="t-xs t-c">연속 retries 번 실패</text>
  <line x1="212" y1="126" x2="336" y2="76" class="ln-green ar-green thick"/>
  <text x="262" y="86" class="t-xs t-c t-green">성공 1번</text>
  <line x1="212" y1="156" x2="336" y2="204" class="ln-red ar-red"/>
  <text x="262" y="200" class="t-xs t-c t-red">실패 × 3</text>
  <path d="M 470 112 Q 500 140 470 168" class="ln-red ar-red" fill="none"/>
  <text x="520" y="140" class="t-xs t-red">실패 × 3</text>
  <path d="M 410 168 Q 380 140 410 112" class="ln-green ar-green" fill="none"/>
  <text x="362" y="140" class="t-xs t-e t-green">성공</text>
  <rect x="600" y="30" width="240" height="220" rx="12" class="box"/>
  <text x="720" y="56" class="t-b t-c">검사 설정 (기본값)</text>
  <text x="616" y="88" class="t-sm t-mono">--health-interval 30s</text>
  <text x="616" y="114" class="t-sm t-mono">--health-timeout 30s</text>
  <text x="616" y="140" class="t-sm t-mono">--health-retries 3</text>
  <text x="616" y="166" class="t-sm t-mono">--health-start-period 0s</text>
  <text x="616" y="200" class="t-xs t-mu">⚠ unhealthy 가 되어도</text>
  <text x="616" y="220" class="t-xs t-mu">Docker 는 재시작하지 않음</text>
  <text x="616" y="240" class="t-xs t-mu">(표시 · 알림 용도)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- docker stop 과 PID 1 */
    stop: {
      caption: 'docker stop 의 순서 — SIGTERM 을 보내고 기다렸다가(기본 10초), 그래도 안 끝나면 SIGKILL. PID 1 이 SIGTERM 을 무시하면 늘 10초를 기다린 뒤 137 로 죽습니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="docker stop 이 SIGTERM 후 10초 뒤 SIGKILL 을 보내는 시간 흐름과 세 가지 결과">
  <line x1="60" y1="60" x2="820" y2="60" class="ln thick ar"/>
  <text x="60" y="36" class="t-sm t-b">0초</text>
  <text x="600" y="36" class="t-sm t-b t-c">10초</text>
  <text x="820" y="36" class="t-xs t-e t-mu">시간 →</text>
  <circle cx="60" cy="60" r="8" class="s-blue"/>
  <text x="76" y="84" class="t-xs t-blue">SIGTERM(15) "정리하고 끝내 주세요"</text>
  <circle cx="600" cy="60" r="8" class="s-red"/>
  <text x="612" y="84" class="t-xs t-red">SIGKILL(9) 강제 종료</text>
  <rect x="40" y="110" width="780" height="60" rx="10" class="green"/>
  <text x="60" y="136" class="t-b">nginx · postgres</text>
  <text x="60" y="156" class="t-xs">신호를 처리하는 서버 → 바로 정리 후 종료</text>
  <rect x="330" y="124" width="120" height="32" rx="6" class="s-green"/>
  <text x="390" y="140" class="t-sm t-c tw t-b">Exited (0)</text>
  <rect x="40" y="185" width="780" height="60" rx="10" class="red"/>
  <text x="60" y="211" class="t-b">sleep · 셸 스크립트 (PID 1)</text>
  <text x="60" y="231" class="t-xs">SIGTERM 무시 → 10초 기다림 → 강제 종료</text>
  <line x1="400" y1="215" x2="590" y2="215" class="ln-red dash"/>
  <rect x="640" y="199" width="140" height="32" rx="6" class="s-red"/>
  <text x="710" y="215" class="t-sm t-c tw t-b">Exited (137)</text>
  <rect x="40" y="260" width="780" height="60" rx="10" class="teal"/>
  <text x="60" y="286" class="t-b">같은 sleep + --init</text>
  <text x="60" y="306" class="t-xs">docker-init(tini)이 PID 1 → 신호를 전달 → 곧바로 종료</text>
  <rect x="440" y="274" width="140" height="32" rx="6" class="s-blue"/>
  <text x="510" y="290" class="t-sm t-c tw t-b">Exited (143)</text>
</svg>`
    }
  },

  files: {
    envapp: {
      '~/envapp/app.py': `import os
from flask import Flask

app = Flask(__name__)

# 환경 변수를 읽고, 없으면 두 번째 값(기본값)을 씁니다
GREETING = os.environ.get("GREETING", "안녕하세요")
APP_ENV = os.environ.get("APP_ENV", "development")
COLOR = os.environ.get("COLOR", "gray")

@app.route("/")
def home():
    return f"<h1 style='color:{COLOR}'>{GREETING}!</h1><p>APP_ENV = {APP_ENV}</p>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
`,
      '~/envapp/requirements.txt': 'flask\n',
      '~/envapp/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
# 이미지에 넣는 것은 "기본값" 뿐 — 실행할 때 -e 로 덮어씁니다
ENV APP_ENV=production \\
    COLOR=teal
EXPOSE 5000
CMD ["python", "app.py"]
`,
      '~/envapp/.env': `# 스테이징 서버용 설정 (KEY=값, 한 줄에 하나)
GREETING=반가워요
COLOR=orange
APP_ENV=staging
`
    },
    nodeenv: {
      '~/nodeenv/server.js': `const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const NAME = process.env.APP_NAME || 'node-app';

app.get('/', (req, res) => {
  res.send(\`<h1>\${NAME}</h1><p>PORT=\${PORT}, NODE_ENV=\${process.env.NODE_ENV}</p>\`);
});

app.listen(PORT, () => console.log(\`\${NAME} listening on \${PORT}\`));
`,
      '~/nodeenv/package.json': `{
  "name": "nodeenv",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": { "express": "^4.19.2" }
}
`,
      '~/nodeenv/Dockerfile': `FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY server.js .
ENV NODE_ENV=production
CMD ["node", "server.js"]
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '설정은 이미지 밖에 — 같은 이미지, 다른 환경',
      html: `
<p>개발 PC, 테스트 서버, 실제 서비스(운영) 서버에서 앱은 조금씩 다른 설정으로 돌아야 합니다. 데이터베이스 주소, 로그 수준, 외부 API 키, 기능 스위치 같은 것들이죠.
그런데 설정이 바뀔 때마다 이미지를 새로 빌드한다면, <b>"테스트한 이미지"와 "운영에 올린 이미지"가 서로 다른 물건</b>이 되어 버립니다.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 밀키트와 양념</div>
이미지는 공장에서 봉인된 <b>밀키트</b>입니다. 매운 걸 좋아하는 집, 싱겁게 먹는 집이 있다고 밀키트를 따로 만들지 않죠.
같은 밀키트에 <b>양념(설정)</b>만 다르게 넣습니다. Docker 에서 그 양념이 <b>환경 변수(environment variable)</b> 입니다.</div>

<p>웹 서비스 설계 원칙으로 널리 알려진 <b>12-Factor App</b> 의 세 번째 항목도 "설정은 코드와 분리해 <b>환경</b>에 저장하라"입니다.
Docker 는 이 원칙을 아주 쉽게 지킬 수 있게 해 줍니다.</p>

{{fig:envflow}}

<div class="tbl-wrap"><table class="tbl">
<tr><th>방법</th><th>어디에 쓰나</th><th>예</th><th>특징</th></tr>
<tr><td><b>이미지 ENV</b></td><td>Dockerfile</td><td><code>ENV APP_ENV=production</code></td><td>모든 컨테이너의 <b>기본값</b>. 이미지 안에 영구히 기록됨</td></tr>
<tr><td><b>--env-file</b></td><td>docker run</td><td><code>--env-file .env</code></td><td>여러 개를 파일 하나로. 환경(스테이징 · 운영)별 파일을 따로 둠</td></tr>
<tr><td><b>-e / --env</b></td><td>docker run</td><td><code>-e COLOR=blue</code></td><td>하나씩 직접 지정. <b>가장 우선</b></td></tr>
</table></div>

<div class="cards c3">
<div class="card blue"><div class="ci">🧪</div><b>개발</b><p><code>APP_ENV=development</code><br>디버그 로그 켜기</p></div>
<div class="card orange"><div class="ci">🚦</div><b>스테이징</b><p><code>--env-file staging.env</code><br>테스트용 DB</p></div>
<div class="card green"><div class="ci">🚀</div><b>운영</b><p><code>--env-file prod.env</code><br>실제 DB · 경고 이상만 로그</p></div>
</div>
<p>세 곳 모두 <b>똑같은 이미지</b>(같은 다이제스트)를 씁니다. 그래서 "테스트에서 됐는데 운영에서 안 돼요"가 크게 줄어듭니다.</p>

<div class="box note"><div class="box-t">📝 이번 장에서 다룰 것</div>
<ol class="steps-list">
<li><b>설정</b> — 환경 변수 넣기 · 읽기, 비밀 정보 주의</li>
<li><b>자원</b> — 메모리 · CPU · 프로세스 수 제한과 OOM</li>
<li><b>재시작</b> — 쓰러지면 다시 일으키는 정책, 헬스체크</li>
<li><b>운영 습관</b> — 로그 크기 제한, <code>--init</code> 과 깔끔한 종료</li>
</ol></div>
`
    },

    /* ================================================================ 2 */
    {
      title: '환경 변수 실습 — Flask · Express 앱에서 읽어 보기',
      html: `
<p>환경 변수를 읽는 작은 Flask 앱을 준비했습니다. <code>os.environ.get("이름", "기본값")</code> 은 "그 이름의 환경 변수가 있으면 그 값, 없으면 기본값"입니다.
아래 버튼으로 파일 4개(<code>app.py</code> · <code>requirements.txt</code> · <code>Dockerfile</code> · <code>.env</code>)를 한 번에 만드세요.</p>

{{widget:files|set=envapp|cd=~/envapp|title=환경 변수 Flask 앱 파일 만들기}}

<pre class="code" data-lang="python"><code>GREETING = os.environ.get("GREETING", "안녕하세요")
APP_ENV = os.environ.get("APP_ENV", "development")
COLOR = os.environ.get("COLOR", "gray")</code></pre>

<h4>① 기본값 그대로 실행</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/envapp
docker build -t envapp .
docker run -d --name env1 -p 8081:5000 envapp
curl -s localhost:8081</code></pre>
<pre class="code out" data-lang="출력"><code>&lt;h1 style='color:teal'&gt;안녕하세요!&lt;/h1&gt;&lt;p&gt;APP_ENV = production&lt;/p&gt;</code></pre>
<p><code>GREETING</code> 은 아무도 정하지 않았으니 코드의 기본값 <b>안녕하세요</b>, <code>COLOR</code> · <code>APP_ENV</code> 는 Dockerfile 의 <code>ENV</code> 값(teal · production)이 쓰였습니다.</p>

<h4>② -e 로 덮어쓰기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name env2 -p 8082:5000 -e GREETING=Hello -e COLOR=red envapp
curl -s localhost:8082</code></pre>
<pre class="code out" data-lang="출력"><code>&lt;h1 style='color:red'&gt;Hello!&lt;/h1&gt;&lt;p&gt;APP_ENV = production&lt;/p&gt;</code></pre>

<h4>③ --env-file 로 한꺼번에</h4>
<pre class="code" data-lang="env" data-file="~/envapp/.env"><code># 스테이징 서버용 설정 (KEY=값, 한 줄에 하나)
GREETING=반가워요
COLOR=orange
APP_ENV=staging</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name env3 -p 8083:5000 --env-file .env envapp
curl -s localhost:8083</code></pre>
<pre class="code out" data-lang="출력"><code>&lt;h1 style='color:orange'&gt;반가워요!&lt;/h1&gt;&lt;p&gt;APP_ENV = staging&lt;/p&gt;</code></pre>

{{widget:open|url=http://localhost:8083/}}
<p>🌐 브라우저 탭에서 <code>localhost:8081</code> · <code>8082</code> · <code>8083</code> 을 차례로 열어 보세요. <b>이미지는 하나</b>인데 글자와 색이 다 다릅니다.</p>

<div class="box warn"><div class="box-t">⚠️ env 파일 문법은 셸과 다릅니다</div>
<code>--env-file</code> 은 <code>KEY=값</code> 을 <b>글자 그대로</b> 읽습니다. 따옴표를 쓰면 따옴표까지 값이 되고(<code>A="x"</code> → <code>"x"</code>), <code>\${VAR}</code> 치환도 하지 않습니다.
<code>#</code> 으로 시작하는 줄은 주석입니다. (9장에서 배울 Compose 의 <code>.env</code> 는 규칙이 조금 다릅니다.)</div>

<h4>④ 컨테이너 안의 환경 변수 확인하기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec env3 env
docker exec env3 printenv APP_ENV
docker inspect --format '{{json .Config.Env}}' env3</code></pre>
<pre class="code out" data-lang="출력"><code>PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOME=/root
PYTHON_VERSION=3.12.7
LANG=C.UTF-8
APP_ENV=staging
COLOR=orange
GREETING=반가워요
HOSTNAME=fd15eae025a5

staging

["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","PYTHON_VERSION=3.12.7","LANG=C.UTF-8","APP_ENV=staging","COLOR=orange","GREETING=반가워요"]</code></pre>
<p><code>PYTHON_VERSION</code> · <code>LANG</code> 은 베이스 이미지 <code>python:3.12-slim</code> 이 넣어 둔 ENV 입니다. 이미지의 기본값만 보려면 <code>docker image inspect</code> 를 씁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker image inspect --format '{{json .Config.Env}}' envapp</code></pre>

<h4>⑤ 우선순위와 "값 없이 -e"</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --rm --env-file .env -e COLOR=blue alpine printenv COLOR
export API_KEY=abc123
docker run --rm -e API_KEY alpine printenv API_KEY</code></pre>
<pre class="code out" data-lang="출력"><code>blue
abc123</code></pre>
<ul>
<li><code>--env-file</code> 과 <code>-e</code> 가 겹치면 <b><code>-e</code> 가 이깁니다</b> (파일을 먼저 읽고 <code>-e</code> 로 덮어씀).</li>
<li><code>-e API_KEY</code> 처럼 <b>값 없이 이름만</b> 쓰면 <b>내 셸(호스트)의 같은 이름 변수 값</b>을 넘깁니다. 비밀 값을 명령 기록(history)에 남기지 않는 요령입니다.</li>
<li>공백이 있는 값은 따옴표로: <code>-e "GREETING=Hello Docker"</code></li>
</ul>

<h4>⑥ Node.js(Express) 도 똑같습니다</h4>
<p>Node 에서는 <code>process.env.이름</code> 으로 읽습니다. 특히 <b>포트 번호를 환경 변수로</b> 받는 방식은 클라우드 서비스에서 아주 흔합니다.</p>
{{widget:files|set=nodeenv|cd=~/nodeenv|title=Express 앱 파일 만들기}}
<pre class="code" data-lang="javascript"><code>const PORT = process.env.PORT || 3000;
const NAME = process.env.APP_NAME || 'node-app';</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/nodeenv
docker build -t nodeenv .
docker run -d --name nodeshop -p 8090:8080 -e PORT=8080 -e APP_NAME=shop nodeenv
curl -s localhost:8090
docker logs nodeshop</code></pre>
<pre class="code out" data-lang="출력"><code>&lt;h1&gt;shop&lt;/h1&gt;&lt;p&gt;PORT=8080, NODE_ENV=production&lt;/p&gt;
shop listening on 8080</code></pre>
<div class="box tip"><div class="box-t">💡 포트를 바꾸면 -p 도 같이</div>
앱이 <code>PORT=8080</code> 으로 듣게 했으니 <code>-p 8090:<b>8080</b></code> 처럼 <b>컨테이너 쪽 포트</b>도 맞춰야 합니다. 둘이 어긋나면 "Connection reset" 이 납니다(12장).</div>
`
    },

    /* ================================================================ 3 */
    {
      title: '비밀번호를 이미지에 굽지 마세요',
      html: `
<p>"설정은 이미지 밖에"의 가장 중요한 경우가 <b>비밀 정보(secret)</b> — 비밀번호, API 키, 토큰입니다.
Dockerfile 에 <code>ENV DB_PASSWORD=...</code> 를 쓰면 무슨 일이 생기는지 직접 보겠습니다.</p>

<pre class="code" data-lang="Dockerfile" data-file="~/leaky/Dockerfile"><code>FROM alpine:3.20
# ❌ 절대 이렇게 하지 마세요
ENV DB_PASSWORD=SuperSecret123
CMD ["sh", "-c", "echo connecting..."]</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/leaky
docker build -t leaky .
docker history leaky
docker image inspect --format '{{json .Config.Env}}' leaky</code></pre>
<pre class="code out" data-lang="출력"><code>IMAGE          CREATED                  CREATED BY                                      SIZE    COMMENT
2649daee7044   Less than a second ago   CMD ["sh","-c","echo connecting..."]            0B      buildkit.dockerfile.v0
&lt;missing&gt;      Less than a second ago   ENV DB_PASSWORD=SuperSecret123                  0B      buildkit.dockerfile.v0
&lt;missing&gt;      2 weeks ago              CMD ["/bin/sh"]                                 0B
&lt;missing&gt;      2 weeks ago              /bin/sh -c #(nop) ADD file:7d538ddedf62 in /    7.8MB

["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","DB_PASSWORD=SuperSecret123"]</code></pre>

<div class="box warn"><div class="box-t">⚠️ 이미지를 받은 사람은 누구나 볼 수 있습니다</div>
이미지를 레지스트리에 올리는 순간 <b>pull 할 수 있는 모든 사람</b>이 <code>docker history</code> 한 줄로 비밀번호를 봅니다.
뒤 단계에서 <code>ENV DB_PASSWORD=</code> 로 지우거나 <code>RUN rm .env</code> 로 파일을 지워도 <b>앞 레이어에는 그대로 남아</b> 있습니다(2 · 6장의 레이어 원리).</div>

<div class="vs">
<div class="vs-a red"><b>❌ 하지 말 것</b><ul>
<li><code>ENV PASSWORD=...</code> · <code>ARG TOKEN=...</code></li>
<li><code>COPY .env .</code> (비밀 파일 복사)</li>
<li>Git 저장소에 <code>.env</code> 커밋</li>
</ul></div>
<div class="vs-mid">VS</div>
<div class="vs-b green"><b>✅ 이렇게</b><ul>
<li>실행할 때 <code>-e</code> · <code>--env-file</code> 로 주입</li>
<li><code>.env</code> 는 <code>.gitignore</code> · <code>.dockerignore</code> 에 추가</li>
<li>Compose · Swarm 의 <b>secrets</b>, 빌드 중에는 <code>RUN --mount=type=secret</code> (13장)</li>
</ul></div>
</div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 환경 변수도 완벽하진 않습니다</div>
환경 변수는 <code>docker inspect</code> 로 보이고, 앱이 오류 화면에 환경 변수를 통째로 찍는 사고도 있습니다.
그래서 운영에서는 비밀 값을 <b>파일로 마운트</b>(<code>/run/secrets/db_password</code>)하고 앱이 그 파일을 읽게 하는 방식을 더 권합니다.
공식 postgres · mysql 이미지가 <code>POSTGRES_PASSWORD_FILE</code> 처럼 <code>_FILE</code> 로 끝나는 변수를 지원하는 이유입니다. 자세한 내용은 13장 보안에서 다룹니다.</div>
`
    },

    /* ================================================================ 4 */
    {
      title: '자원 제한 — 메모리 · CPU · 프로세스 수',
      html: `
<p>아무 옵션 없이 실행한 컨테이너는 <b>호스트의 메모리와 CPU 를 제한 없이</b> 쓸 수 있습니다. 한 컨테이너에 메모리 누수가 생기면 같은 서버의 다른 컨테이너, 심지어 Docker 데몬까지 함께 쓰러질 수 있습니다.
리눅스 커널의 <b>cgroups(control groups, 자원 울타리)</b> 가 이 제한을 담당합니다(14장).</p>

<div class="box analogy"><div class="box-t">🏢 비유 — 공유 오피스의 전기 차단기</div>
한 사무실이 난방기를 잔뜩 켜서 건물 전체 전기가 나가면 곤란하죠. 그래서 방마다 <b>차단기(용량 제한)</b>를 답니다.
그 방이 용량을 넘으면 <b>그 방 차단기만</b> 내려갑니다. 컨테이너의 <code>-m</code> 이 바로 그 차단기입니다.</div>

<div class="tbl-wrap"><table class="tbl">
<tr><th>옵션</th><th>뜻</th><th>예</th></tr>
<tr><td><code>-m</code>, <code>--memory</code></td><td>쓸 수 있는 메모리 최대치 (단위 b · k · m · g, 최소 6MB)</td><td><code>-m 256m</code></td></tr>
<tr><td><code>--memory-swap</code></td><td>메모리 + 스왑 합계. <code>-m</code> 과 같게 주면 스왑을 쓰지 않음</td><td><code>--memory-swap 256m</code></td></tr>
<tr><td><code>--memory-reservation</code></td><td>평소 보장하려는 양(부드러운 제한)</td><td><code>--memory-reservation 128m</code></td></tr>
<tr><td><code>--cpus</code></td><td>CPU 코어 몇 개 분량까지 (소수 가능)</td><td><code>--cpus 0.5</code> = 코어 절반</td></tr>
<tr><td><code>--pids-limit</code></td><td>컨테이너 안 프로세스 · 스레드 최대 개수</td><td><code>--pids-limit 100</code></td></tr>
</table></div>

{{fig:memlimit}}

<h4>제한을 걸고 docker stats 로 보기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name lim -m 256m --cpus 0.5 nginx
docker stats --no-stream lim
docker inspect --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}' lim</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O           BLOCK I/O   PIDS
12cccb3ec3fa   lim    0.29%   6.92MiB / 256MiB    2.70%   3.24kB / 1.66kB   0B / 0B     9

268435456 500000000</code></pre>
<ul>
<li><b>MEM USAGE / LIMIT</b> — 지금 쓰는 양 / 울타리. 제한이 없으면 LIMIT 에 호스트 전체 메모리(여기선 8GiB)가 보입니다.</li>
<li><code>HostConfig.Memory</code> 는 바이트 단위(256 × 1024 × 1024 = 268435456), <code>NanoCpus</code> 는 CPU 의 10억분의 1 단위(0.5 CPU = 500000000)입니다.</li>
<li><code>docker stats</code> 를 옵션 없이 쓰면 계속 갱신되는 화면이 뜹니다. <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 빠져나옵니다. 📊 대시보드 탭에서도 같은 숫자를 볼 수 있어요.</li>
</ul>
{{widget:open|pane=dash}}

<p>컨테이너 안에서 보면 cgroup 파일에 울타리가 그대로 적혀 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec lim cat /sys/fs/cgroup/memory.max
docker exec lim cat /sys/fs/cgroup/cpu.max</code></pre>
<pre class="code out" data-lang="출력"><code>268435456
50000 100000</code></pre>
<p><code>cpu.max</code> 의 <code>50000 100000</code> 은 "100ms 마다 50ms 만 CPU 를 쓸 수 있다" = 코어 0.5개라는 뜻입니다.</p>

<h4>CPU 를 마구 쓰는 컨테이너 길들이기</h4>
<p><code>polinux/stress</code> 이미지의 <code>stress</code> 도구로 일부러 부하를 줘 봅니다. 4개의 CPU 일꾼을 돌리지만 <code>--cpus 1.5</code> 로 묶었습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name hog --cpus 1.5 polinux/stress stress --cpu 4
docker stats --no-stream hog</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   NAME   CPU %     MEM USAGE / LIMIT   MEM %   NET I/O         BLOCK I/O   PIDS
b5deeac9a3d2   hog    148.09%   1.04MiB / 8GiB      0.01%   1.32kB / 380B   0B / 0B     5</code></pre>
<p>CPU % 가 <b>150% 근처에서 멈춥니다</b> (100% = 코어 1개). CPU 는 넘쳐도 죽지 않고 <b>느려질 뿐</b>이지만, 메모리는 넘치면 <b>죽습니다</b> — 다음 절에서 확인합니다.</p>

<h4>--pids-limit — 포크 폭탄 막기</h4>
<p>프로세스를 끝없이 복제하는 버그(포크 폭탄)는 호스트 전체의 프로세스 표를 채워 버립니다. <code>--pids-limit</code> 로 개수에 울타리를 칩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name pl --pids-limit 100 nginx
docker exec pl cat /sys/fs/cgroup/pids.max</code></pre>
<pre class="code out" data-lang="출력"><code>100</code></pre>

<h4>실행 중에 바꾸기 — docker update</h4>
<p>컨테이너를 지우지 않고 메모리 · CPU · 재시작 정책을 바꿀 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker update -m 512m --memory-swap 512m --cpus 1 lim
docker stats --no-stream lim
docker rm -f hog pl</code></pre>
<pre class="code out" data-lang="출력"><code>lim
CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O           BLOCK I/O   PIDS
12cccb3ec3fa   lim    0.03%   7.35MiB / 512MiB    1.44%   3.24kB / 1.66kB   0B / 0B     9</code></pre>
<div class="box tip"><div class="box-t">💡 얼마로 정하나요?</div>
① 제한 없이 돌려 보며 <code>docker stats</code> 로 평소 · 최대 사용량을 관찰 → ② 최대치에 여유(30~50%)를 더해 <code>-m</code> 설정 → ③ 운영하며 조정. 자바(JVM)처럼 시작할 때 메모리를 크게 잡는 런타임은 제한 안에서 힙 크기를 정하도록 설정하는 것이 좋습니다.</div>
`
    },

    /* ================================================================ 5 */
    {
      title: 'OOM Killed — 메모리가 넘치면 무슨 일이?',
      html: `
<p><b>OOM(Out Of Memory)</b> 은 "메모리가 모자람"입니다. 컨테이너가 <code>-m</code> 울타리를 넘으면 리눅스 커널의 <b>OOM Killer</b> 가 그 안의 프로세스를 <code>SIGKILL</code>(9번 신호)로 즉시 끝냅니다.
정리할 틈도 없는 강제 종료라 로그에는 흔적이 거의 남지 않습니다. 그래서 "갑자기 사라졌어요" 라는 문의가 오면 제일 먼저 의심해야 합니다.</p>

<h4>① 울타리 안에서는 괜찮음</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name mem -m 128m polinux/stress stress --vm 1 --vm-bytes 100M
docker stats --no-stream mem</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %    NET I/O         BLOCK I/O   PIDS
f44bc5bf6575   mem    0.00%   100MiB / 128MiB     78.44%   1.32kB / 380B   0B / 0B     2</code></pre>

<h4>② 울타리를 넘으면 — OOM 재현</h4>
<p>64MB 울타리에 128MB 를 요구해 봅니다. <code>-d</code> 없이 실행하니 결과를 바로 볼 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run --name oom -m 64m polinux/stress stress --vm 1 --vm-bytes 128M
echo $?
docker ps -a --filter name=oom</code></pre>
<pre class="code out" data-lang="출력"><code>stress: info: [1] dispatching hogs: 0 cpu, 0 io, 1 vm, 0 hdd
stress: FAIL: [1] (415) &lt;-- worker 7 got signal 9
stress: WARN: [1] (417) now reaping child worker processes
stress: FAIL: [1] (451) failed run completed in 1s

137

CONTAINER ID   IMAGE            COMMAND                  CREATED         STATUS                                PORTS   NAMES
729cf7892557   polinux/stress   "stress --vm 1 --vm-…"   1 second ago    Exited (137) Less than a second ago           oom</code></pre>

<h4>③ 진짜 OOM 이었는지 확인</h4>
<p>137 은 "SIGKILL 로 죽었다(128 + 9)"는 뜻일 뿐, <b>누가</b> 죽였는지는 모릅니다(<code>docker kill</code> 일 수도 있죠). 확실히 하려면 <code>State.OOMKilled</code> 를 봅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect --format '{{.State.OOMKilled}} {{.State.ExitCode}}' oom
docker inspect --format '{{json .State}}' oom</code></pre>
<pre class="code out" data-lang="출력"><code>true 137
{"Status":"exited","Running":false,"Paused":false,"Restarting":false,"OOMKilled":true,"Dead":false,"Pid":0,"ExitCode":137,"Error":"","StartedAt":"2026-09-25T18:08:07.743000000Z","FinishedAt":"2026-09-25T18:08:08.557000000Z"}</code></pre>

<div class="flow">
<div class="fb orange"><span class="fi">📈</span><b>메모리 증가</b>누수 · 큰 요청</div>
<div class="fb red"><span class="fi">🧱</span><b>-m 울타리 도달</b>cgroup 한도</div>
<div class="fb red"><span class="fi">💀</span><b>OOM Killer</b>SIGKILL(9)</div>
<div class="fb gray"><span class="fi">🔢</span><b>Exited (137)</b>OOMKilled: true</div>
<div class="fb green"><span class="fi">🔧</span><b>해결</b>-m 늘리기 · 누수 수정</div>
</div>

<div class="box note"><div class="box-t">📝 종료 코드가 137 이 아닐 수도 있어요</div>
메인 프로세스 자신이 죽으면 137 이지만, <code>stress</code> 처럼 <b>자식 프로세스만</b> 죽고 부모가 오류를 보고하며 끝나면 1 같은 다른 코드가 나오기도 합니다.
그러니 "갑자기 죽었다"면 종료 코드와 함께 <b><code>OOMKilled</code> 값</b>과 호스트의 커널 로그(<code>dmesg</code>, <code>journalctl -k</code> 의 "Out of memory" / "oom-kill")를 함께 보세요.</div>

<div class="box practice"><div class="box-t">🧪 해 보기 — 데이터베이스도 OOM 이 납니다</div>
MySQL 은 시작할 때 수백 MB 를 씁니다. <code>-m 256m</code> 으로 띄우면 어떻게 될까요?
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name tinydb -m 256m -e MYSQL_ROOT_PASSWORD=secret mysql:8.4
docker wait tinydb
docker inspect --format '{{.State.OOMKilled}}' tinydb
docker rm -f tinydb mem oom</code></pre>
<code>docker wait</code> 는 컨테이너가 끝날 때까지 기다렸다가 종료 코드(137)를 출력합니다. 해결은 <code>docker update -m 1g --memory-swap 1g tinydb</code> 후 <code>docker start tinydb</code> — 12장 미션에서 직접 해 봅니다.</div>
`
    },

    /* ================================================================ 6 */
    {
      title: '재시작 정책 — 쓰러지면 다시 일으키기',
      html: `
<p>서버 앱은 언젠가 죽습니다. 예외 한 번, 메모리 부족 한 번, 서버 재부팅 한 번. 그때마다 사람이 <code>docker start</code> 를 칠 수는 없죠.
<code>--restart</code> 옵션으로 <b>Docker 데몬에게 "죽으면 다시 켜 줘"</b> 라고 맡깁니다.</p>

<div class="box analogy"><div class="box-t">⏰ 비유 — 알람 시계의 다시 알림</div>
<code>no</code> 는 알람을 한 번만, <code>on-failure</code> 는 "못 일어났을 때만" 다시 울림, <code>always</code> 는 무조건 다시 울림,
<code>unless-stopped</code> 는 "내가 끄기 버튼을 누르지 않았다면" 다시 울림입니다.</div>

<div class="tbl-wrap"><table class="tbl">
<tr><th>정책</th><th>뜻</th><th>이럴 때</th></tr>
<tr><td><code>no</code> (기본)</td><td>다시 켜지 않음</td><td>일회성 작업, 실습</td></tr>
<tr><td><code>on-failure[:N]</code></td><td>종료 코드가 0 이 아닐 때만, 최대 N 번</td><td>배치 작업 — 성공하면 끝, 실패하면 몇 번 재시도</td></tr>
<tr><td><code>always</code></td><td>어떻게 끝나든 다시 켬. 수동 stop 해도 데몬 재시작 때 다시 켜짐</td><td>꼭 떠 있어야 하는 서비스</td></tr>
<tr><td><code>unless-stopped</code></td><td>always 와 같지만 <b>내가 멈춰 둔 것은 존중</b></td><td>대부분의 서버 앱에 <span class="tag green">추천</span></td></tr>
</table></div>

{{fig:restart}}

<h4>① 앱이 죽을 때 — 정책별 비교</h4>
<p>1초 뒤에 스스로 끝나는 컨테이너 네 개를 정책만 다르게 띄웁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name r-no alpine sh -c "sleep 1; exit 1"
docker run -d --name r-fail --restart on-failure:3 alpine sh -c "sleep 1; exit 1"
docker run -d --name r-always --restart always alpine sh -c "sleep 1; exit 0"
docker run -d --name r-unless --restart unless-stopped alpine sh -c "sleep 1; exit 0"
docker ps -a</code></pre>
<p>몇 초 기다렸다가 다시 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps -a
docker inspect --format '{{.Name}} {{.RestartCount}} {{.HostConfig.RestartPolicy.Name}}' r-no r-fail r-always r-unless</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE    COMMAND                  CREATED         STATUS                        PORTS   NAMES
7a73c30a8e8d   alpine   "sh -c sleep 1; exit…"   8 seconds ago   Restarting (0) 1 second ago           r-unless
9a510816260e   alpine   "sh -c sleep 1; exit…"   8 seconds ago   Restarting (0) 1 second ago           r-always
27f6725af24b   alpine   "sh -c sleep 1; exit…"   8 seconds ago   Exited (1) 1 second ago               r-fail
26789c60428b   alpine   "sh -c sleep 1; exit…"   8 seconds ago   Exited (1) 7 seconds ago              r-no

/r-no 0 no
/r-fail 3 on-failure
/r-always 3 always
/r-unless 3 unless-stopped</code></pre>
<ul>
<li><b>r-no</b> — 한 번 죽고 끝. <b>r-fail</b> — 3번 재시작하고 포기(Exited). <b>r-always · r-unless</b> — 정상 종료(0)인데도 계속 다시 켜짐.</li>
<li><code>Restarting (0)</code> — 다시 켜기를 기다리는 중. Docker 는 재시작 간격을 <b>100ms 부터 두 배씩</b> 늘립니다(최대 1분). 계속 죽는 앱이 CPU 를 잡아먹지 않게 하려는 장치입니다.</li>
<li>📊 대시보드 탭에서 상태가 바뀌는 모습을 지켜보세요. (실습 환경은 대기 시간을 줄여서 보여 줍니다.)</li>
</ul>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f r-no r-fail r-always r-unless</code></pre>

<h4>② 데몬이 재시작될 때 — always 와 unless-stopped 의 차이</h4>
<p>서버 재부팅을 흉내 내기 위해 Docker 데몬을 재시작해 봅니다. 그 전에 <b>일부는 손으로 멈춰 둡니다</b>.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name a1 --restart always nginx
docker run -d --name u1 --restart unless-stopped nginx
docker run -d --name u2 --restart unless-stopped nginx
docker run -d --name n1 nginx
docker stop a1 u1
sudo systemctl restart docker
docker ps -a --format 'table {{.Names}}\\t{{.Status}}'</code></pre>
<pre class="code out" data-lang="출력"><code>NAMES   STATUS
n1      Exited (0) 1 second ago
u2      Up Less than a second
u1      Exited (0) 1 second ago
a1      Up Less than a second</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th>컨테이너</th><th>정책</th><th>데몬 재시작 전</th><th>후</th><th>이유</th></tr>
<tr><td>a1</td><td>always</td><td>내가 stop</td><td><b>Up</b></td><td>always 는 데몬이 켜질 때 무조건 다시 켬</td></tr>
<tr><td>u1</td><td>unless-stopped</td><td>내가 stop</td><td>Exited</td><td>"내가 멈춘 것"을 기억하고 존중</td></tr>
<tr><td>u2</td><td>unless-stopped</td><td>실행 중</td><td><b>Up</b></td><td>멈춘 적 없으니 다시 켬</td></tr>
<tr><td>n1</td><td>no</td><td>실행 중</td><td>Exited</td><td>정책이 없으니 꺼진 채로</td></tr>
</table></div>

<div class="box warn"><div class="box-t">⚠️ docker stop 은 재시작 정책을 이깁니다</div>
어떤 정책이든 <b>사람이 <code>docker stop</code> 으로 멈추면</b> 그 자리에서 다시 켜지지 않습니다. 정책은 "스스로 죽었을 때"를 위한 것입니다.
또, 재시작 정책은 컨테이너가 <b>한 번 제대로 시작된 뒤</b>(약 10초 이상 실행)부터 적용됩니다. 시작하자마자 설정 오류로 죽는 앱을 무한 재시작하지 않기 위해서입니다.</div>

<h4>③ 이미 만든 컨테이너의 정책 바꾸기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker update --restart unless-stopped n1
docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' n1
docker rm -f a1 u1 u2 n1</code></pre>
<pre class="code out" data-lang="출력"><code>n1
unless-stopped</code></pre>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
서버 한 대에서 Docker 로 서비스를 돌린다면 <code>--restart unless-stopped</code> 가 가장 무난한 선택입니다. Compose 에서는 <code>restart: unless-stopped</code> 로 씁니다(9장).
여러 서버에 걸친 자동 복구 · 교체는 쿠버네티스 같은 오케스트레이터의 몫입니다(15장).</div>
`
    },

    /* ================================================================ 7 */
    {
      title: '헬스체크 — "살아 있음"과 "일하고 있음"은 다릅니다',
      html: `
<p><code>Up 3 hours</code> 는 <b>프로세스가 살아 있다</b>는 뜻일 뿐입니다. 웹 서버가 멈춰(교착 상태) 요청에 답하지 못해도 프로세스는 살아 있을 수 있죠.
<b>헬스체크(healthcheck)</b> 는 Docker 가 주기적으로 컨테이너 <b>안에서</b> 검사 명령을 실행해 "제대로 일하는지"를 확인하는 기능입니다. 검사 명령이 <b>0 으로 끝나면 성공</b>, 1 이면 실패입니다.</p>

<div class="box analogy"><div class="box-t">🩺 비유 — 정기 검진</div>
숨을 쉬는지(Up)만 보지 않고, 정기적으로 청진기(검사 명령)를 대 봅니다. 세 번 연속 이상 소견이 나오면 "건강하지 않음" 딱지를 붙입니다.</div>

{{fig:health}}

<h4>① docker run 옵션으로</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name hweb -p 8088:80 --health-cmd "curl -fs http://localhost/ || exit 1" --health-interval 5s --health-retries 3 nginx
docker ps --filter name=hweb</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE   COMMAND                  CREATED                  STATUS                                     PORTS                                     NAMES
a6e9bdf5f301   nginx   "/docker-entrypoint.…"   Less than a second ago   Up Less than a second (health: starting)   0.0.0.0:8088->80/tcp, [::]:8088->80/tcp   hweb</code></pre>
<p>잠시 뒤 다시 보면 <code>(healthy)</code> 로 바뀝니다. 자세한 기록은 <code>State.Health</code> 에 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps --filter name=hweb
docker inspect --format '{{.State.Health.Status}}' hweb
docker inspect --format '{{json .State.Health}}' hweb</code></pre>
<pre class="code out" data-lang="출력"><code>a6e9bdf5f301   nginx   "/docker-entrypoint.…"   3 seconds ago   Up 3 seconds (healthy)   0.0.0.0:8088->80/tcp, [::]:8088->80/tcp   hweb

healthy

{"Status":"healthy","FailingStreak":0,"Log":[{"Start":"2026-09-25T18:09:07.002000000Z","End":"2026-09-25T18:09:07.032000000Z","ExitCode":0,"Output":"&lt;!DOCTYPE html&gt;\\n&lt;html&gt;\\n&lt;head&gt;\\n&lt;title&gt;Welcome to nginx!&lt;/title&gt; …"}]}</code></pre>
<ul>
<li><code>curl -f</code> 는 HTTP 오류(4xx · 5xx)면 실패 코드로 끝나게 합니다. 이게 없으면 403 페이지를 받아도 "성공"이 됩니다.</li>
<li><code>|| exit 1</code> — 헬스체크 종료 코드는 0(healthy) · 1(unhealthy)만 쓰도록 되어 있어 다른 코드를 1 로 맞춰 줍니다.</li>
<li><code>Log</code> 에는 최근 검사 5개의 종료 코드와 출력이 남습니다. <b>왜 unhealthy 인지</b> 볼 때 가장 먼저 여는 곳입니다.</li>
</ul>

<h4>② 일부러 아프게 만들기</h4>
<p>첫 페이지 파일을 지우면 nginx 는 살아 있지만 403 을 돌려줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker exec hweb rm /usr/share/nginx/html/index.html
curl -s localhost:8088</code></pre>
<p>검사 간격(5초) × 3번이 지나면:</p>
<pre class="code" data-lang="bash" data-run="sh"><code>docker ps --filter health=unhealthy
docker inspect --format '{{.State.Health.Status}} {{.State.Health.FailingStreak}}' hweb</code></pre>
<pre class="code out" data-lang="출력"><code>CONTAINER ID   IMAGE   COMMAND                  CREATED         STATUS                     PORTS                                     NAMES
a6e9bdf5f301   nginx   "/docker-entrypoint.…"   8 seconds ago   Up 8 seconds (unhealthy)   0.0.0.0:8088->80/tcp, [::]:8088->80/tcp   hweb

unhealthy 4</code></pre>

<h4>③ Dockerfile 의 HEALTHCHECK — 이미지에 기본 검사 넣기</h4>
<pre class="code" data-lang="Dockerfile" data-file="~/hc/Dockerfile"><code>FROM nginx:alpine
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -fs http://localhost/ || exit 1</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/hc
docker build -t webhc .
docker run -d --name hc2 webhc
docker image inspect --format '{{json .Config.Healthcheck}}' webhc</code></pre>
<pre class="code out" data-lang="출력"><code>{"Test":["CMD-SHELL","curl -fs http://localhost/ || exit 1"],"Interval":10000000000,"Retries":3}</code></pre>
<p>이 이미지로 만든 컨테이너는 옵션 없이도 헬스체크가 켜집니다. 끄고 싶으면 <code>docker run --no-healthcheck</code>, 바꾸고 싶으면 <code>--health-cmd</code> 로 덮어씁니다.</p>

<div class="box warn"><div class="box-t">⚠️ 흔한 실수 두 가지</div>
<ol class="steps-list">
<li><b>검사 도구가 이미지에 없음</b> — <code>python:3.12-slim</code> · <code>node:22-slim</code> 등에는 curl 이 없습니다. 검사 명령이 "command not found" 로 늘 실패해 영원히 unhealthy 가 됩니다. 앱 언어로 검사하거나(<code>python -c "..."</code>) 도구를 설치하세요.</li>
<li><b>unhealthy 면 Docker 가 재시작해 준다고 착각</b> — 일반 <code>docker run</code> 에서는 <b>표시만</b> 합니다. 재시작은 오케스트레이터(Swarm · 쿠버네티스)나 모니터링 도구의 몫이고,
Compose 에서는 <code>depends_on: condition: service_healthy</code> 로 "DB 가 건강해진 뒤 웹 시작"에 씁니다(10장).</li>
</ol></div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f hweb hc2</code></pre>
`
    },

    /* ================================================================ 8 */
    {
      title: '로그 드라이버와 로그 크기 제한',
      html: `
<p>컨테이너가 표준 출력(stdout) · 표준 오류(stderr)로 내보낸 글은 Docker 의 <b>로그 드라이버(logging driver)</b> 가 받아 저장합니다.
기본 드라이버는 <code>json-file</code> 로, 호스트의 <code>/var/lib/docker/containers/&lt;ID&gt;/&lt;ID&gt;-json.log</code> 파일에 한 줄씩 JSON 으로 적습니다. <code>docker logs</code> 는 이 파일을 읽어 보여 주는 것이죠.</p>

<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name lw -p 8089:80 nginx
curl -s localhost:8089
docker logs --tail 3 lw
docker inspect --format '{{.LogPath}}' lw</code></pre>

<div class="box warn"><div class="box-t">⚠️ 기본값은 "끝없이 쌓기"</div>
<code>json-file</code> 은 기본 설정에서 <b>로그 파일을 자르거나 돌려쓰지 않습니다</b>. 요청마다 한 줄씩 찍는 웹 서버를 몇 달 돌리면 로그 파일 하나가 수십 GB 가 되어 <b>디스크가 꽉 차고</b>,
그러면 데이터베이스 쓰기까지 실패합니다. 실무에서 꽤 자주 만나는 장애입니다.</div>

<h4>컨테이너마다 크기 제한 걸기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name lw2 --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 nginx</code></pre>
<p><code>max-size=10m</code> — 파일이 10MB 가 되면 새 파일로 넘김, <code>max-file=3</code> — 최대 3개까지만 보관(가장 오래된 것부터 삭제). 즉 이 컨테이너의 로그는 <b>최대 30MB</b> 입니다.</p>

<h4>서버 전체 기본값 바꾸기 — /etc/docker/daemon.json</h4>
<pre class="code" data-lang="json"><code>{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}</code></pre>
<pre class="code" data-lang="bash"><code>sudo nano /etc/docker/daemon.json
sudo systemctl restart docker</code></pre>
<div class="box note"><div class="box-t">📝 새로 만드는 컨테이너부터 적용</div>
daemon.json 의 로그 설정은 <b>이후에 만드는 컨테이너</b>에만 적용됩니다. 기존 컨테이너는 지우고 다시 만들어야 합니다.
Docker 문서는 파일 크기 관리를 알아서 해 주는 <code>local</code> 드라이버도 권장합니다(<code>"log-driver": "local"</code>).</div>

<div class="tbl-wrap"><table class="tbl">
<tr><th>드라이버</th><th>저장 위치</th><th><code>docker logs</code></th><th>쓰임</th></tr>
<tr><td><code>json-file</code></td><td>호스트 JSON 파일</td><td>✔</td><td>기본값. <b>max-size 꼭 설정</b></td></tr>
<tr><td><code>local</code></td><td>호스트(압축 · 자동 순환)</td><td>✔</td><td>단일 서버에 권장</td></tr>
<tr><td><code>journald</code> · <code>syslog</code></td><td>시스템 로그</td><td>journald 는 ✔</td><td>서버 로그와 한곳에서</td></tr>
<tr><td><code>fluentd</code> · <code>gelf</code> · <code>awslogs</code> 등</td><td>외부 로그 수집 시스템</td><td>설정에 따라</td><td>여러 서버 로그를 모아 검색</td></tr>
<tr><td><code>none</code></td><td>저장 안 함</td><td>✖</td><td>로그가 필요 없는 작업</td></tr>
</table></div>

<div class="box tip"><div class="box-t">💡 앱은 파일이 아니라 stdout 으로</div>
컨테이너 앱은 로그를 <b>파일에 쓰지 말고 표준 출력으로</b> 내보내는 것이 원칙입니다(12-Factor 의 "로그는 이벤트 스트림").
그래야 <code>docker logs</code> 로 보이고, 로그 드라이버가 크기 관리와 수집을 맡을 수 있습니다. 공식 nginx 이미지도 access.log 를 <code>/dev/stdout</code> 으로 연결해 두었습니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm -f lw lw2</code></pre>
`
    },

    /* ================================================================ 9 */
    {
      title: '--init 과 PID 1 — docker stop 이 10초 걸리는 이유',
      html: `
<p><code>docker stop</code> 을 했는데 한참(10초) 있다가 멈추는 컨테이너를 본 적 있나요? 원인은 <b>PID 1</b> 입니다.
컨테이너 안에서 처음 실행된 프로세스는 프로세스 번호 1 을 받는데, 리눅스는 PID 1 에게 특별한 규칙을 적용합니다:
<b>신호 처리 코드를 직접 등록하지 않은 신호는 무시</b>됩니다. 보통 프로세스라면 SIGTERM 을 받으면 기본 동작으로 끝나지만, PID 1 은 그러지 않습니다.</p>

{{fig:stop}}

<h4>실험 — 세 가지 종료</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>docker run -d --name sleeper alpine sleep 1000
docker run -d --name sleeper-init --init alpine sleep 1000
docker run -d --name webstop nginx
docker stop sleeper
docker stop sleeper-init
docker stop webstop
docker inspect --format '{{.Name}} {{.State.ExitCode}}' sleeper sleeper-init webstop</code></pre>
<pre class="code out" data-lang="출력"><code>/sleeper 137
/sleeper-init 143
/webstop 0</code></pre>
<p><code>docker stop sleeper</code> 만 눈에 띄게 오래 걸립니다(실제 Docker 는 10초, 실습 환경은 줄여서 보여 줌).</p>

<div class="tbl-wrap"><table class="tbl">
<tr><th>종료 코드</th><th>계산</th><th>뜻</th><th>이번 실험</th></tr>
<tr><td><b>0</b></td><td>—</td><td>신호를 받고 스스로 깔끔하게 정리 후 종료</td><td>nginx (SIGQUIT 을 받아 우아하게 종료)</td></tr>
<tr><td><b>143</b></td><td>128 + 15(SIGTERM)</td><td>SIGTERM 으로 끝남 — 정상적인 정지 요청</td><td>--init 이 신호를 sleep 에 전달</td></tr>
<tr><td><b>137</b></td><td>128 + 9(SIGKILL)</td><td>강제 종료 — 타임아웃 · <code>docker kill</code> · OOM</td><td>PID 1 sleep 이 SIGTERM 무시</td></tr>
</table></div>

<h4>--init 이 하는 일</h4>
<p><code>--init</code> 을 주면 Docker 가 아주 작은 init 프로그램(<code>docker-init</code>, 내부는 <b>tini</b>)을 PID 1 로 먼저 띄우고, 내 프로그램을 그 자식으로 실행합니다.</p>
<div class="layers">
<div class="ly teal"><b>PID 1 · docker-init (tini)</b><span>받은 신호를 자식에게 전달 · 끝난 자식 프로세스(좀비) 회수</span><em>--init</em></div>
<div class="ly green"><b>PID 7 · sleep 1000 (내 앱)</b><span>이제 PID 1 이 아니므로 SIGTERM 기본 동작대로 종료</span><em>앱</em></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker inspect --format '{{.HostConfig.Init}}' sleeper-init</code></pre>

<div class="box tip"><div class="box-t">💡 PID 1 문제를 피하는 방법</div>
<ol class="steps-list">
<li><b>CMD 를 exec 형식으로</b> — <code>CMD ["python", "app.py"]</code>. 셸 형식(<code>CMD python app.py</code>)은 <code>/bin/sh</code> 가 PID 1 이 되어 신호가 앱까지 가지 않습니다(7장).</li>
<li><b>앱에서 SIGTERM 처리</b> — 받으면 연결 정리 후 종료. 대부분의 서버 프레임워크(gunicorn, Spring Boot 등)는 이미 합니다.</li>
<li><b><code>--init</code></b> — 셸 스크립트나 신호를 처리하지 않는 프로그램이면 가장 간단한 해결책. Compose 는 <code>init: true</code>, Dockerfile 에서는 tini 를 직접 설치해 <code>ENTRYPOINT ["/sbin/tini", "--"]</code>.</li>
<li><b>기다리는 시간 조정</b> — 정리에 오래 걸리는 앱은 <code>docker stop -t 30</code> 또는 <code>docker run --stop-timeout 30</code>.</li>
</ol></div>

<div class="box dev"><div class="box-t">👩‍💻 왜 중요할까요?</div>
배포할 때마다 컨테이너를 멈추고 새로 띄웁니다. 매번 10초씩 기다리면 배포가 느려지고, <b>SIGKILL 로 죽으면 처리 중이던 요청 · 쓰던 파일이 중간에 끊깁니다</b>.
"종료 코드 137 이 자주 보인다"면 OOM 인지, 이 PID 1 문제인지 <code>OOMKilled</code> 로 구분해 보세요.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>docker rm sleeper sleeper-init webstop</code></pre>

{{widget:mission}}
`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: '환경 변수로 인사말 바꾸기',
      desc: '<code>~/envapp</code> 의 Flask 앱을 <code>envapp</code> 이미지로 빌드하고, 이름이 <code>hello</code> 인 컨테이너를 호스트 <b>8081</b> 포트(컨테이너 5000)에 띄우세요. 이때 <code>GREETING</code> 을 <b>Hello Docker</b> 로 주어 🌐 브라우저에서 <code>localhost:8081</code> 에 "Hello Docker!" 가 보이게 하세요.',
      hint: '<code>docker run -d --name hello -p 8081:5000 -e "GREETING=Hello Docker" envapp</code> — 공백이 있으니 따옴표로 감쌉니다. (8081 을 다른 컨테이너가 쓰고 있다면 먼저 지우세요.)',
      files: 'envapp',
      answer: ['cd ~/envapp', 'docker rm -f env1', 'docker build -t envapp .', 'docker run -d --name hello -p 8081:5000 -e "GREETING=Hello Docker" envapp'],
      check: async M => M.running('hello') && M.env('hello', 'GREETING') === 'Hello Docker' && (await M.get('http://localhost:8081/')).includes('Hello Docker')
    },
    {
      id: 'm2',
      title: '--env-file 로 스테이징 설정 넣기',
      desc: '같은 <code>envapp</code> 이미지로 <code>staging</code> 컨테이너를 호스트 <b>8082</b> 포트에 띄우되, <code>~/envapp/.env</code> 파일의 설정을 <code>--env-file</code> 로 한 번에 넣으세요. 페이지에 <b>APP_ENV = staging</b> 이 보여야 합니다.',
      hint: '<code>docker run -d --name staging -p 8082:5000 --env-file ~/envapp/.env envapp</code>',
      answer: ['docker rm -f env2', 'docker run -d --name staging -p 8082:5000 --env-file ~/envapp/.env envapp'],
      check: async M => M.running('staging') && M.env('staging', 'APP_ENV') === 'staging' && (await M.get('http://localhost:8082/')).includes('APP_ENV = staging')
    },
    {
      id: 'm3',
      title: '메모리 256MB · CPU 0.5개로 제한된 nginx',
      desc: '이름이 <code>limited</code> 인 nginx 컨테이너를 <b>메모리 256MB</b>, <b>CPU 0.5개</b> 로 제한해 실행하고 <code>docker stats --no-stream limited</code> 로 LIMIT 이 256MiB 인지 확인하세요.',
      hint: '<code>docker run -d --name limited -m 256m --cpus 0.5 nginx</code>',
      answer: ['docker run -d --name limited -m 256m --cpus 0.5 nginx'],
      check: M => M.running('limited') && M.memory('limited') === 256 * 1024 * 1024 && M.c('limited').hostConfig.cpus === 0.5
    },
    {
      id: 'm4',
      title: 'OOM 재현하고 OOMKilled 확인하기',
      desc: '<code>polinux/stress</code> 이미지로 <b>메모리 64MB</b> 제한 컨테이너 <code>boom</code> 을 만들고, 그 안에서 <code>stress --vm 1 --vm-bytes 128M</code> 으로 128MB 를 요구해 OOM 으로 죽게 하세요. 그 다음 <code>docker inspect</code> 로 <code>OOMKilled</code> 가 <code>true</code>, 종료 코드가 137 인지 확인하세요.',
      hint: '<code>docker run --name boom -m 64m polinux/stress stress --vm 1 --vm-bytes 128M</code> → <code>docker inspect --format \'{{.State.OOMKilled}} {{.State.ExitCode}}\' boom</code>',
      answer: ['docker run --name boom -m 64m polinux/stress stress --vm 1 --vm-bytes 128M', "docker inspect --format '{{.State.OOMKilled}} {{.State.ExitCode}}' boom"],
      check: M => M.exists('boom') && M.c('boom').state.oomKilled === true && M.exitCode('boom') === 137
    },
    {
      id: 'm5',
      title: '서버가 재부팅돼도 살아나는 웹 서버',
      desc: '이름이 <code>svc</code> 인 nginx 컨테이너를 호스트 <b>8085</b> 포트에 <b>unless-stopped</b> 재시작 정책으로 띄우세요. 그 다음 <code>sudo systemctl restart docker</code> 로 데몬을 재시작해도 <code>svc</code> 가 다시 실행 중인지 확인하세요.',
      hint: '<code>docker run -d --name svc --restart unless-stopped -p 8085:80 nginx</code>',
      answer: ['docker run -d --name svc --restart unless-stopped -p 8085:80 nginx', 'sudo systemctl restart docker'],
      check: M => M.restart('svc') === 'unless-stopped' && M.running('svc') && M.port(8085) === M.c('svc')
    },
    {
      id: 'm6',
      title: '헬스체크가 healthy 인 웹 서버',
      desc: '이름이 <code>checked</code> 인 nginx 컨테이너를 <b>헬스체크</b>와 함께 실행하세요. 검사 명령은 <code>curl -fs http://localhost/ || exit 1</code>, 간격은 5초. <code>docker ps</code> 의 STATUS 에 <code>(healthy)</code> 가 보이면 성공입니다.',
      hint: '<code>docker run -d --name checked --health-cmd "curl -fs http://localhost/ || exit 1" --health-interval 5s nginx</code>',
      answer: ['docker run -d --name checked --health-cmd "curl -fs http://localhost/ || exit 1" --health-interval 5s nginx'],
      check: M => M.running('checked') && M.health('checked') === 'healthy'
    },
    {
      id: 'm7', scenario: true,
      title: '멀쩡한데 unhealthy?! 헬스체크 고치기',
      desc: '⚙️ 상황 만들기를 누르면 nginx 컨테이너 <code>shop</code> 이 8086 포트에 뜹니다. 브라우저로 열면 잘 되는데 <code>docker ps</code> 에는 곧 <code>(unhealthy)</code> 가 뜹니다. <code>{{json .State.Health}}</code> 로 원인을 찾고, <code>shop</code> 을 <b>같은 이름 · 같은 포트</b>로 다시 만들어 <b>healthy</b> 가 되게 하세요.',
      setup: ['docker run -d --name shop -p 8086:80 --health-cmd "curl -fs http://localhost:8080/ || exit 1" --health-interval 5s nginx'],
      hint: '검사 명령이 <b>컨테이너 안의 8080</b> 을 두드리고 있습니다. nginx 는 컨테이너 안에서 <b>80</b> 을 듣습니다. <code>docker rm -f shop</code> 후 <code>--health-cmd "curl -fs http://localhost/ || exit 1"</code> 로 다시 실행하세요.',
      answer: ['docker rm -f shop', 'docker run -d --name shop -p 8086:80 --health-cmd "curl -fs http://localhost/ || exit 1" --health-interval 5s nginx'],
      check: M => M.running('shop') && M.port(8086) === M.c('shop') && M.health('shop') === 'healthy'
    },
    {
      id: 'm8', scenario: true,
      title: 'docker stop 이 너무 느린 컨테이너',
      desc: '⚙️ 상황 만들기를 누르면 <code>ticker</code> 컨테이너(<code>alpine sleep 3600</code>)가 만들어집니다. 멈출 때마다 오래 기다리고 종료 코드가 137 로 나옵니다. <b>--init</b> 을 써서 <code>ticker</code> 를 다시 만들어, 멈출 때 곧바로 SIGTERM 으로 끝나게(143) 하세요. 새 <code>ticker</code> 는 <b>실행 중</b>이어야 합니다.',
      setup: ['docker run -d --name ticker alpine sleep 3600'],
      hint: '<code>docker rm -f ticker</code> → <code>docker run -d --name ticker --init alpine sleep 3600</code>',
      answer: ['docker rm -f ticker', 'docker run -d --name ticker --init alpine sleep 3600'],
      check: M => M.running('ticker') && M.c('ticker').hostConfig.init === true
    }
  ],

  videos: [
    { title: 'Docker Tutorial for Beginners [FULL COURSE in 3 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', lang: 'en', min: '2시간 46분', desc: 'Docker 전체 흐름 복습용. 환경 변수로 컨테이너 설정하는 부분을 다시 보세요' },
    { title: 'docker 환경 변수 env-file (검색)', url: 'https://www.youtube.com/results?search_query=docker+%ED%99%98%EA%B2%BD%EB%B3%80%EC%88%98+env-file', desc: '유튜브 검색 결과 — -e, --env-file 설명 영상' },
    { title: 'docker memory limit OOM killed (검색)', url: 'https://www.youtube.com/results?search_query=docker+memory+limit+oom+killed', desc: '유튜브 검색 결과 — 메모리 제한과 OOM 원리' },
    { title: 'docker restart policy (검색)', url: 'https://www.youtube.com/results?search_query=docker+restart+policy+unless-stopped', desc: '유튜브 검색 결과 — 재시작 정책 비교' },
    { title: 'docker healthcheck tutorial (검색)', url: 'https://www.youtube.com/results?search_query=docker+healthcheck+tutorial', desc: '유튜브 검색 결과 — HEALTHCHECK 작성법' },
    { title: 'docker PID 1 tini --init (검색)', url: 'https://www.youtube.com/results?search_query=docker+pid+1+tini+init+signal', desc: '유튜브 검색 결과 — PID 1 과 신호 처리' }
  ],

  terms: [
    ['환경 변수(environment variable)', '프로세스가 실행될 때 함께 받는 "이름=값" 설정. 컨테이너에는 -e · --env-file · 이미지 ENV 로 넣습니다'],
    ['--env-file', 'KEY=값 줄로 된 파일에서 환경 변수를 한꺼번에 읽어 넣는 docker run 옵션'],
    ['12-Factor App', '클라우드용 앱을 만드는 12가지 원칙. "설정은 환경에", "로그는 이벤트 스트림으로" 등'],
    ['비밀 정보(secret)', '비밀번호 · API 키 · 토큰처럼 노출되면 안 되는 값. 이미지에 넣지 말고 실행 시점에 주입'],
    ['cgroups', '리눅스 커널이 프로세스 묶음의 메모리 · CPU · 프로세스 수를 제한하고 재는 기능'],
    ['OOM Killer', '메모리가 한도를 넘으면 커널이 프로세스를 골라 SIGKILL 로 끝내는 장치. 컨테이너는 137 · OOMKilled: true'],
    ['docker stats', '실행 중인 컨테이너의 CPU · 메모리 · 네트워크 · PIDS 사용량을 실시간으로 보여 주는 명령'],
    ['docker update', '실행 중인 컨테이너의 메모리 · CPU 제한과 재시작 정책을 다시 만들지 않고 바꾸는 명령'],
    ['재시작 정책(restart policy)', 'no · on-failure[:N] · always · unless-stopped. 컨테이너가 끝났을 때 데몬이 다시 켤지 정하는 규칙'],
    ['헬스체크(healthcheck)', '컨테이너 안에서 주기적으로 검사 명령을 실행해 starting · healthy · unhealthy 상태를 매기는 기능'],
    ['로그 드라이버(logging driver)', '컨테이너 stdout/stderr 를 어디에 어떻게 저장할지 정하는 부품. 기본 json-file, max-size 로 크기 제한'],
    ['PID 1', '컨테이너에서 처음 실행된 프로세스. 신호 처리를 직접 등록하지 않으면 SIGTERM 을 무시합니다'],
    ['--init (tini)', 'PID 1 자리에 작은 init 을 두어 신호를 전달하고 좀비 프로세스를 회수하게 하는 docker run 옵션'],
    ['SIGTERM · SIGKILL', '15번 "정리하고 끝내라"(무시 가능) · 9번 "즉시 종료"(무시 불가). 종료 코드 143 · 137 의 정체']
  ],

  summary: [
    '설정은 이미지 밖에: 이미지 ENV(기본값) → --env-file → -e 순으로 덮어쓰고, 앱은 os.environ.get / process.env 로 읽습니다.',
    '비밀번호를 ENV · COPY 로 이미지에 넣으면 docker history 로 누구나 봅니다. 실행 시점에 주입하고, 운영은 secrets(파일)로.',
    '-m · --cpus · --pids-limit 로 자원 울타리를 치고 docker stats 로 확인합니다. CPU 는 넘치면 느려지고, 메모리는 넘치면 OOM 으로 죽습니다(137, OOMKilled: true).',
    '재시작 정책: 서버 앱은 unless-stopped 가 무난. always 와의 차이는 "내가 멈춘 뒤 데몬 재시작" 때뿐이고, docker stop 은 어떤 정책보다 우선합니다.',
    '헬스체크는 "살아 있음"이 아니라 "일하고 있음"을 봅니다. State.Health.Log 로 실패 이유를 보고, unhealthy 라고 Docker 가 재시작해 주지는 않습니다.',
    'json-file 로그는 기본적으로 끝없이 쌓이니 max-size · max-file(또는 local 드라이버)을 설정합니다.',
    'docker stop 이 10초 걸리고 137 로 끝나면 PID 1 문제 — exec 형식 CMD, SIGTERM 처리, --init 으로 0 또는 143 으로 깔끔하게 끝내세요.'
  ],

  quiz: [
    {
      q: 'Dockerfile 에 ENV COLOR=teal 이 있고, docker run --env-file .env(COLOR=orange) -e COLOR=blue 로 실행했습니다. 앱이 읽는 COLOR 는?',
      options: ['teal', 'orange', 'blue', '세 값이 쉼표로 합쳐짐'],
      answer: 2,
      explain: '이미지 ENV → --env-file → -e 순으로 덮어쓰므로 -e 로 준 blue 가 최종 값입니다.'
    },
    {
      q: 'Dockerfile 에 ENV DB_PASSWORD=... 를 넣었다가 다음 줄에서 ENV DB_PASSWORD= 로 비웠습니다. 안전한가요?',
      options: ['안전하다 — 마지막 값만 남는다', '위험하다 — docker history 에 앞 단계의 값이 그대로 보인다', '안전하다 — ENV 는 빌드가 끝나면 사라진다', '위험하지만 docker push 하면 자동으로 지워진다'],
      answer: 1,
      explain: '이미지의 각 단계 기록(history)과 레이어는 지워지지 않습니다. 비밀은 처음부터 이미지에 넣지 말고 실행할 때 주입해야 합니다.'
    },
    {
      q: '컨테이너가 Exited (137) 로 끝났습니다. OOM 때문인지 확실히 알려면 무엇을 봐야 할까요?',
      options: ['docker images', 'docker inspect 의 State.OOMKilled', 'docker port', 'docker network ls'],
      answer: 1,
      explain: '137 은 SIGKILL 로 죽었다는 뜻일 뿐(docker kill · stop 타임아웃도 137)입니다. State.OOMKilled 가 true 여야 메모리 초과입니다.'
    },
    {
      q: 'unless-stopped 와 always 가 다르게 동작하는 상황은?',
      options: ['앱이 오류 코드 1 로 죽었을 때', '앱이 정상 코드 0 으로 끝났을 때', 'docker stop 으로 멈춰 둔 상태에서 Docker 데몬이 재시작될 때', '컨테이너를 처음 실행할 때'],
      answer: 2,
      explain: 'always 는 데몬이 켜질 때 수동으로 멈춘 컨테이너도 다시 켜고, unless-stopped 는 멈춰 둔 것을 존중해 그대로 둡니다.'
    },
    {
      q: '헬스체크 결과가 unhealthy 가 되면 docker run 으로 띄운 컨테이너는 어떻게 되나요?',
      options: ['Docker 가 즉시 재시작한다', 'Docker 가 컨테이너를 삭제한다', '상태 표시만 unhealthy 로 바뀌고 계속 실행된다', '호스트 포트 연결이 끊어진다'],
      answer: 2,
      explain: '일반 Docker 엔진은 헬스 상태를 기록 · 표시만 합니다. 교체나 재시작은 오케스트레이터나 모니터링 도구, Compose 의 depends_on 조건 등에서 활용합니다.'
    },
    {
      q: 'alpine 의 sleep 1000 컨테이너에 docker stop 을 하면 약 10초 뒤 137 로 끝납니다. --init 을 붙이면?',
      options: ['여전히 10초 뒤 137', '곧바로 143 으로 끝난다', '멈추지 않는다', '종료 코드 1 로 끝난다'],
      answer: 1,
      explain: 'docker-init(tini)이 PID 1 이 되어 SIGTERM 을 sleep 에 전달합니다. sleep 은 더 이상 PID 1 이 아니므로 바로 종료되고, 128+15 = 143 이 됩니다.'
    },
    {
      q: 'json-file 로그 드라이버에 max-size=10m, max-file=3 을 주면 한 컨테이너의 로그는 최대 얼마나 차지하나요?',
      options: ['10MB', '약 30MB', '3MB', '제한 없음'],
      answer: 1,
      explain: '10MB 파일을 최대 3개까지 돌려 쓰므로 약 30MB 입니다. 기본값(설정 없음)은 제한이 없어 디스크를 가득 채울 수 있습니다.'
    }
  ]
});
