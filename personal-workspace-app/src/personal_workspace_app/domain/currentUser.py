# 当前登录对象
from pydantic import BaseModel


class CurrentUser(BaseModel):
    user_id: str
    user_name: str
    user_email: str
