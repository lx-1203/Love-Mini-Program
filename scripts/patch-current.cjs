const fs = require('fs');
const path = require('path');
const src = fs.readFileSync('D:/6/恋爱小程序/scripts/mp-shoot-current.cjs', 'utf8');
const oldBlock = src.slice(src.indexOf('  // 登录注入'), src.indexOf('  for (let i = 0; i < PAGES.length; i++)'));
const newBlock = `  // 登录注入
  try {
    const data = await httpPost(\`\${API_BASE}/auth/guest-login\`, '{}');
    const token = data.token || (data.data && data.data.token);
    if (!token) throw new Error('no token');
    await mp.callWxMethod('setStorage', { key: 'token', data: token });
    await mp.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log(\`[\${ts()}] token injected len=\${token.length}\`);
  } catch (e) {
    console.log(\`[\${ts()}] token inject FAIL: \${e.message}\`);
  }

`;
const out = src.replace(oldBlock, newBlock);
fs.writeFileSync('D:/6/恋爱小程序/scripts/mp-shoot-current.cjs', out, 'utf8');
console.log('done, fetch remains:', out.includes('fetch('));
