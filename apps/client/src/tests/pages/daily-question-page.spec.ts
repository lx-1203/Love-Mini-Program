import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, compileScript } from "vue/compiler-sfc";

/**
 * 每日一问**页面**侧契约（静态源码判点）。
 *
 * 为什么是源码断言而不是挂载渲染：本仓页面级判点一贯走
 * `readFileSync` + `@vue/compiler-sfc` 口径（见同目录 village-post-delete.spec.ts），
 * 页面依赖 uni-app 生命周期与 uni 全局，挂载成本与假阳性都更高，而这里要钉的
 * 恰好是「守卫读的是哪个标志」这一行文本可判的事实。
 *
 * 钉的两条（第五轮 FINDING 1）：
 * 1. `loadMoreAnswers()` 的在途守卫读 `answerLoading`，**不得**回退到 `loading`。
 *    store 侧三道保险（在途标志 / 页码幂等 / 按 id 去重）已由
 *    `stores/daily-question-pagination.spec.ts` 钉住，但「页面守卫」这一半此前无人看管：
 *    把它改回 `loading.value` 全库不红 —— 而未强制的修复就是债。
 * 2. 首屏拉回答的条件读 store 顶层 `hasAnswered`（第五轮 FINDING 2 的消费端）：
 *    store 现在会把后端下发值写进顶层，页面若改成读 `todayQuestion.hasAnswered`
 *    （那个视图字段），FINDING 2 的修复就在页面上失效。
 * 3. 回答框的 `:maxlength` 绑 `MAX_ANSWER_LENGTH`，不得写回裸数字（微信端裸数字
 *    会静默截断，2026-10-31 契约轨 P2-5a 的病灶就是 500 vs 后端 2000）。
 */

const PAGE = resolve(__dirname, "../../subpackages/tools/daily-question/index.vue");
const pageSource = readFileSync(PAGE, "utf-8");

/** 取 `<script setup>` 块内容（模板不参与这里的判点）。 */
function scriptBody(): string {
  const { descriptor } = parse(pageSource);
  return descriptor.scriptSetup?.content ?? "";
}

/** 取 `loadMoreAnswers` 函数体（到下一个函数声明为止）。 */
function loadMoreAnswersBody(): string {
  const script = scriptBody();
  const start = script.indexOf("function loadMoreAnswers");
  expect(start, "页面必须存在 loadMoreAnswers 分页处理函数").toBeGreaterThan(-1);
  const rest = script.slice(start + 1);
  const nextDecl = rest.slice(1).search(/\n(?:async )?function\s+\w+/u);
  return nextDecl > 0 ? script.slice(start, start + 1 + nextDecl + 1) : script.slice(start);
}

describe("每日一问页面：分页守卫读 answerLoading（FINDING 1）", () => {
  it("SFC 仍可被 Vue 编译器解析与编译（改动没把模板/脚本改坏）", () => {
    const { descriptor, errors } = parse(pageSource);
    expect(errors).toEqual([]);
    expect(() => compileScript(descriptor, { id: "daily-question-page" })).not.toThrow();
  });

  it("loadMoreAnswers 的在途守卫读 answerLoading.value", () => {
    expect(loadMoreAnswersBody()).toContain("answerLoading.value");
  });

  it("loadMoreAnswers 不得再读今日问题的 loading.value（原缺陷的那一行）", () => {
    const body = loadMoreAnswersBody();
    // `answerLoading.value` 里含大写 L，不会被下面这条小写判据误伤；
    // 反向变异（把守卫改回 `|| loading.value`）必红。
    const withoutAnswerFlag = body.replace(/answerLoading\.value/gu, "");
    expect(withoutAnswerFlag, "分页守卫只能吃 answerLoading，不得借用 loading").not.toMatch(
      /\bloading\.value/u,
    );
  });

  it("storeToRefs 同时导出 loading 与 answerLoading（守卫换错标志会静默失效）", () => {
    expect(scriptBody()).toMatch(/const\s*\{[^}]*answerLoading[^}]*\}\s*=\s*storeToRefs/u);
  });

  it("首屏拉回答的条件读顶层 hasAnswered，而不是 todayQuestion 里的同名字段", () => {
    // FINDING 2 修复的消费端：store 顶层 hasAnswered 由后端下发值写入，页面必须读这一份。
    expect(scriptBody()).toMatch(/todayQuestion\.value\s*&&\s*hasAnswered\.value/u);
    expect(scriptBody()).not.toMatch(/todayQuestion\.value\.hasAnswered/u);
  });

  it("回答框 maxlength 绑 MAX_ANSWER_LENGTH，源码里没有裸数字上限", () => {
    expect(pageSource).toMatch(/:maxlength="MAX_ANSWER_LENGTH"/u);
    // 微信端 `<textarea maxlength="500">` 这类裸数字是静默截断的来源（契约轨 P2-5a）
    expect(pageSource).not.toMatch(/maxlength="\d+"/u);
    expect(scriptBody()).toMatch(/import\s*\{[^}]*MAX_ANSWER_LENGTH[^}]*\}\s*from/u);
  });
});
