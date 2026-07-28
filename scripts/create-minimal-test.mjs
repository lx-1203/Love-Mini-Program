import fs from 'fs';
import path from 'path';

const base = 'd:/桌面/微信恋爱小程序/apps/client/dist/build/mp-weixin';

// Clean up old files
const filesToKeep = new Set(['project.config.json']);
const dirsToKeep = new Set();

function cleanDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!dirsToKeep.has(full)) {
        fs.rmSync(full, { recursive: true, force: true });
      }
    } else {
      if (!filesToKeep.has(path.relative(base, full))) {
        fs.unlinkSync(full);
      }
    }
  }
}

// Clear all non-essential files
const entries = fs.readdirSync(base, { withFileTypes: true });
for (const e of entries) {
  if (e.isFile() && e.name !== 'project.config.json') {
    fs.unlinkSync(path.join(base, e.name));
  } else if (e.isDirectory()) {
    fs.rmSync(path.join(base, e.name), { recursive: true, force: true });
  }
}

// Create minimal app.js
fs.writeFileSync(path.join(base, 'app.js'), `
App({
  onLaunch() {
    console.log('App launched');
  }
});
`);

// Create minimal app.json
fs.writeFileSync(path.join(base, 'app.json'), JSON.stringify({
  pages: ['pages/index/index'],
  window: {
    navigationBarTitleText: 'Test'
  }
}, null, 2));

// Create minimal page
const pageDir = path.join(base, 'pages/index');
fs.mkdirSync(pageDir, { recursive: true });
fs.writeFileSync(path.join(pageDir, 'index.js'), `
Page({
  data: { msg: 'Hello from minimal test' },
  onLoad() { console.log('Page loaded'); }
});
`);
fs.writeFileSync(path.join(pageDir, 'index.json'), '{}');
fs.writeFileSync(path.join(pageDir, 'index.wxml'), '<view>{{msg}}</view>');
fs.writeFileSync(path.join(pageDir, 'index.wxss'), '/* empty */');

console.log('✅ Created minimal test project with 1 page');
console.log('   Files:');
console.log('   - app.js (App({}))');
console.log('   - app.json (1 page)');
console.log('   - pages/index/index.{js,json,wxml,wxss}');
