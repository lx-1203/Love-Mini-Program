#!/usr/bin/env node
/* verify-guest-landing.mjs 的负例自检：门禁若不会为真问题变红，它就是装饰。
   每条一个"必须红"的注入 + 一条真数据的"必须绿"，全部离线（不开模拟器、不抢租约）。
   Node 要 v22：PATH 上的缺省 node 是 DevTools 的 v16。 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { landingStatus, LANDING_UNCLOSED } from "./guest-landing-status.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TMP = resolve(REPO, ".zcode/tmp/guest-landing-selftest");
mkdirSync(TMP, { recursive: true });
const SCRIPT = resolve(REPO, "scripts/qa/verify-guest-landing.mjs");
const NODE = process.execPath;
const realTriage = JSON.parse(readFileSync(resolve(REPO, ".zcode/tmp/triage-r7-guest.json"), "utf8"));
const realPolicy = readFileSync(resolve(REPO, "scripts/qa/guest-landing-policy.json"), "utf8");

let checks = 0, fail = 0;
const t = (name, cond, got) => {
  checks++;
  if (!cond) { fail++; console.log(`FAIL ${name} :: ${String(got).slice(0, 240)}`); }
  else console.log(`ok   ${name}`);
};
function run(label, args) {
  const r = spawnSync(NODE, [SCRIPT, ...args, "--out", resolve(TMP, label + "-booked.json")], { cwd: REPO, encoding: "utf8", timeout: 120000 });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
function writeJson(p, o) { writeFileSync(p, JSON.stringify(o)); return p; }

/* 1) 真数据必须绿，且数字不能是空集凑出来的 */
{
  const r = run("real", ["--policy", resolve(REPO, "scripts/qa/guest-landing-policy.json"), "--triage", resolve(REPO, ".zcode/tmp/triage-r7-guest.json")]);
  t("真数据 exit 0", r.code === 0, "exit=" + r.code + "\n" + r.out);
  t("真数据覆盖 26 组 / 239 行", /groups=26 覆盖欠款行=239/.test(r.out), r.out.split("\n")[0]);
  t("真数据锚点全可核", /锚点可核=11（不可核 0）/.test(r.out), r.out.split("\n")[0]);
  const booked = JSON.parse(readFileSync(resolve(TMP, "real-booked.json"), "utf8"));
  t("出例数 = 组数", booked.rows.length === 26, booked.rows.length);
  t("每组都带 caseIds（欠款可归属）", booked.rows.every((x) => Array.isArray(x.caseIds) && x.caseIds.length), "有空 caseIds");
}
/* 2) triage 多出一组（新落点没裁定）必须红 */
{
  const tri = JSON.parse(JSON.stringify(realTriage));
  tri.landingGroups["subpackages/ghost/page → pages/login/index"] = ["GH01"];
  const p = writeJson(resolve(TMP, "extra-triage.json"), tri);
  const r = run("extra", ["--policy", resolve(REPO, "scripts/qa/guest-landing-policy.json"), "--triage", p]);
  t("新落点无裁定 ⇒ 红", r.code === 2 && /policy 缺这几组/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 3) triage 少一组（裁定还在跑但落点已经变了）必须红 */
{
  const tri = JSON.parse(JSON.stringify(realTriage));
  delete tri.landingGroups["subpackages/tools/search/index → pages/login/index"];
  const p = writeJson(resolve(TMP, "less-triage.json"), tri);
  const r = run("less", ["--policy", resolve(REPO, "scripts/qa/guest-landing-policy.json"), "--triage", p]);
  t("失效裁定 ⇒ 红", r.code === 2 && /没有对应落地对/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 4) 空集不许判绿：一个"没有欠款"的读法会把整门变成永真 */
{
  const p = writeJson(resolve(TMP, "empty-triage.json"), { landingGroups: {} });
  const r = run("empty", ["--policy", resolve(REPO, "scripts/qa/guest-landing-policy.json"), "--triage", p]);
  t("空集 ⇒ 红", r.code === 2 && /空集/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 5) 锚点行漂移必须红（改了代码没改依据） */
{
  const pol = JSON.parse(realPolicy);
  pol.anchors[0].line = 1;
  const p = writeJson(resolve(TMP, "drift-policy.json"), pol);
  const r = run("drift", ["--policy", p, "--triage", resolve(REPO, ".zcode/tmp/triage-r7-guest.json")]);
  t("锚点行漂移 ⇒ 红", r.code === 2 && /行漂移/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 6) guardCaseId 撞号必须红（subpackages/a/b-c 与 subpackages/a-b/c 归一化后同号 ⇒ 复测腿归属不清） */
{
  const pol = JSON.parse(realPolicy);
  pol.rows = pol.rows.filter((x) => x.page !== "subpackages/tools/search/index").concat([
    { page: "subpackages/coll/ide-x", landing: "pages/login/index", family: "guide-401", entry: "内容浏览" },
    { page: "subpackages/coll-ide/x", landing: "pages/login/index", family: "guide-401", entry: "内容浏览" },
  ]);
  const tri = JSON.parse(JSON.stringify(realTriage));
  delete tri.landingGroups["subpackages/tools/search/index → pages/login/index"];
  tri.landingGroups["subpackages/coll/ide-x → pages/login/index"] = ["CL01"];
  tri.landingGroups["subpackages/coll-ide/x → pages/login/index"] = ["CL02"];
  const r = run("dup", ["--policy", writeJson(resolve(TMP, "dup-policy.json"), pol), "--triage", writeJson(resolve(TMP, "dup-triage.json"), tri)]);
  t("guardCaseId 撞号 ⇒ 红", r.code === 2 && /撞号/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 7) landingStatus 四态各自成立（这函数决定 triage 门禁说什么话） */
{
  const booked = { rows: [{ groupKey: "g1", landing: "pages/login/index", landingMarker: ".login-page__brand", registerEntry: ".login-register-entry", guardCaseId: "GG-1", debtRows: 3 }] };
  const mk = (over) => ({ rows: [{ groupKey: "g1", measuredLanding: "pages/login/index", identity: "not-logged-in", markers: { ".login-page__brand": "1", ".login-register-entry": "1" }, measuredAt: "x", band: "real@1" , ...over }] });
  t("无实测 = BOOKED（不算结案）", landingStatus(booked, null)[0].status === "BOOKED", landingStatus(booked, null)[0].status);
  t("落点变了 = MEASURED-DRIFT", landingStatus(booked, mk({ measuredLanding: "pages/home/index" }))[0].status === "MEASURED-DRIFT", "x");
  t("身份不是游客 = MEASURED-INVALID", landingStatus(booked, mk({ identity: "logged-in userId=7" }))[0].status === "MEASURED-INVALID", "x");
  t("注册入口不在 = MEASURED-FAIL（产品缺口，不许改判据）", landingStatus(booked, mk({ markers: { ".login-page__brand": "1", ".login-register-entry": "0" } }))[0].status === "MEASURED-FAIL", "x");
  t("探针答 ERR 也算不过（不许把探针坏了折成 absent）", landingStatus(booked, mk({ markers: { ".login-page__brand": "1", ".login-register-entry": "ERR:timeout" } }))[0].status === "MEASURED-FAIL", "x");
  t("全中 = CLOSED", landingStatus(booked, mk({}))[0].status === "CLOSED", "x");
  t("四态里除 CLOSED 都算未结案", LANDING_UNCLOSED.length === 4 && !LANDING_UNCLOSED.includes("CLOSED"), LANDING_UNCLOSED.join(","));
}
/* 8) 依据写成裸文字（没有 anchors）必须红：那是一条谁都没复核过的"理由" */
{
  const pol = JSON.parse(realPolicy);
  delete pol.anchors;
  const r = run("noanchor", ["--policy", writeJson(resolve(TMP, "noanchor-policy.json"), pol), "--triage", resolve(REPO, ".zcode/tmp/triage-r7-guest.json")]);
  t("无 anchors ⇒ 红", r.code === 2 && /anchors 字段/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 260));
}
console.log(`\nSUMMARY: checks=${checks} assertion failures = ${fail}`);
console.log(fail ? "GL_TEST=FAIL" : "GL_TEST=PASS");
process.exit(fail ? 1 : 0);
