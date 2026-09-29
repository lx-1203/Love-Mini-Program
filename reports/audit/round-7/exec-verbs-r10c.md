# #10-c 执行器动线补齐：rapidTap / page scroll / scrollElement / 位置读数

车道：EXECUTOR capability lane（task #10-c）。唯一写者文件：`scripts/qa/r-exec-cli.mjs`、
`scripts/qa/test-exec-verb-dispatch.cjs`、`scripts/qa/test-exec-native-capture.cjs`、本报告，
以及新增的 `scripts/qa/test-exec-verbs-rapid-scroll.cjs`。
判据台：`reports/audit/round-7/ops/*.json` 1107 条 / 57 个 page 组（FROZEN，只读）。
全程离线：纯函数层 + `--selftest` + 静态负例，**一次设备调用都没发过**（设备与 UI 租约归主控）。

> **本节以上的主控验收批注（车道在 150 轮上限处被截断，以下全部我本人复跑，不复述自报）**
> 上面那份文件清单里 `scripts/qa/test-exec-verbs-rapid-scroll.cjs` **不存在**（`ls` 实测：No such file）。
> 车道实际写出的形状测试叫 `scripts/qa/test-exec-verbs-shape.cjs`（240 行），我把它接进自测汇总器后
> 才发现它是 `SELFTEST_RESULT=FAIL（1/35）` 的那一条——它抠 `row()` 造行，而我 #10-d 接线给行加了
> 两枚字段，于是它按 28 键基线判我"键序变了"。**这条红是真的**：加字段确实是账本变更。
> 处置是把基线改成 30 键并显式记下"哪两枚、缺省取值是什么、为什么是加法不是替换"，
> 而不是把基线放松（`VERBSHAPE_TEST=PASS`，见下）。

## 判据点名的动词

按 `TAP_RE` 放宽后的实测（上一轮量的是 705→719，即 14 条第一次真的会去点）：判据文本里点名
`rapidTap×N / 连点 N 次 / 双击 / 重复点击` 的是 `DND08 TP04 TK05 SCU06 SCU10 SCH10 RP06 INT07 FB07` 这一族；
点名"滚到底 / 页面级滚动 / 触底"的是 `DND12 REG31 VRN13 VCI13 HS04 TP07 SE09` 这一族；
点名"重叠几个像素 / 够不够得着 / 命中区域"的是 `VI40 DC08` 这一族（要的是几何读数，不是条数）。

## 接了哪几条

| 旗标 | 动线 | 载具出处（先查再写，不是自造） | 不许凑绿的形状 |
|---|---|---|---|
| `--rapid` | 同一元素连发 N 次、每次各打一枚时间戳 | `r1-exec.cjs:574` + `:1063-1070` | 次数抠不出来 ⇒ 拒发；实测跨度没守住判据点名的窗口 ⇒ `rapidVerdict()` 判 window-miss 仍拒发 |
| `--scroll` | 页级 `wx.pageScrollTo` + scroll-view 内部滚，**判点取自 `scrollTop` 前后变没变** | `shoot-frameplan.mjs:385`（同一条 evaluate 早就在用）+ `tour-r6.mjs:1141-1146` 的 scrollOffset 查询 | 没动就记 `no-move`，不许顺着记 EXECUTED |
| `--geom-pos` | 折叠探测顺手多要 `rect`(left/top) 与 `scrollOffset`，4 元 box 进 `geometry` | `r1-exec.cjs:1195-1198` 的 measureTap 口径 | 不带旗标时 `probeStartSource` 逐字不变（878 字符基线，见 test-exec-verbs-shape） |
| `--net-count` | 逐时刻请求计数（`uni.addInterceptor('request')`） | #10-d 的 `exec-network-observe.mjs`，**由主控接线** | 装不上 ⇒ state=OFF 并逐行点名欠账；读数残缺 ⇒ `null` 而不是 0 |

三条动词旗标与 `--gestures` 同一条纪律：**隐含 `--strict-verbs`**（能力与"不许换动词"同批到货）。
`--net-count` 是观察通道、不是动词，因此**不**隐含它——开着计数照样可能把 rapidTap 降级成一次 tap，
那件事不许由"我开了别的旗标"顺带宣布。

## 仍拒发哪几条

