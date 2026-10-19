/**
 * strip-mock-for-mp.mjs — 生产构建（mp-weixin real）前的 mock 数据与英文语言包桩化。
 *
 * 背景（2026-08-10 包体积优化）：
 * - mock 数据由运行时 useMock() 判定，Rollup 无法摇树，real 包中白白携带
 *   services/mocks/fixtures.ts(60K)、各 store 目录下的 mock-data.ts(20-40K) 等死代码；
 * - en-US 语言包 181KB 静态打包，中文应用生产包不需要英文文案
 *   （zh-CN 为 fallbackLocale，en 缺失 key 自动回退中文，无运行风险）。
 *
 * 机制：构建前备份 → 写桩（保留导出名、值置空）→ 运行构建 → finally 强制恢复。
 * 恢复后校验 git diff 不含桩文件内容，防止桩文件被提交。
 *
 * 用法：
 *   node scripts/strip-mock-for-mp.mjs "uni build --platform mp-weixin --mode real"
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src");

/** 需要桩化的文件（相对 src） */
const STUB_TARGETS = [
  "services/mocks/fixtures.ts",
  "stores/village/mock-data.ts",
  "stores/chat/mock-data.ts",
  "stores/campus/mock-data.ts",
  "stores/likes/mock-data.ts",
  "stores/messages/mock-data.ts",
  "stores/circle/mock-data.ts",
  "i18n/locales/en-US.ts",
];

const BACKUP_DIR = join(__dirname, ".strip-mock-backup");

/** 提取文件顶层导出的值名称（export const X / export function X / export default） */
function extractExportNames(source) {
  const names = [];
  const re = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  let m;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return names;
}

/** 生成桩文件内容（保留导出名，值置空） */
function buildStub(source) {
  const names = extractExportNames(source);
  const hasDefault = /\bexport\s+default\b/.test(source);
  const lines = [
    "/* AUTO-GENERATED STUB by strip-mock-for-mp.mjs — 生产构建临时桩化，构建后自动恢复，请勿提交 */",
  ];
  for (const name of names) {
    lines.push(`export const ${name} = null;`);
  }
  if (hasDefault) {
    lines.push("export default {};");
  }
  lines.push("");
  return lines.join("\n");
}

function backupAll() {
  rmSync(BACKUP_DIR, { recursive: true, force: true });
  mkdirSync(BACKUP_DIR, { recursive: true });
  for (const rel of STUB_TARGETS) {
    const file = join(SRC, rel);
    if (existsSync(file)) {
      const backup = join(BACKUP_DIR, rel.replaceAll("/", "__"));
      writeFileSync(backup, readFileSync(file, "utf-8"));
    }
  }
}

function stubAll() {
  for (const rel of STUB_TARGETS) {
    const file = join(SRC, rel);
    if (!existsSync(file)) continue;
    const stub = buildStub(readFileSync(file, "utf-8"));
    writeFileSync(file, stub, "utf-8");
    console.log(`[strip-mock] stubbed ${rel}`);
  }
}

