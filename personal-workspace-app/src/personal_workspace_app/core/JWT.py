# jwt 用于登录使用
from datetime import datetime, timedelta, timezone
import jwt
from personal_workspace_app.core.exceptions import AppException
from loguru import logger

# 1、 密钥
SECRET_KEY = "6ecfe93069f857dc309fdb7979e5ac55a38c350711a281c1fa6cc539ca3f6f76"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# 1、生成token
def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """生成 JWT 访问令牌"""
    to_encode = data.copy()
    # 1、设置过期时间,没有指定则使用默认
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(ACCESS_TOKEN_EXPIRE_MINUTES)
    #  exp 是 JWT 的标准保留字段（Expiration Time）
    to_encode.update({"exp": expire})

    # 3、生成token
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# 2、验证token
def decode_token(token: str) -> dict | None:
    """校验并解析 Token"""
    try:
        # decode 方法会自动验证 Signature 和 exp (过期时间)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.info(f"token已过期")
        raise AppException(code="1000", message="Token无效或已过期")
    except jwt.InvalidTokenError:
        logger.info(f"token无效")
        raise AppException(code="1001", message="Token无效或已过期")


# if __name__ == '__main__':
#     user_payload = {"sub": "10001", "username": "sunquanhu", "role": "admin"}
#     token = create_access_token(user_payload)
#     print(f"生成的 Token:\n{token}\n")
#     value = decode_token(token)
#     print(f"解析后的 value:\n{value}\n")



