// node 로 시뮬레이터 돌려 보기: node tools/sim.cjs "docker run hello-world" "docker ps -a"
const { load } = require('./harness.cjs');
load('util.js', 'vfs.js', 'shell.js', 'hub.js', 'engine.js', 'apps-db.js', 'apps-code.js', 'apps.js', 'yaml.js', 'docker-cli.js', 'build.js', 'compose.js', 'host.js');
try { load('kube.js'); } catch (e) {}
global.Docker = { engine: new Engine() };
Host.load();
const sh = HostShell.make();
const strip = s => s.replace(/\x1b\[[\d;]*m/g, '');
async function run(line, opts = {}) {
  let text = '';
  const ac = new AbortController();
  const io = { out: s => { text += s; }, err: s => { text += s; }, signal: ac.signal,
    readline: async (p) => { text += p; return opts.answer || 'y'; },
    session: async (s) => { for (const l of (opts.session || [])) { text += (s.prompt ? strip(s.prompt()) : '') + l + '\n'; const r = await s.input(l, io); if (r === false) return 0; } return 0; } };
  if (opts.timeout) setTimeout(() => ac.abort(), opts.timeout);
  await sh.exec(line, io);
  return strip(text);
}
module.exports = { run, sh };
if (require.main === module) (async () => { for (const l of process.argv.slice(2)) { console.log('$ ' + l); console.log(await run(l, { timeout: 3000 })); } process.exit(0); })();
