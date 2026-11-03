#!/usr/bin/env node
/**
 * RabbitMQ 事件链冒烟检查（P2-12，2026-11-03）。
 *
 * 用途：`docker compose --profile mq up -d rabbitmq` 并按 .env.example 启用
 * APP_EVENTS_ENABLED=true 后，验证「MQ 可达 + 应用队列已声明」两件事：
 *   1) 管理 API（15672）可达且凭据有效（GET /api/overview）；
 *   2) Spring AMQP 已在默认 vhost 声明应用队列（GET /api/queues/%2F），
 *      至少存在一个 campuslove 相关队列（命名约定见 apps/api mq 包）。
 *
 * 零依赖（Node 内置 http），退出码：0=冒烟通过；1=失败（原因打到 stderr）。
 * 用法：
 *   node tools/smoke-mq.mjs                       # 127.0.0.1:15672 + 环境变量凭据
 *   RABBITMQ_MGMT_URL=http://127.0.0.1:15672 node tools/smoke-mq.mjs
 */
import http from "node:http";

const mgmtUrl = process.env.RABBITMQ_MGMT_URL || "http://127.0.0.1:15672";
const username = process.env.RABBITMQ_USERNAME || "";
const password = process.env.RABBITMQ_PASSWORD || "";

if (!username || !password) {
  console.error("[smoke-mq] 缺少 RABBITMQ_USERNAME / RABBITMQ_PASSWORD 环境变量（与 api 服务同一来源）");
  process.exit(1);
}

/** GET 管理 API JSON 路径，失败 reject（带 HTTP 状态）。 */
function mgmtGet(path) {
  const url = new URL(path, mgmtUrl);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: "GET",
        auth: `${username}:${password}`,
        headers: { Accept: "application/json" },
        timeout: 5000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode !== 200) {
            reject(new Error(`GET ${path} -> HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`GET ${path} 返回非 JSON: ${body.slice(0, 120)}`));
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`GET ${path} 超时（5s）——rabbitmq 容器是否已启动？`));
    });
    req.on("error", reject);
    req.end();
  });
}

try {
  const overview = await mgmtGet("/api/overview");
  console.log(`[smoke-mq] 管理 API 可达: rabbitmq ${overview.rabbitmq_version}, vhost "/"`);

  // %2F = 默认 vhost 的 URL 编码
  const queues = await mgmtGet("/api/queues/%2F");
  const appQueues = (Array.isArray(queues) ? queues : []).filter((q) =>
    /campus|love|check.?in|match|notif/i.test(String(q.name || ""))
  );
  if (appQueues.length === 0) {
    console.error(
      "[smoke-mq] 未发现任何应用队列——api 侧 APP_EVENTS_ENABLED 是否已置 true 并重启？" +
        "（Spring AMQP 声明队列发生在应用启动后）"
    );
    process.exit(1);
  }
  const names = appQueues.map((q) => q.name).sort().join(", ");
  console.log(`[smoke-mq] 应用队列已声明（${appQueues.length} 个）: ${names}`);
  console.log("[smoke-mq] 冒烟通过 ✅");
  process.exit(0);
} catch (err) {
  console.error(`[smoke-mq] 冒烟失败: ${err.message}`);
  console.error("[smoke-mq] 排查: docker compose --profile mq ps rabbitmq; .env 的 RABBITMQ_* 是否一致");
  process.exit(1);
}
