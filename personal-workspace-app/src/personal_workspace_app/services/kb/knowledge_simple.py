# 简单的单一知识库
from langchain_postgres import  PGVector
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from personal_workspace_app.core.model_manager import get_chat_model

connection = "postgresql+psycopg://postgres:123456@localhost:5432/postgres"
embeddings = OpenAIEmbeddings(model="qwen3.7-text-embedding",
                              api_key="sk-68d93923bfd74741b74fb122dd68c674",
                              base_url="https://ws-keazas2jpkiugg8q.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
                              check_embedding_ctx_length=False
                              )
# 1. 初始化 VectorStore（快速自动建表或映射）
vector_store = PGVector(
    embeddings=embeddings,
    connection=connection,
    collection_name="kb_document_chunks",
    use_jsonb=True,
)
# 2. 写入测试数据（将 kb_id 等字段直接存进 metadata）
docs = [
    Document(
        page_content="华为手机搭载自研芯片，系统运行流畅。",
        metadata={"kb_id": "tech_kb", "doc_id": "doc_001.pdf"}
    )
]
vector_store.add_documents(docs)
# 3. 快速构造带 kb_id 过滤的检索器
retriever = vector_store.as_retriever(
    search_kwargs={
        "k": 3,
        "filter": {"kb_id": "tech_kb"}  # 自动转为 JSONB 精确过滤
    }
)
# 4. 组装 RAG 链进行效果验证
prompt = ChatPromptTemplate.from_template("基于以下内容回答：\n{context}\n\n问题：{question}")
chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | get_chat_model("qwen")
    | StrOutputParser()
)

if __name__ == '__main__':
    print(chain.invoke("华为手机怎么样？"))
