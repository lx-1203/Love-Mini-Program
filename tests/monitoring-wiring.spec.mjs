import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 监控接线契约（2026-10-29 第二轮排查）。
 *
 * 起因（三条都实测过）：
 *   1. SecurityConfig 把 /actuator/** 整段限给 ROLE_ADMIN，而 prometheus.yml 的
 *      campuslove-api job 不带凭据 ⇒ 抓取恒被拒，全部 API 指标无数据，
 *      `up == 0` 又让 ApiDown 长期误报 —— 监控"配了但是断的"。
 *   2. Grafana business-metrics 面板查的是 campuslove_auth_login_total 这类
 *      **代码里从未注册过**的名字 ⇒ 面板恒空。
 *   3. alertmanager 的 route 引用的 receiver 必须真实存在，否则告警静默丢失。
 *
 * 本门只做静态对账（不需要 Docker、不需要起服务），职责是"以后不能再悄悄退回去"：
 *   - 抓取路径 ↔ 白名单授权 ↔ compose 环境变量 ↔ application.yml 配置项 四者必须同时在场；
 *   - 面板/规则里引用的每个应用自定义指标名，必须能追溯到 *Metrics.java 里注册的
 *     meter 名（按 micrometer→prometheus 命名转换），或属于平台自带前缀白名单；
 *   - route.receiver 必须在 receivers 里定义。
 */

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

const security = read("apps/api/src/main/java/com/campuslove/api/config/SecurityConfig.java");
const prometheus = read("docker/prometheus/prometheus.yml");
const alertRules = read("docker/prometheus/rules/alert-rules.yml");
const alertmanager = read("docker/alertmanager/alertmanager.yml");
const appYml = read("apps/api/src/main/resources/application.yml");
const compose = read("docker-compose.yml");
const dashboard = read("docker/grafana/dashboards/business-metrics.json");

/* ── 1. 抓取链路四要素同时在场 ───────────────────────────────── */
assert.match(
  prometheus,
  /job_name:\s*campuslove-api[\s\S]{0,400}targets:\s*\['api:8080'\]/u,
  "prometheus.yml 必须保留 campuslove-api 抓取任务（目标 api:8080）",
);
assert.doesNotMatch(
  prometheus,
  /job_name:\s*campuslove-api[\s\S]{0,400}basic_auth/u,
  "campuslove-api job 不该带 basic_auth：应用侧走来源 IP 白名单，加凭据会让两处真相不一致",
);
assert.match(
  security,
  /requestMatchers\(HttpMethod\.GET,\s*"\/actuator\/prometheus"\)\s*\.access\(\s*new MetricsScrapeAuthorizationManager\(metricsScrapeAllowlist\)\)/u,
  "SecurityConfig 必须保留 /actuator/prometheus 的白名单授权规则（去掉它就会回到抓取恒 401 的断链状态）",
);
assert.match(
  security,
  /\.requestMatchers\("\/actuator\/\*\*"\)\.hasRole\("ADMIN"\)/u,
  "其余 actuator 端点必须仍然只有 ADMIN 可读（白名单只放开 prometheus 一条）",
);
assert.match(appYml, /scrape-allowlist:\s*\$\{METRICS_SCRAPE_ALLOWLIST:\}/u,
  "application.yml 必须声明 app.metrics.scrape-allowlist（默认空=fail-closed）");
assert.match(compose, /METRICS_SCRAPE_ALLOWLIST:/u,
  "docker-compose 必须给 api 注入 METRICS_SCRAPE_ALLOWLIST，否则容器内抓取仍被拒");

/* ── 2. 指标名对账：面板/告警引用的名字必须真的被注册 ───────── */
const JAVA_SRC = "apps/api/src/main/java";
function* javaFiles(dir) {
  for (const name of readdirSync(new URL(dir, root))) {
    const p = join(dir, name);
    const st = statSync(new URL(p, root));
    if (st.isDirectory()) yield* javaFiles(p);
    else if (name.endsWith(".java")) yield p;
  }
}
// micrometer 注册名形如 "auth.login.success"；转 prometheus 后为 auth_login_success(_total)
const registered = new Set();
for (const file of javaFiles(JAVA_SRC)) {
  for (const m of read(file).matchAll(/"([a-z][a-z0-9]*(?:\.[a-z0-9]+)+)"/gu)) {
    registered.add(m[1].replace(/\./gu, "_"));
  }
}
assert.ok(registered.size >= 10, `只解析到 ${registered.size} 个注册指标名，扫描方式可能失效（本门不许空过）`);

// 平台自带（micrometer/actuator/exporter 提供，不在本仓注册）。
// 刻意不含裸 `spring_`：曾有过 `spring_boot_health_status` 这种"看着像平台自带、
// 其实没人注册"的指标，规则引用它等于一条永不触发的死告警（本门就是为它加的）。
const PLATFORM_PREFIXES = [
  "jvm_", "hikaricp_", "http_server_requests", "cache_", "system_", "process_",
  "tomcat_", "log_", "executor_", "node_", "up", "prometheus_", "instance_",
];
const SUFFIXES = ["_total", "_seconds_bucket", "_seconds_count", "_seconds_sum", "_seconds_max", "_count", "_sum", "_max", "_active", "_open"];

