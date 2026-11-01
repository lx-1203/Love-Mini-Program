import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

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

/**
 * Counter 注册名（2026-10-31 新增，起因见下）。
 *
 * micrometer 的 Counter 经 Prometheus 客户端导出时**一定**会加 `_total` 后缀，
 * 这是客户端命名规则、不是本仓的写法习惯。所以：
 *   Counter.builder("auth.login.failure") ⇒ 序列名只会是 auth_login_failure_total。
 * 2026-10-29 那轮给本门加的"剥掉 _total 再比对"逻辑（SUFFIXES）把这一点变成了盲区：
 * alert-rules.yml 里写 `rate(auth_login_failure[5m])` 也照样能匹配上注册名 ⇒ 门绿，
 * 而那条规则从建立起就没有数据、永远不会触发（死告警）。判据必须能区分
 * "剥后缀能找到"（命名对得上）与"规则真的写了导出名"（告警会响）。
 */
const counterMeters = new Set();
for (const file of javaFiles(JAVA_SRC)) {
  const text = read(file);
  // 常量表：`private static final String METRIC_X = "a.b.c";`
  const consts = new Map();
  for (const m of text.matchAll(/String\s+(\w+)\s*=\s*"([a-z][a-z0-9.]*)"\s*;/gu)) {
    consts.set(m[1], m[2]);
  }
  // Counter.builder("字面量") 与 Counter.builder(常量) 两种写法都要抓到
  for (const m of text.matchAll(/Counter\.builder\s*\(\s*(?:"([a-z][a-z0-9.]*)"|([A-Za-z_]\w*))\s*\)/gu)) {
    const name = m[1] ?? consts.get(m[2]);
    if (name) counterMeters.add(name.replace(/\./gu, "_"));
  }
}
assert.ok(
  counterMeters.size >= 5,
  `只解析到 ${counterMeters.size} 个 Counter 注册名（<5），Counter 抓取方式可能失效（本门不许空过）`,
);

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

/* ── 2b. Counter 必须写导出名（剥后缀不许再充当"规则可信"的证据）──────── */
const counterBareRefs = [...referenced]
  .filter((m) => counterMeters.has(m) && !m.endsWith("_total"))
  .sort();
assert.deepEqual(
  counterBareRefs,
  [],
  `规则/面板把 Counter 写成了不带 _total 的注册名：${counterBareRefs.join(", ")}。`
  + "micrometer Counter 导出后只有 <name>_total 这一条序列，写裸名 = 表达式取不到数据 = 静默死告警"
  + "（2026-10-31 的 HighLoginFailureRate 就是这么躺了很久的）。",
);
// 本门自测（判据不许是"永远绿"）：造一个裸 Counter 引用与一个合法引用，
// 前者必须被抓出、后者必须放过，否则 2b 形同虚设。
const selfTestCounter = (metric) => counterMeters.has(metric) && !metric.endsWith("_total");
assert.equal(selfTestCounter("auth_login_failure"), true, "自测：裸 Counter 名必须被判红");
assert.equal(selfTestCounter("auth_login_failure_total"), false, "自测：带 _total 必须放过");
assert.equal(selfTestCounter("jvm_memory_used_bytes"), false, "自测：非 Counter 不应误判");

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

/* ── 6. 每条告警表达式的数据源必须真的在被抓取（2026-10-31 新增）───
 *
 * 起因（同类两起）：
 *   1. HostDiskHigh/HostMemoryHigh/HostCpuHigh 查 node_* 指标，而 node-exporter 的
 *      抓取任务在 prometheus.yml 里是**注释状态**；DEPLOYMENT 只说"--profile monitoring
 *      启动监控"、RUNBOOKS 只说"没有 profile 就没有数据源"，两处都没讲：
 *      即使带上 profile 起了容器，job 仍是注释的，指标一条都不会有 ⇒ 三条主机告警永不触发。
 *      "服务起来了"从来不等价于"服务被采集了"。
 *   2. 反过来把注释掉的 job 常开，又会让 target 长期 DOWN 制造噪音（R4-00486 的原由）。
 * 所以本门不假装"必须常开"，而是钉死一件事：
 *   规则的指标属于哪个 exporter job；那个 job 不活跃时，规则**必须自己声明前置条件**
 *   （annotations.precondition 内含 `INERT-WITHOUT-SCRAPE=<job>`），运维在规则文件里
 *   就能看到"这条现在不会响、要怎么弄响"；job 活跃却还挂着声明 ⇒ 同样判红（声明过期）。
 */
const ruleGroups = YAML.parse(alertRules).groups ?? [];
const activeJobs = new Set(
  [...prometheus.split(/\r?\n/)]
    .filter((l) => !/^\s*#/.test(l))
    .map((l) => l.match(/^\s*-?\s*job_name:\s*(\S+)\s*$/u)?.[1])
    .filter(Boolean),
);
const commentedJobs = new Set(
  [...prometheus.matchAll(/^\s*#\s*-?\s*job_name:\s*(\S+)/gmu)].map((m) => m[1]),
);
assert.ok(activeJobs.size >= 1, "prometheus.yml 解析不到任何活跃 job，本门的判据会退化成空过");

/**
 * 指标 → 它唯一可能的来源 job。app 侧指标来自 campuslove-api；
 * node_/probe_ 来自各自 exporter（node_backup_* 是 backup 脚本经 node-exporter
 * textfile collector 落出来的，来源仍是 node-exporter）。
 */
function providerJobsOf(expr, labels) {
  const jobs = new Set();
  for (const m of String(expr).matchAll(/\b([a-z][a-z0-9_]{4,})(?:\{([^}]*)\})?/gu)) {
    const metric = m[1];
    if (["sum", "rate", "irate", "avg", "max", "min", "by", "without", "increase", "count", "abs", "time", "vector", "histogram_quantile", "le", "instance", "job", "status", "uri", "reason", "fstype", "mode", "area"].includes(metric)) continue;
    if (metric.startsWith("node_")) jobs.add("node-exporter");
    else if (metric.startsWith("probe_")) jobs.add("blackbox");
    else if (metric === "up" || metric.startsWith("up{")) {
      const inSel = /job="([^"]+)"/u.exec(m[2] ?? "");
      jobs.add(inSel ? inSel[1] : (labels?.job ?? "campuslove-api"));
    } else if (metric.startsWith("prometheus_")) jobs.add("prometheus");
    else jobs.add("campuslove-api");
  }
  if (jobs.size === 0) jobs.add("campuslove-api");
  return jobs;
}

function classifyRule(name, expr, annotations, jobs = activeJobs) {
  const labels = {};
  const declared = String(annotations?.precondition ?? "");
  const missing = [...providerJobsOf(expr, labels)].filter((j) => !jobs.has(j));
  const undeclared = missing.filter((j) => !declared.includes(`INERT-WITHOUT-SCRAPE=${j}`));
  const stale = missing.length === 0 && declared.includes("INERT-WITHOUT-SCRAPE=");
  return { name, missing, undeclared, stale };
}

// 自测：判据必须能变红（空判点是本仓踩过四次的事故类型）。
// ⚠ 自测用【合成】的 job 集合，不跟着盘上的活跃状态一起翻转——否则 job 一被启用，
// "未声明的 node_* 规则要判红"这条就自动成立、再也不证明任何事（空转自测）。
const NO_HOST_JOBS = new Set(["prometheus", "campuslove-api"]);
assert.deepEqual(
  classifyRule("FakeHostRule", "node_filesystem_avail_bytes > 0", {}, NO_HOST_JOBS).undeclared,
  ["node-exporter"],
  "自测失败：job 不活跃且未声明前置条件的 node_* 规则没有被判红 ⇒ 第 6 节形同虚设",
);
assert.deepEqual(
  classifyRule("FakeHostRuleOk", "node_filesystem_avail_bytes > 0", {
    precondition: "INERT-WITHOUT-SCRAPE=node-exporter",
  }, NO_HOST_JOBS).undeclared,
  [],
  "自测失败：已声明前置条件的规则被判红了（误报）",
);
assert.equal(
  classifyRule("FakeHostRuleStale", "node_filesystem_avail_bytes > 0", {
    precondition: "INERT-WITHOUT-SCRAPE=node-exporter",
  }, new Set(["node-exporter"])).stale,
  true,
  "自测失败：job 已活跃却仍挂 INERT 声明没有被判成过期 ⇒ 声明会永久赖在规则文件里",
);

