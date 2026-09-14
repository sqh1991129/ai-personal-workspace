# 知识库路由
from typing import Annotated
from fastapi import Form, File, UploadFile, status,HTTPException, Depends
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from personal_workspace_app.core.exceptions import  AppException
from personal_workspace_app.core.error_codes import ErrorCodes
from personal_workspace_app.services.kb.KbService import saveKb, search_context
from personal_workspace_app.infrastructure.db.session import get_db

from starlette.responses import FileResponse
async def kb_upload_endpoint(
        kb_id: Annotated[str,Form(description="Knowledge Base ID")],
        doc_id: Annotated[str,Form(description="Document ID")],
        file: Annotated[UploadFile,Form(description="Upload File")],
        db: AsyncSession = Depends(get_db)
           ):
     print("上传文件")
     print(kb_id)
     print(doc_id)
     print(file.filename)
     # 校验文件拓展码
     allowed_file_extensions = [".txt"]
     # 获取文件拓展名
     file_ext = Path(file.filename).suffix.lower()
     print(file_ext)
     if file_ext not in allowed_file_extensions:
          raise AppException(error_code=ErrorCodes.UPLOAD_FILE_NOT_SUPPORT)
     # 读取文件
     # 2. 读取文件字节流
     content_bytes = await file.read()
     if not content_bytes:
          print("文件内容为空")
     # 解析纯文本
     text_content = content_bytes.decode("utf-8")
     print(text_content)

     # 保存到向量数据库
     saveKb(kb_id=kb_id,doc_id=doc_id,context=text_content,db=db)

async def kb_document_endpoint(kb_id: Annotated[str,Form(description="Knowledge Base ID")],
                               text: Annotated[str,Form(description="查询内容")],db: AsyncSession = Depends(get_db)):
     # 查询内容
     await search_context(kb_id=kb_id, db=db, query=text)



