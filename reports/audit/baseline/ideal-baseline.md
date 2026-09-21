# Target UI Baseline（理想图基准 · ideal-baseline）

> 生成：2026-09-19 ｜ 维护：理想图基准员（动态工作流）
> 定位：本文件把散落在 `素材/`、`全站素材补齐-0912_assets/`、`寻觅注册页-素材_assets/`、`截图存档/`、`docs/`、`doc/`、`specs/`、`reports/audit/` 的设计稿/参考图/规范，**按页面路由**收敛为统一的理想目标基准。**理想图 = 最终构建目标（build target），不是“仅供参考”。**
> 方法：只读素材盘点 + 写入本文件；未改任何代码。
> 路由唯一真相源：`apps/client/src/pages.json`（本轮实读，主包 8 页 + 15 分包 47 页，TabBar 5 项：首页/附近/寻觅/消息/我的）。

---

## 0. 参考优先级与冲突消解

同一页面存在多份参考时，按以下顺序取理想结构（上层覆盖下层）：

| 级 | 来源 | 说明 |
|---|---|---|
| P1 | `素材/理想效果图/*.png`（19 张） | 最高目标。其中 12 组核心页已经 R11 L1-L4 结构比对**全部通过**（`reports/audit/r11-acceptance/ideal-comparison.md:7-20`），该结论即结构达标基线 |
| P2 | 页面级设计大图 + 拆分图标 | `素材/首页/最终/`、`素材/主页/最终/`、`素材/消息/最终/`、`素材/匹配/最终/`、`素材/附近/*/`、`素材/登录页/`、`素材/注册/个人资料填写/`（索引：`素材/图标素材总索引.txt`） |
| P3 | 结构/规格文档 | `像素级对比还原报告.md`（四页逐元素理想结构表）、`docs/design/v3.1-contract.md`（16 页逐页契约表 + Token 冻结）、`docs/design/xunmi-match-design.md`（纯匹配版唯一视觉依据）、`docs/design/message-v3-spec.md`、`docs/profile-design-spec.md`、`docs/design/profile-product-logic.md`、`素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md` |
| P4 | 参考图生成提示词 | `docs/design/v3.1-后台对齐与参考图生成.md` §三（18 类页面，兜底无理想图锚点的页面） |
| P5 | 实拍回归基线 | `reports/screenshots/r11-ideal/`（双身份终版实拍 cur-*.png）、`截图存档/2026-08-16-mp-p0/`（像素级对比的对照实拍）、`reports/audit/r11-acceptance/screenshot-matrix.md`（72 路由 × 2 身份） |

冲突消解总规则：
- Token/组件/文案冲突以 `docs/design/xunmi-match-design.md`（v2）→ `docs/design/v3.1-contract.md`（v3.1 冻结）为最终裁决；两者未覆盖处回退 `素材/匹配/寻觅1/DESIGN_GUIDE.md`。
- 页面**结构**（模块顺序/信息层级/交互位置）以 P1 理想图为准；颜色/微细节不作门槛（同 R11 方法）。
- 素材入库/变更必须走 `素材资产管理规范.md` 三处同步 SOP（src/static ↔ static-local-backup ↔ api/uploads + media_asset 注册）。

---

## 1. 全局基准（page = `*`）

