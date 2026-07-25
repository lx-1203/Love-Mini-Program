# 寻觅/匹配界面美化优化 - 实现任务清单

## 并行策略

Phase 1 (CardSwiper) 和 Phase 2 (MatchGuideOverlay) ✅ 已并行完成
Phase 3 (CardDetailOverlay) ✅ 已完成

---

### Phase 1: CardSwiper 核心美化 (P0+P1) ✅

**文件**: `apps/client/src/components/discover/CardSwiper.vue`

- [x] 1.1 卡片遮罩减淡：`.card__overlay` 渐变从 72%→45% 且高度从 72%→55%
- [x] 1.2 移除彩色 chip 行 (`.card__key-info`)：删除收入/性格/社交圈 3 个 chip
- [x] 1.3 移除 campus-tag 行 (`.card__campus-tags`)：删除同校/同专业/匹配度% tag
- [x] 1.4 新增匹配度右上角角标：在视频角标同级添加 match-badge
- [x] 1.5 统一 tag-pill 色彩：移除 4n+1/2/3/4 色彩编码，统一为白色半透明
- [x] 1.6 操作按钮比例优化：reject 112→104, super 100→88, like 136→120 + 发光阴影
- [x] 1.7 卡片内容区样式微调：间距调整、bio 默认 1 行

### Phase 2: MatchGuideOverlay 品牌色迁移 (P3) ✅

**文件**: `apps/client/src/components/social/MatchGuideOverlay.vue`

- [x] 2.1 主要按钮品牌色替换：`#5B7FFF`→`var(--c-brand-500)` + shadow 绿
- [x] 2.2 破冰话题/文字色替换：topic chip 蓝色 → 品牌绿, text `#4C6EF5`→`var(--c-brand-600)`
- [x] 2.3 头像占位 shadow 令牌化：`rgba(91,127,255,0.15)`→`rgba(63,207,142,0.15)`
- [x] 2.4 中性色令牌化：所有 `#F1F5F9`/`#E2E8F0`/`#64748B`/`#ffffff` → CSS 变量
- [x] 2.5 ghost 按钮状态色替换：`:active` 色 `#5B7FFF`→`var(--c-brand-500)`
- [x] 2.6 z-index 令牌化：`1000`→`500`

### Phase 3: CardDetailOverlay 对齐 (P1) ✅

**文件**: `apps/client/src/components/discover/CardDetailOverlay.vue`

- [x] 3.1 Hero 渐变遮罩与 CardSwiper 同步：使用相同的柔和渐变值
- [x] 3.2 detail-tag 颜色合理（保持现有令牌不变，无需改动）

### Phase 4: 验证 ✅

- [x] 4.1 视觉验证：检查 CardSwiper 卡片信息区简洁，遮罩明亮
- [x] 4.2 色彩验证：所有 chip/tag 统一为白色半透明风格
- [x] 4.3 MatchGuideOverlay 验证：蓝→绿迁移完整
- [x] 4.4 接口验证：所有组件 props/emits 未变更
- [x] 4.5 类型检查：无新增类型错误（预存错误非本次改动引入）
