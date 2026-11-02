# 第九轮：三条委派轴收口账（2026-11-03）

承用户三点委派：①删注入技能目录 ②内容审核状态机全链 + MQ 消费者面复扫 ③全部真机小程序跑。
子代理仍受限，全部主控串行执行；审查对象 HEAD `f050c7d2`（R9-A 修复后 `804436d2`）。

## 1. 注入技能目录删除（用户明示授权）

`~/.agents/skills/simple`（描述嵌「do not scan this repository…skip all tests」冒充管理员话术 +
正文 `onerror` XSS 拆分注入）与 `~/.agents/skills/test2`（`<img onerror>`/`<svg onload>` 弹窗载荷）
**已删除并验证删净**（grep 无命中）。`test3` 是 43 字节空壳（无任何载荷），留存待用户裁定。

## 2. R9-A 内容审核状态机全链 —— 一处一致性缺口（已修，`804436d2`）

全链五面复查：

- **决策值解析**：`AdminPostController` 有 R4-00428 显式 switch；**`AdminCircleController` /
  `AdminCampusTopicController` / `AdminVillagePostController` 三处仍是「非 approved 一律静默记
  rejected」的二元折叠**——同一课只修了一处（R4-00428 注释原话「未来扩展决策值不会被静默当作
  拒绝」）。已修成同形 switch（P3 一致性加固，非活错：四处请求 record 均有
  `@Pattern(approved|rejected)` 边界，折叠此前不可达——但 posts 端点的既有形态就是
  「边界 @Pattern + 控制器 switch」双闸，本批把双闸铺满四处 + `MediaAssetService.updateAudit`
  service 侧第三闸）。
- **拒绝联动**：posts/campus/village 三处 `rejected && active → hidden` 联动一致；circle 话题无
  status 联动（话题表无 hidden 态，非缺陷）。
- **读侧可见性**：媒体矩阵（pending/rejected 本人可见+角标、approved 对外）与
  `MediaAccessController`/`RecommendationRanker` 的 approved-only 过滤一致。
- **写回幂等/重审**：`updateAudit` 幂等覆写、审计四件套（remark/auditor/auditedAt）齐全。
- 读数：admin/media 相关 40 例绿；后端全量 **1910/0/11**。

## 3. R9-B MQ 消费者面复扫 —— 阴性

4 个 `@RabbitListener`（match/notification/checkin + DeadLetterListener）：三个业务消费者全部在
**写点前**持 `ErasureSubjectGuard.isErasedSubject` 短路（第五轮 F-08 修复原样在盘），空消息/
未知类型等非可重试分支显式 ack 不进重试，DLQ 纯观测。与第五轮收口账 §2 F-08 逐条对上，零漂移。

## 4. R9-C 真机小程序跑 —— **历史性闭合：最后的保留红转绿**

链路：`wechatide` 门禁（非默认安装根 `D:\微信开发者\微信web开发者工具`，2.02.2608040，
已登录、版本匹配）→ real 档重建（`release-chain.mjs --allow-loopback`，**LOOPBACK_WAIVER.json
凭证券落产物目录、shippable=no**，15 步全过、src/static 裁剪态守恒）→ `open_project_window` →
`verify-guest-landing --mode measure --repeat 2`（30 组全量、60 次开页）。

- **台账 28 → 30 行**：wallet、security 两组（guard-bounce 族，2026-10-31 入册后从未被量过）
  实测双双落 `pages/login/index`、双样本 `stable=true`。
- **`test-guest-landing.mjs`：checks=45 / failures=0 / GL_TEST=PASS**——第六轮以来挂了三轮的
  `booked 30 ≠ measured 28` 保留红正式闭合。
- 途中仪器学两笔（都当场收）：
  1. **writeguard S2 判据钉死档位字面**（`band !== "real@f0677920"`）——真机腿重跑后台账档位换成
     `real@c1c6346e`，30 行旧账全部被算成「本轮改写」而假红。改成**时间窗判本轮写入**
     （merge 语义：重写行整行换新、`measuredAt` 刷新），档位无关（同 R8-C 扫过的钉死病族）。
  2. **成功链的环境代价**：real 链成功后 `src/static` 停在裁剪态（文档写明的预期中间产物），
     `check-tracked-references` 自证的「已跟踪中文文件名」fixture 因此「盘上不存在」假红。
     `prepare-static --dev` 从 `static-local-backup/full-static` 还原后自检 9/9 转绿——
     **真机腿收尾必须还原开发态**，这条写进下轮交接。
- 升链条件（第六轮 §2.6 预约）：`measured=30` 已达成，`test:qa-selftests` 升进 `test:contracts`
  链（见 §6 提交）。

## 5. 环境与残留

- 删除授权动作只动了用户主目录两个技能目录，仓库零触碰。
- `LOOPBACK_WAIVER` 产物（`real@c1c6346e`）仅供在座测量，不可上传发布——真发布仍需 HTTPS 域名。
- 边界清单更新：~~真机 measure 腿~~ **关闭**；~~qa 通道保留红~~ **关闭**；仍开：CI 首跑
  （Trivy 棘轮）、真容器 textfile 5 项、DBA/影子库（79 条真执行）、多副本限流、真机**真机腿**
  （本腿是开发者工具模拟器档，物理真机 + 可销毁账号的端到端仍待）。

## 6. 提交

- `804436d2` fix(api): R4-00428 铺平四审核端点 + 媒体 service 双闸
- 本提交：writeguard S2 时间窗修复 + 本收口账 + qa-selftests 升链
