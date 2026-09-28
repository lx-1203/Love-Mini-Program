# 需你拍板的事（v3.3 续作轮，2026-09-29 02:51 落）

这一轮把所有能自己判的都判了，下面这些**不是一时没法子**，而是按项目铁律必须由你决定：改判据、改令牌值、删数据、接受"证据绑采集机"这四类都是政策选择，我不替你写。每条给了出处和可选项。

## 1. `--r-lg` 令牌值与判据正面冲突
`MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004` 要求把 `border-radius` 从 16 改成 `--r-lg`，但 `--r-lg` 实值是 20rpx，照判据做就违反判据。出处：round7-final-report §3.3。
- 选 A：改判据，让它指一个实值为 16rpx 的令牌。
- 选 B：改令牌值（会影响所有用 `--r-lg` 的地方，不只这一处）。
- 现状：这条判据我扣住没动，`已修复` 与 `已修复待复验` 都没给它。

## 2. `--c-text-inverse` 与 `--c-bg-container` 浅色值完全相同
`design-variables.scss:108/121`、`tokens.scss:235/244` 两组值相同，导致相关判据逐像素不可判。出处：round7-final-report §3.6。
- 选 A：收敛令牌（承认这两个是同一个东西，删掉一条判据）。
- 选 B：把其中一个浅色值改掉，让判据可判（会改视觉）。
- 撞上这族的在册行：`MP-R2VIS-PAGES-MESSAGES-INDEX-001`。本轮复验员实测两色曼哈顿距离仅 22，且与在册契约 `MP-R1-PAGES-MESSAGES-INDEX-106`（消息页整页白底）正面冲突，所以该行**停在 `已修复待复验` 没往下走**。

## 3. `MP-R2-PAGES-MESSAGES-INDEX-002` 判据与已生效裁定只能动一个
组件 `:16-32` 与 `zh-CN.ts:681-685` 都记了"否计数不该出现"，但 mock 构建下 messages 路由根本不挂该组件。出处：round7-final-report §3.5。
- 选 A：改判据（承认 mock 档判不了，换成真实档判点）。
- 选 B：改裁定（让该组件在 mock 下也挂上）。

## 4. AppShell 的左右内距到底是 28rpx 还是 32rpx
`MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001` 本轮被复验员打开源码核对：**它根本没修**（AppShell 仍是 `0 28rpx`），而 `-005` 那条已经裁过 32rpx。它台账上挂着"需帧复验（T5）"是旧措辞，不是欠帧。出处：`.zcode/tmp/lane-recheck/rows.json`。
- 选 A：按 -005 的裁定改成 32rpx（实现刀，我下一轮就能做）。
- 选 B：推翻 -005，保留 28rpx，并改 -005 的判据。
- 我停在原地：没落账也没改码，等你选。

## 5. 帧像素要不要长期可查
`.gitignore:68` 是 `*.png`，所以所有报告里写的帧路径只在采集机可解析，干净 clone 一条都打不开。本轮新出帧还有个具体坑：**DevTools 的截图通道回来的字节是 JPEG，却挂在 `.png` 文件名上**，任何 sniff PNG magic 的检查都会被骗。出处：round7-final-report §3.2、`.zcode/tmp/lane-devtools/status.json`。
- 选 A：进 Git LFS。
- 选 B：包外归档（报告里留 hash 指纹，不留图）。
- 选 C：明确接受"证据绑定采集机"，并在报告模板里写死这句话。

## 6. 各轮写进库的测试数据要不要清
`posts=270 / comments=1238`，其中本轮 G8 又自增了 `posts.id=270`、`comments.id=1238`、`campus_topics.id=299`、`campus_replies.id=31`；每跑一次 G8 就 +1。默认"保留"已按你的授权落地（`inventory-g8-test-data.mjs` + `test-data-cleanup.sql`，后者默认 ROLLBACK 且表名未实名替换前删不动）。出处：round7-final-report §3.1。
- 悬着的不是"留不留"，是"要不要清"：那需要人先对一遍 schema 表名。
- 连带后果：`MP-R2-PAGES-MESSAGES-INDEX-014`（未取证）问的就是"指定会话的 `last_message_preview` 有没有外露 QA 残留文案"。要它不出现，得先撤销"保留"这条裁定。所以这行我**没有**替你关掉。

