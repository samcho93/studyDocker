/* 부록 — 명령어 치트시트 */
(function () {
  'use strict';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // [명령, 설명, 실행 가능?]  — 실행 가능(true)이면 눌러서 터미널에서 바로 실행
  const R = true, P = false;

  const GROUPS = [
    {
      icon: '🧱', title: '이미지', color: 'purple', rows: [
        ['docker pull nginx:1.27', '이미지 받기 (태그 생략 시 <code>:latest</code>)', R],
        ['docker images', '내 PC 의 이미지 목록 (= <code>docker image ls</code>)', R],
        ['docker image inspect nginx:1.27', '이미지 설정(Cmd · Env · ExposedPorts · 레이어) 전부 보기', R],
        ['docker history nginx:1.27', '이미지를 만든 명령과 레이어별 크기', R],
        ['docker tag nginx:1.27 myweb:1.0', '같은 이미지에 새 이름:태그 붙이기 (복사 아님)', R],
        ['docker rmi myweb:1.0', '이미지(태그) 지우기 — 쓰는 컨테이너가 있으면 거부', R],
        ['docker image prune -f', '이름 없는(dangling, <code>&lt;none&gt;</code>) 이미지 정리', R],
        ['docker scout quickview nginx:1.27', '이미지의 알려진 취약점 요약 (13장)', R]
      ]
    },
    {
      icon: '▶️', title: '컨테이너 실행 · 생명주기', color: 'green', rows: [
        ['docker run hello-world', '첫 컨테이너 — 설치 확인', R],
        ['docker run -d --name web -p 8080:80 nginx', '백그라운드(-d)로 이름 붙여, 호스트 8080 → 컨테이너 80', R],
        ['docker run -it --rm ubuntu bash', '대화형 셸로 들어가고, 나오면(<code>exit</code>) 컨테이너 자동 삭제', R],
        ['docker run --rm alpine echo hello', '명령 하나만 실행하고 끝 (일회용)', R],
        ['docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16-alpine', '환경 변수 + 이름 있는 볼륨으로 DB 실행', R],
        ['docker stop web', '정상 종료 (SIGTERM → 10초 뒤 SIGKILL)', R],
        ['docker start web', '멈춘 컨테이너 다시 시작 (설정 · 데이터 그대로)', R],
        ['docker restart web', '재시작', R],
        ['docker rm <이름>', '멈춘 컨테이너 지우기 (실행 중이면 <code>-f</code>)', P],
        ['docker rename <옛이름> <새이름>', '컨테이너 이름 바꾸기', P],
        ['docker update --memory 512m --memory-swap 512m <이름>', '실행 중인 컨테이너의 자원 제한 바꾸기', P]
      ]
    },
    {
      icon: '🔍', title: '조회 · 로그 · 상태', color: 'blue', rows: [
        ['docker ps', '실행 중인 컨테이너', R],
        ['docker ps -a', '멈춘 것까지 모두 (STATUS 의 종료 코드 확인)', R],
        ['docker logs web', '컨테이너 로그 (메인 프로세스의 stdout · stderr)', R],
        ['docker logs -f --tail 20 web', '마지막 20줄부터 계속 따라가기 — <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춤', R],
        ['docker inspect web', '컨테이너 설정 · 상태 전부 (JSON)', R],
        ['docker inspect -f "{{.State.Status}} {{.State.ExitCode}}" web', 'Go 템플릿으로 필요한 값만 꺼내기', R],
        ['docker port web', '게시된 포트 매핑', R],
        ['docker stats --no-stream', 'CPU · 메모리 사용량 한 번 보기 (<code>--no-stream</code> 없으면 계속)', R],
        ['docker top web', '컨테이너 안 프로세스 목록', R],
        ['docker events', '엔진에서 일어나는 일을 실시간으로 — <kbd>Ctrl</kbd>+<kbd>C</kbd>', R]
      ]
    },
    {
      icon: '🚪', title: '컨테이너 안으로 들어가기', color: 'teal', rows: [
        ['docker exec -it web bash', '실행 중인 컨테이너에 셸로 접속 (<code>exit</code> 로 나옴)', R],
        ['docker exec -it <alpine 계열 컨테이너> sh', 'alpine · busybox 계열에는 bash 가 없으니 <code>sh</code>', P],
        ['docker exec web ls /usr/share/nginx/html', '명령 하나만 안에서 실행', R],
        ['docker exec -u root <이름> <명령>', '다른 사용자(root)로 실행', P],
        ['docker cp web:/etc/nginx/nginx.conf ./nginx.conf', '컨테이너 → 호스트로 파일 복사 (반대 방향도 가능)', R]
      ]
    },
    {
      icon: '🌐', title: '네트워크', color: 'blue', rows: [
        ['docker network ls', '네트워크 목록 (bridge · host · none + 내가 만든 것)', R],
        ['docker network create mynet', '사용자 정의 bridge 네트워크 — 컨테이너 <b>이름으로 DNS</b> 가능', R],
        ['docker run -d --name api --network mynet traefik/whoami', '처음부터 네트워크에 붙여 실행', R],
        ['docker network connect mynet web', '실행 중인 컨테이너를 네트워크에 추가 연결', R],
        ['docker network inspect mynet', '연결된 컨테이너와 IP 보기', R],
        ['docker exec web curl -s http://api', '같은 네트워크의 다른 컨테이너를 이름으로 호출', R],
        ['docker network disconnect mynet web', '연결 끊기', R],
        ['docker network rm <이름>', '네트워크 지우기 (연결된 컨테이너가 없어야 함)', P]
      ]
    },
    {
      icon: '💾', title: '볼륨 · 마운트', color: 'orange', rows: [
        ['docker volume ls', '볼륨 목록', R],
        ['docker volume create mydata', '이름 있는 볼륨 만들기', R],
        ['docker volume inspect mydata', '볼륨의 실제 위치(Mountpoint)', R],
        ['docker run --rm -v mydata:/data alpine ls /data', '볼륨을 붙여 내용 확인', R],
        ['docker run -d -p 8081:80 -v ~/site:/usr/share/nginx/html:ro nginx', '바인드 마운트 — 호스트 폴더를 읽기 전용(:ro)으로 연결', P],
        ['docker run -d --tmpfs /tmp --read-only <이미지>', '읽기 전용 루트 + 메모리 임시 폴더', P],
        ['docker volume rm <이름>', '볼륨 지우기 (쓰는 컨테이너가 없어야 함)', P]
      ]
    },
    {
      icon: '📝', title: '빌드', color: 'purple', rows: [
        ['docker build -t myapp:1.0 .', '현재 폴더(빌드 컨텍스트)의 Dockerfile 로 이미지 만들기', P],
        ['docker build -t myapp:1.0 -f Dockerfile.prod .', '다른 이름의 Dockerfile 쓰기', P],
        ['docker build --no-cache -t myapp .', '레이어 캐시 없이 처음부터', P],
        ['docker build --build-arg VERSION=2 -t myapp .', 'ARG 값 넘기기', P],
        ['docker build --target builder -t myapp:build .', '멀티 스테이지 중 특정 단계까지만', P],
        ['docker buildx build --platform linux/amd64,linux/arm64 -t <이름> --push .', '여러 CPU 용 이미지를 한 번에 (11장)', P],
        ['docker builder prune -f', '빌드 캐시 정리', R]
      ]
    },
    {
      icon: '🧩', title: 'Compose (compose.yaml 이 있는 폴더에서)', color: 'yellow', rows: [
        ['docker compose up -d', '전부 만들고 백그라운드 실행 (바뀐 서비스만 다시 만듦)', P],
        ['docker compose up -d --build', '이미지를 다시 빌드하고 실행', P],
        ['docker compose ps', '이 프로젝트의 컨테이너 상태', P],
        ['docker compose logs -f <서비스>', '서비스 로그 따라가기', P],
        ['docker compose exec <서비스> sh', '서비스 컨테이너에 들어가기', P],
        ['docker compose up -d --scale <서비스>=3', '서비스 컨테이너 개수 늘리기', P],
        ['docker compose config', '변수(.env)까지 반영된 최종 설정 확인', P],
        ['docker compose down', '컨테이너 · 네트워크 지우기 (볼륨은 남김)', P],
        ['docker compose down -v', '이름 있는 볼륨까지 지우기 — ⚠️ DB 데이터 삭제', P],
        ['docker compose ls', '실행 중인 Compose 프로젝트 목록', R]
      ]
    },
    {
      icon: '📤', title: '레지스트리 · 배포', color: 'teal', rows: [
        ['docker login', 'Docker Hub 로그인 (<code>docker login ghcr.io</code> 처럼 다른 레지스트리도)', P],
        ['docker tag myapp:1.0 <사용자명>/myapp:1.0', 'Docker Hub 에 올릴 이름 붙이기', P],
        ['docker push <사용자명>/myapp:1.0', '레지스트리에 올리기', P],
        ['docker run -d -p 5000:5000 --name registry registry:2', '내 PC 에 사설 레지스트리 띄우기', R],
        ['docker tag nginx:1.27 localhost:5000/nginx:1.27', '사설 레지스트리 주소를 이름에 포함', R],
        ['docker push localhost:5000/nginx:1.27', '사설 레지스트리에 올리기', R],
        ['docker save -o nginx.tar nginx:1.27', '이미지를 tar 파일로 (인터넷 없는 곳에 옮길 때)', R],
        ['docker load -i nginx.tar', 'tar 파일에서 이미지 불러오기', R]
      ]
    },
    {
      icon: '🧹', title: '정리 · 공간 확보', color: 'red', rows: [
        ['docker system df', '이미지 · 컨테이너 · 볼륨 · 빌드 캐시가 차지한 공간', R],
        ['docker container prune -f', '멈춘 컨테이너 모두 지우기', R],
        ['docker image prune -a', '쓰는 컨테이너가 없는 이미지 <b>모두</b> 지우기 (확인 질문)', P],
        ['docker volume prune', '안 쓰는 볼륨 지우기 — ⚠️ 데이터 삭제 (확인 질문)', P],
        ['docker network prune -f', '안 쓰는 네트워크 지우기', R],
        ['docker system prune -f', '멈춘 컨테이너 + 안 쓰는 네트워크 + dangling 이미지 + 빌드 캐시', R],
        ['docker system prune -a --volumes', '안 쓰는 것 전부(볼륨 포함) — ⚠️ 가장 강력, 신중히', P]
      ]
    },
    {
      icon: '☸️', title: '쿠버네티스 — minikube', color: 'blue', rows: [
        ['minikube start', '로컬 클러스터 시작', R],
        ['minikube status', '클러스터 상태', R],
        ['minikube ip', '노드 IP', R],
        ['minikube addons list', '애드온 목록 (ingress · metrics-server 등)', R],
        ['minikube dashboard', '웹 대시보드 열기 (이 실습에서는 📊 대시보드 탭)', R]
      ]
    },
    {
      icon: '☸️', title: '쿠버네티스 — kubectl', color: 'purple', rows: [
        ['kubectl get nodes', '노드 목록', R],
        ['kubectl get pods -o wide', '파드 목록 + IP · 노드', R],
        ['kubectl get all', '파드 · 서비스 · 디플로이먼트 · 레플리카셋 한 번에', R],
        ['kubectl get pods -n kube-system', '컨트롤 플레인 구성 요소 파드', R],
        ['kubectl create deployment web --image=nginx --replicas=3', 'Deployment 만들기 (명령형)', R],
        ['kubectl expose deployment web --type=NodePort --port=80', 'Service 로 노출', R],
        ['minikube service web --url', 'NodePort 서비스의 접속 주소 (🌐 브라우저 탭에서 열기)', R],
        ['kubectl scale deployment web --replicas=5', '파드 개수 바꾸기', R],
        ['kubectl set image deployment/web nginx=nginx:1.27', '이미지 바꾸기 → 롤링 업데이트', R],
        ['kubectl rollout status deployment/web', '롤아웃 진행 상황 (끝날 때까지 대기)', R],
        ['kubectl rollout history deployment/web', '리비전 목록', R],
        ['kubectl rollout undo deployment/web', '이전 리비전으로 되돌리기', R],
        ['kubectl describe pod <파드>', '상세 + 맨 아래 Events (ImagePullBackOff 원인 등)', P],
        ['kubectl logs <파드>', '파드 로그 (<code>-f</code> 따라가기, <code>--previous</code> 직전 컨테이너)', P],
        ['kubectl logs deploy/web', 'Deployment 의 파드 하나 골라 로그 보기', R],
        ['kubectl exec -it <파드> -- sh', '파드 안에서 셸', P],
        ['kubectl exec deploy/web -- ls /usr/share/nginx/html', '파드 안에서 명령 하나', R],
        ['kubectl port-forward svc/web 9090:80', '내 PC 9090 → 서비스 80 (Ctrl+C 까지)', R],
        ['kubectl apply -f <파일 또는 폴더>', 'YAML 매니페스트 적용 (선언형)', P],
        ['kubectl delete -f <파일>', '매니페스트로 만든 것 지우기', P],
        ['kubectl create secret generic db-secret --from-literal=PASSWORD=secret', 'Secret 만들기', R],
        ['kubectl create configmap app-config --from-literal=MODE=dev', 'ConfigMap 만들기', R],
        ['kubectl get events', '최근 이벤트 (문제 추적)', R],
        ['kubectl delete deployment web', 'Deployment(와 그 파드) 지우기', R],
        ['minikube stop', '클러스터 멈추기 (다시 start 하면 이어서)', R],
        ['minikube delete', '클러스터 완전히 지우기', P]
      ]
    }
  ];

  const OPTS = [
    ['-d, --detach', '백그라운드 실행하고 컨테이너 ID 출력', '<code>docker run -d nginx</code>'],
    ['-it', '표준 입력 유지(-i) + 터미널(-t) — 셸 쓸 때', '<code>docker run -it ubuntu bash</code>'],
    ['--name', '컨테이너 이름 (없으면 무작위)', '<code>--name web</code>'],
    ['--rm', '종료되면 컨테이너 자동 삭제', '<code>docker run --rm alpine date</code>'],
    ['-p 호스트:컨테이너', '포트 게시. 오른쪽은 앱이 듣는 포트', '<code>-p 8080:80</code> · <code>-p 127.0.0.1:8080:80</code>'],
    ['-P', 'EXPOSE 된 포트를 무작위 호스트 포트로', '<code>docker run -d -P nginx</code>'],
    ['-e, --env-file', '환경 변수 / 파일로 한꺼번에', '<code>-e TZ=Asia/Seoul</code> · <code>--env-file .env</code>'],
    ['-v, --mount', '볼륨 · 바인드 마운트', '<code>-v data:/data</code> · <code>-v ./src:/app:ro</code>'],
    ['--network', '연결할 네트워크', '<code>--network mynet</code>'],
    ['-w, -u', '작업 폴더 / 실행 사용자', '<code>-w /app</code> · <code>-u 1000:1000</code>'],
    ['--restart', 'no · on-failure[:횟수] · always · unless-stopped', '<code>--restart unless-stopped</code>'],
    ['-m, --cpus', '메모리 · CPU 제한', '<code>-m 256m --cpus 0.5</code>'],
    ['--read-only, --tmpfs', '루트 파일 시스템 읽기 전용 / 메모리 임시 폴더', '<code>--read-only --tmpfs /tmp</code>'],
    ['--health-cmd', '헬스체크 명령 (+ --health-interval 등)', '<code>--health-cmd "curl -f localhost"</code>'],
    ['--entrypoint', '이미지의 ENTRYPOINT 바꾸기', '<code>--entrypoint sh</code>']
  ];

  const CODES = [
    ['0', '정상 종료 — 할 일을 마침', '메인 프로세스가 금방 끝나는 명령이면 컨테이너도 끝 (예: <code>-it</code> 없이 ubuntu)'],
    ['1', '앱 오류 (일반)', '<code>docker logs</code> — 환경 변수 누락 · 모듈 없음 · 권한 · 설정 오류'],
    ['2', '잘못된 사용 · 파일 없음', '<code>python3: can\'t open file</code> — 마운트가 앱 폴더를 가렸나?'],
    ['125', 'docker 명령 자체 실패', '잘못된 옵션 · 이름 충돌 등 (컨테이너가 시작도 못 함)'],
    ['126', '명령을 실행할 수 없음', '실행 권한 없음 (<code>chmod +x</code>)'],
    ['127', '명령을 찾을 수 없음', 'CMD 오타, 이미지에 없는 프로그램'],
    ['130', 'SIGINT (128+2)', '<kbd>Ctrl</kbd>+<kbd>C</kbd> 로 중단'],
    ['137', 'SIGKILL (128+9)', '메모리 초과(OOMKilled) 또는 <code>docker kill</code> · stop 타임아웃'],
    ['139', 'SIGSEGV (128+11)', '프로그램이 잘못된 메모리 접근으로 죽음'],
    ['143', 'SIGTERM (128+15)', '<code>docker stop</code> 으로 정상 종료 요청을 받고 끝남']
  ];

  const DF = [
    ['FROM', '베이스 이미지 (멀티 스테이지면 여러 번, <code>AS 이름</code>)', 'FROM python:3.12-slim'],
    ['WORKDIR', '작업 폴더 (없으면 만듦) — 이후 명령의 기준', 'WORKDIR /app'],
    ['COPY', '빌드 컨텍스트의 파일을 이미지로 (<code>--chown</code>, <code>--from=단계</code>)', 'COPY requirements.txt .'],
    ['ADD', 'COPY + URL · tar 자동 풀기 (보통은 COPY 권장)', 'ADD app.tar.gz /opt/'],
    ['RUN', '빌드할 때 실행 → 결과가 레이어로', 'RUN pip install -r requirements.txt'],
    ['ENV', '환경 변수 (실행 때도 남음)', 'ENV PYTHONUNBUFFERED=1'],
    ['ARG', '빌드할 때만 쓰는 변수', 'ARG VERSION=1.0'],
    ['EXPOSE', '앱이 듣는 포트 문서화 (게시는 -p)', 'EXPOSE 5000'],
    ['USER', '이후 명령 · 실행 사용자 (non-root 권장)', 'USER appuser'],
    ['CMD', '컨테이너 시작 명령 (run 뒤 인자로 바뀜)', 'CMD ["python", "app.py"]'],
    ['ENTRYPOINT', '고정 실행 파일 (CMD 는 그 인자가 됨)', 'ENTRYPOINT ["gunicorn"]'],
    ['HEALTHCHECK', '건강 검사 명령', 'HEALTHCHECK CMD curl -f http://localhost:5000/ || exit 1'],
    ['LABEL', '메타데이터', 'LABEL org.opencontainers.image.source=…'],
    ['VOLUME', '데이터 폴더 표시 (익명 볼륨이 붙음)', 'VOLUME /data']
  ];

  const CY = [
    ['services:', '실행할 서비스(컨테이너 종류)들 — 서비스 이름이 곧 DNS 이름', 'services:\n  web: …\n  db: …'],
    ['image / build', '받을 이미지 또는 빌드할 폴더', 'image: redis:7\nbuild: .'],
    ['ports', '포트 게시 (따옴표로 감싸기 권장)', 'ports:\n  - "8080:5000"'],
    ['environment / env_file', '환경 변수 / .env 파일', 'environment:\n  POSTGRES_PASSWORD: secret'],
    ['volumes', '볼륨 · 바인드 마운트 (맨 아래 최상위 <code>volumes:</code> 에 이름 선언)', 'volumes:\n  - dbdata:/var/lib/postgresql/data'],
    ['networks', '연결할 네트워크 (생략하면 프로젝트 기본 네트워크)', 'networks: [backend]'],
    ['depends_on', '시작 순서 · 조건 (<code>service_healthy</code> 는 healthcheck 필요)', 'depends_on:\n  db:\n    condition: service_healthy'],
    ['healthcheck', '건강 검사', 'healthcheck:\n  test: ["CMD-SHELL", "pg_isready -U postgres"]\n  interval: 5s'],
    ['restart', '재시작 정책', 'restart: unless-stopped'],
    ['command / entrypoint', 'CMD / ENTRYPOINT 바꾸기', 'command: ["npm", "run", "dev"]'],
    ['deploy.resources', '자원 제한', 'deploy:\n  resources:\n    limits:\n      memory: 256M'],
    ['profiles', '특정 프로필에서만 켜지는 서비스', 'profiles: [debug]']
  ];

  const cmdCell = ([c, , run]) => run ? `<code class="cmd">${esc(c)}</code>` : `<code>${esc(c)}</code>`;
  const group = (g, i) => `<section class="l-sec cs-sec"><h2><span class="sn">${g.icon}</span>${esc(g.title)}</h2>
<div class="tbl-wrap"><table class="tbl"><tr><th style="width:52%">명령</th><th>설명</th></tr>${g.rows.map(r => `<tr class="cs-r"><td>${cmdCell(r)}</td><td>${r[1]}</td></tr>`).join('')}</table></div></section>`;
  const pre = s => `<pre class="code" style="margin:0;font-size:12.5px"><code>${esc(s)}</code></pre>`;
  const filterJs = "var q=this.value.trim().toLowerCase();document.querySelectorAll('.cs-sec').forEach(function(s){var n=0;s.querySelectorAll('tr.cs-r').forEach(function(r){var h=!!q&&r.textContent.toLowerCase().indexOf(q)<0;r.classList.toggle('hidden',h);if(!h)n++;});s.classList.toggle('hidden',!!q&&!n);});";

  Course.lesson({
    id: 'cheatsheet', icon: '📋', title: '명령어 치트시트', special: true,
    chips: ['docker ps -a', 'docker images', 'docker system df', 'kubectl get all', 'help'],
    render() {
      return `<article class="lesson">
<header class="l-head">
  <div class="l-kicker"><span class="l-no">부록</span><span class="chip">docker · compose · kubectl</span></div>
  <h1><span class="l-icon">📋</span>명령어 치트시트</h1>
  <p class="l-sub">자주 쓰는 명령을 한 장에. <code class="cmd">docker ps</code> 처럼 <b>▶ 표시가 있는 명령은 누르면 오른쪽 터미널에서 바로 실행</b>됩니다.
  <code>&lt;이름&gt;</code> 처럼 꺾쇠가 있는 것은 자기 값으로 바꿔 직접 입력하세요.</p>
</header>
<input class="nav-search" type="search" placeholder="🔍 명령 · 설명 검색 (예: 볼륨, logs, 포트, rollout)" oninput="${filterJs}" style="margin:0 0 8px">
<div class="box tip"><div class="box-t">💡 순서대로 눌러 보면 실습이 됩니다</div>
각 표의 ▶ 명령은 위에서 아래로 누르면 이어지도록 골랐습니다. 예: <b>컨테이너 실행</b> 표의 <code>docker run -d --name web -p 8080:80 nginx</code> 로 <code>web</code> 을 만든 뒤,
<b>조회</b> · <b>안으로 들어가기</b> · <b>네트워크</b> 표의 명령을 누르면 그 <code>web</code> 을 대상으로 동작합니다. 쿠버네티스 표는 <code>minikube start</code> 부터.</div>

${GROUPS.map(group).join('\n')}

<section class="l-sec cs-sec"><h2><span class="sn">⚙️</span>docker run 자주 쓰는 옵션</h2>
<div class="tbl-wrap"><table class="tbl"><tr><th>옵션</th><th>뜻</th><th>예</th></tr>${OPTS.map(o => `<tr class="cs-r"><td><code>${esc(o[0])}</code></td><td>${o[1]}</td><td>${o[2]}</td></tr>`).join('')}</table></div></section>

<section class="l-sec cs-sec"><h2><span class="sn">🚦</span>종료 코드 읽기 (<code>Exited (N)</code>)</h2>
<div class="tbl-wrap"><table class="tbl"><tr><th>코드</th><th>뜻</th><th>흔한 원인 · 확인할 것</th></tr>${CODES.map(o => `<tr class="cs-r"><td><b>${o[0]}</b></td><td>${o[1]}</td><td>${o[2]}</td></tr>`).join('')}</table></div>
<p class="muted small">128 보다 큰 코드는 대개 <b>128 + 시그널 번호</b>입니다. 쿠버네티스에서는 <code>kubectl describe pod</code> 의 <code>Last State: Terminated · Exit Code</code> 에서 같은 숫자를 봅니다.</p></section>

<section class="l-sec cs-sec"><h2><span class="sn">📝</span>Dockerfile 명령 요약</h2>
<div class="tbl-wrap"><table class="tbl"><tr><th>명령</th><th>뜻</th><th>예</th></tr>${DF.map(o => `<tr class="cs-r"><td><code>${o[0]}</code></td><td>${o[1]}</td><td><code>${esc(o[2])}</code></td></tr>`).join('')}</table></div>
<div class="box dev"><div class="box-t">👩‍💻 좋은 Dockerfile 체크리스트</div>
작은 베이스(<code>-slim</code> · <code>-alpine</code> · distroless) · 자주 안 바뀌는 것(의존성 설치)을 먼저 COPY/RUN 해서 캐시 살리기 · <code>.dockerignore</code> ·
멀티 스테이지로 빌드 도구 빼기 · <code>USER</code> 로 non-root · CMD 는 JSON 배열 형식 · 태그는 <code>latest</code> 대신 버전 고정.</div></section>

<section class="l-sec cs-sec"><h2><span class="sn">🧩</span>compose.yaml 키 요약</h2>
<div class="tbl-wrap"><table class="tbl"><tr><th>키</th><th>뜻</th><th>예</th></tr>${CY.map(o => `<tr class="cs-r"><td><code>${esc(o[0])}</code></td><td>${o[1]}</td><td>${pre(o[2])}</td></tr>`).join('')}</table></div>
<p class="muted small">Compose v2 기준: 명령은 <code>docker compose</code>(하이픈 없음), 파일 맨 위에 <code>version:</code> 은 쓰지 않습니다.</p></section>
</article>`;
    }
  });
})();
