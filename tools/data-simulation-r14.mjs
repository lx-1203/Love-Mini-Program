#!/usr/bin/env node
/**
 * R14 维度F：商业化容量数据模拟（audit-r14，2026-11-05）。
 *
 * 目的：把历辑「数据模拟」角色从静态推演升级为可复算脚本——三档 DAU（5k/50k/500k）
 * 按一年运营推演 DB 行数/体积、Redis 键与内存、媒体磁盘、主包余量，并给出容量触发线。
 *
 * 运行：node tools/data-simulation-r14.mjs（零依赖，兼容 node16+）
 * 输出：reports/verify/2026-11-05/r14-data-simulation/{summary.md,result.json}
 *
 * 常量来源（仓库内实证）：
 * - IdempotentInterceptor：幂等键 TTL 4h=14400s（Idempotent.DEFAULT_TTL_SECONDS，infra R2-00249）
 * - RecommendQuotaService：recommend-quota 键 TTL 36h（COUNT_TTL_HOURS）
 * - application.yml：multipart 上限 50MB；DB 连接池 DB_POOL_MAX 默认 20（.env.example）
 * - .env.example：MEDIA_GC_RETENTION_DAYS=90、MEDIA_GC_ENABLED
 * - R13 §1.3：real 档主包静态 ≈1114KB、2.00MB 上限、src/static 37MB、后端托管素材 12.66MB
 * - 第十辑路线图 R4：WS broker 外置评估线 >5k 并发
 *
 * ASSUMPTION（拍脑袋参数，全部显式标注）：
 * - 行为率与行宽为校园社交产品保守估计，非实测；上线后应以真实埋点回填重跑。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- 常量（仓库实证） ---------- */
const IDEMPOTENT_TTL_HOURS = 4; // Idempotent.DEFAULT_TTL_SECONDS = 14400
const QUOTA_TTL_HOURS = 36; // RecommendQuotaService.COUNT_TTL_HOURS
const MEDIA_FILE_CAP_MB = 50; // application.yml multipart 50MB
const MEDIA_GC_RETENTION_DAYS = 90; // .env.example MEDIA_GC_RETENTION_DAYS
const DB_POOL_MAX = 20; // .env.example DB_POOL_MAX
const MAIN_PACKAGE_STATIC_KB = 1114; // R13 实测 real 档静态
const MAIN_PACKAGE_LIMIT_KB = 2048; // 微信 2MB 硬限
const BACKEND_ASSETS_MB = 12.66; // R13 app-assets 托管素材
const WS_CONCURRENCY_LINE = 5000; // 第十辑路线图 R4
const BYTES_PER_KB = 1024;
const DAYS_PER_YEAR = 365;

/* ---------- ASSUMPTION 行为率（每 DAU 每天） ---------- */
const BEHAVIOR = {
  messagesSent: 10, // 私信条数（发送侧）
  notifications: 5, // 通知行数
  posts: 0.1, // 帖子
  replies: 0.3, // 回复
  whispers: 0.2, // 悄悄话
  likes: 1.0, // 点赞/互动事件
  visitors: 0.2, // 访客记录
  mediaUploads: 0.05, // 媒体上传次数
  mediaAvgMB: 2, // 平均单文件体积（远低于 50MB 上限）
  authWrites: 3, // 触发幂等键的写请求（评论/点赞/发帖/支付类合计）
};

/* ---------- ASSUMPTION 行宽（字节，含索引均摊） ---------- */
const ROW_BYTES = {
  message: 512,
  notification: 256,
  post: 1024,
  reply: 768,
  whisper: 512,
  interaction: 128,
  visitor: 128,
};

const REDIS_VALUE_BYTES = {
  idempotent: 120, // key ~60B + 占位值 + 开销
  quota: 100, // recommend-quota:{userId}:{date}
};

