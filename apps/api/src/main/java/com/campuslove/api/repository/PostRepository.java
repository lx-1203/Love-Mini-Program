package com.campuslove.api.repository;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.PostCategory;
import com.campuslove.api.entity.Post.PostStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 帖子 Repository。
 * 提供基于分类、状态和作者的查询方法。
 */
public interface PostRepository extends JpaRepository<Post, Long> {

    /**
     * 根据分类和状态查询帖子，按创建时间倒序分页。
     *
     * @param category 帖子分类
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByCategoryAndStatusOrderByCreatedAtDesc(PostCategory category, PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 列表和状态查询帖子，按创建时间倒序分页。
     *
     * @param authorIds 作者 ID 列表
     * @param status    帖子状态
     * @param pageable  分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByAuthorIdInAndStatusOrderByCreatedAtDesc(List<Long> authorIds, PostStatus status, Pageable pageable);

    /**
     * 根据状态查询帖子，按创建时间倒序分页。
     *
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByStatusOrderByCreatedAtDesc(PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 列表和分类查询帖子，按创建时间倒序分页。
     *
     * @param authorIds 作者 ID 列表
     * @param category  帖子分类
     * @param status    帖子状态
     * @param pageable  分页参数
     * @return 分页帖子列表
     */
    Page<Post> findByAuthorIdInAndCategoryAndStatusOrderByCreatedAtDesc(
            List<Long> authorIds, PostCategory category, PostStatus status, Pageable pageable);

    /**
     * 根据作者 ID 查询该用户的所有帖子。
     * 用于统计用户帖子总获赞数等场景。
     *
     * @param authorId 作者 ID
     * @return 该作者的所有帖子列表
     */
    List<Post> findByAuthorId(Long authorId);

    /**
     * 根据状态查询帖子，按点赞数倒序分页。
     * 用于首页聚合"村口热门帖子"场景。
     *
     * @param status   帖子状态
     * @param pageable 分页参数
     * @return 分页帖子列表（按点赞数从高到低）
     */
    Page<Post> findByStatusOrderByLikesCountDesc(PostStatus status, Pageable pageable);
}
