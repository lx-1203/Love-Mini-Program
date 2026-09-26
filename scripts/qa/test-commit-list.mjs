/* make-commit-list.mjs 的规则回归。
   存在的理由：这份清单是"按显式路径提交"的唯一依据，而它的两条关键规则
   （① 疑似凭据路径绝不能进取用清单；② 构建产物/gitignore 区不许混进来）
   一旦写反，后果是要么泄露 restart-backend.ps1 里的凭据，要么把 dist/ 整个提交上去。
   这两条都必须**被驱动到失败过**才算数，光跑一次真树看到数字是不够的。
   另外测一件事：被 import 时不得有副作用（不得跑 git、不得写清单）。
   用法：node scripts/qa/test-commit-list.mjs
*/
import { statSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST = join(REPO, ".zcode", "tmp", "round6-exec", "commit-manifest.json");

let fail = 0, checks = 0;
function eq(name, got, want) {
  checks++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log(`FAIL ${name} got=${JSON.stringify(got)} want=${JSON.stringify(want)}`); }
  else console.log(`OK   ${name}`);
}

const before = existsSync(MANIFEST) ? statSync(MANIFEST).mtimeMs : 0;
const mod = await import("../qa/make-commit-list.mjs");
const { classify, pathFromPorcelain } = mod;
const after = existsSync(MANIFEST) ? statSync(MANIFEST).mtimeMs : 0;

// —— 0) import 必须无副作用 ——
eq("import 后清单文件 mtime 未变（不跑 git、不落盘）", after === before, true);
eq("导出 classify / pathFromPorcelain", [typeof classify, typeof pathFromPorcelain], ["function", "function"]);

// —— 1) 疑似凭据路径一律 holdback，且绝不进 include ——
for (const p of [".env", "apps/api/.env.local", "apps/api/restart-backend.ps1", "deploy/tls.pem", "id_rsa", "certs/client.key", "cfg/app-credentials.json", "ops/secrets.yaml"]) {
  const r = classify(p);
  eq(`holdback: ${p}`, [r.verdict, r.group], ["holdback", "holdback"]);
}

// —— 2) 构建产物 / 依赖 / gitignore 区一律 excluded ——
for (const p of ["node_modules/vite/index.js", "apps/client/dist/build/mp-weixin/app.js", "tmp/qa/stop-r6", ".zcode/tmp/round6-LEDGER.md", "apps/client/build/out.js", ".git/config"]) {
  const r = classify(p);
  eq(`excluded: ${p}`, r.verdict, "excluded");
}

// —— 3) 正常交付物分组正确，且都进 include ——
// 特别注意第一条：`.zcode/` 下的**工作流定义与研究档**是已跟踪的交付物，
// 首版把整个 .zcode 判成 excluded，会让"按显式路径提交"把工作流文件漏掉（实测 porcelain 里就有它）。
const wants = [
  ["apps/client/src/pages/home/index.vue", "client_src"],
  ["apps/api/src/main/java/x/RealCampusService.java", "api_src"],
  ["apps/admin/src/views/Posts.vue", "admin_src"],
  ["scripts/qa/run-qa-selftests.mjs", "tools"],
  ["apps/client/scripts/check-statusbar-offset.mjs", "tools"],
  [".zcode/workflows/miniprogram-qa-loop-v32.dwf.ts", "workflow_def"],
  [".zcode/research/WORKFLOW-v32-RESULT-2026-09-25.md", "research"],
  ["reports/audit/round-6/issue-matrix.md", "evidence"],
  ["素材/理想效果图/登录页面.png", "assets"],
  ["docs/foo.md", "docs"],
  ["mystery/thing.xyz", "carryover"],
];
for (const [p, g] of wants) {
  const r = classify(p);
  eq(`group ${p} => ${g}`, [r.group, r.verdict], [g, "include"]);
}
// 反向对照：同样在 .zcode 下，但 tmp/ 才是 scratch，必须仍然被排除
eq("仍排除: .zcode/tmp 下的 scratch", classify(".zcode/tmp/round6-exec/commit-manifest.probe.json").verdict, "excluded");