let dataSourceChecked = 0;
let hostSourcedRules = 0;
const inertDeclared = [];
const dataSourceViolations = [];
const staleDeclarations = [];
for (const group of ruleGroups) {
  for (const rule of group.rules ?? []) {
    if (!rule.expr) continue;
    dataSourceChecked += 1;
    if (providerJobsOf(rule.expr, {}).has("node-exporter")) hostSourcedRules += 1;
    const v = classifyRule(`${group.name}/${rule.alert}`, rule.expr, rule.annotations);
    if (v.undeclared.length > 0) {
      dataSourceViolations.push(
        `${v.name} 引用了 ${v.undeclared.join(", ")} 的指标，但那个 job 不在 prometheus.yml 的活跃抓取列表里，` +
        "而规则没有声明 annotations.precondition 含 " +
        v.undeclared.map((j) => `INERT-WITHOUT-SCRAPE=${j}`).join("/") +
        " ⇒ 这条规则今天永远不会触发，而文件里没人看得出这件事",
      );
    }
    if (v.missing.length > 0 && v.undeclared.length === 0) inertDeclared.push(v.name);
    if (v.stale) {
      staleDeclarations.push(
        `${v.name} 仍挂着 INERT-WITHOUT-SCRAPE 声明，但它依赖的 job 都已活跃 ⇒ 声明过期，请删除`,
      );
    }
  }
}
assert.ok(
  dataSourceChecked >= 8,
  `只核对到 ${dataSourceChecked} 条告警表达式的数据源（<8），解析方式可能失效`,
);
// 正控下限：规则里确实存在引用 node_* 的主机/备份告警。若这个数掉到 0，
// 上面三条断言就全都在空集合上成立（"四条主机告警永不响"当初就是这么没人看见的）。
assert.ok(
  hostSourcedRules >= 4,
  `只找到 ${hostSourcedRules} 条引用 node-exporter 指标的告警（<4），主机告警组可能被整段删掉了`,
);
assert.deepEqual(dataSourceViolations, [], `规则的数据源无人抓取且未声明：\n  ${dataSourceViolations.join("\n  ")}`);
assert.deepEqual(staleDeclarations, [], staleDeclarations.join("\n"));

/* ── 6b. node-exporter 必须真的被抓取（2026-11-01 修复的交付断言）──────
 * 原状态：抓取 job 常年在 prometheus.yml 里是注释状态，而它托底的四条规则
 * （HostDiskHigh/HostMemoryHigh/HostCpuHigh/BackupNeverCompleted）引用 node_*。
 * Prometheus 不评估空向量 ⇒ 四条规则永不触发、也不报错。当时留下的是一份
 * "INERT-WITHOUT-SCRAPE 声明 + 三处文档"的登记表，而不是把 job 打开。
 * 现在 job 常开，本节把两件事钉住：
 *   1. job 不许被重新注释（注释掉 ⇒ 四条主机告警当场失效，而盘上没有任何红）；
 *   2. 声明必须随之清空（还挂着 INERT 声明＝过期，见上面的 staleDeclarations）。
 * 以及本修复赖以成立的前提：node-exporter 与 prometheus 挂在同一个 profile，
 * 所以"常开会制造长期 DOWN target"（R4-00486 当初的理由）不再成立。
 */
assert.ok(
  activeJobs.has("node-exporter"),
  "prometheus.yml 的 node-exporter 抓取 job 必须活跃：它一被注释，HostDiskHigh/"
  + "HostMemoryHigh/HostCpuHigh/BackupNeverCompleted 四条规则会立刻变成永不触发且无报错的空规则",
);
assert.deepEqual(
  inertDeclared,
  [],
  `node-exporter 已抓取，却仍有 ${inertDeclared.length} 条规则挂着 INERT 声明：${inertDeclared.join(", ")}`,
);
{
  const services = YAML.parse(compose).services ?? {};
  const svc = services["node-exporter"];
  const prom = services.prometheus;
  assert.ok(svc && prom, "docker-compose.yml 里找不到 node-exporter 或 prometheus 服务，本节前提无法判定");
  assert.deepEqual(
    [...(svc.profiles ?? [])].sort(),
    [...(prom.profiles ?? [])].sort(),
    "node-exporter 的 profiles 必须与 prometheus 同档：否则会出现"
    + "「prometheus 起来了、node-exporter 没起」⇒ 抓取任务恒 DOWN（2026-11-01 之前的形态），"
    + "或「node-exporter 起了、prometheus 没起」⇒ 白跑一个没人抓的 exporter",
  );
}
// 主机/备份类 exporter 若同时"job 注释着"且"文档没写清"，运维就只能靠猜——
// 注释状态必须在三处文档里显式说过（哨兵词 HOST-ALERTS-INERT-WITHOUT-SCRAPE）。
if (commentedJobs.has("node-exporter")) {
  const sentinel = /HOST-ALERTS-INERT-WITHOUT-SCRAPE/u;
  assert.match(prometheus, sentinel, "prometheus.yml 的注释 job 处必须写哨兵词 HOST-ALERTS-INERT-WITHOUT-SCRAPE");
  assert.match(read("doc/DEPLOYMENT.md"), sentinel, "doc/DEPLOYMENT.md 必须用同一哨兵词说明：profile ON 也不等于 node-exporter 被抓取");
  assert.match(read("doc/RUNBOOKS.md"), sentinel, "doc/RUNBOOKS.md 必须用同一哨兵词说明同一件事");
} else {
  // 反向对账：文档不许继续描述已经不存在注释状态（写了就等于没人读）。
  for (const [file, text] of [
    ["docker/prometheus/prometheus.yml", prometheus],
    ["doc/DEPLOYMENT.md", read("doc/DEPLOYMENT.md")],
    ["doc/RUNBOOKS.md", read("doc/RUNBOOKS.md")],
  ]) {
    assert.doesNotMatch(
      text,
      /HOST-ALERTS-INERT-WITHOUT-SCRAPE/u,
      `${file} 仍在用 HOST-ALERTS-INERT-WITHOUT-SCRAPE 描述主机告警，但 job 已常开 ⇒ 说明过期，运维会照它多此一举`,
    );
  }
}

/* ── 6c. BackupNeverCompleted 的写入端形状：textfile 目录必须对 backup 容器可写
 *       （2026-11-01，第六轮 W3 item 3）───────────────────────────────────────
 * 上一节（6/6b）只证到"node-exporter 这个 job 有人抓"。对 BackupNeverCompleted 来说
 * 那不够：它的序列不是 node-exporter 自己产生的，而是 backup 容器往共享目录里写一个
 * .prom 文件、node-exporter 只是读出来。这条链上有四种"静默哑"的形态，都不报错：
 *   ① 目录属主/权限不对 ⇒ cron 档（以非 root 的 backup 账号跑）写不进去；
 *   ② 两侧绑的不是同一个宿主目录 ⇒ 写了也没人读；
 *   ③ BACKUP_TEXTFILE_DIR 与挂载目标各写一处、漂了 ⇒ 脚本往容器临时层里写；
 *   ④ 第一次真实备份之前压根没有文件 ⇒ 序列恒缺，而 Prometheus 对空向量不评估，
 *      "规则永不触发"与"规则不存在"在盘上长得一模一样。
 * 本节把 ①②③④ 里**静态可判**的部分全部判掉：①②③ 由 compose 的卷/环境 + entrypoint
 * 脚本内容对账；④ 由"entrypoint 播种基线指标"这一动作对账。
 * 判不出的（真容器里 -w 是否真的成立、node-exporter 是否真的把文件解析成序列）
 * 在报告里点名为"需要一次真跑"。
 */
