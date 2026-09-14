# 知识库服务
# RecursiveCharacterTextSplitter 递归字符切分器
from itertools import repeat

from langchain_text_splitters import RecursiveCharacterTextSplitter
from tenacity import wait
from uuid import uuid4
from personal_workspace_app.domain.kbDocDestDomain import KnowledgeInfo
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_openai import OpenAIEmbeddings
from sqlalchemy import select
# 初始化文件分割器
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, #  每个 chunk 的目标字符数 500
    chunk_overlap=50, # 块与块之间的重叠字数（保证上下文连贯）50
    separators=["\n\n", "\n", "。", "！", "？", "；", " ", ""] # 针对中文优先匹配句号/段落
        )
#初始化向量模型
embeddings = OpenAIEmbeddings(model="qwen3.7-text-embedding",
                              api_key="sk-68d93923bfd74741b74fb122dd68c674",
                              base_url="https://ws-keazas2jpkiugg8q.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
                              check_embedding_ctx_length=False,
                              dimensions=1024,
                              )
# 文件数据落库
def saveKb(kb_id:str, doc_id:str, context:str,db:AsyncSession):
    print("保存数据库")
     # 1. 文本切片
    splitter_context= text_splitter.split_text(context)
    print(type(splitter_context))
    print(splitter_context)
    for i in range(0,len(splitter_context),20):
        batch_context = splitter_context[i:i+20]
        # 批量调用向量模型
        emb_res =  embeddings.embed_documents(batch_context)
        embedding = [data for data in emb_res]
        db_records = []
        for idx,(chunk_str,vector) in enumerate(zip(batch_context,embedding)):
            goble_index = i+idx
            # 切词待定
            record = KnowledgeInfo(
                id=str(uuid4()),
                kb_id=kb_id,
                doc_id=doc_id,
                text_content=chunk_str,
                embedding=vector,
                chunk_index=goble_index,
                meta_data={"doc_id": doc_id, "kb_id": kb_id}
            )
            db_records.append(record)
        # 批量添加
        db.add_all(db_records)
        db.commit()


async def search_context(db:AsyncSession, kb_id:str, query:str, top_k:int = 3)-> str:
    # 查询数据向量化
    print(query)
    embedding = embeddings.embed_documents(query)
    print(embedding)
    # 使用 pgvector 的 cosine_distance (<=>) 进行向量相似度排序
    stmt = (select(KnowledgeInfo.text_content).where(KnowledgeInfo.kb_id == kb_id).order_by(KnowledgeInfo.embedding.cosine_distance(embedding[0])).limit(top_k))
    result = await db.execute(stmt)
    contents = result.scalars().all()
    print("contents:",contents)
    # 将查到的上下文片段拼接成文本
    #newResult =  "\n---\n".join(contents)
    #print(newResult)












