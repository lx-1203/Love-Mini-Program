/* 诊断"同 bundle 两个项目窗口"到底会不会让 --project 调用走错窗。
   背景：14:07:31 我跑了一次 `cli auto --auto-port 9420`（它除了开 9420 的 NodeService 子进程，
   还另开了一个渲染进程 = 第二个项目窗口），之后执行轮的 routeStack 在 messages/login 两页连续取空
   （51 行 SKIPPED），而 discover/home 正常 ⇒ 怀疑两条通道指向的不是同一个窗口。
   这个脚本只做观测不改判：把两条通道各自看到的当前页并排打出来。 */
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const { openPage, routeStack, evaluate } = await import("./cli-automator.mjs");

function automator() {
  try { return require("miniprogram-automator"); } catch { /* fallthrough */ }
  const store = join(REPO, "node_modules", ".pnpm");
  const hit = readdirSync(store).filter((d) => d.startsWith("miniprogram-automator@")).sort()[0];
  return hit ? require(join(store, hit, "node_modules", "miniprogram-automator")) : null;
}
const PROJECT = process.argv[2] || join(REPO, "apps/client/dist/build/mp-weixin");
const TARGETS = ["pages/discover/index", "pages/messages/index", "pages/login/index", "pages/home/index"];

async function viaWs(A) {
  if (!A) return "NO_AUTOMATOR_MODULE";
  let mini;
  try {
    mini = await Promise.race([A.connect({ wsEndpoint: "ws://127.0.0.1:9420" }),
      new Promise((_, rj) => setTimeout(() => rj(new Error("CONNECT_TIMEOUT")), 6000))]);
  } catch (e) { return "WS_DOWN:" + String(e.message).slice(0, 40); }
  try {
    const p = await mini.currentPage();
    return p && p.path;
  } catch (e) { return "WS_ERR:" + String(e.message).slice(0, 40); }
}

const A = automator();
for (const t of targetsLoop()) {
  let br = "";
  try { openPage(t, "", { project: PROJECT }); } catch (e) { br = "OPEN_ERR:" + String(e.message).slice(0, 50); }
  await new Promise((r) => setTimeout(r, 2500));
  if (!br) { try { br = String(routeStack({ project: PROJECT }) || "(空)"); } catch (e) { br = "ROUTE_THROW:" + String(e.message).slice(0, 60); } }
  const ws = await viaWs(A);
  const agree = br.includes(t) && String(ws).includes(t);
  console.log("DIAG " + t + " | bridge=" + br.replace(/\s+/g, " ").slice(0, 90) + " | ws=" + ws + " | 两边一致=" + (agree ? "yes" : "NO"));
  await new Promise((r) => setTimeout(r, 800));
}
function targetsLoop() { return TARGETS; }
console.log("DIAG_NOTE 本脚本每次都用 connect() 拿一次页上下文，绝不 close()（close 会把 9420 那个子进程整个带走）");
console.log("DIAG_DONE targets=" + TARGETS.length);
