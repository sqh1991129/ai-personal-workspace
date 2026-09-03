# conftest.py
import asyncio
import pytest
import pytest_asyncio
from personal_workspace_app.infrastructure.db.session import engine


# 1. 重写 event_loop，指定作用域为 session
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    # 在最后所有测试完成后再统一 close
    loop.close()


# 2. 在测试 Session 结束时统一 dispose 全局引擎，防止 asyncpg 未等待警告
@pytest_asyncio.fixture(scope="session", autouse=True)
async def dispose_global_engine(event_loop):
    yield
    await engine.dispose()