/**
 * DTO（Data Transfer Object）转换层。
 *
 * <p>本包用于隔离 Service 层与 Controller 层之间的数据模型：
 * Service 层内部继续使用 Entity 进行业务运算，Controller 层对外暴露 DTO，
 * 通过 {@link com.campuslove.api.dto.DtoMapper} 在两层之间进行转换。</p>
 *
 * <h2>命名规范</h2>
 * <ul>
 *   <li><strong>XxxRequest</strong>：请求入参 DTO，用于接收客户端提交的数据。
 *       例：{@code CreatePostRequest}、{@code UpdateProfileRequest}。</li>
 *   <li><strong>XxxResponse</strong>：响应出参 DTO，用于封装一次性、聚合性的返回数据
 *       （区别于通用实体映射的 DTO）。
 *       例：{@code MatchResultResponse}、{@code LoginResponse}。</li>
 *   <li><strong>XxxView</strong>：视图展示 DTO，兼容项目中已有的 {@code *View} 后缀类
 *       （如 {@code CheckInStatusView}、{@code PostSummaryView}）。
 *       View 类作为 OpenAPI 契约的稳定层保持不变，新 DTO 用于内部 Service -&gt; Controller 之间的隔离。</li>
 *   <li><strong>XxxDto</strong>：通用 DTO，用于直接对应单一 Entity 的传输对象。
 *       例：{@link com.campuslove.api.dto.UserDto}、{@link com.campuslove.api.dto.PostDto}。</li>
 * </ul>
 *
 * <h2>敏感字段脱敏</h2>
 * <p>所有可能包含敏感信息（openid、手机号、邮箱、身份证号等）的 DTO 字段，
 * 必须在 {@link com.campuslove.api.dto.DtoMapper} 转换时调用
 * {@link com.campuslove.api.dto.MaskingUtils} 进行脱敏处理，
 * 严禁将原始敏感数据暴露给 Controller 层。</p>
 *
 * <h2>与 Entity 的关系</h2>
 * <ul>
 *   <li>DTO 字段是 Entity 字段的子集，按需暴露，避免过度传输。</li>
 *   <li>DTO 不持有 JPA 关联（@ManyToOne/@OneToMany），打破懒加载链路。</li>
 *   <li>DTO 的时间字段统一使用 {@link java.time.Instant}（UTC），
 *       Entity 使用 {@link java.time.LocalDateTime}，由 Mapper 负责转换。</li>
 * </ul>
 *
 * @since 2026-07-26
 */
package com.campuslove.api.dto;
