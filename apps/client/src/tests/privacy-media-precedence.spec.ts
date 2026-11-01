import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * 隐私授权前置门（R7-C 第 1 批 · 门 4，round-6 F-4.4 / F-7 方案）。
 *
 * <p>背景：微信端 `chooseImage/chooseMedia/uploadFile/compressImage` 在未过隐私授权时
 * 静默返回空/报 112 类隐私错误——真机腿才看得见，mock 档全绿。仓里的唯一闸是
 * `ensurePrivacyAuthorized()`（utils/privacy），F-4.4 实测 10 页在用、但只有 2 个判点文件。
 * R7-C 建门实测（2026-11-01）：**9 个媒体 API 调用文件全部在调用点之前有守卫** ⇒ 本门
 * 以零基线装门（没有「已知缺守卫」存量；若未来出现，先修页面，实在修不了才入册写理由）。</p>
 *
 * <p>判据（源码顺序，静态可判）：同一文件里每个 `uni.<媒体API>(` 调用点之前必须出现
 * `ensurePrivacyAuthorized(`。「之前」按字符位置——微信隐私 API 是运行时闸，守卫必须
 * 先于取材动作被求值（await 与否不影响顺序不变量：调用出现在文本后面就是后求值）。</p>
 */

const CLIENT_SRC = resolve(__dirname, "..");
const MEDIA_API = /uni\.(chooseImage|chooseMedia|uploadFile|compressImage)\s*\(/gu;
const GUARD = /ensurePrivacyAuthorized\s*\(/gu;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "tests") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".vue")) acc.push(full);
  }
  return acc;
}

/** 纯函数：一份源码里所有「媒体 API 调用点之前没有守卫」的违规（供真扫描与夹具共用） */
function violationsOf(src: string): string[] {
  const guardAt: number[] = [];
  for (const m of src.matchAll(GUARD)) guardAt.push(m.index ?? -1);
  const out: string[] = [];
  for (const m of src.matchAll(MEDIA_API)) {
    const at = m.index ?? -1;
    if (!guardAt.some((g) => g >= 0 && g < at)) {
      out.push(m[1]);
    }
  }
  return out;
}

describe("隐私授权前置门：媒体取材 API 之前必须有 ensurePrivacyAuthorized", () => {
  it("判点自证（夹具）：守卫在前=绿，守卫在后/缺失=红，无媒体调用=空", () => {
    expect(violationsOf("await ensurePrivacyAuthorized(); uni.chooseImage({})")).toEqual([]);
    expect(violationsOf("uni.chooseImage({}); ensurePrivacyAuthorized();")).toEqual(["chooseImage"]);
    expect(violationsOf("uni.uploadFile({ url: 1 })")).toEqual(["uploadFile"]);
    expect(violationsOf("uni.compressImage({})")).toEqual(["compressImage"]);
    expect(violationsOf("ensurePrivacyAuthorized(); uni.chooseMedia({})")).toEqual([]);
    expect(violationsOf("console.log('no media api')")).toEqual([]);
  });

  it("全仓 .vue：每个媒体 API 调用点之前都有守卫（零基线，出现缺守卫即红）", () => {
    const offenders: string[] = [];
    let callers = 0;
    for (const abs of walk(CLIENT_SRC)) {
      const src = readFileSync(abs, "utf8");
      if (!MEDIA_API.test(src)) {
        MEDIA_API.lastIndex = 0;
        continue;
      }
      MEDIA_API.lastIndex = 0;
      callers++;
      const rel = relative(CLIENT_SRC, abs).split(/[\\/]/u).join("/");
      const bad = violationsOf(src);
      if (bad.length) offenders.push(`${rel} :: ${bad.join(",")} 调用点之前没有 ensurePrivacyAuthorized`);
    }
    expect(
      offenders,
      `这些文件的媒体取材 API 缺隐私授权前置（微信端会静默失败/报 112）：\n${offenders.join("\n")}`,
    ).toEqual([]);
    expect(callers, `只有 ${callers} 个文件在调媒体 API（R7-C 建门实测 9）——扫描器或调用面塌了`).toBeGreaterThanOrEqual(9);
  });
});