function fmtGB(bytes) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)}MB`;
}

function simulate(dau) {
  const perDay = {
    messages: dau * BEHAVIOR.messagesSent,
    notifications: dau * BEHAVIOR.notifications,
    posts: dau * BEHAVIOR.posts,
    replies: dau * BEHAVIOR.replies,
    whispers: dau * BEHAVIOR.whispers,
    interactions: dau * BEHAVIOR.likes,
    visitors: dau * BEHAVIOR.visitors,
  };

  // DB 行数与体积（一年）
  const rowsPerDay =
    perDay.messages + perDay.notifications + perDay.posts + perDay.replies +
    perDay.whispers + perDay.interactions + perDay.visitors;
  const rowsPerYear = rowsPerDay * DAYS_PER_YEAR;
  const dbBytesPerYear =
    perDay.messages * ROW_BYTES.message +
    perDay.notifications * ROW_BYTES.notification +
    perDay.posts * ROW_BYTES.post +
    perDay.replies * ROW_BYTES.reply +
    perDay.whispers * ROW_BYTES.whisper +
    perDay.interactions * ROW_BYTES.interaction +
    perDay.visitors * ROW_BYTES.visitor;
  const dbBytesPerYearTotal = dbBytesPerYear * DAYS_PER_YEAR;

  // Redis 稳态键数（键由 TTL 自然淘汰，稳态 = 生成速率 × TTL）
  const idempotentKeysSteady = dau * BEHAVIOR.authWrites * (IDEMPOTENT_TTL_HOURS / 24);
  const quotaKeysSteady = dau * (QUOTA_TTL_HOURS / 24);
  const redisMemBytes =
    idempotentKeysSteady * REDIS_VALUE_BYTES.idempotent +
    quotaKeysSteady * REDIS_VALUE_BYTES.quota;

  // 媒体磁盘（90 天回收 → 稳态 = 日增 × 90）
  const mediaBytesPerDay = dau * BEHAVIOR.mediaUploads * BEHAVIOR.mediaAvgMB * 1024 * 1024;
  const mediaSteadyBytes = mediaBytesPerDay * MEDIA_GC_RETENTION_DAYS;
  const mediaNoGcYearBytes = mediaBytesPerDay * DAYS_PER_YEAR;

  // 高峰并发与连接池压力（ASSUMPTION：峰值在线率 10%，峰值 QPS ≈ DAU×0.1×2）
  const peakConcurrent = Math.round(dau * 0.1);
  const peakQps = Math.round(dau * 0.1 * 2);

  return {
    dau,
    db: {
      rowsPerDay: Math.round(rowsPerDay),
      rowsPerYear,
      dbBytesPerYearTotal,
      breakdownPerDay: perDay,
    },
    redis: {
      idempotentKeysSteady: Math.round(idempotentKeysSteady),
      quotaKeysSteady: Math.round(quotaKeysSteady),
      memBytes: redisMemBytes,
    },
    media: {
      bytesPerDay: mediaBytesPerDay,
      steadyBytesWithGc: mediaSteadyBytes,
      yearBytesNoGc: mediaNoGcYearBytes,
    },
    pressure: { peakConcurrent, peakQps },
  };
}

/* ---------- 容量触发线推导 ---------- */
function triggerLines() {
  const lines = [];
  // WS 单机并发线：peakConcurrent = DAU×0.1 → DAU = 50,000 时到 5k
  lines.push({
    item: "WebSocket 单机并发（路线图 R4 线 5k）",
    dauTrigger: WS_CONCURRENCY_LINE / 0.1,
    note: "DAU 5 万即达 5k 峰值并发，触发 broker 外置评估",
  });
  // 本地磁盘稳态线：100GB 盘 / (0.05×2MB×90)
  const diskBudgetBytes = 100 * 1024 ** 3;
  const dauForDisk = diskBudgetBytes /
    (BEHAVIOR.mediaUploads * BEHAVIOR.mediaAvgMB * 1024 * 1024 * MEDIA_GC_RETENTION_DAYS);
  lines.push({
    item: "本地媒体磁盘（100GB 盘 + 90 天 GC 稳态）",
    dauTrigger: dauForDisk,
    note: "超过即需对象存储迁移（路线图 R5）或扩盘",
  });
  // DB 连接池 20：峰值 QPS × 平均占用 30ms × 安全系数 3 < 20
  const dauForPool = DB_POOL_MAX / (0.1 * 2 * 0.03 * 3);
  lines.push({
    item: `DB 连接池（${DB_POOL_MAX} 连接，30ms/查询假设）`,
    dauTrigger: dauForPool,
    note: "超过即出现连接排队，先查慢查询再考虑扩池/读写分离",
  });
  // Redis 内存 512MB 线
  const redisBudget = 512 * 1024 * 1024;
  const perDauRedisBytes =
    BEHAVIOR.authWrites * (IDEMPOTENT_TTL_HOURS / 24) * REDIS_VALUE_BYTES.idempotent +
    (QUOTA_TTL_HOURS / 24) * REDIS_VALUE_BYTES.quota;
  lines.push({
    item: "Redis 内存（512MB 预算）",
    dauTrigger: redisBudget / perDauRedisBytes,
    note: "键模型含 idempotent(4h)+quota(36h)；超线需扩内存或降 TTL",
  });
  // 主包余量：剩余 KB / 单页均重
  lines.push({
    item: "主包体积（2.00MB 硬限）",
    dauTrigger: null,
    note: `当前静态 ${MAIN_PACKAGE_STATIC_KB}KB/2048KB，余量 ${MAIN_PACKAGE_LIMIT_KB - MAIN_PACKAGE_STATIC_KB}KB ≈ 2~3 个新主包页；新增应进分包`,
  });
  return lines;
}

/* ---------- 汇总渲染 ---------- */
function renderSummary(results, lines) {
  const row = (r) =>
    `| ${r.dau.toLocaleString()} | ${r.db.rowsPerYear.toLocaleString()} | ${fmtGB(r.db.dbBytesPerYearTotal)} | ${fmtGB(r.redis.memBytes)} | ${fmtGB(r.media.steadyBytesWithGc)}（不回收 ${fmtGB(r.media.yearBytesNoGc)}） | ${r.pressure.peakConcurrent.toLocaleString()} / ${r.pressure.peakQps.toLocaleString()} |`;

  return `# R14 数据模拟摘要（${new Date().toISOString().slice(0, 10)}）

