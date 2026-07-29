#!/usr/bin/env bash
# generate-secret.sh — 生成项目所需各类密钥/口令的辅助脚本
# 用法：
#   ./scripts/generate-secret.sh jwt        # 生成 JWT 密钥
#   ./scripts/generate-secret.sh db         # 生成数据库密码
#   ./scripts/generate-secret.sh redis      # 生成 Redis 密码
#   ./scripts/generate-secret.sh admin_hash # 生成管理员密码 bcrypt 哈希
#   ./scripts/generate-secret.sh            # 打印 usage
set -euo pipefail

# 生成 JWT 密钥：48 字节随机数，base64 编码
gen_jwt_secret() {
  openssl rand -base64 48
}

# 生成数据库密码：32 字节随机数，base64 编码
gen_db_password() {
  openssl rand -base64 32
}

# 生成 Redis 密码：24 字节随机数，base64 编码
gen_redis_password() {
  openssl rand -base64 24
}

# 生成管理员密码的 bcrypt 哈希
# 依赖：python3 + bcrypt 库
# 参数：$1 可选明文密码，默认 "ChangeMe123!"
gen_admin_password_hash() {
  local plaintext="${1:-ChangeMe123!}"
  if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 未安装，请先安装 python3" >&2
    echo "       然后执行: pip install bcrypt" >&2
    return 1
  fi
  if ! python3 -c "import bcrypt" 2>/dev/null; then
    echo "ERROR: bcrypt 库未安装，请执行: pip install bcrypt" >&2
    return 1
  fi
  python3 -c "import bcrypt; print(bcrypt.hashpw(b'${plaintext}', bcrypt.gensalt(10)).decode())"
}

# 打印用法
print_usage() {
  cat <<'USAGE'
generate-secret.sh — 生成项目所需密钥/口令

用法:
  ./scripts/generate-secret.sh <type> [args...]

支持的类型:
  jwt          生成 JWT 密钥 (openssl rand -base64 48)
  db           生成数据库密码 (openssl rand -base64 32)
  redis        生成 Redis 密码 (openssl rand -base64 24)
  admin_hash   生成管理员密码的 bcrypt 哈希
                 依赖: python3 + bcrypt (pip install bcrypt)
                 可选参数: 明文密码 (默认 ChangeMe123!)

示例:
  ./scripts/generate-secret.sh jwt
  ./scripts/generate-secret.sh admin_hash 'MySecurePwd@2026'
USAGE
}

# 主流程
main() {
  local type="${1:-}"
  if [[ -z "${type}" ]]; then
    print_usage
    exit 0
  fi

  case "${type}" in
    jwt)
      gen_jwt_secret
      ;;
    db)
      gen_db_password
      ;;
    redis)
      gen_redis_password
      ;;
    admin_hash)
      shift
      gen_admin_password_hash "${1:-}"
      ;;
    -h|--help|help)
      print_usage
      ;;
    *)
      echo "ERROR: 未知类型 '${type}'" >&2
      print_usage >&2
      exit 1
      ;;
  esac
}

main "$@"
