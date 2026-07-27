package com.campuslove.api.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.util.Locale;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.MessageSource;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/**
 * Task 3.2.3 - 后端 i18n 配置单元测试。
 *
 * <p>验证 {@link I18nConfig} 配置类正确：
 * <ul>
 *   <li>{@link I18nConfig#messageSource()} 返回配置正确的 {@link ResourceBundleMessageSource}，
 *       能从 classpath:i18n/messages*.properties 加载文案资源</li>
 *   <li>{@link I18nConfig#localeResolver()} 返回 {@link AcceptHeaderLocaleResolver}，
 *       默认 Locale 为 {@link Locale#SIMPLIFIED_CHINESE}，支持 zh-CN 与 en-US</li>
 *   <li>MessageSource 能根据 Locale 返回对应语言的文案（zh-CN 中文 / en-US 英文）</li>
 *   <li>占位符插值正常工作（{0} {1} ...）</li>
 *   <li>缺失 key 时返回 key 本身（不抛 NoSuchMessageException）</li>
 *   <li>未知 Locale 回退到默认中文文案</li>
 *   <li>资源文件至少包含 50 个 key（覆盖核心业务模块）</li>
 * </ul>
 * </p>
 *
 * <p>测试策略：纯单元测试，不加载 Spring 上下文，避免被
 * {@code @SpringBootTest} 全量加载应用上下文时触发其他控制器对
 * JPA Repository 的依赖（mock profile 下 JPA 已被排除）。
 * 通过直接实例化 {@link I18nConfig} 调用 bean 方法验证配置。</p>
 *
 * <p>覆盖的资源文件：
 * <ul>
 *   <li>{@code classpath:i18n/messages.properties} —— 默认兜底</li>
 *   <li>{@code classpath:i18n/messages_zh_CN.properties} —— 简体中文</li>
 *   <li>{@code classpath:i18n/messages_en_US.properties} —— 美式英文</li>
 * </ul>
 * </p>
 */
@DisplayName("Task 3.2.3 - I18n 配置测试")
class I18nTest {

    /** 被测 MessageSource 实例 */
    private MessageSource messageSource;

    /** 被测 LocaleResolver 实例 */
    private LocaleResolver localeResolver;

    /** 被测 I18nConfig 配置类实例 */
    private I18nConfig i18nConfig;

    @BeforeEach
    void setUp() {
        i18nConfig = new I18nConfig();
        messageSource = i18nConfig.messageSource();
        localeResolver = i18nConfig.localeResolver();
    }

    // ==================================================================
    // 场景 1：I18nConfig 常量完整性
    // ==================================================================

    /**
     * 场景 1.1：资源文件 basename 应为 "i18n/messages"。
     *
     * <p>对应 classpath:i18n/messages*.properties，
     * 由 {@link I18nConfig#MESSAGE_SOURCE_BASE_NAMES} 定义。</p>
     */
    @Test
    @DisplayName("MESSAGE_SOURCE_BASE_NAMES 应包含 'i18n/messages'")
    void messageSourceBaseNames_shouldContainI18nMessages() {
        assertEquals(1, I18nConfig.MESSAGE_SOURCE_BASE_NAMES.length,
                "basename 数量应为 1");
        assertEquals("i18n/messages", I18nConfig.MESSAGE_SOURCE_BASE_NAMES[0],
                "basename 应为 'i18n/messages'");
    }

    /**
     * 场景 1.2：默认编码应为 UTF-8。
     *
     * <p>避免 properties 文件中文乱码（Spring Boot 3.x 默认 ISO-8859-1）。</p>
     */
    @Test
    @DisplayName("DEFAULT_ENCODING 应为 UTF-8")
    void defaultEncoding_shouldBeUtf8() {
        assertEquals("UTF-8", I18nConfig.DEFAULT_ENCODING,
                "默认编码应为 UTF-8，避免 properties 文件中文乱码");
    }

