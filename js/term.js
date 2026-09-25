/* ===================================================================
   웹 터미널 — ANSI 색, 명령 기록, Tab 자동 완성, Ctrl+C, 대화형 세션(-it)
   =================================================================== */
(function () {
  'use strict';
  const esc = U.esc;
  const COL = { 30: 'c-gray', 31: 'c-red', 32: 'c-green', 33: 'c-yellow', 34: 'c-blue', 35: 'c-magenta', 36: 'c-cyan', 37: 'c-white', 90: 'c-gray', 91: 'c-red', 92: 'c-green', 93: 'c-yellow', 94: 'c-blue', 95: 'c-magenta', 96: 'c-cyan', 97: 'c-white' };

  /** ANSI 문자열 → HTML */
  function ansi(text, base) {
    let out = '', st = { b: false, d: false, c: null };
    const parts = String(text).split(/\x1b\[([\d;]*)m/);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2) {
        (parts[i] || '0').split(';').forEach(code => {
          const n = +code;
          if (n === 0) st = { b: false, d: false, c: null };
          else if (n === 1) st.b = true; else if (n === 2) st.d = true;
          else if (n === 22) { st.b = false; st.d = false; }
          else if (COL[n]) st.c = COL[n]; else if (n === 39) st.c = null;
        });
        continue;
      }
      if (!parts[i]) continue;
      const cls = [base, st.c, st.b && 'b', st.d && 'dim'].filter(Boolean).join(' ');
      const t = esc(parts[i]).replace(/(https?:\/\/(?:localhost|127\.0\.0\.1):\d+[^\s<"']*)/g, '<a href="#" data-url="$1">$1</a>');
      out += cls ? `<span class="${cls}">${t}</span>` : t;
    }
    return out;
  }

  let seq = 0;
  class Terminal {
    constructor(parent, opts) {
      this.id = ++seq;
      this.opts = opts || {};
      this.el = document.createElement('div');
      this.el.className = 'term';
      this.el.tabIndex = 0;
      this.screen = document.createElement('div');
      this.screen.className = 'screen';
      this.line = document.createElement('div');
      this.line.className = 'line';
      this.promptEl = document.createElement('span');
      this.promptEl.className = 'prompt';
      this.inp = document.createElement('textarea');
      this.inp.className = 'inp';
      this.inp.rows = 1;
      this.inp.spellcheck = false;
      this.inp.autocomplete = 'off';
      this.inp.setAttribute('autocapitalize', 'off');
      this.inp.setAttribute('aria-label', '터미널 입력');
      this.line.append(this.promptEl, this.inp);
      this.el.append(this.screen, this.line);
      parent.appendChild(this.el);
      this.sh = HostShell.make();
      this.hist = U.store.get('hist', []);
      this.hi = this.hist.length;
      this.state = 'idle';       // idle | busy | session | readline
      this.sessions = [];
      this.queue = [];
      this.ctl = null;
      this.pendingP = false;
      this.onBusy = null;
      this.bind();
      this.showPrompt();
    }

    /* ------------------------------------------------ 출력 --- */
    write(text, cls) {
      if (!text) return;
      const s = document.createElement('span');
      s.innerHTML = ansi(text, cls);
      this.screen.appendChild(s);
      this.trim();
      this.scroll();
    }
    trim() {
      const kids = this.screen.childNodes;
      if (kids.length > 4000) for (let i = 0; i < 800; i++) this.screen.removeChild(this.screen.firstChild);
    }
    scroll() {
      const el = this.el;
      if (this._st) return;
      this._st = requestAnimationFrame(() => { this._st = null; el.scrollTop = el.scrollHeight; });
    }
    clear() { this.screen.innerHTML = ''; }
    sys(text) { this.write(text, 'sysmsg'); }

    get curPrompt() {
      if (this.state === 'readline') return this.rl.prompt;
      const top = this.sessions[this.sessions.length - 1];
      if (top) return typeof top.s.prompt === 'function' ? top.s.prompt() : top.s.prompt || '> ';
      return this.sh.prompt;
    }
    get curShell() { const top = this.sessions[this.sessions.length - 1]; return top && top.s.shell ? top.s.shell : (top ? null : this.sh); }
    showPrompt() {
      this.promptEl.innerHTML = ansi(this.curPrompt);
      this.line.style.display = '';
      this.inp.classList.toggle('secret', !!(this.state === 'readline' && this.rl.secret));
      this.inp.value = '';
      this.fit();
      this.scroll();
      if (this.opts.onState) this.opts.onState(this);
    }
    hideInput() { this.line.style.display = 'none'; if (this.opts.onState) this.opts.onState(this); }
    fit() { this.inp.style.height = 'auto'; this.inp.style.height = Math.max(this.inp.scrollHeight, 18) + 'px'; }
    focus() { if (this.line.style.display !== 'none') this.inp.focus({ preventScroll: true }); else this.el.focus({ preventScroll: true }); }

    /* ------------------------------------------------ io 객체 --- */
    makeIO(ctl) {
      const t = this;
      const io = {
        out: s => t.write(s),
        err: s => t.write(s, 'err'),
        signal: ctl.signal,
        clear: () => t.clear(),
        live(text) {
          const d = document.createElement('div'); d.className = 'live';
          d.innerHTML = ansi(text); t.screen.appendChild(d); t.scroll();
          return { update(x) { d.innerHTML = ansi(x); t.scroll(); }, done() { d.classList.add('fixed'); t.scroll(); } };
        },
        progress(lines) {
          const cur = lines.slice();
          const l = io.live(cur.join('\n'));
          return { set(i, s) { cur[i] = s; l.update(cur.join('\n')); }, done() { l.update(cur.join('\n')); l.done(); } };
        },
        readline(prompt, o) {
          return new Promise(res => {
            t.rl = { prompt, secret: o && o.secret, res, prev: t.state };
            t.state = 'readline';
            t.showPrompt(); t.focus();
          });
        },
        session(s, o) {
          return new Promise(res => {
            const entry = { s, opts: o || {}, res, ended: false };
            t.sessions.push(entry);
            const finish = code => { if (entry.ended) return; entry.ended = true; const i = t.sessions.indexOf(entry); if (i >= 0) t.sessions.splice(i, 1); res(code || 0); };
            entry.finish = finish;
            if (o && o.until) o.until.then(() => { if (!entry.ended && !entry.busy) { t.write('\n'); finish(0); } else entry.endAfter = true; });
            if (s.init) s.init(io);
            t.state = 'session';
            t.showPrompt(); t.focus();
          });
        },
        edit(path, content, o) { return Lab.editFile(path, content, o || {}); }
      };
      return io;
    }

    /* ------------------------------------------------ 실행 --- */
    /** 사용자가 Enter 를 눌렀을 때 */
    async submit(text) {
      const promptHtml = this.promptEl.innerHTML;
      // 입력한 줄을 화면에 남기기
      const echo = document.createElement('span');
      const shown = this.state === 'readline' && this.rl.secret ? '' : text;
      echo.innerHTML = promptHtml + `<span class="cmd-echo">${esc(shown)}</span>\n`;
      this.screen.appendChild(echo);
      this.inp.value = '';
      if (this.state === 'readline') {
        const r = this.rl; this.rl = null; this.state = r.prev === 'readline' ? 'busy' : r.prev;
        if (this.state === 'idle' || this.state === 'session') this.state = 'busy';
        this.hideInput();
        r.res(text);
        return;
      }
      const cmd = text.replace(/\s+$/, '');
      if (cmd.trim() && (this.hist[this.hist.length - 1] !== cmd)) { this.hist.push(cmd); if (this.hist.length > 300) this.hist.shift(); U.store.set('hist', this.hist); }
      this.hi = this.hist.length;
      if (this.state === 'session') {
        const top = this.sessions[this.sessions.length - 1];
        if (!cmd.trim() && !top.s.acceptEmpty) { this.showPrompt(); return; }
        this.state = 'busy';
        this.hideInput();
        const ctl = new AbortController();
        this.ctl = ctl;
        top.busy = true;
        let cont = true;
        try { cont = await top.s.input(cmd, this.makeIO(ctl)); }
        catch (e) { console.error(e); this.write(`${e.message || e}\n`, 'err'); }
        top.busy = false;
        this.ctl = null;
        if (cont === false || top.endAfter) top.finish(0);
        if (this.sessions.length) { if (this.state === 'busy') { this.state = 'session'; this.showPrompt(); } }
        else if (this.state === 'busy' && !this.running) { this.state = 'idle'; this.showPrompt(); }
        this.drain();
        return;
      }
      if (!cmd.trim()) { this.showPrompt(); return; }
      await this.exec(cmd);
    }
    async exec(cmd) {
      this.state = 'busy';
      this.running = true;
      this.hideInput();
      if (this.opts.onBusy) this.opts.onBusy(true);
      const ctl = new AbortController();
      this.ctl = ctl;
      this.sh.history = this.hist;
      const io = this.makeIO(ctl);
      if (window.Lab) Lab.recordCommand(cmd);
      try { await this.sh.exec(cmd, io); }
      catch (e) { if (!(e instanceof Sh.ExitSignal)) { console.error(e); this.write(`${e.message || e}\n`, 'err'); } }
      this.running = false;
      this.ctl = null;
      this.sessions.slice().forEach(s => s.finish && s.finish(0));
      this.state = 'idle';
      if (this.opts.onBusy) this.opts.onBusy(false);
      this.showPrompt();
      if (window.Lab) Lab.afterCommand(cmd, this.sh.last);
      this.drain();
    }
    /** 강의의 ▶ 버튼 등에서 명령 보내기 (한 줄씩 차례로) */
    run(lines) {
      const list = Array.isArray(lines) ? lines : String(lines).split('\n');
      return new Promise(res => {
        list.map(l => l.replace(/\s+$/, '')).filter(l => l.trim() && !/^\s*#/.test(l)).forEach((l, i, arr) => this.queue.push({ l, done: i === arr.length - 1 ? res : null }));
        if (!list.some(l => l.trim() && !/^\s*#/.test(l))) res();
        this.drain();
      });
    }
    drain() {
      if (!this.queue.length) return;
      if (!(this.state === 'idle' || (this.state === 'session' && !this.sessions[this.sessions.length - 1].busy))) return;
      const q = this.queue.shift();
      this.inp.value = q.l;
      const p = this.submit(q.l);
      const after = () => { if (q.done) q.done(); };
      Promise.resolve(p).then(() => setTimeout(() => { after(); this.drain(); }, 30));
    }
    interrupt() {
      if (this.state === 'readline') { const r = this.rl; this.rl = null; this.write('^C\n'); this.state = 'busy'; this.hideInput(); r.res(''); if (this.ctl) this.ctl.abort(); return; }
      if (this.ctl) { this.queue = []; this.ctl.abort(); return; }
      // 대기 중 Ctrl+C: 새 줄
      const html = this.promptEl.innerHTML;
      const s = document.createElement('span'); s.innerHTML = html + esc(this.inp.value) + '^C\n';
      this.screen.appendChild(s); this.inp.value = ''; this.queue = []; this.showPrompt();
    }

    /* ------------------------------------------------ 키 입력 --- */
    bind() {
      this.el.addEventListener('mousedown', e => { if (e.target.closest('a') || window.getSelection().toString()) return; });
      this.el.addEventListener('click', e => {
        const a = e.target.closest('a[data-url]');
        if (a) { e.preventDefault(); Lab.openBrowser(a.dataset.url); return; }
        if (!window.getSelection().toString()) this.focus();
      });
      const onKey = e => {
        const k = e.key;
        if (e.ctrlKey && (k === 'c' || k === 'C') && !(this.inp === document.activeElement && this.inp.selectionStart !== this.inp.selectionEnd)) { e.preventDefault(); this.interrupt(); return; }
        if (e.ctrlKey && (k === 'l' || k === 'L')) { e.preventDefault(); this.clear(); return; }
        if (e.ctrlKey && (k === 'p' || k === 'P')) { e.preventDefault(); this.pendingP = true; return; }
        if (e.ctrlKey && (k === 'q' || k === 'Q') && this.pendingP) {
          e.preventDefault(); this.pendingP = false;
          const top = this.sessions[this.sessions.length - 1];
          if (top && top.opts.detachable && !top.busy) { this.write('\nread escape sequence\n', 'sysmsg'); top.finish(0); if (!this.sessions.length) this.state = 'busy'; }
          return;
        }
        if (!e.ctrlKey) this.pendingP = false;
      };
      this.el.addEventListener('keydown', e => { if (e.target !== this.inp) onKey(e); });
      this.inp.addEventListener('keydown', e => {
        onKey(e);
        if (e.defaultPrevented) return;
        const k = e.key;
        if (k === 'Enter' && !e.shiftKey) { e.preventDefault(); if (this.state === 'idle' || this.state === 'session' || this.state === 'readline') this.submit(this.inp.value); return; }
        if (k === 'ArrowUp' && this.state !== 'readline') { e.preventDefault(); if (this.hi > 0) { this.hi--; this.inp.value = this.hist[this.hi]; this.fit(); this.moveEnd(); } return; }
        if (k === 'ArrowDown' && this.state !== 'readline') { e.preventDefault(); if (this.hi < this.hist.length) { this.hi++; this.inp.value = this.hist[this.hi] || ''; this.fit(); this.moveEnd(); } return; }
        if (k === 'Tab') { e.preventDefault(); this.complete(); return; }
        if (e.ctrlKey && (k === 'd' || k === 'D') && !this.inp.value) {
          e.preventDefault();
          const top = this.sessions[this.sessions.length - 1];
          if (this.state === 'session' && top) { this.write(ansi(this.curPrompt) ? '' : ''); if (top.s.onCtrlD) top.s.onCtrlD(); this.submit('exit'); }
          return;
        }
        if (e.ctrlKey && (k === 'u' || k === 'U')) { e.preventDefault(); this.inp.value = ''; return; }
        if (e.ctrlKey && (k === 'a' || k === 'A')) { e.preventDefault(); this.inp.setSelectionRange(0, 0); return; }
        if (e.ctrlKey && (k === 'e' || k === 'E')) { e.preventDefault(); this.moveEnd(); return; }
      });
      this.inp.addEventListener('input', () => {
        // 여러 줄 붙여넣기 → 한 줄씩 실행
        if (this.inp.value.includes('\n')) {
          const lines = this.inp.value.split('\n');
          this.inp.value = '';
          this.run(lines);
          return;
        }
        this.fit();
      });
    }
    moveEnd() { const n = this.inp.value.length; this.inp.setSelectionRange(n, n); }

    /* ------------------------------------------------ 자동 완성 --- */
    complete() {
      const v = this.inp.value.slice(0, this.inp.selectionStart);
      const after = this.inp.value.slice(this.inp.selectionStart);
      const words = v.split(/\s+/);
      const cur = words[words.length - 1];
      const sh = this.curShell;
      if (!sh) return;
      let cands = [];
      const D = Docker.engine;
      if (words.length === 1) cands = Object.keys(sh.cmds).filter(c => c.startsWith(cur) && !/^[.:[]$/.test(c));
      else if (words[0] === 'docker' || (words[0] === 'sudo' && words[1] === 'docker')) {
        const w = words[0] === 'sudo' ? words.slice(1) : words;
        const sub = w[1];
        if (w.length === 2) cands = ['run', 'ps', 'images', 'pull', 'push', 'build', 'exec', 'logs', 'stop', 'start', 'restart', 'rm', 'rmi', 'inspect', 'network', 'volume', 'compose', 'tag', 'login', 'logout', 'search', 'history', 'stats', 'top', 'port', 'cp', 'diff', 'commit', 'kill', 'pause', 'unpause', 'rename', 'update', 'wait', 'system', 'image', 'container', 'version', 'info', 'events', 'save', 'load', 'scout', 'init', 'buildx', 'attach', 'create'].filter(c => c.startsWith(cur));
        else if (['network'].includes(sub) && w.length === 3) cands = ['ls', 'create', 'rm', 'inspect', 'connect', 'disconnect', 'prune'].filter(c => c.startsWith(cur));
        else if (['volume'].includes(sub) && w.length === 3) cands = ['ls', 'create', 'rm', 'inspect', 'prune'].filter(c => c.startsWith(cur));
        else if (['compose'].includes(sub) && w.length === 3) cands = ['up', 'down', 'ps', 'logs', 'exec', 'build', 'config', 'restart', 'stop', 'start', 'run', 'pull', 'ls', 'top', 'images', 'watch'].filter(c => c.startsWith(cur));
        else if (['system'].includes(sub) && w.length === 3) cands = ['df', 'prune', 'info', 'events'].filter(c => c.startsWith(cur));
        else if (['run', 'pull', 'rmi', 'history', 'tag', 'push', 'create', 'save'].includes(sub) && !cur.startsWith('-')) cands = D.s.images.reduce((a, i) => a.concat(i.repoTags), []).concat(sub === 'run' || sub === 'pull' ? Object.keys(Hub.REPOS) : []).filter(c => c.startsWith(cur));
        else if (['network'].includes(sub)) cands = D.s.networks.map(n => n.name).concat(D.s.containers.map(c => c.name)).filter(c => c.startsWith(cur));
        else if (['volume'].includes(sub)) cands = D.s.volumes.map(n => n.name).filter(c => c.startsWith(cur));
        else if (!cur.startsWith('-') && !['build', 'compose'].includes(sub)) cands = D.s.containers.map(c => c.name).filter(c => c.startsWith(cur));
        if (!cands.length || sub === 'build' || sub === 'cp' || cur.includes('/') || cur.startsWith('.')) cands = cands.concat(this.pathCands(sh, cur));
      } else cands = this.pathCands(sh, cur);
      cands = Array.from(new Set(cands)).sort();
      if (!cands.length) return;
      if (cands.length === 1) {
        const c = cands[0];
        this.inp.value = v.slice(0, v.length - cur.length) + c + (c.endsWith('/') ? '' : ' ') + after;
        this.moveEnd(); this.fit();
        return;
      }
      let pre = cands[0];
      cands.forEach(c => { while (!c.startsWith(pre)) pre = pre.slice(0, -1); });
      if (pre.length > cur.length) { this.inp.value = v.slice(0, v.length - cur.length) + pre + after; this.moveEnd(); return; }
      const s = document.createElement('span');
      s.innerHTML = this.promptEl.innerHTML + esc(this.inp.value) + '\n' + esc(cands.map(c => c.split('/').filter(Boolean).pop() + (c.endsWith('/') ? '/' : '')).join('  ')) + '\n';
      this.screen.appendChild(s); this.scroll();
    }
    pathCands(sh, cur) {
      const dir = cur.includes('/') ? cur.slice(0, cur.lastIndexOf('/') + 1) : '';
      const pre = cur.slice(dir.length);
      const abs = sh.abs(dir || '.');
      let names = [];
      try { names = sh.fs.stat(abs) === 'dir' ? sh.fs.ls(abs) : []; } catch (_) {}
      return names.filter(n => n.startsWith(pre) && (!n.startsWith('.') || pre.startsWith('.'))).map(n => dir + n + (sh.fs.stat(abs + '/' + n) === 'dir' ? '/' : ''));
    }
  }

  window.Terminal = Terminal;
  window.ansiToHtml = ansi;
})();