## 7. `village-publish-001` 的提示元素与文案缺设计依据
台账状态是 `未取证/需裁决`：判据口径未定（提示元素与文案没有设计依据，两页字数阈值语义分歧属产品选择）。出处：`reports/audit/round-6/issue-matrix.md` 该行处置列。
- 需要你定：字数阈值按哪一页的语义，以及提示文案以哪张设计稿为准。

## 8. 几百个非 png 的文本 dump 要不要入库
`reports/screenshots/round-2-interact`（258 个 wxml 文本）、`round-6-interact`（340 个）、`round-2-tour`（3 个日志）现在整体未跟踪。提交它们是可选项不是必须项，一次涉及几百个文件。出处：round7-final-report §3.2 末段。

## 9. 高 dpr 机型档的巡检帧要不要补
现有全库帧最大竖屏 459×1012（早期 56 张），近期各档 378×814，**没有一行真实档欠账以高 dpr 为前置**（本轮 UI 复验员逐字复制后 grep 0 命中）；高 dpr 缺口只绑在 `MP-R2VIS-TMP-TOUR-R2-004` 这一条待修复上。出处：`.zcode/tmp/lane-uicov/result.json`。
- 选 A：加一档高 dpr 设备配置，重拍 `HOME-005` 与 `TMP-TOUR-R2-004`（这两条现在即使通道全活也判不了）。
- 选 B：接受这两条长期 `NOT_SHOOTABLE`，把它们从待办改成免检并记明理由。

## 10. 主包体积超微信上限，需要你定怎么瘦
本轮实测（体积车道，逐字节复算与门禁自报一致）：
- 被测物是 `apps/client/dist/build/mp-weixin`，它的 `env.js` 自证 `DEV:!1、PROD:!0、MODE:"mp-weixin-mock"` —— 也就是**mock 料的生产编译**，不是 dev 包。`verify-package-size` 那句"dev 构建豁免"是错名，豁免实际来自调用方挂的 `--allow-mock` 旗号（同一份字节：挂旗 exit 0，去旗 exit 1，所以门本身能红、不是自我放行）。
- 按发布形态的保留规则 dry-run 重建：主包约 **2.59MB**（若按 src 引用图分支统计 3.42MB），微信上限 2.00MB ⇒ **超约 0.59MB（+29%）**；`prune-unreferenced-static` 只能再删 0 字节，2.59 已是紧上界。
- 现在还能读到的是装饰图那类本地 raw 引用：头注写"约 7.7MB"，实测该目录 26.31MB，差 3 倍多，说明瘦身机制生效但还差最后约 1.23MB 的本地引用没断。
- 盘上另有 `mp-weixin-real`（27.67/28.71MB），但它跳过 `prepare-static --real` 与 prune，**不代表发布形态**，不能拿它定档。

需要你在三条路里选一条：
- 选 A：继续瘦身（把剩下约 1.23MB 的本地 raw 静态引用改成按需/远程），目标是发布形态主包压进 2.00MB。
- 选 B：承认真包就是超的，改分包结构（把页面挪进 subPackages），这是改架构不是改图片。
- 选 C：接受"这套产物不能直接上传"，把体积门的目标改成告警而非门禁，并在发布流程里写明必须另出发布档。

我没动这条门（按 (c) 类纪律），也没替你选。另建议（待授权，非本轮范围）：把那句在两条 ⚠ 之后仍打印的"✓ 验收通过：主包/总包体积合规"改成 `PACKAGE_SIZE_RESULT=WAIVED_MOCK|PASS|FAIL` 三态，免得人和面板都把它读成合规。
