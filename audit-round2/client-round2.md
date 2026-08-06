# 客户端问题清单(300+ 条)

## CRITICAL(商业化/资金/安全直损)

```
client|apps/client/src/pages/vip/index.vue|114-124|CRITICAL|subscribe() 无 useMock 分支,真实模式下"立即开通"仍走 setTimeout 模拟支付成功,从未调用 uni.requestPayment 且不通知后端|生产环境用户点击付费显示"开通成功"但未扣款、未开通 VIP,资金与体验双失控|按 apiMode 分支,real 模式接入 uni.requestPayment 完整回调(成功/取消/失败)并落后端订单
client|apps/client/src/pages/login/index.vue|236-254|CRITICAL|手机号+验证码登录仅本地正则校验(4-6 位任意数字)即"登录成功"并跳转,无后端接口、不写 token、不建会话|任意输入可绕过登录墙进入主流程,后续请求 401,用户数据隔离被击穿|接入 POST /auth/phone-login 真实链路,未实现前隐藏入口
client|apps/client/src/pages/login/index.vue|183-187|CRITICAL|发送验证码为纯本地演示:toast"已发送"+ 倒计时,无短信接口、无服务端校验|用户输入任意手机号即可"收到验证码",验证码登录形同虚设|接入 /auth/sms-code 接口,失败时提示且不启动倒计时
client|apps/client/src/pages/verification/index.vue|177-187|CRITICAL|simulateApprove()(模拟审核通过)无 isMockMode/DEV 守卫,真实用户提交认证后在"审核中"状态可见"模拟审核通过"按钮,点击直接变 verified|恋爱认证可被用户自行伪造,身份信任体系崩塌|删除该按钮或加环境守卫,接入 GET /verification/status 轮询
client|apps/client/src/pages/verification/index.vue|148-163|CRITICAL|恋爱认证(学生证)提交为本地 setTimeout 模拟 pending,无任何后端调用(TODO(后端) 自认)|认证功能整体未实现,用户提交即"审核中"且永不通过/拒绝|实现 POST /verification 与图片上传,未就绪前下线入口
client|apps/client/src/stores/session.ts|618-639|CRITICAL|bindSchool 仅本地改写 userSession,不调后端(TODO(real-env) 自认:不落库/无校验/不可撤销)|刷新或重登后 schoolBound 回退,首页"绑定学校"入口反复出现,绑定无真实约束|调用 POST /api/schools/bind 并用返回会话整体替换
client|apps/client/src/pages/vip/red-packet.vue|127-140|HIGH|红包创建成功后"分享"仅 toast 提示,无 uni.share/复制链接等任何真实分享能力|红包无法触达他人,付费功能形同虚设|接入微信分享/海报生成,或至少复制链接
client|apps/client/src/pages/village/post.vue|416|HIGH|发帖图片仅本地预览,提交时未上传后端(TODO(后端) 自认无上传端点)|生产环境用户选的图随请求丢失,发帖体验断裂|实现 /posts/images 上传后携带 URL 提交
client|apps/client/src/pages/circles/post-topic.vue|237|HIGH|兴趣圈发话题图片同样未上传(与 village/post.vue 相同 TODO)|话题配图在生产环境全部丢失|统一图片上传端点后接入
client|apps/client/src/pages/campus/certification.vue|84-85,116|HIGH|学生证图片仅取 chooseImage 临时路径直接当 studentCardUrl 提交,未先上传换取 URL|后端收到 wxfile:// 临时路径无法访问,认证图片必然失败|先调上传接口再提交 URL
client|apps/client/src/stores/chat/actions/messaging.ts|67|HIGH|uni.uploadFile url 硬编码 "/api/chat/voice",未拼接 appEnv.apiBaseUrl(其他请求均走 request 拼接)|apiBaseUrl 非根路径时语音上传 404/发错域名,语音消息在生产不可用|改为 `${appEnv.apiBaseUrl}/chat/voice`
```

## HIGH(核心功能失效/数据不一致)

