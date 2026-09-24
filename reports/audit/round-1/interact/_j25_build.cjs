// 次要25 判定结果构建脚本（A6 交互判定员）
const fs = require('fs');
const OUT = 'D:/6/恋爱小程序/reports/audit/round-1/interact/次要25-judge.json';

const SHOT = 'reports/screenshots/round-1-interact/';
const TOUR = 'reports/screenshots/round-1-tour/';
const EXEC = 'reports/audit/round-1/interact/exec-results.json';
const MANI = 'reports/audit/round-1/ops/次要25.json';

const P = {
  dev: 'subpackages/setup/dev/index',
  sc: 'subpackages/setup/showcase/index',
  fb: 'subpackages/support/feedback/index',
  dc: 'subpackages/discover/discussions/index',
  act: 'subpackages/discover/activities/index',
  pri: 'subpackages/legal/privacy/index',
  agr: 'subpackages/legal/agreement/index',
  md: 'subpackages/market/detail/index',
};

const checks = [];
function c(caseId, page, operation, expected, actual, verdict, evidence, confidence) {
  checks.push({ caseId, page, operation, expected, actual, verdict, evidence, confidence });
}
const U = 'UNVERIFIED', V = 'VERIFIED', F = 'FAILED';

// ============ DEV 组：mock 构建未注册 dev 页（pages.json:272-277 #ifdef DEV），reLaunch 全部 NAV_ERROR，页面未到达 ============
const devReason = '前置不满足：执行构建为 build:mp-weixin:mock，pages.json:272-277 dev/index 仅 #ifdef DEV 注册，reLaunch 全部 NAV_ERROR: Uncaught [object Object]，getCurrentPages 栈顶=subpackages/setup/interest/index（DEV03-after.wxml 证实停留在「选择兴趣」页），目标页面从未渲染';
c('DEV01', P.dev, '冷启动直达与首屏渲染（无点击）', '标题「DEV 开发者导航」+TEST 徽章+提示条+4 组 23 项列表；正式构建 reLaunch 应 fail',
  devReason + '；对照项「非 DEV 构建 reLaunch fail」在 observed 中成立（NAV_ERROR+栈不含本页），但主断言（DEV 构建首屏渲染）因前置构建不符无法核验，禁止凭代码推测判 VERIFIED', U, [EXEC + '#DEV01', MANI + '#DEV01', 'apps/client/src/pages.json:272-277', SHOT + 'wxml/SUBPACKAGES-SETUP-DEV-INDEX-DEV03-after.wxml'], 0.85);
c('DEV02', P.dev, 'tap .dev-header__back', 'uni.navigateBack→落点=来源页 discover，500ms 内路由变化',
  devReason + '；.dev-header__back:absent，动作未执行', U, [EXEC + '#DEV02', MANI + '#DEV02', 'apps/client/src/pages.json:272-277'], 0.85);
c('DEV03', P.dev, 'tap 一键登录行+连点×5', 'toast「超级账号登录成功」+跳转 discover+标题变「已登录超级账号」+5 连点仅 1 次请求',
  devReason + '；tap(__CAND__("一键登录超级测试账号")) element not found，动作未执行；before/after 截图均 timeout', U, [EXEC + '#DEV03', SHOT + 'wxml/SUBPACKAGES-SETUP-DEV-INDEX-DEV03-after.wxml'], 0.85);
c('DEV04', P.dev, 'tap 一键登录行（未配置密码环境变量）', 'toast「未配置 VITE_SUPER_TEST_PASSWORD」+无请求无跳转',
  devReason + '；动作未执行', U, [EXEC + '#DEV04', SHOT + 'SUBPACKAGES-SETUP-DEV-INDEX-DEV04-after.png(43891B,兴趣页画面)'], 0.85);
c('DEV05', P.dev, 'tap 会员身份模拟 ×2', 'toast 切换+行标题同步+storage dev-vip-sim 0→1→0',
  devReason + '；动作未执行', U, [EXEC + '#DEV05', SHOT + 'SUBPACKAGES-SETUP-DEV-INDEX-DEV05-after.png(43891B)'], 0.85);
c('DEV06', P.dev, '非 DEV 运行时守卫（条件用例）', 'toast「仅限开发环境」×2，无存储读写',
  '条件用例：执行器未构造「产物含本页而运行时 isDev=false」场景（当前构建本页整体未注册，不可达）；Manifest 预定「执行器跳过时如实标 UNVERIFIED」', U, [EXEC + '#DEV06', MANI + '#DEV06'], 0.9);
c('DEV07', P.dev, 'tap 4 个 isTab 项', 'switchTab→对应 tab 页且 dev 页出栈，无 NAV_FAIL',
  'SKIPPED：执行器标记 action-not-automatable（逐个 tap 4 个 isTab 项）；叠加前置不符（页面未注册）', U, [EXEC + '#DEV07'], 0.9);
c('DEV08', P.dev, 'tap 非 Tab 项+navigateBack 循环', 'navigateTo 栈深 2、返回落点=dev 页、滚动位保留、无 NAV_FAIL',
  devReason + '；act:navigateBack 报 NAV_ERROR: Uncaught [object Object]（栈顶为 interest 页，非本页）', U, [EXEC + '#DEV08'], 0.85);
c('DEV09', P.dev, '重复进出 ×2', 'onShow 刷新后「已登录超级账号」「会员身份」标题保持',
  devReason + '；act:repeatNav navigateTo ×2 均 navErr', U, [EXEC + '#DEV09', SHOT + 'SUBPACKAGES-SETUP-DEV-INDEX-DEV09-after.png(43891B)'], 0.85);
c('DEV10', P.dev, '长列表滚动到底/顶', '全部分组可达；返回时 timer 清理不报错',
  devReason + '；act:pageScrollTo bottom/top 在 interest 页执行，滚动对象错误，noop 证据无效', U, [EXEC + '#DEV10'], 0.85);

// ============ SC 组 ============
const scReason = '前置不满足：执行构建非展示模式（isShowcaseMode=false 构建期常量），reLaunch 进入后 onShow 立即回落，getCurrentPages 栈顶=pages/discover/index，showcase 页 6 分组 44 项从未渲染';
c('SC01', P.sc, '展示构建主入口渲染断言（无点击）', '标题「全功能展示」+SHOWCASE 徽章+说明卡+6 分组 44 项+Tab 标+计数徽章',
  scReason + '；DOM 计数断言无证据（observe-only 无 DOM 记录）', U, [EXEC + '#SC01', 'config/showcase.ts:31-60'], 0.8);
c('SC02', P.sc, '正式构建 reLaunch 直达', 'onShow 检测非展示模式→switchTab discover→栈顶=pages/discover/index，本页不驻留',
  '一致：act:reLaunch /subpackages/setup/showcase/index 后 getCurrentPages=[pages/discover/index] 单层栈，无 console 错误（仅 preloadSubpackages 日志），本页不驻留——与 Expected 三方一致（源码 showcase/index.vue:156-162 onShow 回落）', V, [EXEC + '#SC02', 'reports/screenshots/round-1-interact（路由链快照）', 'apps/client/src/subpackages/setup/showcase/index.vue:156-162'], 0.75);
