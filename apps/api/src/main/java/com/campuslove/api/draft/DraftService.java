package com.campuslove.api.draft;

/**
 * 发布草稿服务。
 */
public interface DraftService {
    /** 保存/更新当前用户草稿，返回最新草稿视图。 */
    DraftView save(Long userId, SaveDraftRequest request);

    /** 获取当前用户草稿；无则返回 null。 */
    DraftView get(Long userId);

    /** 删除当前用户草稿（发布成功后调用）。 */
    void delete(Long userId);
}
