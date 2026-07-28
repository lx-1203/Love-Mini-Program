// 动画时长 token 化脚本 (SubTask 3.4.5)
// 将 .vue/.scss/.wxss 文件中硬编码的动画时长（ms）替换为 CSS 变量
// 映射（与 theme/design-variables.scss 中的 --d-* 对齐）：
//   80ms    -> var(--d-instant, 80ms)
//   120ms   -> var(--d-fast, 120ms)
//   200ms   -> var(--d-normal, 200ms)
//   250ms   -> var(--d-slow, 250ms)
//   300ms   -> var(--d-fade, 300ms)
//   350ms   -> var(--d-slower, 350ms)
//   400ms   -> var(--d-bounce, 400ms)
//   600ms   -> var(--d-slowest, 600ms)
//   1500ms  -> var(--d-particle, 1500ms)
//
// 注意：仅替换 transition / animation 属性中的 ms 值，
//      避免误改 setTimeout / setInterval 等业务代码中的时长。
const fs = require('fs');
const path = require('path');

// 时长值映射（从大到小排序，避免 200ms 在 80ms 处被截断）
// 使用 \b 边界保证匹配完整数字
const replacements = [
  // 1500ms -> --d-particle
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)1500ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-particle, 1500ms)$3;',
  },
  // 600ms -> --d-slowest
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)600ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-slowest, 600ms)$3;',
  },
  // 400ms -> --d-bounce
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)400ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-bounce, 400ms)$3;',
  },
  // 350ms -> --d-slower
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)350ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-slower, 350ms)$3;',
  },
  // 300ms -> --d-fade
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)300ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-fade, 300ms)$3;',
  },
  // 250ms -> --d-slow
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)250ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-slow, 250ms)$3;',
  },
  // 200ms -> --d-normal
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)200ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-normal, 200ms)$3;',
  },
  // 120ms -> --d-fast
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)120ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-fast, 120ms)$3;',
  },
  // 80ms -> --d-instant
  {
    pattern: /(transition|animation|transition-duration|animation-duration):\s*([^;]*?\b)80ms(\b[^;]*?);/g,
    replacement: '$1: $2var(--d-instant, 80ms)$3;',
  },
];

const targets = [
  // 主包页面
  'apps/client/src/pages/vip/index.vue',
  'apps/client/src/pages/vip/bills.vue',
  'apps/client/src/pages/vip/red-packet.vue',
  'apps/client/src/pages/vip/promo-code.vue',
  'apps/client/src/pages/village/detail.vue',
  'apps/client/src/pages/village/tag-posts.vue',
  'apps/client/src/pages/village/post.vue',
  'apps/client/src/pages/village/index.vue',
  'apps/client/src/pages/campus/topic-detail.vue',
  'apps/client/src/pages/campus/index.vue',
  'apps/client/src/pages/campus/post-topic.vue',
  'apps/client/src/pages/settings/dnd.vue',
  'apps/client/src/pages/settings/index.vue',
  'apps/client/src/pages/chat/video-call.vue',
  'apps/client/src/pages/chat/red-packet.vue',
  'apps/client/src/pages/chat-session/index.vue',
  'apps/client/src/pages/verification/index.vue',
  'apps/client/src/pages/discover/history.vue',
  'apps/client/src/pages/discover/index.vue',
  'apps/client/src/pages/circles/post-topic.vue',
  'apps/client/src/pages/circles/index.vue',
  'apps/client/src/pages/circle/index.vue',
  'apps/client/src/pages/feedback/history.vue',
  'apps/client/src/pages/shop/index.vue',
  'apps/client/src/pages/home/index.vue',
  'apps/client/src/pages/daily-question/index.vue',
  'apps/client/src/pages/dev/index.vue',
  'apps/client/src/pages/heart-signals/index.vue',
  'apps/client/src/pages/profile/index.vue',
  // 组件
  'apps/client/src/components/UnlockGuideModal.vue',
  'apps/client/src/components/UnlockGuideOverlay.vue',
  'apps/client/src/components/social/MatchGuideOverlay.vue',
  'apps/client/src/components/social/SocialProgressIndicator.vue',
  'apps/client/src/components/social/WallPostCard.vue',
  'apps/client/src/components/social/PostReportDialog.vue',
  'apps/client/src/components/social/LikeBurst.vue',
  'apps/client/src/components/layout/TabBar.vue',
  'apps/client/src/components/layout/AppShell.vue',
  'apps/client/src/components/layout/ChatHeader.vue',
  'apps/client/src/components/common/UnreadBadge.vue',
  'apps/client/src/components/common/Toast.vue',
  'apps/client/src/components/common/ShareCard.vue',
  'apps/client/src/components/common/BaseTabs.vue',
  'apps/client/src/components/common/StatusState.vue',
  'apps/client/src/components/common/HeartParticles.vue',
  'apps/client/src/components/common/SectionCard.vue',
  'apps/client/src/components/common/Skeleton.vue',
  'apps/client/src/components/common/ErrorState.vue',
  'apps/client/src/components/common/PageStateContainer.vue',
  'apps/client/src/components/common/BottomActionBar.vue',
  'apps/client/src/components/common/SafeImage.vue',
  'apps/client/src/components/common/Tag.vue',
  'apps/client/src/components/common/VerificationBadge.vue',
  'apps/client/src/components/home/PersonCard.vue',
  'apps/client/src/components/home/HomeHeader.vue',
  'apps/client/src/components/home/HomeBanner.vue',
  'apps/client/src/components/home/WelcomeBanner.vue',
  'apps/client/src/components/home/ActivityCard.vue',
  'apps/client/src/components/login/WechatBtn.vue',
  'apps/client/src/components/login/PhoneBtn.vue',
  'apps/client/src/components/login/LoginLogo.vue',
  'apps/client/src/components/login/LoginIllustration.vue',
  'apps/client/src/components/discover/LongPressMenu.vue',
  'apps/client/src/components/discover/CardDetailOverlay.vue',
  'apps/client/src/components/discover/CardSwiper.vue',
  'apps/client/src/components/discover/AdvancedFilter.vue',
  'apps/client/src/components/discover/FilterDrawer.vue',
  'apps/client/src/components/chat/VoicePill.vue',
  'apps/client/src/components/chat/VoiceMessageBubble.vue',
  'apps/client/src/components/chat/VoiceRecorder.vue',
  'apps/client/src/components/chat/RedPacketBubble.vue',
  'apps/client/src/components/chat/IcebreakerSuggestions.vue',
  'apps/client/src/components/chat/HeartSignal.vue',
  'apps/client/src/components/chat/ChatItem.vue',
  'apps/client/src/components/setup/SetupProgress.vue',
  // 分包页面
  'apps/client/src/subpackages/support/feedback/index.vue',
  'apps/client/src/subpackages/discover/discussions/index.vue',
  'apps/client/src/subpackages/discover/activities/index.vue',
  'apps/client/src/subpackages/setup/recommend-pref/index.vue',
  'apps/client/src/subpackages/setup/profile/index.vue',
  // 全局
  'apps/client/src/App.vue',
  // 自定义 tab-bar
  'apps/client/src/custom-tab-bar/index.wxss',
  // 样式
  'apps/client/src/styles/_components.scss',
  'apps/client/src/theme/global.scss',
  'apps/client/src/uni.scss',
];

