# 微信小程序提审材料准备清单

> 本清单用于跟踪微信小程序提审前需要准备的物理材料。
> 代码仓库无法存放这些材料，需要项目运营/法务/产品团队线下准备。
> 最后更新：2026-07-27

---

## 一、企业主体材料（必须）

### 1.1 主体认证
- [ ] 营业执照照片/扫描件（清晰、完整、有效期内）
- [ ] 法人身份证正反面照片/扫描件
- [ ] 企业对公账户（用于支付认证费用 300 元/年）
- [ ] 在微信公众平台完成企业主体认证
  - 入口：https://mp.weixin.qq.com → 注册 → 小程序 → 企业主体
  - 认证审核：3-5 工作日
  - 备注：个人主体无法发布社交类目小程序

### 1.2 类目资质
- [ ] 小程序类目选择：社交 > 社交资讯
- [ ] 类目资质材料上传
  - 营业执照：上传至 主体信息 → 营业执照
  - 法人身份证：自动关联（已认证主体无需重复上传）
- [ ] 类目审核通过（1-3 工作日）

## 二、服务器与域名（必须）

### 2.1 域名注册
- [ ] 注册主域名（如 campuslove.com）
- [ ] 注册 API 子域名（如 api.campuslove.com）
- [ ] 注册 CDN 子域名（如 cdn.campuslove.com，可选）
- [ ] 域名实名认证（个人或企业实名）

### 2.2 ICP 备案
- [ ] 在域名服务商处提交 ICP 备案申请
  - 所需材料：营业执照、法人身份证、域名证书、服务器租赁合同
  - 审核周期：7-20 工作日
- [ ] 备案通过后保存备案号
- [ ] 备案截图保存（用于内部归档，不提交微信）

### 2.3 SSL 证书
- [ ] 申请主域名 SSL 证书（Let's Encrypt 免费 或 阿里云/腾讯云付费）
- [ ] 申请 API 子域名 SSL 证书
- [ ] 部署到服务器（Nginx/Traefik）
- [ ] 配置 HTTPS 强制跳转

### 2.4 服务器配置
- [ ] 部署后端 API（Docker Compose 启动）
- [ ] 部署 Admin 后台（Nginx 静态托管）
- [ ] 配置 MySQL/Redis/RabbitMQ 持久化
- [ ] 配置 Prometheus + Grafana 监控
- [ ] 配置定时备份脚本（scripts/backup-mysql.sh）

### 2.5 微信小程序后台配置
- [ ] 配置 request 合法域名：https://api.campuslove.com
- [ ] 配置 uploadFile 合法域名：https://api.campuslove.com
- [ ] 配置 downloadFile 合法域名：https://api.campuslove.com
- [ ] 配置 socket 合法域名：wss://api.campuslove.com（如使用 WebSocket）
- [ ] 配置业务域名（可选，用于 webview 嵌入）

## 三、演示视频（必须）

### 3.1 录制准备
- [ ] 准备测试账号（至少 2 个：1 男 1 女，用于演示匹配）
- [ ] 准备测试数据（话题、动态、活动等）
- [ ] 准备录制环境（微信开发者工具 + 真机）

### 3.2 录制脚本（5 分钟）
- [ ] 0:00-0:30 微信登录与隐私协议
- [ ] 0:30-1:00 完善资料与校园认证
- [ ] 1:00-2:00 推荐匹配与喜欢操作
- [ ] 2:00-3:00 匹配成功与聊天
- [ ] 3:00-4:00 发布话题与社区互动
- [ ] 4:00-5:00 VIP 购买与权益

### 3.3 录制与上传
- [ ] 使用微信开发者工具录屏功能录制
- [ ] 输出格式 MP4 720p（或更高）
- [ ] 时长控制在 3-5 分钟
- [ ] 上传至微信公众平台 → 版本管理 → 提交审核 → 功能演示视频

## 四、法律文本（已完成 ✅）

- [x] 隐私政策：docs/privacy-policy.md（v1.0.0，2026-07-26 生效）
- [x] 用户协议：docs/user-agreement.md（v1.0.0，2026-07-26 生效）
- [x] 第三方 SDK 列表：docs/third-party-sdks.md
- [x] 小程序内隐私政策页面：apps/client/src/subpackages/legal/privacy/index.vue
- [x] 小程序内用户协议页面：apps/client/src/subpackages/legal/agreement/index.vue
- [x] manifest.json __usePrivacyCheck__: true
- [x] App.vue wx.onNeedPrivacyAuthorization 回调

## 五、测试账号（必须）

### 5.1 测试账号清单
- [ ] admin_test：管理员账号（用于演示后台管理）
- [ ] user_test_male：男性测试用户（用于演示匹配）
- [ ] user_test_female：女性测试用户（用于演示匹配）
- [ ] vip_test：VIP 用户（用于演示 VIP 权益）

### 5.2 测试账号配置
- [ ] 在微信公众平台 → 版本管理 → 提交审核 → 测试账号 中配置
- [ ] 提供测试账号的微信号码和密码（如有）
- [ ] 提供测试账号已绑定的手机号（用于短信验证）

## 六、隐私合规（必须）

- [x] manifest.json 配置 __usePrivacyCheck__: true
- [x] requiredPrivateInfos 配置（chooseAddress/chooseLocation/getLocation）
- [x] App.vue 注册 wx.onNeedPrivacyAuthorization 回调
- [x] 隐私接口组件调用前 ensurePrivacyAuthorized() 检查
- [ ] 微信公众平台 → 设置 → 服务内容声明 中填写隐私协议摘要
- [ ] 微信公众平台 → 设置 → 用户隐私保护指引 中填写完整隐私协议

## 七、其他材料（按需）

### 7.1 特殊行业资质（如适用）
- [ ] ICP 经营许可证（如涉及经营性业务）
- [ ] 网络文化经营许可证（如涉及娱乐内容）
- [ ] 互联网新闻信息服务许可证（如涉及新闻资讯）

### 7.2 商标注册（可选）
- [ ] 小程序名称商标注册证（防止名称侵权）
- [ ] Logo 商标注册证

### 7.3 软件著作权（可选）
- [ ] 软件著作权登记证书（用于维权）

## 八、提审前最终检查

- [ ] 所有 ❌ 项已变为 ✅
- [ ] 代码已通过 CI/CD 全部门禁
- [ ] 测试覆盖率 ≥ 80%
- [ ] 微信开发者工具上传体验版
- [ ] 体验版真机测试通过
- [ ] 提审材料齐全
- [ ] 提审备注填写完整（功能说明 + 测试账号 + 演示视频链接）
- [ ] 提交审核

## 九、提审后跟踪

- [ ] 关注微信公众平台审核进度
- [ ] 准备应对审核驳回（常见原因：类目不符、隐私协议不完整、功能不完整）
- [ ] 审核通过后发布上线
- [ ] 上线后 7 天内监控线上稳定性
- [ ] 上线后 30 天内收集用户反馈并迭代

## 参考资料

- 微信小程序提审指南：https://developers.weixin.qq.com/miniprogram/product/review.html
- 微信小程序运营规范：https://developers.weixin.qq.com/miniprogram/product/
- 微信小程序设计规范：https://developers.weixin.qq.com/miniprogram/design/
- 隐私协议指引：https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/
