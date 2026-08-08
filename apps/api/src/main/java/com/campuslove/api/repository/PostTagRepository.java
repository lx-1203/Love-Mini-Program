package com.campuslove.api.repository;

import com.campuslove.api.entity.PostTag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 帖子话题标签 Repository。
 * 提供基于帖子和标签名称的查询方法。
 */
@Repository
public interface PostTagRepository extends JpaRepository<PostTag, Long> {

    /**
     * 根据帖子 ID 查询该帖子的所有标签。
     *
     * @param postId 帖子 ID
     * @return 标签列表
     */
    List<PostTag> findByPostId(Long postId);

    /**
     * 根据标签名称查询所有关联的帖子标签记录。
     * 用于标签聚合场景，查询同一标签下的所有帖子关联。
     *
     * @param tagName 标签名称
     * @return 标签关联记录列表
     */
    List<PostTag> findByTagName(String tagName);

    /**
     * R4-00356：按标签名批量查询关联记录（热门标签聚合用）。
     *
     * <p>替代 getPopularTags 中每标签一次 findByTagName（8 标签 = 8 次 SQL），
     * 单条 SQL 拉取全部预置标签的关联记录后在内存分组统计。</p>
     *
     * @param tagNames 标签名称集合
     * @return 标签关联记录列表
     */
    List<PostTag> findByTagNameIn(java.util.Collection<String> tagNames);

    /**
     * 删除指定帖子的所有标签关联。
     *
     * @param postId 帖子 ID
     */
    void deleteByPostId(Long postId);
}