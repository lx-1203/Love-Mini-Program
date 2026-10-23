# R15 复拍腿：已跑通（2026-10-23）＋ 设备腿冷启的正确做法

**本文取代同名的旧版。** 旧版写于 R15 尚未开扫之前，里面"设备腿 blocked、开发者工具没在跑"
那句判错了，已按实测更正；留一份错的跑法比不留更坏，所以整篇重写。

## 一、R15 复拍腿三门读数（都过了）

| 门 | 读数 |
|---|---|
| COVERAGE R15 | `SWEEPCOVER_RESULT=PASS covered=68/71`（+ 在册 3 = 71/71），空白=0 跨页同图=0；全量扫 142 帧 / 71 路由 / blank=0 |
| FIXVIS R14→R15 | `FIXVIS_RESULT=PASS visible=37 fixNotVisible=0 clockOnly=0 rawOnly=0 gaps=1` |
| ROUNDTRIP R15 | `ROUNDTRIP_RESULT=PASS created=417 fields=5/5 rowGone=yes conserved=yes` 备份 `database/backup/qafid-R15-20261023T102844.sql` |

含义：**R14fix 的 53 条修复被逐像素证明真的上了屏**（37 行内容区可见变化、0 行"改了却看不见"）。
唯一 gap 是 `NO_PREV`（campus/hub bottom 在 R14 无该帧，结构上没有改前值可比），
门自己把它标成"缺读数"，既没判成"变了"也没判成"没修对"。

7 条车道自陈零像素行由 `fixvis-expected-unchanged-R15.json` 逐条引用 FX 交件原文豁免；
判据本身（比内容区像素、不比状态栏时钟）未放宽。比较全集是 `fixlist-R14-dispatched.json`
（按 R14fix 派单台账 19 批次过滤，修车波的真实合同范围）。

## 二、旧版那句误判到底误在哪（四条，都是实测）

1. **`ws-channel-up` 不带 `--project` 时默认吃 mock 那档产物**
   （`apps/client/dist/build/mp-weixin`，`VITE_API_MODE=mock`，`envSha8=f1c7b96b`）。
   我拿默认值去问"real 腿通不通"，它当然报 `mismatch`——**错的是我问话的方式，不是端口上的实例**。
   那实例自报 `apiMode=real`。带对参数即 `WS_UP_BAND_RESULT=match exit=0`。
   ⇒ 凡是问档位的命令，`--project` 必须显式给全。
2. **真障碍是 `open-project-window` 返回 `{"type":"reuse"}`**：窗口是复用的，旧编译包还在里面。
   取景门因此两次拒绝出帧，原话是"项目窗口没重开 ⇒ 会拍到改前编译的旧画面，整轮帧都是假证据"。
   ⇒ 这不是仪器坏了，是它在拦我产假证据。这种拒绝要读成"别扫"，不是"再试试"。
3. **`timeout` 杀 `open-project-window` 会留下一把孤儿租约，而且会循环**：
   我连杀三发，每发都留一把，于是"被自己的 timeout 挡住"转了三圈。
   正解是**同一个进程内** `reclaimOrphanUi({confirm:RECLAIM_CONFIRM,...})` 紧接 `releaseUi({owner})`——
   `releaseUi` 要求锁里的 pid 就是本进程，分开两次跑必然再留一个孤儿。
   接管前它还做双票核对（`kill=ESRCH` + `tasklist` 无匹配）才肯动，并把原锁逐字节留档成
   `*.orphan-<时间戳>`。`file` 参数只收文件名不收路径（防顺着路径写出目录外）。
4. **冷启的正确姿势**：租约清白之后，`netstat -ano | grep :9420` 数出**占用端口的 pid**
   （别按进程名猜——中文名在 GBK 终端里 grep 不到，我就这么漏判过一次"IDE 没在跑"），
   `taskkill //PID <pid> //T //F`，再
   `cli.bat auto --project <real 产物绝对路径> --auto-port 9420`（`cli.bat` 在
   `D:\微信开发者\微信web开发者工具\`），后台跑、别用短 timeout 掐它。

## 三、band match 不等于包是新的（这条最容易骗过自己）

band 是 `config/env.js` 的 sha8，**UI 改动根本不碰它**，所以 `match` 只证明档位对，不证明代码新。
要用一个"上一轮必然改到像素"的页做探针。本次拿 help 页（R14-L07-D11 把客服邮箱明文上了屏）：

| | top sha16 | top bytes |
|---|---|---|
| R14（改前） | `9267b42bce2b1d5e` | 97,098 |
| 冷启后探针 | `caeffc0e` | 100,211 |

哈希变了**且字节数随新增文本变大**，才算包真的换过来了。只看哈希会变是不够的——
状态栏时钟也会改哈希；所以要看方向：新增内容 ⇒ 变重。

## 四、R15 找茬波（本文件的未完成部分）

14 车道已按 R15 清单一次派齐（`emit-fidelity-lanes`：`lanes=14 frames=136 守恒=yes`，
派发台账 `tmp/qa/lanes/R15/finder-dispatch-manifest.json`）。
**login 这轮由清单自然切进车道，不再需要像 R14 那样补派单页泳道**——那是 R14 的挂账，已销。

一次派 14 条图像密集型车道超出了本机吞吐：派出 80 分钟后只有 4/14 落盘、1/14 交完内容。
没有一条报错，纯粹是被并发压慢。下一程按 R13 的实测节奏分批（每批 ~7 条、批间再数一次盘），
别把"慢"读成"死"、也别在没数完之前取缺陷账（本仓记过一次：并发写盘时取目录清点会把半截文件读成缺陷）。
