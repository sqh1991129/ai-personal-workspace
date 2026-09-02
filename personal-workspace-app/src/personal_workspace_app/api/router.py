#配置API路由
from fastapi import APIRouter
api_v1_router = APIRouter()

@api_v1_router.get("/health",tags=["health"])
async def health_check():
    return {"status": "ok", "message": "Service is running healthy"}
