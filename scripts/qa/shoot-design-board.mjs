#!/usr/bin/env node
/**
 * 设计稿画板出图器：把一个 HTML 画板里每个 `.phone` 画框截成与理想效果图语料同规格的 PNG。
 *
 * 规格锚（2026-10-26 实测 素材/理想效果图/ 19 张得出，见 tmp/verify-20261026/measure-ideal-corpus.cjs）：
 *   语料整页单屏形态 = 852–860 × 1844–1846，面积恒为 1.572–1.573 Mpx（= 1024×1536 的像素面积）。
 *   画板画框是 375 × 812（与语料同一长宽比：812/375 = 2.165 vs 语料 2.162），
 *   故 deviceScaleFactor 取 2.273 → 375×2.273 = 852.4、812×2.273 = 1845.6 → 落在语料带内。
 *
 * 用法：node scripts/qa/shoot-design-board.mjs <board.html> [--out <dir>] [--only F03]
 * 退出码：0 全部出图成功且尺寸落在语料带内；1 有框出图失败；2 尺寸不合规（画框不是 375×812）。
 */
import { puppeteerLaunch } from "./_puppeteer-carrier.mjs";
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const DSF = 2.273;
const ARGS = process.argv.slice(2);
const board = ARGS.find((a) => !a.startsWith("--"));
if (!board) {
  console.error("用法: node scripts/qa/shoot-design-board.mjs <board.html> [--out <dir>] [--only F03]");
  process.exit(2);
}
const outArg = ARGS.indexOf("--out");
const onlyArg = ARGS.indexOf("--only");
const only = onlyArg >= 0 ? ARGS[onlyArg + 1] : null;
const boardPath = resolve(board);
if (!existsSync(boardPath)) {
  console.error(`画板不存在: ${boardPath}`);
  process.exit(2);
}
const outDir = outArg >= 0 ? resolve(ARGS[outArg + 1]) : resolve(dirname(boardPath), "frames", basename(boardPath, ".html"));
mkdirSync(outDir, { recursive: true });

const RK = "BOARDSHOOT";

/* 清掉上一次出图的遗留 PNG：画板屏数会随改版增减，只覆盖不删除的话，
   被删掉的那一屏的旧帧会静默留在目录里冒充现行基准（2026-10-26 实测踩到：
   home-index 从 3 屏收成 2 屏后，孤儿 F03.png 混进了 72 帧的清点数）。
   带 --only 的单屏重拍不清，否则会把同页其余帧一起删掉。 */
if (!only) {
  let pruned = 0;
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".png")) {
      unlinkSync(resolve(outDir, f));
      pruned++;
    }
  }
  if (pruned) console.log(`${RK}_PRUNED ${pruned} 张遗留帧`);
}

const browser = await puppeteerLaunch();
const page = await browser.newPage();
await page.setViewport({ width: 1780, height: 1000, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(boardPath).href, { waitUntil: "networkidle2", timeout: 60000 });
await page.waitForSelector(".phone", { timeout: 30000 });

const ids = await page.$$eval(".phone", (els) =>
  els.map((el) => {
    const cap = el.parentElement?.querySelector("figcaption b");
    const t = el.parentElement?.querySelector("figcaption .t");
    return { id: cap ? cap.textContent.trim() : "", title: t ? t.textContent.trim() : "" };
  })
);

await page.setViewport({ width: 1780, height: 1000, deviceScaleFactor: DSF });
await page.evaluateHandle("document.fonts && document.fonts.ready");

const results = [];
let badSize = 0;
let failed = 0;
for (let i = 0; i < ids.length; i++) {
  const id = ids[i].id || `F${String(i + 1).padStart(2, "0")}`;
  if (only && id !== only) continue;
  const els = await page.$$(".phone");
  const el = els[i];
  if (!el) { failed++; results.push({ id, ok: false, why: "节点取不到" }); continue; }
  const box = await el.boundingBox();
  if (!box) { failed++; results.push({ id, ok: false, why: "boundingBox 为空（可能被隐藏）" }); continue; }
  // boundingBox() 返回的是 CSS 像素坐标，与 deviceScaleFactor 无关；
  // 出图的实际像素 = CSS 尺寸 × dsf。
  const cssW = Math.round(box.width);
  const cssH = Math.round(box.height);
  if (cssW !== 375 || cssH !== 812) {
    badSize++;
    console.log(`${RK}_BADSIZE ${id} 画框 CSS 尺寸 = ${cssW}×${cssH}，应为 375×812`);
  }
  const file = resolve(outDir, `${id}.png`);
  await el.screenshot({ path: file });
  results.push({ id, title: ids[i].title, file, cssW, cssH, pxW: Math.round(box.width * DSF), pxH: Math.round(box.height * DSF), ok: true });
  console.log(`${RK}_OK ${id} → ${basename(file)}  ${Math.round(box.width * DSF)}×${Math.round(box.height * DSF)}px`);
}
await browser.close();

writeFileSync(
  resolve(outDir, "manifest.json"),
  JSON.stringify({ schema: "design-board-shoot/v1", board: basename(boardPath), dsf: DSF, results }, null, 2)
);

/* 资源断链检查：画板里 src/href 指向 assets/ 的相对路径必须真实存在。
   2026-10-26 实测踩到两类：代理按 NEED_ASSET 引用了主控尚未落位的文件；
   以及主控自己回补素材时引用了池里没有的档名（home-index 的 person-04..07-avatar）。
   断链在浏览器里只是碎图、在出图里是静默空白，所以必须机器判。 */
let broken = 0;
{
  const html = readFileSync(boardPath, "utf8");
  const seen = new Set();
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
    const rel = m[1];
    if (seen.has(rel)) continue;
    seen.add(rel);
    if (!existsSync(resolve(dirname(boardPath), rel))) {
      broken++;
      console.log(`${RK}_BROKENLINK ${basename(boardPath)} → ${rel}`);
    }
  }
}

console.log(`${RK}_SUMMARY frames=${results.filter((r) => r.ok).length} failed=${failed} badSize=${badSize} brokenLinks=${broken} out=${outDir}`);
if (failed) process.exit(1);
if (badSize) process.exit(2);
if (broken) process.exit(2);