    /**
     * 场景 1.3：默认 Locale 应为简体中文。
     *
     * <p>与客户端 vue-i18n 默认 locale（zh-CN）保持一致。</p>
     */
    @Test
    @DisplayName("DEFAULT_LOCALE 应为 Locale.SIMPLIFIED_CHINESE")
    void defaultLocale_shouldBeSimplifiedChinese() {
        assertEquals(Locale.SIMPLIFIED_CHINESE, I18nConfig.DEFAULT_LOCALE,
                "默认 Locale 应为简体中文，与客户端 vue-i18n 一致");
    }

    /**
     * 场景 1.4：支持的 Locale 列表应包含 zh-CN 与 en-US。
     */
    @Test
    @DisplayName("SUPPORTED_LOCALES 应包含 zh-CN 与 en-US")
    void supportedLocales_shouldContainZhCnAndEnUs() {
        assertEquals(2, I18nConfig.SUPPORTED_LOCALES.size(),
                "支持的 Locale 数量应为 2");
        assertTrue(I18nConfig.SUPPORTED_LOCALES.contains(Locale.SIMPLIFIED_CHINESE),
                "应包含简体中文");
        assertTrue(I18nConfig.SUPPORTED_LOCALES.contains(Locale.US),
                "应包含美式英文");
    }

    // ==================================================================
    // 场景 2：MessageSource Bean 配置
    // ==================================================================

    /**
     * 场景 2.1：messageSource() 应返回非 null 实例。
     */
    @Test
    @DisplayName("messageSource() 应返回非 null 实例")
    void messageSource_shouldReturnNonNullInstance() {
        assertNotNull(messageSource, "MessageSource 不应为 null");
        assertTrue(messageSource instanceof ResourceBundleMessageSource,
                "MessageSource 应为 ResourceBundleMessageSource 实例");
    }

    /**
     * 场景 2.2：MessageSource 应能从 classpath 加载资源文件。
     *
     * <p>验证：调用 getMessage 获取已存在的 key，应返回非空字符串而非 key 本身。
     * 若资源文件未加载，会因 setUseCodeAsDefaultMessage(true) 返回 key 本身。</p>
     */
    @Test
    @DisplayName("MessageSource 应能加载 i18n/messages 资源文件")
    void messageSource_shouldLoadResourceBundle() {
        String message = messageSource.getMessage("common.success", null, Locale.SIMPLIFIED_CHINESE);
        assertNotNull(message, "返回的消息不应为 null");
        assertFalse(message.isEmpty(), "返回的消息不应为空字符串");
        // 应返回中文文案，而非 key 本身
        assertEquals("操作成功", message,
                "zh-CN 下 common.success 应返回 '操作成功'");
    }

    /**
     * 场景 2.3：MessageSource 应支持中文 locale。
     */
    @Test
    @DisplayName("MessageSource 应支持 zh-CN locale 返回中文文案")
    void messageSource_shouldSupportZhCnLocale() {
        assertEquals("操作成功", messageSource.getMessage("common.success", null, Locale.SIMPLIFIED_CHINESE));
        assertEquals("操作失败", messageSource.getMessage("common.failed", null, Locale.SIMPLIFIED_CHINESE));
        assertEquals("网络错误，请稍后重试", messageSource.getMessage("common.networkError", null, Locale.SIMPLIFIED_CHINESE));
        assertEquals("登录成功", messageSource.getMessage("auth.loginSuccess", null, Locale.SIMPLIFIED_CHINESE));
        assertEquals("上传成功", messageSource.getMessage("media.uploadSuccess", null, Locale.SIMPLIFIED_CHINESE));
    }

    /**
     * 场景 2.4：MessageSource 应支持英文 locale。
     */
    @Test
    @DisplayName("MessageSource 应支持 en-US locale 返回英文文案")
    void messageSource_shouldSupportEnUsLocale() {
        assertEquals("Operation succeeded", messageSource.getMessage("common.success", null, Locale.US));
        assertEquals("Operation failed", messageSource.getMessage("common.failed", null, Locale.US));
        assertEquals("Network error, please try again later", messageSource.getMessage("common.networkError", null, Locale.US));
        assertEquals("Login successful", messageSource.getMessage("auth.loginSuccess", null, Locale.US));
        assertEquals("Upload successful", messageSource.getMessage("media.uploadSuccess", null, Locale.US));
    }