| 基准 | 路径 | 要点 |
|---|---|---|
| 品牌视觉总谱 | `素材/参考图/寻觅品牌视觉设计系统图谱.png` | 全站色彩/字体/图形语言总纲 |
| 视觉依据 v2 | `docs/design/xunmi-match-design.md` | Token：brand `#34C38F`、pink `#FF5D9E`、blue `#4D8DFF`、page `#F7FAF9`、text `#222222`；绿=认识/品牌、粉=心动/关系、蓝=互动/消息；五 Tab「发现 附近 🟢♥寻觅 消息 我的」，寻觅中央凸起浮岛；SVG 只做图标/壳，禁止整页 SVG；照片/姓名/标签/匹配率必须动态渲染 |
| 冻结契约 v3.1 | `docs/design/v3.1-contract.md` | Token `#34C98A`/`#FF6FA3`/`#4D8DFF`、Hero 渐变 `#34C98A→#B8EFD9`；Hero 节奏红线（仅 匹配中心=绿 Hero、匹配成功=粉 Hero、我的=极浅绿区，发现/附近/消息白底）；大卡 4:5 信息位顺序（照片→姓名/年龄/认证→学校·距离→兴趣标签→一句话→匹配度）；他人主页 CTA 状态机（陌生=喜欢 TA 粉 / 互喜=发消息 绿）；单向喜欢文案恒为「已送出心动」；§19 逐页契约表 |
| 消息 V3 契约 | `docs/design/message-v3-spec.md` | 消息页=恋爱关系推进中心；首页动态顺序（正在升温→今日心动→寻觅助手→最近聊天 / 无升温时插入推荐认识的人）；关系分四态（刚认识/聊天中/暧昧中/互相关注）；空态不空屏 |
| SVG 主库 | `素材/组件库/理想效果图-svg拆分/`（118 个，01-tabbar…14-page-templates）+ `素材/组件库/理想效果图-改造指南.md` | 理想效果图 SVG 拆分主库，按 `素材/SVG素材核查与补充报告.md`（2026-08-18，覆盖率约 75%）逐页补缺 |
| 图标总索引 | `素材/图标素材总索引.txt` | 约 1502 个 PNG 图标、22 个按页拆分目录的索引（每目录含 manifest.json/清单/联系表） |
| 早期参考图拆分 | `素材/参考图/ChatGPT Image 2026年8月15日 *.png`（11 张）+ `素材/参考图/拆分图标_参考_*`（9 目录 507 图标） | 品牌系统/登录设计/登录流程/消息设计/消息界面/主页设计/匹配中心/附近探索/个人主页；已被理想效果图迭代，保留作图标源 |
| 吉祥物 | `素材/吉祥物/xunmi_mascot_design_system_v2/`（67 图标）+ `素材/吉祥物/吉祥物使用指南.md`；唯一真相源 `apps/api/uploads/app-assets/assets/images/mascot/mascot_{heart,shy,wave,cheer}.png`（字节数 7979/7720/7336/6272） | 寻觅芽 IP：主吉祥物 9/互动表情 15/业务状态 7/聊天气泡 6/导航头像 5/头像组件 5/装饰 20；空态/引导/气泡默认用它 |
| 人物照片冻结 | `docs/design/people-fixture.json` + `素材/人物/`（person-01…09 固定映射，见 v3.1-contract §18） | 林晓/夏言/阿辰/小满/Luna/草莓/苏奈/周岚/林晚 各角色固定 avatar/card/gallery/halfBody/background/voice，三源一致（fixture + `config/people-role.ts`） |
| 画布规格 | `docs/profile-design-spec.md` | Profile V3：375×812、左右边距 16、卡片 radius 20px、照片墙 3 列 108×108 gap8 |
| 资产 SOP | `素材资产管理规范.md` | 静态图三处同步 + AI 生成图裁水印 + media_asset 注册 |
| 像素级结构表 | `像素级对比还原报告.md`（§页面1 寻觅卡/§页面2 首页/§页面3 他人主页/§页面4 我的主页 + 全局共性问题） | 四页逐元素「理想 vs 实现」结构表，含蒙层信息层、头像浮动、共同点模块等结构级要求 |
| 流程基准 | `素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md`（20 页全集）+ `素材/注册/个人资料填写/01-注册登录/DEV_PAGE_MAP-流程基准.md` | 认证规则：实名必须（阻塞核心入口）、学生/人脸可选；徽章展示不泄露实名数据；注册全链 8 步（注册登录→基础资料→实名→实名成功→学生认证→人脸认证→兴趣偏好→恋爱名片） |
| 后台令牌 | `design-tokens-admin.md` | 后台 Meta 改造：主色 `#0064E0` 仅主操作/激活态；画布 `#F1F4F7`/卡 `#FFFFFF`/文字三级/描边 `#DEE3EA`；语义色 `#31A24C/#F2A918/#E41E3F`；Noto Sans SC 14px；侧边栏 220px + 顶栏 56px + 内容 24px；圆角收敛 6-10px；状态徽章浅底+同色字 |
| 后台蓝图 | `后台设计方案总览.md`、`后台功能模块清单.md`（12 一级/75 二级模块）、`后台RBAC三级圈层规格.md`（公司/区域/学校三级圈层 + 举报调阅取证链）、`后台设计决策说明.md` | 13 个页面 Frame：设计规范/模块全景/Dashboard/用户管理/用户详情/内容审核工作台（三栏）/内容管理/商业化会员/系统设置 RBAC/风控举报/客服工单 等 |
| 后台实拍基线 | `截图存档/2026-08-07/admin/00-15`、`截图存档/2026-08-08-2/admin/01-32` | 后台 16→32 页实拍基准 |
| 客户端实拍基线 | `reports/screenshots/r11-ideal/`（cur-login/home/nearby/discover/messages2/profile/match-success/circles-index/circle-home/campus-hub/village-post/village-detail3）+ `截图存档/2026-08-16-mp-p0/` | 理想图对照实拍与像素级对照实拍；新回归以此为对照起点 |

