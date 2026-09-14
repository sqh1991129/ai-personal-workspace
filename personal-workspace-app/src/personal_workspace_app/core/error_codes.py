# 统一管理错误码
from enum import Enum


class ErrorCodes(Enum):
    """全局错误码统一枚举定义
    格式：(错误码, 描述)
    """
    SUCCESS = (000000, "成功", "成功")
    SYSTEM_ERROR = (999999, "系统繁忙", "系统繁忙")
    # 通用模块： 比如大模型异常
    MODEL_RATE_LIMIT = (200001, "模型限流", "模型限流")
    UPLOAD_FILE_NOT_SUPPORT = (200002,"不支持的文件", "不支持的文件格式")
    # 用户模块
    USER_PASSWORD_ERROR = (100001, "用户名或密码错误", "")

    # 聊天模块

    def __init__(self, code: int, message: str, desc: str):
        self.code = code
        self.message = message
        self.desc = desc
