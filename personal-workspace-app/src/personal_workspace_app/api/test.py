from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.infrastructure.database.session import get_db
from app.domain.models.user import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(
        username: str,
        email: str,
        db: AsyncSession = Depends(get_db)
):
    # 查重
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 创建用户
    new_user = User(username=username, email=email)
    db.add(new_user)
    # get_db 依赖会在响应结束时自动处理 commit
    return {"message": "User created successfully", "username": username}


@router.get("/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"id": user.id, "username": user.username, "email": user.email}