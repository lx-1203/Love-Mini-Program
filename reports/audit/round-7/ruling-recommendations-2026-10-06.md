# §36 待拍板 13 项 —— 裁定建议书（2026-10-06）

> 性质：**建议**，不是裁定。§36 权威裁定权在项目所有者；本文按所有者要求逐条给出建议、理由与通过后的执行动作。
> 证据基线：round8-final-report、decisions-v33、2026-10-05 三路技术审计、release-size-recheck-2026-10-05。

## 总览

| 编号 | 一句话 | 建议 | 通过后执行 | 成本 |
|---|---|---|---|---|
| #1 | `--r-lg` 20rpx vs 判据 16rpx | **改判据** | 机械修判据 | 分钟级 |
| #3 | MESSAGES-INDEX-002 mock 档判不了 | **判据迁 real 带** | 机械迁移 | 一次 real 腿 |
| #6 | QA 测试数据要不要清 | **生产清，开发可留** | 跑 sanitize 脚本 | 分钟级 |
| #7 | village-publish-001 文案 0/1000 vs 500 | **以实现为准改判据** | 机械修判据 | 分钟级 |
| #10 | 主包怎么瘦 | **维持原裁定，已可闭** | 无（已复现达标） | 已完成 |
| #11 | 五组游客落地对 | **维持既定方向，补腿闭门** | 一次设备跑 | 一次设备跑 |
| #12 | round-1 144 帧定形 | **LEGACY 豁免** | 机械改门脚本 | 分钟级 |
| #24 | 要不要动 person-avatars | **不动** | 无 | 无 |
| #28 | CH22 滚动归属 | **机械修判据归属** | 机械修判据 | 分钟级 |
| #29c | 落地对 (c) 分支 | **补** | 一次腿 | 一次腿 |
| r10new#A | 两套覆盖去向账 | **门侧为唯一真值源** | 机械归并 | 分钟级 |
| r10new#C | 陈旧 worktree 清理 | **建议清，你执行**（不可逆） | 你执行 | 分钟级 |
| r10new#D | judge 无条件覆写权威判决件 | **改侧车** | 机械改脚本 | 分钟级 |

---

## 逐条建议

### decisions#1 —— `--r-lg` 令牌冲突
实值 20rpx 与判据要求 16rpx 正面冲突。二选一：A 改判据 / B 改令牌。
**建议：A 改判据。** 实现已全局按 20rpx 落地，改令牌是全站圆角视觉回归，成本高、收益为零；判据改为 20rpx 并留痕「以实现为准」。仅当设计稿确有 16rpx 依据时才反向改令牌。

### decisions#3 —— MESSAGES-INDEX-002 判据与生效裁定互斥
mock 档结构性判不了该组件，留 mock 台只会永久红。
**建议：判据迁 real 带（band change），mock 台标记 MOCK_UNJUDGEABLE 豁免。** 一次 real 腿闭掉，不再消耗每轮注意力。

### decisions#6 —— 测试数据清理（posts=270 / comments=1238，每跑一次 G8 再 +1）
**建议：分环境处置。生产/准生产必须清；开发库可保留。** 执行件已备好：`database/sanitize/prod-sanitize.sql`（事务包裹、默认 ROLLBACK、覆盖 seed_50 虚拟用户 10001-10099/20057-20099、`seed-user-*` openid、guest-demo 运行时数据、孤儿行清扫）。这是数据不可逆操作，脚本设计为默认 ROLLBACK、人工确认后 COMMIT，**由你在目标库执行**。

### decisions#7 —— village-publish-001 提示文案 0/1000 vs 实跑 500（premise=contradicted）
**建议：以实现为准改判据（500），设计依据缺失记入档案。** 若产品层想要 1000 字，另开产品需求单，不混入 QA 裁定。

### decisions#10 —— 主包瘦身 ★ 已有新证据
2026-10-05 已用发布链实测复现：**主包 1,487,318B = 1.42MB ≤ 2MB PASS**（总包 2.44MB，13 分包，`PACKAGE_SIZE_BAND=MODE:real API:real SHOWCASE:off`），见 `release-size-recheck-2026-10-05.md`。
**建议：维持你 2026-09-29 的裁定（瘦资源、不靠分包、不改判据），本项由「卡发布」转为「已闭」。** 剩余卡点不在代码：真实 HTTPS+ICP 域名（运营材料，见 `docs/wechat-submission-materials-checklist.md`）。

