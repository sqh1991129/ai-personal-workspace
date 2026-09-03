# 校验token

from fastapi import Request, Depends
from personal_workspace_app.core.JWT import decode_token
from personal_workspace_app.core.exceptions import AppException
from personal_workspace_app.domain.currentUser import CurrentUser


async def get_current_user_info(request: Request) -> CurrentUser:
    """从请求头 Authorization: Bearer <token> 中提取并校验用户 ID"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AppException(code=10001, message="请求未携带有效的认证 Token")
    token = auth_header.split(" ")[1]
    try:
        # 解析token
        payload = decode_token(token)
        if not payload:
            raise AppException(code=40102, message="Invalid Token Payload")
        return CurrentUser(**payload)
    except Exception as e:
        raise AppException(code=e.code, message=e.message)
