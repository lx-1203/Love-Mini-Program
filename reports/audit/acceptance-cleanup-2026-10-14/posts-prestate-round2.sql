
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
INSERT INTO `posts` (`id`, `author_id`, `title`, `content`, `images`, `tags`, `likes_count`, `comments_count`, `share_count`, `view_count`, `hot_score`, `hot_boost`, `hot_banned`, `created_at`, `updated_at`, `audit_status`, `activity_id`, `audit_remark`, `auditor_id`, `audited_at`, `version`, `category`, `status`, `is_pinned`, `owner_circle_path`, `visibility`, `circle_id`) VALUES (333,100165,'后台发布验收1791992525350','这是一条由后台校区管理员发布的验收帖，时间戳 1791992525350。','[]','[\"后台验收\"]',0,0,0,1,0.03448951835991525,1,0,'2026-10-14 23:43:01','2026-10-14 23:57:48','approved',NULL,'鉴权对照探针',100000,'2026-10-14 23:54:24',6,'campus','deleted',0,'C1/R3/S1','public',NULL),(334,100165,'后台发布验收1791993263993','这是一条由后台校区管理员发布的验收帖，时间戳 1791993263993。','[]','[\"后台验收\"]',0,0,0,1,0,1,0,'2026-10-14 23:54:25','2026-10-14 23:57:48','approved',NULL,'官方小编后台发布，免内容审核',100168,'2026-10-14 23:54:25',2,'campus','deleted',0,'C1/R3/S1','public',NULL),(335,100165,'浏览器验收帖1791993310463','这条由后台「发布内容」页在浏览器里真实提交，用于验证发帖闭环 1791993310463。','[]','[]',0,0,0,0,0,1,0,'2026-10-14 23:55:11','2026-10-14 23:57:48','approved',NULL,'官方小编后台发布，免内容审核',100000,'2026-10-14 23:55:11',2,'sincere','deleted',0,'C1/R3/S1','public',NULL);
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

