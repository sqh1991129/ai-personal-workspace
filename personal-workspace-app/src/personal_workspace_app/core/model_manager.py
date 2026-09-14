# 统一管理m大模型
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel


def get_chat_model(model_name: str) -> BaseChatModel:

    if model_name.startswith("qwen"):
        return ChatOpenAI(model="qwen3.7-flash",
                         # api_key="sk-sp-H.DRHPII.oYQn.MEYCIQDW4BdeKgJQFQBTtFfkyT2LOjXL8z5l5V_5rJv5BODmNwIhANMlONzyZ3vDz1QluojcaWf9fCnuBiwJ88AAuXr-Nnt8",
                          api_key="sk-68d93923bfd74741b74fb122dd68c674",
                          base_url="https://ws-keazas2jpkiugg8q.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
                          temperature=0,
                          streaming=True)
    if model_name.startswith("gemini"):
        return ChatOpenAI(
            model="gemini-3.6-flash",
            api_key="AQ.Ab8RN6JB9sUrd_PYPZcK3trc_bWbjIX-4qtAqMc4h5BellpJNQ",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=0,
            streaming=True,
            # 强制 Gemini 的 OpenAI 兼容接口返回 JSON 格式
            model_kwargs={"response_format": {"type": "json_object"}}
        )
    return None

