// node 테스트용: 브라우저 전역을 흉내 내고 js 파일을 불러온다
const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global; global.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
global.Blob = class { constructor(a) { this.size = Buffer.byteLength(a.join('')); } };
global.document = undefined;
function load(...files) { files.forEach(f => vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f })); }
function io() { const o = { text: '', out: s => o.text += s, err: s => o.text += s, signal: null }; return o; }
module.exports = { load, io };