c('SC03', P.sc, 'tap .sc-header__back（有栈/无栈两态）', '①navigateBack 落点=discover ②fail→switchTab discover',
  scReason + '；.sc-header__back:absent，两态均无法构造，动作未执行', U, [EXEC + '#SC03'], 0.8);
c('SC04', P.sc, 'tap isTab 项 ×5', 'switchTab→对应 tab 页，无 NAV_FAIL',
  'SKIPPED：action-not-automatable；叠加前置不符（页面回落）', U, [EXEC + '#SC04'], 0.9);
c('SC05', P.sc, '非 Tab 项抽样 10 项 tap 后返回', 'navigateTo 栈深+1、返回落点=showcase、aria-label=标题',
  'SKIPPED：action-not-automatable', U, [EXEC + '#SC05'], 0.9);
c('SC06', P.sc, '长列表滚动到底/顶', '全部分组可达；chip 首字占位正确；无 console 错误',
  scReason + '；act:pageScrollTo bottom/top 在 discover 页执行，滚动对象错误', U, [EXEC + '#SC06'], 0.8);
c('SC07', P.sc, '分组计数徽章与条目数一致性断言', 'journey 7/match 5/home 7/chat 2/community 13/profile 10',
  scReason + '；dom 断言 .groupCount:absent（页面不在 showcase 态）', U, [EXEC + '#SC07'], 0.8);
c('SC08', P.sc, '同一条目快击 ×5', '不崩溃、最终路由=目标页；直调 navigateTo 无防抖按现状记录',
  scReason + '；act-FAIL rapidTap __CAND__ element not found，动作未执行', U, [EXEC + '#SC08', SHOT + 'SUBPACKAGES-SETUP-SHOWCASE-INDEX-SC08-after.png(217110B,discover 画面)'], 0.8);

