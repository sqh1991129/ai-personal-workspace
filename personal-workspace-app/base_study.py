# 1. 数字类型 (Numeric)
age = 25          # 整数 (int)
price = 99.9      # 浮点数 (float)

# 2. 字符串 (String)
name = "Alice"
greeting = 'Hello, World!'

# 3. 布尔值 (Boolean)
is_active = True  # 注意：True 和 False 首字母必须大写
is_admin = False

# 4. 空值 (None)
result = None

# 1. 列表 (List) - 有序、可变
fruits = ["apple", "banana", "cherry"]
fruits.append("orange")    # 添加元素
print(fruits[0])          # 输出: apple

# 2. 元组 (Tuple) - 有序、不可变
coordinates = (10, 20)

# 3. 字典 (Dictionary) - 键值对、无序/按插入顺序排列、可变
user = {
    "name": "Tom",
    "age": 18
}
print(user["name"])       # 输出: Tom

# 4. 集合 (Set) - 无序、元素唯一（自动去重）
unique_numbers = {1, 2, 2, 3}  # 实际储存为 {1, 2, 3}
# 条件判断
score = 85

if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")
# 循环
# for 循环遍历列表
for fruit in fruits:
    print(fruit)

# 使用 range() 进行指定次数循环 (0 到 4)
for i in range(5):
    print(i)

# while 循环
count = 0
while count < 3:
    print(f"Count: {count}")
    count += 1
# 函数
#使用 def 关键字来定义函数，通过 return 返回结果。
# 定义函数，支持默认参数
def greet(person_name, message="Hello"):
    return f"{message}, {person_name}!"
# 导入导出模块
# 调用函数
msg = greet("Bob")
print(msg)  # 输出: Hello, Bob!

# 导入内置模块
import math
import json

print(math.sqrt(16))  # 开平方，输出 4.0

# 字符串格式化 (f-string，推荐使用)
user_name = "Charlie"
items_count = 3
print(f"User {user_name} has {items_count} items.")

#面向对象编程 (OOP) 与高级特性
# ## 类与继承：
#
# 使用 class 关键字定义类，理解 __init__ 构造方法与 self 指针。
#
# 多重继承与 MRO（方法解析顺序） 算法（Class.mro()）。
#
# 特殊方法 (Magic Methods / Dunder Methods)：
#
# 运算符重载：__str__, __repr__, __add__, __len__, __eq__ 等。
#
# 上下文管理器：__enter__ 和 __exit__（用于配合 with 语句实现资源安全释放）。
#
# 类方法与静态方法：
#
# @classmethod（传入类对象 cls）与 @staticmethod（无隐式参数）的区别与应用场景。
#
# 属性控制：
#
# 使用 @property 装饰器实现 getter/setter 属性封装与校验。
#
# class Circle:
#     def __init__(self, radius: float):
#         self._radius = radius
#
#     @property
#     def radius(self) -> float:
#         return self._radius
#
#     @radius.setter
#     def radius(self, value: float):
#         if value < 0:
#             raise ValueError("半径不能为负数")
#         self._radius = value
#函数式编程与高级控制流
# 装饰器 (Decorators)：
#
# 理解闭包（Closure）原理。
#
# 编写带参数的装饰器，并使用 functools.wraps 保留被装饰函数的元数据。
#
# 生成器 (Generators) 与迭代器 (Iterators)：
#
# 实现可迭代协议（__iter__ 和 __next__）。
#
# 使用 yield 关键字创建生成器，实现惰性求值（Lazy Evaluation）与大文件/大数据流处理（节省内存）。
#
# 推导式 (Comprehensions)：
#
# 熟练运用列表推导式、字典推导式、集合推导式与生成器表达式。
# 装饰器示例：计算函数执行耗时
# import time
# from functools import wraps
#
# def timeit(func):
#     @wraps(func)
#     def wrapper(*args, **kwargs):
#         start = time.perf_counter()
#         result = func(*args, **kwargs)
#         print(f"{func.__name__} 耗时: {time.perf_counter() - start:.4f}s")
#         return result
#     return wrapper
#并发编程与异步编程 (Concurrency & Async)
# 搞懂 Python 在多任务并发处理时的底层机制是提高系统吞吐量的关键。
#
# GIL（全局解释器锁）：
#
# 理解 CPython 中的 GIL 如何限制 CPU 密集型任务的多线程并行，明确 CPU 密集型（多进程 multiprocessing） 与 I/O 密集型（多线程 threading / 异步 asyncio） 的选型思路。
#
# 异步 I/O (asyncio)：
#
# async / await 语法与事件循环（Event Loop）机制。
#
# 配合 aiohttp、httpx 等异步库实现高并发网络请求与爬虫。
# import asyncio
#
# async def fetch_data(id: int):
#     await asyncio.sleep(1) # 模拟异步 I/O 阻塞
#     return f"Data {id}"
#
# async def main():
#     # 并发执行多个任务
#     results = await asyncio.gather(*(fetch_data(i) for i in range(3)))
#     print(results)
#
# # asyncio.run(main())

#文件操作、类型提示与工程规范
# 文件与路径处理：
#
# 弃用传统 os.path，全面转向现代化的 pathlib.Path 模块。
#
# 结合 with open(...) 与 json / csv 进行安全数据持久化。
#
# 类型提示 (Type Hints)：
#
# 使用 typing 模块（如 List, Dict, Optional, Union, Callable）提升代码可读性与 IDE 补全体验，配合 mypy 进行静态类型检查。
#
# 异常处理最佳实践：
#
# 自定义异常类（继承基础 Exception），遵循 try-except-else-finally 的完整异常捕获流。
# from pathlib import Path
# from typing import Optional
#
# def read_config(path_str: str) -> Optional[dict]:
#     file_path = Path(path_str)
#     if not file_path.exists():
#         return None
#     # 自动安全关闭文件
#     with file_path.open("r", encoding="utf-8") as f:
#         import json
#         return json.load(f)

#包管理与工程化生态
# 项目规整与依赖隔离是实现项目落地的必备技能：
#
# 虚拟环境管理：venv、conda 或现代包管理工具 poetry / uv 的使用。
#
# 包管理与发布：了解 pyproject.toml 规范，学习如何将自己的代码打包并发布到 PyPI。
#
# 主流领域标准库与第三方生态：
#
# Web 开发：FastAPI（推荐，现代化强类型异步框架）、Django、Flask。
#
# 数据分析/AI：Pandas、NumPy、PyTorch。
#
# 测试：pytest 自动化测试框架。
