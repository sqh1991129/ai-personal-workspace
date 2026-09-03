// 图标注册表：与 demo/assets/prototype.js 的 ICONS 表同源（24×24 描边图标，零依赖）。
// 新增图标只需在这里加一条，组件侧写 <AppIcon name="chat" /> 即可，不引入任何图标库。
// 纯常量，不依赖 Vue 运行时（见 AGENTS.md 目录职责表）。

export const ICON_PATHS = {
  grid: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
  chat: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5A1.5 1.5 0 0 0 20 18.5z"/>',
  task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10l2.5 2.5L16 7"/><path d="M8 16h8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M6 12l14-7-5.5 14-3-6z"/>',
  stop: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/>',
  paperclip: '<path d="M20 11.5l-8 8a4.5 4.5 0 0 1-6.5-6.5l8.5-8.5a3 3 0 0 1 4.5 4.5l-8.5 8.5a1.5 1.5 0 0 1-2.5-2l8-8"/>',
  spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a1 1 0 0 0-1 1v9"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  thumbUp: '<path d="M7 21V10l4.5-7a2 2 0 0 1 2 2.5L12.5 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7z"/><path d="M7 10H3v11h4"/>',
  thumbDown: '<path d="M17 3v11l-4.5 7a2 2 0 0 1-2-2.5L11.5 15H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H17z"/><path d="M17 14h4V3h-4"/>',
  file: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/>',
  upload: '<path d="M12 16V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  link: '<path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.6-5.6L11.5 7"/><path d="M14 11a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 9.6 18.1l1.9-1.6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  flask: '<path d="M9 3v6L4.5 17A2 2 0 0 0 6.3 20h11.4a2 2 0 0 0 1.8-3L15 9V3"/><path d="M8 3h8M6.8 14h10.4"/>',
  eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  logout: '<path d="M15 12H4"/><path d="M8 8l-4 4 4 4"/><path d="M10 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8"/>',
  bolt: '<path d="M13 3L5.5 13.5H11l-1 7.5L18.5 10H13z"/>'
} as const

export type IconName = keyof typeof ICON_PATHS

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[]
