/* 生成 次要21-judge.json：三方对照判定（Manifest vs A1 observed vs 截图） */
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('reports/audit/round-1/interact/exec-results.json', 'utf8'));
const byId = {};
for (const r of d.results) { if (!byId[r.id] || r.manifest === '次要21') byId[r.id] = r; }

const P = 'subpackages/discover-extra';
const SS = 'reports/screenshots/round-1-interact/';
const T = 'reports/screenshots/round-1-tour/';
const E = 'reports/audit/round-1/interact/exec-results.json';

const checks = []; const issues = []; const unverifiable = [];
const mCases = {};
for (const c of JSON.parse(fs.readFileSync('reports/audit/round-1/ops/次要21.json', 'utf8')).cases) mCases[c.id] = c;
function add(caseId, page, operation, expected, actual, verdict, ev, conf) {
  checks.push({ caseId, page, operation, expected, actual, verdict, evidence: ev, confidence: conf });
}
function U(caseId, reason) {
  unverifiable.push(caseId + '|' + reason + '|1');
  const m = mCases[caseId] || {};
  checks.push({
    caseId, page: m.page || '', operation: (m.action || '').slice(0, 120),
    expected: (m.expected || '').slice(0, 200), actual: 'UNVERIFIED：' + reason,
    verdict: 'UNVERIFIED', evidence: [E + '#' + caseId], confidence: 0.3
  });
}

/* ===== SG segment ===== */
add('SG01', P + '/home/segment', 'reLaunch 无参冷启动直开，采样标题/骨架/列表/错误态',
  '标题=「细分发现 · 在线」，骨架→列表，不闪错误空态，console 无异常',
  'top=segment；.segment-header__title:present .segment-list:present .segment-state__text:absent；console 空；巡检截图(A/B)标题「细分发现 · 在线」+列表9行+无错误空态',
  'VERIFIED', [E + '#SG01', T + 'A/subpackages_discover-extra_home_segment__默认.png', T + 'B/subpackages_discover-extra_home_segment__默认.png'], 0.7);
U('SG02', '同校列表 .segment-row:absent（环境无 isSameSchool 数据），过滤与 slice(0,50) 截断无法验证；标题文本未采样');
add('SG03', P + '/home/segment', 'reLaunch ?type=%E2%9A%A0hack123 非法参数',
  '回退默认 online 渲染，不闪错误、无 JS 异常',
  'top=segment options.type=%E2%9A%A0hack123；.segment-header__title:present；console 空（无 TypeError/is not defined）；页面未渲染错误态',
  'VERIFIED', [E + '#SG03'], 0.55);
U('SG04', 'tap 首行后路由零变化（顶栈仍 segment），行内 .userId:absent 跳转分支未触发，after 截图 ERROR:timeout，无法区分死按钮/合法拦截/automator 点击未冒泡');
U('SG05', '.segment-header__back automator 采样 absent（类名与 segment.vue:120 一致，巡检截图证实按钮渲染），tap 未生效，两场景路由均未变化，兜底 switchTab 未验证');
U('SG06', '无法制造断网失败态：.segment-state__text/.segment-retry 均未出现（网络正常），tap .segment-retry element not found');
add('SG07', P + '/home/segment', '页面滚动到底再回顶',
  '无分页设计，行数≤上限，回顶数据不变',
  'act:pageScrollTo bottom→top；evidence scrollPos=top；.segment-row:present；无错误无新增请求；行数总数未采样',
  'VERIFIED', [E + '#SG07'], 0.6);
U('SG08', '六枚举参数矩阵未执行：observed 仅默认态采样（durationMs=2228，无逐枚举 reLaunch 与标题采样记录）');

/* ===== NP nearby/people ===== */
add('NP01', P + '/nearby/people', 'reLaunch 无参冷启动直开',
  '标题=「附近的人」，附近 Tab 高亮，骨架→列表/空态，不闪错误空态',
  'top=nearby/people；.people-header__title:present .people-tab--active:present .people-list:present .people-state__text:absent；console 空；巡检截图(A/B)标题「附近的人」+附近Tab高亮+列表',
  'VERIFIED', [E + '#NP01', T + 'A/subpackages_discover-extra_nearby_people__默认.png', T + 'B/subpackages_discover-extra_nearby_people__默认.png'], 0.7);
