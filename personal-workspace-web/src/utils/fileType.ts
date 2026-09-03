// 文档类型 → 展示用 CSS 修饰类。原型只定义了 .file-type / --md / --pdf / --url，
// DOCX 走基类，这里保持同样的映射，避免在组件里写死 class 分支。
// 纯函数，不依赖 Vue 运行时。
import type { KbDocument } from '@/types/knowledge'

const MODIFIER_TYPES = ['MD', 'PDF', 'URL'] as const

export function fileTypeClass(type: KbDocument['type']): string {
  return (MODIFIER_TYPES as readonly string[]).includes(type) ? `file-type file-type--${type.toLowerCase()}` : 'file-type'
}