---

## 2. 逐页理想基准（客户端）

> 「R11」列 = `reports/audit/r11-acceptance/ideal-comparison.md` 对照结论（L1 结构/L2 信息层级/L3 交互位置/L4 组件形态）。
> 结构要点摘自理想图 + 像素级对比还原报告 + v3.1-contract §19 逐页契约表。

### 2.1 主包页面

| 页面路由 | 理想图（P1） | 补充素材/规范 | 理想结构要点（主视觉→内容顺序→CTA→导航→状态） | R11 |
|---|---|---|---|---|
| `pages/login/index` | `素材/理想效果图/登录页.png` | `素材/登录页/ChatGPT Image 2026年8月17日 23_44_12.png`（图标稿 52 图）、`素材/登录页/xunmi_login_svg_path_assets/`、`素材/SVG素材核查与补充报告.md` §2.2、`docs/design/v3.1-后台对齐与参考图生成.md` §三 登录/引导 | 校园情侣插画 hero 占上部主体 + Logo「寻觅🌱」+ slogan；CTA 顺序：微信一键登录（绿主钮）→ 手机号登录（次钮）→ 临时看看/先逛逛 → 协议勾选行（年满 18 + 用户协议/隐私政策）；未登录态不用「禁止访问」而用价值说明（xunmi-match-design §10）；漂浮爱心装饰 | ✅ 全通过 |
| `pages/register/index` | `寻觅注册页-素材_assets/b5163cb0…jpg`（reg-hero-illustration 注册页顶部主插图） | `寻觅注册页-素材_assets/fa78925c…jpg`（reg-bg 页面背景氛围图）、`700fa92a…jpg`（reg-decor 装饰元素总览）、`素材/注册/个人资料填写/01-注册登录/参考-注册页面.png`、`素材/注册/个人资料填写/流程/DEV_PAGE_MAP.md`、`素材/注册/个人资料填写/ChatGPT Image 2026年8月26日 00_02_43.png` | 顶部主插图（情侣插画）+ 氛围背景 + 装饰元素；步骤式资料填写（AuthProgress 组件），实名必须、学生/人脸可跳过（DEV_PAGE_MAP 认证规则）；注册阶段兴趣可跳过（v3.1-contract §14） | 未单独对照（截图覆盖 `reports/audit/r11-acceptance/screenshot-matrix.md` A/B 两身份 ok） |
| `pages/register/success` | `寻觅注册页-素材_assets/69340cfc…jpg`（reg-success-illustration 注册成功插图） | 同上 DEV_PAGE_MAP（实名成功→立即解锁首页/附近/匹配/消息） | 注册成功插图 + 引导进入主流程；成功页即解锁点 | 未单独对照（截图覆盖） |
| `pages/home/index` | `素材/理想效果图/首页.png` | `素材/首页/最终/ChatGPT Image 2026年8月17日 23_31_35.png`（65 图标/7 分类）+ `素材/首页/最终/拆分图标-精修版/` + `素材/首页/最终/manifest.json`（51 个 path 图标）+ `素材/首页/最终/README.md`、`素材/首页/1.0/DESIGN_GUIDE.md`、`像素级对比还原报告.md` §页面2、v3.1-后台对齐 §三 首页 | 白底；顶部「首页❤ + 发现今天值得遇见的人 + 位置/通知铃铛」→ 今日推荐卡（图左文右：竖版照片+在线标+合拍度粉圈徽、姓名/年龄/学校、兴趣标签、签名、4 缩略图；CTA 看看TA 绿描边 + 喜欢 粉填充）→ 今日恋爱进度 4 卡（彩底圆图标+状态文案）→ 关系动态 4 独立小卡（图标+数字+标签+3 头像堆）→ 兴趣推荐 + 附近的人 双栏 → 社区动态 Feed → 邀请好友横幅（粉渐变+礼物图标+去邀请）；底部五 Tab（寻觅中央浮岛）；空态/骨架/错误重试 | ✅ 全通过（进度 1/4 vs 2/4 为账号数据） |
| `pages/nearby/index` | `素材/理想效果图/附近的首页.png` | `素材/附近/附近首页/ChatGPT Image 2026年8月17日 23_59_47.png`（82 图标）+ `拆分图标_附近_首页/`、`素材/SVG素材核查与补充报告.md` §2.6、v3.1-后台对齐 §三 附近 | 顶部「附近+搜索/筛选」→ 分段 Tab（附近的人/兴趣圈/校园/活动，默认附近的人）→ 附近的人入口卡/横滑卡 → 兴趣圈卡（封面+人数+加入）→ 校园圈宫格 → 活动 → 动态 Feed；CTA：加入/进入；底部五 Tab；实拍含「附近的人/同城的人」入口区块为功能增强 | ✅ 全通过（多入口区块=增强） |
| `pages/discover/index` | `素材/理想效果图/寻觅匹配卡片页面.png` | `素材/匹配/最终/ChatGPT Image 2026年8月17日 23_41_34.png`（70 图标）+ `拆分图标_匹配/`、`素材/匹配/寻觅1/DESIGN_GUIDE.md`、`全站素材补齐-0912_assets/9eafc24f…jpg`（match-card-hero 寻觅卡片主视觉 800×1280）、`specs/discover-ui-polish/design.md`（CardSwiper P0）、v3.1-contract §04/§11/§12、`像素级对比还原报告.md` §页面1 | 沉浸式大图卡 ≥70% 视口；顶部「寻觅♡+推荐/附近分段+筛选」；卡左上距离 chip、右上在线徽标、底部黑色渐变蒙层直接叠信息（**禁白色资料卡**）：姓名+年龄+认证 → 学校·年级·距离 → 兴趣标签 → 一句话简介 → 匹配度置底（理想=环形进度徽章右下，实拍为实心圆徽——P4 视觉遗留项）；右侧竖向操作列 ❤️喜欢（粉）/☆超级喜欢（蓝）/×跳过（灰半透明）+ 左右滑手势；配额「今日剩余 N 次/已喜欢 N 人」；底部五 Tab 中央凸起寻觅 | ✅ L1-L3 通过，L4 ⚠️ 匹配度徽章形态 |
| `pages/messages/index` | `素材/理想效果图/消息.png` | `素材/消息/最终/ChatGPT Image 2026年8月17日 23_43_21.png`（114 图标）+ `拆分图标_消息/`、`素材/消息/2` + `素材/消息/2/2`（message-v3-spec §11 素材映射）、`docs/design/message-v3-spec.md`（唯一产品契约）、`素材/SVG素材核查与补充报告.md` §2.3 | 白底；双快捷通知卡（有人喜欢你/等待你回复）→ 寻觅助手官方卡（官方标+未读点）→ 正在升温横滑（带关系标签 聊天中/暧昧中/互相关注）→ 最近聊天列表（头像+昵称+最后消息+时间+未读数）；有活动推荐卡为增强；空态=推荐认识的人兜底、骨架加载、未读 `#FF6891` Badge；底部五 Tab | ✅ 全通过（preview 残留已修 V2026.09.19.0001） |
| `pages/profile/index` | `素材/理想效果图/已经填完资料的个人主页.png` | `素材/主页/最终/个人/ChatGPT Image 2026年8月17日 23_32_20.png`（28 图标）+ `拆分图标_主页_个人/`、`素材/主页/2.0/docs/页面组装说明.md`（OwnerHero→完善度→数据统计→我的故事→我的动态→设置）、`素材/主页/5.0/`（feed/hero/match/story/bottom SVG）、`docs/profile-design-spec.md`、`docs/design/profile-product-logic.md`、`像素级对比还原报告.md` §页面4 | 极浅绿渐变 Hero（大头像+白描边+认证勾、姓名/年龄/学校/城市/距离/签名白字、右上编辑资料白胶囊）→ 资料完整度条（百分比+去完善绿胶囊+辅助说明）→ 4 格等宽统计（图标+黑粗数字+灰标签，竖线分隔）→ 我的故事横滑竖版 3:4 卡（渐变蒙层+故事名+篇数+虚线添加卡）→ 我的相册/照片墙 → 我的互动 4 行（头像预览堆+箭头）→ 更多功能宫格；长按拖动排序、模块可显隐（v3.1-contract §8 我的主页：核心数据=匹配/我喜欢/获赞，动态≤3 条+语音折叠）；底部五 Tab；未登录=LockScreen | ✅ 全通过（计数为账号数据） |

