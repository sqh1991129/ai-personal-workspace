# 使用openAi SDK调用大模型

import os
from typing import List, Optional
# Pydantic 对象提取
from pydantic import BaseModel, Field
# openAi SDK
from openai import OpenAI


# ----------------
# 定义期望提取的数据结构（使用Pydantic）
# ----------------
class Skill(BaseModel):
    name: str = Field(description="技能名称")
    years_of_experience: Optional[int] = Field(None, description="握该技能的年限，未知则为 None")


class CandidateProfile(BaseModel):
    """候选人简历信息"""
    full_name: str = Field(description="候选人的真实姓名")
    email: Optional[str] = Field(None, description="电子邮箱地址")
    years_of_total_experience: int = Field(description="总工作年限")
    skills: List[Skill] = Field(default_factory=list, description="掌握的核心技能列表")


# ----------------
# 初始化大模型API
# ----------------
client = OpenAI(
   # api_key="sk-sp-H.DRHPII.oYQn.MEYCIQDW4BdeKgJQFQBTtFfkyT2LOjXL8z5l5V_5rJv5BODmNwIhANMlONzyZ3vDz1QluojcaWf9fCnuBiwJ88AAuXr-Nnt8",
   # base_url="https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1"
    api_key="sk-68d93923bfd74741b74fb122dd68c674",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
)


# ------------------------------------------------------------------
# 第三步：调用大模型并使用 Structured Outputs 原生解析
# ------------------------------------------------------------------
def extract_candidate_info(text: str) -> CandidateProfile:
    """直接调用官方 SDK 的 beta.chat.completions.parse 方法"""
    response = client.beta.chat.completions.parse(
        # 千问
        model="qwen3.7-max-2026-06-08",
        messages=[
            {
                "role": "system",
                "content": "你是一个专业的数据提取助手。请严格按照要求提取 JSON 数据。\n"
                           "注意必须包含以下字段：\n"
                           "- full_name: 姓名\n"
                           "- email: 邮箱\n"
                           "- years_of_total_experience: 总工作年限(整数)\n"
                           "- skills: 技能列表，格式必须为 [{'name': '技能名', 'years_of_experience': 年限或null}]"
            },
            {
                "role": "user",
                "content": f"请从以下文本中提取信息：\n\n{text}"
            }
        ],
        # 核心设置：直接指定 response_format 为你的 Pydantic 类
        response_format=CandidateProfile,
        temperature=0
    )

    # 官方 SDK 会自动解析并返回实例化好的 Pydantic 对象
    return response.choices[0].message.parsed


# 运行测试
if __name__ == '__main__':
    simp_text = """
    你好，我是张伟，应聘高级 Python 开发工程师岗位。
    我拥有 5 年的后端开发经验，我的联系邮箱是 zhangwei_dev@example.com。
    在过去的项目中，我使用 Python 大约有 5 年时间，同时熟练使用 PostgreSQL 数据库约 3 年，
    另外我也熟悉 Docker 容器化部署。
    """
    print("正在提取数据.....\n\n")
    result = extract_candidate_info(simp_text)
    # 1. 直接像使用普通 Python 对象一样访问属性
    print("=== 提取结果 (Python 对象) ===")
    print(f"姓名: {result.full_name}")
    print(f"邮箱: {result.email}")
    print(f"总经验: {result.years_of_total_experience} 年")
    print("技能列表:")
    for skill in result.skills:
        exp = (
            f"{skill.years_of_experience} 年"
            if skill.years_of_experience
            else "未提及"
        )
        print(f"  - {skill.name}: {exp}")
    # 2. 导出为 JSON
    print("\n=== 导出为 JSON ===")
    print(result.model_dump_json(indent=2, ensure_ascii=False))
