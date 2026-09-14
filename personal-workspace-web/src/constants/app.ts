// 展示用的应用元信息（纯常量，不依赖 Vue 运行时）。
// 版本号与 package.json 保持一致，发版时一并修改；前端拿不到非 VUE_APP_ 前缀的构建期变量。
export const APP_VERSION = '0.1.0'

export const APP_MARK = 'WS'

/**
 * 登录演示开关（构建期从 .env 注入，改完 .env 必须重启 dev server 才生效）。
 * 顶栏必须把它显性标出来：演示登录不能看起来像真登录（issue R21）。
 * 业务数据（会话 / 消息 / 知识库）已经没有开关也没有假数据分支，只有后端来源。
 */
export const IS_MOCK_AUTH: boolean = process.env.VUE_APP_MOCK_AUTH === 'true'