    /**
     * 场景 2.5：MessageSource 应支持占位符插值。
     *
     * <p>验证：{@code user.notFound=用户 {0} 不存在} 在传入 userId 后正确替换。</p>
     */
    @Test
    @DisplayName("MessageSource 应支持 {0} 占位符插值")
    void messageSource_shouldSupportPlaceholderInterpolation() {
        // zh-CN: user.notFound=用户 {0} 不存在
        String zhMessage = messageSource.getMessage(
                "user.notFound", new Object[]{123L}, Locale.SIMPLIFIED_CHINESE);
        assertEquals("用户 123 不存在", zhMessage,
                "zh-CN 下 user.notFound 应正确替换 {0} 占位符");

        // en-US: user.notFound=User {0} does not exist
        String enMessage = messageSource.getMessage(
                "user.notFound", new Object[]{123L}, Locale.US);
        assertEquals("User 123 does not exist", enMessage,
                "en-US 下 user.notFound 应正确替换 {0} 占位符");
    }

    /**
     * 场景 2.6：MessageSource 应支持多占位符插值。
     *
     * <p>验证：{@code match.dailyLimitExceeded=今日{0}次数已用完（每日上限 {1} 次）}
     * 在传入 operationName 与 dailyLimit 后正确替换。</p>
     */
    @Test
    @DisplayName("MessageSource 应支持多占位符插值")
    void messageSource_shouldSupportMultiplePlaceholders() {
        // zh-CN: match.dailyLimitExceeded=今日{0}次数已用完（每日上限 {1} 次）
        String zhMessage = messageSource.getMessage(
                "match.dailyLimitExceeded",
                new Object[]{"喜欢", 10},
                Locale.SIMPLIFIED_CHINESE);
        assertEquals("今日喜欢次数已用完（每日上限 10 次）", zhMessage,
                "zh-CN 下 match.dailyLimitExceeded 应正确替换 {0} {1} 占位符");

        // en-US: match.dailyLimitExceeded=Today's {0} limit has been used up (daily limit: {1} times)
        String enMessage = messageSource.getMessage(
                "match.dailyLimitExceeded",
                new Object[]{"like", 10},
                Locale.US);
        assertEquals("Today's like limit has been used up (daily limit: 10 times)", enMessage,
                "en-US 下 match.dailyLimitExceeded 应正确替换 {0} {1} 占位符");
    }

    /**
     * 场景 2.7：MessageSource 在缺失 key 时应返回 key 本身（不抛异常）。
     *
     * <p>因 {@link ResourceBundleMessageSource#setUseCodeAsDefaultMessage(boolean)}
     * 设置为 true，缺失 key 时返回 key 字符串而非抛 {@code NoSuchMessageException}。</p>
     */
    @Test
    @DisplayName("MessageSource 缺失 key 时应返回 key 本身")
    void messageSource_withMissingKey_shouldReturnKeyItself() {
        String missingKey = "nonexistent.key.path";
        String result = messageSource.getMessage(missingKey, null, Locale.SIMPLIFIED_CHINESE);
        assertEquals(missingKey, result,
                "缺失 key 时应返回 key 本身，而非抛 NoSuchMessageException");
    }

    /**
     * 场景 2.8：MessageSource 在未知 Locale 时应回退到默认文案。
     *
     * <p>当请求 Locale 为 ja-JP（不支持）时，因
     * {@link ResourceBundleMessageSource#setFallbackToSystemLocale(boolean)} 设置为 false，
     * 应回退到默认 messages.properties（与 zh-CN 一致）。</p>
     */
    @Test
    @DisplayName("MessageSource 未知 Locale 应回退到默认文案")
    void messageSource_withUnsupportedLocale_shouldFallbackToDefault() {
        Locale japanese = Locale.JAPAN;
        String result = messageSource.getMessage("common.success", null, japanese);
        // 应回退到 messages.properties 默认文案（与 zh-CN 一致）
        assertEquals("操作成功", result,
                "未知 Locale 应回退到默认文案（中文）");
    }