```
client|apps/client/src/pages/love-center/nearby.vue|37-45|HIGH|"附近的人"列表为 7 条硬编码示例用户,无后端 API/定位,点击仅 toast|附近的人功能未实现,生产环境展示假用户|接入位置+推荐接口,未就绪前隐藏入口
client|apps/client/src/pages/activities/detail.vue|101-103|HIGH|未知活动 id 回退到内置示例活动,生产环境分享链接打开假数据|活动详情失真,用户被误导|未知 id 应展示"活动不存在"错误态
client|apps/client/src/pages/activities/detail.vue|180-182,202-203|HIGH|示例活动报名/退出为本地闭环(仅置位+toast),不调后端|生产环境"报名成功"无任何服务端记录,活动主办方数据错乱|示例活动禁止报名或走真实接口
client|apps/client/src/pages/profile/index.vue|453-467|HIGH|语音状态录制为演示实现:确认后直接 setVoiceStatus("mock://profile/voice-status",42),不录音不上传|真实模式语音状态是死数据,mock URL 还会触发无效请求|接入 RecorderManager+上传,未就绪前隐藏入口
client|apps/client/src/pages/profile/index.vue|463|HIGH|mock:// 协议 URL 无任何环境守卫,真实模式也会写入 store|生产环境用户主页出现假语音状态|useMock 分支或删除
client|apps/client/src/pages/profile/index.vue|469-490|HIGH|语音播放为"演示态":仅切换图标,3 秒后自动停,不接 InnerAudioContext|语音状态无法试听|接入真实播放
client|apps/client/src/pages/settings/index.vue|221-247|HIGH|清除缓存为演示实现:延迟后置 0 KB,不调用 uni.getStorageInfo/clearStorage|用户以为缓存已清,实际未清|接入真实 storage 统计与清理
client|apps/client/src/pages/settings/index.vue|250-266|HIGH|检查更新为演示实现:延迟后提示"已是最新",不接 uni.getUpdateManager|更新检查功能形同虚设|接入 getUpdateManager 或版本接口
client|apps/client/src/pages/profile/album.vue|238-249|HIGH|"设为头像"仅本地重排 photoGallery,不调后端|头像更换不持久化,刷新即丢|接入头像上传接口
client|apps/client/src/stores/profile.ts|598-627|HIGH|同校推荐权限开关仅本地存储,不落后端(Phase 4.5 注释自认)|跨设备/重登后设置丢失,隐私承诺无法兑现|接入 /privacy/settings 同步
client|apps/client/src/stores/profile.ts|364-433|HIGH|loadMyPosts 从未被任何页面调用(全仓 grep 仅定义),real 模式"我的动态"永远为空|个人主页动态模块生产环境空白|页面接入或在 load() 中调用
client|apps/client/src/stores/vip.ts|88-114|HIGH|plans 硬编码价格 18/48/128 与 config/vip-plans.ts(18/48/158)年度价不一致|两套价格数据源,支付展示与订单可能错价|删除重复 store,统一走 config
client|apps/client/src/stores/vip.ts|84-411|HIGH|useVipStore 全仓无引用(仅定义处),410 行死代码含死状态 isVip/expireDate(85-86 行从未赋值)|维护成本与价格错乱风险|删除或迁移
client|apps/client/src/view-models/chat.ts|49-84|HIGH|会话状态/操作文案直接使用 statusCopyMap 中文原文,未经 t() 渲染(config/status-copy.ts 自注"请改为经 t() 渲染")|聊天核心状态"等待对方加入/交换已完成/去聊天"等生产界面硬编码中文,多语言失效|改用 t("config.statusCopy.*")
client|apps/client/src/stores/campus.ts|474-476|HIGH|formatAnswerTime 重复实现并硬编码"刚刚/分钟前/小时前/天前",未复用 utils/time.ts:219 且未 i18n|四处重复+多语言失效(见 circle.ts:443-445、daily-question.ts:235-238、village/utils.ts:444-447)|统一复用 utils/time.ts 的 locale 版本
client|apps/client/src/stores/circle.ts|443-445|HIGH|同 campus.ts 的重复相对时间实现,硬编码中文|同上|同上
client|apps/client/src/stores/daily-question.ts|235-238|HIGH|同 campus.ts 的重复相对时间实现,硬编码中文|同上|同上
client|apps/client/src/stores/village/utils.ts|444-447|HIGH|同 campus.ts 的重复相对时间实现(文案还是"刚刚活跃"),硬编码中文|同上|同上
client|apps/client/src/components/discover/AdvancedFilter.vue|98-109|HIGH|学校选项硬编码 10 所广州高校,未调用 config/schools.ts 的 loadSchools(),与 SCHOOLS(北大/清华等)数据源分裂|筛选学校与认证学校体系不一致,跨校匹配逻辑错乱|统一走 loadSchools()/后端 campuses
client|apps/client/src/config/schools.ts|27-32|HIGH|SCHOOLS 仅 4 所高校(注释自认覆盖不足),DEFAULT_SCHOOL_ID 硬编码 'pku'(35 行)|多数学校用户无法选择本校|由后端下发完整列表
client|apps/client/src/pages/home/index.vue|107|HIGH|默认学校回退硬编码 t("config.schools.pku.name"),无 session 时强制展示北京大学|非北大学生看到错误默认学校|改为通用占位
client|apps/client/src/stores/messages.ts|315-365|HIGH|mock 通知 actionUrl 含 "/pages/post/detail?id=post-58"(365 行),该页面在 pages.json 不存在|mock 模式点击通知跳转白屏|改为存在的页面或移除
client|apps/client/src/stores/messages.ts|702|HIGH|接受心动信号把 userId 放 query string,且 mock 分支(696 行)本地拼"你们已成为好友,开始聊天吧"硬编码中文|接口契约脆弱+文案未 i18n|对齐后端契约,文案走 t()
client|apps/client/src/stores/messages.ts|744|HIGH|通知列表一次拉取 size=100 无分页(注释自认"未实现")|通知量大时首屏慢、截断|改分页加载
client|apps/client/src/stores/messages.ts|918|HIGH|互动事件 hasMore 用 "mapped.length>=20" 猜测,末页恰好 20 条会多请求一次空页|多余请求与"加载中"闪烁|后端返回 totalPages 判断
client|apps/client/src/stores/checkin.ts|470|HIGH|pointsBalance += pointsEarned 与 fetchStatus 同步余额可能双计(注释自认防双计不彻底)|积分余额虚高|改为后端返回余额直接赋值
client|apps/client/src/stores/checkin.ts|537-541|HIGH|dispose() 从未接线(TODO(dispose-接线) 自认页面无法调用)|签到成功动画定时器页面卸载后仍触发|页面 onUnload 调用
client|apps/client/src/stores/village/index.ts|899-904|HIGH|villageStore.dispose() 同样未接线(TODO 自认)|评论防抖/点赞集合在页面销毁后残留|页面 onUnload 调用
client|apps/client/src/stores/discover/actions/storage.ts|125-132|HIGH|discoverStore.dispose() 同样未接线(TODO 自认)|防抖存储定时器/请求控制器残留|页面 onUnload 调用
client|apps/client/src/stores/village/index.ts|323,555|HIGH|mock 帖子头像硬编码 "/static/default-avatar.png",与 IMAGE_PATHS 体系并存|头像路径散落,统一改造遗漏|改用 IMAGE_PATHS
client|apps/client/src/stores/likes.ts|301,371-376|HIGH|mock 头像路径同样硬编码 "/static/default-avatar.png"|同上|同上
client|apps/client/src/stores/video-call.ts|178|HIGH|mock signalingUrl 硬编码 "wss://mock.example.com/signaling",若 real 分支未覆盖会被使用|信令地址指向不存在的域名|确认 real 分支完整,删除 mock 兜底
client|apps/client/src/services/auth.ts|44|HIGH|WECHAT_LOGIN_ENDPOINT="/v1/auth/wechat" 与 services/api.ts:194 "/auth/wechat-login" 两套登录端点并存|端点漂移风险,一处改动另一处 404|统一到单一常量
client|apps/client/src/services/auth.ts|129,149,158,168,172-173|HIGH|登录错误消息硬编码中文("微信登录超时,请重试/您已取消微信登录"等),直接作为用户可见 toast|多语言失效,文案无法运营调整|抽 i18n key
client|apps/client/src/services/http.ts|331,545,565|HIGH|"登录已过期,请重新登录" toast 硬编码中文(3 处),未走 i18n|核心登录兜底文案多语言失效|抽 i18n key
client|apps/client/src/services/http.ts|466,506|HIGH|"网络请求失败/请求已取消"硬编码中文|网络错误提示多语言失效|抽 i18n key
client|apps/client/src/utils/form-validator.ts|58,73,146,162|HIGH|校验默认消息硬编码中文("此项为必填项/请输入正确的手机号/邮箱/微信号"),直接展示给用户|表单校验提示无法多语言|默认值改 i18n key
client|apps/client/src/stores/chat/actions/icebreakers.ts|159-160,188|HIGH|破冰话题错误消息硬编码中文拼接("破冰话题已发送,但消息追加失败:…/未知错误/加载破冰话题失败")|同上|抽 i18n key
client|apps/client/src/stores/chat/actions/session.ts|173|HIGH|"会话不存在或已失效"硬编码中文错误|同上|抽 i18n key
client|apps/client/src/stores/chat/actions/messaging.ts|180,213|HIGH|"发送消息失败,请重试/语音上传失败,请重试"硬编码中文|同上|抽 i18n key
client|apps/client/src/stores/chat/actions/messaging.ts|82,86,91,95|HIGH|语音上传错误消息硬编码中文模板("语音上传响应缺少 url 字段/解析失败/HTTP/请求失败")|同上|抽 i18n key
client|apps/client/src/stores/chat/higher-order.ts|72|HIGH|withErrorHandling 错误前缀拼接 "xxx失败" 为硬编码中文模板|所有聊天 action 错误提示多语言失效|错误文案走 t()
client|apps/client/src/stores/discover/actions/swipe.ts|111,343-344|HIGH|"操作失败/超级喜欢失败,请重试/喜欢操作失败,请重试"硬编码中文|同上|抽 i18n key
client|apps/client/src/stores/discover/actions/fetch.ts|147|HIGH|"加载推荐失败,请稍后重试"硬编码中文|同上|抽 i18n key
client|apps/client/src/stores/home.ts|73|HIGH|"加载首页数据失败"硬编码中文|同上|抽 i18n key
client|apps/client/src/stores/feedback.ts|29,48,68,88|HIGH|反馈相关 4 处错误消息硬编码中文|同上|抽 i18n key
client|apps/client/src/stores/unlock-guide.ts|46,89|HIGH|"此功能"硬编码中文占位|同上|抽 i18n key
client|apps/client/src/services/agnes-video.ts|166|HIGH|"未知错误"硬编码中文|同上|抽 i18n key
client|apps/client/src/view-models/feedback.ts|17-28|HIGH|反馈状态文案("已提交/处理中/已查看/已排期/已转活动")硬编码中文|反馈历史页多语言失效|抽 i18n key
client|apps/client/src/view-models/home.ts|76-115,131-132|HIGH|首页设置引导标题("补全基础资料/填写学校信息/先完成设置/去聊天/今日/空档")硬编码中文|首页核心引导多语言失效|抽 i18n key
client|apps/client/src/view-models/profile.ts|82-88,126,134|HIGH|"刚刚/未设置昵称/未设置学校"硬编码中文|个人页多语言失效|抽 i18n key
client|apps/client/src/stores/schedule.ts|45|HIGH|WEEK_DAYS 硬编码中文("周一…周日")且导出被页面展示|课表多语言失效|抽 i18n key
client|apps/client/src/stores/campus.ts|138-154|HIGH|话题分类/认证状态映射硬编码中文("课程交流/已认证"等),若用于真实数据展示则多语言失效|校园页多语言失效|抽 i18n key
client|apps/client/src/config/home-banners.ts|57-86|HIGH|首页横幅 title/subtitle 硬编码中文,无 i18n key|运营内容无法多语言|抽 i18n key
client|apps/client/src/config/home-recommended-people.ts|24-48|HIGH|首页推荐人姓名/文案硬编码中文|同上|抽 i18n key
client|apps/client/src/config/navigation.ts|29-59|HIGH|TabBar label 硬编码中文("匹配/圈子/首页/消息/我的"),与 pages.json/custom-tab-bar 三处重复|Tab 文案多语言失效且三源同步易漏|单源+t()
client|apps/client/src/custom-tab-bar/index.js|41-74|HIGH|TabBar label 硬编码中文(第二处重复源)|同上|引用共享配置
client|apps/client/src/config/status-copy.ts|15-40|HIGH|会话/匹配状态文案硬编码中文作为"兜底",且 view-models 直接使用|生产界面出现未翻译中文|见 view-models/chat.ts 条目
client|apps/client/src/subpackages/setup/campus/index.vue|34,38,42|HIGH|资料设置页 3 处表单校验 toast 硬编码中文|设置流程多语言失效|抽 i18n key
client|apps/client/src/subpackages/setup/schedule/index.vue|34,40|HIGH|时间安排页 2 处校验 toast 硬编码中文|同上|抽 i18n key
client|apps/client/src/subpackages/setup/recommend-pref/index.vue|119,121|HIGH|推荐偏好页"保存成功/保存失败,请重试"硬编码中文|同上|抽 i18n key
client|apps/client/src/pages/village/tag-posts.vue|28|HIGH|标签帖点赞为页面级本地翻转(TODO(mock) 自认),real 模式不落库|生产环境点赞即假|接入 likePost API
```