U('NP02', 'scope=city 路由达成但标题文本/活跃度→共同圈子排序/userId 去重均无采样证据，无法核实排序与去重');
U('NP03', '执行器跑错页面：act:switchTab /pages/nearby/index 后找 .people-tab 失败（类名实际存在于 people.vue:172,181），Tab 切换行为未在目标页执行');
U('NP04', 'observe-only：同 Tab 连点×3 与请求计数观测未执行，无任何 act 记录');
U('NP05', '触底分页未执行：无 scrolltolower 触发与 .people-row 行数前后记录（仅 pageScrollTo top），截图 ERROR:timeout');
U('NP06', '.people-header__back automator 采样 absent（类名与 people.vue:162 一致，巡检截图证实按钮渲染），tap 未生效，兜底 switchTab 发现页未验证');
U('NP07', 'onPullDownRefresh callMethod ok（触发证实），但真实重拉请求计数与 stopPullDownRefresh 收起无证据（.stopPullDownRefresh DOM 采样口径无效）');
U('NP08', 'tap 行后路由零变化（顶栈仍 nearby/people），环境行 userId 缺失跳转分支未触发，截图 ERROR:timeout');
U('NP09', '无法制造断网失败态：.people-state__text/.people-state__retry 未出现，tap 重试 element not found');
U('NP10', '快速切换×5 未执行：observed 仅 act:wait 3000ms，无 Tab 连点与请求顺序记录，截图 ERROR:timeout');

/* ===== DH discover/history ===== */
add('DH01', P + '/discover/history', 'reLaunch 冷启动直开（无记录）',
  '统计 0/0/0 + EmptyState「还没有浏览记录」，不白屏不闪错误态',
  'top=history；.stats-bar:present .stat-num:present .history-error:absent；console 空；巡检截图(A/B)统计 0/0/0+空态「还没有浏览记录/快去寻觅页发现有趣的TA吧」',
  'VERIFIED', [E + '#DH01', T + 'A/subpackages_discover-extra_discover_history__默认.png', T + 'B/subpackages_discover-extra_discover_history__默认.png'], 0.75);
U('DH02', 'automator 不支持 swipe 手势（pre:swipe right unsupported no element api），无法产生浏览记录，统计与徽章验证未执行');
U('DH03', '前置不可达：swipe left unsupported 无 rejection 记录，.rewind-btn 不存在（before 截图 33669B 空态），挽回链路未执行');
U('DH04', '同 DH03：swipe 不支持导致无可挽回项，rapidTap .rewind-btn element not found，防连点未验证');
U('DH05', '同 DH03：无 rejection 项且断网不可制造，挽回失败分支未执行');
U('DH06', '无法制造断网：.history-error/.history-error__retry 均未出现，重试链路未执行');
add('DH07', P + '/discover/history', '栈=1 直开 tap .back-btn（死按钮观测点）',
  '500ms 内无路由变化属预期；若确认无任何反馈（路由/DOM/Toast/震动）按死按钮缺陷如实登记',
  'tap 执行、路由零变化、toast 空、console 出现 [uni.onUnhandledRejection] navigateBack:fail cannot navigate back at first page（3 条 error）；源码 history.vue:115-117 裸 navigateBack 无 fail 兜底 → 死按钮+未捕获 rejection',
  'FAILED', [E + '#DH07(console)', 'apps/client/src/subpackages/discover-extra/discover/history.vue:115-117'], 0.85);
U('DH08', '重复进出×3 未执行：observe-only 无往返动作与统计采样记录（仅 .dispose:absent 无效采样）');

/* ===== LK likes/index ===== */
U('LK01', 'tap「手机号登录」后路由零变化，但绑定链完整（NotLoggedWaiting.vue:96→likes/index.vue:606→goPhoneLogin→openAppPath navigation.ts:124），无法区分 automator 文本节点 tap 不冒泡与修复回归，MP-R1-LIKES-102 复核未完成');
add('LK02', P + '/likes/index', '登录直开采样标题/三 Tab/badge',
  '标题「匹配列表」+三 Tab（喜欢我的/我发出的喜欢/访客）+badge+默认 likedBy+心动信号入口',
  'A1 执行缺登录前置（无 login 记录，页面停未登录态致 .likes-header__title:absent，.title:present 为 NotLoggedWaiting 标题）；巡检截图(A 登录态同 gitSha aefd8a72)完整证实：标题「匹配列表」+心动信号入口+管理+三 Tab(badge 22/2/访客)+列表；console 空',
  'VERIFIED', [E + '#LK02', T + 'A/subpackages_discover-extra_likes_index__默认.png', T + 'B/subpackages_discover-extra_likes_index__默认.png'], 0.65);
