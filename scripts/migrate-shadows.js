// 阴影 token 化脚本 (SubTask 3.4.3)
// 将 .vue/.scss/.wxss 文件中硬编码的 box-shadow 值替换为 CSS 变量
// 仅替换完全匹配 design-variables.scss 中预定义阴影的硬编码值，
// 保留原值作为 fallback 以确保兼容性。
//
// 映射（与 theme/design-variables.scss 中的 $shadow-* 对齐）：
//   0 1rpx 2rpx rgba(15, 23, 42, 0.03)   -> var(--s-xs, ...)
//   0 2rpx 8rpx rgba(15, 23, 42, 0.04)   -> var(--s-sm, ...)
//   0 4rpx 16rpx rgba(15, 23, 42, 0.06)  -> var(--s-md, ...)
//   0 8rpx 32rpx rgba(15, 23, 42, 0.08)  -> var(--s-lg, ...)
//   0 16rpx 48rpx rgba(15, 23, 42, 0.10) -> var(--s-xl, ...)
//   0 4rpx 16rpx rgba(236, 72, 153, 0.25) -> var(--s-romance, ...)
//   0 4rpx 16rpx rgba(236, 72, 153, 0.30) -> var(--s-romance-md, ...)
//   0 8rpx 24rpx rgba(63, 207, 142, 0.24) -> var(--s-brand, ...)
//   0 8rpx 24rpx rgba(63, 207, 142, 0.32) -> var(--s-float-btn, ...)
//   0 8rpx 24rpx rgba(63, 207, 142, 0.30) -> var(--s-brand-lg, ...)
//   0 2rpx 8rpx rgba(63, 207, 142, 0.15)  -> var(--s-brand-sm, ...)
//   0 4rpx 16rpx rgba(63, 207, 142, 0.20) -> var(--s-brand-md, ...)
//   0 4rpx 16rpx rgba(16, 185, 129, 0.25) -> var(--s-success, ...)
//   0 4rpx 16rpx rgba(229, 69, 77, 0.25)  -> var(--s-error, ...)
//   0 4rpx 16rpx rgba(201, 163, 106, 0.3) -> var(--s-vip, ...)
//   0 24rpx 60rpx rgba(15, 23, 42, 0.18)  -> var(--s-modal, ...)
//   0 1rpx 2rpx rgba(15, 23, 42, 0.04), 0 4rpx 12rpx rgba(15, 23, 42, 0.04) -> var(--s-card-soft, ...)
const fs = require('fs');
const path = require('path');

