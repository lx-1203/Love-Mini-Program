# 本轮改向时挂起的条目（parked，不关闭）

本轮靶子由用户改写（从「VI34 一条判据的配方」改成「整个小程序逐页真机保真 + 至少三轮修复」）。
下面这些条目**原样保留、状态不改、不销账**，只登记「本轮没在做它们」以及为什么。
所有计数都是用**消费方自己的谓词**现数的，不是我抄散文数字。

| 项 | 出处 | 现数 | 本轮状态 |
|---|---|---|---|
| 开放行 openRows | `openrows-blockers-v38.json` → `openRowCount` | **48** | 保留（本轮新增的保真缺陷另立册，不并进这 48 行） |
| 待裁条目 status=open | `decisions-v38.md` 块内 `^\s*RULING id=` + `status=open` | **28**（块内 RULING 行共 44） | 保留，未裁 |
| 其中 half_closed / closed | 同上块尾行 `PENDING_RULINGS_END` | 7 / 9 | 不动 |
| 覆盖欠账 | 同上文件 `coverageDebt`，band=`real@f0677920` | uncovered 5 ｜ voided 4 ｜ expired 1 | 不动（本轮帧只落 `tmp/qa/frames`，不喂 exec 台账，覆盖账不可能被像素虚增） |
| 行阻塞分布 | `blockers` | reverify 18 ｜ code 16 ｜ decision 5 ｜ probe 3 ｜ unverified 2 ｜ UNCLASSIFIED 2 ｜ backend 1 ｜ frame 1 | 不动 |

## 本轮顺手查出的一条溯源缺陷（要修，但不属保真范围）

**待裁菜单少印一条 open 条目。** 名册 `status=open` 共 28 条，编号
`decisions#30 … decisions#69`；而 `ruling-menu-v38.md` 只渲染 №30–№68（全文 `№69` 命中 **0** 次，
标题自述也是「27 条」）。少的那条是：

```
RULING id=decisions#69 status=open
title=Q1（RESHOOT-CREDIT）守卫弹回造成的 FAILED 算不算量到
options=(a) 接受：FAILED 也是 JUDGED，弹回本身是被量到的产品事实，PC06/VB10 继续抵账（现 COVERED=198）
        |(b) 不接受：这两行退回未取证并删除该腿目录（回到 196/3）
        |(c) 接受但分档：抵账照计，行上另标 guard-bounce，使绿不被读成功能已验
```

后果不是数字难看：**这条恰好是要用户拍的 Q1**，菜单没把它送到用户面前，用户就没有裁到它的可能；
而覆盖账上那 2 行仍在按 (a) 的口径抵着 COVERED。与本表 #26（Q1(c) 重做：把 guard-bounce 标记接到认领路径
并配能红的负例）是同一条欠账的两个面：菜单漏印 ⇒ 裁不到；未接认领路径 ⇒ 裁了也落不下去。

修法（留给下一程，本轮不顺手改，因为改菜单渲染会重排用户已答过的编号）：`emit-round-bill` 的菜单渲染
谓词与名册 `status=open` 的行数做一次守恒比对（`菜单打印数 == 名册 open 数`，不等就判红并点名缺的 id）。

## 任务清单里挂起的三条

- **#11 反馈工单页在后台导航里被隐藏**：属产品方向，需用户拍；本轮保真审计会在 §4 目标功能清单里
  如实标注该页在小程序侧/后台侧的可见性事实，但**不擅自合并或改动导航**。
- **#26 Q1(c) 重做**：见上一条（与 `decisions#69` 同一条欠账）。
- **#27 VI34 七态前置配方**：原计划。本轮取景会对「圈子/广场」页拍到真实状态，
  但**七态注入（空态/Disabled/错误态）不属保真取景**，配方那条腿仍未接进任何载具
  （`--recipes` 在两个载具里点名数实测为 0）。条目原样留着。

## 用户长期约束（本轮同样遵守，逐条）

不合并并存的两个发布页；不开会员/showcase 旗标；不把回复长度上限抬到服务端值；
不动 11 个 CRC32 不符的历史迁移；不删任何 `.bak-20261014-rot`；不做 repo-wide restore 或 broad add；
设备腿证据件永久 untracked；未经明说不 push（push 前先做一轮 security 扫描）；
凭据只回显长度/前缀，绝不打印值；DB 写必须先备份 + ROLLBACK 预演。

本轮已按约执行的两处实例：`prune` 删 64 个文件前先 `cp -a` 到 `archive/prune-backup/real-<stamp>/`；
被我误触发的 plan 覆写的跟踪证据件先留 `.pre-import-accident-*.bak` 再**逐文件**从 HEAD 恢复，没有做目录级 restore。
