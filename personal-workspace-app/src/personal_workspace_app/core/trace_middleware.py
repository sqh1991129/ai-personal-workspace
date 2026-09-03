# 通过中间件为每一个进入系统的 HTTP 请求自动创建/提取 trace_id，并记录请求耗时：
import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from personal_workspace_app.core.context import set_trace_id
from loguru import logger


class TraceAndLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. 尝试从前端 Request Header 获取 X-Trace-Id，若无则自动生成 UUID
        trace_id = request.headers.get("X-Trace-Id") or uuid.uuid4().hex
        set_trace_id(trace_id)

        start_time = time.time()

        # 记录请求进入日志
        logger.info(f"==> HTTP Start: {request.method} {request.url.path}")

        try:
            response = await call_next(request)

            process_time = (time.time() - start_time) * 1000
            # 记录响应完成日志与耗时
            logger.info(
                f"<== HTTP End: {request.method} {request.url.path} | Status: {response.status_code} | Cost: {process_time:.2f}ms")

            # 将 Trace ID 写入响应头，方便前端跟进
            response.headers["X-Trace-Id"] = trace_id
            return response

        except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"<== HTTP Failed: {request.method} {request.url.path} | Error: {str(exc)} | Cost: {process_time:.2f}ms")
            raise exc