import fs from 'node:fs';
import path from 'node:path';

function walk(d) {
  const r = [];
  try {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const s = fs.statSync(p);
      if (s.isDirectory()) r.push(...walk(p));
      else r.push(p);
    }
  } catch (e) {}
  return r;
}

const dist = 'd:/6/恋爱小程序/apps/client/dist/build/mp-weixin';
const files = walk(dist);
for (const f of files) {
  if (/\.(js|wxml|wxss|json|wx)$/i.test(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    lines.forEach((line, i) => {
      if (/\.svg["'`)]/.test(line)) {
        console.log(f.replace(dist + '/', '') + ':' + (i + 1) + ': ' + line.trim().substring(0, 200));
      }
    });
  }
}
