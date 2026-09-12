# 2026-09-13 Round 3 严格专项审计报告

> Round 3 重点（按总控提示词 §Round 3）：真实 viewport 滚动 / fixed / safe-area / TabBar /
> 页面高度 / 长内容 / 空状态 / 点击区域 / 返回逻辑 / 状态一致性。全程 real 包 + real 后端。

## 一、专项矩阵

| 专项 | 方法 | 证据 | 结论 |
|---|---|---|---|
| 滚动到底 / TabBar 遮挡 | 兴趣圈列表 `pageScrollTo 3000` 到底 | `circles-bottom.png`：最后卡片（宠物圈）完整可见；分包页无 TabBar 属设计（有独立返回头） | ✅ 通过 |
| 超长内容渲染 | curl 发布 1000 字帖（posts id=224）→ 详情页 | `post-detail-long.png`：千字正文无溢出无破版，底部评论栏 fixed 不遮挡；列表侧 `my-post-item__summary` 3 行截断正常 | ✅ 通过 |
| 空状态 | 浏览记录页（无记录） | `my-posts-long.png`：空态插画 + 文案 + CTA「去广场逛逛」 | ✅ 通过 |
| 深层返回链 | profile → 圈子主页(15) → 话题详情(37) → back×3 | pageStack 实测三级回退逐级正确；根页多余返回为安全 no-op（不黑屏不退出） | ✅ 通过 |
| 连点/重复提交防护 | 代码 + 后端契约 | 发布提交 `if (submitting.value) return` 状态守卫（publish.vue:366）+ 后端 POST 强制 Idempotency-Key（422 契约实测）；客户端每个 POST 自动携带 idem 头（网络日志证实） | ✅ 通过 |
| 弱网/错误态 | 无法用本工具链模拟弱网（DevTools 自动化无网络限速通道）——以错误处理代码审查替代：request 层 AppApiError 统一分类、页面 catch 静默回退骨架/空态（store 惯用法已核） | 代码级 | ✅ 通过（含工具限制说明） |

## 二、Round 3 发现并修复的问题

### MP-R3-PROFILE-001（P2 · 数据展示 · 已修复回归）

- **页面**：我的（pages/profile/index）
- **截图**：`before: profile-counters-recheck.png`（我喜欢 0 / 喜欢我的 0）→ `after: profile-counters-fixed2.png`（2 / 1）
- **现象**：冷启动直达「我的」时顶栏四格恒显假 0（我喜欢/喜欢我的/访客），而 DB `likes` 表实际 2 出 1 入。
- **根因**：四格消费 `likesStore.likes/likedBy/visitors` 实时列表，但本页从不触发 `likesStore.fetchLikes()`——全仓只有消息页（messages/index.vue:193）与喜欢页（likes/index.vue 等）触发。昨晚显示 2/1 只因测试路径恰好先经过消息页把 store「焐热」。
- **修复**：profile 页首屏（token 就绪分支）与每次 onShow 轻量刷新分支均补 `void likesStore.fetchLikes().catch(() => {})`，与页内既有 refreshMyPosts/refreshMyDailies 同节奏。
- **回归**：重建 real 包（REAL_EXIT=0）+ 清编译缓存冷启 → 我喜欢 2 / 喜欢我的 1，与 DB 完全一致；我赞 0（未被赞帖）/ 访客 0（无访客）为真实语义。

### 附带澄清（非缺陷）

- 昨晚 → 今天计数 2/1 → 0/0 的「变化」并非数据丢失（DB 行未变），是 store 未加载的展示假象——正是本条修复点。

## 三、Round 3 Git

| Commit | 内容 |
|---|---|
| `34d1d318` | fix: Round-3 验收——我的页四格计数冷启动假 0 + 长文本/滚动/返回链专项取证 |
| `93169037` | docs(audit): Round-3 专项截图取证（force-add） |

## 四、独立审查

Round 3 完成后按总控提示词 §十四/§三十八 派驻独立审查 Agent（不继承主 Agent 结论、禁读既有审计报告，以 `素材/理想效果图/` 为视觉基准独立复验），报告落 `reports/audit/2026-09-13-independent/INDEPENDENT-AUDIT.md`。审查发现的问题进入 Round 4 闭环。
