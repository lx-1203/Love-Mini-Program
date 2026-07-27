package com.campuslove.api.config;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

/**
 * 国际化（i18n）配置类（Task 3.2.3）。
 *
 * <p>Spring Boot 3.x 国际化标准实现：
 * <ul>
 *   <li>{@link MessageSource}：从 classpath:i18n/messages*.properties 加载文案资源，
 *       按 Locale 选择对应文件（如 messages_zh_CN.properties / messages_en_US.properties）</li>
 *   <li>{@link LocaleResolver}：从 HTTP 请求头 {@code Accept-Language} 解析 Locale，
 *       无匹配时回退到 {@link Locale#SIMPLIFIED_CHINESE}（简体中文）</li>
 * </ul>
 * </p>
 *
 * <p>资源文件路径约定（Spring Boot 默认 basename = messages）：
 * <ul>
 *   <li>{@code classpath:i18n/messages.properties} —— 默认兜底文案（无 locale 后缀）</li>
 *   <li>{@code classpath:i18n/messages_zh_CN.properties} —— 简体中文文案</li>
 *   <li>{@code classpath:i18n/messages_en_US.properties} —— 美式英文文案</li>
 * </ul>
 * </p>
 *
 * <p>使用方式（在 Service / Controller 中通过构造注入）：
 * <pre>{@code
 * @Service
 * public class UserService {
 *     private final MessageSource messageSource;
 *     public UserService(MessageSource messageSource) { this.messageSource = messageSource; }
 *
 *     public String greet(Locale locale) {
 *         return messageSource.getMessage("user.greeting", null, locale);
 *     }
 * }
 * }</pre>
 * </p>
 *
 * <p>支持参数插值：{@code messageSource.getMessage("user.notfound", new Object[]{123L}, locale)}
 * 对应 properties 中 {@code user.notfound=用户 {0} 不存在}。</p>
 *
 * <p>设计说明：
 * <ul>
 *   <li>basename 设置为 {@code i18n/messages}，对应 classpath 路径 {@code i18n/messages*.properties}；
 *       多 basename 场景可使用 {@link #MESSAGE_SOURCE_BASE_NAMES} 字符串数组扩展。</li>
 *   <li>默认编码 UTF-8，避免 properties 文件中文乱码（Spring Boot 3.x 默认 ISO-8859-1）；
 *       实际加载时使用 {@link StandardCharsets#UTF_8}。</li>
 *   <li>{@code fallbackToSystemLocale=false}：当请求 Locale 无匹配资源时，
 *       回退到默认 messages.properties（而非系统 Locale），保证可预测性。</li>
 *   <li>{@link AcceptHeaderLocaleResolver#setDefaultLocale(Locale)} 设置为 {@link Locale#SIMPLIFIED_CHINESE}，
 *       与客户端 vue-i18n 默认 locale（zh-CN）保持一致。</li>
 *   <li>支持 locale 列表：zh-CN、en-US；其他 locale 自动回退到 zh-CN。</li>
 * </ul>
 * </p>
 */
@Configuration
public class I18nConfig {

    /**
     * 资源文件 basename 列表。
     *
     * <p>每个 basename 对应 classpath 下的资源文件前缀：
     * {@code i18n/messages} → {@code classpath:i18n/messages*.properties}</p>
     *
     * <p>多 basename 场景（如按业务模块拆分）可在此追加：
     * {@code {"i18n/messages", "i18n/errors", "i18n/validation"}}。</p>
     */
    public static final String[] MESSAGE_SOURCE_BASE_NAMES = {"i18n/messages"};

    /** 默认编码：UTF-8，避免 properties 文件中文乱码 */
    public static final String DEFAULT_ENCODING = StandardCharsets.UTF_8.name();

    /** 默认 Locale：简体中文，与客户端 vue-i18n 默认 locale 一致 */
    public static final Locale DEFAULT_LOCALE = Locale.SIMPLIFIED_CHINESE;

    /** 支持的 Locale 列表：zh-CN、en-US */
    public static final List<Locale> SUPPORTED_LOCALES = List.of(
            Locale.SIMPLIFIED_CHINESE,
            Locale.US
    );

    /**
     * 配置 {@link MessageSource} Bean。
     *
     * <p>使用 {@link ResourceBundleMessageSource} 从 classpath 加载 properties 文件，
     * 按 Locale 选择对应文件并按 UTF-8 解码。</p>
     *
     * @return 配置好的 MessageSource 实例
     */
    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasenames(MESSAGE_SOURCE_BASE_NAMES);
        source.setDefaultEncoding(DEFAULT_ENCODING);
        // 请求 Locale 无匹配资源时，回退到默认 messages.properties（而非系统 Locale）
        // 保证可预测性：未翻译文案始终回退到默认中文，而非宿主机系统语言
        source.setFallbackToSystemLocale(false);
        // 找不到 key 时返回 key 本身（而非抛 NoSuchMessageException），
        // 便于排查缺失的翻译 key，且不阻断业务流程
        source.setUseCodeAsDefaultMessage(true);
        // 总是缓存消息（默认 -1 永久缓存）；开发期可通过 spring.messages.cache-duration 调整
        source.setCacheSeconds(60);
        return source;
    }

    /**
     * 配置 {@link LocaleResolver} Bean。
     *
     * <p>使用 {@link AcceptHeaderLocaleResolver}：从 HTTP 请求头 {@code Accept-Language}
     * 解析 Locale（如 {@code zh-CN}、{@code en-US}），与前端 vue-i18n 切换 locale 后
     * 通过 axios/uni.request 自动发送的 Accept-Language 头协同工作。</p>
     *
     * <p>配置：
     * <ul>
     *   <li>{@code setDefaultLocale(Locale.SIMPLIFIED_CHINESE)}：Accept-Language 缺失或无匹配时回退到中文</li>
     *   <li>{@code setSupportedLocales(List.of(zh-CN, en-US))}：限定支持的语言列表，
     *       防止恶意 Accept-Language 触发不必要的资源文件查找</li>
     * </ul>
     * </p>
     *
     * @return 配置好的 LocaleResolver 实例
     */
    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(DEFAULT_LOCALE);
        resolver.setSupportedLocales(SUPPORTED_LOCALES);
        return resolver;
    }
}