### 2.2 分包页面

| 页面路由 | 理想图（P1） | 补充素材/规范 | 理想结构要点 | R11 |
|---|---|---|---|---|
| `subpackages/profile-extra/profile/other` | `素材/理想效果图/他人显示主页.png` | `素材/主页/最终/他人/ChatGPT Image 2026年8月17日 23_33_29 (1).png`、`(2).png`（64+38 图标）+ `拆分图标_主页_他人1/2`、`像素级对比还原报告.md` §页面3、`docs/design/profile-product-logic.md` §4（Hero→Identity→Action→Intro→Interest→Common→Gallery→Story）、v3.1-contract §06/§07 | 全屏人物大图（返回+···）→ 白色信息卡（头像浮动交界处、姓名/性别♀/在线胶囊/年龄·学校·城市/距离，右上「喜欢」粉描边+「打招呼」绿填充）→ 个性签名卡（浅灰底+引号）→ 兴趣标签（浅薄荷绿底深灰字）→ **我们有 N 个共同点**（3 项横排：彩底圆图标+标题+副题）→ 生活瞬间 4 列方格照片墙 → 最近动态 Feed → 底部固定三按钮：喜欢（粉浅底）/打招呼（绿主钮最宽）/关注（白描边绿星）；无底部 Tab（push 进入）；CTA 按状态机切换，关注入「更多」菜单 | 未单独对照（本轮 52-profile-other 等截图覆盖，无结构回归） |
| `subpackages/discover-extra/discover/matching` | `素材/理想效果图/匹配中页面.png` | `素材/SVG素材核查与补充报告.md` §2.4、v3.1-contract §07/§12 | 匹配中视觉进度（「正在寻找适合你的 TA ●●●」，不显示虚假算法百分比）→ 候选卡 → ❤️/×/取消；次数用尽/看完=空态；取消返回匹配中心 | 未单独对照（31-matching 截图覆盖） |
| `subpackages/discover-extra/discover/match-success` | `素材/理想效果图/匹配成功页面.png` | v3.1-contract §08、`素材/SVG素材核查与补充报告.md` §2.5 | 粉色主题 Hero；标题❤/副语 → 双头像+粉心碰撞 → 共同点 4 行进度 → CTA：立即聊天（去打个招呼）+ 继续探索（+分享喜悦）；文案恒为「匹配成功」（互喜） | ✅ 全通过 |
| `subpackages/discover-extra/likes/index`、`subpackages/discover-extra/likes-visitors/index` | （无专属理想图，P4 兜底）`docs/design/v3.1-后台对齐与参考图生成.md` §三 喜欢与访客 | v3.1-contract §05（匹配列表重构自 likes 页，接口/store 不变）、`素材/理想效果图/未登录个人主页.png`（相关数据区参考） | 顶部标题+Tab（喜欢我的/我喜欢的/互相喜欢/访客）→ 用户行列表（头像+昵称+学校+距离+在线+回赞/喜欢钮）→ 空态用寻觅芽吉祥物+文案 | 截图覆盖（R11 matrix ok） |
| `subpackages/circles/circles/index` | `素材/理想效果图/兴趣圈列表.png` | `素材/附近/兴趣圈/ChatGPT Image 2026年8月17日 23_56_00.png`（71 图标）+ `拆分图标_附近_兴趣圈/`、圈封面：`全站素材补齐-0912_assets/36f64e80`（摄影）`39cd56f3`（旅行）`dac87668`（音乐）`372d838e`（运动）、`素材/SVG素材核查与补充报告.md` §2.13 | 顶部标题+搜索 → 分类 chips（全部/摄影/旅行/音乐/运动/美食）→ 圈卡（封面图/圈名/热门徽/描述/人数·动态/头像堆/加入钮）；我的圈子/发现圈子 Tab；底部五 Tab | ✅ 全通过 |
| `subpackages/circles/circles/circle-home` | `素材/理想效果图/圈子详情，摄影圈参考.png` | `素材/附近/圈子具体/ChatGPT Image 2026年8月18日 22_43_34.png`（118 图标）+ `拆分图标_附近_圈子/`、圈封面素材同上、`素材/SVG素材核查与补充报告.md` §2.14 | hero 封面（摄影圈用 circle-cover-photography）→ 圈信息+加入钮 → 标签 chips → 白色面板（5 tab+置顶规约+动态卡）→ 底部加入大钮 | ✅ 全通过 |
| `subpackages/campus/campus/hub` | `素材/理想效果图/校园圈.png` | `素材/附近/校园圈/ChatGPT Image 2026年8月18日 22_49_45.png`（95 图标）+ `拆分图标_附近_校园圈/`、`全站素材补齐-0912_assets/edf8c3ef…jpg`（campus-circle-cover 校园圈学校封面）、`素材/SVG素材核查与补充报告.md` §2.7 | 认证引导条（未认证=「去认证」引导卡）→ 双 tab → 校圈卡（封面图/徽章/人数·动态/头像堆/进入或申请加入）；数字统一 k 格式（一致性优先于原图 9,823 写法）；已认证进入私域 | ✅ 全通过（认证态差异为账号） |
| `subpackages/village/village/publish`（发布到圈入口=`subpackages/circles/circles/post-topic`、`subpackages/campus/campus/post-topic`） | `素材/理想效果图/发布帖子页面.png` | v3.1-contract（帖子 Feed 双入口设计）、`素材/附近/帖子/ChatGPT Image 2026年8月24日 21_45_20.png` | 顶部 X/发布动态/发布钮 → 发布到卡（圈子场景=发布到摄影圈；个人动态页默认个人动态）→ 正文 0/1000 → 图格 → 话题 0/5 → 位置 → 提及 → 谁可以看 → 小贴士 → 底部工具条 | ✅ 全通过（双入口设计） |
| `subpackages/village/village/detail`（`village/post` 同构） | `素材/理想效果图/帖子.png` | `素材/附近/帖子/ChatGPT Image 2026年8月18日 22_51_12.png`（68 图标）+ `拆分图标_附近_帖子/`、`素材/SVG素材核查与补充报告.md` §2.8 | 作者行+关注钮 → 正文 → 图 → 位置胶囊 → 赞/评/分享 → 全部评论+最热排序 → 评论卡+作者回复 → 底部输入条 | ✅ 全通过（巡检参数已从失效 id=225 更新为 id=1） |
| `subpackages/village/village/index` | （无理想图，P4 兜底）v3.1-后台对齐 §三 圈子/动态广场 | — | 顶部搜索+发帖 → 三入口（关注/同城/发现）→ 帖子 Feed（头像+昵称+学校+时间+正文+九宫格图+点赞评论）→ 右下角绿色发布 FAB | 截图覆盖 |
| `subpackages/chat/chat-session/index` | （无理想图，P3/P4）`docs/design/message-v3-spec.md` §2.2、v3.1-后台对齐 §三 聊天 | v3.1-contract §09 聊天契约行 | 顶部导航（对方头像+姓名+在线+···）→ 关系状态区（RelationshipTag+SuggestedAction）→ 消息流（对方白底左/自己薄荷绿右/系统灰居中，活动卡内嵌）→ 恋爱输入区（语音+输入框+表情+加号）；发送失败保留重试 | 截图覆盖 |
| `subpackages/chat/official-chat/index` | `docs/design/message-v3-spec.md` §2.3 | — | 导航（返回+助手头像+「寻觅助手/你的恋爱小管家」+···）→ 助手消息流（text+活动卡）；v1 只读 | 截图覆盖 |
| `subpackages/tools/search/index` | （P4）v3.1-后台对齐 §三 搜索 | v3.1-contract §15（学校结果→校园主页） | 搜索框+取消 → Tab 用户/标签/学校 → 用户行/标签胶囊/学校卡（校名+认证人数+活跃+活动数） | 截图覆盖 |
| `subpackages/profile-extra/settings/index` | （P4）v3.1-后台对齐 §三 设置 | — | 分组列表（账号安全/隐私/通知/帮助/关于）→ 退出登录粉色警示+确认 → 底部版本号 | 截图覆盖 |
| `subpackages/profile-extra/verification/index`（含 real-name） | （P3）`素材/注册/个人资料填写/05-学生认证/`（学生证示例-校园卡.jpg 等）、`03-实名认证/实名证件示例.jpg`、`流程/DEV_PAGE_MAP.md` | v3.1-contract §12 校园认证契约行 | 权益说明 Hero → 选校 → 三种方式（学信网/学生证/邮箱）→ 审核中 → 成功（✓ 绿徽章）；实名必须、学生/人脸可选不阻塞；徽章对外不泄露实名数据 | 截图覆盖 |
| `subpackages/setup/interest/index` | （P3）v3.1-contract §11/§19-11 | `素材/首页/最终/svg`（interest 图标族） | 12 兴趣网格 → 完成（≥3）；注册阶段可跳过，主动进入必须 ≥3 | 截图覆盖 |
| `subpackages/setup/profile/index` | （P3）v3.1-contract §19-10 编辑资料 | `素材/注册/个人资料填写/02-基础资料`、`08-恋爱名片` | 昵称/年龄/学校/年级/地区/简介表单；未保存离开=确认；完成保存返回我的 | 截图覆盖 |
| `subpackages/discover/activities/index`、`subpackages/tools/activities/detail` | （P4）v3.1-后台对齐 §三 活动 | — | 活动卡横滑（封面 16:9+标题+时间+地点+报名人数）→ 详情（信息→发起人→报名→评论），报名固定底部 | 截图覆盖 |
| `subpackages/tools/heart-signals/index` | （P4）v3.1-后台对齐 §三 心动信号 | — | 信号列表（头像+昵称+状态+信号卡）；空态寻觅芽吉祥物；点击进聊天 | 截图覆盖 |
| `subpackages/market/*`、`subpackages/vip/*` | （P4）v3.1-后台对齐 §三 商品/钱包/VIP | — | 商品列表（封面+标题+价格+购买）/钱包（余额卡+明细）/VIP（权益对比+开通钮） | 截图覆盖 |
| `subpackages/support/feedback/index` | （P4）v3.1-后台对齐 §三 反馈中心 | — | 类型入口（建议/活动提案/问题报告）→ 表单（标题+内容+图片+提交）→ 成功空态 | 截图覆盖 |