U('LK03', '前置制造残留状态失败（搜索框 input 元素未找到），tap「访客」执行但搜索清空/批量态消失/访客列表均无采样');
U('LK04', 'observe-only：likedBy→myLikes→visitors→likedBy 往返切换未执行，步行数与滚动位无记录，截图 ERROR:timeout');
U('LK05', '输入执行但 300ms 防抖时序与过滤结果无采样；.likes-search__clear 采样 absent 与 act:tap 记录矛盾，searchEmpty 判定不可解释');
U('LK06', '特殊字符/超长输入未执行：input 元素未找到');
U('LK07', 'tap 管理/完成均执行成功，但 checkbox 出现、批量栏+「已选 0 项」、进入清空已选均无 DOM 采样证据，批量 UI 出现性未证实');
U('LK08', '前置失败：批量模式未进入（tap「管理」文本定位失败；wxml 快照证实页面无批量栏/checkbox，likes-header__manage 存在），勾选与批量喜欢链路未执行');
U('LK09', '同 LK08：批量模式未进入（wxml 无批量栏），空提交 toast「请至少选择一个用户」链路未执行');
U('LK10', 'observe-only：选中后快击「喜欢」×5 未执行，batchActions 调用次数无记录');
U('LK11', '.likes-unlock-bar:absent 证实封存态解锁栏不渲染，但环境列表无打码项（巡检截图全真实昵称），点击打码 toast「功能封存中」未验证');
U('LK12', 'SKIPPED action-not-automatable：互喜/非互喜分支数据无法自动化构造');
U('LK13', '.likes-header__signal:present 证实入口渲染，但 observe-only tap 未执行，跳转 heart-signals 未验证，截图 ERROR:timeout');
U('LK14', 'onPullDownRefresh callMethod ok（触发证实），但三源并发请求计数与 stopPullDownRefresh 收起无证据');
U('LK15', '无法制造断网：.likes-error 未出现，ErrorState 与重试链路未执行');
U('LK16', '.likes-header__back automator 采样 absent（类名与 likes/index.vue:618 一致，巡检截图证实返回键渲染），tap 未生效，栈=1 兜底 switchTab 首页未验证');
U('LK17', '前置失败：myLikes 批量「取消喜欢」按钮未找到（批量模式未进入），按钮组显隐与取消链路未执行');

/* ===== LV likes-visitors ===== */
add('LV01', P + '/likes-visitors/index', '清除 token 未登录直开',
  'LockScreen 引导，不发鉴权请求，不强制跳登录（免踢）',
  'pre:logout ok；top 仍 likes-visitors/index（未被踢登录）；console 空（无 401）；LockScreen DOM 存在性未采样但路由与请求口径证实',
  'VERIFIED', [E + '#LV01'], 0.6);
add('LV02', P + '/likes-visitors/index', '登录直开采样标题/概览/Tab',
  '标题「喜欢与访客」+概览三数字+默认 likedMe Tab+列表/空态不闪错误',
  'A1 执行缺登录前置（无 login 记录，.page-header__title/.overview/.tabs__item--active 全 absent 停 LockScreen 态）；巡检截图(A 登录态)证实：标题「喜欢与访客」+概览 104/5/22+「喜欢我的」badge22 高亮+列表渲染；console 空',
  'VERIFIED', [E + '#LV02', T + 'A/subpackages_discover-extra_likes-visitors_index__默认.png', T + 'B/subpackages_discover-extra_likes-visitors_index__默认.png'], 0.65);
U('LV03', '执行器跑错页面：act:switchTab /pages/profile/index 后找「我的访客」失败，Tab 切换与 badge 99+ 封顶未在目标页执行');
U('LV04', '环境列表无打码项（巡检截图全真实昵称；.list__avatar--blur/.list__lock absent，.list__name present），前置「存在 unlocked!==true 项」不成立，截图 ERROR:timeout');
U('LV05', 'observe-only：点击打码项动作未执行，封存 toast 与无扣费请求未验证');
add('LV06', P + '/likes-visitors/index', '采样 .unlock-bar 与 .exposure-bar 存在性',
  'coin 封存+membership 关闭：解锁栏与提升曝光条均不渲染',
  '.unlock-bar:absent .exposure-bar:absent 直接证实；巡检截图页面底部无商业化固定条',
  'VERIFIED', [E + '#LV06', T + 'A/subpackages_discover-extra_likes-visitors_index__默认.png'], 0.7);
