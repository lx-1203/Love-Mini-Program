const fs = require('fs');
const P = 'subpackages/chat/chat-session/index';
const S = 'reports/screenshots/round-1-interact/';
const E = 'reports/audit/round-1/interact/exec-results.json';
const M = 'reports/audit/round-1/ops/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json';
const PARAMLOSS = '二次执行批次 reLaunch 未带深链参数（route options={}），页面停留「缺少会话标识」错误态（截图证实），目标元素不存在、动作未能执行';

const checks = [];
function c(id, operation, expected, actual, verdict, evidence, confidence) {
  checks.push({ caseId: id, page: P, operation, expected, actual, verdict, evidence, confidence });
}

c('CS01', '未登录冷启动直开观察 LockScreen 渲染',
  '整页 LockScreen（标题/副标/3 权益/主按钮/先逛逛/×），不渲染 ChatHeader/消息区/输入栏，不闪错误空态，console 无报错',
  'pre 清 token/refresh_token + reLaunch ?userId=10003 已执行；但 DOM 探测 .lock-screen/.lock-screen__btn/.lock-screen__btn-link/.lock-screen__close 全部 absent，.chat-header 与 .chat-scroll present（内存登录态会话 UI）；after 截图超时无影像证据；console 空',
  'UNVERIFIED', [E + '#CS01', '移除 storage+reLaunch 不重置内存 sessionStore（isUnlocked=isLoggedIn||useMock，index.vue:520；isLoggedIn 源自内存 userSession，stores/session.ts:339），前置未按用例语义建立；截图缺失'], 0.9);

c('CS02', 'tap .lock-screen__btn「立即登录并完善」',
  '500ms 内路由切至 pages/login/index，pending-login-redirect 记录，无死按钮',
  'act-FAIL: .lock-screen__btn 元素不存在（页面呈内存登录态，LockScreen 未渲染），动作未执行；路由仍停留会话页',
  'UNVERIFIED', [E + '#CS02', S + '（无 CS02 截图）'], 0.9);

c('CS03', 'tap .lock-screen__btn-link「先逛逛公开内容」',
  '500ms 内 switchTab 至 pages/discover/index，无 tabbar 导航报错',
  'act-FAIL: .lock-screen__btn-link 不存在；记录中的 discover 路由与「登录已过期，请重新登录」toast 为 harness 兜底/401 防御产物，非该按钮交互结果',
  'UNVERIFIED', [E + '#CS03'], 0.9);

c('CS04', 'tap .lock-screen__close「×」关闭',
  '栈深1 → switchTab discover；栈深>1 → navigateBack 落回来源页',
  'act-FAIL: .lock-screen__close 不存在；harness 兜底 navigateBack 报 NAV_ERROR，非按钮交互结果',
  'UNVERIFIED', [E + '#CS04'], 0.9);

