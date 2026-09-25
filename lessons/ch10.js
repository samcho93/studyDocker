/* 10장 — Compose 실전: 웹 · DB · 캐시 */
Course.lesson({
  id: 'ch10', no: '10',
  icon: '🚀',
  title: 'Compose 실전 — 웹 · DB · 캐시',
  subtitle: 'Flask + Redis, WordPress + MySQL, 헬스체크로 시작 순서 맞추기, 리버스 프록시와 스케일, 개발용 설정까지',
  level: '중급', time: '120분',
  goals: [
    'build: . 로 내 앱 이미지를 만들고 Redis 와 함께 띄우는 Flask 방문자 카운터를 완성할 수 있다',
    'WordPress + MySQL 처럼 DB 가 있는 스택을 이름 있는 볼륨 · 환경 변수 · 헬스체크로 구성할 수 있다',
    '"DB 가 준비되기 전에 앱이 접속" 문제를 설명하고 healthcheck + condition: service_healthy 로 해결할 수 있다',
    'nginx 리버스 프록시 뒤에 앱을 두고 docker compose up --scale 로 여러 개를 띄워 부하 분산을 확인할 수 있다',
    '개발용 설정(바인드 마운트 · compose watch)과 profiles · 여러 compose 파일(override)의 쓰임새를 설명할 수 있다'
  ],
  chips: ['docker compose ps -a', 'docker compose logs', 'curl -s localhost:8000', 'docker compose up -d --build', 'docker compose ls'],

  figs: {
    /* ------------------------------------------------------------ Flask + Redis 카운터 */
    counter: {
      caption: '방문자 카운터의 구조 — web 은 내 Dockerfile 로 빌드한 Flask 앱, redis 는 공식 이미지. 새로 고칠 때마다 web 이 서비스 이름 redis 로 접속해 INCR hits 를 보냅니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="브라우저가 localhost:8000 으로 web 컨테이너의 Flask 5000 포트에 접속하고, web 이 redis 서비스에 INCR hits 를 보내 숫자를 받아 응답하는 구조">
  <rect x="14" y="14" width="832" height="302" rx="16" class="gray"/>
  <text x="32" y="40" class="t-b">🖥️ 호스트</text>
  <rect x="32" y="112" width="130" height="76" rx="10" class="box"/>
  <text x="97" y="138" class="t-sm t-c">🌐 브라우저</text>
  <text x="97" y="160" class="t-xs t-c t-mono">localhost:8000</text>
  <text x="97" y="178" class="t-xs t-c t-mu">새로 고침 ↻</text>
  <line x1="162" y1="150" x2="250" y2="150" class="ln-blue thick ar-blue"/>
  <text x="206" y="140" class="t-xs t-c t-blue">8000→5000</text>
  <rect x="232" y="56" width="596" height="244" rx="14" class="purple" stroke-dasharray="8 5"/>
  <text x="250" y="80" class="t-sm t-b t-purple">counter_default</text>
  <rect x="256" y="100" width="230" height="110" rx="16" class="green"/>
  <text x="371" y="126" class="t-b t-c t-green">web (Flask)</text>
  <text x="371" y="150" class="t-xs t-c t-mono">build: . → counter-web</text>
  <text x="371" y="170" class="t-xs t-c t-mono">flask run :5000</text>
  <text x="371" y="192" class="t-xs t-c t-mono t-mu">Redis(host='redis')</text>
  <rect x="592" y="100" width="210" height="110" rx="16" class="teal"/>
  <text x="697" y="126" class="t-b t-c t-teal">redis</text>
  <text x="697" y="150" class="t-xs t-c t-mono">image: redis:alpine</text>
  <text x="697" y="176" class="t-sm t-c t-mono t-b">hits = 5</text>
  <line x1="486" y1="140" x2="588" y2="140" class="ln-green thick ar-green moving"/>
  <text x="537" y="130" class="t-xs t-c t-mono t-green">INCR hits</text>
  <line x1="588" y1="176" x2="490" y2="176" class="ln thick ar"/>
  <text x="537" y="194" class="t-xs t-c t-mono">6</text>
  <rect x="256" y="230" width="546" height="52" rx="10" class="box"/>
  <text x="529" y="252" class="t-sm t-c t-mono">Hello World! I have been seen 6 times.</text>
  <text x="529" y="272" class="t-xs t-c t-mu">새로 고칠 때마다 1씩 증가 — 숫자는 web 이 아니라 redis 가 기억</text>
</svg>`
    },

    /* ------------------------------------------------------------ 시작 순서 경쟁 */
    race: {
      caption: 'depends_on 만 쓰면 DB 컨테이너가 "시작"되자마자 앱이 뜨고, DB 가 아직 준비 중이라 접속에 실패합니다. 헬스체크 + service_healthy 는 DB 가 "준비 완료"가 될 때까지 앱 시작을 미룹니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="위: depends_on 만 쓴 경우 DB 가 초기화 중일 때 앱이 접속해 실패. 아래: service_healthy 로 DB 가 healthy 가 된 뒤 앱이 시작되어 성공">
  <text x="20" y="30" class="t-b t-red">① depends_on: [db] — "먼저 시작"만</text>
  <line x1="120" y1="112" x2="840" y2="112" class="ln thin"/>
  <text x="20" y="72" class="t-sm t-b">db</text>
  <rect x="120" y="56" width="420" height="30" rx="6" class="yellow"/>
  <text x="330" y="71" class="t-xs t-c">시작됨 · 초기화 중… (접속 불가)</text>
  <rect x="540" y="56" width="300" height="30" rx="6" class="green"/>
  <text x="690" y="71" class="t-xs t-c t-green t-b">준비 완료 (5432 수신)</text>
  <text x="20" y="100" class="t-sm t-b">app</text>
  <rect x="140" y="90" width="120" height="18" rx="4" class="s-blue"/>
  <text x="200" y="99" class="t-xs t-c tw">시작 → 접속!</text>
  <text x="270" y="100" class="t-sm t-red t-b">✘ Connection refused → Exited (1)</text>

  <text x="20" y="168" class="t-b t-green">② condition: service_healthy + healthcheck</text>
  <text x="20" y="210" class="t-sm t-b">db</text>
  <rect x="120" y="194" width="420" height="30" rx="6" class="yellow"/>
  <text x="330" y="209" class="t-xs t-c">starting — pg_isready 실패 … 재시도</text>
  <rect x="540" y="194" width="300" height="30" rx="6" class="green"/>
  <text x="690" y="209" class="t-xs t-c t-green t-b">healthy ✔</text>
  <line x1="540" y1="186" x2="540" y2="290" class="ln-green dash"/>
  <text x="20" y="252" class="t-sm t-b">app</text>
  <rect x="120" y="238" width="420" height="30" rx="6" class="gray"/>
  <text x="330" y="253" class="t-xs t-c t-mu">Waiting — 헬스체크 통과를 기다림</text>
  <rect x="548" y="238" width="292" height="30" rx="6" class="s-green"/>
  <text x="694" y="253" class="t-xs t-c tw t-b">시작 → 접속 성공 ✔</text>
  <text x="120" y="302" class="t-xs t-mu">시간 →</text>
  <text x="540" y="310" class="t-xs t-c t-green">헬스체크 통과 순간</text>
</svg>`
    },

    /* ------------------------------------------------------------ 리버스 프록시 + 스케일 */
    proxy: {
      caption: '리버스 프록시 — 밖으로 열린 포트는 nginx 하나뿐이고, 앱은 몇 개든 뒤에 숨어 있습니다. nginx 는 서비스 이름(web)으로 앱들을 찾아 요청을 나눠 보냅니다',
      svg: `<svg class="dg" viewBox="0 0 860 330" role="img" aria-label="브라우저가 8088 포트의 nginx 프록시에 접속하고, nginx 가 web-1, web-2, web-3 세 컨테이너로 요청을 나눠 보냄. 앱 컨테이너에는 ports 가 없음">
  <rect x="20" y="126" width="130" height="70" rx="10" class="box"/>
  <text x="85" y="154" class="t-sm t-c">🌐 브라우저</text>
  <text x="85" y="176" class="t-xs t-c t-mono">localhost:8088</text>
  <line x1="150" y1="161" x2="236" y2="161" class="ln-blue thick ar-blue"/>
  <text x="193" y="150" class="t-xs t-c t-blue">8088→80</text>
  <rect x="226" y="30" width="614" height="280" rx="14" class="purple" stroke-dasharray="8 5"/>
  <text x="244" y="54" class="t-sm t-b t-purple">lb_default</text>
  <rect x="246" y="106" width="190" height="110" rx="16" class="s-blue"/>
  <text x="341" y="134" class="t-b t-c tw">proxy (nginx)</text>
  <text x="341" y="160" class="t-xs t-c t-mono tw">proxy_pass</text>
  <text x="341" y="180" class="t-xs t-c t-mono tw">http://web:80;</text>
  <text x="341" y="200" class="t-xs t-c tw">ports 는 여기만!</text>
  <rect x="566" y="62" width="250" height="56" rx="28" class="green"/>
  <text x="691" y="86" class="t-sm t-c t-b t-green">lb-web-1</text>
  <text x="691" y="104" class="t-xs t-c t-mono t-mu">whoami · 172.18.0.2</text>
  <rect x="566" y="134" width="250" height="56" rx="28" class="green"/>
  <text x="691" y="158" class="t-sm t-c t-b t-green">lb-web-2</text>
  <text x="691" y="176" class="t-xs t-c t-mono t-mu">whoami · 172.18.0.3</text>
  <rect x="566" y="206" width="250" height="56" rx="28" class="green"/>
  <text x="691" y="230" class="t-sm t-c t-b t-green">lb-web-3</text>
  <text x="691" y="248" class="t-xs t-c t-mono t-mu">whoami · 172.18.0.4</text>
  <line x1="436" y1="150" x2="562" y2="92" class="ln-green thick ar-green moving"/>
  <line x1="436" y1="161" x2="562" y2="161" class="ln-green thick ar-green moving"/>
  <line x1="436" y1="172" x2="562" y2="232" class="ln-green thick ar-green moving"/>
  <text x="500" y="284" class="t-xs t-c t-mu">DNS "web" → IP 3개 (docker compose up --scale web=3)</text>
</svg>`
    },

    /* ------------------------------------------------------------ override 병합 */
    override: {
      caption: '여러 compose 파일 — 뒤에 오는 파일의 값이 앞 파일을 덮어씁니다. compose.override.yaml 은 이름만 맞으면 자동으로 함께 읽힙니다',
      svg: `<svg class="dg" viewBox="0 0 860 300" role="img" aria-label="compose.yaml 기본 설정에 compose.override.yaml 개발 설정이 덧씌워져 최종 설정이 되는 그림, 운영에서는 compose.prod.yaml 을 -f 로 지정">
  <rect x="20" y="30" width="240" height="200" rx="12" class="blue"/>
  <text x="140" y="56" class="t-b t-c t-blue">compose.yaml (공통)</text>
  <text x="36" y="90" class="t-xs t-mono">services:</text>
  <text x="36" y="110" class="t-xs t-mono">  web:</text>
  <text x="36" y="130" class="t-xs t-mono">    build: .</text>
  <text x="36" y="150" class="t-xs t-mono">    ports: ["8000:5000"]</text>
  <text x="36" y="170" class="t-xs t-mono">  redis:</text>
  <text x="36" y="190" class="t-xs t-mono">    image: redis:alpine</text>
  <text x="290" y="136" class="t-xl t-c t-b">+</text>
  <rect x="320" y="30" width="240" height="200" rx="12" class="orange"/>
  <text x="440" y="56" class="t-b t-c t-orange">compose.override.yaml</text>
  <text x="336" y="90" class="t-xs t-mono">services:</text>
  <text x="336" y="110" class="t-xs t-mono">  web:</text>
  <text x="336" y="130" class="t-xs t-mono">    volumes: [".:/code"]</text>
  <text x="336" y="150" class="t-xs t-mono">    environment:</text>
  <text x="336" y="170" class="t-xs t-mono">      FLASK_DEBUG: "1"</text>
  <text x="440" y="210" class="t-xs t-c t-mu">개발 PC 전용 · 자동으로 읽힘</text>
  <line x1="566" y1="130" x2="604" y2="130" class="ln thick ar"/>
  <rect x="610" y="30" width="230" height="200" rx="12" class="green"/>
  <text x="725" y="56" class="t-b t-c t-green">최종 설정</text>
  <text x="626" y="90" class="t-xs t-mono">web: build + ports</text>
  <text x="626" y="110" class="t-xs t-mono">   + volumes</text>
  <text x="626" y="130" class="t-xs t-mono">   + FLASK_DEBUG</text>
  <text x="626" y="150" class="t-xs t-mono">redis: 그대로</text>
  <text x="725" y="200" class="t-xs t-c t-mu">docker compose config</text>
  <text x="725" y="216" class="t-xs t-c t-mu">로 확인</text>
  <rect x="20" y="250" width="820" height="36" rx="8" class="box"/>
  <text x="430" y="268" class="t-sm t-c t-mono">운영 서버: docker compose -f compose.yaml -f compose.prod.yaml up -d</text>
</svg>`
    }
  },

  files: {
    counter: {
      '~/counter/app.py': `import time

import redis
from flask import Flask

app = Flask(__name__)
cache = redis.Redis(host='redis', port=6379)


def get_hit_count():
    retries = 5
    while True:
        try:
            return cache.incr('hits')
        except redis.exceptions.ConnectionError as exc:
            if retries == 0:
                raise exc
            retries -= 1
            time.sleep(0.5)


@app.route('/')
def hello():
    count = get_hit_count()
    return f'Hello World! I have been seen {count} times.'
`,
      '~/counter/requirements.txt': 'flask\nredis\n',
      '~/counter/Dockerfile': `# syntax=docker/dockerfile:1
FROM python:3.12-alpine
WORKDIR /code
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
EXPOSE 5000
COPY . .
CMD ["flask", "run", "--debug"]
`,
      '~/counter/compose.yaml': `services:
  web:
    build: .
    ports:
      - "8000:5000"
  redis:
    image: "redis:alpine"
`
    },
    hits: {
      '~/hits/app.py': `import os
import time

import redis
from flask import Flask

app = Flask(__name__)
cache = redis.Redis(host=os.environ.get('REDIS_HOST', 'redis'), port=6379)


def get_hit_count():
    retries = 5
    while True:
        try:
            return cache.incr('hits')
        except redis.exceptions.ConnectionError as exc:
            if retries == 0:
                raise exc
            retries -= 1
            time.sleep(0.5)


@app.route('/')
def hello():
    count = get_hit_count()
    return f'Hello World! I have been seen {count} times.'
`,
      '~/hits/requirements.txt': 'flask\nredis\n',
      '~/hits/Dockerfile': `FROM python:3.12-alpine
WORKDIR /code
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
EXPOSE 5000
COPY . .
CMD ["flask", "run"]
`,
      '~/hits/compose.yaml': `services:
  web:
    build: .
    ports:
      - "8001:5000"
    environment:
      REDIS_HOST: localhost
  redis:
    image: redis:7-alpine
`
    },
    wordpress: {
      '~/wordpress/compose.yaml': `services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppass
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s
    restart: unless-stopped

  wordpress:
    image: wordpress
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppass
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wp-data:/var/www/html
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  db-data:
  wp-data:
`
    },
    pgapp: {
      '~/pgapp/app.py': `import os

import psycopg2
from flask import Flask

app = Flask(__name__)

# 앱이 시작될 때 딱 한 번 DB 에 접속합니다 (재시도 없음)
conn = psycopg2.connect(
    host=os.environ.get('DB_HOST', 'db'),
    dbname='appdb',
    user='postgres',
    password=os.environ['POSTGRES_PASSWORD'],
)


@app.route('/')
def index():
    cur = conn.cursor()
    cur.execute('SELECT version()')
    row = cur.fetchone()
    return f'DB 연결 성공! {row[0]}'
`,
      '~/pgapp/requirements.txt': 'flask\npsycopg2-binary\n',
      '~/pgapp/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV FLASK_RUN_HOST=0.0.0.0
CMD ["flask", "run"]
`,
      '~/pgapp/compose.yaml': `services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DB_HOST: db
      POSTGRES_PASSWORD: secret
    depends_on:
      - db

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:
`
    },
    pgadmin: {
      '~/pgadmin/compose.yaml': `services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5

  adminer:
    image: adminer
    ports:
      - "8082:8080"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pg-data:
`
    },
    proxy: {
      '~/proxy/app/app.py': `import socket

from flask import Flask

app = Flask(__name__)


@app.route('/')
def index():
    return f'안녕하세요! 저는 {socket.gethostname()} 컨테이너입니다.'
`,
      '~/proxy/app/requirements.txt': 'flask\n',
      '~/proxy/app/Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
`,
      '~/proxy/nginx/default.conf': `server {
    listen 80;

    location / {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
`,
      '~/proxy/compose.yaml': `services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "8081:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - app

  app:
    build: ./app
`
    },
    lb: {
      '~/lb/nginx/default.conf': `server {
    listen 80;

    location / {
        proxy_pass http://web:80;
    }
}
`,
      '~/lb/compose.yaml': `services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "8088:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web

  web:
    image: traefik/whoami
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '이 장에서 만들 네 가지 스택',
      html: `
<p>9장에서 compose.yaml 의 문법을 익혔다면, 이번 장은 <b>실제 서비스 모양</b>을 직접 조립해 보는 시간입니다.
웹 앱은 거의 항상 "<b>앱 + 데이터 저장소</b>" 조합이고, 트래픽이 늘면 "<b>앞단 프록시 + 여러 개의 앱</b>"이 됩니다.</p>
<div class="cards c2">
  <div class="card green"><div class="ci">🔢</div><b>Flask + Redis 방문자 카운터</b><p>내 코드를 <code>build: .</code> 로 이미지로 만들어 캐시와 연결 (Docker 공식 Compose 튜토리얼 모양)</p></div>
  <div class="card blue"><div class="ci">📝</div><b>WordPress + MySQL</b><p>남이 만든 앱 + DB. 볼륨 · 환경 변수 · 헬스체크로 "데이터가 안 사라지는" 블로그</p></div>
  <div class="card orange"><div class="ci">⏱️</div><b>Flask + Postgres (+ adminer)</b><p>"DB 가 준비되기 전에 앱이 접속"하는 실패를 재현하고 헬스체크로 고치기</p></div>
  <div class="card purple"><div class="ci">⚖️</div><b>nginx 프록시 + 앱 여러 개</b><p>리버스 프록시 뒤에 앱을 숨기고 <code>--scale</code> 로 늘려 부하 분산 확인</p></div>
</div>
<p>폴더 하나 = 프로젝트 하나 규칙은 그대로입니다. 스택마다 <code>~/counter</code> · <code>~/wordpress</code> · <code>~/pgapp</code> · <code>~/proxy</code> · <code>~/lb</code> 처럼
<b>자기 폴더</b>를 만들어 쓰므로 컨테이너 · 네트워크 · 볼륨 이름이 서로 섞이지 않습니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>폴더(프로젝트)</th><th>서비스</th><th>브라우저 주소</th></tr>
<tr><td><code>~/counter</code></td><td>web(Flask) · redis</td><td>localhost:8000</td></tr>
<tr><td><code>~/wordpress</code></td><td>wordpress · db(MySQL)</td><td>localhost:8080</td></tr>
<tr><td><code>~/pgapp</code> · <code>~/pgadmin</code></td><td>app(Flask) · db(Postgres) · adminer</td><td>localhost:5000 · localhost:8082</td></tr>
<tr><td><code>~/proxy</code> · <code>~/lb</code></td><td>proxy(nginx) · app / web(whoami)</td><td>localhost:8081 · localhost:8088</td></tr>
</table></div>
<div class="box analogy"><div class="box-t">🍳 비유 — 식당 주방</div>
손님(브라우저)은 <b>홀 직원(프록시)</b>에게만 주문합니다. 홀 직원은 주문을 <b>요리사(앱)</b> 여러 명에게 나눠 주고,
요리사들은 <b>냉장고(DB)</b>와 <b>메모판(캐시)</b>을 씁니다. 냉장고가 아직 전원이 안 들어왔는데 요리를 시작하면 사고가 나지요 —
그래서 "냉장고 준비 완료" 신호(헬스체크)를 기다리게 합니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'Flask + Redis 방문자 카운터 — build: . 로 내 앱 올리기',
      html: `
<p>Docker 공식 문서의 Compose 튜토리얼과 같은 모양의 예제입니다. 파일 네 개면 됩니다.</p>
{{widget:files|set=counter|cd=~/counter|title=방문자 카운터 파일 4개}}
<pre class="code" data-lang="python" data-file="~/counter/app.py"><code>import time

import redis
from flask import Flask

app = Flask(__name__)
cache = redis.Redis(host='redis', port=6379)   <span class="cm"># ← 서비스 이름!</span>


def get_hit_count():
    retries = 5
    while True:
        try:
            return cache.incr('hits')
        except redis.exceptions.ConnectionError as exc:
            if retries == 0:
                raise exc
            retries -= 1
            time.sleep(0.5)


@app.route('/')
def hello():
    count = get_hit_count()
    return f'Hello World! I have been seen {count} times.'</code></pre>
<pre class="code" data-lang="text" data-file="~/counter/requirements.txt"><code>flask
redis</code></pre>
<pre class="code" data-lang="Dockerfile" data-file="~/counter/Dockerfile"><code># syntax=docker/dockerfile:1
FROM python:3.12-alpine
WORKDIR /code
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
EXPOSE 5000
COPY . .
CMD ["flask", "run", "--debug"]</code></pre>
<pre class="code" data-lang="yaml" data-file="~/counter/compose.yaml"><code>services:
  web:
    build: .
    ports:
      - "8000:5000"
  redis:
    image: "redis:alpine"</code></pre>
<ul>
  <li><code>build: .</code> — 이미지를 받아 오는 대신 <b>이 폴더의 Dockerfile 로 빌드</b>합니다. 만들어진 이미지 이름은 <code>프로젝트-서비스</code> = <code>counter-web</code>.</li>
  <li><code>host='redis'</code> — 코드 속 접속 주소가 <b>서비스 이름</b>입니다. Compose 네트워크의 DNS 가 redis 컨테이너 IP 로 바꿔 줍니다.</li>
  <li><code>get_hit_count()</code> 의 재시도 — redis 가 막 켜지는 중이면 0.5초 쉬었다가 최대 5번 다시 시도합니다. <b>앱 쪽에서도 대비</b>하는 좋은 습관입니다.</li>
  <li><code>FLASK_RUN_HOST=0.0.0.0</code> — Flask 기본값 127.0.0.1 로는 컨테이너 밖에서 접속할 수 없습니다(6장).</li>
</ul>
{{fig:counter}}
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/counter
docker compose up -d
docker compose ps
curl -s localhost:8000
curl -s localhost:8000
curl -s localhost:8000</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Building web
#1 [internal] load build definition from Dockerfile 0.0s
…
#20 =&gt; naming to docker.io/library/counter-web:latest 0.0s
 ✔ Service web  Built
[+] Pulling 1/1
 ✔ redis                              Pulled     0.3s
[+] Running 3/3
 ✔ Network counter_default            Created    0.1s
 ✔ Container counter-web-1            Started    0.1s
 ✔ Container counter-redis-1          Started    0.1s
NAME              IMAGE          COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
counter-redis-1   redis:alpine   "docker-entrypoint.s…"   redis     Less than a second ago   Up Less than a second   6379/tcp
counter-web-1     counter-web    "flask run --debug"      web       Less than a second ago   Up Less than a second   0.0.0.0:8000-&gt;5000/tcp, [::]:8000-&gt;5000/tcp
Hello World! I have been seen 1 times.
Hello World! I have been seen 2 times.
Hello World! I have been seen 3 times.</code></pre>
<p>{{widget:open|url=http://localhost:8000/}} 브라우저 탭에서 <b>새로 고침</b>할 때마다 숫자가 1씩 올라갑니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 숫자는 누가 기억할까?</div>
web 컨테이너를 지우고 다시 만들어도 숫자는 이어집니다. 숫자는 web 이 아니라 <b>redis</b> 에 있으니까요.
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/counter
docker compose up -d --force-recreate web
curl -s localhost:8000
docker compose exec redis redis-cli get hits</code></pre>
그런데 <code>docker compose down</code> 후 다시 <code>up</code> 하면 1부터 다시 시작합니다. redis 에 볼륨이 없기 때문이지요 — 🎯 미션 2에서 고쳐 봅니다.</div>
<div class="box tip"><div class="box-t">💡 코드를 고쳤다면 --build</div>
이미지가 이미 있으면 <code>up -d</code> 는 다시 빌드하지 않습니다. app.py · Dockerfile 을 고쳤다면
<code>docker compose up -d --build</code> 로 <b>빌드 후 바뀐 서비스만 다시 만들기</b>를 하세요. (<code>docker compose build</code> 는 빌드만 합니다)</div>`
    },

    /* ================================================================ 3 */
    {
      title: 'WordPress + MySQL — 볼륨 · 환경 변수 · 헬스체크',
      html: `
<p>이번에는 코드를 한 줄도 쓰지 않고, 공식 이미지 두 개로 블로그를 만듭니다. 설정은 전부 <b>환경 변수</b>로 넘기고,
데이터는 <b>이름 있는 볼륨</b>에 저장합니다.</p>
{{widget:files|set=wordpress|cd=~/wordpress|title=WordPress 스택}}
<pre class="code" data-lang="yaml" data-file="~/wordpress/compose.yaml"><code>services:
  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppass
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 10s
    restart: unless-stopped

  wordpress:
    image: wordpress
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppass
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - wp-data:/var/www/html
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  db-data:
  wp-data:</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th>부분</th><th>뜻</th></tr>
<tr><td><code>MYSQL_DATABASE · MYSQL_USER · MYSQL_PASSWORD</code></td><td>처음 켤 때(볼륨이 비어 있을 때) DB 와 사용자를 만들어 줌</td></tr>
<tr><td><code>WORDPRESS_DB_HOST: db</code></td><td>WordPress 가 접속할 DB 주소 = <b>서비스 이름</b></td></tr>
<tr><td><code>healthcheck</code> · <code>mysqladmin ping</code></td><td>5초마다 "MySQL 살아 있니?" 를 물어 <code>healthy</code> 상태를 만듦</td></tr>
<tr><td><code>start_period: 10s</code></td><td>처음 초기화하는 동안의 실패는 세지 않는 유예 시간</td></tr>
<tr><td><code>condition: service_healthy</code></td><td>db 가 <code>healthy</code> 가 된 <b>뒤에</b> wordpress 시작</td></tr>
<tr><td><code>db-data</code> · <code>wp-data</code></td><td>DB 파일 · 업로드 파일 보관. <code>down</code> 해도 남음</td></tr>
</table></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/wordpress
docker compose up -d
docker compose ps</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 6/6
 ✔ Network wordpress_default          Created    0.1s
 ✔ Volume "wordpress_db-data"         Created    0.1s
 ✔ Volume "wordpress_wp-data"         Created    0.1s
 ✔ Container wordpress-db-1           Started    0.1s
 ✔ Container wordpress-db-1           Healthy    3.9s
 ✔ Container wordpress-wordpress-1    Started    0.1s
NAME                    IMAGE       COMMAND                  SERVICE     CREATED                  STATUS                   PORTS
wordpress-db-1          mysql:8.4   "docker-entrypoint.s…"   db          4 seconds ago            Up 4 seconds (healthy)   3306/tcp, 33060/tcp
wordpress-wordpress-1   wordpress   "docker-entrypoint.s…"   wordpress   Less than a second ago   Up Less than a second    0.0.0.0:8080-&gt;80/tcp, [::]:8080-&gt;80/tcp</code></pre>
<p><code>Container wordpress-db-1 Healthy</code> 줄을 보세요. Compose 가 db 의 헬스체크 통과를 <b>기다린 뒤</b> wordpress 를 시작했습니다.
STATUS 에도 <code>(healthy)</code> 가 붙어 있습니다.</p>
<p>{{widget:open|url=http://localhost:8080/}} 설치 화면에서 <b>Install WordPress</b> 를 누르면 블로그가 만들어집니다. {{widget:open|pane=dash}}</p>
<p>블로그 글은 MySQL 컨테이너 안이 아니라 <b>볼륨</b>에 있습니다. 컨테이너를 모두 지웠다 다시 만들어도 그대로인지 확인해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/wordpress
docker compose exec db mysql -u wpuser -pwppass wordpress -e 'SHOW TABLES;'
docker compose down
docker compose up -d
docker volume ls</code></pre>
<pre class="code out" data-lang="출력"><code>+---------------------+
| Tables_in_wordpress |
+---------------------+
| wp_options          |
| wp_posts            |
+---------------------+
2 rows in set (0.00 sec)
…
DRIVER    VOLUME NAME
local     wordpress_db-data
local     wordpress_wp-data</code></pre>
<div class="box warn"><div class="box-t">⚠️ 비밀번호를 compose.yaml 에 직접?</div>
실습이니 파일에 적었지만, 실제로는 9장의 <code>.env</code> + <code>\${MYSQL_PASSWORD:?}</code> 로 빼거나 Compose 의 <code>secrets:</code> 를 씁니다(13장).
또 <code>MYSQL_*</code> 변수는 <b>볼륨이 비어 있을 때 처음 한 번만</b> 쓰입니다. 비밀번호를 바꾸고 up 해도 기존 DB 에는 반영되지 않으니 주의하세요.</div>`
    },

    /* ================================================================ 4 */
    {
      title: '"DB 가 준비되기 전에 앱이 접속" — 헬스체크로 시작 순서 맞추기',
      html: `
<p>데이터베이스는 컨테이너가 "시작됨"이 된 뒤에도 파일을 초기화하느라 몇 초 동안 접속을 받지 않습니다.
그런데 <code>depends_on: [db]</code> 는 <b>db 컨테이너를 먼저 시작</b>하는 것까지만 책임집니다. 앱이 시작하자마자 DB 에 접속하면 어떻게 될까요?</p>
{{widget:files|set=pgapp|cd=~/pgapp|title=Flask + Postgres (문제 재현용)}}
<pre class="code" data-lang="python" data-file="~/pgapp/app.py"><code>import os

import psycopg2
from flask import Flask

app = Flask(__name__)

# 앱이 시작될 때 딱 한 번 DB 에 접속합니다 (재시도 없음)
conn = psycopg2.connect(
    host=os.environ.get('DB_HOST', 'db'),
    dbname='appdb',
    user='postgres',
    password=os.environ['POSTGRES_PASSWORD'],
)


@app.route('/')
def index():
    cur = conn.cursor()
    cur.execute('SELECT version()')
    row = cur.fetchone()
    return f'DB 연결 성공! {row[0]}'</code></pre>
<pre class="code" data-lang="text" data-file="~/pgapp/requirements.txt"><code>flask
psycopg2-binary</code></pre>
<pre class="code" data-lang="Dockerfile" data-file="~/pgapp/Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV FLASK_RUN_HOST=0.0.0.0
CMD ["flask", "run"]</code></pre>
<pre class="code" data-lang="yaml" data-file="~/pgapp/compose.yaml"><code>services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DB_HOST: db
      POSTGRES_PASSWORD: secret
    depends_on:
      - db            <span class="cm"># 순서만 보장</span>

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/pgapp
docker compose up -d
docker compose ps -a
docker compose logs app</code></pre>
<pre class="code out" data-lang="출력"><code> ✔ Container pgapp-db-1               Started    0.1s
 ✔ Container pgapp-app-1              Started    0.1s
NAME          IMAGE         COMMAND                  SERVICE   CREATED                  STATUS                              PORTS
pgapp-app-1   pgapp-app     "flask run"              app       Less than a second ago   Exited (1) Less than a second ago
pgapp-db-1    postgres:17   "docker-entrypoint.s…"   db        Less than a second ago   Up Less than a second               5432/tcp
pgapp-app-1 | Traceback (most recent call last):
pgapp-app-1 |   File "/app/app.py", line 9, in &lt;module&gt;
pgapp-app-1 | psycopg2.OperationalError: connection to server at "db" (172.18.0.2), port 5432 failed: Connection refused
pgapp-app-1 | 	Is the server running on that host and accepting TCP/IP connections?</code></pre>
<p>의도한 실패입니다. <code>up</code> 은 둘 다 <code>Started</code> 라고 했지만, app 은 곧바로 <code>Exited (1)</code> 이 되었습니다.
이름(db)은 제대로 찾았는데(172.18.0.2) <b>Connection refused</b> — DB 가 아직 문을 열지 않은 것입니다.</p>
{{fig:race}}
<h4>해결 1 — 헬스체크 + condition: service_healthy</h4>
<p>db 에 "준비됐는지" 확인하는 명령(<code>pg_isready</code>)을 헬스체크로 달고, app 은 db 가 <b>healthy</b> 일 때 시작하게 합니다.</p>
<pre class="code" data-lang="yaml"><code>services:
  app:
    …
    depends_on:
      db:
        condition: service_healthy     <span class="cm"># ← 긴 형식</span>

  db:
    image: postgres:17
    …
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th>condition 값</th><th>기다리는 것</th><th>쓰는 곳</th></tr>
<tr><td><code>service_started</code> (기본)</td><td>컨테이너가 시작됨</td><td>짧은 형식 <code>- db</code> 와 같음</td></tr>
<tr><td><code>service_healthy</code></td><td>헬스체크가 healthy</td><td>DB · 메시지 큐 등 준비 시간이 필요한 서비스</td></tr>
<tr><td><code>service_completed_successfully</code></td><td>종료 코드 0 으로 끝남</td><td>DB 마이그레이션 · 초기 데이터 넣기 같은 일회성 작업</td></tr>
</table></div>
<div class="tbl-wrap"><table class="tbl">
<tr><th>DB</th><th>헬스체크 명령 예</th></tr>
<tr><td>PostgreSQL</td><td><code>["CMD-SHELL", "pg_isready -U postgres"]</code></td></tr>
<tr><td>MySQL · MariaDB</td><td><code>["CMD", "mysqladmin", "ping", "-h", "localhost"]</code></td></tr>
<tr><td>Redis</td><td><code>["CMD", "redis-cli", "ping"]</code></td></tr>
</table></div>
<p>직접 고쳐 보는 것은 🎯 미션으로 남겨 둡니다. 헬스체크가 <b>없는</b> 서비스에 <code>service_healthy</code> 를 걸면 Compose 가 오류를 내니 둘을 꼭 짝으로 쓰세요.</p>
<h4>해결 2 — 앱이 재시도하게</h4>
<p>카운터 예제의 <code>get_hit_count()</code> 처럼 앱이 접속 실패 시 잠깐 쉬었다 다시 시도하면 더 튼튼합니다.
운영 중에 DB 가 잠깐 재시작되는 경우까지 버틸 수 있기 때문입니다. <b>헬스체크(시작 순서) + 앱 재시도(운영 중 끊김)</b> 두 겹이 정석입니다.
<code>restart: unless-stopped</code> 도 "죽으면 다시 살리기"로 비슷한 효과를 내지만, 실패 로그가 쌓이니 1순위 해결책은 아닙니다.</p>
<h4>덤 — adminer 로 DB 를 웹에서 보기</h4>
<p><b>adminer</b> 는 PHP 파일 하나로 된 가벼운 DB 관리 화면입니다. Postgres 옆에 붙여 두면 브라우저로 테이블을 볼 수 있습니다.</p>
{{widget:files|set=pgadmin|cd=~/pgadmin|title=Postgres + adminer}}
<pre class="code" data-lang="yaml" data-file="~/pgadmin/compose.yaml"><code>services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 5

  adminer:
    image: adminer
    ports:
      - "8082:8080"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pg-data:</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/pgadmin
docker compose up -d
docker compose ps</code></pre>
<p>{{widget:open|url=http://localhost:8082/}} 로그인 화면에서 System 은 <b>PostgreSQL</b>, Server 는 <code>localhost</code> 가 아니라 <b>서비스 이름 <code>db</code></b>,
사용자 <code>postgres</code> · 비밀번호 <code>secret</code> 을 넣습니다. DB 포트(5432)는 밖으로 열지 않았는데도 adminer 가 같은 네트워크 안에서 접속하는 것이 핵심입니다.</p>`
    },

    /* ================================================================ 5 */
    {
      title: 'nginx 리버스 프록시 — 앱은 뒤에 숨기기',
      html: `
<p><b>리버스 프록시</b>(reverse proxy)는 손님의 요청을 대신 받아 뒤쪽 서버에 전달하는 서버입니다.
앱 컨테이너에는 <code>ports</code> 를 주지 않고, nginx 만 밖으로 열어 둡니다. HTTPS · 압축 · 정적 파일 · 여러 앱으로 나누기를 모두 앞단 한 곳에서 처리할 수 있습니다.</p>
{{widget:files|set=proxy|cd=~/proxy|title=nginx 프록시 + Flask 앱}}
<div class="two">
<div><pre class="code" data-lang="nginx" data-file="~/proxy/nginx/default.conf"><code>server {
    listen 80;

    location / {
        proxy_pass http://app:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}</code></pre></div>
<div><pre class="code" data-lang="yaml" data-file="~/proxy/compose.yaml"><code>services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "8081:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - app

  app:
    build: ./app          <span class="cm"># ports 없음!</span></code></pre></div>
</div>
<pre class="code" data-lang="python" data-file="~/proxy/app/app.py"><code>import socket

from flask import Flask

app = Flask(__name__)


@app.route('/')
def index():
    return f'안녕하세요! 저는 {socket.gethostname()} 컨테이너입니다.'</code></pre>
<pre class="code" data-lang="text" data-file="~/proxy/app/requirements.txt"><code>flask</code></pre>
<pre class="code" data-lang="Dockerfile" data-file="~/proxy/app/Dockerfile"><code>FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]</code></pre>
<p><code>proxy_pass http://app:5000;</code> 의 <b>app</b> 이 서비스 이름입니다. nginx 설정 파일은 바인드 마운트로 넣었으니 이미지를 새로 만들 필요가 없습니다.
<code>build: ./app</code> 처럼 Dockerfile 이 하위 폴더에 있으면 그 경로를 적습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/proxy
docker compose up -d
docker compose ps
curl -s localhost:8081
docker compose exec proxy nginx -t</code></pre>
<pre class="code out" data-lang="출력"><code>NAME            IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
proxy-app-1     proxy-app           "flask run --host=0.…"   app       Less than a second ago   Up Less than a second
proxy-proxy-1   nginx:1.27-alpine   "/docker-entrypoint.…"   proxy     Less than a second ago   Up Less than a second   0.0.0.0:8081-&gt;80/tcp, [::]:8081-&gt;80/tcp
안녕하세요! 저는 fbf9b3b8b24a 컨테이너입니다.
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful</code></pre>
<p>app 의 PORTS 칸이 비어 있지요? 밖에서는 app 에 직접 갈 수 없고 <b>nginx 를 거쳐야만</b> 합니다. 앱이 멈추면 nginx 는 무엇을 돌려줄까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/proxy
docker compose stop app
curl -s localhost:8081
docker compose start app</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 1/1
 ✔ Container proxy-app-1              Stopped    2.5s
&lt;html&gt;
&lt;head&gt;&lt;title&gt;502 Bad Gateway&lt;/title&gt;&lt;/head&gt;
&lt;body&gt;
&lt;center&gt;&lt;h1&gt;502 Bad Gateway&lt;/h1&gt;&lt;/center&gt;
&lt;hr&gt;&lt;center&gt;nginx/1.27.2&lt;/center&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
<div class="box note"><div class="box-t">📌 502 Bad Gateway = "뒤쪽이 대답을 안 해요"</div>
프록시는 살아 있지만 뒤의 앱에 연결하지 못했다는 뜻입니다. 502 를 보면 <code>docker compose ps -a</code> 로 앱 상태를,
<code>docker compose logs proxy</code> 로 nginx 의 <code>connect() failed</code> · <code>could not be resolved</code> 메시지를 확인하세요.
proxy_pass 의 이름 오타 · 포트 번호 불일치(앱은 5000 인데 8000 으로 보냄) · 앱이 127.0.0.1 에만 열림 — 이 세 가지가 흔한 원인입니다.</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'docker compose up --scale — 여러 개 띄우고 부하 분산 확인',
      html: `
<p><code>--scale 서비스=개수</code> 로 같은 서비스의 컨테이너를 여러 개 띄울 수 있습니다. 먼저 <b>ports 가 고정된</b> 카운터 앱을 3개로 늘려 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/counter
docker compose up -d --scale web=3</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 1/1
 ✘ Container counter-web-2            Error      0.1s
Error response from daemon: driver failed programming external connectivity on endpoint counter-web-2 (9ae09eb7…): Bind for 0.0.0.0:8000 failed: port is already allocated</code></pre>
<p>의도한 오류입니다. 호스트의 8000 포트는 <b>하나뿐</b>인데 세 컨테이너가 모두 <code>8000:5000</code> 을 잡으려 했기 때문입니다.
(<code>container_name</code> 을 적은 서비스도 이름이 겹쳐서 스케일할 수 없습니다.) 해결책은 <b>앱에서 ports 를 빼고 프록시 뒤에 두는 것</b>입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/counter
docker compose up -d --scale web=1</code></pre>
{{fig:proxy}}
<p>요청을 받은 컨테이너가 자기 정보를 돌려주는 <code>traefik/whoami</code> 이미지로 확인해 봅시다. <code>~/lb</code> 폴더를 씁니다.</p>
{{widget:files|set=lb|cd=~/lb|title=nginx + whoami 부하 분산}}
<div class="two">
<div><pre class="code" data-lang="nginx" data-file="~/lb/nginx/default.conf"><code>server {
    listen 80;

    location / {
        proxy_pass http://web:80;
    }
}</code></pre></div>
<div><pre class="code" data-lang="yaml" data-file="~/lb/compose.yaml"><code>services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "8088:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web

  web:
    image: traefik/whoami</code></pre></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/lb
docker compose up -d --scale web=3
docker compose ps
docker compose exec proxy nslookup web
curl -s localhost:8088
curl -s localhost:8088
curl -s localhost:8088</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 5/5
 ✔ Network lb_default                 Created    0.1s
 ✔ Container lb-web-1                 Started    0.1s
 ✔ Container lb-web-2                 Started    0.1s
 ✔ Container lb-web-3                 Started    0.1s
 ✔ Container lb-proxy-1               Started    0.1s
NAME         IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
lb-proxy-1   nginx:1.27-alpine   "/docker-entrypoint.…"   proxy     Less than a second ago   Up Less than a second   0.0.0.0:8088-&gt;80/tcp, [::]:8088-&gt;80/tcp
lb-web-1     traefik/whoami      "/whoami"                web       Less than a second ago   Up Less than a second   80/tcp
lb-web-2     traefik/whoami      "/whoami"                web       Less than a second ago   Up Less than a second   80/tcp
lb-web-3     traefik/whoami      "/whoami"                web       Less than a second ago   Up Less than a second   80/tcp
…
Name:	web
Address: 172.18.0.2
Name:	web
Address: 172.18.0.3
Name:	web
Address: 172.18.0.4

Hostname: 30f47a58d045
IP: 127.0.0.1
IP: ::1
IP: 172.18.0.2
…
Hostname: 400af5dff2a8
IP: 127.0.0.1
IP: ::1
IP: 172.18.0.4
…</code></pre>
<p>서비스 이름 <code>web</code> 하나에 IP 가 <b>세 개</b> 등록되어 있고, curl 할 때마다 <code>Hostname</code> 이 바뀝니다 — 요청이 여러 컨테이너로 나뉘어 간 것입니다.
{{widget:open|url=http://localhost:8088/}} 에서 새로 고침해 보세요.</p>
<div class="box warn"><div class="box-t">⚠️ 실제 nginx 는 시작할 때 IP 를 기억합니다</div>
nginx 는 <code>proxy_pass</code> 의 이름을 <b>시작할 때 한 번</b> 찾아 둡니다. 이미 떠 있는 상태에서 나중에 <code>--scale</code> 로 늘리면
새 컨테이너로는 보내지 않으니, 스케일 후 <code>docker compose restart proxy</code> 를 해 주세요.
(Traefik 같은 프록시는 Docker 를 지켜보다가 컨테이너가 늘면 자동으로 반영합니다.)</div>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 스케일할 수 있는 앱의 조건</div>
여러 개로 늘리려면 앱이 <b>상태를 자기 안에 두지 않아야</b>(stateless) 합니다. 카운터 앱이 숫자를 메모리가 아닌 redis 에 둔 이유가 이것입니다.
로그인 세션 · 업로드 파일도 redis · DB · 볼륨 같은 바깥에 둬야 어느 컨테이너가 요청을 받아도 똑같이 동작합니다.
compose.yaml 에 <code>deploy: replicas: 3</code> 으로 기본 개수를 적어 둘 수도 있습니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '개발용 설정 — 코드 고치면 바로 반영 (바인드 마운트 · compose watch)',
      html: `
<p>코드 한 줄 고칠 때마다 <code>up -d --build</code> 로 이미지를 다시 만들면 느립니다. 개발할 때는 두 가지 방법을 씁니다.</p>
<div class="vs">
  <div class="vs-a blue"><b>① 바인드 마운트</b><ul>
    <li><code>volumes: - .:/code</code> 로 내 폴더를 컨테이너에 연결</li>
    <li>파일이 곧바로 컨테이너에 보임</li>
    <li>Flask <code>--debug</code> · nodemon 같은 자동 재시작과 함께</li>
    <li>단점: 이미지 안의 파일을 가림 · OS 마다 파일 감시가 느릴 수 있음</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b orange"><b>② compose watch</b><ul>
    <li><code>develop.watch</code> 규칙 + <code>docker compose watch</code></li>
    <li>바뀐 파일만 컨테이너로 <b>복사(sync)</b>하거나 <b>다시 빌드(rebuild)</b></li>
    <li>requirements.txt 가 바뀌면 자동 rebuild</li>
    <li>이미지 구조는 그대로 유지</li></ul></div>
</div>
<p>① 바인드 마운트 방식은 compose.yaml 에 한 줄이면 됩니다.</p>
<pre class="code" data-lang="yaml"><code>services:
  web:
    build: .
    ports:
      - "8000:5000"
    volumes:
      - .:/code          <span class="cm"># 내 코드 폴더 → 컨테이너 /code</span>
  redis:
    image: "redis:alpine"</code></pre>
<p>실제 Flask 는 <code>--debug</code> 모드에서 파일이 바뀌면 스스로 다시 시작합니다. (이 시뮬레이터의 Flask 는 자동 재시작을 흉내 내지 않으므로
파일을 고친 뒤 <code>docker compose restart web</code> 으로 확인하세요.)</p>
<p>② compose watch 는 <code>develop:</code> 아래에 "어떤 파일이 바뀌면 무엇을 할지"를 적습니다.</p>
<pre class="code" data-lang="yaml" data-file="~/counter/compose.yaml"><code>services:
  web:
    build: .
    ports:
      - "8000:5000"
    develop:
      watch:
        - action: sync+restart
          path: .
          target: /code
        - action: rebuild
          path: requirements.txt
  redis:
    image: "redis:alpine"</code></pre>
<div class="tbl-wrap"><table class="tbl">
<tr><th>action</th><th>하는 일</th><th>어울리는 파일</th></tr>
<tr><td><code>sync</code></td><td>바뀐 파일을 컨테이너 안 target 으로 복사</td><td>자동 재시작 기능이 있는 앱 코드</td></tr>
<tr><td><code>sync+restart</code></td><td>복사한 뒤 컨테이너 재시작</td><td>설정 파일 · 자동 재시작 없는 앱</td></tr>
<tr><td><code>rebuild</code></td><td>이미지를 다시 빌드하고 컨테이너 교체</td><td>requirements.txt · package.json · Dockerfile</td></tr>
</table></div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/counter
docker compose up -d
docker compose watch</code></pre>
<p><code>watch</code> 는 끝나지 않는 명령입니다. 켜 둔 채로 📝 파일 탭에서 <code>~/counter/app.py</code> 의 문장을 <code>Hello Docker!</code> 로 바꿔 저장하고
브라우저를 새로 고쳐 보세요. 다 봤으면 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춥니다. (<code>docker compose up --watch</code> 로 실행과 감시를 한 번에 할 수도 있습니다.)</p>
<div class="flow">
  <div class="fb blue"><span class="fi">✏️</span><b>저장</b>app.py 수정</div>
  <div class="fb orange"><span class="fi">👀</span><b>watch 감지</b>path: . 규칙</div>
  <div class="fb teal"><span class="fi">📦</span><b>sync</b>컨테이너 /code 로 복사</div>
  <div class="fb green"><span class="fi">🔄</span><b>restart</b>새 코드로 응답</div>
</div>
<div class="box tip"><div class="box-t">💡 .dockerignore 도 챙기세요</div>
<code>build: .</code> 는 폴더 전체를 빌드 컨텍스트로 보냅니다. <code>.git</code> · <code>__pycache__</code> · <code>.env</code> 를 <code>.dockerignore</code> 에 넣어
빌드를 빠르게 하고, 비밀 값이 이미지에 들어가지 않게 하세요(6장).</div>`
    },

    /* ================================================================ 8 */
    {
      title: 'profiles 와 여러 compose 파일(override)',
      html: `
<h4>profiles — 필요할 때만 켜는 서비스</h4>
<p>디버깅 도구 · 관리 화면 · 테스트용 서비스처럼 <b>평소에는 필요 없는</b> 서비스에 <code>profiles:</code> 를 달아 두면,
그 프로필을 켤 때만 실행됩니다. 프로필이 없는 서비스는 항상 실행됩니다.</p>
<pre class="code" data-lang="yaml" data-file="~/profiles-demo/compose.yaml"><code>services:
  redis:
    image: redis:7-alpine

  debug:
    image: nicolaka/netshoot
    command: ["sleep", "infinity"]
    profiles: ["debug"]</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/profiles-demo
docker compose up -d
docker compose --profile debug up -d
docker compose ps
docker compose exec debug nslookup redis
docker compose --profile debug down</code></pre>
<pre class="code out" data-lang="출력"><code>[+] Running 2/2
 ✔ Network profiles-demo_default      Created    0.1s
 ✔ Container profiles-demo-redis-1    Started    0.1s
[+] Running 2/2
 ✔ Container profiles-demo-redis-1    Running    0.0s
 ✔ Container profiles-demo-debug-1    Started    0.1s
NAME                    IMAGE               COMMAND                  SERVICE   CREATED                  STATUS                  PORTS
profiles-demo-debug-1   nicolaka/netshoot   "sleep infinity"         debug     Less than a second ago   Up Less than a second
profiles-demo-redis-1   redis:7-alpine      "docker-entrypoint.s…"   redis     1 second ago             Up 1 second             6379/tcp
…</code></pre>
<p>처음 <code>up</code> 에서는 redis 만 떴고, <code>--profile debug</code> 를 붙였을 때 debug 가 추가되었습니다.
<code>COMPOSE_PROFILES=debug</code> 환경 변수로도 켤 수 있습니다.</p>
<h4>여러 compose 파일 — 공통 + 환경별</h4>
<p>개발 PC 와 운영 서버의 설정은 조금 다릅니다(바인드 마운트 · 디버그 모드 · 포트 · 재시작 정책…). 공통 부분은 <code>compose.yaml</code> 에 두고,
다른 부분만 따로 파일로 만들어 <b>덧씌웁니다</b>.</p>
{{fig:override}}
<div class="two">
<div><pre class="code" data-lang="yaml"><code><span class="cm"># compose.override.yaml — 개발 PC 용</span>
services:
  web:
    volumes:
      - .:/code
    environment:
      FLASK_DEBUG: "1"</code></pre></div>
<div><pre class="code" data-lang="yaml"><code><span class="cm"># compose.prod.yaml — 운영 서버용</span>
services:
  web:
    image: registry.example.com/counter-web:1.4.2
    restart: always
  redis:
    volumes:
      - redis-data:/data
volumes:
  redis-data:</code></pre></div>
</div>
<pre class="code" data-lang="bash"><code><span class="cm"># 개발: compose.yaml + compose.override.yaml 을 자동으로 합침</span>
docker compose up -d
<span class="cm"># 운영: 파일을 직접 골라서 (override 는 읽지 않음)</span>
docker compose -f compose.yaml -f compose.prod.yaml up -d
<span class="cm"># 합친 결과 미리 보기</span>
docker compose -f compose.yaml -f compose.prod.yaml config</code></pre>
<ul>
  <li>하나의 값(<code>image</code> · <code>restart</code>)은 <b>뒤 파일이 덮어쓰고</b>, 목록(<code>ports</code> · <code>volumes</code>)과 맵(<code>environment</code>)은 <b>합쳐집니다</b>.</li>
  <li><code>compose.override.yaml</code> 은 같은 폴더에 있으면 <code>-f</code> 없이도 자동으로 읽힙니다. <code>-f</code> 를 쓰면 적은 파일만 읽습니다.</li>
  <li>파일 안에서 다른 파일을 불러오는 <code>include:</code> 최상위 키도 있습니다(큰 프로젝트를 나눌 때).</li>
</ul>
<div class="box warn"><div class="box-t">⚠️ 이 실습 환경의 한계</div>
이 시뮬레이터의 Compose 는 <b>첫 번째 파일만</b> 읽고 override 병합은 하지 않습니다. 여러 파일 병합은 실제 Docker 가 설치된 PC 에서
<code>docker compose ... config</code> 로 결과를 확인하며 연습해 보세요.</div>
{{widget:mission}}`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'Flask + Redis 방문자 카운터 띄우기',
      desc: '📁 <code>~/counter</code> 의 파일로 web(빌드) · redis 를 실행하세요. <code>localhost:8000</code> 이 <b>I have been seen N times</b> 를 돌려주면 통과입니다.',
      hint: '<code>cd ~/counter</code> → <code>docker compose up -d</code> (처음엔 이미지를 빌드합니다) → <code>curl -s localhost:8000</code>',
      files: 'counter',
      answer: ['cd ~/counter', 'docker compose up -d --build'],
      check: async M => M.svc('counter', 'web').some(c => c.state.status === 'running') && (await M.get('http://localhost:8000/')).includes('seen')
    },
    {
      id: 'm2',
      title: '카운터 숫자가 down 후에도 남게 만들기',
      desc: '지금은 <code>docker compose down</code> 후 다시 올리면 숫자가 1부터 시작합니다. counter 프로젝트의 <b>redis 서비스 /data 에 이름 있는 볼륨</b>을 연결하고 다시 실행하세요.',
      hint: 'redis 서비스에 <code>volumes: - redis-data:/data</code>, 맨 아래 최상위 <code>volumes: redis-data:</code> 선언 → <code>docker compose up -d</code>',
      answer: ['cd ~/counter', `printf 'services:\\n  web:\\n    build: .\\n    ports:\\n      - "8000:5000"\\n  redis:\\n    image: "redis:alpine"\\n    volumes:\\n      - redis-data:/data\\n\\nvolumes:\\n  redis-data:\\n' > compose.yaml`, 'docker compose up -d'],
      check: async M => { const r = M.svc('counter', 'redis').find(c => c.state.status === 'running'); if (!r) return false; const m = M.mount(r.name, '/data'); return !!m && m.type === 'volume' && (await M.get('http://localhost:8000/')).includes('seen'); }
    },
    {
      id: 'm3',
      title: 'WordPress + MySQL 스택 띄우기 (헬스체크)',
      desc: '📁 <code>~/wordpress</code> 스택을 실행하세요. db 가 <b>healthy</b> 가 되고, <code>localhost:8080</code> 에서 WordPress 화면이 나오면 통과입니다.',
      hint: '<code>cd ~/wordpress &amp;&amp; docker compose up -d</code> · <code>docker compose ps</code> 에서 <code>(healthy)</code> 확인',
      files: 'wordpress',
      answer: ['cd ~/wordpress', 'docker compose up -d'],
      check: async M => { const db = M.svc('wordpress', 'db')[0]; return !!db && M.health(db.name) === 'healthy' && M.svc('wordpress', 'wordpress').some(c => c.state.status === 'running') && (await M.get('http://localhost:8080/')).includes('WordPress'); }
    },
    {
      id: 'm4',
      title: 'nginx 리버스 프록시 뒤에 Flask 앱 두기',
      desc: '📁 <code>~/proxy</code> 스택을 실행해 <code>localhost:8081</code> 로 접속하면 nginx 를 거쳐 Flask 앱의 <b>안녕하세요!</b> 가 나오게 하세요. app 서비스에는 ports 가 없어야 합니다.',
      hint: '<code>cd ~/proxy &amp;&amp; docker compose up -d</code> · nginx 설정의 <code>proxy_pass http://app:5000;</code> 을 확인',
      files: 'proxy',
      answer: ['cd ~/proxy', 'docker compose up -d'],
      check: async M => { const a = M.svc('proxy', 'app').filter(c => c.state.status === 'running'); return a.length > 0 && a.every(c => !(c.hostConfig.ports || []).length) && (await M.get('http://localhost:8081/')).includes('안녕하세요'); }
    },
    {
      id: 'm5',
      title: 'whoami 를 3개로 늘려 부하 분산 확인',
      desc: '📁 <code>~/lb</code> 스택에서 <b>web 서비스를 3개</b>로 실행하세요. <code>localhost:8088</code> 을 여러 번 열어 Hostname 이 바뀌는지 보세요.',
      hint: '<code>docker compose up -d --scale web=3</code>',
      files: 'lb',
      answer: ['cd ~/lb', 'docker compose up -d --scale web=3'],
      check: async M => M.svc('lb', 'web').filter(c => c.state.status === 'running').length === 3 && (await M.get('http://localhost:8088/')).includes('Hostname')
    },
    {
      id: 'm6', scenario: true,
      title: 'Internal Server Error! — redis 에 localhost 로 접속하는 앱',
      desc: '⚙️ 상황 만들기를 누르면 <code>~/hits</code> 프로젝트가 뜨지만 <code>localhost:8001</code> 이 <b>500 Internal Server Error</b> 를 냅니다. <code>docker compose logs web</code> 으로 원인을 찾아 compose.yaml 을 고치고, 카운터가 동작하게 하세요.',
      hint: '로그에 <code>Error 111 connecting to localhost:6379</code> 가 보입니다. 컨테이너 안의 localhost 는 web 자기 자신! <code>REDIS_HOST</code> 를 서비스 이름 <code>redis</code> 로 바꾸고 <code>docker compose up -d</code>',
      files: 'hits',
      setup: ['cd ~/hits && docker compose up -d'],
      answer: ['cd ~/hits', `printf 'services:\\n  web:\\n    build: .\\n    ports:\\n      - "8001:5000"\\n    environment:\\n      REDIS_HOST: redis\\n  redis:\\n    image: redis:7-alpine\\n' > compose.yaml`, 'docker compose up -d'],
      check: async M => M.env(((M.svc('hits', 'web').find(c => c.state.status === 'running')) || {}).name || '-', 'REDIS_HOST') !== 'localhost' && (await M.get('http://localhost:8001/')).includes('seen')
    },
    {
      id: 'm7', scenario: true,
      title: 'depends_on 만으로는 DB 를 기다리지 않는다',
      desc: '⚙️ 상황 만들기를 누르면 <code>~/pgapp</code> 의 app 이 <code>Exited (1)</code> 이 됩니다(DB 가 준비되기 전에 접속). db 에 <b>pg_isready 헬스체크</b>를 달고 app 이 <b>condition: service_healthy</b> 로 기다리게 고쳐서, <code>localhost:5000</code> 에 <b>DB 연결 성공!</b> 이 나오게 하세요.',
      hint: 'db: <code>healthcheck: test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]</code> · app: <code>depends_on: db: condition: service_healthy</code> → <code>docker compose up -d</code>',
      files: 'pgapp',
      setup: ['cd ~/pgapp && docker compose up -d'],
      answer: ['cd ~/pgapp', `printf 'services:\\n  app:\\n    build: .\\n    ports:\\n      - "5000:5000"\\n    environment:\\n      DB_HOST: db\\n      POSTGRES_PASSWORD: secret\\n    depends_on:\\n      db:\\n        condition: service_healthy\\n\\n  db:\\n    image: postgres:17\\n    environment:\\n      POSTGRES_PASSWORD: secret\\n      POSTGRES_DB: appdb\\n    volumes:\\n      - pg-data:/var/lib/postgresql/data\\n    healthcheck:\\n      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]\\n      interval: 5s\\n      timeout: 3s\\n      retries: 5\\n\\nvolumes:\\n  pg-data:\\n' > compose.yaml`, 'docker compose up -d'],
      check: async M => /service_healthy/.test(M.file('~/pgapp/compose.yaml') || '') && M.svc('pgapp', 'app').some(c => c.state.status === 'running') && (await M.get('http://localhost:5000/')).includes('성공')
    }
  ],

  videos: [
    { title: 'Try Docker Compose (Docker Docs 공식 튜토리얼)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=docker+compose+flask+redis+tutorial', desc: 'Flask + Redis 방문자 카운터(이 장의 첫 예제) 튜토리얼 영상 검색 결과' },
    { title: 'WordPress + MySQL with Docker Compose (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=wordpress+mysql+docker+compose', desc: 'WordPress 와 MySQL 을 Compose 로 올리는 영상 검색 결과' },
    { title: 'nginx reverse proxy docker compose (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=nginx+reverse+proxy+docker+compose', desc: 'nginx 리버스 프록시 · 로드 밸런싱을 Compose 로 구성하는 영상 검색 결과' },
    { title: 'Docker Compose 실전 강의 (검색 결과)', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=%EB%8F%84%EC%BB%A4+%EC%BB%B4%ED%8F%AC%EC%A6%88+%EC%8B%A4%EC%A0%84', desc: '한국어 Compose 실전(웹 + DB) 영상 검색 결과' },
    { title: '100+ Docker Concepts you Need to Know', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=rIrNIzy6U_g', lang: 'en', min: '9분', desc: 'Compose · 볼륨 · 네트워크 · 스케일 등 Docker 개념을 빠르게 훑는 복습용 영상' }
  ],

  terms: [
    ['build: .', '서비스 이미지를 받아 오지 않고 지정한 폴더의 Dockerfile 로 빌드. 이미지 이름은 기본적으로 프로젝트-서비스'],
    ['docker compose up --build', '이미지를 다시 빌드한 뒤 바뀐 서비스만 컨테이너를 새로 만드는 명령'],
    ['healthcheck', '컨테이너 안에서 주기적으로 명령을 실행해 healthy / unhealthy 를 판정하는 설정 (test · interval · timeout · retries · start_period)'],
    ['condition: service_healthy', 'depends_on 의 긴 형식. 대상 서비스가 healthy 가 될 때까지 이 서비스의 시작을 미룸'],
    ['service_completed_successfully', 'depends_on 조건. 대상 서비스가 종료 코드 0 으로 끝난 뒤 시작 (마이그레이션 등 일회성 작업)'],
    ['pg_isready · mysqladmin ping', 'Postgres · MySQL 이 접속을 받을 준비가 됐는지 확인하는 명령. 헬스체크에 자주 씀'],
    ['리버스 프록시', '클라이언트 요청을 대신 받아 뒤쪽 서버들에 전달하는 서버(nginx, Traefik 등). 포트는 프록시만 열고 앱은 숨김'],
    ['proxy_pass', 'nginx 에서 요청을 보낼 뒤쪽 주소를 지정하는 지시어. Compose 에서는 http://서비스이름:포트'],
    ['502 Bad Gateway', '프록시는 살아 있지만 뒤쪽 서버에 연결하지 못했을 때의 HTTP 응답'],
    ['--scale', 'docker compose up --scale 서비스=N 으로 같은 서비스 컨테이너를 N 개 실행. 고정 호스트 포트 · container_name 이 있으면 충돌'],
    ['stateless(무상태)', '요청 처리에 필요한 상태를 컨테이너 안에 두지 않는 설계. 여러 개로 늘리거나 교체해도 동작이 같음'],
    ['compose watch', 'develop.watch 규칙에 따라 파일 변경을 감지해 컨테이너로 sync 하거나 rebuild 하는 개발 기능'],
    ['profiles', '서비스에 붙이는 이름표. --profile 로 켤 때만 실행되는 선택적 서비스를 만듦'],
    ['compose.override.yaml', 'compose.yaml 과 같은 폴더에 있으면 자동으로 덧씌워지는 파일. 개발용 설정을 두는 곳. -f 로 여러 파일을 합칠 수도 있음']
  ],

  summary: [
    'build: . 는 내 Dockerfile 로 이미지를 만들어 서비스로 띄웁니다. 코드를 고쳤다면 docker compose up -d --build.',
    '앱 코드의 접속 주소는 서비스 이름(redis, db)입니다. 컨테이너 안의 localhost 는 자기 자신이라 옆 컨테이너로 가지 않습니다.',
    'DB 데이터는 이름 있는 볼륨에, 설정은 environment 로 넘깁니다. MYSQL_* · POSTGRES_* 초기화 변수는 볼륨이 비어 있을 때만 쓰입니다.',
    'depends_on 은 시작 순서만 보장합니다. DB 준비를 기다리려면 healthcheck + condition: service_healthy, 운영 중 끊김엔 앱의 재시도까지 두 겹으로 대비합니다.',
    '리버스 프록시(nginx proxy_pass http://app:5000)만 포트를 열고 앱은 뒤에 숨깁니다. 고정 ports 가 있는 서비스는 --scale 할 수 없으니 프록시 뒤에 둡니다.',
    '개발 중에는 바인드 마운트나 compose watch(sync · sync+restart · rebuild)로 빠르게 반영하고, profiles 로 선택 서비스를, override 파일로 환경별 설정을 나눕니다.'
  ],

  quiz: [
    { q: 'compose.yaml 의 web 서비스에 build: . 이 있고 폴더 이름이 counter 다. docker compose up 이 만드는 이미지 이름은?', options: ['web:latest', 'counter-web', 'counter_web_1', 'python:3.12-alpine'], answer: 1, explain: 'image: 를 따로 적지 않으면 빌드한 이미지 이름은 프로젝트-서비스(counter-web)가 됩니다.' },
    { q: 'Flask 앱이 같은 프로젝트의 redis 에 redis.Redis(host=\'localhost\') 로 접속한다. 결과는?', options: ['잘 접속된다', 'web 컨테이너 자기 자신의 6379 로 가서 Connection refused', '호스트 PC 의 redis 로 접속된다', 'Compose 가 자동으로 redis 로 바꿔 준다'], answer: 1, explain: '컨테이너 안의 localhost 는 그 컨테이너 자신입니다. host=\'redis\' 처럼 서비스 이름을 써야 합니다.' },
    { q: 'app 이 db 에 depends_on: [db] 로만 연결되어 있다. app 이 시작 직후 DB 에 접속하다 Connection refused 로 종료되었다. 가장 알맞은 해결은?', options: ['depends_on 을 두 번 적는다', 'db 에 healthcheck 를 달고 app 의 depends_on 을 condition: service_healthy 로 바꾼다', 'db 의 ports 를 5432:5432 로 연다', 'app 을 먼저 시작하게 순서를 바꾼다'], answer: 1, explain: '짧은 depends_on 은 "시작됨"까지만 기다립니다. 헬스체크 + service_healthy 로 준비 완료를 기다리게 합니다(앱의 재시도도 함께 두면 더 좋습니다).' },
    { q: 'ports: ["8000:5000"] 이 있는 web 서비스를 docker compose up -d --scale web=3 으로 늘리면?', options: ['8000, 8001, 8002 로 자동 배정된다', '두 번째 컨테이너부터 port is already allocated 오류', '세 컨테이너가 8000 을 나눠 쓴다', '자동으로 nginx 가 생긴다'], answer: 1, explain: '호스트 포트 하나는 한 컨테이너만 쓸 수 있습니다. 앱의 ports 를 빼고 프록시 뒤에 두는 것이 해결책입니다.' },
    { q: 'nginx 설정 proxy_pass http://app:5000; 에서 app 은 무엇인가?', options: ['nginx 이미지 이름', 'Compose 서비스 이름 (네트워크 DNS 로 컨테이너 IP 로 바뀜)', '호스트 PC 이름', '반드시 컨테이너 이름(proxy-app-1)이어야 한다'], answer: 1, explain: '같은 프로젝트 네트워크에서는 서비스 이름이 DNS 이름입니다. 스케일하면 이름 하나에 IP 여러 개가 등록됩니다.' },
    { q: 'profiles: ["debug"] 가 붙은 서비스는 언제 실행될까?', options: ['항상 실행된다', 'docker compose --profile debug up 처럼 프로필을 켤 때만', '다른 서비스가 실패할 때만', '절대 실행되지 않는다'], answer: 1, explain: '프로필이 붙은 서비스는 --profile(또는 COMPOSE_PROFILES)로 켤 때만 실행됩니다. 프로필 없는 서비스는 항상 실행됩니다.' },
    { q: 'compose.yaml 과 같은 폴더에 compose.override.yaml 이 있다. docker compose up -d 를 하면?', options: ['override 파일은 무시된다', '두 파일이 자동으로 합쳐지고, 같은 값은 override 가 덮어쓴다', 'override 파일만 읽는다', '오류가 난다'], answer: 1, explain: 'compose.override.yaml 은 자동으로 덧씌워집니다. -f 로 파일을 직접 지정하면 적은 파일만 읽습니다.' }
  ]
});
