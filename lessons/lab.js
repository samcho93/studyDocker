/* 부록 — 실습실 · 장애 대응 시나리오 */
(function () {
  'use strict';
  // 파일 내용을 printf 명령으로 (실제 bash 에서도 그대로 동작). 내용에 ' % \ 는 쓰지 않는다.
  const pf = (path, text) => `printf '${text.replace(/\n/g, '\\n')}' > ${path}`;

  const PY_DOCKERFILE = `FROM python:3.12-slim
WORKDIR /app
RUN pip install flask
COPY app.py .
CMD ["python", "app.py"]
`;
  const flaskApp = (msg, run, pre) => `from flask import Flask
${pre || ''}app = Flask(__name__)

@app.route("/")
def home():
    return "${msg}"

${run}
`;
  const RUN_OK = 'app.run(host="0.0.0.0", port=5000)';

  const SC15_COMPOSE_BAD = `services:
  web:
    build: .
    ports:
      - "8115:5000"
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
`;
  const SC15_COMPOSE_OK = `services:
  web:
    build: .
    ports:
      - "8115:5000"
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 3s
      retries: 10
`;
  const SC15_APP = `import psycopg2
from flask import Flask

conn = psycopg2.connect(host="db", user="postgres", password="secret")
app = Flask(__name__)

@app.route("/")
def home():
    return "sc15 ok: db connected"

app.run(host="0.0.0.0", port=5000)
`;
  const ngConf = up => `server {
    listen 80;
    location / {
        proxy_pass http://${up}:80;
    }
}
`;

  const hostPortOf = (M, n) => { const c = M.c(n); const p = c && c.hostConfig.ports && c.hostConfig.ports[0]; return p ? p.hostPort : null; };
  const httpHas = async (M, url, s) => (await M.get(url)).includes(s);

  const missions = [
    /* ---------------------------------------------------------------- 1 */
    {
      id: 'sc1', scenario: true, ch: '04', tag: '포트',
      title: '🔌 port is already allocated',
      desc: '⚙️ 상황 만들기: <code>sc1-old</code>(nginx)가 8101 포트를 쓰고 있는데 <code>sc1-web</code>(httpd)도 8101 로 띄우려다 실패했습니다. <code>sc1-old</code> 는 그대로 두고, <code>sc1-web</code> 을 <b>비어 있는 다른 호스트 포트</b>로 실행해 브라우저에서 "It works!" 가 보이게 하세요.',
      setup: ['docker rm -f sc1-old sc1-web 2>/dev/null', 'docker run -d --name sc1-old -p 8101:80 nginx', 'docker run -d --name sc1-web -p 8101:80 httpd'],
      hint: '<code>docker ps -a</code> 로 보면 <code>sc1-web</code> 은 <code>Created</code> 상태로 남아 있습니다. <code>docker ps --format "{{.Names}} {{.Ports}}"</code> 로 누가 8101 을 쓰는지 확인하고, sc1-web 을 지운 뒤 <code>-p 8181:80</code> 처럼 다른 포트로 다시 실행하세요.',
      answer: ['docker rm sc1-web', 'docker run -d --name sc1-web -p 8181:80 httpd', 'curl -s localhost:8181'],
      check: async M => { if (!M.running('sc1-web') || !M.running('sc1-old')) return false; const hp = hostPortOf(M, 'sc1-web'); return !!hp && httpHas(M, 'http://localhost:' + hp + '/', 'It works!'); }
    },
    /* ---------------------------------------------------------------- 2 */
    {
      id: 'sc2', scenario: true, ch: '03', tag: '이름',
      title: '🏷️ Conflict. The container name is already in use',
      desc: '⚙️ 상황 만들기: <code>sc2-app</code> 을 <code>nginx:alpine</code> 이미지 + 8102 포트로 새로 띄우려는데 같은 이름의 옛 컨테이너(nginx:1.27) 때문에 실패합니다. 옛 것을 정리하고 <code>sc2-app</code> 을 <code>nginx:alpine</code> 으로, 8102 포트에 실행하세요.',
      setup: ['docker rm -f sc2-app 2>/dev/null', 'docker run -d --name sc2-app nginx:1.27', 'docker run -d --name sc2-app -p 8102:80 nginx:alpine'],
      hint: '컨테이너 이름은 하나뿐이어야 합니다. <code>docker rm -f sc2-app</code> 으로 지우거나 <code>docker rename sc2-app sc2-old</code> 로 이름을 바꾼 뒤 다시 실행하세요.',
      answer: ['docker rm -f sc2-app', 'docker run -d --name sc2-app -p 8102:80 nginx:alpine'],
      check: M => { const c = M.c('sc2-app'); return M.running('sc2-app') && c.image === 'nginx:alpine' && M.port(8102) === c; }
    },
    /* ---------------------------------------------------------------- 3 */
    {
      id: 'sc3', scenario: true, ch: '03', tag: '생명주기',
      title: '💤 컨테이너가 바로 Exited (0) 가 된다',
      desc: '⚙️ 상황 만들기: 나중에 <code>docker exec</code> 로 들어가 작업하려고 <code>sc3-box</code>(ubuntu)를 <code>-d</code> 로 띄웠는데, <code>docker ps</code> 에 보이지 않고 <code>Exited (0)</code> 입니다. 에러도 없는데 왜 꺼질까요? <code>sc3-box</code> 가 계속 실행 중이도록 고치세요.',
      setup: ['docker rm -f sc3-box 2>/dev/null', 'docker run -d --name sc3-box ubuntu', 'docker ps -a --filter name=sc3-box'],
      hint: '컨테이너는 <b>메인 프로세스가 끝나면</b> 꺼집니다. ubuntu 의 기본 명령은 bash 인데, 입력(터미널)이 없으면 바로 끝납니다. <code>-dit</code> 로 터미널을 붙여 두거나, <code>sleep infinity</code> 처럼 끝나지 않는 명령을 주세요.',
      answer: ['docker rm sc3-box', 'docker run -dit --name sc3-box ubuntu', 'docker exec sc3-box cat /etc/os-release'],
      check: M => M.running('sc3-box')
    },
    /* ---------------------------------------------------------------- 4 */
    {
      id: 'sc4', scenario: true, ch: '05', tag: 'DB',
      title: '🐘 postgres 가 켜지자마자 꺼진다',
      desc: '⚙️ 상황 만들기: <code>sc4-db</code>(postgres:16-alpine)가 곧바로 <code>Exited (1)</code> 이 됩니다. 로그로 원인을 찾아 <code>sc4-db</code> 가 실행 상태가 되게 하세요.',
      setup: ['docker rm -f sc4-db 2>/dev/null', 'docker run -d --name sc4-db postgres:16-alpine'],
      hint: '<code>docker logs sc4-db</code> — 슈퍼유저 비밀번호 환경 변수 <code>POSTGRES_PASSWORD</code> 가 필요합니다. 컨테이너의 환경 변수는 나중에 바꿀 수 없으니 지우고 <code>-e</code> 로 다시 만드세요.',
      answer: ['docker logs sc4-db', 'docker rm sc4-db', 'docker run -d --name sc4-db -e POSTGRES_PASSWORD=secret postgres:16-alpine'],
      check: M => M.running('sc4-db') && !!M.env('sc4-db', 'POSTGRES_PASSWORD')
    },
    /* ---------------------------------------------------------------- 5 */
    {
      id: 'sc5', scenario: true, ch: '04', tag: '네트워크',
      title: '📛 이름으로 다른 컨테이너를 못 찾는다 (bad address)',
      desc: '⚙️ 상황 만들기: <code>sc5-web</code>(netshoot)에서 <code>ping sc5-redis</code> 를 하면 <code>bad address</code> 가 납니다. IP 로는 되는데 이름으로는 안 됩니다. 두 컨테이너가 <b>이름으로 서로를 찾을 수 있게</b> 고치세요(둘 다 실행 상태 유지).',
      setup: ['docker rm -f sc5-web sc5-redis 2>/dev/null', 'docker network rm sc5-net 2>/dev/null', 'docker run -d --name sc5-redis redis:7', 'docker run -d --name sc5-web nicolaka/netshoot sleep infinity', 'docker exec sc5-web ping -c 1 sc5-redis'],
      hint: '<code>docker inspect sc5-web</code> 의 Networks 를 보세요. 기본 <code>bridge</code> 네트워크에는 이름 DNS 가 없습니다. <code>docker network create sc5-net</code> → <code>docker network connect sc5-net 컨테이너</code> (두 개 모두)',
      answer: ['docker network create sc5-net', 'docker network connect sc5-net sc5-redis', 'docker network connect sc5-net sc5-web', 'docker exec sc5-web ping -c 1 sc5-redis'],
      check: M => {
        if (!M.running('sc5-web') || !M.running('sc5-redis')) return false;
        const a = M.c('sc5-web'), b = M.c('sc5-redis');
        return Object.keys(a.networks).some(n => !['bridge', 'host', 'none'].includes(n) && b.networks[n]);
      }
    },
    /* ---------------------------------------------------------------- 6 */
    {
      id: 'sc6', scenario: true, ch: '06', tag: '포트',
      title: '🙉 포트를 열었는데 Connection reset by peer (Flask)',
      desc: '⚙️ 상황 만들기: <code>~/sc6</code> 의 Flask 앱을 이미지 <code>sc6-flask</code> 로 빌드해 <code>sc6-web</code> 을 <code>-p 8106:5000</code> 으로 띄웠습니다. 컨테이너는 Up 인데 <code>curl localhost:8106</code> 이 <code>Connection reset by peer</code>. 앱을 고쳐 브라우저에서 <code>sc6 ok</code> 가 보이게 하세요.',
      setup: ['docker rm -f sc6-web 2>/dev/null', 'mkdir -p ~/sc6', pf('~/sc6/app.py', flaskApp('sc6 ok', 'app.run(port=5000)')), pf('~/sc6/Dockerfile', PY_DOCKERFILE), 'docker build -q -t sc6-flask ~/sc6', 'docker run -d --name sc6-web -p 8106:5000 sc6-flask', 'curl localhost:8106'],
      hint: '<code>docker logs sc6-web</code> 에 <code>Running on http://127.0.0.1:5000</code> 이 보입니다. 127.0.0.1 은 <b>컨테이너 자기 자신</b>만 받는 주소라 밖에서 온 요청을 못 받습니다. 📝 파일 탭에서 <code>app.run(host="0.0.0.0", port=5000)</code> 으로 고치고, 다시 빌드 → 컨테이너 다시 만들기.',
      answer: [pf('~/sc6/app.py', flaskApp('sc6 ok', RUN_OK)), 'docker build -q -t sc6-flask ~/sc6', 'docker rm -f sc6-web', 'docker run -d --name sc6-web -p 8106:5000 sc6-flask', 'curl -s localhost:8106'],
      check: M => httpHas(M, 'http://localhost:8106/', 'sc6 ok')
    },
    /* ---------------------------------------------------------------- 7 */
    {
      id: 'sc7', scenario: true, ch: '04', tag: '포트',
      title: '🎯 -p 8107:8080 — 컨테이너 포트를 잘못 적었다',
      desc: '⚙️ 상황 만들기: nginx 컨테이너 <code>sc7-web</code> 을 <code>-p 8107:8080</code> 으로 띄웠더니 <code>curl localhost:8107</code> 이 실패합니다. <code>localhost:8107</code> 에서 nginx 환영 페이지가 보이게 고치세요.',
      setup: ['docker rm -f sc7-web 2>/dev/null', 'docker run -d --name sc7-web -p 8107:8080 nginx', 'curl localhost:8107'],
      hint: '<code>-p 호스트포트:컨테이너포트</code> 의 오른쪽은 <b>앱이 실제로 듣는 포트</b>여야 합니다. nginx 이미지는 80 을 듣습니다 (<code>docker image inspect nginx</code> 의 ExposedPorts, <code>docker port sc7-web</code>). 포트 게시는 만들 때만 정할 수 있으니 다시 만드세요.',
      answer: ['docker rm -f sc7-web', 'docker run -d --name sc7-web -p 8107:80 nginx', 'curl -s localhost:8107'],
      check: M => httpHas(M, 'http://localhost:8107/', 'Welcome to nginx')
    },
    /* ---------------------------------------------------------------- 8 */
    {
      id: 'sc8', scenario: true, ch: '05', tag: '볼륨',
      title: '🫥 컨테이너를 다시 만들었더니 데이터가 사라졌다',
      desc: '⚙️ 상황 만들기: <code>sc8-redis</code> 에 <code>visits=100</code> 을 저장한 뒤 컨테이너를 지우고 다시 만들었더니 <code>(nil)</code> — 데이터가 사라졌습니다. 다시 만들어도 데이터가 남도록, <b>이름 있는 볼륨</b>을 <code>/data</code> 에 연결해 <code>sc8-redis</code> 를 실행하세요.',
      setup: ['docker rm -f sc8-redis 2>/dev/null', 'docker run -d --name sc8-redis redis:7', 'docker exec sc8-redis redis-cli set visits 100', 'docker rm -f sc8-redis', 'docker run -d --name sc8-redis redis:7', 'docker exec sc8-redis redis-cli get visits'],
      hint: '컨테이너 안에 쓴 데이터는 컨테이너와 함께 지워집니다. redis 는 <code>/data</code> 에 저장하므로 <code>-v sc8-data:/data</code> 로 볼륨을 붙이세요. 붙인 뒤 set → rm -f → 다시 run → get 으로 살아남는지 확인해 보세요.',
      answer: ['docker rm -f sc8-redis', 'docker run -d --name sc8-redis -v sc8-data:/data redis:7', 'docker exec sc8-redis redis-cli set visits 100', 'docker rm -f sc8-redis', 'docker run -d --name sc8-redis -v sc8-data:/data redis:7', 'docker exec sc8-redis redis-cli get visits'],
      check: M => { const m = M.mount('sc8-redis', '/data'); return M.running('sc8-redis') && !!m && m.type === 'volume' && !/^[0-9a-f]{64}$/.test(m.source || m.name || ''); }
    },
    /* ---------------------------------------------------------------- 9 */
    {
      id: 'sc9', scenario: true, ch: '08', tag: '자원',
      title: '💥 Exited (137) — OOMKilled',
      desc: '⚙️ 상황 만들기: 메모리 128MB 를 쓰는 작업 <code>sc9-stress</code> 를 <code>-m 64m</code> 제한으로 실행했더니 곧 <code>Exited (137)</code> 이 됩니다. 원인을 확인하고, 작업이 계속 돌 수 있게 <b>메모리 제한을 넉넉히</b>(예: 256m) 올려 다시 실행하세요.',
      setup: ['docker rm -f sc9-stress 2>/dev/null', 'docker run -d --name sc9-stress -m 64m polinux/stress stress --vm 1 --vm-bytes 128M', 'sleep 2', 'docker ps -a --filter name=sc9-stress'],
      hint: '<code>docker inspect -f "{{.State.OOMKilled}} {{.State.ExitCode}}" sc9-stress</code> → <code>true 137</code>. 137 = 128 + 9(SIGKILL). 제한은 <code>docker update</code> 로도 바꿀 수 있지만, 여기서는 지우고 <code>-m 256m</code> 으로 다시 만드세요.',
      answer: ['docker inspect -f "{{.State.OOMKilled}} {{.State.ExitCode}}" sc9-stress', 'docker rm -f sc9-stress', 'docker run -d --name sc9-stress -m 256m polinux/stress stress --vm 1 --vm-bytes 128M'],
      check: M => M.running('sc9-stress') && M.memory('sc9-stress') > 128 * 1024 * 1024 && !M.c('sc9-stress').state.oomKilled
    },
    /* ---------------------------------------------------------------- 10 */
    {
      id: 'sc10', scenario: true, ch: '08', tag: '재시작',
      title: '🔁 STATUS 가 계속 Restarting (1)',
      desc: '⚙️ 상황 만들기: <code>sc10-db</code>(mysql:8.4)를 <code>--restart on-failure</code> 로 띄웠더니 <code>docker ps</code> 에서 <code>Restarting (1)</code> 을 계속 반복합니다. 재시작 정책은 그대로 두고 원인을 고쳐 <code>sc10-db</code> 가 안정적으로 <code>Up</code> 이 되게 하세요.',
      setup: ['docker rm -f sc10-db 2>/dev/null', 'docker run -d --name sc10-db --restart on-failure mysql:8.4'],
      hint: '재시작 정책은 원인을 고쳐 주지 않고 같은 실패를 되풀이할 뿐입니다. <code>docker logs sc10-db</code> 에서 필요한 환경 변수(<code>MYSQL_ROOT_PASSWORD</code>)를 확인하고, <code>--restart on-failure</code> 는 유지한 채 다시 만드세요.',
      answer: ['docker logs sc10-db', 'docker rm -f sc10-db', 'docker run -d --name sc10-db --restart on-failure -e MYSQL_ROOT_PASSWORD=secret mysql:8.4'],
      check: M => M.running('sc10-db') && !!M.env('sc10-db', 'MYSQL_ROOT_PASSWORD') && M.restart('sc10-db') === 'on-failure'
    },
    /* ---------------------------------------------------------------- 11 */
    {
      id: 'sc11', scenario: true, ch: '02', tag: '이미지',
      title: '🔎 manifest unknown — 없는 이미지 태그',
      desc: '⚙️ 상황 만들기: <code>docker run … nginx:1.99</code> 가 <code>manifest for nginx:1.99 not found</code> 로 실패해 컨테이너가 만들어지지도 않았습니다. <b>존재하는 태그</b>로 <code>sc11-web</code> 을 8111 포트에 띄워 환영 페이지가 보이게 하세요.',
      setup: ['docker rm -f sc11-web 2>/dev/null', 'docker run -d --name sc11-web -p 8111:80 nginx:1.99'],
      hint: '<code>manifest unknown</code> = 그 <b>태그</b>가 없다, <code>pull access denied … repository does not exist</code> = 이미지 <b>이름</b>이 틀렸거나 비공개다. Docker Hub 의 Tags 탭에서 있는 태그(예: <code>1.27</code>, <code>alpine</code>, <code>latest</code>)를 고르세요.',
      answer: ['docker run -d --name sc11-web -p 8111:80 nginx:1.27', 'curl -s localhost:8111'],
      check: M => M.running('sc11-web') && httpHas(M, 'http://localhost:8111/', 'Welcome to nginx')
    },
    /* ---------------------------------------------------------------- 12 */
    {
      id: 'sc12', scenario: true, ch: '03', tag: 'exec',
      title: '🐚 exec: "bash": executable file not found',
      desc: '⚙️ 상황 만들기: <code>sc12-web</code>(nginx:alpine, 8112 포트) 안에서 bash 로 페이지 파일을 만들려다 실패했습니다. 컨테이너 안에 <code>/usr/share/nginx/html/sc12.html</code> 파일(내용에 <code>hello</code> 포함)을 만들어 <code>localhost:8112/sc12.html</code> 이 열리게 하세요.',
      setup: ['docker rm -f sc12-web 2>/dev/null', 'docker run -d --name sc12-web -p 8112:80 nginx:alpine', 'docker exec sc12-web bash -c "echo hello > /usr/share/nginx/html/sc12.html"'],
      hint: 'alpine 기반 이미지에는 bash 가 없고 <code>sh</code>(busybox)만 있습니다. <code>docker exec sc12-web sh -c "echo hello &gt; /usr/share/nginx/html/sc12.html"</code> 처럼 sh 를 쓰세요. (대화형이면 <code>docker exec -it sc12-web sh</code>)',
      answer: ['docker exec sc12-web sh -c "echo hello > /usr/share/nginx/html/sc12.html"', 'curl -s localhost:8112/sc12.html'],
      check: M => httpHas(M, 'http://localhost:8112/sc12.html', 'hello')
    },
    /* ---------------------------------------------------------------- 13 */
    {
      id: 'sc13', scenario: true, ch: '06', tag: '빌드',
      title: '🙈 COPY failed: "/app.py": not found — 파일은 분명 있는데?',
      desc: '⚙️ 상황 만들기: <code>~/sc13</code> 에 <code>app.py</code> 가 분명히 있는데 <code>docker build -t sc13-app ~/sc13</code> 이 <code>"/app.py": not found</code> 로 실패합니다. 원인을 찾아 이미지 <code>sc13-app</code> 이 빌드되게 하세요.',
      setup: ['docker rmi -f sc13-app 2>/dev/null', 'mkdir -p ~/sc13', pf('~/sc13/app.py', 'print("sc13 ok")\n'), pf('~/sc13/Dockerfile', 'FROM python:3.12-slim\nWORKDIR /app\nCOPY app.py .\nCMD ["python", "app.py"]\n'), pf('~/sc13/.dockerignore', '*.py\n.git\n'), 'ls -a ~/sc13', 'docker build -t sc13-app ~/sc13'],
      hint: '빌드 컨텍스트에서 빠지는 파일은 <code>.dockerignore</code> 가 정합니다. <code>cat ~/sc13/.dockerignore</code> — <code>*.py</code> 줄이 모든 파이썬 파일을 빼 버립니다. 그 줄을 지우고(📝 파일 탭) 다시 빌드하세요.',
      answer: [pf('~/sc13/.dockerignore', '.git\n__pycache__/\n'), 'docker build -t sc13-app ~/sc13', 'docker run --rm sc13-app'],
      check: M => !!M.image('sc13-app')
    },
    /* ---------------------------------------------------------------- 14 */
    {
      id: 'sc14', scenario: true, ch: '06', tag: '빌드',
      title: '📦 ModuleNotFoundError: No module named \'redis\'',
      desc: '⚙️ 상황 만들기: <code>~/sc14</code> 앱 이미지 <code>sc14-app</code> 으로 띄운 <code>sc14-web</code>(8114)이 곧바로 <code>Exited (1)</code> 입니다. 원인을 고쳐 <code>localhost:8114</code> 에서 <code>sc14 ok</code> 가 보이게 하세요.',
      setup: ['docker rm -f sc14-web 2>/dev/null', 'mkdir -p ~/sc14', pf('~/sc14/app.py', flaskApp('sc14 ok', RUN_OK, 'import redis\n\n')), pf('~/sc14/requirements.txt', 'flask\n'), pf('~/sc14/Dockerfile', 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY app.py .\nCMD ["python", "app.py"]\n'), 'docker build -q -t sc14-app ~/sc14', 'docker run -d --name sc14-web -p 8114:5000 sc14-app'],
      hint: '<code>docker logs sc14-web</code> → <code>import redis</code> 에서 실패. 이미지에 설치되는 패키지는 <code>requirements.txt</code> 가 정합니다. <code>echo redis &gt;&gt; ~/sc14/requirements.txt</code> 로 추가 → 다시 빌드 → 컨테이너 다시 만들기.',
      answer: ['echo redis >> ~/sc14/requirements.txt', 'docker build -q -t sc14-app ~/sc14', 'docker rm -f sc14-web', 'docker run -d --name sc14-web -p 8114:5000 sc14-app', 'curl -s localhost:8114'],
      check: M => httpHas(M, 'http://localhost:8114/', 'sc14 ok')
    },
    /* ---------------------------------------------------------------- 15 */
    {
      id: 'sc15', scenario: true, ch: '10', tag: 'Compose',
      title: '⏱️ depends_on 을 썼는데도 DB 연결 거부 (Compose)',
      desc: '⚙️ 상황 만들기(터미널이 <code>~/sc15</code> 로 이동합니다): <code>web</code> 은 시작하자마자 postgres(<code>db</code>)에 접속하는데, <code>docker compose up -d</code> 하면 <code>web</code> 이 <code>Connection refused</code> 로 죽습니다. <code>depends_on</code> 은 이미 적혀 있는데 왜일까요? compose.yaml 을 고쳐 <code>localhost:8115</code> 에서 <code>db connected</code> 가 보이게 하세요.',
      setup: ['mkdir -p ~/sc15', pf('~/sc15/app.py', SC15_APP), pf('~/sc15/Dockerfile', 'FROM python:3.12-slim\nWORKDIR /app\nRUN pip install flask psycopg2-binary\nCOPY app.py .\nCMD ["python", "app.py"]\n'), pf('~/sc15/compose.yaml', SC15_COMPOSE_BAD), 'cd ~/sc15', 'docker compose down', 'docker compose up -d --build', 'docker compose ps -a'],
      hint: '<code>depends_on: [db]</code> 는 db 컨테이너가 <b>시작</b>되기만 기다리지, DB 가 <b>접속을 받을 준비</b>가 될 때까지 기다리지 않습니다. db 에 <code>healthcheck</code>(<code>pg_isready -U postgres</code>)를 넣고, web 에 <code>depends_on: db: condition: service_healthy</code> 를 쓰세요. 고친 뒤 <code>docker compose up -d</code>.',
      answer: [pf('~/sc15/compose.yaml', SC15_COMPOSE_OK), 'cd ~/sc15', 'docker compose up -d', 'docker compose ps', 'curl -s localhost:8115'],
      check: M => httpHas(M, 'http://localhost:8115/', 'db connected')
    },
    /* ---------------------------------------------------------------- 16 */
    {
      id: 'sc16', scenario: true, ch: '10', tag: '프록시',
      title: '🚧 502 Bad Gateway — 리버스 프록시 뒤의 앱을 못 찾는다',
      desc: '⚙️ 상황 만들기: <code>sc16-net</code> 네트워크에 백엔드 <code>sc16-api</code>(whoami)와 nginx 프록시 <code>sc16-proxy</code>(8116, 설정 파일 <code>~/sc16/default.conf</code> 를 바인드 마운트)를 띄웠는데 <code>localhost:8116</code> 이 <code>502 Bad Gateway</code> 입니다. 프록시 설정을 고쳐 whoami 응답(<code>Hostname: …</code>)이 보이게 하세요.',
      setup: ['docker rm -f sc16-proxy sc16-api 2>/dev/null', 'docker network rm sc16-net 2>/dev/null', 'mkdir -p ~/sc16', pf('~/sc16/default.conf', ngConf('backend')), 'docker network create sc16-net', 'docker run -d --name sc16-api --network sc16-net traefik/whoami', 'docker run -d --name sc16-proxy --network sc16-net -p 8116:80 -v ~/sc16/default.conf:/etc/nginx/conf.d/default.conf:ro nginx', 'curl -s localhost:8116'],
      hint: '<code>docker logs sc16-proxy</code> 의 error 줄: <code>backend could not be resolved</code>. <code>proxy_pass</code> 의 호스트 이름은 같은 네트워크의 <b>컨테이너 이름</b>(여기서는 <code>sc16-api</code>)이어야 합니다. 📝 파일 탭에서 고친 뒤 <code>docker exec sc16-proxy nginx -t</code> → <code>docker exec sc16-proxy nginx -s reload</code>.',
      answer: [pf('~/sc16/default.conf', ngConf('sc16-api')), 'docker exec sc16-proxy nginx -t', 'docker exec sc16-proxy nginx -s reload', 'curl -s localhost:8116'],
      check: M => httpHas(M, 'http://localhost:8116/', 'Hostname:')
    },
    /* ---------------------------------------------------------------- 17 */
    {
      id: 'sc17', scenario: true, ch: '12', tag: '정리',
      title: '🧹 멈춘 컨테이너 · 안 쓰는 네트워크가 쌓였다',
      desc: '⚙️ 상황 만들기: 실험하다 남은 멈춘 컨테이너(<code>sc17-a</code> · <code>sc17-b</code> · <code>sc17-c</code>)와 안 쓰는 네트워크 <code>sc17-net</code> 이 쌓였습니다. 실행 중인 <code>sc17-keep</code> 은 살려 둔 채, <b>명령 한 줄</b>로 쓰지 않는 것들을 한꺼번에 정리하세요.',
      setup: ['docker rm -f sc17-a sc17-b sc17-c sc17-keep 2>/dev/null', 'docker network rm sc17-net 2>/dev/null', 'docker run --name sc17-a alpine echo one', 'docker run --name sc17-b busybox echo two', 'docker run --name sc17-c hello-world', 'docker network create sc17-net', 'docker run -d --name sc17-keep nginx:alpine', 'docker system df'],
      hint: '<code>docker system prune</code> 은 멈춘 컨테이너 · 안 쓰는 네트워크 · dangling 이미지 · 빌드 캐시를 지웁니다(실행 중인 것과 볼륨은 그대로). 확인 질문 없이 하려면 <code>-f</code>. 먼저 <code>docker system df</code> 로 얼마나 차지하는지 보세요. ⚠️ 이 실습 환경의 다른 멈춘 컨테이너도 함께 지워집니다.',
      answer: ['docker system prune -f', 'docker ps -a', 'docker network ls'],
      check: M => M.running('sc17-keep') && !M.cs(c => /^sc17-/.test(c.name) && c.state.status !== 'running').length && !M.net('sc17-net')
    },
    /* ---------------------------------------------------------------- 18 */
    {
      id: 'sc18', scenario: true, ch: '13', tag: '보안',
      title: '🔒 Read-only file system — 읽기 전용 컨테이너',
      desc: '⚙️ 상황 만들기: 보안을 위해 <code>sc18-web</code> 을 <code>--read-only</code> 로 띄웠더니 앱이 시작할 때 <code>/tmp</code> 에 파일을 쓰다가 죽습니다. <b>루트 파일 시스템은 읽기 전용으로 유지</b>하면서 <code>/tmp</code> 만 쓸 수 있게 해 <code>localhost:8118</code> 에서 <code>sc18 ok</code> 가 보이게 하세요.',
      setup: ['docker rm -f sc18-web 2>/dev/null', 'mkdir -p ~/sc18', pf('~/sc18/app.py', flaskApp('sc18 ok', RUN_OK, '\nwith open("/tmp/started.txt", "w") as f:\n    f.write("started")\n\n')), pf('~/sc18/Dockerfile', PY_DOCKERFILE), 'docker build -q -t sc18-app ~/sc18', 'docker run -d --name sc18-web --read-only -p 8118:5000 sc18-app'],
      hint: '<code>docker logs sc18-web</code> → <code>OSError: [Errno 30] Read-only file system: \'/tmp/started.txt\'</code>. 임시 파일용 메모리 파일 시스템을 <code>--tmpfs /tmp</code> 로 붙이면 나머지는 읽기 전용 그대로입니다.',
      answer: ['docker rm sc18-web', 'docker run -d --name sc18-web --read-only --tmpfs /tmp -p 8118:5000 sc18-app', 'curl -s localhost:8118'],
      check: async M => { const c = M.c('sc18-web'); return M.running('sc18-web') && !!c.hostConfig.readonly && httpHas(M, 'http://localhost:8118/', 'sc18 ok'); }
    },
    /* ---------------------------------------------------------------- 19 */
    {
      id: 'sc19', scenario: true, ch: '07', tag: '보안',
      title: '🚫 PermissionError — non-root 사용자가 /app 에 못 쓴다',
      desc: '⚙️ 상황 만들기: <code>~/sc19</code> 의 Dockerfile 은 보안을 위해 <code>USER appuser</code> 로 실행하는데, 앱이 <code>/app/visits.txt</code> 를 만들다 <code>Permission denied</code> 로 죽습니다. <b>root 로 되돌리지 말고</b> Dockerfile 을 고쳐 <code>sc19-web</code>(8119)에서 <code>sc19 ok</code> 가 보이게 하세요.',
      setup: ['docker rm -f sc19-web 2>/dev/null', 'mkdir -p ~/sc19', pf('~/sc19/app.py', flaskApp('sc19 ok', RUN_OK, '\nwith open("/app/visits.txt", "w") as f:\n    f.write("0")\n\n')), pf('~/sc19/Dockerfile', 'FROM python:3.12-slim\nWORKDIR /app\nRUN pip install flask\nCOPY app.py .\nRUN useradd -m appuser\nUSER appuser\nCMD ["python", "app.py"]\n'), 'docker build -q -t sc19-app ~/sc19', 'docker run -d --name sc19-web -p 8119:5000 sc19-app'],
      hint: '<code>WORKDIR</code> 로 만든 <code>/app</code> 은 root 소유입니다. <code>USER</code> 로 바꾸기 <b>전에</b> <code>RUN useradd -m appuser &amp;&amp; chown -R appuser /app</code> 처럼 소유자를 넘겨 주세요 (또는 <code>COPY --chown=appuser</code>). 고친 뒤 다시 빌드 → 다시 만들기.',
      answer: [pf('~/sc19/Dockerfile', 'FROM python:3.12-slim\nWORKDIR /app\nRUN pip install flask\nCOPY app.py .\nRUN useradd -m appuser && chown -R appuser /app\nUSER appuser\nCMD ["python", "app.py"]\n'), 'docker build -q -t sc19-app ~/sc19', 'docker rm -f sc19-web', 'docker run -d --name sc19-web -p 8119:5000 sc19-app', 'curl -s localhost:8119'],
      check: async M => { const img = M.image('sc19-app'); const u = img && img.config && img.config.User; return !!u && u !== 'root' && u !== '0' && M.running('sc19-web') && httpHas(M, 'http://localhost:8119/', 'sc19 ok'); }
    },
    /* ---------------------------------------------------------------- 20 */
    {
      id: 'sc20', scenario: true, ch: '05', tag: '볼륨',
      title: '🕳️ can\'t open file \'/app/app.py\' — 마운트가 앱을 덮었다',
      desc: '⚙️ 상황 만들기: 로그 파일을 호스트에 남기려고 <code>sc20-web</code> 을 <code>-v ~/sc20/data:/app</code> 으로 띄웠더니, 이미지 안에 분명히 있는 <code>/app/app.py</code> 를 찾을 수 없다며 종료됩니다. 앱은 살리고 데이터 폴더만 호스트에 연결되게 고쳐 <code>localhost:8120</code> 에서 <code>sc20 ok</code> 가 보이게 하세요.',
      setup: ['docker rm -f sc20-web 2>/dev/null', 'mkdir -p ~/sc20/data', pf('~/sc20/app.py', flaskApp('sc20 ok', RUN_OK)), pf('~/sc20/Dockerfile', PY_DOCKERFILE), 'docker build -q -t sc20-app ~/sc20', 'docker run -d --name sc20-web -p 8120:5000 -v ~/sc20/data:/app sc20-app'],
      hint: '마운트는 그 경로의 원래 내용을 <b>가립니다</b>. 빈 호스트 폴더를 <code>/app</code> 에 붙이면 이미지의 <code>/app/app.py</code> 가 안 보입니다. 앱 폴더 전체가 아니라 <code>/app/data</code> 처럼 하위 폴더에만 붙이세요.',
      answer: ['docker rm sc20-web', 'docker run -d --name sc20-web -p 8120:5000 -v ~/sc20/data:/app/data sc20-app', 'curl -s localhost:8120'],
      check: async M => { const m = M.mount('sc20-web', '/app'); return M.running('sc20-web') && !m && httpHas(M, 'http://localhost:8120/', 'sc20 ok'); }
    }
  ];

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const strip = s => String(s).replace(/<[^>]+>/g, '');

  Course.lesson({
    id: 'lab', icon: '🧪', title: '실습실 · 장애 대응 시나리오', special: true,
    chips: ['docker ps -a', 'docker logs', 'docker inspect', 'docker network ls', 'docker system df', 'help'],
    missions,
    render() {
      const rows = missions.map((m, i) => `<tr><td>${i + 1}</td><td><b>${strip(m.title).replace(/^\S+\s/, '')}</b></td><td><span class="tag ${{ '포트': 'blue', '이름': 'gray', '생명주기': 'teal', 'DB': 'purple', '네트워크': 'blue', '볼륨': 'orange', '자원': 'red', '재시작': 'red', '이미지': 'purple', 'exec': 'teal', '빌드': 'green', 'Compose': 'yellow', '프록시': 'orange', '정리': 'gray', '보안': 'red' }[m.tag] || 'gray'}">${esc(m.tag)}</span></td><td><a href="#ch${m.ch}">${m.ch}장</a></td></tr>`).join('');
      return `<article class="lesson">
<header class="l-head">
  <div class="l-kicker"><span class="l-no">부록</span><span class="chip">🎯 시나리오 ${missions.length}개</span><span class="chip">자유 실습</span></div>
  <h1><span class="l-icon">🧪</span>실습실 · 장애 대응 시나리오</h1>
  <p class="l-sub">마음껏 부수고 고쳐 보는 연습장. "왜 안 되지?" 상황 ${missions.length}가지를 직접 만들어 보고, 원인을 찾아 해결합니다.</p>
</header>

<section class="l-sec"><h2><span class="sn">1</span>이 페이지 사용법</h2>
<p>이 페이지에는 따로 읽을 강의가 없습니다. 오른쪽 실습 화면이 주인공이에요. 강의에서 배운 명령을 자유롭게 실험하고, 아래 시나리오로 <b>문제 해결 근육</b>을 기릅니다.</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">🖥️</div><b>터미널</b><p><kbd>↑</kbd><kbd>↓</kbd> 이전 명령, <kbd>Tab</kbd> 자동 완성, <kbd>Ctrl</kbd>+<kbd>C</kbd> 멈추기, <kbd>Ctrl</kbd>+<kbd>L</kbd> 화면 지우기. <b>＋</b> 로 터미널을 하나 더 열면 <code>logs -f</code> 를 켜 둔 채 다른 명령을 칠 수 있습니다. 쓸 수 있는 명령은 <code class="cmd">help</code>.</p></div>
  <div class="card orange"><div class="ci">↺</div><b>초기화 버튼</b><p>실습 화면 위쪽의 <b>↺</b> 는 컨테이너 · 이미지 · 볼륨 · 네트워크 · 홈 폴더 파일 · 쿠버네티스 클러스터를 모두 처음 상태로 되돌립니다. 학습 진도와 미션 기록은 남아요. 꼬였으면 부담 없이 누르세요.</p></div>
  <div class="card green"><div class="ci">📊</div><b>대시보드</b><p>지금 떠 있는 컨테이너가 어떤 네트워크 · 볼륨 · 포트에 연결됐는지 그림으로 보여 줍니다. "이름으로 못 찾는" 문제는 여기서 한눈에 보입니다.</p></div>
  <div class="card purple"><div class="ci">🌐</div><b>브라우저</b><p><code>http://localhost:게시포트</code> 를 열어 컨테이너가 돌려준 페이지를 봅니다. 터미널에서 <code>curl -s localhost:8080</code> 으로도 확인할 수 있어요.</p></div>
  <div class="card teal"><div class="ci">📝</div><b>파일</b><p>시나리오가 만든 Dockerfile · compose.yaml · app.py 를 열어 고칩니다. 저장하면 바로 반영되고, 다시 <code>docker build</code> 하면 새 이미지가 됩니다.</p></div>
  <div class="card yellow"><div class="ci">🎯</div><b>미션 탭</b><p>시나리오마다 <b>⚙️ 상황 만들기</b>(고장 난 상태 만들기) · <b>💡 힌트</b>(진단 명령) · <b>🔑 정답 명령</b>이 있습니다. 고쳐진 상태가 되면 자동으로 ✓ 됩니다.</p></div>
</div>
<div style="margin-top:10px"><button class="btn primary small" data-act="open-missions">🎯 미션 탭에서 시나리오 시작하기</button></div>
</section>

<section class="l-sec"><h2><span class="sn">2</span>장애를 만나면 — 5단계 진단 순서</h2>
<div class="flow">
  <div class="fb blue"><span class="fi">👀</span><b>1. 상태 보기</b><code>docker ps -a</code><br>Up? Exited(몇)? Restarting? Created?</div>
  <div class="fb teal"><span class="fi">📜</span><b>2. 로그 읽기</b><code>docker logs 이름</code><br>앱이 남긴 마지막 말</div>
  <div class="fb purple"><span class="fi">🔍</span><b>3. 설정 확인</b><code>docker inspect 이름</code><br>포트 · 네트워크 · 마운트 · env</div>
  <div class="fb orange"><span class="fi">🚪</span><b>4. 안에서 확인</b><code>docker exec 이름 sh</code><br>파일 · 접속 · DNS 직접 시험</div>
  <div class="fb green"><span class="fi">🔧</span><b>5. 고치고 확인</b>다시 만들기 · 다시 빌드<br><code>curl</code> 로 결과 확인</div>
</div>
<div class="tbl-wrap"><table class="tbl">
<tr><th>종료 코드 · 상태</th><th>흔한 원인</th><th>먼저 볼 것</th></tr>
<tr><td><code>Exited (0)</code></td><td>할 일을 마치고 정상 종료 (메인 프로세스가 끝남)</td><td>CMD 가 계속 도는 프로그램인가?</td></tr>
<tr><td><code>Exited (1)</code></td><td>앱 오류 — 설정 누락 · 모듈 없음 · 권한</td><td><code>docker logs</code></td></tr>
<tr><td><code>Exited (2)</code> · <code>(127)</code></td><td>실행 파일 · 스크립트 경로를 못 찾음</td><td>CMD · 마운트가 파일을 가렸나?</td></tr>
<tr><td><code>Exited (137)</code></td><td>강제 종료(SIGKILL) — 메모리 초과(OOM) 또는 <code>docker kill</code></td><td><code>docker inspect -f "{{.State.OOMKilled}}"</code></td></tr>
<tr><td><code>Created</code></td><td>만들어졌지만 시작 실패 — 포트 충돌 등</td><td>run 할 때 나온 에러 메시지</td></tr>
<tr><td><code>Restarting (n)</code></td><td>재시작 정책이 같은 실패를 반복 중</td><td><code>docker logs</code></td></tr>
</table></div>
</section>

<section class="l-sec"><h2><span class="sn">3</span>시나리오 목록</h2>
<p>순서대로 풀지 않아도 됩니다. 시나리오마다 이름(<code>sc1-…</code>)과 포트(81xx)가 달라서 서로 부딪히지 않아요. 막히면 관련 장으로 돌아가 복습하세요.</p>
<div class="tbl-wrap"><table class="tbl"><tr><th>#</th><th>상황</th><th>분야</th><th>관련 장</th></tr>${rows}</table></div>
<div class="box tip"><div class="box-t">💡 잘 푸는 요령</div>
<b>🔑 정답 명령부터 누르지 마세요.</b> 먼저 ⚙️ 상황 만들기 → 증상을 눈으로 확인 → 5단계 순서로 원인 추측 → 💡 힌트 → 해결. 풀고 나서 정답 명령과 비교해 보면 다른 방법도 보입니다.
대부분의 설정(포트 · 환경 변수 · 마운트 · 재시작 정책)은 <b>컨테이너를 만들 때만</b> 정할 수 있다는 점도 기억하세요 — 그래서 해결책에 "지우고 다시 만들기"가 자주 나옵니다.</div>
<div class="box note"><div class="box-t">ℹ️ 파일이 필요한 시나리오</div>
6 · 13 · 14 · 15 · 16 · 18 · 19 · 20번은 ⚙️ 상황 만들기가 <code>printf '…' &gt; 파일</code> 로 <code>~/scN</code> 폴더에 예제 파일을 만듭니다. 📝 파일 탭에서 열어 고치면 됩니다.
15번은 터미널의 현재 폴더를 <code>~/sc15</code> 로 옮기니, 끝나면 <code class="cmd">cd ~</code> 로 돌아오세요.</div>
</section>

<section class="l-sec"><h2><span class="sn">4</span>자유 실습 아이디어</h2>
<ul class="summary">
<li>같은 이미지로 컨테이너 3개를 띄우고 <code class="cmd">docker stats --no-stream</code> 으로 자원 사용량을 비교해 보기</li>
<li><code class="cmd">docker run -d --name demo -p 8080:80 nginx</code> 후 <code class="cmd">docker exec demo ls /usr/share/nginx/html</code> — 페이지 파일을 바꿔 🌐 브라우저로 확인하기</li>
<li>사용자 정의 네트워크 두 개를 만들고, 어느 컨테이너끼리 이름으로 통하는지 📊 대시보드와 <code>ping</code> 으로 확인하기</li>
<li><code class="cmd">docker system df</code> 로 공간을 확인하고, <code>docker image prune</code> · <code>docker builder prune</code> 의 차이 알아보기</li>
<li>☸️ <code class="cmd">minikube start</code> 후 15장 명령으로 Deployment 를 만들고, 파드를 지우며 자동 복구 관찰하기</li>
</ul>
<div class="box warn"><div class="box-t">⚠️ 이 실습 환경은 시뮬레이터입니다</div>
명령 · 출력은 실제 Docker 와 최대한 같게 만들었지만, 실제 리눅스 커널 · 인터넷에 연결된 것은 아닙니다. 여기서 익힌 진단 순서와 명령은 실제 서버에서도 그대로 통합니다.</div>
</section>
</article>`;
    }
  });
})();
