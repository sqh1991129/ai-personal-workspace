# PostgreSQL
* 在 Poetry 环境下安装所需的驱动和 ORM 库：
```shell
# 1. 异步驱动与 ORM（推荐使用 asyncpg 实现高并发异步）
poetry add "sqlalchemy[asyncio]" asyncpg

# 2. 安装数据库迁移工具 Alembic
poetry add alembic

# 3. (可选) 如果需要向量数据库支持，安装 pgvector  
poetry add pgvector
```
