export type StatusState = 'idle' | 'checking' | 'online' | 'offline'

/** 模块名：与 .module[data-module] 一一对应，也是布局偏好的存储键 */
export type ModuleName = 'home' | 'chat' | 'knowledge'

/** 列数布局：三栏 / 两栏 / 专注，与 .module[data-layout] 取值一致 */
export type LayoutName = 'three-col' | 'two-col' | 'one-col'
