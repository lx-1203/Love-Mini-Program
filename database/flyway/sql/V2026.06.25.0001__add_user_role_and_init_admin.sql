-- 涓?users 琛ㄦ坊鍔?role 瀛楁骞跺垵濮嬪寲绠＄悊鍛樿处鍙?--
-- 鐢ㄩ€旓細
--   1. 缁?users 琛ㄦ柊澧?role 鍒楋紝鍖哄垎鏅€氱敤鎴?USER)涓庣鐞嗗憳(ADMIN)锛?--      閰嶅悎 SecurityConfig 涓?/api/admin/** 鐨?hasRole('ADMIN') 鏉冮檺鏍￠獙銆?--   2. 缁欑幇鏈夌敤鎴峰洖濉粯璁よ鑹?USER锛屼繚璇佸巻鍙叉暟鎹竴鑷存€с€?--   3. 閫氳繃 Flyway placeholder 鏈哄埗鍒濆鍖栦竴涓鐞嗗憳璐﹀彿锛岄伩鍏嶆槑鏂囩‖缂栫爜銆?--
-- 娉ㄦ剰浜嬮」锛?--   * 绠＄悊鍛樿处鍙风殑 openid / nickname 閫氳繃 application-db.yml 涓?--     spring.flyway.placeholders.admin-openid / admin-nickname 閰嶇疆榛樿鍊硷紝
--     骞跺彲鐢辩幆澧冨彉閲?ADMIN_OPENID / ADMIN_NICKNAME 瑕嗙洊銆?--   * 浠呭綋 users 琛ㄤ腑灏氫笉瀛樺湪 role='ADMIN' 鐨勭敤鎴锋椂鎵嶆彃鍏ワ紝閬垮厤閲嶅鍒濆鍖栥€?--   * 绠＄悊鍛樺瘑鐮佷笉鍦ㄦ鑴氭湰涓垵濮嬪寲锛岀敱搴旂敤灞傞€氳繃鐜鍙橀噺 ADMIN_PASSWORD 閰嶇疆锛?--     璇﹁ RealAuthService#loginAsAdmin銆?--   * 杩佺Щ鑴氭湰涓紩鐢ㄥ崰浣嶇浣跨敤 Flyway 鍗犱綅绗﹁娉?${admin_openid}锛?--     涓庨厤缃紙flyway.toml [flyway.placeholders] / application-real.yml
--     spring.flyway.placeholders锛夐厤鍚堜娇鐢ㄣ€?--   * 娉ㄦ剰锛圧4-00412 娉ㄩ噴淇锛夛細鍗犱綅绗︾粺涓€浣跨敤 placeholder 璇硶锛團lyway 榛樿锛夛紝
--     绂佹浣跨敤鍙屼笅鍒掔嚎 __xxx__ 鏍煎紡鈥斺€旇縼绉绘枃浠跺悕涓殑 __ 浼氳 Flyway 褰撲綔
--     鍗犱綅绗﹀墠缂€瑙ｆ瀽锛屽巻鍙蹭笂鏇惧洜娣风敤瀵艰嚧鍚姩澶辫触锛堣 flyway.toml 娉ㄩ噴锛夈€?
ALTER TABLE users
    ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'USER' COMMENT '鐢ㄦ埛瑙掕壊: USER/ADMIN';

-- 缁欑幇鏈夌敤鎴峰洖濉粯璁ゅ€硷紙闃插尽鎬у鐞嗭紝ADD COLUMN ... DEFAULT 宸茶鐩栨柊琛岋紝姝ゅ淇濊瘉瀛橀噺鏁版嵁锛?UPDATE users SET role = 'USER' WHERE role IS NULL OR role = '';

-- 鍒濆鍖栫鐞嗗憳璐﹀彿锛堜粎鍦ㄤ笉瀛樺湪 ADMIN 鐢ㄦ埛鏃舵墽琛岋級
-- 浣跨敤 ${admin_openid} / ${admin_nickname} 鍗犱綅绗︼紝
-- 鐢?application-db.yml 鐨?spring.flyway.placeholders 鎻愪緵鍊笺€?-- 娉ㄦ剰锛欶lyway 鍗犱綅绗︿负绾枃鏈浛鎹紝鍗犱綅绗﹀€煎彲鑳藉寘鍚繛瀛楃绛夌壒娈婂瓧绗︼紝
-- 蹇呴』鐢ㄥ崟寮曞彿鍖呰９浣垮叾鎴愪负瀛楃涓插瓧闈㈤噺锛屽惁鍒欎細琚В鏋愪负鍑忔硶杩愮畻瀵艰嚧璇硶閿欒銆?INSERT INTO users (openid, nickname, role, profile_completion, following_count, followers_count, created_at, updated_at)
SELECT '${admin_openid}', '${admin_nickname}', 'ADMIN', 100, 0, 0, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1);

