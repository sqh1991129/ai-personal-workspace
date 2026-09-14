# 知识库搭建 查询质量测试

import asyncio
import json
from typing import Dict, List, Any
from openai import AsyncOpenAI
from openai.types.shared import response_format_text
from pydantic import BaseModel, Field
from pygments.lexers import templates

from base_study import msg
from personal_workspace_app.core.model_manager import get_chat_model

from loguru import logger
# 初始化 AsyncOpenAI 客户端
client = AsyncOpenAI(
    api_key="sk-68d93923bfd74741b74fb122dd68c674",
    base_url="https://ws-keazas2jpkiugg8q.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",

)

# 1、定义结构化数据
class SentenceAnalysis(BaseModel):
    sentence: str = Field(description="从 Chunk 中拆分出的单句话或陈述")
    is_relevant: bool = Field(description="该句是否包含回答用户提问所需的信息或关键上下文")
    reason: str = Field(description="判断该句相关或不相关的简要原因")

class ChunkRelevanceAssessment(BaseModel):
    sentences_analysis: List[SentenceAnalysis] = Field(description="对 Chunk 中所有句子的逐句分析列表")
    total_sentences: int = Field(description="句子总数")
    relevant_sentences: int = Field(description="相关句子数")
    relevance_score: float = Field(description="相关性得分 = relevant_sentences / total_sentences")

# class RetrievalBenchmarkReport(BaseModel):
#     query:str = Field(description="测试的原始 Query")
#     top_k_retrieved:int = Field(description="检索召回的 Chunk 总数")
#     overall_context_relevance:float = Field(description="Top-K 整体上下文平均相关度得分")
#     noise_ratio:float = Field(description="噪音语句在所有召回内容中的占比 (1.0 - relevance)")
#     chunk_results:List[ChunkEvaluationResult] = Field(description="每个 Chunk 的详细评估结果")

# 2. 系统 Prompt 设计
SYSTEM_PROMPT = """你是一名严谨的 RAG (检索增强生成) 系统数据质量评估专家。
你的任务是评估【检索出来的文档片段 (Retrieved Chunk)】对于回答【用户提问 (Query)】的相关性。

评估准则：
1. 将输入的 Chunk 内容逐句拆解为独立的原子陈述句 (Statements)。
2. 逐句分析：
   - 若该句直接回答了 Query，或者为回答 Query 提供了直接相关的背景上下文，标记 is_relevant = true。
   - 若该句是无意义的过渡句、其他无关主题的描写、页眉页脚或无关代码，标记 is_relevant = false。
3. 计算公式：
   - relevance_score = relevant_sentences / total_sentences。
4. 保持绝对客观，不强制假设未提及的事实。输出必须严格符合 JSON 架构。
"""
# 3. 核心单 Chunk 评估函数
async def evaluate_single_chunk(
        query: str,
        chunk_text: str
) -> ChunkRelevanceAssessment:
    """对单个 Chunk 进行 LLM 逐句拆解与相关性评分"""
    user_prompt = f"""【用户提问 (Query)】:
    {query}

    【文档片段 (Chunk #{chunk_text})】:
    {chunk_text}
    """
    try:
        # 调用模型
        # 保证 100% 格式解析安全，零 Parse Error
        result = await client.beta.chat.completions.parse(
            model="qwen3.7-flash",
            messages=[
                {"role":"system","content": SYSTEM_PROMPT},
                {"role":"user","content": user_prompt}
            ],
            response_format=ChunkRelevanceAssessment,
            # 评估必须保持确定性
            temperature=0.0
        )
        print(result)
        return result.choices[0].message.parsed

    except Exception as e:
          print(f"评估过程中发生错误: {e}")
          return ChunkRelevanceAssessment(
            sentences_analysis=[],
            total_sentences=0,
            relevant_sentences=0,
            relevance_score=0.0
        )


# 4. 批量评测 Runner (并发执行) 评估某一 Query 召回的 Top-K 结果
async def evaluate_retrieved_chunks(
        query: str,
retrieved_chunks: List[str],
)-> float:
    """并发评估某次查询检索出的所有 Top-K Chunks，并汇总报告
    使用 asyncio.gather 并发评估某个 Query 召回的所有 Top-K Chunks
    """
    #logger.info(f"开始评估 Query: '{query}', 共召回 {len(retrieved_chunks)} 个 Chunks...")
    print(f"\n================ 正在评估 Query: '{query}' ================")
    # 调用模型
    # 并发请求 LLM 评估
    tasks = [evaluate_single_chunk(query, chunk) for chunk in retrieved_chunks]
    results: List[ChunkRelevanceAssessment] = await asyncio.gather(*tasks)
    total_score = 0.0
    for idx, (chunk, res) in enumerate(zip(retrieved_chunks, results)):
        print(
            f"\n--- [Chunk #{idx + 1}] 得分: {res.relevance_score:.2f} ({res.relevant_sentences}/{res.total_sentences} 句相关) ---")
        print(f"内容预览: {chunk[:80]}...")
        print("详细句子分析:")
        for sa in res.sentences_analysis:
            status = "✅ 相关" if sa.is_relevant else "❌ 噪音"
            print(f"  - [{status}] {sa.sentence} (原因: {sa.reason})")

        total_score += res.relevance_score

    avg_score = total_score / len(retrieved_chunks) if retrieved_chunks else 0.0
    print(f"\n>>>> 整体平均 Context Relevance 得分: {avg_score:.2f} <<<<\n")
    return avg_score


# 测试运行示例
async def testKb():
    query = "A rare and unprecedented earthquake erupted"

    # 模拟 pgvector 向量检索召回的 2 个 Chunk
    retrieved_chunks = [
        # Chunk 1: 完全匹配
        "A rare and unprecedented earthquake erupted on the Gobi Desert. The result of the earthquake was the appearance of the world's largest and deepest crack.\nHalf a year later, an exploration team composed of multiple countries ventured into the depths of the fissure.",

        # Chunk 2: 误召回的无关 Chunk
        "At the moment when the earth fire broke out, Xu Ziyan was pushed into a cave by someone unknown. Inside that cave was a steep landslide, and Xu Ziyan rolled and slid down all the way. It was unknown how long she had been sliding down, and by the end she had lost consciousness."
    ]
    # 执行评估
    await evaluate_retrieved_chunks(query, retrieved_chunks)
    # 格式化输出 JSON 报告
   # print("\n" + "=" * 20 + " RAG 检索评估最终报告 " + "=" * 20)

if __name__ == '__main__':
     asyncio.run(testKb())



