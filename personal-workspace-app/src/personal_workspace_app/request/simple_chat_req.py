# 简单的对话请求参数
from pydantic import BaseModel, Field


class SimpleChatRequest(BaseModel):
    text: str = Field(default=None, description="用户消息")