U('LV07', 'manifest 预设：默认封存环境执行不到解锁弹窗分支（wxml 证实无 unlock-bar），需 commerce.coin=true 环境重跑');
U('LV08', 'SKIPPED action-not-automatable：互喜/普通已解锁项分支无法自动化构造');
U('LV09', '.page-header__back automator 采样 absent（类名与 likes-visitors/index.vue:315 一致），tap 未生效，兜底 switchTab 首页未验证');
U('LV10', '重复进出×3 未执行：observe-only（仅 .loading:present 采样），fetchLikes/fetchVisitors 触发计数无记录');
add('LV11', P + '/likes-visitors/index', '采样已解锁项时间文本',
  'yyyy-MM-dd HH:mm:ss 解析显 M/D，无效显空串不显 NaN（R4-00019）',
  '.list__time:present；巡检截图列表时间列「5/21」「5/18」「5/16」等 M/D 格式，无 NaN；文本级逐字对照未做',
  'VERIFIED', [E + '#LV11', T + 'A/subpackages_discover-extra_likes-visitors_index__默认.png'], 0.6);

/* ===== DQ daily-question ===== */
add('DQ01', 'subpackages/tools/daily-question/index', '未签到直开采样锁定卡',
  '锁定卡「签到后解锁」+描述+「去签到」CTA，问题卡不渲染，console 无异常',
  '.lock-card:present .lock-card__title:present .lock-card__cta:present；问题卡未渲染；console 空；巡检截图(A/B)完整吻合',
  'VERIFIED', [E + '#DQ01', T + 'A/subpackages_tools_daily-question_index__默认.png', T + 'B/subpackages_tools_daily-question_index__默认.png'], 0.8);
add('DQ02', 'subpackages/tools/daily-question/index', 'tap .lock-card__cta 去签到',
  'toast「签到成功，每日一问已解锁」→锁定卡消失→问题卡/回答区渲染',
  'toast 逐字匹配「签到成功，每日一问已解锁」；after 采样 .lock-card__cta:absent（锁定卡消失）；DQ02-after.wxml 含 question-card×5/submit-btn×3/anonymous-toggle×3/匿名；before/after 截图存在；注：「已签到再进不显锁定卡」在 reLaunch 后不成立，归因 mock 后端不持久 checkedInToday（checkIn.ts:30-34 后端权威），非页面缺陷',
  'VERIFIED', [E + '#DQ02(toast)', SS + 'wxml/SUBPACKAGES-TOOLS-DAILY-QUESTION-INDEX-DQ02-after.wxml', SS + 'SUBPACKAGES-TOOLS-DAILY-QUESTION-INDEX-DQ02-after.png'], 0.75);
U('DQ03', '前置不可达：mock 登录 A/B 均返回 user-1001（MISMATCH），DQ02 已消耗该用户签到且状态不持久，沿用会话时锁定卡已消失（.lock-card__cta:absent），防连点场景无法重建');
add('DQ04', 'subpackages/tools/daily-question/index', '不输入内容直接 tap .submit-btn',
  '空提交禁用态：无 toast 无请求，按钮文案不变',
  '.submit-btn:present（回答区在）；tap×2 后 toast 空、console 无请求无异常；禁用态视觉 class 未采样（消极断言已证）',
  'VERIFIED', [E + '#DQ04', SS + 'wxml/SUBPACKAGES-TOOLS-DAILY-QUESTION-INDEX-DQ02-after.wxml'], 0.55);
