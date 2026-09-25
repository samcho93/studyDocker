/* 15장 — 쿠버네티스 입문 */
Course.lesson({
  id: 'ch15', no: '15',
  icon: '☸️',
  title: '쿠버네티스 입문',
  subtitle: '컨테이너가 수십 · 수백 개가 되면 누가 돌봐 줄까? — 스스로 고치고, 늘리고, 멈추지 않고 바꾸는 시스템',
  level: '중급', time: '150분',
  goals: [
    '오케스트레이션이 왜 필요한지(여러 서버 · 자동 복구 · 확장 · 무중단 배포) 설명하고 Compose 와 비교할 수 있다',
    '컨트롤 플레인(api-server · etcd · scheduler · controller-manager)과 노드(kubelet · kube-proxy · 런타임)의 역할을 그림으로 설명할 수 있다',
    'minikube 로 로컬 클러스터를 만들고 kubectl get · describe · logs · exec · apply · delete 를 쓸 수 있다',
    'Pod · Deployment(ReplicaSet) · Service 를 만들고 YAML 로 선언해 kubectl apply -f 로 적용할 수 있다',
    '자동 복구 · scale · 롤링 업데이트 · 되돌리기를 해 보고, ImagePullBackOff · CrashLoopBackOff 를 읽고 고칠 수 있다'
  ],
  chips: ['kubectl get pods', 'kubectl get all', 'kubectl get deploy,svc', 'kubectl get events', 'minikube status'],

  figs: {
    /* ------------------------------------------------ 클러스터 구조 */
    cluster: {
      caption: '쿠버네티스 클러스터 = 두뇌(컨트롤 플레인) + 손발(워커 노드). kubectl 은 언제나 api-server 하고만 이야기합니다',
      svg: `<svg class="dg" viewBox="0 0 880 400" role="img" aria-label="쿠버네티스 클러스터 구조: 컨트롤 플레인과 워커 노드">
  <rect x="20" y="150" width="130" height="84" rx="12" class="orange"/>
  <text x="85" y="180" class="t-b t-c">👩‍💻 kubectl</text>
  <text x="85" y="206" class="t-xs t-c t-mu">명령 · YAML</text>
  <line x1="152" y1="192" x2="222" y2="118" class="ln thick ar"/>

  <rect x="200" y="20" width="310" height="360" rx="16" class="blue"/>
  <text x="355" y="46" class="t-b t-c t-blue">🧠 컨트롤 플레인</text>
  <text x="355" y="68" class="t-xs t-c t-mu">공장 관리 사무실 — 결정하고 지시하는 곳</text>
  <rect x="225" y="86" width="260" height="58" rx="10" class="box"/>
  <text x="355" y="108" class="t-sm t-b t-c t-mono">kube-apiserver</text>
  <text x="355" y="130" class="t-xs t-c">모든 요청이 드나드는 단 하나의 창구</text>
  <rect x="225" y="156" width="260" height="58" rx="10" class="box"/>
  <text x="355" y="178" class="t-sm t-b t-c t-mono">etcd</text>
  <text x="355" y="200" class="t-xs t-c">클러스터 상태를 적어 두는 장부(DB)</text>
  <rect x="225" y="226" width="260" height="58" rx="10" class="box"/>
  <text x="355" y="248" class="t-sm t-b t-c t-mono">kube-scheduler</text>
  <text x="355" y="270" class="t-xs t-c">새 파드를 어느 노드에 둘지 배정</text>
  <rect x="225" y="296" width="260" height="58" rx="10" class="box"/>
  <text x="355" y="318" class="t-sm t-b t-c t-mono">kube-controller-manager</text>
  <text x="355" y="340" class="t-xs t-c">원하는 상태 ↔ 실제 상태 맞추기</text>

  <rect x="560" y="20" width="300" height="170" rx="16" class="gray"/>
  <text x="710" y="44" class="t-b t-c">🖥️ 워커 노드 1</text>
  <rect x="575" y="58" width="84" height="36" rx="8" class="box"/><text x="617" y="76" class="t-xs t-c t-mono">kubelet</text>
  <rect x="667" y="58" width="92" height="36" rx="8" class="box"/><text x="713" y="76" class="t-xs t-c t-mono">kube-proxy</text>
  <rect x="767" y="58" width="80" height="36" rx="8" class="box"/><text x="807" y="76" class="t-xs t-c t-mono">containerd</text>
  <rect x="580" y="110" width="80" height="62" rx="12" class="green"/><text x="620" y="134" class="t-sm t-b t-c">Pod</text><text x="620" y="156" class="t-xs t-c t-mono">web</text>
  <rect x="670" y="110" width="80" height="62" rx="12" class="green"/><text x="710" y="134" class="t-sm t-b t-c">Pod</text><text x="710" y="156" class="t-xs t-c t-mono">web</text>
  <rect x="760" y="110" width="80" height="62" rx="12" class="teal"/><text x="800" y="134" class="t-sm t-b t-c">Pod</text><text x="800" y="156" class="t-xs t-c t-mono">db</text>

  <rect x="560" y="210" width="300" height="170" rx="16" class="gray"/>
  <text x="710" y="234" class="t-b t-c">🖥️ 워커 노드 2</text>
  <rect x="575" y="248" width="84" height="36" rx="8" class="box"/><text x="617" y="266" class="t-xs t-c t-mono">kubelet</text>
  <rect x="667" y="248" width="92" height="36" rx="8" class="box"/><text x="713" y="266" class="t-xs t-c t-mono">kube-proxy</text>
  <rect x="767" y="248" width="80" height="36" rx="8" class="box"/><text x="807" y="266" class="t-xs t-c t-mono">containerd</text>
  <rect x="580" y="300" width="80" height="62" rx="12" class="green"/><text x="620" y="324" class="t-sm t-b t-c">Pod</text><text x="620" y="346" class="t-xs t-c t-mono">web</text>
  <rect x="670" y="300" width="80" height="62" rx="12" class="green pulse"/><text x="710" y="324" class="t-sm t-b t-c">Pod</text><text x="710" y="346" class="t-xs t-c t-mono">새로 배정</text>

  <line x1="487" y1="115" x2="571" y2="80" class="ln-blue ar-blue dash"/>
  <line x1="487" y1="122" x2="571" y2="266" class="ln-blue ar-blue dash"/>
  <text x="528" y="200" class="t-xs t-c t-blue">지시</text>
</svg>`
    },

    /* ------------------------------------------------ 조정 루프 */
    reconcile: {
      caption: '쿠버네티스의 핵심 아이디어: "원하는 상태"를 적어 두면 컨트롤러가 실제 상태를 끝없이 그쪽으로 맞춥니다 (조정 루프)',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="원하는 상태와 실제 상태를 맞추는 조정 루프">
  <rect x="20" y="40" width="240" height="120" rx="14" class="blue"/>
  <text x="140" y="70" class="t-b t-c t-blue">📝 원하는 상태</text>
  <text x="140" y="98" class="t-sm t-c t-mono">replicas: 3</text>
  <text x="140" y="122" class="t-sm t-c t-mono">image: nginx:1.27</text>
  <text x="140" y="146" class="t-xs t-c t-mu">YAML 로 선언 → etcd 에 저장</text>

  <rect x="320" y="40" width="240" height="120" rx="14" class="purple"/>
  <text x="440" y="70" class="t-b t-c t-purple">🔁 컨트롤러</text>
  <text x="440" y="98" class="t-sm t-c">"3개여야 하는데 2개네?"</text>
  <text x="440" y="122" class="t-sm t-c">→ 파드 1개 새로 만들기</text>
  <text x="440" y="146" class="t-xs t-c t-mu">몇 초마다 계속 확인</text>

  <rect x="620" y="40" width="240" height="120" rx="14" class="orange"/>
  <text x="740" y="70" class="t-b t-c t-orange">👀 실제 상태</text>
  <text x="740" y="98" class="t-sm t-c">파드 2개 Running</text>
  <text x="740" y="122" class="t-sm t-c">(1개는 노드와 함께 사라짐)</text>
  <text x="740" y="146" class="t-xs t-c t-mu">kubelet 이 보고</text>

  <line x1="262" y1="100" x2="316" y2="100" class="ln thick ar"/>
  <line x1="618" y1="100" x2="564" y2="100" class="ln thick ar"/>
  <path d="M440 162 Q440 225 740 225 L740 166" class="ln-purple thick ar-purple dash moving" fill="none"/>
  <text x="560" y="214" class="t-xs t-c t-purple">파드 생성 · 삭제로 실제 상태를 바꿈</text>
</svg>`
    },

    /* ------------------------------------------------ Deployment → ReplicaSet → Pod → Service */
    objects: {
      caption: 'Deployment 가 ReplicaSet 을 만들고, ReplicaSet 이 파드 개수를 지킵니다. Service 는 라벨(app=web)로 파드를 찾아 요청을 나눠 줍니다',
      svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="Deployment, ReplicaSet, Pod, Service 의 관계">
  <rect x="20" y="30" width="210" height="100" rx="14" class="purple"/>
  <text x="125" y="58" class="t-b t-c t-purple">🚀 Deployment</text>
  <text x="125" y="84" class="t-xs t-c t-mono">name: web · replicas: 3</text>
  <text x="125" y="106" class="t-xs t-c t-mono">image: nginx:1.27</text>
  <line x1="232" y1="80" x2="286" y2="80" class="ln thick ar"/>
  <text x="259" y="68" class="t-xs t-c t-mu">만든다</text>

  <rect x="290" y="30" width="220" height="100" rx="14" class="blue"/>
  <text x="400" y="58" class="t-b t-c t-blue">📋 ReplicaSet</text>
  <text x="400" y="84" class="t-xs t-c t-mono">web-5d8f…</text>
  <text x="400" y="106" class="t-xs t-c">파드 개수를 3개로 유지</text>

  <line x1="360" y1="132" x2="170" y2="196" class="ln ar"/>
  <line x1="400" y1="132" x2="330" y2="196" class="ln ar"/>
  <line x1="440" y1="132" x2="490" y2="196" class="ln ar"/>

  <rect x="100" y="200" width="140" height="84" rx="14" class="green"/>
  <text x="170" y="226" class="t-b t-c">📦 Pod</text><text x="170" y="250" class="t-xs t-c t-mono">app=web</text><text x="170" y="270" class="t-xs t-c t-mu">10.244.0.4</text>
  <rect x="260" y="200" width="140" height="84" rx="14" class="green"/>
  <text x="330" y="226" class="t-b t-c">📦 Pod</text><text x="330" y="250" class="t-xs t-c t-mono">app=web</text><text x="330" y="270" class="t-xs t-c t-mu">10.244.0.5</text>
  <rect x="420" y="200" width="140" height="84" rx="14" class="green"/>
  <text x="490" y="226" class="t-b t-c">📦 Pod</text><text x="490" y="250" class="t-xs t-c t-mono">app=web</text><text x="490" y="270" class="t-xs t-c t-mu">10.244.0.6</text>

  <rect x="640" y="30" width="220" height="70" rx="14" class="gray"/>
  <text x="750" y="58" class="t-b t-c">👤 사용자 요청</text>
  <text x="750" y="82" class="t-xs t-c t-mono">http://노드IP:30080</text>
  <line x1="750" y1="102" x2="750" y2="176" class="ln thick ar"/>

  <rect x="640" y="180" width="220" height="110" rx="14" class="orange"/>
  <text x="750" y="208" class="t-b t-c t-orange">🔀 Service web</text>
  <text x="750" y="234" class="t-xs t-c t-mono">selector: app=web</text>
  <text x="750" y="256" class="t-xs t-c t-mono">ClusterIP 10.96.x.x</text>
  <text x="750" y="278" class="t-xs t-c t-mono">NodePort 30080</text>

  <path d="M750 292 L750 325 L170 325" class="ln-orange dash" fill="none"/>
  <line x1="170" y1="325" x2="170" y2="290" class="ln-orange ar-orange"/>
  <line x1="330" y1="325" x2="330" y2="290" class="ln-orange ar-orange"/>
  <line x1="490" y1="325" x2="490" y2="290" class="ln-orange ar-orange"/>
  <text x="600" y="344" class="t-xs t-c t-orange">라벨이 맞는 Ready 파드로 골고루 전달</text>
</svg>`
    },

    /* ------------------------------------------------ Service 종류 */
    svctypes: {
      caption: 'Service 종류는 "어디까지 열어 줄까"의 차이입니다. 바깥 상자는 안쪽 상자의 기능을 모두 포함합니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="ClusterIP, NodePort, LoadBalancer 의 포함 관계">
  <rect x="20" y="16" width="840" height="270" rx="16" class="purple"/>
  <text x="40" y="42" class="t-sm t-b t-purple">LoadBalancer — 클라우드 로드밸런서의 외부 IP 로 열기 (minikube 에서는 minikube tunnel)</text>
  <rect x="40" y="58" width="800" height="214" rx="14" class="orange"/>
  <text x="60" y="84" class="t-sm t-b t-orange">NodePort — 모든 노드의 30000~32767 포트로 열기 (예: 노드IP:30080)</text>
  <rect x="60" y="100" width="760" height="158" rx="12" class="blue"/>
  <text x="80" y="126" class="t-sm t-b t-blue">ClusterIP (기본값) — 클러스터 안에서만 쓰는 가상 IP + DNS 이름 "web"</text>
  <rect x="90" y="150" width="130" height="80" rx="12" class="green"/><text x="155" y="182" class="t-sm t-b t-c">Pod</text><text x="155" y="206" class="t-xs t-c t-mono">app=web</text>
  <rect x="240" y="150" width="130" height="80" rx="12" class="green"/><text x="305" y="182" class="t-sm t-b t-c">Pod</text><text x="305" y="206" class="t-xs t-c t-mono">app=web</text>
  <rect x="390" y="150" width="130" height="80" rx="12" class="green"/><text x="455" y="182" class="t-sm t-b t-c">Pod</text><text x="455" y="206" class="t-xs t-c t-mono">app=web</text>
  <rect x="600" y="150" width="200" height="80" rx="12" class="box"/>
  <text x="700" y="180" class="t-sm t-b t-c">다른 파드</text>
  <text x="700" y="206" class="t-xs t-c t-mono">curl http://web</text>
  <line x1="598" y1="190" x2="524" y2="190" class="ln ar"/>
</svg>`
    },

    /* ------------------------------------------------ 롤링 업데이트 */
    rolling: {
      caption: '롤링 업데이트: 새 파드를 하나 올리고, 준비(Ready)되면 옛 파드를 하나 내리기를 반복합니다. 그동안에도 서비스는 끊기지 않습니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="롤링 업데이트 네 단계">
  <text x="110" y="30" class="t-sm t-b t-c">① 시작</text>
  <text x="330" y="30" class="t-sm t-b t-c">② 새 파드 +1</text>
  <text x="550" y="30" class="t-sm t-b t-c">③ Ready → 옛 파드 −1</text>
  <text x="770" y="30" class="t-sm t-b t-c">④ 반복 끝 · 완료</text>

  <rect x="35" y="50" width="150" height="36" rx="10" class="blue"/><text x="110" y="68" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="35" y="96" width="150" height="36" rx="10" class="blue"/><text x="110" y="114" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="35" y="142" width="150" height="36" rx="10" class="blue"/><text x="110" y="160" class="t-xs t-c t-mono">v1 nginx:1.21</text>

  <rect x="255" y="50" width="150" height="36" rx="10" class="blue"/><text x="330" y="68" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="255" y="96" width="150" height="36" rx="10" class="blue"/><text x="330" y="114" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="255" y="142" width="150" height="36" rx="10" class="blue"/><text x="330" y="160" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="255" y="188" width="150" height="36" rx="10" class="green pulse"/><text x="330" y="206" class="t-xs t-c t-mono">v2 시작 중…</text>

  <rect x="475" y="50" width="150" height="36" rx="10" class="gray"/><text x="550" y="68" class="t-xs t-c t-mu">v1 종료 ✕</text>
  <rect x="475" y="96" width="150" height="36" rx="10" class="blue"/><text x="550" y="114" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="475" y="142" width="150" height="36" rx="10" class="blue"/><text x="550" y="160" class="t-xs t-c t-mono">v1 nginx:1.21</text>
  <rect x="475" y="188" width="150" height="36" rx="10" class="green"/><text x="550" y="206" class="t-xs t-c t-mono">v2 nginx:1.27 ✓</text>

  <rect x="695" y="50" width="150" height="36" rx="10" class="green"/><text x="770" y="68" class="t-xs t-c t-mono">v2 nginx:1.27</text>
  <rect x="695" y="96" width="150" height="36" rx="10" class="green"/><text x="770" y="114" class="t-xs t-c t-mono">v2 nginx:1.27</text>
  <rect x="695" y="142" width="150" height="36" rx="10" class="green"/><text x="770" y="160" class="t-xs t-c t-mono">v2 nginx:1.27</text>

  <line x1="200" y1="115" x2="240" y2="115" class="ln ar"/>
  <line x1="420" y1="115" x2="460" y2="115" class="ln ar"/>
  <line x1="640" y1="115" x2="680" y2="115" class="ln ar"/>

  <rect x="35" y="244" width="810" height="40" rx="10" class="box"/>
  <text x="440" y="264" class="t-sm t-c">Service 는 Ready 인 파드로만 요청을 보냅니다 → 사용자는 업데이트 중에도 끊김 없이 접속</text>
</svg>`
    }
  },

  files: {
    k8s: {
      '~/k8s/deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
  labels:
    app: hello
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
`,
      '~/k8s/service.yaml': `apiVersion: v1
kind: Service
metadata:
  name: hello
spec:
  type: NodePort
  selector:
    app: hello
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
`,
      '~/k8s/db.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  labels:
    app: db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: POSTGRES_DB
`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '왜 오케스트레이션인가?',
      html: `
<p>지금까지 우리는 <code>docker run</code> 과 <code>docker compose up</code> 으로 <b>서버 한 대</b> 위에서 컨테이너를 돌렸습니다.
그런데 서비스가 커지면 질문이 달라집니다. "컨테이너 200개를 서버 10대에 어떻게 나눠 놓지?", "새벽 3시에 서버 한 대가 죽으면 누가 다시 띄우지?",
"사용자가 몰리면 누가 개수를 늘리지?", "새 버전을 배포하는 동안 사이트가 멈추면 안 되는데?"</p>
<p>이 일을 사람 대신 해 주는 시스템을 <b>컨테이너 오케스트레이터(orchestrator, 지휘자)</b>라고 하고, 사실상의 표준이 <b>쿠버네티스(Kubernetes, 줄여서 K8s)</b>입니다.
구글 내부 시스템의 경험을 바탕으로 만들어져 지금은 CNCF(클라우드 네이티브 컴퓨팅 재단)가 관리하는 오픈소스입니다.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 택배 물류센터</div>
작은 가게는 사장님이 직접 포장해서 보내면 됩니다(= <code>docker run</code>). 하지만 하루 수만 개를 보내는 <b>물류센터</b>에는 관제실이 있습니다.
관제실은 "오늘 서울 방면 트럭 3대"처럼 <b>목표</b>만 정해 두고, 트럭이 고장 나면 예비 트럭을 보내고, 물량이 늘면 트럭을 더 배차하고,
기사를 교대할 때도 배송이 끊기지 않게 한 대씩 바꿉니다. 쿠버네티스가 바로 컨테이너의 관제실입니다.</div>

<div class="cards c4">
  <div class="card blue"><div class="ci">🖥️</div><b>여러 서버를 하나처럼</b><p>서버(노드) 여러 대를 묶어 "클러스터" 하나로 다루고, 빈 자리를 찾아 컨테이너를 배치합니다.</p></div>
  <div class="card green"><div class="ci">🩹</div><b>자동 복구</b><p>컨테이너 · 노드가 죽으면 원하는 개수를 맞추려고 알아서 다시 만듭니다.</p></div>
  <div class="card orange"><div class="ci">📈</div><b>확장</b><p>명령 한 줄(또는 자동 규칙)로 3개 → 10개. 요청은 Service 가 골고루 나눠 줍니다.</p></div>
  <div class="card purple"><div class="ci">🔄</div><b>무중단 배포</b><p>롤링 업데이트로 한 개씩 새 버전으로 바꾸고, 문제가 생기면 되돌립니다.</p></div>
</div>

<h3>Compose 와 쿠버네티스, 무엇이 다른가요?</h3>
<div class="tbl-wrap"><table class="tbl cmp">
<tr><th></th><th>Docker Compose</th><th>쿠버네티스</th></tr>
<tr><td>대상</td><td>서버 <b>한 대</b></td><td>서버 <b>여러 대</b>(클러스터)</td></tr>
<tr><td>설정 파일</td><td><code>compose.yaml</code> 하나</td><td>Deployment · Service 등 여러 YAML(매니페스트)</td></tr>
<tr><td>실행 명령</td><td><code>docker compose up -d</code></td><td><code>kubectl apply -f .</code></td></tr>
<tr><td>죽으면?</td><td>재시작 정책(<code>restart:</code>)으로 같은 서버에서 다시 시작</td><td>다른 노드에라도 새 파드를 만들어 개수를 맞춤</td></tr>
<tr><td>확장</td><td><code>--scale web=3</code> (한 서버 안에서)</td><td><code>kubectl scale</code> · 자동 확장(HPA)</td></tr>
<tr><td>배포</td><td>다시 만들기(잠깐 끊김)</td><td>롤링 업데이트 · 롤백</td></tr>
<tr><td>어울리는 곳</td><td>개발 환경 · 작은 서비스 · 한 대짜리 서버</td><td>운영 환경 · 여러 팀 · 트래픽이 큰 서비스</td></tr>
</table></div>
<div class="box tip"><div class="box-t">💡 쿠버네티스가 꼭 필요한가요?</div>
아닙니다. 서버 한 대로 충분한 서비스라면 Compose 가 훨씬 단순하고 좋습니다. 쿠버네티스는 배울 것이 많고 운영 비용도 있습니다.
다만 <b>이미지 · 컨테이너 · 포트 · 볼륨 · 환경 변수</b>라는 개념은 그대로 이어지므로, 지금까지 배운 Docker 지식이 쿠버네티스의 토대가 됩니다.</div>
`
    },

    /* ================================================================ 2 */
    {
      title: '클러스터 구조 — 두뇌와 손발',
      html: `
<p>쿠버네티스 클러스터는 크게 두 부분입니다. 결정을 내리는 <b>컨트롤 플레인(control plane)</b>과, 실제로 컨테이너를 돌리는 <b>워커 노드(worker node)</b>입니다.</p>
{{fig:cluster}}
<div class="two">
<div>
<h3>🧠 컨트롤 플레인</h3>
<ul>
<li><b>kube-apiserver</b> — 모든 요청의 창구. <code>kubectl</code> 도, 노드의 kubelet 도 이 API 서버하고만 이야기합니다.</li>
<li><b>etcd</b> — "원하는 상태"와 "현재 상태"를 저장하는 키-값 저장소. 클러스터의 장부입니다.</li>
<li><b>kube-scheduler</b> — 새 파드를 CPU · 메모리 여유가 있는 노드에 배정합니다.</li>
<li><b>kube-controller-manager</b> — 여러 컨트롤러 묶음. "파드 3개여야 하는데 2개네?" 하고 차이를 메웁니다.</li>
</ul>
</div>
<div>
<h3>🖥️ 워커 노드</h3>
<ul>
<li><b>kubelet</b> — 노드마다 있는 현장 반장. API 서버의 지시를 받아 파드를 띄우고 상태를 보고합니다.</li>
<li><b>kube-proxy</b> — Service 로 들어온 요청이 알맞은 파드로 가도록 노드의 네트워크 규칙을 관리합니다.</li>
<li><b>컨테이너 런타임</b> — 실제로 컨테이너를 만드는 프로그램. 요즘은 주로 <b>containerd</b>(14장에서 본 그것!)입니다.</li>
</ul>
</div>
</div>

<div class="box analogy"><div class="box-t">🍳 비유 — 공장 관리자와 현장 반장</div>
공장 사무실 칠판(etcd)에 "A 라인 3개 가동"이라고 적혀 있습니다. 관리자(컨트롤러)는 수시로 현장을 둘러보고 칠판과 다르면 조치를 지시하고,
배치 담당(스케줄러)은 비어 있는 라인을 골라 줍니다. 지시는 반드시 접수 창구(api-server)를 거쳐 각 라인의 반장(kubelet)에게 전달됩니다.</div>

<h3>핵심 아이디어: 선언형 + 조정 루프</h3>
<p>쿠버네티스에서 우리는 "nginx 컨테이너 3개를 <i>실행해라</i>"라고 명령하기보다, "nginx 파드가 3개 <i>있어야 한다</i>"라고 <b>원하는 상태(desired state)</b>를 선언합니다.
그러면 컨트롤러가 실제 상태를 계속 지켜보다가 차이가 생기면 맞춥니다. 이 반복을 <b>조정 루프(reconciliation loop)</b>라고 부릅니다.</p>
{{fig:reconcile}}
<div class="box note"><div class="box-t">ℹ️ 이 실습 환경의 클러스터</div>
오른쪽 터미널의 <code>minikube</code> 는 노드 1대(컨트롤 플레인 겸 워커)짜리 로컬 클러스터를 흉내 냅니다. 파드의 컨테이너는 가상 Docker 엔진 위에서 실제로 실행되지만
<code>docker ps</code> 에는 보이지 않게 숨겨 두었습니다. 클러스터 모습은 📊 대시보드 탭 아래쪽에서 그림으로 볼 수 있습니다.</div>
`
    },

    /* ================================================================ 3 */
    {
      title: 'minikube 로 로컬 클러스터 만들기 · kubectl 기본',
      html: `
<p>실제 운영 클러스터는 클라우드에 만들지만, 연습은 내 PC 의 <b>minikube</b> 로 충분합니다. minikube 는 Docker 컨테이너(또는 VM) 하나 안에 쿠버네티스 전체를 띄워 줍니다.
비슷한 도구로 kind(Kubernetes IN Docker), k3d, Docker Desktop 의 내장 쿠버네티스가 있습니다.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># (실제 PC) 설치 예 — 리눅스 x86-64</span>
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
<span class="cm"># kubectl 은 minikube kubectl -- 로 쓰거나 따로 설치합니다</span></code></pre>
<p>이 실습 환경에는 이미 설치되어 있으니 바로 클러스터를 시작해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>minikube start
kubectl get nodes</code></pre>
<pre class="code out" data-lang="출력"><code>😄  minikube v1.34.0 on Ubuntu 24.04
✨  Automatically selected the docker driver
👍  Starting "minikube" primary control-plane node in "minikube" cluster
🔥  Creating docker container (CPUs=2, Memory=3900MB) ...
🐳  Preparing Kubernetes v1.31.0 on Docker 27.2.0 ...
🔎  Verifying Kubernetes components...
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default

NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   0s    v1.31.0</code></pre>
<p><code>kubectl</code>(큐브 컨트롤 · 큐브 시티엘)은 클러스터에 말을 거는 명령줄 도구입니다. 컨트롤 플레인 부품들도 사실 파드로 돌고 있는데,
<code>kube-system</code> 이라는 <b>네임스페이스(namespace, 클러스터 안의 칸막이)</b>에 들어 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl cluster-info
kubectl get pods -n kube-system</code></pre>
<pre class="code out" data-lang="출력"><code>NAME                               READY   STATUS    RESTARTS   AGE
coredns-6f6b679f8f-x8m2k           1/1     Running   0          1m
etcd-minikube                      1/1     Running   0          1m
kube-apiserver-minikube            1/1     Running   0          1m
kube-controller-manager-minikube   1/1     Running   0          1m
kube-proxy-7rxlq                   1/1     Running   0          1m
kube-scheduler-minikube            1/1     Running   0          1m
storage-provisioner                1/1     Running   0          1m</code></pre>
<p>그림에서 본 etcd · apiserver · scheduler · controller-manager · kube-proxy 가 모두 보이죠? <code>coredns</code> 는 Service 이름을 IP 로 바꿔 주는 클러스터 DNS 입니다.</p>

<h3>kubectl 명령의 모양</h3>
<p>거의 모든 명령이 <code>kubectl &lt;동사&gt; &lt;종류&gt; [이름] [옵션]</code> 모양입니다. Docker 명령과 짝지어 보면 금방 익숙해집니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>kubectl</th><th>하는 일</th><th>Docker 로 치면</th></tr>
<tr><td><code>kubectl get pods</code> · <code>get deploy,svc</code> · <code>get all</code></td><td>목록 보기 (<code>-o wide</code> 자세히, <code>-o yaml</code> 전체 정의)</td><td><code>docker ps</code></td></tr>
<tr><td><code>kubectl describe pod 이름</code></td><td>상세 정보 + 맨 아래 <b>Events</b>(무슨 일이 있었나)</td><td><code>docker inspect</code></td></tr>
<tr><td><code>kubectl logs 파드</code> · <code>logs deploy/web</code></td><td>컨테이너 로그 (<code>-f</code> 따라가기, <code>--previous</code> 직전 컨테이너)</td><td><code>docker logs</code></td></tr>
<tr><td><code>kubectl exec 파드 -- 명령</code></td><td>파드 안에서 명령 실행 (<code>-it ... -- sh</code> 셸 접속)</td><td><code>docker exec</code></td></tr>
<tr><td><code>kubectl apply -f 파일</code></td><td>YAML 에 적힌 상태로 만들기 · 바꾸기</td><td><code>docker compose up -d</code></td></tr>
<tr><td><code>kubectl delete 종류 이름</code> · <code>delete -f 파일</code></td><td>지우기</td><td><code>docker rm</code> · <code>compose down</code></td></tr>
</table></div>
<div class="box tip"><div class="box-t">💡 짧은 이름</div>
<code>pods</code>=<code>po</code>, <code>deployments</code>=<code>deploy</code>, <code>services</code>=<code>svc</code>, <code>replicasets</code>=<code>rs</code>, <code>configmaps</code>=<code>cm</code>, <code>namespaces</code>=<code>ns</code>.
전체 목록은 <code class="cmd">kubectl api-resources</code> 로 볼 수 있습니다.</div>
`
    },

    /* ================================================================ 4 */
    {
      title: 'Pod 와 Deployment(ReplicaSet)',
      html: `
<p><b>파드(Pod)</b>는 쿠버네티스가 다루는 가장 작은 단위입니다. 컨테이너 하나(가끔은 꼭 붙어 다니는 여러 개)를 감싸고, 파드마다 클러스터 안에서 쓰는 IP 가 하나 붙습니다.
완두콩 꼬투리(pod) 안의 콩(컨테이너)을 떠올리면 됩니다.</p>
<p>파드 하나를 직접 만들어 볼 수도 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl run hello-pod --image=nginx
kubectl get pods -o wide</code></pre>
<pre class="code out" data-lang="출력"><code>pod/hello-pod created
NAME        READY   STATUS              RESTARTS   AGE   IP           NODE       NOMINATED NODE   READINESS GATES
hello-pod   1/1     Running   0          2s    10.244.0.4   minikube   &lt;none&gt;           &lt;none&gt;</code></pre>
<p>처음 몇 초는 <code>Pending</code> → <code>ContainerCreating</code> 이다가 <code>Running</code> 이 됩니다(안 됐으면 <code class="cmd">kubectl get pods</code> 로 다시 보세요). 파드마다 <code>10.244.x.x</code> IP 가 붙은 것도 보이죠. 하지만 이렇게 <b>혼자 만든 파드는 지워지면 끝</b>입니다. 아무도 다시 만들어 주지 않아요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl delete pod hello-pod
kubectl get pods</code></pre>

<h3>Deployment — "이 파드를 N개 유지해 줘"</h3>
<p>실무에서는 파드를 직접 만들지 않고 <b>Deployment</b> 를 만듭니다. Deployment 는 <b>ReplicaSet</b> 을 만들고, ReplicaSet 이 "파드 N개"를 지킵니다.
Deployment 는 버전(파드 템플릿)이 바뀔 때마다 새 ReplicaSet 을 만들어 롤링 업데이트를 지휘합니다.</p>
{{fig:objects}}
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl create deployment web --image=nginx:1.21 --replicas=3
kubectl get deploy,rs,pods</code></pre>
<p>파드가 모두 뜬 뒤(몇 초) 다시 보면 이렇게 됩니다.</p>
<pre class="code out" data-lang="출력"><code>NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/web   3/3     3            3           3s

NAME                             DESIRED   CURRENT   READY   AGE
replicaset.apps/web-5942ff6955   3         3         3       2s

NAME                       READY   STATUS    RESTARTS   AGE
pod/web-5942ff6955-c46h2   1/1     Running   0          2s
pod/web-5942ff6955-bsddf   1/1     Running   0          2s
pod/web-5942ff6955-8fnwl   1/1     Running   0          2s</code></pre>
<p>이름을 보세요. <code>web</code>(Deployment) → <code>web-5942ff6955</code>(ReplicaSet, 뒤는 파드 템플릿의 해시) → <code>web-5942ff6955-c46h2</code>(파드, 뒤는 무작위).
이름만 봐도 누가 누구를 만들었는지 알 수 있습니다. 파드의 라벨은 <code class="cmd">kubectl get pods --show-labels</code> 로 확인합니다 (<code>app=web</code>).</p>

<div class="tbl-wrap"><table class="tbl">
<tr><th>열</th><th>뜻</th></tr>
<tr><td>READY <code>1/1</code></td><td>파드 안 컨테이너 중 준비된 수 / 전체 수</td></tr>
<tr><td>STATUS</td><td><code>Pending</code> → <code>ContainerCreating</code> → <code>Running</code>. 문제가 있으면 <code>ImagePullBackOff</code> · <code>CrashLoopBackOff</code> 등 (8절)</td></tr>
<tr><td>RESTARTS</td><td>컨테이너가 죽어서 다시 시작된 횟수. 계속 오르면 뭔가 잘못된 것</td></tr>
</table></div>

<p>파드 안을 들여다보는 방법은 Docker 와 거의 같습니다. <code>deploy/web</code> 이라고 쓰면 그 Deployment 의 파드 하나를 골라 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl describe deployment web
kubectl logs deploy/web --tail=3
kubectl exec deploy/web -- ls /usr/share/nginx/html</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
📊 대시보드 탭을 열어 보세요. 아래쪽 ☸️ 쿠버네티스 칸에 <code>deploy/web 3/3</code> 과 파드 3개가 보입니다. {{widget:open|pane=dash}}</div>
`
    },

    /* ================================================================ 5 */
    {
      title: 'Service — 파드에 고정된 입구 만들기',
      html: `
<p>파드는 언제든 죽고 새로 생기며, 그때마다 <b>IP 가 바뀝니다</b>. 그래서 파드 IP 로 직접 접속하면 안 됩니다.
<b>Service</b> 는 라벨(<code>app=web</code>)로 파드들을 묶어 <b>변하지 않는 가상 IP 와 DNS 이름</b>을 주고, 들어온 요청을 준비된 파드들에 나눠 줍니다(로드 밸런싱).</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 콜센터 대표 번호</div>
상담원(파드)은 교대하고 자리가 바뀌지만, 고객은 대표 번호(Service) 하나만 알면 됩니다. 대표 번호가 지금 일하는 상담원에게 전화를 연결해 줍니다.</div>
{{fig:svctypes}}
<div class="tbl-wrap"><table class="tbl">
<tr><th>type</th><th>어디서 접속?</th><th>주로 쓰는 곳</th></tr>
<tr><td><b>ClusterIP</b> (기본)</td><td>클러스터 안에서만 — <code>http://web</code></td><td>DB · 내부 API</td></tr>
<tr><td><b>NodePort</b></td><td>노드IP:30000~32767 — minikube 에서는 <code>minikube service 이름 --url</code></td><td>연습 · 간단한 공개</td></tr>
<tr><td><b>LoadBalancer</b></td><td>클라우드가 만들어 주는 외부 IP (minikube 는 <code>minikube tunnel</code>)</td><td>운영 환경의 공개 서비스</td></tr>
</table></div>

<h3>NodePort 로 열고 브라우저로 접속하기</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl expose deployment web --type=NodePort --port=80
kubectl get svc
minikube service web --url</code></pre>
<pre class="code out" data-lang="출력"><code>service/web exposed
NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
kubernetes   ClusterIP   10.96.0.1      &lt;none&gt;        443/TCP        4s
web          NodePort    10.96.10.241   &lt;none&gt;        80:30809/TCP   0s
http://localhost:30809</code></pre>
<p><code>PORT(S)</code> 의 <code>80:30809</code> 는 "Service 포트 80 ← 노드 포트 30809" 이라는 뜻입니다(노드 포트는 비어 있는 번호가 무작위로 붙습니다).
이 실습 환경에서는 노드 포트가 내 PC 의 <code>localhost</code> 로 이어지도록 해 두었으니, 🌐 브라우저 탭에서 출력된 주소를 열어 보세요.
(실제 minikube 에서는 <code>minikube service web</code> 이 주소를 알려 주고 브라우저를 열어 줍니다.)</p>
<div class="box note"><div class="box-t">ℹ️ 노드 포트 번호는 사람마다 다릅니다</div>
위 30809 는 예시입니다. 여러분의 <code>kubectl get svc</code> 에 나온 번호를 쓰세요. 번호를 고정하고 싶으면 6절처럼 YAML 에 <code>nodePort: 30080</code> 을 적습니다.</div>

<h3>port-forward — 잠깐 내 PC 로 끌어오기</h3>
<p>ClusterIP 서비스나 파드 하나를 디버깅할 때는 <code>kubectl port-forward</code> 가 편합니다. 명령이 실행되는 동안만 내 PC 의 포트가 연결되고, <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 끝납니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl port-forward svc/web 9090:80</code></pre>
<pre class="code out" data-lang="출력"><code>Forwarding from 127.0.0.1:9090 -> 80
Forwarding from [::1]:9090 -> 80</code></pre>
<p>이 상태에서 🌐 브라우저 탭으로 <code>http://localhost:9090</code> 을 열면 nginx 가 보입니다. 확인했으면 터미널에서 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추세요.</p>

<h3>서비스 DNS — 파드 안에서 이름으로 부르기</h3>
<p>Compose 에서 서비스 이름으로 통신했던 것처럼, 쿠버네티스에서도 파드 안에서 <b>Service 이름</b>으로 접속합니다. 전체 이름은 <code>web.default.svc.cluster.local</code>(서비스.네임스페이스.svc.cluster.local)이고,
같은 네임스페이스에서는 <code>web</code> 만 써도 됩니다. curl 이 들어 있는 디버깅용 이미지로 임시 파드를 띄워 확인해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl run tmp --image=nicolaka/netshoot -- sleep 3600
kubectl get pod tmp</code></pre>
<p><code>tmp</code> 가 <code>Running</code> 이 되면 파드 안에서 서비스 이름으로 요청해 봅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl exec tmp -- nslookup web
kubectl exec tmp -- curl -s web</code></pre>
<pre class="code out" data-lang="출력"><code>Non-authoritative answer:
Name:	web
Address: 10.96.10.241

&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
&lt;title&gt;Welcome to nginx!&lt;/title&gt;
...</code></pre>
<p>이름 <code>web</code> 이 Service 의 ClusterIP(10.96.…)로 바뀌고, 그 뒤의 파드 중 하나가 응답했습니다. 다 봤으면 <code class="cmd">kubectl delete pod tmp</code> 로 정리합니다.</p>
`
    },

    /* ================================================================ 6 */
    {
      title: '선언형 YAML — kubectl apply -f',
      html: `
<p><code>kubectl create</code> · <code>expose</code> 는 편하지만 "무엇을 했는지"가 기록으로 남지 않습니다. 실무에서는 원하는 상태를 <b>YAML 파일(매니페스트)</b>로 적어
Git 에 보관하고 <code>kubectl apply -f</code> 로 적용합니다. compose.yaml 로 여러 컨테이너를 적어 두던 것과 같은 생각입니다.</p>
<p>모든 매니페스트는 네 칸으로 시작합니다: <code>apiVersion</code>(API 버전) · <code>kind</code>(종류) · <code>metadata</code>(이름 · 라벨) · <code>spec</code>(원하는 상태).</p>
<pre class="code" data-lang="yaml" data-file="~/k8s/deployment.yaml"><code>apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
  labels:
    app: hello
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80</code></pre>
<ul>
<li><code>replicas: 3</code> — 파드 3개를 유지해 달라.</li>
<li><code>selector.matchLabels</code> — "라벨이 <code>app: hello</code> 인 파드가 내 것"이라는 표시. 아래 <code>template.metadata.labels</code> 와 <b>반드시 같아야</b> 합니다.</li>
<li><code>template</code> — 찍어 낼 파드의 설계도(🍞 붕어빵 틀). 그 안의 <code>containers</code> 가 docker run 의 이미지 · 포트에 해당합니다.</li>
</ul>
<pre class="code" data-lang="yaml" data-file="~/k8s/service.yaml"><code>apiVersion: v1
kind: Service
metadata:
  name: hello
spec:
  type: NodePort
  selector:
    app: hello
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080</code></pre>
<ul>
<li><code>selector</code> — 이 라벨을 가진 파드로 요청을 보냅니다. 라벨이 하나라도 다르면 연결할 파드가 없어집니다(Endpoints 가 <code>&lt;none&gt;</code>).</li>
<li><code>port</code> 는 Service 의 포트, <code>targetPort</code> 는 파드(컨테이너)의 포트, <code>nodePort</code> 는 노드에 여는 포트입니다. docker 의 <code>-p 30080:80</code> 과 비슷하죠.</li>
</ul>
<p>두 블록의 <b>📄 파일로 저장</b>을 누르거나, 아래 버튼으로 한 번에 만든 뒤 적용합니다.</p>
{{widget:files|set=k8s|cd=~/k8s|title=쿠버네티스 매니페스트 준비 (~/k8s)}}
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/k8s
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl get deploy hello
kubectl get svc hello</code></pre>
<pre class="code out" data-lang="출력"><code>deployment.apps/hello created
service/hello created
NAME    READY   UP-TO-DATE   AVAILABLE   AGE
hello   0/3     0            0           0s
NAME    TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
hello   NodePort   10.96.11.52    &lt;none&gt;        80:30080/TCP   0s</code></pre>
<p>몇 초 뒤 <code class="cmd">curl -s localhost:30080</code> 을 실행하면 nginx 환영 페이지가 나옵니다. {{widget:open|url=http://localhost:30080/}}</p>

<h3>바꾸고 싶으면 파일을 고쳐서 다시 apply</h3>
<p>📝 파일 탭에서 <code>deployment.yaml</code> 의 <code>replicas: 3</code> 을 <code>5</code> 로 고치고 다시 <code class="cmd">kubectl apply -f ~/k8s/deployment.yaml</code> 를 실행해 보세요.
결과가 <code>configured</code>(바뀜)로 나오고 파드가 5개가 됩니다. 아무것도 안 바꾸고 apply 하면 <code>unchanged</code> 입니다. 폴더째 적용할 때는 <code>kubectl apply -f .</code></p>
<div class="vs">
  <div class="vs-a blue"><b>명령형 (imperative)</b><ul><li><code>kubectl create deployment …</code></li><li><code>kubectl scale …</code></li><li>빠른 실험 · 긴급 조치에 좋음</li><li>기록이 남지 않음</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b green"><b>선언형 (declarative)</b><ul><li><code>kubectl apply -f 파일</code></li><li>원하는 상태를 파일로 관리</li><li>Git 으로 리뷰 · 되돌리기 (GitOps)</li><li>운영 환경의 표준</li></ul></div>
</div>
<div class="box tip"><div class="box-t">💡 기존 것을 YAML 로 보기</div>
<code class="cmd">kubectl get deploy web -o yaml</code> 로 명령형으로 만든 것도 YAML 로 볼 수 있습니다. 처음 매니페스트를 쓸 때 좋은 참고가 됩니다.</div>
`
    },

    /* ================================================================ 7 */
    {
      title: '자동 복구 · 확장 · 롤링 업데이트',
      html: `
<h3>① 자동 복구 — 파드를 지워도 다시 생긴다</h3>
<p>Deployment 의 파드 하나를 일부러 지워 봅시다. 지운 파드 이름은 <code>kubectl get pods</code> 에서 하나 골라 넣으세요.
라벨로 한꺼번에 지울 수도 있습니다 (<code>-l app=web</code>).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl get pods -l app=web
kubectl delete pod -l app=web
kubectl get pods -l app=web</code></pre>
<pre class="code out" data-lang="출력"><code>pod "web-5942ff6955-c46h2" deleted
pod "web-5942ff6955-bsddf" deleted
pod "web-5942ff6955-8fnwl" deleted
NAME                   READY   STATUS    RESTARTS   AGE
web-5942ff6955-kpcns   0/1     Pending   0          0s
web-5942ff6955-6smdd   0/1     Pending   0          0s
web-5942ff6955-zvls4   0/1     Pending   0          0s</code></pre>
<p>(너무 빨리 실행하면 잠깐 <code>No resources found</code> 가 보일 수 있습니다. 한 번 더 get 해 보세요.) 이름이 다른 새 파드 3개가 곧바로 만들어졌습니다. ReplicaSet 이 "3개여야 하는데 0개네?" 하고 채운 것, 바로 조정 루프입니다.
실제 클러스터에서는 <b>노드 한 대가 통째로 죽어도</b> 같은 일이 다른 노드에서 일어납니다. 바뀌는 모습을 계속 보려면 <code>kubectl get pods -w</code>(Ctrl+C 로 끝) 를 씁니다.</p>

<h3>② 확장 — 개수 바꾸기</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl scale deployment web --replicas=5
kubectl get deploy web</code></pre>
<pre class="code out" data-lang="출력"><code>deployment.apps/web scaled
NAME   READY   UP-TO-DATE   AVAILABLE   AGE
web    5/5     5            5           9s</code></pre>
<p>Service 는 새로 생긴 파드도 라벨로 자동으로 찾아 요청을 나눠 줍니다. 다시 3개로 줄여 둡시다: <code class="cmd">kubectl scale deployment web --replicas=3</code>
(실무에서는 CPU 사용률에 따라 개수를 자동 조절하는 <b>HorizontalPodAutoscaler(HPA)</b>를 씁니다.)</p>

<h3>③ 롤링 업데이트 — 멈추지 않고 새 버전으로</h3>
{{fig:rolling}}
<p>이미지를 <code>nginx:1.21</code> 에서 <code>nginx:1.27</code> 로 올려 봅시다. <code>set image</code> 의 <code>nginx=</code> 는 <b>컨테이너 이름</b>입니다
(<code>kubectl create deployment</code> 는 이미지 이름으로 컨테이너 이름을 짓습니다). YAML 로 관리한다면 파일의 <code>image:</code> 를 고쳐 apply 하면 똑같이 동작합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl set image deployment/web nginx=nginx:1.27
kubectl rollout status deployment/web</code></pre>
<pre class="code out" data-lang="출력"><code>deployment.apps/web image updated
Waiting for deployment "web" rollout to finish: 0 out of 3 new replicas have been updated...
Waiting for deployment "web" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "web" rollout to finish: 2 out of 3 new replicas have been updated...
Waiting for deployment "web" rollout to finish: 3 out of 3 new replicas have been updated...
deployment "web" successfully rolled out</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl get rs
kubectl rollout history deployment/web</code></pre>
<pre class="code out" data-lang="출력"><code>NAME             DESIRED   CURRENT   READY   AGE
web-5942ff6955   0         0         0       14s
web-4813f38796   3         3         3       4s
deployment.apps/web
REVISION   CHANGE-CAUSE
1          &lt;none&gt;
2          &lt;none&gt;</code></pre>
<p>옛 ReplicaSet 은 0개로 줄어든 채 남아 있습니다. 덕분에 문제가 생기면 곧바로 <b>되돌릴(rollback)</b> 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl rollout undo deployment/web
kubectl rollout status deployment/web
kubectl get deploy web -o wide</code></pre>
<p><code>IMAGES</code> 열이 다시 <code>nginx:1.21</code> 이 되었을 겁니다. 되돌린 뒤 history 를 보면 옛 리비전 1 이 새 번호 3 으로 올라와 있습니다.
미션에서 다시 1.27 로 올려 볼 테니 여기서는 그대로 둡니다.</p>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
롤링 업데이트가 안전하려면 쿠버네티스가 "새 파드가 정말 준비됐는지"를 알아야 합니다. 그래서 운영 매니페스트에는 <b>readinessProbe</b>(준비 확인) ·
<b>livenessProbe</b>(살아 있나 확인)와 <b>resources</b>(CPU · 메모리 요청 · 제한)를 꼭 적습니다. 8장의 HEALTHCHECK · 메모리 제한과 같은 역할입니다.</div>
`
    },

    /* ================================================================ 8 */
    {
      title: '장애 상태 읽기 — ImagePullBackOff · CrashLoopBackOff',
      html: `
<p>쿠버네티스에서 가장 자주 보는 문제는 파드가 <code>Running</code> 이 되지 않는 경우입니다. STATUS 열의 단어가 원인을 알려 주는 첫 단서입니다.</p>
<div class="tbl-wrap"><table class="tbl">
<tr><th>STATUS</th><th>뜻</th><th>먼저 볼 것</th></tr>
<tr><td><code>Pending</code></td><td>아직 배정 · 준비 전 (자원 부족이면 계속 Pending)</td><td><code>kubectl describe pod</code> 의 Events</td></tr>
<tr><td><code>ErrImagePull</code> → <code>ImagePullBackOff</code></td><td>이미지를 못 받음 (이름 · 태그 오타, 비공개 레지스트리) — 간격을 늘려 가며 재시도 중</td><td><code>describe pod</code> 의 <code>Failed to pull image</code></td></tr>
<tr><td><code>CrashLoopBackOff</code></td><td>컨테이너가 시작하자마자 죽고, 다시 켜고, 또 죽는 중</td><td><code>kubectl logs</code> (직전 것은 <code>--previous</code>)</td></tr>
<tr><td><code>OOMKilled</code></td><td>메모리 제한을 넘어 강제 종료 (종료 코드 137)</td><td><code>resources.limits.memory</code></td></tr>
<tr><td><code>CreateContainerConfigError</code></td><td>참조한 ConfigMap · Secret 이 없음</td><td><code>describe pod</code></td></tr>
</table></div>
<div class="box tip"><div class="box-t">💡 디버깅 순서 — get → describe → logs</div>
<ol class="steps-list" style="margin:6px 0 0">
<li><b>get</b> — <code>kubectl get pods</code> 로 STATUS · RESTARTS 확인</li>
<li><b>describe</b> — <code>kubectl describe pod 이름</code> 맨 아래 <b>Events</b> 에서 무슨 일이 있었는지 확인 (이미지 · 스케줄 · 설정 문제)</li>
<li><b>logs</b> — 컨테이너가 떴다가 죽었다면 <code>kubectl logs 이름</code> 으로 앱이 남긴 말을 확인</li>
</ol></div>

<h3>사례 1 — ImagePullBackOff: 없는 태그</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl create deployment shop --image=nginx:1.99
kubectl get pods -l app=shop</code></pre>
<p>몇 초 뒤 다시 보면 STATUS 가 <code>ErrImagePull</code> · <code>ImagePullBackOff</code> 사이를 오갑니다(다시 받아 보는 순간에는 <code>ContainerCreating</code> 으로 보이기도 합니다). 끝내 <code>Running</code> 이 되지 않죠. 파드 이름을 넣어 describe 해 보면 원인이 보입니다.</p>
<pre class="code out" data-lang="출력"><code>NAME                    READY   STATUS             RESTARTS   AGE
shop-6c0a1dd897-km4wm   0/1     ImagePullBackOff   0          4s

$ kubectl describe pod shop-6c0a1dd897-km4wm
...
Containers:
  nginx:
    Image:          nginx:1.99
    State:          Waiting
...
Events:
  Type      Reason      Age    From                Message
  ----      ------      ----   ----                -------
  Normal    Scheduled   6s     default-scheduler   Successfully assigned default/shop-6c0a1dd897-km4wm to minikube
  Normal    Pulling     5s     kubelet             Pulling image "nginx:1.99"
  Warning   Failed      5s     kubelet             Failed to pull image "nginx:1.99": manifest for nginx:1.99 not found: manifest unknown: manifest unknown
  Warning   Failed      5s     kubelet             Error: ErrImagePull
  Normal    BackOff     3s     kubelet             Back-off pulling image "nginx:1.99"</code></pre>
<p>1.99 라는 태그는 없습니다(<code>manifest unknown</code>). 있는 태그로 바꾸면 롤링 업데이트로 새 파드가 뜨고 고장 난 파드는 정리됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl set image deployment/shop nginx=nginx:1.27
kubectl rollout status deployment/shop</code></pre>

<h3>사례 2 — CrashLoopBackOff: 필수 환경 변수 누락</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl create deployment db --image=postgres:16-alpine
kubectl get pods -l app=db</code></pre>
<pre class="code out" data-lang="출력"><code>NAME                  READY   STATUS             RESTARTS     AGE
db-8a59d64812-m29mb   0/1     CrashLoopBackOff   3 (5s ago)   6s</code></pre>
<p>RESTARTS 가 계속 올라갑니다. 컨테이너가 떴다가 죽는 것이니 이번엔 <b>로그</b>를 봅니다 (<code>deploy/db</code> 로 파드 이름 대신 쓸 수 있습니다).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl logs deploy/db</code></pre>
<pre class="code out" data-lang="출력"><code>Found 1 pods, using pod/db-8a59d64812-m29mb
Error: Database is uninitialized and superuser password is not specified.
       You must specify POSTGRES_PASSWORD to a non-empty value for the
       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".

       You may also use "POSTGRES_HOST_AUTH_METHOD=trust" to allow all
       connections without a password. This is *not* recommended.
...</code></pre>
<p>5장에서 본 바로 그 오류입니다! docker 의 <code>-e</code> 대신 쿠버네티스에서는 <b>ConfigMap</b>(일반 설정)과 <b>Secret</b>(비밀번호 · 토큰)에 값을 넣고, 파드의 <code>env</code> 에서 참조합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl create configmap db-config --from-literal=POSTGRES_DB=shop
kubectl create secret generic db-secret --from-literal=POSTGRES_PASSWORD=secret123
kubectl get configmap,secret</code></pre>
<pre class="code" data-lang="yaml" data-file="~/k8s/db.yaml"><code>apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  labels:
    app: db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: POSTGRES_DB</code></pre>
<p>📄 파일로 저장한 뒤 적용합니다. 같은 이름(<code>db</code>)의 Deployment 를 파일 내용으로 덮어쓰는 것이라 결과는 <code>configured</code> 입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl apply -f ~/k8s/db.yaml
kubectl rollout status deployment/db
kubectl exec deploy/db -- env</code></pre>
<p>env 출력에 <code>POSTGRES_PASSWORD=secret123</code> · <code>POSTGRES_DB=shop</code> 이 들어 있고, 파드는 <code>Running</code> 이 됩니다.</p>
<div class="box warn"><div class="box-t">⚠️ Secret 은 암호화가 아닙니다</div>
<code class="cmd">kubectl get secret db-secret -o yaml</code> 를 보면 값이 <code>c2VjcmV0MTIz</code> 처럼 보이는데, 이것은 <b>base64 인코딩</b>일 뿐 누구나 되돌릴 수 있습니다.
Secret 매니페스트를 Git 에 그대로 올리지 말고, 접근 권한(RBAC) · etcd 암호화 · 외부 비밀 관리 도구(Vault, Sealed Secrets 등)를 함께 씁니다.</div>
`
    },

    /* ================================================================ 9 */
    {
      title: '정리하기와 다음 단계',
      html: `
<p>연습이 끝났으면 만든 것을 지웁니다. 파일로 만든 것은 파일로 지우는 것이 깔끔합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>kubectl delete -f ~/k8s/service.yaml
kubectl delete deployment hello shop db
kubectl delete service web
kubectl get all</code></pre>
<p>클러스터를 잠시 끄려면 <code>minikube stop</code>, 완전히 지우려면 <code>minikube delete</code> 입니다.
(이 장의 미션에서 클러스터를 계속 쓰니 지금은 켜 둡시다.)</p>

<h3>이 장 다음에 배울 것들</h3>
<div class="cards c3">
  <div class="card blue"><div class="ci">🚪</div><b>Ingress</b><p>여러 Service 를 도메인 · 경로(<code>/api</code>, <code>/</code>)별로 하나의 입구에 묶는 HTTP 라우터. 10장의 nginx 리버스 프록시 역할입니다.</p></div>
  <div class="card purple"><div class="ci">⎈</div><b>Helm</b><p>여러 매니페스트를 "차트"로 묶어 변수만 바꿔 설치하는 쿠버네티스 패키지 관리자. <code>helm install</code> 한 번으로 DB · 모니터링 설치.</p></div>
  <div class="card orange"><div class="ci">☁️</div><b>매니지드 쿠버네티스</b><p>AWS EKS · Google GKE · Azure AKS 처럼 클라우드가 컨트롤 플레인을 대신 운영. 우리는 워커 노드와 매니페스트만 신경 씁니다.</p></div>
  <div class="card green"><div class="ci">💾</div><b>PersistentVolume</b><p>파드가 옮겨 다녀도 데이터를 지키는 저장소. PVC(요청서)로 볼륨을 빌려 DB 에 연결합니다.</p></div>
  <div class="card teal"><div class="ci">🧭</div><b>Namespace · RBAC</b><p>팀 · 환경(dev/prod)별 칸막이와 "누가 무엇을 할 수 있나" 권한 관리.</p></div>
  <div class="card yellow"><div class="ci">📊</div><b>관측 · 자동 확장</b><p>metrics-server · HPA · Prometheus/Grafana 로 부하를 보고 파드 수를 자동 조절.</p></div>
</div>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>
쿠버네티스는 Docker 엔진 대신 <b>containerd</b> · CRI-O 같은 런타임을 직접 씁니다. 그래도 걱정할 것은 없습니다. <code>docker build</code> 로 만든 이미지는
<b>OCI 표준</b> 이미지라 어떤 런타임에서도 그대로 실행됩니다(14장). 개발은 Docker 로, 운영은 쿠버네티스로 — 지금 가장 흔한 조합입니다.</div>
{{widget:mission}}
`
    }
  ],

  missions: [
    {
      id: 'm1',
      title: 'minikube 로 로컬 클러스터 시작하기',
      desc: '클러스터를 시작하고 <code>kubectl get nodes</code> 로 노드가 <code>Ready</code> 인지 확인하세요.',
      hint: '<code>minikube start</code>',
      answer: ['minikube start', 'kubectl get nodes'],
      check: M => { const k = M.kube(); return !!k && k.cluster === 'Running'; }
    },
    {
      id: 'm2',
      title: 'nginx:1.21 파드 3개짜리 Deployment <code>web</code> 만들기',
      desc: '이름 <code>web</code>, 이미지 <code>nginx:1.21</code>, 파드 3개가 모두 <code>Running</code> 이 되게 하세요.',
      hint: '<code>kubectl create deployment 이름 --image=… --replicas=…</code> 후 <code>kubectl get pods</code>',
      answer: ['kubectl create deployment web --image=nginx:1.21 --replicas=3', 'kubectl get pods'],
      check: M => { const d = M.deploy('web'); return !!d && d.spec.replicas === 3 && M.pods(p => p.ready && p.owner && p.owner.startsWith('web-')).length >= 3; }
    },
    {
      id: 'm3',
      title: 'NodePort Service 로 열고 브라우저에서 접속하기',
      desc: '<code>web</code> Deployment 를 <code>NodePort</code> 타입 Service <code>web</code>(포트 80)으로 노출하고, 노드 포트 주소로 nginx 환영 페이지가 열리게 하세요.',
      hint: '<code>kubectl expose deployment web --type=NodePort --port=80</code> → <code>minikube service web --url</code> 로 주소 확인 → 🌐 브라우저 탭',
      answer: ['kubectl expose deployment web --type=NodePort --port=80', 'kubectl get svc web', 'minikube service web --url'],
      check: async M => { const s = M.ksvc('web'); if (!s || s.type !== 'NodePort' || !s.ports[0].nodePort) return false; return (await M.get('http://localhost:' + s.ports[0].nodePort + '/')).includes('Welcome to nginx'); }
    },
    {
      id: 'm4',
      title: '자동 복구 확인 — 파드를 지워도 3개로 돌아온다',
      desc: '<code>web</code> 의 파드를 하나 이상 <code>kubectl delete pod</code> 로 지운 뒤, 다시 3개가 <code>Running</code> 이 되는지 확인하세요.',
      hint: '<code>kubectl get pods</code> 에서 이름을 복사해 <code>kubectl delete pod 이름</code>, 또는 <code>kubectl delete pod -l app=web</code>',
      answer: ['kubectl delete pod -l app=web', 'kubectl get pods -l app=web'],
      check: M => M.ran(/kubectl\s+delete\s+(pod|pods|po)\b/) && M.pods(p => p.ready && p.owner && p.owner.startsWith('web-')).length >= 3
    },
    {
      id: 'm5',
      title: 'web 을 파드 5개로 확장하기',
      desc: '명령 한 줄로 <code>web</code> 의 파드를 5개로 늘리고, 5개 모두 준비될 때까지 확인하세요.',
      hint: '<code>kubectl scale deployment web --replicas=5</code>',
      answer: ['kubectl scale deployment web --replicas=5', 'kubectl get deploy web'],
      check: M => { const d = M.deploy('web'); return !!d && d.spec.replicas === 5 && M.pods(p => p.ready && p.owner && p.owner.startsWith('web-')).length >= 5; }
    },
    {
      id: 'm6',
      title: '롤링 업데이트 — web 을 nginx:1.27 로 올리기',
      desc: '서비스를 멈추지 않고 <code>web</code> 의 이미지를 <code>nginx:1.27</code> 로 바꾸세요. 모든 파드(5개)가 새 이미지로 교체되고 준비되면 통과입니다.',
      hint: '<code>kubectl set image deployment/web nginx=nginx:1.27</code> → <code>kubectl rollout status deployment/web</code>',
      answer: ['kubectl set image deployment/web nginx=nginx:1.27', 'kubectl rollout status deployment/web'],
      check: M => {
        const d = M.deploy('web'); if (!d || d.spec.template.spec.containers[0].image !== 'nginx:1.27') return false;
        const mine = M.pods(p => p.owner && p.owner.startsWith('web-') && !p.deleting);
        return mine.length > 0 && mine.every(p => p.spec.containers[0].image === 'nginx:1.27') && mine.filter(p => p.ready).length >= d.spec.replicas;
      }
    },
    {
      id: 'm7', scenario: true,
      title: '파드가 ImagePullBackOff! 배포 고치기',
      desc: '⚙️ 상황 만들기를 누르면(클러스터가 켜져 있어야 함) Deployment <code>shop</code> 이 만들어지는데 파드가 <code>ImagePullBackOff</code> 에서 멈춥니다. 원인을 찾아 <code>shop</code> 의 파드가 <code>Running</code> 이 되게 고치세요.',
      setup: ['kubectl delete deployment shop 2>/dev/null', 'kubectl create deployment shop --image=nginx:1.99', 'kubectl get pods -l app=shop'],
      hint: '<code>kubectl describe pod 파드이름</code> 의 Events 에 <code>Failed to pull image</code> 이유가 있습니다. 존재하는 태그(예: 1.27)로 <code>kubectl set image</code> 하세요. 컨테이너 이름은 <code>nginx</code> 입니다.',
      answer: ['kubectl set image deployment/shop nginx=nginx:1.27', 'kubectl rollout status deployment/shop'],
      check: M => {
        const d = M.deploy('shop'); if (!d || d.spec.template.spec.containers[0].image === 'nginx:1.99') return false;
        const mine = M.pods(p => p.owner && p.owner.startsWith('shop-') && !p.deleting);
        return mine.some(p => p.ready) && !mine.some(p => /ImagePull|ErrImage/.test(p.status));
      }
    },
    {
      id: 'm8', scenario: true,
      title: 'DB 파드가 CrashLoopBackOff! Secret 으로 비밀번호 넣기',
      desc: '⚙️ 상황 만들기를 누르면 Deployment <code>db</code>(postgres:16-alpine)의 파드가 <code>CrashLoopBackOff</code> 를 반복합니다. 로그로 원인을 찾고, <b>Secret</b> 에 비밀번호를 넣어 env 로 전달해 <code>db</code> 파드가 <code>Running</code> 이 되게 하세요.',
      setup: ['kubectl delete deployment db 2>/dev/null', 'kubectl delete secret db-secret 2>/dev/null', 'kubectl create deployment db --image=postgres:16-alpine', 'kubectl get pods -l app=db'],
      files: 'k8s',
      hint: '<code>kubectl logs deploy/db</code> → POSTGRES_PASSWORD 가 필요합니다. 8절의 <code>kubectl create secret generic db-secret …</code> · <code>kubectl create configmap db-config …</code> 을 실행하고, 8절 db.yaml 을 📄 파일로 저장한 뒤 <code>kubectl apply -f ~/k8s/db.yaml</code>',
      answer: ['kubectl create configmap db-config --from-literal=POSTGRES_DB=shop', 'kubectl create secret generic db-secret --from-literal=POSTGRES_PASSWORD=secret123', 'kubectl apply -f ~/k8s/db.yaml', 'kubectl rollout status deployment/db'],
      check: M => {
        const d = M.deploy('db'); if (!d) return false;
        const c0 = d.spec.template.spec.containers[0];
        if (!(c0.env || []).some(e => e.name === 'POSTGRES_PASSWORD')) return false;
        const mine = M.pods(p => p.owner && p.owner.startsWith('db-') && !p.deleting);
        return mine.some(p => p.ready) && !mine.some(p => /CrashLoop|Error/.test(p.status));
      }
    }
  ],

  videos: [
    { title: 'Kubernetes Tutorial for Beginners [FULL COURSE in 4 Hours]', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=X48VuDVv0do', lang: 'en', min: '3시간 36분', desc: '구조 · Pod · Deployment · Service · ConfigMap · Secret 을 minikube 실습과 함께 처음부터 끝까지' },
    { title: 'Kubernetes Crash Course for Absolute Beginners', channel: 'TechWorld with Nana', url: 'https://www.youtube.com/watch?v=s_o8dwzRlu4', lang: 'en', min: '1시간', desc: '위 강좌의 핵심만 1시간으로 — 이 장 내용과 거의 같은 순서' },
    { title: 'Kubernetes Explained in 100 Seconds', channel: 'Fireship', url: 'https://www.youtube.com/watch?v=PziYflu8cB8', lang: 'en', min: '2분', desc: '쿠버네티스가 무엇인지 100초 만에 훑어보기' },
    { title: '쿠버네티스 입문 (한국어 검색)', url: 'https://www.youtube.com/results?search_query=%EC%BF%A0%EB%B2%84%EB%84%A4%ED%8B%B0%EC%8A%A4+%EC%9E%85%EB%AC%B8', desc: '한국어 입문 강의 검색 결과 — 최근 영상 위주로 골라 보세요' },
    { title: 'minikube kubectl 실습 (한국어 검색)', url: 'https://www.youtube.com/results?search_query=minikube+kubectl+%EC%8B%A4%EC%8A%B5', desc: 'minikube 로 Deployment · Service 를 만드는 한국어 실습 영상 검색 결과' }
  ],

  terms: [
    ['오케스트레이션(orchestration)', '여러 서버에 걸친 많은 컨테이너의 배치 · 복구 · 확장 · 배포를 자동으로 관리하는 일. 쿠버네티스가 대표 도구'],
    ['클러스터(cluster)', '컨트롤 플레인과 워커 노드들을 묶은 쿠버네티스 한 벌'],
    ['컨트롤 플레인(control plane)', 'kube-apiserver · etcd · kube-scheduler · kube-controller-manager 로 이루어진 클러스터의 두뇌'],
    ['노드(node) · kubelet', '파드가 실제로 실행되는 서버와, 그 서버에서 파드를 띄우고 상태를 보고하는 에이전트'],
    ['kubectl', '쿠버네티스 API 서버에 명령을 보내는 명령줄 도구 (<code>get · describe · logs · exec · apply · delete</code>)'],
    ['minikube', '내 PC 에 노드 1대짜리 쿠버네티스 클러스터를 만들어 주는 학습 · 개발용 도구'],
    ['파드(Pod)', '쿠버네티스의 가장 작은 실행 단위. 컨테이너 1개(또는 여러 개)와 IP 하나를 가짐'],
    ['Deployment · ReplicaSet', 'Deployment 는 원하는 파드 템플릿과 개수를 선언하고 롤링 업데이트를 지휘, ReplicaSet 은 파드 개수를 유지'],
    ['Service', '라벨로 파드들을 묶어 고정 IP · DNS 이름을 주고 요청을 나눠 주는 입구 (ClusterIP · NodePort · LoadBalancer)'],
    ['라벨 · 셀렉터(label · selector)', '<code>app=web</code> 같은 이름표와, 그 이름표로 대상을 고르는 조건. Deployment · Service 가 파드를 찾는 방법'],
    ['매니페스트(manifest)', '원하는 상태를 적은 YAML 파일. <code>kubectl apply -f</code> 로 적용하는 선언형 방식'],
    ['롤링 업데이트 · 롤백', '파드를 하나씩 새 버전으로 교체하는 무중단 배포와, <code>kubectl rollout undo</code> 로 이전 버전으로 되돌리기'],
    ['ConfigMap · Secret', '파드에 넣을 설정 값과 비밀 값(base64 로 저장)을 담는 객체. env · 파일로 전달'],
    ['ImagePullBackOff · CrashLoopBackOff', '이미지를 못 받아 재시도 중인 상태 · 컨테이너가 계속 죽어 재시작을 반복하는 상태']
  ],

  summary: [
    '쿠버네티스는 여러 서버를 하나의 클러스터로 묶어 컨테이너의 <b>배치 · 자동 복구 · 확장 · 무중단 배포</b>를 맡는 오케스트레이터입니다. 한 대짜리 서버라면 Compose 로 충분합니다.',
    '컨트롤 플레인(<b>api-server · etcd · scheduler · controller-manager</b>)이 결정하고, 노드의 <b>kubelet · kube-proxy · 컨테이너 런타임</b>이 실행합니다. 원하는 상태를 선언하면 조정 루프가 맞춥니다.',
    '실무 단위는 <b>Deployment → ReplicaSet → Pod</b>. 파드는 언제든 바뀌므로 <b>Service</b>(라벨 셀렉터 + 고정 IP · DNS 이름)로 접속합니다.',
    '<code>kubectl get → describe → logs → exec</code> 가 기본 도구이고, 운영에서는 YAML 매니페스트를 <code>kubectl apply -f</code> 로 적용합니다.',
    '<code>kubectl scale</code> 로 개수를, <code>kubectl set image</code> + <code>rollout status/history/undo</code> 로 롤링 업데이트와 롤백을 합니다.',
    '<b>ImagePullBackOff</b> 는 describe 의 Events(이미지 이름 · 태그)를, <b>CrashLoopBackOff</b> 는 logs 를 먼저 봅니다. 설정은 ConfigMap, 비밀번호는 Secret 으로 env 에 넣습니다.'
  ],

  quiz: [
    {
      q: 'Docker Compose 와 비교했을 때 쿠버네티스만의 특징으로 가장 알맞은 것은?',
      options: ['YAML 파일로 여러 컨테이너를 정의할 수 있다', '여러 서버에 걸쳐 파드를 배치하고, 노드가 죽으면 다른 노드에 다시 만든다', '컨테이너 이미지를 빌드할 수 있다', '환경 변수를 컨테이너에 전달할 수 있다'],
      answer: 1,
      explain: 'YAML 정의 · 환경 변수는 Compose 도 합니다. 여러 노드에 걸친 스케줄링과 원하는 상태를 유지하는 자동 복구가 오케스트레이터의 핵심입니다.'
    },
    {
      q: '“새 파드를 어느 노드에 둘지” 결정하는 컨트롤 플레인 구성 요소는?',
      options: ['etcd', 'kubelet', 'kube-scheduler', 'kube-proxy'],
      answer: 2,
      explain: 'kube-scheduler 가 노드를 고르고, 그 노드의 kubelet 이 실제로 파드를 띄웁니다. etcd 는 상태 저장소, kube-proxy 는 Service 네트워크 규칙 담당입니다.'
    },
    {
      q: 'Deployment web(replicas: 3)의 파드 하나를 kubectl delete pod 로 지우면 어떻게 되나요?',
      options: ['파드가 2개로 줄어든 채 유지된다', 'Deployment 도 함께 지워진다', 'ReplicaSet 이 차이를 보고 새 이름의 파드를 하나 만들어 3개를 맞춘다', '같은 이름의 파드가 같은 IP 로 되살아난다'],
      answer: 2,
      explain: '원하는 상태(3개)와 실제 상태(2개)의 차이를 컨트롤러가 메웁니다. 새 파드는 이름과 IP 가 다르므로 접속은 Service 로 해야 합니다.'
    },
    {
      q: 'Service 가 요청을 보낼 파드를 고르는 기준은?',
      options: ['파드의 이름', '파드의 IP 주소', 'Service 의 selector 와 일치하는 파드의 라벨', '같은 노드에 있는지 여부'],
      answer: 2,
      explain: 'selector(예: app=web)와 라벨이 맞고 Ready 인 파드들이 Endpoints 가 됩니다. 라벨이 틀리면 Endpoints 가 &lt;none&gt; 이 되어 접속이 안 됩니다.'
    },
    {
      q: '파드 STATUS 가 CrashLoopBackOff 일 때 가장 먼저 해 볼 명령은?',
      options: ['kubectl logs 파드이름', 'kubectl scale --replicas=0', 'minikube delete', 'kubectl get nodes'],
      answer: 0,
      explain: '컨테이너가 떴다가 죽는 상태이므로 앱이 남긴 로그에 이유가 있습니다(예: POSTGRES_PASSWORD 누락). 이미지를 못 받는 ImagePullBackOff 는 describe 의 Events 를 봅니다.'
    },
    {
      q: 'kubectl set image 로 롤링 업데이트를 했는데 새 버전에 버그가 있습니다. 이전 버전으로 되돌리는 명령은?',
      options: ['kubectl delete deployment web', 'kubectl rollout undo deployment/web', 'kubectl apply --previous', 'kubectl rollout status deployment/web'],
      answer: 1,
      explain: 'Deployment 는 옛 ReplicaSet 을 0개로 남겨 두므로 rollout undo 로 바로 되돌릴 수 있습니다. rollout history 로 리비전 목록을 봅니다.'
    },
    {
      q: 'Secret 에 대한 설명으로 옳은 것은?',
      options: ['값이 강력하게 암호화되어 있어 YAML 을 Git 에 올려도 안전하다', '값은 base64 로 인코딩되어 있을 뿐이라 접근 권한 관리가 필요하다', '파드에서는 파일로만 쓸 수 있고 환경 변수로는 쓸 수 없다', 'ConfigMap 과 달리 kubectl 로 만들 수 없다'],
      answer: 1,
      explain: 'base64 는 암호화가 아니라 인코딩입니다. RBAC · etcd 암호화 · 외부 비밀 관리 도구와 함께 쓰고, env(secretKeyRef)나 볼륨 파일로 파드에 전달합니다.'
    }
  ]
});
