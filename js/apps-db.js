/* ===================================================================
   작은 데이터베이스들 — Redis · SQL(PostgreSQL/MySQL) · MongoDB 흉내
   데이터는 컨테이너 파일 시스템(보통 볼륨) 안의 JSON 파일에 저장된다
   → 볼륨을 쓰면 컨테이너를 지워도 데이터가 남는 것을 실제처럼 확인할 수 있다
   =================================================================== */
(function () {
  'use strict';

  function loadJSON(fs, path, def) {
    try { const s = fs.read(path); return s ? JSON.parse(s) : def; } catch (_) { return def; }
  }
  function saveJSON(fs, path, obj) { fs.write(path, JSON.stringify(obj)); }

  /* ================================================================ Redis */
  const REDIS_FILE = '/data/dump.rdb';
  function redisDB(fs) { return loadJSON(fs, REDIS_FILE, { kv: {} }); }

  /** 명령 하나 실행 → 출력 문자열 (redis-cli 모양) */
  function redisCmd(fs, argv, opts) {
    opts = opts || {};
    const db = redisDB(fs);
    const kv = db.kv;
    const cmd = (argv[0] || '').toUpperCase();
    const a = argv.slice(1);
    const q = s => `"${s}"`;
    const save = () => saveJSON(fs, REDIS_FILE, db);
    const wrong = () => `(error) ERR wrong number of arguments for '${argv[0].toLowerCase()}' command`;
    const typeErr = '(error) WRONGTYPE Operation against a key holding the wrong kind of value';
    switch (cmd) {
      case 'PING': return a[0] ? q(a[0]) : 'PONG';
      case 'ECHO': return q(a[0] || '');
      case 'SET': {
        if (a.length < 2) return wrong();
        if (a.map(x => x.toUpperCase()).includes('NX') && a[0] in kv) return '(nil)';
        kv[a[0]] = { t: 'string', v: a[1] }; save(); return 'OK';
      }
      case 'SETNX': if (a[0] in kv) return '(integer) 0'; kv[a[0]] = { t: 'string', v: a[1] }; save(); return '(integer) 1';
      case 'MSET': for (let i = 0; i + 1 < a.length; i += 2) kv[a[i]] = { t: 'string', v: a[i + 1] }; save(); return 'OK';
      case 'GET': { if (a.length !== 1) return wrong(); const e = kv[a[0]]; if (!e) return '(nil)'; if (e.t !== 'string') return typeErr; return q(e.v); }
      case 'MGET': return a.map((k, i) => `${i + 1}) ${kv[k] && kv[k].t === 'string' ? q(kv[k].v) : '(nil)'}`).join('\n');
      case 'APPEND': { const e = kv[a[0]] || { t: 'string', v: '' }; e.v += a[1] || ''; kv[a[0]] = e; save(); return `(integer) ${e.v.length}`; }
      case 'STRLEN': return `(integer) ${kv[a[0]] ? String(kv[a[0]].v).length : 0}`;
      case 'INCR': case 'DECR': case 'INCRBY': case 'DECRBY': {
        const e = kv[a[0]] || { t: 'string', v: '0' };
        if (e.t !== 'string') return typeErr;
        if (!/^-?\d+$/.test(e.v)) return '(error) ERR value is not an integer or out of range';
        const by = cmd.endsWith('BY') ? +a[1] : 1;
        e.v = String(+e.v + (cmd.startsWith('INCR') ? by : -by)); kv[a[0]] = e; save();
        return `(integer) ${e.v}`;
      }
      case 'DEL': { let n = 0; a.forEach(k => { if (k in kv) { delete kv[k]; n++; } }); save(); return `(integer) ${n}`; }
      case 'EXISTS': return `(integer) ${a.filter(k => k in kv).length}`;
      case 'KEYS': {
        const re = new RegExp('^' + (a[0] || '*').replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        const ks = Object.keys(kv).filter(k => re.test(k));
        return ks.length ? ks.map((k, i) => `${i + 1}) ${q(k)}`).join('\n') : '(empty array)';
      }
      case 'TYPE': return kv[a[0]] ? kv[a[0]].t : 'none';
      case 'EXPIRE': return `(integer) ${a[0] in kv ? 1 : 0}`;
      case 'TTL': return `(integer) ${a[0] in kv ? -1 : -2}`;
      case 'DBSIZE': return `(integer) ${Object.keys(kv).length}`;
      case 'FLUSHALL': case 'FLUSHDB': db.kv = {}; saveJSON(fs, REDIS_FILE, db); return 'OK';
      case 'LPUSH': case 'RPUSH': {
        const e = kv[a[0]] || { t: 'list', v: [] }; if (e.t !== 'list') return typeErr;
        a.slice(1).forEach(x => cmd === 'LPUSH' ? e.v.unshift(x) : e.v.push(x)); kv[a[0]] = e; save(); return `(integer) ${e.v.length}`;
      }
      case 'LPOP': case 'RPOP': { const e = kv[a[0]]; if (!e || !e.v.length) return '(nil)'; const x = cmd === 'LPOP' ? e.v.shift() : e.v.pop(); save(); return q(x); }
      case 'LLEN': return `(integer) ${kv[a[0]] ? kv[a[0]].v.length : 0}`;
      case 'LRANGE': {
        const e = kv[a[0]]; if (!e) return '(empty array)';
        let s = +a[1], t = +a[2]; const L = e.v.length; if (s < 0) s += L; if (t < 0) t += L;
        const r = e.v.slice(s, t + 1);
        return r.length ? r.map((x, i) => `${i + 1}) ${q(x)}`).join('\n') : '(empty array)';
      }
      case 'HSET': { const e = kv[a[0]] || { t: 'hash', v: {} }; if (e.t !== 'hash') return typeErr; let n = 0; for (let i = 1; i + 1 < a.length; i += 2) { if (!(a[i] in e.v)) n++; e.v[a[i]] = a[i + 1]; } kv[a[0]] = e; save(); return `(integer) ${n}`; }
      case 'HGET': { const e = kv[a[0]]; return e && e.v[a[1]] != null ? q(e.v[a[1]]) : '(nil)'; }
      case 'HGETALL': { const e = kv[a[0]]; if (!e) return '(empty array)'; let i = 0; return Object.keys(e.v).map(k => `${++i}) ${q(k)}\n${++i}) ${q(e.v[k])}`).join('\n'); }
      case 'SADD': { const e = kv[a[0]] || { t: 'set', v: [] }; let n = 0; a.slice(1).forEach(x => { if (!e.v.includes(x)) { e.v.push(x); n++; } }); kv[a[0]] = e; save(); return `(integer) ${n}`; }
      case 'SMEMBERS': { const e = kv[a[0]]; return e && e.v.length ? e.v.map((x, i) => `${i + 1}) ${q(x)}`).join('\n') : '(empty array)'; }
      case 'SAVE': case 'BGSAVE': return cmd === 'SAVE' ? 'OK' : 'Background saving started';
      case 'INFO': return `# Server\nredis_version:7.4.1\nredis_mode:standalone\nos:Linux 6.10.14-linuxkit x86_64\ntcp_port:6379\n\n# Keyspace\ndb0:keys=${Object.keys(kv).length},expires=0,avg_ttl=0`;
      case 'CONFIG': return a[0] && a[0].toUpperCase() === 'GET' ? `1) ${q(a[1])}\n2) ${q(a[1] === 'dir' ? '/data' : '')}` : 'OK';
      case 'SELECT': return 'OK';
      case 'CLIENT': return 'OK';
      case 'QUIT': return 'OK';
      default: return `(error) ERR unknown command '${argv[0]}', with args beginning with: ${a.map(x => `'${x}'`).join(' ')}`;
    }
  }

  /* ================================================================ SQL */
  /* 데이터 파일: { users:{name:{password}}, dbs:{ name:{ tables:{ t:{ cols:[{name,type}], rows:[[]] , seq } } } }, init:true } */
  function sqlFile(flavor) { return flavor === 'mysql' ? '/var/lib/mysql/ibdata.json' : '/var/lib/postgresql/data/pgdata.json'; }
  function sqlLoad(fs, flavor) { return loadJSON(fs, sqlFile(flavor), null); }
  function sqlSave(fs, flavor, d) { saveJSON(fs, sqlFile(flavor), d); }

  /** SQL 문장 쪼개기 (따옴표 안의 ; 무시) */
  function splitSql(s) {
    const out = []; let cur = '', q = null;
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
      if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function splitComma(s) {
    const out = []; let cur = '', d = 0, q = null;
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
      if (ch === '(') d++; if (ch === ')') d--;
      if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function val(v) {
    v = String(v).trim();
    if (/^'.*'$/s.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    if (/^".*"$/s.test(v)) return v.slice(1, -1);
    if (/^null$/i.test(v)) return null;
    if (/^(true|false)$/i.test(v)) return /^true$/i.test(v);
    if (/^-?\d+(\.\d+)?$/.test(v)) return +v;
    if (/^now\(\)$|^current_timestamp$/i.test(v)) return new Date().toISOString().replace('T', ' ').slice(0, 19);
    return v;
  }
  const ident = s => String(s).trim().replace(/^[`"]|[`"]$/g, '');

  /** where 절: a = 1 AND b = 'x' 정도만 */
  function whereFn(cols, w) {
    if (!w) return () => true;
    const parts = w.split(/\s+and\s+/i).map(p => {
      const m = p.match(/^\s*([`"\w.]+)\s*(=|!=|<>|>=|<=|>|<|like)\s*(.+?)\s*$/i);
      if (!m) return () => true;
      const ci = cols.findIndex(c => c.name === ident(m[1].split('.').pop()));
      const v = val(m[3]); const op = m[2].toLowerCase();
      return row => {
        const x = row[ci];
        switch (op) {
          case '=': return x == v; case '!=': case '<>': return x != v;
          case '>': return x > v; case '<': return x < v; case '>=': return x >= v; case '<=': return x <= v;
          case 'like': return new RegExp('^' + String(v).replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(x));
        }
        return true;
      };
    });
    return row => parts.every(f => f(row));
  }

  /**
   * SQL 실행 → { cols, rows } | { msg } | { error }
   * ctx: { d(데이터), db(현재 DB 이름), flavor }
   */
  function sqlExec(ctx, sql) {
    const d = ctx.d; const my = ctx.flavor === 'mysql';
    const s = sql.trim().replace(/\s+/g, ' ');
    let m;
    const dbObj = () => d.dbs[ctx.db];
    const noDb = () => ({ error: my ? 'ERROR 1046 (3D000): No database selected' : `ERROR:  database "${ctx.db}" does not exist` });
    const table = name => { const db = dbObj(); return db && db.tables[ident(name).toLowerCase()]; };
    if (/^select version\(\)$/i.test(s)) return { cols: ['version'], rows: [[my ? '8.4.3' : 'PostgreSQL 17.2 (Debian 17.2-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit']] };
    if ((m = s.match(/^select (now\(\)|current_timestamp|current_date)$/i))) return { cols: [m[1].toLowerCase().replace('()', '')], rows: [[new Date().toISOString().replace('T', ' ').slice(0, 19)]] };
    if ((m = s.match(/^select current_user$|^select user\(\)$/i))) return { cols: ['current_user'], rows: [[ctx.user || 'postgres']] };
    if ((m = s.match(/^select database\(\)$|^select current_database\(\)$/i))) return { cols: [my ? 'database()' : 'current_database'], rows: [[ctx.db]] };
    if ((m = s.match(/^select ([\d\s+\-*/().]+)$/i))) { try { const r = Function('return (' + m[1] + ')')(); return { cols: [my ? m[1].trim() : '?column?'], rows: [[r]] }; } catch (_) {} }
    if ((m = s.match(/^select '([^']*)'$/i))) return { cols: [my ? m[1] : '?column?'], rows: [[m[1]]] };
    if ((m = s.match(/^create database (if not exists )?([`"\w]+)$/i))) {
      const n = ident(m[2]).toLowerCase();
      if (d.dbs[n]) { if (m[1]) return { msg: my ? 'Query OK, 1 row affected, 1 warning (0.00 sec)' : 'NOTICE' }; return { error: my ? `ERROR 1007 (HY000): Can't create database '${n}'; database exists` : `ERROR:  database "${n}" already exists` }; }
      d.dbs[n] = { tables: {} }; return { msg: my ? 'Query OK, 1 row affected (0.01 sec)' : 'CREATE DATABASE', dirty: true };
    }
    if ((m = s.match(/^drop database (if exists )?([`"\w]+)$/i))) { const n = ident(m[2]).toLowerCase(); if (!d.dbs[n]) return m[1] ? { msg: 'DROP DATABASE' } : { error: my ? `ERROR 1008 (HY000): Can't drop database '${n}'; database doesn't exist` : `ERROR:  database "${n}" does not exist` }; delete d.dbs[n]; return { msg: my ? 'Query OK, 0 rows affected (0.01 sec)' : 'DROP DATABASE', dirty: true }; }
    if (/^show databases$/i.test(s)) return { cols: ['Database'], rows: Object.keys(d.dbs).sort().map(x => [x]) };
    if ((m = s.match(/^use ([`\w]+)$/i))) { const n = ident(m[1]).toLowerCase(); if (!d.dbs[n]) return { error: `ERROR 1049 (42000): Unknown database '${n}'` }; ctx.db = n; return { msg: 'Database changed' }; }
    if (/^show tables$/i.test(s)) { const db = dbObj(); if (!db) return noDb(); return { cols: ['Tables_in_' + ctx.db], rows: Object.keys(db.tables).sort().map(x => [x]) }; }
    if ((m = s.match(/^create table (if not exists )?([`"\w]+) ?\((.+)\)$/i))) {
      const db = dbObj(); if (!db) return noDb();
      const n = ident(m[2]).toLowerCase();
      if (db.tables[n]) return m[1] ? { msg: my ? 'Query OK, 0 rows affected, 1 warning (0.00 sec)' : 'CREATE TABLE' } : { error: my ? `ERROR 1050 (42S01): Table '${n}' already exists` : `ERROR:  relation "${n}" already exists` };
      const cols = splitComma(m[3]).filter(c => !/^(primary|foreign|unique|constraint|key|index)\b/i.test(c)).map(c => {
        const p = c.split(/\s+/); return { name: ident(p[0]).toLowerCase(), type: (p[1] || 'text').toLowerCase(), auto: /serial|auto_increment|identity/i.test(c) };
      });
      db.tables[n] = { cols, rows: [], seq: 0 };
      return { msg: my ? 'Query OK, 0 rows affected (0.02 sec)' : 'CREATE TABLE', dirty: true };
    }
    if ((m = s.match(/^drop table (if exists )?([`"\w]+)$/i))) { const db = dbObj(); if (!db) return noDb(); const n = ident(m[2]).toLowerCase(); if (!db.tables[n]) return m[1] ? { msg: 'DROP TABLE' } : { error: my ? `ERROR 1051 (42S02): Unknown table '${ctx.db}.${n}'` : `ERROR:  table "${n}" does not exist` }; delete db.tables[n]; return { msg: my ? 'Query OK, 0 rows affected (0.01 sec)' : 'DROP TABLE', dirty: true }; }
    if ((m = s.match(/^insert into ([`"\w]+) ?(?:\(([^)]*)\))? ?values ?(.+?)( returning .+)?$/i))) {
      const t = table(m[1]); if (!t) return { error: my ? `ERROR 1146 (42S02): Table '${ctx.db}.${ident(m[1])}' doesn't exist` : `ERROR:  relation "${ident(m[1])}" does not exist` };
      const names = m[2] ? splitComma(m[2]).map(x => ident(x).toLowerCase()) : t.cols.map(c => c.name);
      const tuples = m[3].match(/\((?:[^()']|'(?:[^']|'')*')*\)/g) || [];
      tuples.forEach(tp => {
        const vs = splitComma(tp.slice(1, -1)).map(val);
        const row = t.cols.map(c => { const i = names.indexOf(c.name); if (i >= 0) return vs[i]; if (c.auto) return ++t.seq; if (/timestamp|datetime/.test(c.type)) return new Date().toISOString().replace('T', ' ').slice(0, 19); return null; });
        t.cols.forEach((c, i) => { if (c.auto && typeof row[i] === 'number' && row[i] > t.seq) t.seq = row[i]; });
        t.rows.push(row);
      });
      return { msg: my ? `Query OK, ${tuples.length} row${tuples.length > 1 ? 's' : ''} affected (0.01 sec)` : `INSERT 0 ${tuples.length}`, dirty: true };
    }
    if ((m = s.match(/^select (.+?) from ([`"\w.]+)(?: where (.+?))?(?: order by ([`"\w]+)( desc| asc)?)?(?: limit (\d+))?$/i))) {
      const t = table(m[2].split('.').pop()); if (!t) return { error: my ? `ERROR 1146 (42S02): Table '${ctx.db}.${ident(m[2])}' doesn't exist` : `ERROR:  relation "${ident(m[2])}" does not exist\nLINE 1: ${sql}` };
      let rows = t.rows.filter(whereFn(t.cols, m[3]));
      if (m[4]) { const ci = t.cols.findIndex(c => c.name === ident(m[4]).toLowerCase()); rows = rows.slice().sort((a, b) => a[ci] > b[ci] ? 1 : a[ci] < b[ci] ? -1 : 0); if (m[5] && /desc/i.test(m[5])) rows.reverse(); }
      if (m[6]) rows = rows.slice(0, +m[6]);
      if (/^count\(\*\)$/i.test(m[1].trim())) return { cols: [my ? 'count(*)' : 'count'], rows: [[rows.length]] };
      if (m[1].trim() === '*') return { cols: t.cols.map(c => c.name), rows };
      const want = splitComma(m[1]).map(x => ident(x).toLowerCase());
      const idx = want.map(w => t.cols.findIndex(c => c.name === w));
      const bad = want.find((w, i) => idx[i] < 0);
      if (bad) return { error: my ? `ERROR 1054 (42S22): Unknown column '${bad}' in 'field list'` : `ERROR:  column "${bad}" does not exist` };
      return { cols: want, rows: rows.map(r => idx.map(i => r[i])) };
    }
    if ((m = s.match(/^update ([`"\w]+) set (.+?)(?: where (.+))?$/i))) {
      const t = table(m[1]); if (!t) return { error: `ERROR:  relation "${ident(m[1])}" does not exist` };
      const sets = splitComma(m[2]).map(x => { const [k, v] = x.split('='); return [t.cols.findIndex(c => c.name === ident(k).toLowerCase()), val(v)]; });
      const f = whereFn(t.cols, m[3]); let n = 0;
      t.rows.forEach(r => { if (f(r)) { sets.forEach(([i, v]) => { if (i >= 0) r[i] = v; }); n++; } });
      return { msg: my ? `Query OK, ${n} rows affected (0.00 sec)\nRows matched: ${n}  Changed: ${n}  Warnings: 0` : `UPDATE ${n}`, dirty: true };
    }
    if ((m = s.match(/^delete from ([`"\w]+)(?: where (.+))?$/i))) {
      const t = table(m[1]); if (!t) return { error: `ERROR:  relation "${ident(m[1])}" does not exist` };
      const f = whereFn(t.cols, m[2]); const before = t.rows.length;
      t.rows = t.rows.filter(r => !f(r));
      return { msg: my ? `Query OK, ${before - t.rows.length} rows affected (0.00 sec)` : `DELETE ${before - t.rows.length}`, dirty: true };
    }
    if ((m = s.match(/^(?:describe|desc) ([`\w]+)$/i))) { const t = table(m[1]); if (!t) return { error: `ERROR 1146 (42S02): Table '${ctx.db}.${m[1]}' doesn't exist` }; return { cols: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'], rows: t.cols.map(c => [c.name, c.type, 'YES', c.auto ? 'PRI' : '', 'NULL', c.auto ? 'auto_increment' : '']) }; }
    if (/^(begin|commit|rollback|start transaction)$/i.test(s)) return { msg: my ? 'Query OK, 0 rows affected (0.00 sec)' : s.toUpperCase() };
    if ((m = s.match(/^create user /i)) || /^grant /i.test(s) || /^alter user /i.test(s) || /^flush privileges$/i.test(s)) return { msg: my ? 'Query OK, 0 rows affected (0.01 sec)' : s.split(' ').slice(0, 2).join(' ').toUpperCase() };
    return { error: my ? `ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${sql.slice(0, 40)}' at line 1` : `ERROR:  syntax error at or near "${sql.split(/\s+/)[0]}"\nLINE 1: ${sql}\n        ^` };
  }

  function fmtPsql(r) {
    if (r.error) return r.error;
    if (r.msg) return r.msg;
    const cols = r.cols, rows = r.rows.map(x => x.map(v => v == null ? '' : String(v)));
    const w = cols.map((c, i) => Math.max(U.strW(c), ...rows.map(x => U.strW(x[i] || ''))));
    const head = ' ' + cols.map((c, i) => { const p = w[i] - U.strW(c); return ' '.repeat(Math.floor(p / 2)) + c + ' '.repeat(Math.ceil(p / 2)); }).join(' | ');
    const sep = cols.map((c, i) => '-'.repeat(w[i] + 2)).join('+');
    const body = rows.map(x => ' ' + x.map((v, i) => typeof r.rows[0][i] === 'number' ? ' '.repeat(w[i] - U.strW(v)) + v : U.pad(v, w[i])).join(' | '));
    return [head, sep].concat(body).join('\n') + `\n(${rows.length} row${rows.length === 1 ? '' : 's'})\n`;
  }
  function fmtMysql(r) {
    if (r.error) return r.error;
    if (r.msg) return r.msg;
    if (!r.rows.length) return 'Empty set (0.00 sec)';
    const cols = r.cols, rows = r.rows.map(x => x.map(v => v == null ? 'NULL' : String(v)));
    const w = cols.map((c, i) => Math.max(U.strW(c), ...rows.map(x => U.strW(x[i]))));
    const line = '+' + w.map(n => '-'.repeat(n + 2)).join('+') + '+';
    const fmt = x => '| ' + x.map((v, i) => U.pad(v, w[i])).join(' | ') + ' |';
    return [line, fmt(cols), line].concat(rows.map(fmt), [line]).join('\n') + `\n${rows.length} row${rows.length === 1 ? '' : 's'} in set (0.00 sec)\n`;
  }

  /* ================================================================ MongoDB (아주 조금) */
  const MONGO_FILE = '/data/db/collections.json';
  function relaxedJSON(s) {
    s = String(s || '').trim();
    if (!s) return {};
    const fixed = s.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":').replace(/'([^']*)'/g, '"$1"');
    return JSON.parse(fixed);
  }
  function mongoCmd(fs, ctx, line) {
    const d = loadJSON(fs, MONGO_FILE, { dbs: { admin: {}, config: {}, local: {} } });
    const save = () => saveJSON(fs, MONGO_FILE, d);
    const s = line.trim().replace(/;$/, '');
    let m;
    if (/^show (dbs|databases)$/.test(s)) return Object.keys(d.dbs).sort().map(n => `${U.pad(n, 10)} ${Object.keys(d.dbs[n]).length ? '40.00 KiB' : ' 8.00 KiB'}`).join('\n');
    if ((m = s.match(/^use (\w+)$/))) { ctx.db = m[1]; return `switched to db ${m[1]}`; }
    if (/^show collections$/.test(s)) return Object.keys(d.dbs[ctx.db] || {}).join('\n');
    if (s === 'db') return ctx.db;
    if ((m = s.match(/^db\.(\w+)\.(insertOne|insertMany|find|findOne|countDocuments|deleteMany|drop)\((.*)\)(\.pretty\(\))?$/s))) {
      const coll = m[1], op = m[2];
      d.dbs[ctx.db] = d.dbs[ctx.db] || {};
      const arr = d.dbs[ctx.db][coll] = d.dbs[ctx.db][coll] || [];
      let arg; try { arg = m[3].trim() ? relaxedJSON(m[3]) : {}; } catch (e) { return `SyntaxError: ${e.message}`; }
      const match = q => doc => Object.keys(q || {}).every(k => doc[k] === q[k]);
      if (op === 'insertOne') { const id = U.hex(24); arr.push(Object.assign({ _id: id }, arg)); save(); return `{\n  acknowledged: true,\n  insertedId: ObjectId('${id}')\n}`; }
      if (op === 'insertMany') { const ids = (Array.isArray(arg) ? arg : []).map(x => { const id = U.hex(24); arr.push(Object.assign({ _id: id }, x)); return id; }); save(); return `{\n  acknowledged: true,\n  insertedIds: {\n${ids.map((id, i) => `    '${i}': ObjectId('${id}')`).join(',\n')}\n  }\n}`; }
      const found = arr.filter(match(arg));
      const show = x => JSON.stringify(x, null, 2).replace(/"_id": "(\w+)"/, "_id: ObjectId('$1')").replace(/"(\w+)":/g, '$1:');
      if (op === 'find') return found.length ? '[\n' + found.map(x => show(x).replace(/^/gm, '  ')).join(',\n') + '\n]' : '';
      if (op === 'findOne') return found.length ? show(found[0]) : 'null';
      if (op === 'countDocuments') return String(found.length);
      if (op === 'deleteMany') { d.dbs[ctx.db][coll] = arr.filter(x => !match(arg)(x)); save(); return `{ acknowledged: true, deletedCount: ${found.length} }`; }
      if (op === 'drop') { delete d.dbs[ctx.db][coll]; save(); return 'true'; }
    }
    if (/^db\.version\(\)$/.test(s)) return '8.0.3';
    if (/^(exit|quit)(\(\))?$/.test(s)) return null;
    return `ReferenceError: ${s.split(/[.(\s]/)[0]} is not defined`;
  }

  window.DB = { redisCmd, redisDB, sqlLoad, sqlSave, sqlExec, splitSql, fmtPsql, fmtMysql, mongoCmd, relaxedJSON };
})();