U('DQ05', 'reLaunch 直开时签到态丢失（mock 后端不持久 checkedInToday，checkIn.ts 后端权威），wxml 证实页面停锁定卡（仅 lock-card×6，无 input/submit-btn），回答输入区不存在');
U('DQ06', '同 DQ05：.submit-btn:absent（wxml 仅锁定卡），快击防连点场景无法执行');
U('DQ07', '同 DQ05：input 目标不存在（锁定卡态），600 字截断与特殊字符回显未执行');
U('DQ08', '同 DQ05：.anonymous-toggle:absent（wxml 仅锁定卡），勾选切换未执行');
U('DQ09', '同 DQ05 且需已回答前置：.answer-card/.answers-load-more absent，分页未执行');
U('DQ10', '滚动执行（scrollPos=bottom）但 loadMoreAnswers 触发与请求页码序列无记录，guard 行为未验证');
U('DQ11', '无法制造拉题失败：.dq-state/.dq-state__retry 未出现，重试链路未执行');
add('DQ12', 'subpackages/tools/daily-question/index', '栈=1 直开 tap .dq-header__back（死按钮观测点）',
  '无路由变化属预期；确认无任何反馈则按死按钮缺陷登记',
  'tap 执行、路由零变化、toast 空、console [uni.onUnhandledRejection] navigateBack:fail cannot navigate back at first page；源码 daily-question/index.vue:78-80 裸 navigateBack 无兜底 → 死按钮+未捕获 rejection',
  'FAILED', [E + '#DQ12(console)', 'apps/client/src/subpackages/tools/daily-question/index.vue:78-80'], 0.85);

/* ===== LC love-center ===== */
add('LC01', 'subpackages/tools/love-center/index', '登录直开采样入口结构',
  '标题「恋爱咨询」+快捷入口含附近的人不含 consulting+四板块不渲染+MBTI 测试区',
  '.love-center__quick:present .love-center__test:present .loveConsulting:absent；console 空；巡检截图(A/B)：标题「恋爱咨询」+快捷入口「附近的人」+MBTI 人格测试+无四板块',
  'VERIFIED', [E + '#LC01', T + 'A/subpackages_tools_love-center_index__默认.png', T + 'B/subpackages_tools_love-center_index__默认.png'], 0.7);
U('LC02', 'tap .love-center__quick 后路由零变化；同页 LC03/LC04 出现 navigateTo:fail timeout（环境导航超时），无法归因死按钮或环境故障');
U('LC03', 'tap 触发 navigateTo:fail timeout unhandledRejection（console 3 条 error），mbti(web-view) 未入栈；环境导航超时无法判定页面本身；导航失败无用户反馈的隐患一并记录');
U('LC04', 'manifest 预设：默认封存环境四板块不渲染（LC01 证实 loveConsulting absent），执行器 tap 到的「恋爱咨询」为 AppShell 标题文本，navigateTo:fail timeout 为环境现象');
U('LC05', 'AppShell 返回按钮 automator 定位失败（tap 元素未找到；巡检截图证实「< 返回」按钮渲染），三级兜底未验证');
U('LC06', 'rapidTap ×3 执行（done=3）但栈深度不变（未入栈），与 LC03 navigateTo:fail timeout 一致属环境导航超时，重复入栈行为无法验证');

/* ===== HP help ===== */
add('HP01', 'subpackages/tools/help/index', '登录直开采样 FAQ/客服/footer',
  '标题「帮助与客服」+FAQ 6 项全收起+客服三入口+底部服务说明',
  '.help-faq__item:present .help-faq__answer:absent（全收起✓）；.help-contact__item/.help-footer 采样 absent 系 automator 跨 SectionCard 组件查询缺陷（源码 help/index.vue:105,123,141,161 无条件渲染）；巡检截图(A/B)完整证实全部 expected',
  'VERIFIED', [E + '#HP01', T + 'A/subpackages_tools_help_index__默认.png', T + 'B/subpackages_tools_help_index__默认.png'], 0.7);
U('HP02', 'tap FAQ×2 执行但展开中间态无采样：终态 answer absent 无法区分「展开后收起」与「从未展开」，截图 ERROR:timeout');
U('HP03', '执行动作偏离：点击目标误为 .help-faq__answer（未展开必 absent）而非 .help-faq__item，手风琴互斥序列未执行');
U('HP04', '.help-contact__item 采样 absent 与 act:tap 无报错自相矛盾，路由零变化，跳转 official-chat 无法归因页面或工具');
U('HP05', '同 HP04：采样/执行矛盾，路由零变化，跳转 feedback/history 未验证');
U('HP06', '同 HP04 + pre:auto-nav ERR timeout；剪贴板内容与「已复制」toast 均无证据');
U('HP07', 'AppShell 返回按钮 automator 定位失败（tap 元素未找到），兜底链路未验证');
U('HP08', 'observe-only：FAQ 快击×5 未执行，奇偶终态无记录');
add('HP09', 'subpackages/tools/help/index', '清除 token 未登录直开',
  'usePageAccess 未登录放行，不重定向，页面正常渲染，无 401',
  'pre:logout ok；top 仍 help/index（无重定向✓）；console 空（无 401/异常）；渲染完整性由 HP01 巡检截图旁证',
  'VERIFIED', [E + '#HP09', T + 'A/subpackages_tools_help_index__默认.png'], 0.6);

