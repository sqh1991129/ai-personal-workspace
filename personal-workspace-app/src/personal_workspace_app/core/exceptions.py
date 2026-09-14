# 异常类定义
from typing import Optional, Any
from personal_workspace_app.core.error_codes import ErrorCodes


class BusinessException(Exception):
    """企业级自定义业务异常基类"""

    def __init__(self, code: int = 400, message: str = "业务处理失败", data: Optional[Any] = None):
        self.code = code
        self.message = message
        self.data = data


# 可根据需要派生具体的子类（方便业务代码直接 raise）
class AppException(BusinessException):
    def __init__(self, error_code: ErrorCodes):
        super().__init__(error_code.code, error_code.message)


# 可根据需要派生具体的子类（方便业务代码直接 raise）
class VerificationException(BusinessException):
    def __init__(self, error_code: ErrorCodes):
        super().__init__(code=4001, message=error_code.message)
