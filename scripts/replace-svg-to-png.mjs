import fs from 'node:fs';
import path from 'node:path';

function walk(d) {
  const r = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) r.push(...walk(p));
    else if (/\.(vue|ts|tsx)$/.test(f)) r.push(p);
  }
  return r;
}

const files = walk('d:/6/恋爱小程序/apps/client/src');
let total = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  const before = c;
  c = c.replace(/\.svg(["'`])/g, '.png$1');
  if (c !== before) {
    const count = (before.match(/\.svg/g) || []).length - (c.match(/\.svg/g) || []).length;
    total += count;
    fs.writeFileSync(f, c, 'utf8');
    console.log('Updated:', f.replace('d:/6/恋爱小程序/apps/client/src/', ''), 'replaced:', count);
  }
}
console.log('Total replaced:', total);
