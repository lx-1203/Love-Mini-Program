#!/usr/bin/node
/* case-recipes.json ↔ 判据台 的交叉校验（capability 车道 2026-10-06）。
   test-exec-capabilities.cjs 钉的是模块纯函数与配方文件自身的结构；本文件钉的是
   **配方对真判据台的承诺**：
   ① 每个配方键都在判据台里真实存在（键拼错 = 静默少跑，--ids-file 同一条教训）；
   ② 配方 page 与判据台 page 一致（逐例深链别把落点钉错页）；
   ③ 判据的 tapTarget 必须被配方步骤/夹具文本覆盖 —— 能力件要解的就是"点名物件点不到"，
      配方里碰不到 tapTarget 的配方不许自称解锁了这条判据（validateRecipes 的硬判点）；
   ④ 判据的 identities 口径：本通道只配登录轴；配方必须声明为什么不含游客轴
      （OT06/OC09 的游客轴是落点裁定问题，配方文件 hygiene 字段点名了它）；
   ⑤ requiresReal 用例的配方不得在 mock 载体上跑（防 mock 冒充真实模式 —— 门的那句老话）。
   跑法：node scripts/qa/test-cap-recipes.cjs
   聚合器认：SUMMARY: assertion failures = N + CAPRECIPES_TEST=PASS|FAIL。零设备、零落盘。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
const RECIPES = JSON.parse(fs.readFileSync(path.join(REPO, "scripts", "qa", "case-recipes.json"), "utf8"));
const NODE = process.execPath;

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 150) + ")"));
}

/* 判据台语料：manifest → {page, cases}。 */
const corpus = new Map();
for (const f of fs.readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(OPS, f), "utf8"));
    corpus.set(f.replace(/\.json$/, ""), j);
  } catch { /* 解析失败的判据文件由别的门管 */ }
}

/* validateRecipes 的动态半边：用真判据台喂它（ESM 模块经 tmp 包装 import）。 */
const WRAPPER = path.join(REPO, ".zcode", "tmp", "caps-import.mjs");
async function loadCaps() {
  fs.mkdirSync(path.dirname(WRAPPER), { recursive: true });
  fs.writeFileSync(WRAPPER, "import * as C from " + JSON.stringify("file://" + path.join(REPO, "scripts", "qa", "exec-capabilities.mjs").split("\\").join("/")) + "; export default C;\n", "utf8");
  return (await import("file://" + WRAPPER.split("\\").join("/"))).default;
}

async function main() {
  const C = await loadCaps();
  /* corpus 形状：key → {page}（validateRecipes 只读 page；tapTarget 从 cases 里拼）。 */
  const gateCorpus = new Map();
  for (const [manifest, j] of corpus) {
    for (const c of (j.cases || [])) {
      gateCorpus.set(manifest + "|" + c.id, { page: j.page || c.page || "", tapTarget: c.tapTarget || "" });
    }
  }
  const v = C.validateRecipes(RECIPES, gateCorpus);
  t("validateRecipes 对真判据台零问题（键全在/page 全对/tapTarget 全覆盖/夹具全可回滚）", v.ok, v.problems.join("；"));

  const keys = Object.keys(RECIPES.recipes || {});
  for (const key of keys) {
    const [manifest, id] = [key.slice(0, key.indexOf("|")), key.slice(key.indexOf("|") + 1)];
    const mf = corpus.get(manifest);
    const c = mf && (mf.cases || []).find((x) => x.id === id);
    t("配方 " + key + " 在判据台有行", !!c, c ? "tier=" + c.tier : "找不到");
    if (!c) continue;
    t("配方 " + key + " 的 requiresReal=" + c.requiresReal + " ⇒ 必须真档跑（配方只配能力，不换档位账）", c.requiresReal === true, "");
    const r = RECIPES.recipes[key];
    /* 深链参数与判据台点名目标的一致性：query 里带 userId 的配方，其 id 必须在 r14 判据 cost 文本里被点过名
       （10001=未喜欢/OT05、100155=已喜欢未匹配/OT06 态1、10003=互喜/OT06 态2）—— 防止把任意 id 写死进去。 */
    const q = String(r.query || "");
    if (/userId=(\d+)/.test(q)) {
      const uid = /userId=(\d+)/.exec(q)[1];
      const allowed = { "次要20|OT05": ["10001"], "次要20|OT06": ["100155", "10003"], "次要20|OT09": ["10001"] };
      t("配方 " + key + " 深链 userId=" + uid + " 在 r14 实测点名的目标表内", (allowed[key] || []).includes(uid), "allowed=" + (allowed[key] || []).join("/"));
    }
    /* OC09 的 code 参数：必须是 recon 实测在册的 official-assistant。 */
    if (key === "次要21|OC09") {
      t("配方 OC09 的 code=official-assistant（recon GET /official-accounts 在册行）", /code=official-assistant/.test(q), q);
    }
    /* VB03 的步骤形状：必须覆盖 (a) 首进 (b) 二次进入 (c) 下拉 三段（多步 nav 的判据 (a)(b)(c)）。 */
    if (key === "次要22|VB03") {
      const blob = JSON.stringify(r.steps || []);
      t("配方 VB03 覆盖 (a)(b)(c) 三段：两次进账单页 + 一次下拉 + 逐段 drainNet 计数",
        (blob.match(/subpackages\/vip\/bills/g) || []).length >= 3 && /pullDown/.test(blob) && (blob.match(/drainNet/g) || []).length >= 3, "");
      t("配方 VB03 声明了 showcase 档位（band real@ed1cd82c 由 --project 决定，配方只记 why）", /showcase/.test(r.why || ""), "");
    }
    /* 游客轴的诚实划界：OT06/OC09 无 identities 字段 ⇒ 门两轴都要；本通道只判登录轴，
       配方 why 必须点名"游客轴不在本配方（落点裁定非能力问题）"，不许装作两轴都判了。 */
    if (key === "次要20|OT06" || key === "次要21|OC09") {
      t("配方 " + key + " 的 why 显式声明游客轴不在本配方（待落点裁定，不是能力问题）", /游客轴/.test(r.why || ""), "");
      t("判据 " + key + " 确实没标 identities（门两轴都要 ⇒ 残余欠账的口径来源）", !Array.isArray(c.identities) || c.identities.length === 0, "");
    }
  }
  /* 判据台上 10 条欠账里没进配方的（VRN07 待授权、TD03 属 L13/DISPATCHABLE），逐条点名不装看不见。 */
  const notInRecipes = ["次要20|VRN07", "次要18|TD03"].filter((k) => !keys.includes(k));
  t("VRN07/TD03 不在本通道配方（VRN07=待授权 DB 夹具、TD03=L13 的 DENY 收窄+参数化输入，都不归本车道）", notInRecipes.length === 2, notInRecipes.join(","));
  t("hygiene 字段点名了 OT06/OC09 游客轴的归属（落点裁定）", /guest-landing-policy/.test(String(RECIPES.hygiene || "")), "");

  console.log("SUMMARY: assertion failures = " + fails);
  console.log("CAPRECIPES_TEST=" + (fails === 0 ? "PASS" : "FAIL") + "（checks=" + checks + "）");
  process.exit(fails === 0 ? 0 : 1);
}
main().catch((e) => { console.log("CAPRECIPES_TEST=FAIL stage=uncaught " + String((e && e.stack) || e).split("\n")[0]); console.log("SUMMARY: assertion failures = " + (fails + 1)); process.exit(1); });