---

## 3. 后台（apps/admin）

| 范围 | 基准 | 要点 |
|---|---|---|
| 全站 | `design-tokens-admin.md` + `后台设计方案总览.md`（13 Frame 蓝图）+ `后台功能模块清单.md`（12 一级/75 二级）+ `后台RBAC三级圈层规格.md` + `后台设计决策说明.md` | 布局骨架（侧边栏 220px+顶栏 56px+内容 24px）全站复用；数据表格/筛选栏/详情抽屉（480/720px）/审核工作台三栏/批量操作条/图表看板（单主色+灰度）；异常边界态（空状态/骨架/二次确认）必须覆盖；危险操作 danger 文字按钮 |
| 逐页实拍 | `截图存档/2026-08-08-2/admin/01-dashboard … 32-official-accounts.png`（33 张）、`截图存档/2026-08-07/admin/00-15` | 现行后台各页实拍基准（Dashboard/用户/认证/举报/反馈/敏感词/审计日志/在线用户/管理员/公众号/角色/菜单/学校/字典/圈子/话题/活动/报名/VIP 套餐/账单/优惠码/钱包/金币/红包/商城/通知配置/匹配配置/全局配置） |

---

## 4. 素材资产 → 页面映射（AI 生成图包）

### 4.1 `全站素材补齐-0912_assets/`（18 张，源自 `全站素材补齐-0912.miora` 清单）