// —— 3b) 截图帧 holdback，但同目录里的采集原始记录（.json）必须仍可提交 ——
// 这条规则是"按显式路径提交"与"不把 65MB 二进制压进仓库"两个要求之间的缝，
// 两边都得有断言：只测 holdback 会静默把 manifest 一起挡掉（那才是真丢证据）。
eq("帧 png holdback", [classify("reports/screenshots/round-6-tour/A/pages_home_index__默认.png").group, classify("reports/screenshots/round-6-tour/A/pages_home_index__默认.png").verdict], ["frames", "holdback"]);
eq("目录级条目 holdback", classify("reports/screenshots/round-6-real-tour/").verdict, "holdback");
eq("帧目录里的 manifest 仍 include", [classify("reports/screenshots/round-6-tour/manifest-detail.json").group, classify("reports/screenshots/round-6-tour/manifest-detail.json").verdict], ["evidence", "include"]);
eq("反向对照：素材参考图没有被这条规则一并挡掉", classify("素材/理想效果图/登录页面.png").verdict, "include");
eq("反向对照：审计目录里的权威索引不受影响", classify("reports/audit/round-6/screenshot-manifest.json").verdict, "include");

// —— 4) porcelain 解析：状态位、重命名取新名、带引号路径 ——
eq("普通修改行", pathFromPorcelain(" M apps/client/src/a.vue"), { status: " M", path: "apps/client/src/a.vue" });
eq("未跟踪行", pathFromPorcelain("?? scripts/qa/new.mjs"), { status: "??", path: "scripts/qa/new.mjs" });
eq("重命名取新名", pathFromPorcelain("R  old/path.vue -> new/path.vue"), { status: "R ", path: "new/path.vue" });
eq("删除行", pathFromPorcelain(" D apps/client/src/components/chat/ChatInput.vue"), { status: " D", path: "apps/client/src/components/chat/ChatInput.vue" });
eq("带引号路径", pathFromPorcelain('?? "a b/c.md"'), { status: "??", path: "a b/c.md" });

// —— 4b) 行过滤器不得吃掉短文件名（本轮实测：仓库根那个 shell 重定向产物 `0` 就是这么静默消失的）
// 反向对照用旧写法在同一份文本上跑一遍：旧式少一行 ⇒ 这条用例判得出真假。
const txtPor = " D 0\n M apps/client/src/a.vue\n";
const rowsNew = mod.porcelainRows(txtPor).map((r) => r.path);
eq("短文件名保留在扫描集里", rowsNew, ["0", "apps/client/src/a.vue"]);
const rowsOld = txtPor.split("\n").filter((l) => l.trim().length >= 4).map(pathFromPorcelain).map((r) => r.path);
eq("反向对照：旧 trim 写法确实会吃掉那条", rowsOld, ["apps/client/src/a.vue"]);

// —— 5) 守恒：任何集合下 include+holdback+excluded 必须等于总数 ——
const set = ["apps/client/src/a.vue", ".env", "node_modules/x/y.js", "reports/r.md"];
const parts = set.map(classify);
const n = { include: 0, holdback: 0, excluded: 0 };
parts.forEach((p) => n[p.verdict]++);
eq("守恒 include+holdback+excluded == 总数", n.include + n.holdback + n.excluded, set.length);
eq("四格计数", [n.include, n.holdback, n.excluded], [2, 1, 1]);

// —— 6) 分类器不得返回未定义的 verdict（防"静默进取用清单"） ——
eq("verdict 取值合法", parts.every((p) => ["include", "holdback", "excluded"].includes(p.verdict)), true);

console.log(`\nSUMMARY: checks=${checks} assertion failures = ${fail}`);
process.exit(fail ? 1 : 0);
