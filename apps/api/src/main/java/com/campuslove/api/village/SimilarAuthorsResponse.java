package com.campuslove.api.village;

import java.util.List;

/**
 * 相似作者推荐响应。
 */
public record SimilarAuthorsResponse(
    /** 推荐的相似作者列表 */
    List<SimilarAuthorView> authors
) {}