/* ===== Issues ===== */
issues.push({
  id: 'MP-R1-C21-001', round: 'R1', page: P + '/discover/history',
  screenshot: '(A1 未采集成功；证据=exec-results.json#DH07 console 三条 error 落盘)',
  category: 'Interaction', severity: 'P2',
  description: '寻觅历史页在页面栈=1（reLaunch 直开）时点击返回键 .back-btn：goBack() 为裸 uni.navigateBack() 无 fail 兜底（history.vue:115-117），navigateBack:fail cannot navigate back at first page 产生 uni.onUnhandledRejection 并 captureException 上报，500ms 内路由/DOM/Toast/震动均无反馈，构成死按钮（R11 §5 铁律）+ 错误上报噪音。',
  evidence: ['Manifest DH07 expected（次要21.json DH07 预设死按钮观测点）', 'A1 observed：act:tap .back-btn 后路由零变化、toast:[]、console [uni.onUnhandledRejection] navigateBack:fail cannot navigate back at first page ×3（exec-results.json DH07）', '源码：apps/client/src/subpackages/discover-extra/discover/history.vue:115-117 function goBack(){uni.navigateBack();} 无 fail 兜底'],
  sources: ['interaction', 'code', 'log'], confidence: 0.85,
  ideal: '栈=1 时点击返回应有兜底落点（同类页 segment.vue:51-59 为 fail→uni.switchTab 首页口径）或静默吞掉 fail，不产生 unhandledRejection；点击 500ms 内有可观测反馈。',
  fix: 'goBack 改为 uni.navigateBack({fail:()=>uni.switchTab({url:"/pages/discover/index"})})，与 segment.vue:51-59/people.vue:142-149 兜底口径对齐，消除栈底死按钮与错误上报。',
  status: '待修复'
});
issues.push({
  id: 'MP-R1-C21-002', round: 'R1', page: 'subpackages/tools/daily-question/index',
  screenshot: '(A1 未采集成功；证据=exec-results.json#DQ12 console 三条 error 落盘)',
  category: 'Interaction', severity: 'P2',
  description: '每日一问页在页面栈=1（reLaunch 直开）时点击顶部返回 .dq-header__back：goBack() 裸 uni.navigateBack() 无 fail 兜底（daily-question/index.vue:78-80），产生 navigateBack:fail cannot navigate back at first page 的 unhandledRejection 并 captureException 上报，点击无任何用户可感知反馈，构成死按钮（R11 §5 铁律）。',
  evidence: ['Manifest DQ12 expected（次要21.json DQ12 预设死按钮观测点）', 'A1 observed：act:tap .dq-header__back 后路由零变化、toast:[]、console [uni.onUnhandledRejection] navigateBack:fail cannot navigate back at first page ×3（exec-results.json DQ12）', '源码：apps/client/src/subpackages/tools/daily-question/index.vue:78-80 function goBack(){uni.navigateBack();} 无 fail 兜底'],
  sources: ['interaction', 'code', 'log'], confidence: 0.85,
  ideal: '栈=1 时点击返回应有兜底落点或静默处理，点击 500ms 内有可观测反馈，不产生 unhandledRejection。',
  fix: 'goBack 补 fail 兜底（switchTab 首页或发现页），与 segment.vue:51-59 同口径。',
  status: '待修复'
});
issues.push({
  id: 'MP-R1-C21-003', round: 'R1', page: '(执行环境) mock 登录身份',
  screenshot: '(非页面缺陷；证据=exec-results.json 多条 pre:login 记录)',
  category: 'Data', severity: 'P2',
  description: '交互执行环境 mock 登录返回 userId=user-1001，与用例计划身份 A=100158(曦风)/B=100159(小新生) 不符（执行器自标 MISMATCH），且 A/B 两身份实际落入同一 user-1001：双身份互斥类前置（如 DQ03 签到额度错开）失效，全部「A/B 双身份各一份」覆盖要求仅巡检(tour)达成、交互执行未达成。',
  evidence: ['exec-results.json：约 60 条记录含 pre:login A/B ok userId=user-1001 MISMATCH! 标记（含 DQ03 的 pre:login B ok userId=user-1001 MISMATCH!）', '巡检 screenshot-manifest.json gitSha=aefd8a72 buildMode=build:mp-weixin:mock 的 A/ 与 B/ 双身份截图目录齐全（说明 tour 身份正确，差异仅在交互执行器登录链路)'],
  sources: ['log'], confidence: 0.9,
  ideal: 'mock 登录应按 tmp_r11_login.json/tmp_r11_guest.json 返回 100158/100159 两个可区分身份，A/B 前置互斥用例可独立重建。',
  fix: '检查交互执行器 mock 登录桩的 userId 映射（automation 注入 token 与 session.bootstrap 返回值），使 A/B 注入各自身份后重跑 DQ03 等身份互斥用例。',
  status: '待修复'
});