## MEDIUM(健壮性/一致性/体验)

```
client|apps/client/src/pages/vip/index.vue|116|MEDIUM|selectedPlanId 默认 "quarterly" 硬编码,与配置解耦后可能失效|默认套餐漂移|从 config 首项取
client|apps/client/src/pages/vip/index.vue|421|MEDIUM|switch color 硬编码 #FFD700(原生属性)|品牌色调整需改代码|配置化
client|apps/client/src/stores/vip-auto-renew.ts|186|MEDIUM|setEnabled 默认套餐硬编码 "quarterly"|与选中套餐可能不一致|显式传 planId
client|apps/client/src/stores/vip.ts|272-353|MEDIUM|fetchBills mock 分支在 billsLoading 检查之后,loading 时返回空缓存且 forceRefresh 被忽略|缓存一致性弱|调整分支顺序
client|apps/client/src/stores/vip.ts|286-353|MEDIUM|mock 账单硬编码日期 2026-07-25(非相对时间),时间一过展示过期数据|mock 演示失真|相对日期生成
client|apps/client/src/stores/vip-billing.ts|65-113|MEDIUM|与 stores/vip.ts fetchBills 完全重复的账单 mock/分页实现(第二份)|双 store 维护,字段易漂移|合并
client|apps/client/src/stores/vip-red-packet.ts|79|MEDIUM|mock 红包 id 用 Math.random 生成,可重复|mock 态红包 id 冲突|递增计数器
client|apps/client/src/stores/vip-red-packet.ts|175-180|MEDIUM|mock 领取金额随机 1-99 分,与 totalCount/总金额无约束关系|mock 演示失真|按剩余金额分配
client|apps/client/src/pages/vip/red-packet.vue|184-192|MEDIUM|claimId 缺失或非法时静默(无 toast/空态),领取流程无引导|链接分享后无反馈|非法参数给错误态
client|apps/client/src/pages/vip/promo-code.vue|(grep 见 store)|MEDIUM|promo-code 校验仅在 store 层,页面无输入格式即时校验|体验依赖服务端|页面加轻校验
client|apps/client/src/pages/chat/red-packet.vue|118|MEDIUM|发红包成功后 800ms 定时跳转期间无 loading 遮挡,可重复触发|重复创建红包风险|按钮禁用态覆盖整个流程
client|apps/client/src/stores/messages.ts|915|MEDIUM|loadInteractionEvents 单行 1200+ 字符的字段映射,可读性差且重复 4 个 || 兜底|维护成本高|抽 mapToInteractionEvent 函数
client|apps/client/src/stores/messages.ts|491,528,602,753,808,850,865,923|MEDIUM|8 处错误消息硬编码中文(加载会话/消息/通知/置顶/删除/拒绝信号等)|错误提示多语言失效|统一 t()
client|apps/client/src/stores/messages.ts|487,524,671,749,767,775,788,805,845,862,919,935,945,953|MEDIUM|14 处 withTimeout 超时文案硬编码中文("加载会话列表超时"等)|超时提示多语言失效|统一 t()
client|apps/client/src/stores/messages.ts|696|MEDIUM|"你们已成为好友,开始聊天吧"及 "·N岁·城市" 拼接硬编码中文|会话预览多语言失效|抽 i18n
client|apps/client/src/stores/messages.ts|257-376|MEDIUM|mock 会话/信号/通知大量中文内容(可接受),但 partnerAvatar 硬编码路径与 IMAGE_PATHS 不一致|同上(路径类)|IMAGE_PATHS
client|apps/client/src/stores/likes.ts|490,550,642,698,712,840,877,909,1114|MEDIUM|9 处错误消息硬编码中文(与周边 t() 混用)|错误提示多语言不一致|统一 t()
client|apps/client/src/stores/likes.ts|1114|MEDIUM|"部分操作失败(n/m)"模板字符串硬编码中文|批量操作失败提示多语言失效|抽 i18n
client|apps/client/src/stores/likes.ts|712|MEDIUM|"用户 ID 无效"硬编码,而相邻分支用 t("storeErrors.likes.userIdInvalid")|同文件两套文案体系|统一
client|apps/client/src/stores/village/index.ts|234,357,393,589,637,696,719,825,886|MEDIUM|9 处错误消息硬编码中文(加载帖子/发布/评论/点赞/转发/同校动态/相似作者)|村口社区错误提示多语言失效|统一 t()
client|apps/client/src/stores/village/index.ts|190-216|MEDIUM|fetchPosts mock 分支 this.hasMore=false 硬编码,real/mock 分页语义不一致|mock 无法演练分页|mock 生成多页数据
client|apps/client/src/stores/village/index.ts|540-535|MEDIUM|commentPost 防抖后无内容二次校验(空白内容会直接提交)|空评论入库|防抖回调内再校验
client|apps/client/src/stores/circle.ts|922|MEDIUM|"加载精选话题失败"硬编码中文(同文件其他全 t())|错误提示不一致|统一 t()
client|apps/client/src/stores/circle.ts|246-303|MEDIUM|兴趣圈 name/description 硬编码中文(仅 mock 分支,但若 real 空数据兜底展示会泄漏)|同上|t() 或后端数据
client|apps/client/src/stores/activity.ts|53-110|MEDIUM|mock 活动标题/描述硬编码中文;id 体系 "a-1" 与 real 数字 id 不一致|mock/real 切换时 id 类型漂移|统一 string 化
client|apps/client/src/stores/activity.ts|272-276|MEDIUM|取消报名用 DELETE 携带 data body,部分网关/后端不支持 DELETE body|取消报名 404|改用 POST /cancel 或 query
client|apps/client/src/stores/campus.ts|762-764,823-825|MEDIUM|发布话题/回复 mock 分支硬编码 "匿名校友/我/广州大学"|mock 数据污染展示|t() 或按 session 生成
client|apps/client/src/stores/campus.ts|259-376|MEDIUM|校园话题 mock 硬编码中文+固定"广州大学"作者|mock 演示失真|相对/会话数据
client|apps/client/src/stores/checkin.ts|256-280|MEDIUM|consecutiveDaysText 等 5 个 getter 硬编码中文模板("已连续签到 N 天"等)|签到权益多语言失效|抽 i18n
client|apps/client/src/stores/checkin.ts|338|MEDIUM|"获取签到状态超时"硬编码中文(与 444 行 t() 混用)|超时提示不一致|统一
client|apps/client/src/stores/checkin.ts|523|MEDIUM|makeUpCheckIn catch 后 console.error 并返回 null,调用方无法区分"失败"与"无权限"|补签失败无差异化提示|抛错给页面
client|apps/client/src/stores/activity.ts|160-186|MEDIUM|fetchActivities 失败时保留旧列表不抛错,loadMore 无法感知失败|分页静默失败|同 village loadMore 的回退模式
client|apps/client/src/stores/session.ts|22-37|MEDIUM|mockUserSession 中 schoolId 直接用学校名称"北京大学"充当 ID|ID/名称语义混淆,真实链路难迁移|mock 也使用真实 id
client|apps/client/src/stores/session.ts|182-211|MEDIUM|profileFieldStatus 用 profileCompleted 代理 6 个字段,无法反映真实完成度|资料完善引导失真|后端返回字段级状态
client|apps/client/src/stores/session.ts|296-302|MEDIUM|isProfileComplete getter 内嵌 isDev console.warn(生产分支也执行判断逻辑)|性能噪音|移出
client|apps/client/src/stores/profile.ts|109-110|MEDIUM|mockVoiceStatusUrl 硬编码 "https://example.com/mock/voice-status.mp3"(example.com 域名)|mock 音频无法播放|本地资源或删除
client|apps/client/src/stores/profile.ts|51-56|MEDIUM|mock 基本资料("星野/她她/大三")硬编码中文|同上|t()/会话数据
client|apps/client/src/stores/profile.ts|266|MEDIUM|voiceStatusDuration=42 魔法数字(注释为 42s)|可读性|常量
client|apps/client/src/stores/profile.ts|311-312|MEDIUM|load() real 分支 myPosts 恒为空且 "?? []" 无意义赋值,依赖从未被调用的 loadMyPosts|我的动态死链|见 HIGH 条目
client|apps/client/src/stores/video-call.ts|108-118|MEDIUM|mock 房间号生成与真实信令流程脱节,real 分支未验证信令 URL 格式|通话链路 mock/real 行为差异大|联调验证
client|apps/client/src/stores/chat/actions/session.ts|119-128|MEDIUM|startFromMatch mock 分支 partnerName 硬编码"匹配对象",未从匹配数据解析|mock 体验差|按 matchId 解析
client|apps/client/src/stores/chat/actions/session.ts|85-87|MEDIUM|mock 回退文案"新匹配/校园恋爱推荐/今晚"硬编码中文|同上|t()
client|apps/client/src/stores/chat/actions/messaging.ts|207,241|MEDIUM|voiceBody 默认 "语音消息" 硬编码中文,占位消息泄漏到真实发送|生产可能发送"语音消息"文本|H5 降级明确占位标识
client|apps/client/src/features/chat/transport.ts|47,91|MEDIUM|RealChatTransport.pushVoice 与 Mock 分支 body 均为"语音消息"硬编码中文|同上|同上
client|apps/client/src/pages/chat-session/index.vue|91-100,202-266|MEDIUM|sessionId 为 null 时页面无兜底空态(直接渲染空内容)|直开链接白屏|加参数缺失错误态
client|apps/client/src/pages/chat-session/index.vue|407-443|MEDIUM|发送消息 catch 后仅 toast,输入框内容已清空未恢复草稿|失败消息丢失|恢复草稿
client|apps/client/src/pages/chat-session/index.vue|1035|MEDIUM|messagesStore.errorMessage 直接渲染为页面文本,可能含后端原始错误串|错误文案暴露技术细节|映射友好文案
client|apps/client/src/pages/chat/index.vue|78-79|MEDIUM|跳转会话用 openAppPath 字符串拼接(之前清单已报 .stop 等,此为新增路径)|路径散落|ROUTES 常量
client|apps/client/src/pages/messages/index.vue|316-318|MEDIUM|错误 toast 优先展示 store.errorMessage(后端原文)|同上|映射友好文案
client|apps/client/src/pages/messages/index.vue|747|MEDIUM|倒计时兜底 "--:--:--" 硬编码占位|轻微|t()
client|apps/client/src/pages/messages/index.vue|855,885|MEDIUM|会话预览空值回退 t("messages.emptyTitle")("暂无消息"),语义混淆|空态文案错位|独立 key
client|apps/client/src/pages/heart-signals/index.vue|69|MEDIUM|countdownTimer 30s 间隔刷新全列表,页面 onUnload 未清(仅 onHide 停)|后台资源浪费|onUnload 清理
client|apps/client/src/pages/heart-signals/index.vue|93,105|MEDIUM|console.error("接受/拒绝心动信号失败")后静默,无 toast|用户无失败反馈|补 toast
client|apps/client/src/pages/discover/index.vue|188-243|MEDIUM|错误处理仅设置 store errorMessage,部分场景无 toast 无重试按钮|弱网时用户困惑|统一错误态+重试
client|apps/client/src/pages/discover/index.vue|521-531|MEDIUM|watch errorMessage 变化即上报 Sentry,同一错误可重复上报|噪音|去重上报
client|apps/client/src/pages/discover/index.vue|930|MEDIUM|remainingCount<=3 的"限量提示"魔法数字|规则散落|常量
client|apps/client/src/pages/discover/history.vue|86-95|MEDIUM|rewind 失败 catch 后仅 toast store 原始 message|同上|友好映射
client|apps/client/src/pages/discover/video-player.vue|143-146|MEDIUM|分享链接用 query 拼接 videoUrl(URL 可能超长/被截断)|长视频 URL 分享失败|存储桥接或缩短
client|apps/client/src/pages/village/index.vue|455-465|MEDIUM|onLoad 消费 query 与 onShow 双份消费逻辑,storage 桥接键无常量|tab 传参脆|统一常量
client|apps/client/src/pages/village/index.vue|164-176|MEDIUM|两处 catch(_e) 空吞(定位失败/其他),无降级提示|静默失败|提示+降级
client|apps/client/src/pages/village/detail.vue|416-425|MEDIUM|无 query.id 时依赖 store 残留 currentPost,直接分享链接可能展示他人帖子|隐私串号风险|无 id 时清空并提示
client|apps/client/src/pages/village/detail.vue|144-184|MEDIUM|多处 catch(_e) 静默(定位/收藏/关注失败)|用户无感知|补提示
client|apps/client/src/pages/village/post.vue|129-137|MEDIUM|选择图片失败 catch(_e) 静默|用户无反馈|toast
client|apps/client/src/pages/village/post.vue|261|MEDIUM|发布前对选中图片数量/大小无前置校验(仅 store 校验数量)|超大图请求失败|前端压缩校验
client|apps/client/src/pages/circles/post-topic.vue|240|MEDIUM|localImages 在 real 模式不调用上传(条件 !useMock 才跳过),mock 分支直接本地提交|同上 village|统一上传链路
client|apps/client/src/pages/circles/topic-detail.vue|186-190|MEDIUM|topicId 缺失时静默空白|直开链接白屏|空态兜底
client|apps/client/src/pages/circles/topics.vue|45|MEDIUM|circleId 缺失时静默(同族问题)|同上|兜底
client|apps/client/src/pages/campus/topic-detail.vue|102-110|MEDIUM|topicId 缺失时静默|同上|兜底
client|apps/client/src/pages/campus/index.vue|111|MEDIUM|话题分页 onLoadMoreTopic 无防抖/失败回退|快速滚动重复请求|同 village 模式
client|apps/client/src/pages/campus/post-topic.vue|157|MEDIUM|发布成功 1.5s 定时跳转,期间无 loading 遮挡|重复提交|guard
client|apps/client/src/pages/settings/index.vue|27|MEDIUM|operationTimers 集合仅清 clearCache/checkUpdate,其余导航 timer 未入集合|局部清理覆盖不全|统一
client|apps/client/src/pages/profile/index.vue|439,486|MEDIUM|voicePlayTimer 演示 3000ms 魔法数字|可读性|常量
client|apps/client/src/pages/profile/index.vue|222-237|MEDIUM|profileView 由 view-model 计算,与 profileStore 双数据源并存|状态分裂|单一数据源
client|apps/client/src/pages/profile/index.vue|419|MEDIUM|打招呼跳转 chat-session?userId=,会话页需靠 userId 新建会话,mock 会话存在时行为不确定|入口行为不一致|按 sessionId 优先
client|apps/client/src/pages/likes/index.vue|296,316,324|MEDIUM|openAppPath 字符串拼接路由(chat-session/profile/heart-signals)|路径散落|ROUTES
client|apps/client/src/pages/likes/index.vue|83-113|MEDIUM|搜索防抖 300ms 魔法数字且三处重复清理逻辑|可维护性|useDebounce
client|apps/client/src/pages/vip/bills.vue|(store)|MEDIUM|分页 loadMore 依赖 store listBills,失败时 page 不回退|断页|同 village 回退
client|apps/client/src/pages/vip/promo-code.vue|(store)|MEDIUM|redeem 防重复锁在 mock 分支前,real 失败后 lastRedeemResult 残留|重复兑换提示陈旧|失败清空
client|apps/client/src/services/config.ts|142|MEDIUM|loadCampuses 失败静默返回空数组,调用方(loadSchools)回退静态 4 校|学校列表长期缺失无告警|失败上报
client|apps/client/src/services/api.ts|438-452|MEDIUM|simulateError dev 调试接口经 isDev 守卫但仍在 api.ts 导出,存在误用面|调试面暴露|移入 dev 模块
client|apps/client/src/services/websocket/index.ts|184,246,319|MEDIUM|连接/断开/订阅日志用 console.warn 输出(已知 console 问题,但此为消息面)|调试信息生产可见|日志开关
client|apps/client/src/services/websocket/index.ts|249-251|MEDIUM|disconnect 内 setTimeout 未保存引用,无法取消|快速重连时旧 close 可能关掉新连接|保存引用
client|apps/client/src/services/websocket/reconnect.ts|46|MEDIUM|重连定时器 maxAttempts 后无最终降级提示|永久静默断线|提示+重试入口
client|apps/client/src/services/websocket/heartbeat.ts|55-67|MEDIUM|心跳超时即断线重连,无离线事件上抛给页面|弱网抖动频繁重连|指数退避
client|apps/client/src/services/websocket/store-dispatch.ts|66-215|MEDIUM|未知队列类型/非法数据仅 console.warn 静默|消息丢失无感知|Sentry 上报
client|apps/client/src/utils/privacy.ts|210|MEDIUM|示例代码注释含硬编码中文 toast(仅文档)|误导|更新文档
client|apps/client/src/utils/time.ts|245,364,368|MEDIUM|"刚刚/昨天/周日…" 硬编码中文,虽带 locale 分支但 zh 兜底直接写死|多语言边缘场景|key 化
client|apps/client/src/config/vip-plans.ts|50,61,75|MEDIUM|价格 18/48/158 前端硬编码,后端调价需发版|价格策略僵化|后端下发
client|apps/client/src/config/profile-tags.ts|75-130|MEDIUM|label 中文与 labelKey 并存,若 key 缺失静默展示中文|多语言降级无告警|缺失 key 上报
client|apps/client/src/config/popular-topics.ts|41-52|MEDIUM|热门话题 name 中文与 nameKey 并存|同上|同上
client|apps/client/src/components/discover/CardDetailOverlay.vue|168-169|MEDIUM|圈子推荐硬编码("美食探店/徒步旅行")|推荐内容无法运营|后端下发
client|apps/client/src/components/discover/FilterDrawer.vue|108-120|MEDIUM|省市-区县映射硬编码(且文件为乱码编码)|数据维护困难|后端下发
client|apps/client/src/components/chat/VoiceMessageBubble.vue|139|MEDIUM|进度 interval 未在组件销毁时清理(仅 stop 时清)|泄漏|onUnmounted 清理
client|apps/client/src/components/common/Toast.vue|168|MEDIUM|leaveTimer 内再包 setTimeout 无引用管理|边缘泄漏|统一
client|apps/client/src/components/common/ShareCard.vue|172|MEDIUM|uni.downloadFile 无超时/失败 toast 降级|分享图生成失败静默|补错误处理
client|apps/client/src/App.vue|64-174|MEDIUM|onLaunch 同步初始化链长,异常仅上报不降级(mock/real 双路径)|启动脆弱|分段降级
client|apps/client/src/main.ts|(grep)|MEDIUM|全局错误处理仅 Sentry,无用户可见兜底 toast|崩溃无提示|补 toast
client|apps/client/src/guards/profile-guard.ts|24-26|MEDIUM|页面名映射硬编码中文("喜欢列表/消息")|守卫提示多语言失效|t()
client|apps/client/src/pages/dev/index.vue|1|MEDIUM|DEV 开发者导航页未整体删除(注释自认"后续需整体删除"),仅 #ifdef DEV 包裹|包体膨胀+误用面|提审前移除
client|apps/client/src/manifest.json|(此前已知)|MEDIUM|appid wxc67cd233d72388d0 疑为测试号(此前清单已列,保留)|提审风险|确认正式 appid
```

