// 文档类型相关的纯函数：类型 → 展示用 CSS 修饰类、文件名 → 类型。
// 原型只定义了 .file-type / --md / --pdf / --url，DOCX 走基类，这里保持同样的映射，
// 避免在组件里写死 class 分支。纯函数，不依赖 Vue 运行时。
import type { FileType, KbDocument } from '@/types/knowledge'

const MODIFIER_TYPES = ['MD', 'PDF', 'URL'] as const

export function fileTypeClass(type: KbDocument['type']): string {
  return (MODIFIER_TYPES as readonly string[]).includes(type) ? `file-type file-type--${type.toLowerCase()}` : 'file-type'
}

const EXTENSION_TYPES: Record<string, FileType> = {
  pdf: 'PDF',
  docx: 'DOCX',
  doc: 'DOCX',
  md: 'MD',
  markdown: 'MD',
  txt: 'TXT',
  text: 'TXT'
}

/**
 * 从文件名后缀派生类型；认不出来就是 'TXT'（后端不返回 type 字段时的兜底，
 * 比在 api 层写死 'MD' 诚实：至少和文件名一致）。URL 收藏不在这里判定。
 */
export function fileTypeOf(fileName: string): FileType {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0 || dot === fileName.length - 1) {
    return 'TXT'
  }
  return EXTENSION_TYPES[fileName.slice(dot + 1).toLowerCase()] ?? 'TXT'
}
