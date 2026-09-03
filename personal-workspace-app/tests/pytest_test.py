import pytest
from sqlalchemy import text
# 从你的模块导入已创建好的 engine 和 AsyncSessionLocal
from personal_workspace_app.infrastructure.db.session import engine, AsyncSessionLocal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from personal_workspace_app.core.config import settings

# 标记此模块内的函数为异步测试
pytestmark = pytest.mark.asyncio


async def test_engine_connection():
    """测试 Engine 连通性"""
    # 局部创建 Engine，完全绑定在当前测试用例独立的 Event Loop 中
    test_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    try:
        async with test_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1;"))
            assert result.scalar() == 1
    finally:
        # 在当前 Event Loop 关闭前显式 await 清理 asyncpg 连接池
        await test_engine.dispose()


async def test_session_connection():
    """测试 Session 工厂连通性"""
    test_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    TestAsyncSessionLocal = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    try:
        # 注意：使用 TestAsyncSessionLocal() 实例化 Session
        async with TestAsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1;"))
            assert result.scalar() == 1
    finally:
        await test_engine.dispose()