c('CS05', '身份A登录态冷启动深链 ?userId=10003 会话页完整渲染',
  '标题=对方昵称（非通用「聊天」）、在线/离线+认识N天、消息区/输入栏（占位「输入消息...」）、自动滚底、console 无报错',
  'DOM: .chat-header__title/.chat-header__status/.chat-header__days/.chat-scroll/.wechat-input-bar__input/.wechat-input-bar__send 全部 present；route=chat-session?userId=10003；console 空；CS05-after 截图超时，但 1 分钟后同会话状态的 CS06-after 截图可见：标题「对方」、状态「离线」「认识 1 天」、破冰引导、输入栏「输入消息...」、发送钮置灰——与 expected 一致；新会话无既有消息，「既有气泡+5分钟时间条+自动滚底」无从观测（非矛盾）',
  'VERIFIED', [E + '#CS05', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS06-after.png', M + '#CS05'], 0.72);

c('CS06', 'Loading 态聊天气泡骨架（在途窗口探测）',
  '加载期 4 行气泡交替骨架+「正在加载聊天详情...」，数据到达后消失不永驻',
  '.uni-skeleton absent、loadingSessionDetail absent；pre-FAIL input .loading 不存在——在途窗口未捕获（响应过快）；CS06-after 截图为加载完成态（无骨架）。按 Manifest 明示「响应过快未捕获在途窗口则如实标注 UNVERIFIED」',
  'UNVERIFIED', [E + '#CS06', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS06-after.png'], 0.9);

c('CS07', '缺参直开错误文案双区展示',
  '「缺少会话标识，请从聊天列表或匹配结果进入。」消息区+输入区双区展示；输入栏/表情/发送不渲染；标题回退「聊天」；console 无 TypeError',
  '截图证实：错误文案在消息区与底部输入区两处渲染；标题「聊天」+离线+认识1天；无输入栏/表情/发送按钮（v-else 分支生效）；DOM .meta-copy--padded/.chat-input-area/.chat-header__title present；route options={}；console 空。三源一致',
  'VERIFIED', [E + '#CS07', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS07-after.png'], 0.88);

c('CS08', '失效数字 sessionId=99999999 深链错误态',
  '消息区显示 friendlyPageError「加载失败」；不渲染 MatchGreetingTip 与「会话刚建立，还没有消息。」空会话引导（MP-R2-CHAT-CHAT-SESSION-INDEX-001 回归点）',
  'DOM: .meta-copy--padded absent、.match-greeting present；截图证实渲染了破冰提示卡「你们已互相匹配成功，打个招呼开启聊天吧～」+两枚快捷按钮+「会话刚建立，还没有消息。」+底部 BreakQuestion+可用输入栏——即假空会话，错误态未到达。与 expected 直接相悖，回归复现',
  'FAILED', [E + '#CS08', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS08-after.png', 'index.vue:198-200（showMatchGreeting 门控，pageErrorMessage 为空才会渲染引导）', 'index.vue:639（数字链路 fetchSessionMessages）', 'index.vue:94-101（friendlyPageError 未上屏）'], 0.85);

c('CS09', '失效 temp 会话深链错误态+禁用按钮反馈',
  '「会话不存在或已失效」上屏；顶部 temp-banner 渲染；同意交换/结束会话呈禁用视觉；tap「同意交换」500ms 内 toast 反馈',
  '第一wave（参数在）：截图证实「会话不存在或已失效」双区渲染（主断言达成），无假空会话；但 temp-banner 与 .temp-action-btn 均未渲染，tap「同意交换」元素不存在无 toast。代码链：loadSession 失败→activeSession=null→currentSession=null（index.vue:802-812）→isTempSession=false（822-828）→temp-banner（1815）/temp-action-row（2057）v-if 不渲染，MP-R1-002 禁用态（862-864）在该场景不可达',
  'FAILED', [E + '#CS09', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS09-after.png', 'index.vue:802-828,862-864,1815,2057'], 0.78);

c('CS10', '进入自动滚底+5分钟规则时间条',
  '滚至底部锚点；首条消息上方「今天 HH:mm」时间条；5 分钟内不重复出条',
  '复用 CS09 失效 temp 会话（0 条消息、无时间间隔可验）：.chat-time-bar absent、scrollPos=top；前置（≥2 条跨 5 分钟消息）未建立',
  'UNVERIFIED', [E + '#CS10'], 0.9);

c('CS11', '上拉加载更早历史消息',
  '触顶追加旧消息视口不跳、loadingOlder 防重入、耗尽不再请求',
  '复用失效 temp 会话，消息≤20（messageHasMore=false 前提不成立），触顶分页无法验证；after 截图超时',
  'UNVERIFIED', [E + '#CS11'], 0.9);

c('CS12', '气泡内对方头像→对方主页',
  '500ms 内 navigateTo profile/other?userId=10003，不弹遮罩菜单',
  '会话无对方消息气泡：.bubble-avatar--peer 不存在，tap 两次失败；记录中的 navigateTo userId 为空系 harness 兜底直跳，非产品交互结果',
  'UNVERIFIED', [E + '#CS12'], 0.9);

const wave2 = [
  ['CS13', '图片消息点击→全屏预览', '.bubble__image 不存在（截图证实错误态）'],
  ['CS14', '活动卡片消息点击→targetUrl', '活动卡片元素不存在'],
  ['CS15', '空提交（发送钮置灰不动）', '输入栏/发送钮在错误态不渲染，空提交无法执行（before/after 截图均为错误态）'],
  ['CS16', '正常发送文本消息', '输入框/发送钮不存在，发送链路无法执行'],
  ['CS17', '快速连点发送×5 只提交 1 次', '输入/连点无法执行，防连点场景未建立'],
  ['CS18', '超长输入>5000 字拦截', '长文本无法注入'],
  ['CS19', '特殊字符/emoji 输入原样发送', '输入无法执行'],
  ['CS20', '逐字清空回退置灰', '输入/清空无法执行'],
  ['CS21', '草稿持久化退出重进恢复', '无 sessionId 则无草稿 key，场景无法建立'],
  ['CS22', '表情面板开合+互斥', '表情按钮/面板元素不存在'],
  ['CS23', '空会话破冰快捷按钮直发', '.match-greeting 不存在（错误态截图证实）'],
  ['CS24', 'BreakQuestion 推荐开场直发', '.break-question 不存在'],
  ['CS25', '长按消息弹操作菜单', '无气泡可长按'],
  ['CS26', '长按复制写剪贴板', '长按菜单无法拉起'],
  ['CS27', '长按转发→目标会话弹层', '转发弹层无法验证'],
  ['CS28', '长按删除本地持久隐藏', '删除场景无法建立'],
  ['CS29', '长按引用→预览条→带引用发送', '引用链路无法执行']
];
wave2.forEach(([id, op, det]) => {
  c(id, op, '见 Manifest ' + id + '（聊天核心链路/弹层/输入全路径）', PARAMLOSS + '：' + det, 'UNVERIFIED', [E + '#' + id, S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-' + id + '-after.png'], 0.9);
});

c('CS30', '点击气泡引用块滚动定位',
  'scroll-into-view 定位 msg-row-{quoteRef}；引用缺失优雅降级',
  '页面处于缺参错误态（无引用块），记录的两次 tap 对象为 .chat-scroll 容器而非引用块，预期无法核验',
  'UNVERIFIED', [E + '#CS30'], 0.9);

c('CS31', '长按撤回（temp 本人消息）',
  'toast「消息已撤回」+撤回态渲染；私信会话无撤回项',
  PARAMLOSS + '；且无存活 temp 会话前置，长按菜单无法拉起', 'UNVERIFIED', [E + '#CS31', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS31-after.png'], 0.9);

c('CS32', '顶部「···」菜单+查看对方主页桥接',
  '500ms 内菜单弹出五项；tap 查看主页 switchTab 桥接 userId；遮罩/取消关闭',
  '页面为缺参错误态：.chat-header__more present 且 tap 执行，但「查看对方主页」菜单项未出现（菜单未弹出），无截图佐证，桥接无法验证', 'UNVERIFIED', [E + '#CS32'], 0.85);

c('CS33', '消息免打扰切换',
  '成功后菜单项文案翻转；失败 toast 且状态不翻转；点击必有反馈',
  PARAMLOSS + '：菜单项「消息免打扰」不存在；harness 兜底 switchTab 离开页面（after 截图为消息列表页）', 'UNVERIFIED', [E + '#CS33', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS33-after.png'], 0.9);

c('CS34', '拉黑确认弹窗两路', 'showModal 取消/确认两路；确认后 toast+退回列表', PARAMLOSS + '：拉黑菜单项不存在', 'UNVERIFIED', [E + '#CS34', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS34-after.png'], 0.9);
c('CS35', '举报 ActionSheet 四原因', 'ActionSheet 弹出→选择原因→toast「举报已提交」', PARAMLOSS + '：举报入口不存在', 'UNVERIFIED', [E + '#CS35', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS35-after.png'], 0.9);

c('CS36', '头部头像单击菜单/双击拍一拍',
  '单击 >300ms 弹 avatar-menu-sheet（看主页/拍一拍/取消）；<300ms 双击不弹菜单直接拍一拍；遮罩/取消关闭',
  '页面为缺参错误态且 harness 连续两次 tap 构成双击路径——菜单按设计不弹（.avatar-menu-sheet absent 与双击语义一致），单击菜单分支未被隔离验证；无截图',
  'UNVERIFIED', [E + '#CS36'], 0.85);

c('CS37', '拍一拍发送「你拍了拍{昵称}」',
  '500ms 内新增拍一拍消息；菜单先关再发；失败静默上报不崩',
  PARAMLOSS + '（前置 CS36 菜单未弹出）：头像菜单「拍一拍」不存在', 'UNVERIFIED', [E + '#CS37', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS37-after.png'], 0.9);

c('CS38', '「+」更多菜单→发送图片',
  '弹层三路关闭；上传 Loading 不永驻；成功/部分失败/全失败 toast 分支；temp 拦截；连点防重',
  PARAMLOSS + '：更多菜单入口不存在；且自动化通道 chooseImages 选图能力未证实', 'UNVERIFIED', [E + '#CS38', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS38-before.png'], 0.9);

c('CS39', 'temp 会话倒计时横幅+同意交换',
  '倒计时 HH:mm:ss 每秒刷新（首进即建立）；tap 同意交换 toast「已同意交换联系方式」',
  PARAMLOSS + ' + 无存活 temp 会话前置：.temp-banner/.temp-action-btn--secondary 不存在', 'UNVERIFIED', [E + '#CS39', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS39-after.png'], 0.9);

c('CS40', 'temp 会话「结束会话」两路+全链路禁写',
  'showModal 取消/结束两路；结束后横幅/倒计时/发送拦截/占位/警示全链路一致',
  PARAMLOSS + ' + 无存活 temp 会话前置：.temp-action-btn--danger 不存在', 'UNVERIFIED', [E + '#CS40', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS40-after.png'], 0.9);

c('CS41', '返回按钮落点=来源页+红点恢复',
  '从消息列表 tap .chat-item 压栈后返回 pages/messages/index；未读状态恢复',
  '前置未建立：.chat-item 未找到（harness 未先落消息列表页），两级栈不存在；栈深1 下 navigateBack 与页面返回钮均无处可退（route 停留会话页），落点/红点断言不可验', 'UNVERIFIED', [E + '#CS41'], 0.9);

c('CS42', '打开即返回（压栈即弹）',
  '无崩溃、无白屏卡死、无双击穿透；路由正确回退；再进功能正常',
  '深链 reLaunch（栈深1）后 harness navigateBack 两次报 NAV_ERROR，tap .chat-header__back 执行后路由无任何变化——返回钮在栈深1时静默无反馈（goBack fail 静默吞掉，index.vue:499-513；对比 LockScreen.vue:94-98 有 switchTab 兜底）。「无崩溃」达成，「路由正确回退」未达成且栈深1下反馈缺失违反 500ms 反馈铁律；after 截图超时',
  'FAILED', [E + '#CS42', 'index.vue:499-513（goBack 无栈深兜底，fail 静默）', 'LockScreen.vue:94-98（对照：有兜底）'], 0.7);

c('CS43', '重复进出×3 一致性',
  '3 次进出消息条数/草稿/删除态一致，无重复气泡、无泄漏报错',
  PARAMLOSS + '：input 目标不存在，循环未有效执行', 'UNVERIFIED', [E + '#CS43'], 0.9);

c('CS44', 'fromSignal=1 渐进解锁横幅',
  '按目标会话 userMessageCount 渲染档位/进度/入口；满20条 tap switchTab 主页',
  '前置未解析：sessionId 占位符 {id} 未替换（route options 直接为 sessionId:"{id}"）；toast「暂无法获取对方信息」+错误态「会话不存在或已失效」；.signal-banner 虽渲染（已互动0条/0%/5档/再互发5条解锁兴趣爱好）但 n=0 非目标会话语义，档位正确性不可验；after 截图证实上述状态',
  'UNVERIFIED', [E + '#CS44', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS44-after.png'], 0.9);

c('CS45', '浏览历史新消息提示条+跳底',
  '未贴底出现「有新消息 ↓」不打断阅读；tap 500ms 内跳底且提示条消失；贴底不亮条',
  PARAMLOSS + '：无消息列表，.unread-hint 不存在；harness 的 pageScrollTo 与注入新消息前置未生效', 'UNVERIFIED', [E + '#CS45', S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS45-after.png'], 0.9);

const issues = [
  { id: 'MP-R1-CHAT-CHAT-SESSION-INDEX-201', round: 'R1', page: P, screenshot: S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS08-after.png', category: 'Regression', severity: 'P1',
    description: '失效数字 sessionId（99999999）深链渲染「假空会话」：MatchGreetingTip 破冰卡+「会话刚建立，还没有消息。」+BreakQuestion+可用输入栏全部照常渲染，错误态（friendlyPageError「加载失败」）未到达。此为 Manifest 明示的回归点 MP-R2-CHAT-CHAT-SESSION-INDEX-001 复现；用户会被诱导在无效会话里发言。',
    evidence: 'A1 exec-results#CS08：dom .meta-copy--padded absent / .match-greeting present；截图 CS08-after.png 证实假空会话整页渲染；代码：index.vue:198-200（showMatchGreeting 仅要求 !pageErrorMessage && !loading，说明 pageErrorMessage 未被置位）、index.vue:639（数字链路仅 await fetchSessionMessages，失败未落页面错误态，对照 temp 链 625-627 有兜底）。',
    sources: ['screenshot', 'interaction', 'code'], confidence: 0.85,
    ideal: '无效数字会话深链：消息区/输入区显示「加载失败」，不渲染破冰引导与空会话文案，输入栏不渲染或禁用。',
    fix: '数字链路 fetchSessionMessages 后按 store errorMessage/会话未就绪判定失败并置 pageErrorMessage（与 temp 链 index.vue:621-628 同法），使 showMatchGreeting 门控（198-200）与输入栏 v-else 分支生效。',
    status: '待修复' },
  { id: 'MP-R1-CHAT-CHAT-SESSION-INDEX-202', round: 'R1', page: P, screenshot: S + 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS09-after.png', category: 'Interaction', severity: 'P3',
    description: '失效 temp 会话深链的「同意交换/结束会话禁用态+点击反馈」不可达：loadSession 失败后 activeSession=null → currentSession=null（index.vue:802-812）→ isTempSession=false（822-828）→ temp-banner（1815 v-if）与 temp-action-row（2057 v-if）均不渲染，MP-R1-002 修复的 tempSessionUnavailable 禁用态（862-864）在该场景为死代码。用户只见纯文案错误态，与 Manifest 预期（横幅+禁用按钮+tap toast）不符。主断言「会话不存在或已失效」双区上屏已达成（截图证实）。',
    evidence: 'A1 exec-results#CS09：dom .temp-action-btn--disabled absent、.sessionNotExist absent、tap「同意交换」元素不存在；截图 CS09-after.png 证实错误文案双区渲染且无 temp 横幅/按钮；代码链 index.vue:625-627/802-828/862-864/1815/2057。',
    sources: ['screenshot', 'interaction', 'code'], confidence: 0.78,
    ideal: '失效 temp 深链：错误文案+temp 横幅+禁用态按钮可见，点击有 toast 反馈（或 Manifest 修订为纯错误态）。',
    fix: '二选一：(a) 失败路径保留 temp 识别（以 sessionId 前缀/sessionType 判定 isTempSession 不依赖 activeSession），使禁用行与反馈可达；(b) 修订 Manifest 预期为纯错误态，删除不可达断言。需回归会裁决。',
    status: '待修复' },
  { id: 'MP-R1-CHAT-CHAT-SESSION-INDEX-203', round: 'R1', page: P, screenshot: '（CS42-after 截图超时缺失，见 exec-results#CS42 路由记录）', category: 'Interaction', severity: 'P3',
    description: '头部返回按钮在栈深 1（深链冷启/分享卡直开）时静默无反馈：goBack 仅 uni.navigateBack 且 fail 静默吞掉（index.vue:499-513），无 switchTab 兜底（对照 LockScreen.vue:94-98 有兜底）。A1 实测 tap .chat-header__back 后路由无变化，违反「任何可点击元素 500ms 内必须有可观测反馈」铁律，深链进入用户被留在原地无出路。',
    evidence: 'A1 exec-results#CS42：pre/act navigateBack NAV_ERROR×2，act:tap .chat-header__back 后 route 仍=[chat-session options:{}]；代码 index.vue:499-513；对照 LockScreen.vue:94-98。CS41 记录（#CS41）同样出现 tap 返回后路由不变。',
    sources: ['interaction', 'code'], confidence: 0.7,
    ideal: '栈深 1 时点击返回 500ms 内有反馈：switchTab 至消息列表/发现页等合理落点（与 LockScreen 关闭行为一致）。',
    fix: 'goBack 的 fail 回调内加栈深判定：getCurrentPages().length<=1 时 uni.switchTab({url:ROUTES.TAB.MESSAGES 或 DISCOVER})。',
    status: '待修复' }
];

const unverifiable = [
  'CS01|未登录前置无法建立：移除 storage+reLaunch 不重置内存 sessionStore（isUnlocked=isLoggedIn||useMock，index.vue:520），LockScreen 未渲染；after 截图超时证据缺失|1',
  'CS02|.lock-screen__btn 不存在（同 CS01 前置失效，页面呈内存登录态会话 UI），动作未执行|1',
  'CS03|同 CS01 前置失效，.lock-screen__btn-link 不存在；discover 路由与「登录已过期」toast 系 harness 兜底/401 防御产物|1',
  'CS04|同 CS01 前置失效，.lock-screen__close 不存在；NAV_ERROR 系 harness 兜底产物|1',
  'CS06|骨架在途窗口未捕获（响应过快，.uni-skeleton absent），按 Manifest 明示如实标注|1',
  'CS10|前置不满足：复用 CS09 失效 temp 会话（0 条消息、无 5 分钟间隔），.chat-time-bar 不存在|1',
  'CS11|前置不满足：会话消息≤20 无分页可验；after 截图超时|1',
  'CS12|前置未建立：会话无对方消息气泡（.bubble-avatar--peer 不存在）；harness 兜底 navigateTo 空 userId 非产品行为|1'
];
const wave2ids = {
  CS13: '无图片消息元素', CS14: '活动卡片元素不存在', CS15: '输入栏/发送钮在错误态不渲染', CS16: '输入框/发送钮不存在',
  CS17: '输入/连点场景未建立', CS18: '长文本无法注入', CS19: '输入无法执行', CS20: '输入/清空无法执行',
  CS21: '无 sessionId 无草稿 key', CS22: '表情按钮/面板不存在', CS23: '.match-greeting 不存在', CS24: '.break-question 不存在',
  CS25: '无气泡可长按', CS26: '长按菜单无法拉起', CS27: '转发弹层无法验证', CS28: '删除场景无法建立', CS29: '引用链路无法执行',
  CS30: '无引用块，tap 对象降级为 .chat-scroll', CS31: '无存活 temp 会话且菜单无法拉起', CS32: 'more 菜单未弹出（无截图佐证）',
  CS33: '免打扰菜单项不存在，harness switchTab 离场', CS34: '拉黑菜单项不存在', CS35: '举报入口不存在',
  CS36: 'tap 序列构成双击路径（菜单按设计不弹），单击分支未隔离', CS37: '前置 CS36 菜单未弹出，拍一拍入口不存在',
  CS38: '更多菜单入口不存在且选图能力未证实', CS39: '无存活 temp 会话，temp-banner 不存在', CS40: '无存活 temp 会话，结束会话钮不存在',
  CS43: 'input 目标不存在，循环未有效执行', CS45: '无消息列表，.unread-hint 不存在'
};
Object.keys(wave2ids).forEach(id => {
  unverifiable.push(id + '|深链参数丢失（批次 reLaunch 无参，页面停留「缺少会话标识」错误态，截图证实）：' + wave2ids[id] + '|1');
});
unverifiable.push('CS41|前置未建立：.chat-item 未找到未能压栈，两级栈不存在，返回落点/红点恢复不可验|1');
unverifiable.push('CS44|前置未解析：sessionId 占位符 {id} 未替换（route options 含字面 "{id}"），toast「暂无法获取对方信息」+错误态；banner 渲染但为 0 条非目标会话语义|1');

const out = {
  round: 'R1', page: P, generatedAt: new Date().toISOString(),
  manifestSource: M, observedSource: E, shotDir: S,
  summary: {
    total: checks.length,
    verified: checks.filter(x => x.verdict === 'VERIFIED').length,
    failed: checks.filter(x => x.verdict === 'FAILED').length,
    unverified: checks.filter(x => x.verdict === 'UNVERIFIED').length
  },
  checks, issues, unverifiable,
  notes: '45 用例：VERIFIED 2（CS05/CS07）、FAILED 3（CS08 假空会话回归 P1；CS09 禁用态不可达 P3；CS42 栈深1返回无反馈 P3）、UNVERIFIED 40。UNVERIFIED 主因（非产品缺陷，系 A1 执行通道限制）：(1) 未登录前置——移除 storage+reLaunch 不重建 JS 上下文，内存 sessionStore 保持登录态（CS01-04）；(2) 二次批次深链参数系统性丢失，CS13-CS45（除 CS42）全部停留「缺少会话标识」错误态执行（31KB 同尺寸截图系列证实）；(3) CS44 sessionId 占位符 {id} 未替换；(4) CS10/CS11 复用失效 temp 会话前置不满足；(5) 多张关键截图超时（CS01/CS05/CS11/CS17/CS23/CS27/CS33/CS39/CS42/CS43）。CS05 的视觉证据借同会话态 CS06-after 截图补强。建议 A1 修复参数重建后对 40 条 UNVERIFIED 复跑，再回归三条 Issue。'
};
fs.writeFileSync('reports/audit/round-1/interact/SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-judge.json', JSON.stringify(out, null, 2));
console.log('written; checks=' + checks.length + ' issues=' + issues.length + ' unverifiable=' + unverifiable.length);
console.log('summary:', JSON.stringify(out.summary));
