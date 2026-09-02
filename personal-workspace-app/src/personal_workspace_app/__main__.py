#入口文件

import uvicorn
from fastapi import FastAPI
from personal_workspace_app.api.router import api_v1_router
from personal_workspace_app.core.config import settings

def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME)
    app.include_router(api_v1_router,prefix=settings.API_V1_STR)
    return app

app = create_app()

if __name__ == "__main__":
    # 支持通过 python -m web_app 或 poetry run python -m web_app 运行
    uvicorn.run(app, host="0.0.0.0", port=8000)

