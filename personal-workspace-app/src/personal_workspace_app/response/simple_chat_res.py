# 简单的对话请求参数
from pydantic import BaseModel, Field


class SimpleChatResponse(BaseModel):
    resText: str = Field(default=None, description="响应内容")

    # def __init__(self, text: str):
    #     self.resText = text
