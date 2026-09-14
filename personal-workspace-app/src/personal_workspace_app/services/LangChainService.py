# LangChain 调用大模型

from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


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


# 初始化大模型与绑定结构化输出
# 提示：可替换为任意支持 Function Calling 的模型 (如 DeepSeek, OpenAI, 通义千问等)
llm = ChatOpenAI(
    api_key="sk-sp-H.DRHPII.oYQn.MEYCIQDW4BdeKgJQFQBTtFfkyT2LOjXL8z5l5V_5rJv5BODmNwIhANMlONzyZ3vDz1QluojcaWf9fCnuBiwJ88AAuXr-Nnt8",
    base_url="https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    model="qwen3.6-flash",  # 或 "deepseek-chat"
    temperature=0,  # 提取数据时建议温度设为 0 以保证稳定性
)

# 使用 with_structured_output 绑定 Pydantic 模型
structured_llm = llm.with_structured_output(CandidateProfile)

# ------------------------------------------------------------------
# 第三步：创建 Prompt 模板并构建 LCEL 处理链
# ------------------------------------------------------------------
prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是一个专业的数据提取助手。请严格从用户提供的文本中提取候选人信息，不要编造未提及的内容。请严格按照要求提取 JSON 数据\n"
            "注意必须包含以下字段：\n"
            "{{ full_name: 姓名\n"
            "- email: 邮箱\n"
            "- years_of_total_experience: 总工作年限(整数)\n"
            "- skills: 技能列表，格式必须为 [{{'name': '技能名', 'years_of_experience': 年限或null}}] }}"
            ,
        ),
        ("human", "请从以下文本中提取信息：\n\n{text}"),
    ]
)

# 使用管道符 '|' 组合链：Prompt -> Model
chain = prompt | structured_llm

# ------------------------------------------------------------------
# 第四步：测试运行
# ------------------------------------------------------------------
if __name__ == "__main__":
    # 输入一段非结构化的文本
    sample_text = """
    你好，我是张伟，应聘高级 Python 开发工程师岗位。
    我拥有 5 年的后端开发经验，我的联系邮箱是 zhangwei_dev@example.com。
    在过去的项目中，我使用 Python 大约有 5 年时间，同时熟练使用 PostgreSQL 数据库约 3 年，
    另外我也熟悉 Docker 容器化部署。
    """

    print("正在提取数据，请稍候...\n")
    # 运行处理链
    result: CandidateProfile = chain.invoke({"text": sample_text})

    # 输出结果（可以直接作为 Pydantic 对象使用，也可以导出为 JSON/Dict）
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

    print("\n=== 导出为标准的 JSON ===")
    print(result.model_dump_json(indent=2, ensure_ascii=False))