    /**
     * 场景 2.9：MessageSource 在 null locale 时应回退到默认文案。
     */
    @Test
    @DisplayName("MessageSource null Locale 应回退到默认文案")
    void messageSource_withNullLocale_shouldFallbackToDefault() {
        String result = messageSource.getMessage("common.success", null, null);
        // 默认使用系统 locale 或 basename 默认文件
        assertNotNull(result, "null Locale 时应返回非 null 默认文案");
        assertFalse(result.isEmpty(), "null Locale 时应返回非空默认文案");
    }

    // ==================================================================
    // 场景 3：LocaleResolver Bean 配置
    // ==================================================================

    /**
     * 场景 3.1：localeResolver() 应返回 AcceptHeaderLocaleResolver 实例。
     */
    @Test
    @DisplayName("localeResolver() 应返回 AcceptHeaderLocaleResolver 实例")
    void localeResolver_shouldReturnAcceptHeaderLocaleResolver() {
        assertNotNull(localeResolver, "LocaleResolver 不应为 null");
        assertTrue(localeResolver instanceof AcceptHeaderLocaleResolver,
                "LocaleResolver 应为 AcceptHeaderLocaleResolver 实例");
    }

    /**
     * 场景 3.2：LocaleResolver 默认 Locale 应为简体中文。
     *
     * <p>验证：当 Accept-Language 头缺失或无匹配时，回退到 {@link Locale#SIMPLIFIED_CHINESE}。</p>
     *
     * <p>实现说明：{@link org.springframework.web.servlet.i18n.AbstractLocaleResolver#getDefaultLocale()}
     * 为 protected 访问级别，无法直接调用。此处通过反射读取 {@code defaultLocale} 字段进行验证。</p>
     */
    @Test
    @DisplayName("LocaleResolver 默认 Locale 应为简体中文")
    void localeResolver_defaultLocaleShouldBeSimplifiedChinese() throws Exception {
        AcceptHeaderLocaleResolver resolver = (AcceptHeaderLocaleResolver) localeResolver;
        // 通过反射读取 AbstractLocaleResolver.defaultLocale 字段
        Field defaultLocaleField = resolver.getClass().getSuperclass().getDeclaredField("defaultLocale");
        defaultLocaleField.setAccessible(true);
        Object defaultLocale = defaultLocaleField.get(resolver);
        assertEquals(Locale.SIMPLIFIED_CHINESE, defaultLocale,
                "默认 Locale 应为简体中文，与客户端 vue-i18n 一致");
    }

    /**
     * 场景 3.3：LocaleResolver 应支持 zh-CN 与 en-US。
     */
    @Test
    @DisplayName("LocaleResolver 支持的 Locale 列表应包含 zh-CN 与 en-US")
    void localeResolver_supportedLocalesShouldContainZhCnAndEnUs() {
        AcceptHeaderLocaleResolver resolver = (AcceptHeaderLocaleResolver) localeResolver;
        assertNotNull(resolver.getSupportedLocales(), "supportedLocales 不应为 null");
        assertTrue(resolver.getSupportedLocales().contains(Locale.SIMPLIFIED_CHINESE),
                "应支持简体中文");
        assertTrue(resolver.getSupportedLocales().contains(Locale.US),
                "应支持美式英文");
    }

    // ==================================================================
    // 场景 4：资源文件完整性 - 至少 50 个 key
    // ==================================================================

