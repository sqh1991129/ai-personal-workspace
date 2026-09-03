# 统一的请求报文
from typing import Optional, Literal
from pydantic import BaseModel, Field


# 基础报文
class BaseRequest(BaseModel):
    pass
