
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

/*!40000 ALTER TABLE `posts` DISABLE KEYS */;
INSERT INTO `posts` (`id`, `author_id`, `title`, `content`, `images`, `tags`, `likes_count`, `comments_count`, `share_count`, `view_count`, `hot_score`, `hot_boost`, `hot_banned`, `created_at`, `updated_at`, `audit_status`, `activity_id`, `audit_remark`, `auditor_id`, `audited_at`, `version`, `category`, `status`, `is_pinned`, `owner_circle_path`, `visibility`, `circle_id`) VALUES (190,5,'喜欢图书馆的下午和操场晚风，有一起自习的朋友吗？','喜欢图书馆的下午和操场晚风，有一起自习的朋友吗？','[\"/static/assets/images/covers/circle-reading.png\"]','[\"学习\", \"日常\"]',0,0,0,150,0.0005917838897542324,1,0,'2026-09-09 02:51:49','2026-10-14 23:45:03','approved',NULL,NULL,NULL,NULL,3631,'interest','active',0,NULL,'public',NULL),(191,6,'北岛的黄昏最美，有人在球场等我一起散步吗？','北岛的黄昏最美，有人在球场等我一起散步吗？','[\"/static/assets/images/posts/post-8.jpg\"]','[\"日常\", \"运动\"]',0,0,0,151,0.0005883329801733522,1,0,'2026-09-08 19:38:49','2026-10-14 23:45:03','approved',NULL,NULL,NULL,NULL,3631,'interest','active',0,NULL,'public',NULL),(192,7,'新开的那家咖啡馆拿铁不错，找个搭子试试。','新开的那家咖啡馆拿铁不错，找个搭子试试。','[\"/static/assets/images/posts/post-1.jpg\"]','[\"美食\", \"生活\"]',0,0,0,152,0.0005849368986522581,1,0,'2026-09-08 12:25:49','2026-10-14 23:45:03','approved',NULL,NULL,NULL,NULL,3631,'interest','active',0,NULL,'public',NULL),(193,8,'周末的读书会有人去吗？带上自己最喜欢的一本书。','周末的读书会有人去吗？带上自己最喜欢的一本书。','[\"/static/assets/images/posts/post-2.jpg\"]','[\"阅读\", \"学习\"]',0,0,0,153,0.000582417141270978,1,0,'2026-09-08 06:02:49','2026-10-14 23:45:03','approved',NULL,NULL,NULL,NULL,3631,'interest','active',0,NULL,'public',NULL),(194,9,'摄影社招新，用镜头记录校园的四季。','摄影社招新，用镜头记录校园的四季。','[\"/static/assets/images/posts/post-3.jpg\"]','[\"摄影\", \"社团\"]',0,0,0,154,0.0005791153754908699,1,0,'2026-09-07 22:49:49','2026-10-14 23:45:03','approved',NULL,NULL,NULL,NULL,3631,'interest','active',0,NULL,'public',NULL),(195,10,'最近迷上羽毛球，求一个水平相当的小伙伴！','最近迷上羽毛球，求一个水平相当的小伙伴！','[\"/static/assets/images/posts/post-4.jpg\"]','[\"运动\", \"日常\"]',0,0,0,155,0.0005758647239268434,1,0,'2026-09-07 15:36:49','2026-10-14 23:45:03','approved',NULL,NULL,NULL,NULL,3631,'interest','active',0,NULL,'public',NULL),(281,100158,'123456','123456','[]','[]',0,0,0,0,0,1,0,'2026-09-27 20:40:15','2026-09-27 20:40:15','pending',NULL,NULL,NULL,NULL,0,'interest','active',0,NULL,'public',NULL),(282,100158,'123456','123456','[]','[\"#校园日常\"]',0,0,0,0,0,1,0,'2026-09-27 20:44:37','2026-09-27 20:44:37','pending',NULL,NULL,NULL,NULL,0,'interest','active',0,NULL,'public',NULL),(286,100158,'QA自检-lane-ui2','QA自检-lane-ui2','[]','[]',0,0,0,0,0,1,0,'2026-09-29 03:20:13','2026-09-29 03:20:13','pending',NULL,NULL,NULL,NULL,0,'interest','active',0,NULL,'public',NULL),(322,100166,'设备腿验收 DEVSYNC1791985433201 这条帖','设备腿验收 DEVSYNC1791985433201 这条帖子是小程序真机发出来的，后台应当按同一个 ID 读到它。','[\"/api/v1/media/100166/202610/5e887d15-01f2-495f-8a70-316bb9fbd0fe.jpg\", \"/api/v1/media/100166/202610/5720abee-d9f2-4830-a0b6-870b9fe7372b.jpg\", \"/api/v1/media/100166/202610/51ca0302-39ea-4c1c-8210-7935354c6ba7.jpg\"]','[]',0,0,0,0,0,1,0,'2026-10-14 21:47:55','2026-10-14 23:23:12','pending',NULL,NULL,NULL,NULL,1,'interest','deleted',0,NULL,'public',NULL),(323,100166,'设备腿验收 DEVSYNC1791985960903 这条帖','设备腿验收 DEVSYNC1791985960903 这条帖子是小程序真机发出来的，后台应当按同一个 ID 读到它。','[\"/api/v1/media/100166/202610/6e60b046-a854-4a09-8aea-bc87a297890b.jpg\", \"/api/v1/media/100166/202610/3ee28b9e-b429-4d77-9f44-f272f51d0f51.jpg\", \"/api/v1/media/100166/202610/9db9a243-de8b-4499-81cf-1696b41d6d08.jpg\"]','[]',0,0,0,0,0,1,0,'2026-10-14 21:56:41','2026-10-14 23:23:12','pending',NULL,NULL,NULL,NULL,1,'interest','deleted',0,NULL,'public',NULL);
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

