package com.campuslove.api.wxpay;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 微信支付配置装配（real profile）。
 *
 * <p>职责：</p>
 * <ul>
 *   <li>注册 {@link WxPayProperties}（app.wechat-pay.* 配置绑定）；</li>
 *   <li>注册 {@link WxPayBootstrapChecker}——启动期 fail-fast 校验：
 *       {@code enabled=true} 但缺任一必填项（或密钥格式非法）时拒绝启动。
 *       校验只读配置 / 解析本地密钥，<b>不发起任何网络调用</b>。</li>
 * </ul>
 *
 * <p>缺省安全：enabled 默认 false，此时所有 wxpay 组件保持惰性，
 * 回调/下单端点由配置闸直接 404。</p>
 */
@Configuration
@Profile("real")
@EnableConfigurationProperties(WxPayProperties.class)
public class WxPayConfig {

    /**
     * 启动期校验器（无状态，直接 new，不注册额外依赖）。
     *
     * @param properties 微信支付配置
     * @return 校验器实例（Spring 容器初始化时触发 afterPropertiesSet）
     */
    @Bean
    public WxPayBootstrapChecker wxPayBootstrapChecker(WxPayProperties properties) {
        return new WxPayBootstrapChecker(properties);
    }
}