function restoreAll() {
  /* 逐文件重试 + 回读校验，且**只有全部落定才删备份**（2026-10-19 实测事故改的）。
     原版一次瞬时失败就三件事同时坏：①for 循环里 writeFileSync 抛 ⇒ 后面 7 个文件根本没被还原，
     整棵 src 停在桩态（en-US.ts 实测 4,886 行只剩 2 行，桩头还写着"请勿提交"，谁顺手 add -A 就毁了）；
     ②异常从 finally 里逃出去，把构建本来的退出码顶掉（那次 "DONE Build complete" 之后红成 exit=1 就是它）；
     ③rmSync 在抛点之后没执行，备份其实还在盘上，但没有任何一行话告诉下一位"备份在这里"。
     errno -4094（UNKNOWN）在本机是瞬时锁：事后 touch 同一个文件立刻成功，所以重试是对的处置，
     但重试不能当兜底——最终没还原成的，必须点名、给具名路径的还原命令、并保住备份。 */
  const pending = [];
  let ok = 0;
  for (const rel of STUB_TARGETS) {
    const file = join(SRC, rel);
    const backup = join(BACKUP_DIR, rel.replaceAll("/", "__"));
    if (!existsSync(backup)) {
      if (existsSync(file) && readFileSync(file, "utf-8").includes("AUTO-GENERATED STUB")) {
        pending.push(`${rel}（备份缺失且盘上是桩 ⇒ 只能从 HEAD 逐具名路径还原）`);
      }
      continue;
    }
    const want = readFileSync(backup);
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      try {
        writeFileSync(file, want);
        done = Buffer.compare(readFileSync(file), want) === 0;
      } catch (e) {
        if (attempt === 4) console.error(`[strip-mock] 第 ${attempt} 发仍失败 ${rel}: ${String(e.message).slice(0, 90)}`);
      }
      if (!done && attempt < 4) {
        const until = Date.now() + 400 * attempt;
        while (Date.now() < until) { /* 让 Windows 释放句柄 */ }
      }
    }
    if (done) ok++;
    else pending.push(`${rel}（写 4 发均未回读一致）`);
  }
  if (!pending.length) {
    rmSync(BACKUP_DIR, { recursive: true, force: true });
    console.log(`STRIPMOCK_RESTORE=OK files=${STUB_TARGETS.length} verified=${ok} 备份目录已清`);
    console.log("[strip-mock] originals restored");
    return true;
  }
  console.error(`STRIPMOCK_RESTORE=FAIL verified=${ok}/${STUB_TARGETS.length} 备份保住=${BACKUP_DIR}`);
  for (const p of pending) console.error(`STRIPMOCK_PENDING ${p}`);
  console.error(`STRIPMOCK_FIX 逐具名路径还原（本仓禁全仓 restore）：从 ${BACKUP_DIR} 复制回 src，或 git checkout -- <上面点名的路径>`);
  return false;
}

const buildCmd = process.argv.slice(2).join(" ").trim();
if (!buildCmd) {
  console.error("[strip-mock] 用法: node strip-mock-for-mp.mjs \"<build command>\"");
  process.exit(1);
}

/** 解析本地 uni CLI 可执行文件（Windows .cmd / POSIX 无后缀） */
function resolveUniBin() {
  const candidates = [
    join(__dirname, "../node_modules/.bin/uni.cmd"),
    join(__dirname, "../node_modules/.bin/uni"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "uni";
}
const UNI_BIN = resolveUniBin();

let failed = false;
try {
  backupAll();
  stubAll();
  // 将命令中的 "uni " 替换为本地 CLI 完整路径（Windows cmd 无法直接找到 .bin 命令）
  const resolvedCmd = buildCmd.replace(/(^|\s)uni(\s|$)/, `$1"${UNI_BIN}"$2`);
  console.log(`[strip-mock] 运行构建: ${resolvedCmd}`);
  execSync(resolvedCmd, { stdio: "inherit", cwd: join(__dirname, "..") });
} catch (err) {
  failed = true;
  console.error("[strip-mock] 构建失败:", err.message);
}
let restored = true;
try {
  restored = restoreAll();
} catch (e) {
  /* 还原器自己抛 ⇒ 更要大声：源码可能停在桩态，而"桩文件被提交"是本仓最贵的一类事故 */
  console.error(`STRIPMOCK_RESTORE=THREW err=${String(e && e.message).slice(0, 120)} 备份目录=${BACKUP_DIR}`);
  restored = false;
}

if (!restored) {
  console.error("STRIPMOCK_RESULT=FAIL reason=restore-pending ⇒ 源码仍有桩未还原，禁止提交，按上面 STRIPMOCK_FIX 行逐具名路径处理");
  process.exit(3);
}
console.log(`STRIPMOCK_RESULT=${failed ? "FAIL_BUILD" : "PASS"} 桩=${STUB_TARGETS.length} 还原已回读校验`);
if (failed) process.exit(1);
console.log("[strip-mock] 完成：mock/en-US 已桩化构建并恢复源码");
