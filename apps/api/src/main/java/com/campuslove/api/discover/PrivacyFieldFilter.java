package com.campuslove.api.discover;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Task 15.2：推荐列表隐私字段过滤器。
 *
 * <p>核心职责：确保推荐列表（未匹配对象）不返回隐私字段（手机号 / 身份证 / 真实姓名等），
 * 仅暴露白名单内的公开字段。与 User 实体中的隐私字段（{@code phone} / {@code password} /
 * {@code openid}）形成"数据源 - 视图"双重防护：</p>
 *
 * <ul>
 *   <li>数据源层：{@link com.campuslove.api.entity.User#getPassword()} 已标注
 *       {@link com.fasterxml.jackson.annotation.JsonIgnore}，任何序列化场景都不会泄露密码哈希</li>
 *   <li>视图层：{@link RecommendedPersonView} 为 Java record，字段固定，仅包含白名单字段</li>
 *   <li>运行时层：本类通过反射校验视图类未声明任何敏感字段，未来若有人向 record 添加
 *       {@code phone} / {@code idcard} / {@code realName} 等字段，校验会立即抛出异常，
 *       强制开发者在 code review 阶段评估隐私影响</li>
 * </ul>
 *
 * <p>设计原则：</p>
 * <ol>
 *   <li><b>白名单优先</b>：仅允许 {@link #ALLOWED_FIELDS} 中列出的字段出现在推荐视图中</li>
 *   <li><b>敏感字段模式匹配</b>：使用大小写不敏感的包含匹配，覆盖 {@code phone} / {@code mobile} /
 *       {@code idcard} / {@code idCard} / {@code realName} / {@code password} / {@code openid} 等变体</li>
 *   <li><b>防御纵深</b>：即使视图类被误扩展，本过滤器也能在运行时拦截</li>
 *   <li><b>零运行时开销</b>：校验结果可缓存（本实现采用每次反射，开销可接受；如需可优化为类加载时一次性校验）</li>
 * </ol>
 *
 * <p>使用方式：</p>
 * <pre>
 * // 在 Controller 中对推荐列表应用过滤器
 * List&lt;RecommendedPersonView&gt; recommendations = recommendationService.getRecommendations(userId, filter);
 * PrivacyFieldFilter.sanitize(recommendations);  // 校验并原样返回
 * </pre>
 *
 * @see RecommendationController
 * @see RecommendedPersonView
 */
public final class PrivacyFieldFilter {

    /**
     * 推荐视图允许暴露的字段白名单（与 {@link RecommendedPersonView} record 字段一一对应）。
     *
     * <p>白名单语义：仅这些字段可出现在推荐列表响应中。任何不在此列表中的字段
     * 都应在视图中不存在（由 record 字段固定保证）或被过滤器剔除。</p>
     *
     * <p>注意：{@code name} 字段为昵称（nickname），非真实姓名，可安全暴露；
     * {@code avatarUrl} 为用户主动上传的头像，可安全暴露。</p>
     */
    public static final Set<String> ALLOWED_FIELDS = Set.of(
            "id",              // 用户 ID（系统内部使用，非隐私字段）
            "name",            // 昵称（非真实姓名）
            "initials",        // 昵称首字母
            "headline",        // 个人标语
            "commonGround",    // 共同点
            "availability",    // 可用时间
            "campusName",      // 校区名称
            "avatarUrl",       // 头像 URL
            "tags",            // 兴趣标签
            "bio",             // 个人简介（用户主动填写，可公开）
            "images",          // 用户图片列表（兼容字段）
            "isSameSchool",    // 是否同校
            "isSameMajor",     // 是否同专业
            "commonCircleCount", // 共同兴趣圈数量
            "height",          // 身高（推荐筛选条件，可公开）
            "educationLevel",  // 学历层级（推荐筛选条件，可公开）
            "photoGallery",    // 照片墙 URL 列表（用户主动上传）
            "halfBodyPhotoUrl", // 半身照 URL（用户主动上传）
            "personalVideoUrl", // 个人视频 URL（用户主动上传）
            "verificationBadgeLevel" // 认证徽章级别（仅级别，不含证件号）
    );

    /**
     * 敏感字段模式列表（大小写不敏感的包含匹配）。
     *
     * <p>任何字段名（转为小写后）包含以下子串之一，即视为敏感字段：</p>
     * <ul>
     *   <li>{@code phone} / {@code mobile}：手机号</li>
     *   <li>{@code idcard} / {@code idcardnumber}：身份证号</li>
     *   <li>{@code realname}：真实姓名</li>
     *   <li>{@code password}：密码</li>
     *   <li>{@code openid}：微信 openid</li>
     *   <li>{@code secret}：密钥</li>
     * </ul>
     */
    public static final List<String> SENSITIVE_FIELD_PATTERNS = List.of(
            "phone",
            "mobile",
            "idcard",
            "realname",
            "password",
            "openid",
            "secret"
    );

    private PrivacyFieldFilter() {
        // 工具类，禁止实例化
    }

    /**
     * 校验推荐视图列表不含敏感字段，并原样返回。
     *
     * <p>本方法为"防御性校验"：由于 {@link RecommendedPersonView} 为 Java record，
     * 字段在编译期固定，运行时不会出现额外字段。本方法通过反射校验 record 类本身
     * 未声明任何敏感字段名，确保未来扩展时不会误引入隐私字段。</p>
     *
     * <p>校验失败时抛出 {@link IllegalStateException}，由全局异常处理器转换为 500 响应，
     * 提醒运维人员立即修复（不可静默泄露隐私字段）。</p>
     *
     * @param views 推荐视图列表
     * @param <T>   视图类型
     * @return 原样返回的视图列表（record 不可变，无需复制）
     * @throws IllegalStateException 当视图类声明了敏感字段时
     */
    public static <T> List<T> sanitize(List<T> views) {
        if (views == null || views.isEmpty()) {
            return views;
        }
        // 校验列表元素的运行时类（取第一个元素的类，record 类固定）
        Class<?> viewType = views.get(0).getClass();
        assertNoSensitiveFields(viewType);
        return views;
    }

    /**
     * 校验指定视图类未声明任何敏感字段。
     *
     * <p>使用 {@link Class#getDeclaredFields()} 反射获取类本身声明的字段（不含继承字段），
     * 对每个字段名做大小写不敏感的包含匹配，命中任一敏感模式即抛出异常。</p>
     *
     * <p>注意：本方法仅校验字段名，不校验字段值。因为 record 字段在编译期固定，
     * 字段名匹配足以覆盖"误添加敏感字段"的场景。</p>
     *
     * @param viewType 待校验的视图类
     * @throws IllegalStateException 当类声明了命中敏感模式的字段时
     */
    public static void assertNoSensitiveFields(Class<?> viewType) {
        Field[] fields = viewType.getDeclaredFields();
        for (Field field : fields) {
            String fieldNameLower = field.getName().toLowerCase(Locale.ROOT);
            for (String pattern : SENSITIVE_FIELD_PATTERNS) {
                if (fieldNameLower.contains(pattern)) {
                    throw new IllegalStateException(
                            "隐私字段过滤校验失败：视图类 " + viewType.getName()
                                    + " 声明了敏感字段 '" + field.getName()
                                    + "'（命中模式 '" + pattern + "'），"
                                    + "推荐列表不允许返回手机号/身份证/真实姓名等隐私字段。"
                                    + "请将该字段从视图中移除，或使用 @JsonIgnore 标注。");
                }
            }
        }
    }

    /**
     * 校验指定视图类的字段集合与白名单一致。
     *
     * <p>本方法用于启动时自检或测试场景，验证视图类未引入白名单之外的字段。
     * 若视图类新增字段但未同步更新 {@link #ALLOWED_FIELDS}，本方法会抛出异常，
     * 提醒开发者评估新字段是否属于隐私数据。</p>
     *
     * @param viewType 待校验的视图类
     * @throws IllegalStateException 当类声明了白名单之外的字段时
     */
    public static void assertFieldsInWhitelist(Class<?> viewType) {
        Set<String> declaredFieldNames = Arrays.stream(viewType.getDeclaredFields())
                .map(Field::getName)
                .collect(Collectors.toSet());
        for (String declared : declaredFieldNames) {
            if (!ALLOWED_FIELDS.contains(declared)) {
                throw new IllegalStateException(
                        "隐私字段白名单校验失败：视图类 " + viewType.getName()
                                + " 声明了白名单之外的字段 '" + declared
                                + "'。请评估该字段是否属于隐私数据，"
                                + "若可公开请将其加入 PrivacyFieldFilter.ALLOWED_FIELDS，"
                                + "若为隐私数据请从视图中移除。");
            }
        }
    }
}
