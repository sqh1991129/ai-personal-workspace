# 统一的响应报文
from pydantic import BaseModel, Field
import time
import uuid
from typing import Optional, List, TypeVar, Generic

T = TypeVar('T')


# 基础报文
class BaseResponse(BaseModel, Generic[T]):
    code: int = Field(200, description="业务状态码，200 表示成功")
    message: str = Field("success", description="业务提示信息")
    data: Optional[T] = Field(None, description="响应数据载体")
    trace_id: str = Field(default_factory=lambda: str(uuid.uuid4().hex), description="全链路追踪 ID（方便排查报错日志）")
    timestamp: int = Field(default_factory=lambda: int(time.time()), description="系统毫秒级/秒级时间戳")

    # 快捷工厂：成功响应
    @classmethod
    def success(cls, data: Optional[T] = None, message: str = "success") -> "BaseResponse[T]":
        return cls(code=200, message=message, data=data)

    @classmethod
    def failure(cls, code: int = 400, message: str = "failure", data: Optional[T] = None) -> "BaseResponse[T]":
        return cls(code=code, message=message, data=data)
