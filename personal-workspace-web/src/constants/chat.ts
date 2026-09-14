// 对话模块的纯常量。会话与消息一律来自后端（issue R21：不再内置示例数据，
// 否则页面上分不清「后端真有这些历史」和「前端在演」）。
export const NEW_SESSION_ID = 'sess-new'

/** 侧栏分组顺序；后端返回其它 groupLabel 时视图按标签追加在后面 */
export const SESSION_GROUP_ORDER = ['今天', '昨天', '7 天内'] as const
