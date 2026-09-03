from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from personal_workspace_app.domain.user import User
from personal_workspace_app.request.user_login_req import UserLoginReq
from personal_workspace_app.response.user_login_res import UserLoginRes
from personal_workspace_app.core.exceptions import AppException
from personal_workspace_app.core.JWT import create_access_token
from personal_workspace_app.domain.currentUser import CurrentUser


# 用户服务
class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def user_login(self, req: UserLoginReq):
        # 1 查询用户名密码
        stmt = select(User).where(User.email == req.userId)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            raise AppException(code=40001, message="用户名或密码错误")
        # 生成token
        currentUser = CurrentUser(user_id=str(user.userId), user_name=user.username, user_email=user.email)
        token = create_access_token(data=currentUser.__dict__)

        return UserLoginRes(userId=user.userId, token=token)