/* ===== write ===== */
const manifest = JSON.parse(fs.readFileSync('reports/audit/round-1/ops/次要21.json', 'utf8'));
const ids = manifest.cases.map(c => c.id);
const covered = new Set(checks.map(c => c.caseId).concat(unverifiable.map(u => u.split('|')[0])));
const missing = ids.filter(i => !covered.has(i));
const dup = checks.map(c => c.caseId).filter((v, i, a) => a.indexOf(v) !== i);

const out = {
  round: 'R1', judge: '次要21',
  pages: [P + '/home/segment', P + '/nearby/people', P + '/discover/history', P + '/likes/index', P + '/likes-visitors/index', 'subpackages/tools/daily-question/index', 'subpackages/tools/love-center/index', 'subpackages/tools/help/index'],
  gitSha: d.gitSha, generatedAt: new Date().toISOString(),
  summary: {
    manifestCases: ids.length, total: checks.length,
    verified: checks.filter(c => c.verdict === 'VERIFIED').length,
    failed: checks.filter(c => c.verdict === 'FAILED').length,
    unverified: unverifiable.length
  },
  checks, issues, unverifiable,
  notes: '1) 判定基线：Manifest=reports/audit/round-1/ops/次要21.json（expected 权威）、A1=reports/audit/round-1/interact/exec-results.json（observed 权威，gitSha aefd8a72）、截图=round-1-interact/ 操作截图+wxml 快照与 round-1-tour/A|B 巡检截图（同 gitSha）。2) A1 交互执行普遍 pre:login MISMATCH（user-1001≠100158/100159）且 A/B 同身份（Issue MP-R1-C21-003）；LK02/LV02 的 A1 记录无 login 前置（页面停未登录/LockScreen 态致采样全 absent），其 expected 以同 gitSha 巡检登录态截图证实后判 VERIFIED（置信 0.65）。3) DH07/DQ12 为本次确证缺陷：栈底返回死按钮+unhandledRejection（console 铁证+源码裸 navigateBack 无兜底）。4) DQ05 系列前置不可达归因 mock 后端不持久 checkedInToday（apps/client/src/stores/checkIn.ts:30-34 后端权威字段），非页面缺陷。5) LC02/LC03/LC06 的 love-center 子页跳转在本环境 navigateTo:fail timeout（mbti 为 web-view），导航失败无用户反馈的 UX 隐患建议在可联网环境复核后再定级。6) automator 已知局限影响面：跨自定义组件(SectionCard/AppShell)内元素采样 absent（HP01/HP04-HP06/LC05/HP07）、文本节点 tap 不触发父级 @tap（LK01/LK08/LK09）、swipe 手势不支持（DH02-DH05）、断网故障注入不可用（SG06/NP09/DH06/LK15/DQ11）。'
};
fs.writeFileSync('reports/audit/round-1/interact/次要21-judge.json', JSON.stringify(out, null, 2), 'utf8');
console.log('written; checks=' + checks.length, 'V=' + out.summary.verified, 'F=' + out.summary.failed, 'U=' + out.summary.unverified, 'issues=' + issues.length);
console.log('manifest cases=' + ids.length, 'missing=' + JSON.stringify(missing), 'dup=' + JSON.stringify(dup));
