#配置API路由
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from personal_workspace_app.infrastructure.db.session import get_db
from personal_workspace_app.request.user_login_req import UserLoginReq
from personal_workspace_app.response.user_login_res import UserLoginRes
from personal_workspace_app.core.base_response import BaseResponse

from personal_workspace_app.services.userService import UserService
from personal_workspace_app.domain.currentUser import CurrentUser
from personal_workspace_app.core.JWT import decode_token

api_v1_user_router = APIRouter(prefix="/users", tags=["users"])


@api_v1_user_router.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "message": "Service is running healthy"}


@api_v1_user_router.post("/userLogin", response_model=BaseResponse[UserLoginRes], status_code=status.HTTP_200_OK,
                         tags=["users"])
async def user_login(req: UserLoginReq, db: AsyncSession = Depends(get_db)):
    userService = UserService(db)
    res = await userService.user_login(req)
    return BaseResponse.success(data=res)


async def user_info(req: UserLoginReq, db: AsyncSession = Depends(get_db),
                    current_user: CurrentUser = Depends(decode_token)):
    pass
