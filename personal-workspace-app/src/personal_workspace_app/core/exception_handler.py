# 全局异常处理和捕获 编写全局处理器，将拦截到的各种异常转化为统一的 BaseResponse 格式：

import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.responses import JSONResponse

# 引入统一响应
from personal_workspace_app.core.base_response import BaseResponse
from personal_workspace_app.core.exceptions import BusinessException

logger = logging.getLogger(__name__)


def register_exception_handler(app: FastAPI) -> None:
    """注册全局异常处理器"""

    # 1、捕捉自定义异常（BusinessException）
    @app.exception_handler(BusinessException)
    async def custom_exception_handler(request: Request, exc: BusinessException):
        logger.warning(f"【业务异常】Path: {request.url.path} | Code: {exc.code} | Msg: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,  # 业务异常通常仍返回 HTTP 200，靠 JSON code 区分
            content=BaseResponse.fail(code=exc.code, message=exc.message, data=exc.data).model_dump())

    # 2、 捕获请求参数异常(RequestValidationError)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # 格式化 Pydantic 校验错误信息
        errors = exc.errors()
        err_messages = []
        for err in errors:
            loc = " -> ".join([str(x) for x in err.get("loc", []) if x != "body"])
            msg = err.get("msg", "")
            err_messages.append(f"[{loc}]: {msg}" if loc else msg)
        detail_msg = "; ".join(err_messages) or "请求参数格式不正确"
        logger.warning(f"【参数校验异常】Path: {request.url.path} | Detail: {detail_msg}")
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=BaseResponse.fail(code=40000, message=f"参数校验失败: {detail_msg}").model_dump()
        )

    # 捕获标准 HTTP 异常（404, 405 等）
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(f"【HTTP 异常】Path: {request.url.path} | Status: {exc.status_code} | Detail: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=BaseResponse.fail(code=exc.status_code, message=str(exc.detail)).model_dump()
        )

    # 4. 捕获全局未知异常/系统崩溃（兜底逻辑）
    @app.exception_handler(Exception)
    async def exception_handler(request: Request, exc: Exception):
        # 记录完整的异常堆栈信息日志，方便线上定位崩溃问题
        logger.error(f"【系统未知异常】Path: {request.url.path} | Error: {str(exc)}", exc_info=True)
        # 对前端隐藏具体的代码报错，防止敏感信息泄露
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=BaseResponse.fail(code=50000, message="系统繁忙，请稍后再试").model_dump()
        )
