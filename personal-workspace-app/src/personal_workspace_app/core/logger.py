# 创建统一的日志初始化模块，接管 Python 标准库 logging 并配置控制台/文件日志输出：

import sys
import logging
from pathlib import Path
from loguru import logger
from personal_workspace_app.core.context import get_trace_id

# 日志输出目录
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True, parents=True)


class InterceptHandler(logging.Handler):
    """接管标准 logging 模块（如 uvicorn, sqlalchemy）的日志输出到 Loguru"""

    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        frame, depth = logging.currentframe, 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        logger.opt(depth=depth, exception=record.exc_info).log()


def trace_id_patcher(record):
    """Loguru 补丁：将 contextvars 中的 trace_id 注入到每条日志记录中"""
    record["extra"]["trace_id"] = get_trace_id()


def setup_logger(log_level: str = "INFO"):
    """初始化企业级日志配置"""
    # 移除默认的 handler
    logger.remove()
    # 标准控制台与文件日志输出格式（包含 trace_id）
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>[{extra[trace_id]}]</cyan> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    # 1. 控制台输出 (Stdout)
    logger.add(
        sys.stdout,
        level=log_level,
        format=log_format,
        enqueue=True,  # 开启异步队列，提升高并发性能
    )
    # 2. 存量文件输出：全量运行日志 (info.log)
    logger.add(
        LOG_DIR / "app_info.log",
        level=log_level,
        format=log_format,
        rotation="500 MB",  # 日志切割：单个文件超过 500M 自动切割
        retention="30 days",  # 保留策略：保存最近 30 天
        compression="zip",  # 压缩历史日志
        enqueue=True,  # 异步写入
        encoding="utf-8"
    )
    # 3. 错误级别文件输出：仅存 error/critical (error.log)
    logger.add(
        LOG_DIR / "app_error.log",
        level="ERROR",
        format=log_format,
        rotation="100 MB",
        retention="60 days",
        compression="zip",
        enqueue=True,
        encoding="utf-8",
        backtrace=True,  # 展开详细报错堆栈
        diagnose=True
    )
    # 给 loguru 挂载 trace_id 过滤器
    logger.configure(patcher=trace_id_patcher)
    # 接管 standard logging (包括 uvicorn, fastapi)
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    for _log in ["uvicorn", "uvicorn.access", "sqlalchemy.engine"]:
        _logger = logging.getLogger(_log)
        _logger.handlers = [InterceptHandler()]

    return logger
