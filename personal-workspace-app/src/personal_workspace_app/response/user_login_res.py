# 用户登录响应
from pydantic import BaseModel, Field


class UserLoginRes(BaseModel):
    userId: int = Field(description="用户名")
    token: str = Field(description="登录token")