/**
 * 卷声明解析。**不能**直接 split(":")，也不能只按"第一个冒号"切——本仓的挂载目标
 * 本身带插值（`./backups/node-textfile:${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}`），
 * 默认值表达式里就有冒号；裸切会把 mode 解析成 "-/mnt/node-textfile}:ro"，
 * 于是**只读挂载漏判**（这条洞是 6c 节自测「backup 侧挂成只读」用合成 fixture 跑绿、
 * 真文件却漏掉时发现的——一条能被绕过而不自知的门比没有门更糟）。
 *
 * 规则（按 Docker Compose 的短语法语义，四种形态都要正确处理）：
 *   1. `${VAR}` / `${VAR:-default}` / 嵌套 `${A:-${B}}` 里的冒号一律不算分隔符
 *      —— 用花括号深度扫描，深度为 0 的冒号才是字段分隔符；
 *   2. `$VAR`（无花括号）不含冒号，天然安全；
 *   3. 绝对路径（`/srv/data:/mnt/x`）与命名卷（`redis-data:/data/redis`）同规则；
 *   4. 尾部的 `:ro` / `:rw` / `:ro,consistant` 等选项串只在"深度 0 且段数=3"时才当 mode，
 *      并且必须整体匹配选项形状（不含 `/`、`\`、`:`）——防止 Windows 盘符
 *      `D:\data:/mnt` 被切成 host="D"。
 * 判不出的：宿主机上 `${VAR}` 实际取什么值（那是 .env 的事，本节刻意**不**展开默认值
 * 去做等价判定——两侧插值写法不同就判红，宁可误报也不漏报）。
 */
const MODE_SHAPE = /^[a-zA-Z][a-zA-Z0-9]*(?:[,:=._-][a-zA-Z0-9,:=._-]*)*$/u;
/** mode 位的候选：字面选项串（ro/rw/rslave/cached,...），或整个是插值表达式。 */
const INTERPOLATED = /^\$\{?[A-Za-z_][A-Za-z0-9_]*([:-}][^{}]*)?\}$/u;
const looksLikeMode = (seg) => !/[\\/]/u.test(seg)
  && (MODE_SHAPE.test(seg) || INTERPOLATED.test(seg));
/** 按花括号深度扫描，切出深度 0 的冒号分段。 */
function splitTopLevelColons(s) {
  const parts = [];
  let cur = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "{") depth += 1;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    if (ch === ":" && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}
function splitVolume(spec, rawIn) {
  if (spec && typeof spec === "object") {
    return {
      host: spec.source ?? "",
      container: spec.target ?? "",
      mode: spec.read_only ? "ro" : String(spec.type ?? ""),
      modeUnresolved: false,
      raw: String(rawIn ?? JSON.stringify(spec)),
    };
  }
  const s = String(spec).trim();
  const parts = splitTopLevelColons(s);
  const last = parts[parts.length - 1];
  if (parts.length >= 3 && looksLikeMode(last)) {
    return {
      host: parts[0],
      container: parts.slice(1, -1).join(":"),
      mode: last,
      // mode 位整个是插值 ⇒ 读写性静态判不出（真实 Docker 会先插值再切分）。
      // 这一格必须交给 6c 节点名，绝不能默认"不是 ro 就等于可写"。
      modeUnresolved: INTERPOLATED.test(last),
      raw: s,
    };
  }
  if (parts.length >= 2) {
    return { host: parts[0], container: parts.slice(1).join(":"), mode: "", modeUnresolved: false, raw: s };
  }
  // 只有一段 = 匿名卷（无宿主路径、无容器路径可判）
  return { host: "", container: parts[0] ?? "", mode: "", modeUnresolved: false, raw: s };
}
const isReadOnly = (v) => /(^|,)ro(,|$)/u.test(v.mode);
/**
 * 解析器的【阳性对照】。这一张表是"修好了"的唯一证据——没有它，
 * 「splitVolume 现在正确」就只是自述。四种形态 × 有/无 mode 各给一行，
 * 每行逐字段断言（host/container/mode），错一个就红。
 * 表只允许增长：新增一条形态就要多一行，删行等于拆判据。
 */
const VOLUME_PARSE_POSITIVE_CONTROLS = [
  // [卷声明, 期望 host, 期望 container, 期望 mode, 这一行钉的是哪种形态]
  ["./backups/node-textfile:/mnt/node-textfile",
    "./backups/node-textfile", "/mnt/node-textfile", "", "普通相对路径"],
  ["./backups/node-textfile:/mnt/node-textfile:ro",
    "./backups/node-textfile", "/mnt/node-textfile", "ro", "相对路径 + :ro"],
  ["./backups/node-textfile:/mnt/node-textfile:rw",
    "./backups/node-textfile", "/mnt/node-textfile", "rw", "相对路径 + :rw"],
  ["./backups/node-textfile:${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}",
    "./backups/node-textfile", "${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}", "",
    "容器侧 ${VAR:-default}（默认值里有冒号）"],
  ["./backups/node-textfile:${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}:ro",
    "./backups/node-textfile", "${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}", "ro",
    "容器侧 ${VAR:-default} + :ro ← 本 item 的原缺陷形态"],
  ["${BACKUP_DIR:-./backups/node-textfile}:/mnt/node-textfile:ro",
    "${BACKUP_DIR:-./backups/node-textfile}", "/mnt/node-textfile", "ro",
    "宿主侧 ${VAR:-default} + :ro（反向变异会藏在这一格）"],
  ["${BACKUP_DIR:-./backups/node-textfile}:${BACKUP_TARGET:-/mnt/node-textfile}",
    "${BACKUP_DIR:-./backups/node-textfile}", "${BACKUP_TARGET:-/mnt/node-textfile}", "",
    "两侧都是 ${VAR:-default}，没有 mode"],
  ["./backups/node-textfile:$TEXTFILE_DIR:ro",
    "./backups/node-textfile", "$TEXTFILE_DIR", "ro", "$VAR 无花括号 + :ro"],
  ["/srv/campus-love/backups/node-textfile:/mnt/node-textfile:ro",
    "/srv/campus-love/backups/node-textfile", "/mnt/node-textfile", "ro", "宿主绝对路径 + :ro"],
  ["/srv/data:/mnt/x:${MOUNT_OPTS:-ro}",
    "/srv/data", "/mnt/x", "${MOUNT_OPTS:-ro}", "mode 位本身是 ${VAR:-default}"],
  ["redis-data:/data/redis:ro",
    "redis-data", "/data/redis", "ro", "命名卷（不是宿主路径）"],
  ["mysql-data:/var/lib/mysql",
    "mysql-data", "/var/lib/mysql", "", "命名卷，无 mode"],
  ["./backups:/backups:rslave",
    "./backups", "/backups", "rslave", "非 ro/rw 的传播选项也要落在 mode 位"],
  ["./a:${VAR:-${ALT:-/mnt/deep}}:ro",
    "./a", "${VAR:-${ALT:-/mnt/deep}}", "ro", "嵌套 ${…${…}…} 的深度扫描（两个冒号都不能当分隔符）"],
  ["./only-host", "", "./only-host", "", "匿名卷（只有一段）"],
];
let volumeControlsChecked = 0;
for (const [spec, wantHost, wantContainer, wantMode, why] of VOLUME_PARSE_POSITIVE_CONTROLS) {
  volumeControlsChecked += 1;
  const got = splitVolume(spec);
  assert.equal(got.host, wantHost, `卷解析阳性对照失败「${why}」：${spec} ⇒ host 解析成 ${got.host}`);
  assert.equal(got.container, wantContainer, `卷解析阳性对照失败「${why}」：${spec} ⇒ container 解析成 ${got.container}`);
  assert.equal(got.mode, wantMode, `卷解析阳性对照失败「${why}」：${spec} ⇒ mode 解析成 ${got.mode}`);
}
assert.ok(
  VOLUME_PARSE_POSITIVE_CONTROLS.length >= 12,
  `卷解析阳性对照从 ${VOLUME_PARSE_POSITIVE_CONTROLS.length} 行缩了：这张表是"解析器修好了"的唯一证据，删行等于拆判据`,
);
// 关键格单独再钉一次（表里已有，这里给"漏判只读"这个后果一个明确名字）
assert.ok(isReadOnly(splitVolume("./backups/node-textfile:${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}:ro")),
  "卷解析失效：容器侧带 ${VAR:-default} 的挂载加 :ro 没被识别成只读 ⇒ 6c 节会漏掉本 item 的原缺陷形态");
assert.ok(isReadOnly(splitVolume("${BACKUP_DIR:-./backups/node-textfile}:/mnt/node-textfile:ro")),
  "卷解析失效：宿主侧带 ${VAR:-default} 的挂载加 :ro 没被识别成只读");
assert.ok(!isReadOnly(splitVolume("./backups/node-textfile:/mnt/node-textfile")),
  "卷解析失效：可写挂载被判成了只读（误报）");