| 资产名 | 文件 | 服务页面 |
|---|---|---|
| match-card-hero 寻觅卡片主视觉 800×1280 | `9eafc24f-miora_text_to_image-1789188175742-0-fdceb81a380a.jpg` | `pages/discover/index` 卡片主图 |
| circle-cover-photography 摄影圈封面 | `36f64e80-…-5ab3cb1f2279.jpg` | `circles/index`、`circles/circle-home`（R11 圈详情对照圈） |
| circle-cover-travel 旅行圈封面 | `39cd56f3-…-a56a5a39a738.jpg` | 同上（旅行圈） |
| circle-cover-music 音乐圈封面 | `dac87668-…-86e34d8014bb.jpg` | 同上（音乐圈） |
| circle-cover-sports 运动圈封面 | `372d838e-…-8ea362e4c2c7.jpg` | 同上（运动圈） |
| campus-circle-cover 校园圈学校封面 | `edf8c3ef-…-e6cd2c244f48.jpg` | `campus/hub` |
| person-10…21（12 张校园生活场景人物照：图书馆/篮球场/咖啡馆/天台黄昏/画室/书店/樱花树下/宿舍夜读/操场跑道/地铁车窗/花房/吉他） | `267d31d0 / 59153a2d / de040f51 / 1b2db40b / 5c2e50df / 2d35502a / 832ef22a / 569e0bb5 / c1643dde / 32cb4c5d / 5d5b3f5d / 00963936`（-miora_text_to_image-*.jpg） | 今日推荐/附近的人/他人主页生活瞬间/人物 fixture 补充（与 `docs/design/people-fixture.json` 对齐后使用） |

