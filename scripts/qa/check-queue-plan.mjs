/* 排队计划（ui-queue.*.json）的开跑前体检：只查三件能静默毁掉一整轮的事——
   文件不存在、旗标名字是该工具读不到的、参数里混了非字符串。
   写成文件而不是 node -e：内联脚本的正则反斜杠会被 shell 吃掉（本轮已踩两次）。 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(process.cwd());
const file = process.argv[2];
if (!file) { console.log("PLANCHK_RESULT=FAIL reason=没给计划文件路径"); process.exit(2); }
const j = JSON.parse(readFileSync(resolve(REPO, file), "utf8"));
const legs = Array.isArray(j) ? j : (j.legs || []);
if (!legs.length) { console.log("PLANCHK_RESULT=FAIL reason=" + file + " 里没有 legs（空的或结构不对）"); process.exit(2); }
let bad = 0;
const ACCESS = ["opt(", "arg(", "flag(", "hasFlag(", "\""];
for (const leg of legs) {
  if (!leg || !leg.name || !leg.file) { bad++; console.log("NO_NAME_OR_FILE " + JSON.stringify(leg).slice(0, 80)); continue; }
  if (!existsSync(resolve(REPO, leg.file))) { bad++; console.log("MISSING_FILE " + leg.name + " → " + leg.file); continue; }
  const src = readFileSync(resolve(REPO, leg.file), "utf8");
  for (const a of leg.args || []) {
    if (typeof a !== "string") { bad++; console.log("NON_STRING_ARG " + leg.name + " :: " + JSON.stringify(a)); continue; }
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const hit = src.includes("--" + k) || ACCESS.some((p) => src.includes(p + k + "\""));
    if (!hit) { bad++; console.log("UNKNOWN_FLAG " + leg.name + " " + a + " ⇒ 该文件里既没有字面 --" + k + "，也没有 opt/arg/flag(\"" + k + "\")"); }
  }
  if (typeof leg.timeoutMin !== "number" || leg.timeoutMin < 1) { bad++; console.log("BAD_TIMEOUT " + leg.name); }
  if (!leg.why || String(leg.why).length < 20) { bad++; console.log("THIN_WHY " + leg.name + "（why 短于 20 字：三个月后没人知道这条腿为什么在队列里）"); }
}
const names = legs.map((x) => x.name);
const dup = names.filter((n, i) => names.indexOf(n) !== i);
if (dup.length) { bad++; console.log("DUP_NAME " + [...new Set(dup)].join(",")); }
console.log("PLANCHK legs=" + legs.length + " 非advisory=" + legs.filter((x) => !x.advisory).length +
  " 设备腿=" + legs.filter((x) => /open-project-window|r-exec|shoot-frameplan|tour-/.test(x.file || "")).length +
  " bad=" + bad + " PLAN=" + (bad ? "FAIL" : "OK"));
process.exit(bad ? 1 : 0);