// Windows 盘符不能切成 host="D"（第三段含反斜杠/冒号时不当 mode）
assert.equal(splitVolume("D:\\data:/mnt/node-textfile").host, "D",
  "盘符守卫：这里按 Docker 短语法本身就只能切出 host=D —— 记录已知边界，别让它伪装成支持");
function textfileShape({ backupVolumes, backupEnv, nodeVolumes, nodeCommand, entrypointText, ruleExpr }) {
  const problems = [];
  const findMount = (list) => list.map((v) => splitVolume(v, String(v)))
    .find((v) => /node-textfile/u.test(v.raw));
  const bMount = findMount(backupVolumes);
  const nMount = findMount(nodeVolumes);
  if (!bMount) problems.push("backup 服务没有将宿主 node-textfile 目录挂进来 ⇒ 指标无处可写");
  if (!nMount) problems.push("node-exporter 服务没有将宿主 node-textfile 目录挂进来 ⇒ 写了没人读");
  if (bMount && nMount) {
    if (bMount.host !== nMount.host) {
      problems.push(`两侧绑的不是同一个宿主目录（backup=${bMount.host} / node-exporter=${nMount.host}）`
        + " ⇒ 备份指标落进一个永远不被抓取的地方");
    }
    if (isReadOnly(bMount)) {
      problems.push(`backup 侧的 node-textfile 挂载是只读（mode=${bMount.mode}）⇒ 脚本根本写不进指标文件`);
    }
    // mode 位写成插值表达式时"不是 ro"不等于"可写"——这一格静态判不出，必须点名，
    // 否则解析器修好之后又从这里漏一只兔子（`:ro` 藏在 ${MOUNT_OPTS:-ro} 里）。
    if (bMount.modeUnresolved) {
      problems.push(`backup 侧挂载的读写位是插值表达式（${bMount.mode}）⇒ 静态判不出它是否可写，`
        + "本仓刻意把这一条挂载的 mode 写成字面量（不给 :ro 留一个能被插值藏起来的位置）");
    }
    if (!isReadOnly(nMount)) {
      problems.push("node-exporter 侧的 node-textfile 挂载不是只读：collector 只读它，"
        + "给可写等于多一个能伪造备份指标的容器（本仓刻意钉成 :ro）");
    }
  }
  // ③ BACKUP_TEXTFILE_DIR 与挂载目标同源
  const envTarget = String(backupEnv.BACKUP_TEXTFILE_DIR ?? "");
  if (bMount && envTarget && !envTarget.includes(bMount.container)) {
    problems.push(`backup 环境变量 BACKUP_TEXTFILE_DIR(${envTarget}) 指向的容器路径与实际挂载目标`
      + `（${bMount.container}）不同源 ⇒ 指标写到容器临时层，node-exporter 读不到`);
  }
  // node-exporter 的 collector 目录必须等于它自己的挂载目标
  const collectorDir = /--collector\.textfile\.directory=(\S+)/u.exec(nodeCommand)?.[1] ?? "";
  if (!collectorDir) problems.push("node-exporter 没开 --collector.textfile.directory ⇒ textfile 指标全部无人采集");
  else if (nMount && collectorDir !== nMount.container) {
    problems.push(`node-exporter 的 --collector.textfile.directory(${collectorDir}) 与它的挂载目标`
      + `（${nMount.container}）不一致 ⇒ collector 扫的是一个空目录`);
  }
  // ① 属主/权限必须在启动路径里被钉住（不能只靠 chown -R /backups 顺带覆盖）
  const dirVar = /\$\{BACKUP_TEXTFILE_DIR:-([^}]+)\}/u.exec(envTarget)?.[1] ?? "";
  const targetsRealDir = entrypointText.includes("${TEXTFILE_DIR}")
    || (dirVar && entrypointText.includes(dirVar));
  if (!/chown[^\n]*\$\{TEXTFILE_DIR\}|chown[^\n]*node-textfile/u.test(entrypointText) || !targetsRealDir) {
    problems.push("entrypoint 没有显式 chown textfile 目录 ⇒ 当前只是靠 `chown -R /backups` 顺带覆盖，"
      + "目录一旦移出 ./backups 或运行账号变化就会静默变回“cron 写不进去”");
  }
  if (!/mkdir[^\n]*TEXTFILE|mkdir[^\n]*node-textfile/u.test(entrypointText)) {
    problems.push("entrypoint 没有 mkdir textfile 目录 ⇒ 宿主目录缺失时写入端静默失败");
  }
  // ④ 基线播种：第一次真实备份之前就要有序列
  if (!/backup\.prom/u.test(entrypointText)
    || !/node_backup_last_success_timestamp_seconds/u.test(entrypointText)) {
    problems.push("entrypoint 没有播种基线指标 ⇒ 首次备份前序列恒缺，BackupNeverCompleted 既不告警也不报错");
  }
  // 规则引用的指标名必须与写入端产出的名字逐字一致（含脚本）
  const ruleMetric = /node_backup_[a-z_]+/u.exec(String(ruleExpr))?.[0] ?? "";
  if (!ruleMetric) problems.push("BackupNeverCompleted 的表达式里找不到 node_backup_* 指标名");
  else {
    if (!entrypointText.includes(ruleMetric)) {
      problems.push(`规则查 ${ruleMetric}，但 backup 启动路径播种的不是这个名字`);
    }
  }
  return problems;
}

