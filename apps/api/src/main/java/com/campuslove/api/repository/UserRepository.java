package com.campuslove.api.repository;

import com.campuslove.api.model.User;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import javax.sql.DataSource;

/**
 * 用户数据访问层，基于 JdbcTemplate。
 * 仅在 DataSource 可用时创建（db profile），mock profile 下不加载。
 */
@Repository
@ConditionalOnBean(DataSource.class)
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<User> USER_ROW_MAPPER = new UserRowMapper();

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 根据 openid 查找用户。
     */
    public Optional<User> findByOpenid(String openid) {
        try {
            User user = jdbcTemplate.queryForObject(
                    "SELECT id, openid, unionid, session_key, created_at, updated_at FROM `user` WHERE openid = ?",
                    USER_ROW_MAPPER, openid);
            return Optional.ofNullable(user);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    /**
     * 查找或创建用户：如果存在则返回已有用户，否则插入新用户并返回。
     * 此方法会更新 session_key 和 unionid（如有变更）。
     */
    public User findOrCreateByOpenid(String openid, String unionid, String sessionKey) {
        Optional<User> existing = findByOpenid(openid);
        if (existing.isPresent()) {
            User user = existing.get();
            // 更新 session_key 和 unionid（微信可能返回更新的值）
            jdbcTemplate.update(
                    "UPDATE `user` SET session_key = ?, unionid = COALESCE(NULLIF(?, ''), unionid) WHERE id = ?",
                    sessionKey, unionid, user.getId());
            user.setSessionKey(sessionKey);
            if (unionid != null && !unionid.isEmpty()) {
                user.setUnionid(unionid);
            }
            return user;
        }
        // 插入新用户
        jdbcTemplate.update(
                "INSERT INTO `user` (openid, unionid, session_key) VALUES (?, ?, ?)",
                openid, unionid, sessionKey);
        return findByOpenid(openid).orElseThrow(() ->
                new IllegalStateException("Failed to create user for openid: " + openid));
    }

    /**
     * 根据用户ID查找。
     */
    public Optional<User> findById(Long id) {
        try {
            User user = jdbcTemplate.queryForObject(
                    "SELECT id, openid, unionid, session_key, created_at, updated_at FROM `user` WHERE id = ?",
                    USER_ROW_MAPPER, id);
            return Optional.ofNullable(user);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    /**
     * User RowMapper，将 ResultSet 映射为 User 对象。
     */
    private static class UserRowMapper implements RowMapper<User> {
        @Override
        public User mapRow(ResultSet rs, int rowNum) throws SQLException {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setOpenid(rs.getString("openid"));
            user.setUnionid(rs.getString("unionid"));
            user.setSessionKey(rs.getString("session_key"));
            user.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            user.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
            return user;
        }
    }
}