#入口文件

import uvicorn
from fastapi import FastAPI
from personal_workspace_app.api.router import api_v1_user_router
from personal_workspace_app.core.config import settings
from personal_workspace_app.core.exception_handler import register_exception_handler
from personal_workspace_app.core.trace_middleware import TraceAndLogMiddleware
from loguru import logger
from personal_workspace_app.core.logger import setup_logger



def create_app() -> FastAPI:
    # 1、初始化日志中心
    setup_logger(log_level="INFO")
    app = FastAPI(title=settings.PROJECT_NAME)
    app.include_router(api_v1_user_router, prefix=settings.API_V1_STR)
    # 注册统一异常处理器
    register_exception_handler(app)
    # 注册日志组件
    app.add_middleware(TraceAndLogMiddleware)
    logger.info("系统初始化完成，服务启动中...")
    return app


app = create_app()

if __name__ == "__main__":
    # 支持通过 python -m web_app 或 poetry run python -m web_app 运行
    uvicorn.run(app, host="0.0.0.0", port=8000)
