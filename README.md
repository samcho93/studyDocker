# 🐳 Docker 쉽게 배우기

**설치 없이 브라우저에서 바로 실습하는** Docker · 컨테이너 한국어 강좌입니다.
페이지 오른쪽에 **진짜처럼 동작하는 가상 Docker 엔진**이 들어 있어서, 명령을 치면 이미지가 내려받아지고 컨테이너가 뜨고,
게시한 포트의 웹 페이지를 브라우저 탭에서 바로 열어 볼 수 있습니다.

- 강좌: https://samcho93.github.io/studyDocker/
- 실습실(장애 대응 시나리오): https://samcho93.github.io/studyDocker/#lab · 치트시트: https://samcho93.github.io/studyDocker/#cheatsheet

## 화면 구성 — 3단

| 왼쪽 | 가운데 | 오른쪽 |
|---|---|---|
| 📚 목차 · 진도 · 검색 | 📖 강의 (그림 · 표 · ▶ 실행 버튼 · 퀴즈 · 영상) | 🧪 실습 결과 — 🖥️ 터미널 · 📊 대시보드 · 🌐 브라우저 · 📝 파일 · 🎯 미션 |

가운데와 오른쪽 경계선을 끌어 크기를 바꿀 수 있습니다. 좁은 화면(모바일)에서는 🧪 실습 버튼으로 실습 화면을 엽니다.

## 강좌 구성

| 부 | 장 | 내용 |
|---|---|---|
| 1부 시작하기 | 00 ~ 03 | 컨테이너란? · 설치와 첫 컨테이너 · 이미지 · 컨테이너 생명주기 |
| 2부 핵심 | 04 ~ 08 | 포트와 네트워크 · 볼륨과 바인드 마운트 · Dockerfile · 멀티 스테이지와 최적화 · 설정/자원/재시작/헬스체크 |
| 3부 여러 컨테이너 | 09 ~ 11 | Compose 기초 · Compose 실전(Flask+Redis, WordPress+MySQL, 리버스 프록시) · 레지스트리와 배포 |
| 4부 운영 · 확장 | 12 ~ 16 | 디버깅과 문제 해결 · 보안 · 동작 원리 · 쿠버네티스 입문 · 개발 워크플로와 생태계 |
| 부록 | | 🧪 실습실 · 장애 대응 시나리오 · 📋 명령어 치트시트 · 🎬 추천 영상 · 📖 용어 사전 |

각 장: 학습 목표 → 그림 중심 본문 → **▶ 터미널에서 실행 / 📄 파일로 저장** → 🎯 자동 채점 미션(장애 상황 포함) → 핵심 정리 · 용어 → ✅ 퀴즈 → 🎬 영상

## 브라우저 속 가상 Docker

| 기능 | 내용 |
|---|---|
| 🖥️ 터미널 | bash 흉내(파이프 · 리다이렉트 · `$(...)` · 변수 · for/while/if), 여러 탭, ↑↓ 기록, Tab 자동 완성, Ctrl+C, `docker run -it` · `docker exec -it` 대화형 세션, Ctrl+P Ctrl+Q 분리 |
| 🐳 Docker CLI | run · create · start/stop/restart/kill/pause · rm · ps(--format, --filter) · logs(-f) · exec · attach · inspect(--format 템플릿) · top · port · stats · cp · diff · commit · images · pull · push · tag · rmi · history · save/load · login · search · network · volume · system df/prune · events · scout · init · buildx · build(BuildKit 출력, 레이어 캐시, 멀티 스테이지, .dockerignore, ARG/ENV/USER/HEALTHCHECK) |
| 🧩 Compose v2 | up(-d, --build, --scale) · down(-v) · ps · logs(-f) · exec · run · build · pull · config · stop/start/restart · ls · watch, depends_on(condition: service_healthy), healthcheck, .env 치환, 명명된 볼륨 · 네트워크 |
| ☸️ 쿠버네티스 | minikube start · kubectl get/describe/apply/create/expose/scale/set image/rollout/logs/exec/port-forward/delete, Deployment · ReplicaSet · Pod · Service(NodePort) · ConfigMap · Secret, 자동 복구 · 롤링 업데이트 · ImagePullBackOff · CrashLoopBackOff |
| 📦 컨테이너 속 프로그램 | nginx(설정 · proxy_pass) · httpd · redis(+redis-cli) · postgres(+psql) · mysql/mariadb(+mysql) · mongo(+mongosh) · wordpress · adminer · registry · whoami · stress, 그리고 **학생이 작성한 Python(Flask/FastAPI) · Node(Express) · Go · Spring Boot 앱 흉내 실행** |
| 🌐 가상 네트워크 | 포트 게시(-p), 기본 bridge(이름 DNS 없음) vs 사용자 정의 네트워크(내장 DNS), host/none, 격리, 127.0.0.1 바인딩 문제, 포트 충돌 |
| 💾 데이터 | 컨테이너 쓰기 층(overlay 흉내), 볼륨 · 바인드 마운트(파일 탭과 연결) · tmpfs · :ro, DB 데이터 유지 |
| 🎯 미션 | 장마다 4~8개 + 실습실 시나리오 — 엔진 상태를 보고 자동 채점, ⚙️ 상황 만들기 · 💡 힌트 · 🔑 정답 |

> 교육용 시뮬레이터입니다. 실제 리눅스 커널 · 인터넷에 연결되지 않으며, 명령 · 출력은 Docker Engine 27 / Compose v2 / Kubernetes 1.31 을 기준으로 최대한 같게 만들었습니다.
> 배운 명령은 실제 Docker 에서도 그대로 동작합니다.

## 실행

GitHub Pages(Settings → Pages → `main` / root)로 바로 동작합니다. 로컬에서는 아래처럼 정적 서버로 엽니다.

```bash
python -m http.server 8080
```

## 폴더 구조

```
index.html              3단 화면
css/style.css · diagram.css   본문 · 그림 스타일      css/lab.css   실습 화면 스타일
js/util.js · vfs.js · shell.js        공용 도구 · 가상 파일 시스템 · 작은 bash
js/hub.js                             가상 Docker Hub (이미지 목록 · 크기 · 레이어)
js/engine.js                          가상 Docker 엔진 (이미지 · 컨테이너 · 네트워크 · 볼륨 · 프로세스 · HTTP)
js/apps.js · apps-db.js · apps-code.js 컨테이너 속 프로그램 · DB · 앱 코드 흉내
js/docker-cli.js · build.js · compose.js · kube.js   docker · build · compose · kubectl/minikube
js/host.js · term.js · lab.js · missions.js           호스트 셸 · 터미널 · 실습 화면 · 미션 채점
js/course.js · render.js · widgets.js · app.js        커리큘럼 · 렌더링 · 위젯 · 앱
lessons/chNN.js · lab.js · cheatsheet.js              강의 콘텐츠
docs/LESSON_GUIDE.md    강의 작성 가이드
tools/sim.cjs           node 로 시뮬레이터 실행:  node tools/sim.cjs "docker run -d -p 8080:80 nginx" "curl -s localhost:8080"
tools/validate.cjs      강의 검증 (미션 정답을 실제로 실행해 채점):  node tools/validate.cjs ch05 --blocks
```