let textfileRedFormChecked = 0;
let landingChecksRun = 0; // 6c 节落地前置的实际执行计数（摘要里的数字由它出，不是字面量）
{
  const services = YAML.parse(compose).services ?? {};
  const backup = services.backup;
  const nodeExporter = services["node-exporter"];
  assert.ok(backup && nodeExporter, "docker-compose.yml 里缺 backup 或 node-exporter 服务，6c 节无法判定");
  const epInline = Array.isArray(backup.entrypoint) ? backup.entrypoint.join(" ") : String(backup.entrypoint ?? "");
  const epMount = (backup.volumes ?? [])
    .map((v) => /^(\.[\w./-]*entrypoint\.sh):([^:]+)(?::ro)?$/.exec(String(v).trim()))
    .find(Boolean);
  assert.ok(epMount, "backup.entrypoint 的脚本必须由 volumes 挂进容器（6c 节要读它的内容来判形状）");
  const entrypointText = read(epMount[1]);
  const backupEnvObj = {};
  for (const [k, v] of Object.entries(backup.environment ?? {})) backupEnvObj[k] = v;
  const rule = (ruleGroups.flatMap((g) => g.rules ?? []).find((r) => r.alert === "BackupNeverCompleted")) ?? {};
  const problems = textfileShape({
    backupVolumes: (backup.volumes ?? []).map(String),
    backupEnv: backupEnvObj,
    nodeVolumes: (nodeExporter.volumes ?? []).map(String),
    nodeCommand: (Array.isArray(nodeExporter.command) ? nodeExporter.command : [nodeExporter.command]).join(" "),
    entrypointText,
    ruleExpr: rule.expr ?? "",
  });
  assert.deepEqual(
    problems,
    [],
    `BackupNeverCompleted 的写入端形状不成立（这条“安全网的安全网”会静默地不响）：\n  ${problems.join("\n  ")}`,
  );
  // 写入端脚本与播种用的必须是同一个宿主目录约定
  const backupScript = read("scripts/backup-mysql.sh");
  assert.match(backupScript, /BACKUP_TEXTFILE_DIR="\$\{BACKUP_TEXTFILE_DIR:-\/mnt\/node-textfile\}"/u,
    "scripts/backup-mysql.sh 的默认 textfile 目录必须与 compose 的挂载目标同源");
  assert.match(backupScript, /node_backup_last_success_timestamp_seconds/u,
    "scripts/backup-mysql.sh 必须写 node_backup_last_success_timestamp_seconds（规则查的就是它）");

  // ── 「这套改法能不能落地」的静态判点（W3b 补，item 3）───────────────────────
  // entrypoint 里那串 mkdir/chown 不是写了就成立的，它有四条前置，全部可以在盘上判。
  // landingChecksRun 是【计数器】，每个判点自己 +1 —— 摘要里报的数字必须由代码数出来，
  // 不能是写字面量（本仓踩过的坑："注释声称已加某读数"，得 grep 代码数一遍）。
  const landing = [];
  // (a) 建账号 + chown 宿主目录需要 root：backup 服务一旦设了【非 root】的 user:，entrypoint
  //     就以非 root 起跑，adduser/chown 直接 EPERM ⇒ 目录还是 root:root，cron 档（backup 身份）
  //     写不进去 ⇒ 死告警原样回来，而且这次连 entrypoint 都起不来。user: root/0 是豁免的
  //     （它就是"以 root 跑"的另一种写法，chown 仍然成立）。
  const rawUser = backup.user === undefined || backup.user === null ? "" : String(backup.user).trim();
  landingChecksRun += 1;
  if (rawUser !== "" && !/^(root|0)$/u.test(rawUser.split(":")[0])) {
    landing.push(`backup 服务设了 user=${rawUser} ⇒ entrypoint 的 adduser/chown 会以非 root 跑，`
      + "宿主 bind 目录钉不成 backup 属主 ⇒ cron 档写不进 textfile ⇒ BackupNeverCompleted 回到死告警");
  }
  // (b) 容器根文件系统只读 ⇒ mkdir /etc/crontabs、写 crontab、写 .prom 全废
  landingChecksRun += 1;
  if (backup.read_only === true) {
    landing.push("backup 服务 read_only: true ⇒ entrypoint 的 mkdir/crontab/textfile 写入全部 EROFS");
  }
  // (c) 播种的文件必须落在 collector 认的扩展名上（textfile collector 只收 *.prom）
  const promFile = /([\w.-]+\.prom)/u.exec(entrypointText)?.[1] ?? "";
  landingChecksRun += 1;
  if (!promFile) landing.push("entrypoint 播种的文件名不是 *.prom ⇒ node-exporter 的 textfile collector 不会读它");
  // (d) 同一个目录里两个文件写同一个指标名 ⇒ collector 报 duplicate metric 并【整个目录不导出】，
  //     等于又是一条死告警。播种者与脚本者必须共用同一个文件名。
  const scriptPromFile = /BACKUP_TEXTFILE_DIR\}\/([\w.-]+\.prom)/u.exec(backupScript)?.[1] ?? "";
  landingChecksRun += 1;
  if (promFile && scriptPromFile && promFile !== scriptPromFile) {
    landing.push(`播种写 ${promFile}、备份脚本写 ${scriptPromFile}，同一目录里两个文件暴露同名指标`
      + " ⇒ textfile collector 判 duplicate 后整目录不导出（静默地又没有序列）");
  }
  // (e) 读侧是 node-exporter（镜像默认 USER nobody，非 root）⇒ 目录与文件必须留 others 位。
  //     chmod 700/600 这类写法能把"backup 可写但 nobody 不可读"做出来，盘上判得出。
  const dirChmod = [...entrypointText.matchAll(/chmod\s+(\d{3})\s+"?\$\{?TEXTFILE_DIR/gu)].map((m) => m[1]);
  landingChecksRun += 1;
  for (const mode of dirChmod) {
    if (!/[1-7]$/.test(mode)) {
      landing.push(`entrypoint 把 textfile 目录 chmod 成 ${mode} ⇒ others 无权限，`
        + "而 node-exporter 以非 root（镜像默认 nobody）读它 ⇒ 写了也抓不到");
    }
  }
  landingChecksRun += 1;
  if (/chmod\s+0?[60]{3}\s+"?\$\{?TEXTFILE_DIR\/?[^\s"]*\.prom/u.test(entrypointText)) {
    landing.push("entrypoint 把播种的 .prom 文件 chmod 成 others 不可读 ⇒ collector 抓不到指标");
  }
  assert.ok(landingChecksRun >= 6,
    `落地前置只跑了 ${landingChecksRun} 项（<6）：摘要求数会被硬编码蒙过去`);
  assert.deepEqual(landing, [],
    `BackupNeverCompleted 的写入端【落地前置】不成立（entrypoint 里的 chown 会静默失效）：\n  ${landing.join("\n  ")}`);

  // —— 本节自测：四种“静默哑”形态都必须能变红，当前形状必须放过 ——
  const okFixture = {
    backupVolumes: ["./backups/node-textfile:/mnt/node-textfile"],
    backupEnv: { BACKUP_TEXTFILE_DIR: "${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}" },
    nodeVolumes: ["./backups/node-textfile:/mnt/textfile:ro"],
    nodeCommand: "--collector.textfile.directory=/mnt/textfile",
    entrypointText: entrypointText,
    ruleExpr: "(time() - node_backup_last_success_timestamp_seconds) > 129600",
  };
  assert.deepEqual(textfileShape(okFixture), [], "自测失败：当前盘上的形状被判红了（判据写错了）");
  const redCases = [
    ["backup 侧挂成只读", { ...okFixture, backupVolumes: ["./backups/node-textfile:/mnt/node-textfile:ro"] }],
    ["backup 侧挂成只读（挂载目标带插值）", {
      ...okFixture,
      backupVolumes: ["./backups/node-textfile:${BACKUP_TEXTFILE_DIR:-/mnt/node-textfile}:ro"],
    }],
    // 解析器原洞的两条对偶：:ro 藏在【宿主侧】插值后面、以及藏在【mode 位插值】里
    ["backup 侧挂成只读（宿主路径带插值）", {
      ...okFixture,
      backupVolumes: ["${BACKUP_DIR:-./backups/node-textfile}:/mnt/node-textfile:ro"],
    }],
    ["backup 侧读写位被插值藏起来（静态判不出＝必须点名）", {
      ...okFixture,
      backupVolumes: ["./backups/node-textfile:/mnt/node-textfile:${MOUNT_OPTS:-ro}"],
    }],
    ["node-exporter 侧给了可写", {
      ...okFixture,
      nodeVolumes: ["./backups/node-textfile:/mnt/textfile"],
    }],
    ["两侧不是同一个宿主目录", {
      ...okFixture,
      nodeVolumes: ["./other-dir:/mnt/textfile:ro"],
    }],
    ["BACKUP_TEXTFILE_DIR 指到没挂载的路径", {
      ...okFixture,
      backupEnv: { BACKUP_TEXTFILE_DIR: "/opt/unmounted-metrics" },
    }],
    ["node-exporter 没开 textfile collector", { ...okFixture, nodeCommand: "--path.rootfs=/host" }],
    ["启动路径没 chown textfile 目录", {
      ...okFixture,
      entrypointText: "apk add bash\nmkdir -p /backups\n",
    }],
    ["没有基线播种", {
      ...okFixture,
      entrypointText: "chown backup:backup ${TEXTFILE_DIR}\nmkdir -p ${TEXTFILE_DIR}\n",
    }],
    ["播种的指标名与规则查的不是一个", {
      ...okFixture,
      entrypointText: "chown backup:backup ${TEXTFILE_DIR}\nmkdir -p ${TEXTFILE_DIR}\n"
        + "echo x > ${TEXTFILE_DIR}/backup.prom\nnode_backup_typo 0\n",
    }],
  ];
  for (const [name, fixture] of redCases) {
    textfileRedFormChecked += 1;
    assert.ok(
      textfileShape(fixture).length > 0,
      `自测失败：形态「${name}」没被判红 ⇒ 6c 节形同虚设`,
    );
  }
}

/* ── 7. 告警文案里的 $labels.X 必须可达（2026-11-01，第六轮 W3 item 7）─────────
 * 现象：规则 annotations 写了 {{ $labels.component }} / {{ $labels.reason }}，而发出的
 * 告警上根本没这个标签 ⇒ 通知文案那一段永远渲染成空（"原因 " 后面什么都没有）。
 * 标签只有四个来源，本节逐个对账：
 *   ① 规则自己的 labels:（severity/service）——一定在；
 *   ② compose 给 prometheus 的 --web.external-labels（cluster/environment）——一定在；
 *   ③ 抓取任务 static_configs 的 labels（service/application）+ Prometheus 自带的 job/instance；
 *   ④ 指标自己的序列标签：必须由代码或平台 binder 举证（.tag("reason") 这种），
 *      并且**不能被表达式里的裸聚合抹掉**——裸 sum()/count() 会丢掉所有序列标签，
 *      只有 sum by (x) / without(x) 才保留（这正是 reason 那两条的成因）。
 * 判不出的部分：真跑一次 Prometheus 抓活数据后看 /api/v2/alerts 的渲染结果。
 */
