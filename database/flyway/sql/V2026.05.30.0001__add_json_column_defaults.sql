-- 为所有JSON列添加默认值
ALTER TABLE feedback_tickets ALTER COLUMN attachments SET DEFAULT '[]';
ALTER TABLE user_basic_profile ALTER COLUMN interest_tags SET DEFAULT '[]';
ALTER TABLE activities ALTER COLUMN participant_avatars SET DEFAULT '[]';
ALTER TABLE circle_topics ALTER COLUMN images SET DEFAULT '[]';
ALTER TABLE posts ALTER COLUMN images SET DEFAULT '[]';
ALTER TABLE posts ALTER COLUMN tags SET DEFAULT '[]';
ALTER TABLE user_schedule_profile ALTER COLUMN preferred_time_window_json SET DEFAULT '[]';
ALTER TABLE user_schedule_profile ALTER COLUMN course_block_json SET DEFAULT '[]';