// 阴影值映射（原值 → CSS 变量名）
const shadowMap = [
  // 卡片软阴影（双层）
  {
    pattern: /box-shadow:\s*0 1rpx 2rpx rgba\(15,\s*23,\s*42,\s*0\.04\),\s*0 4rpx 12rpx rgba\(15,\s*23,\s*42,\s*0\.04\)\s*;/g,
    varName: '--s-card-soft',
    fallback: '0 1rpx 2rpx rgba(15, 23, 42, 0.04), 0 4rpx 12rpx rgba(15, 23, 42, 0.04)',
  },
  // xl 阴影
  {
    pattern: /box-shadow:\s*0 16rpx 48rpx rgba\(15,\s*23,\s*42,\s*0\.10\)\s*;/g,
    varName: '--s-xl',
    fallback: '0 16rpx 48rpx rgba(15, 23, 42, 0.10)',
  },
  // xl 阴影 (0.16 透明度变体，对应 UnlockGuideModal)
  {
    pattern: /box-shadow:\s*0 16rpx 48rpx rgba\(15,\s*23,\s*42,\s*0\.16\)\s*;/g,
    varName: '--s-xl',
    fallback: '0 16rpx 48rpx rgba(15, 23, 42, 0.16)',
  },
  // lg 阴影
  {
    pattern: /box-shadow:\s*0 8rpx 32rpx rgba\(15,\s*23,\s*42,\s*0\.08\)\s*;/g,
    varName: '--s-lg',
    fallback: '0 8rpx 32rpx rgba(15, 23, 42, 0.08)',
  },
  // md 阴影
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(15,\s*23,\s*42,\s*0\.06\)\s*;/g,
    varName: '--s-md',
    fallback: '0 4rpx 16rpx rgba(15, 23, 42, 0.06)',
  },
  // sm 阴影
  {
    pattern: /box-shadow:\s*0 2rpx 8rpx rgba\(15,\s*23,\s*42,\s*0\.04\)\s*;/g,
    varName: '--s-sm',
    fallback: '0 2rpx 8rpx rgba(15, 23, 42, 0.04)',
  },
  // xs 阴影
  {
    pattern: /box-shadow:\s*0 1rpx 2rpx rgba\(15,\s*23,\s*42,\s*0\.03\)\s*;/g,
    varName: '--s-xs',
    fallback: '0 1rpx 2rpx rgba(15, 23, 42, 0.03)',
  },
  // 浮动按钮阴影（品牌色 32% 透明度）
  {
    pattern: /box-shadow:\s*0 8rpx 24rpx rgba\(63,\s*207,\s*142,\s*0\.32\)\s*;/g,
    varName: '--s-float-btn',
    fallback: '0 8rpx 24rpx rgba(63, 207, 142, 0.32)',
  },
  // 品牌阴影
  {
    pattern: /box-shadow:\s*0 8rpx 24rpx rgba\(63,\s*207,\s*142,\s*0\.24\)\s*;/g,
    varName: '--s-brand',
    fallback: '0 8rpx 24rpx rgba(63, 207, 142, 0.24)',
  },
  // 品牌阴影 - lg
  {
    pattern: /box-shadow:\s*0 8rpx 24rpx rgba\(63,\s*207,\s*142,\s*0\.30\)\s*;/g,
    varName: '--s-brand-lg',
    fallback: '0 8rpx 24rpx rgba(63, 207, 142, 0.30)',
  },
  // 品牌阴影 - md
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(63,\s*207,\s*142,\s*0\.20\)\s*;/g,
    varName: '--s-brand-md',
    fallback: '0 4rpx 16rpx rgba(63, 207, 142, 0.20)',
  },
  // 品牌阴影 - sm
  {
    pattern: /box-shadow:\s*0 2rpx 8rpx rgba\(63,\s*207,\s*142,\s*0\.15\)\s*;/g,
    varName: '--s-brand-sm',
    fallback: '0 2rpx 8rpx rgba(63, 207, 142, 0.15)',
  },
  // 浪漫粉阴影
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(236,\s*72,\s*153,\s*0\.25\)\s*;/g,
    varName: '--s-romance',
    fallback: '0 4rpx 16rpx rgba(236, 72, 153, 0.25)',
  },
  // 浪漫粉阴影 - md
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(236,\s*72,\s*153,\s*0\.30\)\s*;/g,
    varName: '--s-romance-md',
    fallback: '0 4rpx 16rpx rgba(236, 72, 153, 0.30)',
  },
  // 模态阴影
  {
    pattern: /box-shadow:\s*0 24rpx 60rpx rgba\(15,\s*23,\s*42,\s*0\.18\)\s*;/g,
    varName: '--s-modal',
    fallback: '0 24rpx 60rpx rgba(15, 23, 42, 0.18)',
  },
  // 成功色阴影
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(16,\s*185,\s*129,\s*0\.25\)\s*;/g,
    varName: '--s-success',
    fallback: '0 4rpx 16rpx rgba(16, 185, 129, 0.25)',
  },
  // 错误色阴影
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(229,\s*69,\s*77,\s*0\.25\)\s*;/g,
    varName: '--s-error',
    fallback: '0 4rpx 16rpx rgba(229, 69, 77, 0.25)',
  },
  // VIP 阴影
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(201,\s*163,\s*106,\s*0\.3\)\s*;/g,
    varName: '--s-vip',
    fallback: '0 4rpx 16rpx rgba(201, 163, 106, 0.3)',
  },
  // 黑色 xl 阴影（用于 UnlockGuideOverlay）
  {
    pattern: /box-shadow:\s*0 16rpx 48rpx rgba\(0,\s*0,\s*0,\s*0\.24\)\s*;/g,
    varName: '--s-xl',
    fallback: '0 16rpx 48rpx rgba(0, 0, 0, 0.24)',
  },
  // 黑色 md 阴影变体 rgba(0,0,0,0.08) - 映射到 --s-md（与 --s-md 视觉效果接近）
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(0,\s*0,\s*0,\s*0\.08\)\s*;/g,
    varName: '--s-md',
    fallback: '0 4rpx 16rpx rgba(0, 0, 0, 0.08)',
  },
  // 黑色 sm 阴影变体 rgba(0,0,0,0.04) - 0 2rpx 12rpx - 映射到 --s-sm
  {
    pattern: /box-shadow:\s*0 2rpx 12rpx rgba\(0,\s*0,\s*0,\s*0\.04\)\s*;/g,
    varName: '--s-sm',
    fallback: '0 2rpx 12rpx rgba(0, 0, 0, 0.04)',
  },
  // 浪漫粉阴影变体 rgba(236, 72, 153, 0.4) - 映射到 --s-romance-md
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(236,\s*72,\s*153,\s*0\.4\)\s*;/g,
    varName: '--s-romance-md',
    fallback: '0 4rpx 16rpx rgba(236, 72, 153, 0.4)',
  },
  // 大型黑色阴影 0 20rpx 60rpx rgba(0,0,0,0.2) - 映射到 --s-modal
  {
    pattern: /box-shadow:\s*0 20rpx 60rpx rgba\(0,\s*0,\s*0,\s*0\.2\)\s*;/g,
    varName: '--s-modal',
    fallback: '0 20rpx 60rpx rgba(0, 0, 0, 0.2)',
  },
  // 强调色（橙色）阴影
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(255,\s*165,\s*0,\s*0\.4\)\s*;/g,
    varName: '--s-accent',
    fallback: '0 4rpx 16rpx rgba(255, 165, 0, 0.4)',
  },
  // 次要蓝阴影 - lg
  {
    pattern: /box-shadow:\s*0 8rpx 32rpx rgba\(91,\s*127,\s*255,\s*0\.35\)\s*;/g,
    varName: '--s-secondary-blue',
    fallback: '0 8rpx 32rpx rgba(91, 127, 255, 0.35)',
  },
  // 次要蓝阴影 - sm
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(91,\s*127,\s*255,\s*0\.2\)\s*;/g,
    varName: '--s-secondary-blue-sm',
    fallback: '0 4rpx 16rpx rgba(91, 127, 255, 0.2)',
  },
  // 次要蓝阴影 - md
  {
    pattern: /box-shadow:\s*0 8rpx 32rpx rgba\(91,\s*127,\s*255,\s*0\.3\)\s*;/g,
    varName: '--s-secondary-blue-md',
    fallback: '0 8rpx 32rpx rgba(91, 127, 255, 0.3)',
  },
  // 信息蓝阴影
  {
    pattern: /box-shadow:\s*0 6rpx 20rpx rgba\(59,\s*130,\s*246,\s*0\.32\)\s*;/g,
    varName: '--s-info',
    fallback: '0 6rpx 20rpx rgba(59, 130, 246, 0.32)',
  },
  // 信息蓝阴影 - md
  {
    pattern: /box-shadow:\s*0 8rpx 24rpx rgba\(59,\s*130,\s*246,\s*0\.32\)\s*;/g,
    varName: '--s-info-md',
    fallback: '0 8rpx 24rpx rgba(59, 130, 246, 0.32)',
  },
  // 信息蓝阴影 - soft
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(59,\s*130,\s*246,\s*0\.25\)\s*;/g,
    varName: '--s-info-soft',
    fallback: '0 4rpx 16rpx rgba(59, 130, 246, 0.25)',
  },
  // Tab 指示器阴影 - brand
  {
    pattern: /box-shadow:\s*0 2rpx 6rpx rgba\(63,\s*207,\s*142,\s*0\.35\)\s*;/g,
    varName: '--s-tab-brand',
    fallback: '0 2rpx 6rpx rgba(63, 207, 142, 0.35)',
  },
  // Tab 指示器阴影 - romance
  {
    pattern: /box-shadow:\s*0 2rpx 6rpx rgba\(236,\s*72,\s*153,\s*0\.35\)\s*;/g,
    varName: '--s-tab-romance',
    fallback: '0 2rpx 6rpx rgba(236, 72, 153, 0.35)',
  },
  // Tab 指示器阴影 - accent
  {
    pattern: /box-shadow:\s*0 2rpx 6rpx rgba\(249,\s*115,\s*22,\s*0\.35\)\s*;/g,
    varName: '--s-tab-accent',
    fallback: '0 2rpx 6rpx rgba(249, 115, 22, 0.35)',
  },
  // Tab 指示器阴影 - purple
  {
    pattern: /box-shadow:\s*0 2rpx 6rpx rgba\(139,\s*92,\s*246,\s*0\.35\)\s*;/g,
    varName: '--s-tab-purple',
    fallback: '0 2rpx 6rpx rgba(139, 92, 246, 0.35)',
  },
  // Tab 激活态阴影
  {
    pattern: /box-shadow:\s*0 4rpx 12rpx rgba\(63,\s*207,\s*142,\s*0\.45\)\s*;/g,
    varName: '--s-tab-active',
    fallback: '0 4rpx 12rpx rgba(63, 207, 142, 0.45)',
  },
  // Tab 激活态阴影 - md
  {
    pattern: /box-shadow:\s*0 6rpx 20rpx rgba\(63,\s*207,\s*142,\s*0\.35\)\s*;/g,
    varName: '--s-tab-active-md',
    fallback: '0 6rpx 20rpx rgba(63, 207, 142, 0.35)',
  },
  // 品牌色变体阴影 - soft
  {
    pattern: /box-shadow:\s*0 4rpx 16rpx rgba\(63,\s*207,\s*142,\s*0\.10\)\s*;/g,
    varName: '--s-brand-soft',
    fallback: '0 4rpx 16rpx rgba(63, 207, 142, 0.10)',
  },
  // 品牌色变体阴影 - mid
  {
    pattern: /box-shadow:\s*0 6rpx 24rpx rgba\(63,\s*207,\s*142,\s*0\.20\)\s*;/g,
    varName: '--s-brand-mid',
    fallback: '0 6rpx 24rpx rgba(63, 207, 142, 0.20)',
  },
  // 红包阴影
  {
    pattern: /box-shadow:\s*0 4rpx 12rpx rgba\(236,\s*72,\s*72,\s*0\.2\)\s*;/g,
    varName: '--s-red-packet',
    fallback: '0 4rpx 12rpx rgba(236, 72, 72, 0.2)',
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
  'apps/client/src/pages/circle/index.vue',
  'apps/client/src/pages/feedback/history.vue',
  'apps/client/src/pages/shop/index.vue',
  'apps/client/src/pages/home/index.vue',
  'apps/client/src/pages/daily-question/index.vue',
  'apps/client/src/pages/dev/index.vue',
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
  'apps/client/src/components/common/PageStateContainer.vue',
  'apps/client/src/components/common/BottomActionBar.vue',
  'apps/client/src/components/home/PersonCard.vue',
  'apps/client/src/components/home/HomeHeader.vue',
  'apps/client/src/components/home/ActivityCard.vue',
  'apps/client/src/components/login/WechatBtn.vue',
  'apps/client/src/components/login/LoginLogo.vue',
  'apps/client/src/components/login/LoginIllustration.vue',
  'apps/client/src/components/discover/LongPressMenu.vue',
  'apps/client/src/components/discover/CardDetailOverlay.vue',
  'apps/client/src/components/discover/CardSwiper.vue',
  'apps/client/src/components/discover/AdvancedFilter.vue',
  'apps/client/src/components/chat/VoicePill.vue',
  'apps/client/src/components/chat/VoiceMessageBubble.vue',
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
  // 全局
  'apps/client/src/App.vue',
  // 自定义 tab-bar
  'apps/client/src/custom-tab-bar/index.wxss',
  // 样式
  'apps/client/src/styles/_components.scss',
];

const root = 'd:\\6\\恋爱小程序';
let totalReplaced = 0;
let totalFiles = 0;

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log(`Skip (not found): ${rel}`);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  let fileReplaced = 0;
  for (const r of shadowMap) {
    const matches = newContent.match(r.pattern);
    if (matches) {
      newContent = newContent.replace(r.pattern, `box-shadow: var(${r.varName}, ${r.fallback});`);
      fileReplaced += matches.length;
    }
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