const EXTERNAL_LABELS = new Set(
  [...compose.matchAll(/--web\.external-labels=([a-zA-Z_][a-zA-Z0-9_]*)=/gu)].map((m) => m[1]),
);
assert.ok(
  EXTERNAL_LABELS.size >= 2 && EXTERNAL_LABELS.has("environment"),
  `从 compose 解出的 external-labels 只有 ${[...EXTERNAL_LABELS].join(",")}：本节会失去一个标签来源`,
);
const SCRAPE_LABELS = new Set(["job", "instance"]);
{
  const doc = YAML.parse(prometheus);
  for (const job of doc.scrape_configs ?? []) {
    for (const sc of job.static_configs ?? []) {
      for (const k of Object.keys(sc.labels ?? {})) SCRAPE_LABELS.add(k);
    }
  }
}
assert.ok(SCRAPE_LABELS.has("service"), "从 prometheus.yml 解不出抓取期标签 service，本节判据会失真");
// 代码举证的序列标签（micrometer .tag("x", …)，常量名走同一份 consts 表）
const CODE_TAGS = new Set();
for (const file of javaFiles(JAVA_SRC)) {
  const text = read(file);
  const consts = new Map();
  for (const m of text.matchAll(/String\s+(\w+)\s*=\s*"([a-zA-Z][a-zA-Z0-9.]*)"\s*;/gu)) consts.set(m[1], m[2]);
  for (const m of text.matchAll(/\.tag\s*\(\s*(?:"([a-zA-Z][a-zA-Z0-9_]*)"|([A-Za-z_]\w*))\s*[,)]/gu)) {
    const tag = m[1] ?? consts.get(m[2]);
    if (tag) CODE_TAGS.add(tag);
  }
}
assert.ok(
  CODE_TAGS.has("reason") && CODE_TAGS.has("status") && CODE_TAGS.size >= 4,
  `只从代码里举证到 ${CODE_TAGS.size} 个标签名（reason/status 必须在），扫描方式可能失效`,
);
// 平台 binder 自带的标签（不在本仓代码里，逐个给出处；清单只允许收缩，
// 且刻意**不含 component**——本仓 app_health_status 只有 status 一个 tag，
// 把 component 放行等于给 item 7 的原缺陷开门）。
const PLATFORM_TAGS = new Set([
  "pool",       // micrometer HikariCP 绑定：hikaricp_connections_* 带 pool 标签
  "uri",        // http.server.requests 自动 tag
  "mountpoint", // node-exporter node_filesystem_* 自带
  "fstype",     // 同上
  "le",         // histogram 分桶标签
]);
assert.ok(
  PLATFORM_TAGS.size <= 8,
  `平台标签白名单膨胀到 ${PLATFORM_TAGS.size} 个：加条目等于给一类不可达标签放行，必须逐个给出处`,
);

