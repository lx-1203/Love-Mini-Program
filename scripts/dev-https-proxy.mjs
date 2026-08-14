#!/usr/bin/env node
/**
 * dev-https-proxy.mjs — 本地开发 HTTPS → HTTP 反向代理（2026-08-10）
 *
 * 背景：微信基础库 3.x 起 <image> 直接拒绝加载 http:// 协议的图片。
 * 本地联调（后端 http://127.0.0.1:8080）时，将小程序构建指向
 * https://127.0.0.1:8443，本代理把 HTTPS 请求原样转发给 HTTP 后端，
 * 图片即可正常加载（开发者工具已勾选「不校验 TLS 证书」）。
 *
 * 覆盖：
 * - 普通 HTTP 请求（REST API / 图片 / 静态资源）→ 逐字节转发
 * - WebSocket 升级（/ws/websocket，STOMP 私信）→ 双向隧道
 *
 * 用法：
 *   node scripts/dev-https-proxy.mjs            # 默认 8443 → 8080
 *   node scripts/dev-https-proxy.mjs 9443 8081  # 自定义端口
 *
 * 证书：scripts/dev-certs/localhost.{crt,key}（自签，CN/SAN=127.0.0.1）
 */
import { createServer as createTlsServer } from "node:https";
import { request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LISTEN_PORT = Number(process.argv[2] || 8443);
const TARGET_PORT = Number(process.argv[3] || 8080);
const TARGET_HOST = "127.0.0.1";

const tlsOptions = {
  key: readFileSync(join(__dirname, "dev-certs", "localhost.key")),
  cert: readFileSync(join(__dirname, "dev-certs", "localhost.crt")),
};

const server = createTlsServer(tlsOptions, (req, res) => {
  res.on("error", () => {});
  const targetUrl = `http://${TARGET_HOST}:${TARGET_PORT}${req.url}`;
  const proxyReq = httpRequest(
    targetUrl,
    { method: req.method, headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end(`[dev-https-proxy] 后端转发失败: ${err.message}`);
  });
  req.pipe(proxyReq);
});

// WebSocket 升级：转发握手请求，成功后建立双向 TCP 隧道
server.on("upgrade", (req, socket, head) => {
  // 原始 TLS socket 的读取错误（对端中断等）必须吃掉，否则进程崩溃
  socket.on("error", () => {});
  const proxyReq = httpRequest({
    host: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` },
  });
  proxyReq.on("upgrade", (_proxyRes, proxySocket, proxyHead) => {
    if (socket.destroyed) {
      proxySocket.destroy();
      return;
    }
    socket.write(proxyHead);
    proxySocket.on("error", () => socket.destroy());
    socket.on("error", () => proxySocket.destroy());
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

// TLS 连接上的读取错误（对端中断、半关闭等）统一吃掉，避免进程崩溃
server.on("connection", (socket) => {
  socket.on("error", () => {});
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`[dev-https-proxy] https://127.0.0.1:${LISTEN_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log("[dev-https-proxy] 证书: scripts/dev-certs/localhost.crt（自签，配合开发者工具关闭 TLS 校验）");
});
