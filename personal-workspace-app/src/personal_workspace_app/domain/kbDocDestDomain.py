# 知识库表
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, Computed,Integer,DateTime,Index
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import TSVECTOR,JSONB


class Base(DeclarativeBase):
     pass

class KnowledgeInfo(Base):
    __tablename__ = "kb_doc_test"
    id : Mapped[str] = mapped_column(String(64) ,primary_key=True)
    kb_id: Mapped[str] = mapped_column(String(64),index=True ,nullable=False)
    doc_id: Mapped[str] = mapped_column(String(64),index=True,nullable=False)
    text_content: Mapped[str] = mapped_column(Text(),nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1024),nullable=False)
    meta_data: Mapped[dict] = mapped_column("metadata",JSONB,default={})
    # 映射 PostgreSQL 的 GENERATED ALWAYS AS ... STORED
    fts_tokens: Mapped[str] = mapped_column(TSVECTOR,Computed("to_tsvector('simple', text_content)",persisted=True))
    chunk_index:Mapped[int] = mapped_column(Integer,default=0)
    create_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))

    # 创建核心索引 HNSW 向量相似度索引
    # __table_args__ = (
    #     Index('idx_kb_chunks_embedding', embedding,postgresql_using="hnsw",postgresql_ops={"embedding": "vector_cosine_ops"}),
    #     Index
    # )