/** 找到 openIdx 这个左括号对应的右括号（本仓表达式里没有带括号的字符串字面量，够用）。 */
function matchParen(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * 表达式保留的序列标签：null = 没有聚合（全保留）；Set = 聚合后的保留集。
 * 两种分组写法都要认：前缀 `sum by (x) (m)` 与后缀 `sum(m) by (x)`
 * （本仓规则两种都在用，只认前缀会把 `sum(rate(...)) by (uri)` 误判成裸聚合）。
 */
function labelsPreservedByExpr(expr) {
  const s = String(expr);
  let survivors = null;
  const GROUP = /^\s*(by|without)\s*\(([^)]*)\)/u;
  for (const m of s.matchAll(/\b(sum|count|avg|min|max|group|topk|bottomk|quantile|count_values)\s*\(/gu)) {
    const open = s.indexOf("(", m.index + m[1].length);
    if (open === -1) continue;
    const head = s.slice(m.index + m[1].length, open);
    let group = GROUP.exec(head);
    if (!group) {
      const close = matchParen(s, open);
      if (close !== -1) group = GROUP.exec(s.slice(close + 1, close + 60));
    }
    if (group) {
      const names = group[2].split(",").map((x) => x.trim()).filter(Boolean);
      if (group[1] === "without") {
        // without(...) 是"全保留再减几个"，静态列不出全集 ⇒ 按最宽的"全保留"处理。
        // 本仓当前没有 without() 用法；真要引入，得连同 $labels 举证一起重新设计本节。
        survivors = null;
      } else {
        survivors = new Set([...(survivors ?? []), ...names]);
      }
    } else {
      survivors = new Set(); // 裸聚合：丢掉所有序列标签
    }
  }
  return survivors;
}

function unreachableRuleLabels(rule) {
  const annotations = rule.annotations ?? {};
  const text = Object.values(annotations).join("\n");
  const ruleLabels = new Set(Object.keys(rule.labels ?? {}));
  const survivors = labelsPreservedByExpr(rule.expr ?? "");
  const matcherNames = new Set(
    [...String(rule.expr ?? "").matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=~|!=|=)\s*"/gu)].map((m) => m[1]),
  );
  const bad = [];
  for (const m of text.matchAll(/\$labels\.([a-zA-Z_][a-zA-Z0-9_]*)/gu)) {
    const label = m[1];
    if (ruleLabels.has(label) || EXTERNAL_LABELS.has(label)) continue;
    if (survivors === null) {
      if (matcherNames.has(label) || CODE_TAGS.has(label) || SCRAPE_LABELS.has(label) || PLATFORM_TAGS.has(label)) continue;
      bad.push(`${label}（序列上从来没有这个标签，也没有代码/binder 举证）`);
    } else if (survivors.has(label) && (CODE_TAGS.has(label) || SCRAPE_LABELS.has(label) || PLATFORM_TAGS.has(label))) {
      continue;
    } else {
      const kept = [...survivors].join(",") || "无";
      bad.push(
        `${label}（表达式的聚合只保留 [${kept}]，`
        + (survivors.has(label) ? "它是分组标签但代码/平台都没举证它存在）" : "这个标签被抹掉了）"),
      );
    }
  }
  return bad;
}

const unreachable = [];
let annotationsChecked = 0;
let groupingPreserved = 0;
for (const group of ruleGroups) {
  for (const rule of group.rules ?? []) {
    if (!rule.alert) continue;
    const text = Object.values(rule.annotations ?? {}).join("\n");
    if (!/\$labels\./u.test(text)) continue;
    annotationsChecked += 1;
    if (/\bby\s*\(/u.test(String(rule.expr ?? ""))) groupingPreserved += 1;
    const bad = unreachableRuleLabels(rule);
    if (bad.length > 0) unreachable.push(`${group.name}/${rule.alert}: ${bad.join("；")}`);
  }
}
assert.ok(
  annotationsChecked >= 8,
  `只核到 ${annotationsChecked} 条带 $labels 的告警文案（<8），本节可能在空集合上假绿`,
);
assert.ok(
  groupingPreserved >= 2,
  `只有 ${groupingPreserved} 条规则用 by() 保留标签：reason 那两条的修复形态丢了 ⇒ 文案会回到渲染为空`,
);
assert.deepEqual(
  unreachable,
  [],
  `告警文案引用了不可达的 $labels（通知里那一段永远是空的）：\n  ${unreachable.join("\n  ")}`,
);
// 自测：三种形态都要能红，修复后的形态要放过
assert.deepEqual(
  unreachableRuleLabels({
    alert: "Fake", expr: 'sum(increase(x_total[5m])) > 0',
    labels: { severity: "warning" },
    annotations: { description: "原因 {{ $labels.reason }}" },
  }).map((s) => s.split("（")[0]),
  ["reason"],
  "自测失败：裸 sum() 抹掉 reason 的形态（本 item 的原缺陷）没被判红",
);
assert.deepEqual(
  unreachableRuleLabels({
    alert: "FakeOk", expr: 'sum by (reason) (increase(x_total[5m])) > 0',
    labels: { severity: "warning" },
    annotations: { description: "原因 {{ $labels.reason }}" },
  }),
  [],
  "自测失败：修复后的 sum by (reason) 被判红了（误报）",
);
assert.equal(
  unreachableRuleLabels({
    alert: "FakeMissing", expr: 'app_health_status{status="DOWN"} > 0',
    labels: { severity: "critical" },
    annotations: { description: "组件 {{ $labels.nope_indicator }}" },
  }).length, 1,
  "自测失败：完全无举证的标签名没被判红",
);
assert.ok(
  unreachableRuleLabels({
    alert: "FakeGrouped", expr: "sum by (nonexistent_tag) (rate(x_total[5m])) > 0",
    annotations: { description: "{{ $labels.nonexistent_tag }}" },
  }).length === 1,
  "自测失败：by() 按一个代码里不存在的标签分组没被判红（按不存在的标签分组＝不分）",
);
// 后缀分组写法必须认（本仓规则大量使用 `sum(...) by (le, uri)` 这种后缀形式，
// 只认前缀会把一批合法规则误判成"裸聚合抹掉标签"）
assert.deepEqual(
  [...(labelsPreservedByExpr('histogram_quantile(0.99, sum(rate(m_bucket[5m])) by (le, uri)) > 1') ?? ["<null>"])],
  ["le", "uri"],
  "自测失败：后缀 `by (le, uri)` 没被识别成分组 ⇒ 会把合法规则判成裸聚合",
);
assert.deepEqual(
  unreachableRuleLabels({
    alert: "FakeBareUri", expr: 'sum(rate(http_server_requests_seconds_count[5m])) > 1',
    annotations: { description: "URI {{ $labels.uri }}" },
    labels: {},
  }).map((s) => s.split("（")[0]),
  ["uri"],
  "自测失败：裸 sum() 抹掉 uri 的形态没被判红",
);

/* ── 8. 文档「命令/告警名/阈值/job」↔ 事实源 双向对账（2026-11-01，W3b 补 item 8 余项）──
 * item 6 的成因不是"有人写错了一个字"，而是**文档描述同一件事的那一节从没跟着复量过**：
 * prometheus.yml 与 alert-rules.yml 各改各的，DEPLOYMENT/RUNBOOKS 停在旧世界。
 * 前七节全在机器内部对账（规则↔代码↔compose），文档这一侧只有零散的哨兵，
 * 所以「文档列了 8 个告警名、其中 7 个不存在」这种漂移一次都抓不到。
 * 本节把审计建议的三条轴钉成静态可判的命题（不需要 live Prometheus）：
 *   A 告警名：文档里"像告警名"的驼峰词必须是规则文件里真实存在的告警（现役或注释态）；
 *            注释态的那些必须在同一行/相邻行带「停用/未部署/注释」限定。
 *   B 覆盖率：规则文件每条【现役】告警都必须出现在文档清单里（防止只删不写就不矛盾）。
 *   C 阈值与 for：文档同一行写的百分比必须等于该告警表达式里的数值阈值；
 *            规则有 `for: 5m` 而文档那行没写 5m ⇒ 红；规则**没有** `for` 而文档那行
 *            出现 `\d+m` ⇒ 同样红（`PaymentCallbackFailure` 就是这条的活教材）。
 *   D 抓取 job：文档写的 job/exporter 名必须是 prometheus.yml 里的现役 job，
 *            或该行明确标了「移除/未部署/不存在/新增」——"教人取消一段已经不存在的注释"
 *            就是这一轴要拦的（RUNBOOKS 的 blackbox-http 旧文案）。
 * 刻意**不**钉字面句子（等价改写不该判红），钉的是"引用的标识符必须存在于事实源"。
 */
const DOCS = [
  ["doc/DEPLOYMENT.md", read("doc/DEPLOYMENT.md")],
  ["doc/RUNBOOKS.md", read("doc/RUNBOOKS.md")],
];
let docReconciliationChecked = 0; // 漂移形态自测计数（真实值在下面的自测块里赋）
const ACTIVE_ALERTS = new Map();
for (const group of ruleGroups) {
  for (const rule of group.rules ?? []) if (rule.alert) ACTIVE_ALERTS.set(rule.alert, rule);
}
// 注释态的告警名（`# - alert: AdminDown`）：存在但停用，文档提到它们必须带限定词
const COMMENTED_ALERTS = new Set(
  [...alertRules.matchAll(/^\s*#\s*-?\s*alert:\s*([A-Z][A-Za-z0-9]+)\s*$/gmu)].map((m) => m[1]),
);
assert.ok(
  ACTIVE_ALERTS.size >= 15 && COMMENTED_ALERTS.has("AdminDown"),
  `事实源解析异常：现役 ${ACTIVE_ALERTS.size} 条、注释态 {${[...COMMENTED_ALERTS].join(",")}}`
  + "——本节的全部判据都建立在这两个集合上，解错了就等于在空集合上绿",
);
/**
 * 告警名的构词形态：从**现役名单自己**推出后缀集合（末个驼峰词），
 * 而不是手写一张表——手写表会随规则文件漂移，且新告警一进来就漏判。
 * 这样 `GlobalExceptionHandler`（Handler 不在集合内）不会被误当成告警名，
 * 而 `ApiLatencyHigh`（High 在集合内、名字不在名单里）会。
 */
const ALERT_SUFFIXES = new Set(
  [...ACTIVE_ALERTS.keys(), ...COMMENTED_ALERTS]
    .map((name) => /([A-Z][a-z0-9]*)$/u.exec(name)?.[1])
    .filter(Boolean),
);
assert.ok(
  ALERT_SUFFIXES.size >= 5,
  `从名单推出的告警名后缀集合只有 ${ALERT_SUFFIXES.size} 项，本节可能已经失效`,
);
const CAMEL_TOKEN = /`([A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+)`/gu;
const lastCamelWord = (name) => /([A-Z][a-z0-9]*)$/u.exec(name)?.[1];
/** 轴 A：文档引用的"告警名形状的驼峰词"必须真实存在于规则文件。返回 [问题, 提到的实名]。 */
function checkAlertNames(docs) {
  const issues = [];
  const names = new Set();
  for (const [file, text] of docs) {
    const lines = text.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i += 1) {
      for (const m of lines[i].matchAll(CAMEL_TOKEN)) {
        const name = m[1];
        if (!ALERT_SUFFIXES.has(lastCamelWord(name))) continue;
        if (ACTIVE_ALERTS.has(name) || COMMENTED_ALERTS.has(name)) {
          names.add(name);
          if (COMMENTED_ALERTS.has(name)) {
            const window = lines.slice(Math.max(0, i - 2), i + 3).join("\n");
            if (!/停用|未部署|注释|暂时|不存在|恢复办法|新增/u.test(window)) {
              issues.push(`${file}:${i + 1}: ${name} 是注释态（停用）告警，`
                + "但文档把它当现役写（读者会去查一条永不触发的规则）");
            }
          }
          continue;
        }
        issues.push(`${file}:${i + 1}: \`${name}\` 在 alert-rules.yml 里不存在`
          + `（现役 ${ACTIVE_ALERTS.size} 条实名，注释态 ${[...COMMENTED_ALERTS].join("/")}`
          + "）——文档引用了一条查不到、也永远不会触发的告警");
      }
    }
  }
  return [issues, names];
}
const [docAlertIssues, docAlertNames] = checkAlertNames(DOCS);
assert.deepEqual(docAlertIssues, [],
  `文档里的告警名与规则文件对不上（照文档排障会找一个不存在的规则）：\n  ${docAlertIssues.join("\n  ")}`);
// B 覆盖率：规则新增一条现役告警而文档清单没写 ⇒ 同样红（"少说话"不等于"不矛盾"）
const uncovered = [...ACTIVE_ALERTS.keys()].filter((n) => !docAlertNames.has(n));
assert.ok(uncovered.length === 0,
  `alert-rules.yml 有 ${uncovered.length} 条现役告警文档一个字都没提：${uncovered.join(", ")} `
  + "⇒ 运维不知道它们存在；新增规则必须同批把 doc/DEPLOYMENT.md 的清单补上");
assert.ok(docAlertNames.size >= ACTIVE_ALERTS.size - 3,
  `文档只核到 ${docAlertNames.size} 个告警名（现役 ${ACTIVE_ALERTS.size} 条）：本节正在空集合上假绿`,
);

/** 从规则表达式取"阈值"：`> 0.85` 记 85%，`> 2` 记 2（单位由文档自己写）。 */
function ruleThresholdPercents(expr) {
  const out = new Set();
  for (const m of String(expr).matchAll(/>\s*(0\.\d+|1(?:\.0+)?)\b/gu)) {
    const v = Number.parseFloat(m[1]);
    if (v > 0 && v <= 1) out.add(Math.round(v * 1000) / 10);
  }
  return out;
}
/** 轴 C：同一行写的百分比 / for 窗口必须等于规则实值。 */
function checkDocNumbers(docs) {
  const issues = [];
  for (const [file, text] of docs) {
    const lines = text.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const names = [...line.matchAll(CAMEL_TOKEN)].map((m) => m[1]).filter((n) => ACTIVE_ALERTS.has(n));
      if (names.length === 0) continue;
      const rule = ACTIVE_ALERTS.get(names[0]);
      for (const pct of [...line.matchAll(/(\d+(?:\.\d+)?)\s*%/gu)].map((m) => Number.parseFloat(m[1]))) {
        const allowed = new Set(names.flatMap((n) => [...ruleThresholdPercents(ACTIVE_ALERTS.get(n).expr ?? "")]));
        if (allowed.size === 0) continue; // 规则没有比例型阈值（如 P99 秒数）⇒ 不判
        if (!allowed.has(pct)) {
          issues.push(`${file}:${i + 1}: ${names[0]} 文档写 >${pct}%，规则表达式实际是 `
            + `[${[...allowed].join("/")}%] ⇒ 阈值口径漂移（告警比文档描述的更早/更晚响）`);
        }
      }
      // for 窗口：**只在文档那一行自己对持续窗口作了声明时**才核对。
      // （早期版本要求"每个提到告警名的行都必须重写一遍 for"，那是把叙述句当清单句读，
      //  十行全是误报；判据应该钉的是"说了就得说对"，不是"每行都得说"。）
      const forValue = String(rule.for ?? "");
      const minutesOnLine = [...line.matchAll(/\b(\d+)\s*m\b/gu)].map((m) => `${m[1]}m`);
      if (minutesOnLine.length === 0) continue;
      const allowedFor = new Set(
        names.map((n) => String(ACTIVE_ALERTS.get(n).for ?? "")).filter(Boolean),
      );
      for (const stated of minutesOnLine) {
        if (!allowedFor.has(stated)) {
          issues.push(`${file}:${i + 1}: ${names[0]} 这行写了持续窗口 ${stated}，`
            + `但本行点名的告警在 alert-rules.yml 里的 for 是 `
            + `[${[...allowedFor].join("/") || "没有 for（评估到即进 pending）"}]`
            + " ⇒ 读者按这个缓冲估计响应时间是错的");
        }
      }
    }
  }
  return issues;
}
assert.deepEqual(checkDocNumbers(DOCS), [],
  `文档里的告警阈值/持续窗口与 alert-rules.yml 不一致：\n  ${checkDocNumbers(DOCS).join("\n  ")}`);

// D 抓取 job 轴
const ACTIVE_JOBS = new Set(
  [...prometheus.matchAll(/^\s*-?\s*job_name:\s*(\S+)/gmu)].map((m) => m[1]),
);
assert.ok(ACTIVE_JOBS.has("node-exporter") && ACTIVE_JOBS.size >= 3,
  `prometheus.yml 解出的现役 job 只有 {${[...ACTIVE_JOBS].join(",")}}：本节判据会失真`);
/** 轴 D：文档提到的 exporter/job 名必须与 prometheus.yml 的现役 job 集合一致。 */
function checkDocJobs(docs) {
  const issues = [];
  for (const [file, text] of docs) {
    const lines = text.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i += 1) {
      const m = /`?(mysql-exporter|redis-exporter|blackbox-http|blackbox-exporter)`/u.exec(lines[i])
        ?? new RegExp("\\b(mysql-exporter|redis-exporter|blackbox-http|blackbox-exporter)\\b", "u").exec(lines[i]);
      if (!m) continue;
      const window = lines.slice(Math.max(0, i - 2), i + 3).join("\n");
      // 允许的说法：已移除/未部署/整段不存在/要新增；禁止的说法：把它当现役目标。
      if (!/移除|未部署|不存在|停用|新增|已无|删掉|无对应/u.test(window)) {
        issues.push(`${file}:${i + 1}: 提到 ${m[1]}，但 prometheus.yml 里没有这个 job，`
          + "且这一带没有「已移除/未部署/需新增」的限定 ⇒ 读者会以为它在抓");
      }
      // "取消注释"这条退路：那个注释块自 infra #18 起已经整段删除
      if (/取消[^\n]{0,24}注释|解注释|打开注释/u.test(lines[i])
        && ![...ACTIVE_JOBS].some((job) => new RegExp(`job_name:\\s*${job}\\b`, "u").test(prometheus))
        && /#.*job_name/u.test(prometheus) === false) {
        issues.push(`${file}:${i + 1}: 教运维「取消 ${m[1]} 的注释」，而 prometheus.yml 里`
          + "根本没有任何注释态的 job_name（该段自 infra #18 起整段删除）⇒ 照做找不到落点，只能新增");
      }
    }
  }
  return issues;
}
assert.deepEqual(checkDocJobs(DOCS), [],
  `文档描述的抓取目标与 prometheus.yml 的现役 job 不一致：\n  ${checkDocJobs(DOCS).join("\n  ")}`);

// —— 本节自测：四种漂移都必须能被同一份检查函数抓红，当前文档必须放过 ——
{
  const driftCases = [
    ["不存在的告警名（item 6 原缺陷的主形态）",
      checkAlertNames([["x.md", "`ApiLatencyHigh` 触发时看 P99\n"]])[0]],
    ["不存在的告警名（Jvm 族）",
      checkAlertNames([["x.md", "`JvmHeapHigh` 触发\n"]])[0]],
    ["阈值口径漂移",
      checkDocNumbers([["x.md", "`HostMemoryHigh`（内存使用率 >90%，持续 5m）\n"]])],
    ["for 窗口漂移",
      checkDocNumbers([["x.md", "`ApiDown` 5 分钟离线（持续 10m）\n"]])],
    ["无 for 的规则被写成有 for",
      checkDocNumbers([["x.md", "`PaymentCallbackFailure`（持续 5m）\n"]])],
    ["把已移除的 exporter 写成现役目标",
      checkDocJobs([["x.md", "- `blackbox-http`：外部依赖可用性探针\n"]])],
    ["教人取消一段不存在的注释",
      checkDocJobs([["x.md", "恢复办法：取消 `blackbox-http` 抓取任务的注释\n"]])],
    ["注释态告警被当现役写",
      checkAlertNames([["x.md", "`AdminDown` 触发时说明 admin 挂了\n"]])[0]],
  ];
  for (const [name, issues] of driftCases) {
    assert.ok(Array.isArray(issues) && issues.length > 0,
      `自测失败：漂移形态「${name}」没被本节判红 ⇒ 这条轴形同虚设`);
  }
  // 正控：当前盘上的两份文档必须一条问题都没有（上面已有深断言，这里量一个下限，
  // 防止 ALERT_SUFFIXES 空了导致全部检查在空集合上"绿"）
  assert.ok(ACTIVE_ALERTS.size >= 15 && docAlertNames.size >= 15,
    `现役告警 ${ACTIVE_ALERTS.size} 条、文档核到 ${docAlertNames.size} 个 ⇒ 本节可能在空集合上假绿`);
  docReconciliationChecked = driftCases.length;
}

console.log(
  `monitoring wiring ok（注册指标 ${registered.size} 个、被引用 ${referenced.size} 个全部可追溯；`
  + `Counter 裸名引用 0 处；告警表达式数据源核对 ${dataSourceChecked} 条，其中 ${hostSourcedRules} 条靠 node-exporter（job 活跃、过期声明 0 条）；`
  + `receiver ${definedReceivers.size} 个、引用 ${usedReceivers.size} 个全部已定义；`
  + `textfile 写入端形状 ${textfileRedFormChecked} 种静默哑形态全可判红、落地前置 ${landingChecksRun} 项已核；`
  + `卷声明解析阳性对照 ${volumeControlsChecked} 行；`
  + `文档↔规则对账：告警名 ${docAlertNames.size}/${ACTIVE_ALERTS.size} 条全覆盖、`
  + `漂移形态自测 ${docReconciliationChecked} 种全可判红；`
  + `$labels 可达性核对 ${annotationsChecked} 条文案、不可达 0 条）`,
);