## LOW(可维护性/轻微)

```
client|apps/client/src/pages/discover/index.vue|84-89|LOW|文件注释为乱码(UTF-8 损坏),全项目多处存在(messages/index.vue:202-215、stores/session.ts:620、stores/village/utils.ts:8、pages/chat-session/index.vue:492-519 等)|可维护性受损|批量转码修复
client|apps/client/src/pages/messages/index.vue|202-215|LOW|同上乱码注释|同上|同上
client|apps/client/src/stores/session.ts|620|LOW|TODO(real-env)中文注释乱码|同上|同上
client|apps/client/src/stores/village/utils.ts|8|LOW|同上|同上|同上
client|apps/client/src/stores/chat/actions/messaging.ts|34|LOW|VOICE_UPLOAD_TIMEOUT_MS=30000 魔法数字无注释单位常量命名规范|可读性|加单位
client|apps/client/src/stores/chat/actions/messaging.ts|127|LOW|sendId 用 Date.now() 可能碰撞(同毫秒两连发)|同 id 消息|计数器+时间戳
client|apps/client/src/stores/chat/actions/messaging.ts|164|LOW|mock 模式消息 id `m-${Date.now()}` 同样碰撞风险|同上|同上
client|apps/client/src/stores/chat/actions/session.ts|83|LOW|mock 会话 id `mock-session-${Date.now()}` 碰撞|同上|同上
client|apps/client/src/stores/chat/actions/exchange.ts|41-50|LOW|acceptExchange 状态机三元嵌套可读性差|维护成本|状态表
client|apps/client/src/stores/messages.ts|189-191|LOW|currentUserId 判空逻辑可简化为统一空串处理|可读性|简化
client|apps/client/src/stores/messages.ts|243-246|LOW|typeMap 通知类型映射在模块级,类型演进易漏|类型漂移|satisfies 校验
client|apps/client/src/stores/likes.ts|360-367|LOW|getter 内调用 useSessionStore(依赖注入,getter 应纯函数)|测试/调试困难|移到 action
client|apps/client/src/stores/likes.ts|458-460|LOW|空注释块("静默处理")死代码|噪音|删除
client|apps/client/src/stores/likes.ts|1042-1115|LOW|批量操作串联 await 无并发限制,大列表全失败|体验|批量上限
client|apps/client/src/stores/village/index.ts|90-97|LOW|commentDebounceTimers 的 resolve 引用使 Map 值复杂化|维护成本|简化
client|apps/client/src/stores/village/index.ts|190|LOW|filterAndSortPosts 过滤依赖 sessionStore,getter 中嵌套 try-catch|纯函数性弱|注入参数
client|apps/client/src/stores/village/index.ts|230|LOW|hasMore 用 items.length>=PAGE_SIZE 猜测末页|多一次空请求|totalPages
client|apps/client/src/stores/village/index.ts|319-323|LOW|mock 新帖 author.userId 硬编码 "user-1001"|mock 与真实用户体系割裂|会话 userId
client|apps/client/src/stores/village/index.ts|845-865|LOW|mock 相似作者硬编码 4 人中文信息|同上|t()
client|apps/client/src/stores/circle.ts|675,827|LOW|mock 评论作者 "我" 硬编码|同上|会话昵称
client|apps/client/src/stores/campus.ts|762|LOW|mock 发布作者 school 硬编码 "广州大学"|同上|会话
client|apps/client/src/stores/campus.ts|430-446|LOW|mock 活动/话题内容硬编码|同上|t()
client|apps/client/src/stores/campus-wall.ts|29-73|LOW|campus-wall store 全为 mock 硬编码中文且无 real 分支(功能未接入)|校园墙功能未实现|接入 API 或移除
client|apps/client/src/stores/checkin.ts|168-216|LOW|本地 withTimeout 与 services/http.ts 重复实现(注释自认)|重复代码|合并
client|apps/client/src/stores/checkin.ts|392-411|LOW|mock 签到 hotTopicsUnlocked/newUsersUnlocked 恒 true|mock 失真|随机
client|apps/client/src/stores/daily-question.ts|163-201|LOW|mock 问题/用户硬编码中文|同上|t()
client|apps/client/src/stores/schedule.ts|59-113|LOW|mock 课表硬编码("高等数学/王教授")|同上|t()
client|apps/client/src/stores/activity.ts|44-51|LOW|relativeDate 硬编码相对偏移|可读性|常量
client|apps/client/src/stores/social-progress.ts|152|LOW|进度数据 mock 分支与 real 分支结构重复|维护成本|统一映射
client|apps/client/src/stores/theme.ts|21-55|LOW|主题持久化多 catch(_e) 静默|无降级提示|告警
client|apps/client/src/stores/discover/constants.ts|(MOCK_MATCH_PROBABILITY)|LOW|mock 匹配概率常量需 .env 配置,默认 0|mock 演示无匹配反馈|开发时显式配置
client|apps/client/src/stores/discover/actions/rewind.ts|57|LOW|rewind mock 分支仅本地,real 无 rewind 接口时行为差异大|回看功能 mock/real 不一致|后端支持
client|apps/client/src/stores/discover/actions/storage.ts|65|LOW|saveTimer 300ms 防抖,页面 onHide 未强制 flush|切后台丢最后操作|onHide flush
client|apps/client/src/stores/discover/actions/history.ts|32-71|LOW|loadHistory mock 分支与 real 分支重复结构|维护成本|统一
client|apps/client/src/stores/discover/api.ts|(grep)|LOW|API 函数内联 URL 与 services/api.ts 重复|端点漂移|单一来源
client|apps/client/src/pages/discover/index.vue|647|LOW|clearSearch 通过 catchtap 绑定+defineExpose 暴露,兼容性 hack|维护噪音|统一事件
client|apps/client/src/pages/discover/index.vue|857-865|LOW|空态 refresh 按钮无 loading 态(点击后无反馈)|体验|loading
client|apps/client/src/pages/discover/index.vue|902|LOW|活动推荐区空数据时无隐藏逻辑,展示空容器|轻微|v-if
client|apps/client/src/pages/village/index.vue|583-648|LOW|noop/catchtap 占位与 defineExpose hack 多处|维护噪音|统一
client|apps/client/src/pages/village/index.vue|841|LOW|post.images.length 与 9 的 Math.min 魔法数字|可读性|常量
client|apps/client/src/pages/village/detail.vue|312-353|LOW|多处 catch(_error) 静默+defineExpose hack|同上|统一
client|apps/client/src/pages/village/detail.vue|774-817|LOW|分享弹窗 isSharing 状态与 store.sharePost 的幂等(已转发禁止)并存,语义重复|维护成本|简化
client|apps/client/src/pages/village/post.vue|548|LOW|图片计数 "x/9" 直接写死 9|可读性|常量
client|apps/client/src/pages/village/tag-posts.vue|94-136|LOW|页面内自建分页(不走 village store),与 store 分页逻辑重复|两套分页语义|复用 store
client|apps/client/src/pages/village/tag-posts.vue|115|LOW|appEnv.apiMode==="mock" 直接判断,与其他页面 useMock() 不一致|判断方式不统一|useMock()
client|apps/client/src/pages/circles/index.vue|43-52|LOW|CATEGORY_KEYWORDS 中文关键词过滤(服务端就绪后应移除,TODO 已标)|临时方案残留|后端过滤
client|apps/client/src/pages/circles/index.vue|118|LOW|openAppPath 字符串拼接 topics 路由|路径散落|ROUTES
client|apps/client/src/pages/campus/index.vue|182|LOW|scroll-view enhanced/bounces 属性在 mp-weixin 兼容性未知|潜在渲染差异|条件编译
client|apps/client/src/pages/love-center/mbti.vue|72-87|LOW|MBTI 为 4 题简化版本地计算(注释自认),结果无持久化|测试体验浅|接入完整题库
client|apps/client/src/pages/love-center/consulting.vue|43|LOW|课程报名成功仅 toast,无后续跳转|转化链路断|接报名落地
client|apps/client/src/pages/love-center/index.vue|58,64|LOW|恋爱测试/咨询入口部分为 toast 占位|功能占位|接入
client|apps/client/src/pages/shop/index.vue|103-107|LOW|商品详情页跳转被移除仅 toast(TODO 自认)|逛逛功能半成品|实现详情页
client|apps/client/src/pages/feedback/history.vue|144|LOW|detailCache 缓存无失效策略,后端更新不感知|陈旧详情|下拉刷新失效
client|apps/client/src/pages/feedback/history.vue|77-79|LOW|detailLoading/detailCache 双 Record 状态冗余|维护成本|单对象
client|apps/client/src/pages/settings/dnd.vue|232-260|LOW|保存失败 errorHaptic 后无 toast 重试引导|弱反馈|补 toast
client|apps/client/src/pages/profile/privacy.vue|55|LOW|返回用 switchTab 硬编码 "/pages/profile/index"|路径散落|ROUTES
client|apps/client/src/pages/profile/tasks.vue|(grep)|LOW|任务中心数据源与 checkin/social-progress 混用,无统一任务模型|任务体系分裂|统一
client|apps/client/src/pages/vip/bills.vue|(grep)|LOW|账单类型/状态枚举中文映射与 view-models 重复|同上|统一
client|apps/client/src/components/common/EmptyState.vue|(grep)|LOW|空态文案由调用方传,未内聚 i18n|分散|内部 key
client|apps/client/src/components/layout/AppShell.vue|(grep)|LOW|壳组件与 TabBar 双实现(H5 自定义 vs 原生)|平台差异维护成本|统一抽象
client|apps/client/src/components/discover/LongPressMenu.vue|35-50|LOW|长按菜单 200ms 动作定时器与关闭动画定时器并存|维护成本|状态机
client|apps/client/src/components/discover/CardSwiper.vue|133-140|LOW|长按定时器与动画定时器集合并存,清理逻辑分散|同上|统一
client|apps/client/src/components/social/SocialProgressIndicator.vue|81-90|LOW|tierAnimTimer 单例,多实例场景互相覆盖|多组件状态错乱|per-instance
client|apps/client/src/components/village/WallPostCard.vue|(grep)|LOW|帖子卡片与 village/index.vue 内联卡片重复实现|双份卡片维护|组件化
client|apps/client/src/components/chat/ChatBubble.vue|85-97|LOW|catchtap 兼容 hack 蔓延|维护噪音|统一事件方案
client|apps/client/src/utils/media.ts|(grep)|LOW|媒体选择与 album/certification 内联 chooseImage 重复|同上|统一
client|apps/client/src/utils/navigation.ts|(grep)|LOW|openAppPath 对 tab 页/普通页的判断散落调用点|导航语义弱|封装
client|apps/client/src/utils/audio-recorder.ts|543-612|LOW|播放结束定时器与组件级重复实现|同上|统一
client|apps/client/src/composables/useAbortOnHide.ts|(grep)|LOW|页面隐藏即 abort 全部请求,返回前台不自动恢复|弱网重进需手动刷新|可配置保留
client|apps/client/src/composables/useNetworkStatus.ts|(grep)|LOW|网络恢复回调无防抖,可能重复触发刷新|抖动|debounce
client|apps/client/src/composables/usePageAccess.ts|(grep)|LOW|页面守卫与 guards/profile-guard 双实现|守卫逻辑分裂|统一
client|apps/client/src/compat/index.ts|217-228|LOW|dev API 回退 127.0.0.1:8080 硬编码,与 config/env.ts 的 localhost:8080 并存|环境回退不一致|统一常量
client|apps/client/src/services/env.ts|123-131|LOW|services/env.ts 与 config/env.ts 双环境封装并存(注释自认历史实现)|双入口漂移|迁移删除
client|apps/client/src/services/generated/api-types.ts|(全文件)|LOW|OpenAPI 生成类型未含 token/refreshToken/vipStatus/schoolBound/profileBackgroundUrl,业务靠断言访问|类型安全缺口|重新生成+补 schema
client|apps/client/src/services/api.ts|203-209|LOW|loginWithWechat 内断言访问 token 字段(见上)|同上|补类型
client|apps/client/src/services/mocks/fixtures.ts|(61KB)|LOW|超大 mock 文件 61KB,维护成本高|包体/维护|拆分
client|apps/client/src/stores/chat/mock-data.ts|16-17|LOW|模块加载时求值 t(),语言切换后不跟随|多语言切换失效|builder 模式
client|apps/client/src/stores/chat/index.ts|61|LOW|export * from "./mock-data" 将 mock 数据暴露为公共 API,mock 引用面失控|mock 泄漏面|限制导出
client|apps/client/src/stores/chat.ts|7|LOW|兼容 re-export 层(chat.ts/discover.ts/village.ts)增加间接层|维护成本|逐步移除
client|apps/client/src/config/assets-index.ts|(grep)|LOW|资源索引与 config/images.ts 并存|资源引用双源|合并
client|apps/client/src/theme/|(grep)|LOW|主题文件与 uni.scss/design token 并存多套变量体系|样式体系分裂|统一
client|apps/client/src/pages/uni.scss|25|LOW|pages/ 下出现 uni.scss 重复文件(根 uni.scss 已存在)|构建歧义|删除
client|apps/client/src/components/uni.scss|25|LOW|components/ 下同样存在重复 uni.scss|同上|删除
client|apps/client/src/entry-server.js|(2KB)|LOW|SSR 入口在纯小程序项目中无实际用途|死文件|评估移除
client|apps/client/src/tests/*|(大量)|LOW|测试用 (globalThis as any).uni 模式重复 60+ 次|测试样板噪音|helper 封装
client|apps/client/src/stores/discover/actions/storage.ts|129|LOW|TODO(dispose-接线) 注释与页面未接线状态长期共存|技术债标记滞留|见 HIGH 条目
client|apps/client/src/pages/village/tag-posts.vue|199-234|LOW|mock 帖子 getMockTagPosts 内联 6 条硬编码数据(仅 mock)|同上|t()
client|apps/client/src/pages/chat/red-packet.vue|29-33|LOW|定时器清理模式重复 3 次(与 vip/red-packet 一致)|维护成本|复用 hook
client|apps/client/src/pages/vip/bills.vue|(grep)|LOW|账单列表无下拉刷新入口(仅 onLoad 加载)|新账单不可见|onPullDownRefresh
client|apps/client/src/pages/settings/dnd.vue|35|LOW|pageState 三态字符串枚举,无类型收窄|拼写风险|union 类型
client|apps/client/src/pages/messages/index.vue|153|LOW|countdownMap 每秒重建对象触发全量渲染|性能|局部更新
client|apps/client/src/pages/likes/index.vue|388-389|LOW|onShow 中 likedBy 为空才重拉,切 Tab 后数据可能陈旧|实时性|always refresh
client|apps/client/src/pages/home/index.vue|277-286|LOW|签到/补签 toast 依赖 t(),但 showToast 内 duration 魔法数字 1500/1200|可读性|常量
client|apps/client/src/pages/daily-question/index.vue|192|LOW|formatAnswerTime 复用 store 内实现(见 HIGH 重复条目)|同上|utils/time
client|apps/client/src/features/login/hero.ts|(grep)|LOW|登录 hero mock 视频/图片地址为占位资源,生产无真实素材|首屏视觉空白|接 CMS
client|apps/client/src/features/chat/session-machine.ts|(grep)|LOW|会话状态机与 chat/types 的 phase 枚举并存|状态定义双源|合并
client|apps/client/src/view-models/login.ts|(grep)|LOW|hero 视图模型与 services/api 返回类型断言耦合|同上|补类型
```

