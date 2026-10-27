#!/usr/bin/env node
/*
 * 实况帧清单门（2026-10-27）。
 *
 * 它管的是「取景这件事到底做到没有」，不是像素本身。
 * 用户 2026-09-29 裁定：像素走**仓外证据库** + 清单内 sha256 可核，`*.png` 继续在 .gitignore 挡着
 * （理由写在那条注释里：门禁按提交号背书，一次历史重写会把 339 个提交全部改号，
 *  于是历轮证据同时从「可核」掉到「不可核」）。所以本门**不**要求帧进 git，
 *  它要求的是：清单进 git、清单说的每帧要么在盘上、要么在仓外库里，且指纹对得上。
 *
 * 为什么需要一条"倒退必红"：取景腿是按 PAGES 表跑的，某页编译失败/租约被抢时会**静默少一页**，
 *  载具照样 exit 0 并写出清单。2026-10-26 实测踩过两次（一次路由断言没比、一次被 timeout 掐死），
 *  两次都是"清单比上一轮短"最先暴露，但当时没有任何判据盯这件事。
 *
 * 用法：
 *   node scripts/qa/check-fidelity-manifest.mjs              # 打印读数，exit 0
 *   node scripts/qa/check-fidelity-manifest.mjs --strict     # 任何不合格 exit 1
 *   node scripts/qa/check-fidelity-manifest.mjs --self-test  # 注入⇒红 / 撤掉⇒绿，证判据不空转
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const strict = process.argv.includes("--strict");
const HARNESS = "scripts/qa/reshoot-hires-goal.mjs";
const SCHEMA = "reshoot-hires-goal/v1";
const STORE = process.env.QA_EVIDENCE_STORE || resolve(REPO, "..", "love-mini-evidence");

const problems = [];
const note = (msg) => problems.push(msg);

/* 1) 分母：取景腿自己的 PAGES 表是单一来源，不在这里抄一份第二权威。 */
const harnessSrc = readFileSync(join(REPO, HARNESS), "utf8");
const block = harnessSrc.slice(
  harnessSrc.indexOf("const PAGES = ["),
  harnessSrc.indexOf("];", harnessSrc.indexOf("const PAGES = [")),
);
const pageNames = [...block.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
if (pageNames.length < 10) {
  console.log(`FIDELITY_MANIFEST_RESULT=NOT-EVIDENCED reason=从 ${HARNESS} 只解析到 ${pageNames.length} 个页名，分母可疑`);
  process.exit(2);
}

/* 2) 输入：只认**已入库**的清单（未入库的清单换台机器就不存在，等于没有账）。 */
let trackedManifests;
try {
  trackedManifests = execFileSync("git", ["-c", "core.quotePath=false", "ls-files", "--", "reports/verify"], {
    cwd: REPO, encoding: "utf8",
  }).split(/\r?\n/).filter((p) => p.endsWith("/frames/manifest.json")).map((p) => join(REPO, p));
} catch (e) {
  console.log(`FIDELITY_MANIFEST_RESULT=NOT-EVIDENCED reason=git ls-files 跑不了（${e.message}）`);
  process.exit(2);
}

let framesDeclared = 0;
let framesOnDisk = 0;
let framesInStore = 0;
let framesAxisDown = 0; // 盘上没有、且仓外库这条轴压根没接上 ⇒ 不可判，不算绿也不算红
const storeReachable = existsSync(STORE);
let roundsChecked = 0;
const perRound = [];

for (const abs of trackedManifests) {
  const rel = abs.slice(REPO.length + 1).replace(/\\/g, "/");
  let m;
  try {
    m = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    note(`${rel} 不是合法 JSON：${e.message}`);
    continue;
  }
  if (m.schema !== SCHEMA) continue; // 别的载具（mp-fidelity-sweep/v1）由它自己的门管
  roundsChecked++;
  const roundDir = dirname(dirname(abs)); // <轮>/frames/manifest.json → <轮>
  const names = (m.results || []).map((r) => r.name);
  const missingPages = pageNames.filter((n) => !names.includes(n));
  if (missingPages.length) note(`${rel} 缺 ${missingPages.length} 页：${missingPages.join("、")}`);
  let frames = 0;
  for (const rec of m.results || []) {
    for (const f of rec.frames || []) {
      frames++;
      framesDeclared++;
      if (typeof f.contentHash !== "string" || !/^[0-9a-f]{16}$/u.test(f.contentHash)) {
        note(`${rel} ${rec.name}/${f.state} 无 16 位指纹（${f.contentHash}）`);
        continue;
      }
      if (!(Number(f.bytes) > 0)) note(`${rel} ${rec.name}/${f.state} bytes 不为正`);
      const onDisk = existsSync(join(REPO, f.path));
      if (onDisk) {
        framesOnDisk++;
        const real = createHash("sha256").update(readFileSync(join(REPO, f.path))).digest("hex").slice(0, 16);
        if (real !== f.contentHash) note(`${rel} ${f.path} 清单记 ${f.contentHash} 实为 ${real}（帧被覆盖过，清单没跟着改）`);
        const realBytes = statSync(join(REPO, f.path)).size;
        if (Number.isFinite(realBytes) && realBytes !== Number(f.bytes)) note(`${rel} ${f.path} 清单记 ${f.bytes}B 实为 ${realBytes}B`);
      } else if (existsSync(join(STORE, f.contentHash.slice(0, 2), `${f.contentHash}.img`))) {
        framesInStore++;
      } else if (!storeReachable) {
        // 与 verify-evidence-corpus 的"两格"口径一致：仓外库这条轴没接上时，
        // "帧不在盘上"是**环境格**不是证据销毁——判绿会掩盖漏拍，判红会在 CI 上恒红。
        framesAxisDown++;
      } else {
        note(`${rel} ${f.path} 盘上没有、仓外库也没有（指纹 ${f.contentHash}）⇒ 这帧的像素已不可核`);
      }
    }
    if (!rec.frames || !rec.frames.length) note(`${rel} 页「${rec.name}」零帧（载具触发了但没拿到图）`);
    // 同页两帧哈希相同 ⇒ "bottom" 不是底部的证据，只是同一张图的第二份副本。
    // 2026-10-27 实测：帖子详情/发布帖子的内滚区（<scroll-view scroll-y>）不受 wx.pageScrollTo 影响，
    // 取景腿照样打印 ok=true，清单里因此躺着 2 对逐字节相同的帧。
    const seenHash = new Map();
    for (const f of rec.frames || []) {
      if (!f.contentHash) continue;
      if (seenHash.has(f.contentHash)) {
        note(`${rel} 页「${rec.name}」的 ${seenHash.get(f.contentHash)} 与 ${f.state} 是同一张图（${f.contentHash}）⇒ 后一条不算独立证据`);
      } else seenHash.set(f.contentHash, f.state);
    }
  }
  perRound.push({ rel, dir: basenameOf(rel), pages: names.length, frames });
}

function basenameOf(rel) {
  const seg = rel.split("/");
  return `${seg[2]}/${seg[4]}`; // reports/verify/<日期>/<轮>/...
}

/* 3) 倒退必红：按目录名（日期）升序，页数与帧数都不许比上一轮少。
      只跟**同 schema 的已入库轮次**比；新轮次若刻意缩面（比如只补 5 页）会被这里拦住，
      那是想要的：真要缩面得改分母（HARNESS 的 PAGES）或把旧轮清单一起留着。 */
perRound.sort((a, b) => (a.rel < b.rel ? -1 : 1));
for (let i = 1; i < perRound.length; i++) {
  const prev = perRound[i - 1];
  const cur = perRound[i];
  if (cur.pages < prev.pages) note(`页数倒退 ${prev.rel}=${prev.pages} → ${cur.rel}=${cur.pages}`);
  if (cur.frames < prev.frames) note(`帧数倒退 ${prev.rel}=${prev.frames} → ${cur.rel}=${cur.frames}`);
}

if (!roundsChecked && !process.argv.includes("--self-test")) {
  console.log(`FIDELITY_MANIFEST_RESULT=NOT-EVIDENCED reason=已入库清单 0 份（分母 ${pageNames.length} 页）——取景账没进库，等于本轮没有证据`);
  process.exit(2);
}

/* ── 判据自证：注入⇒红、撤掉⇒绿，且红必须红在该注入的那一项上 ── */
if (process.argv.includes("--self-test")) {
  const cases = [];
  const T = (label, ok, detail = "") => cases.push({ label, ok, detail });
  // 分母解析必须给阳性：钉住 harness 里两个真实页名
  T("分母解析到真页名", pageNames.includes("登录页") && pageNames.includes("校园圈"), `pages=${pageNames.length}`);
  // 负例 1：少一页 ⇒ 缺页判据必须红
  const fakeNames = pageNames.slice(1);
  T(
    "少一页要红",
    pageNames.filter((n) => !fakeNames.includes(n)).length === 1,
    `注入后缺页数=${pageNames.filter((n) => !fakeNames.includes(n)).length}`,
  );
  // 负例 2：帧被覆盖 ⇒ 指纹判据必须红（当场造一帧真文件，改一个字节再看哈希）
  const TMP = join(REPO, "tmp", "qa-selftest-fidelity", "probe.png");
  mkdirSync(dirname(TMP), { recursive: true });
  writeFileSync(TMP, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
  const h1 = createHash("sha256").update(readFileSync(TMP)).digest("hex").slice(0, 16);
  writeFileSync(TMP, Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 9, 9]));
  const h2 = createHash("sha256").update(readFileSync(TMP)).digest("hex").slice(0, 16);
  T("覆盖后哈希必须变（否则哈希判据抓不到）", h1 !== h2, `${h1.slice(0, 6)}→${h2.slice(0, 6)}`);
  // 负例 3：仓外库够不着 ⇒ 只能判"不可核"，不能默认放行
  T(
    "够不着库时仍走存在性判据",
    !existsSync(join(STORE, "zz", "zzzzzzzzzzzzzzzz.img")),
    `store=${existsSync(STORE) ? "在" : "不在"}`,
  );
  // 正例：真实清单的每一帧都能被"盘上或库里"接住（这条红了就是本轮收口没做完）
  //   必须先有账可量：0 轮/0 帧时 0+0===0 会恒过，那是空集上的假绿。
  T(
    "已入库清单且帧帧可核（或显式点名库轴未接）",
    roundsChecked > 0 && framesDeclared > 0 && framesOnDisk + framesInStore + framesAxisDown === framesDeclared,
    `轮=${roundsChecked} ${framesOnDisk}+${framesInStore}+轴未接${framesAxisDown}/${framesDeclared}`,
  );
  // 清靶
  unlinkSync(TMP);
  const bad = cases.filter((c) => !c.ok);
  for (const c of bad) console.log(`  ✗ ${c.label}（${c.detail}）`);
  console.log(`FIDELITY_SELFTEST=${bad.length ? "FAIL" : "PASS"} cases=${cases.length} 负例可红=${cases.filter((c) => c.ok && c.label.includes("要红") || c.ok && c.label.includes("必须变")).length}`);
  process.exit(bad.length ? 1 : 0);
}

console.log(`轮次=${roundsChecked} 分母页=${pageNames.length} 声明帧=${framesDeclared} 盘上=${framesOnDisk} 仅库在=${framesInStore} 库轴未接=${framesAxisDown} 不可核=${framesDeclared - framesOnDisk - framesInStore - framesAxisDown}`);
for (const p of problems) console.log(`  ✗ ${p}`);
// 与 verify-evidence-corpus 同样的三态：有缺陷=FAIL；轴没接上=NOT-EVIDENCED（**绝不印 OK**）。
// 因此本门不接 CI——CI 没有仓外库，接进去只会得到一扇每轮都"不表态"的门。
// 接线点在 run-final-verify-v33.sh（本机有库）与 run-qa-selftests 的自证轴。
if (problems.length) console.log("FIDELITY_MANIFEST_RESULT=FAIL 不合格=" + problems.length);
else if (framesAxisDown) console.log(`FIDELITY_MANIFEST_RESULT=NOT-EVIDENCED reason=仓外库够不着（${STORE}），${framesAxisDown} 帧的像素无法核对`);
else console.log("FIDELITY_MANIFEST_RESULT=OK");
if (strict && problems.length) process.exit(1);
process.exit(problems.length || framesAxisDown ? 2 : 0);
