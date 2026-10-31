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

console.log(
  `monitoring wiring ok（注册指标 ${registered.size} 个、被引用 ${referenced.size} 个全部可追溯；`
  + `Counter 裸名引用 0 处；告警表达式数据源核对 ${dataSourceChecked} 条，其中 ${hostSourcedRules} 条靠 node-exporter（job 活跃、过期声明 0 条）；`
  + `receiver ${definedReceivers.size} 个、引用 ${usedReceivers.size} 个全部已定义）`,
);
