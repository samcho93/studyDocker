/* ===================================================================
   가상 Docker Hub — 이미지 목록 (크기 · 레이어 · 기본 설정 · 동작 종류)
   크기는 2025~2026년 공식 이미지(amd64) 기준의 근삿값
   =================================================================== */
(function () {
  'use strict';
  const MB = 1e6, KB = 1e3;

  /* 운영체제 바탕 (첫 레이어, 여러 이미지가 같은 레이어를 공유 → "Already exists") */
  const OS = {
    debian: { name: 'Debian GNU/Linux 12 (bookworm)', id: 'debian', ver: '12', size: 74.8 * MB, sh: ['bash', 'sh'], pm: 'apt', tools: ['bash'] },
    'debian-slim': { name: 'Debian GNU/Linux 12 (bookworm)', id: 'debian', ver: '12', size: 28.2 * MB, sh: ['bash', 'sh'], pm: 'apt', tools: ['bash'] },
    ubuntu: { name: 'Ubuntu 24.04.1 LTS', id: 'ubuntu', ver: '24.04', size: 78.1 * MB, sh: ['bash', 'sh'], pm: 'apt', tools: ['bash', 'ps'] },
    ubuntu22: { name: 'Ubuntu 22.04.5 LTS', id: 'ubuntu', ver: '22.04', size: 77.9 * MB, sh: ['bash', 'sh'], pm: 'apt', tools: ['bash', 'ps'] },
    alpine: { name: 'Alpine Linux v3.20', id: 'alpine', ver: '3.20.3', size: 7.8 * MB, sh: ['sh', 'ash'], pm: 'apk', tools: ['ping', 'wget', 'nslookup', 'ip', 'ps', 'top', 'vi', 'free'] },
    busybox: { name: 'BusyBox', id: 'busybox', ver: '1.37', size: 4.26 * MB, sh: ['sh'], pm: null, tools: ['ping', 'wget', 'nslookup', 'ip', 'ps', 'top', 'vi', 'free', 'httpd'] },
    distroless: { name: 'Debian GNU/Linux 12 (bookworm)', id: 'debian', ver: '12', size: 2.0 * MB, sh: [], pm: null, tools: [] },
    scratch: { name: '', id: '', ver: '', size: 0, sh: [], pm: null, tools: [] }
  };

  /**
   * repo: { desc, official, stars, pulls, tags: { tag: [size, os, kind 덮어쓰기?] }, cfg, kind, tools, pkgs }
   * cfg: Cmd, Entrypoint, ExposedPorts, Env, WorkingDir, StopSignal, Volumes, User
   */
  const REPOS = {
    'hello-world': {
      desc: 'Hello World! (an example of minimal Dockerization)', official: true, stars: 2400, pulls: '1B+',
      tags: { latest: [10.1 * KB, 'scratch'], linux: [10.1 * KB, 'scratch'] },
      cfg: { Cmd: ['/hello'] }, kind: 'hello'
    },
    alpine: {
      desc: 'A minimal Docker image based on Alpine Linux with a complete package index and only 5 MB in size!', official: true, stars: 11200, pulls: '1B+',
      tags: { latest: [7.8 * MB, 'alpine'], '3.20': [7.8 * MB, 'alpine'], '3.19': [7.4 * MB, 'alpine'], '3.18': [7.3 * MB, 'alpine'] },
      cfg: { Cmd: ['/bin/sh'] }, kind: 'shell'
    },
    busybox: {
      desc: 'Busybox base image.', official: true, stars: 3300, pulls: '1B+',
      tags: { latest: [4.26 * MB, 'busybox'], '1.37': [4.26 * MB, 'busybox'], musl: [1.46 * MB, 'busybox'] },
      cfg: { Cmd: ['sh'] }, kind: 'shell'
    },
    ubuntu: {
      desc: 'Ubuntu is a Debian-based Linux operating system based on free software.', official: true, stars: 17800, pulls: '1B+',
      tags: { latest: [78.1 * MB, 'ubuntu'], '24.04': [78.1 * MB, 'ubuntu'], noble: [78.1 * MB, 'ubuntu'], '22.04': [77.9 * MB, 'ubuntu22'], jammy: [77.9 * MB, 'ubuntu22'], '20.04': [72.8 * MB, 'ubuntu22'] },
      cfg: { Cmd: ['/bin/bash'] }, kind: 'shell'
    },
    debian: {
      desc: 'Debian is a Linux distribution that\'s composed entirely of free and open-source software.', official: true, stars: 5000, pulls: '1B+',
      tags: { latest: [117 * MB, 'debian'], bookworm: [117 * MB, 'debian'], 'bookworm-slim': [74.8 * MB, 'debian-slim'], '12': [117 * MB, 'debian'] },
      cfg: { Cmd: ['bash'] }, kind: 'shell'
    },
    nginx: {
      desc: 'Official build of Nginx.', official: true, stars: 20600, pulls: '1B+',
      tags: { latest: [192 * MB, 'debian'], '1.27': [192 * MB, 'debian'], stable: [188 * MB, 'debian'], '1.26': [188 * MB, 'debian'], alpine: [47.9 * MB, 'alpine'], '1.27-alpine': [47.9 * MB, 'alpine'], '1.21': [133 * MB, 'debian'], '1.19': [133 * MB, 'debian'] },
      cfg: { Entrypoint: ['/docker-entrypoint.sh'], Cmd: ['nginx', '-g', 'daemon off;'], ExposedPorts: ['80/tcp'], Env: ['NGINX_VERSION=1.27.2'], StopSignal: 'SIGQUIT' },
      kind: 'nginx', tools: ['curl', 'nginx']
    },
    httpd: {
      desc: 'The Apache HTTP Server Project', official: true, stars: 4800, pulls: '1B+',
      tags: { latest: [148 * MB, 'debian-slim'], '2.4': [148 * MB, 'debian-slim'], alpine: [62.2 * MB, 'alpine'] },
      cfg: { Cmd: ['httpd-foreground'], ExposedPorts: ['80/tcp'], WorkingDir: '/usr/local/apache2', Env: ['HTTPD_VERSION=2.4.62'], StopSignal: 'SIGWINCH' },
      kind: 'httpd'
    },
    redis: {
      desc: 'Redis is the world’s fastest data platform for caching, vector search, and NoSQL databases.', official: true, stars: 13000, pulls: '1B+',
      tags: { latest: [117 * MB, 'debian-slim'], '7': [117 * MB, 'debian-slim'], '7.4': [117 * MB, 'debian-slim'], alpine: [41.2 * MB, 'alpine'], '7-alpine': [41.2 * MB, 'alpine'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['redis-server'], ExposedPorts: ['6379/tcp'], WorkingDir: '/data', Volumes: ['/data'], Env: ['REDIS_VERSION=7.4.1'] },
      kind: 'redis', tools: ['redis-cli']
    },
    postgres: {
      desc: 'The PostgreSQL object-relational database system provides reliability and data integrity.', official: true, stars: 14000, pulls: '1B+',
      tags: { latest: [435 * MB, 'debian'], '17': [435 * MB, 'debian'], '16': [432 * MB, 'debian'], '16-alpine': [251 * MB, 'alpine'], '17-alpine': [273 * MB, 'alpine'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['postgres'], ExposedPorts: ['5432/tcp'], Volumes: ['/var/lib/postgresql/data'], Env: ['PG_MAJOR=17', 'PGDATA=/var/lib/postgresql/data'], StopSignal: 'SIGINT' },
      kind: 'postgres', tools: ['psql']
    },
    mysql: {
      desc: 'MySQL is a widely used, open-source relational database management system (RDBMS).', official: true, stars: 15600, pulls: '1B+',
      tags: { latest: [586 * MB, 'debian'], '8.4': [578 * MB, 'debian'], '8.0': [573 * MB, 'debian'], '9': [586 * MB, 'debian'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['mysqld'], ExposedPorts: ['3306/tcp', '33060/tcp'], Volumes: ['/var/lib/mysql'], Env: ['MYSQL_MAJOR=8.4'] },
      kind: 'mysql', tools: ['mysql']
    },
    mariadb: {
      desc: 'MariaDB Server is a high performing open source relational database, forked from MySQL.', official: true, stars: 6000, pulls: '1B+',
      tags: { latest: [407 * MB, 'ubuntu'], '11': [407 * MB, 'ubuntu'], lts: [405 * MB, 'ubuntu'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['mariadbd'], ExposedPorts: ['3306/tcp'], Volumes: ['/var/lib/mysql'] },
      kind: 'mysql', tools: ['mysql', 'mariadb']
    },
    mongo: {
      desc: 'MongoDB document databases provide high availability and easy scalability.', official: true, stars: 10400, pulls: '1B+',
      tags: { latest: [855 * MB, 'ubuntu'], '8': [855 * MB, 'ubuntu'], '7': [794 * MB, 'ubuntu'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['mongod'], ExposedPorts: ['27017/tcp'], Volumes: ['/data/db', '/data/configdb'] },
      kind: 'mongo', tools: ['mongosh']
    },
    python: {
      desc: 'Python is an interpreted, interactive, object-oriented, open-source programming language.', official: true, stars: 9800, pulls: '1B+',
      tags: { latest: [1020 * MB, 'debian'], '3.13': [1020 * MB, 'debian'], '3.12': [1020 * MB, 'debian'], '3.12-slim': [125 * MB, 'debian-slim'], '3.13-slim': [124 * MB, 'debian-slim'], '3.12-alpine': [52.6 * MB, 'alpine'], '3.11': [1010 * MB, 'debian'] },
      cfg: { Cmd: ['python3'], Env: ['PYTHON_VERSION=3.12.7', 'LANG=C.UTF-8'] },
      kind: 'python', tools: ['python', 'python3', 'pip', 'pip3'], fullTools: ['curl', 'wget', 'git', 'ps', 'gcc']
    },
    node: {
      desc: 'Node.js is a JavaScript-based platform for server-side and networking applications.', official: true, stars: 13600, pulls: '1B+',
      tags: { latest: [1120 * MB, 'debian'], '22': [1120 * MB, 'debian'], lts: [1120 * MB, 'debian'], '22-slim': [228 * MB, 'debian-slim'], '22-alpine': [159 * MB, 'alpine'], '20': [1100 * MB, 'debian'], '20-alpine': [137 * MB, 'alpine'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['node'], Env: ['NODE_VERSION=22.11.0', 'YARN_VERSION=1.22.22'] },
      kind: 'node', tools: ['node', 'npm', 'npx', 'yarn'], fullTools: ['curl', 'wget', 'git', 'ps', 'gcc']
    },
    golang: {
      desc: 'Go (golang) is a general purpose, higher-level, imperative programming language.', official: true, stars: 4900, pulls: '1B+',
      tags: { latest: [838 * MB, 'debian'], '1.23': [838 * MB, 'debian'], '1.23-alpine': [253 * MB, 'alpine'] },
      cfg: { Cmd: ['bash'], WorkingDir: '/go', Env: ['GOLANG_VERSION=1.23.3', 'GOPATH=/go', 'PATH=/go/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'] },
      kind: 'shell', tools: ['go'], fullTools: ['curl', 'wget', 'git', 'ps', 'gcc']
    },
    'eclipse-temurin': {
      desc: 'Official Images for OpenJDK binaries built by Eclipse Temurin.', official: true, stars: 800, pulls: '500M+',
      tags: { latest: [459 * MB, 'ubuntu'], '21': [459 * MB, 'ubuntu'], '21-jdk': [459 * MB, 'ubuntu'], '21-jre': [271 * MB, 'ubuntu'], '21-jre-alpine': [192 * MB, 'alpine'] },
      cfg: { Cmd: ['jshell'], Env: ['JAVA_HOME=/opt/java/openjdk', 'JAVA_VERSION=jdk-21.0.5+11'] },
      kind: 'java', tools: ['java', 'javac']
    },
    wordpress: {
      desc: 'The rich content management system which powers more than 40% of the web.', official: true, stars: 5700, pulls: '1B+',
      tags: { latest: [701 * MB, 'debian'], '6': [701 * MB, 'debian'], 'php8.3-apache': [701 * MB, 'debian'] },
      cfg: { Entrypoint: ['docker-entrypoint.sh'], Cmd: ['apache2-foreground'], ExposedPorts: ['80/tcp'], WorkingDir: '/var/www/html', Volumes: ['/var/www/html'] },
      kind: 'wordpress', tools: ['curl']
    },
    adminer: {
      desc: 'Database management in a single PHP file.', official: true, stars: 800, pulls: '100M+',
      tags: { latest: [118 * MB, 'alpine'], '4': [118 * MB, 'alpine'] },
      cfg: { Entrypoint: ['entrypoint.sh', 'docker-php-entrypoint'], Cmd: ['php', '-S', '[::]:8080', '-t', '/var/www/html'], ExposedPorts: ['8080/tcp'], User: 'adminer' },
      kind: 'adminer'
    },
    registry: {
      desc: 'Distribution implementation for storing and distributing of container images and artifacts', official: true, stars: 4000, pulls: '1B+',
      tags: { latest: [25.4 * MB, 'alpine'], '2': [25.4 * MB, 'alpine'], '2.8': [25.4 * MB, 'alpine'] },
      cfg: { Entrypoint: ['/entrypoint.sh'], Cmd: ['/etc/docker/registry/config.yml'], ExposedPorts: ['5000/tcp'], Volumes: ['/var/lib/registry'] },
      kind: 'registry'
    },
    'traefik/whoami': {
      desc: 'Tiny Go webserver that prints OS information and HTTP request to output.', stars: 150, pulls: '100M+',
      tags: { latest: [6.9 * MB, 'scratch'], 'v1.10': [6.9 * MB, 'scratch'] },
      cfg: { Entrypoint: ['/whoami'], ExposedPorts: ['80/tcp'] }, kind: 'whoami'
    },
    'docker/getting-started': {
      desc: 'Getting Started tutorial for first time Docker users', stars: 400, pulls: '100M+',
      tags: { latest: [47 * MB, 'alpine'] },
      cfg: { Entrypoint: ['/docker-entrypoint.sh'], Cmd: ['nginx', '-g', 'daemon off;'], ExposedPorts: ['80/tcp'] }, kind: 'nginx', tools: ['nginx'], site: 'getting-started'
    },
    'nicolaka/netshoot': {
      desc: 'a Docker + Kubernetes network trouble-shooting swiss-army container', stars: 700, pulls: '100M+',
      tags: { latest: [434 * MB, 'alpine'] },
      cfg: { Cmd: ['zsh'] }, kind: 'shell', tools: ['bash', 'zsh', 'curl', 'dig', 'nslookup', 'ping', 'ip', 'ss', 'netstat', 'tcpdump', 'iperf3', 'nc', 'traceroute', 'ps', 'top']
    },
    'curlimages/curl': {
      desc: 'official curl container image', stars: 140, pulls: '500M+',
      tags: { latest: [22.4 * MB, 'alpine'], '8.11.0': [22.4 * MB, 'alpine'] },
      cfg: { Entrypoint: ['/entrypoint.sh'], Cmd: ['curl'], User: 'curl_user' }, kind: 'curl', tools: ['curl']
    },
    'polinux/stress': {
      desc: 'stress - tool to impose load on and stress test systems', stars: 60, pulls: '10M+',
      tags: { latest: [9.74 * MB, 'alpine'] },
      cfg: { Cmd: ['stress', '--help'] }, kind: 'shell', tools: ['stress']
    },
    'prom/prometheus': {
      desc: 'Prometheus monitoring system and time series database', stars: 1000, pulls: '1B+',
      tags: { latest: [289 * MB, 'busybox'], 'v3.0.0': [289 * MB, 'busybox'] },
      cfg: { Entrypoint: ['/bin/prometheus'], Cmd: ['--config.file=/etc/prometheus/prometheus.yml'], ExposedPorts: ['9090/tcp'], User: 'nobody', WorkingDir: '/prometheus' },
      kind: 'web', web: { port: 9090, title: 'Prometheus', page: 'prometheus' }
    },
    'grafana/grafana': {
      desc: 'The open-source platform for monitoring and observability', stars: 3000, pulls: '1B+',
      tags: { latest: [480 * MB, 'alpine'], '11.3.0': [480 * MB, 'alpine'] },
      cfg: { Entrypoint: ['/run.sh'], ExposedPorts: ['3000/tcp'], User: '472', WorkingDir: '/usr/share/grafana' },
      kind: 'web', web: { port: 3000, title: 'Grafana', page: 'grafana' }
    },
    'portainer/portainer-ce': {
      desc: 'Portainer CE - a lightweight service delivery platform for containerized applications', stars: 2400, pulls: '1B+',
      tags: { latest: [310 * MB, 'scratch'], lts: [300 * MB, 'scratch'] },
      cfg: { Entrypoint: ['/portainer'], ExposedPorts: ['8000/tcp', '9000/tcp', '9443/tcp'], WorkingDir: '/', Volumes: ['/data'] },
      kind: 'web', web: { port: 9000, title: 'Portainer', page: 'portainer' }
    },
    'gcr.io/distroless/static-debian12': {
      desc: 'Distroless: language focused docker images, minus the operating system.', stars: 0, pulls: '-',
      tags: { latest: [1.99 * MB, 'distroless'], nonroot: [1.99 * MB, 'distroless'] },
      cfg: { User: '0' }, kind: 'none'
    }
  };

  /** 오래된 이미지일수록 취약점이 많다 (docker scout 흉내) */
  const CVES = {
    'nginx:1.19': { C: 6, H: 31, M: 58, L: 120 }, 'nginx:1.21': { C: 4, H: 22, M: 40, L: 102 },
    'python:3.11': { C: 2, H: 14, M: 30, L: 180 }, 'node:20': { C: 1, H: 9, M: 28, L: 150 },
    'ubuntu:20.04': { C: 0, H: 3, M: 25, L: 40 }, 'alpine:3.18': { C: 0, H: 2, M: 3, L: 0 }
  };

  function resolve(ref) {
    // ref: [registry/]repo[:tag][@digest]
    let r = String(ref || '').trim();
    let digest = null;
    const at = r.indexOf('@'); if (at >= 0) { digest = r.slice(at + 1); r = r.slice(0, at); }
    let tag = 'latest';
    const lastSlash = r.lastIndexOf('/');
    const colon = r.lastIndexOf(':');
    if (colon > lastSlash) { tag = r.slice(colon + 1); r = r.slice(0, colon); }
    let repo = r.replace(/^docker\.io\//, '').replace(/^library\//, '').replace(/^index\.docker\.io\//, '');
    return { repo, tag, digest, full: repo + ':' + tag };
  }

  /** 운영체제 파일 시스템 만들기 */
  function osFiles(osKey, host) {
    const o = OS[osKey] || OS.debian;
    const files = {}, dirs = ['/'];
    if (osKey === 'scratch' || osKey === 'distroless') {
      if (osKey === 'distroless') { files['/etc/os-release'] = `PRETTY_NAME="Distroless"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nID=debian\nHOME_URL="https://github.com/GoogleContainerTools/distroless"\n`; files['/etc/passwd'] = 'root:x:0:0:root:/root:/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/sbin/nologin\nnonroot:x:65532:65532:nonroot:/home/nonroot:/sbin/nologin\n'; }
      ['/etc', '/proc', '/sys', '/dev', '/tmp'].forEach(d => dirs.push(d));
      return { files, dirs };
    }
    ['/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/media', '/mnt', '/opt', '/proc', '/root', '/run', '/sbin', '/srv', '/sys', '/tmp', '/usr', '/usr/bin', '/usr/local', '/usr/local/bin', '/usr/lib', '/usr/share', '/var', '/var/log', '/var/lib', '/var/cache', '/var/tmp'].forEach(d => dirs.push(d));
    if (o.id === 'alpine' || o.id === 'busybox') {
      files['/etc/os-release'] = o.id === 'alpine' ? `NAME="Alpine Linux"\nID=alpine\nVERSION_ID=${o.ver}\nPRETTY_NAME="${o.name}"\nHOME_URL="https://alpinelinux.org/"\nBUG_REPORT_URL="https://gitlab.alpinelinux.org/alpine/aports/-/issues"\n` : `NAME=BusyBox\nVERSION=${o.ver}\n`;
      if (o.id === 'alpine') files['/etc/alpine-release'] = o.ver + '\n';
      files['/etc/passwd'] = 'root:x:0:0:root:/root:/bin/sh\nbin:x:1:1:bin:/bin:/sbin/nologin\nnobody:x:65534:65534:nobody:/:/sbin/nologin\n';
    } else {
      files['/etc/os-release'] = o.id === 'ubuntu'
        ? `PRETTY_NAME="${o.name}"\nNAME="Ubuntu"\nVERSION_ID="${o.ver}"\nVERSION="${o.ver} LTS"\nID=ubuntu\nID_LIKE=debian\nHOME_URL="https://www.ubuntu.com/"\n`
        : `PRETTY_NAME="${o.name}"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nVERSION="12 (bookworm)"\nVERSION_CODENAME=bookworm\nID=debian\nHOME_URL="https://www.debian.org/"\n`;
      files['/etc/debian_version'] = o.id === 'ubuntu' ? 'trixie/sid\n' : '12.8\n';
      files['/etc/passwd'] = 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin\n';
      files['/root/.bashrc'] = '# ~/.bashrc: executed by bash(1) for non-login shells.\nPS1=\'${debian_chroot:+($debian_chroot)}\\u@\\h:\\w\\$ \'\n';
    }
    files['/etc/hostname'] = (host || 'localhost') + '\n';
    return { files, dirs };
  }

  /** 이미지별 추가 파일 */
  function repoFiles(repo, tag, kind, meta) {
    const f = {};
    if (kind === 'hello') f['/hello'] = '\x7fELF (binary)';
    if (kind === 'nginx') {
      const html = meta && meta.site === 'getting-started' ? SITES.gettingStarted : SITES.nginxWelcome;
      f['/usr/share/nginx/html/index.html'] = html;
      f['/usr/share/nginx/html/50x.html'] = SITES.nginx50x;
      f['/etc/nginx/nginx.conf'] = NGINX_CONF;
      f['/etc/nginx/conf.d/default.conf'] = NGINX_DEFAULT;
      f['/docker-entrypoint.sh'] = '#!/bin/sh\n# vim:sw=4:ts=4:et\nset -e\n...\nexec "$@"\n';
      f['/var/log/nginx/access.log'] = '';
      f['/var/log/nginx/error.log'] = '';
    }
    if (kind === 'httpd') {
      f['/usr/local/apache2/htdocs/index.html'] = '<html><body><h1>It works!</h1></body></html>\n';
      f['/usr/local/apache2/conf/httpd.conf'] = 'ServerRoot "/usr/local/apache2"\nListen 80\nDocumentRoot "/usr/local/apache2/htdocs"\n';
      f['/usr/local/bin/httpd-foreground'] = '#!/bin/sh\nset -e\nrm -f /usr/local/apache2/logs/httpd.pid\nexec httpd -DFOREGROUND "$@"\n';
    }
    if (kind === 'redis') f['/usr/local/bin/docker-entrypoint.sh'] = '#!/bin/sh\nset -e\nexec "$@"\n';
    if (kind === 'postgres') f['/usr/local/bin/docker-entrypoint.sh'] = '#!/usr/bin/env bash\nset -Eeo pipefail\n# ...\n';
    if (kind === 'mysql') f['/usr/local/bin/docker-entrypoint.sh'] = '#!/bin/bash\nset -eo pipefail\n# ...\n';
    if (kind === 'wordpress') { f['/var/www/html/index.php'] = '<?php\ndefine( \'WP_USE_THEMES\', true );\nrequire __DIR__ . \'/wp-blog-header.php\';\n'; f['/var/www/html/wp-config-docker.php'] = "<?php\ndefine( 'DB_NAME', getenv_docker('WORDPRESS_DB_NAME', 'wordpress') );\n"; }
    if (kind === 'python') { f['/usr/local/bin/python3'] = '(binary)'; f['/usr/local/bin/pip'] = '(binary)'; }
    if (kind === 'node') { f['/usr/local/bin/node'] = '(binary)'; f['/usr/local/bin/docker-entrypoint.sh'] = '#!/bin/sh\nset -e\nexec "$@"\n'; }
    if (kind === 'registry') f['/etc/docker/registry/config.yml'] = 'version: 0.1\nstorage:\n  filesystem:\n    rootdirectory: /var/lib/registry\nhttp:\n  addr: :5000\n';
    if (kind === 'whoami') f['/whoami'] = '(binary)';
    if (repo === 'prom/prometheus') f['/etc/prometheus/prometheus.yml'] = 'global:\n  scrape_interval: 15s\nscrape_configs:\n  - job_name: "prometheus"\n    static_configs:\n      - targets: ["localhost:9090"]\n';
    return f;
  }

  const NGINX_CONF = `user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    access_log  /var/log/nginx/access.log  main;
    sendfile        on;
    keepalive_timeout  65;
    include /etc/nginx/conf.d/*.conf;
}
`;
  const NGINX_DEFAULT = `server {
    listen       80;
    listen  [::]:80;
    server_name  localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
`;

  const SITES = {
    nginxWelcome: `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
`,
    nginx50x: '<!DOCTYPE html>\n<html>\n<head><title>Error</title></head>\n<body>\n<h1>An error occurred.</h1>\n<p>Sorry, the page you are looking for is currently unavailable.<br/>\nPlease try again later.</p>\n</body>\n</html>\n',
    gettingStarted: `<!DOCTYPE html><html><head><title>Getting Started</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#f5f7fb;color:#1c2331}header{background:#1d63ed;color:#fff;padding:18px 28px;font-size:20px;font-weight:700}main{max-width:720px;margin:24px auto;padding:0 20px}.card{background:#fff;border-radius:10px;padding:18px 22px;margin:14px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}code{background:#eef2ff;padding:2px 6px;border-radius:4px}</style></head>
<body><header>🐳 Docker Getting Started</header><main>
<div class="card"><h2>Congratulations!</h2><p>You have started the container for this tutorial!</p>
<p>The command you just ran: <code>docker run -d -p 80:80 docker/getting-started</code></p>
<ul><li><code>-d</code> — run the container in detached mode (in the background)</li><li><code>-p 80:80</code> — map port 80 of the host to port 80 in the container</li><li><code>docker/getting-started</code> — the image to use</li></ul></div>
<div class="card"><h3>What is a container?</h3><p>Simply put, a container is simply another process on your machine that has been isolated from all other processes on the host machine.</p></div>
</main></body></html>`
  };

  function info(ref) {
    const r = resolve(ref);
    const repo = REPOS[r.repo];
    if (!repo) return null;
    const t = repo.tags[r.tag];
    if (!t) return { repo: r.repo, tag: r.tag, missingTag: true };
    return { repo: r.repo, tag: r.tag, size: t[0], os: t[1], def: repo, kind: repo.kind };
  }

  /** 이미지 설명 → 엔진이 쓰는 이미지 객체 (레이어 · 설정 · 파일) */
  function makeImage(ref) {
    const inf = info(ref);
    if (!inf || inf.missingTag) return null;
    const { repo, tag, size, os, def } = inf;
    const o = OS[os] || OS.debian;
    const created = Date.now() - (5 + (U.hash(repo + tag).charCodeAt(0) % 20)) * 86400000;
    const layers = [];
    const osLayer = { id: U.hash('os:' + os), size: Math.min(o.size, size), created_by: `/bin/sh -c #(nop) ADD file:${U.hash(os, 12)} in / ` };
    if (o.size > 0) layers.push(osLayer);
    let rest = size - (o.size > 0 ? osLayer.size : 0);
    if (rest > 0) {
      const parts = rest > 50 * MB ? [0.72, 0.24, 0.04] : rest < 1 * MB ? [1] : [0.9, 0.1];
      const what = {
        nginx: ['set -x && groupadd --system nginx && apt-get install --no-install-recommends -y nginx=${NGINX_VERSION} …', 'COPY docker-entrypoint.sh / # buildkit', 'COPY 30-tune-worker-processes.sh /docker-entrypoint.d # buildkit'],
        python: ['set -eux; apt-get update; apt-get install -y --no-install-recommends libbluetooth-dev tk-dev uuid-dev …', 'set -eux; wget -O python.tar.xz "https://www.python.org/ftp/python/…"; ./configure …; make -j "$(nproc)" …', 'set -eux; for src in idle3 pip3 pydoc3 python3 python3-config; do …'],
        node: ['groupadd --gid 1000 node && useradd --uid 1000 --gid node --shell /bin/bash --create-home node', 'ARCH= && dpkgArch="$(dpkg --print-architecture)" && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/…"', 'set -ex && for key in … ; do gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key"'],
      }[def.kind] || [`set -eux; apt-get update; apt-get install -y ${repo.replace(/\W/g, '')} …`, 'COPY docker-entrypoint.sh /usr/local/bin/ # buildkit', 'RUN /bin/sh -c mkdir -p /data # buildkit'];
      parts.forEach((pc, i) => layers.push({ id: U.hash('l:' + repo + ':' + tag + ':' + i), size: Math.round(rest * pc), created_by: 'RUN /bin/sh -c ' + (what[i] || what[0]) + ' # buildkit' }));
    }
    const cfg = JSON.parse(JSON.stringify(def.cfg || {}));
    cfg.Env = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'].concat((cfg.Env || []).filter(e => !/^PATH=/.test(e)), (def.cfg.Env || []).filter(e => /^PATH=/.test(e)));
    if ((def.cfg.Env || []).some(e => /^PATH=/.test(e))) cfg.Env = cfg.Env.filter((e, i) => !(i === 0 && /^PATH=/.test(e)));
    // 메타 레이어 (크기 0)
    const meta = [];
    if (cfg.Env) cfg.Env.filter(e => !/^PATH=/.test(e)).forEach(e => meta.push(`ENV ${e}`));
    if (cfg.WorkingDir) meta.push(`WORKDIR ${cfg.WorkingDir}`);
    if (cfg.ExposedPorts) meta.push(`EXPOSE map[${cfg.ExposedPorts.map(p => p + ':{}').join(' ')}]`);
    if (cfg.Volumes) meta.push(`VOLUME [${cfg.Volumes.join(' ')}]`);
    if (cfg.StopSignal) meta.push(`STOPSIGNAL ${cfg.StopSignal}`);
    if (cfg.Entrypoint) meta.push(`ENTRYPOINT ${JSON.stringify(cfg.Entrypoint)}`);
    if (cfg.Cmd) meta.push(`CMD ${JSON.stringify(cfg.Cmd)}`);
    const fsd = osFiles(os);
    Object.assign(fsd.files, repoFiles(repo, tag, def.kind, def));
    if (cfg.WorkingDir) fsd.dirs.push(cfg.WorkingDir);
    (cfg.Volumes || []).forEach(v => fsd.dirs.push(v));
    const tools = [].concat(o.tools, o.sh, def.tools || [], (os === 'debian' && def.fullTools) || []);
    if (o.pm === 'apt') tools.push('apt', 'apt-get', 'dpkg');
    if (o.pm === 'apk') tools.push('apk');
    const shortRepo = repo;
    return {
      id: U.hash('img:' + repo + ':' + tag),
      repoTags: [shortRepo + ':' + tag],
      repoDigests: [shortRepo + '@sha256:' + U.hash('dg:' + repo + ':' + tag)],
      created,
      size,
      os, osName: o.name,
      kind: def.kind,
      site: def.site,
      web: def.web,
      layers: layers.map(l => Object.assign({ created: created - 3600000 }, l)),
      history: meta.map(m => ({ created_by: m, size: 0, empty: true })),
      config: cfg,
      fs: fsd,
      pkgs: tools.map(t => 'bin:' + t),
      arch: 'amd64'
    };
  }

  function search(term) {
    const q = String(term || '').toLowerCase();
    return Object.keys(REPOS).filter(k => k.includes(q) || REPOS[k].desc.toLowerCase().includes(q))
      .map(k => ({ name: k, desc: REPOS[k].desc, stars: REPOS[k].stars, official: !!REPOS[k].official }))
      .sort((a, b) => b.stars - a.stars);
  }

  window.Hub = { OS, REPOS, CVES, SITES, resolve, info, makeImage, search, osFiles };
})();