## 领域总结(按严重度统计)

- **CRITICAL 10 条**:VIP 购买 real 模式走假支付、手机号登录假链路、恋爱认证可自助"模拟通过"、学校绑定不落库、发帖/认证图片不上传、红包无分享能力——均为"功能未实现却以成功态示人"的资金/信任级问题,上线前必须修复或下线入口。
- **HIGH 约 95 条**:mock 数据/演示实现泄漏到生产路径(附近的人、活动示例、语音状态、检查更新、清除缓存、我的动态);核心错误文案未走 i18n(登录、聊天、消息、社区、设置流程);相对时间 4 处重复硬编码;VIP 价格双源不一致;TabBar 文案三源重复。
- **MEDIUM 约 120 条**:超时/错误文案硬编码、分页边界判断粗糙、定时器/dispose 未接线、静默 catch、mock/real 行为漂移、类型断言绕过 OpenAPI 缺口。
- **LOW 约 80 条**:注释乱码(UTF-8 损坏)全项目蔓延、重复实现(uni.scss/环境封装/EmptyState/卡片组件/时间工具)、魔法数字、catchtap hack、死文件(SSR 入口、campus-wall 纯 mock store、useVipStore)。
- 总体判断:项目工程化修复已覆盖大部分竞态/定时器/分页类问题,本轮新增风险集中在**"真实模式下仍走演示逻辑"的功能完整性缺口**与**未纳入 i18n 的硬编码文案/重复数据源**,建议按 CRITICAL → HIGH 顺序在商业化发布前闭环。
