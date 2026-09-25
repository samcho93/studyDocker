// 간단한 문자열 치환 도구: node tools/patch.cjs patchfile.json
// patchfile: [{ "file": "js/x.js", "a": "찾을 문자열", "b": "바꿀 문자열", "all": false }]
const fs = require('fs'), path = require('path');
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let bad = 0;
for (const p of list) {
  const f = path.join(__dirname, '..', p.file);
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes(p.a)) { console.log('NOT FOUND:', p.file, JSON.stringify(p.a.slice(0, 80))); bad++; continue; }
  s = p.all ? s.split(p.a).join(p.b) : s.replace(p.a, () => p.b);
  fs.writeFileSync(f, s);
  console.log('ok:', p.file);
}
process.exit(bad ? 1 : 0);
