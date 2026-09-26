#!/usr/bin/env node
/* 把"取景根本没到达目标页"这件事写成台账证据。
   这些行既不能记已修复（帧不是那一页），也不能记判红（判点是在隔壁页读的）。
   能给的、也是唯一诚实的终态是：实测落在哪一页、经由哪条通道确认、欠的是哪个前置。
   用法：node scripts/qa/emit-landing-debt-plan.mjs [--frames <shoot-results.json>] [--out <cellplan.json>] */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const FRAMES = resolve(REPO, arg("frames", "reports/audit/round-7/uidebt-shoot-wsl2/shoot-results.json"));
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/cellplan-landing-debt.json"));

const j = JSON.parse(readFileSync(FRAMES, "utf8"));
const bad = (j.rows || []).filter((r) => r.status === "SHOT" && !String(r.landing || "").includes(String(r.route || "")));
if (!bad.length) { console.log("LDP_RESULT=FAIL reason=没有落点不符的行（空计划不落账）"); process.exit(2); }

const patches = bad.map((r) => {
  const landed = String(r.landing || "(空)").slice(0, 60);
  const need = /pages\/login\/index$/.test(String(r.route))
    ? "配方前置写的是身份 A，但登录页对已登录会话会重定向走——要判这条得改用游客身份取景"
    : "开页请求被守卫重定向，取景前要先补齐该页声明的前置数据";
  return {
    id: r.id,
    col: 9,
    new: ("取景未到达目标页：请求 " + r.route + " 实落 " + landed + "（落点由 " + (r.landingVia || "cli") + " 通道确认，帧 " + r.frame + "）。" + need)
      .replace(/\|/g, "／").slice(0, 230),
    why: "拿隔壁页的帧当判据就是造假；这里只登记实测落点与欠缺的前置",
  };
});

writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(), source: "emit-landing-debt-plan.mjs",
  frames: FRAMES.split("reports/")[1], rows: bad.length, patches,
}, null, 1));
console.log("LDP_ROWS=" + bad.length + " PATCHES=" + patches.length + " 已写 " + OUT.replace(REPO.split("\\").join("/") + "/", ""));
console.log("LDP_RESULT=OK");
process.exit(0);
