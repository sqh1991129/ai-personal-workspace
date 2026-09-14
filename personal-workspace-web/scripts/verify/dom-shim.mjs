/**
 * 给 SSR 核对脚本用的最小 DOM/浏览器环境垫片：只补 src 下代码真正用到的 API，
 * 不引入 jsdom（保持零依赖）。
 */
export function installDomShim() {
  const storage = new Map()
  const localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => { storage.set(key, String(value)) },
    removeItem: (key) => { storage.delete(key) }
  }
  const dataset = {}
  const noop = () => undefined

  globalThis.localStorage = localStorage
  globalThis.document = {
    documentElement: { dataset, style: { setProperty: noop } },
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, classList: { add: noop, remove: noop, toggle: noop } })
  }
  globalThis.window = {
    localStorage,
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    addEventListener: noop,
    removeEventListener: noop,
    location: { href: 'http://localhost/' }
  }
  // Node 25 的 navigator 是只读全局，不覆盖
  return { storage, dataset }
}