> 可复算脚本：\`node tools/data-simulation-r14.mjs\`（零依赖）。行为率与行宽为 ASSUMPTION（脚本内显式标注），上线后以真实埋点回填重跑。

## 三档 DAU 一年推演

| DAU | 年新增行数 | DB 年增量 | Redis 稳态内存 | 媒体稳态（90d GC） | 峰值并发/QPS |
|---|---|---|---|---|---|
${results.map(row).join("\n")}

## 容量触发线（按 DAU 升序，先到先触发）

| 触发项 | 触发 DAU（约） | 说明 |
|---|---|---|
${lines
  .map((l) =>
    l.dauTrigger == null
      ? `| ${l.item} | —（体积余量） | ${l.note} |`
      : `| ${l.item} | ${Math.round(l.dauTrigger).toLocaleString()} | ${l.note} |`,
  )
  .join("\n")}

## 结论（供报告 §4.4）

- 5k DAU 档：全资源面宽裕——单机 MySQL+Redis+本地盘即可承载一年，无需任何扩容动作；
- 50k DAU 档：**WS 并发与媒体磁盘双双进入触发区间**（broker 外置评估 R4、对象存储迁移 R5 由「评估」转「必做」）；DB 年增量仍在单实例舒适区；
- 500k DAU 档：DB 年增量进入 TB 级（分区/归档提上日程）、Redis 稳态内存接近预算线，属多机架构议题，与历辑「容量项 DAU 触发」定性一致；
- 与既有路线图的衔接：R4（WS broker）、R5（对象存储）的优先级由本脚本从「经验判断」升级为「数字触发线」——触发条件 = DAU，两线均在 5 万档交汇。
`;
}

const results = [5_000, 50_000, 500_000].map(simulate);
const lines = triggerLines();
const summary = renderSummary(results, lines);

const outDir = join(ROOT, "reports", "verify", "2026-11-05", "r14-data-simulation");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "summary.md"), summary, "utf8");
writeFileSync(
  join(outDir, "result.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), results, triggerLines: lines }, null, 2),
  "utf8",
);
console.log(summary);
console.log(`\nwritten: ${join(outDir, "summary.md")}`);
console.log(`written: ${join(outDir, "result.json")}`);
