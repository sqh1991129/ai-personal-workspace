# 定义数据模型 ORM Model
# 使用 SQLAlchemy 2.0 推荐的 Mapped 和 mapped_column 泛型语法：
from datetime import datetime
from sqlalchemy import String,  DateTime,func
from sqlalchemy.orm import Mapped,mapped_column

from personal_workspace_app.infrastructure import db


class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True,auto_increment=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

