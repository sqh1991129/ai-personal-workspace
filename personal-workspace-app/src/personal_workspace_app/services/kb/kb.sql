--确认安装了向量拓展
CREATE EXTENSION IF NOT EXISTS vector;
--创建自定义向量存储表
CREATE TABLE if not EXISTS kb_doc_test(
--主键
 id VARCHAR(64) PRIMARY KEY,
 --知识库 ID / 业务分组 ID (如: "hr_docs", "tech_kb")
 kb_id VARCHAR(64) not NULL,
 -- 原始文档 ID / 文件名，用于定位和按文档批量删除
 doc_id VARCHAR(64) not null,
 -- 切片文本原文
 text_content TEXT not null,
 -- 向量数据 (以 Qwen3.7 推荐的 1024 维为例)
 embedding vector(1024) not null,
 -- 扩展元数据与全文检索支持
 -- 扩展信息 (如页码 page, 作者 author, 权限级别 mask)
 metadata JSONB DEFAULT '{}'::jsonb,
 fts_tokens tsvector GENERATED ALWAYS AS ( --自动生成的全文检索向量，用于 Hybrid Search
 to_tsvector('simple', text_content) -- 使用中文分词 (若无 zhparser 扩展，可用 'simple')，数据库没有按照zhparser插件
  ) STORED,
 --审计字段
 chunk_index INT DEFAULT 0, -- 切片在原文档中的顺序序号 (0, 1, 2...)
 create_at TIMESTAMP WITH TIME ZONE  DEFAULT CURRENT_TIMESTAMP
);
-- ==================== 性能优化索引配置 ====================
--1、核心索引 HNSW 向量相似度索引 (使用 Cosine 余弦距离)
---- m=16, ef_construction=64 是平衡构建速度与检索召回率的经典参数
create index idx_kb_chunks_embedding on kb_doc_test USING hnsw(embedding vector_cosine_ops) WITH(m=16,ef_construction = 64);
-- 2. 业务联合索引：用于高频的按知识库隔离 + 业务过滤 (如按分类/文档组)
CREATE INDEX idx_kb_chunks_kb_doc ON kb_doc_test (kb_id, doc_id);
-- 3. JSONB 元数据索引：用于根据 metadata 中的字段快速过滤 (GIN 索引)
CREATE INDEX idx_kb_chunks_metadata ON kb_doc_test USING gin (metadata);
-- 4. 全文检索索引：用于关键词精确实体检索 (BM25 替代方案)
CREATE INDEX idx_kb_chunks_fts ON kb_doc_test USING gin (fts_tokens);



