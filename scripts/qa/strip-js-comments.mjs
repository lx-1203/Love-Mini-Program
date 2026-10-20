#!/usr/bin/env node
/**
 * strip-js-comments.mjs —— 单遍剥掉 JS/TS/Vue 源码里的注释，字符串内部原样保留。
 *
 * 为什么要有这么一份东西（2026-10-20 实测，同一个坑一天内撞两次）：
 *   · `apps/client/scripts/check-statusbar-offset.mjs` 原版是两条 replace（先剥块注释、再剥行注释），于是**行注释里出现的 `/uploads/**`** 被当成块注释起点，一路吞到下一个块注释闭合符，
 *     把后面真实的 `import { useMenuButtonRect }` 一起抹掉 ⇒ 三条假红，
 *     主控据此往三个本来正常的文件里补了重复 import，编译期才撞出来。
 *   · `scripts/qa/derive-baseline-ledger.mjs` 用 `/requiresAuth:\s*true/` 判"这页要不要登录"，
 *     而它跑在**含注释的原文**上 ⇒ 谁在注释里写一句"复用 requiresAuth: true 的要求"，
 *     这页就被钉成登录档，取景前提跟着错。车道实测踩到后改写了注释绕开——**注释不该是判点输入**。
 *
 * 两处都是"把注释当代码读"，方向相反（一个误删代码、一个误读注释），所以收成一份实现、
 * 而不是各写各的：这类解析顺序的错，复制一次就会在第二个副本里以另一种形态复发。
 *
 * 语义：注释字符按空白抹掉、**不删行**，所以行号与长度对得上（调用方会按 index 回切片做上下文判断）。
 * 字符串字面量内部一律不碰（`"https://x"` 里的 `//` 不是注释）。
 */

export const LINE = 1;
export const BLOCK = 2;
export const SQ = 3;
export const DQ = 4;
export const BT = 5;

export function stripComments(src) {
  const out = src.split("");
  let st = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (st === 0) {
      if (c === "/" && n === "/") { st = LINE; out[i] = " "; out[i + 1] = " "; i++; continue; }
      if (c === "/" && n === "*") { st = BLOCK; out[i] = " "; out[i + 1] = " "; i++; continue; }
      if (c === "'") st = SQ;
      else if (c === '"') st = DQ;
      else if (c === "`") st = BT;
      continue;
    }
    if (c === "\n") { if (st === LINE || st === SQ || st === DQ) st = 0; continue; } // 块注释跨行不收口
    if (st === LINE) { out[i] = " "; continue; }
    if (st === BLOCK) {
      if (c === "*" && n === "/") { st = 0; out[i] = " "; out[i + 1] = " "; i++; continue; }
      out[i] = " ";
      continue;
    }
    if ((st === SQ && c === "'") || (st === DQ && c === '"') || (st === BT && c === "`")) { st = 0; continue; }
    continue; // 字符串内部原样
  }
  return out.join("");
}

/* --selftest：三条都必须红得起来/绿得回去，否则这份实现等于没被证过 */
if (process.argv[1] && process.argv[1].includes("strip-js-comments")) {
  const cases = [
    ["行注释里的 /* 不许当块注释起点", "const a=1; // 路径 /uploads/** 之类\nconst keep=2;", "keep"],
    ["字符串里的 // 不许当注释", 'const u = "https://x/y"; // 这里才该抹掉', "https://x/y"],
    ["块注释跨行要一直抹到闭合", "/* 一\n二\nconst hidden=9; */\nconst shown=3;", "shown"],
  ];
  let bad = 0;
  for (const [name, input, mustSurvive] of cases) {
    const got = stripComments(input);
    const ok = got.includes(mustSurvive) && !/hidden=9/.test(got);
    if (!ok) bad++;
    console.log(`STRIPCOMMENTS_SELFTEST ${ok ? "PASS" : "FAIL"} ${name}`);
  }
  console.log(`STRIPCOMMENTS_SELFTEST_RESULT=${bad ? "FAIL" : "PASS"} cases=${cases.length} bad=${bad}`);
  process.exit(bad ? 1 : 0);
}