    /**
     * 场景 4.1：资源文件应至少包含 50 个 key。
     *
     * <p>覆盖核心模块：common / user / auth / media / match / chat / post / circle /
     * activity / checkin / feedback / report / campus / admin。</p>
     *
     * <p>验证方式：抽样测试 50+ 已知 key，确保都能从资源文件加载（而非返回 key 本身）。</p>
     */
    @Test
    @DisplayName("资源文件应至少包含 50 个 key")
    void resourceBundle_shouldContainAtLeast50Keys() {
        String[] sampleKeys = {
                // common.* (16)
                "common.success", "common.failed", "common.loading", "common.networkError",
                "common.unauthorized", "common.forbidden", "common.notFound", "common.serverError",
                "common.badRequest", "common.tooManyRequests", "common.validationFailed",
                "common.mediaSizeExceeded", "common.idempotentConflict", "common.internalError",
                "common.maintenance", "common.rateLimited",
                // user.* (20)
                "user.notFound", "user.disabled", "user.deleted", "user.alreadyExists",
                "user.profileIncomplete", "user.verificationRequired", "user.emailVerificationRequired",
                "user.schoolVerificationRequired", "user.greeting", "user.loginSuccess",
                "user.logoutSuccess", "user.passwordChanged", "user.passwordResetLinkSent",
                "user.accountCreated", "user.profileUpdated", "user.avatarUpdated",
                "user.photoAdded", "user.photoDeleted", "user.videoUploaded", "user.videoDeleted",
                // auth.* (10)
                "auth.loginSuccess", "auth.loginFailed", "auth.logoutSuccess", "auth.tokenExpired",
                "auth.tokenInvalid", "auth.tokenRevoked", "auth.refreshTokenExpired",
                "auth.wechatLoginFailed", "auth.wechatCodeInvalid", "auth.wechatCodeExpired",
                // media.* (5)
                "media.uploadSuccess", "media.uploadFailed", "media.deleteSuccess",
                "media.deleteFailed", "media.sizeExceeded",
        };

        for (String key : sampleKeys) {
            String zhMessage = messageSource.getMessage(key, null, Locale.SIMPLIFIED_CHINESE);
            assertEquals(key, key, "key 自身用于校验");
            // 关键断言：返回的 message 不应等于 key 本身（说明资源文件已加载该 key）
            assertFalse(key.equals(zhMessage) && zhMessage.equals(key),
                    "key '" + key + "' 应在资源文件中存在，但返回了 key 本身: " + zhMessage);
            // 返回的 message 应非空
            assertFalse(zhMessage.isEmpty(),
                    "key '" + key + "' 返回的 message 不应为空");
        }

        // 至少 50 个 key 已验证
        assertTrue(sampleKeys.length >= 50,
                "抽样测试的 key 数量应至少为 50");
    }

    /**
     * 场景 4.2：中英文资源文件 key 应一致。
     *
     * <p>验证：抽样测试的 key 在 zh-CN 与 en-US 下都返回非 key 本身的有效文案，
     * 说明两端资源文件都包含对应翻译。</p>
     */
    @Test
    @DisplayName("中英文资源文件 key 应一致")
    void resourceBundle_zhAndEnKeysShouldBeConsistent() {
        String[] sampleKeys = {
                "common.success", "common.failed", "common.networkError",
                "user.notFound", "user.loginSuccess", "user.greeting",
                "auth.loginSuccess", "auth.tokenExpired",
                "media.uploadSuccess", "media.sizeExceeded",
                "match.success", "match.alreadyExists",
                "chat.messageSent", "chat.sessionNotFound",
                "post.created", "post.notFound",
                "circle.created", "circle.joined",
                "activity.signupSuccess", "activity.full",
                "checkin.success", "checkin.alreadyCheckedIn",
                "feedback.submitted", "report.submitted",
                "campus.verificationApproved", "admin.loginSuccess",
        };

        for (String key : sampleKeys) {
            String zhMessage = messageSource.getMessage(key, null, Locale.SIMPLIFIED_CHINESE);
            String enMessage = messageSource.getMessage(key, null, Locale.US);

            // 两端都不应返回 key 本身
            assertFalse(zhMessage.equals(key),
                    "zh-CN 缺失 key: " + key);
            assertFalse(enMessage.equals(key),
                    "en-US 缺失 key: " + key);

            // 中英文应不同（除非是品牌名/专有名词）
            // 这里只验证两端都有有效翻译，不强制中英文必须不同
            assertFalse(zhMessage.isEmpty(),
                    "zh-CN key '" + key + "' 返回空字符串");
            assertFalse(enMessage.isEmpty(),
                    "en-US key '" + key + "' 返回空字符串");
        }
    }

    // ==================================================================
    // 场景 5：核心业务模块覆盖
    // ==================================================================

