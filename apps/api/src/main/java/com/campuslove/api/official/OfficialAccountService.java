package com.campuslove.api.official;

import java.util.List;

/**
 * 官方号服务接口（2026-08-07 官方号体系）。
 *
 * <p>官方号 = 产品助手号（official-assistant）/ 活动运营号（official-promoter），
 * 会话进消息列表、消息流按发布时间升序拉取。</p>
 */
public interface OfficialAccountService {

    /**
     * 获取全部启用官方账号，按展示顺序升序。
     *
     * @return 账号视图列表
     */
    List<OfficialAccountView> getAccounts();

    /**
     * 获取某官方号的消息流（发布时间升序）。
     *
     * @param code 官方号唯一标识
     * @return 消息视图列表；账号不存在或已下线时返回空列表
     */
    List<OfficialMessageView> getMessages(String code);
}
