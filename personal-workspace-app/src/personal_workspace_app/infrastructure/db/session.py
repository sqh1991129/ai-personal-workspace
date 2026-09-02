# 初始化PostgreSQL 数据库
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from personal_workspace_app.core.config import settings

# 创建异步engine
engine = create_async_engine(settings.DATABASE_URL,
                             pool_pre_ping=True,  # 自动检查连接有效性，防止连接中断
                             echo=True,  # 开发环境下打印 SQL 日志，生产环境建议设为 False
                             pool_size=20,  # 连接池大小
                             max_overflow=20
                             )

# 创建异步 Session 工厂
AsyncSessionLocal = async_sessionmaker(bind=engine,
                                       class_=AsyncSession,
                                       expire_on_commit=False,  # 避免提交后属性过期无法读取
                                       autocommit=False,
                                       autoflush=False,
                                       )


# 声明声明性基类 (ORM Model 父类)
class Base(DeclarativeBase):
    pass

# FastAPI 依赖注入项：获取数据库 Session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

