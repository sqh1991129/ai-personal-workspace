# 配置API路由
from fastapi import APIRouter, status
from personal_workspace_app.api.endpoints.chat_endpoints import simpleChatEndpoint, SimpleChatResponse, chatStreamEndpoint, StreamingResponse

api_v1_chat_router = APIRouter(prefix="/chat", tags=["chat"])
api_v1_chat_router.add_api_route(
    "/simpleChat",
    endpoint=simpleChatEndpoint,
    methods=["POST"],
    status_code=status.HTTP_200_OK,
    response_model=SimpleChatResponse,
    summary="简单的聊天接口",
)

api_v1_chat_router.add_api_route(
    "/streamChat",
    endpoint=chatStreamEndpoint,
    methods=["POST"],
    status_code=status.HTTP_200_OK,
    response_model=SimpleChatResponse,
    summary="流式输出聊天接口",
)


# @api_v1_chat_router.post("/simpleChat", response_model=BaseResponse[UserLoginRes], status_code=status.HTTP_200_OK,
#                          tags=["chat"])
# async def user_login(req: UserLoginReq, db: AsyncSession = Depends(get_db)):
#     userService = UserService(db)
#     res = await userService.user_login(req)
#     return BaseResponse.success(data=res)
#
#
# async def user_info(req: UserLoginReq, db: AsyncSession = Depends(get_db),
#                     current_user: CurrentUser = Depends(decode_token)):
#     pass
