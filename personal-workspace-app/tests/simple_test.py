# 简单的测试
import unittest

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from personal_workspace_app.core.config import settings


#unittest.IsolatedAsyncioTestCase，专门用来测试异步代码
class TestPostgresConnection(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        """准备测试"""
        None
        #self.session: AsyncSession = AsyncSessionLocal()

    async def test_engine_connection(self):
        """测试 AsyncEngine 基础连接与 SQL 执行能力"""
        # 1. 在当前测试用例独立的 Event Loop 中创建全新的 engine
        test_engine = create_async_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True
        )
        try:

            # 通过 engine 直接获取异步连接并执行简单查询
            async with test_engine.connect() as conn:
                result = await conn.execute(text('select 1'))
                val = result.scalar()
                self.assertEqual(val, 1, "Engine 无法获取预期响应")
        except Exception as e:
            self.fail(f"数据库 Engine 连接失败，请检查 DATABASE_URL 配置！错误信息: {e}")
        finally:
            await test_engine.dispose()

    async def test_async_session_local(self):

        """测试 AsyncSessionLocal 会话工厂能否正常工作"""
        # 1. 在当前测试用例独立的 Event Loop 中创建全新的 engine
        test_engine = create_async_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True
        )
        TestAsyncSessionLocal = async_sessionmaker(
            bind=test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        try:
            async with TestAsyncSessionLocal() as session:
                result = await session.execute(text('select 1'))
                val = result.scalar()
                self.assertEqual(val, 1, "Session 无法执行 SQL")
        except Exception as e:
            self.fail(f"数据库 Session 创建或执行失败！错误信息: {e}")
        finally:
            await test_engine.dispose()

    # async def asyncTearDown(self):
    #     """测试后清理：关闭 Session 并释放连接池"""
    #     if self.session:
    #         await self.session.close()
    #
    # # 在所有测试完成后统一释放 Engine 连接池
    # async def tearDown(self):
    #     await engine.dispose()


if __name__ == '__main__':
    unittest.main()
