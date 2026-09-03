# 用户登录请求
#from personal_workspace_app.core.base_request import BaseRequest, Field
from pydantic import BaseModel, Field


class UserLoginReq(BaseModel):
    userId: str = Field(description="用户名")
    password: str = Field(description="密码")

    # def __init__(self, userId, password):
    #     self.userId = userId
    #     self.password = password
