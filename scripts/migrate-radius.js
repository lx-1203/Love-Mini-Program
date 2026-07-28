// 圆角 token 化脚本 (SubTask 3.4.4)
// 将 .vue/.scss/.wxss 文件中硬编码的 border-radius 值替换为 CSS 变量
// 映射（与 theme/design-variables.scss 中的 $radius-* 对齐）：
//   4rpx    -> var(--r-xs, 4rpx)
//   8rpx    -> var(--r-sm, 8rpx)
//   12rpx   -> var(--r-md, 12rpx)
//   16rpx   -> var(--r-lg, 16rpx)
//   24rpx   -> var(--r-xl, 24rpx)
//   28rpx   -> var(--r-xxl, 28rpx)
//   9999rpx -> var(--r-full, 9999rpx)
//   50%     -> var(--r-full, 50%)  // 圆形（特殊场景）
const fs = require('fs');
const path = require('path');

// 圆角值映射（从大到小排序，避免 4rpx 在 24rpx 处被截断）
const replacements = [
  { pattern: /border-radius:\s*9999rpx\s*;/g, replacement: 'border-radius: var(--r-full, 9999rpx);' },
  { pattern: /border-radius:\s*28rpx\s*;/g, replacement: 'border-radius: var(--r-xxl, 28rpx);' },
  { pattern: /border-radius:\s*24rpx\s*;/g, replacement: 'border-radius: var(--r-xl, 24rpx);' },
  { pattern: /border-radius:\s*16rpx\s*;/g, replacement: 'border-radius: var(--r-lg, 16rpx);' },
  { pattern: /border-radius:\s*12rpx\s*;/g, replacement: 'border-radius: var(--r-md, 12rpx);' },
  { pattern: /border-radius:\s*8rpx\s*;/g, replacement: 'border-radius: var(--r-sm, 8rpx);' },
  { pattern: /border-radius:\s*4rpx\s*;/g, replacement: 'border-radius: var(--r-xs, 4rpx);' },
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
  'apps/client/src/pages/circles/index.vue',
  'apps/client/src/pages/circles/topics.vue',
  'apps/client/src/pages/circles/topic-detail.vue',
  'apps/client/src/pages/circle/index.vue',
  'apps/client/src/pages/feedback/history.vue',
  'apps/client/src/pages/shop/index.vue',
  'apps/client/src/pages/home/index.vue',
  'apps/client/src/pages/daily-question/index.vue',
  'apps/client/src/pages/dev/index.vue',
  'apps/client/src/pages/heart-signals/index.vue',
  'apps/client/src/pages/likes/index.vue',
  'apps/client/src/pages/messages/index.vue',
  'apps/client/src/pages/profile/index.vue',
  'apps/client/src/pages/profile/album.vue',
  'apps/client/src/pages/profile/visitors.vue',
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
  'apps/client/src/subpackages/setup/campus/index.vue',
  'apps/client/src/subpackages/setup/schedule/index.vue',
  // 全局
  'apps/client/src/App.vue',
  // 自定义 tab-bar
  'apps/client/src/custom-tab-bar/index.wxss',
  // 样式
  'apps/client/src/styles/_components.scss',
  'apps/client/src/theme/global.scss',
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
  for (const r of replacements) {
    const matches = newContent.match(r.pattern);
    if (matches) {
      newContent = newContent.replace(r.pattern, r.replacement);
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