### decisions#11 —— 五组游客落地对
**建议：维持既定方向（5 组一律引导登录/注册，setup 两组不豁免），补一次设备跑的 booked 复测腿即闭。** 顺带闭掉红门 run-qa-selftests（其唯一红断言就挂在 #11）。方向本就是你的裁定，缺的只是执行。

### decisions#12 —— round-1 那 144 帧怎么定形
三选一：A LEGACY 豁免 / B 重跑取证 / C 接受长期红。
**建议：A。** 你已裁定 3857 项历史截图删除不入库，B 与之矛盾；C 让红门永久挂着麻痹门禁语义。给 verify-provenance-all 加 LEGACY 豁免分支、round-1 结论标注「历史证据，不可引用」。**你回「采纳」后此门代码改动可立即机械执行。**

### decisions#24 —— 要不要为体积动 person-avatars（0.953MB）
**建议：不动。** 1.42MB 新口径下余量 0.58MB，无需冒 2026-09-03/09-12 两次「头像 404」第三次复发的险；真要再瘦，走 #23 后端托管模式（改引用、不删文件）。

### decisions#28 —— CH22 滚动归属三选一
campus-hub__feed 实测确是 scroll-view，判据行号漂移属事实错误。
**建议：机械修判据，归属改到实际滚动容器。**

### decisions#29c —— 落地对 (c) 分支补不补
**建议：补。** 一次腿的成本换 26 组账的对称完整，避免落点账永久缺格引发后续对账噪音。

### r10new#A —— 两套「覆盖欠账去向账」定唯一真值源
**建议：门侧 `real-coverage-disposition.json` 为唯一真值源；面板侧 `incident-destinations-round10.json` 降级为归档。** RCD_DUAL 对账门保留到归并完成、复跑一致后再移除。

### r10new#C —— 两枚陈旧 worktree/分支清理（reasonix 8月5日 + .qoder/worktrees）
**建议：清，但这是不可逆操作，由你执行。** 步骤：`git worktree list` → 逐个 `git -C <path> status` 确认无未提交改动 → `git worktree remove <path>`；分支 `git branch -D` 前先 `git log -1` 留档 SHA。我方不代执行。

### r10new#D —— verify-evidence-holes judge 分支无条件覆写权威判决件
**建议：改侧车。** judge 输出写独立侧车文件，人工确认后并入权威判决件，消除静默覆写风险。**你回「采纳」后可立即机械执行。**

---

## 红三门与拍板的对应关系（采纳后怎么转绿）

| 红门 | 依赖拍板 | 闭门动作 | 依赖执行环境 |
|---|---|---|---|
| run-qa-selftests | #11 | 补 booked 复测腿 | 需一次真机/模拟器跑 |
| verify-provenance-all | #12-A | LEGACY 豁免代码改动 | 纯机械，可立即做 |
| verify-real-coverage | 无需拍板 | 10 条欠账：1 条 DISPATCHABLE_NOW（≈20s，可立即跑）；7 条 NEEDS_CAPABILITY（执行器补 nativeModal/networkFault/WS 子树/precondition 四类原语）；1 条 IDENTITY_IMPOSSIBLE；1 条 BAND_CHANGE | 部分需载具开发 |

## 采纳后的执行分组

- **回「采纳」即可机械执行（我来做）**：#1、#3、#7、#28 判据修正；#12-A LEGACY 豁免；r10new#D 侧车；r10new#A 归并；real-coverage 的 DISPATCHABLE_NOW 1 条。
- **需要设备/环境跑（约一起来）**：#11 booked 腿、#29c 腿、real-coverage 其余 9 条。
- **你执行（不可逆/涉真实库）**：#6 sanitize 落 COMMIT、r10new#C worktree 清理。
- **无需动作**：#10（已闭）、#24（不动）。
