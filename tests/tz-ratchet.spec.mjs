import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 业务时区棘轮门（S2-3，2026-10-30）。
 *
 * 背景：仓里所有业务时间戳的口径是 `TimeZones.BUSINESS`（Asia/Shanghai），但仍有代码直接调
 * 无参 `LocalDateTime.now()` / `LocalDate.now()` ——那用的是 **JVM 默认时区**。容器里
 * TZ 一旦不是 Asia/Shanghai（基础镜像默认 UTC，或宿主改过时区），同一份数据就会出现
 * 8 小时偏差：热搜按「今天」统计把昨天算进来、距离/过期判定早关闭 8 小时、
 * createdAt 与相邻用 BUSINESS 口径写入的列互相对不上。这类偏差不会报错，只会静默算错。
 *
 * 本轮已把「真实链路 + 实体默认值」全部改成带时区写法；仍残留的是 mock 档服务的演示数据。
 * 本门不追求一次性清零（那会把风险塞进一次大改），而是<b>按文件钉住上限、只降不升</b>：
 * 任何新写的 `LocalDateTime.now()` 都会立刻让门变红；清理掉一处就必须把基线同步调小，
 * 否则「计数比基线小」也会被拒绝——避免基线悄悄漂移。
 */

const root = fileURLToPath(new URL("../", import.meta.url));
const MAIN_JAVA = join(root, "apps", "api", "src", "main", "java");
const BARE_NOW = /Local(?:DateTime|Date)\.now\(\)/gu;

/**
 * 残留基线（相对 apps/api/src/main/java，值为该文件允许的出现次数上限）。
 * 只在「mock 档演示数据」上豁免：这些服务只在 mock profile 下生效，不参与真实用户数据。
 */
const BASELINE = {
  "com/campuslove/api/chat/MockPrivateMessageService.java": 12,
  "com/campuslove/api/tasks/MockTaskService.java": 2,
  "com/campuslove/api/whisper/MockWhisperService.java": 2,
  "com/campuslove/api/block/MockBlockService.java": 1,
  "com/campuslove/api/consulting/MockConsultingService.java": 1,
  "com/campuslove/api/invite/MockInviteService.java": 1,
};

/** 注释行不算（Javadoc 里会写「通常为 LocalDateTime.now()」这种说明）。 */
function bareNowCount(line) {
  const t = line.trim();
  if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return 0;
  return line.match(BARE_NOW)?.length ?? 0;
}

function walk(dir, prefix, sink) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === "archive") continue;
      walk(join(dir, entry.name), rel, sink);
    } else if (entry.name.endsWith(".java")) {
      sink.push(rel);
    }
  }
  return sink;
}

const javaFiles = walk(MAIN_JAVA, "", []);
assert.ok(
  javaFiles.length > 700,
  `只扫描到 ${javaFiles.length} 个 main java 文件（<700），扫描根路径可能已失效`,
);

const actual = new Map();
let businessUsages = 0;
for (const rel of javaFiles) {
  const lines = readFileSync(join(MAIN_JAVA, rel), "utf8").split("\n");
  let count = 0;
  for (const line of lines) {
    count += bareNowCount(line);
    businessUsages += line.match(/now\(TimeZones\.BUSINESS\)/gu)?.length ?? 0;
  }
  if (count > 0) actual.set(rel, count);
}

// —— 自测：判点必须能红，且注释不得被误计 ——
assert.equal(bareNowCount("  LocalDateTime now = LocalDateTime.now();"), 1, "解析失效：真实代码行未被计入");
assert.equal(bareNowCount(" * @param cutoff 通常为 {@code LocalDateTime.now()}"), 0, "注释行被误计");
assert.equal(
  [...Object.values(BASELINE)].reduce((a, b) => a + b, 0) > 0, true,
  "基线为空对象会让本门变成永不失败的空门",
);

// —— 逐文件判上限（新增文件同样受约束：不在基线里就只能是 0） ——
const overruns = [];
for (const [rel, count] of actual) {
  const allowed = BASELINE[rel] ?? 0;
  if (count > allowed) overruns.push(`${rel}: 实测 ${count} 处，允许 ${allowed} 处`);
}
assert.deepEqual(
  overruns,
  [],
  `出现新的无时区 LocalDateTime.now()/LocalDate.now()（请用 LocalDateTime.now(TimeZones.BUSINESS)）：\n  ${overruns.join("\n  ")}`,
);

// —— 反向漂移：清理过了就必须同步调小基线，否则基线会悄悄失真 ——
const shrunk = Object.entries(BASELINE).filter(([rel, allowed]) => (actual.get(rel) ?? 0) < allowed);
assert.deepEqual(
  shrunk,
  [],
  `基线已高于实际用量，请把下面几项调小（棘轮只允许同步收缩）：\n  ${shrunk.map(([rel, n]) => `${rel}: 基线 ${n} → 实测 ${actual.get(rel) ?? 0}`).join("\n  ")}`,
);

// 正控：带时区的写法确实被扫到了，否则「无违规」可能只是正则没生效
assert.ok(
  businessUsages >= 300,
  `只统计到 ${businessUsages} 处 now(TimeZones.BUSINESS)（<300），扫描可能整体失效`,
);

const totalBare = [...actual.values()].reduce((a, b) => a + b, 0);
console.log(
  `tz ratchet ok（扫描 ${javaFiles.length} 个 main java；无时区 now() ${totalBare} 处全部在基线内，`
  + `基线文件 ${Object.keys(BASELINE).length} 个；带时区写法 ${businessUsages} 处）`,
);
