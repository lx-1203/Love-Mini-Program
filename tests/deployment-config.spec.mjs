import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import YAML from "yaml";

/**
 * Compose 必填项必须在 **api 服务自己的 environment** 上，且必须是缺参即失败的插值。
 *
 * 为什么不再是全文正则：原判据 `APP_AES_SECRET:\s*\$\{APP_AES_SECRET:\?...}` 在任何一行成立都算过，
 * 所以把这行挪到 admin/client 服务上、api 仍然拿不到变量时，门照样绿
 *（AesEncryptor 与 WebSocketConfig 在 real 档都是 fail-fast，缺了就起不来）。
 * 现在按 YAML 结构取 services.api.environment 这个对象来判。
 */
const composeText = readFileSync(
  new URL("../docker-compose.yml", import.meta.url),
  "utf8",
);
const compose = YAML.parse(composeText);
const apiService = compose?.services?.api;
assert.ok(apiService, "docker-compose.yml 必须定义 api 服务");
const apiEnv = apiService.environment ?? {};

const REQUIRED_ON_API = ["APP_AES_SECRET", "WEBSOCKET_ALLOWED_ORIGIN_PATTERNS"];
for (const name of REQUIRED_ON_API) {
  const value = apiEnv[name];
  assert.ok(
    typeof value === "string" && value.length > 0,
    `services.api.environment 必须声明 ${name}（real 档缺它 fail-fast）`,
  );
  // 必须是 ${NAME:?提示} 形态：缺参即 compose 报错，而不是 :- 给个弱默认值蒙过去
  const strictInterpolation = new RegExp(`^\\$\\{${name}:\\?[^}]*\\}$`, "u");
  assert.match(
    value,
    strictInterpolation,
    `${name} 必须是 \${${name}:?…} 必填插值，不许用 :- 弱默认或写死值`,
  );
}

// 反向对照：这两项必须真的挂在 api 上，而不是别的服务上有、api 空着
//（原全文正则正是被这种错位满足的）。
for (const [serviceId, service] of Object.entries(compose.services ?? {})) {
  if (serviceId === "api") continue;
  const env = service?.environment;
  if (!env) continue;
  for (const name of REQUIRED_ON_API) {
    assert.equal(
      env[name],
      undefined,
      `${name} 只应出现在 api 服务上；出现在 ${serviceId} 会让全文正则误判 api 已配置`,
    );
  }
}