### 4.2 `寻觅注册页-素材_assets/`（4 张，源自 `寻觅注册页-素材.miora`）

| 资产名 | 文件 | 服务页面 |
|---|---|---|
| reg-hero-illustration 注册页顶部主插图 | `b5163cb0-miora_text_to_image-1789186272177-0-dd3e85895457.jpg` | `pages/register/index` |
| reg-success-illustration 注册成功插图 | `69340cfc-miora_text_to_image-1789186341708-0-8c365c88ce83.jpg` | `pages/register/success` |
| reg-bg-atmosphere 页面背景氛围图 | `fa78925c-miora_text_to_image-1789186333635-0-0b8569c115db.jpg` | 注册流程页背景 |
| reg-decor-elements 装饰元素总览 | `700fa92a-miora_text_to_image-1789186339542-0-21c8e1ef23ba.jpg` | 注册流程装饰 |

> 入库提醒：以上 AI 生成图按 `素材资产管理规范.md` §五先裁水印、再按 §三 三处同步（src/static ↔ static-local-backup ↔ api/uploads），real 模式另按 §四注册 `media_asset`。

---

## 5. 未锚定 / 待澄清的理想素材（诚实披露）

| 素材 | 现状 |
|---|---|
| `素材/理想效果图/等待页面.png`、`未登录等待页面.png` | R11 明示「未对照」组（ideal-comparison.md §未对照：等待页面×2/未登录个人主页/他人显示主页 等 6 张，仅截图覆盖无 1:1 路由对照）。`素材/SVG素材核查与补充报告.md` §2.12 称其为「未登录等待页（Login Wait）」，但 `apps/client/src/pages.json` 现行路由中**无独立等待页**；锚定待产品确认（候补：`pages/register/success` 或登录态 LockScreen） |
| `素材/理想效果图/登录页面.png` | 登录页第二变体；R11 对照使用的是 `登录页.png`，本张未对照，保留为备选 |
| `素材/理想效果图/ChatGPT Image 2026年8月20日 11_37_17.png` | 19 张理想效果图中唯一未找到页面映射的一张（R11 与各规范均未引用），待确认 |
| `素材/理想效果图/匹配中页面.png`、`未登录个人主页.png`、`他人显示主页.png` | 有明确页面语义（matching / profile 未登录态 / profile/other），R11 轮仅以截图覆盖未做逐对比较；下次验收建议补 L1-L4 对照 |
| `docs/design-reference-analysis.md` 引用的仓库根 `ChatGPT Image 2026年5月17日 *.png`（6 张青藤之恋风格总览图） | 本轮在仓库根**未找到**这些文件（根目录仅有 2026-08 月度的散落截图）；该报告结论（青藤绿 `#3FCF8E`、暖金 VIP 等）属早期 V1.0 方案，与现行 Token（`#34C98A` 系）不一致，**不得**再作为基准 |
| `docs/design/xunmi-match-design.md` 头部引用的 `素材/匹配/DESIGN_GUIDE.md`、`素材/主页/DESIGN_GUIDE.md` | 路径已不存在；现存等效文件为 `素材/匹配/寻觅1/DESIGN_GUIDE.md` 与 `素材/首页/1.0/DESIGN_GUIDE.md`、`素材/组件库/旧/DESIGN_GUIDE.md` |
| `素材/主页/1.0-5.0`、`素材/消息/1-2`、`素材/附近/1`、`素材/组件库/2.0-3.0/旧/补充` | 历史版本迭代稿，仅作溯源；基准一律取「最终」目录与理想效果图 |

---

## 6. 使用规则

1. **复刻目标**：任何页面改版/复刻，以 §2 表「理想图（P1）」为目标做像素级/结构级还原；P1 缺位时按 §0 优先级降级取参考，并在改动说明中注明所用参考层级。
2. **对照方法**：沿用 R11 四层比对（L1 页面结构→L2 信息层级→L3 交互位置→L4 卡片/组件形态；颜色/微细节不作门槛），实拍对照以 `reports/screenshots/r11-ideal/` 为起点。
3. **验收挂钩**：新页面/改版页面必须先在 §2 表登记理想图与结构要点（无理想图的用 P4 提示词先补生成图入 `素材/理想效果图/`），再进入实现；「未锚定」清单清零是下一轮验收的可选目标。
4. **文案红线**（来自 v3.1-contract §21，基线内不可违背）：单向喜欢=「已送出心动」、互喜=「匹配成功」；悄悄话不承诺「必达」；发现与匹配职责不重叠；他人主页关注不入首屏 CTA。
5. 本基准为**只读快照**（2026-09-19）；素材目录增删后需由基准员重新生成。
