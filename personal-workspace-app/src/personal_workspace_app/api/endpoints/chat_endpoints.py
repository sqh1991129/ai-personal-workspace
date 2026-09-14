# 会话端点
from personal_workspace_app.request.simple_chat_req import SimpleChatRequest
from personal_workspace_app.response.simple_chat_res import SimpleChatResponse
from personal_workspace_app.services.ChatService import ChatService
from personal_workspace_app.domain.currentUser import CurrentUser
from fastapi import Depends
from fastapi.responses import StreamingResponse
from personal_workspace_app.core.CheckouToken import get_current_user_info
from personal_workspace_app.services.ChatStreamService import chat_stream


async def simpleChatEndpoint(request: SimpleChatRequest,
                             current_user: CurrentUser = Depends(get_current_user_info)) -> SimpleChatResponse:
    print(f"{current_user.user_id}")
    return await ChatService().simpleChat(req=request)


async def chatStreamEndpoint(request: SimpleChatRequest):
   # print(f"{current_user.user_id}")
    return StreamingResponse(chat_stream(request), media_type="text/event-stream")
