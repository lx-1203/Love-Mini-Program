/**
 * 本地联调 HTTPS 反向代理：8443 (HTTPS, 自签) -> 127.0.0.1:8080 (HTTP)
 * 用途：微信小程序真机预览要求 https；手机与电脑同局域网时经本代理访问本机后端。
 * 启动：node scripts/dev-proxy/https-proxy.mjs   （证书同目录 key.pem/cert.pem）
 */
import https from "node:https";
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8443;
const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = 8080;

const server = https.createServer(
  { key: readFileSync(join(__dirname, "key.pem")), cert: readFileSync(join(__dirname, "cert.pem")) },
  (req, res) => {
    const proxyReq = http.request(
      { host: TARGET_HOST, port: TARGET_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` } },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on("error", (e) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "proxy_target_unreachable", detail: String(e) }));
    });
    req.pipe(proxyReq);
  },
);
server.listen(PORT, "0.0.0.0", () => console.log(`[dev-https-proxy] https://0.0.0.0:${PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`));
