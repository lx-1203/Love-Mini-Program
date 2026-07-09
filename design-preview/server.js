const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
http.createServer((req, res) => {
  let f = req.url === '/' ? '/pages-core3.html' : req.url;
  f = path.join(dir, f);
  try {
    const c = fs.readFileSync(f);
    const ext = path.extname(f);
    const m = {'.html':'text/html','.png':'image/png','.css':'text/css','.js':'application/javascript'};
    res.writeHead(200, {'Content-Type': m[ext] || 'text/plain'});
    res.end(c);
  } catch(e) {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(5556, () => console.log('Preview V2: http://localhost:5556'));
