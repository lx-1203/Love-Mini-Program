const { execSync } = require('child_process');
try {
  const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const lines = out.split(/\r?\n/);
  const listening = [];
  for (const line of lines) {
    if (line.includes('LISTENING')) {
      const m = line.match(/TCP\s+([^\s]+)\s+([^\s]+)\s+LISTENING\s+(\d+)/);
      if (m) {
        const addr = m[1];
        const port = addr.split(':').pop();
        if (port >= 9000 && port <= 9999) {
          listening.push({ port, pid: m[3], addr });
        }
      }
    }
  }
  console.log('Listening ports 9000-9999:');
  for (const l of listening) console.log(`  ${l.addr} pid=${l.pid}`);
} catch (e) {
  console.log('FAIL:', e.message.slice(0, 200));
}