    /**
     * 场景 5.1：应覆盖核心业务模块（user/auth/match/chat/post/admin）。
     *
     * <p>验证：每个核心模块至少有 5 个 key 已加载到资源文件中。</p>
     */
    @Test
    @DisplayName("应覆盖核心业务模块（user/auth/match/chat/post/admin）")
    void resourceBundle_shouldCoverCoreBusinessModules() {
        // 验证各核心模块的关键 key 都能正确加载
        assertMessageExists("user.notFound", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("user.loginSuccess", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("user.profileUpdated", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("user.passwordChanged", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("user.disabled", Locale.SIMPLIFIED_CHINESE);

        assertMessageExists("auth.loginSuccess", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("auth.loginFailed", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("auth.tokenExpired", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("auth.tokenInvalid", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("auth.logoutSuccess", Locale.SIMPLIFIED_CHINESE);

        assertMessageExists("match.success", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("match.alreadyExists", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("match.notFound", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("match.matchExpired", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("match.dailyLimitExceeded", Locale.SIMPLIFIED_CHINESE);

        assertMessageExists("chat.messageSent", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("chat.sessionNotFound", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("chat.sessionClosed", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("chat.voiceMessageExpired", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("chat.icebreakerRefreshed", Locale.SIMPLIFIED_CHINESE);

        assertMessageExists("post.created", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("post.updated", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("post.deleted", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("post.notFound", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("post.likeSuccess", Locale.SIMPLIFIED_CHINESE);

        assertMessageExists("admin.loginSuccess", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("admin.loginFailed", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("admin.notFound", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("admin.permissionDenied", Locale.SIMPLIFIED_CHINESE);
        assertMessageExists("admin.invalidCredentials", Locale.SIMPLIFIED_CHINESE);
    }

    /**
     * 辅助方法：断言指定 key 在指定 locale 下存在有效翻译。
     *
     * @param key    资源 key
     * @param locale 目标 locale
     */
    private void assertMessageExists(String key, Locale locale) {
        String message = messageSource.getMessage(key, null, locale);
        assertFalse(key.equals(message),
                "key '" + key + "' 在 locale " + locale + " 下应存在有效翻译，但返回了 key 本身");
        assertFalse(message.isEmpty(),
                "key '" + key + "' 在 locale " + locale + " 下返回的 message 不应为空");
    }

    /**
     * 场景 6：MessageSource 应能正确处理 null 参数数组。
     *
     * <p>对于无占位符的 key，传入 null args 不应抛 NPE。</p>
     */
    @Test
    @DisplayName("MessageSource 应能处理 null args 参数")
    void messageSource_withNullArgs_shouldNotThrowNpe() {
        assertDoesNotThrow(() -> {
            String message = messageSource.getMessage("common.success", null, Locale.SIMPLIFIED_CHINESE);
            assertNotNull(message);
        }, "null args 不应抛出异常");
    }

    /**
     * 场景 7：MessageSource 应能正确处理空参数数组。
     */
    @Test
    @DisplayName("MessageSource 应能处理空 args 数组")
    void messageSource_withEmptyArgs_shouldNotThrowNpe() {
        assertDoesNotThrow(() -> {
            String message = messageSource.getMessage("common.success", new Object[]{}, Locale.SIMPLIFIED_CHINESE);
            assertNotNull(message);
        }, "空 args 数组不应抛出异常");
    }

    /**
     * 场景 8：zh-CN 与 en-US 同一 key 应返回不同翻译。
     *
     * <p>验证 i18n 真正生效，而非两端资源文件内容相同。</p>
     */
    @Test
    @DisplayName("zh-CN 与 en-US 同一 key 应返回不同翻译")
    void messageSource_zhAndEnShouldReturnDifferentTranslations() {
        String zhMessage = messageSource.getMessage("common.success", null, Locale.SIMPLIFIED_CHINESE);
        String enMessage = messageSource.getMessage("common.success", null, Locale.US);
        assertFalse(zhMessage.equals(enMessage),
                "zh-CN 与 en-US 同一 key 应返回不同翻译，证明 i18n 真正生效");
    }
}
