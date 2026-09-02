# 配置基础
# 这段代码是使用 Pydantic Settings 模块从外部环境（如 .env 环境配置文件、系统环境变量、命令行参数）中自动化读取、
# 校验并注入全局配置的标准导入语句。
#BaseSettings（配置基类）
# 作用：这是一个专门用于管理配置的抽象父类。
# 特点：
# 当你定义一个继承自 BaseSettings 的类时，Pydantic 会自动去读取系统环境变量或 .env 文件。
# 它具备强类型校验与自动类型转换功能。比如系统环境变量读出来的都是纯字符串 "8000"，BaseSettings 会根据你定义的类型标注自动将其转为整型 8000；如果是 "true"/"1"，会自动转为布尔值 True。
#SettingsConfigDict（配置控制字典）
#作用：用于定义配置类本身的行为元数据（Meta Configuration）。
#特点：通过它你可以告诉 Pydantic：去哪里找 .env 文件？环境变量名是否区分大小写？遇到未定义的额外环境变量是忽略还是报错？
# 示例：
# from pydantic_settings import BaseSettings, SettingsConfigDict
#
#
# class Settings(BaseSettings):
#     # 1. 定义配置项及其默认值与类型
#     PROJECT_NAME: str = "My New Service"
#     PORT: int = 8000
#     DEBUG: bool = False
#     DATABASE_URL: str  # 没有默认值，意味着必须从 .env 或系统环境变量中读取，否则启动报错
#
#     # 2. 通过 SettingsConfigDict 传递元数据配置
#     model_config = SettingsConfigDict(
#         env_file=".env",  # 指定自动加载根目录下的 .env 配置文件
#         env_file_encoding="utf-8",  # 指定文件编码
#         case_sensitive=True,  # 环境变量名称区分大小写
#         extra="ignore",  # 如果 .env 中有未在 Settings 里定义的变量，直接忽略不报错
#     )
# 实例化：实例化时会自动触发读取与校验
#settings = Settings()

from pydantic_settings import BaseSettings,SettingsConfigDict
class Settings(BaseSettings):
      PROJECT_NAME: str = "My New Service"
      API_V1_STR: str = "/api/v1"
      DEBUG: bool = True
      model_config = SettingsConfigDict(env_file=".env",env_file_encoding="utf-8", case_sensitive=True)

settings = Settings()
