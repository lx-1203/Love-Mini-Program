// 按行号在 loginAsAdmin 方法声明前插入注册/手机号登录实现
const fs = require("fs");
const path = "apps/api/src/main/java/com/campuslove/api/auth/RealAuthService.java";
const lines = fs.readFileSync(path, "utf8").split("\n");

// 找到 "public UserSessionView loginAsAdmin" 的行
let idx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("public UserSessionView loginAsAdmin")) {
    idx = i;
    break;
  }
}
if (idx < 0) {
  console.error("loginAsAdmin NOT FOUND");
  process.exit(1);
}
// 回退到方法 Javadoc 起始(向上找连续的注释块起始,简化:直接向前找最近的 "    }" 结束行)
let insertAt = idx;
for (let i = idx - 1; i >= 0; i--) {
  if (lines[i].trim() === "}" || lines[i].trim().startsWith("    /**")) {
    insertAt = i;
    break;
  }
}
// 若停在 /** 处则从它开始替换;否则在 idx 前插入
const impl = `    /**
     * 注册新用户（手机号 + 密码 + 昵称）。
     *
     * <p>实现要点：</p>
     * <ul>
     *   <li>手机号格式校验(1[3-9] 开头 11 位)</li>
     *   <li>密码 BCrypt 加密存储(password 字段)</li>
     *   <li>phone 唯一约束(查重)</li>
     *   <li>注册成功直接签发 JWT 会话,无需二次登录</li>
     * </ul>
     */
    @Override
    @Transactional
    public UserSessionView registerUser(String phone, String password, String nickname) {
        if (phone == null || !phone.matches("^1[3-9]\\\\d{9}$")) {
            throw new IllegalArgumentException("手机号格式不正确");
        }
        if (password == null || password.length() < 6 || password.length() > 64) {
            throw new IllegalArgumentException("密码长度须为 6-64 位");
        }
        if (nickname == null || nickname.isBlank() || nickname.trim().length() > 20) {
            throw new IllegalArgumentException("昵称长度须为 1-20 字");
        }
        boolean phoneExists = userRepository.findByPhone(phone).isPresent();
        if (phoneExists) {
            throw new IllegalArgumentException("该手机号已注册");
        }
        User user = new User();
        user.setOpenid("phone:" + phone);
        user.setPhone(phone);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname.trim());
        user.setRole("USER");
        user.setStatus("active");
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        user.setCreatedAt(java.time.LocalDateTime.now());
        user.setUpdatedAt(java.time.LocalDateTime.now());
        User saved = userRepository.save(user);
        log.info("新用户注册成功: userId={}, phone={}", saved.getId(), SensitiveDataMasker.mask(phone));
        String token = jwtTokenProvider.generateToken(String.valueOf(saved.getId()));
        return buildSessionView(saved, token);
    }

    /**
     * 手机号 + 密码登录。
     *
     * <p>通过 phone 查询用户,BCrypt 校验密码。未注册手机号与密码错误统一返回
     * "手机号或密码错误"(防账号枚举)。</p>
     */
    @Override
    @Transactional(readOnly = true)
    public UserSessionView loginWithPhone(String phone, String password) {
        if (phone == null || phone.isBlank() || password == null || password.isBlank()) {
            throw new InvalidCredentialsException("手机号或密码错误");
        }
        User user = userRepository.findByPhone(phone).orElse(null);
        if (user == null) {
            throw new InvalidCredentialsException("手机号或密码错误");
        }
        if (user.isDisabled()) {
            throw new com.campuslove.api.common.OperationForbiddenException("账号已被禁用，请联系管理员");
        }
        String storedHash = user.getPassword();
        if (storedHash == null || storedHash.isBlank()
                || !passwordEncoder.matches(password, storedHash)) {
            throw new InvalidCredentialsException("手机号或密码错误");
        }
        String token = jwtTokenProvider.generateToken(String.valueOf(user.getId()));
        return buildSessionView(user, token);
    }

`;

// 插入到 loginAsAdmin 的 Javadoc 之前:从 insertAt 行开始插入
lines.splice(insertAt, 0, impl);
fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("INSERTED at line", insertAt);
