// ============================================================
// 清理双重包裹的 var() fallback
// 将 var(--token, var(--token, X)) → var(--token, X)
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "src");

const FILES = [
  "pages/village/detail.vue",
  "pages/verification/index.vue",
  "pages/circle/index.vue",
  "components/discover/CardSwiper.vue",
  "pages/campus/index.vue",
  "pages/campus/post-topic.vue",
  "pages/campus/topic-detail.vue",
  "pages/campus/certification.vue",
  "pages/circles/index.vue",
  "pages/circles/topics.vue",
  "pages/circles/topic-detail.vue",
  "pages/circles/post-topic.vue",
  "pages/discover/index.vue",
  "pages/discover/history.vue",
  "pages/profile/index.vue",
  "pages/village/index.vue",
  "pages/village/post.vue",
  "pages/village/tag-posts.vue",
  "pages/home/index.vue",
  "pages/likes/index.vue",
  "pages/messages/index.vue",
  "pages/chat/index.vue",
  "pages/chat-session/index.vue",
  "pages/vip/index.vue",
  "pages/daily-question/index.vue",
  "pages/heart-signals/index.vue",
  "pages/shop/index.vue",
  "pages/settings/index.vue",
  "pages/dev/index.vue",
  "subpackages/setup/profile/index.vue",
  "subpackages/setup/campus/index.vue",
  "subpackages/setup/recommend-pref/index.vue",
  "subpackages/setup/schedule/index.vue",
  "subpackages/discover/activities/index.vue",
  "subpackages/discover/discussions/index.vue",
  "subpackages/support/feedback/index.vue",
  "components/discover/CardDetailOverlay.vue",
  "components/discover/FilterDrawer.vue",
  "components/discover/LongPressMenu.vue",
  "components/home/ActivityScroll.vue",
  "components/home/PeopleScroll.vue",
  "components/home/HomeHeader.vue",
  "components/home/WallSection.vue",
  "components/social/WallPostCard.vue",
  "components/social/SocialProgressIndicator.vue",
  "components/chat/ChatBubble.vue",
  "components/chat/ChatItem.vue",
  "components/chat/HeartSignal.vue",
  "components/chat/IcebreakerSuggestions.vue",
  "components/common/Avatar.vue",
  "components/common/Button.vue",
  "components/common/Card.vue",
  "components/common/MatchCountChip.vue",
  "components/common/Ripple.vue",
  "components/common/SectionCard.vue",
  "components/common/Tag.vue",
  "components/layout/AppShell.vue",
  "components/layout/ChatHeader.vue",
  "App.vue",
  "uni.scss",
];

let totalFixed = 0;
let filesFixed = 0;

/**
 * 在 css 内容中查找并消除双重包裹的 var() fallback
 * 模式：var(TOKEN, var(TOKEN, X)) → var(TOKEN, X)
 * 其中 TOKEN 必须相同，X 可包含嵌套括号
 */
function dedupeVarFallback(css) {
  let fixed = 0;
  let result = css;
  // 重复运行直到没有可修复的（一次只能消除一层嵌套）
  let changed = true;
  while (changed) {
    changed = false;
    // 查找所有 var( 开始位置
    const varRe = /var\(\s*(--[\w-]+)/g;
    let m;
    const varStarts = [];
    while ((m = varRe.exec(result)) !== null) {
      varStarts.push({ tokenName: m[1], tokenEnd: m.index + m[0].length });
    }
    // 从后向前处理
    for (let i = varStarts.length - 1; i >= 0; i--) {
      const { tokenName, tokenEnd } = varStarts[i];
      // 从 tokenEnd 开始，匹配 ", var(TOKEN," 模式
      // 跳过空格
      let p = tokenEnd;
      while (p < result.length && /\s/.test(result[p])) p++;
      if (result[p] !== ",") continue;
      p++;
      while (p < result.length && /\s/.test(result[p])) p++;
      // 检查是否是 var(
      if (result.slice(p, p + 4) !== "var(") continue;
      // 提取内层 var 的 token name
      let q = p + 4;
      while (q < result.length && /\s/.test(result[q])) q++;
      const innerTokenMatch = result.slice(q).match(/^--[\w-]+/);
      if (!innerTokenMatch) continue;
      const innerToken = innerTokenMatch[0];
      if (innerToken !== tokenName) continue;
      q += innerToken.length;
      // 跳过空格
      while (q < result.length && /\s/.test(result[q])) q++;
      if (result[q] !== ",") continue;
      q++;
      while (q < result.length && /\s/.test(result[q])) q++;
      // 现在 q 指向内层 var 的 fallback 内容开始
      // 找到内层 var 的结束 ) 位置（考虑嵌套）
      let depth = 1;
      let r = q;
      while (r < result.length && depth > 0) {
        if (result[r] === "(") depth++;
        else if (result[r] === ")") depth--;
        if (depth === 0) break;
        r++;
      }
      if (depth !== 0) continue;
      // r 指向内层 var 的 )
      const innerContent = result.slice(q, r);
      // 外层 var 的 ) 应该在内层 var 的 ) 之后
      let outerEnd = r + 1;
      while (outerEnd < result.length && /\s/.test(result[outerEnd])) outerEnd++;
      if (result[outerEnd] !== ")") continue;
      // 替换：var(TOKEN, var(TOKEN, X)) → var(TOKEN, X)
      const before = result.slice(0, m.index);
      const after = result.slice(outerEnd + 1);
      // 重构：var(TOKEN, X)
      const replacement = `var(${tokenName}, ${innerContent})`;
      result = before + replacement + after;
      fixed++;
      changed = true;
      break; // 重新开始扫描，因为索引已变
    }
  }
  return { result, fixed };
}

for (const f of FILES) {
  const filePath = resolve(ROOT, f);
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (e) {
    continue;
  }
  const original = content;
  // 处理 <style> 块
  const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleFixed = 0;
  content = content.replace(styleBlockRe, (full, inner) => {
    const { result, fixed } = dedupeVarFallback(inner);
    styleFixed += fixed;
    return full.replace(inner, result);
  });
  // 处理 .scss 文件（整体）
  let scssFixed = 0;
  if (f.endsWith(".scss")) {
    const { result, fixed } = dedupeVarFallback(content);
    content = result;
    scssFixed = fixed;
  }
  const total = styleFixed + scssFixed;
  if (content !== original) {
    writeFileSync(filePath, content, "utf-8");
    filesFixed++;
    totalFixed += total;
    console.log(`  ${total.toString().padStart(4)}  ${f}`);
  }
}

console.log("");
console.log(`===== 清理统计 =====`);
console.log(`总修复数: ${totalFixed}`);
console.log(`修改文件数: ${filesFixed}`);
