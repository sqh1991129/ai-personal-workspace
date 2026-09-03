// 消息正文的行内标记解析：只支持 **加粗** 与 `行内代码`，输出结构化片段。
// 刻意不做 HTML 字符串拼接，渲染侧用 v-for + 组件，避免 v-html 带来的注入面。
// 纯函数，不依赖 Vue 运行时（AGENTS.md 目录职责约定）。

export type InlineTone = 'plain' | 'strong' | 'code'

export interface InlineRun {
  text: string
  tone: InlineTone
}

const STRONG_DELIMITER = '**'

const CODE_DELIMITER = '`'

export function parseInlineRuns(source: string): InlineRun[] {
  const runs: InlineRun[] = []
  let buffer = ''
  let index = 0

  const flush = (tone: InlineTone): void => {
    if (buffer.length > 0) {
      runs.push({ text: buffer, tone })
      buffer = ''
    }
  }

  while (index < source.length) {
    if (source.startsWith(STRONG_DELIMITER, index)) {
      flush('plain')
      const end = source.indexOf(STRONG_DELIMITER, index + STRONG_DELIMITER.length)
      if (end < 0) {
        buffer += source.slice(index)
        break
      }
      runs.push({ text: source.slice(index + STRONG_DELIMITER.length, end), tone: 'strong' })
      index = end + STRONG_DELIMITER.length
      continue
    }
    if (source[index] === CODE_DELIMITER) {
      flush('plain')
      const end = source.indexOf(CODE_DELIMITER, index + CODE_DELIMITER.length)
      if (end < 0) {
        buffer += source.slice(index)
        break
      }
      runs.push({ text: source.slice(index + CODE_DELIMITER.length, end), tone: 'code' })
      index = end + CODE_DELIMITER.length
      continue
    }
    buffer += source[index]
    index += 1
  }

  flush('plain')
  return runs
}