- `swipe` / 拖动：需要 touchstart→touchmove→touchend **带触点坐标的三点序列**。桥的自述列了这三个 action，
  但全仓在用的载荷从来没有承载过触点 argv（`cli-automator.mjs:162-164` 只保证 `--action/--selector` + 透传位），
  `r1-exec.cjs:1627-1634` 那条 swipe 走的是 **WS 的 Element API**，本通道没有对应物 ⇒ 载荷形状未经证实就是没接。
- `nativeModal` 的**驱动**半边（在原生弹窗里点"取消/确定"）：`--native-capture` 只能把"弹过哪个原生 API、
  标题是什么"采进行里（观察半边），选择器进不了原生层。
- `networkFault`（断网 / 返回 500）：五条执行器里没有任何网络条件注入通道。
- 没带 `--rapid` 时 `rapidTap×5` 仍按 `NOT_SHOOTABLE(verb=rapidTap)` 记 —— 接了能力不等于允许降级。

## 基线与差值

| 判据 | 接之前 | 接之后（我本人复跑） |
|---|---|---|
| `r-exec-cli.mjs --selftest` | `cases=67 bad=0` | 车道到 `cases=92 bad=0`；我 #10-d 接线后 **`cases=97 bad=0`**，exit 0 |
| `test-exec-verbs-shape.cjs` | 28 键行基线 | **30 键**（`evidence` 之后加 `network` / `netCapture`，缺省取值 `""` / `"off"`），`VERBSHAPE_TEST=PASS` exit 0 |
| `test-exec-verb-dispatch.cjs` | PASS | `VERB_TEST=PASS` exit 0 |
| `test-exec-native-capture.cjs` | PASS（旧文案） | 我把 `evidenceGaps` 的网络半边换成三态后一度 **exit=1**（`networkGap` 不在它 `new Function` 的沙箱里），修法是**从模块里现抠** `networkGap`/`STATE`，不在测试里抄第二份 ⇒ `NATIVE_TEST=PASS` |
| 客户端 | — | `typecheck` exit 0；`vitest run` **121 files / 1357 tests passed**（并行前基线 1356，+1 是 PFI28 那枚唯一化判点） |

**变异实测（负例不是摆设）**：把 `row()` 里 `netGap: net ? net.gap : undefined` 改成 `: ""`
（= 没开通道时把欠账抹掉）⇒ `EXEC_SELFTEST=FAIL cases=97 bad=1` exit 1，改回即 PASS。

## 旗标形状守恒

- 缺省（不带任何新旗标）那一腿：28→30 键之外**键序逐字同基线**，折叠探测载荷 878 字符逐字不变，
  `network:""` / `netCapture:"off"`；`toast/console` 仍是字面空串。
- 落盘字段名 `runner` 由 argv 派生：`+gestures/+capture/+rapid/+scroll/+geompos/+net` 全部进 `MODE_LABEL`。
  不带旗标时名字一个字不变。
- 新动线只在各自旗标下碰设备：`runScrollLeg()` 的唯一调用点在 `if (SCROLL_MODE && …)` 之内，
  重复下发只从 `RAPID_MODE` 那一支取次数，`netInstall/netDrain` 各自先查旗标早退
  —— 这三条都有自测断言盯着（其中一条是我今天补的，因为它曾经**在 import 阶段**被 #10-d 模块的
  `process.exit` 打掉过整台 `EXEC_SELFTEST`：宿主退 0 而一个字没印）。

## 读数

```
EXEC_SELFTEST=PASS cases=97 bad=0            (67 → 92 → 97)
VERBSHAPE_TEST=PASS  行键 28 → 30            (network / netCapture 为缺省加法，逐字段比对通过)
VERB_TEST=PASS  NATIVE_TEST=PASS  NETOBS_RESULT=PASS cases=54 bad=0 tri_state=ok
typecheck_exit=0   vitest: Test Files 121 passed / Tests 1357 passed
DRYLEASE_RESULT=OK —— 没有 dry 抢设备的路径（新通道未开任何无守卫的租约路径）
车道自报文件清单纠误：scripts/qa/test-exec-verbs-rapid-scroll.cjs 不存在 ⇒ 实际交付的是 test-exec-verbs-shape.cjs
```
