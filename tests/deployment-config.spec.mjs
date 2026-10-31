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

console.log(
  `deployment config contract ok（:? 必填 ${requiredByCompose.size} 个全部对应空值示例；`
  + `文档 compose 命令变量 ${interpolatedVars.size} 个可插值名对账通过；镜像字面量全部对齐 compose）`,
);
