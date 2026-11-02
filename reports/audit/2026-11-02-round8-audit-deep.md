# 第八轮审查补充：两条深水轴（2026-11-02 深夜，主控串行）

承 `2026-11-02-round8-audit.md` §4 的候选轴。子代理配额未开（00:24 重置），主控串行执行。
审查对象 HEAD `dd4ffb19`。两轴均为**阴性**，证据链如下。

## R8-D｜消息域实时链路 —— 阴性：三段闸完备且有判点盖住

- **SEND 链**（`MessageWebSocketHandler`）：senderId 取自 STOMP Principal（不信 payload）、
  禁自发、content/kind 限长（与 REST @Size 同口径）、临时/私信**双形态配对校验**
  （isTempChatPair/isPrivatePair）、落库委托真服务且**落库失败拒转发**（未落库消息不传播）。
  mock 档降级（组件 null 时仅转发）是文档化的联调便利，生产 profile 组件恒在。
- **CONNECT/SUBSCRIBE/SEND 三段闸**（`JwtChannelInterceptor`）：CONNECT 验签 + 撤销名单
  （jti）+ 媒体 scope 降权拒绝（5 分钟媒体令牌不得开长连接——P0-2）+ 禁用用户补查（R4-00281）；
  SUBSCRIBE 只许 `/topic/**` 与自己的 `/user/queue/**`（简写解析 2026-09-02 修过，注释在案）；
  SEND 只许应用前缀（`/topic`/`/queue`/`/user` 对客户端只读——P2 2026-10-31，前缀与 broker 配置
  同一键防脱节，fail-closed 回落缺省）。握手段另有 `JwtHandshakeInterceptor` + Origin 白名单。
- **判点面**：`JwtChannelInterceptorTest`（16 例）+ `SendGuardTest` + `MediaScopeRejectionTest` +
  `ApplicationPrefixTest` 四个测试类在册（全量 1910 例内）。
- 关联确认：`RealWalletUnlockService` 无 VIP 旁路（R8-A 已证）与消息域无交集新面。

## R8-E｜admin 写面全量反证 —— 阴性：三轮改动后零漂移

`tests/admin-write-gate.spec.mjs` 实跑（2026-11-02 深夜，HEAD `dd4ffb19`）：
写 API 函数 **96** / 写视图 **34** / Java 写端点 **182** / 已归档写函数 **95** / 不中 **0** /
豁免 **0**；盲区上界 **22**（与第五轮 C-F6 收口值一致，未回涨）；SUPER_ADMIN 口径
注解 **45** ≥ 归档函数 **43**（B-FINDING 13 的单调关系保持）；`--self-test` 六向判红全绿
（超管档/纯 ADMIN/前端严/豁免反写/脚本块顶层写/死位）。三轮修复批次（f998762d/4bd15174/bc326fc1）
对 admin 面的触碰仅 R7-A 的字段改名，写面契约零漂移。

## 结论

第八轮共五轴（资金域 / store 层 / 判据钉死 / 消息实时链 / admin 写面）**全部阴性**——
每条都带盘上证据与出处；这不是「没查」，是「查过的地方经得起查」。
边界清单不变；深水车道（若需更广覆盖：内容审核状态机全链、MQ 消费者面复扫）待配额窗口后可再派。
