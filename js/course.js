/* ===================================================================
   Docker 강좌 — 커리큘럼 & 강의 등록
   각 lessons/chNN.js 파일이 Course.lesson({...}) 으로 자기 내용을 등록한다.
   =================================================================== */
(function () {
  'use strict';

  const PARTS = [
    { id: 'p1', title: '1부 · 컨테이너 시작하기', items: ['ch00', 'ch01', 'ch02', 'ch03'] },
    { id: 'p2', title: '2부 · Docker 핵심 다지기', items: ['ch04', 'ch05', 'ch06', 'ch07', 'ch08'] },
    { id: 'p3', title: '3부 · 여러 컨테이너와 배포', items: ['ch09', 'ch10', 'ch11'] },
    { id: 'p4', title: '4부 · 운영 · 원리 · 확장', items: ['ch12', 'ch13', 'ch14', 'ch15', 'ch16'] },
    { id: 'px', title: '부록', items: ['lab', 'cheatsheet', 'videos', 'glossary'] }
  ];

  const OUTLINE = {
    ch00: { icon: '📦', title: '컨테이너란 무엇인가?', summary: '"내 컴퓨터에선 되는데…" 문제, 가상 머신과 컨테이너, 이미지와 컨테이너, Docker 의 역사와 생태계' },
    ch01: { icon: '🐳', title: 'Docker 설치와 첫 컨테이너', summary: 'Docker Desktop · Engine 설치, 클라이언트 · 데몬 · 레지스트리 구조, hello-world 가 실행되는 과정' },
    ch02: { icon: '🧱', title: '이미지 다루기', summary: 'pull · images · rmi, 이름:태그, 다이제스트, 레이어와 공유, history, Docker Hub 에서 좋은 이미지 고르기' },
    ch03: { icon: '🔄', title: '컨테이너 생명주기', summary: 'run 옵션(-d -it --name --rm), ps · logs · exec · stop · start · rm, 상태 변화와 종료 코드' },
    ch04: { icon: '🌐', title: '포트와 네트워크', summary: '포트 게시(-p), bridge · host · none, 사용자 정의 네트워크와 DNS, 컨테이너끼리 통신하기' },
    ch05: { icon: '💾', title: '데이터 관리 — 볼륨과 바인드 마운트', summary: '컨테이너 쓰기 층의 한계, 볼륨 · 바인드 마운트 · tmpfs, 데이터베이스 데이터 지키기, 백업' },
    ch06: { icon: '📝', title: 'Dockerfile 로 이미지 만들기', summary: 'FROM · RUN · COPY · WORKDIR · CMD, 빌드 컨텍스트와 .dockerignore, 레이어 캐시, 파이썬 · 노드 앱 이미지' },
    ch07: { icon: '🏗️', title: 'Dockerfile 심화 — 작고 안전한 이미지', summary: 'CMD vs ENTRYPOINT, 멀티 스테이지 빌드, 이미지 크기 줄이기, non-root 사용자, ARG · LABEL · HEALTHCHECK' },
    ch08: { icon: '⚙️', title: '설정 · 자원 · 재시작', summary: '환경 변수와 .env, 메모리 · CPU 제한과 OOM, 재시작 정책, 헬스체크, 로그 관리' },
    ch09: { icon: '🧩', title: 'Docker Compose 기초', summary: 'compose.yaml 구조, services · networks · volumes, up · down · ps · logs · exec, 서비스 이름으로 통신' },
    ch10: { icon: '🚀', title: 'Compose 실전 — 웹 · DB · 캐시', summary: 'Flask + Redis, WordPress + MySQL, depends_on 과 healthcheck, 리버스 프록시, 확장(scale), 개발용 설정' },
    ch11: { icon: '📤', title: '레지스트리와 이미지 배포', summary: 'Docker Hub · GHCR, tag · push · pull, 사설 레지스트리(registry:2), 태그 전략, save · load, 멀티 플랫폼' },
    ch12: { icon: '🩺', title: '디버깅과 문제 해결', summary: '로그 · inspect · exec · events · stats, 종료 코드 읽기, 자주 만나는 오류 20가지와 해결 순서' },
    ch13: { icon: '🔒', title: '보안과 모범 사례', summary: 'root 로 실행하지 않기, 비밀 정보 다루기, 취약점 스캔(docker scout), 읽기 전용 · capabilities, 공급망 보안' },
    ch14: { icon: '🔬', title: '컨테이너의 속 — 동작 원리', summary: '네임스페이스 · cgroups · 유니온 파일 시스템, runc · containerd, OCI 표준, 컨테이너는 결국 프로세스' },
    ch15: { icon: '☸️', title: '쿠버네티스 입문', summary: 'Pod · Deployment · Service, kubectl, 자동 복구 · 확장 · 롤링 업데이트, Compose 와 비교' },
    ch16: { icon: '🛠️', title: '개발 워크플로와 생태계', summary: 'CI/CD(GitHub Actions)로 이미지 빌드, Dev Containers, Podman · containerd · Buildah, 추천 도구 · 로드맵' },
    lab: { icon: '🧪', title: '실습실 · 장애 대응 시나리오', summary: '자유 실습 + "왜 안 되지?" 상황 20가지를 직접 해결하는 문제 풀이', special: true },
    cheatsheet: { icon: '📋', title: '명령어 치트시트', summary: 'docker · compose · kubectl 자주 쓰는 명령 한눈에 (눌러서 바로 실행)', special: true },
    videos: { icon: '🎬', title: '추천 영상 모음', summary: '모든 장의 유튜브 영상을 한곳에서', special: true },
    glossary: { icon: '📖', title: '용어 사전', summary: '강좌에 나오는 핵심 용어 정리', special: true }
  };

  const lessons = {};

  window.Course = {
    parts: PARTS,
    outline: OUTLINE,
    lessons,
    title: 'Docker 쉽게 배우기',
    lesson(def) {
      if (!def || !def.id) throw new Error('Course.lesson: id 가 필요합니다');
      const o = OUTLINE[def.id] || {};
      lessons[def.id] = Object.assign({ icon: o.icon, title: o.title, summary: o.summary }, def);
    },
    info(id) {
      if (!id) return null;
      const l = lessons[id], o = OUTLINE[id];
      if (!l && !o) return null;
      return Object.assign({}, o || {}, l || {}, { missing: !l && !(o && o.special) });
    },
    order() { return PARTS.reduce((a, p) => a.concat(p.items), []); }
  };
})();