// ============ FB 组 ============
c('FB01', P.fb, '冷启动首屏断言（无点击）', '标题「反馈中心」+副标题+3 类型 chip 默认「反馈」+标题输入+内容 textarea+选填微信号+上传区 hint「最多 3 张，每张 ≤ 5MB」+提交栏+反馈历史卡+「历史记录」入口+空态',
  '一致：route=[subpackages/support/feedback/index]；同 suite FB02-after 截图（14:27，同页同构建，2 分钟后相邻用例画面）完整呈现 expected 全部要点：反馈中心标题/副标题/反馈-建议-活动提案三 chip（反馈高亮）/标题占位/内容 textarea/选填微信号/上传图片区+「最多 3 张，每张 ≤ 5MB」/提交主按钮/反馈历史卡+历史记录入口；observed 的 act-FAIL tap(.load) 系执行器将 expected 文本误解析为选择器（Manifest action 本为无点击），不影响首屏核验', V, [EXEC + '#FB01', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB02-after.png', 'reports/audit/round-1/ops/次要25.json#FB01.action'], 0.65);
c('FB02', P.fb, '依次 tap「建议」「活动提案」「反馈」chip', 'chip--active 高亮随点击迁移、aria-selected 同步、无路由无 toast；提交按 activeType 分发',
  '未达成：observed 仅记录第 1 次 act:tap "建议"（后两次 tap 无执行记录），after 截图（14:27）中高亮仍在「反馈」chip，未迁移至「建议」——点击后 500ms 内无可观测反馈（无 DOM 变化/无路由/无 toast），违反交互反馈铁律；route 保持 [feedback]（此点符合「无路由变化」）', F, [EXEC + '#FB02', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB02-after.png', 'wxml/SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.wxml（chip--active 仍在反馈 aria-selected=true）'], 0.6);
c('FB03', P.fb, '三个输入框正常输入回显', '标题/内容/微信号三处 v-model 回显一致，cursor-spacing=20，无 console 错误',
  '部分：仅标题输入有执行记录（act:input #feedback-title="测试反馈标题"）且回显被 FB08-before 截图（14:29 标题框显示「测试反馈标题」）证实；内容/微信号两处输入无执行记录（dom 检查 #feedback-content/#feedback-wechat absent 系 automator 不支持 id 选择器的假阴性），三处回显仅核验 1/3', U, [EXEC + '#FB03', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB03-after.png(57530B)', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-before.png'], 0.75);
c('FB04', P.fb, '逐字段清空', 'placeholder「标题」「选填微信号」恢复、textarea 置空、无残留错误条',
  '执行失败：act-FAIL input(__CAND__) element not found，清空动作未执行（after 截图 57603B 与 FB03 后画面一致，标题仍显示已输入内容）', U, [EXEC + '#FB04', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB04-after.png'], 0.8);
c('FB05', P.fb, '标题 300 字/内容 6000 字超长输入', '内容截为 5000 字，标题原样不爆版',
  '执行失败：act-FAIL input(__CAND__) element not found，超长输入未注入；dom 断言 .length:absent 系假选择器', U, [EXEC + '#FB05', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB05-after.png(57603B)'], 0.8);
c('FB06', P.fb, '特殊字符输入（emoji/HTML/SQL 注入串）', '原样回显、无脚本执行',
  '执行失败：act-FAIL input(__CAND__) element not found，特殊字符未注入', U, [EXEC + '#FB06', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB06-after.png(57603B)'], 0.8);
c('FB07', P.fb, 'tap 底部主按钮「提交」（空表单）', 'errorHaptic+toast「提交失败，请稍后重试」+无请求+表单不清空',
  '未达成：act:tap "提交" 执行成功记录存在，但 toast 数组为空、无路由变化、无任何反馈记录，before/after 截图均 timeout。toast 捕获机制本 round 正常（同 exec-results 他页捕获 126 条 toast，如 LG04/LG10），toast 为空是有效阴性证据——无论表单为空还是半空（FB03 残留标题），tap 提交均应弹拦截/结果 toast，实测零反馈', F, [EXEC + '#FB07', SHOT + 'wxml/SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB07-after.wxml', 'reports/audit/round-1/interact/exec-results.json（LG04/LG10 toast 捕获正常对照）'], 0.6);
c('FB08', P.fb, '合法提交→清空表单+历史刷新', '按钮「提交中...」→toast「提交成功」→表单全清→历史列表+1「处理中」',
  '前置未完整构造+无效果证据：Manifest 前置要求「标题+内容已填」，observed 无内容输入记录，FB08-before 截图（14:29）证实仅标题已填、内容为空；tap 提交后 after 与 before 截图 MD5 完全一致（e3db25cccb，表单未清、历史未变）、无 toast。成功链路未能按前置执行，不能据此外推产品缺陷，亦无任何达成证据', U, [EXEC + '#FB08', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-before.png', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.png（两者 MD5 相同）'], 0.75);
c('FB09', P.fb, '提交快击 ×5', 'isSubmitting 锁仅 1 次 createSubmission、历史+1、按钮恢复「提交」',
  '前置未完整构造（同 FB08 仅标题填入）+证据缺失：rapidTap done=5 有记录，但 after 截图 timeout、无请求计数/console 证据、无 toast', U, [EXEC + '#FB09', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB09-before.png', SHOT + 'wxml/SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB09-after.wxml'], 0.75);
c('FB10', P.fb, 'tap「+」上传格→系统选图', '上传 spinner→toast「图片上传成功」→缩略图入格',
  'SKIPPED：action-not-automatable（系统选图面板无法注入）', U, [EXEC + '#FB10', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB10-before.png'], 0.9);
c('FB11', P.fb, '长按缩略图→取消/确认两路', 'modal「移除」取消保留/确认移除+successHaptic',
  '前置不满足：依赖 FB10 已上传缩略图（FB10 SKIPPED 未执行），longpress(__CAND__) element not found，before/after 截图 MD5 相同（520c63b7ef，无缩略图画面）', U, [EXEC + '#FB11', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB11-before.png', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB11-after.png'], 0.85);
c('FB12', P.fb, 'tap 缩略图全屏预览与关闭', 'uni.previewImage 全屏、关闭后表单状态不丢',
  'SKIPPED：action-not-automatable', U, [EXEC + '#FB12'], 0.9);
c('FB13', P.fb, '隐私授权拒绝拦截（条件用例）', 'errorHaptic+toast「需同意隐私协议后才能选择图片」',
  'SKIPPED：action-not-automatable（授权态无法注入）', U, [EXEC + '#FB13'], 0.9);
c('FB14', P.fb, '≥3 张/>5MB/非法扩展分支', '对应 toast 拦截+不入列；取消选图静默',
  'SKIPPED：action-not-automatable（chooseImage 需 automator mock）', U, [EXEC + '#FB14'], 0.9);
c('FB15', P.fb, 'tap「历史记录」入口', 'navigateTo /subpackages/profile-extra/feedback/history；返回落点=反馈页',
  '未达成：act:tap "历史记录" 执行成功记录存在，但执行结束 getCurrentPages 仍=[subpackages/support/feedback/index] 单层栈，未发生 navigateTo；目标页已注册（pages.json:239 profile-extra 包 feedback/history）、按钮存在（feedback/index.vue:549-554 history-header__btn），点击后无路由变化、无 toast、无任何反馈', F, [EXEC + '#FB15', 'apps/client/src/pages.json:239', 'apps/client/src/subpackages/support/feedback/index.vue:549-554'], 0.6);
c('FB16', P.fb, 'tap submission 行带参跳详情', 'navigateTo history?id={item.id}，query 一致',
  'SKIPPED：action-not-automatable', U, [EXEC + '#FB16'], 0.9);
c('FB17', P.fb, '提交失败分支（条件用例）', 'toast=errorMessage、表单保留、按钮恢复',
  '条件用例不可构造：mock 构建 clientApi 走 mockFixtures 恒成功（Manifest pre 自述），失败注入不可行；observed tap 提交+无 toast 与该前提下的「无失败分支」一致，无法核验 expected', U, [EXEC + '#FB17', SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB17-after.png(55063B)'], 0.8);
c('FB18', P.fb, '滚动到底后 AppShell 返回', '滚动无卡死；返回落点=来源页（无上级 fail 兜底 switchTab home）',
  '执行失败：act:navigateBack 报 NAV_ERROR: Uncaught [object Object]（执行器 reLaunch 进入栈=1 无上级可返）；AppShell 返回按钮 tap(__CAND__) element not found，按钮点击未发生', U, [EXEC + '#FB18'], 0.8);

// ============ DC 组 ============
c('DC01', P.dc, '冷启动首屏断言（无点击）', '标题「讨论圈」+副标题+骨架→「正在讨论」卡渲染推荐条目（标签+标题+摘要）、无错误态',
  '一致：route=[subpackages/discover/discussions/index]；同 suite DC02-after 截图（14:31，同页）与巡检 tour A/B 默认图共同核验：讨论圈标题+副标题+「正在讨论」卡 2 条推荐条目（412 人收费/热度上升标签+标题+摘要）渲染完整、无错误态无骨架残影', V, [EXEC + '#DC01', SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC02-after.png', TOUR + 'A/subpackages_discover_discussions_index__默认.png', TOUR + 'B/subpackages_discover_discussions_index__默认.png'], 0.65);
c('DC02', P.dc, 'tap 任一 feed-row→modal 点「取消」', 'lightHaptic+showModal（标题=item.title、确认「去寻觅」/取消「取消」），取消停留本页',
  '执行失败：主动作 tap feed-row 无执行记录（observed 无 act:tap 条目项），modal 未打开（after 截图 14:31 无弹窗，dom .showModal:absent），后续 tap(__CAND__("取消")) element not found——动作链断裂，expected 无法核验', U, [EXEC + '#DC02', SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC02-after.png'], 0.75);
c('DC03', P.dc, 'tap modal 确认「去寻觅」', 'openPath(/pages/discover/index)→switchTab→路由=pages/discover/index',
  '未达成：act:tap "去寻觅" 执行成功记录存在（前置 modal 未打开——DC02 失败，可命中的唯一「去寻觅」为 BottomActionBar primary，文案=i18n discussions.goExplore，discussions/index.vue:110），但执行结束 getCurrentPages 仍=[subpackages/discover/discussions/index] 单层栈，switchTab 未发生、无 toast 无反馈。同 round 环境对照：LV03/DC11/MD11 的 tap 均成功产生路由变化，tap 机制整体可用，本页点击无导航非通类环境问题', F, [EXEC + '#DC03', 'apps/client/src/subpackages/discover/discussions/index.vue:109-112', SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC02-after.png（按钮存在）'], 0.65);
c('DC04', P.dc, 'tap BottomActionBar primary「去寻觅」', 'switchTab→路由=pages/discover/index',
  '执行失败：act-FAIL tap(__CAND__) element not found——按钮存在（DC02-after 截图与 tour 图右下绿色「去寻觅」可见），系执行器定位失败，点击未发生', U, [EXEC + '#DC04', SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC02-after.png'], 0.7);
c('DC05', P.dc, 'tap secondary「反馈讨论建议」', 'navigateTo feedback 页；返回落点=讨论圈且列表保留',
  'SKIPPED：action-not-automatable', U, [EXEC + '#DC05'], 0.9);
c('DC06', P.dc, '加载失败态与重试（条件用例）', 'error 文案+toast+「点击重试」恢复',
  '条件用例不可构造：断网/后端停服注入不可行（Manifest pre 自述「自动化不可注入时 UNVERIFIED」）；act-FAIL tap(__CAND__("点击重试")) not found（正常态无重试入口）', U, [EXEC + '#DC06', SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC06-after.png'], 0.85);
c('DC07', P.dc, '空数据空态（条件用例）', 'EmptyState「暂时还没有新的讨论推荐」',
  '条件用例不可构造：接口返回空数组注入手段受限；observed act:reLaunch 后 dom .empty:absent、after 截图=正常列表（与 DC06 相同 MD5 037767325a），空态未出现符合「数据非空」现状', U, [EXEC + '#DC07', SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC07-after.png'], 0.85);
c('DC08', P.dc, 'AppShell 返回与重复进出重拉', '返回落点=来源页；每次 onShow 重拉、无错误残留',
  '执行失败：act:repeatNav navigateTo ×2 均 navErr: Uncaught [object Object]，重复进出未完成；返回动作无执行记录', U, [EXEC + '#DC08'], 0.8);

// ============ ACT 组 ============
c('ACT01', P.act, '冷启动首屏断言（无点击）', '标题「线下活动」+列表默认+「列表/日历」切换列表高亮+「全部」高亮+4 条 mock 卡（a-1..a-4，a-3 初始已报名）',
  '一致：route=[subpackages/discover/activities/index]；同 suite ACT05-before 截图（14:33，同页同构建）完整核验：线下活动标题+副标题+「列表」高亮+「全部」chip 高亮+4 条活动卡（图书馆南门咖啡散步 12 人/电影社轻松线下碰面 8 人/周末篮球友谊赛 20 人已感兴趣/校园音乐节 56 人）各含感兴趣按钮，a-3 初始已报名与 Manifest mock 数据一致', V, [EXEC + '#ACT01', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT05-before.png', TOUR + 'A/subpackages_discover_activities_index__默认.png'], 0.6);
c('ACT02', P.act, 'tap「日历」→tap「列表」', '日历视图网格+今日高亮+圆点；切回列表高亮还原、筛选态与数据保留',
  '证据缺失：act:tap "日历"/act:tap "列表" 均有成功记录，但 after 截图 timeout（无任何视图状态快照），无 DOM 断言，日历视图渲染与数据保留均无证据', U, [EXEC + '#ACT02'], 0.75);
c('ACT03', P.act, 'tap「今天」→断言→tap「全部」', '过滤为空态「当前筛选下暂无活动」；切回 4 条恢复',
  '证据缺失：act:tap "今天"/act:tap "全部" 成功记录存在，after 截图=恢复「全部」后画面（MD5 c02d37bea7 与基线同），「今天→空态」中间断言无任何截图/DOM 证据', U, [EXEC + '#ACT03', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT03-after.png'], 0.7);
c('ACT04', P.act, 'tap「周末」chip', '命中 a-2（周六）与 a-3（周日）共 2 条',
  '未达成：act:tap "周末" 执行成功记录存在，但 after 截图（MD5 c02d37bea7）与点击前基线画面完全一致——仍为「全部」高亮下 4 条活动，筛选未生效、chip 高亮未迁移、列表未过滤，无 toast 无任何反馈', F, [EXEC + '#ACT04', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT04-after.png（MD5=ACT05-before，画面零变化）'], 0.65);
c('ACT05', P.act, 'tap a-1「感兴趣」按钮', '按钮 loading→变「已感兴趣」高亮+toast「报名成功」+人数 12→13；不跳详情',
  '未达成：act:tap "感兴趣" 执行成功记录存在，但 before/after 截图 MD5 完全一致（c02d37bea7）：a-1「图书馆南门咖啡散步」仍显示「感兴趣」、仍「12 人已报名」，状态未翻转、计数未 +1，无 toast——critical 交互零反馈', F, [EXEC + '#ACT05', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT05-before.png', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT05-after.png（MD5 与 before 相同）'], 0.7);
c('ACT06', P.act, 'tap a-3「已感兴趣」（取消报名）', '变「感兴趣」描边态+toast「已取消报名」+人数 20→19',
  '未达成：act:tap "已感兴趣" 执行成功记录存在，但 before/after 截图 MD5 完全一致（c02d37bea7）：a-3 仍「已感兴趣」、仍「20 人已报名」，无 toast，取消报名零反馈', F, [EXEC + '#ACT06', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT06-before.png', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT06-after.png（MD5 与 before 相同）'], 0.7);
c('ACT07', P.act, '快击 a-4「感兴趣」×5', '并发守卫下 isEnrolled 仅翻转 1 次、人数 +1 恰一次',
  '未达成：快击执行后 after 截图（14:34）显示 a-4「校园音乐节」仍「感兴趣」、仍「56 人已报名」——0 次生效（expected 至少翻转 1 次），无 toast；before 截图 timeout 但基线画面（ACT06-after 同刻画面）即为未报名态', F, [EXEC + '#ACT07', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT07-after.png', SHOT + 'wxml/SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT07-after.wxml'], 0.65);
c('ACT08', P.act, 'tap a-1 卡片主体', 'openAppPath detail?id=a-1；返回落点=活动列表且态保留',
  '执行失败：act-FAIL tap(__CAND__("卡")) element not found，点击未发生', U, [EXEC + '#ACT08'], 0.8);
c('ACT09', P.act, 'scroll-view 下拉刷新', 'refresherTriggered 动画→fetchActivities(true) 绕过 30s TTL→复位不永驻',
  '部分：observed act:refresherPull 触发 refresherrefresh+callMethod onPullDownRefresh ok（handler 被调），after 截图画面正常无刷新动画永驻；但「穿透 TTL 真实重拉」无网络请求/console 计数证据，下拉刷新真实重拉铁律项未获数据层证明', U, [EXEC + '#ACT09', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT09-after.png'], 0.7);
c('ACT10', P.act, '滚动到底触发 scrolltolower', 'mock：防抖后无新请求，底部「没有更多活动了」',
  '一致：act:pageScrollTo bottom 执行；ACT14-after 截图（14:35，页面滚动至底部）中「没有更多活动了」文案渲染可见；console 空与 mock hasMore=false 不发新请求一致。dom 断言 .noMore:absent 系选择器名与实现不符的假阴性（实际文案存在）', V, [EXEC + '#ACT10', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT14-after.png（底部「没有更多活动了」可见）'], 0.6);
c('ACT11', P.act, 'tap 底部「去寻觅」', 'switchTab→路由=pages/discover/index',
  'SKIPPED：action-not-automatable', U, [EXEC + '#ACT11'], 0.9);
c('ACT12', P.act, 'tap「提交活动提案」', 'navigateTo feedback 页；返回落点=活动页',
  'SKIPPED：action-not-automatable', U, [EXEC + '#ACT12'], 0.9);
c('ACT13', P.act, '日历月份切换 ‹‹›', '标题随点击变化、跨年正确、选中清空',
  'SKIPPED：action-not-automatable', U, [EXEC + '#ACT13'], 0.9);
c('ACT14', P.act, 'tap 今日格→选中面板→再点取消', '格子 selected 高亮+面板「{m}月{d}日 / 1个活动」+篮球赛卡；再点收起',
  '证据不足：act:tap "日" 执行成功记录存在但点击目标歧义（无法证实命中的是日历视图内今日格——「日」全等不匹配「日历」按钮亦不匹配日期数字）；after 截图（14:35）为列表视图底部（无日历网格、无选中面板）。点击目标与 expected 前置（日历视图当月）均无法建立对应关系', U, [EXEC + '#ACT14', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT14-after.png'], 0.7);
c('ACT15', P.act, '无活动日选中+非本月灰格无效点击', '空态「当日暂无活动」；非本月格点击无反应',
  '执行失败：act-FAIL tap(__CAND__("灰")) ×2 element not found，动作未执行', U, [EXEC + '#ACT15', SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT15-after.png(timeout)'], 0.8);
c('ACT16', P.act, '首拉失败错误态+重试（条件用例）', 'store errorMessage+「重试」恢复；返回落点正确',
  '条件用例不可构造且页面未到达：断网注入不可行；执行时 getCurrentPages=[pages/discover/index]（非活动页），act-FAIL tap(__CAND__("重试")) not found', U, [EXEC + '#ACT16'], 0.85);

// ============ PRI 组 ============
c('PRI01', P.pri, '冷启动 fallback 正文渲染断言', '标题「隐私政策」+fallback 长文 pre-wrap+版本号不展示+底部「我已阅读并同意」+loading 过渡',
  '一致：route=[subpackages/legal/privacy/index]；巡检 tour A/B 图核验：默认图=标题「隐私政策」+头部卡片（仅「最近更新：2026-07-26 - 2026-09-23」，无版本号元素 ✓）+fallback 正文长文（10 条目完整渲染）；滚动-底部图=底部「我已阅读并同意」主按钮渲染（流内布局，滚到底可见；源码 LegalTextPage.vue:218-230 loading/error/empty 态亦保留）。用例自身无截图（observe-only），判定采信同构建 mock 巡检截图', V, [EXEC + '#PRI01', TOUR + 'A/subpackages_legal_privacy_index__默认.png', TOUR + 'A/subpackages_legal_privacy_index__滚动-底部.png', 'apps/client/src/components/common/LegalTextPage.vue:218-230,343-348'], 0.65);
c('PRI02', P.pri, '正文长文本滚动到底/顶', '全文可滚无截断；底部按钮区不遮正文',
  '一致（noop 口径）：act:pageScrollTo bottom/top 执行成功、scrollPos=top 证据存在、无卡死无 console 错误——与 tier=noop 的采集要求（执行日志）相符', V, [EXEC + '#PRI02', 'scrollPos=top 执行日志'], 0.6);
c('PRI03', P.pri, 'tap「我已阅读并同意」', 'lightHaptic+navigateBack 落点=登录页；栈空 fail→switchTab discover',
  '执行失败：pre:navigateTo 进入成功（栈>1），但 act-FAIL tap(__CAND__("按")) element not found——按钮经巡检滚动-底部图证实存在（流内底部，视口在顶部时 automator 无法命中视口外元素），点击未发生', U, [EXEC + '#PRI03', TOUR + 'A/subpackages_legal_privacy_index__滚动-底部.png（按钮存在）'], 0.75);
c('PRI04', P.pri, 'CMS 异常兜底与重试（条件用例）', '永不抛错、失败回退本地、重试恢复',
  '条件用例不可构造：mock 构建 getLegalText 恒走本地 fallback（Manifest pre 自述「mock 恒 fallback 时 UNVERIFIED」）', U, [EXEC + '#PRI04', SHOT + 'SUBPACKAGES-LEGAL-PRIVACY-INDEX-PRI04-after.png(timeout)'], 0.9);
c('PRI05', P.pri, 'tap AppShell 返回键', '返回落点=来源页；无上级 fail 兜底 switchTab home',
  '执行失败：act-FAIL tap(__CAND__) element not found——AppShell 返回键经巡检默认图证实存在（左上「‹ 返回」），系执行器定位失败，点击未发生', U, [EXEC + '#PRI05', TOUR + 'A/subpackages_legal_privacy_index__默认.png（返回键可见）'], 0.75);
c('PRI06', P.pri, '打开即返回+重复进出缓存', '无崩溃；5 分钟缓存内二次进入不再发 GET /v1/config/legal',
  '执行失败+证据缺失：act:repeatNav navigateTo ×2 均 navErr: Uncaught [object Object]；tap(__CAND__("我已阅读并同意")) not found；无 console 请求计数证据（console 0 条）', U, [EXEC + '#PRI06'], 0.8);

// ============ AGR 组 ============
c('AGR01', P.agr, '冷启动 fallback 正文渲染断言', '标题「用户协议」+fallback 正文（含「本协议 v1.0.0」字样）+版本号不展示+底部按钮',
  '一致：route=[subpackages/legal/agreement/index]；巡检 tour A/B 图核验：用户协议标题+fallback 正文渲染+底部「我已阅读并同意」（滚动-底部图）；正文「本协议 v1.0.0」字样与 Manifest 预期口径一致', V, [EXEC + '#AGR01', TOUR + 'A/subpackages_legal_agreement_index__默认.png', TOUR + 'A/subpackages_legal_agreement_index__滚动-底部.png'], 0.65);
c('AGR02', P.agr, '正文长文本滚动到底/顶', '全文可滚无截断；底部按钮不遮正文',
  '一致（noop 口径）：act:pageScrollTo bottom/top 成功、scrollPos=top、无报错', V, [EXEC + '#AGR02', 'scrollPos=top 执行日志'], 0.6);
c('AGR03', P.agr, 'tap「我已阅读并同意」', 'navigateBack 落点=登录页；栈空→switchTab discover',
  '执行失败：pre:navigateTo 成功，act-FAIL tap(__CAND__("按")) element not found——按钮存在（同 PRI03 巡检证据），定位失败点击未发生', U, [EXEC + '#AGR03', TOUR + 'A/subpackages_legal_agreement_index__滚动-底部.png'], 0.75);
c('AGR04', P.agr, 'CMS 异常兜底与重试（条件用例）', '同 PRI04 兜底',
  '条件用例不可构造：mock 恒 fallback（Manifest pre 自述）', U, [EXEC + '#AGR04', SHOT + 'SUBPACKAGES-LEGAL-AGREEMENT-INDEX-AGR04-after.png(timeout)'], 0.9);
c('AGR05', P.agr, 'tap AppShell 返回键', '返回落点=来源页；无上级 switchTab home 兜底',
  '执行失败：act-FAIL tap(__CAND__) element not found——返回键存在（tour 默认图），定位失败', U, [EXEC + '#AGR05', TOUR + 'A/subpackages_legal_agreement_index__默认.png'], 0.75);
c('AGR06', P.agr, '重复进出：5 分钟内存缓存命中', '二次进入不再发 /v1/config/legal；正文稳定；无错误',
  '执行失败+证据缺失：act:repeatNav navigateTo ×2 均 navErr（重复进出未完成）；reLaunch 直达成功但无 console 请求计数证据（缓存命中口径无法核验）；after 截图 timeout', U, [EXEC + '#AGR06', SHOT + 'SUBPACKAGES-LEGAL-AGREEMENT-INDEX-AGR06-after.png(timeout)'], 0.8);

// ============ MD 组 ============
c('MD01', P.md, '?id=1 冷启动封存态渲染断言', '「商品详情」导航+返回键+封存卡（LOCK+功能封存中+该功能暂未开放…+返回按钮）；无商品大图/价格/购买栏；无 GET /products/1 请求',
  '一致：route=[subpackages/market/detail/index?id=1]；dom 断言 .sealed:present；after 截图（14:38）核验封存卡完整渲染：锁图标+「功能封存中」+「该功能暂未开放，开放时间将另行通知」+绿色「返回」按钮+顶部「商品详情」导航与返回键，无商品大图/价格/购买栏；console 0 条与封存不发请求一致', V, [EXEC + '#MD01', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD01-after.png'], 0.8);
c('MD02', P.md, 'tap 封存卡「返回」（栈=1 兜底）', 'goBack：栈=1→switchTab home；栈>1→navigateBack 回 shop',
  '执行失败：act-FAIL tap(__CAND__("返回")) element not found——「返回」按钮经 MD01-after 截图证实渲染于封存卡内，系执行器文案定位失败，点击未发生', U, [EXEC + '#MD02', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD01-after.png（按钮存在）'], 0.75);
c('MD03', P.md, '注入 commerce.enabled 触发 watch 补拉', 'watch 命中→自动 loadProduct(\'1\')→详情渲染；不出现整页空白',
  '证据链断裂：observed 有 act:evalSnippet commerceOn（"set via app-config"）+act:reLaunch+act:wait 1500ms，但执行结束 getCurrentPages=[pages/discover/index]（异常回落）、after 截图 timeout——补拉结果（详情/空白/notFound）均无画面证据，无法核验 watch 行为', U, [EXEC + '#MD03', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD03-after.png(timeout)'], 0.7);
c('MD04', P.md, '未封存构建详情完整渲染（条件用例）', '商品大图+名称+¥99+划线¥129+已售 56+库存 200+介绍正文',
  '条件用例不可构造：pre 注入 .enabled element not found（pre-FAIL）；after 截图（14:39）实为 notFound 空态（商品不存在或已下架+返回逛逛）而非详情页——注入残留状态下详情未渲染，expected 无法在有效前置下核验', U, [EXEC + '#MD04', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD04-after.png'], 0.75);
c('MD05', P.md, 'tap「立即购买」', 'toast「支付功能暂未开放」；无支付请求；无路由变化',
  '前置不满足：Manifest 前置「未封存详情已渲染（购买栏 :390-402）」，实测页面为 notFound 空态（MD05-after wxml：EmptyState「商品不存在或已下架」+「返回逛逛」，无购买栏）；act-FAIL tap(__CAND__("立即购买")) element not found', U, [EXEC + '#MD05', SHOT + 'wxml/SUBPACKAGES-MARKET-DETAIL-INDEX-MD05-after.wxml', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD05-before.png'], 0.8);
c('MD06', P.md, '购买快击 ×5', '不崩溃、无路由变化、无请求风暴、toast 文案正确',
  '前置不满足（同 MD05）：购买栏不存在，act-FAIL not found；after 截图（MD5 ce9442160a=notFound 画面）无崩溃——但快击交互本身未执行', U, [EXEC + '#MD06', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD06-after.png'], 0.8);
c('MD07', P.md, '无参进入→tap「返回逛逛」', 'notFound 空态+「返回逛逛」；tap→goBack 栈=1 switchTab home',
  '部分达成+动作未完成：reLaunch 无参执行成功；notFound 空态渲染与 expected 一致（MD05-after wxml：「商品不存在或已下架」+「这里空空如也」+「返回逛逛」按钮，MD04/MD08 截图同画面佐证）；但 act-FAIL tap(__CAND__("返回逛逛")) element not found——按钮存在而点击未发生，goBack 兜底未核验。另注：当前「未封存态」系 MD03 注入残留，非原生构建口径', U, [EXEC + '#MD07', SHOT + 'wxml/SUBPACKAGES-MARKET-DETAIL-INDEX-MD05-after.wxml（返回逛逛按钮存在）'], 0.7);
c('MD08', P.md, '?id=999 非法 id', 'mock find 失败→notFound 空态；不显示错误态重试（404 与网络错误区分）',
  '一致：act:reLaunch ?id=999 成功，after 截图（14:40）核验 notFound 空态渲染：「商品不存在或已下架」+「这里空空如也」+「返回逛逛」按钮，无网络错误重试入口——404 与错误态区分正确', V, [EXEC + '#MD08', SHOT + 'SUBPACKAGES-MARKET-DETAIL-INDEX-MD08-after.png'], 0.7);
c('MD09', P.md, '导航栏返回键两态', '栈>1 navigateBack 回 shop；栈=1 switchTab home',
  'SKIPPED：action-not-automatable', U, [EXEC + '#MD09'], 0.9);
c('MD10', P.md, '详情滚动与购买栏不遮挡（noop）', '160rpx footer 留白、商品介绍完整可读、fixed 购买栏不遮内容',
  '前置不满足：期望滚动对象为「未封存详情已渲染」态，实测页面为封存/notFound 态（无商品介绍内容可滚）；act:pageScrollTo bottom/top 在错误状态下执行，noop 证据无效', U, [EXEC + '#MD10'], 0.8);
c('MD11', P.md, '从 shop 页商品卡进入', 'query id=所点商品；未封存时名称/价格一致；返回落点=shop',
  '部分：act:tap "品" 后 getCurrentPages=[subpackages/market/detail/index]——从 shop 到 detail 的入口链路导航发生 ✓；但 route 快照 options={} 无法核验 query id 一致性，且页面处于封存/notFound 态无法核对名称价格，返回落点未测——expected 三断言仅导航发生一项有证据', U, [EXEC + '#MD11'], 0.7);
c('MD12', P.md, '打开即返回（onLoad 竞态）', '无崩溃；销毁后 watch 不误触发；路由回落正常',
  '执行失败：act-FAIL tap(__CAND__("返回")) element not found，「立即返回」动作未发生', U, [EXEC + '#MD12'], 0.8);

// ============ Issues ============
const issues = [
  {
    id: 'MP-R1-次要25-1', round: 'R1', page: P.act,
    screenshot: SHOT + 'SUBPACKAGES-DISCOVER-ACTIVITIES-INDEX-ACT05-after.png（与 before MD5 相同 c02d37bea7）；ACT06/ACT07-after 同口径',
    category: 'Interaction', severity: 'P1',
    description: '活动页核心交互点击零反馈：筛选 chip「周末」（ACT04）点击后画面零变化（MD5 与点击前完全一致，仍「全部」4 条）；报名「感兴趣」/取消报名「已感兴趣」（ACT05/06/07）点击后按钮状态不翻转、人数不变、无 toast——ACT05 before/after 与 ACT06 before/after 截图 MD5 两两相同（c02d37bea7），ACT07 快击×5 后 a-4 仍「感兴趣 56 人」（0 次生效）。违反交互铁律「可点击元素 500ms 内必须有可观测反馈」。环境对照：同 round 中 login 页 tap→toast（LG04/LG10 等 126 条）、shop 商品卡 tap→路由（MD11）、likes-visitors tap→路由（LV03）、discover tap→路由（DC11）均生效，tap 机制整体可用，排除通类自动化失效；不排除该页 scroll-view/组件层级下事件绑定的页面级缺陷，需真机手测复核',
    evidence: 'exec-results#ACT04/05/06/07 observed（act:tap 成功记录+toast 空）+ 截图 MD5 对比（c02d37bea7/bee91faf6c）+ Manifest.expected（ACT05: 翻转+12→13+toast「报名成功」）',
    sources: ['screenshot', 'interaction', 'code'], confidence: 0.65,
    ideal: 'tap「感兴趣」→ 按钮 loading→「已感兴趣」高亮+toast「报名成功」+人数 +1；tap「周末」→ 列表过滤为 a-2/a-3 两条且 chip 高亮迁移',
    fix: '排查 activities/index.vue 报名按钮与筛选 chip 的 @tap 绑定链（.stop 修饰/组件事件透传/scroll-view 子节点命中），真机手测复核后修复；修复后重跑 ACT03-07',
    status: '待修复',
  },
  {
    id: 'MP-R1-次要25-2', round: 'R1', page: P.fb,
    screenshot: SHOT + 'SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB02-after.png（tap「建议」后高亮仍在「反馈」）',
    category: 'Interaction', severity: 'P2',
    description: '反馈页类型 chip 点击高亮不迁移：tap「建议」执行成功记录存在，after 截图中 chip--active 仍在「反馈」（aria-selected=true），且 Manifest 动作序列的三连 tap 仅执行了第 1 个；wxml 快照（FB08-after 时点）同样显示 active=反馈。与 MP-R1-次要25-1 疑似同根因（该分包页 tap 事件不触发：FB02 chip/FB07 提交/FB15 历史记录三处点击均零反馈）',
    evidence: 'exec-results#FB02 observed（仅 1 次 act:tap+无 toast）+ FB02-after 截图 + wxml/SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB08-after.wxml（chip--active=反馈）',
    sources: ['screenshot', 'interaction', 'code'], confidence: 0.6,
    ideal: 'tap「建议」→ chip--active 迁移至建议、aria-selected 同步，提交按建议类型分发',
    fix: '与 MP-R1-次要25-1 同批排查 feedback/index.vue chip @tap 绑定与 press-feedback 自定义 hover 实现；修复后重跑 FB02/FB07/FB15',
    status: '待修复',
  },
  {
    id: 'MP-R1-次要25-3', round: 'R1', page: P.fb,
    screenshot: SHOT + 'wxml/SUBPACKAGES-SUPPORT-FEEDBACK-INDEX-FB07-after.wxml；FB07 before/after 截图（timeout）',
    category: 'Function', severity: 'P1',
    description: '空提交校验拦截零反馈（critical 用例 FB07）：tap「提交」成功记录存在，但 toast 数组为空、无路由变化、无请求记录、无任何可观测反馈。同 round toast 捕获机制正常（他页 126 条 toast 成功捕获，含 LG10「请先阅读并同意用户协议」同类拦截 toast），空 toast 为有效阴性证据。无论表单为空（应弹「提交失败，请稍后重试」）还是残留 FB03 标题（内容必填仍应拦截），均应有 toast 反馈',
    evidence: 'exec-results#FB07 observed（act:tap "提交"+toast:[]）+ toast 机制正常对照（同文件 LG04/LG10/126 条）+ Manifest.expected（:312-320 errorHaptic+toast）',
    sources: ['interaction', 'code', 'log'], confidence: 0.6,
    ideal: '空表单 tap 提交→errorHaptic+toast「提交失败，请稍后重试」+无网络请求+表单保留',
    fix: '与 MP-R1-次要25-2 同根因排查（提交按钮 @tap 未触发则校验函数未执行）；若真机复核事件已触发但校验分支静默 return，则补 toast/haptic 分支；修复后重跑 FB07-09',
    status: '待修复',
  },
  {
    id: 'MP-R1-次要25-4', round: 'R1', page: P.fb,
    screenshot: '（无截图，路由链证据）exec-results#FB15 route=[subpackages/support/feedback/index]',
    category: 'Interaction', severity: 'P1',
    description: '「历史记录」入口点击无导航（FB15）：act:tap "历史记录" 执行成功，但 getCurrentPages 始终为反馈页单层栈，未发生 navigateTo；目标页 /subpackages/profile-extra/feedback/history 已注册（pages.json:239）、按钮存在（feedback/index.vue:549-554 history-header__btn + :554 文案「历史记录」）、navigateTo 带 .catch 兜底（:377）——点击后无路由、无 toast、无失败提示，违反导航反馈铁律',
    evidence: 'exec-results#FB15 observed+route + pages.json:239 + feedback/index.vue:549-554,363-381',
    sources: ['interaction', 'code'], confidence: 0.6,
    ideal: 'tap「历史记录」→ navigateTo history 页，返回落点=反馈页',
    fix: '与 MP-R1-次要25-2 同批排查该按钮 @tap 绑定链（SectionCard 内按钮事件透传）；修复后重跑 FB15/FB16',
    status: '待修复',
  },
  {
    id: 'MP-R1-次要25-5', round: 'R1', page: P.dc,
    screenshot: SHOT + 'SUBPACKAGES-DISCOVER-DISCUSSIONS-INDEX-DC02-after.png（底部「去寻觅」按钮可见）',
    category: 'Interaction', severity: 'P1',
    description: '讨论圈底部主按钮「去寻觅」点击无导航（DC03）：act:tap "去寻觅" 执行成功（DC02 modal 未打开，命中的唯一「去寻觅」为 BottomActionBar primary，文案=i18n discussions.goExplore，discussions/index.vue:110），但 getCurrentPages 仍为讨论页单层栈，switchTab(/pages/discover/index) 未发生、无 toast。同 round shop/discover/likes 页 tap 导航均生效（MD11/LV03/DC11），排除通类环境失效',
    evidence: 'exec-results#DC03 observed+route + discussions/index.vue:109-112 + 环境对照（MD11/LV03/DC11 tap 生效）',
    sources: ['interaction', 'code'], confidence: 0.65,
    ideal: 'tap「去寻觅」→ switchTab pages/discover/index',
    fix: '排查 BottomActionBar 组件 @primary 事件链（组件内 emit→页面 openPath→utils/navigation.ts switchTab）在该页的绑定；与 MP-R1-次要25-1 同批真机复核；修复后重跑 DC03/DC04',
    status: '待修复',
  },
];

// ============ unverifiable ============
const unverifiable = [];
function u(cases, reason, tries) { for (const id of cases) unverifiable.push(`${id}|${reason}|${tries}`); }
u(['DEV01', 'DEV02', 'DEV03', 'DEV04', 'DEV05', 'DEV08', 'DEV09', 'DEV10'],
  '前置构建不符：执行构建为 mock 构建，dev/index 仅 #ifdef DEV 注册（pages.json:272-277），reLaunch 全部 NAV_ERROR，页面未到达（DEV03 wxml 证实栈顶=选择兴趣页）', 1);
u(['DEV06'], '条件用例（产物含本页而运行时 isDev=false）无法构造；Manifest 预定跳过标 UNVERIFIED', 1);
u(['DEV07'], '执行器标记 action-not-automatable（逐个 tap 4 个 isTab 项）', 1);
u(['SC01', 'SC03', 'SC06', 'SC07', 'SC08'], '前置构建不符：非展示构建下 showcase 页 onShow 立即回落 discover，页面内容未渲染，元素不存在', 1);
u(['SC04', 'SC05'], '执行器标记 action-not-automatable', 1);
u(['FB03'], '三处输入仅标题有执行与回显证据，内容/微信号输入无执行记录（回显仅核验 1/3）', 1);
u(['FB04', 'FB05', 'FB06'], '输入动作定位失败（__CAND__ element not found），清空/超长/特殊字符均未注入', 1);
u(['FB08', 'FB09'], '前置「标题+内容已填」未完整构造（仅标题有输入证据，FB08-before 证实内容为空）；tap 提交后无 toast、截图 MD5 无变化', 1);
u(['FB10', 'FB12', 'FB13', 'FB14', 'FB16'], '执行器标记 action-not-automatable（系统选图/预览/授权态/文件注入不可自动化）', 1);
u(['FB11'], '前置「已有 1 张已上传缩略图」不满足（FB10 未执行），longpress 定位失败', 1);
u(['FB17'], '条件用例不可构造：mock 构建 clientApi 恒成功，失败分支无法注入', 1);
u(['FB18'], 'navigateBack NAV_ERROR（reLaunch 进入栈=1 无上级）+AppShell 返回按钮定位失败', 1);
u(['DC02'], '主动作 tap feed-row 无执行记录，modal 未打开（after 截图无弹窗），动作链断裂', 1);
u(['DC04'], '执行器定位失败（按钮经截图证实存在），点击未发生', 1);
u(['DC05'], '执行器标记 action-not-automatable', 1);
u(['DC06', 'DC07'], '条件用例不可构造：断网注入/空数据注入手段受限（Manifest pre 自述）', 1);
u(['DC08'], 'repeatNav navigateTo ×2 均 navErr: Uncaught [object Object]，重复进出未完成', 1);
u(['ACT02', 'ACT03'], '动作有执行记录但关键中间态（日历视图/今天空态）无截图无 DOM 断言证据（ACT02 截图 timeout；ACT03 仅恢复后画面）', 1);
u(['ACT08', 'ACT15'], '动作定位失败（__CAND__("卡")/("灰") element not found）', 1);
u(['ACT09'], 'refresher 触发与 handler 调用有记录，但「穿透 30s TTL 真实重拉」无网络/console 请求计数证据', 1);
u(['ACT11', 'ACT12', 'ACT13'], '执行器标记 action-not-automatable', 1);
u(['ACT14'], 'tap "日" 点击目标歧义（无法证实命中日历视图今日格），after 截图为列表视图无选中面板', 1);
u(['ACT16'], '条件用例不可构造（断网注入）且执行时栈顶=discover 页（页面未到达）', 1);
u(['PRI03', 'AGR03'], 'tap「我已阅读并同意」定位失败——按钮经巡检滚动-底部图证实存在（流内底部，视口顶部时 automator 无法命中视口外元素）', 1);
u(['PRI04', 'AGR04'], '条件用例不可构造：mock 构建 getLegalText 恒走本地 fallback', 1);
u(['PRI05', 'AGR05'], 'AppShell 返回键定位失败——按钮经巡检默认图证实存在（左上「‹ 返回」）', 1);
u(['PRI06', 'AGR06'], 'repeatNav navigateTo ×2 均 navErr；内存缓存命中无 console 请求计数证据', 1);
u(['MD02', 'MD12'], '「返回」按钮 tap 定位失败（按钮经 MD01 截图证实存在）', 1);
u(['MD03'], '证据链断裂：注入+reLaunch 有记录但 route 异常回落 discover、after 截图 timeout，watch 补拉结果无画面证据', 1);
u(['MD04'], '条件用例不可构造：switches 注入 pre-FAIL；after 截图实为 notFound 态而非详情', 1);
u(['MD05', 'MD06', 'MD10'], '前置「未封存详情已渲染」不满足（页面为 notFound/封存态，无购买栏无商品介绍）', 1);
u(['MD07'], 'notFound 空态渲染与 expected 一致，但 tap「返回逛逛」定位失败（按钮经 wxml 证实存在），goBack 兜底未核验', 1);
u(['MD09'], '执行器标记 action-not-automatable', 1);
u(['MD11'], 'shop→detail 导航发生，但 route 快照 options={} 无法核验 query id 一致性，返回落点未测', 1);

const result = {
  round: 'R1',
  judge: 'A6-交互判定员-次要25',
  generatedAt: new Date().toISOString(),
  sources: {
    manifest: MANI,
    execResults: EXEC,
    screenshots: 'reports/screenshots/round-1-interact/',
    tourScreenshots: 'reports/audit/round-1/screenshot-manifest.json → reports/screenshots/round-1-tour/',
    buildMode: 'build:mp-weixin:mock',
  },
  summary: {
    total: checks.length,
    VERIFIED: checks.filter(x => x.verdict === V).length,
    FAILED: checks.filter(x => x.verdict === F).length,
    UNVERIFIED: checks.filter(x => x.verdict === U).length,
    issues: issues.length,
  },
  checks, issues, unverifiable,
  notes: [
    '判定口径：Manifest.expected（权威）vs exec-results.observed（权威）vs 截图三方对照；执行失败/证据缺失/前置不满足一律 UNVERIFIED，禁止凭代码推测判 VERIFIED。',
    '关键仲裁证据：(1) toast 捕获机制本 round 正常（exec-results 他页 126 条 toast），故我负责 84 条用例 toast 全空为有效阴性证据；(2) tap 机制整体可用（MD11 shop 卡/LV03/DC11 tap 产生路由变化、login 页 tap 产生 toast），但 feedback/activities/discussions 三个分包页内全部 tap（chip/提交/历史记录/报名/筛选/去寻觅）均零反馈且截图 MD5 前后一致——FAILED 5 项据此成立，均标注「不排除分包页组件 tap 派发的环境限制，需真机复核」；input 输入（FB03 标题回显）与 callMethod（ACT09 refresher）证明页面 JS 运行正常。',
    'DEV 组整体 UNVERIFIED：执行构建 build:mp-weixin:mock 未启用 #ifdef DEV（pages.json:272-277），dev 页未注册（reLaunch NAV_ERROR，DEV03 wxml 证实停在「选择兴趣」页）——与 Manifest「正式构建 reLaunch 应 fail」对照项吻合，非产品缺陷；如需核验 DEV 用例须以 DEV 条件编译构建重跑。',
    'PRI/AGR 组 VERIFIED 判定采信同构建（build:mp-weixin:mock）巡检 tour A/B 双身份截图（screenshot-manifest.json 305 张之内），用例自身执行仅提供路由证据；「我已阅读并同意」为流内布局需滚动到达（LegalTextPage.vue:343-348 非 fixed），相关 tap not found 均按定位失败处理而非按钮缺失。',
    '观察记录（不足以立 Issue，建议复测）：MD03/MD04 注入 commerce.enabled=true 残留状态下 reLaunch ?id=1 页面显示 notFound 而非商品详情（MD04-after 截图），与「解封竞态补偿 watch 自动补拉」（MP-R1-次要24-1 回归点）预期不符，但证据链断裂（route 异常回落 discover+截图超时），本次不立 Issue，建议修复验证时专项复测；MD07/MD08 的 notFound 空态渲染本身正确。',
    'PRI02/AGR02 的 VERIFIED 为 noop 口径：采集要求即执行日志（scrollPos=top），非视觉核验。',
  ],
};

fs.writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
console.log('written:', OUT);
console.log('summary:', JSON.stringify(result.summary));
console.log('unverifiable count:', unverifiable.length);
