from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from personal_workspace_app.domain.user import User
from personal_workspace_app.request.user_login_req import UserLoginReq
from personal_workspace_app.response.user_login_res import UserLoginRes


# 用户服务
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def user_login(self, req: UserLoginReq):
        # 1 查询用户名密码
        stmt = select(User).where(User.email == req.userId)
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            print(f"用户已存在")

        return UserLoginRes(userId=req.userId)


