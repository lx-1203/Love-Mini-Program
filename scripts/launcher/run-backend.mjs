/**
 * 后端启动包装器：读仓库根 .env → 注入进程环境 → 拉起 Spring Boot fat jar。
 *
 * 为什么不用 cmd 解析 .env：cmd 的 `for /f` 在本机会整行跳过
 * WEBSOCKET_ALLOWED_ORIGIN_PATTERNS（值是 http://localhost:*,http://127.0.0.1:*，
 * 含逗号与 *），导致 WebSocketConfig 的 real-profile origin fail-fast 直接崩启动。
 * 另外 cmd 批处理按 OEM 代码页(936)解析，任何非 ASCII 内容都会变成乱码指令。
 * 所以解析逻辑放在这里，.cmd 只负责调用 node。
 *
 * 用法：node scripts/launcher/run-backend.mjs [-- <额外 java 参数>]
 */
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const API_DIR = path.join(REPO_ROOT, "apps", "api");
const ENV_FILE = path.join(REPO_ROOT, ".env");
const JAR = path.join(API_DIR, "target", "campus-love-api-0.1.0.jar");
const LOG_DIR = path.join(REPO_ROOT, "logs");
const LOG_FILE = path.join(LOG_DIR, "backend-pp.log");

function fail(msg) {
  console.error(`[错误] ${msg}`);
  process.exit(1);
}

if (!existsSync(ENV_FILE)) fail(`未找到 ${ENV_FILE}，请参考 .env.example 填写`);
if (!existsSync(JAR)) fail(`未找到 ${JAR}，请先在 apps/api 执行 mvnw.cmd -DskipTests package`);

/**
 * .env 解析：忽略 # 注释与空行，只在第一个 = 处切分（值里可含 = 与 &），
 * 去掉包裹值的成对引号，不覆盖调用方已经显式设置的环境变量。
 */
function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && /^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const fileEnv = parseEnv(readFileSync(ENV_FILE, "latin1"));
const env = { ...process.env };
let applied = 0;
for (const [k, v] of Object.entries(fileEnv)) {
  if (env[k] === undefined) {
    env[k] = v;
    applied += 1;
  }
}
// 后台「发布内容」页归属的官方小编 users.id；未配置时该功能按设计返回 503。
if (!env.APP_ADMIN_COMPOSE_AUTHOR_USER_ID) env.APP_ADMIN_COMPOSE_AUTHOR_USER_ID = "0";

mkdirSync(LOG_DIR, { recursive: true });
const banner = `\n===== launcher ${new Date().toISOString()} (from ${Object.keys(fileEnv).length} keys, applied ${applied}) =====\n`;
appendFileSync(LOG_FILE, banner);

const args = [
  "-jar", JAR,
  "--spring.profiles.active=real",
  "--server.port=8080",
  // validate-on-migrate=false 保留：虽然实测 206 条 checksum 与磁盘一致，
  // 但三个 start-api 脚本历史上都带这个覆盖，先维持现网行为，开启校验单独验证。
  "--spring.flyway.validate-on-migrate=false",
  "--app.guest-login.enabled=true",
  ...process.argv.slice(2).filter((a, i) => i > 0 || a !== "--"),
];

console.log(`启动后端：java ${args.slice(0, 2).join(" ")} ... （日志 ${LOG_FILE}）`);
const logFd = openSync(LOG_FILE, "a");
const child = spawnSync("java", args, {
  cwd: API_DIR,
  env,
  stdio: ["ignore", logFd, logFd],
});
closeSync(logFd);
process.exit(child.status ?? 1);
