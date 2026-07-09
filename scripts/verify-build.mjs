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
let svgRef = 0;
for (const f of files) {
  if (/\.(js|wxml|wxss|json|wx)$/i.test(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const m = c.match(/\.svg["'`)]/g);
    if (m) svgRef += m.length;
  }
}
console.log('Total .svg refs in dist code:', svgRef);

const tabbarPng = walk(dist + '/static/assets/icons/tabbar').filter(f => /\.png$/.test(f));
console.log('TabBar PNG count:', tabbarPng.length);
const commonPng = walk(dist + '/static/assets/icons/common').filter(f => /\.png$/.test(f));
console.log('Common PNG count:', commonPng.length);
const socialPng = walk(dist + '/static/assets/icons/social').filter(f => /\.png$/.test(f));
console.log('Social PNG count:', socialPng.length);
