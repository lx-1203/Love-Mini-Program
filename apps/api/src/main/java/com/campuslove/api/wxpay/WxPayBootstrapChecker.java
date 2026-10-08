package com.campuslove.api.wxpay;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;

/**
 * 微信支付启动期校验器（fail-fast）。
 *
 * <p>{@code app.wechat-pay.enabled=true} 时逐项校验必填配置并在缺项时抛出
 * {@link IllegalStateException} 拒绝启动——避免「开关开了但密钥没配」的半可用态
 * 进入运行期（用户下单成功却拿不到 prepay_id / 回调验不了签）。</p>
 *
 * <p>同时预热加载商户私钥与平台证书公钥（本地 PEM 解析），把密钥格式错误
 * 也提前到启动期暴露。<b>全程不发起任何网络调用</b>。</p>
 *
 * <p>{@code enabled=false}（缺省封存态）时仅记录提示日志，不做任何强校验。</p>
 */
public class WxPayBootstrapChecker implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(WxPayBootstrapChecker.class);

    private final WxPayProperties properties;

    public WxPayBootstrapChecker(WxPayProperties properties) {
        this.properties = properties;
    }

    /**
     * Bean 初始化时执行校验。
     *
     * @throws IllegalStateException enabled=true 且配置不齐全 / 密钥非法时抛出
     */
    @Override
    public void afterPropertiesSet() {
        if (!properties.isEnabled()) {
            log.info("微信支付处于封存态（app.wechat-pay.enabled=false），"
                    + "下单/支付回调/退款回调端点将直接 404");
            return;
        }

        List<String> missing = properties.findMissingRequired();
        if (!missing.isEmpty()) {
            String msg = "微信支付已启用（app.wechat-pay.enabled=true）但缺少必填配置: "
                    + missing + "；请通过环境变量注入（APP_WXPAY_*）后重启。";
            log.error(msg);
            throw new IllegalStateException(msg);
        }

        // 预热解析密钥（本地 PEM 解析，无网络调用）：私钥 / 平台证书格式非法同样 fail-fast
        try {
            WxPayRequestSigner.loadMerchantPrivateKey(properties.getMerchantPrivateKey());
        } catch (RuntimeException e) {
            throw new IllegalStateException("微信支付商户私钥解析失败: " + e.getMessage(), e);
        }
        try {
            WxPayCallbackVerifier.loadPlatformPublicKey(properties.getPlatformCert());
        } catch (RuntimeException e) {
            throw new IllegalStateException("微信支付平台证书公钥解析失败: " + e.getMessage(), e);
        }

        if (properties.getCallbackIpWhitelist() == null || properties.getCallbackIpWhitelist().isEmpty()) {
            log.warn("微信支付回调 IP 白名单（app.wechat-pay.callback-ip-whitelist）未配置，"
                    + "回调端点仅依赖签名校验；建议配置微信支付服务器出口 IP 段实现纵深防御");
        }
        log.info("微信支付配置校验通过：mchid={}, notifyUrl={}, refundNotifyUrl={}",
                properties.getMchid(), properties.getNotifyUrl(), properties.getRefundNotifyUrl());
    }
}