const root = 'd:\\6\\恋爱小程序';
let totalReplaced = 0;
let totalFiles = 0;

/**
 * 检查给定字符串中指定位置的 ms 值是否已经位于 var(...) 内部。
 * 通过向前查找最近的 var( 与 ) 数量判断。
 */
function isInsideVar(content, endIndex) {
  // endIndex 是 ms 值结束位置（不含），向前查找
  let varOpen = 0;
  let varClose = 0;
  for (let i = endIndex - 1; i >= 0; i--) {
    const ch = content[i];
    if (ch === '(') {
      // 检查前三个字符是否为 'var'
      const prefix = content.substring(Math.max(0, i - 3), i);
      if (prefix === 'var') {
        varOpen++;
      } else {
        // 其他类型的括号（如 cubic-bezier()），跳过
        varOpen++;
      }
    } else if (ch === ')') {
      varClose++;
    }
    if (varOpen > varClose) {
      // 在某个括号内部
      // 进一步检查是否在 var() 内部
      let varCount = 0;
      let closeCount = 0;
      for (let j = i; j < endIndex; j++) {
        const c = content[j];
        if (c === '(') {
          const p = content.substring(Math.max(0, j - 3), j);
          if (p === 'var') varCount++;
        } else if (c === ')') {
          closeCount++;
        }
      }
      return varCount > closeCount;
    }
  }
  return false;
}

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log(`Skip (not found): ${rel}`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  let fileReplaced = 0;

  // 对每个时长值进行替换：使用函数回调判断是否在 var() 内
  for (const [value, varName] of [
    ['1500ms', '--d-particle'],
    ['600ms', '--d-slowest'],
    ['400ms', '--d-bounce'],
    ['350ms', '--d-slower'],
    ['300ms', '--d-fade'],
    ['250ms', '--d-slow'],
    ['200ms', '--d-normal'],
    ['120ms', '--d-fast'],
    ['80ms', '--d-instant'],
  ]) {
    // 仅在 transition / animation 上下文中替换
    // 使用多行匹配，找到每个 transition / animation 声明块
    const declRegex = /(transition|animation|transition-duration|animation-duration)\s*:\s*([^;]+);/g;
    newContent = newContent.replace(declRegex, (match, prop, body) => {
      // 在 body 中替换指定 ms 值，跳过已在 var() 内的
      const valueRegex = new RegExp('\\b' + value.replace('ms', 'ms') + '\\b', 'g');
      let replacedBody = body;
      let lastIdx = 0;
      const parts = [];
      let m;
      valueRegex.lastIndex = 0;
      while ((m = valueRegex.exec(replacedBody)) !== null) {
        const absIdx = m.index;
        // 构造在原 body 中的上下文用于 isInsideVar 判断
        // 简化版：检查前面是否有未闭合的 var(
        let varOpen = 0;
        let varClose = 0;
        for (let i = absIdx - 1; i >= 0; i--) {
          if (replacedBody[i] === '(') {
            const prefix = replacedBody.substring(Math.max(0, i - 3), i);
            if (prefix === 'var') varOpen++;
            else break; // 其他括号跳出
          } else if (replacedBody[i] === ')') {
            varClose++;
          } else if (replacedBody[i] === ',') {
            // 容忍 var(--xxx, 250ms) 内部的逗号
            continue;
          } else if (/\s/.test(replacedBody[i])) {
            continue;
          } else {
            break;
          }
        }
        const insideVar = varOpen > varClose;
        if (!insideVar) {
          parts.push(replacedBody.substring(lastIdx, m.index));
          parts.push(`var(${varName}, ${value})`);
          lastIdx = m.index + value.length;
          fileReplaced++;
        }
      }
      parts.push(replacedBody.substring(lastIdx));
      const newBody = parts.join('');
      return `${prop}: ${newBody};`;
    });
  }

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    totalFiles++;
    totalReplaced += fileReplaced;
    console.log(`Updated: ${rel} (${fileReplaced} replacements)`);
  }
}
console.log(`Total files updated: ${totalFiles}`);
console.log(`Total replacements: ${totalReplaced}`);