const envExample = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
// .env.example 与 compose 的必填插值必须【形状相反】：compose 用 ${VAR:?} 缺参即中止，
// 示例文件里就必须是那一行空值（`VAR=`），照抄的人才会被 compose 当场拦下。
//
// 这条判点是本轮反转过来的：原来它写的是 `^APP_AES_SECRET=<PLACEHOLDER>$`——
// 也就是【强制】示例里放一个非空占位。非空占位恰好绕过了 `${VAR:?}`
// （:? 只在"未设置或为空"时中止），于是照抄 .env.example 的运营会顺利通过校验，
// 让一次性 migrate 服务先把这个垃圾 BCrypt 写进 users.password 行；
// 等 AdminPasswordValidator 之后拒绝启动时，那一行已经提交、撤不回来。
// 一扇门把缺陷钉成了规范，这就是"门要判形状而不是判印象"的实证。
const composeAlertingText = readFileSync(
  new URL("../docker-compose.alerting.yml", import.meta.url),
  "utf8",
);
const exampleLines = new Set(envExample.split(/\r?\n/u));
const requiredByCompose = new Set();
for (const text of [composeText, composeAlertingText]) {
  for (const line of text.split(/\r?\n/u)) {
    if (/^\s*#/u.test(line)) continue; // 注释里谈 ${VAR:?} 不算真要求某个变量
    for (const m of line.matchAll(/\$\{([A-Z0-9_]+):?\?/gu)) requiredByCompose.add(m[1]);
  }
}
assert.ok(
  requiredByCompose.size >= 8,
  `compose 侧的必填插值应至少 8 个（当前 ${requiredByCompose.size}）——变少说明 fail-fast 被改成弱默认，那比缺文件更糟`,
);
const badExample = [...requiredByCompose]
  .sort()
  .filter((name) => !exampleLines.has(`${name}=`));
assert.deepEqual(
  badExample,
  [],
  `这些变量 compose 要求必填（:?），但 .env.example 不是一行空值，照抄即可混过校验：` +
    `\n${badExample.map((n) => `  ${n} → 当前为 ${JSON.stringify([...exampleLines].find((l) => l.startsWith(`${n}=`)) ?? "(缺行)")}`).join("\n")}\n` +
    "正确形状是 `NAME=`（空），让 compose 在缺参时中止。",
);

assert.match(
  envExample,
  /^IMAGE_PREFIX=/mu,
  ".env.example must document IMAGE_PREFIX (single source for compose/CI/docs)",
);

// 镜像命名单一来源：compose、CI metadata、部署文档不得再各自写死一套。
for (const [serviceId, suffix] of [["api", "/api"], ["admin", "/admin"]]) {
  const image = compose.services?.[serviceId]?.image;
  assert.ok(
    typeof image === "string" && image.startsWith("${IMAGE_PREFIX"),
    `services.${serviceId}.image 必须以 \${IMAGE_PREFIX…} 开头（当前: ${image}）`,
  );
  assert.match(
    image,
    new RegExp(`\\$\\{IMAGE_PREFIX[^}]*\\}${suffix}:`, "u"),
    `services.${serviceId}.image 必须由 IMAGE_PREFIX 派生 ${suffix}`,
  );
}

const deploymentDoc = readFileSync(
  new URL("../doc/DEPLOYMENT.md", import.meta.url),
  "utf8",
);
assert.match(
  deploymentDoc,
  /\$\{IMAGE_PREFIX:-campus-love\}\/api:/u,
  "DEPLOYMENT 镜像表必须使用 IMAGE_PREFIX 派生 api 镜像",
);
assert.match(
  deploymentDoc,
  /\$\{IMAGE_PREFIX:-campus-love\}\/admin:/u,
  "DEPLOYMENT 镜像表必须使用 IMAGE_PREFIX 派生 admin 镜像",
);
assert.match(
  deploymentDoc,
  /\$IMAGE_PREFIX\/api:/u,
  "DEPLOYMENT 的 cosign 示例必须使用 IMAGE_PREFIX",
);
assert.doesNotMatch(
  deploymentDoc,
  /campus-love-api:\$TAG|campus-love-admin:\$TAG/u,
  "DEPLOYMENT 不得再出现第三套镜像名（campus-love-api:$TAG / campus-love-admin:$TAG）",
);

const ciWorkflow = YAML.parse(
  readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
);
const securityScan = ciWorkflow.jobs?.["security-scan"];
assert.ok(securityScan, "CI 必须保留 security-scan job");
assert.match(
  String(securityScan.env?.IMAGE_PREFIX ?? ""),
  /vars\.IMAGE_PREFIX|github\.repository/u,
  "security-scan 必须从 vars.IMAGE_PREFIX / github.repository 派生 IMAGE_PREFIX",
);
const metaImages = (securityScan.steps ?? [])
  .filter((step) => String(step.uses ?? "").startsWith("docker/metadata-action"))
  .map((step) => String(step.with?.images ?? ""));
assert.deepEqual(
  metaImages.sort(),
  ["${{ env.IMAGE_PREFIX }}/admin", "${{ env.IMAGE_PREFIX }}/api"].sort(),
  "metadata-action 的镜像名必须统一由 env.IMAGE_PREFIX 派生",
);

/* ── C. 文档里写给运维的 compose 命令，变量必须是 compose 真读的（2026-10-31）────
 * 原判例：DEPLOYMENT 的升级段写 `export TAG_NEW=ci-abc1234` + `docker compose pull api`，
 * 回滚段写 `export TAG_ROLLBACK=…`，但 docker-compose.yml 只插值 `TAG`（api/admin 两处）。
 * 于是这两条命令名义上在升/回滚，实际作用在 `campus-love/api:dev` 上——命令"成功"，
 * 版本没变。这类缺陷不看 daemon 也能钉死：把文档 bash 代码块里"会喂给 compose 的变量名"
 * 抽出来，逐个要求它出现在 compose 的插值集合里。
 */
const interpolatedVars = new Set();
for (const text of [composeText, composeAlertingText]) {
  for (const line of text.split(/\r?\n/u)) {
    if (/^\s*#/u.test(line)) continue;
    for (const m of line.matchAll(/\$\{([A-Z][A-Z0-9_]*)/gu)) interpolatedVars.add(m[1]);
    for (const m of line.matchAll(/\$([A-Z][A-Z0-9_]{2,})/gu)) interpolatedVars.add(m[1]);
  }
}
assert.ok(
  interpolatedVars.has("TAG") && interpolatedVars.has("IMAGE_PREFIX"),
  "compose 插值集合解析失效（TAG/IMAGE_PREFIX 至少要在）",
);

/** 只取 ```bash 围栏里的可执行行；`#` 开头的注释行不参与判定（本轮文档要留下
 *  "原写法是错的"这种反面引用，注释里的 TAG_NEW 不该把门判红）。 */
function bashBlocks(markdownText) {
  const blocks = [];
  let current = null;
  for (const raw of markdownText.split(/\r?\n/u)) {
    const line = raw.trim();
    if (/^```/u.test(line)) {
      if (current) {
        blocks.push(current);
        current = null;
      } else {
        current = [];
      }
      continue;
    }
    if (!current) continue;
    if (/^#/u.test(line)) continue; // bash 注释行
    if (!line) continue;
    current.push(line);
  }
  if (current) blocks.push(current);
  return blocks;
}

const executableBashLines = (text) => bashBlocks(text).flat();

/** 返回"文档命令用到、但 compose 从不插值"的变量名。
 * 只判**含 `docker compose` 的代码块**：同一段里 export 的变量就是要交给 compose 的，
 * 而"直接 JVM 启动"那种非容器段落（export DB_URL=…）不归 compose 管，不能误伤。 */
// 这些是"进容器的环境变量名"（compose 里用 $$ 透传），不是 compose 插值变量：
// `docker compose exec … sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql …'` 是合规写法。
const CONTAINER_ENV_NAMES = new Set(["MYSQL_PWD", "REDISCLI_AUTH", "TZ", "PATH", "HOME", "TMPDIR", "LANG", "SHELL"]);
function unknownComposeVars(text) {
  const bad = [];
  for (const block of bashBlocks(text)) {
    if (!block.some((line) => /\bdocker compose\b/u.test(line))) continue;
    for (const line of block) {
      const names = [];
      for (const m of line.matchAll(/\bexport\s+([A-Z][A-Z0-9_]{2,})=/gu)) names.push(m[1]);
      if (/\bdocker compose\b/u.test(line)) {
        for (const m of line.matchAll(/(?:^|\s)([A-Z][A-Z0-9_]{2,})=[^\s]*/gu)) {
          const before = line.slice(0, m.index);
          if (/(?:-e|--env|-E)\s*$/u.test(before)) continue; // 容器内变量，不是 compose 插值
          names.push(m[1]);
        }
      }
      for (const name of names) {
        if (CONTAINER_ENV_NAMES.has(name)) continue;
        if (!interpolatedVars.has(name) && !bad.includes(name)) bad.push(name);
      }
    }
  }
  return bad;
}

const runbooksDoc = readFileSync(new URL("../doc/RUNBOOKS.md", import.meta.url), "utf8");
const docBadVars = [...unknownComposeVars(deploymentDoc), ...unknownComposeVars(runbooksDoc)];
assert.deepEqual(
  docBadVars,
  [],
  `DEPLOYMENT/RUNBOOKS 的 compose 命令用了 compose 从不插值的变量（改了等于没改，命令还会"成功"）：` +
    `${docBadVars.join(", ")}。compose 只认 docker-compose.yml 里 \${…} 出现过的名字（标签只有 TAG）。`,
);
// 自测：老写法必须被判红、合法写法与非 compose 段落必须放过——否则 C 段是空判点。
assert.deepEqual(
  unknownComposeVars("```bash\nexport TAG_NEW=ci-abc1234\ndocker compose pull api\n```"),
  ["TAG_NEW"],
  "自测失败：export TAG_NEW（compose 不读的变量）没被抓到 ⇒ C 段形同虚设",
);
assert.deepEqual(
  unknownComposeVars("```bash\nexport TAG=ci-abc1234\ndocker compose pull api\n```"),
  [],
  "自测失败：合法写法 TAG 被误判 ⇒ 判据太宽",
);
assert.deepEqual(
  unknownComposeVars("```bash\nexport DB_URL=jdbc:mysql://h/db\njava -jar app.jar\n```"),
  [],
  "自测失败：与 compose 无关的代码块（非容器部署）被误判 ⇒ 会误伤合法文档",
);
assert.deepEqual(
  unknownComposeVars(
    "```bash\ndocker compose exec -T -e MYSQL_PWD=\"${MYSQL_ROOT_PASSWORD}\" mysql sh -c 'mysql -uroot db'\n```",
  ),
  [],
  "自测失败：`-e NAME=` 形式的容器内变量被误当成 compose 插值变量",
);

/* ── D. .env.example 同一个键不得定义两次（BACKUP_RETENTION_DAYS 曾有两行）────── */
const dupKeys = [];
const seenKeys = new Set();
for (const line of envExample.split(/\r?\n/u)) {
  const m = /^\s*([A-Z][A-Z0-9_]*)\s*=/u.exec(line);
  if (!m) continue;
  if (seenKeys.has(m[1]) && !dupKeys.includes(m[1])) dupKeys.push(m[1]);
  seenKeys.add(m[1]);
}
assert.deepEqual(
  dupKeys,
  [],
  `.env.example 里同一个变量定义了两次，后者静默覆盖前者（运维读到的值和生效的值可以不同）：${dupKeys.join(", ")}`,
);

/* ── E. 服务表的镜像字面量必须等于 compose 的 pin（8.0 vs 8.0.39 不是同一个东西）── */
for (const [serviceId, service] of Object.entries(compose.services ?? {})) {
  const image = service?.image;
  if (typeof image !== "string" || image.includes("${")) continue; // 派生名由上面 IMAGE_PREFIX 段管
  const quoted = `\`${image}\``;
  assert.ok(
    deploymentDoc.includes(quoted),
    `compose 里 services.${serviceId} 的镜像是 ${image}，但 DEPLOYMENT 服务表没有这个字面量` +
      `（写成浮动 tag 会让文档与编排跑在不同镜像上，回滚也没有确定的目标）`,
  );
}

/* ── F. 恢复：有脚本、有引用，且不得再用"口令进进程参数"的旧写法 ───────────── */
assert.ok(
  existsSync(new URL("../scripts/restore-mysql.sh", import.meta.url)),
  "scripts/restore-mysql.sh 必须存在（此前全仓没有任何恢复代码，只有手抄命令）",
);
for (const [file, text] of [
  ["doc/DEPLOYMENT.md", deploymentDoc],
  ["doc/RUNBOOKS.md", readFileSync(new URL("../doc/RUNBOOKS.md", import.meta.url), "utf8")],
]) {
  assert.match(
    text,
    /scripts\/restore-mysql\.sh/u,
    `${file} 必须把恢复步骤指到 scripts/restore-mysql.sh（演练要可执行，不是描述）`,
  );
  // 只判 bash 围栏里的**可执行行**：正文里"旧写法是错的"这类反面引用必须允许存在
  const executable = executableBashLines(text).join("\n");
  assert.doesNotMatch(
    executable,
    /-p"\$MYSQL_ROOT_PASSWORD"|-p \$\{MYSQL_ROOT_PASSWORD\}|-a "\$REDIS_PASSWORD"|-a \$REDIS_PASSWORD/u,
    `${file} 的可执行命令里不得再把口令写进进程参数（本仓规矩见 compose 的 MYSQL_PWD/REDISCLI_AUTH 注释）`,
  );
  assert.doesNotMatch(
    executable,
    /binlogs\/mysql-bin\.[0-9<][^.]*/u,
    `${file} 的可执行命令里，传给 mysqlbinlog 的归档路径必须带 .gz/.gz.enc 后缀（裸文件名不存在，命令必然失败）`,
  );
}
// compose 必须把口令挡在进程参数外：这两处写法是本文件判定"文档合规"的依据，先自证
assert.match(
  composeText,
  /MYSQL_PWD=\\?"\$\$MYSQL_ROOT_PASSWORD\\?"/u,
  "compose 的 mysql healthcheck 必须用 MYSQL_PWD 传口令（文档据此禁止 -p 明文）",
);

/* ── G. flyway 载具的三处表述必须说的是同一件事（2026-11-01，W3 item 4/5）──────────
 * 原判例：docker-compose.yml 文件头（:45-48）写"apps/api/pom.xml 第四轮起也声明了
 * flyway-maven-plugin，两条载具都在"，而同文件的 migrate 段（:218-220）写"pom 并无
 * flyway-maven-plugin——所以不能用 ./mvnw flyway:migrate"。同一份文件里对同一个事实
 * 说相反的话，运维按哪一段做都是五五开。pom 里那个插件自 2026-10-30 就在，所以
 * 否认的那段是错的一方。
 * 判点不钉字面句子（等价改写不该判红），钉的是三件可判的事：
 *   ① apps/api/pom.xml 确实声明了 flyway-maven-plugin（事实锚）；
 *   ② compose 与 DEPLOYMENT 里任何谈到该插件/mvnw 的行都不得【否认】它存在或可用性；
 *   ③ 谈到的位置至少两处（头注 + migrate 段），防止有人把其中一段整段删掉后
 *      "少说话"变成"不矛盾"。
 */
const pomText = readFileSync(new URL("../apps/api/pom.xml", import.meta.url), "utf8");
const pomDeclaresPlugin = /<artifactId>\s*flyway-maven-plugin\s*<\/artifactId>/u.test(pomText);
assert.ok(
  pomDeclaresPlugin,
  "apps/api/pom.xml 必须声明 flyway-maven-plugin（compose 头注与 DEPLOYMENT 都以它为前提；"
  + "真要摘掉这个插件，必须同批改写 docker-compose.yml 头注、migrate 段与 doc/DEPLOYMENT.md 三处）",
);
// "否认存在/否认可用"的说法集合：注释里出现即判红（等价改写只要不含这些词就不受影响）
const FLYWAY_DENIALS = [
  /并无\s*flyway-maven-plugin/u,
  /没有\s*flyway-maven-plugin/u,
  /从未声明.{0,12}flyway/u,
  /不含\s*flyway-maven-plugin/u,
  /不能用\s*\.\/?mvnw\s+flyway/u,
  /无法使用\s*\.\/?mvnw\s+flyway/u,
  /No plugin found for prefix 'flyway'/u, // 只允许出现在"历史上踩过"的过去时语境，见下方豁免
];
function flywayDenialLines(text, file) {
  const hits = [];
  const lines = text.split(/\r?\n/u);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/flyway-maven-plugin|mvnw\s+flyway|flyway:info|flyway:migrate|flyway:repair/u.test(line)) continue;
    // 过去时豁免：明确标注"此前/原/旧/历史上/此前文档"的否定句是在讲缺陷史，不是在对现状说话
    if (/此前|原先|原写法|旧文档|历史上|曾经|当时|本轮修掉|已改|已更正/u.test(line)) continue;
    // 相邻 3 行内有过去时标记也算历史叙述（与 compose 里"此前本段写的是…"的写法对齐）
    const near = lines.slice(Math.max(0, i - 3), i + 4).join("\n");
    if (/此前本段写的是|旧写法|原状态|已更正/u.test(near) && !/^\s*(command|entrypoint):/u.test(line)) {
      if (FLYWAY_DENIALS.some((re) => re.test(line))) continue;
    }
    for (const re of FLYWAY_DENIALS) if (re.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
  }
  return hits;
}
const flywayDenialsFound = [
  ...flywayDenialLines(composeText, "docker-compose.yml"),
  ...flywayDenialLines(deploymentDoc, "doc/DEPLOYMENT.md"),
];
assert.deepEqual(
  flywayDenialsFound,
  [],
  `pom 里明明声明了 flyway-maven-plugin，以下位置仍在否认它（同一事实两处说反话，`
  + `运维按哪一段做都是五五开）：\n  ${flywayDenialsFound.join("\n  ")}`,
);
const flywayAffirmations = [
  ["docker-compose.yml", composeText],
  ["doc/DEPLOYMENT.md", deploymentDoc],
].filter(([, text]) => /flyway-maven-plugin/u.test(text)).length;
assert.ok(
  flywayAffirmations >= 2,
  `谈 flyway-maven-plugin 的位置从 ${flywayAffirmations} 处缩到不足 2 处：`
  + "删掉一段会让「头注 ↔ migrate 段 ↔ DEPLOYMENT」的三方对账失去比对对象（少说话不等于不矛盾）",
);
// —— pom 自己的注释也在说反话（W3 item 5）：apps/** 属后端车道，本车道不动那个文件，
//    改成【只允许收缩的在途基线】：命中项必须在基线里点名，基线上限 2 处；
//    主控落地 pom 注释后，把对应基线项删掉——删空之后这里就是纯防回归轴。
// 2026-11-01 主控收口：两处都改齐了（:232 那句现在时态的「从未声明」已标成「补之前的状态」，
// :236 那句「版本交给 parent 依赖管理」改成「本 plugin 块显式钉 ${flyway.version}」，
// 与 :241-247 那段不再互相打脸）⇒ 基线按纪律清空，下面只剩「再有说反话的注释就红」这一条作用。
const POM_STALE_BASELINE = [];
assert.ok(
  POM_STALE_BASELINE.length === 0,
  `pom 陈旧注释基线又被填回 ${POM_STALE_BASELINE.length} 处：这两条已经修完，`
  + "要留反话就改判据，不许用基线把它登记成合规",
);
const pomStaleHits = POM_STALE_BASELINE.filter((frag) => pomText.includes(frag));
const pomStaleOutside = flywayDenialLines(pomText, "apps/api/pom.xml")
  .filter((hit) => !POM_STALE_BASELINE.some((frag) => hit.includes(frag)));
assert.deepEqual(
  pomStaleOutside,
  [],
  `apps/api/pom.xml 出现【基线之外】的 flyway 否认式表述（基线只允许收缩）：\n  ${pomStaleOutside.join("\n  ")}`,
);
if (pomStaleHits.length === 0 && POM_STALE_BASELINE.length > 0) {
  throw new Error(
    "apps/api/pom.xml 的 flyway 注释已改对，但本文件的 POM_STALE_BASELINE 还留着 2 项 ⇒ 请同步清空基线，"
    + "否则这条判点会永远对着空集合绿着（本仓踩过四次的「空判点」事故类型）",
  );
}

/* ── H. 文档里的恢复命令必须给【成对且脚本认得的】凭据（2026-11-01，W3 item 1）────
 * 原判例：DEPLOYMENT/RUNBOOKS 三处写
 *   set -a; . ./.env; set +a
 *   MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}" scripts/restore-mysql.sh --artifact …
 * 而脚本原第 52 行是 `MYSQL_USER="${MYSQL_USER:-root}"`：source .env 之后
 * MYSQL_USER=campus（.env.example:79 的业务账号）已经进了环境，于是这条命令实际拿
 * campus 去配 root 的口令 ⇒ 认证必然失败；不 source 时又静默用 root。
 * 同一条演练命令在两种环境下错得不一样——这就是"少覆盖一个变量"的代价。
 * 现在脚本按配对取凭据（RESTORE_MYSQL_USER+RESTORE_MYSQL_PASSWORD 或
 * MYSQL_ROOT_PASSWORD⇒root），本节把文档钉回这条口径。
 */
const restoreScript = readFileSync(new URL("../scripts/restore-mysql.sh", import.meta.url), "utf8");
/** 脚本里真实引用过的环境变量名（`NAME` 出现在 `${NAME...}` 或赋值左侧即算"认得"）。 */
const scriptKnownVars = new Set(
  [...restoreScript.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/gu)].map((m) => m[1]),
);
/** 脚本 case 分支里接受的长选项。 */
const scriptOptions = new Set(
  [...restoreScript.matchAll(/^[ \t]*(--[a-z][a-z0-9-]*)\)/gmu)].map((m) => m[1]),
);
assert.ok(
  scriptOptions.has("--artifact") && scriptOptions.size >= 6,
  `restore-mysql.sh 的选项解析只抓到 ${scriptOptions.size} 个（--artifact 必须在内），本节判据会失效`,
);
// 脚本自己的配对要求（本节据此判文档；两处口径必须一致）
assert.match(restoreScript, /RESTORE_MYSQL_USER.*RESTORE_MYSQL_PASSWORD/us,
  "restore-mysql.sh 必须保留 RESTORE_MYSQL_USER + RESTORE_MYSQL_PASSWORD 配对");
assert.match(restoreScript, /MYSQL_ROOT_PASSWORD/u,
  "restore-mysql.sh 必须保留 MYSQL_ROOT_PASSWORD 配对档");

/** 把 bash 代码块里以 `\` 续行的命令接成一行（凭据前缀与命令本体常分在两行）。 */
function joinedCommands(text) {
  const out = [];
  for (const block of bashBlocks(text)) {
    let buf = "";
    for (const line of block) {
      if (/\\$/u.test(line)) buf += line.replace(/\\$/u, " ");
      else { out.push((buf + line).trim()); buf = ""; }
    }
    if (buf) out.push(buf.trim());
  }
  return out;
}

/** 文档 → 脚本的参数对账：返回问题清单。 */
function restoreInvocationIssues(text, file) {
  const issues = [];
  let checked = 0;
  for (const cmd of joinedCommands(text)) {
    if (!/restore-mysql\.sh/u.test(cmd)) continue;
    checked += 1;
    // 命令前的 NAME=value 前缀（含 `export NAME=` 同行）
    const prefix = cmd.slice(0, cmd.indexOf("restore-mysql.sh"));
    const assigns = [...prefix.matchAll(/([A-Z][A-Z0-9_]{2,})=(\S*)/gu)].map((m) => m[1]);
    for (const name of assigns) {
      if (!scriptKnownVars.has(name)) {
        issues.push(`${file}: 恢复命令设了 ${name}，但 scripts/restore-mysql.sh 从不读它（写了等于没写）`);
      }
    }
    // 缺陷本体：用业务账号变量给恢复传凭据
    for (const trap of ["MYSQL_PASSWORD", "MYSQL_USER", "DB_PASSWORD", "DB_USERNAME"]) {
      if (assigns.includes(trap)) {
        issues.push(
          `${file}: 恢复命令覆盖了 ${trap} —— 那是 .env 里的业务账号（campus）一侧的变量，`
          + "与 MYSQL_ROOT_PASSWORD 配对不上；旧写法正是「认证必然失败」的成因。"
          + "改用 RESTORE_MYSQL_USER+RESTORE_MYSQL_PASSWORD 成对给，或直接靠 MYSQL_ROOT_PASSWORD（账号缺省 root）",
        );
      }
    }
    for (const m of cmd.matchAll(/(--[a-z][a-z0-9-]*)/gu)) {
      if (!scriptOptions.has(m[1])) {
        issues.push(`${file}: 恢复命令传了 ${m[1]}，但脚本的 case 分支里没有这个选项（会 die "未知参数"）`);
      }
    }
  }
  return { issues, checked };
}

const restoreScan = [
  restoreInvocationIssues(deploymentDoc, "doc/DEPLOYMENT.md"),
  restoreInvocationIssues(runbooksDoc, "doc/RUNBOOKS.md"),
];
const restoreIssues = restoreScan.flatMap((r) => r.issues);
const restoreInvocations = restoreScan.reduce((n, r) => n + r.checked, 0);
assert.ok(
  restoreInvocations >= 4,
  `只在文档里找到 ${restoreInvocations} 处 restore-mysql.sh 调用（<4），本节可能在空集合上假绿`,
);
assert.deepEqual(
  restoreIssues,
  [],
  `文档里的恢复命令与 scripts/restore-mysql.sh 实际接受的参数不一致：\n  ${restoreIssues.join("\n  ")}`,
);
// 自测：三种形态都必须被抓到，且现写法必须放过——否则 H 段是空判点
const hSelfTest = restoreInvocationIssues(
  "```bash\nMYSQL_PASSWORD=\"${MYSQL_ROOT_PASSWORD}\" scripts/restore-mysql.sh --artifact ./x.sql.gz\n```",
  "fixture",
).issues;
assert.ok(
  hSelfTest.some((s) => /MYSQL_PASSWORD 覆盖了|覆盖了 MYSQL_PASSWORD/u.test(s)),
  `自测失败：旧写法（只覆盖 MYSQL_PASSWORD）没被判红 ⇒ H 段形同虚设（实际返回 ${JSON.stringify(hSelfTest)}）`,
);
assert.ok(
  restoreInvocationIssues(
    "```bash\nRESTORE_MYSQL_PASSPHRASE=x scripts/restore-mysql.sh --artifact ./x.sql.gz\n```",
    "fixture",
  ).issues.length === 1,
  "自测失败：脚本不认识的变量名没被抓到 ⇒ 文档↔脚本参数对账失效",
);
assert.ok(
  restoreInvocationIssues(
    "```bash\nscripts/restore-mysql.sh --artifact ./x.sql.gz --skip-verify\n```",
    "fixture",
  ).issues.some((s) => s.includes("--skip-verify")),
  "自测失败：文档传了脚本没有的长选项没被抓到",
);
assert.deepEqual(
  restoreInvocationIssues("```bash\nscripts/restore-mysql.sh --artifact ./x.sql.gz --apply\n```", "fixture").issues,
  [],
  "自测失败：合法写法（零覆盖，靠 .env 的 MYSQL_ROOT_PASSWORD 配对）被误判",
);

/* ── I. `compose run <service> <命令>` 不得绕过安装段（2026-11-01，W3 item 2）──────
 * run 的语义是【替换 service 的 command】，entrypoint 保持不动。所以"给一个不带 bash
 * 的镜像装上 bash"这类必做的准备动作如果住在 command 里，文档里那条
 * `compose run --rm backup /backup.sh` 就会每次跳过它（本仓的实际情况：/backup.sh 的
 * shebang 需要 bash ⇒ not found，手动备份从未跑通）。
 * 两条判点：
 *   ① 结构轴（与文档无关）：任何服务的 command 里都不许住"安装/建账号/改属主"这类
 *      前置动作——要么没有，要么住在 entrypoint；
 *   ② 文档轴：文档里每条 `compose run <svc> <args>` 指向的服务必须有 entrypoint，
 *      或它的 command 里确实没有前置动作。
 */
const SETUP_VERBS = /\b(apk add|apt-get install|adduser|chown|chmod|crontab|mkdir -p)\b/u;
const services = compose.services ?? {};
const bypassProne = [];
for (const [id, svc] of Object.entries(services)) {
  const cmdText = Array.isArray(svc?.command) ? svc.command.join(" ") : String(svc?.command ?? "");
  if (!cmdText) continue;
  if (SETUP_VERBS.test(cmdText) && !svc?.entrypoint) {
    bypassProne.push(`services.${id}.command 里含前置安装动作，而该服务没有 entrypoint ⇒ 会被 compose run 替换掉`);
  }
}
assert.deepEqual(bypassProne, [], `compose 的 command 被当成了安装脚本用：\n  ${bypassProne.join("\n  ")}`);
// backup 服务必须是"有 entrypoint + command 里不再干活"的形状（本轮修复的交付形状）
{
  const backup = services.backup;
  assert.ok(backup, "docker-compose.yml 必须保留 backup 服务");
  const entry = Array.isArray(backup.entrypoint) ? backup.entrypoint.join(" ") : String(backup.entrypoint ?? "");
  assert.ok(entry.length > 0, "backup 服务必须定义 entrypoint：安装段只有住在 entrypoint 里才不受 `compose run` 参数影响");
  const backupCmd = Array.isArray(backup.command) ? backup.command.join(" ") : String(backup.command ?? "");
  assert.doesNotMatch(
    backupCmd,
    SETUP_VERBS,
    "backup 服务的 command 里不得再有 apk add/adduser/chown —— run 会替换 command，这正是文档命令跑不通的原形",
  );
  // 从 volumes 里找"宿主脚本 → 容器路径"这条挂载，再要求 entrypoint 引用的正是容器路径
  const epMount = (backup.volumes ?? [])
    .map((v) => /^(\.[\w./-]*entrypoint\.sh):([^:]+)(?::ro)?$/.exec(String(v).trim()))
    .find(Boolean);
  assert.ok(
    epMount,
    "backup.volumes 必须把 entrypoint 脚本挂进容器（形如 ./docker/backup/entrypoint.sh:/backup-entrypoint.sh:ro）",
  );
  const [, epHostPath, epContainerPath] = epMount;
  assert.ok(
    entry.includes(epContainerPath),
    `backup.entrypoint 必须引用挂载进来的容器路径 ${epContainerPath}（当前：${entry}）`,
  );
  assert.ok(
    existsSync(new URL(`../${epHostPath.replace(/^\.\//u, "")}`, import.meta.url)),
    `backup.entrypoint 指向的宿主脚本不存在：${epHostPath}`,
  );
  const ep = readFileSync(new URL(`../${epHostPath.replace(/^\.\//u, "")}`, import.meta.url), "utf8");
  assert.match(ep, /apk add[^\n]*\bbash\b/u, "entrypoint 必须装 bash：/backup.sh 的 shebang 是 #!/usr/bin/env bash");
  assert.match(ep, /exec[^\n]*\$@|CMD/u, "entrypoint 必须把 run 传进来的参数移交执行（否则 run 等于白跑）");
}
// 文档轴：每条 compose run 的目标服务都要经得起"command 被替换"
const docRunBypass = [];
for (const [file, text] of [["doc/DEPLOYMENT.md", deploymentDoc], ["doc/RUNBOOKS.md", runbooksDoc]]) {
  for (const cmd of joinedCommands(text)) {
    const m = /\bdocker compose\b[^\n]*?\brun\b[^\n]*?\s([a-z][a-z0-9_-]*)\s+(\S+)/u.exec(cmd);
    if (!m) continue;
    const [, svcId] = m;
    const svc = services[svcId];
    if (!svc) { docRunBypass.push(`${file}: \`compose run ${svcId} …\` 指向的服务在 docker-compose.yml 里不存在`); continue; }
    if (svc.entrypoint) continue;
    const cmdText = Array.isArray(svc.command) ? svc.command.join(" ") : String(svc.command ?? "");
    if (SETUP_VERBS.test(cmdText)) {
      docRunBypass.push(
        `${file}: \`compose run ${svcId} ${m[2]}\` 会替换 ${svcId} 的 command，`
        + "而该服务的安装/前置动作就写在 command 里 ⇒ run 把它整个跳过（把它搬进 entrypoint）",
      );
    }
  }
}
assert.deepEqual(docRunBypass, [], `文档里的 compose run 命令会绕开必做的安装段：\n  ${docRunBypass.join("\n  ")}`);
assert.ok(
  joinedCommands(deploymentDoc).filter((c) => /\bdocker compose\b.*\brun\b/u.test(c)).length >= 3,
  "文档里的 compose run 命令少于 3 条，I 段的文档轴可能在空集合上假绿",
);
// 自测：把安装段塞回 command（HEAD 的真实形态）必须判红
{
  const fakeCompose = {
    services: {
      foo: { command: "/bin/sh -c \"apk add --no-cache bash && exec crond\"", image: "alpine" },
    },
  };
  const hits = [];
  for (const [id, svc] of Object.entries(fakeCompose.services)) {
    const cmdText = String(svc.command);
    if (SETUP_VERBS.test(cmdText) && !svc.entrypoint) hits.push(id);
  }
  assert.deepEqual(hits, ["foo"], "自测失败：command 里住安装动作且无 entrypoint 的形态没被抓到 ⇒ I 段①形同虚设");
  assert.ok(
    /run --rm backup/u.test(deploymentDoc) && /run[^\n]*backup[^\n]*\/backup\.sh/u.test(deploymentDoc),
    "自测前提失效：文档里已经没有 `run … backup /backup.sh` 这条命令，I 段的文档轴不再对着真实形状判",
  );
}

/* ── J. 脚本真实读取的【可调变量】必须在文档变量表里登记（2026-11-01，W3b item 8 余行）──
 * 审计 F 表里两行「△ 缺口」：restore-mysql.sh 读的 RESTORE_BIN / RESTORE_MYSQLBINLOG_BIN /
 * RESTORE_ALLOW_MARIADB_BINLOG / BACKUP_LIVE_SCHEMA 只在脚本头注释里出现过，
 * 而文档的变量表自称"与 .env.example 对齐"；另一行是"文档没把『宿主要有 mysql/
 * mysqlbinlog/openssl 二进制』列为前置"，而脚本在 dry-run 阶段就 `command -v` 硬检查
 * ⇒ 照文档在一台只有 Docker 的机器上第一步就 die。
 * 判点刻意不去"从 bash 里推断哪些是外部输入"（局部变量太多，误判率高），
 * 而是钉一张**显式清单**：清单里每一项都必须在文档表格里出现。
 * 新增一个外部变量 ⇒ 必须同批登记到文档，否则红；删一个 ⇒ 同时删清单里那行。
 * 这样"少说话"不能让它变绿（清单不缩就不放行），而等价改写文档措辞不受影响。
 */
const SCRIPT_INPUT_VARS = [
  "RESTORE_BIN",
  "RESTORE_MYSQLBINLOG_BIN",
  "RESTORE_ALLOW_MARIADB_BINLOG",
  "BACKUP_LIVE_SCHEMA",
  "RESTORE_MYSQL_USER",
  "RESTORE_MYSQL_PASSWORD",
  "MYSQL_ROOT_USER",
  "BACKUP_ENCRYPTION_KEY",
  "BACKUP_TEXTFILE_DIR",
  "BACKUP_MYSQLDUMP_BIN",
];
const docEnvTable = deploymentDoc;
/** 文档变量表里某一行的"第一格"是否提到该变量名（第一格 = 行首 `|` 到下一个 `|` 之间）。 */
const tableRowNamesVar = (v) => new RegExp("^[ \\t]*\\|[^|\\n]*\\b" + v + "\\b", "mu").test(docEnvTable);
const unregistered = SCRIPT_INPUT_VARS.filter((v) => !tableRowNamesVar(v));
assert.deepEqual(unregistered, [],
  `脚本读取的外部变量没有登记进 doc/DEPLOYMENT.md 的变量表：${unregistered.join(", ")}`
  + `（表自称与 .env.example 对齐；这些键只在脚本注释里出现过，等于运维查不到）`);
// 反向：文档表里登记的这些变量必须真的被脚本读（写了没人读 = 死文档，本仓同类事故已三次）
const scriptTextForVars = restoreScript + readFileSync(new URL("../scripts/backup-mysql.sh", import.meta.url), "utf8");
const deadDocVars = SCRIPT_INPUT_VARS.filter(
  (v) => !new RegExp("\\$\\{?" + v + "\\b", "u").test(scriptTextForVars),
);
assert.deepEqual(deadDocVars, [],
  `文档变量表里这些键在两个脚本里一个字都没读：${deadDocVars.join(", ")}`
  + " ⇒ 写了等于没写（要么脚本接上，要么文档删掉）");
// 「宿主必须有 mysql/mysqlbinlog 二进制」这条前置必须出现在文档里
// （脚本在 dry-run 之前就 `command -v "${RESTORE_BIN}"` 硬检查，不登记的话运维在现场第一步就 die）
assert.match(restoreScript, /command -v "\$\{RESTORE_BIN\}"/u,
  "前提校验：restore-mysql.sh 应当仍在启动阶段硬检查宿主 mysql 二进制存在性（本节以此为前提）。"
  + "它检查的是 `${RESTORE_BIN}` 而不是字面量 `mysql` —— 判点必须照被测物的真实写法来，"
  + "拿字面量去 grep 一个变量插值的检查，门就会对着一个不存在的前提绿");
assert.match(
  deploymentDoc,
  /恢复脚本的宿主前置/u,
  "doc/DEPLOYMENT.md 必须把『宿主要有 mysql/mysqlbinlog/openssl 二进制』列为恢复演练的前置"
  + "（第六轮审计 F 表的 △ 缺口行；只有脚本注释提到它 = 运维查不到）",
);
assert.match(
  deploymentDoc,
  /command -v[^\n]*RESTORE_BIN|mysql-community-client/u,
  "文档的前置段必须点名『脚本用 command -v 硬检查』或给出装什么包，"
  + "否则只是一句没有落点的提醒",
);

// 自测：清单里随便摘掉一个变量、文档就必须判红（否则 J 段对着"全都登记了"的表永远绿）
{
  const probe = "RESTORE_ALLOW_MARIADB_BINLOG";
  assert.ok(tableRowNamesVar(probe), `自测前提失效：文档表里找不到 ${probe} 那一行，J 段无样本可判`);
  const stripped = deploymentDoc
    .split(/\r?\n/u)
    .filter((l) => !/^[ \t]*\|[^|\n]*\bRESTORE_ALLOW_MARIADB_BINLOG\b/u.test(l))
    .join("\n");
  assert.ok(
    !new RegExp("^[ \\t]*\\|[^|\\n]*\\b" + probe + "\\b", "mu").test(stripped),
    "自测失败：把变量行从文档表里删掉后仍然判得出它登记过 ⇒ 检出器读的不是表格",
  );
  // 反向：脚本不读的键必须被"死文档"轴抓到
  assert.equal(
    new RegExp("\\$\\{?THIS_VAR_DOES_NOT_EXIST\\b", "u").test(scriptTextForVars),
    false,
    "自测失败：死文档轴的负样本居然是 true ⇒ 检出器把不存在的键也算『被读过』",
  );
  assert.ok(
    new RegExp("\\$\\{?" + probe + "\\b", "u").test(scriptTextForVars),
    `自测失败：脚本确实读 ${probe}，但死文档轴判不出"读过" ⇒ 那个轴是空的`,
  );
}

console.log(
  `deployment config contract ok（:? 必填 ${requiredByCompose.size} 个全部对应空值示例；`
  + `文档 compose 命令变量 ${interpolatedVars.size} 个可插值名对账通过；镜像字面量全部对齐 compose；`
  + `flyway 载具表述与 pom 一致（pom 陈旧注释基线已清空，此轴现为纯防回归：`
  + `命中 ${pomStaleHits.length}/${POM_STALE_BASELINE.length}）；`
  + `恢复命令 ${restoreInvocations} 处参数与脚本对账通过；`
  + `compose run 无绕过安装段的形态；`
  + `脚本外部变量 ${SCRIPT_INPUT_VARS.length} 个已登记进文档表且全部被脚本真读）`,
);