function resolvesToRegistered(metric) {
  if (PLATFORM_PREFIXES.some((p) => metric.startsWith(p))) return true;
  const candidates = [metric];
  for (const s of SUFFIXES) {
    if (metric.endsWith(s)) candidates.push(metric.slice(0, -s.length));
  }
  return candidates.some((c) => registered.has(c));
}

const referenced = new Set();
/**
 * YAML 注释行里的规则是"停用"状态（如 blackbox 的 probe_success 尚未部署 exporter），
 * 把它们算进活跃引用会让本门报假红，也会掩盖真正的漂移。
 */
const stripYamlComments = (text) => text.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join("\n");
for (const text of [dashboard, stripYamlComments(alertRules)]) {
  for (const m of text.matchAll(/\b([a-z][a-z0-9_]{4,})\s*(?:\{|\[|\))/gu)) {
    const name = m[1];
    if (["sum", "rate", "irate", "avg", "max", "min", "by", "without", "label_replace", "vector", "increase", "count", "abs", "clamp_min", "offset", "if", "and", "or", "unless", "keep_pending", "for", "expr", "legendformat"].includes(name)) continue;
    if (!/[_(]/.test(name)) continue;
    referenced.add(name);
  }
}
assert.ok(referenced.size >= 8, `只解析到 ${referenced.size} 个指标引用，正则可能失效`);

const orphanMetrics = [...referenced].filter((m) => !resolvesToRegistered(m)).sort();
assert.deepEqual(
  orphanMetrics,
  [],
  `面板/告警引用了未注册的指标名（面板会恒空、规则会恒不触发）：${orphanMetrics.join(", ")}；`
  + "修法二选一：在 *Metrics.java 里注册该指标，或把引用改成已注册的名字。",
);

/* ── 3. alertmanager：route 引用的 receiver 必须已定义 ───────── */
const definedReceivers = new Set(
  [...alertmanager.matchAll(/^ {2}- name:\s*(\S+)$/gmu)].map((m) => m[1]),
);
assert.ok(definedReceivers.size >= 2, `只解析到 ${definedReceivers.size} 个 receiver，解析方式可能失效`);
const usedReceivers = new Set(
  [...alertmanager.matchAll(/^\s*receiver:\s*(\S+)$/gmu)].map((m) => m[1]),
);
for (const r of usedReceivers) {
  assert.ok(definedReceivers.has(r), `route/receiver 引用了未定义的接收者 ${r} ⇒ 告警静默丢失`);
}

/* ── 4. "告警能不能送到人手里"必须被显式声明 ────────────────── */
// 哨兵双向校验：渠道仍指向 localhost 占位 ⇒ 必须带 NO-ALERT-CHANNEL-CONFIGURED；
// 渠道已接真值 ⇒ 必须删掉哨兵。避免"配了监控但其实不会响"这类静默假安全。
const placeholderChannels = /(url:\s*'http:\/\/localhost:9999|smtp_smarthost:\s*'#)/u.test(alertmanager);
const hasSentinel = /# NO-ALERT-CHANNEL-CONFIGURED/u.test(alertmanager);
assert.equal(
  hasSentinel,
  placeholderChannels,
  placeholderChannels
    ? "渠道仍是 localhost 占位，但 alertmanager.yml 缺少 NO-ALERT-CHANNEL-CONFIGURED 哨兵：告警送不到人手里必须被显式声明"
    : "渠道已配置真实地址，请删除 NO-ALERT-CHANNEL-CONFIGURED 哨兵（否则文档与实际状态互相打脸）",
);

/* ── 5. runbook 指向必须真实存在 ─────────────────────────────── */
// 起因：docs/DR/restore-procedure.md 与 docs/CI-CD.md 在 aefd8a72 被整体删除后，
// 告警里的 runbook 字段继续指向它们达数月——"照着手册做"变成一句空话。
const runbooks = [...alertRules.matchAll(/runbook:\s*"([^"]+)"/gu)].map((m) => m[1]);
assert.ok(runbooks.length >= 5, `只解析到 ${runbooks.length} 条 runbook 引用，正则可能失效`);
for (const ref of runbooks) {
  const [file, anchor] = ref.split("#");
  let text;
  try {
    text = read(file);
  } catch {
    throw new Error(`runbook 指向不存在的文件：${ref}（历史教训：docs/DR/* 已被 aefd8a72 删除）`);
  }
  if (anchor) {
    const slug = text
      .split(/\r?\n/)
      .filter((l) => /^#{1,4} /.test(l))
      .map((l) => l.replace(/^#+ /u, "").trim().toLowerCase().replace(/\s+/gu, "-"));
    assert.ok(slug.includes(anchor.toLowerCase()), `runbook 锚点在该文件里不存在：${ref}；现有小节：${slug.join(" / ")}`);
  }
}

console.log(
  `monitoring wiring ok（注册指标 ${registered.size} 个、被引用 ${referenced.size} 个全部可追溯；`
  + `receiver ${definedReceivers.size} 个、引用 ${usedReceivers.size} 个全部已定义）`,
);
