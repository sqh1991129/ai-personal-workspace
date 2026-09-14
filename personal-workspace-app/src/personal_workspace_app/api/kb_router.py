# 配置API路由
from fastapi import APIRouter, status
from personal_workspace_app.api.endpoints.kb_endpoints import kb_upload_endpoint, kb_document_endpoint

api_v1_kb_router = APIRouter(prefix="/kb", tags=["kb"])
api_v1_kb_router.add_api_route(
    "/upload",
    endpoint=kb_upload_endpoint,
    methods=["POST"],
    status_code=status.HTTP_200_OK,
    summary="知识库上传文件",
)

api_v1_kb_router.add_api_route(
    "/search",
    endpoint=kb_document_endpoint,
    methods=["POST"],
    status_code=status.HTTP_200_OK,
    summary="搜索知识库",
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
