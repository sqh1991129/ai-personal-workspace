# 使用 Python 3.7+ 原生的 contextvars 保存当前请求的 trace_id，保证多协程并发下的隔离性
from contextvars import ContextVar

# 定义全局的trace_id变量，默认值为“-”
CTX_TRACE_ID: ContextVar[str] = ContextVar("trace_id", default='-')


def get_trace_id() -> str:
    return CTX_TRACE_ID.get()


def set_trace_id(trace_id: str) -> None:
    CTX_TRACE_ID.set(trace_id)
