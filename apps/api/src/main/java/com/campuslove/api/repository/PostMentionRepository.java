package com.campuslove.api.repository;

import com.campuslove.api.entity.PostMention;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostMentionRepository extends JpaRepository<PostMention, Long> {

    List<PostMention> findByPostId(Long postId);

    List<PostMention> findByPostIdAndNotifiedFalse(Long postId);
}
