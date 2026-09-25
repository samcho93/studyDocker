/* ===================================================================
   미션 채점 도우미 — lessons 의 check(M) 에서 쓰는 함수 모음
   (브라우저의 Lab 과 node 검증 도구가 함께 쓴다)
   =================================================================== */
(function () {
  'use strict';
  function helpers(D, getLog) {
    const find = n => D.findContainer(n);
    const log = () => (getLog ? getLog() : []);
    const M = {
      D,
      /** 컨테이너 찾기 (이름 · ID) */
      c: find,
      exists: n => !!find(n),
      running: n => { const c = find(n); return !!c && c.state.status === 'running'; },
      status: n => { const c = find(n); return c ? c.state.status : null; },
      exitCode: n => { const c = find(n); return c ? c.state.exitCode : null; },
      /** 조건에 맞는 컨테이너 목록 (쿠버네티스 파드 컨테이너 제외) */
      cs: f => D.s.containers.filter(c => !c.kube).filter(f || (() => true)),
      /** 이미지로 만든 실행 중 컨테이너가 있나 */
      runningFrom: ref => { const img = D.findImage(ref); return D.s.containers.some(c => !c.kube && c.state.status === 'running' && (c.image === ref || (img && c.imageId === img.id))); },
      image: r => D.findImage(r),
      images: () => D.s.images,
      vol: n => D.volume(n),
      net: n => D.network(n),
      /** 호스트 포트를 게시한 실행 중 컨테이너 */
      port: p => { const c = D.hostPortOwner(p); return c && c.state.status === 'running' ? c : null; },
      connected: (n, net) => { const c = find(n); return !!c && !!c.networks[net]; },
      mount: (n, target) => { const c = find(n); return c ? c.hostConfig.mounts.find(m => m.target === target) || null : null; },
      env: (n, k) => { const c = find(n); return c ? D.envOf(c)[k] : undefined; },
      health: n => { const c = find(n); return c && c.health ? c.health.status : null; },
      restart: n => { const c = find(n); return c ? c.hostConfig.restart.name : null; },
      memory: n => { const c = find(n); return c ? c.hostConfig.memory : 0; },
      /** 호스트 파일 (~/ 경로 가능) */
      file: p => Host.fs.read(VFS.norm(String(p).replace(/^~/, VFS.HOME))),
      /** 컨테이너 안 파일 */
      cfile: (n, p) => { const c = find(n); return c ? Apps.fsFor(D, c, 'root').read(p) : null; },
      /** 명령을 한 번이라도 실행했나 (정규식) */
      ran: re => log().some(x => re.test(x.c)),
      /** http://localhost:포트 응답 본문 (Promise) */
      get: async url => { const r = await D.http(null, url); return r.error ? '' : String(r.body || ''); },
      logs: n => { const c = find(n); return c ? c.logs.map(l => l.m).join('\n') : ''; },
      /** compose 프로젝트의 서비스 컨테이너들 */
      svc: (project, service) => D.s.containers.filter(c => c.compose && c.compose.project === project && c.compose.service === service && !c.compose.oneoff),
      project: name => D.s.containers.filter(c => c.compose && c.compose.project === name && !c.compose.oneoff),
      pushed: ref => { const r = Hub.resolve(ref); const k = r.repo + ':' + r.tag; return !!(D.s.registry[k] || D.s.hubPushed[k]); },
      kube: () => (window.Kube && Kube.s) || null,
      deploy: n => (window.Kube && Kube.s && Kube.s.deploys[n]) || null,
      ksvc: n => (window.Kube && Kube.s && Kube.s.svcs[n]) || null,
      pods: f => window.Kube && Kube.s ? Object.values(Kube.s.pods).filter(f || (() => true)) : []
    };
    return M;
  }
  window.MissionHelpers = helpers;
})();
