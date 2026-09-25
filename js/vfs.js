/* ===================================================================
   가상 파일 시스템
   - FS        : 경로 → 내용 지도 (호스트 · 이미지 · 볼륨)
   - LayerFS   : 이미지(읽기 전용) + 컨테이너 쓰기 층 + 마운트 (overlay 흉내)
   =================================================================== */
(function () {
  'use strict';

  function norm(p, cwd) {
    if (p == null || p === '') p = '.';
    p = String(p);
    if (p === '~' || p.startsWith('~/')) p = (VFS.HOME || '/root') + p.slice(1);
    if (!p.startsWith('/')) p = (cwd || '/') + '/' + p;
    const out = [];
    p.split('/').forEach(s => {
      if (!s || s === '.') return;
      if (s === '..') out.pop(); else out.push(s);
    });
    return '/' + out.join('/');
  }
  const parent = p => p === '/' ? '/' : (p.replace(/\/[^/]+$/, '') || '/');
  const base = p => p.split('/').filter(Boolean).pop() || '/';

  class FS {
    constructor(data) {
      this.files = {};
      this.dirs = new Set(['/']);
      if (data) this.load(data);
    }
    load(d) {
      this.files = Object.assign({}, d.files || {});
      this.dirs = new Set(d.dirs || ['/']);
      this.dirs.add('/');
      Object.keys(this.files).forEach(f => this._mkParents(f));
      return this;
    }
    toJSON() { return { files: this.files, dirs: Array.from(this.dirs) }; }
    clone() { return new FS(JSON.parse(JSON.stringify(this.toJSON()))); }
    _mkParents(p) { let d = parent(p); while (d !== '/' && !this.dirs.has(d)) { this.dirs.add(d); d = parent(d); } }
    stat(p) { p = norm(p); if (this.dirs.has(p)) return 'dir'; if (p in this.files) return 'file'; return null; }
    read(p) { p = norm(p); return p in this.files ? this.files[p] : null; }
    write(p, c) {
      p = norm(p);
      if (this.dirs.has(p)) throw new Error('Is a directory');
      this.files[p] = String(c == null ? '' : c); this._mkParents(p);
    }
    mkdir(p) { p = norm(p); if (p in this.files) throw new Error('File exists'); this.dirs.add(p); this._mkParents(p); }
    rm(p, rec) {
      p = norm(p);
      if (p in this.files) { delete this.files[p]; return true; }
      if (this.dirs.has(p)) {
        const kids = this.ls(p);
        if (kids.length && !rec) throw new Error('Directory not empty');
        const pre = p === '/' ? '/' : p + '/';
        Object.keys(this.files).forEach(f => { if (f.startsWith(pre)) delete this.files[f]; });
        Array.from(this.dirs).forEach(d => { if (d.startsWith(pre)) this.dirs.delete(d); });
        if (p !== '/') this.dirs.delete(p);
        return true;
      }
      return false;
    }
    ls(p) {
      p = norm(p);
      const pre = p === '/' ? '/' : p + '/';
      const set = new Set();
      Object.keys(this.files).forEach(f => { if (f.startsWith(pre)) set.add(f.slice(pre.length).split('/')[0]); });
      this.dirs.forEach(d => { if (d !== p && d.startsWith(pre)) set.add(d.slice(pre.length).split('/')[0]); });
      return Array.from(set).sort();
    }
    /** p 아래 모든 파일 (상대 경로 → 내용) */
    walk(p) {
      p = norm(p);
      const pre = p === '/' ? '/' : p + '/';
      const out = {};
      if (p in this.files) { out[base(p)] = this.files[p]; return out; }
      Object.keys(this.files).forEach(f => { if (f.startsWith(pre)) out[f.slice(pre.length)] = this.files[f]; });
      return out;
    }
    dirsUnder(p) {
      p = norm(p); const pre = p === '/' ? '/' : p + '/';
      return Array.from(this.dirs).filter(d => d.startsWith(pre)).map(d => d.slice(pre.length));
    }
  }

  /**
   * 겹친 파일 시스템: lower(이미지) 위에 upper(컨테이너 쓰기 층), 그 위에 mounts
   * mounts: [{ target:'/data', fs: FS, root:'/', ro:false }]
   */
  class LayerFS {
    constructor(lower, upper, mounts) {
      this.lower = lower;           // FS (읽기 전용)
      this.upper = upper;           // FS
      this.wh = new Set(upper._wh || []);  // 지운 파일 표시 (whiteout)
      this.mounts = (mounts || []).slice().sort((a, b) => b.target.length - a.target.length);
    }
    _m(p) {
      p = norm(p);
      for (const m of this.mounts) {
        if (p === m.target || p.startsWith(m.target + '/')) {
          const rest = p.slice(m.target.length);
          return { m, p: norm((m.root || '/') + rest) };
        }
      }
      return null;
    }
    _hidden(p) {
      for (const w of this.wh) if (p === w || p.startsWith(w + '/')) return true;
      return false;
    }
    _saveWh() { this.upper._wh = Array.from(this.wh); }
    stat(p) {
      p = norm(p);
      const r = this._m(p); if (r) return r.m.fs.stat(r.p) || (p === r.m.target ? 'dir' : null);
      if (this.mounts.some(m => m.target.startsWith(p === '/' ? '/' : p + '/'))) return 'dir';
      const u = this.upper.stat(p); if (u) return u;
      if (this._hidden(p)) return null;
      return this.lower.stat(p);
    }
    read(p) {
      p = norm(p);
      const r = this._m(p); if (r) return r.m.fs.read(r.p);
      const u = this.upper.read(p); if (u != null) return u;
      if (this._hidden(p)) return null;
      return this.lower.read(p);
    }
    write(p, c) {
      p = norm(p);
      const r = this._m(p);
      if (r) { if (r.m.ro) throw new Error('Read-only file system'); return r.m.fs.write(r.p, c); }
      if (this.readonly) throw new Error('Read-only file system');
      this.upper.write(p, c);
      if (this.wh.delete(p)) this._saveWh();
    }
    mkdir(p) {
      p = norm(p);
      const r = this._m(p);
      if (r) { if (r.m.ro) throw new Error('Read-only file system'); return r.m.fs.mkdir(r.p); }
      if (this.readonly) throw new Error('Read-only file system');
      this.upper.mkdir(p); if (this.wh.delete(p)) this._saveWh();
    }
    rm(p, rec) {
      p = norm(p);
      const r = this._m(p);
      if (r) { if (r.m.ro) throw new Error('Read-only file system'); return r.m.fs.rm(r.p, rec); }
      if (this.readonly) throw new Error('Read-only file system');
      const st = this.stat(p); if (!st) return false;
      if (st === 'dir' && this.ls(p).length && !rec) throw new Error('Directory not empty');
      this.upper.rm(p, true);
      if (this.lower.stat(p)) { this.wh.add(p); this._saveWh(); }
      return true;
    }
    ls(p) {
      p = norm(p);
      const r = this._m(p); if (r) return r.m.fs.stat(r.p) ? r.m.fs.ls(r.p) : [];
      const set = new Set(this.upper.ls(p));
      if (!this._hidden(p)) this.lower.ls(p).forEach(n => { const q = (p === '/' ? '' : p) + '/' + n; if (!this._hidden(q)) set.add(n); });
      const pre = p === '/' ? '/' : p + '/';
      this.mounts.forEach(m => { if (m.target.startsWith(pre)) set.add(m.target.slice(pre.length).split('/')[0]); });
      return Array.from(set).sort();
    }
    walk(p) {
      p = norm(p);
      const out = {};
      const rec = (dir, rel) => {
        this.ls(dir).forEach(n => {
          const full = (dir === '/' ? '' : dir) + '/' + n;
          const st = this.stat(full);
          if (st === 'file') out[rel + n] = this.read(full);
          else if (st === 'dir') rec(full, rel + n + '/');
        });
      };
      if (this.stat(p) === 'file') out[base(p)] = this.read(p); else rec(p, '');
      return out;
    }
    /** docker diff: A 추가 · C 변경 · D 삭제 */
    diff() {
      const out = [];
      Object.keys(this.upper.files).forEach(f => out.push([this.lower.stat(f) ? 'C' : 'A', f]));
      this.upper.dirs.forEach(d => { if (d !== '/' && !this.lower.stat(d)) out.push(['A', d]); });
      this.wh.forEach(w => out.push(['D', w]));
      const dirs = new Set();
      out.forEach(([, f]) => { let d = parent(f); while (d !== '/') { dirs.add(d); d = parent(d); } });
      dirs.forEach(d => { if (!out.some(o => o[1] === d)) out.push(['C', d]); });
      return out.sort((a, b) => a[1].localeCompare(b[1]));
    }
  }

  window.VFS = { FS, LayerFS, norm, parent, base, HOME: '/home/student' };
})();
