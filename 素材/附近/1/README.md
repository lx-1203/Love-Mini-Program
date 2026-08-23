# 寻觅 v3 · Nearby 完整 SVG 包

## 冻结后的职责
- 首页：匹配中心
- 附近：Explore（本包）
- 匹配：寻觅沉浸卡
- 消息：已建立关系
- 我的：Identity

## Nearby 结构
附近首页
→ 附近的人
→ 兴趣圈（开放加入、无需校园认证）
→ 校园圈（对应学校认证后进入私域）
→ 活动
→ 附近动态 / 帖子

## 关键关系
帖子 / 圈子 / 活动
→ 查看作者
→ 他人主页
→ 喜欢 / 悄悄话
→ 匹配
→ 聊天

“认识 TA”不直接创建聊天，统一进入他人主页，避免与消息职责冲突。

## 权限
兴趣圈：任何用户可加入、发帖、评论。
校园圈：
- 未认证：可浏览公开内容，不进入私域
- 认证中：查看进度
- 已认证：进入对应校园私域、发帖、互动
- 非本校：不能加入私域，可浏览公开内容

## 文件
01_nearby_home.svg
02_interest_circle_list.svg
03_interest_circle_detail.svg
04_campus_circle.svg
05_activity_list.svg
06_post_detail.svg
07_create_post.svg
08_permission_states.svg
09_nearby_logic_map.svg
10_nearby_components.svg

## 冲突检查
1. Nearby 不出现“开始匹配”。
2. Nearby 不使用 CardSwiper 作为核心交互。
3. 首页不承载 Nearby 内容聚合。
4. 匹配 Tab 不承载圈子/帖子。
5. 校园权限只影响校园圈，不影响普通兴趣圈。
6. 帖子关系动作统一经他人主页收口。
7. 颜色与 v3 全局一致：#34C38F / #FF5A91。
